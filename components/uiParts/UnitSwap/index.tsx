import React, {useCallback} from 'react';
import {Image, StyleSheet} from 'react-native';

import SwapIcon from 'assets/images/icon_swap.png';
import {Button} from 'components/uiParts/ButtonTheme';

import {useStore} from 'store';
import {Theme} from 'styles/theme/interface';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {iconSizes} from 'styles/variables';

/**
 * UnitSwap is a component that allows the user to swap the unit of a quantity.
 */
type Props = {
  disabled?: boolean;
};
export default function UnitSwap({disabled}: Props) {
  const [, dispatch] = useStore();
  const styles = useThemeAwareObject(createStyles);

  const swap = useCallback(() => {
    dispatch({type: 'toggleFiatDisplay'});
  }, [dispatch]);

  return (
    <Button style={styles.swapButton} rounded onPress={swap} disabled={disabled}>
      <Image style={!disabled ? styles.swapImage : styles.swapImageDisabled} source={SwapIcon} resizeMode="contain" />
    </Button>
  );
}

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    swapButton: {
      height: iconSizes.basic1,
      alignItems: 'center',
      justifyContent: 'center',
      margin: 5,
      backgroundColor: theme.color.transparent,
    },
    swapImage: {
      width: 28,
      height: 28,
      tintColor: theme.color.textColor,
    },
    swapImageDisabled: {
      width: 28,
      height: 28,
      tintColor: theme.color.textColorTranslucent,
    },
  });
  return styles;
};
