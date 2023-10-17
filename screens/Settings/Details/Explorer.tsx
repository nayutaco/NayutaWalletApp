import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import React, {useCallback, useState, useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {View, StyleSheet, Text, AppState} from 'react-native';

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

/**
 * Return the select explorer screen
 * @returns {JSX.Element} Select Explorer Screen
 */
export const SettingExplorerScreen = () => {
  const {t} = useTranslation();
  const [store, dispatch] = useStore();
  const navigation = useNavigation<StackNavigationProp<ParamList>>();
  const [selected, setSelected] = useState<string>(store.explorer);
  const [alertIndex, setAlertIndex] = useState(0);
  const styles = useThemeAwareObject(createStyles);

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
        setSelected('blockstream');
        dispatch({type: 'setExplorer', explorer: 'blockstream'});
        navigation.reset({
          index: 0,
          routes: [{name: 'Root'}],
        });
      },
    },
  ];

  useEffect(() => {
    if (!['blockstream', 'mempoolSpace'].includes(selected)) {
      setAlertIndex(1);
    }
  }, [selected]);

  const apply = () => {
    if (selected === 'blockstream') {
      dispatch({type: 'setExplorer', explorer: 'blockstream'});
    } else if (selected === 'mempoolSpace') {
      dispatch({type: 'setExplorer', explorer: 'mempoolSpace'});
    } else {
      //do nothing
    }
    navigation.reset({
      index: 0,
      routes: [{name: 'Root'}],
    });
  };

  return (
    <ScrollablePage title={t('detailSettings:explorer')}>
      <View style={styles.container}>
        <List>
          <ListItem
            onPress={() => {
              setSelected('blockstream');
            }}
            left
            checked={selected === 'blockstream'}
            label={t('explorer:blockstream')}
          />
          <ListItem
            onPress={() => {
              setSelected('mempoolSpace');
            }}
            left
            checked={selected === 'mempoolSpace'}
            label={t('explorer:mempoolSpace')}
          />
        </List>
      </View>
      <Button onPress={apply} style={styles.applyBtn}>
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
