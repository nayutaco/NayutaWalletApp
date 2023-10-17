import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import React, {useRef} from 'react';
import {useTranslation} from 'react-i18next';
import {StyleSheet, View, Text, Image, SafeAreaView, TouchableOpacity} from 'react-native';
import AppIntroSlider from 'react-native-app-intro-slider';

import image1 from 'assets/images/tutorial/1.png';
import image2 from 'assets/images/tutorial/2.png';
import image3 from 'assets/images/tutorial/3.png';
import {ParamList} from 'navigation/paramList';
import {Theme} from 'styles/theme/interface';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {typographyFonts, fontSizes} from 'styles/variables';

type Item = {
  title: string;
  text: string;
  bg: string;
  image: any;
};

/**
 * Return the tutorial screen
 * @returns {JSX.Element} Tutorial Screen
 */
export const TutorialScreen = () => {
  const styles = useThemeAwareObject(createStyles);

  /**
   * Return the slide component to be displayed in the tutorial
   * @param item Data to be displayed on the slide
   * @returns {JSX.Element} Slide Component
   */
  const Slide = ({item}: {item: Item}) => {
    return (
      <View style={styles.slide}>
        <Text style={styles.title}>{item.title}</Text>
        <Image source={item.image} style={styles.image} />
        <Text style={styles.text}>{item.text}</Text>
      </View>
    );
  };

  const appIntroSlider = useRef<AppIntroSlider | null>(null);
  const navigation = useNavigation<StackNavigationProp<ParamList>>();
  const onDone = () => {
    navigation.navigate('Start', {id: 'Start'});
  };
  const {t} = useTranslation();
  const slides: Item[] = [
    {
      title: t('tutorial:title1'),
      text: t('tutorial:text1'),
      bg: '#ffffff',
      image: image1,
    },
    {
      title: t('tutorial:title2'),
      text: t('tutorial:text2'),
      bg: '#ffffff',
      image: image2,
    },
    {
      title: t('tutorial:title3'),
      text: t('tutorial:text3'),
      bg: '#ffffff',
      image: image3,
    },
  ];

  const Pagination = ({activeIndex, items}: {activeIndex: number; items: Item[]}) => {
    /**
     * Last slide or not
     */
    const isLast = activeIndex + 1 === items.length;
    /**
     * Next slide
     */
    const goToSlide = (i: number) => () => appIntroSlider.current?.goToSlide(i, true);
    return (
      <View style={styles.paginationContainer}>
        <SafeAreaView>
          <View style={styles.bar}>
            <TouchableOpacity style={[styles.button, styles.skip]} onPress={onDone}>
              {!isLast && <Text style={styles.buttonText}>{t('skip')}</Text>}
            </TouchableOpacity>
            <View style={styles.paginationDots}>
              {items.length > 1 &&
                items.map((_, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.dot, i === activeIndex ? {backgroundColor: '#778BB9'} : {backgroundColor: '#D0CECE'}]}
                    onPress={goToSlide(i)}
                  />
                ))}
            </View>
            {isLast ? (
              <TouchableOpacity style={[styles.button, styles.next]} onPress={onDone}>
                <Text style={styles.buttonText}>{t('done')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.button, styles.next]} onPress={goToSlide(activeIndex + 1)}>
                <Text style={styles.buttonText}>{t('next')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </View>
    );
  };

  return (
    <AppIntroSlider
      ref={appIntroSlider}
      data={slides}
      renderItem={Slide}
      keyExtractor={(item: Item) => item.title}
      renderPagination={activeIndex => <Pagination activeIndex={activeIndex} items={slides} />}
    />
  );
};

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    background: {
      paddingHorizontal: 16,
      flex: 1,
      resizeMode: 'cover',
      backgroundColor: theme.color.background,
    },
    slide: {
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      backgroundColor: theme.color.background,
    },
    image: {
      width: 280,
      height: 280,
      marginBottom: 32,
      resizeMode: 'contain',
    },
    text: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic5,
      color: theme.color.textColor,
      marginHorizontal: 30,
    },
    title: {
      textAlign: 'center',
      fontFamily: typographyFonts.notoSans,
      width: '100%',
      fontSize: fontSizes.headerTitle,
      color: theme.color.textColor,
      letterSpacing: 4,
      marginBottom: 32,
    },
    buttonText: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.listItemLabel,
      color: theme.color.textColor,
      padding: 12,
    },
    paginationContainer: {
      position: 'absolute',
      bottom: 0,
      width: '100%',
      height: 72,
      backgroundColor: theme.color.background,
    },
    bar: {
      flexDirection: 'row',
      flexWrap: 'nowrap',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      position: 'relative',
    },
    paginationDots: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      flex: 1,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 5,
      marginHorizontal: 4,
    },
    button: {
      position: 'absolute',
    },
    skip: {
      left: 26.5,
    },
    next: {
      right: 26.5,
    },
  });
  return styles;
};
