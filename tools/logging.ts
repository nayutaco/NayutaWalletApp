import {Platform} from 'react-native';
import RNFS from 'react-native-fs';
import {consoleTransport, fileAsyncTransport, logger} from 'react-native-logs';
import {zip} from 'react-native-zip-archive';

import {addHandler} from './bgtimer';

// NOTE: android/app/src/main/java/com/nayuta/core2/ExportFiles.kt
const logDir = Platform.select({
  android: `${RNFS.DocumentDirectoryPath}/rnlog`,
  ios: `${RNFS.LibraryDirectoryPath}/core2/rnlog`,
  default: '',
});
const lndDir = Platform.select({
  android: `${RNFS.DocumentDirectoryPath}`,
  ios: `${RNFS.LibraryDirectoryPath}/core2/.lnd`,
  default: '',
});
const logFilename = 'nc2-log.log';
const logFile = `${logDir}/${logFilename}`;
const zipWorkDir = `${RNFS.TemporaryDirectoryPath}/zipwork`;
const logBackFile = `${zipWorkDir}/nc2-bak.log`;
const checkSizeMsec = 10 * 60 * 1000; // 10min
const checkSize = 1024 * 1024; // 1MB
const rotateNum = 5;

export let LOG: any;

async function removeIfExists(filePath: string) {
  if (await RNFS.exists(filePath)) {
    await RNFS.unlink(filePath);
  }
}

function logBackZipFile(num: number): string {
  return `${logDir}/nc2-bak.${num}.zip`;
}

// remove old log files
async function removeOldLogfiles() {
  try {
    // 古いバージョンで使われていた
    await removeIfExists(`${RNFS.DocumentDirectoryPath}/nc2-log.log`);
    await removeIfExists(`${RNFS.DocumentDirectoryPath}/nc2-bak.log`);
  } catch (e: any) {
    console.log(e.message);
  }
}

async function appLogRotation() {
  const stat = await RNFS.stat(logFile);
  LOG.info(`appLogRotation: check log size: ${stat.size}`);
  if (stat.size > checkSize) {
    try {
      await removeIfExists(logBackFile);
      await RNFS.moveFile(logFile, logBackFile);
      await removeIfExists(logBackZipFile(rotateNum));
      for (let lp = rotateNum - 1; lp > 0; lp--) {
        if (await RNFS.exists(logBackZipFile(lp))) {
          LOG.info(`appLogRotation: move: ${logBackZipFile(lp)} => ${logBackZipFile(lp + 1)}`);
          await RNFS.moveFile(logBackZipFile(lp), logBackZipFile(lp + 1));
        }
      }
      await zip(zipWorkDir, logBackZipFile(1)); // zip support dir archive
      LOG.info(`appLogRotation: zip: ${logBackZipFile(1)}`);
      await RNFS.unlink(logBackFile);
      LOG.debug('appLogRotation: rotate logfile');
    } catch (e) {
      LOG.warn(`appLogRotation: fail rotate logfile: ${e}`);
    }
  }
}

export async function init() {
  await RNFS.mkdir(logDir);
  await RNFS.mkdir(zipWorkDir);

  const config = {
    levels: {
      trace: 0,
      debug: 1,
      info: 2,
      warn: 3,
      error: 4,
    },
    severity: 'debug',
    transport: (props: any) => {
      fileAsyncTransport(props);
      consoleTransport(props);
    },
    transportOptions: {
      FS: RNFS,
      fileName: logFilename,
      filePath: logDir,
    },
    dateFormat: 'utc',
  };
  await removeOldLogfiles();
  LOG = logger.createLogger(config);
  LOG.info('----------');
  LOG.error('LOG.error');
  LOG.warn('LOG.warn');
  LOG.info('LOG.info');
  LOG.debug('LOG.debug');
  LOG.trace('LOG.trace');
  LOG.info('----------');

  await appLogRotation();
  try {
    addHandler('logging', checkSizeMsec, false, appLogRotation);
  } catch (e: any) {
    if (e.message?.includes('event already registered')) {
      // ありうる
      LOG.warn('logging: maybe app hot restart.');
    } else {
      LOG.error(`logging: maybe coding bug: ${e}`);
      // not throw
    }
  }
}

// archive log files for export
export async function archiveLogs(filename: string, network: string, message: string) {
  await removeIfExists(filename);
  const lndLogDir = `${lndDir}/logs/bitcoin/${network}`;
  await RNFS.writeFile(`${lndLogDir}/lnd_info.log`, message, 'utf8');
  const srcs: string[] = [];
  const logDirItem = await RNFS.readDir(logDir);
  for (const item of logDirItem) {
    if (item.isFile()) {
      LOG.debug(` logDir: ${item.path}`);
      srcs.push(item.path);
    }
  }
  const lndLogDirItem = await RNFS.readDir(lndLogDir);
  for (const item of lndLogDirItem) {
    if (item.isFile()) {
      LOG.debug(` lndLogDir: ${item.path}`);
      srcs.push(item.path);
    }
  }
  await zip(srcs, filename);
}

export async function removeAllLogfilkes(network: string) {
  const lndLogDir = `${lndDir}/logs/bitcoin/${network}`;
  const logDirItem = await RNFS.readDir(logDir);
  for (const item of logDirItem) {
    if (item.isFile()) {
      LOG.debug(` logDir: ${item.path}`);
      await removeIfExists(item.path);
    }
  }
  const lndLogDirItem = await RNFS.readDir(lndLogDir);
  for (const item of lndLogDirItem) {
    if (item.isFile()) {
      LOG.debug(` lndLogDir: ${item.path}`);
      await removeIfExists(item.path);
    }
  }
}
