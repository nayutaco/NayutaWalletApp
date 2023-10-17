import React from 'react';
import {useTranslation} from 'react-i18next';
import {StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle} from 'react-native';

import UnitSwap from '../UnitSwap';

import {useSatToCurrency} from 'hooks/currencyHook';
import {useStore} from 'store';
import {Theme} from 'styles/theme';
import {useTheme} from 'styles/theme/themeContext';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {CurrencyUnit} from 'types/currency';
import Satoshi from 'types/Satoshi';

type SatBaseProps = {
  value?: Satoshi;
  overrideUnit?: CurrencyUnit | 'ANY_FIAT' | 'ANY_CRYPTO';
  showSwapButton?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  valueStyle?: StyleProp<TextStyle>;
  unitStyle?: StyleProp<TextStyle>;
  isNegative?: boolean;
};
/**
 * SatBase component
 */
export function SatBase({value, overrideUnit, showSwapButton, containerStyle, valueStyle, unitStyle, isNegative = false}: SatBaseProps) {
  const {t} = useTranslation();
  const [store] = useStore();
  const {theme} = useTheme();
  const styles = useThemeAwareObject(createStyles);

  let destUnit: CurrencyUnit;
  if (!overrideUnit) {
    if (store.showInFiat) {
      destUnit = store.fiat;
    } else {
      destUnit = store.crypto;
    }
  } else if (overrideUnit === 'ANY_FIAT') {
    destUnit = store.fiat;
  } else if (overrideUnit === 'ANY_CRYPTO') {
    destUnit = store.crypto;
  } else {
    destUnit = overrideUnit;
  }

  const displayValue = useSatToCurrency(destUnit, value, true);
  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.value, valueStyle, isNegative && {color: theme.color.tertiary}]}>{displayValue || '----'}</Text>
      <Text style={[styles.unit, unitStyle]}>{t(`currencyUnit:${destUnit}`)}</Text>
      {showSwapButton && <UnitSwap />}
    </View>
  );
}

type withStyleProps = {
  valueStyle?: StyleProp<TextStyle>;
  unitStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  showSwapButton?: boolean;
  overrideUnit?: CurrencyUnit | 'ANY_FIAT' | 'ANY_CRYPTO';
  isNegative?: boolean;
};

type SatProps = Pick<SatBaseProps, 'value' | 'overrideUnit'>;
/**
 * HOC function to add style to SatBase component and compose Sat component
 * @name withStyle
 * @returns {Component<SatBase>}
 */
export function withStyle({valueStyle, unitStyle, showSwapButton, containerStyle, overrideUnit, isNegative}: withStyleProps) {
  return ({value, overrideUnit: overrideUnit2}: SatProps) => (
    <SatBase
      valueStyle={[valueStyle]}
      unitStyle={unitStyle}
      showSwapButton={showSwapButton}
      containerStyle={containerStyle}
      overrideUnit={overrideUnit2 || overrideUnit}
      value={value}
      isNegative={isNegative}
    />
  );
}

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    value: {
      color: theme.color.textColor,
    },
    unit: {
      color: theme.color.textColor,
    },
  });
  return styles;
};
