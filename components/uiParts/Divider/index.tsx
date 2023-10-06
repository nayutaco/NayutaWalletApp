import React from 'react';
import {StyleSheet, View} from 'react-native';

import {Theme} from 'styles/theme/interface';
import {useThemeAwareObject} from 'styles/theme/themeHook';

type Props = {
  width?: string | number;
};

const Divider = ({width = '100%'}: Props) => {
  const styles = useThemeAwareObject(createStyles);
  return <View style={[styles.divider, {width: width}]} />;
};
export default Divider;

/**
 * A simple divider
 * provides no customization.
 * For more granuarity, create your own dividers
 */

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    divider: {
      height: 1,
      width: '100%',
      backgroundColor: theme.color.divider,
      alignSelf: 'center',
    },
  });
  return styles;
};
