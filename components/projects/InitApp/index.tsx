import React, {useContext, createContext, useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import SpInAppUpdates from 'sp-react-native-in-app-updates';

import LndReactController from 'bridge/LndReactController';
import * as manager from 'bridge/manager';
import {setMacaroonWithKeychain} from 'bridge/wallet';
import {Alert, AlertButtonProps} from 'components/projects/AlertTheme';
import {SplashScreen} from 'components/projects/SplashScreen';
import {useStore, getTheme} from 'store';
import {initStorage} from 'store/initStorage';
import {walletExists} from 'store/keychain';
import {getRestarted} from 'store/storage';
import {getInitialState} from 'store/storeContext';
import {DARK_THEME} from 'styles/theme/dark';
import {LIGHT_THEME} from 'styles/theme/light';
import {useTheme} from 'styles/theme/themeContext';
import {linkingOpenStore} from 'tools';
import {waitForSec} from 'tools/async';
import {lndAddr, lndGrpcPort, backupEnableIcloud} from 'tools/constants';
import * as icloud from 'tools/icloud';
import {setLocale} from 'tools/locale';
import {init as logging_init, LOG} from 'tools/logging';

type Props = {
  /**
   * Nesting child elements
   */
  children: React.ReactNode;
};

type InitAppContextValue = {
  /**
   * Whether wallet exists or not
   */
  doesWalletExists: boolean;
};

type LoadingType = 'splash' | 'done' | 'update' | 'error';

const defaultPeers: string[] = [];
const InitAppContext = createContext<InitAppContextValue>({doesWalletExists: false});

/**
 * Return current context value
 * @returns {InitAppContext} current context value
 */
export const useInitApp = () => {
  return useContext(InitAppContext);
};

/**
 * Return the init app
 * @param props
 * @returns {JSX.Element} Init App
 */
export const InitApp = ({children}: Props) => {
  const {t} = useTranslation();
  const [doesWalletExists, setDoesWalletExists] = useState(false);
  const [isLoading, setIsLoading] = useState<LoadingType>('splash');
  const [, dispatch] = useStore();
  const {setTheme} = useTheme();

  const forceUpdateButton: AlertButtonProps[] = [
    {
      text: t('update'),
      style: 'submit',
      onPress: () => {
        linkingOpenStore();
      },
    },
  ];

  async function checkNeedUpdate(): Promise<boolean> {
    try {
      // The boolean in nelow constructor is for debug.
      // Details: https://github.com/SudoPlz/sp-react-native-in-app-updates#typical-debugging-workflow-we-had-success-with
      const inAppUpdates = new SpInAppUpdates(false);
      const result = await inAppUpdates.checkNeedsUpdate();
      if (result.shouldUpdate) {
        LOG.debug('UPDATE DETECTED');
        return true;
      }
      return false;
    } catch (e) {
      // Pass checks in case of unexpected errors
      LOG.debug(e);
      throw new Error('FAILED CHECK UPDATE');
    }
  }

  useEffect(() => {
    const initialization = async () => {
      await logging_init();
      try {
        const checkUpdate = await checkNeedUpdate();
        if (checkUpdate) {
          setIsLoading('update');
          return;
        }
      } catch (e) {
        LOG.debug(e);
      }
      await LndReactController.setup(lndAddr, lndGrpcPort);
      await initStorage();
      const initialState = await getInitialState();
      const rescanWallet = initialState.rescanWallet;
      dispatch({
        type: 'initState',
        state: initialState,
      });
      setLocale(initialState.lang, initialState.digitDecimalRule);
      const current = await getTheme();
      if (current.id === 'light') {
        setTheme(LIGHT_THEME);
      } else if (current.id === 'dark') {
        setTheme(DARK_THEME);
      }
      if (backupEnableIcloud) {
        try {
          await icloud.startup();
        } catch (e: any) {
          LOG.error(`initApp: icloud.startup(): ${e}`);
          setIsLoading('error');
          return;
        }
      }

      if (await walletExists()) {
        await setMacaroonWithKeychain();
        setDoesWalletExists(true);
      }
      try {
        await manager.startSystem([...initialState.peers, ...defaultPeers], initialState.wtclient, rescanWallet);
        // Keep the splash screen visible for a while
        if (!(await getRestarted())) {
          LOG.info('Application Starting.');
          await waitForSec(2.0);
        } else {
          LOG.info('Application Restart.');
        }
        setIsLoading('done');
      } catch (e) {
        if (e instanceof Error) {
          LOG.error(`InitApp: ${e.message}`);
        } else {
          LOG.error(`InitApp: ${String(e)}`);
        }
        setIsLoading('error');
      }
    };
    initialization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  switch (isLoading) {
    case 'splash':
      return <SplashScreen />;
    case 'done':
      return <InitAppContext.Provider value={{doesWalletExists}}>{children}</InitAppContext.Provider>;
    case 'update':
      return <Alert isAlertVisible={true} title={t('attention')} message={t('home:needUpdate')} button={forceUpdateButton} />;
    case 'error':
      return <Alert isAlertVisible={true} title={t('attention')} message={t('errUnknown')} />;
  }
};
