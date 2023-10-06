import React from 'react';
import {View, StyleSheet, ViewStyle, StyleProp, Text} from 'react-native';

import {Theme} from 'styles/theme/interface';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {defaultShadowProps, typographyFonts} from 'styles/variables';

type Props = {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  title?: string;
  /**
   * Whether or not to add drop shadow
   */
  noShadow?: boolean;
  innerStyle?: StyleProp<ViewStyle>;
};
export function Card({style, children, title, noShadow = false, innerStyle}: Props) {
  const styles = useThemeAwareObject(createStyles);
  return (
    <View style={[styles.outer, style]}>
      {title && <Text style={styles.title}>{title}</Text>}
      <View style={[styles.inner, noShadow ? {} : defaultShadowProps, innerStyle]}>{children}</View>
    </View>
  );
}

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    inner: {
      backgroundColor: theme.color.transparent,
      borderRadius: 8,
      padding: 10, // default padding, can be overridden by innerStyle
      overflow: 'hidden', // to prevent the content from being clipped
    },
    outer: {},
    title: {
      color: theme.color.textColor,
      fontSize: 16,
      marginVertical: 8,
      marginLeft: 8,
      fontFamily: typographyFonts.notoSansBold,
      width: '100%',
    },
  });
  return styles;
};
