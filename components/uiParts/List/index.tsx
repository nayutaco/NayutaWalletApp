import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import MIcon from 'react-native-vector-icons/MaterialIcons';

import {useTheme, useThemeAwareObject} from 'styles/theme';
import {Theme} from 'styles/theme/interface';
import {fontSizes, iconSizes, typographyFonts} from 'styles/variables';

type Props = {
  title?: string;
  icon?: string;
  children?: React.ReactNode;
};
export default function List({title, icon, children}: Props) {
  const styles = useThemeAwareObject(createStyles);
  const {theme} = useTheme();

  return (
    <View>
      <View style={title || icon ? styles.container : {}}>
        {icon && <MIcon name={icon} size={iconSizes.basic3} color={theme.color.textColor} style={styles.icon} />}
        {title && <Text style={styles.title}>{title}</Text>}
      </View>
      {children}
    </View>
  );
}

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    container: {
      paddingTop: 24,
      borderBottomColor: theme.color.textColor,
      borderBottomWidth: 0.75,
      paddingBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    titleContainer: {},
    icon: {
      marginRight: 8,
    },
    title: {
      color: theme.color.textColor,
      fontSize: fontSizes.basic5,
      fontFamily: typographyFonts.notoSansBold,
      width: '100%',
    },
  });
  return styles;
};
