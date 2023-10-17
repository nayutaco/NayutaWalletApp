import {useNavigation} from '@react-navigation/native';
import React from 'react';
import {View, StyleSheet, Pressable, ViewStyle, Text, ColorValue} from 'react-native';
import MIcon from 'react-native-vector-icons/MaterialIcons';

import {Theme} from 'styles/theme/interface';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {colors, fontSizes, iconSizes, typographyFonts} from 'styles/variables';

export type HeaderButtonProps = {
  isAlter: boolean; // if you use no icon but space only, should set false
  pressed?: () => void;
  iconName?: string;
  buttonStyle?: ViewStyle;
  color?: ColorValue;
};

type Props = {
  /* Always hide back button */
  hideBackButton?: boolean;
  /* Left buttons component. */
  left?: HeaderButtonProps;
  /* Title text */
  children?: string;
  /* Right buttons component. */
  right?: HeaderButtonProps;
  /**
   * style for BackgroundView
   */
  backgroundStyle?: ViewStyle;
  /**
   * enable transparent background color
   */
  noBackgroundColor?: boolean;
  /**
   * alternative header style
   */
  headerStyle?: ViewStyle;
  /**
   * add blank for required in specific cases
   */
  addBlank?: boolean;
};
function Header({children, hideBackButton = false, left, right, backgroundStyle, noBackgroundColor, headerStyle, addBlank = false}: Props) {
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();
  const goBack = () => {
    navigation.goBack();
  };
  const isShowBackButton = !hideBackButton && canGoBack;
  const styles = useThemeAwareObject(createStyles);

  return (
    <View style={[styles.background, backgroundStyle, noBackgroundColor && {backgroundColor: 'transparent'}, headerStyle]}>
      <View style={styles.rootContainer}>
        <View style={styles.left}>
          {isShowBackButton && (
            <Pressable onPress={goBack} android_ripple={{color: '#ccc'}} style={styles.button}>
              <Text style={styles.buttonLabel}>
                <MIcon name="chevron-left" size={iconSizes.basic2} style={styles.icon} />
              </Text>
            </Pressable>
          )}
          {addBlank && <View style={{paddingLeft: 16}} />}
          {!left && hideBackButton && <View style={{marginRight: 28}} />}
          {left && !left.isAlter && <View style={styles.nullLeft} />}
          {left && left.isAlter && left.iconName && (
            <Pressable onPress={left.pressed} android_ripple={{color: '#ccc'}} style={[styles.button, left.buttonStyle]}>
              <Text style={styles.buttonLabel}>
                <MIcon name={left.iconName} size={iconSizes.basic2} style={styles.icon} />
              </Text>
            </Pressable>
          )}
          {children && (
            <View style={styles.titleContainer}>
              <Text style={styles.title} numberOfLines={1}>
                {children}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.center} />
        <View style={styles.right}>
          {right && right.isAlter && right.iconName && (
            <Pressable onPress={right.pressed} android_ripple={{color: '#ccc'}} style={[styles.button, right.buttonStyle]}>
              <Text style={styles.buttonLabel}>
                <MIcon name={right.iconName} size={iconSizes.basic2} style={[styles.icon, {color: right.color}]} />
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

export default Header;

export const HEADERHIGHT = 56;

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    background: {
      // intended to go below Statusbar
      width: '100%',
      zIndex: 8,
      overflow: 'hidden',
      backgroundColor: theme.color.headerBackGround,
    },
    backgroundDrawLayer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      flexGrow: 1,
      backgroundColor: colors.white,
      opacity: 0,
      zIndex: 9,
    },
    rootContainer: {
      flexDirection: 'row',
      zIndex: 10,
      paddingVertical: 8,
      height: HEADERHIGHT,
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    titleContainer: {
      alignSelf: 'center',
    },
    title: {
      fontSize: fontSizes.headerTitle,
      fontFamily: typographyFonts.notoSans,
      width: '100%',
      color: theme.color.textColor,
      letterSpacing: 2,
    },
    nullLeft: {
      paddingVertical: 8,
      paddingLeft: 16,
    },
    button: {
      paddingVertical: 8,
      paddingLeft: 16,
      marginRight: 8,
    },
    buttonLabel: {
      color: theme.color.primary,
    },
    left: {
      flexDirection: 'row',
      color: colors.black,
    },
    center: {
      flexShrink: 1,
    },
    right: {
      flexDirection: 'row',
      marginRight: 16,
    },
    icon: {
      color: theme.color.textColor,
    },
  });
  return styles;
};
