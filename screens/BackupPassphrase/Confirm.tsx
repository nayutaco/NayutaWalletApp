import {useFocusEffect, useNavigation} from '@react-navigation/native';
import React, {useCallback, useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {StyleSheet, Text, View, AppState, Platform, InputAccessoryView, Keyboard, Pressable, KeyboardAvoidingView, Appearance} from 'react-native';

import {Alert} from 'components/projects/AlertTheme';
import {ScrollablePage} from 'components/projects/Page';
import TextInputForm from 'components/projects/TextInputForm';
import {Button} from 'components/uiParts/ButtonTheme';
import {getSeed} from 'store/keychain';
import {useStore} from 'store/storeContext';
import {Theme} from 'styles/theme/interface';
import {IosPartsTheme} from 'styles/theme/iosTheme';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {fontSizes, typographyFonts} from 'styles/variables';

export default function ConfirmPassphrase() {
  const {t} = useTranslation();
  const styles = useThemeAwareObject(createStyles);
  const navigation = useNavigation();
  const [, dispatch] = useStore();

  const [alertIndex, setAlertIndex] = useState(0);
  const [inputWords, setInputWords] = useState(['', '', '']);
  const [confirmIndex, setConfirmIndex] = useState<number[]>([]);
  const [confirmWords, setConfirmWords] = useState<string[]>([]);

  const inputAccessoryViewID = '1';

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

  // 遷移時にcontantsにて決めている数のランダムな数字(範囲：1 - 24)と、パスフレーズを取得
  useEffect(() => {
    const confirmNum = 3;
    let mnemonic: string[];
    const randomNum: number[] = [];
    do {
      const num = Math.floor(Math.random() * 24 + 1);
      if (randomNum.includes(num)) continue;
      randomNum.push(num);
    } while (randomNum.length < confirmNum);
    randomNum.sort((a, b) => (a < b ? -1 : 1));
    setConfirmIndex(randomNum);
    (async () => {
      const cred = await getSeed();
      if (!cred) {
        setAlertIndex(1);
        throw new Error(t('backuppassphrase:alert'));
      }
      mnemonic = cred.password.split(' ');
      const selectWords: string[] = [];
      for (const i of randomNum) {
        selectWords.push(mnemonic[i - 1]);
      }
      setConfirmWords(selectWords);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateWord = (index: number, text: string) => {
    setInputWords((prevState: string[]) => prevState.map((value, idx) => (idx === index - 1 ? text : value)));
  };

  const next = (confirm: boolean) => {
    if (confirm) {
      if (inputWords.includes('')) {
        setAlertIndex(2);
        return;
      } else if (confirmWords[0] !== inputWords[0] || confirmWords[1] !== inputWords[1] || confirmWords[2] !== inputWords[2]) {
        setAlertIndex(3);
        return;
      }
      dispatch({
        type: 'setPassConfirmed',
        passConfirmed: true,
      });
    }
    const parentScreen = navigation.getState();
    if (parentScreen.routes[0].name === 'Root') {
      navigation.reset({
        index: 0,
        routes: [{name: 'Root' as never}],
      });
    } else {
      navigation.reset({
        index: 0,
        routes: [{name: 'Check' as never, params: {value: 'create'}}],
      });
    }
  };

  return (
    <ScrollablePage title={t('backuppassphrase:confirm')}>
      <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.container}>
          <View style={styles.instruction}>
            <Text style={styles.containerTitle}>{t('description')}</Text>
            <Text style={styles.instructionText}>{t('backuppassphrase:confirmDescription')}</Text>
          </View>
          <View style={styles.wordContainer}>
            {confirmIndex.length === 3 && (
              <>
                <View style={styles.inputRow}>
                  <Text style={styles.inputIndex}>{t('number') + confirmIndex[0].toString()}</Text>
                  <TextInputForm
                    value={inputWords[0]}
                    keyboardType="url"
                    autoCapitalize="none"
                    onChange={word => updateWord(1, word)}
                    inputStyle={styles.inputText}
                  />
                </View>
                <View style={styles.inputRow}>
                  <Text style={styles.inputIndex}>{t('number') + confirmIndex[1].toString()}</Text>
                  <TextInputForm
                    value={inputWords[1]}
                    keyboardType="url"
                    autoCapitalize="none"
                    onChange={word => updateWord(2, word)}
                    inputStyle={styles.inputText}
                  />
                </View>
                <View style={styles.inputRow}>
                  <Text style={styles.inputIndex}>{t('number') + confirmIndex[2].toString()}</Text>
                  <TextInputForm
                    value={inputWords[2]}
                    keyboardType="url"
                    autoCapitalize="none"
                    onChange={word => updateWord(3, word)}
                    inputStyle={styles.inputText}
                  />
                </View>
                {Platform.OS === 'ios' && (
                  <InputAccessoryView nativeID={inputAccessoryViewID}>
                    <View style={styles.iosKeyboard}>
                      <Pressable style={styles.closeButton} onPress={() => Keyboard.dismiss()}>
                        <Text style={styles.closeText}>{t('close')}</Text>
                      </Pressable>
                    </View>
                  </InputAccessoryView>
                )}
              </>
            )}
          </View>
          <View style={styles.buttonContainer}>
            <Button onPress={() => next(false)} style={styles.skipButton}>
              <Text style={styles.skipButtonText}>{t('skip')}</Text>
            </Button>
            <Button onPress={() => next(true)} style={styles.confirmButton}>
              <Text style={styles.confirmButtonText}>{t('ok')}</Text>
            </Button>
          </View>
        </View>
        <Alert isAlertVisible={alertIndex === 1} title={t('attention')} message={t('backuppassphrase:alert')} closing={() => setAlertIndex(0)} />
        <Alert
          isAlertVisible={alertIndex === 2}
          title={t('attention')}
          message={t('backuppassphrase:notEnoughInput')}
          closing={() => setAlertIndex(0)}
        />
        <Alert
          isAlertVisible={alertIndex === 3}
          title={t('attention')}
          message={t('backuppassphrase:failedConfirm')}
          closing={() => setAlertIndex(0)}
        />
      </KeyboardAvoidingView>
    </ScrollablePage>
  );
}

const createStyles = (theme: Theme) => {
  const colorScheme = Appearance.getColorScheme();
  const iosColor = IosPartsTheme;
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
      marginHorizontal: 32,
      marginBottom: 32,
    },
    inputText: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.inputValue,
      color: theme.color.textColor,
      textAlign: 'center',
      backgroundColor: theme.color.senary,
    },
    buttonContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    skipButton: {
      width: '35%',
      marginHorizontal: 16,
      backgroundColor: theme.color.transparent,
      borderColor: theme.color.outlineBorder,
      borderWidth: 1,
    },
    skipButtonText: {
      fontFamily: typographyFonts.notoSans,
      width: '100%',
      textAlign: 'center',
      fontSize: fontSizes.buttonLabel,
      color: theme.color.textColor,
      letterSpacing: 4,
    },
    confirmButton: {
      width: '35%',
      marginHorizontal: 16,
      backgroundColor: theme.color.selectButtonColor,
    },
    confirmButtonText: {
      fontFamily: typographyFonts.notoSans,
      width: '100%',
      textAlign: 'center',
      fontSize: fontSizes.buttonLabel,
      color: theme.color.selectButtonTextColor,
      letterSpacing: 4,
    },
    inputRow: {
      justifyContent: 'center',
      alignItems: 'flex-start',
      marginBottom: 4,
    },
    inputIndex: {
      fontFamily: typographyFonts.notoSans,
      textAlign: 'center',
      fontSize: fontSizes.inputLabel,
      color: theme.color.textColor,
    },
    iosKeyboard: {
      backgroundColor: colorScheme === 'light' ? iosColor.keyboardAccessoryLight : iosColor.keyboardAccessoryDark,
      alignItems: 'flex-end',
    },
    keyboardClose: {
      flex: 1,
    },
    closeButton: {
      alignItems: 'center',
      padding: 10,
    },
    closeText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: iosColor.applyButton,
    },
  });
  return styles;
};
