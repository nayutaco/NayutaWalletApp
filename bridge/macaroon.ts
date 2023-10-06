import {h64} from 'xxhashjs';

import LndReactController from './LndReactController';

import * as lccontrol from 'bridge/lccontrol';
import * as payment from 'bridge/payment';
import * as request from 'bridge/request';
import {AppDetail} from 'types';
import {Macaroon, MacPermission} from 'types/Macaroon';

export function setBridgeAdminMacaroon(macaroonHex: string) {
  request.setAdminMacaroon(macaroonHex);
  lccontrol.setAdminMacaroon(macaroonHex);
  payment.setAdminMacaroon(macaroonHex);
}

export async function listMacaroonIDs() {
  const res = await request.request('GET', '/v1/macaroon/ids', null);
  return res.root_key_ids;
}

export async function bakeMacaroon(appId: AppDetail['appId'], permissions: MacPermission[]): Promise<Macaroon> {
  const kid = keyHash(appId);

  // generate
  const {macaroon} = await request.request('POST', '/v1/macaroon', {permissions, root_key_id: kid});
  return new Macaroon(macaroon, kid);
}

export async function revokeMacaroon(appId: AppDetail['appId']) {
  const kid = keyHash(appId);
  const {deleted} = await request.request('DELETE', '/v1/macaroon/' + kid, null);
  if (!deleted) {
    throw new Error('Failed to delete macaroon key ID');
  }
}
export function keyHash(appId: AppDetail['appId']) {
  return h64(appId, 0).toString(10);
}

export const allPerm: MacPermission[] = [
  {
    entity: 'onchain',
    action: 'write',
  },
  {
    entity: 'offchain',
    action: 'write',
  },
  {
    entity: 'address',
    action: 'write',
  },
  {
    entity: 'message',
    action: 'write',
  },
  {
    entity: 'peers',
    action: 'write',
  },
  {
    entity: 'info',
    action: 'write',
  },
  {
    entity: 'invoices',
    action: 'write',
  },
  {
    entity: 'signer',
    action: 'generate',
  },
  {
    entity: 'macaroon',
    action: 'generate',
  },
  {
    entity: 'macaroon',
    action: 'write',
  },
  {
    entity: 'onchain',
    action: 'read',
  },
  {
    entity: 'offchain',
    action: 'read',
  },
  {
    entity: 'address',
    action: 'read',
  },
  {
    entity: 'message',
    action: 'read',
  },
  {
    entity: 'peers',
    action: 'read',
  },
  {
    entity: 'info',
    action: 'read',
  },
  {
    entity: 'invoices',
    action: 'read',
  },
  {
    entity: 'signer',
    action: 'read',
  },
  {
    entity: 'macaroon',
    action: 'read',
  },
];
export const adminPerm: MacPermission[] = [
  {
    entity: 'onchain',
    action: 'write',
  },
  {
    entity: 'offchain',
    action: 'write',
  },
  {
    entity: 'address',
    action: 'write',
  },
  {
    entity: 'message',
    action: 'write',
  },
  {
    entity: 'peers',
    action: 'write',
  },
  {
    entity: 'info',
    action: 'write',
  },
  {
    entity: 'invoices',
    action: 'write',
  },
  {
    entity: 'signer',
    action: 'generate',
  },
  // Macaroon manipulation is the privilege for only this App!
  {
    entity: 'onchain',
    action: 'read',
  },
  {
    entity: 'offchain',
    action: 'read',
  },
  {
    entity: 'address',
    action: 'read',
  },
  {
    entity: 'message',
    action: 'read',
  },
  {
    entity: 'peers',
    action: 'read',
  },
  {
    entity: 'info',
    action: 'read',
  },
  {
    entity: 'invoices',
    action: 'read',
  },
  {
    entity: 'signer',
    action: 'read',
  },
  {
    entity: 'macaroon',
    action: 'read',
  },
];
export const invoicePerm: MacPermission[] = [
  {
    entity: 'invoices',
    action: 'read',
  },
  {
    entity: 'invoices',
    action: 'write',
  },
  {
    entity: 'address',
    action: 'read',
  },
  {
    entity: 'address',
    action: 'write',
  },
  {
    entity: 'onchain',
    action: 'read',
  },
];

export async function getCert() {
  const result = await LndReactController.getCert();
  return result;
}
