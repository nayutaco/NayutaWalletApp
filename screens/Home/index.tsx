import type {RouteProp} from '@react-navigation/native';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import {BigNumber} from 'bignumber.js';
import React, {useCallback, useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  RefreshControl,
  AppState,
  Pressable,
  ScrollView,
  Modal,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import MIcon from 'react-native-vector-icons/MaterialIcons';

import receiveIcon from 'assets/images/icon_receive.png';
import receiveIconDark from 'assets/images/icon_receive_dark.png';
import sendIcon from 'assets/images/icon_send.png';
import sendIconDark from 'assets/images/icon_send_dark.png';
import lappsTutorial from 'assets/images/tutorial/2.png';
import {closedChannelsLength, getNotificationInfo} from 'bridge/info';
import * as lccontrol from 'bridge/lccontrol';
import * as notification from 'bridge/notification';
import * as payment from 'bridge/payment';
import {addLnRecievedHandler} from 'bridge/received';
import {addInvoice} from 'bridge/wallet';
import {Alert, AlertButtonProps} from 'components/projects/AlertTheme';
import {DateTime} from 'components/projects/DateTime';
import Page from 'components/projects/Page';
import TextInputForm from 'components/projects/TextInputForm';
import {TxItem} from 'components/projects/TxItem/TxItem';
import {UpdateInfo} from 'components/projects/UpdateInfo';
import {ReceiveInfo} from 'components/projects/UpdateInfo/ReceiveInfo';
import {Button} from 'components/uiParts/ButtonTheme';
import {HeaderButtonProps} from 'components/uiParts/Header';
import {ModalTheme} from 'components/uiParts/Modal';
import {Crypto, CryptoInTable, EachBalance, Fiat, FiatInTable, TotalBalance} from 'components/uiParts/Sat/WithStyleParts';
import useBottomSheet from 'hooks/useBottomSheet';
import {useLND} from 'hooks/useLND';
import {ParamList, SendLightningParams} from 'navigation/paramList';
import {useStore} from 'store';
import {getAppVersion, checkDoneAppVersion} from 'store/initStorage';
import {getNeedManualBackup} from 'store/storage';
import {Theme} from 'styles/theme/interface';
import {useTheme} from 'styles/theme/themeContext';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {typographyFonts, fontSizes, defaultShadowProps} from 'styles/variables';
import * as submarine from 'submarine';
import {createReportTemplate, isInPromotion} from 'tools';
import * as constants from 'tools/constants';
import {convertSatoshi} from 'tools/currencyConvert';
import * as icloud from 'tools/icloud';
import {convertStringNumber} from 'tools/locale';
import {LOG} from 'tools/logging';
import {qrResolver} from 'tools/qrresolver';
import * as txhistory from 'txhistory';
import {Channel} from 'types';
import Satoshi from 'types/Satoshi';

// eslint-disable-next-line no-shadow
enum AlertIndex {
  None = 0,

  // Alert list
  ListBackup = 1,
  ListRefund = 2,
  ListExistPending = 7,
  ListPassphrase = 8,
  ListRefundPending = 9,

  // non Alert list
  LndStopped = 4,
  SubmarineSwap = 5,
  NotEnoughBalance = 6,
  LspNotConnect = 11,
  CapacityMax = 13,
  GeneralError = 14,
  InformOtf = 15,
  Rebalance = 16,
  PromotionCritical = 17,
  PromotionError = 18,
  ListManualBackup = 19,
}

// eslint-disable-next-line no-shadow
enum PromotionList {
  FreeChannel = 'FreeChannelPromotion',
}

// eslint-disable-next-line no-shadow
enum SelfRebalanceIndex {
  None = 0,
  Stage1 = 1,
  Stage2 = 2,
}

// // コメントアウトを解除し、HomeScreen の行をコメントアウトするとプロファイルが出力される
// // https://reactjs.org/docs/profiler.html
// export const HomeScreen = () => {
//   const onRenderCallback = (id: any, phase: any, actualDuration: any, baseDuration: any, startTime: any, commitTime: any, interactions: any) => {
//     console.log(
//       `id: ${id}, phase: ${phase}, actualDuration: ${actualDuration}, baseDuration: ${baseDuration}, startTime: ${startTime}, commitTime: ${commitTime}, interaction: ${interactions}`,
//     );
//   };

//   return (
//     <Profiler id="Navigation" onRender={onRenderCallback}>
//       <HomeScreenMain />
//     </Profiler>
//   );
// };
// const HomeScreenMain = () => {

/**
 * Return home screen
 * @returns {JSX.Element} Home Screen
 */
export const HomeScreen = () => {
  const {t} = useTranslation();
  const navigation = useNavigation<StackNavigationProp<ParamList>>();
  const {status} = useLND();
  const [store] = useStore();
  const {notify, show} = useBottomSheet();
  const {theme} = useTheme();
  const styles = useThemeAwareObject(createStyles);

  const [invoiceAmount, setInvoiceAmount] = useState<Satoshi | null>(null);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lspConnect, setLspConnect] = useState(false);
  const [apiStatus, setApiStatus] = useState(false);
  const [promotionApiConnect, setPromotionApiConnect] = useState(false);
  const [promotionReport, setPromotionReport] = useState(''); // for error mail report
  const [promotionError, setPromotionError] = useState('');
  const [canForward, setCanForward] = useState(false);
  const [receiveModal, setReceiveModal] = useState(false);
  const [receiveSelectModal, setReceiveSelectModal] = useState(false);
  const [sendReady, setSendReady] = useState(false);
  const [sendAmount, setSendAmount] = useState<Satoshi>(Satoshi.fromSat(0));
  const [isManualAmount, setIsManualAmount] = useState<boolean>(false);
  const [manualAmountModal, setManualAmountModal] = useState(false);
  const [alertNotify, setAlertNotify] = useState(false);
  const [lastBalance, setLastBalance] = useState(0);
  const [balanceChanged, setBalanceChanged] = useState(false);
  const [swapRefund, setSwapRefund] = useState(0);
  const [updateInfo, setUpdateInfo] = useState(false);
  const [closingRefund, setClosingRefund] = useState(0);
  const [pendingRefund, setPendingRefund] = useState(0);
  const [retryFlag, setRetryFlag] = useState(false);
  const [infoNotification, setInfoNotification] = useState(false);
  const [receiveMaxAmount, setReceiveMaxAmount] = useState(0);
  const [receiveMaxAlert, setReceiveMaxAlert] = useState(0);
  const [hubMinFee, setHubMinFee] = useState(0);
  const [showBalance, setShowBalance] = useState(false);
  const [wholeDescription, setWholeDescription] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [prepareRebalance, setPrepareRebalance] = useState<SelfRebalanceIndex>(SelfRebalanceIndex.None);
  const [reportTargetPromotion, setReportTargetPromotion] = useState('');
  const [eligibleForFreeChannel, setEligibleForFreeChannel] = useState(false);
  const [promotionClaimed, setPromotionClaimed] = useState(false);

  /**
   * Loading during data acquisition
   */
  const [isTxHistoryLoading, setIsTxHistoryLoading] = useState(false);
  /**
   * Transactions data
   */
  const [transactions, setTransactions] = useState([] as txhistory.LnDb[]);

  // alert flags
  const [alertCount, setAlertCount] = useState(0);
  const [alertListVisible, setAlertListVisible] = useState(false);

  const [notBackuped, setNotBackuped] = useState(false);
  const [enableRefund, setEnableRefund] = useState(false);
  const [existPending, setExistPending] = useState(false);
  const [alertIndex, setAlertIndex] = useState<AlertIndex>(AlertIndex.None);

  useFocusEffect(
    useCallback(() => {
      const subscription = AppState.addEventListener('change', nextAppState => {
        // NOTE: When the app back from the background, nextAppState will be "active": https://reactnative.dev/docs/appstate
        if (nextAppState === 'background' || nextAppState === 'inactive') {
          setReceiveModal(false);
          setReceiveSelectModal(false);
          setSendReady(false);
          setManualAmountModal(false);
          setAlertListVisible(false);
          setAlertIndex(AlertIndex.None);
          setAnimating(false);
          setPromotionClaimed(false);
        }
      });
      return () => {
        subscription.remove();
      };
    }, []),
  );

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      setReceiveModal(false);
      setReceiveSelectModal(false);
      setSendReady(false);
      setManualAmountModal(false);
      setAlertListVisible(false);
      setAlertIndex(AlertIndex.None);
      setAnimating(false);
      setPromotionClaimed(false);
    });

    return unsubscribe;
  }, [navigation]);

  const cancelProp: AlertButtonProps = {
    text: t('cancel'),
    style: 'cancel',
    onPress: () => {
      setAlertIndex(AlertIndex.None);
    },
  };

  const notBackupedButton: AlertButtonProps[] = [
    cancelProp,
    {
      text: t('yes'),
      style: 'submit',
      onPress: () => {
        setAlertIndex(AlertIndex.None);
        navigation.navigate('DetailSettings', {checking: false});
      },
    },
  ];

  const enableRefundButton: AlertButtonProps[] = [
    cancelProp,
    {
      text: t('yes'),
      style: 'submit',
      onPress: () => {
        setAlertIndex(AlertIndex.None);
        navigation.navigate('Refund', {address: ''});
      },
    },
  ];

  const stopAlertButton: AlertButtonProps[] = [
    cancelProp,
    {
      text: t('home:restart'),
      style: 'attention',
      onPress: () => {
        setAlertIndex(AlertIndex.None);
        navigation.reset({
          index: 0,
          routes: [{name: 'Shutdown', params: {option: 'RESTART', rescan: false}}],
        });
      },
    },
  ];

  const swapAlertButton: AlertButtonProps[] = [
    cancelProp,
    {
      text: t('next'),
      style: 'submit',
      onPress: async () => {
        setAlertIndex(AlertIndex.None);
        try {
          const scriptAddr = await submarine.createBtcAddress();
          const feePercent = await lccontrol.feePercent();
          const minFee = await lccontrol.paymentFeeMin();
          navigation.navigate('SwapReceive', {
            address: scriptAddr,
            feePercent: feePercent,
            minFee: minFee,
          });
        } catch (e: any) {
          setError(`${t(e.message)}`);
          setAlertIndex(AlertIndex.GeneralError);
        }
      },
    },
  ];

  const maxStruckAlertButton: AlertButtonProps[] = [
    cancelProp,
    {
      text: t('next'),
      style: 'submit',
      onPress: () => {
        setAlertIndex(AlertIndex.None);
        setSendAmount(Satoshi.fromMilliSat(params.decoded.num_msat));
        setSendReady(true);
      },
    },
  ];

  const notConfirmedPassphraseAlertButton: AlertButtonProps[] = [
    cancelProp,
    {
      text: t('next'),
      style: 'submit',
      onPress: () => {
        setAlertIndex(AlertIndex.None);
        navigation.navigate('ConfirmPassphrase');
      },
    },
  ];

  useEffect(() => {
    switch (prepareRebalance) {
      case SelfRebalanceIndex.Stage1:
        setPrepareRebalance(SelfRebalanceIndex.Stage2);
        setAlertIndex(AlertIndex.None);
        break;
      case SelfRebalanceIndex.Stage2:
        setPrepareRebalance(SelfRebalanceIndex.None);
        (async () => {
          try {
            LOG.debug('selfRebalance');
            await lccontrol.selfRebalance();
          } catch (e: any) {
            LOG.error(`fail rebalance:\n${JSON.stringify(e)}`);
          }
          setAnimating(false);
          navigation.navigate('QrScanner');
        })();
        break;
    }
  }, [navigation, prepareRebalance]);

  const confirmRebalanceButton: AlertButtonProps[] = [
    {
      text: t('no'),
      style: 'cancel',
      onPress: () => {
        setAlertIndex(AlertIndex.None);
        navigation.navigate('QrScanner');
      },
    },
    {
      text: t('yes'),
      style: 'submit',
      onPress: () => {
        setAlertIndex(AlertIndex.None);
        setAnimating(true);
        setPrepareRebalance(SelfRebalanceIndex.Stage1);
      },
    },
  ];

  const promotionCriticalButton: AlertButtonProps[] = [
    {
      text: t('close'),
      style: 'cancel',
      onPress: () => {
        clearClosing();
      },
    },
    {
      text: t('toSupportMail'),
      style: 'submit',
      onPress: () => {
        const errorMsg = createPromotionReport(promotionReport);
        clearClosing();
        Linking.openURL(errorMsg);
      },
    },
  ];

  const promotionErrorButton: AlertButtonProps[] = [
    {
      text: t('toSupportMail'),
      style: 'cancel',
      onPress: () => {
        const errorMsg = createPromotionReport(promotionReport);
        clearClosing();
        Linking.openURL(errorMsg);
      },
    },
    {
      text: t('close'),
      style: 'submit',
      onPress: () => {
        clearClosing();
      },
    },
  ];

  const createPromotionReport = (msg: string): string => {
    const reportTemplate = createReportTemplate(reportTargetPromotion);
    const remain = t('supportMailRemainMsg');
    let bodyMessage;
    if (status?.nodeId) {
      bodyMessage = `${remain}\r\n\r\nNode ID:\r\n${status.nodeId}\r\n\r\nError:\r\n${msg}`;
    } else {
      bodyMessage = `${remain}\r\n\r\n${msg}}`;
    }
    return `${reportTemplate}&body=${encodeURIComponent(bodyMessage)}`;
  };

  const clearClosing = () => {
    setAlertIndex(AlertIndex.None);
    setError('');
  };

  const informAndSelectReceive = () => {
    setAlertIndex(AlertIndex.None);
    setReceiveSelectModal(true);
  };

  type SendRouteProps = RouteProp<ParamList, 'Root'>;
  const {params} = useRoute<SendRouteProps>();

  const toggleReceiveModal = () => {
    toggleReceiveSelectModal();
    setReceiveModal(!receiveModal);
    setError('');
    setCanForward(false);
  };

  const toggleReceiveSelectModal = () => {
    setReceiveSelectModal(!receiveSelectModal);
  };

  const openReceiveSelectModal = () => {
    if (lspConnect && (status?.channels?.length === 0 || receiveMaxAmount === 0)) {
      setAlertIndex(AlertIndex.InformOtf);
      return;
    }
    setReceiveSelectModal(true);
  };

  const removeReceiveModal = () => {
    setReceiveModal(false);
    setInvoiceAmount(null);
    setCanForward(false);
    setDescription('');
    setError('');
  };

  const removeSendModal = () => {
    setSendReady(false);
    setWholeDescription(false);
  };

  const removeManualAmountModal = () => {
    setError('');
    setCanForward(false);
    setManualAmountModal(false);
  };

  const removeUpdateInfoModal = () => {
    checkDoneAppVersion();
    setUpdateInfo(false);
  };

  const removeReceivedInfoModal = () => {
    setInfoNotification(false);
  };

  const removeClaimed = () => {
    setPromotionClaimed(false);
  };

  const goToSend = () => {
    const actChan = status?.channels?.reduce((prev, ch) => (ch.status === 'active' ? prev + 1 : prev), 0);
    if (status?.channels && actChan && actChan > 1) {
      let sendable = true;
      for (const ch of status.channels) {
        if (ch.sendableBandwidth && ch.sendableBandwidth.toNumber() !== ch.localBalance.toNumber()) {
          LOG.error(`goToSend: localBalance(${ch.localBalance}) != sendableBandwidth(${ch.sendableBandwidth})`);
          sendable = false;
          break;
        } else if (!ch.sendableBandwidth) {
          LOG.trace('goToSend: no sendableBandwidth');
        }
      }
      if (sendable) {
        setAlertIndex(AlertIndex.Rebalance);
        return;
      }
    }
    navigation.navigate('QrScanner');
  };

  const goToSetting = () => {
    navigation.push('Settings', {checking: false});
  };

  const goToLapps = () => {
    removeClaimed();
    navigation.navigate('Lapps');
  };

  const connectPing = async () => {
    const res = await lccontrol.ping();
    setLspConnect(res);
  };

  useEffect(() => {
    (async () => {
      await connectPing();
    })();
    const intervalId = setInterval(async () => {
      await connectPing();
    }, constants.lspSignalInterval);
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const update = async () => {
      try {
        const received = await getNotificationInfo(store.debugging);
        setApiStatus(true);
        if (received.info.notification && received.info.index > store.notifyConfirmed) {
          setInfoNotification(true);
        }
      } catch (e: any) {
        setApiStatus(false);
        LOG.error(`Home API server: ${e.toString()}`);
      }
    };
    (async () => {
      await update();
    })();
    const intervalId = setInterval(async () => {
      await update();
    }, constants.updateNotificationInterval);
    return () => {
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSendReady(false);
    txHistoryFetch();
    // Android ONLY: messageNotification() is for putting a statement in the Android notification bar
    if (Platform.OS === 'android') {
      AppState.addEventListener('blur', () => {
        notification.iconNormal();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    switch (alertIndex) {
      case AlertIndex.ListBackup:
      case AlertIndex.ListManualBackup:
      case AlertIndex.ListRefund:
      case AlertIndex.ListExistPending:
      case AlertIndex.ListPassphrase:
      case AlertIndex.ListRefundPending:
        setAlertListVisible(false);
        break;
    }
  }, [alertIndex]);

  const countAlert = useCallback(() => {
    setAlertNotify(false);
    let counter = 0;
    if (notBackuped) {
      // バックアップされていない
      if (constants.backupEnableAuto) {
        // 自動バックアップ対応バージョン
        counter++;
      } else if (constants.backupEnableManual) {
        // 自動バックアップ未対応バージョン(手動のみ)
        counter++;
      }
    }
    if (enableRefund) {
      counter++;
    }
    if (existPending) {
      counter++;
    }
    if (!store.passConfirmed) {
      counter++;
    }
    if (pendingRefund > 0) {
      counter++;
    }
    setAlertCount(counter);
    if (counter > 0) {
      setAlertNotify(true);
    }
  }, [enableRefund, existPending, notBackuped, pendingRefund, store.passConfirmed]);

  useFocusEffect(() => {
    countAlert();
  });

  useEffect(() => {
    countAlert();
  }, [countAlert, status]);

  // turn off Modal that is displayed first when displaying various alerts since both AlertTheme and ModalTheme (<Modal />) cannot be displayed
  const appearAlertDetail = (index: AlertIndex) => {
    setAlertListVisible(false);
    setAlertIndex(index);
  };

  const alertList = () => {
    return (
      <ModalTheme
        visible={alertListVisible}
        closing={() => setAlertListVisible(false)}
        title={t('attention')}
        children={
          <ScrollView>
            <Text style={styles.alertCount}>{t('home:alertCount', {count: alertCount})}</Text>
            {constants.backupEnableAuto && notBackuped && (
              <Pressable onPress={() => appearAlertDetail(AlertIndex.ListBackup)} style={styles.alertRow}>
                <MIcon name="cloud-off" size={24} style={styles.icon} />
                <Text style={styles.alertText} numberOfLines={2} ellipsizeMode={'tail'}>
                  {t('home:alertChannelBackupTitle')}
                </Text>
                <MIcon name="chevron-right" size={24} style={styles.icon} />
              </Pressable>
            )}
            {!constants.backupEnableAuto && constants.backupEnableManual && notBackuped && (
              <Pressable onPress={() => appearAlertDetail(AlertIndex.ListManualBackup)} style={styles.alertRow}>
                <MIcon name="save-alt" size={24} style={styles.icon} />
                <Text style={styles.alertText} numberOfLines={2} ellipsizeMode={'tail'}>
                  {t('home:alertChannelManualBackupTitle')}
                </Text>
                <MIcon name="chevron-right" size={24} style={styles.icon} />
              </Pressable>
            )}
            {enableRefund && (
              <Pressable onPress={() => appearAlertDetail(AlertIndex.ListRefund)} style={styles.alertRow}>
                <MIcon name="account-balance-wallet" size={24} style={styles.icon} />
                <Text style={styles.alertText} numberOfLines={2} ellipsizeMode={'tail'}>
                  {t('home:refundTitle')}
                </Text>
                <MIcon name="chevron-right" size={24} style={styles.icon} />
              </Pressable>
            )}
            {existPending && (
              <Pressable onPress={() => appearAlertDetail(AlertIndex.ListExistPending)} style={styles.alertRow}>
                <MIcon name="notification-important" size={24} style={styles.icon} />
                <Text style={styles.alertText} numberOfLines={2} ellipsizeMode={'tail'}>
                  {t('home:existPending')}
                </Text>
                <MIcon name="chevron-right" size={24} style={styles.icon} />
              </Pressable>
            )}
            {!store.passConfirmed && (
              <Pressable onPress={() => appearAlertDetail(AlertIndex.ListPassphrase)} style={styles.alertRow}>
                <MIcon name="vpn-key" size={24} style={styles.icon} />
                <Text style={styles.alertText} numberOfLines={2} ellipsizeMode={'tail'}>
                  {t('home:notConfirmedPassphraseTitle')}
                </Text>
                <MIcon name="chevron-right" size={24} style={styles.icon} />
              </Pressable>
            )}
            {pendingRefund > 0 && (
              <Pressable onPress={() => appearAlertDetail(AlertIndex.ListRefundPending)} style={styles.alertRow}>
                <MIcon name="notification-important" size={24} style={styles.icon} />
                <Text style={styles.alertText} numberOfLines={2} ellipsizeMode={'tail'}>
                  {t('home:existPendingRefund')}
                </Text>
                <MIcon name="chevron-right" size={24} style={styles.icon} />
              </Pressable>
            )}
          </ScrollView>
        }
      />
    );
  };

  useEffect(() => {
    const closedCount = async (): Promise<boolean | undefined> => {
      try {
        const res = await closedChannelsLength();
        return res > 0;
      } catch (e: any) {
        LOG.error(`Home - closedChannels: ${e.toString()}`);
      }
    };

    const isEligibleForFreeChannel = async (): Promise<boolean> => {
      const closedExist = await closedCount();
      if (status?.channels?.length == null || closedExist == null) return false;
      return status.channels.length === 0 && !closedExist;
    };

    (async () => {
      if (status?.channels?.length == null) {
        LOG.trace('setPromotionApiConnect check: null');
        return;
      }
      try {
        setEligibleForFreeChannel((await isInPromotion(PromotionList.FreeChannel)) && (await isEligibleForFreeChannel()));
        setPromotionApiConnect(true);
      } catch (e: any) {
        LOG.error('Home - setPromotionApiConnect check error: ' + e.message);
        setEligibleForFreeChannel(false);
        setPromotionApiConnect(false);
      }
    })();
  }, [status?.channels]);

  useEffect(() => {
    (async () => {
      setSwapRefund(await submarine.repaymentAmount(status?.blockHeight ?? 0));
    })();
  }, [status]);

  useEffect(() => {
    //the flag of not Backuped
    (async () => {
      if (constants.backupEnableGDrive) {
        // Google backup support version: show alert if setting is disabled.
        setNotBackuped(!store.googleBackup);
      } else if (constants.backupEnableIcloud) {
        // iCloud backup support version: show alert if setting is disabled or iCloud is disabled.
        setNotBackuped(!store.icloudBackup || !(await icloud.isICloudAvailable()));
      } else {
        // Manual backup support version: show alert if not backup data exists.
        if (constants.backupEnableManual) {
          const needed = await getNeedManualBackup();
          setNotBackuped(needed);
        }
      }
    })();

    // the flag of enable Refund
    if (status) {
      const pendingChannels = status.channels?.filter(channel => channel.status !== 'active' && channel.status !== 'inactive') ?? [];
      if (pendingChannels.length > 0) {
        let pendingAmount = 0;
        for (let i = 0; i < pendingChannels.length; i++) {
          pendingAmount += pendingChannels[i].localBalance.toNumber();
        }
        setClosingRefund(pendingAmount);
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
      if (status.balance?.offChain?.local) {
        const balance = status.balance.offChain.local.toNumber();
        setBalanceChanged(balance !== lastBalance);
        setLastBalance(balance);
      }

      //  the flag of existing pending refund amount
      (async () => {
        if (status.blockHeight) {
          const amount = await submarine.nonRepaymentAmount(status.blockHeight);
          setPendingRefund(amount);
        }
      })();
    }
  }, [lastBalance, status, store, swapRefund]);

  useEffect(() => {
    (async () => {
      const [prev, current] = await getAppVersion();
      if (prev.length > 0 && prev !== current) {
        setUpdateInfo(true);
      } else {
        LOG.trace('same app version');
      }
      try {
        setHubMinFee(await lccontrol.paymentFeeMin());
      } catch (e: any) {
        LOG.error(e.toString());
        return;
      }
    })();
  }, []);

  const okSheet = () => {
    notify({animation: true});
  };

  const ngSheet = (message: string) => {
    show({
      title: t('send:failure'),
      message: t('send:errorWithMsg', {message: message}),
      buttons: [
        {
          text: t('close'),
          style: 'cancel',
        },
      ],
    });
  };

  const sendResponseResolver = (resStatus: number, failure: number, handlerError: string) => {
    let message: string;
    switch (resStatus) {
      case payment.statusSucceeded:
        okSheet();
        navigation.reset({
          index: 0,
          routes: [{name: 'Root' as never}],
        });
        break;
      case payment.statusFailed:
        switch (failure) {
          case payment.failureTimeout:
            message = t('send:errTimeout');
            break;
          case payment.failureNoRoute:
            message = t('send:errNoRoute');
            break;
          case payment.failureIncorrectPaymentDetails:
            message = t('send:errIncorrectPaymentDetails');
            break;
          case payment.failureInsufficientBalance:
            message = t('send:errInSufficientBalance');
            break;
          default:
            message = `t('errUnknown'): ${failure}`;
            break;
        }
        ngSheet(message);
        break;
      case payment.statusError:
        if (handlerError.indexOf('invoice is already paid') !== -1) {
          handlerError = t('send:errAlreadyPayed');
        }
        ngSheet(handlerError);
        break;
      default:
        break;
    }
  };

  payment.addLnSentHandler('home', (invoice, value, paymentHash, stat, failure, handlerError) => {
    if (stat === payment.statusFailed && failure === payment.failureNoRoute) {
      setRetryFlag(true);
    } else {
      setLoading(false);
      setSendReady(false);
      sendResponseResolver(stat, failure, handlerError);
    }
  });

  payment.addLnRouteSentHandler('home', (paymentHash, stat, failure, handlerError) => {
    setLoading(false);
    setSendReady(false);
    sendResponseResolver(stat, failure, handlerError);
  });

  addLnRecievedHandler('home', _ => {
    notify({animation: true});
  });

  useEffect(() => {
    if (balanceChanged) {
      setBalanceChanged(false);
      txHistoryFetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balanceChanged]);

  const txHistoryFetch = useCallback(async () => {
    if (isTxHistoryLoading) return;
    setIsTxHistoryLoading(true);
    try {
      const result = await txhistory.getHistoryLnList(constants.txHistoryLimit + 1);
      if (result.length > constants.txHistoryLimit) {
        result.push(txhistory.emptyLnDb);
      }
      setTransactions(result);
    } catch (err: any) {
      LOG.error(err.toString());
    }
    setIsTxHistoryLoading(false);
  }, [isTxHistoryLoading]);

  useEffect(() => {
    if (retryFlag) {
      txHistoryFetch();
      LOG.debug('Payment - Retry with hub routing');
      LOG.debug(params.invoice);
      setRetryFlag(false);
      if (!lspConnect) {
        return setAlertIndex(AlertIndex.LspNotConnect);
      }
      const fee = Satoshi.max(sendAmount.mul(store.maxFeeRate / 100), Satoshi.fromSat(constants.lnMinFeeSats));
      payment.payLnHubRoutingAsync(params.invoice, fee, sendAmount, isManualAmount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryFlag]);

  useEffect(() => {
    if (status && status.started && status.shutdownRequested) {
      navigation.reset({
        index: 0,
        routes: [{name: 'Shutdown', params: {option: 'NONE', rescan: false}}],
      });
    } else if (status && !status.started) {
      setAlertIndex(AlertIndex.LndStopped);
    }
  }, [navigation, status]);

  useEffect(() => {
    (async () => {
      const max = await lccontrol.receiveMax();
      setReceiveMaxAmount(max);
    })();
  }, [status, receiveSelectModal]);

  /**
   * Return render content
   * @returns {JSX.Element} RenderContent
   */
  const renderContent = () => {
    return (
      <Pressable
        style={styles.amountCard}
        onLongPress={() => setShowBalance(!showBalance)}
        onPressOut={() => setShowBalance(false)}
        delayLongPress={100}>
        <View style={styles.signalContainer}>
          <View style={styles.lspSignal}>
            <MIcon name={'circle'} size={16} color={lspConnect ? theme.color.transparent : theme.color.tertiary} />
          </View>
          {store.debugging && (
            <>
              <View style={styles.apiSignal}>
                <MIcon name={'circle'} size={16} color={apiStatus ? theme.color.transparent : theme.color.primaryAccent} />
              </View>
              <View style={styles.promotionSignal}>
                <MIcon name={'circle'} size={16} color={promotionApiConnect ? theme.color.transparent : theme.color.senary} />
              </View>
            </>
          )}
        </View>
        <View style={[styles.amountCardBox]}>
          {showBalance ? (
            <View style={styles.eachBalanceArea}>
              <View style={styles.eachDirectionContainer}>
                <Text style={styles.eachDirection}>{t('home:maxSendAmount')}</Text>
                <EachBalance value={status?.balance?.offChain.local} />
              </View>
              <View style={styles.eachDirectionContainer}>
                <Text style={styles.eachDirection}>{t('home:maxReceiveAmount')}</Text>
                <EachBalance value={Satoshi.fromSat(receiveMaxAmount)} />
              </View>
            </View>
          ) : (
            <View style={styles.totalBalanceArea}>
              <TotalBalance value={status?.balance?.offChain.local} />
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  const renderBottom = () => {
    return (
      <View style={styles.navigationArea}>
        <View style={styles.bottomContainer}>
          <Button style={styles.navigationButton} onPress={goToSend} outline>
            <View style={styles.wrapper}>
              <Image style={styles.navigationImage} source={theme.id === 'light' ? sendIcon : sendIconDark} resizeMode="contain" />
              <Text style={styles.label}>{t('home:sendNavigationLabel')}</Text>
            </View>
          </Button>
        </View>
        <View style={styles.bottomContainer}>
          <Button style={styles.navigationButton} onPress={openReceiveSelectModal} outline>
            <View style={styles.wrapper}>
              <Image style={styles.navigationImage} source={theme.id === 'light' ? receiveIcon : receiveIconDark} resizeMode="contain" />
              <Text style={styles.label}>{t('home:receiveNavigationLabel')}</Text>
            </View>
          </Button>
        </View>
      </View>
    );
  };

  const headerLeft: HeaderButtonProps = {
    isAlter: true,
    pressed: goToSetting,
    iconName: 'menu',
    buttonStyle: {paddingLeft: 12},
  };

  const alertButton: HeaderButtonProps = {
    isAlter: true,
    pressed: () => setAlertListVisible(true),
    iconName: 'warning',
    buttonStyle: {paddingRight: 12},
    color: theme.color.tertiary,
  };

  useEffect(() => {
    if (invoiceAmount || description || sendAmount) {
      setCanForward(true);
    } else {
      setCanForward(false);
    }
  }, [invoiceAmount, description, sendAmount]);

  useEffect(() => {
    if (!params) return;
    if (params.decoded) {
      if (params.decoded.num_msat === '0') {
        setSendAmount(Satoshi.fromSat(0));
        setManualAmountModal(true);
        return;
      }
      if (params.maxStruck) {
        setAlertIndex(AlertIndex.NotEnoughBalance);
        return;
      }
      setSendAmount(Satoshi.fromMilliSat(params.decoded.num_msat));
      setIsManualAmount(false);
      setSendReady(true);
    } else if (params.errorReason === 'UNKNOWN_PATH') {
      // FIXME NC-781: We should show alert UI but the alert index set here will be overridden by clean up process.
      LOG.error('Failed to handle intent path at generateRouteState()');
    } else {
      (async () => {
        try {
          const res = await qrResolver(params.invoice);
          if (res.type !== 'lninvoice') {
            LOG.error(`intent error: not lninvoice ${JSON.stringify(res)}`);
            setError(`${t('home:failedToProcessIntent')}`);
            setAlertIndex(AlertIndex.GeneralError);
            return;
          }
          navigation.setParams({decoded: res.decoded});
        } catch (e: any) {
          LOG.error(`intent error: ${e.message}, invoice=${params.invoice}`);
          setError(`${t('home:failedToProcessIntent')}`);
          setAlertIndex(AlertIndex.GeneralError);
        }
      })();
    }
  }, [params, navigation, t]);

  const totalCapacity = (channels: Channel[] | undefined): number => {
    let cap = 0;
    if (channels) {
      cap = channels.reduce((prev, ch) => (ch.status === 'active' ? prev + ch.capacity.toNumber() : prev), 0);
    }
    return cap;
  };

  const receiveNormal = async (amount: Satoshi): Promise<boolean> => {
    const expiry = constants.receiveInvoiceExpiry;
    let payment_request = '';
    try {
      payment_request = await addInvoice(amount, description, expiry);
    } catch (e: any) {
      setError(t('errorRetry'));
      return false;
    }
    setReceiveModal(false);
    navigation.navigate('ReceiveDetail', {
      invoice: payment_request,
      amount: amount.toString(),
      description: description,
      expiresIn: (Math.floor(Date.now() / 1000) + expiry).toString(),
    });
    return true;
  };

  const receiveCheckOnTheFly = async (amount: Satoshi): Promise<boolean> => {
    if (totalCapacity(status?.channels) > constants.maxCapacitySat) {
      setReceiveModal(false);
      setAlertIndex(AlertIndex.CapacityMax);
      return false;
    }
    if (!lspConnect) {
      setReceiveModal(false);
      setAlertIndex(AlertIndex.LspNotConnect);
      return false;
    }
    const amountNum = amount.toNumber();
    let hubFee;
    try {
      hubFee = await lccontrol.paymentFee(amountNum);
    } catch (e) {
      setError(t('viaLsp:registError'));
      return false;
    }

    const balance = status?.balance;
    if (!balance) {
      setReceiveModal(false);
      setAlertIndex(AlertIndex.LndStopped);
      return false;
    }

    const capacityBalanceDiff = Satoshi.fromSat(constants.maxCapacitySat).sub(balance.offChain.local);

    // NOTE: We define the OTF cap as the same as the cap of submarine swap.
    // Users can request OTF in the range where the user balance does not exceed the channel capacity cap.
    const otfCap = capacityBalanceDiff.toNumber() > hubFee ? capacityBalanceDiff.toNumber() : 0;

    if (amountNum > otfCap) {
      const convertedCryptoCap =
        store.crypto === 'sat' ? convertStringNumber(otfCap, store.digitDecimalRule) : Satoshi.fromSat(otfCap).toBTC().toString();
      const convertedFiatCap = await convertSatoshi(Satoshi.fromSat(otfCap), store.fiat)
        .then(fiat => new BigNumber(fiat).toFormat(2))
        .catch(err => {
          if (err instanceof Error) {
            LOG.error(`receiveCheckOnTheFly: failed to convert to fiat: ${err.message}`);
            return '';
          }
          LOG.error(`receiveCheckOnTheFly: failed to convert to fiat: ${String(err)}`);
          return '';
        });

      setError(
        t('home:excessOtfCap', {
          crypto: convertedCryptoCap + ' ' + t(`currencyUnit:${store.crypto}`),
          fiat: convertedFiatCap + ' ' + t(`currencyUnit:${store.fiat}`),
        }),
      );
      return false;
    }
    if (!hubFee || amountNum <= hubFee) {
      setError(t('viaLsp:insufficientOtfFee', {otfFee: hubFee}));
      return false;
    }

    return true;
  };

  const receiveOnTheFly = async (amount: Satoshi): Promise<boolean> => {
    try {
      const regist = await lccontrol.paymentRegister(amount.toNumber(), description);
      const proportionalFeeRate = await lccontrol.feePercent();
      const minFee = await lccontrol.paymentFeeMin();
      if (!regist) {
        setError(t('viaLsp:registError'));
        return false;
      }
      LOG.debug(regist);
      const decoded = await payment.decodePayReq(regist);
      LOG.trace(decoded);
      submarine.onTheFlyRegister(decoded.payment_hash);
      setReceiveModal(false);
      navigation.navigate('OtfReceive', {
        invoice: regist,
        amount: amount.toString(),
        expiresIn: decoded.expiryTime.toString(),
        description: description,
        proportionalFeeRate: proportionalFeeRate,
        minFee: minFee,
      });
    } catch (e) {
      setError(t('viaLsp:registError'));
      return false;
    }

    return true;
  };

  const receive = async (): Promise<void> => {
    if (description.length > 30) {
      // ECMAScript's length counting is not reliable
      return setError(t('receive:descriptionTooLong'));
    }
    if (!invoiceAmount) {
      setError(t('errorRetry'));
      return;
    }
    if (invoiceAmount.toMsat().comparedTo(1000, 10) === -1) {
      // 1sats以上
      setError(t('invalidAmount'));
      return;
    }
    try {
      setReceiveMaxAlert(receiveMaxAmount); // for alert
    } catch (e) {
      setError(t('home:infoError'));
      return;
    }
    // Check if OTF is required
    let result: boolean;
    setLoading(true);
    if (invoiceAmount.toNumber() > receiveMaxAmount) {
      result = await receiveCheckOnTheFly(invoiceAmount);
      if (result) {
        result = await receiveOnTheFly(invoiceAmount);
      }
    } else {
      result = await receiveNormal(invoiceAmount);
    }
    setLoading(false);
    if (result) {
      setError('');
      setInvoiceAmount(null);
      setDescription('');
    }
  };

  const deposit = () => {
    toggleReceiveSelectModal();
    if (!lspConnect) {
      setAlertIndex(AlertIndex.LspNotConnect);
      return;
    }
    try {
      setReceiveMaxAlert(receiveMaxAmount); // for alert
    } catch (e) {
      setError(t('home:infoError'));
      return;
    }
    if (totalCapacity(status?.channels) > constants.maxCapacitySat) {
      setAlertIndex(AlertIndex.CapacityMax);
      return;
    }
    setError('');
    setAlertIndex(AlertIndex.SubmarineSwap);
  };

  const applyManualAmount = () => {
    if (!sendAmount) {
      setError(t('errorRetry'));
      return;
    }
    if (sendAmount.toMsat().comparedTo(1000, 10) === -1) {
      // 1sats以上
      setError(t('invalidAmount'));
      return;
    }
    setIsManualAmount(true);
    removeManualAmountModal();
    setSendReady(true);
  };

  const SendModal = ({invoice, decoded}: SendLightningParams) => {
    // maxFee is at least 1 satoshi
    const maxFee = Satoshi.max(sendAmount.mul(store.maxFeeRate / 100), Satoshi.fromSat(constants.lnMinFeeSats));

    const paymentStart = async () => {
      if (!status?.channels) {
        show({
          title: t('send:failure'),
          message: t('send:notExistChannel'),
          buttons: [
            {
              text: t('close'),
              style: 'cancel',
            },
          ],
        });
        return;
      }
      if (!payment.confirmMinimumReserve(status.channels)) {
        show({
          title: t('send:failure'),
          message: t('send:notEnoughReserve'),
          buttons: [
            {
              text: t('close'),
              style: 'cancel',
            },
          ],
        });
        return;
      }
      setLoading(true);
      try {
        await payment.payLnAsync(invoice, maxFee, sendAmount, isManualAmount);
      } catch (e: any) {
        setLoading(false);
        setSendReady(false);
        show({
          title: t('send:failure'),
          message: t('send:errorWithMsg', {message: JSON.stringify(e)}),
          buttons: [
            {
              text: t('close'),
              style: 'cancel',
            },
          ],
        });
      }
    };

    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.sendReadyTitleContainer}>
          {!wholeDescription ? (
            <Pressable onPress={() => setWholeDescription(!wholeDescription)}>
              <Text
                style={[styles.sendReadyTitle, !params.decoded.description && {color: theme.color.textColorTranslucent}]}
                numberOfLines={3}
                ellipsizeMode={'tail'}>
                {params.decoded.description ? params.decoded.description : t('noDescription')}
              </Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => setWholeDescription(!wholeDescription)}>
              <Text style={[styles.sendReadyTitle, !params.decoded.description && {color: theme.color.textColorTranslucent}]}>
                {params.decoded.description ? params.decoded.description : t('noDescription')}
              </Text>
            </Pressable>
          )}
        </View>
        <View style={styles.inputContainer}>
          <View>
            <Crypto value={sendAmount} />
            <Fiat value={sendAmount} />
          </View>
          <View style={styles.divider} />
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>{t('send:maxFee')}</Text>
            <View style={styles.feeContainer}>
              <CryptoInTable value={maxFee} />
              <Text style={styles.feeBracket}>(</Text>
              <FiatInTable value={maxFee} />
              <Text style={styles.feeBracket}>)</Text>
            </View>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>{t('send:expiresIn')}</Text>
            <DateTime style={styles.itemValue} timestamp={decoded.expiryTime.toString()} />
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>{t('send:sendTo')}</Text>
            <Text style={styles.itemValue}>{decoded.destination}</Text>
          </View>
        </View>
        <Button onPress={paymentStart} loading={loading} loadingIconSize={25.1}>
          <Text style={styles.sendBtnLabel}>{t('send:sendPayment')}</Text>
        </Button>
      </ScrollView>
    );
  };

  const ScrollList = () => {
    return (
      <Animated.ScrollView refreshControl={<RefreshControl refreshing={isTxHistoryLoading} onRefresh={txHistoryFetch} />}>
        <View>
          {transactions.map(tx => {
            return <TxItem item={tx} key={tx.payment_hash} />;
          })}
        </View>
      </Animated.ScrollView>
    );
  };

  const freeChannelPromotionClaim = async () => {
    setAnimating(true);
    try {
      const checkResult = await lccontrol.integrityAppCheck();
      if (checkResult) {
        LOG.info('Home: integrityAppCheck: OK');
        await lccontrol.requestOpenChannel().then(() => {
          setAnimating(false);
          setPromotionClaimed(true);
        });
      } else {
        LOG.error('Home: integrityAppCheck: NG');
        throw new lccontrol.LcControlError(
          'verify NG',
          'integrityAppCheck',
          lccontrol.ErrCode.IntegrityVerify,
          'LSP verify result NG. Check lspd.log',
        );
      }
    } catch (e: any) {
      setAnimating(false);
      // Google Integrity API Check Error
      if (e instanceof lccontrol.IntegrityError) {
        LOG.debug(`Campaign - IntegrityError: ${e.code}`);
        setPromotionReport(e.toString());
        setReportTargetPromotion(PromotionList.FreeChannel);
        setPromotionError(`\n(ERROR: I-${e.integrityCode})`); // Integrity error
        switch (e.code) {
          case lccontrol.IntegrityError.ErrRetry:
            setError(t('integrity:retryError'));
            setAlertIndex(AlertIndex.PromotionError);
            break;
          case lccontrol.IntegrityError.ErrNetwork:
            setError(t('integrity:networkError'));
            setAlertIndex(AlertIndex.PromotionError);
            break;
          case lccontrol.IntegrityError.ErrGooglePlay:
          case lccontrol.IntegrityError.ErrOther:
            setError(t('promotion:errorReport', {sendmail: t('toSupportMail')}));
            setAlertIndex(AlertIndex.PromotionCritical);
            break;
        }
      } else {
        if (!(e instanceof lccontrol.LcControlError)) {
          LOG.error(`Home: freeChannelPromotionClaim: something bad: ${e}`);
          e.code = lccontrol.ErrCode.Error;
        }
        LOG.debug(`Campaign - LspError: ${e.message}`);
        setPromotionReport(e.toString());
        setReportTargetPromotion(PromotionList.FreeChannel);
        setPromotionError(`\n(ERROR: L-${e.code})`); // LSP error
        setError(t('promotion:errorReport', {sendmail: t('toSupportMail')}));
        setAlertIndex(AlertIndex.PromotionCritical);
      }
    }
  };

  const PromotionCard = () => {
    return (
      <Animated.ScrollView>
        <View style={styles.promotionBox}>
          <View style={styles.promotionTitle}>
            <MCIcon name="gift" size={fontSizes.basic4} color={theme.color.textColor} />
            <Text style={styles.promotionText}>{t('promotion:freeChannel_title')}</Text>
          </View>
          <View>
            <Text style={styles.giftModalText}>{t('promotion:freeChannel_greeting1')}</Text>
            <Text style={styles.giftModalText}>{t('promotion:freeChannel_greeting2')}</Text>
            <Text style={styles.giftModalText}>{t('promotion:freeChannel_greeting3')}</Text>
            <Button onPress={freeChannelPromotionClaim} style={{marginVertical: 16}}>
              <View>
                <Text style={styles.applyButtonText}>{t('promotion:freeChannel_apply')}</Text>
              </View>
            </Button>
            <Pressable
              onPress={() => {
                store.lang === 'ja'
                  ? Linking.openURL(constants.freeChannelPromotionDetailJa)
                  : Linking.openURL(constants.freeChannelPromotionDetailEn);
              }}
              style={{marginVertical: 8, alignItems: 'flex-end'}}>
              <View style={{alignItems: 'center', flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.color.textColor}}>
                <Text style={styles.promotionDetailLink}>{t('home:detailTitle')}</Text>
                <MIcon name="open-in-new" size={fontSizes.basic5} color={theme.color.textColor} />
              </View>
            </Pressable>
          </View>
        </View>
      </Animated.ScrollView>
    );
  };

  return (
    <Page
      noBottom
      headerLeft={headerLeft}
      headerRight={alertNotify ? alertButton : undefined}
      bottom={renderBottom()}
      hideBackButton
      noBackgroundColor
      headerStyle={styles.headerStyle}>
      {alertList()}
      <View style={styles.pageContentContainer}>
        <View style={styles.content}>{renderContent()}</View>
        <View style={styles.txHistory}>{eligibleForFreeChannel ? PromotionCard() : ScrollList()}</View>
        <ModalTheme
          visible={receiveSelectModal}
          closing={toggleReceiveSelectModal}
          title={t('receive:selectMethod')}
          children={
            <>
              <Text style={styles.modalDescription}>{t('home:selectReceiveChain')}</Text>
              <Button style={styles.selectionBtn} onPress={toggleReceiveModal}>
                <View style={styles.wrapper}>
                  <MCIcon name="lightning-bolt" size={fontSizes.basic4} color={theme.color.selectButtonTextColor} />
                  <Text style={styles.selectionLabel}>{t('home:viaLightning')}</Text>
                </View>
              </Button>
              <Button style={styles.selectionOutlineBtn} onPress={deposit}>
                <View style={styles.wrapper}>
                  <MCIcon name="bitcoin" size={fontSizes.basic4} color={theme.color.textColor} />
                  <Text style={styles.selectionLabelOutline}>{t('home:viaBtcAddr')}</Text>
                </View>
              </Button>
            </>
          }
        />
        <ModalTheme
          visible={receiveModal}
          closing={removeReceiveModal}
          title={t('receive:createInvoice')}
          children={
            <>
              <View style={styles.inputContainer}>
                <TextInputForm satInput onChange={setInvoiceAmount} placeholder={t('amount')} keyboardType={'numeric'} autoFocus />
                <TextInputForm
                  placeholder={t('receive:descriptionOptional')}
                  onChange={setDescription}
                  value={description}
                  error={error}
                  style={styles.input}
                />
              </View>
              <Button disabled={!canForward} outline style={styles.nextBtn} onPress={receive} loading={loading} loadingIconSize={25.1}>
                <Text style={[styles.nextBtnLabel, canForward && {color: theme.color.textColor}]}>{t('next')}</Text>
              </Button>
            </>
          }
        />
        <ModalTheme
          visible={sendReady}
          closing={removeSendModal}
          children={
            <SendModal
              invoice={params ? params.invoice : ''}
              decoded={
                params
                  ? params.decoded
                  : {
                      destination: '',
                      payment_hash: '',
                      num_satoshis: '',
                      timestamp: '',
                      expiry: '',
                      expiryTime: 0,
                      description: '',
                      description_hash: '',
                      fallback_addr: '',
                      cltv_expiry: '',
                      route_hints: [],
                      payment_addr: '',
                      num_msat: '',
                      features: '',
                      expired: false,
                    }
              }
              maxStruck={params ? params.maxStruck : false}
            />
          }
        />
        <ModalTheme visible={manualAmountModal} closing={removeManualAmountModal}>
          <View style={styles.noAmountContainer}>
            <Text style={styles.noAmountText}>{t('send:noAmountInvoice')}</Text>
            <TextInputForm satInput onChange={setSendAmount} placeholder={t('amount')} keyboardType={'numeric'} error={error} autoFocus />
          </View>
          <Button disabled={!canForward} outline style={styles.nextBtn} onPress={applyManualAmount} loading={loading} loadingIconSize={25.1}>
            <Text style={[styles.nextBtnLabel, canForward && {color: theme.color.textColor}]}>{t('apply')}</Text>
          </Button>
        </ModalTheme>
        <ModalTheme visible={updateInfo} closing={removeUpdateInfoModal} title={t('home:updateTitle')} children={<UpdateInfo />} />
        <ModalTheme visible={infoNotification} closing={removeReceivedInfoModal} title={t('notification')} children={<ReceiveInfo />} />
        <ModalTheme
          visible={promotionClaimed}
          closing={removeClaimed}
          children={
            <>
              <View>
                {Platform.OS === 'android' && (
                  <>
                    <Image source={lappsTutorial} style={styles.imageInModal} />
                    <Text style={styles.giftModalText}>{t('lapps:ready1')}</Text>
                    <Text style={styles.giftModalText}>{t('lapps:ready2')}</Text>
                    <Text style={styles.giftModalText}>{t('lapps:ready3')}</Text>
                    <Button onPress={goToLapps} style={{marginVertical: 16}}>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Text style={styles.applyButtonText}>{t('lapps:goToLapps')}</Text>
                        <MIcon name="sports-esports" size={24} style={{marginLeft: 4}} color={theme.color.buttonTextColor} />
                      </View>
                    </Button>
                  </>
                )}
                {Platform.OS === 'ios' && (
                  <>
                    <Text style={styles.readyModalText}>{t('lapps:ready1')}</Text>
                    <Button onPress={removeClaimed} style={{marginVertical: 16}}>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Text style={styles.applyButtonText}>{t('back')}</Text>
                      </View>
                    </Button>
                  </>
                )}
              </View>
            </>
          }
        />
        <Modal visible={animating} animationType="fade" hardwareAccelerated={true} transparent={true}>
          <View style={styles.modalBackground}>
            <ActivityIndicator size="large" color="white" />
          </View>
        </Modal>
      </View>
      <Alert
        isAlertVisible={alertIndex === AlertIndex.ListBackup}
        title={t('home:alertChannelBackupTitle')}
        message={t('home:alertChannelBackupMsg')}
        button={notBackupedButton}
      />
      <Alert
        isAlertVisible={alertIndex === AlertIndex.ListManualBackup}
        title={t('home:alertChannelManualBackupTitle')}
        message={t('home:alertChannelManualBackupMsg')}
        button={notBackupedButton}
      />
      <Alert
        isAlertVisible={alertIndex === AlertIndex.ListRefund}
        title={t('home:refundTitle')}
        message={t('home:refundMsg')}
        button={enableRefundButton}
      />
      <Alert isAlertVisible={alertIndex === AlertIndex.LndStopped} title={t('attention')} message={t('home:lndStopped')} button={stopAlertButton} />
      <Alert
        isAlertVisible={alertIndex === AlertIndex.SubmarineSwap}
        title={t('attention')}
        message={t('home:alertSwapMsg')}
        button={swapAlertButton}
      />
      <Alert
        isAlertVisible={alertIndex === AlertIndex.NotEnoughBalance}
        title={t('attention')}
        message={t('send:notEnoughLocalAmount')}
        button={maxStruckAlertButton}
      />
      <Alert
        isAlertVisible={alertIndex === AlertIndex.ListExistPending}
        title={t('attention')}
        message={closingRefund > 0 ? t('home:existPendingAlert', {amount: closingRefund}) : t('home:existPendingAlert0sat')}
        closing={() => setAlertIndex(AlertIndex.None)}
      />
      <Alert
        isAlertVisible={alertIndex === AlertIndex.ListPassphrase}
        title={t('backuppassphrase:confirm')}
        message={t('home:notConfirmedPassphraseMsg')}
        button={notConfirmedPassphraseAlertButton}
      />
      <Alert
        isAlertVisible={alertIndex === AlertIndex.ListRefundPending}
        title={t('attention')}
        message={pendingRefund > 0 ? t('home:existPendingRefundAlert', {amount: pendingRefund}) : t('home:existPendingRefundAlert0sat')}
        closing={() => setAlertIndex(AlertIndex.None)}
      />
      <Alert
        isAlertVisible={alertIndex === AlertIndex.LspNotConnect}
        title={t('attention')}
        message={t('home:notConnectedHub')}
        closing={() => setAlertIndex(AlertIndex.None)}
      />
      <Alert
        isAlertVisible={alertIndex === AlertIndex.CapacityMax}
        title={t('attention')}
        message={t('home:capacityReachLimit', {
          amount: convertStringNumber(constants.maxCapacitySat, store.digitDecimalRule),
          receive: convertStringNumber(receiveMaxAlert, store.digitDecimalRule),
        })}
        closing={() => setAlertIndex(AlertIndex.None)}
      />
      <Alert isAlertVisible={alertIndex === AlertIndex.GeneralError} title={t('error')} message={error} closing={clearClosing} />
      <Alert
        isAlertVisible={alertIndex === AlertIndex.InformOtf}
        title={t('help')}
        message={t('viaLsp:informOtf', {otfFee: hubMinFee})}
        closing={informAndSelectReceive}
      />
      <Alert
        isAlertVisible={alertIndex === AlertIndex.Rebalance}
        title={t('attention')}
        message={t('home:needRebalance')}
        button={confirmRebalanceButton}
      />
      <Alert
        isAlertVisible={alertIndex === AlertIndex.PromotionCritical}
        title={t('error')}
        message={`${error}${promotionError}`}
        button={promotionCriticalButton}
      />
      <Alert
        isAlertVisible={alertIndex === AlertIndex.PromotionError}
        title={t('error')}
        message={`${error}${promotionError}`}
        button={promotionErrorButton}
      />
    </Page>
  );
};

/**
 * Maximum width of content
 */
const contentWidth = 341;
export const navigationButtonHeight = contentWidth * 0.2;

/**
 * card height
 * card aspect ratio: 1.55
 */
const cardHeight = contentWidth / 2.55;

const buttonTopMargin = 8;
const bottomButtonMarginBottom = 28;

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    content: {
      width: '100%',
    },
    headerStyle: {
      marginLeft: 16,
    },
    headerLeft: {
      color: theme.color.quinary,
    },
    modalBackground: {
      backgroundColor: theme.color.modalBackground,
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignContent: 'center',
    },
    // total balance section
    amountCard: {
      height: cardHeight,
      backgroundColor: theme.color.amountCard,
      borderRadius: 8,
      position: 'relative',
      borderColor: theme.color.buttonBorderColor,
      borderWidth: 0.75,
    },
    amountCardBox: {
      justifyContent: 'center',
      alignItems: 'center',
      height: cardHeight,
      paddingHorizontal: 16,
    },
    totalBalanceArea: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
    },
    eachBalanceArea: {
      flexDirection: 'column',
    },
    eachDirectionContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    eachDirection: {
      fontFamily: typographyFonts.notoSansBold,
      color: theme.color.textColor,
      fontSize: fontSizes.balanceLabel,
      marginRight: 16,
    },
    signalContainer: {
      flexDirection: 'row',
    },
    lspSignal: {
      marginRight: 'auto',
      position: 'absolute',
      left: 16,
      top: 16,
    },
    apiSignal: {
      marginRight: 'auto',
      position: 'absolute',
      left: 42,
      top: 16,
    },
    promotionSignal: {
      marginRight: 'auto',
      position: 'absolute',
      left: 68,
      top: 16,
    },
    // navigationArea
    navigationArea: {
      width: '50%',
      marginLeft: 'auto',
      marginBottom: bottomButtonMarginBottom,
      marginHorizontal: 16,
    },
    bottomContainer: {
      marginTop: buttonTopMargin,
    },
    navigationButton: {
      height: navigationButtonHeight,
      borderRadius: 45,
      backgroundColor: theme.color.quaternary,
      ...defaultShadowProps,
    },
    navigationImage: {
      width: 40,
      height: 40,
    },
    wrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    //transaction history
    pageContentContainer: {
      flex: 1,
    },
    txHistory: {
      flexShrink: 1,
      marginVertical: 16,
      width: '100%',
    },
    label: {
      fontFamily: typographyFonts.notoSansBold,
      color: theme.color.textColor,
      fontSize: fontSizes.label,
      letterSpacing: 5,
    },
    // restart
    restartText: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic5,
      color: theme.color.textColor,
      textAlign: 'center',
      marginBottom: 10,
    },
    restartButtonText: {
      fontFamily: typographyFonts.notoSans,
      width: '100%',
      textAlign: 'center',
      fontSize: fontSizes.basic5,
      color: theme.color.tertiary,
      textAlignVertical: 'center',
    },
    inputContainer: {
      marginBottom: 24,
    },
    input: {
      marginBottom: 12,
    },
    nextBtn: {
      alignSelf: 'flex-end',
    },
    nextBtnLabel: {
      fontFamily: typographyFonts.notoSans,
      textAlign: 'center',
      fontSize: fontSizes.buttonLabel,
      letterSpacing: 4,
      color: theme.color.disabled,
    },
    modalDescription: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.buttonLabel,
      color: theme.color.textColor,
      marginBottom: 8,
    },
    selectionBtn: {
      marginVertical: 12,
      borderRadius: 10,
      backgroundColor: theme.color.selectButtonColor,
      height: 50,
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
    // send modal
    tableRow: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
    },
    tableLabel: {
      width: '35%',
      fontFamily: typographyFonts.notoSansBold,
      color: theme.color.textColor,
    },
    itemValue: {
      flex: 1,
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic5,
      color: theme.color.textColor,
    },
    divider: {
      alignSelf: 'center',
      height: 1.5,
      width: '50%',
      backgroundColor: theme.color.textColor,
      marginVertical: 12,
    },
    feeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    feeBracket: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic5,
      color: theme.color.textColor,
      marginRight: 5,
    },
    sendBtnLabel: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.buttonLabel,
      color: theme.color.buttonTextColor,
      letterSpacing: 4,
    },
    noAmountContainer: {
      marginBottom: 8,
    },
    noAmountText: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic5,
      color: theme.color.textColor,
      marginVertical: 16,
    },
    // alert
    alertCount: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic5,
      color: theme.color.textColor,
      marginBottom: 16,
    },
    icon: {
      width: '10%',
      color: theme.color.textColor,
    },
    alertRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      marginTop: 6,
      marginBottom: 12,
    },
    alertText: {
      width: '80%',
      paddingHorizontal: 8,
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic5,
      color: theme.color.textColor,
    },
    sendReadyTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomColor: theme.color.accentSecondary,
      borderBottomWidth: 2,
      marginTop: 6,
      marginBottom: 12,
      paddingBottom: 8,
    },
    sendReadyTitle: {
      fontFamily: typographyFonts.notoSansBold,
      color: theme.color.textColor,
      fontSize: fontSizes.basic5,
      marginTop: 6,
      paddingRight: 8,
    },
    // for promotion(Free Open Channel)
    promotionBox: {
      backgroundColor: theme.color.modal,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.color.primary,
      paddingHorizontal: 32,
      padding: 16,
    },
    promotionTitle: {
      flexDirection: 'row',
      marginBottom: 16,
    },
    promotionText: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic5,
      color: theme.color.textColor,
      marginLeft: 2,
      letterSpacing: 2,
    },
    promotionDetailLink: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic6,
      color: theme.color.textColor,
    },
    giftModalText: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic6,
      color: theme.color.textColor,
    },
    readyModalText: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic5,
      color: theme.color.textColor,
    },
    imageInModal: {
      width: 200,
      height: 200,
      marginBottom: 32,
      resizeMode: 'contain',
      alignSelf: 'center',
    },
    applyButtonText: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.buttonLabel,
      color: theme.color.buttonTextColor,
      marginLeft: 8,
    },
  });
  return styles;
};
