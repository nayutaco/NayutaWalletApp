import React from 'react';
import {Text, View, StyleProp, ViewStyle, StyleSheet, ActivityIndicator} from 'react-native';
import MIcon from 'react-native-vector-icons/MaterialIcons';

import {Theme} from 'styles/theme/interface';
import {useTheme} from 'styles/theme/themeContext';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {fontSizes, typographyFonts} from 'styles/variables';

type Prop = {
  items: {
    label: string;
    status: 'success' | 'error' | 'loading';
  }[];
  style?: StyleProp<ViewStyle>;
};
export function ProgressList({items, style}: Prop) {
  const {theme} = useTheme();
  const styles = useThemeAwareObject(createStyles);

  return (
    <View style={style}>
      {items.map(({label, status}, i) => (
        <View style={styles.item} key={i}>
          <View style={styles.statusIcon}>
            {status === 'success' && <MIcon name="done" size={fontSizes.listItemLabel} color={theme.color.textColor} />}
            {status === 'error' && <MIcon name="error" size={fontSizes.listItemLabel} color={theme.color.textColor} />}
            {status === 'loading' && <ActivityIndicator size={fontSizes.listItemLabel} color={theme.color.textColor} />}
          </View>
          <View style={styles.labelContainer}>
            <Text style={styles.label}>{label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    item: {
      paddingHorizontal: 20,
      paddingVertical: 6,
      flexDirection: 'row',
    },
    statusIcon: {
      marginRight: 19,
      marginVertical: 10,
    },
    label: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.listItemLabel,
      color: theme.color.textColor,
      letterSpacing: 4,
    },
    labelContainer: {
      justifyContent: 'center',
    },
  });
  return styles;
};
