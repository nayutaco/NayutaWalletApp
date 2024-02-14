import {Buffer} from 'buffer';

import {request} from 'bridge/request';
import {isBase64} from 'tools';

// https://api.lightning.community/#lnrpc-channelpoint
// REST APIの結果はfunding_txid_bytesだけで、funding_txid_strは戻ってこなかった
type ChanPointInternal = {
  funding_txid_bytes: string; // base64(TXID internal-byte-order)
  output_index: number;
};

export type ChanPoint = {
  funding_txid_str: string; // hex-string(TXID RPC-byte-order)
  output_index: number;
};

export async function verifyChannelBackup(scb: string) {
  const chanPoints: ChanPoint[] = [];
  const chans = await request('GET', '/v1/channels', null);
  for (let idx = 0; idx < chans.channels.length; idx++) {
    const chanPnt = chans.channels[idx].channel_point.split(':');
    const chan: ChanPoint = {
      funding_txid_str: chanPnt[0],
      output_index: parseInt(chanPnt[1], 10),
    };
    chanPoints.push(chan);
  }
  const channelBackups = {
    multi_chan_backup: {
      chan_points: chanPoints,
      multi_chan_backup: scb,
    },
  };
  await request('POST', '/v1/channels/backup/verify', channelBackups);
}

export async function channelBackup(): Promise<[string, ChanPoint[]]> {
  const url = '/v1/channels/backup';
  const result = await request('GET', url, null);
  const chanPoints = result.multi_chan_backup.chan_points.map((chan: ChanPointInternal) => {
    const funding_txid_str = Buffer.from(chan.funding_txid_bytes, 'base64').reverse().toString('hex');
    return {funding_txid_str, output_index: chan.output_index};
  });
  return [result.multi_chan_backup.multi_chan_backup, chanPoints];
}

export async function recoveryChannel(scbData: string) {
  if (!isBase64(scbData)) {
    throw new Error('not base64 string');
  }
  const channelBackups = {
    multi_chan_backup: scbData,
  };
  await request('POST', '/v1/channels/backup/restore', channelBackups);
}
