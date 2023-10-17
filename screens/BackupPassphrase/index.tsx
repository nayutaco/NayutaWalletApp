import {RouteProp, useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import React, {useCallback, useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {StyleSheet, Text, View, Pressable, AppState} from 'react-native';
import MIcon from 'react-native-vector-icons/MaterialIcons';

import {Alert} from 'components/projects/AlertTheme';
import {ScrollablePage} from 'components/projects/Page';
import {Button} from 'components/uiParts/ButtonTheme';
import {ParamList} from 'navigation/paramList';
import {getSeed} from 'store/keychain';
import {Theme} from 'styles/theme/interface';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {fontSizes, typographyFonts} from 'styles/variables';

type RouteProps = RouteProp<ParamList, 'BackupPassphrase'>;

export default function BackupPassphrase() {
  const {t} = useTranslation();
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const styles = useThemeAwareObject(createStyles);
  const navigation = useNavigation();
  const {params} = useRoute<RouteProps>();
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

  useEffect(() => {
    (async () => {
      const cred = await getSeed();
      if (!cred) {
        setAlertIndex(1);
        throw new Error(t('backuppassphrase:alert'));
      }
      setMnemonic(cred.password.split(' '));
    })();
  }, [t]);

  return (
    <ScrollablePage title={t('backupPassphrase')} addBlank={params.init} prohibitScreenshot>
      <View style={styles.container}>
        <View style={styles.instruction}>
          <Text style={styles.containerTitle}>{t('description')}</Text>
          <Text style={styles.instructionText}>{t('backuppassphrase:text')}</Text>
        </View>
        <View style={styles.wordContainer}>
          {mnemonic.map((w, i) => (
            <Word key={i} index={i} item={w} />
          ))}
        </View>
        {params.init && (
          <View>
            <Button onPress={() => navigation.navigate('ConfirmPassphrase' as never)}>
              <Text style={styles.wroteButtonText}>{t('next')}</Text>
            </Button>
          </View>
        )}
      </View>
      <Alert isAlertVisible={alertIndex === 1} title={t('attention')} message={t('backuppassphrase:alert')} closing={() => setAlertIndex(0)} />
    </ScrollablePage>
  );
}

function Word({item, index}: {item: string; index: number}) {
  const [checked, setChecked] = useState(false);
  const wordIndex = index + 1;
  const isEven = wordIndex % 2 === 0;
  const isLastLine = wordIndex === 23 || wordIndex === 24;
  const styles = useThemeAwareObject(createStyles);

  return (
    <Pressable
      style={[styles.wordItem, isEven ? styles.even : styles.odd, isLastLine && {borderBottomWidth: 0}, checked && styles.checked]}
      onPress={() => setChecked(!checked)}>
      {checked ? <MIcon name="check" style={[styles.wordIndex, styles.checked]} /> : <Text style={styles.wordIndex}>{wordIndex}</Text>}
      <Text style={[styles.word, checked && styles.checked]}>{item}</Text>
    </Pressable>
  );
}

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    container: {
      padding: 16,
      marginBottom: 16,
    },
    instruction: {
      marginBottom: 32,
    },
    containerTitle: {
      color: theme.color.textColor,
      fontFamily: typographyFonts.notoSansBold,
      fontSize: fontSizes.basic5,
      marginBottom: 8,
    },
    instructionText: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic5,
      color: theme.color.textColor,
    },
    wordContainer: {
      width: '100%',
      flexWrap: 'wrap',
      flexDirection: 'row',
      backgroundColor: theme.color.senary,
      borderRadius: 8,
      overflow: 'hidden',
      marginBottom: 32,
    },
    wordItem: {
      width: '50%',
      padding: 8,
      flexDirection: 'row',
      flexWrap: 'nowrap',
      alignItems: 'center',
    },
    even: {
      borderBottomColor: theme.color.passphraseBorder,
      borderBottomWidth: 1,
      borderLeftColor: theme.color.passphraseBorder,
      borderLeftWidth: 1,
    },
    odd: {
      borderBottomColor: theme.color.passphraseBorder,
      borderBottomWidth: 1,
    },
    checked: {
      backgroundColor: theme.color.accentPrimary,
      color: theme.color.buttonTextColor,
    },
    wordIndex: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic5,
      color: theme.color.primaryAccent,
      marginRight: 16,
      textAlign: 'right',
      width: 24,
    },
    word: {
      flex: 1,
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic5,
      color: theme.color.textColor,
    },
    wroteButtonText: {
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
