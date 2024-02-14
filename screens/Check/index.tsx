import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {Mutex} from 'await-semaphore';
import {BigNumber} from 'bignumber.js';
import React, {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Platform, SafeAreaView, StyleSheet, Text, View} from 'react-native';
import {AnimatedCircularProgress} from 'react-native-circular-progress';
import MIcon from 'react-native-vector-icons/MaterialIcons';

import * as closechecker from 'bridge/closechecker';
import * as lccontrol from 'bridge/lccontrol';
import * as manager from 'bridge/manager';
import * as payment from 'bridge/payment';
import * as received from 'bridge/received';
import * as request from 'bridge/request';
import * as wallet from 'bridge/wallet';
import {ProgressList} from 'components/projects/ProgressList';
import {Button} from 'components/uiParts/ButtonTheme';
import {useLaunchTakingTooMuchTime} from 'hooks/useLaunchTakingTooMuchTime';
import {useLND} from 'hooks/useLND';
import {generateRouteState} from 'navigation/AppNavigator';
import {ParamList} from 'navigation/paramList';
import {useStore} from 'store';
import {setRestarted} from 'store/storage';
import {Theme} from 'styles/theme/interface';
import {useTheme} from 'styles/theme/themeContext';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {fontSizes, typographyFonts} from 'styles/variables';
import * as submarine from 'submarine';
import * as backup from 'tools/backup';
import {getBlockHeight} from 'tools/btctools';
import * as constants from 'tools/constants';
import {LOG} from 'tools/logging';

// Check画面が recovery 動作をしている間に unlock として画面遷移されることがあった。
// それにより recovery が失敗するため setUp() を mutex で囲む。
const mutex = new Mutex();

type RootParamList = {
  Value: {value: string; path: string};
};
type ScreenRouteProp = RouteProp<RootParamList, 'Value'>;

export const CheckScreen = () => {
  const route = useRoute<ScreenRouteProp>();
  const {status} = useLND();
  const {t} = useTranslation();
  const navigation = useNavigation<StackNavigationProp<ParamList>>();
  const [store, dispatch] = useStore();
  const [recoverProgress, setRecoverProgress] = useState(0);
  const [recoverFlag, setRecoverFlag] = useState(false);
  const [tipHeight, setTipHeight] = useState(0);
  const [done, setDone] = useState(false);
  const {theme} = useTheme();
  const styles = useThemeAwareObject(createStyles);

  const syncProgress = tipHeight > 0 ? Math.floor(((status?.blockHeight || 0) / tipHeight) * 100) : 0;
  const percent = status?.syncedToChain ? 100 : syncProgress >= 99 ? 99 : syncProgress;
  const recProgress = Math.floor((recoverProgress || 0) * 100);

  type itemProp = {
    label: string;
    status: 'success' | 'error' | 'loading';
  }[];
  const checkItems: itemProp = [
    {status: status?.loading ? 'loading' : 'success', label: t('check:checkingStatus')},
    {status: status?.started ? 'success' : 'loading', label: t('check:startingLnd')},
    {status: status?.walletUnlockerReady ? 'success' : 'loading', label: t('check:startingWallet')},
    {status: status?.ready ? 'success' : 'loading', label: t('check:unlocking')},
    {
      status: status?.syncedToChain ? 'success' : 'loading',
      label: `${t('check:syncing')} ${status && status.blockHeight ? '(' + new BigNumber(status?.blockHeight).toFormat() + ')' : ''}`,
    },
  ];
  if (store.walletRecovering) {
    checkItems.push({
      status: recoverFlag ? 'success' : 'loading',
      label: `${t('check:recovering')} ${recProgress ? '(' + recProgress + '%)' : ''}`,
    });
  }

  useLaunchTakingTooMuchTime();

  const goToSetting = () => {
    navigation.navigate('Settings', {checking: true});
  };

  let timerId: ReturnType<typeof setTimeout> | null = null;
  const scheduleRefresh = () => {
    timerId !== null && clearTimeout(timerId);
    timerId = setTimeout(async () => {
      let info: any;
      try {
        info = await wallet.recoveryProgress();
        setRecoverProgress(info.progress);
      } catch (e) {
        // RPC is not ready
      }
      if (!info || (info.recovery_mode && !info.recovery_finished)) {
        scheduleRefresh();
      }
    }, 1000);
  };

  const setUp = async () => {
    try {
      let lnActive = false;

      // walletが存在しない場合のルート
      //   新規作成(route.params.value === 'create')
      //   復元(route.params.value === 'recovery')
      //      WAITING_TO_START => NON_EXISTING => (create/recovery) => UNLOCKED => RPC_ACTIVE => SERVER_ACTIVE
      // walletが存在する場合のルート(route.params.value === 'unlock')
      //    WAITING_TO_START => LOCKED => (unlock) => UNLOCKED => RPC_ACTIVE => SERVER_ACTIVE
      LOG.info(`check: setUp: route: ${route.params.value}, recovering: ${store.walletRecovering}`);
      if (route.params.value === 'unlock') {
        // 通常は LOCKED になってから unlock要求する
        LOG.info('check: setUp: unlock');
        lnActive = await manager.lnWaitLocked();
        if (!lnActive) {
          // recovery中に再起動した場合、walletがあるためこのルートを通る。
          // しかし recovery_window を指定しないと balanceが戻らないため store.walletRecovering を伝える。
          await wallet.unlockWallet(store.walletRecovering);
        }
      }
      if (!lnActive) {
        LOG.info('check: setUp: !lnActive');
        await manager.lnWaitActive();
      }

      // recovery first
      if (route.params.value === 'recovery' || store.walletRecovering) {
        LOG.info('check: setUp: recovery');
        try {
          // recovery経由であれがGoogle Signinは既に行われている
          // recovery中の再起動であればSigninされていない
          if (constants.backupEnableGDrive) {
            await backup.recoverAllFromGdrive(route.params.value !== 'recovery');
          }
          if (constants.backupEnableIcloud) {
            await backup.recoverAllFromIcloud();
          }
          LOG.info('recovery: done');
        } catch (e) {
          LOG.error(`recovery: fail(${JSON.stringify(e)})`);
        }
      }

      LOG.info('check: setUp: subscribe&startup');
      request.startWatchLnInvoices();
      received.addLnReceivedListener();
      payment.addLnSentListener();
      payment.addLnRouteSentListener();
      backup.startup();
      closechecker.startup();

      // lsp
      LOG.info('check: setUp: lsp');
      try {
        await lccontrol.ping();
      } catch (e) {
        LOG.error(`fail LSP connect: ${JSON.stringify(e)}`);
      }
      LOG.info('check: setUp: connectHub');
      try {
        await lccontrol.connectHub();
      } catch (e) {
        LOG.error(`fail HUB connect: ${JSON.stringify(e)}`);
      }
      await setRestarted(false);
      LOG.info('check: setUp: done');
    } catch (e: any) {
      LOG.warn(`check: setUp: ERR waiting: ${e.message}`);
      manager.emitEventCompleted('check.setUp', e.message);
    }

    try {
      const info = await manager.getInfo();
      await submarine.startup(info.block_height);
    } catch (e) {
      LOG.error(`fail submarine.startup: ${JSON.stringify(e)}`);
    }
  };

  // useEffect

  useEffect(() => {
    let isUnmounted = false;
    (async () => {
      let height = await getBlockHeight();
      if (height === 0) {
        // 取得できなかった場合はGenesis Blockからの経過時間を1 block/10分に換算して推測する
        // Genesis Blockの時刻はmainnetのものを使っている
        //  mainnet: 1231006505
        //  testnet: 1296688602
        //  signet : 1598918400 (global)
        const secSinceGenesis = Math.floor(Date.now() / 1000) - 1231006505;
        const estimateHeight = secSinceGenesis / 10 / 60;
        height = estimateHeight;
      }
      if (isUnmounted) return;
      setTipHeight(height);
      scheduleRefresh();
      const release = await mutex.acquire();
      await setUp();
      release();
      setDone(true);
    })();
    return () => {
      isUnmounted = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!done) {
      // not forusing Check screen or syncing block not done
      return;
    }
    if (store.walletRecovering) {
      dispatch({
        type: 'setWalletRecovering',
        walletRecovering: false,
      });
    }

    const routeState = generateRouteState(route.params.path);

    LOG.trace('Go to next screen');
    return navigation.reset(routeState);
  }, [navigation, done, store.walletRecovering, dispatch, route.params.path]);

  useEffect(() => {
    recProgress === 100 && setRecoverFlag(true);
  }, [recProgress]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.settingContainer}>
          <Button style={styles.settingButton} rounded onPress={goToSetting}>
            <MIcon name={'settings'} size={30} color={theme.color.textColor} />
          </Button>
        </View>
        <View style={styles.statusContainer}>
          <View style={styles.syncingCardInner}>
            <AnimatedCircularProgress
              size={240}
              width={15}
              backgroundWidth={15}
              fill={syncProgress}
              tintColor={theme.color.textColor}
              backgroundColor={theme.color.textColorTranslucent}
              rotation={0}
              lineCap={'round'}
              duration={300}
              padding={10}>
              {() => <Text style={styles.percent}>{percent} %</Text>}
            </AnimatedCircularProgress>
          </View>

          <View style={styles.progressListWrapper}>
            <View style={styles.progressList}>
              <ProgressList items={checkItems} />
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.color.black,
    },
    container: {
      height: '100%',
      paddingHorizontal: 16,
      backgroundColor: theme.color.background,
    },
    statusContainer: {
      marginVertical: Platform.OS === 'android' ? 48 : 12,
      justifyContent: 'center',
    },
    settingContainer: {
      alignItems: 'flex-end',
      marginVertical: 16,
    },
    settingButton: {
      backgroundColor: theme.color.transparent,
    },
    syncingCardInner: {
      alignItems: 'center',
      marginBottom: 16,
    },
    percent: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic3,
      color: theme.color.textColor,
    },
    waitText: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic5,
      color: theme.color.textColor,
      marginTop: 16,
      paddingHorizontal: 20,
    },
    progressListWrapper: {
      alignItems: 'center',
    },
    progressList: {
      // NOTE: Match the width of syncingCardInner
      maxWidth: 336,
    },
  });
  return styles;
};
