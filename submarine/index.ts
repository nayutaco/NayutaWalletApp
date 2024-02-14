import {Mutex} from 'await-semaphore';

import * as appDb from 'appdb';
import {listChannels} from 'bridge/channel';
import * as lccontrol from 'bridge/lccontrol';
import * as received from 'bridge/received';
import {subscribeTransactions} from 'bridge/request';
import * as wallet from 'bridge/wallet';
import {backupSubmarineHandler} from 'tools/backup';
import {btcAddressValidate} from 'tools/btctools';
import {labelSubmarinePayment, labelSubmarineInvoiceDescription, labelSubmarineRepayment} from 'tools/const-labels';
import {maxCapacitySat, submarineInvoiceExpiry} from 'tools/constants';
import {LOG} from 'tools/logging';
import Satoshi from 'types/Satoshi';

let csvHeight = 0; // from swap script

const mutex = new Mutex();

let debugStopSubmarineStop = false;

// Callback handler on new transaction detected
const txRecievedHandler = async (data: received.TxReceiveData) => {
  // subscribe new transaction
  LOG.trace(`submarine.txRecievedHandler(${data.txid})`);
  if (!appDb.opened()) {
    LOG.error('submarine.txRecievedHandler: DB not opened');
    return;
  }
  for (let outIndex = 0; outIndex < data.addresses.length; outIndex++) {
    const dbData = await appDb.searchDataFromAddress(data.addresses[outIndex]);
    if (dbData !== null) {
      data.addresses = [data.addresses[outIndex]];
      LOG.trace(`submarine.txRecievedHandler: ${data.addresses}`);
      await startReceive(dbData, data, outIndex);
    }
  }
  appDb.updateHeight(data.height);
  LOG.trace(`submarine.txRecievedHandler(${data.txid}): done`);
};

// Callback handler on LN recieved
received.addLnRecievedHandler('submarine', async (paymentHash: string) => {
  try {
    const otfData = await appDb.onTheFlyData(paymentHash);
    if (otfData && otfData.length > 0) {
      if (otfData[0].status === appDb.dbStatus.Reg) {
        await appDb.onTheFlySettled(paymentHash);
        LOG.trace(`on-the-fly: ${paymentHash}: reg => settled`);
      }
    } else {
      const smData = await appDb.submarineData(paymentHash);
      if (smData && smData.status <= appDb.dbStatus.Settled) {
        appDb.toSettled(paymentHash);
      }
    }
  } catch (_) {
    // not submarine payment
  }
});

function updateDb(comment: string) {
  backupSubmarineHandler();
  LOG.trace(`appDb update: ${comment}`);
}

// Check new transaction during app off and process submarine swap
export async function startup(currentHeight: number) {
  LOG.trace('submarine.startup()');
  await appDb.open();
  await updateDebugState();

  // SubscribeTransactionsは新規txの通知だけなので、
  // 前回から起動するまでの間は自分で調べる
  const lastHeight = await appDb.lastHeight();
  const btc = await wallet.listTransactions(lastHeight, currentHeight);
  LOG.trace(`submarine.startup: btc(start=${lastHeight}, current=${currentHeight})`);
  if (btc.transactions.length > 0) {
    for (let idxBtc = 0; idxBtc < btc.transactions.length; idxBtc++) {
      const element = btc.transactions[idxBtc];
      LOG.trace(`submarine.startup: tx_hash=${element.tx_hash}`);
      for (let outIndex = 0; outIndex < element.dest_addresses.length; outIndex++) {
        const dbData = await appDb.searchDataFromAddress(element.dest_addresses[outIndex]);
        LOG.trace(`submarine.startup: address=${element.dest_addresses[outIndex]}, hash=${dbData?.paymentHash}`);
        if (dbData !== null) {
          const data: received.TxReceiveData = {
            event: '',
            txid: element.tx_hash,
            confirm: element.num_confirmations,
            amount: parseInt(element.amount, 10),
            height: element.block_height,
            addresses: [element.dest_addresses[outIndex]],
          };
          await startReceive(dbData, data, outIndex);
        }
      }
    }
  } else {
    LOG.trace('submarine.startup: no newer transactions.');
  }
  appDb.updateHeight(currentHeight);

  subscribeTransactions();
  received.addTxidReceivedListener(result => {
    mutex.use(async () => {
      await txRecievedHandler(result);
    });
  });
}

// DEBUG
export async function updateDebugState() {
  debugStopSubmarineStop = false;
  if (!appDb.opened()) {
    LOG.error('submarine.updateDebugState: DB not opened');
    return;
  }

  const debug = await appDb.getDebug();
  if (debug !== null) {
    if (debug.includes('swapstop')) {
      debugStopSubmarineStop = true;
    }
  }
}

export async function onTheFlyRegister(paymentHash: string) {
  await appDb.onTheFlyRegister(paymentHash);
}

// Start submarine swap receiving
//
// @param dbData match paymentHash DB data
// @param data transaction data
// @param outIndex tx-outindex using submarine swap
async function startReceive(dbData: appDb.dbSubmarineData, data: received.TxReceiveData, outIndex: number) {
  LOG.info(`submarine.startReceive: paymentHash: ${dbData.paymentHash}, outPoint=${data.txid}:${outIndex}`);
  if (!appDb.opened()) {
    LOG.error('submarine.startReceive: DB not opened');
    return;
  }
  if (data.amount <= 0) {
    LOG.warn(`submarine.startReceive: payed(${dbData.paymentHash}, outPoint=${data.txid}:${outIndex})`);
    return;
  }
  if (dbData.status === appDb.dbStatus.Ignore) {
    LOG.warn(`submarine.startReceive: ignore: ${dbData.paymentHash}`);
    return;
  }
  if (dbData.status >= appDb.dbStatus.Detect || dbData.inTxid !== '') {
    if (dbData.inTxid !== data.txid || dbData.inIndex !== outIndex) {
      LOG.info(`submarine.startReceive: add repay list(${dbData.inTxid}): ${data.txid}:${outIndex} ${dbData.scriptAddress}=${data.amount}`);
      if (await appDb.repaymentAdd(dbData.paymentHash, data.txid, outIndex, data.amount, data.height)) {
        updateDb('add reply list');
      }
    }
    return;
  }

  const fee = await lccontrol.paymentFee(data.amount);
  if (data.amount <= fee) {
    await appDb.toRepayment(dbData.paymentHash);
    await appDb.repaymentAdd(dbData.paymentHash, data.txid, outIndex, data.amount, data.height);
    updateDb('amount too low');
    LOG.warn(`submarine.startReceive: amount too low(${dbData.paymentHash})`);
    return;
  }
  const receiveMax = await lccontrol.receiveMax();
  if (receiveMax > 0 && data.amount > receiveMax) {
    // need create channel to receive.
    const channels = await listChannels();
    let cap = 0;
    for (const ch of channels) {
      cap += ch.capacity;
    }
    if (cap > maxCapacitySat) {
      const msg = `submarine.startReceive: reach max capacity(cap=${cap}>${maxCapacitySat}, receiveMax=${receiveMax}) (${dbData.paymentHash})`;
      LOG.error(msg);
      throw new Error(msg);
    }
  }

  try {
    await wallet.labelTransaction(data.txid, labelSubmarinePayment);
  } catch (e) {
    LOG.error('submarine.startReceive: fail label');
  }
  await appDb.toDetect(dbData.paymentHash, data.txid, outIndex, data.amount, data.height);
  if (debugStopSubmarineStop) {
    LOG.trace('!!STOP SUBMARINE!!');
    return;
  }
  await execute(dbData.paymentHash, data.amount, dbData.preimage, fee);
}

// Create new swap address
export async function createBtcAddress(): Promise<string> {
  LOG.info('submarine.createBtcAddress');

  const keys = await lccontrol.submarineCreateKeys();
  const result = await lccontrol.submarineRegister(keys.paymentHash, keys.repayPubkey);
  // LOG.trace(`submarine.createBtcAddress: ${JSON.stringify(result)}`);
  try {
    await appDb.toRegister(keys.paymentHash, keys.preimage, keys.repayPrivkey, result.htlcPubkey, result.script, result.scriptAddress, result.height);
    updateDb('createBtcAddress');
  } catch (e) {
    LOG.error(`submarine.createBtcAddress: appDb.register: ${JSON.stringify(e)}`);
  }
  LOG.info(`script address: ${result.scriptAddress}`);
  return result.scriptAddress;
}

export async function swapAddresses(): Promise<string[]> {
  if (!appDb.opened()) {
    LOG.error('submarine.swapAddresses: DB not opened');
    return [];
  }
  const result = await appDb.searchDataFromStatus(appDb.dbStatus.None);
  return result.map(elem => elem.scriptAddress);
}

// Check amount to send swap address, create LN invoice and send the invoice to LSP.
// (export for Debug)
//
// @param paymentHash paymentHash
// @param amount received amount
// @param preimage create LN invoice from this preimage
async function execute(paymentHash: string, amount: number, preimage: string, fee: number): Promise<void> {
  LOG.info(`submarine.execute(${paymentHash}, amount=${amount})`);

  let payment_request: string;
  try {
    payment_request = await wallet.addInvoice(
      Satoshi.fromSat(amount - fee),
      labelSubmarineInvoiceDescription,
      submarineInvoiceExpiry,
      preimage,
      false,
    );
  } catch (e: any) {
    LOG.error(`submarine.execute: create invoice: ${e.message}`);
    return;
  }

  LOG.info(`submarine.execute: add invoice: ${payment_request}`);
  try {
    await lccontrol.submarineReceive(paymentHash, payment_request);
    await appDb.toInvoice(paymentHash, payment_request);
    updateDb('toInvoice');
    LOG.info(`submarine.execute: sent invoice to LSP: ${paymentHash}`);
  } catch (e: any) {
    // something error happen
    LOG.error(`submarine.execute: receive error(${JSON.stringify(e)})`);
    await appDb.toIgnore(paymentHash);
    updateDb('toIgnore');
  }
}

export async function repaymentBlock(): Promise<number> {
  if (csvHeight === 0) {
    csvHeight = await lccontrol.submarineRefundBlock();
  }
  return csvHeight;
}

// Repayable Bitcoin amount
//
// @param blockHeight current block height
// @return repayable amount sats
export async function repaymentAmount(blockHeight: number): Promise<number> {
  if (!appDb.opened()) {
    return 0;
  }
  try {
    const data = await appDb.searchRepayableAndLock(blockHeight, await repaymentBlock(), false);
    return data.reduce((previousValue, currentValue) => {
      return previousValue + currentValue.amount;
    }, 0);
  } catch (e: any) {
    LOG.warn(`repaymentAmount: ${e.toString()}`);
    return 0;
  }
}

// Bitcoin amount to be repaid in the future(after confirmed over swap script OP_CSV blocks)
//
// @param blockHeight current block height
// @return repayable amount sats in the future
export async function nonRepaymentAmount(blockHeight: number): Promise<number> {
  if (!appDb.opened()) {
    return 0;
  }
  try {
    const data = await appDb.searchNonRepayable(blockHeight, await repaymentBlock());
    return data.reduce((previousValue, currentValue) => {
      return previousValue + currentValue.amount;
    }, 0);
  } catch (e: any) {
    LOG.warn(`nonRepaymentAmount: ${e.toString()}`);
    return 0;
  }
}

// Repayment Bitcoin from received swap address
//
// @param repayAddress send to this address
// @param blockHeight current block height
// @return (on success)TXID string, (on failure)''
export async function repayment(repayAddress: string, blockHeight: number): Promise<string> {
  LOG.info(`submarine.repayment: address: ${repayAddress}`);
  if (!btcAddressValidate(repayAddress)) {
    const msg = 'submarine.repayment: invalid repayment address';
    LOG.error(msg);
    throw new Error(msg);
  }
  if (!appDb.opened()) {
    const msg = 'submarine.repayment: DB not opened';
    LOG.warn(msg);
    throw new Error(msg);
  }

  const data = await appDb.searchRepayableAndLock(blockHeight, await repaymentBlock());
  if (data.length === 0) {
    const msg = 'submarine.repayment: no detected';
    LOG.error(msg);
    throw new Error(msg);
  }
  LOG.info(`submarine.repayment: ${JSON.stringify(data)}`);

  try {
    const repayParams: lccontrol.repaymentType[] = [];
    for (let idx = 0; idx < data.length; idx++) {
      const element = data[idx];
      const sdata = await appDb.submarineData(element.paymentHash);
      if (sdata != null) {
        const outPoint = element.outPoint.split(':');
        const rep = {
          privkey: sdata.repayPrivkey,
          script: sdata.script,
          txid: outPoint[0],
          index: parseInt(outPoint[1], 10),
          amount: element.amount,
        };
        repayParams.push(rep);
        LOG.debug(`submarine.repayment: repayParams: outpoint=${rep.txid}:${rep.index}, amount=${rep.amount}`);
      }
    }
    const txid = await lccontrol.submarineRepayment(repayParams, repayAddress, labelSubmarineRepayment);
    LOG.info(`submarine.repayment: repaid txid:${txid}`);
    if (txid.length === 64) {
      // return txid
      await appDb.repaymentDone(data);
    }
    return txid;
  } catch (e: any) {
    LOG.error(`submarine.repayment: ${e.message}`);
    throw e;
  }
}

export async function deleteDb() {
  try {
    await appDb.deleteDb();
  } catch (e) {
    //
  }
}

export async function reregisterScript() {
  await appDb.openForce();
  const detected = await appDb.searchDataFromStatus(appDb.dbStatus.Reg, appDb.dbStatus.Repayment);
  for (let idx = 0; idx < detected.length; idx++) {
    try {
      const addr = await lccontrol.submarineReregister(detected[idx].script);
      LOG.info(`reregisterScript: ${addr}`);
      if (addr !== detected[idx].scriptAddress) {
        LOG.error(`reregisterScript: not match: hash=${detected[idx].paymentHash}`);
      }
    } catch (e: any) {
      if (e.goerr && e.goerr.indexOf('already exists') === -1) {
        LOG.error(`reregisterScript: fail register: ${JSON.stringify(e)}`);
      }
    }
  }
}
