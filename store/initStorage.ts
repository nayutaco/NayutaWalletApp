import {Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {getGenericPassword} from 'react-native-keychain';

import * as storage from './storage';
import {getTheme} from './theme';

import {LOG} from 'tools/logging';

// Don't forget to increment when storage structure is changed.
//  1. first version
//  2. add 'hasWallet'
const currentVersion = 2;

export async function initStorage() {
  const version = await storage.getVersion();
  const [appVersion] = await getAppVersion();
  const theme = await getTheme();

  LOG.info(`store.version: ${version}`);
  LOG.info(`app.version: ${appVersion}`);
  LOG.info(`store.theme: ${theme.id}`);

  if (version != null) {
    if (version === currentVersion) {
      LOG.info('same version');
    } else if (version < currentVersion) {
      // upgrade
      if (currentVersion >= 2) {
        migrate2();
      }
    } else {
      const msg = `store version mismatch(stored:${version}, current:${currentVersion})`;
      LOG.error(msg);
      throw new Error(msg);
    }
  }
  await storage.setVersion(currentVersion);
  await storage.setThemeId(theme.id);
  if (appVersion.length === 0) {
    checkDoneAppVersion();
  }
}

export async function getAppVersion(): Promise<[string, string]> {
  const appVersion = await storage.getAppVersion();
  return [appVersion, DeviceInfo.getVersion()];
}

export async function checkDoneAppVersion() {
  await storage.setAppVersion(DeviceInfo.getVersion());
}

async function migrate2() {
  LOG.info('initStorage.migrate2');
  if (Platform.OS === 'android') {
    // update on Android
    LOG.info('initStorage.migrate2: android only');
    const macCred = await getGenericPassword({service: 'com.nayuta.core2.lnd.macaroon.admin'});
    await storage.setHasWallet(!!macCred);
  }
  LOG.info('initStorage.migrate2: done');
}
