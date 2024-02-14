import React from 'react';
import {View, StyleSheet, Image, ImageBackground, SafeAreaView} from 'react-native';

import backgroundImage from 'assets/images/splash/background.png';
import labelImage from 'assets/images/splash/label.png';
import logoImage from 'assets/images/splash/logo.png';
import {Theme} from 'styles/theme/interface';
import {useThemeAwareObject} from 'styles/theme/themeHook';

/**
 * Return the splash screen component
 * @returns {JSX.Element} SplashScreen Component
 */
export const SplashScreen = () => {
  const styles = useThemeAwareObject(createStyles);
  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground style={styles.background} source={backgroundImage}>
        <View style={styles.container}>
          <Image source={labelImage} style={styles.label} resizeMode="contain" />
          <Image source={logoImage} style={styles.logo} resizeMode="contain" />
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.color.black,
    },
    background: {
      flex: 1,
      resizeMode: 'cover',
      backgroundColor: theme.color.quaternary,
    },
    container: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    label: {
      width: 256,
      height: 42,
    },
    logo: {
      width: 80,
      height: 41,
      position: 'absolute',
      bottom: '6%',
    },
  });
  return styles;
};
