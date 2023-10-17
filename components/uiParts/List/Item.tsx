import React, {ReactNode, useMemo} from 'react';
import {View, StyleSheet, Text, Pressable} from 'react-native';

import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';

import {Theme} from 'styles/theme/interface';
import {useTheme} from 'styles/theme/themeContext';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {colors, fontSizes, iconSizes, typographyFonts} from 'styles/variables';

// Its prop names are not politically correct. This name discriminates RTL language users.
type Props = {
  left?: boolean;
  children?: ReactNode;
  label?: string;
  subLabel?: string;
  right?: ReactNode;
  onPress?: () => void;
  checked?: boolean;
  leftAlter?: ReactNode;
  indent?: boolean;
};
export default function Item({left = false, children, right, onPress, label, subLabel, checked = false, leftAlter, indent = false}: Props) {
  const styles = useThemeAwareObject(createStyles);
  const {theme} = useTheme();
  const ViewOrButton = useMemo(() => {
    if (onPress) {
      // eslint-disable-next-line no-shadow
      return ({children, ...props}: {children: ReactNode}) => (
        <Pressable {...props} onPress={onPress} android_ripple={{color: '#ccc'}}>
          {children}
        </Pressable>
      );
    } else {
      return View;
    }
  }, [onPress]);
  return (
    <ViewOrButton style={[styles.container, indent && {marginLeft: 28}]}>
      {left &&
        (checked ? (
          <View style={styles.left}>
            <MCIcon name="adjust" size={iconSizes.basic2} color={theme.color.textColor} />
          </View>
        ) : (
          <View style={styles.left}>
            <MCIcon name="circle-outline" size={iconSizes.basic2} color={theme.color.textColor} />
          </View>
        ))}
      {leftAlter && <View style={styles.left}>{leftAlter}</View>}
      <View style={[styles.element, styles.center]}>
        {children || (
          <>
            <Text style={styles.label}>{label}</Text>
            {subLabel && <Text style={styles.subLabel}>{subLabel}</Text>}
          </>
        )}
      </View>
      {right && <View style={[styles.element, styles.right]}>{right}</View>}
    </ViewOrButton>
  );
}

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    element: {
      minHeight: 60,
      justifyContent: 'center',
    },
    left: {
      minHeight: 60,
      marginRight: 16,
      justifyContent: 'center',
    },
    center: {
      flexGrow: 1,
    },
    right: {},
    label: {
      color: theme.color.textColor,
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.listItemLabel,
    },
    subLabel: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.listItemSubLabel,
      color: colors.listItemSubLabel,
    },
  });
  return styles;
};
