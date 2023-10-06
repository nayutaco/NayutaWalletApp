import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import React, {useCallback, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {View, StyleSheet, AppState, Platform} from 'react-native';

import {Alert, AlertButtonProps} from 'components/projects/AlertTheme';
import {ScrollablePage} from 'components/projects/Page';
import {HeaderButtonProps} from 'components/uiParts/Header';
import List from 'components/uiParts/List';
import WrapListItem from 'components/uiParts/List/WrapListItem';
import {ParamList} from 'navigation/paramList';
import {useStore} from 'store';
import {useThemeAwareObject} from 'styles/theme/themeHook';

type Params = {
  checking: boolean;
};

/**
 * Return the settings screen
 * @returns {JSX.Element} Settings Screen
 */
export const SettingsScreen = ({route: {params}}: {route: {params?: Params}}) => {
  const navigation = useNavigation<StackNavigationProp<ParamList>>();
  const {t} = useTranslation();
  const styles = useThemeAwareObject(createStyles);
  const [alertIndex, setAlertIndex] = useState(0);
  const [store] = useStore();

  useFocusEffect(
    useCallback(() => {
      const subscription = AppState.addEventListener('change', nextAppState => {
        if (nextAppState === 'background' || nextAppState === 'inactive') {
          setAlertIndex(0);
        }
      });
      return () => {
        subscription.remove();
      };
    }, []),
  );

  const cancelProp: AlertButtonProps = {
    text: t('cancel'),
    style: 'cancel',
    onPress: () => {
      setAlertIndex(0);
    },
  };

  const alertQuitButton: AlertButtonProps[] = [
    cancelProp,
    {
      text: t('yes'),
      style: 'attention',
      onPress: () => {
        setAlertIndex(0);
        navigation.reset({
          index: 0,
          routes: [{name: 'Shutdown', params: {option: 'QUIT', rescan: false}}],
        });
      },
    },
  ];

  const alertquit = () => {
    setAlertIndex(1);
  };

  const alertRestartButton: AlertButtonProps[] = [
    cancelProp,
    {
      text: t('yes'),
      style: 'attention',
      onPress: () => {
        setAlertIndex(0);
        navigation.reset({
          index: 0,
          routes: [{name: 'Shutdown', params: {option: 'RESTART', rescan: false}}],
        });
      },
    },
  ];

  const alertRestart = () => {
    setAlertIndex(2);
  };

  const headerLeft: HeaderButtonProps = {
    isAlter: true,
    pressed: () => navigation.goBack(),
    iconName: 'close',
  };

  const goToSecurity = () => {
    if (store.lock) {
      navigation.navigate('Pin', {status: 'ENTER', reset: false, screen: {name: 'BackupPassphrase', params: {init: false}}});
    } else {
      navigation.navigate('BackupPassphrase', {init: false});
    }
  };

  return (
    <ScrollablePage title={t('settings')} hideBackButton headerLeft={headerLeft}>
      <View style={styles.container}>
        <List title={t('settings:general')} icon={'settings'}>
          <WrapListItem
            indent
            onPress={() => navigation.navigate('SettingSwitchTheme')}
            label={t('settings:switchTheme')}
            right
            checking={params?.checking}
          />
          <WrapListItem
            indent
            onPress={() => navigation.navigate('SettingsUnit')}
            label={t('settings:unitSettings')}
            right
            checking={params?.checking}
          />
          <WrapListItem
            indent
            onPress={() => navigation.navigate('DetailSettings', {checking: params?.checking ? true : false})}
            label={t('detailSettings:details')}
            right
          />
        </List>

        <List title={t('lightning')} icon={'bolt'}>
          <WrapListItem indent onPress={() => navigation.navigate('Lapps')} label={t('lapps')} right checking={params?.checking} />
          <WrapListItem indent onPress={() => goToSecurity()} label={t('settings:passphrase')} right />
          {store.debugging && (
            <WrapListItem
              indent
              onPress={() => {
                navigation.navigate('Channels');
              }}
              label={t('channels')}
              right
              checking={params?.checking}
            />
          )}
        </List>

        {Platform.OS === 'android' && (
          <List title={t('settings:system')} icon={'devices'}>
            <WrapListItem indent onPress={alertquit} label={t('settings:safeStop')} />
            <WrapListItem indent onPress={alertRestart} label={t('settings:restartLnd')} />
          </List>
        )}
        <List title={t('help')} icon={'help-outline'}>
          <WrapListItem indent onPress={() => navigation.navigate('Support')} label={t('support')} right />
        </List>
        {store.debugging && (
          <List title={t('settings:debug')} icon={'adb'}>
            <WrapListItem indent onPress={() => navigation.navigate('Debug')} label={t('settings:debug')} />
          </List>
        )}
      </View>
      <Alert isAlertVisible={alertIndex === 1} title={t('settings:safeStop')} message={t('settings:safeStopMsg')} button={alertQuitButton} />
      <Alert isAlertVisible={alertIndex === 2} title={t('settings:restartLnd')} message={t('settings:restartMsg')} button={alertRestartButton} />
    </ScrollablePage>
  );
};

const createStyles = () => {
  const styles = StyleSheet.create({
    container: {
      marginLeft: 8,
    },
  });
  return styles;
};
