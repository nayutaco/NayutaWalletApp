import Clipboard from '@react-native-clipboard/clipboard';
import {useFocusEffect} from '@react-navigation/native';
import React, {useCallback, useEffect, useState} from 'react';

import {useTranslation} from 'react-i18next';
import {View, Text, StyleSheet, TouchableWithoutFeedback, Platform, Linking, TextStyle, AppState} from 'react-native';

import FAIcon from 'react-native-vector-icons/FontAwesome';
import FA5Icon from 'react-native-vector-icons/FontAwesome5';
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import MIcon from 'react-native-vector-icons/MaterialIcons';

import AppOpener from 'bridge/AppOpener';
import {listMacaroonIDs, getCert, allPerm, bakeMacaroon, keyHash, revokeMacaroon} from 'bridge/macaroon';
import {Alert, AlertButtonProps} from 'components/projects/AlertTheme';
import {ScrollablePage} from 'components/projects/Page';
import {Button} from 'components/uiParts/ButtonTheme';
import LappIcon from 'components/uiParts/LappIcon';
import apps from 'misc/lapps';
import {Theme} from 'styles/theme/interface';
import {useTheme} from 'styles/theme/themeContext';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {typographyFonts, fontSizes} from 'styles/variables';
import {lndAddr, lndGrpcPort, lndRestPort} from 'tools/constants';
import {buildConnectString} from 'tools/index';
import {MacPermission} from 'types/Macaroon';

type Params = {
  /** app id */
  appId: string;
};

export default function Connect({route: {params}}: {route: {params: Params}}) {
  const {t} = useTranslation();
  const {theme} = useTheme();
  const styles = useThemeAwareObject(createStyles);

  const [hasMacaroon, setHasMacaroon] = useState(false);

  const [alertIndex, setAlertIndex] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const subscription = AppState.addEventListener('change', nextAppState => {
        if (nextAppState === 'background' || nextAppState === 'inactive') {
          setAlertIndex(0);
        }
      });
      return () => {
        subscription.remove();
      };
    }, []),
  );

  const noAppAlertButton = () => {
    const buttonProp: AlertButtonProps[] = [
      {
        text: t('cancel'),
        style: 'cancel',
        onPress: () => {
          setAlertIndex(0);
        },
      },
      {
        text: t('connect:appDownload'),
        style: 'submit',
        onPress: () => {
          if (appDetail.android?.mode === 'intent') {
            Linking.openURL(`http://play.google.com/store/apps/details?id=${appDetail.android.packageId}`);
          }
        },
      },
    ];
    return buttonProp;
  };

  const {appId} = params;
  const appDetail = apps.filter(p => p.appId === appId)[0];
  if (!appDetail) {
    throw new Error(t('connect:errorNoApp'));
  }
  const openHomepage = () => {
    Linking.openURL(appDetail.homepage);
  };
  const connect = async () => {
    if (Platform.OS === 'android') {
      const launchAction = appDetail.android;
      if (!launchAction) {
        throw new Error(t('connect:errorAndroid'));
      }
      const macaroon = await bakeMacaroon(appId, launchAction.macaroonPermissions);
      setHasMacaroon(true);
      const cert = await getCert();
      let port: string;
      switch (launchAction.protocol) {
        case 'grpc':
          port = `${lndGrpcPort}`;
          break;
        case 'rest':
          port = `${lndRestPort}`;
          break;
      }
      const url = buildConnectString(launchAction.url, {
        host: lndAddr,
        port,
        macaroonB64: macaroon.asBase64(),
        macaroonHex: macaroon.asHex(),
        cert,
      });
      if (launchAction.mode === 'intent') {
        let supported;
        if (launchAction.packageId.length > 0) {
          supported = await AppOpener.canOpenAppWithUrl(url, launchAction.packageId);
          if (supported) {
            AppOpener.openAppWithUrl(url, launchAction.packageId);
          }
        } else {
          supported = await Linking.canOpenURL(url);
          if (supported) {
            Linking.openURL(url);
          }
        }
        if (!supported) {
          setAlertIndex(1);
        }
      } else if (launchAction.mode === 'copy') {
        Clipboard.setString(url);
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          Linking.openURL(url);
        } else {
          setAlertIndex(2);
        }
      }
    } else if (Platform.OS === 'ios') {
      throw new Error(t('connect:errorIos'));
    }
  };

  useEffect(() => {
    (async () => {
      const kid = keyHash(appId);
      const kids = await listMacaroonIDs();
      if (kids.indexOf(kid) !== -1) {
        setHasMacaroon(true);
      }
    })();
  });

  return (
    <ScrollablePage title={t('lappsDetail')}>
      <View style={styles.iconContainer}>
        <LappIcon source={appDetail.icon} />
        <View style={styles.nameContainer}>
          <Text style={styles.appName}>{appDetail.name}</Text>
          <Text style={styles.appCategory}>{t(`category:${appDetail.category}`)}</Text>
        </View>
      </View>
      <View style={styles.container}>
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>{t('Description')}</Text>
          <Text style={styles.infoText}>{t(appDetail.description)}</Text>
          {appDetail.author !== '' && (
            <View>
              <Text style={styles.infoTitle}>{t('connect:author')}</Text>
              <Text ellipsizeMode="tail" numberOfLines={1} style={styles.infoText}>
                {appDetail.author}
              </Text>
              <Text style={styles.infoTitle}>{t('connect:homepage')}</Text>
              <TouchableWithoutFeedback onPress={openHomepage}>
                <View style={styles.openUrl}>
                  <MIcon name="link" size={fontSizes.basic4} color={theme.color.textColor} />
                  <Text ellipsizeMode="tail" numberOfLines={1} style={styles.infoText}>
                    {appDetail.homepage}
                  </Text>
                </View>
              </TouchableWithoutFeedback>
            </View>
          )}
          <Text style={styles.infoTitle}>{t('attention')}</Text>
          <Text style={styles.infoText}>{t('connect:notice')}</Text>
        </View>
        <Button style={styles.buttonContainer} onPress={connect}>
          <Text style={styles.connectButton}>{appDetail.android?.mode === 'intent' ? t('connect:connect') : t('copy')}</Text>
        </Button>
      </View>
      {appDetail.android && (
        <View style={styles.container}>
          <Permissions perms={appDetail.android.macaroonPermissions} />
          {hasMacaroon && (
            <Button
              style={styles.revokeContainer}
              onPress={() => {
                revokeMacaroon(appId);
                setHasMacaroon(false);
              }}>
              <Text style={styles.revokeButton}>{t('connect:revokePermissions')}</Text>
            </Button>
          )}
        </View>
      )}
      <Alert
        isAlertVisible={alertIndex === 1}
        title={t('connect:alertNoAppTitle')}
        message={t('connect:alertNoAppMsg')}
        button={noAppAlertButton()}
      />
      <Alert
        isAlertVisible={alertIndex === 2}
        title={t('connect:alertCopyTitle')}
        message={`${t('connect:alertCopyMsg', {appName: appDetail.name})}`}
        closing={() => setAlertIndex(0)}
      />
    </ScrollablePage>
  );
}

function Permissions({perms}: {perms: MacPermission[]}) {
  const {t} = useTranslation();
  const {theme} = useTheme();
  const styles = useThemeAwareObject(createStyles);

  const permsTable = perms.reduce((prev, perm) => ({...prev, [`${perm.entity}.${perm.action}`]: true}), {} as {[key: string]: boolean});
  const allowed: MacPermission[] = [];
  const denied: MacPermission[] = [];
  allPerm.forEach(perm => {
    if (permsTable[`${perm.entity}.${perm.action}`]) {
      allowed.push(perm);
    } else {
      denied.push(perm);
    }
  });
  return (
    <View>
      <View style={styles.allowContainer}>
        <Text style={styles.label}>{t('connect:allowed')}</Text>
        <CategorizedPermission perms={allowed} color={theme.color.accentPrimary} />
      </View>
      <View style={styles.allowContainer}>
        <Text style={styles.label}>{t('connect:notAllowed')}</Text>
        <CategorizedPermission perms={denied} color={theme.color.disabled} />
      </View>
    </View>
  );
}

function PermIcon({name, style: iconStyle}: {name: string; style: TextStyle}) {
  switch (name) {
    case 'onchain':
      return <FAIcon style={iconStyle} name="chain" />;
    case 'offchain':
      return <MCIcon style={iconStyle} name="lightning-bolt" />;
    case 'address':
      return <FAIcon style={iconStyle} name="address-card" />;
    case 'message':
      return <MCIcon style={iconStyle} name="message-text" />;
    case 'peers':
      return <MCIcon style={iconStyle} name="resistor-nodes" />;
    case 'info':
      return <MCIcon style={iconStyle} name="information" />;
    case 'invoices':
      return <FA5Icon style={iconStyle} name="file-invoice" />;
    case 'signer':
      return <FA5Icon style={iconStyle} name="signature" />;
    case 'macaroon':
      return <MCIcon style={iconStyle} name="cookie" />;
    case 'url':
      return <FAIcon style={iconStyle} name="question" />;
    default:
      return <View />;
  }
}
function CategorizedPermission({perms, color}: {perms: MacPermission[]; color: string}) {
  const categories: {
    [entity in MacPermission['entity']]?: MacPermission['action'][];
  } = {};

  const {t} = useTranslation();
  const styles = useThemeAwareObject(createStyles);

  perms.forEach(p => {
    categories[p.entity] = [...(categories[p.entity] || []), p.action];
  });
  return (
    <>
      {Object.entries(categories).map(([e, as]) => (
        <View style={styles.category} key={e}>
          <PermIcon style={{...styles.icon, color}} name={e} />
          <View style={styles.perms}>
            {as.map(a => (
              <Text style={styles.permLabel} key={e + a}>
                {t(`permissions:${e}${a}`)}
              </Text>
            ))}
          </View>
        </View>
      ))}
    </>
  );
}

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    label: {
      paddingBottom: 8,
      fontFamily: typographyFonts.notoSansBold,
      fontSize: fontSizes.basic5,
      color: theme.color.textColor,
    },
    category: {
      flexDirection: 'row',
      marginVertical: 8,
      alignItems: 'center',
    },
    icon: {
      fontSize: 24,
      width: 32,
      marginRight: 12,
      textAlign: 'center',
    },
    perms: {},
    permLabel: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic6,
      color: theme.color.textColor,
    },
    container: {
      paddingBottom: 16,
      paddingHorizontal: 16,
    },
    iconContainer: {
      marginTop: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    nameContainer: {
      marginHorizontal: 8,
      flex: 1,
    },
    appName: {
      fontFamily: typographyFonts.notoSansBold,
      fontSize: fontSizes.basic4,
      color: theme.color.textColor,
    },
    appCategory: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic5,
      color: theme.color.textColor,
    },
    infoContainer: {
      marginVertical: 8,
    },
    infoTitle: {
      fontFamily: typographyFonts.notoSansBold,
      fontSize: fontSizes.basic5,
      color: theme.color.textColor,
      marginTop: 12,
      marginBottom: 2,
    },
    infoText: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic5,
      color: theme.color.textColor,
    },
    openUrl: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    buttonContainer: {
      marginVertical: 32,
      marginHorizontal: 32,
    },
    connectButton: {
      fontFamily: typographyFonts.notoSans,
      width: '100%',
      textAlign: 'center',
      fontSize: fontSizes.buttonLabel,
      color: theme.color.buttonTextColor,
      letterSpacing: 2,
    },
    revokeContainer: {
      marginTop: 16,
      marginBottom: 32,
      marginHorizontal: 32,
    },
    revokeButton: {
      fontFamily: typographyFonts.notoSans,
      width: '100%',
      textAlign: 'center',
      fontSize: fontSizes.buttonLabel,
      color: theme.color.tertiary,
      letterSpacing: 2,
    },
    allowContainer: {
      marginBottom: 16,
    },
  });
  return styles;
};
