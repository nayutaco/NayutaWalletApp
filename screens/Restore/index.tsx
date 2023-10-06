import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import React, {useState, useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {View, StyleSheet, Text} from 'react-native';

import {wordlist} from './wordlist';

import {ScrollablePage} from 'components/projects/Page';
import {Button} from 'components/uiParts/ButtonTheme';
import Input from 'components/uiParts/Input';

import {ParamList} from 'navigation/paramList';
import {Theme} from 'styles/theme/interface';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {typographyFonts, fontSizes, contentSizes} from 'styles/variables';

type Params = {
  /**
   * Input number
   */
  number: number;
  /**
   * Entered passphrases
   */
  phrases: string[];
  /**
   * Initial value of input passphrase
   */
  initialValue: string;
};

/**
 * Return Restore Wallet(input passphrase) screen
 * @returns {JSX.Element} Restore Wallet(1) Screen
 */
export const RestorePassphraseScreen = ({route: {params}}: {route: {params: Params}}) => {
  const {t} = useTranslation();
  const navigation = useNavigation<StackNavigationProp<ParamList>>();
  const {number, phrases, initialValue} = params;
  const [word, setWord] = useState('');
  const [error, setError] = useState('');
  const styles = useThemeAwareObject(createStyles);

  /**
   * Whether it is the last passphrase input screen or not
   */
  const isLastPassphrase = number === 24;

  useEffect(() => {
    setWord(initialValue);
  }, [initialValue]);

  /**
   * Go to the next input screen
   * If it is the last input screen, it will transition to the backup screen
   */
  const next = () => {
    const trimedWord = word.trim();
    if (!wordlist.includes(trimedWord)) {
      if (error !== t('restore:invalidWord')) {
        setError(t('restore:invalidWord'));
        return;
      }
    } else {
      setError('');
    }
    // number : current word number(1 origin)
    // phrases: already entered phrases
    const wordNumber = number + 1;
    if (!isLastPassphrase) {
      phrases[number - 1] = trimedWord;
      navigation.reset({
        index: 0,
        routes: [
          {name: 'Start'},
          {name: 'Disclaimer', params: {value: 'recovery'}},
          {
            name: 'RestorePassphrase',
            params: {number: wordNumber, phrases, initialValue: phrases[number]},
            key: `RestorePassphrase-${wordNumber}`,
          },
        ],
      });
    } else {
      phrases[23] = trimedWord;
      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'RestoreStart',
            params: {phrases},
          },
        ],
      });
    }
  };

  /**
   * Return to the previous input screen
   * If it is the first input screen, it will transition to the before screen
   */
  const goBack = () => {
    if (number > 1) {
      const wordNumber = number - 1;
      navigation.reset({
        index: 0,
        routes: [
          {name: 'Start'},
          {name: 'Disclaimer', params: {value: 'recovery'}},
          {
            name: 'RestorePassphrase',
            params: {number: wordNumber, phrases, initialValue: phrases[number - 2]},
            key: `RestorePassphrase-${wordNumber}`,
          },
        ],
      });
    } else {
      navigation.goBack();
    }
  };

  const updateWord = (text: string) => {
    setWord(text);
    setError('');
  };

  return (
    <ScrollablePage title={t('restore:restore')}>
      <View style={styles.container}>
        <View style={styles.containerText}>
          <Text style={styles.text}>{t('restore:inpurt24words')}</Text>
        </View>

        <Text style={styles.wordNumber}>
          {t('number')}
          {number}
        </Text>

        <View style={styles.containerInput}>
          <Input value={word} keyboardType="url" onChange={updateWord} autoFocus autoCapitalize="none" error={error} inputStyle={styles.inputText} />
        </View>
        <View style={styles.containerButton}>
          <Button outline style={[styles.button, {marginRight: 16}]} onPress={goBack}>
            <Text style={styles.buttonText}>{t('back')}</Text>
          </Button>
          <Button style={styles.button} disabled={!word.length} onPress={next}>
            <Text style={styles.defaultButtonText}>{t('next')}</Text>
          </Button>
        </View>
      </View>
    </ScrollablePage>
  );
};

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    container: {
      marginVertical: 24,
      marginHorizontal: 16,
    },
    containerText: {
      marginBottom: 32,
    },
    containerInput: {
      marginBottom: 24,
      alignSelf: 'center',
      alignItems: 'flex-end',
      width: '75%',
    },
    containerButton: {
      flexDirection: 'row',
      justifyContent: 'center',
    },
    button: {
      width: '40%',
    },
    text: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic5,
      color: theme.color.textColor,
    },
    wordNumber: {
      fontFamily: typographyFonts.notoSansBold,
      fontSize: fontSizes.basic5,
      color: theme.color.accentPrimary,
      textAlign: 'left',
    },
    inputText: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.inputValue,
      color: theme.color.textColor,
      textAlign: 'center',
      width: '100%',
      height: contentSizes.textInputHeight,
    },
    defaultButtonText: {
      fontFamily: typographyFonts.notoSans,
      width: '100%',
      textAlign: 'center',
      fontSize: fontSizes.buttonLabel,
      color: theme.color.buttonTextColor,
      letterSpacing: 4,
    },
    buttonText: {
      fontFamily: typographyFonts.notoSans,
      width: '100%',
      textAlign: 'center',
      fontSize: fontSizes.buttonLabel,
      color: theme.color.textColor,
      letterSpacing: 4,
    },
  });
  return styles;
};
