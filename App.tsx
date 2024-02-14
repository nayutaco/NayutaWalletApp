import React from 'react';
import {StyleSheet, View, StatusBar, LogBox} from 'react-native';

import './i18n';

import {SafeAreaProvider} from 'react-native-safe-area-context';
import {enableFreeze} from 'react-native-screens';

import {BottomSheetProvider} from 'components/projects/BottomSheet/BottomSheetProvider';
import {InitApp} from 'components/projects/InitApp';
import AppNavigator from 'navigation/AppNavigator';
import {StoreProvider} from 'store';
import {LIGHT_THEME} from 'styles/theme';
import {Theme} from 'styles/theme/interface';
import {ThemeProvider, useTheme} from 'styles/theme/themeContext';
import {useThemeAwareObject} from 'styles/theme/themeHook';

// ToDo: Maybe this error caused by FlatList. When replace it, we should remove this ignoring.
LogBox.ignoreLogs([
  "[react-native-gesture-handler] Seems like you're using an old API with gesture components, check out new Gestures system!", //
  'new NativeEventEmitter', // react-native-background-timer v2.4.1
  'ViewPropTypes',
  "Can't perforrrm a React state update on an unmounted component",
]);

enableFreeze(true);
const App = (): JSX.Element => {
  const {theme} = useTheme();
  const styles = useThemeAwareObject(createStyles);
  return (
    <>
      <StatusBar barStyle={'light-content'} backgroundColor={theme.color.black} />
      <SafeAreaProvider>
        <StoreProvider>
          <ThemeProvider initial={LIGHT_THEME}>
            <View style={styles.containerMain}>
              <BottomSheetProvider>
                <InitApp>
                  <AppNavigator />
                </InitApp>
              </BottomSheetProvider>
            </View>
          </ThemeProvider>
        </StoreProvider>
      </SafeAreaProvider>
    </>
  );
};

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    containerMain: {
      width: '100%',
      height: '100%',
      backgroundColor: theme.color.quaternary,
    },
  });
  return styles;
};
export default App;
