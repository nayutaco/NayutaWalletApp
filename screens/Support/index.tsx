import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import React from 'react';
import {useTranslation} from 'react-i18next';
import {View, StyleSheet, Image, Linking, Text, Vibration, NativeModules, Platform} from 'react-native';

import DeviceInfo from 'react-native-device-info';
import FAIcon from 'react-native-vector-icons/FontAwesome5';

import nayutaLogo from 'assets/images/nayutaLogo.png';
import {ScrollablePage} from 'components/projects/Page';
import List from 'components/uiParts/List';
import ListItem from 'components/uiParts/List/Item';

import {useLND} from 'hooks/useLND';
import {ParamList} from 'navigation/paramList';
import {useStore} from 'store';
import {Theme} from 'styles/theme/interface';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {fontSizes, iconSizes, typographyFonts} from 'styles/variables';

import {isPermittedDebug} from 'tools';
import {mailTo, terms, twitterEn, twitterJa, telegramEn, telegramJa} from 'tools/constants';
import {LOG} from 'tools/logging';

/**
 * Return the support screen
 * @returns {JSX.Element} Support Screen
 */
export const SupportScreen = () => {
  const {t} = useTranslation();
  const navigation = useNavigation<StackNavigationProp<ParamList>>();
  const styles = useThemeAwareObject(createStyles);
  const {status} = useLND();
  const [store, dispatch] = useStore();

  const debugOn = async () => {
    if (!store.debugging && NativeModules.AppConfig.NETWORK === 'mainnet') {
      try {
        const isPermitted = await isPermittedDebug(status?.nodeId || '');
        if (!isPermitted) {
          LOG.warn('Support: debugOn: not permitted node');
          return;
        }
        LOG.debug('Support: debugOn: permitted node');
      } catch (e: any) {
        LOG.error(`Support: debugOn: ${e.toString()}`);
        return;
      }
    }
    Vibration.vibrate(200, false);
    dispatch({type: 'setDebugging', debugging: !store.debugging});
    LOG.info(`Support: debugOn: debugging: ${!store.debugging}`);
  };

  return (
    <ScrollablePage title={t('support:support')}>
      <View style={styles.logo}>
        <Image style={styles.logoImage} source={nayutaLogo} resizeMode="contain" />
      </View>
      <View style={styles.container}>
        <Text style={styles.info} onLongPress={debugOn}>
          {t('settings:appVersion')}: {DeviceInfo.getVersion()}
        </Text>
        <List>
          <ListItem
            onPress={() => {
              Linking.openURL(terms);
            }}
            leftAlter={<FAIcon name="scroll" style={styles.icon} size={iconSizes.basic2} />}
            label={t('settings:termsAndConditions')}
          />
          <ListItem
            onPress={() => {
              Linking.openURL(mailTo);
            }}
            leftAlter={<FAIcon name="envelope" style={styles.icon} size={iconSizes.basic2} />}
            label={t('support:mail')}
          />
          <ListItem
            onPress={() => {
              store.lang === 'ja' ? Linking.openURL(twitterJa) : Linking.openURL(twitterEn);
            }}
            leftAlter={<FAIcon name="twitter" style={styles.icon} size={iconSizes.basic2} />}
            label={t('support:twitter')}
          />
          <ListItem
            onPress={() => {
              store.lang === 'ja' ? Linking.openURL(telegramJa) : Linking.openURL(telegramEn);
            }}
            leftAlter={<FAIcon name="telegram" style={styles.icon} size={iconSizes.basic2} />}
            label={t('support:telegram')}
          />
          {Platform.OS === 'android' && (
            <ListItem
              onPress={() => {
                navigation.navigate('SupportOpenSource');
              }}
              leftAlter={<FAIcon name="book-reader" style={styles.icon} size={iconSizes.basic2} />}
              label={t('support:openSource')}
            />
          )}
        </List>
      </View>
    </ScrollablePage>
  );
};

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      alignItems: 'center',
    },
    logo: {
      paddingTop: 32,
      paddingBottom: 16,
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoImage: {
      width: 120,
      height: 120,
      alignItems: 'center',
    },
    icon: {
      color: theme.color.textColor,
    },
    info: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic5,
      color: theme.color.textColor,
      marginVertical: 16,
    },
  });
  return styles;
};
