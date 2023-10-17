import React from 'react';
import {Pressable, StyleSheet, View, ViewStyle, ActivityIndicator, StyleProp, Dimensions} from 'react-native';

import {Theme} from 'styles/theme/interface';
import {useTheme} from 'styles/theme/themeContext';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {defaultShadowProps} from 'styles/variables';

type Props = {
  /**
   * Whether the button is disabled. A disabled button is greyed out and `onPress` is not called on touch
   */
  disabled?: boolean;
  /**
   * Whether enable the outline style
   */
  outline?: boolean;
  /**
   * Whether to make the buttons rounded or not
   */
  rounded?: boolean;
  /**
   * Whether to float the button or not
   */
  floating?: boolean;
  /**
   * Whether to show the border or not
   */
  border?: boolean;
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
 * Returns the button component
 * @param props props
 * @returns {JSX.Element} button component
 */
export const Button = ({
  disabled = false,
  outline = false,
  rounded = false,
  floating = false,
  loading = false,
  border = false,
  onPress = () => {
    // do nothing.
  },
  children,
  loadingIconSize = 20,
  style = {},
}: Props) => {
  const {theme} = useTheme();
  const styles = useThemeAwareObject(createStyles);
  return (
    <View
      style={[
        styles.wrapper,
        outline ? styles.outline : {},
        rounded ? styles.rounded : {},
        floating ? styles.floating : {},
        border ? styles.border : {},
        disabled ? (outline ? styles.disabledOutline : styles.disabled) : {},
        style,
      ]}>
      <Pressable
        disabled={disabled || loading}
        onPress={onPress}
        android_ripple={{
          color: '#666',
        }}
        style={styles.button}>
        {loading ? <ActivityIndicator size={loadingIconSize} color={outline ? theme.color.textColor : theme.color.buttonTextColor} /> : children}
      </Pressable>
    </View>
  );
};

const radiusRatio = Math.round(Dimensions.get('window').width + Dimensions.get('window').height) / 2;
const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    wrapper: {
      height: 42,
      flexDirection: 'column',
      overflow: 'hidden',
      borderRadius: 4,
      backgroundColor: theme.color.buttonColor,
    },
    disabled: {
      backgroundColor: theme.color.disabled,
      borderColor: theme.color.disabled,
    },
    disabledOutline: {
      backgroundColor: theme.color.modal,
      borderColor: theme.color.disabled,
    },
    outline: {
      backgroundColor: theme.color.transparent,
      borderColor: theme.color.outlineBorder,
      borderWidth: 1.5,
    },
    button: {
      justifyContent: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      flexGrow: 1,
      paddingHorizontal: 16,
      borderRadius: 45,
    },
    floating: {
      ...defaultShadowProps,
    },
    rounded: {
      borderRadius: radiusRatio,
    },
    border: {
      borderColor: theme.color.buttonBorderColor,
      borderWidth: 0.75,
    },
    buttonBorderColor: {
      color: theme.color.secondary,
    },
  });
  return styles;
};
