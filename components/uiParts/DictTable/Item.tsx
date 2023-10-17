import React, {ReactNode} from 'react';
import {Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle} from 'react-native';

import MIcon from 'react-native-vector-icons/MaterialIcons';

import {Theme} from 'styles/theme/interface';
import {useTheme} from 'styles/theme/themeContext';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {fontSizes, typographyFonts} from 'styles/variables';

export type CopyEventProps = {
  copyable: boolean;
  onPress?: () => void;
  getHeight?: (event: {nativeEvent: {layout: {height: any}}}) => void;
};

export type OpenEventProps = {
  enable: boolean;
  onPress?: () => void;
};

type Props = {
  label: string;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  valueStyle?: StyleProp<TextStyle>;
  labelContainerStyle?: StyleProp<TextStyle>;
  copyEvent?: CopyEventProps;
  openEvent?: OpenEventProps;
} & (
  | {
      value: string;
      children?: never;
    }
  | {
      value?: never;
      children: ReactNode;
    }
);
export default function DictTableItem({
  label,
  style,
  children,
  value,
  labelStyle,
  labelContainerStyle,
  valueStyle,
  copyEvent = {copyable: false},
  openEvent = {enable: false},
}: Props) {
  const {theme} = useTheme();
  const styles = useThemeAwareObject(createStyles);
  return (
    <View style={[styles.container, style]}>
      <View style={[styles.labelContainer, labelContainerStyle]}>
        <Text style={[styles.label, labelStyle]}>{label}</Text>
        {copyEvent.copyable && (
          <Pressable onLayout={copyEvent.getHeight} onPress={copyEvent.onPress}>
            <MIcon name="content-copy" size={fontSizes.basic5} color={theme.color.textColor} style={{margin: 3}} />
          </Pressable>
        )}
        {openEvent.enable && (
          <Pressable onPress={openEvent.onPress}>
            <MIcon name="link" size={fontSizes.basic5} color={theme.color.textColor} style={{margin: 3}} />
          </Pressable>
        )}
      </View>
      <View style={styles.childrenContainer}>
        {value !== undefined ? (
          <Text style={[styles.value, valueStyle]} numberOfLines={1} ellipsizeMode={'middle'}>
            {value}
          </Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    container: {
      marginVertical: 6,
    },
    labelContainer: {
      flex: 3,
      padding: 4,
      flexDirection: 'row',
    },
    label: {
      color: theme.color.textColor,
      fontSize: fontSizes.dictTableLabel,
      fontFamily: typographyFonts.notoSansBold,
    },
    childrenContainer: {
      flex: 5,
      padding: 4,
    },
    value: {
      color: theme.color.textColor,
      marginVertical: 4,
    },
  });
  return styles;
};
