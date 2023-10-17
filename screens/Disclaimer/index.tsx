import CheckBox from '@react-native-community/checkbox';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';

import {StackNavigationProp} from '@react-navigation/stack';
import React, {useCallback, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {View, StyleSheet, Text, Pressable, Platform} from 'react-native';

import * as manager from 'bridge/manager';
import {ScrollablePage} from 'components/projects/Page';
import {Button} from 'components/uiParts/ButtonTheme';

import {ParamList} from 'navigation/paramList';
import {Theme} from 'styles/theme/interface';
import {useTheme} from 'styles/theme/themeContext';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {fontSizes, typographyFonts} from 'styles/variables';
import {LOG} from 'tools/logging';

// 遷移元は StartScreen
type RootParamList = {
  Value: {value: string};
};
type ScreenRouteProp = RouteProp<RootParamList, 'Value'>;

export default function Terms() {
  const route = useRoute<ScreenRouteProp>();
  const {t} = useTranslation();
  const [understand, setUnderstand] = useState(false);
  const navigation = useNavigation<StackNavigationProp<ParamList>>();
  const [creating, setCreating] = useState(false);
  const {theme} = useTheme();
  const styles = useThemeAwareObject(createStyles);

  const accept = async () => {
    try {
      switch (route.params.value) {
        case 'create':
          await createWallet();
          break;
        case 'recovery':
          await recoveryWallet();
          break;
        default:
          throw 'unknown';
      }
    } catch (e) {
      LOG.error(`wallet error: ${JSON.stringify(e)}`);
    }
  };
  const createWallet = async () => {
    setCreating(true);
    await manager
      .invokeNewWallet()
      .then(() => {
        navigation.reset({
          index: 0,
          routes: [{name: 'BackupPassphrase', params: {init: true}}],
        });
      })
      .catch(() => {
        LOG.error('createWallet: catch');
        navigation.reset({
          index: 0,
          routes: [{name: 'Check', params: {value: 'unlock'}}],
        });
      });
  };
  const recoveryWallet = () => {
    // normal
    const phrases = new Array<string>(24).fill('');
    // const phrases = ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''];
    navigation.navigate('RestorePassphrase', {number: 1, phrases: phrases, initialValue: phrases[0]});
  };
  const toggleUnderstand = useCallback(() => {
    setUnderstand(u => !u);
  }, []);

  return (
    <ScrollablePage title={t('disclaimer')} hideBackButton={creating}>
      <View style={styles.container}>
        <Text style={styles.infoText}>
          {t('disclaimer:text1')}
          {'\n\n'}
          {t('disclaimer:text2')}
          {'\n\n'}
          {t('disclaimer:text3')}
          {'\n\n'}
          {t('disclaimer:text4')}
        </Text>
        <Pressable style={styles.checkbox} onPress={toggleUnderstand}>
          <View style={Platform.OS === 'ios' && {transform: [{scale: 0.6}]}}>
            <CheckBox
              value={understand}
              onValueChange={setUnderstand}
              tintColors={{true: theme.color.textColor, false: theme.color.textColor}}
              onCheckColor={theme.color.textColor}
              onTintColor={theme.color.textColor}
              lineWidth={2}
              boxType={'square'}
              animationDuration={0.3}
              onAnimationType={'fade'}
              offAnimationType={'fade'}
            />
          </View>
          <Text style={styles.label}>{t('disclaimer:understand')}</Text>
        </Pressable>
        <Button style={styles.nextButton} disabled={!understand} onPress={accept} loading={creating}>
          <Text style={styles.nextButtonText}>{t('next')}</Text>
        </Button>
      </View>
    </ScrollablePage>
  );
}

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    container: {
      marginVertical: 24,
      marginHorizontal: 16,
    },
    infoText: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic5,
      color: theme.color.textColor,
      marginBottom: 16,
    },
    checkbox: {
      marginVertical: 16,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    label: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic5,
      color: theme.color.textColor,
      marginLeft: 4,
    },
    nextButton: {
      marginTop: 16,
    },
    nextButtonText: {
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
