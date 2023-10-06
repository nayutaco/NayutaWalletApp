import {NativeModules, Platform} from 'react-native';

import * as constnet from './const-network';
const {NETWORK} = NativeModules.AppConfig;

// local LND
export const lndAddr = '127.0.0.1';

// explorer
export const mempoolSpace = 'https://mempool.space';
export const mempoolFee = 'https://mempool.space/{NETWORK}api/v1/fees/recommended';
export const urlBlockstream = 'https://blockstream.info';

// support
export const terms = 'https://nayuta.co/nayuta-wallet-2022/terms.html';
export const mailTo = 'mailto:support-wallet@nayuta.co?subject=%5bsupport%5dNayutaWallet%3a';
export const promotionReportMailTo = 'mailto:support-wallet@nayuta.co?subject=%5bsupport%5dNayutaWallet-PROMOTION%3a';
export const twitterEn = 'https://twitter.com/Nayuta_en';
export const twitterJa = 'https://twitter.com/Nayuta_ja';
export const telegramEn = 'https://t.me/joinchat/RLA7bZwys9GI9-o_';
export const telegramJa = 'https://t.me/joinchat/Gbq0me3wijm-fLvO';
export const freeChannelPromotionDetailEn = 'https://medium.com/nayuta-inc/open-channel-promotion-2023-en-dfee2ccd3757';
export const freeChannelPromotionDetailJa = 'https://medium.com/nayuta-inc/open-channel-promotion-2023-ja-bf75c88a64c8';
export const googlePlayLink = 'https://play.google.com/store/apps/details?id=com.nayuta.core2';
export const appStoreLink = 'https://apps.apple.com/app/nayuta-wallet/id6449242331';

export const payLnTimeoutSec = 30;
export const receiveInvoiceExpiry = 3600;
export const lnMinFeeSats = 10;

// submarine swap
export const submarineInvoiceExpiry = 600; // swapアドレスへの送金確認後、hubへ送信するinvoiceの期限 // ToDo LSPでタイムアウトすることがあったため延長した

export const txHistoryLimit = 20;

export const refundMinimumAmount = 1000;

export const duringCopying = 500;

export const lspSignalInterval = 60 * 1000;
export const updateNotificationInterval = 300 * 1000;

// need to fill in Satoshi
export const otfInvoiceCap = 200000;
export const submarineSwapCap = 200000;

export const backgroundLockTime = 15000;
export const backupIndicatorLockTime = 60000;

// 2022/06/28: 1BTC=3000000 yen, limit=100000 yen で計算して端数を処理
//    (limit/BTC)*100000000=3333333.33... => 3500000

// 2022/07/28: 上限を減らす対応を行う。最終的な値が決まるまで、暫定の値として400,000 satsとする。(前回の式は残しておく)
export const maxCapacitySat = 400000;

// Backup/Restore
export const backupEnableGDrive = Platform.select({
  android: true,
  ios: false,
  default: false,
});
export const backupEnableIcloud = Platform.select({
  android: false,
  ios: true,
  default: false,
});
export const backupEnableAuto = backupEnableGDrive || backupEnableIcloud;
export const backupEnableManual = true;
export const iosUploadTimeoutMsec = 5000;
export const iosDownloadTimeoutMsec = 5000;

//
// NETWORK
//
type LspType = {
  host: string;
  token: string;
  cert: string;
};

export let lndGrpcPort: number;
export let lndRestPort: number;
export let notificationServer: string;
export let notificationTestServer: string;
export let debugApi: string;
export let promotionInfo: string;
export let lspHost: LspType;
export let lndFeeUrl: string;

switch (NETWORK) {
  case 'mainnet':
    lndGrpcPort = constnet.value.mainnet.lndGrpcPort;
    lndRestPort = constnet.value.mainnet.lndRestPort;
    notificationServer = constnet.value.mainnet.notificationServer;
    notificationTestServer = constnet.value.mainnet.notificationTestServer;
    debugApi = constnet.value.mainnet.debugApi;
    promotionInfo = constnet.value.mainnet.promotionInfo;
    lspHost = constnet.value.mainnet.lspHost;
    lndFeeUrl = constnet.value.mainnet.lndFeeUrl;
    break;
  case 'testnet':
    lndGrpcPort = constnet.value.testnet.lndGrpcPort;
    lndRestPort = constnet.value.testnet.lndRestPort;
    notificationServer = constnet.value.testnet.notificationServer;
    notificationTestServer = constnet.value.testnet.notificationTestServer;
    debugApi = constnet.value.testnet.debugApi;
    promotionInfo = constnet.value.testnet.promotionInfo;
    lspHost = constnet.value.testnet.lspHost;
    lndFeeUrl = constnet.value.testnet.lndFeeUrl;
    break;
  case 'signet':
    lndGrpcPort = constnet.value.signet.lndGrpcPort;
    lndRestPort = constnet.value.signet.lndRestPort;
    notificationServer = constnet.value.signet.notificationServer;
    notificationTestServer = constnet.value.signet.notificationTestServer;
    debugApi = constnet.value.signet.debugApi;
    promotionInfo = constnet.value.signet.promotionInfo;
    lspHost = constnet.value.signet.lspHost;
    lndFeeUrl = constnet.value.signet.lndFeeUrl;
    break;
  default:
    throw new Error('unknown network');
}
