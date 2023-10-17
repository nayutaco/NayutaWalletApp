import {NativeModules} from 'react-native';

import {EventEmitter as nee} from './LndGrpcLightning';
import {closeChannelStart, request} from './request';

import {LOG} from 'tools/logging';
import Satoshi from 'types/Satoshi';

export type SplitResult = {success: true; txid: string; index: string};
export function splitChannelPoint(chanPoint: string): SplitResult {
  const splitted = chanPoint.split(':');
  const ret: SplitResult = {
    success: true,
    txid: splitted[0],
    index: splitted[1],
  };
  return ret;
}

export type CloseResult = {success: true} | {success: false; error: string | null};
export async function closeChannel(forceFlag: boolean, txid: string, index: string): Promise<CloseResult> {
  let ret: CloseResult;
  try {
    ret = {success: true};
    const funding_txid = txid;
    const outpoint_index = index;
    const force = forceFlag ? '?force=true' : '';
    const url = `/v1/channels/${funding_txid}/${outpoint_index}${force}`;
    await request('DELETE', url, null);
  } catch (e: any) {
    ret = {
      success: false,
      error: e.message,
    };
  }
  return ret;
}

export type OpenResult = {success: true} | {success: false; error: string | null};
export async function openChannel(nodePub: string, fundingAmount: string): Promise<OpenResult> {
  let ret: OpenResult;
  try {
    ret = {success: true};
    const openChan = {
      node_pubkey_string: nodePub,
      local_funding_amount: fundingAmount,
      private: true,
    };
    const url = `/v1/channels`;
    await request('POST', url, openChan);
  } catch (e: any) {
    ret = {
      success: false,
      error: e.message,
    };
  }
  return ret;
}

export type ConnectResult = {success: true} | {success: false; error: string};
export async function connect(nodePub: string): Promise<ConnectResult> {
  let ret: ConnectResult;
  try {
    const nodeInfo = nodePub.split('@');
    ret = {success: true};
    const peers = {
      addr: {
        pubkey: nodeInfo[0],
        host: nodeInfo[1],
      },
      timeout: '10',
    };
    const url = `/v1/peers`;
    await request('POST', url, peers);
  } catch (e: any) {
    if (e.message.startsWith('already connected to peer')) {
      // already connect isn't error
      ret = {success: true};
    } else {
      ret = {
        success: false,
        error: e.message,
      };
    }
  }
  return ret;
}

// only use parameters
export type ListChannel = {
  active: boolean;
  // chan_id: string;
  // remote_chan_id: string;
  channel_point: string;
  capacity: number;
  remote_chan_reserve_sat: number;
};
export async function listChannels(activeOnly = false): Promise<ListChannel[]> {
  const result = await request('GET', '/v1/channels', null);
  const chans: ListChannel[] = [];
  for (const ch of result.channels) {
    if (activeOnly && !ch.active) {
      continue;
    }
    const val: ListChannel = {
      active: ch.active,
      // chan_id: ch.chan_id,
      // remote_chan_id: ch.remote_chan_id,
      channel_point: ch.channel_point,
      capacity: parseInt(ch.capacity, 10),
      remote_chan_reserve_sat: parseInt(ch.remote_constraints.chan_reserve_sat, 10),
    };
    chans.push(val);
  }
  return chans;
}

export type AliasResult = {success: true; alias: string} | {success: false; error: string | null};
export async function getAlias(pubkey: string): Promise<AliasResult> {
  const {NETWORK} = NativeModules.AppConfig;
  let ret: AliasResult;
  try {
    ret = {
      success: true,
      alias: pubkey,
    };
    if (NETWORK !== 'signet') {
      const url = `/v1/graph/node/${pubkey}`;
      const res = await request('GET', url, null);
      if (res.node.alias) {
        ret.alias = res.node.alias;
      }
    }
  } catch (e: any) {
    ret = {
      success: false,
      error: e.message,
    };
  }
  return ret;
}

export async function closeChannelAll(feeRate: Satoshi): Promise<boolean> {
  try {
    const chans = await request('GET', '/v1/channels?active_only=true', null);
    for (let idx = 0; idx < chans.channels.length; idx++) {
      const chan = chans.channels[idx];
      const chanPnt = chan.channel_point.split(':');
      const result = await closeChannelStart(chanPnt[0], parseInt(chanPnt[1], 10), false, feeRate.toNumber());
      if (!result) {
        return false;
      }
    }
    return true;
  } catch (e: any) {
    LOG.error('closeAllChannel: ' + e.message);
    return false;
  }
}

type fnChannelEventType = (event: string, channelPoint: string) => void;

export function addChannelEventListener(handler: fnChannelEventType) {
  nee.removeAllListeners('grpc_watchCh');
  nee.addListener('grpc_watchCh', result => {
    if (result) {
      handler(result.event, result.channel_point);
    }
  });
}
