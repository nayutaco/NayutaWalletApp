import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import React, {useCallback, useRef, useState, ReactNode} from 'react';

import {StyleSheet, View, Animated, RefreshControlProps, ImageBackground, ViewStyle, AppState, SafeAreaView} from 'react-native';

import backgroundImage from 'assets/images/background.png';
import * as lccontrol from 'bridge/lccontrol';
import OsTools from 'bridge/osTools';
import Header, {HEADERHIGHT, HeaderButtonProps} from 'components/uiParts/Header';
import {ignoreAuthentication} from 'navigation/AppNavigator';
import {useStore} from 'store/storeContext';
import {Theme} from 'styles/theme/interface';
import {useTheme} from 'styles/theme/themeContext';
import {useThemeAwareObject} from 'styles/theme/themeHook';

import {backgroundLockTime} from 'tools/constants';
import {LOG} from 'tools/logging';

type Prop = {
  /**
   * Set true if you should hide header completely
   */
  noHeader?: boolean;
  /**
   * Header title
   */
  title?: string;
  /**
   * Header left buttons
   */
  headerLeft?: HeaderButtonProps;
  /**
   * Header right buttons
   */
  headerRight?: HeaderButtonProps;
  /**
   * Whether or not to disable the space
   */
  noBottom?: boolean;
  /**
   * Render Bottom Component
   */
  bottom?: ReactNode;
  /**
   * content
   */
  children: ReactNode;
  /**
   * Hides back button
   */
  hideBackButton?: boolean;
  /**
   * refresh control
   */
  refreshControl?: Animated.WithAnimatedObject<React.ReactElement<RefreshControlProps>>;
  /**
   * When use alternative button
   */
  useAlterButton?: boolean;
  /**
   * enable transparent background color
   */
  noBackgroundColor?: boolean;
  /**
   * alternative header style
   */
  headerStyle?: ViewStyle;
  /**
   * add blank for required in specific cases
   */
  addBlank?: boolean;
  /**
   * prohibit screenshot flag
   */
  prohibitScreenshot?: boolean;
};
export default function Page({
  title,
  hideBackButton = false,
  noHeader = false,
  headerLeft,
  headerRight,
  children,
  bottom,
  noBackgroundColor = false,
  headerStyle,
  addBlank = false,
  prohibitScreenshot = false,
}: Prop) {
  const styles = useThemeAwareObject(createStyles);
  const {theme} = useTheme();
  const navigation = useNavigation();
  const [store] = useStore();
  const route = useRoute();
  const ignoreList = ignoreAuthentication();
  const [bgTime, setBgTime] = useState(0);

  prohibitScreenshot && OsTools.screenshotPrevent(store.screenshotPrevent);

  useFocusEffect(
    useCallback(() => {
      const subscription = AppState.addEventListener('change', nextAppState => {
        if (nextAppState === 'active') {
          (async () => {
            // recoonect to Hub
            try {
              await lccontrol.connectHub();
            } catch (e) {
              LOG.error(`fail HUB connect: ${JSON.stringify(e)}`);
            }
          })();
        }

        // for screen lock
        if (!store.lock || ignoreList.indexOf(route.name) !== -1) {
          return;
        }
        switch (nextAppState) {
          case 'background':
          case 'inactive':
            LOG.debug(`Page.${nextAppState}`);
            setBgTime(Date.now());
            break;
          case 'active':
            if (bgTime !== 0 && Date.now() - bgTime > backgroundLockTime) {
              LOG.debug('Page.lock');
              if (route.name === 'Root') {
                navigation.navigate('Pin' as never, {status: 'FORE', reset: true} as never);
              } else {
                navigation.navigate('Pin' as never, {status: 'FORE', reset: false} as never);
              }
            }
            setBgTime(0);
            break;
        }
        return;
      });
      return () => {
        subscription.remove();
      };
    }, [bgTime, ignoreList, navigation, route.name, store.lock]),
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground style={styles.background} source={backgroundImage}>
        <View style={[styles.container, !noBackgroundColor && {backgroundColor: theme.color.pageBackground}]}>
          {!noHeader && (
            <View style={[headerStyle, {zIndex: 1}]}>
              <Header
                headerStyle={styles.header}
                hideBackButton={hideBackButton}
                left={headerLeft}
                right={headerRight}
                noBackgroundColor={noBackgroundColor}
                addBlank={addBlank}>
                {title}
              </Header>
            </View>
          )}
          <View style={styles.contentView}>
            <View style={styles.contentContainer}>{children}</View>
          </View>
          {bottom && <View>{bottom}</View>}
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}
export function ScrollablePage({
  title,
  hideBackButton = false,
  noHeader = false,
  headerLeft,
  headerRight,
  children,
  refreshControl,
  noBackgroundColor = false,
  headerStyle,
  addBlank = false,
  prohibitScreenshot = false,
}: Prop) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const styles = useThemeAwareObject(createStyles);
  const {theme} = useTheme();
  const navigation = useNavigation();
  const [store] = useStore();
  const route = useRoute();
  const ignoreList = ignoreAuthentication();
  const [bgTime, setBgTime] = useState(0);

  prohibitScreenshot && OsTools.screenshotPrevent(store.screenshotPrevent);

  useFocusEffect(
    useCallback(() => {
      const subscription = AppState.addEventListener('change', nextAppState => {
        if (nextAppState === 'active') {
          (async () => {
            // recoonect to Hub
            try {
              await lccontrol.connectHub();
            } catch (e) {
              LOG.error(`fail HUB connect: ${JSON.stringify(e)}`);
            }
          })();
        }

        // for screen lock
        if (!store.lock || ignoreList.indexOf(route.name) !== -1) {
          return;
        }
        switch (nextAppState) {
          case 'background':
          case 'inactive':
            LOG.debug(`ScrollablePage.${nextAppState}`);
            setBgTime(Date.now());
            break;
          case 'active':
            if (bgTime !== 0 && Date.now() - bgTime > backgroundLockTime) {
              LOG.debug('ScrollablePage.lock');
              if (route.name === 'Root') {
                navigation.navigate('Pin' as never, {status: 'FORE', reset: true} as never);
              } else {
                navigation.navigate('Pin' as never, {status: 'FORE', reset: false} as never);
              }
            }
            setBgTime(0);
            break;
        }
        return;
      });
      return () => {
        subscription.remove();
      };
    }, [bgTime, ignoreList, navigation, route.name, store.lock]),
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground
        style={[styles.background, !noBackgroundColor && {backgroundColor: theme.color.background}]}
        source={backgroundImage}
        imageStyle={styles.backgroundImage}>
        <View style={styles.container}>
          {!noHeader && (
            <View style={[headerStyle, {zIndex: 1}]}>
              <Header
                headerStyle={styles.header}
                hideBackButton={hideBackButton}
                left={headerLeft}
                right={headerRight}
                noBackgroundColor={noBackgroundColor}
                addBlank={addBlank}>
                {title}
              </Header>
            </View>
          )}
          <Animated.ScrollView
            style={styles.contentView}
            refreshControl={refreshControl}
            contentContainerStyle={styles.contentContainer}
            scrollEventThrottle={1}
            onScroll={Animated.event([{nativeEvent: {contentOffset: {y: scrollY}}}], {useNativeDriver: true})}
            showsVerticalScrollIndicator={false}>
            <View style={styles.contentContainerScroll}>{children}</View>
          </Animated.ScrollView>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.color.black,
    },
    container: {
      flexGrow: 1,
      flexShrink: 1,
    },
    background: {
      flex: 1,
      resizeMode: 'cover',
      backgroundColor: theme.color.quaternary,
    },
    backgroundImage: {
      opacity: 0,
    },
    header: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
    },
    contentView: {
      flexGrow: 1,
      marginHorizontal: 16,
    },
    contentContainer: {
      flexGrow: 1,
      paddingTop: HEADERHIGHT,
    },
    contentContainerScroll: {
      flexGrow: 1,
    },
  });
  return styles;
};
