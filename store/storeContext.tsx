import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {useContext, createContext, ReactNode, useReducer, Dispatch} from 'react';

import {DigitRule, Explorer} from 'types';
import {Crypto, Fiat} from 'types/currency';

export function useStore() {
  return useContext(StoreContext);
}

type StoreProviderProps = {
  children: ReactNode;
  initialState?: State;
};

export const defaultState: State = {
  peers: [],
  passphraseBackedUp: false,
  walletRecovering: false,
  fiat: 'usd',
  crypto: 'sat',
  showInFiat: false,
  lang: 'en',
  maxFeeRate: 10,
  digitDecimalRule: 'default',
  explorer: 'blockstream',
  googleAccount: '',
  googleBackup: false,
  wtclient: false,
  pin: '',
  lock: false,
  biometrics: false,
  rescanWallet: false,
  debugging: false,
  passConfirmed: false,
  notifyConfirmed: 0,
  screenshotPrevent: true,
  icloudBackup: false,
};

const StoreContext = createContext<[State, Dispatch<Action>]>([
  // initial value is required property but never used.
  defaultState,
  /* eslint @typescript-eslint/no-empty-function: 0*/
  () => {},
]);

export function StoreProvider({children, initialState = defaultState}: StoreProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return <StoreContext.Provider value={[state, dispatch]}>{children}</StoreContext.Provider>;
}

type Action =
  | {type: 'setPeers'; peers: string[]}
  | {type: 'passphraseBackedUp'}
  | {type: 'initState'; state: State}
  | {type: 'setWalletRecovering'; walletRecovering: boolean}
  | {type: 'setCurrency'; fiat: Fiat; crypto: Crypto}
  | {type: 'toggleFiatDisplay'}
  | {type: 'setLang'; lang: string}
  | {type: 'setMaxFeeRate'; maxFeeRate: number}
  | {type: 'setDigitDecimal'; digitDecimalRule: DigitRule}
  | {type: 'setExplorer'; explorer: Explorer}
  | {type: 'setGoogleAccount'; googleAccount: string}
  | {type: 'enableGoogleBackup'; googleBackup: boolean}
  | {type: 'enableWtClient'; wtclient: boolean}
  | {type: 'setPin'; pin: string}
  | {type: 'enableLock'; lock: boolean}
  | {type: 'toggleBiometrics'; biometrics: boolean}
  | {type: 'setRescanWallet'; rescanWallet: boolean}
  | {type: 'setDebugging'; debugging: boolean}
  | {type: 'setPassConfirmed'; passConfirmed: boolean}
  | {type: 'setNotifyConfirmed'; notifyConfirmed: number}
  | {type: 'setScreenshotPrevent'; screenshotPrevent: boolean}
  | {type: 'enableIcloudBackup'; icloudBackup: boolean};

/**
 * Store state type
 * See {@link https://reactnative.dev/docs/security#async-storage} for what State can contain or should not.
 */
type State = {
  /**
   * neutrino peers
   * @defaultValue []
   */
  peers: string[];
  /**
   * whether passphrase is backed up or not.
   * @defaultValue false
   */
  passphraseBackedUp: boolean;
  /**
   * whether wallet is recovering or not
   * @defaultValue false
   */
  walletRecovering: boolean;
  /**
   * fiat currency
   * @defaultValue 'USD'
   */
  fiat: Fiat;
  /**
   * crypto currency
   * @defaultValue 'BTC'
   */
  crypto: Crypto;
  /**
   * whether showing amount in fiat or crypto
   * @defaultValue false
   */
  showInFiat: boolean;
  /**
   * display language
   * @defaultValue device location
   */
  lang: string;
  /**
   * LN send max fee rate percent
   * @defaultValue 0.1
   */
  maxFeeRate: number;
  /**
   * digit/decimal identifier
   * @defaultValue ,
   */
  digitDecimalRule: DigitRule;
  /**
   * selected blockchain explorer
   * @defaultValue ,
   */
  explorer: Explorer;
  /**
   * enable googleBackup
   * @defaultValue false
   */
  googleAccount: string;
  googleBackup: boolean;
  /**
   * enable wtclient(lnd.conf)
   * @defaultValue false
   */
  wtclient: boolean;
  /**
   * memorized pin code
   * @defaultValue
   */
  pin: string;
  /**
   * enable lock before Check
   * @defaultValue
   */
  lock: boolean;
  /**
   * toggle biometrics authentication
   * @defaultValue
   */
  biometrics: boolean;
  /**
   * enable rescanWallet(lnd.conf)
   * @defaultValue false
   */
  rescanWallet: boolean;
  /**
   * enable debug menu
   * @defaultValue false
   */
  debugging: boolean;
  /**
   * whether success confirmation of passphrase
   * @defaultValue false
   */
  passConfirmed: boolean;
  /**
   * confirmed index of notification
   * @defaultValue
   */
  notifyConfirmed: number;
  /**
   * enable or not screenshot
   * @defaultValue
   */
  screenshotPrevent: boolean;
  /**
   * enable iCloud Backup
   * @defaultValue false
   */
  icloudBackup: boolean;
};

let cachedLang: string;
export function getCachedLang(): string {
  return cachedLang;
}
const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'initState':
      state = action.state;
      state.rescanWallet = false;
      break;
    case 'setPeers':
      state.peers = action.peers;
      break;
    case 'setWalletRecovering':
      state.walletRecovering = action.walletRecovering;
      break;
    case 'passphraseBackedUp':
      state.passphraseBackedUp = true;
      break;
    case 'setCurrency':
      state.fiat = action.fiat;
      state.crypto = action.crypto;
      break;
    case 'toggleFiatDisplay':
      state.showInFiat = !state.showInFiat;
      break;
    case 'setLang':
      state.lang = action.lang;
      cachedLang = action.lang;
      break;
    case 'setMaxFeeRate':
      state.maxFeeRate = action.maxFeeRate;
      break;
    case 'setDigitDecimal':
      state.digitDecimalRule = action.digitDecimalRule;
      break;
    case 'setExplorer':
      state.explorer = action.explorer;
      break;
    case 'setGoogleAccount':
      state.googleAccount = action.googleAccount;
      break;
    case 'enableGoogleBackup':
      state.googleBackup = action.googleBackup;
      break;
    case 'enableWtClient':
      state.wtclient = action.wtclient;
      break;
    case 'setPin':
      state.pin = action.pin;
      break;
    case 'enableLock':
      state.lock = action.lock;
      break;
    case 'toggleBiometrics':
      state.biometrics = action.biometrics;
      break;
    case 'setRescanWallet':
      state.rescanWallet = action.rescanWallet;
      break;
    case 'setDebugging':
      state.debugging = action.debugging;
      break;
    case 'setPassConfirmed':
      state.passConfirmed = action.passConfirmed;
      break;
    case 'setNotifyConfirmed':
      state.notifyConfirmed = action.notifyConfirmed;
      break;
    case 'setScreenshotPrevent':
      state.screenshotPrevent = action.screenshotPrevent;
      break;
    case 'enableIcloudBackup':
      state.icloudBackup = action.icloudBackup;
      break;
    default:
      break;
  }
  const storageObj: State = {...state};
  AsyncStorage.setItem('state', JSON.stringify(storageObj));
  return {...state};
};

export async function getInitialState(forceInitial?: boolean): Promise<State> {
  const storageJson = await AsyncStorage.getItem('state');
  if (storageJson && !forceInitial) {
    const storageObj = JSON.parse(storageJson);
    cachedLang = storageObj.lang || defaultState.lang;
    return {
      peers: storageObj.peers || defaultState.peers,
      passphraseBackedUp: storageObj.passphraseBackedUp || defaultState.passphraseBackedUp,
      walletRecovering: storageObj.walletRecovering || defaultState.walletRecovering,
      fiat: storageObj.fiat || defaultState.fiat,
      crypto: storageObj.crypto || defaultState.crypto,
      showInFiat: storageObj.showInFiat || defaultState.showInFiat,
      lang: cachedLang,
      maxFeeRate: storageObj.maxFeeRate || defaultState.maxFeeRate,
      digitDecimalRule: storageObj.digitDecimalRule || defaultState.digitDecimalRule,
      explorer: storageObj.explorer || defaultState.explorer,
      googleAccount: storageObj.googleAccount || defaultState.googleAccount,
      googleBackup: storageObj.googleBackup || defaultState.googleBackup,
      wtclient: storageObj.wtclient || defaultState.wtclient,
      pin: storageObj.pin || defaultState.pin,
      lock: storageObj.lock || defaultState.lock,
      biometrics: storageObj.biometrics || defaultState.biometrics,
      rescanWallet: storageObj.rescanWallet || defaultState.rescanWallet,
      debugging: storageObj.debugging || defaultState.debugging,
      passConfirmed: storageObj.passConfirmed || defaultState.passConfirmed,
      notifyConfirmed: storageObj.notifyConfirmed || defaultState.notifyConfirmed,
      screenshotPrevent: storageObj.screenshotPrevent || defaultState.screenshotPrevent,
      icloudBackup: storageObj.icloudBackup || defaultState.icloudBackup,
    };
  } else {
    return {...defaultState};
  }
}
