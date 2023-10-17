import AsyncStorage from '@react-native-async-storage/async-storage';

import {dateString} from 'tools/locale';
import {LOG} from 'tools/logging';

// version 1
const keyVersion = 'version';
const keyAppVersion = 'appVersion';
const keyTheme = 'theme';
// version 2
const keyHasWallet = 'hasWallet';
const keyRestart = 'restart';
const keyBackuped = 'backuped';
const keyAutoBackupResult = 'autoBackupResult';

export type AutoBackupResultType = {
  result: boolean | null;
  message: string;
};

/////////////////
// version
// @defaultValue null
/////////////////

export async function getVersion(): Promise<number | null> {
  const version = await AsyncStorage.getItem(keyVersion);
  if (version) {
    return parseInt(version, 10);
  }
  return null; // First time launching this application!
}

export async function setVersion(version: number) {
  await AsyncStorage.setItem(keyVersion, version.toString(10));
}

/////////////////
// app version
// @defaultValue ''
/////////////////

export async function getAppVersion(): Promise<string> {
  return (await AsyncStorage.getItem(keyAppVersion)) || '';
}

export async function setAppVersion(version: string) {
  await AsyncStorage.setItem(keyAppVersion, version);
}

/////////////////
// theme ID
// @defaultValue ''
/////////////////

export async function getThemeId(): Promise<string> {
  return (await AsyncStorage.getItem(keyTheme)) || '';
}

export async function setThemeId(themeId: string) {
  await AsyncStorage.setItem(keyTheme, themeId);
}

/////////////////
// has wallet
// @defaultValue false
/////////////////

export async function getHasWallet(): Promise<boolean> {
  try {
    const hasWallet = await AsyncStorage.getItem(keyHasWallet);
    return hasWallet === '1';
  } catch (e: any) {
    return false;
  }
}

export async function setHasWallet(exist: boolean) {
  await AsyncStorage.setItem(keyHasWallet, exist ? '1' : '0');
}

// debug
export async function removeHasWallet() {
  await AsyncStorage.removeItem(keyHasWallet);
}

/////////////////
// need manual backup
// @defaultValue false
/////////////////

export async function getNeedManualBackup(): Promise<boolean> {
  try {
    const needed = await AsyncStorage.getItem(keyBackuped);
    return needed === '1';
  } catch (e: any) {
    return false;
  }
}

export async function setNeedManualBackup(needed: boolean) {
  LOG.debug(`storage.setNeedManualBackup: ${needed}`);
  await AsyncStorage.setItem(keyBackuped, needed ? '1' : '0');
}

export async function getRestarted(): Promise<boolean> {
  try {
    const restart = await AsyncStorage.getItem(keyRestart);
    return restart === '1';
  } catch (e: any) {
    return false;
  }
}

export async function setRestarted(restart: boolean) {
  LOG.debug(`storage.setNeedManualBackup: ${restart}`);
  await AsyncStorage.setItem(keyRestart, restart ? '1' : '0');
}

/////////////////
// auto backup(Google Drive or iCloud Drive) result
// @defaultValue {result:null, message:''}
/////////////////

export async function getAutoBackupResult(): Promise<AutoBackupResultType> {
  const result = await AsyncStorage.getItem(keyAutoBackupResult);
  if (!result) {
    // no auto backup result
    return {
      result: null,
      message: '',
    };
  } else {
    try {
      return JSON.parse(result);
    } catch (e: any) {
      LOG.error(`storage.getAutoBackupResult: ${e.toString()}`);
      return {
        result: false,
        message: e.toString(),
      };
    }
  }
}

export async function setAutoBackupResult(result: boolean) {
  const data: AutoBackupResultType = {
    result: result,
    message: dateString(new Date(), true),
  };
  const resultString = JSON.stringify(data);
  LOG.debug(`storage.setAutoBackupResult: ${resultString}`);
  await AsyncStorage.setItem(keyAutoBackupResult, resultString);
}

// debug
export async function removeAutoBackupResult() {
  await AsyncStorage.removeItem(keyAutoBackupResult);
}
