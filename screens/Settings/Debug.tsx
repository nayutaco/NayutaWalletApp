import {Buffer} from 'buffer';

import Clipboard from '@react-native-clipboard/clipboard';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import React, {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity, Vibration, Linking, NativeModules, Platform} from 'react-native';
import * as cloudstore from 'react-native-cloud-store';
import DeviceInfo from 'react-native-device-info';
import RNFS from 'react-native-fs';

import * as appDb from 'appdb';
import * as channel from 'bridge/channel';
import * as closechecker from 'bridge/closechecker';
import {getNotificationInfo} from 'bridge/info';
import * as lccontrol from 'bridge/lccontrol';
import LndReactController from 'bridge/LndReactController';
import {invoicePerm, bakeMacaroon, getCert} from 'bridge/macaroon';
import * as manager from 'bridge/manager';
import {request} from 'bridge/request';
import * as wallet from 'bridge/wallet';
import * as watchtower from 'bridge/watchtower';
import Page from 'components/projects/Page';
import List from 'components/uiParts/List';
import WrapListItem from 'components/uiParts/List/WrapListItem';
import {useLND} from 'hooks/useLND';
import {useStore} from 'store';
import * as storage from 'store/storage';
import {Theme, useThemeAwareObject} from 'styles/theme';
import {fontSizes, typographyFonts} from 'styles/variables';
import * as submarine from 'submarine';
import * as btctools from 'tools/btctools';
import * as label from 'tools/const-labels';
import {lndAddr, lndGrpcPort, lndRestPort} from 'tools/constants';
import * as google from 'tools/google';
import {buildConnectString, linkingOpenStore} from 'tools/index';
import {LOG, removeAllLogfilkes} from 'tools/logging';
import * as txhistory from 'txhistory';

const {NETWORK} = NativeModules.AppConfig;

/**
 * Return the debug screen
 * @returns {JSX.Element} debug Screen
 */
export default function DebugScreen() {
  const {status} = useLND(); // types/index.ts参照
  const [store, dispatch] = useStore();

  const [resultText, setResultText] = useState<string>();

  const styles = useThemeAwareObject(createStyles);
  const {t} = useTranslation();

  // const clearResult = () => {
  //   setResultText('');
  // };
  const copyResult = () => {
    Clipboard.setString(resultText || '');
    Vibration.vibrate(50);
  };
  const setResult = (text: string) => {
    setResultText(text);
    LOG.trace(`[RESULT]\n${text}`);
  };

  const walletBalance = async () => {
    const url = '/v1/balance/blockchain';
    const result = await request('GET', url, null);
    const resJson = JSON.stringify(result, null, 2);
    setResult(resJson);
  };

  const channelBalance = async () => {
    const url = '/v1/balance/channels';
    const result = await request('GET', url, null);
    const resJson = JSON.stringify(result, null, 2);
    setResult(resJson);
  };

  const listChannels = async () => {
    const url = '/v1/channels';
    const result = await request('GET', url, null);
    const resJson = JSON.stringify(result, null, 2);
    setResult(resJson);
  };

  const closedChannels = async () => {
    const url = '/v1/channels/closed';
    const result = await request('GET', url, null);
    const resJson = JSON.stringify(result, null, 2);
    setResult(resJson);
  };

  const pendingChannels = async () => {
    const url = '/v1/channels/pending';
    const result = await request('GET', url, null);
    const resJson = JSON.stringify(result, null, 2);
    setResult(resJson);
  };

  const getinfo = async () => {
    const url = '/v1/getinfo';
    const result = await request('GET', url, null);
    const resJson = JSON.stringify(result, null, 2);
    const devJson =
      '\n\nDevInfo:\n' +
      `getApplicationName: ${DeviceInfo.getApplicationName()}\n` +
      `getSystemVersion: ${DeviceInfo.getSystemVersion()}\n` +
      `getVersion: ${DeviceInfo.getVersion()}\n`;
    setResult(`${resJson}\n\n${devJson}`);
  };

  const queryMc = async () => {
    const url = '/v2/router/mc';
    const result = await request('GET', url, null);
    const resJson = JSON.stringify(result, null, 2);
    setResult(`querymc\n${resJson}`);
  };

  const resetMc = async () => {
    const url = '/v2/router/mc/reset';
    await request('POST', url, null);
    setResult('resetmc');
  };

  const importMc = async () => {
    const url = '/v2/router/x/importhistory';
    const now = Math.floor(Date.now() / 1000);
    const info = await request('GET', '/v1/getinfo', null);
    const myNode = Buffer.from(info.identity_pubkey, 'hex').toString('base64');
    const hubNodeId = (await lccontrol.hubNodeString()).split('@');
    const hubNode = Buffer.from(hubNodeId[0], 'hex').toString('base64');
    const body = {
      pairs: [
        {
          node_from: myNode,
          node_to: hubNode,
          history: {
            fail_time: `${now}`,
            fail_amt_sat: '10',
            fail_amt_msat: '10000',
          },
        },
      ],
      force: true,
    };
    await request('POST', url, body);
    setResult('importmc: done{mynode -> hub}');
  };

  const listInvoices = async () => {
    // "reversed=true"にしてもsortはreverseされないが、データ自体は新しいものから件数分を取得している
    const url = `/v1/invoices?num_max_invoices=10&reversed=true`;
    const result = await request('GET', url, null);
    const resJson = JSON.stringify(result, null, 2);
    setResult(resJson);
  };

  const newAddress = async () => {
    const addr = await wallet.newAddress();
    setResult(addr);
  };

  const listPayments = async () => {
    const url = '/v1/payments?max_payments=10&reversed=true&include_incomplete=true';
    const result = await request('GET', url, null);
    const resJson = JSON.stringify(result, null, 2);
    setResult(resJson);
  };

  const lastPaymentError = async () => {
    const info = await request('GET', '/v1/getinfo', null);
    const myNode = info.identity_pubkey;
    const url = '/v1/payments?max_payments=100&reversed=true&include_incomplete=true';
    const result = await request('GET', url, null);
    let errorInfo = 'no error';
    for (let idx = result.payments.length - 1; idx >= 0; idx--) {
      console.log(`${result.payments[idx].failure_reason}`);
      if (result.payments[idx].failure_reason !== 'FAILURE_REASON_NONE') {
        const failure = result.payments[idx];
        errorInfo = JSON.stringify(failure, null, 2);
        errorInfo += '\n';
        for (let lp1 = 0; lp1 < failure.htlcs.length; lp1++) {
          const chanId = failure.htlcs[lp1].failure?.channel_update?.chan_id;
          errorInfo += `fail chanId: ${chanId}\n`;
          const graphEdgeUrl = `/v1/graph/edge/${chanId}`;
          try {
            const edge = await request('GET', graphEdgeUrl, null);
            let peerNode;
            if (edge.node1_pub === myNode) {
              peerNode = edge.node2_pub;
            } else {
              peerNode = edge.node1_pub;
            }
            errorInfo += `fail node: ${peerNode}\n\n`;
          } catch (e: any) {
            console.log(`edge: ${graphEdgeUrl} - ${e.toString()}`);
            errorInfo += 'fail node: ???\n\n';
          }
        }
        break;
      }
    }
    setResult(errorInfo);
  };

  const listPeers = async () => {
    const url = '/v1/peers';
    const result = await request('GET', url, null);
    const resJson = JSON.stringify(result, null, 2);
    setResult(resJson);
  };

  const listChainTxns = async () => {
    const url = '/v1/transactions';
    const result = await request('GET', url, null);
    const resJson = JSON.stringify(result, null, 2);
    setResult(resJson);
  };

  const listRefundTxns = async () => {
    const result = await txhistory.getHistoryBtc(label.regExpRefund);
    const resJson = JSON.stringify(result, null, 2);
    setResult(resJson);
  };

  const listUtxos = async () => {
    const url = '/v1/utxos?min_confs=1&max_confs=2147483647';
    const result = await request('GET', url, null);
    const resJson = JSON.stringify(result, null, 2);
    setResult(resJson);
  };

  const statusInfo = () => {
    if (status) {
      setResult(JSON.stringify(status, null, 2));
    } else {
      setResult('status is null');
    }
  };

  const graphInfo = async () => {
    const url = '/v1/graph/info';
    const result = await request('GET', url, null);
    const resJson = JSON.stringify(result, null, 2);
    setResult(resJson);
  };

  const lndLogLevel = async () => {
    const url = '/v1/debuglevel';
    const body = {
      show: true,
      level_spec: 'BTCN=debug',
    };
    const result = await request('POST', url, body);
    const resJson = JSON.stringify(result, null, 2);
    setResult(resJson);
  };

  const getEnv = () => {
    setResult('BUILD_TYPE: ' + NativeModules.AppConfig.BUILD_TYPE + '\nNETWORK: ' + NativeModules.AppConfig.NETWORK);
  };

  const rnLogLevel = () => {
    LOG.info('----------');
    LOG.error('LOG.error');
    LOG.warn('LOG.warn');
    LOG.info('LOG.info');
    LOG.debug('LOG.debug');
    LOG.trace('LOG.trace');
    const level = LOG.getSeverity() === 'trace' ? 'debug' : 'trace';
    LOG.setSeverity(level);
    LOG.info('----------');
    LOG.error('LOG.error');
    LOG.warn('LOG.warn');
    LOG.info('LOG.info');
    LOG.debug('LOG.debug');
    LOG.trace('LOG.trace');
    LOG.info('----------');
    setResult(`ReactNative log level: ${level}`);
  };

  const closeAllForceChannels = async () => {
    let res = 'closed:\n';
    const chans = await request('GET', '/v1/channels?active_only=false', null);
    for (let idx = 0; idx < chans.channels.length; idx++) {
      const chan = chans.channels[idx];
      res += `  ${chan.channel_point}\n`;
      const chanPnt = chan.channel_point.split(':');
      channel.closeChannel(true, chanPnt[0], chanPnt[1]);
    }
    setResult(res);
  };
  const estimateFeerate = async () => {
    const info = await request('GET', '/v1/getinfo', null);
    const rate = await btctools.getEstimateFee(info.block_height);
    setResult(JSON.stringify(rate, null, 2));
  };

  const wtToggle = () => {
    const enabled = !store.wtclient;
    dispatch({
      type: 'enableWtClient',
      wtclient: enabled,
    });
    setResult(`wtclient setting: ${enabled}`);
  };

  const wtList = async () => {
    try {
      const list = await watchtower.getWatchtower();
      const result = JSON.stringify(list, null, 2);
      setResult(result);
    } catch (e) {
      setResult(`${JSON.stringify(e)}`);
    }
  };

  const lcPing = async () => {
    try {
      await lccontrol.ping();
      setResult('OK');
    } catch (e: any) {
      setResult(`NG: ${e.message}`);
    }
  };
  const lcVersion = async () => {
    const result = await lccontrol.getVersion();
    setResult(result);
  };
  const lcPaymentFeeMin = async () => {
    const result = await lccontrol.paymentFeeMin();
    const res = `${result}`;
    setResult(res);
  };
  const lcFeePercent = async () => {
    const result = await lccontrol.feePercent();
    const res = `${result} %`;
    setResult(res);
  };
  const lcGetLcNodeString = async () => {
    const result = await lccontrol.hubNodeString();
    const res = `${result}`;
    setResult(res);
  };
  const lcReceiveMax = async () => {
    const result = await lccontrol.receiveMax();
    const res = `${result}`;
    setResult(res);
  };
  const lcCsvHeight = async () => {
    const res = await lccontrol.submarineRefundBlock();
    setResult(`csvHeight=${res}`);
  };
  const ontheflyDbAll = async () => {
    const res = await appDb.onTheFlyData('');
    const resJson = JSON.stringify(res, null, 2);
    setResult(resJson);
  };
  const submarineDbAll = async () => {
    const res = await appDb.searchDataFromStatus(appDb.dbStatus.None);
    const resJson = JSON.stringify(res, null, 2);
    setResult(resJson);
  };
  const submarineDbDetected = async () => {
    const res = await appDb.searchDataFromStatus(appDb.dbStatus.Detect);
    const resJson = JSON.stringify(res, null, 2);
    setResult(resJson);
  };
  const submarineDbSettled = async () => {
    const res = await appDb.searchDataFromStatus(appDb.dbStatus.Settled);
    const resJson = JSON.stringify(res, null, 2);
    setResult(resJson);
  };
  const submarineDbRepayAll = async () => {
    const res = await appDb.repaymentData(null);
    const resJson = JSON.stringify(res, null, 2);
    setResult(resJson);
  };
  const submarineDbRepayed = async () => {
    const res = await appDb.repaymentData(1);
    const resJson = JSON.stringify(res, null, 2);
    setResult(resJson);
  };
  const submarineDbRepayableAmount = async () => {
    const csvHeight = await submarine.repaymentBlock();
    const info = await request('GET', '/v1/getinfo', null);
    const amount = await submarine.repaymentAmount(info.block_height);
    setResult(`repayable amount = ${amount}\nOP_CSV value: ${csvHeight}`);
  };
  const submarineDbNonRepayableAmount = async () => {
    const csvHeight = await submarine.repaymentBlock();
    const info = await request('GET', '/v1/getinfo', null);
    const amount = await submarine.nonRepaymentAmount(info.block_height);
    setResult(`non-repayable amount = ${amount}\nOP_CSV value: ${csvHeight}`);
  };
  const submarineDbSwapAddrs = async () => {
    const addrs = await submarine.swapAddresses();
    setResult(JSON.stringify(addrs, null, 2));
  };
  const submarineDbRepayable = async () => {
    const csvHeight = await submarine.repaymentBlock();
    const info = await request('GET', '/v1/getinfo', null);
    const res = await appDb.searchRepayableAndLock(info.block_height, csvHeight, false);
    if (res) {
      const resJson = JSON.stringify(res, null, 2);
      setResult(resJson);
    } else {
      setResult('none');
    }
  };

  const selfRebalance = () => {
    lccontrol.selfRebalance();
    setResult('done');
  };

  const lnSsSwapStop = async () => {
    let debug = await appDb.getDebug();
    if (debug === null || !debug.includes('swapstop,')) {
      debug = `${debug}swapstop,`;
    } else {
      debug = debug.replace('swapstop,', '');
    }
    await appDb.setDebug(debug);
    submarine.updateDebugState();
    setResult(debug);
  };

  const googleSignIn = async () => {
    try {
      GoogleSignin.configure({
        // https://developers.google.com/identity/protocols/oauth2/scopes#drive
        scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.metadata.readonly'],
      });
      // await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      setResult(JSON.stringify(userInfo, null, 2));
    } catch (e: any) {
      setResult(`error: ${JSON.stringify(e)}`);
    }
  };

  const googleSignOut = async () => {
    await GoogleSignin.signOut();
  };

  // // DEBUG only
  // const googleFileUploadSeed = async () => {
  //   if ((NETWORK === 'testnet' || NETWORK === 'signet') && BUILD_TYPE === 'debug') {
  //     await backup.backupSeedToGdrive();
  //   }
  //   setResult('done');
  // };

  const googleDriveFiles = async () => {
    const metadata = await google.gdriveFiles();
    setResult(JSON.stringify(metadata, null, 2));
  };

  const googleDriveRemoveFiles = async () => {
    const info = await request('GET', '/v1/getinfo', null);
    const myNode = info.identity_pubkey;
    const metadata = await google.gdriveFiles();
    for (let lp = 0; lp < metadata.length; lp++) {
      if (metadata[lp].name.includes(myNode)) {
        await google.gdriveDeleteFile(metadata[lp].name);
      }
    }
    setResult('done.');
  };

  const googleDriveRemoveAllFiles = async () => {
    const metadata = await google.gdriveFiles();
    for (let lp = 0; lp < metadata.length; lp++) {
      await google.gdriveDeleteFile(metadata[lp].name);
    }
    setResult('done: remove all');
  };

  const resetPin = () => {
    dispatch({type: 'setPin', pin: ''});
    dispatch({type: 'toggleBiometrics', biometrics: false});
    dispatch({type: 'enableLock', lock: false});
    setResult('done');
  };

  const rescanWallet = () => {
    dispatch({
      type: 'setRescanWallet',
      rescanWallet: true,
    });
    setResult('Set rescan wallet');
  };

  const resetPassConfirm = () => {
    dispatch({
      type: 'setPassConfirmed',
      passConfirmed: false,
    });
    setResult('Set reset passconfirmed');
  };

  const getUpdateInfo = async () => {
    try {
      const received = await getNotificationInfo(false);
      let res = JSON.stringify(received, null, 2);
      res += '\n';
      res += `notifyConfirmed: ${JSON.stringify(store.notifyConfirmed)}\n`;
      setResult(res);
    } catch (e: any) {
      setResult(e.message);
    }
  };

  const getUpdateTestInfo = async () => {
    try {
      const received = await getNotificationInfo(true);
      let res = JSON.stringify(received, null, 2);
      res += '\n';
      res += `notifyConfirmed: ${JSON.stringify(store.notifyConfirmed)}\n`;
      setResult(res);
    } catch (e: any) {
      setResult(e.message);
    }
  };

  const resetReceivedInfo = () => {
    dispatch({
      type: 'setNotifyConfirmed',
      notifyConfirmed: 0,
    });
    setResult('Reset Done');
  };

  const closeCheckerParams = async () => {
    const result = await closechecker.getAlarmParams();
    setResult(JSON.stringify(result, null, 2));
  };
  const closeCheckInterval3 = async () => {
    await closechecker.setAlarmParams(true, 3, 10);
  };
  const closeCheckIntervalDefault = async () => {
    await closechecker.setAlarmParams(true, 0, 0);
  };
  const closeCheckIntervalDisable = async () => {
    await closechecker.setAlarmParams(false, 0, 0);
  };

  // send intent macaroon for NLS Lapps
  const lappsGrpcInvoicePlusCopy = async () => {
    const appId = 'sendReceiveInvoicePlusGrpc';
    const macaroon = await bakeMacaroon(
      appId,
      invoicePerm.concat([
        {
          entity: 'info',
          action: 'read',
        },
      ]),
    );
    const port = `${lndGrpcPort}`;
    const cert = await getCert();
    const url = buildConnectString('lndconnect://{host}:{port}?macaroon={macaroonB64}&cert={cert}', {
      host: lndAddr,
      port,
      macaroonB64: macaroon.asBase64(),
      macaroonHex: macaroon.asHex(),
      cert,
    });
    Linking.openURL(url);
  };

  // send intent macaroon for NLS Lapps
  const lappsRestInvoicePlusCopy = async () => {
    const appId = 'sendReceiveInvoicePlusRest';
    const macaroon = await bakeMacaroon(
      appId,
      invoicePerm.concat([
        {
          entity: 'info',
          action: 'read',
        },
      ]),
    );
    const port = `${lndRestPort}`;
    const cert = await getCert();
    const url = buildConnectString('ncorelapps://link-lnd?host={host}&port={port}&macaroon={macaroonHex}&cert={cert}', {
      host: lndAddr,
      port,
      macaroonB64: macaroon.asBase64(),
      macaroonHex: macaroon.asHex(),
      cert,
    });
    Linking.openURL(url);
  };

  const integrity = async () => {
    try {
      const verify = await lccontrol.integrityAppCheck();
      setResult(`verify: ${verify}`);
    } catch (e: any) {
      let msg = '';
      if (e instanceof lccontrol.LcControlError) {
        msg = `app check fail(LSP) - code${e.code}\n\n${e.toString()}`;
      } else if (e instanceof lccontrol.IntegrityError) {
        switch (e.code) {
          case lccontrol.IntegrityError.ErrRetry:
            msg = `app check fail(API - retry)\n\n${e.toString()}`;
            break;
          case lccontrol.IntegrityError.ErrNetwork:
            msg = `app check fail(API - network)\n\n${e.toString()}`;
            break;
          case lccontrol.IntegrityError.ErrGooglePlay:
            msg = `app check fail(API - google play)\n\n${e.toString()}`;
            break;
          default:
            msg = `app check fail(API)\n\n${e.toString()}`;
            break;
        }
      } else {
        msg = `app check fail: ${e.toString()}`;
      }
      setResult(msg);
    }
  };

  const requestOpenChan = async () => {
    try {
      await lccontrol.requestOpenChannel();
      setResult('request open channel');
    } catch (e: any) {
      let msg = '';
      if (e instanceof lccontrol.LcControlError) {
        if (e.code === lccontrol.ErrCode.OpenChan) {
          msg = `request open channel fail(LND)\n\nmessage=${e.toString()}`;
        } else {
          msg = `request open channel fail\n\nmessage=${e.toString()}`;
        }
      } else {
        msg = `request open channel fail\n\nmessage=${e.toString()}`;
      }
      setResult(msg);
    }
  };

  const showStoreData = async () => {
    const version = await storage.getVersion();
    const appVersion = await storage.getAppVersion();
    const themeId = await storage.getThemeId();
    const hasWallet = await storage.getHasWallet();
    setResult(`version: ${version}\nappVersion: ${appVersion}\nthemeId: ${themeId}\nhasWallet: ${hasWallet}`);
  };

  const resetAppVersion = async () => {
    await storage.setAppVersion('0.0.0');
    setResult('Reset appVersion to 0.0.0 from store');
  };

  const resetStoreVersion1 = async () => {
    await storage.setVersion(1);
    await storage.removeHasWallet();
    setResult('Reset store version to 1');
  };

  const autoBackupResultRemove = async () => {
    await storage.removeAutoBackupResult();
    const result = await storage.getAutoBackupResult();
    setResult(`storage: remove keyAutoBackupResult\n${JSON.stringify(result)}`);
  };

  const removeLogfiles = async () => {
    await removeAllLogfilkes(NETWORK);
    setResult('remove logilfes');
  };

  const shutdownLnd = () => {
    LndReactController.shutdownLnd();
    setResult('shutdown LND');
  };

  const emitCompleted = () => {
    setResult('emit eventCompleted');
    manager.emitEventCompleted('debug', 'test');
  };

  // iCloud: react-native-cloud-store
  const cloudstoreIsAvailable = async () => {
    setResult(`iCloud available: ${await cloudstore.isICloudAvailable()}`);
  };
  const cloudstoreContainerPath = async () => {
    const path = cloudstore.defaultICloudContainerPath;
    const newPath = await cloudstore.getDefaultICloudContainerPath();
    setResult(`default: ${path}\nnew path: ${newPath}`);
  };
  const cloudstoreFiles = async () => {
    if (!cloudstore.defaultICloudContainerPath) {
      setResult('cloudstoreFiles: defaultICloudContainerPath undefined');
      return;
    }
    interface ICloudStatStr extends cloudstore.ICloudStat {
      createDateTime?: string;
      modifyDateTime?: string;
    }

    const backupDir = cloudstore.PathUtils.join(cloudstore.defaultICloudContainerPath, 'Documents', 'backup');
    const dir = await cloudstore.readDir(backupDir);
    const data = [];
    for (let lp = 0; lp < dir.length; lp++) {
      const stat = await cloudstore.stat(dir[lp]);
      const statStr: ICloudStatStr = stat;
      if (stat.createTimestamp) {
        statStr.createDateTime = new Date(stat.createTimestamp).toTimeString();
      }
      if (stat.modifyTimestamp) {
        statStr.modifyDateTime = new Date(stat.modifyTimestamp).toTimeString();
      }
      data.push(statStr);
    }
    setResult(JSON.stringify(data, null, 2));
  };
  const cloudstoreRemoveFiles = async () => {
    if (!cloudstore.defaultICloudContainerPath) {
      setResult('cloudstoreFiles: defaultICloudContainerPath undefined');
      return;
    }
    const info = await request('GET', '/v1/getinfo', null);
    const myNode = info.identity_pubkey;
    LOG.debug(`myNode: ${myNode}`);

    const backupDir = cloudstore.PathUtils.join(cloudstore.defaultICloudContainerPath, 'Documents', 'backup');
    const dir = await cloudstore.readDir(backupDir);
    for (let lp = 0; lp < dir.length; lp++) {
      LOG.debug(`fname: ${dir[lp]}`);
      if (dir[lp].includes(myNode)) {
        LOG.debug(`  remove: ${dir[lp]}`);
        await cloudstore.unlink(dir[lp]);
      }
    }
    setResult('done: remove own');
  };
  const cloudstoreRemoveAllFiles = async () => {
    if (!cloudstore.defaultICloudContainerPath) {
      setResult('cloudstoreFiles: defaultICloudContainerPath undefined');
      return;
    }

    const backupDir = cloudstore.PathUtils.join(cloudstore.defaultICloudContainerPath, 'Documents', 'backup');
    const dir = await cloudstore.readDir(backupDir);
    for (let lp = 0; lp < dir.length; lp++) {
      await cloudstore.unlink(dir[lp]);
    }
    await cloudstore.unlink(backupDir);
    setResult('done: remove all');
  };
  // iCloudの動作確認をするためコードは残しておく
  // const icloudTest = async () => {
  //   LOG.debug('icloud.icloudTest: start');
  //   try {
  //     await icloud.fileDownload('backup', 'abc.txt');
  //     setResult('done');
  //   } catch (e: any) {
  //     setResult(`fail\n\n${e}`);
  //   }
  // };

  // const icloudTest2 = async () => {
  //   const localPathName = `${RNFS.TemporaryDirectoryPath}/abc.txt`;
  //   const fileName = 'abc.txt';
  //   await RNFS.writeFile(localPathName, 'Hello World', 'utf8');
  //   LOG.debug(`icloud.icloudTest2: start: ${localPathName} -> ${fileName}`);

  //   try {
  //     await icloud.fileUpload(localPathName, 'backup', fileName);
  //     setResult('done');
  //   } catch (e: any) {
  //     setResult(`fail\n\n${e}`);
  //   }
  // };

  const resetWallet = async () => {
    await wallet.resetWallet();
  };

  const remoteLndTlsCertFile = async () => {
    const lndDir = Platform.select({
      android: `${RNFS.DocumentDirectoryPath}`,
      ios: `${RNFS.LibraryDirectoryPath}/core2/.lnd`,
      default: '',
    });
    const tlsKey = `${lndDir}/tls.key`;
    const tlsCert = `${lndDir}/tls.cert`;
    let msg;
    if (await RNFS.exists(tlsKey)) {
      await RNFS.unlink(tlsKey);
      msg = 'remove: tls.key\n';
    } else {
      msg = 'not found: tls.key\n';
    }
    if (await RNFS.exists(tlsCert)) {
      await RNFS.unlink(tlsCert);
      msg += 'remove: tls.cert\n';
    } else {
      msg += 'not found: tls.cert\n';
    }
    setResult(msg);
  };

  return (
    <Page title={t('settings:debug')}>
      <View style={styles.container}>
        <ScrollView style={styles.containerUpper}>
          <List title={'Well used'}>
            <WrapListItem indent onPress={resetWallet} label={'Reset Wallet'} />
            <WrapListItem indent onPress={getEnv} label={'Get Environment'} />
            <WrapListItem indent onPress={rnLogLevel} label={'RN loglevel (debug <==> trace)'} />
            <WrapListItem indent onPress={listChannels} label={'channels'} />
            <WrapListItem indent onPress={lastPaymentError} label={'last payments error'} />
            <WrapListItem indent onPress={lappsRestInvoicePlusCopy} label={'Lapps:Unity NCL(REST)'} />
            <WrapListItem indent onPress={lappsGrpcInvoicePlusCopy} label={'Lapps:Android NCL(gRPC)'} />
            <WrapListItem indent onPress={integrity} label={'integrity'} />
            <WrapListItem indent onPress={removeLogfiles} label={'remove log files'} />
          </List>

          <List title={'Info'}>
            <WrapListItem indent onPress={getinfo} label={'LND getinfo'} />
            <WrapListItem indent onPress={statusInfo} label={'LND status'} />
            <WrapListItem indent onPress={graphInfo} label={'LND graph info'} />
            <WrapListItem indent onPress={lndLogLevel} label={'LND loglevel'} />
            <WrapListItem indent onPress={rnLogLevel} label={'RN loglevel (debug <==> trace)'} />
            <WrapListItem indent onPress={getUpdateInfo} label={'API server: update info'} />
            <WrapListItem indent onPress={getUpdateTestInfo} label={'API server: update info (test ver.)'} />
            <WrapListItem indent onPress={resetReceivedInfo} label={'API server: reset received info confirmed'} />
            <WrapListItem indent onPress={resetAppVersion} label={'reset update info'} />
          </List>

          <List title={'List'}>
            <WrapListItem indent onPress={listChannels} label={'channels'} />
            <WrapListItem indent onPress={listChainTxns} label={'transactions'} />
            <WrapListItem indent onPress={listRefundTxns} label={'refund transactions'} />
            <WrapListItem indent onPress={listPeers} label={'peers'} />
            <WrapListItem indent onPress={closedChannels} label={'closed channels'} />
            <WrapListItem indent onPress={pendingChannels} label={'pending channels'} />
            <WrapListItem indent onPress={listInvoices} label={'invoices'} />
            <WrapListItem indent onPress={listPayments} label={'payments'} />
            <WrapListItem indent onPress={lastPaymentError} label={'last payments error'} />
            <WrapListItem indent onPress={listUtxos} label={'UTXOs'} />
          </List>

          <List title={'On-Chain'}>
            <WrapListItem indent onPress={walletBalance} label={'wallet balance'} />
            <WrapListItem indent onPress={newAddress} label={'create Bitcoin address'} />
            <WrapListItem indent onPress={rescanWallet} label={'set rescan wallet flag'} />
            <WrapListItem indent onPress={estimateFeerate} label={'get estimate feerate'} />
          </List>

          <List title={'Lightning'}>
            <WrapListItem indent onPress={channelBalance} label={'channel balance'} />
            <WrapListItem indent onPress={closeAllForceChannels} label={'close channels(FORCE)'} />
            <WrapListItem indent onPress={queryMc} label={'query mc'} />
            <WrapListItem indent onPress={resetMc} label={'reset mc'} />
            <WrapListItem indent onPress={importMc} label={'import mc: route fail'} />
            <WrapListItem indent onPress={selfRebalance} label={'self rebalance'} />
            <WrapListItem indent onPress={requestOpenChan} label={'request OpenChannel'} />
          </List>

          <List title={'WtClient'}>
            <WrapListItem indent onPress={wtToggle} label={'toggle wtclient setting'} />
            <WrapListItem indent onPress={wtList} label={'registered watchtowers'} />
          </List>

          <List title={'LSP client'}>
            <WrapListItem indent onPress={lcVersion} label={'LSP version'} />
            <WrapListItem indent onPress={lcPing} label={'ping'} />
            <WrapListItem indent onPress={lcPaymentFeeMin} label={'payment fee min'} />
            <WrapListItem indent onPress={lcFeePercent} label={'fee rate'} />
            <WrapListItem indent onPress={lcGetLcNodeString} label={'host node'} />
            <WrapListItem indent onPress={lcReceiveMax} label={'receive max channels'} />
            <WrapListItem indent onPress={lcCsvHeight} label={'submarine CSV height'} />
            <WrapListItem indent onPress={lnSsSwapStop} label={'Stop auto submarine execute'} />
          </List>

          <List title={'LSP DB'}>
            <WrapListItem indent onPress={ontheflyDbAll} label={'on-the-fly DB all'} />
            <WrapListItem indent onPress={submarineDbAll} label={'submarine DB all'} />
            <WrapListItem indent onPress={submarineDbDetected} label={'submarine DB executable'} />
            <WrapListItem indent onPress={submarineDbSettled} label={'submarine DB settled'} />
            <WrapListItem indent onPress={submarineDbRepayAll} label={'repay DB all'} />
            <WrapListItem indent onPress={submarineDbRepayableAmount} label={'repayable amount'} />
            <WrapListItem indent onPress={submarineDbNonRepayableAmount} label={'non-repayable amount'} />
            <WrapListItem indent onPress={submarineDbSwapAddrs} label={'swap addresses'} />
            <WrapListItem indent onPress={submarineDbRepayable} label={'repay DB repayable'} />
            <WrapListItem indent onPress={submarineDbRepayed} label={'repay DB repayed'} />
            {/* <WrapListItem indent onPress={appDb.deleteTable} label={'DELTE DB table'} /> */}
          </List>

          <List title={'Google'}>
            <WrapListItem indent onPress={googleSignIn} label={'Google SignIn'} />
            <WrapListItem indent onPress={googleSignOut} label={'Google SignOut'} />
            {/* <WrapListItem indent onPress={googleFileUploadSeed} label={'Google Seed Backup'} /> */}
            <WrapListItem indent onPress={googleDriveFiles} label={'Google Drive files'} />
            <WrapListItem indent onPress={googleDriveRemoveFiles} label={'remove Google Drive files'} />
            <WrapListItem indent onPress={googleDriveRemoveAllFiles} label={'remove Google Drive All files(DANGER)'} />
          </List>

          <List title={'iCloud'}>
            <WrapListItem indent onPress={cloudstoreIsAvailable} label={'iCloud Available'} />
            <WrapListItem indent onPress={cloudstoreContainerPath} label={'Default Container Path'} />
            <WrapListItem indent onPress={cloudstoreFiles} label={'iCloud Drive files'} />
            <WrapListItem indent onPress={cloudstoreRemoveFiles} label={'remove iCloud Drive backup files'} />
            <WrapListItem indent onPress={cloudstoreRemoveAllFiles} label={'remove iCloud Drive All backupfiles(DANGER)'} />
          </List>

          <List title={'Security'}>
            <WrapListItem indent onPress={resetPin} label={'Reset Pin'} />
            <WrapListItem indent onPress={resetPassConfirm} label={'Reset Passphrase Confirm'} />
            <WrapListItem indent onPress={closeCheckerParams} label={'Close Check params'} />
            <WrapListItem indent onPress={closeCheckIntervalDisable} label={'Close Check Interval: disable'} />
            <WrapListItem indent onPress={closeCheckIntervalDefault} label={'Close Check Interval: default\n(need restart)'} />
            <WrapListItem indent onPress={closeCheckInterval3} label={'Close Check Interval: 3min\n(need restart)'} />
            <WrapListItem indent onPress={integrity} label={'Google Integrity'} />
            <WrapListItem indent onPress={remoteLndTlsCertFile} label={'remove lnd tls.key and tls.cert'} />
          </List>

          <List title={'Lapps'}>
            <WrapListItem indent onPress={lappsGrpcInvoicePlusCopy} label={'Lapps: gRPC NCL'} />
            <WrapListItem indent onPress={lappsRestInvoicePlusCopy} label={'Lapps: REST NCL'} />
          </List>

          <List title={'Store'}>
            <WrapListItem indent onPress={showStoreData} label={'show store data'} />
            <WrapListItem indent onPress={resetStoreVersion1} label={'reset store version 1'} />
            <WrapListItem indent onPress={resetAppVersion} label={'reset appVersion'} />
            <WrapListItem indent onPress={autoBackupResultRemove} label={'remove auto backup result'} />
            <WrapListItem indent onPress={linkingOpenStore} label={'linking open store'} />
          </List>

          <List title={'Shutdown'}>
            <WrapListItem indent onPress={shutdownLnd} label={'shutdown LND'} />
            <WrapListItem indent onPress={emitCompleted} label={'emit eventCompleted'} />
          </List>
        </ScrollView>

        <View style={styles.span} />
        <ScrollView style={styles.textBackground}>
          <TouchableOpacity
            style={styles.bottomButton}
            onPress={copyResult}
            hitSlop={{
              bottom: 20,
              left: 20,
              top: 20,
            }}>
            <Text style={styles.bottomButtonText}>{t('common:copy')}</Text>
          </TouchableOpacity>
          <ScrollView style={styles.textBackground} horizontal>
            <Text style={styles.text}>{resultText}</Text>
          </ScrollView>
        </ScrollView>
      </View>
    </Page>
  );
}

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    container: {
      paddingHorizontal: 8,
    },
    containerUpper: {
      paddingHorizontal: 20,
      height: '59%',
    },
    text: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic6,
      color: theme.color.primary,
      marginHorizontal: 6,
    },
    textBackground: {
      backgroundColor: `${theme.color.secondaryLighten}` + 70,
      width: '100%',
      height: '40%',
    },
    span: {
      height: '1%',
    },
    bottomButton: {
      flex: 1,
      flexDirection: 'row',
      alignSelf: 'flex-end',
      maxHeight: 56,
      padding: 12,
    },
    bottomButtonText: {
      fontSize: fontSizes.basic8,
      fontFamily: typographyFonts.notoSansBold,
      textAlign: 'center',
      color: theme.color.buttonTextColor,
      backgroundColor: theme.color.accentPrimary,
      borderRadius: 12,
      padding: 8,
    },
  });
  return styles;
};
