import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import React, {useCallback, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {View, StyleSheet, AppState} from 'react-native';
import TouchID from 'react-native-touch-id';
import MIcon from 'react-native-vector-icons/MaterialIcons';

import {Alert, AlertButtonProps} from 'components/projects/AlertTheme';
import {ScrollablePage} from 'components/projects/Page';
import List from 'components/uiParts/List';
import ListItem from 'components/uiParts/List/Item';
import {ParamList} from 'navigation/paramList';
import {useStore} from 'store/storeContext';
import {useTheme} from 'styles/theme';
import {Theme} from 'styles/theme/interface';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {iconSizes} from 'styles/variables';
import {LOG} from 'tools/logging';

/**
 * Return the settings details screen
 * @returns {JSX.Element} Settings Details Screen
 */
export const SecureLockSettingScreen = () => {
  const navigation = useNavigation<StackNavigationProp<ParamList>>();
  const {t} = useTranslation();
  const {theme} = useTheme();
  const styles = useThemeAwareObject(createStyles);
  const [store, dispatch] = useStore();

  const optionalConfigObject = {
    title: t('detailSettings:biometricsAuth'), // Android
    imageColor: theme.color.accentPrimary, // Android
    imageErrorColor: theme.color.tertiary, // Android
    sensorDescription: t('detailSettings:touchSensor'), // Android
    sensorErrorDescription: t('failure'), // Android
    cancelText: t('cancel'), // Android
    //fallbackLabel: 'Show Passcode', // iOS (if empty, then label is hidden)
    unifiedErrors: false, // use unified error messages (default false)
    //passcodeFallback: false, // iOS - allows the device to fall back to using the passcode, if faceid/touch is not available. this does not mean that if touchid/faceid fails the first few times it will revert to passcode, rather that if the former are not enrolled, then it will use the passcode.
  };

  const [alertIndex, setAlertIndex] = useState(0);

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

  const lockEnableAlertButton: AlertButtonProps[] = [
    cancelProp,
    {
      text: t('enable'),
      style: 'submit',
      onPress: () => {
        setAlertIndex(0);
        enableLock();
      },
    },
  ];

  const lockDisableButton: AlertButtonProps[] = [
    cancelProp,
    {
      text: t('disable'),
      style: 'attention',
      onPress: () => {
        setAlertIndex(0);
        disableLock();
      },
    },
  ];

  const enableLock = () => {
    dispatch({type: 'enableLock', lock: true});
  };

  const disableLock = () => {
    dispatch({type: 'enableLock', lock: false});
    store.biometrics && dispatch({type: 'toggleBiometrics', biometrics: false});
  };

  return (
    <ScrollablePage title={t('detailSettings:securityLock')}>
      <View style={styles.container}>
        <List>
          <ListItem
            onPress={() => {
              navigation.navigate('Pin', {status: 'REGISTER', reset: false});
            }}
            label={t('detailSettings:pinChange')}
            right={<MIcon name="chevron-right" size={iconSizes.basic2} style={styles.icon} />}
          />
          <ListItem
            onPress={() => {
              store.lock ? setAlertIndex(2) : setAlertIndex(1);
            }}
            label={t('detailSettings:toggleLockTitle')}
            subLabel={store.lock ? t('on') : t('off')}
          />
          <ListItem
            onPress={() => {
              store.lock
                ? TouchID.isSupported(optionalConfigObject)
                    .then(biometryType => {
                      if (biometryType) {
                        store.biometrics
                          ? dispatch({type: 'toggleBiometrics', biometrics: false})
                          : TouchID.authenticate(t('detailSettings:biometricsAuthConfirmMsg'), optionalConfigObject)
                              .then(() => {
                                dispatch({type: 'toggleBiometrics', biometrics: true});
                              })
                              .catch((error: any) => {
                                // when cancel pressed
                                LOG.error(error.toString());
                              });
                      }
                    })
                    .catch(e => {
                      if (e.code === 'NOT_ENROLLED') {
                        setAlertIndex(5);
                      } else {
                        setAlertIndex(3);
                      }
                    })
                : setAlertIndex(4);
            }}
            label={t('detailSettings:biometricsAuth')}
            subLabel={store.biometrics ? t('on') : t('off')}
          />
        </List>
      </View>
      <Alert
        isAlertVisible={alertIndex === 1}
        title={t('detailSettings:toggleLockTitle')}
        message={t('detailSettings:enableLockMsg')}
        button={lockEnableAlertButton}
      />
      <Alert
        isAlertVisible={alertIndex === 2}
        title={t('detailSettings:toggleLockTitle')}
        message={t('detailSettings:disableLockMsg')}
        button={lockDisableButton}
      />
      <Alert
        isAlertVisible={alertIndex === 3}
        title={t('detailSettings:biometricsAuth')}
        message={t('detailSettings:biometricsAuthIsNotSupport')}
        closing={() => setAlertIndex(0)}
      />
      <Alert isAlertVisible={alertIndex === 4} title={t('attention')} message={t('detailSettings:notSetLock')} closing={() => setAlertIndex(0)} />
      <Alert
        isAlertVisible={alertIndex === 5}
        title={t('detailSettings:biometricsAuth')}
        message={t('detailSettings:biometricsAuthIsNotEnrolled')}
        closing={() => setAlertIndex(0)}
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
  });
  return styles;
};
