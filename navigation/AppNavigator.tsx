import {NavigationContainer, PartialState, StackNavigationState} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import React from 'react';

import OsTools from 'bridge/osTools';
import {useInitApp} from 'components/projects/InitApp';
import {useLND} from 'hooks/useLND';
import {ParamList} from 'navigation/paramList';
import BackupPassphrase from 'screens/BackupPassphrase';
import ConfirmPassphrase from 'screens/BackupPassphrase/Confirm';
import {Channels} from 'screens/Channels';
import {ChannelDetailScreen} from 'screens/Channels/ChannelDetail';
import {CheckScreen} from 'screens/Check';
import ConnectScreen from 'screens/Connect';
import DisclaimerScreen from 'screens/Disclaimer';
import {HomeScreen} from 'screens/Home';
import {LappsScreen} from 'screens/Lapps';
import {LnurlPayScreen} from 'screens/LnurlPay';
import QrScannerScreen from 'screens/QrScanner';
import {ReceiveDetailScreen} from 'screens/Receive/ReceiveDetail';
import {RestorePassphraseScreen} from 'screens/Restore';
import {RestoreStartScreen} from 'screens/Restore/start';
import {RefundScreen} from 'screens/Send/Refund';
import {SettingsScreen} from 'screens/Settings';
import DebugScreen from 'screens/Settings/Debug';
import {DetailSettingScreen} from 'screens/Settings/Details';
import {SettingDigitScreen} from 'screens/Settings/Details/Digit';
import {SettingExplorerScreen} from 'screens/Settings/Details/Explorer';
import {PinScreen} from 'screens/Settings/Details/Pin';
import {SecureLockSettingScreen} from 'screens/Settings/Details/SecureLock';
import {SettingsLanguageScreen, SettingsLanguageStartScreen} from 'screens/Settings/Language';
import {SettingSwitchThemeScreen} from 'screens/Settings/SwichTheme';
import {SettingsUnitScreen} from 'screens/Settings/Unit';
import {ShutdownScreen} from 'screens/Shutdown';
import StartScreen from 'screens/Start';
import {SupportScreen} from 'screens/Support';
import {SupportOpenSourceScreen} from 'screens/Support/opensource';
import {TransactionListScreen} from 'screens/Transactions';
import {OnchainTransactionListScreen} from 'screens/Transactions/Onchain';
import {TutorialScreen} from 'screens/Tutorial';
import {OtfReceiveScreen} from 'screens/ViaLsp/OtfReceive';
import SwapReceiveScreen from 'screens/ViaLsp/SwapReceive';
import {WithdrawScreen} from 'screens/Withdraw/Withdraw';
import {useStore} from 'store';
import {LOG} from 'tools/logging';

const Stack = createNativeStackNavigator();

export default function () {
  const {status} = useLND();
  const {doesWalletExists} = useInitApp();
  const [store] = useStore();
  const initialRoute = store.lock ? 'EnterPin' : 'Check';

  const executeOnStateChange = () => {
    OsTools.screenshotPrevent(false);
  };

  const linking = {
    prefixes: ['lightning:', 'nayutawallet:'],
    getStateFromPath: (path: string) => {
      const routeState = generateRouteState(path);
      // NOTE: React Navigation display the last item of routes array: https://reactnavigation.org/docs/navigation-state#partial-state-objects.
      const firstScreen = status?.syncedToChain ? routeState.routes[routeState.routes.length - 1] : {name: 'Check', params: {path}};

      return {
        routes: store.lock
          ? [
              {
                name: 'EnterPin',
                params: {screen: firstScreen},
              },
            ]
          : [firstScreen],
      };
    },
  };

  return (
    <NavigationContainer onStateChange={executeOnStateChange} linking={linking}>
      <Stack.Navigator
        initialRouteName={doesWalletExists ? initialRoute : 'SettingsLanguageStart'}
        screenOptions={{
          headerShown: false,
          animation: 'none',
        }}>
        {/* Start group */}
        <Stack.Group>
          <Stack.Screen name="Start" component={StartScreen} />
          <Stack.Screen name="SettingsLanguageStart" component={SettingsLanguageStartScreen} />
          <Stack.Screen name="Tutorial" component={TutorialScreen} />
          <Stack.Screen name="Disclaimer" component={DisclaimerScreen} />
          <Stack.Screen name="RestorePassphrase" component={RestorePassphraseScreen} />
          <Stack.Screen name="RestoreStart" component={RestoreStartScreen} />
          <Stack.Screen
            name="Check"
            component={CheckScreen}
            initialParams={{
              value: 'unlock',
            }}
          />
        </Stack.Group>
        {/* Root group */}
        <Stack.Group>
          <Stack.Screen name="Root" component={HomeScreen} />
          <Stack.Screen name="QrScanner" component={QrScannerScreen} />
        </Stack.Group>
        {/* Receive & Send group */}
        <Stack.Group>
          <Stack.Screen name="ReceiveDetail" component={ReceiveDetailScreen} />
          <Stack.Screen name="OtfReceive" component={OtfReceiveScreen} />
          <Stack.Screen name="SwapReceive" component={SwapReceiveScreen} />
          <Stack.Screen name="Refund" component={RefundScreen} />
          <Stack.Screen name="Withdraw" component={WithdrawScreen} />
          <Stack.Screen name="LNURLPay" component={LnurlPayScreen} />
        </Stack.Group>
        {/* Settings group */}
        <Stack.Group>
          {/* The animation option below 'slide_from_left' is only valid for Android, and is the default behavior for iOS */}
          <Stack.Screen name="Settings" component={SettingsScreen} options={{animation: 'slide_from_left'}} />
          <Stack.Screen name="SettingsUnit" component={SettingsUnitScreen} />
          <Stack.Screen name="SettingsLanguage" component={SettingsLanguageScreen} />
          <Stack.Screen name="SettingSwitchTheme" component={SettingSwitchThemeScreen} />
          <Stack.Screen name="Lapps" component={LappsScreen} />
          <Stack.Screen name="Support" component={SupportScreen} />
          <Stack.Screen name="SupportOpenSource" component={SupportOpenSourceScreen} />
          <Stack.Screen name="Shutdown" component={ShutdownScreen} />
          <Stack.Screen name="Channels" component={Channels} />
          <Stack.Screen name="ChannelDetails" component={ChannelDetailScreen} />
          <Stack.Screen name="Connect" component={ConnectScreen} />
          <Stack.Screen name="BackupPassphrase" component={BackupPassphrase} />
          <Stack.Screen name="ConfirmPassphrase" component={ConfirmPassphrase} />
        </Stack.Group>
        {/* Detail Settings group */}
        <Stack.Group>
          <Stack.Screen name="DetailSettings" component={DetailSettingScreen} />
          <Stack.Screen name="EnterPin" component={PinScreen} initialParams={{status: 'ENTER'}} />
          <Stack.Screen name="Pin" component={PinScreen} />
          <Stack.Screen name="SecureLockSettings" component={SecureLockSettingScreen} />
          <Stack.Screen name="SettingDigit" component={SettingDigitScreen} />
          <Stack.Screen name="SettingExplorer" component={SettingExplorerScreen} />
          <Stack.Screen name="TransactionList" component={TransactionListScreen} />
          <Stack.Screen name="OnchainTransactionList" component={OnchainTransactionListScreen} />
        </Stack.Group>
        {/* Debug group */}
        <Stack.Group>
          <Stack.Screen name="Debug" component={DebugScreen} />
        </Stack.Group>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export function ignoreAuthentication() {
  return [
    'Check',
    'EnterPin',
    'Pin',
    'SecureLockSettings',
    'Start',
    'SettingsLanguageStart',
    'Tutorial',
    'Disclaimer',
    'RestorePassphrase',
    'QrScanner',
    'Shutdown',
    'Debug',
    'Channels',
  ];
}

/**
 * generateRouteState generates a state which navigates to appropriate screen from a path.
 */
export const generateRouteState = (path: string): PartialState<StackNavigationState<ParamList>> => {
  if (path == null)
    return {
      index: 0,
      routes: [{name: 'Root'}],
    };

  const routeOptions = handlePath(path);
  if (routeOptions == null) {
    LOG.warn('Failed to generate routeOptions:', routeOptions);
    return {
      index: 0,
      routes: [{name: 'Root', params: {errorReason: 'UNKNOWN_PATH'}}],
    };
  }

  return {
    index: 1,
    routes: [{name: routeOptions.name, params: routeOptions?.params}],
  };
};

type routeOption = {
  name: keyof ParamList;
  params: ParamList[keyof ParamList];
};

const handlePath = (path: string): routeOption | undefined => {
  const lowPath = path.toLowerCase();
  if (lowPath.startsWith('lnurl')) {
    return {name: 'Withdraw', params: {lnurl: lowPath}};
  }
  if (lowPath.startsWith('lnbc') || lowPath.startsWith('lntb') || lowPath.startsWith('lnbcs') || lowPath.startsWith('lnbcrt')) {
    return {name: 'Root', params: {invoice: lowPath, maxStruck: false}};
  }
  return;
};
