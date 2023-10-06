import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import React, {useCallback, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {View, Text, StyleSheet, AppState} from 'react-native';

import {StatusIcon} from '../StatusIcon';

import {TxItemDetail} from 'components/projects/TxItem/TxItemDetail';
import {Button} from 'components/uiParts/ButtonTheme';
import {ModalTheme} from 'components/uiParts/Modal';
import {withStyle} from 'components/uiParts/Sat';
import {ParamList} from 'navigation/paramList';
import {navigationButtonHeight} from 'screens/Home';
import {Theme} from 'styles/theme/interface';
import {useTheme} from 'styles/theme/themeContext';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {typographyFonts, fontSizes} from 'styles/variables';
import {direction, LnDb} from 'txhistory';

export const TxItem = ({item}: {item: LnDb}) => {
  const {t} = useTranslation();
  const navigation = useNavigation<StackNavigationProp<ParamList>>();

  const {theme} = useTheme();
  const styles = useThemeAwareObject(createStyles);

  const [visible, setVisible] = useState(false);
  const [wholeDescription, setWholeDescription] = useState(false);

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

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      setVisible(false);
    });

    return unsubscribe;
  }, [navigation]);

  const openDetail = () => {
    setVisible(true);
  };

  const closeDetail = () => {
    setVisible(false);
    setWholeDescription(false);
  };

  //const renderItem = () => <TxItemDetail item={item} closing={closeDetail} />;

  return (
    <View>
      {item.dir !== 'dummy' ? (
        <View style={styles.itemBox}>
          <Button style={styles.txHistoryButton} onPress={openDetail}>
            <View style={styles.txHistoryItem}>
              <StatusIcon chain={'LN'} direction={item.dir} status={item.state} size={'large'} />
              <View style={styles.txItemName}>
                <Text style={[styles.label, !item.description && {color: theme.color.textColorTranslucent}]} numberOfLines={2}>
                  {item.description ? item.description : t('noDescription')}
                </Text>
              </View>
              <View style={styles.txAmountSection}>
                {item.dir === direction.pay ? (
                  <>
                    <Text style={styles.minus}>-</Text>
                    <PayAmount value={item.amount} />
                  </>
                ) : (
                  <ReceiveAmount value={item.amount} />
                )}
              </View>
            </View>
            <ModalTheme
              visible={visible}
              closing={closeDetail}
              children={<TxItemDetail item={item} whole={wholeDescription} setWhole={setWholeDescription} />}
            />
          </Button>
        </View>
      ) : (
        <View style={styles.dummyBox}>
          <Button style={styles.dummyButton} onPress={() => navigation.navigate('TransactionList')}>
            <View style={styles.dummyItem}>
              <Text style={styles.dummyLabel}>{t('home:allTransacrtions')}</Text>
            </View>
          </Button>
        </View>
      )}
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
      marginHorizontal: 18,
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
      marginTop: 24,
      marginBottom: 4,
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

const PayAmount = withStyle({
  containerStyle: withStyleSheet.wrap,
  valueStyle: withStyleSheet.price,
  unitStyle: withStyleSheet.unit,
  showSwapButton: false,
  isNegative: true,
});

const ReceiveAmount = withStyle({
  containerStyle: withStyleSheet.wrap,
  valueStyle: withStyleSheet.price,
  unitStyle: withStyleSheet.unit,
  showSwapButton: false,
});
