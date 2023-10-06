import {Buffer} from 'buffer';

import {BigNumber} from 'bignumber.js';

import * as types from './types';

import * as appDb from 'appdb';
import {getInfo} from 'bridge/manager';
import * as payment from 'bridge/payment';
import * as wallet from 'bridge/wallet';
import {txHistoryLimit} from 'tools/constants';
import {dateString} from 'tools/locale';
import {LOG} from 'tools/logging';
import Satoshi from 'types/Satoshi';

const allHistory = false;

export const status = {
  unknown: 'UNKNOWN',
  inFlight: 'IN_FLIGHT',
  succeeded: 'SUCCEEDED',
  failed: 'FAILED',
  open: 'OPEN',
  settled: 'SETTLED',
  canceled: 'CANCELED',
  accepted: 'ACCEPTED',
} as const;
export type Status = typeof status[keyof typeof status];

export type LnDb = {
  payment_hash: string; // primary key
  idx: string;
  dir: types.Direction;
  amount: Satoshi;
  fee?: Satoshi;
  state: Status;
  timestamp: string;
  timestampString?: string;
  payment_request?: string;
  preimage?: string;
  failure_reason?: string;
  invoice_date?: string;
  description: string;
  destination?: string;
};

export const csvColumnOrder: (keyof LnDb)[] = [
  'timestampString',
  'description',
  'dir',
  'destination',
  'amount',
  'fee',
  'state',
  'failure_reason',
  'invoice_date',
  'payment_request',
  'payment_hash',
  'preimage',
];

type PayReq = {
  invoice_date: string;
  description: string;
  destination: string;
};

export type ListDirection = 'ascent' | 'descent';

const lnHistoryMax = 100;
const loopSafety = 100000;

if (lnHistoryMax < txHistoryLimit) {
  throw new Error('lnHistoryMax < txHistoryLimit');
}

// 降順
const sortDescent = (a: LnDb, b: LnDb) => {
  if (a.timestamp > b.timestamp) {
    // aが先
    return -1;
  } else if (a.timestamp < b.timestamp) {
    // bが先
    return 1;
  } else if (a.idx > b.idx) {
    // aが先
    return -1;
  } else if (a.idx < b.idx) {
    // bが先
    return 1;
  }
  return 0;
};

// 昇順
const sortAscent = (a: LnDb, b: LnDb) => {
  if (a.timestamp < b.timestamp) {
    // aが先
    return -1;
  } else if (a.timestamp > b.timestamp) {
    // bが先
    return 1;
  } else if (a.idx < b.idx) {
    // aが先
    return -1;
  } else if (a.idx > b.idx) {
    // bが先
    return 1;
  }
  return 0;
};

async function getPayReq(paymentHash: string, payReq: string, htlcs: any[]): Promise<PayReq> {
  let dbInv;

  if (payReq.length === 0) {
    payReq = await appDb.getPaymentInvoice(paymentHash);
  }
  if (payReq.length > 0) {
    try {
      const decoded = await payment.decodePayReq(payReq);
      dbInv = {
        invoice_date: decoded.timestamp,
        description: decoded.description,
        destination: decoded.destination,
      };
    } catch (e: any) {
      LOG.error(`ln getPayReq: ${e.toString()}`);
    }
  }
  if (!dbInv) {
    dbInv = {
      invoice_date: '',
      description: '',
      destination: '',
    };
    // hopの最後が送金の宛先になるはず
    if (htlcs.length > 0) {
      const hop = htlcs[0].route.hops;
      dbInv.destination = hop[hop.length - 1].pub_key ?? '';
    }
  }
  return dbInv;
}

function nanosecToSecond(timestamp_ns: string): string {
  return timestamp_ns.length > 9 ? timestamp_ns.substring(0, timestamp_ns.length - 9) : '0';
}

/** get LN transaction history(sort by newest timestamp)
 * @returns LN history data array
 */
export async function getHistory(count: number): Promise<LnDb[]> {
  const db: LnDb[] = [];
  const lnPay: wallet.ListPayments = await wallet.listPayments(true, '0', count);
  lnPay.payments.forEach(async element => {
    const payReq = await getPayReq(element.payment_hash, element.payment_request, element.htlcs);
    db.push({
      payment_hash: element.payment_hash,
      dir: 'pay',
      idx: element.payment_index,
      amount: element.value_sat,
      fee: element.fee_sat,
      state: element.status,
      timestamp: nanosecToSecond(element.creation_time_ns),
      payment_request: element.payment_request,
      preimage: element.payment_preimage,
      failure_reason: element.failure_reason,
      invoice_date: payReq.invoice_date,
      description: payReq.description,
      destination: payReq.destination,
    });
  });

  const lnInv: wallet.ListInvoices = await wallet.listInvoices(true, '0', count);
  lnInv.invoices.forEach(element => {
    if (!allHistory && element.state !== 'SETTLED') {
      return;
    }
    const preimage = Buffer.from(element.r_preimage, 'base64').toString('hex');
    db.push({
      payment_hash: Buffer.from(element.r_hash, 'base64').toString('hex'),
      dir: 'receive',
      idx: element.add_index,
      amount: element.value,
      fee: Satoshi.fromSat(0),
      state: element.state,
      timestamp: element.settled ? element.settle_date : element.creation_date,
      payment_request: element.payment_request,
      preimage: preimage,
      failure_reason: '',
      invoice_date: element.creation_date,
      description: element.memo,
      destination: '',
    });
  });

  db.sort(sortDescent);

  return db.slice(0, count);
}

/** get LN transaction history(sort by newest timestamp)
 * @returns LN history data array
 */
export async function getHistoryList(count: number): Promise<LnDb[]> {
  const info = await getInfo();
  const removeHashList: string[] = [];
  const db: LnDb[] = [];
  const lnPay: wallet.ListPayments = await wallet.listPayments(true, '0', count * 2);
  for (let txIndex = 0; txIndex < lnPay.payments.length; txIndex++) {
    const element = lnPay.payments[txIndex];
    const payReq = await getPayReq(element.payment_hash, element.payment_request, element.htlcs);
    if (info.identity_pubkey !== payReq.destination) {
      db.push({
        payment_hash: element.payment_hash,
        payment_request: element.payment_request,
        destination: payReq.destination,
        idx: element.payment_index,
        dir: 'pay',
        amount: element.value_sat,
        state: element.status,
        timestamp: nanosecToSecond(element.creation_time_ns),
        description: payReq.description,
      });
    } else {
      removeHashList.push(element.payment_hash);
    }
  }

  const lnInv: wallet.ListInvoices = await wallet.listInvoices(true, '0', count * 2);
  lnInv.invoices.forEach(element => {
    if (!allHistory && element.state !== 'SETTLED') {
      return;
    }
    const hash = Buffer.from(element.r_hash, 'base64').toString('hex');
    if (removeHashList.includes(hash)) {
      return;
    }
    db.push({
      payment_hash: element.r_hash,
      idx: element.add_index,
      dir: 'receive',
      amount: element.value,
      state: element.state,
      timestamp: element.settled ? element.settle_date : element.creation_date,
      description: element.memo,
    });
  });

  db.sort(sortDescent);

  return db.slice(0, count);
}

export async function getHistoryPay(paymentHash: string): Promise<LnDb> {
  const lnPay = await wallet.listPayments(true, '0', lnHistoryMax);
  for (let idx = 0; idx < lnPay.payments.length; idx++) {
    const element = lnPay.payments[idx];
    if (element.payment_hash === paymentHash) {
      const payReq = await getPayReq(element.payment_hash, element.payment_request, element.htlcs);
      return {
        payment_hash: element.payment_hash,
        dir: 'pay',
        idx: element.payment_index,
        amount: element.value_sat,
        fee: element.fee_sat,
        state: element.status,
        timestamp: nanosecToSecond(element.creation_time_ns),
        payment_request: element.payment_request,
        preimage: element.payment_preimage,
        failure_reason: element.failure_reason,
        invoice_date: payReq.invoice_date,
        description: payReq.description,
        destination: payReq.destination,
      };
    }
  }
  throw new Error(`getHistoryPay: fail listPayments(${paymentHash})`);
}

export async function getHistoryReceive(rHash: string): Promise<LnDb> {
  const lnInv = await wallet.listInvoices(true, '0', lnHistoryMax);
  for (let idx = 0; idx < lnInv.invoices.length; idx++) {
    const element = lnInv.invoices[idx];
    if (element.r_hash === rHash) {
      const preimage = Buffer.from(element.r_preimage, 'base64').toString('hex');
      return {
        payment_hash: Buffer.from(element.r_hash, 'base64').toString('hex'),
        dir: 'receive',
        idx: element.add_index,
        amount: element.value,
        fee: Satoshi.fromSat(0),
        state: element.state,
        timestamp: element.settled ? element.settle_date : element.creation_date,
        payment_request: element.payment_request,
        preimage: preimage,
        failure_reason: '',
        invoice_date: element.creation_date,
        description: element.memo,
        destination: '',
      };
    }
  }
  throw new Error(`getHistoryReceive: fail listInvoices(${rHash})`);
}

/** get LN transaction history for List
 * @returns LN history data array
 */
export async function getHistoryAllList(dir: ListDirection): Promise<LnDb[]> {
  const info = await getInfo();
  const removeHashList: string[] = [];
  const db: LnDb[] = [];
  let indexOffset = new BigNumber(0);
  while (indexOffset.isLessThan(loopSafety)) {
    const lnPay: wallet.ListPayments = await wallet.listPayments(false, indexOffset.toString(), lnHistoryMax);
    for (let txIndex = 0; txIndex < lnPay.payments.length; txIndex++) {
      const element = lnPay.payments[txIndex];
      const payReq = await getPayReq(element.payment_hash, element.payment_request, element.htlcs);
      if (info.identity_pubkey !== payReq.destination) {
        db.push({
          payment_hash: element.payment_hash,
          payment_request: element.payment_request,
          destination: payReq.destination,
          idx: element.payment_index,
          dir: 'pay',
          amount: element.value_sat,
          state: element.status,
          timestamp: nanosecToSecond(element.creation_time_ns),
          description: payReq.description,
        });
      } else {
        removeHashList.push(element.payment_hash);
      }
    }

    if (lnPay.last_index_offset === '0') {
      break;
    }
    indexOffset = new BigNumber(lnPay.last_index_offset);
  }

  indexOffset = new BigNumber(0);
  while (indexOffset.isLessThan(loopSafety)) {
    const lnInv: wallet.ListInvoices = await wallet.listInvoices(false, indexOffset.toString(), lnHistoryMax);
    lnInv.invoices.forEach(element => {
      if (!allHistory && element.state !== 'SETTLED') {
        return;
      }
      const hash = Buffer.from(element.r_hash, 'base64').toString('hex');
      if (removeHashList.includes(hash)) {
        return;
      }
      db.push({
        payment_hash: element.r_hash,
        idx: element.add_index,
        dir: 'receive',
        amount: element.value,
        state: element.state,
        timestamp: element.settled ? element.settle_date : element.creation_date,
        description: element.memo,
      });
    });
    if (lnInv.last_index_offset === '0') {
      break;
    }
    indexOffset = new BigNumber(lnInv.last_index_offset);
  }

  db.sort(dir === 'ascent' ? sortAscent : sortDescent);

  return db;
}

// All fields are required
interface HistoryAllLnDb extends LnDb {
  payment_hash: string; // primary key
  idx: string;
  dir: types.Direction;
  amount: Satoshi;
  fee: Satoshi;
  state: Status;
  timestamp: string;
  timestampString: string;
  payment_request: string;
  preimage: string;
  failure_reason: string;
  invoice_date: string;
  description: string;
  destination: string;
}

/** get LN transaction history
 * @returns LN history data array
 */
export async function getHistoryAll(dir: ListDirection): Promise<HistoryAllLnDb[]> {
  const db: HistoryAllLnDb[] = [];
  let indexOffset = new BigNumber(0);
  while (indexOffset.isLessThan(loopSafety)) {
    const lnPay: wallet.ListPayments = await wallet.listPayments(false, indexOffset.toString(), lnHistoryMax);
    lnPay.payments.forEach(async element => {
      const payReq = await getPayReq(element.payment_hash, element.payment_request, element.htlcs);
      const dateTimeStr = nanosecToSecond(element.creation_time_ns);
      const dateTime = parseInt(dateTimeStr, 10);
      const dateObj = new Date(dateTime * 1000);
      db.push({
        payment_hash: element.payment_hash,
        dir: 'pay',
        idx: element.payment_index,
        amount: element.value_sat,
        fee: element.fee_sat,
        state: element.status,
        timestamp: dateTimeStr,
        timestampString: `${dateString(dateObj, true)}`,
        payment_request: element.payment_request,
        preimage: element.payment_preimage,
        failure_reason: element.failure_reason,
        invoice_date: payReq.invoice_date,
        description: payReq.description,
        destination: payReq.destination,
      });
    });
    if (lnPay.last_index_offset === '0') {
      break;
    }
    indexOffset = new BigNumber(lnPay.last_index_offset);
  }

  indexOffset = new BigNumber(0);
  while (indexOffset.isLessThan(loopSafety)) {
    const lnInv: wallet.ListInvoices = await wallet.listInvoices(false, indexOffset.toString(), lnHistoryMax);
    lnInv.invoices.forEach(element => {
      if (!allHistory && element.state !== 'SETTLED') {
        return;
      }
      const dateTimeStr = element.settled ? element.settle_date : element.creation_date;
      const dateTime = parseInt(dateTimeStr, 10);
      const dateObj = new Date(dateTime * 1000);
      const preimage = Buffer.from(element.r_preimage, 'base64').toString('hex');
      db.push({
        payment_hash: Buffer.from(element.r_hash, 'base64').toString('hex'),
        dir: 'receive',
        idx: element.add_index,
        amount: element.value,
        fee: Satoshi.fromSat(0),
        state: element.state,
        timestamp: dateTimeStr,
        timestampString: `${dateString(dateObj, true)}`,
        payment_request: element.payment_request,
        preimage: preimage,
        failure_reason: '',
        invoice_date: element.creation_date,
        description: element.memo,
        destination: '',
      });
    });
    if (lnInv.last_index_offset === '0') {
      break;
    }
    indexOffset = new BigNumber(lnInv.last_index_offset);
  }

  db.sort(dir === 'ascent' ? sortAscent : sortDescent);

  return db;
}
