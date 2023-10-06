import React from 'react';

import {useTranslation} from 'react-i18next';

import {StyleSheet, View} from 'react-native';

import {ScrollablePage} from 'components/projects/Page';
import List from 'components/uiParts/List';
import ListItem from 'components/uiParts/List/Item';
import {useStore} from 'store';

import {useThemeAwareObject} from 'styles/theme/themeHook';

/**
 * Return the unit screen
 * @returns {JSX.Element} Unit Screen
 */
export const SettingsUnitScreen = () => {
  const {t} = useTranslation();
  const [store, dispatch] = useStore();
  const styles = useThemeAwareObject(createStyles);

  return (
    <ScrollablePage title={t('settings:unitSettings')}>
      <View style={styles.container}>
        <List title={t('settings:fiatUnit')}>
          <ListItem
            onPress={() => {
              dispatch({type: 'setCurrency', fiat: 'usd', crypto: store.crypto});
            }}
            left
            checked={store.fiat === 'usd'}
            label={t('currencyUnit:usd')}
          />
          <ListItem
            onPress={() => {
              dispatch({type: 'setCurrency', fiat: 'jpy', crypto: store.crypto});
            }}
            left
            checked={store.fiat === 'jpy'}
            label={t('currencyUnit:jpy')}
          />
          <ListItem
            onPress={() => {
              dispatch({type: 'setCurrency', fiat: 'eur', crypto: store.crypto});
            }}
            left
            checked={store.fiat === 'eur'}
            label={t('currencyUnit:eur')}
          />
        </List>

        <List title={t('settings:btcUnit')}>
          <ListItem
            onPress={() => {
              dispatch({type: 'setCurrency', fiat: store.fiat, crypto: 'btc'});
            }}
            left
            checked={store.crypto === 'btc'}
            label={t('currencyUnit:BTC')}
          />
          <ListItem
            onPress={() => {
              dispatch({type: 'setCurrency', fiat: store.fiat, crypto: 'sat'});
            }}
            left
            checked={store.crypto === 'sat'}
            label={t('currencyUnit:sats')}
          />
        </List>
      </View>
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
