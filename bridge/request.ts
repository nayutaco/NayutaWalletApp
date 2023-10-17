import LndGrpcLightning from './LndGrpcLightning';
import LndReactController from './LndReactController';

import {lndAddr, lndRestPort} from 'tools/constants';
import {LOG} from 'tools/logging';
import * as types from 'types/';

const retryMax = 3;

let adminMacaroon = '';

/**
 * REST API Proxy
 * @param method
 * @param url
 * @param jsonData
 * @returns
 */
export async function request(method: types.LNDRequestKind, url: string, jsonData: any = null): Promise<any> {
  if (url[0] === '/') {
    // relative path to LND
    url = `https://${lndAddr}:${lndRestPort}${url}`;
  }
  if (jsonData && typeof jsonData === 'object') {
    jsonData = JSON.stringify(jsonData);
  }
  let err;
  let retry = retryMax;
  while (retry > 0) {
    try {
      return JSON.parse(await LndReactController.request(method, url, jsonData, adminMacaroon)) as any;
    } catch (e: any) {
      LOG.trace(`url=${url} err=${e.userInfo?.error}`);
      if (e.userInfo?.error) {
        e.message = JSON.parse(e.userInfo.error).message;
        throw new Error(e.message);
      }
      LOG.trace(`REST API retry=${retry}: ${e.toString()}`);
      err = e;
      retry--;
    }
  }
  LOG.error(`REST API fail: ${err.toString()}`);
  err.message = err.userInfo || 'unknown error';
  throw new Error(err.message);
}

/**
 * start watching settled invoice.
 * event handler: 'bridge/received.ts'
 */
export async function startWatchLnInvoices() {
  await LndGrpcLightning.startWatchLnInvoices(Math.floor(Date.now() / 1000), adminMacaroon);
}

export async function closeChannelStart(fundingTxid: string, outPointIndex: number, forceClose: boolean, satPerVByte: number): Promise<boolean> {
  return await LndGrpcLightning.closeChannelStart(fundingTxid, outPointIndex, forceClose, satPerVByte, adminMacaroon);
}

export async function subscribeTransactions(): Promise<void> {
  return await LndGrpcLightning.subscribeTransactions(adminMacaroon);
}

export async function subscribeChannelEvents(): Promise<void> {
  return await LndGrpcLightning.subscribeChannelEvents(adminMacaroon);
}

export async function subscribeChannelBackups(): Promise<void> {
  return await LndGrpcLightning.subscribeChannelBackups(adminMacaroon);
}

/**
 * set admin macaroon
 * Note that it doesn't save macaroons to keychain.
 * @param macaroonHex Hexadecimal macaroon
 */
export function setAdminMacaroon(macaroonHex: string) {
  adminMacaroon = macaroonHex;
}
