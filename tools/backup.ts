import {Buffer} from 'buffer';

import {Mutex} from 'await-semaphore';
import {NativeModules, Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

import * as bgtimer from './bgtimer';
import * as google from './google';
import * as icloud from './icloud';
import {dateString} from './locale';
import {LOG} from './logging';

import {isBase64} from './';

import * as backup from 'bridge/backup';
import * as exports from 'bridge/exports';
import {getInfo} from 'bridge/manager';
import * as notification from 'bridge/notification';
import {addLnBackupListener} from 'bridge/received';
import {subscribeChannelBackups} from 'bridge/request';
import {getSeed} from 'store/keychain';
import {setNeedManualBackup, setAutoBackupResult} from 'store/storage';
import {getInitialState} from 'store/storeContext';
import {deleteDb, reregisterScript} from 'submarine';

const {NETWORK} = NativeModules.AppConfig;

// Platform specific
const iosAppDbFilename = `${RNFS.LibraryDirectoryPath}/LocalDatabase/app.db`;
const iosAppBackupFilename = `${RNFS.DocumentDirectoryPath}/application.backup`;
const iosChannelBackupFilename = `${RNFS.DocumentDirectoryPath}/channel.backup`;
const icloudBackupPath = 'backup'; // iCloudの'Documents/'直下

// backup prefix
const prefixChan = 'chan';
const prefixSubmarine = 'submarine';

// delay for multiple callback because of zero-conf channel
const delayBackupSubmarineMsec = 5000;

const mutex = new Mutex();
let baseFilename: string;
let lastBackupCount = 0;

type ChanBackupBase = {
  version: number;
};

type ChanBackupVer1 = {
  version: number;
  backupBase64: string;
  chanPoints: backup.ChanPoint[];
  info: {
    date: string;
    os: string;
    app: string;
    version: string;
  };
};

function dataVer1(scbData: string, chanPoints: backup.ChanPoint[]): string {
  const data: ChanBackupVer1 = {
    version: 1,
    backupBase64: scbData,
    chanPoints,
    info: {
      date: dateString(new Date(), true),
      os: DeviceInfo.getSystemName(),
      app: DeviceInfo.getApplicationName(),
      version: DeviceInfo.getVersion(),
    },
  };
  return JSON.stringify(data);
}

function decodeDataVer1(data: ChanBackupVer1): string {
  return data.backupBase64;
}

function decodeData(backupData: string): string {
  const data = JSON.parse(backupData);
  const base = data as ChanBackupBase;
  switch (base.version) {
    case 1:
      return decodeDataVer1(data);
    default:
      throw new Error('unknown backup file version');
  }
}

async function backupFilenameBase(): Promise<string> {
  if (!baseFilename) {
    const info = await getInfo();
    baseFilename = `-${NETWORK}-${info.identity_pubkey}.backup`;
  }
  return baseFilename;
}

// auto LN channel backup
async function backupChanProc(backupString: string, backupChanPoints: backup.ChanPoint[], count: number) {
  LOG.debug(`backupChanProc: start(count=${count})`);
  if (count < lastBackupCount) {
    LOG.debug(`skip: old backup: ${count} < ${lastBackupCount}`);
    return;
  }
  switch (Platform.OS) {
    case 'android':
      await backupChanProcAndroid(backupString, backupChanPoints);
      break;
    case 'ios':
      await backupChanProcIos(backupString, backupChanPoints);
      break;
    default:
      throw new Error(`backupChanProc: unknown platform(${Platform.OS})`);
  }
  LOG.debug('backupChanProc: done');
}

// auto LN channel backup(Android)
async function backupChanProcAndroid(backupString: string, backupChanPoints: backup.ChanPoint[]) {
  LOG.debug('backupChanProcAndroid: start');
  const now = dateString(new Date(), false);
  try {
    const fname = `${prefixChan}${await backupFilenameBase()}`;
    await google.gdriveUploadText(fname, dataVer1(backupString, backupChanPoints));

    // notification update(success)
    const msg = notification.message.backupScb.replace('{RESULT}', now);
    notification.messageNormal(msg);
    LOG.debug('backupChanProcAndroid: done');
  } catch (e: any) {
    // notification update(fail)
    const msg = notification.message.backupScbFail.replace('{RESULT}', now);
    notification.messageAlert(msg);
    LOG.debug(`backupChanProcAndroid: fail: ${e.toString()}`);
  }
}
// auto LN channel backup(iOS)
async function backupChanProcIos(backupString: string, backupChanPoints: backup.ChanPoint[]) {
  LOG.debug('backupChanProcIos: start');
  const fname = `${prefixChan}${await backupFilenameBase()}`;
  const channelBackupFilename = `${RNFS.TemporaryDirectoryPath}/${fname}`;
  const chanBackupData = dataVer1(backupString, backupChanPoints);
  if (await RNFS.exists(channelBackupFilename)) {
    await RNFS.unlink(channelBackupFilename);
  }
  await RNFS.writeFile(channelBackupFilename, chanBackupData, 'utf8');
  await icloud.fileUpload(channelBackupFilename, icloudBackupPath, fname);
  LOG.debug('backupChanProcIos: done');
}

// auto Submarine Swap backup
async function backupSubmarineProc() {
  LOG.debug('backupSubmarineProc: start');
  switch (Platform.OS) {
    case 'android':
      await backupSubmarineProcAndroid();
      break;
    case 'ios':
      await backupSubmarineProcIos();
      break;
    default:
      throw new Error(`backupSubmarineProc: unknown platform(${Platform.OS})`);
  }
  LOG.debug('backupSubmarineProc: done');
}

// auto Submarine Swap backup(Android)
async function backupSubmarineProcAndroid() {
  LOG.debug('backupSubmarineProcAndroid: start');
  const now = dateString(new Date(), false);
  try {
    const fname = `${prefixSubmarine}${await backupFilenameBase()}`;
    await google.gdriveUploadBin(fname, await exports.readSubmarineBackup());

    // notification update(success)
    const msg = notification.message.backupDb.replace('{RESULT}', now);
    notification.messageNormal(msg);
    LOG.debug('backupSubmarineProcAndroid: done');
  } catch (e: any) {
    // notification update(fail)
    const msg = notification.message.backupDbFail.replace('{RESULT}', now);
    notification.messageAlert(msg);
    LOG.error(`backupSubmarineProcAndroid: fail: ${e.toString()}`);
  }
}

// auto Submarine Swap backup(iOS)
async function backupSubmarineProcIos() {
  LOG.debug('backupSubmarineProcIos: start');
  const fnameBase = await backupFilenameBase();
  const fnameSubmarine = `${prefixSubmarine}${fnameBase}`;
  await icloud.fileUpload(iosAppDbFilename, icloudBackupPath, fnameSubmarine);
  LOG.debug('backupSubmarineProcIos: done');
}

export async function startup() {
  await backupFilenameBase();

  // LND channel backup update
  addLnBackupListener(async (backupBase64: string, chanPoints: backup.ChanPoint[], count: number) => {
    const state = await getInitialState();
    if (!state.googleBackup && !state.icloudBackup) {
      LOG.debug('addLnBackupListener: skip auto backup');
      // for Home alert
      await setNeedManualBackup(true);
      return;
    }
    if (count <= lastBackupCount) {
      LOG.debug(`addLnBackupListener: old backup(${count} <= ${lastBackupCount})`);
    }
    lastBackupCount = count;
    LOG.debug(`addLnBackupListener: ${lastBackupCount}`);
    mutex.use(async () => {
      try {
        await backupChanProc(backupBase64, chanPoints, count);
        setAutoBackupResult(true);
      } catch (e: any) {
        LOG.error(`addLnBackupListener: fail backup: ${e.toString()}`);
        setAutoBackupResult(false);
      }
    });
  });

  // start subscribing channel backup update
  subscribeChannelBackups();
}

// submarineDB backup callback
export async function backupSubmarineHandler() {
  const onEvent = () => {
    mutex.use(async () => {
      try {
        await backupSubmarineProc();
        setAutoBackupResult(true);
      } catch (e: any) {
        LOG.error('backupSubmarineHandler.onEvent: backupSubmarineProc: ' + e.message);
        setAutoBackupResult(false);
      }
    });
  };

  const state = await getInitialState();
  if (!state.googleBackup && !state.icloudBackup) {
    LOG.debug('backupSubmarineHandler: skip auto backup');
    return;
  }
  LOG.debug('backupSubmarineHandler: bgtimer');
  // 何度かsubmarine.のappDb updateが発生するので最後の更新からしばらく待って実行する
  // JavaScriptのタイマーはバックグラウンドでは動作しないのでbgtimerを使用する。
  try {
    bgtimer.addHandler('backup', delayBackupSubmarineMsec, true, onEvent, true); // restart
  } catch (e: any) {
    LOG.error(`backup: maybe coding bug: ${e}`);
    // not throw
  }
}

// upload channel backup to Google Drive
export async function backupAllToGdrive() {
  LOG.trace('backupAllToGdrive: start');
  const fnameBase = await backupFilenameBase();

  const [backupData, chanPoints] = await backup.channelBackup();
  const fname = `${prefixChan}${fnameBase}`;
  await google.gdriveUploadText(fname, dataVer1(backupData, chanPoints));
  const fnameSubmarine = `${prefixSubmarine}${fnameBase}`;
  await google.gdriveUploadBin(fnameSubmarine, await exports.readSubmarineBackup());
  LOG.trace('backupAllToGdrive: end');
}

export async function backupAllToIcloud() {
  LOG.trace('backupAllToIcloud: start');
  const fnameBase = await backupFilenameBase();

  LOG.trace('backupAllToIcloud: channel');
  const [backupData, chanPoints] = await backup.channelBackup();
  const fname = `${prefixChan}${fnameBase}`;
  const channelBackupFilename = `${RNFS.TemporaryDirectoryPath}/${fname}`;
  const chanBackupData = dataVer1(backupData, chanPoints);
  if (await RNFS.exists(channelBackupFilename)) {
    await RNFS.unlink(channelBackupFilename);
  }
  await RNFS.writeFile(channelBackupFilename, chanBackupData, 'utf8');
  await icloud.fileUpload(channelBackupFilename, icloudBackupPath, fname);

  LOG.trace('backupAllToIcloud: submarine');
  const fnameSubmarine = `${prefixSubmarine}${fnameBase}`;
  await icloud.fileUpload(iosAppDbFilename, icloudBackupPath, fnameSubmarine);
  LOG.trace('backupAllToIcloud: end');
}

// export channel/app.db backup
//  app.db --> application.backup (base64)
//  channel backup --> channel.backup (dataVer1 format)
export async function backupChanToFile() {
  LOG.debug('backupChanToFile');
  const [backupData, chanPoints] = await backup.channelBackup();
  const chanBackupData = dataVer1(backupData, chanPoints);
  if (Platform.OS === 'android') {
    // On Android, RNFS cannot access the Database directory.
    await exports.exportBackups(chanBackupData);
    await setNeedManualBackup(false);
  } else if (Platform.OS === 'ios') {
    const appDbFilename = iosAppDbFilename;
    const appBackupFilename = iosAppBackupFilename;
    const channelBackupFilename = iosChannelBackupFilename;

    if (await RNFS.exists(appBackupFilename)) {
      await RNFS.unlink(appBackupFilename);
    }
    if (await RNFS.exists(channelBackupFilename)) {
      await RNFS.unlink(channelBackupFilename);
    }
    // await RNFS.copyFile(appDbFilename, appBackupFilename);
    const appdb = await RNFS.readFile(appDbFilename, 'base64');
    await RNFS.writeFile(appBackupFilename, appdb);
    await RNFS.writeFile(channelBackupFilename, chanBackupData, 'utf8');

    const option = {
      title: 'export backup files',
      failOnCancel: false,
      saveToFiles: false,
      urls: [appBackupFilename, channelBackupFilename],
    };
    const res = await Share.open(option);
    if (res.success) {
      await setNeedManualBackup(false);
    }
    LOG.debug(`Export backup RESULT: ${JSON.stringify(res)}`);
  }
}

// Select channel backup file and decode file data
async function readChanBackupFile(): Promise<[string, string]> {
  LOG.debug('readChanBackupFile');
  const result = await exports.readTextFile();
  const backupBase64 = decodeData(result.text);
  return [backupBase64, result.filename];
}

// Select channel backup file and recover channel backup
export async function recoverChanFromFile() {
  LOG.debug('recoverChanFromFile');
  const [backupBase64] = await readChanBackupFile();
  await backup.recoveryChannel(backupBase64);
}

export async function recoverChanFromData(jsonText: string) {
  const backupBase64 = decodeData(jsonText);
  await backup.recoveryChannel(backupBase64);
}

// Select appdb backup file and recover app.db
export async function recoverAppFromFile() {
  LOG.debug('recoverAppFromFile');
  const result = await exports.readTextFile();
  await recoverAppFromData(result.text);
  LOG.debug('recoverAppFromFile: done');
}

// text: SQLite base64 data
export async function recoverAppFromData(text: string) {
  if (!isBase64(text)) {
    throw new Error('not base64 string');
  }
  const bin = Buffer.from(text, 'base64');
  const SQLITE_HEADER = 'SQLite format 3\0';
  const header = bin.toString('utf8', 0, 16);
  if (header !== SQLITE_HEADER) {
    throw new Error('not application backup data');
  }

  await deleteDb();
  if (Platform.OS === 'android') {
    // create {DatabasePath}/app.db from base64 data
    await exports.createSubmarineDbFile(bin);
  } else if (Platform.OS === 'ios') {
    // create {iosAppDbFilename}/app.db
    const appDbFilename = iosAppDbFilename;
    await RNFS.writeFile(appDbFilename, text, 'base64');
  }
  await reregisterScript();
  LOG.debug('recoverAppFromData: done');
}

// Read channel backup file and recovery from Google Drive
export async function recoverChanFromGdrive(isApply = true) {
  const fnameBase = await backupFilenameBase();
  const fname = `${prefixChan}${fnameBase}`;
  const chan = await google.gdriveFileReadText(fname);
  const scbData = decodeData(chan);
  LOG.debug(`recoverChanFromGdrive: ${scbData.length}`);
  if (isApply) {
    await backup.recoveryChannel(scbData);
    LOG.debug('recoverChanFromGdrive: done');
  } else {
    await backup.verifyChannelBackup(scbData);
    LOG.debug('recoverChanFromGdrive: test done');
  }
}

// Read channel backup file and recovery from iCloud Drive
export async function recoverChanFromIcloud(isApply = true) {
  const fnameBase = await backupFilenameBase();
  const fname = `${prefixChan}${fnameBase}`;
  const chan = await icloud.fileReadText(icloudBackupPath, fname);
  const scbData = decodeData(chan);
  LOG.debug(`recoverChanFromIcloud: ${scbData.length}`);
  if (isApply) {
    await backup.recoveryChannel(scbData);
    LOG.debug('recoverChanFromIcloud: done');
  } else {
    await backup.verifyChannelBackup(scbData);
    LOG.debug('recoverChanFromIcloud: test done');
  }
}

// Read submarine backup file and recover submarine DB file from Google Drive
async function recoverSubmarineFromGdrive(isApply = true) {
  const fnameBase = await backupFilenameBase();
  const fnameSubmarine = `${prefixSubmarine}${fnameBase}`;
  const bin = await google.gdriveFileReadBin(fnameSubmarine);
  LOG.debug(`recoverSubmarineFromGdrive: ${bin.length}`);
  if (isApply) {
    await deleteDb();
    await exports.createSubmarineDbFile(bin);
    await reregisterScript();
    LOG.debug('recoverSubmarineFromGdrive: done');
  } else {
    if (bin.length === 0) {
      throw new Error('small file size');
    }
    LOG.debug('recoverSubmarineFromGdrive: test done');
  }
}

// Read submarine backup file and recover submarine DB file from iCloud Drive
async function recoverSubmarineFromIcloud(isApply = true) {
  const fnameBase = await backupFilenameBase();
  const fnameSubmarine = `${prefixSubmarine}${fnameBase}`;
  const icloudPath = await icloud.fileDownload(icloudBackupPath, fnameSubmarine);
  if (isApply) {
    LOG.debug(`recoverSubmarineFromIcloud: ${icloudPath}`);
    await deleteDb();
    await RNFS.copyFile(icloudPath, iosAppDbFilename);
    await reregisterScript();
    LOG.debug('recoverSubmarineFromIcloud: done');
  } else {
    LOG.debug('recoverSubmarineFromIcloud: test done');
  }
}

// Read metadata from Google Drive and return latest timestamp
export async function getLastBackupDateFromGdrive(): Promise<Date | null> {
  const fnameBase = await backupFilenameBase();
  const result = await google.gdriveMetadata(fnameBase);
  let dtChan = null;
  let dtSubmarine = null;
  for (let idx = 0; idx < result.length; idx++) {
    if (result[idx].name.match(new RegExp(`^${prefixChan}`))) {
      dtChan = result[idx].date;
    } else if (result[idx].name.match(new RegExp(`^${prefixSubmarine}`))) {
      dtSubmarine = result[idx].date;
    }
  }
  let retDate = null;
  if (dtChan || dtSubmarine) {
    if (dtChan && dtSubmarine) {
      retDate = dtChan > dtSubmarine ? dtChan : dtSubmarine;
    } else {
      retDate = dtChan ?? dtSubmarine;
    }
  }
  return retDate;
}

export async function recoverTestFromGdrive() {
  await google.googleSignIn();
  await google.gdriveSetup();
  let errMsg = '';
  try {
    await recoverChanFromGdrive(false);
  } catch (e: any) {
    LOG.error(`recoverChanFromGdrive: test fail(${e.toString()})`);
    errMsg = `recoverChanFromGdrive\n`;
  }
  try {
    await recoverSubmarineFromGdrive(false);
  } catch (e: any) {
    LOG.error(`recoverSubmarineFromGdrive: test fail(${e.toString()})`);
    errMsg = `${errMsg}recoverSubmarineFromGdrive\n`;
  }
  if (errMsg.length > 0) {
    throw new Error(errMsg);
  }
}

export async function recoverTestFromIcloud() {
  LOG.trace('recoverTestFromIcloud: start');
  let errMsg = '';
  try {
    LOG.trace('recoverTestFromIcloud: recoverChanFromIcloud');
    await recoverChanFromIcloud(false);
  } catch (e: any) {
    LOG.error(`recoverChanFromIcloud: test fail(${e.toString()})`);
    errMsg = `recoverChanFromIcloud\n`;
  }
  try {
    LOG.trace('recoverTestFromIcloud: recoverSubmarineFromIcloud');
    await recoverSubmarineFromIcloud(false);
  } catch (e: any) {
    LOG.error(`recoverSubmarineFromIcloud: test fail(${e.toString()})`);
    errMsg = `${errMsg}recoverSubmarineFromIcloud\n`;
  }
  if (errMsg.length > 0) {
    LOG.error('recoverTestFromIcloud: throw');
    throw new Error(errMsg);
  }
  LOG.trace('recoverTestFromIcloud: end');
}

export async function recoverAllFromGdrive(signin = true) {
  if (signin) {
    await google.googleSignIn();
  }
  await google.gdriveSetup();
  const errMsg = [];
  try {
    await recoverChanFromGdrive();
  } catch (e: any) {
    LOG.error(`recoverChanFromGdrive: fail(${e.toString()})`);
    errMsg.push('recoverChanFromGdrive');
  }
  try {
    await recoverSubmarineFromGdrive();
  } catch (e: any) {
    LOG.error(`recoverSubmarineFromGdrive: fail(${e.toString()})`);
    errMsg.push('recoverSubmarineFromGdrive');
  }
  if (errMsg.length > 0) {
    throw new Error(errMsg.join(','));
  }
}

export async function recoverAllFromIcloud() {
  const errMsg = [];
  try {
    await recoverChanFromIcloud();
  } catch (e: any) {
    LOG.error(`recoverAllFromIcloud: fail(${e.toString()})`);
    errMsg.push('recoverAllFromIcloud');
  }
  try {
    await recoverSubmarineFromIcloud();
  } catch (e: any) {
    LOG.error(`recoverAllFromIcloud: fail(${e.toString()})`);
    errMsg.push('recoverSubmarineFromIcloud');
  }
  if (errMsg.length > 0) {
    throw new Error(errMsg.join(','));
  }
}

export async function backupSeedToGdrive() {
  const cred = await getSeed();
  if (!cred) {
    const msg = 'backupSeedToGdrive fail';
    LOG.error(msg);
    throw new Error(msg);
  }
  await google.gdriveUploadText('seed.backup', cred.password);
  LOG.debug('backupSeedToGdrive done');
}

export async function recoverSeedFromGdrive(): Promise<string[]> {
  await google.googleSignIn();
  await google.gdriveSetup();
  const seed = await google.gdriveFileReadText('seed.backup');
  return seed.split(' ');
}
