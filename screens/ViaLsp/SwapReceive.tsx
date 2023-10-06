import Clipboard from '@react-native-clipboard/clipboard';
import {RouteProp, useFocusEffect, useIsFocused, useRoute} from '@react-navigation/native';

import {encode} from 'bip21';
import React, {useState} from 'react';

import {useTranslation} from 'react-i18next';
import {Text, View, StyleSheet, Share, Pressable} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import MIcon from 'react-native-vector-icons/MaterialIcons';

import {ScrollablePage} from 'components/projects/Page';

import {ModalTheme} from 'components/uiParts/Modal';
import {withStyle} from 'components/uiParts/Sat';
import {ParamList} from 'navigation/paramList';
import {Theme} from 'styles/theme/interface';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {defaultShadowProps, fontSizes, iconSizes, typographyFonts} from 'styles/variables';
import {duringCopying, submarineSwapCap} from 'tools/constants';
import Satoshi from 'types/Satoshi';

type SwapReceiveRouteProps = RouteProp<ParamList, 'SwapReceive'>;

const Info = withStyle({
  valueStyle: {
    fontFamily: typographyFonts.notoSans,
    fontSize: fontSizes.balanceLabel,
  },
  unitStyle: {
    fontFamily: typographyFonts.notoSans,
    fontSize: fontSizes.subBalanceValue,
    marginHorizontal: 4,
  },
  containerStyle: {
    justifyContent: 'center',
  },
  showSwapButton: false,
  overrideUnit: 'ANY_CRYPTO',
});

export default function SwapReceiveScreen() {
  const {params} = useRoute<SwapReceiveRouteProps>();
  const {t} = useTranslation();
  const styles = useThemeAwareObject(createStyles);

  const [visible, setVisible] = useState(false);
  const [copying, setCopying] = useState(false);

  const copy = () => {
    setCopying(true);
    Clipboard.setString(params.address);
    setTimeout(() => setCopying(false), duringCopying);
  };
  const share = () => {
    Share.share({
      message: params.address,
    }).catch(() => {
      // do nothing
    });
  };

  const toggleVisible = () => {
    visible ? setVisible(false) : setVisible(true);
  };

  const focused = useIsFocused();
  useFocusEffect(() => {
    if (!focused) {
      visible && setVisible(false);
    }
  });
  const qrCodeValue = encode(params.address, {label: ''});
  const minFee = Satoshi.fromSat(params.minFee);

  const qrContainer = !copying ? (
    <QRCode value={qrCodeValue} size={224} />
  ) : (
    <View style={styles.copyContainer}>
      <Text style={styles.copyText}>{t('copied')}</Text>
    </View>
  );

  return (
    <ScrollablePage title={t('qrscanner:deposit')}>
      <View style={styles.container}>
        <Pressable onPress={copy}>
          <View style={styles.qrcodeContainer}>{qrCodeValue ? qrContainer : null}</View>
        </Pressable>
        <View style={styles.cardContainer}>
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <View style={styles.iconRow}>
                <Text style={styles.infoText}>{t('viaLsp:minFee')}</Text>
                <Pressable onPress={toggleVisible} android_ripple={{color: '#ccc'}}>
                  <MIcon name="info-outline" size={iconSizes.basic2} style={styles.infoIcon} />
                </Pressable>
              </View>
              <Info value={minFee} />
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoText, {marginRight: 28}]}>{t('viaLsp:swapCap')}</Text>
              <Info value={Satoshi.fromSat(submarineSwapCap)} />
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.shareContainer}>
            <Pressable onPress={copy} android_ripple={{color: '#ccc'}} style={styles.shareButton}>
              <MIcon name="content-copy" size={iconSizes.basic2} style={styles.shareIcon} />
              <Text style={styles.iconText}>{t('copy')}</Text>
            </Pressable>
            <Pressable onPress={share} android_ripple={{color: '#ccc'}} style={styles.shareButton}>
              <MIcon name="share" size={iconSizes.basic2} style={styles.shareIcon} />
              <Text style={styles.iconText}>{t('share')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
      <ModalTheme
        visible={visible}
        closing={toggleVisible}
        title={t('viaLsp:whatFee')}
        children={
          <View style={styles.modalMsgContainer}>
            <Text style={styles.modalMsgText}>{t('viaLsp:swapFee', {feePercent: params.feePercent})}</Text>
          </View>
        }
      />
    </ScrollablePage>
  );
}

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    container: {
      marginVertical: 36,
      marginHorizontal: 24,
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
    infoContainer: {
      marginHorizontal: 48,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    infoText: {
      fontFamily: typographyFonts.notoSansBold,
      color: theme.color.textColor,
      fontSize: fontSizes.dictTableLabel,
    },
    iconRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    divider: {
      marginVertical: 24,
      alignSelf: 'center',
      width: '50%',
      borderRadius: 1,
      borderWidth: 1,
      borderColor: theme.color.textColor,
      borderStyle: 'dashed',
    },
    shareContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    shareButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 18,
    },
    infoIcon: {
      color: theme.color.textColor,
      marginLeft: 4,
      marginRight: 18,
    },
    shareIcon: {
      color: theme.color.textColor,
    },
    iconText: {
      color: theme.color.textColor,
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic5,
      marginLeft: 4,
    },
    cardContainer: {
      flexDirection: 'column',
      marginVertical: 24,
    },
    descriptionContainer: {
      alignItems: 'center',
      marginTop: 36,
    },
    dictTable: {
      margin: 8,
    },
    description: {
      fontFamily: typographyFonts.notoSans,
      color: theme.color.textColor,
      fontSize: fontSizes.dictTableLabel,
    },
    modalMsgContainer: {
      marginBottom: 24,
    },
    modalMsgText: {
      fontFamily: typographyFonts.notoSans,
      color: theme.color.textColor,
      fontSize: fontSizes.basic5,
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
