import * as types from './types';

import * as wallet from 'bridge/wallet';
import {formatDate} from 'components/projects/DateTime';
import Satoshi from 'types/Satoshi';

export type BtcStatus = 'PENDING' | 'CONFIRMED';

export type BtcDb = {
  tx_hash: string; // primary key
  status: BtcStatus;
  dir: types.Direction;
  amount: Satoshi;
  fee: Satoshi;
  addresses: string;
  timestamp: string;
  label: string;
  block_hash: string;
  block_height: number;
};

export type BtcDbForCsv = {
  timestampString: string;
} & BtcDb;

export const prepareDataSetForCsv = (dbs: BtcDb[]): BtcDbForCsv[] =>
  dbs.map(db => Object.assign(db, {timestampString: formatDate(db.timestamp, '', true)}));

const sortDescent = (a: BtcDb, b: BtcDb) => {
  if (a.timestamp > b.timestamp) {
    return 1;
  } else if (a.timestamp < b.timestamp) {
    return -1;
  } else {
    if (a.tx_hash > b.tx_hash) {
      return 1;
    } else if (a.tx_hash < b.tx_hash) {
      return -1;
    }
  }
  return 0;
};

/** get BTC transaction history(sort by newest timestamp)
 * @returns BTC history data array
 */
export async function getHistory(filter?: RegExp): Promise<BtcDb[]> {
  const btc: wallet.BtcChainTxns = await wallet.listTransactions(0);
  const db: BtcDb[] = [];
  btc.transactions.forEach(element => {
    if (!filter || element.label.match(filter)) {
      db.push({
        tx_hash: element.tx_hash,
        status: element.block_height === 0 ? 'PENDING' : 'CONFIRMED',
        dir: element.amount.includes('-') ? 'pay' : 'receive',
        amount: Satoshi.fromSat(element.amount.replace('-', '')),
        fee: Satoshi.fromSat(element.total_fees),
        addresses: element.dest_addresses.join(','),
        timestamp: element.time_stamp,
        label: element.label,
        block_hash: element.block_hash,
        block_height: element.block_height,
      });
    }
  });
  db.sort(sortDescent);
  return db;
}

export const csvColumnOrder: (keyof BtcDbForCsv)[] = [
  'timestampString',
  'label',
  'dir',
  'amount',
  'fee',
  'status',
  'addresses',
  'tx_hash',
  'block_height',
  'block_hash',
];
