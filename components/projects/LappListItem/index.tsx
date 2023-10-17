import React from 'react';
import {View, StyleSheet, Image, Pressable, Text} from 'react-native';

import {Theme} from 'styles/theme/interface';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {typographyFonts, fontSizes} from 'styles/variables';

type Props = {
  onPress?: () => void;
  source: any;
  name?: string;
};

export default function LappListItem({onPress, source, name}: Props) {
  const styles = useThemeAwareObject(createStyles);

  return (
    <Pressable
      style={styles.container}
      onPress={onPress}
      android_ripple={
        onPress && {
          color: '#666',
        }
      }>
      <Image source={source} style={styles.image} />
      <View style={styles.nameContainer}>{name && <Text style={styles.appName}>{name}</Text>}</View>
    </Pressable>
  );
}

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    container: {
      borderRadius: 8,
      padding: 8,
      overflow: 'hidden',
      flexDirection: 'row',
      alignItems: 'center',
      flexGrow: 1,
    },
    image: {
      resizeMode: 'cover',
      width: 60,
      height: 60,
      borderRadius: 10,
    },
    appName: {
      color: theme.color.textColor,
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic5,
      textAlign: 'center',
    },
    nameContainer: {
      paddingHorizontal: 16,
    },
  });
  return styles;
};
