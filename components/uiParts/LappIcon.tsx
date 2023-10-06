import React from 'react';
import {View, StyleSheet, Image, Pressable, Text} from 'react-native';

import {typographyFonts, fontSizes} from 'styles/variables';

type Props = {
  width?: number;
  onPress?: () => void;
  source: any;
  name?: string;
};

export default function LappIcon({width, onPress, source, name}: Props) {
  const LAPP_ICON_SIZE = width ? (width - 60) * 0.33 : 80;
  return (
    <View style={[styles.container, {width: LAPP_ICON_SIZE}]}>
      <View style={[styles.appIcon, {width: LAPP_ICON_SIZE, height: LAPP_ICON_SIZE}]}>
        <Pressable
          onPress={onPress}
          android_ripple={
            onPress && {
              color: '#222',
            }
          }
          style={[styles.touchArea, {width: LAPP_ICON_SIZE, height: LAPP_ICON_SIZE}]}
        />
        <Image source={source} style={[styles.image, {width: LAPP_ICON_SIZE, height: LAPP_ICON_SIZE}]} />
      </View>
      {name && <Text style={styles.appName}>{name}</Text>}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    margin: 10,
  },
  appIcon: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
    zIndex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  touchArea: {
    zIndex: 2,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  appName: {
    fontFamily: typographyFonts.notoSans,
    fontSize: fontSizes.basic5,
    textAlign: 'center',
  },
});
