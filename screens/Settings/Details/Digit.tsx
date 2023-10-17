import {RouteProp, useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import React, {useCallback, useState, useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {View, StyleSheet, Text, AppState, Platform} from 'react-native';

import {Alert, AlertButtonProps} from 'components/projects/AlertTheme';
import {ScrollablePage} from 'components/projects/Page';

import {Button} from 'components/uiParts/ButtonTheme';
import List from 'components/uiParts/List';
import ListItem from 'components/uiParts/List/Item';

import {ParamList} from 'navigation/paramList';
import {useStore} from 'store';
import {Theme} from 'styles/theme/interface';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {fontSizes, typographyFonts} from 'styles/variables';
import {setLocale} from 'tools/locale';

/**
 * Return the digit screen
 * @returns {JSX.Element} Degit Screen
 */
type Props = RouteProp<ParamList, 'SettingDigit'>;
export const SettingDigitScreen = () => {
  const {t} = useTranslation();
  const {params} = useRoute<Props>();

  const [store, dispatch] = useStore();
  const navigation = useNavigation<StackNavigationProp<ParamList>>();
  const styles = useThemeAwareObject(createStyles);

  const [selected, setSelected] = useState<string>(store.digitDecimalRule);
  const [alertIndex, setAlertIndex] = useState(0);

  useEffect(() => {
    if (!['default', 'european'].includes(selected)) {
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
        setSelected('default');
        dispatch({type: 'setDigitDecimal', digitDecimalRule: 'default'});
        setLocale(store.lang, store.digitDecimalRule);
        navigation.reset({
          index: 0,
          routes: [{name: 'Root'}],
        });
      },
    },
  ];

  const apply = () => {
    if (selected === 'default') {
      dispatch({type: 'setDigitDecimal', digitDecimalRule: 'default'});
      setLocale(store.lang, store.digitDecimalRule);
    } else if (selected === 'european') {
      dispatch({type: 'setDigitDecimal', digitDecimalRule: 'european'});
      setLocale(store.lang, store.digitDecimalRule);
    } else {
      //do nothing
    }
    if (params.start) {
      if (Platform.OS === 'android') {
        navigation.navigate('Tutorial', {id: 'Tutorial'});
      } else {
        navigation.navigate('Start');
      }
    } else {
      navigation.reset({
        index: 0,
        routes: [{name: 'Root'}],
      });
    }
  };

  return (
    <ScrollablePage title={t('detailSettings:digit')}>
      <View style={styles.container}>
        <View style={styles.descriptionContainer}>
          <Text style={styles.containerTitle}>{t('description')}</Text>
          <Text style={styles.description}>{t('digit:rule')}</Text>
        </View>
        <List>
          <ListItem
            onPress={() => {
              setSelected('default');
            }}
            left
            checked={selected === 'default'}
            label={t('digit:default')}
          />
          <ListItem
            onPress={() => {
              setSelected('european');
            }}
            left
            checked={selected === 'european'}
            label={t('digit:european')}
          />
        </List>
        <View style={styles.exampleContainer}>
          <Text style={styles.containerTitle}>{t('digit:example')}</Text>
          <Text style={styles.exampleText}>{selected === 'default' ? '1,234,567.89' : '1.234.567,89'}</Text>
        </View>
      </View>
      <Button style={styles.applyBtn} onPress={apply}>
        <Text style={styles.buttonText}>{t('apply')}</Text>
      </Button>
      <Alert isAlertVisible={alertIndex === 1} title={t('attention')} message={t('settings:noStore')} button={alertButton} />
    </ScrollablePage>
  );
};

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    container: {
      marginLeft: 8,
    },
    descriptionContainer: {
      marginTop: 16,
      marginBottom: 8,
    },
    description: {
      color: theme.color.textColor,
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic5,
    },
    exampleContainer: {
      marginVertical: 16,
    },
    containerTitle: {
      color: theme.color.textColor,
      fontFamily: typographyFonts.notoSansBold,
      fontSize: fontSizes.basic5,
      marginBottom: 8,
    },
    exampleText: {
      color: theme.color.textColor,
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic4,
      alignSelf: 'center',
    },
    applyBtn: {
      marginHorizontal: 28,
      marginTop: 16,
    },
    buttonText: {
      fontSize: fontSizes.buttonLabel,
      fontFamily: typographyFonts.notoSans,
      width: '100%',
      textAlign: 'center',
      color: theme.color.buttonTextColor,
      letterSpacing: 2,
    },
  });
  return styles;
};
