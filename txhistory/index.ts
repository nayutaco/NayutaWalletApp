import * as btc from './btc';
import * as ln from './ln';
import * as types from './types';

import Satoshi from 'types/Satoshi';

export type BtcDb = btc.BtcDb;
export type LnDb = ln.LnDb;
export type LnStatus = ln.Status;
export type Direction = types.Direction;
export type ChainType = 'LN' | 'BTC';

export const status = ln.status;
export const direction = types.direction;

export const emptyLnDb: LnDb = {
  payment_hash: '',
  idx: '',
  dir: 'dummy',
  amount: Satoshi.fromSat(0),
  fee: Satoshi.fromSat(0),
  state: 'UNKNOWN',
  timestamp: '',
  payment_request: '',
  preimage: '',
  failure_reason: '',
  invoice_date: '',
  description: '',
  destination: '',
};

/** get BTC transaction history(sort by newest timestamp)
 *
 * @returns BTC history data array
 */
export async function getHistoryBtc(filter?: RegExp): Promise<BtcDb[]> {
  return await btc.getHistory(filter);
}

/** get LN transaction history(sort by newest timestamp)
 *
 * @returns LN history data array
 */
export async function getHistoryLn(count: number): Promise<LnDb[]> {
  return await ln.getHistory(count);
}

export async function getHistoryLnList(count: number): Promise<LnDb[]> {
  return await ln.getHistoryList(count);
}

export async function getHistoryLnDetail(dir: Direction, index: string): Promise<LnDb> {
  switch (dir) {
    case 'pay':
      return await ln.getHistoryPay(index);
    case 'receive':
      return await ln.getHistoryReceive(index);
  }
  throw new Error(`getHistoryLnDetail: unknown direction: ${dir}-${index}`);
}

export async function getHistoryLnAllList(dir: ln.ListDirection): Promise<LnDb[]> {
  return await ln.getHistoryAllList(dir);
}

export async function getHistoryLnAll(dir: ln.ListDirection): Promise<LnDb[]> {
  return await ln.getHistoryAll(dir);
}
