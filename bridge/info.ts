import {request} from './request';

import {notificationServer, notificationTestServer} from 'tools/constants';
import {LOG} from 'tools/logging';
import * as types from 'types/';
import Satoshi from 'types/Satoshi';

export async function getChanInfo(): Promise<types.Channel[]> {
  const [{channels: chan}, pendingChannels] = await Promise.all([request('GET', '/v1/channels', null), request('GET', '/v1/channels/pending', null)]);
  // map function initializes & maps channel detail, so it is guaranteed to be non null
  const channels = chan.map((ch: any): types.Channel => {
    if (ch.sendable_bandwidth && ch.sendable_bandwidth !== ch.local_balance) {
      LOG.trace(`getChanInfo: ch.sendable_bandwidth(${ch.sendable_bandwidth}) !== ch.local_balance(${ch.local_balance})`);
    }
    return {
      status: ch.active ? 'active' : 'inactive',
      capacity: Satoshi.fromSat(ch.capacity),
      channelId: ch.chan_id,
      localBalance: Satoshi.fromSat(ch.local_balance),
      remoteBalance: Satoshi.fromSat(ch.remote_balance),
      numUpdates: ch.num_updates,
      localReserve: Satoshi.fromSat(ch.local_chan_reserve_sat),
      remoteReserve: Satoshi.fromSat(ch.remote_chan_reserve_sat),
      remoteNodePub: ch.remote_pubkey,
      channelPoint: ch.channel_point,
      alias: ch.remote_pubkey,
      private: ch.private,
      localConstraintReserveSat: Satoshi.fromSat(ch.local_constraints.chan_reserve_sat),
      dustLimitSat: Satoshi.fromSat(ch.local_constraints.dust_limit_sat),
      sendableBandwidth: ch.sendable_bandwidth && Satoshi.fromSat(ch.sendable_bandwidth),
    };
  }) as types.Channel[];
  for (const key in pendingChannels) {
    let status: types.Channel['status'];
    switch (key) {
      case 'pending_open_channels':
        status = 'opening';
        break;
      case 'pending_closing_channels':
        status = 'closing';
        break;
      case 'pending_force_closing_channels':
        status = 'forceClosing';
        break;
      case 'waiting_close_channels':
        status = 'closeWaiting';
        break;
      default:
        // that is total limbo balance
        continue;
    }
    pendingChannels[key].forEach(({channel: ch}: any) => {
      channels.push({
        status,
        localBalance: Satoshi.fromSat(ch.local_balance),
        remoteBalance: Satoshi.fromSat(ch.remote_balance),
        capacity: Satoshi.fromSat(ch.capacity),
        localReserve: Satoshi.fromSat(ch.local_chan_reserve_sat),
        remoteReserve: Satoshi.fromSat(ch.remote_chan_reserve_sat),
        remoteNodePub: ch.remote_node_pub,
        channelPoint: ch.channel_point,
        alias: ch.remote_node_pub,
        private: ch.private,
      });
    });
  }

  return channels;
}

export async function closedChannelsLength(): Promise<number> {
  const {channels: chan} = await request('GET', '/v1/channels/closed');
  return chan.length;
}

export async function getBalanceInfo(): Promise<types.Balance> {
  const [balOnchain, balOffchain] = await Promise.all([request('GET', '/v1/balance/blockchain', null), request('GET', '/v1/balance/channels', null)]);

  const balance = {
    total: Satoshi.addAll([
      Satoshi.fromSat(balOnchain.total_balance),
      Satoshi.fromSat(balOffchain.local_balance.sat),
      Satoshi.fromSat(balOffchain.unsettled_local_balance.sat),
      Satoshi.fromSat(balOffchain.pending_open_local_balance.sat),
    ]),
    unconfirmed: Satoshi.addAll([
      Satoshi.fromSat(balOnchain.unconfirmed_balance),
      Satoshi.fromSat(balOffchain.unsettled_local_balance.sat),
      Satoshi.fromSat(balOffchain.pending_open_local_balance.sat),
    ]),
    onChain: {
      total: Satoshi.fromSat(balOnchain.total_balance),
      confirmed: Satoshi.fromSat(balOnchain.confirmed_balance),
      unconfirmed: Satoshi.fromSat(balOnchain.unconfirmed_balance),
    },
    offChain: {
      local: Satoshi.fromSat(balOffchain.local_balance.sat),
      localUnsettled: Satoshi.fromSat(balOffchain.unsettled_local_balance.sat),
      localPending: Satoshi.fromSat(balOffchain.pending_open_local_balance.sat),
      total: Satoshi.addAll([
        Satoshi.fromSat(balOffchain.local_balance.sat),
        Satoshi.fromSat(balOffchain.unsettled_local_balance.sat),
        Satoshi.fromSat(balOffchain.pending_open_local_balance.sat),
      ]),
      remote: Satoshi.addAll([
        Satoshi.fromSat(balOffchain.remote_balance.sat),
        Satoshi.fromSat(balOffchain.unsettled_remote_balance.sat),
        Satoshi.fromSat(balOffchain.pending_open_remote_balance.sat),
      ]),
    },
  };
  return balance;
}

export async function getNotificationInfo(debug: boolean): Promise<types.ReceivedNotification> {
  const res = await fetch(!debug ? notificationServer : notificationTestServer, {method: 'GET'});
  const arr: types.ReceivedNotification = await res.json();
  if (!arr) {
    throw new Error('Invalid Update Info');
  }
  return arr;
}
