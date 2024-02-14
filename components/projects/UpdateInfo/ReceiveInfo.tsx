import CheckBox from '@react-native-community/checkbox';
import React, {useEffect, useState} from 'react';

import {useTranslation} from 'react-i18next';
import {ActivityIndicator, Platform, StyleSheet, Text, View} from 'react-native';
// eslint-disable-next-line import/default
import Animated from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';
import MIcon from 'react-native-vector-icons/MaterialIcons';

import {getNotificationInfo} from 'bridge/info';
import {useStore} from 'store/storeContext';
import {Theme} from 'styles/theme/interface';
import {useTheme} from 'styles/theme/themeContext';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {fontSizes, typographyFonts} from 'styles/variables';
import {LOG} from 'tools/logging';
import {NotifiedInfo} from 'types';

export const ReceiveInfo = () => {
  const {t} = useTranslation();
  const [store, dispatch] = useStore();
  const {theme} = useTheme();
  const styles = useThemeAwareObject(createStyles);
  const [receivedIndex, setReceivedIndex] = useState(store.notifyConfirmed);
  const [receivedContents, setReceivedContents] = useState<NotifiedInfo[]>();
  const [markedGet, setMarkedGet] = useState(false);
  const [markedConfirmed, setMarkedConfirmed] = useState(false);

  useEffect(() => {
    let isUnmounted = false;
    (async () => {
      try {
        const received = await getNotificationInfo(store.debugging);
        setReceivedIndex(received.info.index);
        if (isUnmounted) return;
        switch (store.lang) {
          case 'en':
            setReceivedContents(received.info.en);
            break;
          case 'es':
            setReceivedContents(received.info.es);
            break;
          case 'ja':
            setReceivedContents(received.info.ja);
            break;
        }
      } catch (e: any) {
        LOG.warn(`ReceiveInfo API server: ${e}`);
      }
    })();
    return () => {
      isUnmounted = true;
    };
  }, [store.debugging, store.lang]);

  const checkResolve = (confirmed: boolean) => {
    setMarkedConfirmed(confirmed);
    dispatch({
      type: 'setNotifyConfirmed',
      notifyConfirmed: confirmed ? receivedIndex : receivedIndex - 1,
    });
  };

  useEffect(() => {
    setMarkedGet(true);
  }, [receivedContents]);

  return (
    <View style={styles.container}>
      <SafeAreaView>
        {markedGet ? (
          <>
            <Animated.ScrollView>
              <View>
                {receivedContents && receivedContents[0].title !== '' ? (
                  receivedContents.map((element, index) => (
                    <View style={styles.unitContainer} key={index}>
                      <View style={styles.bulletContainer}>
                        <MIcon name="check" size={20} color={theme.color.textColor} />
                        <Text style={styles.title}>{element.title}</Text>
                      </View>
                      <Text style={styles.message}>{element.message}</Text>
                    </View>
                  ))
                ) : (
                  <></>
                )}
              </View>
            </Animated.ScrollView>
            <View style={styles.checkbox}>
              <View style={Platform.OS === 'ios' && {transform: [{scale: 0.6}]}}>
                <CheckBox
                  value={markedConfirmed}
                  onValueChange={confirmed => checkResolve(confirmed)}
                  tintColors={{true: theme.color.textColor, false: theme.color.textColor}}
                  onCheckColor={theme.color.textColor}
                  onTintColor={theme.color.textColor}
                  lineWidth={2}
                  boxType={'square'}
                  animationDuration={0.3}
                  onAnimationType={'fade'}
                  offAnimationType={'fade'}
                />
              </View>
              <Text style={styles.label}>{t('home:neverShow')}</Text>
            </View>
          </>
        ) : (
          <View style={styles.spinnerArea}>
            <ActivityIndicator size="large" color={theme.color.textColor} />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
};

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    container: {
      maxHeight: '80%',
      justifyContent: 'center',
    },
    unitContainer: {
      marginBottom: 24,
    },
    bulletContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    title: {
      width: '90%',
      paddingHorizontal: 8,
      fontFamily: typographyFonts.notoSansBold,
      fontSize: fontSizes.basic5,
      color: theme.color.textColor,
    },
    message: {
      width: '90%',
      paddingHorizontal: 8,
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic5,
      color: theme.color.textColor,
    },
    checkbox: {
      marginVertical: 8,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    label: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic5,
      color: theme.color.textColor,
      marginLeft: 4,
    },
    spinnerArea: {
      padding: 24,
      alignItems: 'center',
    },
  });
  return styles;
};
