import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import React, {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {StyleSheet, View, Text, NativeModules, Pressable, KeyboardAvoidingView, Platform} from 'react-native';
import MIcon from 'react-native-vector-icons/MaterialIcons';

import {payBtc} from 'bridge/payment';
import {ScrollablePage} from 'components/projects/Page';
import {Button} from 'components/uiParts/ButtonTheme';
import Input from 'components/uiParts/Input';
import {withStyle} from 'components/uiParts/Sat';
import useBottomSheet from 'hooks/useBottomSheet';
import {useLND} from 'hooks/useLND';
import {ParamList} from 'navigation/paramList';
import {Theme} from 'styles/theme/interface';
import {useTheme} from 'styles/theme/themeContext';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {fontSizes, iconSizes, typographyFonts} from 'styles/variables';
import * as submarine from 'submarine';
import {btcAddressValidate, getEstimateFee} from 'tools/btctools';
import {labelRefundBtc} from 'tools/const-labels';
import {refundMinimumAmount} from 'tools/constants';
import {LOG} from 'tools/logging';
import Satoshi from 'types/Satoshi';

const Crypto = withStyle({
  valueStyle: {
    fontSize: fontSizes.basic4,
    fontWeight: 'bold',
  },
  unitStyle: {
    fontSize: fontSizes.basic4,
    marginHorizontal: 4,
  },
  containerStyle: {
    justifyContent: 'center',
    marginTop: 8,
  },
  showSwapButton: false,
  overrideUnit: 'ANY_CRYPTO',
});

type Props = RouteProp<ParamList, 'Refund'>;
export function RefundScreen() {
  const navigation = useNavigation<StackNavigationProp<ParamList>>();
  const {params} = useRoute<Props>();
  const {t} = useTranslation();
  const {theme} = useTheme();
  const styles = useThemeAwareObject(createStyles);
  const {show} = useBottomSheet();
  const {status} = useLND();

  const [address, setAddress] = useState((params && 'address' in params && params.address) || '');

  const [loading, setLoading] = useState(false);
  const [errorBtc, setErrorBtc] = useState('');
  const [refundSat, setRefundSat] = useState(Satoshi.fromSat(0));

  const [estimatedFee, setEstimatedFee] = useState(Satoshi.fromSat(0));
  useEffect(() => {
    let isUnmounted = false;
    (async () => {
      const ret = await getEstimateFee(status?.blockHeight ?? 0);
      const refund = await submarine.repaymentAmount(status?.blockHeight ?? 0);
      if (isUnmounted) return;
      LOG.info(`feerate: ${JSON.stringify(ret)}`);
      setEstimatedFee(ret.medium);
      setRefundSat(status?.balance?.onChain.confirmed.add(Satoshi.fromSat(refund)) ?? Satoshi.fromSat(0));
    })();
    return () => {
      isUnmounted = true;
    };
  }, [status]);

  const goToQrScanner = () => {
    navigation.navigate('QrScanner');
  };

  const confirm = async () => {
    setErrorBtc('');
    if (!btcAddressValidate(address, NativeModules.AppConfig.NETWORK)) {
      setErrorBtc(t('qrscanner:invalidAddr'));
      return;
    }
    const swapAddrs = await submarine.swapAddresses();
    for (let idx = 0; idx < swapAddrs.length; idx++) {
      if (address === swapAddrs[idx]) {
        setErrorBtc(t('send:swapAddress'));
        return;
      }
    }
    setLoading(true);
    try {
      if ((status?.balance?.onChain.confirmed.toNumber() ?? 0) >= refundMinimumAmount) {
        await payBtc(address, true, estimatedFee, undefined, labelRefundBtc);
      }
      if ((await submarine.repaymentAmount(status?.blockHeight ?? 0)) >= refundMinimumAmount) {
        await submarine.repayment(address, status?.blockHeight ?? 0);
      }
      const dismiss = show({
        title: t('success'),
        titleColor: theme.color.textColor,
        message: t('send:repaymentSuccess'),
        buttons: [
          {
            text: t('home'),
            onPress: () => {
              dismiss();
              navigation.reset({
                index: 0,
                routes: [{name: 'Root'}],
              });
            },
            style: 'cancel',
          },
        ],
      });
    } catch (e: any) {
      LOG.error(`payment: ${e}`);
      show({
        title: t('failure'),
        message: t('send:errorWithMsg', {message: e.message || ''}),
        buttons: [
          {
            text: t('close'),
            style: 'cancel',
          },
        ],
      });
    }
    setLoading(false);
  };

  return (
    <ScrollablePage title={t('home:refundTitle')}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionTitle}>{t('procedure')}</Text>
          <Text style={styles.description}>{t('send:refundDescription')}</Text>
        </View>
        <View style={styles.amountContainer}>
          <Text style={styles.descriptionTitle}>{t('send:totalRefundAmount')}</Text>
          {refundSat.toNumber() !== 0 ? <Crypto value={refundSat} /> : <Text style={styles.dummyRefundAmount}>---</Text>}
        </View>
        <View style={styles.form}>
          <Input
            onChange={setAddress}
            value={address}
            placeholder={t('send:btcAddr')}
            error={errorBtc}
            right={
              <Pressable onPress={goToQrScanner} style={styles.iConContainer}>
                <MIcon name="qr-code-scanner" size={iconSizes.basic2} style={styles.icon} />
              </Pressable>
            }
          />
        </View>
        <Button onPress={confirm} loading={loading} loadingIconSize={25.1} style={styles.button} disabled={refundSat.toNumber() === 0}>
          <Text style={styles.buttonLabel}>{t('execute')}</Text>
        </Button>
      </KeyboardAvoidingView>
    </ScrollablePage>
  );
}

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
    },
    descriptionContainer: {
      marginVertical: 16,
    },
    descriptionTitle: {
      color: theme.color.textColor,
      fontFamily: typographyFonts.notoSansBold,
      fontSize: fontSizes.basic5,
    },
    description: {
      color: theme.color.textColor,
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic5,
    },
    dummyRefundAmount: {
      color: theme.color.textColor,
      fontFamily: typographyFonts.notoSansBold,
      fontSize: fontSizes.basic4,
      alignSelf: 'center',
      paddingVertical: 3,
    },
    amountContainer: {
      marginVertical: 16,
    },
    form: {
      flexDirection: 'row',
      paddingVertical: 16,
      marginBottom: 16,
    },
    iConContainer: {
      marginLeft: 8,
    },
    icon: {
      color: theme.color.textColor,
      width: '100%',
    },
    button: {
      marginHorizontal: 56,
    },
    buttonLabel: {
      fontFamily: typographyFonts.notoSans,
      width: '100%',
      textAlign: 'center',
      fontSize: fontSizes.buttonLabel,
      color: theme.color.buttonTextColor,
      letterSpacing: 4,
    },
  });
  return styles;
};
