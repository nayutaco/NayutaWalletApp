import Clipboard from '@react-native-clipboard/clipboard';
import {RouteProp, useRoute} from '@react-navigation/native';

import {encode} from 'bip21';
import React, {ReactNode, useState} from 'react';

import {useTranslation} from 'react-i18next';

import {Text, View, StyleSheet, Share, Pressable} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import MIcon from 'react-native-vector-icons/MaterialIcons';

import {DateTime} from 'components/projects/DateTime';
import {ScrollablePage} from 'components/projects/Page';
import {Card} from 'components/uiParts/Card';
import DictTable from 'components/uiParts/DictTable';
import DictTableItem from 'components/uiParts/DictTable/Item';

import {withStyle} from 'components/uiParts/Sat';
import {ParamList} from 'navigation/paramList';
import {Theme} from 'styles/theme/interface';
import {useTheme} from 'styles/theme/themeContext';
import {useThemeAwareObject} from 'styles/theme/themeHook';

import {defaultShadowProps, fontSizes, iconSizes, typographyFonts} from 'styles/variables';
import {duringCopying} from 'tools/constants';
import Satoshi from 'types/Satoshi';

type ReceiveRouteProps = RouteProp<ParamList, 'ReceiveDetail'>;

const Fiat = withStyle({
  valueStyle: {
    fontSize: fontSizes.subBalanceValue,
  },
  unitStyle: {
    fontSize: fontSizes.subBalanceValue,
    marginHorizontal: 4,
  },
  containerStyle: {
    justifyContent: 'center',
  },
  showSwapButton: false,
  overrideUnit: 'ANY_FIAT',
});
const Crypto = withStyle({
  valueStyle: {
    fontSize: fontSizes.balanceValue,
    fontWeight: 'bold',
  },
  unitStyle: {
    fontSize: fontSizes.balanceValue,
    marginHorizontal: 4,
  },
  containerStyle: {
    justifyContent: 'center',
  },
  showSwapButton: false,
  overrideUnit: 'ANY_CRYPTO',
});

export const ReceiveDetailScreen = () => {
  const {params} = useRoute<ReceiveRouteProps>();
  const {t} = useTranslation();
  const {theme} = useTheme();
  const styles = useThemeAwareObject(createStyles);

  const [visible, setVisible] = useState(false);
  const [copying, setCopying] = useState(false);

  let qrCodeValue = '';
  let copyValue = '';
  let shareValue = '';
  let card: ReactNode | null;

  const copy = () => {
    setCopying(true);
    Clipboard.setString(copyValue);
    setTimeout(() => setCopying(false), duringCopying);
  };
  const share = () => {
    Share.share({
      url: shareValue, // seems iOS only
      message: shareValue,
    }).catch(() => {
      // do nothing
    });
  };
  const toggleVisible = () => {
    visible ? setVisible(false) : setVisible(true);
  };

  if ('address' in params) {
    qrCodeValue = encode(params.address, {
      amount: params.amount ? Satoshi.fromSat(params.amount).toBTC().toString() : undefined,
      message: params.message,
    });
    copyValue = params.address;
    shareValue = qrCodeValue;
    card = null;
  } else {
    qrCodeValue = params.invoice;
    copyValue = params.invoice;
    shareValue = qrCodeValue;
    const satAmt = Satoshi.fromSat(params.amount);
    card = (
      <Card innerStyle={styles.cardInner} noShadow>
        <View style={styles.cardContainer}>
          <View style={styles.shareContainer}>
            <View style={styles.lnAmount}>
              <Crypto value={satAmt} />
              <Fiat value={satAmt} />
            </View>
            <Pressable onPress={copy} android_ripple={{color: '#ccc'}} style={styles.shareButton}>
              <MIcon name="content-copy" size={iconSizes.basic2} style={styles.icon} />
            </Pressable>
            <Pressable onPress={share} android_ripple={{color: '#ccc'}} style={styles.shareButton}>
              <MIcon name="share" size={iconSizes.basic2} style={styles.icon} />
            </Pressable>
          </View>
          <View style={styles.plus}>
            <Pressable
              onPress={toggleVisible}
              android_ripple={{color: '#ccc'}}
              style={styles.plusButton}
              hitSlop={{
                bottom: 200,
                left: 200,
                right: 200,
                top: 0,
              }}>
              {visible ? (
                <MIcon name="arrow-drop-up" size={iconSizes.basic2} style={styles.icon} />
              ) : (
                <MIcon name="arrow-drop-down" size={iconSizes.basic2} style={styles.icon} />
              )}
            </Pressable>
          </View>
          {visible && (
            <>
              <DictTable style={styles.dictTable}>
                <DictTableItem label={t('receive:expiration')}>
                  <DateTime timestamp={params.expiresIn} style={styles.datetime} />
                </DictTableItem>
                <DictTableItem label={t('description')}>
                  <Text style={[styles.description, !params.description && {color: theme.color.textColorTranslucent}]}>
                    {params.description ? params.description : t('noDescription')}
                  </Text>
                </DictTableItem>
              </DictTable>
            </>
          )}
        </View>
      </Card>
    );
  }

  const qrContainer = !copying ? (
    <QRCode value={qrCodeValue} size={224} />
  ) : (
    <View style={styles.copyContainer}>
      <Text style={styles.copyText}>{t('copied')}</Text>
    </View>
  );

  return (
    <ScrollablePage title={t('receive:detailLn')}>
      <View style={styles.container}>
        <Pressable onPress={copy}>
          <View style={styles.qrcodeContainer}>{qrCodeValue ? qrContainer : null}</View>
        </Pressable>
        {card}
      </View>
    </ScrollablePage>
  );
};

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    container: {
      marginVertical: 36,
    },
    qrcodeContainer: {
      alignSelf: 'center',
      width: 256,
      height: 256,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.color.white,
      ...defaultShadowProps,
    },
    shareContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    shareButton: {
      marginHorizontal: 6,
    },
    plusButton: {
      marginHorizontal: 6,
      backgroundColor: theme.color.headerBackGround,
      width: '20%',
      alignItems: 'center',
      borderRadius: 25,
    },
    icon: {
      color: theme.color.textColor,
    },
    plus: {
      alignItems: 'center',
      marginBottom: 12,
    },
    datetime: {
      fontFamily: typographyFonts.notoSans,
      color: theme.color.textColor,
      fontSize: fontSizes.dictTableLabel,
    },
    cardInner: {
      padding: 0,
      marginVertical: 24,
    },
    cardContainer: {
      flexDirection: 'column',
    },
    lnAmount: {
      padding: 16,
    },
    dictTable: {
      margin: 8,
    },
    description: {
      fontFamily: typographyFonts.notoSans,
      color: theme.color.textColor,
      fontSize: fontSizes.dictTableLabel,
    },
    copyContainer: {
      borderRadius: 8,
      backgroundColor: theme.color.textBackground,
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    copyText: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic4,
      color: theme.color.primary,
    },
  });
  return styles;
};
