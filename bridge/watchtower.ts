import {Buffer} from 'buffer';

import {request} from './request';

import {LOG} from 'tools/logging';

export async function addWatchtower(uri: string) {
  const nodeInfo = uri.split('@');
  const params = {
    pubkey: Buffer.from(nodeInfo[0], 'hex').toString('base64'),
    address: nodeInfo[1],
  };
  await request('POST', '/v2/watchtower/client', params);
}

export async function getWatchtower(): Promise<string[]> {
  const result: string[] = [];
  const towers = await request('GET', '/v2/watchtower/client?include_sessions=true', null);
  LOG.trace(JSON.stringify(towers));
  for (let lp = 0; lp < towers.towers.length; lp++) {
    const tower = towers.towers[lp];
    const pubkey = Buffer.from(tower.pubkey, 'base64').toString('hex');
    for (let lp2 = 0; lp2 < tower.addresses.length; lp2++) {
      result.push(`${pubkey}@${tower.addresses[lp2]}`);
    }
  }
  return result;
}

// // pubkeyは pathとして与えるのだが、base64しか受け付けないようである。
// // そしてbase64は URI で使用する文字列を含む場合があるためうまくいかない。
// export async function deleteWatchtower() {
//   try {
//     const towers = await request('GET', '/v2/watchtower/client?include_sessions=true', null);
//     LOG.trace(`towers=${JSON.stringify(towers)}`);
//     const result = [];
//     for (let lp = 0; lp < towers.towers.length; lp++) {
//       // const pubkey = Buffer.from(towers.towers[lp].pubkey, 'base64').toString('hex');
//       // await request('DELETE', `/v2/watchtower/client/${pubkey}`, null);
//       const pubkey = towers.towers[lp].pubkey;
//       result.push(towers.towers[lp].pubkey);
//       await request('DELETE', `/v2/watchtower/client/${pubkey}`, null);
//     }
//   } catch (e) {
//     errorHandle(e);
//   }
// }
