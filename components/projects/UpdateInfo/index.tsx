import React, {useEffect, useState} from 'react';

import {useTranslation} from 'react-i18next';
import {Linking, Pressable, StyleSheet, Text, View} from 'react-native';
// eslint-disable-next-line import/default
import Animated from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';
import MIcon from 'react-native-vector-icons/MaterialIcons';

import * as updateInfo from 'misc/update_info';

import {getAppVersion} from 'store/initStorage';
import {useStore} from 'store/storeContext';
import {Theme} from 'styles/theme/interface';
import {useTheme} from 'styles/theme/themeContext';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {fontSizes, typographyFonts} from 'styles/variables';

export const UpdateInfo = () => {
  const {t} = useTranslation();
  const [store] = useStore();
  const {theme} = useTheme();
  const styles = useThemeAwareObject(createStyles);
  const [info, setInfo] = useState(updateInfo.en);
  const [version, setVersion] = useState('');
  useEffect(() => {
    (async () => {
      const current = await getAppVersion();
      const pattern = '-';
      const currentVersion = current[1].split(pattern);
      setVersion(currentVersion[0]);
    })();
  }, []);

  useEffect(() => {
    let langInfo = updateInfo.en;
    switch (store.lang) {
      case 'ja':
        langInfo = updateInfo.ja;
        break;
      case 'es':
        langInfo = updateInfo.es;
        break;
    }
    setInfo(langInfo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const jumpLink = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView>
        <Animated.ScrollView>
          <Pressable onPress={() => info.link && jumpLink(info.link)} style={styles.linkButton}>
            <Text style={styles.version}>{t('home:updateMessage', {version: version})}</Text>
            {info.link !== '' && <MIcon name="open-in-browser" size={24} color={theme.color.textColor} style={styles.linkIcon} />}
          </Pressable>
          <View>
            {info.contents.map((element, index) => (
              <View style={styles.bulletContainer} key={index}>
                <MIcon name="auto-awesome" size={20} color={theme.color.textColor} />
                <Text style={styles.message}>{element.message}</Text>
              </View>
            ))}
          </View>
        </Animated.ScrollView>
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
    linkButton: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    version: {
      fontFamily: typographyFonts.notoSansBold,
      fontSize: fontSizes.basic5,
      color: theme.color.textColor,
      borderBottomColor: theme.color.textColor,
      borderBottomWidth: 1,
    },
    linkIcon: {
      marginLeft: 8,
    },
    bulletContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    message: {
      width: '90%',
      paddingHorizontal: 8,
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic5,
      color: theme.color.textColor,
    },
  });
  return styles;
};
