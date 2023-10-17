import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import React, {useCallback, useState, useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {View, StyleSheet, Text, AppState} from 'react-native';

import {Alert, AlertButtonProps} from 'components/projects/AlertTheme';
import {ScrollablePage} from 'components/projects/Page';

import {Button} from 'components/uiParts/ButtonTheme';
import {HeaderButtonProps} from 'components/uiParts/Header';
import List from 'components/uiParts/List';
import ListItem from 'components/uiParts/List/Item';
import {ParamList} from 'navigation/paramList';
import {useStore} from 'store';
import {Theme} from 'styles/theme/interface';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {fontSizes, typographyFonts} from 'styles/variables';
import {setLocale} from 'tools/locale';

let selectedLang: string;

type LangListProp = {
  start: boolean;
};

const LanguageList = (flag: LangListProp) => {
  const {t} = useTranslation();
  const navigation = useNavigation<StackNavigationProp<ParamList>>();
  const [store, dispatch] = useStore();

  const setLang = (lang: string) => {
    dispatch({type: 'setLang', lang: lang});
    setLocale(lang, 'default');
  };

  const [alertIndex, setAlertIndex] = useState(0);
  const [selected, setSelected] = useState<string>(store.lang);
  useEffect(() => {
    if (!['en', 'es', 'ja'].includes(selected)) {
      setAlertIndex(1);
    }
  }, [selected]);

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
      text: t('close'),
      style: 'attention',
      onPress: () => {
        setAlertIndex(0);
        setSelected('en');
        setLang('us');
        navigation.reset({
          index: 0,
          routes: [{name: 'Root'}],
        });
      },
    },
  ];

  return (
    <>
      <Alert isAlertVisible={alertIndex === 1} title={t('attention')} message={t('settings:noStore')} button={alertButton} />
      <List>
        <ListItem
          onPress={() => {
            setSelected('en');
            selectedLang = 'en';
            flag.start && setLang('en');
          }}
          left
          checked={selected === 'en'}
          label={'English'}
        />
        <ListItem
          onPress={() => {
            setSelected('es');
            selectedLang = 'es';
            flag.start && setLang('es');
          }}
          left
          checked={selected === 'es'}
          label={'Español'}
        />
        <ListItem
          onPress={() => {
            setSelected('ja');
            selectedLang = 'ja';
            flag.start && setLang('ja');
          }}
          left
          checked={selected === 'ja'}
          label={'日本語'}
        />
      </List>
    </>
  );
};

/**
 * Return the language screen
 * @returns {JSX.Element} Language Screen
 */
export const SettingsLanguageScreen = () => {
  const {t} = useTranslation();
  const navigation = useNavigation<StackNavigationProp<ParamList>>();
  const [, dispatch] = useStore();
  const styles = useThemeAwareObject(createStyles);

  const setLang = (lang: string) => {
    dispatch({type: 'setLang', lang: lang});
    setLocale(lang, 'default');
  };

  const apply = () => {
    if (['en', 'ja'].includes(selectedLang)) {
      setLang(selectedLang);
    } else if (['es'].includes(selectedLang)) {
      setLang(selectedLang);
    } else {
      // do nothing
    }
    navigation.reset({
      index: 0,
      routes: [{name: 'Root'}],
    });
  };

  return (
    <ScrollablePage title={t('settings:language')}>
      <View style={styles.container}>
        <LanguageList start={false} />
      </View>
      <Button onPress={apply} style={styles.applyBtn}>
        <Text style={styles.applyButtonText}>{t('apply')}</Text>
      </Button>
    </ScrollablePage>
  );
};

/**
 * Return the language screen in Start
 * @returns {JSX.Element} Start Language Screen
 */
export const SettingsLanguageStartScreen = () => {
  const {t} = useTranslation();
  const navigation = useNavigation<StackNavigationProp<ParamList>>();
  const styles = useThemeAwareObject(createStyles);

  const next = () => {
    navigation.navigate('SettingDigit', {start: true});
  };

  const headerLeft: HeaderButtonProps = {
    isAlter: false,
  };

  return (
    <ScrollablePage hideBackButton headerLeft={headerLeft} title={t('settings:language')}>
      <View style={styles.container}>
        <LanguageList start={true} />
        <Button onPress={next} style={styles.button}>
          <Text style={[styles.buttonText]}>{t('next')}</Text>
        </Button>
      </View>
    </ScrollablePage>
  );
};

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    container: {
      marginLeft: 8,
    },
    buttonText: {
      fontSize: fontSizes.buttonLabel,
      letterSpacing: 4,
      fontFamily: typographyFonts.notoSans,
      width: '100%',
      textAlign: 'center',
      color: theme.color.buttonTextColor,
    },
    button: {
      marginTop: 14,
    },
    applyBtn: {
      marginHorizontal: 28,
      marginTop: 16,
    },
    applyButtonText: {
      fontSize: fontSizes.buttonLabel,
      fontFamily: typographyFonts.notoSans,
      width: '100%',
      textAlign: 'center',
      letterSpacing: 2,
      color: theme.color.buttonTextColor,
    },
  });
  return styles;
};
