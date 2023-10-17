import {useFocusEffect} from '@react-navigation/native';
import React, {useState, useEffect, useCallback} from 'react';
import {useTranslation} from 'react-i18next';
import {View, StyleSheet, AppState} from 'react-native';

import {Alert, AlertButtonProps} from 'components/projects/AlertTheme';
import {ScrollablePage} from 'components/projects/Page';

import List from 'components/uiParts/List';
import ListItem from 'components/uiParts/List/Item';
import {setTheme as setThemeStore} from 'store';
import {DARK_THEME} from 'styles/theme/dark';
import {LIGHT_THEME} from 'styles/theme/light';
import {useTheme} from 'styles/theme/themeContext';
import {useThemeAwareObject} from 'styles/theme/themeHook';

/**
 * Return the language screen
 * @returns {JSX.Element} Language Screen
 */
export const SettingSwitchThemeScreen = () => {
  const {theme, setTheme} = useTheme();
  const {t} = useTranslation();
  const styles = useThemeAwareObject(createStyles);

  const [selected, setSelected] = useState<string>(theme.id);
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

  const alertButton: AlertButtonProps[] = [
    {
      text: t('close'),
      style: 'attention',
      onPress: async () => {
        setAlertIndex(0);
        setSelected(LIGHT_THEME.id);
        await setThemeStore(LIGHT_THEME);
        setTheme(LIGHT_THEME);
      },
    },
  ];

  useEffect(() => {
    if (!['light', 'dark'].includes(selected)) {
      setAlertIndex(1);
    } else {
      setSelected(theme.id);
    }
  }, [selected, theme.id]);

  return (
    <ScrollablePage title={t('settings:switchTheme')}>
      <View style={styles.container}>
        <List>
          <ListItem
            onPress={async () => {
              setSelected(LIGHT_THEME.id);
              await setThemeStore(LIGHT_THEME);
              setTheme(LIGHT_THEME);
            }}
            left
            checked={selected === LIGHT_THEME.id}
            label={'Light'}
          />
          <ListItem
            onPress={async () => {
              setSelected(DARK_THEME.id);
              await setThemeStore(DARK_THEME);
              setTheme(DARK_THEME);
            }}
            left
            checked={selected === DARK_THEME.id}
            label={'Dark'}
          />
        </List>
      </View>
      <Alert isAlertVisible={alertIndex === 1} title={t('attention')} message={t('settings:noStore')} button={alertButton} />
    </ScrollablePage>
  );
};

const createStyles = () => {
  const styles = StyleSheet.create({
    container: {
      marginLeft: 8,
    },
  });
  return styles;
};
