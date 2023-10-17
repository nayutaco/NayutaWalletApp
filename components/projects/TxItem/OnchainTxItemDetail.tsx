import React from 'react';

import {useTranslation} from 'react-i18next';
import {Linking, ScrollView, StyleSheet, Text, View} from 'react-native';

// eslint-disable-next-line import/default
import Animated from 'react-native-reanimated';

import {DateTime} from '../DateTime';
import {DictTableCopyableItem} from '../DictTableCopyableItem';
import {StatusIcon} from '../StatusIcon';

import DictTable from 'components/uiParts/DictTable';
import DictTableItem, {OpenEventProps} from 'components/uiParts/DictTable/Item';
import {withStyle} from 'components/uiParts/Sat';
import {useStore} from 'store';
import {Theme} from 'styles/theme/interface';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {typographyFonts, fontSizes} from 'styles/variables';
import {getExplorerTxidUrl} from 'tools/btctools';
import {BtcDb} from 'txhistory';

type Props = {
  item: BtcDb;
};
export const OnchainTxItemDetail = ({item}: Props) => {
  const styles = useThemeAwareObject(createStyles);
  const [store] = useStore();
  const {t} = useTranslation();

  const openExplorer: OpenEventProps = {
    enable: true,
    onPress: async () => {
      const url = getExplorerTxidUrl(store.explorer, item.tx_hash);
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    },
  };

  return (
    <Animated.ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.table}>
        <View style={styles.descriptionContainer}>
          <StatusIcon chain="BTC" direction={item.dir} status={item.status} />
          <DateTime timestamp={item.timestamp} style={styles.label} />
        </View>
        <DictTable>
          <DictTableItem label={t('amount') + ' + ' + t('transactionDetail:feeLabel')}>
            <ScrollView horizontal={true}>
              <View style={styles.amountContainer}>
                <CryptoAmount value={item.amount.sub(item.fee)} overrideUnit={store.crypto} />
                <Text style={styles.dirText}>(</Text>
                <FiatAmount value={item.amount} overrideUnit={store.fiat} />
                <Text style={styles.dirText}>)</Text>
                <Text style={styles.dirText}>+</Text>
                <FeeAmount value={item.fee} overrideUnit={store.crypto} />
              </View>
            </ScrollView>
          </DictTableItem>
          <DictTableItem label={t('Status')} value={item.status} />
          <DictTableCopyableItem label={t('send:btcAddr')} value={item.addresses} />
          <DictTableCopyableItem label={t('transactionDetail:txHashLabel')} value={item.tx_hash} openUrl={openExplorer} />
        </DictTable>
      </View>
    </Animated.ScrollView>
  );
};

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    table: {
      width: '100%',
    },
    descriptionContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomColor: theme.color.accentSecondary,
      borderBottomWidth: 2,
      marginTop: 6,
      marginBottom: 12,
      paddingBottom: 2,
    },
    label: {
      fontFamily: typographyFonts.notoSansBold,
      color: theme.color.textColor,
      fontSize: fontSizes.basic4,
      marginLeft: 8,
      marginRight: 32,
    },
    icon: {
      color: theme.color.textColor,
      opacity: 0.6,
    },
    amountContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    dirText: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.dictTableItem,
      color: theme.color.textColor,
      marginRight: 5,
    },
    spinnerArea: {
      padding: 24,
      alignItems: 'center',
    },
  });
  return styles;
};

const withStyleSheet = StyleSheet.create({
  amount: {
    fontFamily: typographyFonts.notoSans,
    fontSize: fontSizes.basic5,
  },
  unit: {
    fontFamily: typographyFonts.notoSans,
    fontSize: fontSizes.basic5,
    marginHorizontal: 5,
  },
});

const CryptoAmount = withStyle({
  valueStyle: withStyleSheet.amount,
  unitStyle: withStyleSheet.unit,
  showSwapButton: false,
});

const FiatAmount = withStyle({
  valueStyle: withStyleSheet.amount,
  unitStyle: withStyleSheet.unit,
  showSwapButton: false,
});

const FeeAmount = withStyle({
  valueStyle: withStyleSheet.amount,
  unitStyle: withStyleSheet.unit,
  showSwapButton: false,
});
