import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import React, {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {StyleSheet, View, Text, Image, Linking, Alert} from 'react-native';

import labelImage from 'assets/images/splash/label.png';
import {killProcess, getLndExitReason} from 'bridge/manager';
import Page from 'components/projects/Page';
import {Button} from 'components/uiParts/ButtonTheme';

import {ParamList} from 'navigation/paramList';
import {Theme} from 'styles/theme/interface';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {typographyFonts, fontSizes} from 'styles/variables';
import {terms} from 'tools/constants';

export default function StartScreen() {
  const navigation = useNavigation<StackNavigationProp<ParamList>>();
  const {t} = useTranslation();
  const styles = useThemeAwareObject(createStyles);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    const exitReason = getLndExitReason();
    if (exitReason.length > 0) {
      Alert.alert(t('home:failLndTitle'), `${exitReason}`, [
        {
          text: t('home:failQuit'),
          onPress: killProcess,
          style: 'destructive',
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createNewWallet = () => {
    setIsStarting(true);
    navigation.navigate('Disclaimer', {value: 'create'});
    setIsStarting(false);
  };
  const recoveryWallet = () => {
    setIsStarting(true);
    navigation.navigate('Disclaimer', {value: 'recovery'});
    setIsStarting(false);
  };

  return (
    <Page noHeader>
      <View style={styles.container}>
        <View style={styles.labelWrapper}>
          <Image source={labelImage} style={styles.label} resizeMode="contain" />
        </View>
        <View style={styles.buttonsWrapper}>
          <View style={styles.buttonsContainer}>
            <Button onPress={createNewWallet} loading={isStarting}>
              <Text style={styles.defaultButtonText}>{t('start:createWallet')}</Text>
            </Button>
          </View>
          <View style={styles.buttonsContainer}>
            <Button onPress={recoveryWallet} loading={isStarting} outline>
              <Text style={styles.outlineButtonText}>{t('start:restoreWallet')}</Text>
            </Button>
          </View>

          <View style={styles.cautionContainer}>
            <Text style={styles.caution}>{t('start:text1')}</Text>
          </View>

          <View style={styles.buttonsContainer}>
            <Button
              outline
              onPress={() => {
                Linking.openURL(terms);
              }}>
              <Text style={styles.outlineButtonText}>{t('start:termsAndConditions')}</Text>
            </Button>
          </View>
        </View>
      </View>
    </Page>
  );
}

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    container: {
      width: '100%',
      height: '100%',
      paddingHorizontal: 16,
    },
    labelWrapper: {
      height: '50%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    label: {
      width: 256,
      height: 42,
    },
    buttonsWrapper: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'flex-end',
      paddingBottom: 32,
    },
    buttonsContainer: {
      marginBottom: 16,
    },
    cautionContainer: {
      marginTop: 32,
      marginBottom: 16,
    },
    caution: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic6,
      textAlign: 'center',
      color: theme.color.textColor,
    },
    defaultButtonText: {
      fontFamily: typographyFonts.notoSans,
      width: '100%',
      textAlign: 'center',
      fontSize: fontSizes.buttonLabel,
      color: theme.color.buttonTextColor,
      letterSpacing: 2,
    },
    outlineButtonText: {
      fontFamily: typographyFonts.notoSans,
      width: '100%',
      textAlign: 'center',
      fontSize: fontSizes.buttonLabel,
      color: theme.color.textColor,
      letterSpacing: 2,
    },
  });
  return styles;
};
