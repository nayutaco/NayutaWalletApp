import React from 'react';
import {Pressable, StyleSheet, View, ViewStyle, ActivityIndicator, StyleProp, Dimensions} from 'react-native';

import {colors, defaultShadowProps} from 'styles/variables';

export const buttonType = {
  default: 'default',
  plain: 'plain',
  outlined: 'outlined',
} as const;
export const buttonColor = {
  default: colors.quaternary,
  primary: colors.primary,
  secondary: colors.secondary,
  tertiary: colors.tertiary,
  white: colors.white,
  transparent: colors.transparent,
} as const;
export const buttonSize = {
  small: 'small',
  medium: 'medium',
  large: 'large',
} as const;
export type Type = typeof buttonType[keyof typeof buttonType];
export type Color = typeof buttonColor[keyof typeof buttonColor];
export type Size = typeof buttonSize[keyof typeof buttonSize];
export type ColorStyle = (type: Type, color: Color, disabled: boolean) => ViewStyle;
export type SizeStyle = (size: Size) => ViewStyle;

type Props = {
  /**
   * Button decoration type
   */
  type?: Type;
  /**
   * Color scheme pattern of button
   */
  color?: Color;
  /**
   * Top and bottom margin size of the button
   */
  size?: Size;
  /**
   * Whether the button is disabled. A disabled button is greyed out and `onPress` is not called on touch
   */
  disabled?: boolean;
  /**
   * Whether to make the buttons rounded or not
   */
  rounded?: boolean;
  /**
   * Whether to float the button or not
   */
  floating?: boolean;
  /**
   * Whether to show a loading indicator
   */
  loading?: boolean;
  /**
   * Function to execute on press
   */
  onPress?: () => void;
  /**
   * Label text of the button
   */
  children?: React.ReactNode;
  /**
   * Style of button's content.
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Loading icon size
   */
  loadingIconSize?: number;
};

/**
 * Return the color scheme style of the button
 * @param type Button decoration type
 * @param color Color scheme pattern of button
 * @param disabled Whether to deactivate the button
 * @returns {ViewStyle} coler scheme style
 */
export const colorStyle: ColorStyle = (type, color, disabled) => {
  const colorCode = disabled ? colors.disabled : color;
  const backgroundColor = type === buttonType.plain || type === buttonType.outlined ? colors.transparent : colorCode;
  const borderStyle = type === buttonType.outlined ? {borderColor: colorCode, borderWidth: 2} : {};
  return {backgroundColor, ...borderStyle};
};
function getPadding(size: Size) {
  return (
    {
      small: 9,
      medium: 15,
      large: 18,
    } as const
  )[size];
}
/**
 * Returns the button component
 * @param props props
 * @returns {JSX.Element} button component
 */
export const Button = ({
  type = buttonType.default,
  color = buttonColor.default,
  size = buttonSize.medium,
  disabled = false,
  rounded = false,
  floating = false,
  loading = false,
  onPress = () => {
    // do nothing.
  },
  children,
  style = {},
  loadingIconSize = 20,
}: Props) => {
  return (
    <View style={[styles.wrapper, colorStyle(type, color, disabled), rounded ? styles.rounded : {}, floating ? styles.floating : {}, style]}>
      <Pressable
        disabled={disabled || loading}
        onPress={onPress}
        android_ripple={{
          color: '#666',
        }}
        style={[styles.button, {padding: getPadding(size)}]}>
        {loading ? <ActivityIndicator size={loadingIconSize} color={type === buttonType.default ? colors.white : color} /> : children}
      </Pressable>
    </View>
  );
};

const radiusRatio = Math.round(Dimensions.get('window').width + Dimensions.get('window').height) / 2;
const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'column',
    overflow: 'hidden',
    borderRadius: 16,
  },
  button: {
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
  },
  floating: {
    ...defaultShadowProps,
  },
  rounded: {
    borderRadius: radiusRatio,
  },
});
