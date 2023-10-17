import {useNavigation, useRoute, RouteProp, useFocusEffect} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import React, {useCallback, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {View, StyleSheet, Text, AppState} from 'react-native';

import {invokeRecoveryWallet} from 'bridge/manager';
import {Alert, AlertButtonProps} from 'components/projects/AlertTheme';
import {Button} from 'components/uiParts/ButtonTheme';
import {ParamList} from 'navigation/paramList';
import {useStore} from 'store';
import {Theme} from 'styles/theme/interface';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {typographyFonts, fontSizes} from 'styles/variables';
import * as constants from 'tools/constants';
import {googleSignIn} from 'tools/google';
import {LOG} from 'tools/logging';

type RootParamList = {
  RestoreStart: {
    /**
     * Entered passphrases
     */
    phrases: string[];
  };
};
type ScreenRouteProp = RouteProp<RootParamList, 'RestoreStart'>;

/**
 * Return Restore Wallet(start) screen
 * @returns {JSX.Element} Restore Wallet(3) Screen
 */
export const RestoreStartScreen = () => {
  const route = useRoute<ScreenRouteProp>();
  const {t} = useTranslation();
  const navigation = useNavigation<StackNavigationProp<ParamList>>();
  const [, dispatch] = useStore();
  const [creating, setCreating] = useState(false);
  const styles = useThemeAwareObject(createStyles);
  const [alertIndex, setAlertIndex] = useState(0);
  const [error, setError] = useState('');

  const recoveryWallet = async () => {
    LOG.info('recovery start');
    try {
      try {
        if (constants.backupEnableGDrive) {
          // Check画面でバックアップファイルを使用するためここでログインしておく
          await googleSignIn();
        }
      } catch (e) {
        LOG.error(e);
      }
      setCreating(true);
      // ここではwalletの復元のみ行い、scbはCheck画面で使用する。
      await invokeRecoveryWallet(route.params.phrases, '');
      dispatch({
        type: 'setWalletRecovering',
        walletRecovering: true,
      });
      dispatch({
        type: 'setPassConfirmed',
        passConfirmed: true,
      });
      navigation.reset({
        index: 0,
        routes: [{name: 'Check', params: {value: 'recovery'}}],
      });
    } catch (e: any) {
      setError(`${e.message.length > 0 ? e.message : t('errUnknown')}`);
      setAlertIndex(1);
    }
    setCreating(false);
  };

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

  const alertButton: AlertButtonProps[] = [
    {
      text: t('back'),
      style: 'attention',
      onPress: () => {
        setAlertIndex(0);
        // go to first phrase
        navigation.navigate('RestorePassphrase', {
          number: 1,
          phrases: route.params.phrases,
          initialValue: route.params.phrases[0],
        });
      },
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.containerText}>
        <Text style={styles.text}>{t('restore:startRestore')}</Text>
        <Text style={styles.instructionText}>{t(constants.backupEnableGDrive ? 'restore:startRestoreTextGdrive' : 'restore:startRestoreText')}</Text>
      </View>
      <View style={styles.containerButton}>
        <Button loading={creating} onPress={recoveryWallet}>
          <Text style={styles.defaultButtonText}>{t('start')}</Text>
        </Button>
      </View>
      <Alert isAlertVisible={alertIndex === 1} title={t('restore:alertErrTitle')} message={error} button={alertButton} />
    </View>
  );
};

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    container: {
      margin: 32,
    },
    containerText: {
      marginVertical: 16,
    },
    containerFilename: {
      marginBottom: 16,
    },
    containerButton: {
      paddingVertical: 8,
    },
    text: {
      fontFamily: typographyFonts.notoSansBold,
      fontSize: fontSizes.basic5,
      color: theme.color.textColor,
      marginBottom: 16,
    },
    instructionText: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic5,
      color: theme.color.textColor,
    },
    defaultButtonText: {
      fontFamily: typographyFonts.notoSans,
      width: '100%',
      textAlign: 'center',
      fontSize: fontSizes.buttonLabel,
      color: theme.color.buttonTextColor,
      letterSpacing: 4,
    },
  });
  return styles;
};
