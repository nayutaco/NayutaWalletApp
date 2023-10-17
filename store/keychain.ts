import {UserCredentials, getGenericPassword, resetGenericPassword, setGenericPassword} from 'react-native-keychain';

import {getHasWallet, setHasWallet} from './storage';

import {LOG} from 'tools/logging';

const KEY_SEED = 'com.nayuta.core2.lnd.seed';
const KEY_PASSWORD = 'com.nayuta.core2.lnd.password';
const KEY_MACAROON = 'com.nayuta.core2.lnd.macaroon.admin';

/*
 * 'react-native-keychain'によって保存されたデータがアンインストール後どうなるかはAndroidとiOSで異なる。
 * Androidではアンインストールするとkeychainのデータも削除される。
 * iOSではアンインストールしてもkeychainのデータは削除されない。
 * LNDのデータはアンインストールによって消されるので、iOSのように残ると困る。
 * そのため「walletが存在する」という情報だけはアプリが管理する領域に保存している。
 */

export async function walletExists(): Promise<boolean> {
  const hasWallet = await getHasWallet();
  LOG.trace(`***** keychain.walletExists: ${hasWallet}`);
  return hasWallet;
}

export async function getSeed(): Promise<false | UserCredentials> {
  if (!(await walletExists())) {
    LOG.warn('keychain.hasWallet: false');
    return false;
  }
  const cred = await getGenericPassword({service: KEY_SEED});
  return cred;
}

export async function getPassword(): Promise<false | UserCredentials> {
  if (!(await walletExists())) {
    LOG.warn('keychain.hasWallet: false');
    return false;
  }
  const cred = await getGenericPassword({service: KEY_PASSWORD});
  return cred;
}

export async function getMacaroon(): Promise<false | UserCredentials> {
  if (!(await walletExists())) {
    LOG.warn('keychain.hasWallet: false');
    return false;
  }
  const cred = await getGenericPassword({service: KEY_MACAROON});
  return cred;
}

export async function setSecureData(seed: string, password: string, adminMacaroon: string) {
  LOG.info('keychain.setSecureData');
  await setGenericPassword('walletSeed', seed, {service: KEY_SEED});
  await setGenericPassword('walletPassword', password, {service: KEY_PASSWORD});
  await setGenericPassword('adminMacaroon', adminMacaroon, {service: KEY_MACAROON});
  await setHasWallet(true);
  LOG.info('keychain.setSecureData: done');
}

export async function resetSecureData() {
  LOG.info('keychain.resetSecureData');
  await resetGenericPassword({service: KEY_SEED});
  await resetGenericPassword({service: KEY_PASSWORD});
  await resetGenericPassword({service: KEY_MACAROON});
  await setHasWallet(false);
  LOG.info('keychain.resetSecureData: done');
}
