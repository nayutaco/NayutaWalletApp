import AesNS from 'react-native-aes-crypto';
import SQLite from 'react-native-sqlite-storage';

import {getSeed} from 'store/keychain';
import {LOG} from 'tools/logging';
const Aes: any = AesNS; // workout TS2339

const dbVersion = 1; // >= 1
const dbName = 'app.db'; // android/app/src/main/java/com/nayuta/core2/ExportFiles.kt

const kdfCost = 5000;
const kdfLength = 256;
let cryptoIv: string;
let cryptoKey: string;

export type dbOnTheFlyData = {
  paymentHash: string;
  status: number;
};
export type dbSubmarineData = {
  paymentHash: string;
  preimage: string;
  repayPrivkey: string;
  htlcPubkey: string;
  script: string;
  scriptAddress: string;
  inTxid: string;
  inIndex: number;
  inAmount: number;
  invoice: string;
  height: number;
  status: number;
};
export type dbSubmarineRepayment = {
  outPoint: string;
  amount: number;
  height: number;
  paymentHash: string;
  done: number;
};

export const dbStatus = {
  None: 0,
  Reg: 1,
  Detect: 2,
  Invoice: 3,
  Settled: 4,
  Repayment: 5,
  Ignore: 99,
};
export type dbStatus = (typeof dbStatus)[keyof typeof dbStatus];

let dbApp: SQLite.SQLiteDatabase;

SQLite.DEBUG(false);
SQLite.enablePromise(true);

async function generateCryptoKey() {
  if (cryptoKey) {
    return;
  }
  const cred = await getSeed();
  if (!cred) {
    throw new Error('generateKey fail');
  }
  const phrase = await Aes.sha256(cred.password);
  const salt = await Aes.sha256(phrase);
  cryptoIv = (await Aes.sha256(salt)).substr(32);
  cryptoKey = await Aes.pbkdf2(phrase, salt, kdfCost, kdfLength);
  LOG.trace('appDb: create crypto key');
}

async function encData(data: string): Promise<string> {
  return await Aes.encrypt(data, cryptoKey, cryptoIv, 'aes-256-cbc');
}

async function decItem(item: dbSubmarineData): Promise<dbSubmarineData> {
  const decPreimage = await Aes.decrypt(item.preimage, cryptoKey, cryptoIv, 'aes-256-cbc');
  const decRepayPrivkey = await Aes.decrypt(item.repayPrivkey, cryptoKey, cryptoIv, 'aes-256-cbc');
  if (decPreimage.length !== 64 || decRepayPrivkey.length !== 64) {
    throw new Error('decItem: fail decode len');
  }
  const hexReg = /^[0-9A-Fa-f]{64}$/;
  if (!hexReg.test(decPreimage) || !hexReg.test(decRepayPrivkey)) {
    throw new Error('decItem: fail decode data');
  }
  parseInt(decPreimage, 16);
  item.preimage = decPreimage;
  item.repayPrivkey = decRepayPrivkey;
  return item;
}

async function hasTable(db: SQLite.SQLiteDatabase): Promise<boolean> {
  const [result] = await db.executeSql(`SELECT name FROM sqlite_master WHERE type='table' AND name='submarines'`);
  return result.rows.length > 0;
}

async function createTable() {
  await dbApp.transaction((tx: SQLite.Transaction) => {
    const onTheFlyTable = 'CREATE TABLE IF NOT EXISTS ontheflys (paymentHash TEXT PRIMARY KEY,status INTEGER)';
    tx.executeSql(onTheFlyTable);

    const submarinesTable =
      'CREATE TABLE IF NOT EXISTS submarines (' +
      'paymentHash TEXT PRIMARY KEY,' +
      'preimage TEXT,' +
      'repayPrivkey TEXT,' +
      'htlcPubkey TEXT,' +
      'script TEXT,' +
      'scriptAddress TEXT,' +
      'inTxid TEXT,' +
      'inIndex INTEGER,' +
      'inAmount INTEGER,' +
      'invoice TEXT,' +
      'status INTEGER,' +
      'height INTEGER)';
    tx.executeSql(submarinesTable);

    const repaymentsTable =
      'CREATE TABLE IF NOT EXISTS repayments (' +
      'outPoint TEXT PRIMARY KEY,' +
      'amount INTEGER,' +
      'height INTEGER,' +
      'paymentHash TEXT,' +
      'done INTEGER)';
    tx.executeSql(repaymentsTable);

    const paymentsTable = 'CREATE TABLE IF NOT EXISTS payments (paymentHash TEXT PRIMARY KEY, invoice TEXT)';
    tx.executeSql(paymentsTable);

    const managesTable = 'CREATE TABLE IF NOT EXISTS manages (id PRIMARY KEY, version INTEGER, last_block_height INTEGER, debug STRING)';
    tx.executeSql(managesTable);
    const managesInsert = `INSERT INTO manages (id,version,last_block_height,debug) VALUES (0, ${dbVersion}, 0, '')`;
    tx.executeSql(managesInsert);
  });
  LOG.info('appDb.createTable: done');
}

/////////////////////
// table: manages
/////////////////////

async function checkVersion(): Promise<boolean> {
  const ver = await version();
  if (ver === dbVersion) {
    return true;
  }
  // updateVersion(1);
  // return true;
  if (ver > dbVersion) {
    LOG.error(`DB file version(${ver}) is newer than app(${dbVersion}).`);
    return false;
  }
  // // migration
  // while (ver >= 0 && ver < dbVersion) {
  //   switch (ver) {
  //     case 1:
  //       ver = await migrateTestFrom1();
  //       break;
  //     case 2:
  //       ver = await migrateTestFrom2();
  //       break;
  //     case 3:
  //       ver = await migrateTestFrom3();
  //       break;
  //   }
  // }
  // if (ver === dbVersion) {
  //   return true;
  // }
  LOG.error(`DB file version mismatch (${ver} != ${dbVersion})`);
  return false;
}

async function initTable() {
  const params: SQLite.DatabaseParams = {
    name: dbName,
    location: 'default',
  };
  dbApp = await SQLite.openDatabase(params);
  // react-native-sqlite-strage change journal mode to "WAL" only iOS.
  // Change mode to "TRUNCATE" to make backup easier.
  //
  // before check code
  // const [beforeMode] = await dbApp.executeSql('PRAGMA journal_mode;');
  // if (beforeMode.rows.length === 1) {
  //   LOG.debug(`appdb: initTable: journal_mode before=${beforeMode.rows.item(0).journal_mode}`);
  // } else {
  //   LOG.error('appdb: initTable: fail get journal_mode(before)');
  // }
  await dbApp.executeSql('PRAGMA journal_mode=TRUNCATE;');
  const [afterMode] = await dbApp.executeSql('PRAGMA journal_mode;');
  if (afterMode.rows.length === 1) {
    const mode = afterMode.rows.item(0).journal_mode;
    LOG.debug(`appdb: initTable: journal_mode after =${mode}`);
    if (mode !== 'truncate') {
      LOG.error(`appdb: initTable: journal_mode != TRUNCATE(${mode})`);
    }
  } else {
    LOG.error('appdb: initTable: fail get journal_mode(after)');
  }
  const result = await hasTable(dbApp);
  if (!result) {
    await createTable();
    LOG.info('appDb: initTable');
  } else {
    const check = await checkVersion();
    LOG.trace(`appDb: initTable: ${check}`);
    if (!check) {
      throw new Error('appDb: fail check');
    }
  }
}

export async function deleteTable() {
  await open();
  if (dbApp != null) {
    LOG.trace('appDb:deleteTable - delete');
    await dbApp.transaction((tx: SQLite.Transaction) => {
      tx.executeSql('DELETE FROM submarines;');
      tx.executeSql('DELETE FROM repayments;');
      tx.executeSql('DELETE FROM manages;');
      LOG.info('appDb: deleted.');
    });
    await createTable();
  } else {
    LOG.warn('appDb:deleteTable - not open');
  }
}

export function opened(): boolean {
  const ret = dbApp != null && cryptoKey != null;
  if (!ret) {
    LOG.warn('appDb not opened.');
  }
  return ret;
}

export async function init() {
  await initTable();
}

// Open the appDb.
// Initialize and create the table for the first time.
export async function open() {
  await generateCryptoKey();
}

export async function openForce() {
  await generateCryptoKey();
  await initTable();
}

export async function deleteDb() {
  if (dbApp != null) {
    await dbApp.close();
  }
  const params: SQLite.DatabaseParams = {
    name: dbName,
    location: 'default',
  };
  await SQLite.deleteDatabase(params);
}

// // Update version
// async function updateVersion(ver: number) {
//   LOG.trace(`appDb:updateVersion(${ver})`);
//   const sql = `UPDATE manages SET version=${ver};`;
//   await dbApp.transaction((tx: SQLite.Transaction) => {
//     tx.executeSql(sql);
//   });
// }

// DB version
// Return 0 if cannot get version from DB.
async function version(): Promise<number> {
  const sql = 'SELECT version FROM manages;';
  const [dtResult] = await dbApp.executeSql(sql);
  if (dtResult.rows.length === 1) {
    return dtResult.rows.item(0).version;
  } else {
    LOG.error('appDb:version: fail manages.version');
    return 0;
  }
}

// Update last subscribed Bitcoin block height
export async function updateHeight(height: number) {
  LOG.trace(`appDb:updateHeight(${height})`);
  const sql = `UPDATE manages SET last_block_height=${height} WHERE last_block_height<${height};`;
  await dbApp.transaction((tx: SQLite.Transaction) => {
    tx.executeSql(sql);
  });
}

// Get last subscribed Bitcoin block height
export async function lastHeight(): Promise<number> {
  const sql = 'SELECT last_block_height FROM manages;';
  const [dtResult] = await dbApp.executeSql(sql);
  if (dtResult.rows.length === 1) {
    return dtResult.rows.item(0).last_block_height;
  } else {
    LOG.error('submarine.lastHeight');
    return 0;
  }
}

// DEBUG
export async function setDebug(debug: string) {
  LOG.trace(`appDb:setDebug(${debug})`);
  const sql = `UPDATE manages SET debug='${debug}';`;
  await dbApp.transaction((tx: SQLite.Transaction) => {
    tx.executeSql(sql);
  });
}

// DEBUG
export async function getDebug(): Promise<string> {
  const sql = 'SELECT debug FROM manages;';
  const [dtResult] = await dbApp.executeSql(sql);
  if (dtResult.rows.length === 1) {
    const debug = dtResult.rows.item(0).debug;
    LOG.trace(`appDb:getDebug:${debug}`);
    return debug;
  } else {
    LOG.error('submarine.debug');
    return '';
  }
}

/////////////////////
// table: ontheflys
/////////////////////

export async function onTheFlyData(paymentHash: string): Promise<dbOnTheFlyData[] | null> {
  let sql = 'SELECT * FROM ontheflys';
  if (paymentHash.length === 64) {
    sql = sql + ` WHERE paymentHash='${paymentHash}'`;
  }
  sql = sql + ';';
  const [dtResult] = await dbApp.executeSql(sql);
  const len = dtResult.rows.length;
  const result: dbOnTheFlyData[] = [];
  for (let idx = 0; idx < len; idx++) {
    result.push(dtResult.rows.item(idx));
  }
  return result;
}

export async function onTheFlyRegister(paymentHash: string) {
  // LOG.trace(`appDb: onTheFlyRegister(${paymentHash})`);
  const sql = `INSERT INTO ontheflys (paymentHash, status) VALUES ('${paymentHash}', ${dbStatus.Reg})`;
  await dbApp.transaction((tx: SQLite.Transaction) => {
    tx.executeSql(sql);
  });
}

export async function onTheFlySettled(paymentHash: string) {
  // LOG.trace(`appDb: onTheFlySettled(${paymentHash})`);
  const sql = `UPDATE ontheflys SET status=${dbStatus.Settled} WHERE paymentHash='${paymentHash}';`;
  await dbApp.transaction((tx: SQLite.Transaction) => {
    tx.executeSql(sql);
  });
}

/////////////////////
// table: submarines
/////////////////////

// Get appDb data from paymentHash
export async function submarineData(paymentHash: string): Promise<dbSubmarineData | null> {
  let sql = 'SELECT * FROM submarines';
  if (paymentHash.length === 64) {
    sql = sql + ` WHERE paymentHash='${paymentHash}'`;
  }
  sql = sql + ';';
  const [dtResult] = await dbApp.executeSql(sql);
  if (dtResult.rows.length === 1) {
    try {
      return await decItem(dtResult.rows.item(0));
    } catch (e) {
      LOG.error(`submarine.submarineData: paymentHash=${paymentHash}`);
      return null;
    }
  } else {
    // not found
    return null;
  }
}

// Get appDb data from swap address
export async function searchDataFromAddress(address: string): Promise<dbSubmarineData | null> {
  const sql = `SELECT * FROM submarines WHERE scriptAddress='${address}';`;
  const [dtResult] = await dbApp.executeSql(sql);
  if (dtResult.rows.length === 1) {
    try {
      return await decItem(dtResult.rows.item(0));
    } catch (e) {
      LOG.error(`submarine.searchDataFromAddress: address=${address}`);
      return null;
    }
  } else {
    // 'not found' is often happened.
    return null;
  }
}

// Get submarinDb data from status
export async function searchDataFromStatus(status: dbStatus, statusTo: dbStatus | null = null): Promise<dbSubmarineData[]> {
  if (!dbApp) {
    LOG.error('dbApp is null.');
    return [];
  }
  let where;
  if (status === dbStatus.None) {
    where = '';
  } else {
    if (statusTo === null) {
      where = `WHERE status=${status}`;
    } else {
      where = `WHERE status>=${status} AND status<=${statusTo}`;
    }
  }
  const sql = `SELECT * FROM submarines ${where};`;
  const [dtResult] = await dbApp.executeSql(sql);
  const len = dtResult.rows.length;
  const result: dbSubmarineData[] = [];
  for (let idx = 0; idx < len; idx++) {
    try {
      result.push(await decItem(dtResult.rows.item(idx)));
    } catch (e) {
      LOG.error(`submarine.searchDataFromStatus(${status}-${statusTo ?? '--'}): ${JSON.stringify(e)}`);
      return [];
    }
  }
  return result;
}

// Change status=REG
export async function toRegister(
  paymentHash: string,
  preimage: string,
  repayPrivkey: string,
  htlcPubkey: string,
  script: string,
  scriptAddress: string,
  height: number,
) {
  // LOG.trace(`appDb: toRegister(${paymentHash})`);
  const encPreimage = await encData(preimage);
  const encRepayPrivkey = await encData(repayPrivkey);
  const sql =
    `INSERT INTO submarines (paymentHash, preimage, repayPrivkey, htlcPubkey, script, scriptAddress, height, status, inTxid, inIndex, inAmount, invoice) VALUES (` +
    `'${paymentHash}', '${encPreimage}', '${encRepayPrivkey}', '${htlcPubkey}', '${script}', '${scriptAddress}', ${height}, ${dbStatus.Reg}, '', -1, 0, '')`;
  await dbApp.transaction((tx: SQLite.Transaction) => {
    tx.executeSql(sql);
  });
}

// Changestatus=DETECT
export async function toDetect(paymentHash: string, inTxid: string, inIndex: number, inAmount: number, height: number) {
  // LOG.trace(`appDb: detect(${paymentHash})`);
  const sql = `UPDATE submarines SET inTxid='${inTxid}', inIndex=${inIndex}, inAmount=${inAmount}, height=${height}, status=${dbStatus.Detect} WHERE paymentHash='${paymentHash}' AND status<${dbStatus.Detect};`;
  await dbApp.transaction((tx: SQLite.Transaction) => {
    tx.executeSql(sql);
  });
}

// Change status=INV
export async function toInvoice(paymentHash: string, invoice: string) {
  // LOG.trace(`appDb: toInvoice(${paymentHash})`);
  const sql = `UPDATE submarines SET invoice='${invoice}', status=${dbStatus.Invoice} WHERE paymentHash='${paymentHash}' AND status<${dbStatus.Invoice};`;
  await dbApp.transaction((tx: SQLite.Transaction) => {
    tx.executeSql(sql);
  });
}

// Change status=SETTLED
export async function toSettled(paymentHash: string) {
  // LOG.trace(`appDb: toSettled(${paymentHash})`);
  const sql = `UPDATE submarines SET status=${dbStatus.Settled} WHERE paymentHash='${paymentHash}' AND status<${dbStatus.Settled};`;
  await dbApp.transaction((tx: SQLite.Transaction) => {
    tx.executeSql(sql);
  });
}

// Change status=REPAYMENT
export async function toRepayment(paymentHash: string) {
  // LOG.trace(`appDb: toRepayment(${paymentHash})`);
  const sql = `UPDATE submarines SET status=${dbStatus.Repayment} WHERE paymentHash='${paymentHash}' AND status<${dbStatus.Repayment};`;
  await dbApp.transaction((tx: SQLite.Transaction) => {
    tx.executeSql(sql);
  });
}

// Change status=IGNORE
export async function toIgnore(paymentHash: string) {
  LOG.trace(`appDb: toIgnore(${paymentHash})`);
  const sql = `UPDATE submarines SET status=${dbStatus.Ignore} WHERE paymentHash='${paymentHash}';`;
  await dbApp.transaction((tx: SQLite.Transaction) => {
    tx.executeSql(sql);
  });
}

/////////////////////
// table: repayments
/////////////////////

// Add to repayment table
export async function repaymentAdd(paymentHash: string, txid: string, index: number, amount: number, height: number): Promise<boolean> {
  const outPoint = `${txid}:${index}`;
  const [dtResult] = await dbApp.executeSql(`SELECT outPoint FROM repayments WHERE outPoint='${outPoint}';`);
  if (dtResult.rows.length !== 0) {
    LOG.trace(`repaymentAdd: already registered: ${outPoint}`);
    return false;
  }
  const sql = `INSERT INTO repayments (outPoint, amount, height, paymentHash, done) VALUES ('${outPoint}', ${amount}, ${height}, '${paymentHash}', 0)`;
  await dbApp.transaction((tx: SQLite.Transaction) => {
    tx.executeSql(sql);
  });
  return true;
}

// Get repayment data
//
// @param repayDone 0(=not done) or 1(=done) or null(both)
export async function repaymentData(repayDone: number | null): Promise<dbSubmarineRepayment[]> {
  let where;
  if (repayDone !== null) {
    where = `WHERE done=${repayDone}`;
  }
  const sql = `SELECT * FROM repayments ${where};`;
  const [dtResult] = await dbApp.executeSql(sql);
  const len = dtResult.rows.length;
  const result: dbSubmarineRepayment[] = [];
  for (let idx = 0; idx < len; idx++) {
    result.push(dtResult.rows.item(idx));
  }
  return result;
}

// Search repayable paymentHash.
// "Repayable" means the swap addresses that received Bitcoin, has not been swap processed, and over OP_CSV limit.
//
// @param blockHeight current block height
// @param csvHeight Bitcoin script OP_CSV block number
// @param updateDb(default: true) true: add to repayment table and change status=REPAYMENT, false: only search
export async function searchRepayableAndLock(blockHeight: number, csvHeight: number, updateDb = true): Promise<dbSubmarineRepayment[]> {
  const detected = await searchDataFromStatus(dbStatus.Detect, dbStatus.Invoice);
  const notRepay = await repaymentData(0);

  const data: dbSubmarineRepayment[] = [];
  await dbApp.transaction((tx: SQLite.Transaction) => {
    for (let idx = 0; idx < detected.length; idx++) {
      const element = detected[idx];
      if (blockHeight - element.height >= csvHeight && element.inTxid.length > 0 && element.inAmount > 0) {
        const repayData = {
          outPoint: `${element.inTxid}:${element.inIndex}`,
          amount: element.inAmount,
          height: element.height,
          paymentHash: element.paymentHash,
          done: 0,
        };
        data.push(repayData);
        LOG.debug(`appdb.searchRepayableAndLock: ${element.paymentHash}: amount=${element.inAmount}`);
        if (updateDb) {
          const sqlIns =
            `INSERT OR IGNORE INTO repayments (outPoint, amount, height, paymentHash, done) VALUES (` +
            `'${element.inTxid}:${element.inIndex}', ${element.inAmount}, ${element.height}, '${element.paymentHash}', 0)`;
          tx.executeSql(sqlIns);
          const sqlUpd = `UPDATE submarines SET status=${dbStatus.Repayment} WHERE paymentHash='${element.paymentHash}';`;
          tx.executeSql(sqlUpd);
        }
      }
    }
    notRepay.forEach(element => {
      if (blockHeight - element.height >= csvHeight && element.amount > 0) {
        data.push(element);
        LOG.debug(`appdb.searchRepayableAndLock-repay: ${element.paymentHash}: amount=${element.amount}`);
      }
    });
  });

  return data;
}

// Search non-repayable paymentHash.
// "Non-Repayable" means the swap addresses that received Bitcoin, has not been processed, and not OP_CSV limit.
//
// @param blockHeight current block height
// @param csvHeight Bitcoin script OP_CSV block number
export async function searchNonRepayable(blockHeight: number, csvHeight: number): Promise<dbSubmarineRepayment[]> {
  const detected = await searchDataFromStatus(dbStatus.Detect, dbStatus.Invoice);
  const notRepay = await repaymentData(0);

  const data: dbSubmarineRepayment[] = [];
  for (let idx = 0; idx < detected.length; idx++) {
    const element = detected[idx];
    if (blockHeight - element.height < csvHeight && element.inTxid.length > 0 && element.inAmount > 0) {
      const repayData = {
        outPoint: `${element.inTxid}:${element.inIndex}`,
        amount: element.inAmount,
        height: element.height,
        paymentHash: element.paymentHash,
        done: 0,
      };
      data.push(repayData);
      LOG.debug(
        `appdb.searchNonRepayable: ${element.paymentHash}: amount=${element.inAmount}(remain block=${csvHeight - (blockHeight - element.height)})`,
      );
    }
  }
  notRepay.forEach(element => {
    if (blockHeight - element.height < csvHeight && element.amount > 0) {
      data.push(element);
      LOG.debug(
        `appdb.searchNonRepayable-repay: ${element.paymentHash}: amount=${element.amount}(remain block=${
          csvHeight - (blockHeight - element.height)
        })`,
      );
    }
  });

  return data;
}

// Repayment done
export async function repaymentDone(data: dbSubmarineRepayment[]) {
  await dbApp.transaction((tx: SQLite.Transaction) => {
    for (let idx = 0; idx < data.length; idx++) {
      const element = data[idx];
      const sql = `UPDATE repayments SET done=1 WHERE outPoint='${element.outPoint}';`;
      tx.executeSql(sql);
    }
  });
}

/////////////////////
// table: payments
/////////////////////

export async function addPaymentInvoice(paymentHash: string, invoice: string) {
  try {
    const sql = `INSERT OR IGNORE INTO payments (paymentHash, invoice) VALUES ('${paymentHash}', '${invoice}')`;
    await dbApp.transaction((tx: SQLite.Transaction) => {
      tx.executeSql(sql);
    });
  } catch (e: any) {
    LOG.error(`addPaymentInvoice: err=${e.toString()}`);
  }
}

export async function getPaymentInvoice(paymentHash: string): Promise<string> {
  const sql = `SELECT invoice FROM payments WHERE paymentHash='${paymentHash}'`;
  const [dtResult] = await dbApp.executeSql(sql);
  return dtResult.rows.length === 1 ? dtResult.rows.item(0).invoice : '';
}

/////////////////////
// migrations
/////////////////////
