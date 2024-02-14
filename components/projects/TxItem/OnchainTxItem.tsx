import {useFocusEffect} from '@react-navigation/native';
import React, {useCallback, useState} from 'react';
import {View, StyleSheet, AppState} from 'react-native';

import {DateTime} from '../DateTime';
import {StatusIcon} from '../StatusIcon';

import {OnchainTxItemDetail} from './OnchainTxItemDetail';

import {Button} from 'components/uiParts/ButtonTheme';
import {ModalTheme} from 'components/uiParts/Modal';
import {withStyle} from 'components/uiParts/Sat';
import {navigationButtonHeight} from 'screens/Home';
import {Theme} from 'styles/theme/interface';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {typographyFonts, fontSizes} from 'styles/variables';
import {BtcDb} from 'txhistory';

export const OnchainTxItem = ({item}: {item: BtcDb}) => {
  const styles = useThemeAwareObject(createStyles);

  const [visible, setVisible] = useState(false);
  useFocusEffect(
    useCallback(() => {
      const subscription = AppState.addEventListener('change', nextAppState => {
        if (nextAppState === 'background' || nextAppState === 'inactive') {
          setVisible(false);
        }
      });
      return () => {
        subscription.remove();
      };
    }, []),
  );

  const openDetail = () => {
    setVisible(true);
  };

  const closeDetail = () => {
    setVisible(false);
  };

  //const renderItem = () => <TxItemDetail item={item} closing={closeDetail} />;

  return (
    <View style={styles.itemBox}>
      <Button style={styles.txHistoryButton} onPress={openDetail}>
        <View style={styles.txHistoryItem}>
          <StatusIcon chain="BTC" direction={item.dir} status={item.status} />
          <View style={styles.txItemName}>
            <DateTime timestamp={item.timestamp} style={styles.label} showSeconds={false} />
          </View>
          <View style={styles.txAmountSection}>
            <ReceiveAmount value={item.amount} />
          </View>
        </View>
        <ModalTheme visible={visible} closing={closeDetail} children={<OnchainTxItemDetail item={item} />} />
      </Button>
    </View>
  );
};

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    //transaction history
    itemBox: {
      marginHorizontal: 12,
      marginVertical: 4,
    },
    txHistory: {
      marginVertical: 16,
      width: '100%',
      height: '62%',
    },
    txHistoryButton: {
      height: navigationButtonHeight * 0.8,
      backgroundColor: theme.color.txListBackground,
    },
    txHistoryItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    txItemName: {
      flexDirection: 'row',
      flex: 1,
      marginLeft: 4,
    },
    txAmountSection: {
      flexDirection: 'row',
    },
    txAmount: {
      fontFamily: typographyFonts.notoSansBold,
      color: theme.color.textColor,
      fontSize: fontSizes.label,
    },
    label: {
      fontFamily: typographyFonts.notoSansBold,
      color: theme.color.textColor,
      fontSize: fontSizes.label,
      letterSpacing: 3,
    },
    minus: {
      fontFamily: typographyFonts.notoSansBold,
      fontSize: fontSizes.listItemLabel,
      color: theme.color.tertiary,
      marginRight: 2,
    },
    dummyBox: {
      marginVertical: 24,
      marginHorizontal: 48,
    },
    dummyButton: {
      height: navigationButtonHeight * 0.8,
      backgroundColor: theme.color.buttonColor,
      borderRadius: 50,
    },
    dummyItem: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    dummyLabel: {
      fontFamily: typographyFonts.notoSansBold,
      color: theme.color.buttonTextColor,
      fontSize: fontSizes.label,
      letterSpacing: 3,
    },
  });
  return styles;
};

const withStyleSheet = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  price: {
    fontFamily: typographyFonts.notoSansBold,
    fontSize: fontSizes.listItemLabel,
  },
  unit: {
    fontFamily: typographyFonts.notoSansBold,
    fontSize: fontSizes.label,
    marginLeft: 4,
  },
});

const ReceiveAmount = withStyle({
  containerStyle: withStyleSheet.wrap,
  valueStyle: withStyleSheet.price,
  unitStyle: withStyleSheet.unit,
  showSwapButton: false,
});
