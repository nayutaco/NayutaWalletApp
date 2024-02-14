import CheckBox from '@react-native-community/checkbox';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {BigNumber} from 'bignumber.js';
import React, {useCallback, useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {ActivityIndicator, Animated, AppState, Modal, NativeModules, Platform, Pressable, StyleSheet, Text, View} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import MIcon from 'react-native-vector-icons/MaterialIcons';

import * as channel from 'bridge/channel';
import {forceRestart, getInfo, stopLND} from 'bridge/manager';
import {listUnspent, resetWallet} from 'bridge/wallet';
import {addWatchtower, getWatchtower} from 'bridge/watchtower';
import {Alert, AlertButtonProps} from 'components/projects/AlertTheme';
import {DialogInput} from 'components/projects/DialogInput';
import {ScrollablePage} from 'components/projects/Page';
import {Button} from 'components/uiParts/ButtonTheme';
import List from 'components/uiParts/List';
import WrapListItem from 'components/uiParts/List/WrapListItem';
import {ModalTheme} from 'components/uiParts/Modal';
import useBottomSheet from 'hooks/useBottomSheet';
import {useLND} from 'hooks/useLND';
import {ParamList} from 'navigation/paramList';
import {initStorage} from 'store/initStorage';
import {getSeed} from 'store/keychain';
import * as storage from 'store/storage';
import {getInitialState, useStore} from 'store/storeContext';
import {Theme} from 'styles/theme/interface';
import {useTheme} from 'styles/theme/themeContext';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {fontSizes, typographyFonts} from 'styles/variables';
import * as submarine from 'submarine';
import {canParseFloat} from 'tools';
import {waitForSec} from 'tools/async';
import * as backup from 'tools/backup';
import {getEstimateFee} from 'tools/btctools';
import * as constants from 'tools/constants';
import * as google from 'tools/google';
import * as icloud from 'tools/icloud';
import {convertNumberString, convertStringNumber, dateString, setLocale} from 'tools/locale';
import {LOG, archiveLogs} from 'tools/logging';

import {ChainType} from 'txhistory';

type Params = {
  checking: boolean;
};

enum AlertIndex {
  None,
  Success,
  Error,
  ExportLog,
  SuccessBackup,
  CancelBackup,
  EnableBackupGoogle,
  DisableBackupGoogle,
  EnableBackupIcloud,
  DisableBackupIcloud,
  DisableIcloud,
  NotActiveWatchtower,
  BackupTest,
  InvalidInputRate,
  LargeRate,
  CloseAll,
  ScreenshotPrevent,
  RescanWallet,
  ResetWalletAttention,
  ResetWalletConfirm,
  ResetWalletError,
  DeleteAutoBackup,
}

/**
 * Return the settings details screen
 * @returns {JSX.Element} Settings Details Screen
 */
export const DetailSettingScreen = ({route: {params}}: {route: {params?: Params}}) => {
  const navigation = useNavigation<StackNavigationProp<ParamList>>();
  const {t} = useTranslation();
  const {NETWORK} = NativeModules.AppConfig;
  const styles = useThemeAwareObject(createStyles);
  const [store, dispatch] = useStore();
  const {theme} = useTheme();
  const {status} = useLND();
  const {show} = useBottomSheet();

  const [animating, setAnimating] = useState<boolean>(false);
  const [lastBackupGoogle, setLastBackupGoogle] = useState<string>(t('loading'));
  const [lastBackupIcloud, setLastBackupIcloud] = useState<string>(t('...'));
  const [neutrinoIp, setNeutrinoIp] = useState('');
  const [watchTowerUri, setWatchTowerUri] = useState('');
  const [neutrinoDlgOpened, setNeutrinoDlgOpened] = useState(false);
  const [watchtowerDlgOpened, setWatchtowerDlgOpened] = useState(false);
  const [resetWalletDlgOpened, setResetWalletDlgOpened] = useState(false);
  const [resetWalletPhrase, setResetWalletPhrase] = useState('');
  const [resetWalletConfirmPhraseNum, setResetWalletConfirmPhraseNum] = useState(0);
  const [resetWalletConfirmPhrase, setResetWalletConfirmPhrase] = useState('');
  const [alertIndex, setAlertIndexValue] = useState<AlertIndex>(AlertIndex.None);
  const [cancelErr, setCancelErr] = useState('');
  const [alertSuccessTitle, setAlertSuccessTitle] = useState('');
  const [alertErr, setAlertErr] = useState('');
  const [backupTestTitle, setBackupTestTitle] = useState('');
  const [backupTestResult, setBackupTestResult] = useState('');
  const [deleteAutoBackupTitle, setDeleteAutoBackupTitle] = useState('');
  const [deleteAutoBackupResult, setDeleteAutoBackupResult] = useState('');

  const [info, setInfo] = useState();
  const [logInfo, setLogInfo] = useState('');
  const [logInfoExport, setLogInfoExport] = useState('');
  const [chainSelectModal, setChainSelectModal] = useState(false);
  const [resetWaleltStartModal, setResetWaleltStartModal] = useState(false);
  const [resetWaleltConfirmModal, setResetWaleltConfirmModal] = useState(false);
  const [understand, setUnderstand] = useState(false);
  const [bgTime, setBgTime] = useState(Date.now());
  const [feeRateDlg, setFeeRateDlg] = useState(false);
  const [feeRate, setFeeRate] = useState('');

  // for reset wallet attention
  const [resetWaleltAttentionModal, setResetWaleltAttentionModal] = useState(false);
  const [pendingRefund, setPendingRefund] = useState(0);
  const [existChannels, setExistChannels] = useState(false);
  const [swapRefund, setSwapRefund] = useState(0);
  const [enableRefund, setEnableRefund] = useState(false);
  const [existPending, setExistPending] = useState(false);

  const setAlertIndex = (index: AlertIndex) => {
    setAlertIndexValue(index);
    if (index === AlertIndex.None) {
      setAlertErr('');
    }
  };

  useFocusEffect(
    useCallback(() => {
      const subscription = AppState.addEventListener('change', nextAppState => {
        switch (nextAppState) {
          case 'background':
          case 'inactive':
            LOG.debug(`DetailSetting.${nextAppState}`);
            setBgTime(Date.now());
            setNeutrinoDlgOpened(false);
            setWatchtowerDlgOpened(false);
            setResetWalletDlgOpened(false);
            setResetWalletPhrase('');
            setResetWalletConfirmPhrase('');
            setResetWalletConfirmPhraseNum(0);
            setFeeRateDlg(false);
            setChainSelectModal(false);
            setResetWaleltAttentionModal(false);
            setResetWaleltStartModal(false);
            setResetWaleltConfirmModal(false);
            setUnderstand(false);
            if (Platform.OS === 'android') {
              if (alertErr.length === 0) {
                setAlertIndex(AlertIndex.None);
              }
            } else {
              //TODO:
              //iOSではモーダルの描画ルールがAndroidと異なり、ロックなどと併用する画面ではモーダルを消さなければ行けない。
              //そのため、Alertを確実に消すためにOS毎に処理を分ける。Google BackupなどのPRにて上記の条件は追加されたようなので、iOSで同様の実装を行う際に改めて見直す。
              //
              // iOS:iCloud Driveバックアップ対応による追記
              //  Google Driveはログインを行うことで使用できるようになるが、その際にOSからダイアログが表示されたためアプリが一時的にバックグラウンドになっていたため対応していた。
              //  iCloud Driveは端末の設定で使用できるかどうかが決まっているため、アプリがバックグラウンドになることがなかったため特別な対応は行わない。
              //  将来、Detail Settings画面で一時的にバックグラウンドになるような機能が追加された場合に対応する。
              setAlertIndex(AlertIndex.None);
            }
            break;
          case 'active':
            if (Date.now() - bgTime > constants.backupIndicatorLockTime) {
              LOG.debug('DetailSetting.back');
              setAnimating(false);
            }
        }
        return;
      });
      return () => {
        subscription.remove();
      };
    }, [alertErr.length, bgTime]),
  );

  useEffect(() => {
    let isUnmounted = false;
    (async () => {
      try {
        const lndInfo = await getInfo();
        const utxos = await listUnspent();
        const allChan = status?.channels?.length;
        const actChan = status?.channels?.reduce((prev, ch) => (ch.status === 'active' ? prev + 1 : prev), 0);
        const pendChan = status?.channels?.reduce(
          (prev, ch) => (ch.status === 'closing' || ch.status === 'forceClosing' || ch.status === 'closeWaiting' ? prev + 1 : prev),
          0,
        );
        const onchainBalance = status?.balance?.onChain.confirmed.toNumber() ?? 0;
        let numTowers;
        try {
          if (store.wtclient) {
            numTowers = (await getWatchtower()).length;
          } else {
            numTowers = 'OFF';
          }
        } catch (e: any) {
          numTowers = e.message;
        }
        const debugInfo =
          `MY NODE:\n${lndInfo.identity_pubkey}\n\n` +
          `VERSION:${DeviceInfo.getVersion()}(${DeviceInfo.getBuildNumber()})\n` +
          `LND:${lndInfo.version}\n` +
          `HEIGHT:${convertStringNumber(lndInfo.block_height, store.digitDecimalRule)}\n` +
          `NUM_PEERS:${lndInfo.num_peers}\n` +
          `SYNCED_TO_CHAIN:${lndInfo.synced_to_chain}\n` +
          `REFUND=${convertStringNumber(onchainBalance, store.digitDecimalRule)} sats(utxos=${utxos.utxos.length})\n` +
          `NUM_TOWERS:${numTowers}\n` +
          `NUM_CHANS:${allChan}(active=${actChan}, pending=${pendChan})`;
        if (isUnmounted) return;
        setInfo(lndInfo);
        setLogInfo(debugInfo);
      } catch (e: any) {
        LOG.error(`Detail settings: ${e.toString()}`);
      }
    })();
    return () => {
      isUnmounted = true;
    };
  }, [status, store.digitDecimalRule, store.wtclient, t]);

  useEffect(() => {
    (async () => {
      try {
        if (logInfoExport.length === 0) {
          return;
        }
        const option = {
          title: 'export debug log',
          failOnCancel: false,
          saveToFiles: false,
          url: `file://${logInfoExport}`,
        };
        const res = await Share.open(option);
        LOG.debug(`Export Debug Log RESULT: ${JSON.stringify(res)}`);
        setLogInfoExport('');
      } catch (e: any) {
        LOG.error(`Export Debug Log ERROR: ${e.toString()}`);
      }
      setAlertIndex(AlertIndex.None);
    })();
  }, [logInfoExport]);

  const cancelProp: AlertButtonProps = {
    text: t('cancel'),
    style: 'cancel',
    onPress: () => {
      setAlertIndex(AlertIndex.None);
    },
  };

  const logAlertButton = (lndInfo: any) => {
    const buttonProp: AlertButtonProps[] = [
      cancelProp,
      {
        text: t('export'),
        style: 'submit',
        onPress: async () => {
          const now = new Date();
          const message = {
            date: `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`,
            info: {},
            neutrinos: -1,
          };
          try {
            const neutrinos = store.peers.filter(peer => peer.length > 0).length;
            if (lndInfo.features) {
              delete lndInfo.features;
            }
            message.info = lndInfo;
            message.neutrinos = neutrinos;
          } catch (e: any) {
            message.info = {error: 'lnd not started'};
          }
          const logExport = JSON.stringify(message);
          const filename = `${RNFS.TemporaryDirectoryPath}/nc2-alllogs.zip`;
          await archiveLogs(filename, NETWORK, logExport);
          setLogInfoExport(filename);
        },
      },
    ];
    return buttonProp;
  };

  const googleBackupAlertButton: AlertButtonProps[] = [
    cancelProp,
    {
      text: t('yes'),
      style: 'submit',
      onPress: () => {
        setAlertIndex(AlertIndex.None);
        googleDriveBackupTurnOn();
      },
    },
  ];

  const googleBackupDisableAlertButton: AlertButtonProps[] = [
    cancelProp,
    {
      text: t('yes'),
      style: 'attention',
      onPress: () => {
        setAlertIndex(AlertIndex.None);
        googleDriveBackupTurnOff();
      },
    },
  ];

  const icloudBackupAlertButton: AlertButtonProps[] = [
    cancelProp,
    {
      text: t('yes'),
      style: 'submit',
      onPress: () => {
        setAlertIndex(AlertIndex.None);
        icloudDriveBackupTurnOn();
      },
    },
  ];

  const icloudBackupDisableAlertButton: AlertButtonProps[] = [
    cancelProp,
    {
      text: t('yes'),
      style: 'attention',
      onPress: () => {
        setAlertIndex(AlertIndex.None);
        icloudDriveBackupTurnOff();
      },
    },
  ];

  const watchtowerAlertButton: AlertButtonProps[] = [
    cancelProp,
    {
      text: t('settings:watchtowerNotActiveButton'),
      style: 'submit',
      onPress: () => {
        setAlertIndex(AlertIndex.None);
        dispatch({
          type: 'enableWtClient',
          wtclient: true,
        });
        navigation.reset({
          index: 0,
          routes: [{name: 'Shutdown', params: {option: 'RESTART', rescan: false}}],
        });
      },
    },
  ];

  const closeAll = async () => {
    setAnimating(true);
    try {
      const rate = await getEstimateFee(status?.blockHeight ?? 0);
      const ret = await channel.closeChannelAll(rate.medium);
      if (ret) {
        const dismiss = show({
          title: t('success'),
          titleColor: theme.color.textColor,
          message: t('detailSettings:closeAllSuccess'),
          buttons: [
            {
              text: t('home'),
              onPress: () => {
                dismiss();
                navigation.reset({
                  index: 0,
                  routes: [{name: 'Root'}],
                });
              },
              style: 'cancel',
            },
          ],
        });
      } else {
        setAlertErr(t('failure'));
        setAlertIndex(AlertIndex.Error);
      }
      setAnimating(false);
    } catch (e: any) {
      setAlertErr(e.message);
      setAlertIndex(AlertIndex.Error);
    }
  };

  const closeAllButton: AlertButtonProps[] = [
    cancelProp,
    {
      text: t('yes'),
      style: 'attention',
      onPress: () => {
        closeAll();
        setAlertIndex(AlertIndex.None);
      },
    },
  ];

  const scrennshotPrevButton: AlertButtonProps[] = [
    cancelProp,
    {
      text: t('yes'),
      style: 'attention',
      onPress: () => {
        setAlertIndex(AlertIndex.None);
        dispatch({
          type: 'setScreenshotPrevent',
          screenshotPrevent: false,
        });
      },
    },
  ];

  const closeConfirm = () => {
    if (!status?.channels?.some(chan => chan.status === 'active')) {
      setAlertErr(t('detailSettings:notExistChannels'));
      setAlertIndex(AlertIndex.Error);
    } else {
      setAlertIndex(AlertIndex.CloseAll);
    }
  };

  const onSave = (rate: number) => {
    dispatch({type: 'setMaxFeeRate', maxFeeRate: rate});
  };

  const invalidFeeError = () => {
    setAlertIndex(AlertIndex.InvalidInputRate);
  };

  const largeAlertButton = (rate: number) => {
    const buttonProp: AlertButtonProps[] = [
      cancelProp,
      {
        text: t('yes'),
        style: 'attention',
        onPress: () => {
          onSave(rate);
          setAlertIndex(AlertIndex.None);
          setFeeRateDlg(false);
        },
      },
    ];
    return buttonProp;
  };

  const largeFeeError = () => {
    setAlertIndex(AlertIndex.LargeRate);
  };

  const parsedRate = () => {
    const fr = convertNumberString(feeRate, store.digitDecimalRule);
    return parseFloat(fr);
  };

  const saveFeeRate = () => {
    const fr = convertNumberString(feeRate, store.digitDecimalRule);
    const rate = parseFloat(fr);
    if (!rate || !canParseFloat(fr, false) || rate > 100) {
      // 空欄、0、100%より大きい値、マイナスの値、数値以外の文字列は不正
      setFeeRateDlg(false);
      invalidFeeError();
    } else if (rate >= 20) {
      // 20%以上は大きすぎるかもしれないので警告
      setFeeRateDlg(false);
      largeFeeError();
    } else {
      onSave(rate);
      setFeeRateDlg(false);
    }
  };

  const rescanWalletButton: AlertButtonProps[] = [
    cancelProp,
    {
      text: t('yes'),
      style: 'attention',
      onPress: () => {
        setAlertIndex(AlertIndex.None);
        rescanWallet();
      },
    },
  ];

  const exportDebugLog = () => {
    setAlertIndex(AlertIndex.ExportLog);
  };

  const googleDriveTestBackupData = async () => {
    setAnimating(true);
    setBackupTestTitle(t('settings:googleDriveTestRecovery'));
    try {
      await backup.recoverTestFromGdrive();
      setBackupTestResult(t('ok'));
    } catch (e) {
      LOG.error(e);
      setBackupTestResult(t('error'));
    }
    setAlertIndex(AlertIndex.BackupTest);
    setAnimating(false);
  };

  const googleDriveRecoverChannel = async () => {
    setAnimating(true);
    setBackupTestTitle(t('settings:googleDriveChanRecovery'));
    try {
      await backup.recoverChanFromGdrive();
      setBackupTestResult(t('ok'));
    } catch (e) {
      LOG.error(e);
      setBackupTestResult(t('error'));
    }
    setAlertIndex(AlertIndex.BackupTest);
    setAnimating(false);
  };

  const googleDriveBackup = () => {
    if (!store.googleBackup) {
      googleDriveBackupSetup();
    } else {
      googleDriveBackupDisable();
    }
  };

  const googleDriveBackupTurnOn = async () => {
    setAnimating(true);
    try {
      const email = await google.googleSignIn();
      await google.gdriveSetup();
      await backup.backupAllToGdrive();
      dispatch({type: 'enableGoogleBackup', googleBackup: true});
      setAlertIndex(AlertIndex.SuccessBackup);
      dispatch({type: 'setGoogleAccount', googleAccount: email});
      storage.setAutoBackupResult(true);
    } catch (e: any) {
      LOG.error(`googleDriveBackupTurnOn: ${e.toString()}`);
      storage.setAutoBackupResult(false);
      await google.googleSignOut();
      setCancelErr(e.toString());
      setAlertIndex(AlertIndex.CancelBackup);
    }
    setAnimating(false);
  };

  const googleDriveBackupTurnOff = () => {
    dispatch({type: 'enableGoogleBackup', googleBackup: false});
  };

  const googleDriveBackupSetup = () => {
    setAlertIndex(AlertIndex.EnableBackupGoogle);
  };

  const googleDriveBackupDisable = () => {
    setAlertIndex(AlertIndex.DisableBackupGoogle);
  };

  const icloudDriveTestBackupData = async () => {
    LOG.debug('icloudDriveTestBackupData: start');
    if (!(await icloud.isICloudAvailable())) {
      LOG.warn('icloudDriveTestBackupData: iCloud not available');
      setAlertIndex(AlertIndex.DisableIcloud);
      return;
    }

    const startDt = new Date();
    setAnimating(true);
    setBackupTestTitle(t('settings:icloudDriveTestRecovery'));
    try {
      await backup.recoverTestFromIcloud();
      setBackupTestResult(t('ok'));
    } catch (e: any) {
      LOG.error(`icloudDriveTestBackupData: recoverTestFromIcloud: ${e}`);
      setBackupTestResult(t('error'));
    } finally {
      const ellapse = new Date().getTime() - startDt.getTime();
      if (ellapse < 3000) {
        await waitForSec((3000 - ellapse) / 1000);
      }
      setAnimating(false);
    }
    setAlertIndex(AlertIndex.BackupTest);
    LOG.debug('icloudDriveTestBackupData: end');
  };

  const icloudDriveRecoverChannel = async () => {
    LOG.debug('icloudDriveRecoverChannel: start');
    if (!(await icloud.isICloudAvailable())) {
      LOG.warn('icloudDriveRecoverChannel: iCloud not available');
      setAlertIndex(AlertIndex.DisableIcloud);
      return;
    }

    const startDt = new Date();
    setAnimating(true);
    setBackupTestTitle(t('settings:icloudDriveChanRecovery'));
    try {
      await backup.recoverChanFromIcloud();
      setBackupTestResult(t('ok'));
    } catch (e) {
      LOG.error(`icloudDriveRecoverChannel: recoverChanFromIcloud: ${e}`);
      setBackupTestResult(t('error'));
    } finally {
      const ellapse = new Date().getTime() - startDt.getTime();
      if (ellapse < 3000) {
        await waitForSec((3000 - ellapse) / 1000);
      }
      setAnimating(false);
    }
    setAlertIndex(AlertIndex.BackupTest);
    LOG.debug('icloudDriveRecoverChannel: end');
  };

  const icloudDriveBackup = async () => {
    if (!(await icloud.isICloudAvailable())) {
      LOG.warn('icloudDriveBackup: iCloud not available');
      setAlertIndex(AlertIndex.DisableIcloud);
      return;
    }
    if (!store.icloudBackup) {
      setAlertIndex(AlertIndex.EnableBackupIcloud);
    } else {
      setAlertIndex(AlertIndex.DisableBackupIcloud);
    }
  };

  const icloudDriveBackupTurnOn = async () => {
    setAnimating(true);
    try {
      await backup.backupAllToIcloud();
      storage.setAutoBackupResult(true);
      dispatch({type: 'enableIcloudBackup', icloudBackup: true});
      setAlertIndex(AlertIndex.SuccessBackup);
    } catch (e: any) {
      LOG.error(`icloudDriveBackupTurnOn: ${e.toString()}`);
      storage.setAutoBackupResult(false);
      setCancelErr(e.toString());
      setAlertIndex(AlertIndex.CancelBackup);
    } finally {
      setAnimating(false);
    }
  };

  const icloudDriveBackupTurnOff = () => {
    dispatch({type: 'enableIcloudBackup', icloudBackup: false});
  };

  const goToSecurity = () => {
    if (store.pin === '') {
      navigation.navigate('Pin', {status: 'REGISTER', reset: false});
    } else {
      navigation.navigate('Pin', {status: 'SETTINGS', reset: false});
    }
  };

  const wtclientSetting = () => {
    if (store.wtclient) {
      setWatchtowerDlgOpened(true);
    } else {
      setAlertIndex(AlertIndex.NotActiveWatchtower);
    }
  };

  const openFeeRateDialog = () => {
    setFeeRate(`${new BigNumber(store.maxFeeRate).toFormat()}`);
    setFeeRateDlg(true);
  };

  const toggleChainSelectModal = () => {
    setChainSelectModal(!chainSelectModal);
  };

  const toggleResetWaleltAttentionModal = () => {
    setResetWaleltAttentionModal(!resetWaleltAttentionModal);
  };

  const confrimResetWalletAttention = () => {
    if (!store.passConfirmed || existChannels || existPending || enableRefund || pendingRefund) {
      toggleResetWaleltAttentionModal();
    } else {
      resetWalletSelectPassPhrase();
    }
  };

  const toggleResetWaleltStartModal = () => {
    setUnderstand(false);
    setResetWaleltStartModal(!resetWaleltStartModal);
  };

  const toggleResetWaleltConfirmModal = () => {
    setResetWaleltConfirmModal(!resetWaleltConfirmModal);
  };

  const toggleUnderstand = useCallback(() => {
    setUnderstand(u => !u);
  }, []);

  const showTxList = (chain: ChainType) => {
    toggleChainSelectModal();
    chain === 'LN' ? navigation.navigate('TransactionList') : navigation.navigate('OnchainTransactionList');
  };

  const rescanWalletModal = () => {
    setAlertIndex(AlertIndex.RescanWallet);
  };
  const rescanWallet = () => {
    navigation.reset({
      index: 0,
      routes: [{name: 'Shutdown', params: {option: 'RESTART', rescan: true}}],
    });
  };

  // Google Backup setting
  //  subtitle
  //  - login account
  //  - last backup time
  useEffect(() => {
    if (!constants.backupEnableGDrive) return;
    let isUnmounted = false;
    if (!store.googleBackup) {
      setLastBackupGoogle(t('none'));
      return;
    }
    (async () => {
      setLastBackupGoogle(t('loading'));
      const bkDate = await backup.getLastBackupDateFromGdrive();
      if (isUnmounted) return;
      const tmBackup = bkDate ? dateString(bkDate, false) : t('error');
      setLastBackupGoogle(`${store.googleAccount}\n${t('settings:googleDriveBackupSub', {tmBackup})}`);
    })();
    return () => {
      isUnmounted = true;
    };
  }, [store.googleAccount, store.googleBackup, t]);

  // iCloud Backup setting
  //  check iCloud Drive enabled
  useEffect(() => {
    if (!constants.backupEnableIcloud) return;
    (async () => {
      if (!(await icloud.isICloudAvailable())) {
        setLastBackupIcloud(t('notAvailable'));
        return;
      }
      if (store.icloudBackup) {
        const lastResult = await storage.getAutoBackupResult();
        if (lastResult.result == null) {
          setLastBackupIcloud(t('on'));
        } else {
          const result = lastResult.result ? t('on') : t('failure');
          setLastBackupIcloud(`${result}: ${lastResult.message}`);
        }
      } else {
        setLastBackupIcloud(t('off'));
      }
    })();
  }, [store.icloudBackup, t]);

  const manualChannelRecoveryAndroid = async () => {
    await backup.recoverChanFromFile();
  };

  const manualChannelRecoveryIos = async () => {
    try {
      const pickerResult = await DocumentPicker.pickSingle({
        presentationStyle: 'fullScreen',
      });
      const realURI = decodeURIComponent(pickerResult.uri);
      LOG.info(`manual chan restore: backup file: ${realURI}`);
      const jsonText = await RNFS.readFile(realURI, 'utf8');
      await backup.recoverChanFromData(jsonText);
    } catch (e: any) {
      if (DocumentPicker.isCancel(e)) {
        LOG.info('manualChannelRecoveryIos: cancel');
        throw new Error(t('cancel'));
      } else {
        LOG.error(`manualChannelRecoveryIos: error: ${e.message}`);
        throw e;
      }
    }
  };

  const manualAppRecoveryAndroid = async () => {
    await backup.recoverAppFromFile();
  };

  const manualAppRecoveryIos = async () => {
    try {
      const pickerResult = await DocumentPicker.pickSingle({
        presentationStyle: 'fullScreen',
      });
      const realURI = decodeURIComponent(pickerResult.uri);
      LOG.info(`manual app restore: backup file: ${realURI}`);
      const base64 = await RNFS.readFile(realURI, 'utf8');
      await backup.recoverAppFromData(base64);
    } catch (e: any) {
      if (DocumentPicker.isCancel(e)) {
        LOG.info('manualAppRecoveryIos: cancel');
        throw new Error(t('cancel'));
      } else {
        LOG.error(`manualAppRecoveryIos: error: ${e.message}`);
        throw e;
      }
    }
  };

  // TODO: Delete below some codes for reset wallet attention after these are set to asyncstorage or else in Home screen
  useEffect(() => {
    (async () => {
      setSwapRefund(await submarine.repaymentAmount(status?.blockHeight ?? 0));
    })();
  }, [status]);

  useEffect(() => {
    // the flag of enable Refund
    if (status) {
      const pendingChannels = status.channels?.filter(chan => chan.status !== 'active' && chan.status !== 'inactive') ?? [];
      if (pendingChannels.length > 0) {
        setExistPending(true);
      } else {
        setExistPending(false);
      }
      const onchainBalance = status?.balance?.onChain.confirmed.toNumber() ?? 0;
      if (onchainBalance >= constants.refundMinimumAmount || swapRefund >= constants.refundMinimumAmount) {
        setEnableRefund(true);
      } else {
        setEnableRefund(false);
      }

      //  the flag of existing pending refund amount
      (async () => {
        if (status.blockHeight) {
          const amount = await submarine.nonRepaymentAmount(status.blockHeight);
          setPendingRefund(amount);
        }
      })();

      // the flag of exist channels
      (async () => {
        const channels = await channel.listChannels();
        if (channels.length > 0) {
          setExistChannels(true);
        }
      })();
    }
  }, [status, store.googleBackup, store.icloudBackup, swapRefund]);

  const resetWalletSelectPassPhrase = async () => {
    setUnderstand(false);
    // randomNum means it is represented by a number that the user sees, not an index.
    const randomNum = Math.floor(Math.random() * 24 + 1);
    setResetWalletConfirmPhraseNum(randomNum);

    const cred = await getSeed();
    if (!cred) {
      setAlertIndex(1);
      throw new Error(t('backuppassphrase:alert'));
    }
    const mnemonic = cred.password.split(' ');
    const selectWords = mnemonic[randomNum - 1];
    setResetWalletConfirmPhrase(selectWords);
    setResetWalletDlgOpened(true);
  };

  const deleteAutoBackup = async () => {
    const lndInfo = await getInfo();
    if (constants.backupEnableGDrive) {
      LOG.debug('googleDriveDeleteAutoBackup: start');
      setAnimating(true);
      setDeleteAutoBackupTitle(t('settings:googleDriveDeleteAutoBackup'));
      try {
        const metadata = await google.gdriveFiles();
        for (let lp = 0; lp < metadata.length; lp++) {
          if (metadata[lp].name.includes(lndInfo.identity_pubkey)) {
            await google.gdriveDeleteFile(metadata[lp].name);
          }
        }
        setDeleteAutoBackupResult(t('ok'));
      } catch (e: any) {
        LOG.error(`deleteAutoBackup: Error: ${e}`);
        setDeleteAutoBackupResult(t('error'));
      }
      setAnimating(false);
      LOG.debug('googleDriveDeleteAutoBackup: end');
    } else if (constants.backupEnableIcloud) {
      LOG.debug('icloudDriveDeleteAutoBackup: start');
      if (!(await icloud.isICloudAvailable())) {
        LOG.warn('deleteAutoBackup: iCloud not available');
        setAlertIndex(AlertIndex.DisableIcloud);
        return;
      }
      const startDt = new Date();
      setAnimating(true);
      setDeleteAutoBackupTitle(t('settings:icloudDriveDeleteAutoBackup'));
      try {
        await icloud.cloudstoreRemoveFiles(lndInfo.identity_pubkey);
        await icloudDriveBackupTurnOff();
        setDeleteAutoBackupResult(t('ok'));
      } catch (e: any) {
        LOG.error(`deleteAutoBackup: Error: ${e}`);
        setDeleteAutoBackupResult(t('error'));
      } finally {
        const ellapse = new Date().getTime() - startDt.getTime();
        if (ellapse < 3000) {
          await waitForSec((3000 - ellapse) / 1000);
        }
        setAnimating(false);
        LOG.debug('icloudDriveDeleteAutoBackup: end');
      }
    }
    setAlertIndex(AlertIndex.DeleteAutoBackup);
  };

  const resetWalletAndStorage = async () => {
    LOG.debug(`resetWalletAndStorage: Start`);
    await initStorage();
    const initialState = await getInitialState(true);
    dispatch({
      type: 'initState',
      state: initialState,
    });
    setLocale('en', 'default');
    const ret = await resetWallet();
    if (ret) {
      LOG.debug(`resetWalletAndStorage: Reset Done`);
      await stopLND();
      forceRestart();
    } else {
      LOG.debug(`resetWalletAndStorage: Error`);
      setAlertIndex(AlertIndex.ResetWalletError);
    }
  };

  return (
    <ScrollablePage title={t('detailSettings:details')}>
      <View style={styles.container}>
        <List title={t('detailSettings:privacy')} icon={'lock'}>
          <WrapListItem
            indent
            onPress={() => {
              goToSecurity();
            }}
            label={t('detailSettings:securityLock')}
            right
            checking={params?.checking}
          />
          {constants.backupEnableGDrive && (
            <WrapListItem
              indent
              onPress={async () => {
                await googleDriveBackup();
              }}
              label={t('settings:googleDriveBackup')}
              subLabel={lastBackupGoogle}
              checking={params?.checking}
            />
          )}
          {constants.backupEnableIcloud && (
            <WrapListItem
              indent
              onPress={async () => {
                await icloudDriveBackup();
              }}
              label={t('settings:icloudDriveBackup')}
              subLabel={lastBackupIcloud}
              checking={params?.checking}
            />
          )}
          {!constants.backupEnableAuto && constants.backupEnableManual && (
            <WrapListItem
              indent
              onPress={async () => {
                await backup.backupChanToFile();
              }}
              label={t('settings:manualBackup')}
            />
          )}
          {Platform.OS === 'android' && (
            <WrapListItem
              indent
              onPress={() => {
                store.screenshotPrevent
                  ? setAlertIndex(AlertIndex.ScreenshotPrevent)
                  : dispatch({type: 'setScreenshotPrevent', screenshotPrevent: true});
              }}
              label={t('detailSettings:screenshotPreventTitle')}
              subLabel={store.screenshotPrevent ? t('on') : t('off')}
            />
          )}
        </List>
        <List title={t('detailSettings:node')} icon={'dns'}>
          <WrapListItem
            indent
            onPress={() => {
              setNeutrinoIp(store.peers[0]);
              setNeutrinoDlgOpened(true);
            }}
            label={t('settings:setNeutrino')}
            subLabel={t('settings:setNeutrinoSub')}
          />
          <WrapListItem indent onPress={wtclientSetting} label={t('settings:addWatchtower')} />
          <WrapListItem indent onPress={openFeeRateDialog} label={t('settings:maxFeeRate')} checking={params?.checking} />
        </List>

        <List title={t('detailSettings:display')} icon={'subtitles'}>
          <WrapListItem
            indent
            onPress={() => navigation.navigate('SettingsLanguage')}
            label={t('settings:language')}
            right
            checking={params?.checking}
          />
          <WrapListItem
            indent
            onPress={() => {
              navigation.navigate('SettingDigit', {start: false});
            }}
            label={t('detailSettings:digit')}
            right
            checking={params?.checking}
          />
          {store.debugging && NETWORK === 'mainnet' && (
            <WrapListItem
              indent
              onPress={() => {
                navigation.navigate('SettingExplorer');
              }}
              label={t('detailSettings:explorer')}
              right
              checking={params?.checking}
            />
          )}
        </List>

        <List title={t('detailSettings:exportData')} icon={'folder'}>
          <WrapListItem indent onPress={exportDebugLog} label={t('settings:exportLog')} />
          <WrapListItem indent onPress={toggleChainSelectModal} label={t('home:allTransacrtions')} />
        </List>

        <List title={t('detailSettings:advanced')} icon={'attachment'}>
          <WrapListItem indent onPress={closeConfirm} label={t('detailSettings:closeAll')} />
          {Platform.OS === 'ios' && <WrapListItem indent onPress={confrimResetWalletAttention} label={t('detailSettings:resetWallet')} />}
          {constants.backupEnableGDrive && <WrapListItem indent onPress={googleDriveTestBackupData} label={t('settings:googleDriveTestRecovery')} />}
          {constants.backupEnableGDrive && <WrapListItem indent onPress={deleteAutoBackup} label={t('settings:googleDriveDeleteAutoBackup')} />}
          {constants.backupEnableGDrive && <WrapListItem indent onPress={googleDriveRecoverChannel} label={t('settings:googleDriveChanRecovery')} />}
          {constants.backupEnableIcloud && <WrapListItem indent onPress={icloudDriveTestBackupData} label={t('settings:icloudDriveTestRecovery')} />}
          {constants.backupEnableIcloud && <WrapListItem indent onPress={deleteAutoBackup} label={t('settings:icloudDriveDeleteAutoBackup')} />}
          {constants.backupEnableIcloud && <WrapListItem indent onPress={icloudDriveRecoverChannel} label={t('settings:icloudDriveChanRecovery')} />}
          {constants.backupEnableAuto && constants.backupEnableManual && (
            <WrapListItem
              indent
              onPress={async () => {
                await backup.backupChanToFile();
              }}
              label={t('settings:manualBackup')}
            />
          )}
          {constants.backupEnableManual && (
            <WrapListItem
              indent
              onPress={async () => {
                try {
                  if (Platform.OS === 'android') {
                    await manualChannelRecoveryAndroid();
                  } else if (Platform.OS === 'ios') {
                    await manualChannelRecoveryIos();
                  }
                  LOG.info('manual channel recovery: done');
                  setAlertSuccessTitle(t('settings:manualChannelRecovery'));
                  setAlertIndex(AlertIndex.Success);
                } catch (e: any) {
                  LOG.error(`manual channel recovery: ${e.toString()}`);
                  setAlertErr(e.toString());
                  setAlertIndex(AlertIndex.Error);
                }
              }}
              label={t('settings:manualChannelRecovery')}
            />
          )}
          {constants.backupEnableManual && (
            <WrapListItem
              indent
              onPress={async () => {
                try {
                  if (Platform.OS === 'android') {
                    await manualAppRecoveryAndroid();
                  } else if (Platform.OS === 'ios') {
                    await manualAppRecoveryIos();
                  }
                  setAlertSuccessTitle(t('settings:manualAppDbRestore'));
                  setAlertIndex(AlertIndex.Success);
                  navigation.reset({
                    index: 0,
                    routes: [{name: 'Shutdown', params: {option: 'RESTART', rescan: false}}],
                  });
                  LOG.info('manual appdb restore: done');
                } catch (e: any) {
                  LOG.error(`manual appdb restore: ${e.toString()}`);
                  setAlertErr(e.toString());
                  setAlertIndex(AlertIndex.Error);
                }
              }}
              label={t('settings:manualAppDbRestore')}
            />
          )}
          <WrapListItem indent onPress={rescanWalletModal} label={t('detailSettings:rescanWallet')} />
        </List>
      </View>
      <Modal visible={animating} animationType="fade" hardwareAccelerated={true} transparent={true}>
        <View style={styles.modalBackground}>
          <ActivityIndicator size="large" color="white" />
        </View>
      </Modal>
      <DialogInput
        isDialogVisible={neutrinoDlgOpened}
        title={t('settings:neutrinoDescriptionTitle')}
        message={t('settings:neutrinoDescriptionMsg')}
        hintInput={t('settings:neutrinoDescriptionHint')}
        submitInput={(inputText: string) => {
          dispatch({type: 'setPeers', peers: [inputText]});
          setNeutrinoDlgOpened(false);
          setNeutrinoIp('');
        }}
        closeDialog={() => {
          setNeutrinoDlgOpened(false);
          setNeutrinoIp('');
        }}
        value={neutrinoIp}
        onChange={setNeutrinoIp}
      />
      <DialogInput
        isDialogVisible={watchtowerDlgOpened}
        title={t('settings:watchtowerDescriptionTitle')}
        message={t('settings:watchtowerDescriptionMsg')}
        hintInput={t('settings:watchtowerDescriptionHint')}
        submitInput={async (inputText: string) => {
          LOG.trace(`watchtowers: ${inputText}`);
          setWatchtowerDlgOpened(false);
          setWatchTowerUri('');
          try {
            await addWatchtower(inputText);
          } catch (e: any) {
            LOG.error(e.toString());
            setWatchtowerDlgOpened(false);
            setAlertErr(e.message);
            setAlertIndex(AlertIndex.Error);
          }
        }}
        closeDialog={() => {
          setWatchtowerDlgOpened(false);
          setWatchTowerUri('');
        }}
        value={watchTowerUri}
        onChange={setWatchTowerUri}
      />
      <DialogInput
        isDialogVisible={resetWalletDlgOpened}
        title={t('detailSettings:resetWallet')}
        message={t('detailSettings:resetWalletMessage', {num: resetWalletConfirmPhraseNum})}
        submitText={t('yes')}
        submitInput={inputText => {
          setResetWalletDlgOpened(false);
          setResetWalletPhrase('');
          setResetWalletConfirmPhrase('');
          setResetWalletConfirmPhraseNum(0);
          if (resetWalletConfirmPhrase === inputText) {
            toggleResetWaleltConfirmModal();
            toggleResetWaleltStartModal();
          } else {
            setAlertIndex(AlertIndex.ResetWalletError);
          }
        }}
        closeDialog={() => {
          setResetWalletDlgOpened(false);
          setResetWalletPhrase('');
          setResetWalletConfirmPhrase('');
          setResetWalletConfirmPhraseNum(0);
        }}
        value={resetWalletPhrase}
        onChange={setResetWalletPhrase}
      />
      <ModalTheme
        visible={chainSelectModal}
        closing={toggleChainSelectModal}
        title={t('home:allTransacrtions')}
        children={
          <>
            <Text style={styles.modalDescription}>{t('detailSettings:selectChain')}</Text>
            <Button onPress={() => showTxList('LN')} style={styles.selectionBtn}>
              <View style={styles.wrapper}>
                <MCIcon name="lightning-bolt" size={fontSizes.basic4} color={theme.color.selectButtonTextColor} />
                <Text style={styles.selectionLabel}>{t('lightning')}</Text>
              </View>
            </Button>
            <Button onPress={() => showTxList('BTC')} style={styles.selectionOutlineBtn}>
              <View style={styles.wrapper}>
                <MCIcon name="bitcoin" size={fontSizes.basic4} color={theme.color.textColor} />
                <Text style={styles.selectionLabelOutline}>{t('bitcoin')}</Text>
              </View>
            </Button>
          </>
        }
      />
      <ModalTheme
        visible={resetWaleltAttentionModal}
        closing={toggleResetWaleltAttentionModal}
        title={t('detailSettings:resetWallet')}
        children={
          <View style={styles.attentionContainer}>
            <Text style={styles.modalDescription}>{t('detailSettings:resetWalletAttentionMessage')}</Text>
            <Animated.ScrollView style={styles.attentionListScroll}>
              {!store.passConfirmed && (
                <View style={styles.attentionItem}>
                  <MIcon name="vpn-key" size={24} style={styles.attentionIcon} />
                  <Text style={styles.attentionDescription}>{t('detailSettings:attentionPassphrase')}</Text>
                </View>
              )}
              {existChannels && (
                <View style={styles.attentionItem}>
                  <MIcon name="swap-horizontal-circle" size={24} style={styles.attentionIcon} />
                  <Text style={styles.attentionDescription}>{t('detailSettings:attentionExistChannels')}</Text>
                </View>
              )}
              {existPending && (
                <View style={styles.attentionItem}>
                  <MIcon name="notification-important" size={24} style={styles.attentionIcon} />
                  <Text style={styles.attentionDescription}>{t('detailSettings:attentionExistPendings')}</Text>
                </View>
              )}
              {enableRefund && (
                <View style={styles.attentionItem}>
                  <MIcon name="account-balance-wallet" size={24} style={styles.attentionIcon} />
                  <Text style={styles.attentionDescription}>{t('detailSettings:attentionExistRefunds')}</Text>
                </View>
              )}
              {pendingRefund > 0 && (
                <View style={styles.attentionItem}>
                  <MIcon name="notification-important" size={24} style={styles.attentionIcon} />
                  <Text style={styles.attentionDescription}>{t('detailSettings:attentionExistRefundPendings')}</Text>
                </View>
              )}
            </Animated.ScrollView>
            <Button
              outline
              style={styles.nextButton}
              onPress={() => {
                toggleResetWaleltAttentionModal();
              }}>
              <Text style={styles.modalCancelButtonText}>{t('cancel')}</Text>
            </Button>
            <Button
              style={styles.nextButton}
              onPress={() => {
                toggleResetWaleltAttentionModal();
                resetWalletSelectPassPhrase();
              }}>
              <Text style={styles.modalNextButtonText}>{t('next')}</Text>
            </Button>
          </View>
        }
      />
      <ModalTheme
        visible={resetWaleltStartModal}
        closing={toggleResetWaleltStartModal}
        title={t('detailSettings:resetWallet')}
        children={
          <>
            <Text style={styles.modalDescription}>{t('detailSettings:resetWalletConfirmMessage')}</Text>
            <Text style={styles.modalDescription}>{t('detailSettings:resetWalletStartMessage')}</Text>
            <Pressable style={styles.checkbox} onPress={toggleUnderstand}>
              <View style={Platform.OS === 'ios' && {transform: [{scale: 0.6}]}}>
                <CheckBox
                  value={understand}
                  onValueChange={setUnderstand}
                  tintColors={{true: theme.color.textColor, false: theme.color.textColor}}
                  onCheckColor={theme.color.textColor}
                  onTintColor={theme.color.textColor}
                  lineWidth={2}
                  boxType={'square'}
                  animationDuration={0.3}
                  onAnimationType={'fade'}
                  offAnimationType={'fade'}
                />
              </View>
              <Text style={styles.checkLabel}>{t('disclaimer:understand')}</Text>
            </Pressable>
            <Button
              outline
              style={styles.nextButton}
              onPress={() => {
                toggleResetWaleltStartModal();
              }}>
              <Text style={styles.modalCancelButtonText}>{t('cancel')}</Text>
            </Button>
            <Button
              style={styles.nextButton}
              disabled={!understand}
              onPress={() => {
                toggleResetWaleltStartModal();
                resetWalletAndStorage();
              }}>
              <Text style={understand ? styles.modalNextButtonText : styles.disableModalNextButtonText}>{t('start')}</Text>
            </Button>
          </>
        }
      />
      <Alert
        isAlertVisible={alertIndex === AlertIndex.Success}
        title={alertSuccessTitle}
        message={`${t('success')}`}
        closing={() => setAlertIndex(AlertIndex.None)}
      />
      <Alert isAlertVisible={alertIndex === AlertIndex.Error} title={t('error')} message={alertErr} closing={() => setAlertIndex(AlertIndex.None)} />
      <Alert
        isAlertVisible={alertIndex === AlertIndex.ExportLog}
        title={t('settings:exportLog')}
        message={logInfo}
        button={logAlertButton(info)}
        copyBtn={true}
      />
      <Alert
        isAlertVisible={alertIndex === AlertIndex.SuccessBackup}
        title={t('settings:backupTitle')}
        message={t('succeeded')}
        closing={() => setAlertIndex(AlertIndex.None)}
      />
      <Alert
        isAlertVisible={alertIndex === AlertIndex.CancelBackup}
        title={t('settings:backupTitle')}
        message={`${t('canceled')}\n\n${JSON.stringify(cancelErr)}`}
        closing={() => setAlertIndex(AlertIndex.None)}
      />
      <Alert
        isAlertVisible={alertIndex === AlertIndex.EnableBackupGoogle}
        title={t('settings:googleDriveBackupTitle')}
        message={t('settings:googleDriveBackupMessage')}
        button={googleBackupAlertButton}
      />
      <Alert
        isAlertVisible={alertIndex === AlertIndex.DisableBackupGoogle}
        title={t('settings:googleDriveBackupTitle')}
        message={t('settings:googleDriveBackupDisableMessage')}
        button={googleBackupDisableAlertButton}
      />
      <Alert
        isAlertVisible={alertIndex === AlertIndex.EnableBackupIcloud}
        title={t('settings:icloudDriveBackupTitle')}
        message={t('settings:icloudDriveBackupMessage')}
        button={icloudBackupAlertButton}
      />
      <Alert
        isAlertVisible={alertIndex === AlertIndex.DisableBackupIcloud}
        title={t('settings:icloudDriveBackupTitle')}
        message={t('settings:icloudDriveBackupDisableMessage')}
        button={icloudBackupDisableAlertButton}
      />
      <Alert
        isAlertVisible={alertIndex === AlertIndex.DisableIcloud}
        title={t('settings:icloudDriveBackupTitle')}
        message={t('settings:icloudDisabled')}
        closing={() => setAlertIndex(AlertIndex.None)}
      />
      <Alert
        isAlertVisible={alertIndex === AlertIndex.NotActiveWatchtower}
        title={t('settings:watchtowerNotActiveTitle')}
        message={t('settings:watchtowerNotActiveMsg')}
        button={watchtowerAlertButton}
      />
      <Alert
        isAlertVisible={alertIndex === AlertIndex.BackupTest}
        title={backupTestTitle}
        message={backupTestResult}
        closing={() => setAlertIndex(AlertIndex.None)}
      />
      <Alert
        isAlertVisible={alertIndex === AlertIndex.DeleteAutoBackup}
        title={deleteAutoBackupTitle}
        message={deleteAutoBackupResult}
        closing={() => setAlertIndex(AlertIndex.None)}
      />
      <Alert
        isAlertVisible={alertIndex === AlertIndex.InvalidInputRate}
        title={t('error')}
        message={t('settings:maxFeeRateInvalidValue')}
        closing={() => setAlertIndex(AlertIndex.None)}
      />
      <Alert
        isAlertVisible={alertIndex === AlertIndex.LargeRate}
        title={t('attention')}
        message={t('settings:maxFeeRateLargeMsg')}
        button={largeAlertButton(parsedRate())}
      />
      <Alert
        isAlertVisible={alertIndex === AlertIndex.CloseAll}
        title={t('attention')}
        message={t('detailSettings:closeAllMsg')}
        button={closeAllButton}
      />
      <Alert
        isAlertVisible={alertIndex === AlertIndex.ScreenshotPrevent}
        title={t('attention')}
        message={t('detailSettings:screenshotPreventMsg')}
        button={scrennshotPrevButton}
      />
      <Alert
        isAlertVisible={alertIndex === AlertIndex.RescanWallet}
        title={t('detailSettings:rescanWallet')}
        message={t('detailSettings:rescanWalletMessage')}
        button={rescanWalletButton}
      />
      <Alert
        isAlertVisible={alertIndex === AlertIndex.ResetWalletError}
        title={t('detailSettings:resetWallet')}
        message={t('errorAbort')}
        closing={() => setAlertIndex(AlertIndex.None)}
      />

      <DialogInput
        isDialogVisible={feeRateDlg}
        title={t('settings:maxFeeRate')}
        message={t('settings:maxFeeRateMemo', {min: `${constants.lnMinFeeSats}`})}
        inputUnit={'%'}
        keyboradType={'numeric'}
        submitInput={(inputRate: string) => {
          setFeeRate(inputRate);
          saveFeeRate();
        }}
        closeDialog={() => {
          setFeeRateDlg(false);
        }}
        value={feeRate}
        onChange={setFeeRate}
      />
    </ScrollablePage>
  );
};

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    container: {
      marginLeft: 8,
    },
    icon: {
      color: theme.color.textColor,
      opacity: 0.6,
    },
    modalBackground: {
      backgroundColor: theme.color.modalBackground,
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignContent: 'center',
    },
    modalDescription: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.buttonLabel,
      color: theme.color.textColor,
      marginBottom: 8,
    },
    wrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    selectionBtn: {
      marginVertical: 12,
      borderRadius: 10,
      backgroundColor: theme.color.selectButtonColor,
      height: 50,
      width: '100%',
    },
    selectionOutlineBtn: {
      marginVertical: 12,
      borderRadius: 10,
      backgroundColor: theme.color.transparent,
      borderColor: theme.color.outlineBorder,
      borderWidth: 0.75,
      height: 50,
    },
    selectionLabel: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.buttonLabel,
      color: theme.color.selectButtonTextColor,
      marginLeft: 8,
    },
    selectionLabelOutline: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.buttonLabel,
      color: theme.color.textColor,
      marginLeft: 8,
    },
    attentionContainer: {
      alignItems: 'flex-start',
      maxHeight: '80%',
    },
    attentionListScroll: {
      paddingHorizontal: 24,
    },
    attentionIcon: {
      color: theme.color.textColor,
      marginRight: 16,
    },
    attentionItem: {
      flexDirection: 'row',
      justifyContent: 'space-evenly',
      alignItems: 'center',
      marginVertical: 8,
    },
    attentionDescription: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.buttonLabel,
      color: theme.color.textColor,
      marginLeft: 16,
    },
    checkbox: {
      marginVertical: 16,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkLabel: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic5,
      color: theme.color.textColor,
      marginLeft: 4,
    },
    nextButton: {
      marginTop: 16,
      borderColor: theme.color.buttonColor,
      borderWidth: 1,
    },
    modalNextButtonText: {
      fontFamily: typographyFonts.notoSans,
      width: '100%',
      textAlign: 'center',
      fontSize: fontSizes.buttonLabel,
      color: theme.color.buttonTextColor,
      letterSpacing: 4,
    },
    modalCancelButtonText: {
      fontFamily: typographyFonts.notoSans,
      width: '100%',
      textAlign: 'center',
      fontSize: fontSizes.buttonLabel,
      color: theme.color.textColor,
      letterSpacing: 4,
    },
    disableModalNextButtonText: {
      fontFamily: typographyFonts.notoSans,
      width: '100%',
      textAlign: 'center',
      fontSize: fontSizes.buttonLabel,
      color: theme.color.textColorTranslucent,
      letterSpacing: 4,
    },
  });
  return styles;
};
