import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import React, {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {StyleSheet, Text, View} from 'react-native';

import {confirmMaximumAmount, decodePayReq} from 'bridge/payment';
import {Alert, AlertButtonProps} from 'components/projects/AlertTheme';
import {ScrollablePage} from 'components/projects/Page';
import TextInputForm from 'components/projects/TextInputForm';
import {Button} from 'components/uiParts/ButtonTheme';
import {HeaderButtonProps} from 'components/uiParts/Header';
import {useLND} from 'hooks/useLND';
import {ParamList} from 'navigation/paramList';
import {useStore} from 'store/storeContext';
import {Theme} from 'styles/theme/interface';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {fontSizes, typographyFonts} from 'styles/variables';
import * as constants from 'tools/constants';
import {PaymentData, getMetaData, getPaymentData, isInSendableRange, requestInvoice} from 'tools/lnurlPayRequest';
import {LOG} from 'tools/logging';
import Satoshi from 'types/Satoshi';

export function LnurlPayScreen() {
  const navigation = useNavigation<StackNavigationProp<ParamList>>();
  const styles = useThemeAwareObject(createStyles);
  const {t} = useTranslation();
  const [store] = useStore();
  const {status} = useLND();
  const {
    params: {decodedLNURL},
  } = useRoute<RouteProp<ParamList, 'LNURLPay'>>();

  const [paymentData, setPaymentData] = useState<PaymentData>();
  const [sendAmount, setSendAmount] = useState<Satoshi>();
  const [defaultSendAmount, setDefaultSendAmount] = useState<Satoshi>();
  const [inputErrorMessage, setInputErrorMessage] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  const url = new URL(decodedLNURL);

  const headerLeft: HeaderButtonProps = {
    isAlter: true,
    pressed: () => {
      navigation.reset({
        index: 0,
        routes: [{name: 'Root'}],
      });
    },
    iconName: 'close',
  };

  const backToHome: AlertButtonProps[] = [
    {
      text: t('home'),
      style: 'submit',
      onPress: () => {
        navigation.reset({
          index: 0,
          routes: [{name: 'Root'}],
        });
      },
    },
  ];

  useEffect(() => {
    (async () => {
      try {
        if (!decodedLNURL) throw new Error('lnurl not found');

        const resp = await getPaymentData(new URL(decodedLNURL));

        if (resp.maxSendable.toNumber() < 1) {
          setAlertMessage(t('lnurlPay:amountLessThanSat'));
          return;
        }
        if (resp.minSendable.toNumber() === resp.maxSendable.toNumber()) {
          setSendAmount(resp.minSendable);
          setDefaultSendAmount(resp.minSendable);
        }

        setPaymentData(resp);
      } catch (err) {
        if (err instanceof Error) {
          LOG.error('Failed to get payment metadata from lnurl server:', err.message);
          if (err.name === 'AbortError') {
            setAlertMessage(t('lnurlPay:requestTimeout'));
            return;
          }
        }

        setAlertMessage(t('lnurlPay:unexpectedError'));
        return;
      }
    })();
  }, [decodedLNURL, t]);

  const executePaymentProcess = async () => {
    try {
      setPaymentProcessing(true);

      if (!paymentData) {
        LOG.error('paymentData is not exist');
        setInputErrorMessage(t('lnurlPay:unexpectedError'));
        return;
      }
      if (!sendAmount) {
        LOG.error('sendAmount is not exist');
        setInputErrorMessage(sendAmountRangeMessage(paymentData));
        return;
      }
      if (!status?.channels) {
        LOG.error('Failed to get channel info from LND');
        setInputErrorMessage(t('lnurlPay:unexpectedError'));
        return;
      }
      if (!isInSendableRange(sendAmount, paymentData)) {
        LOG.error('Input amount is out of range');
        setInputErrorMessage(sendAmountRangeMessage(paymentData));
        return;
      }

      const invoice = await requestInvoice(paymentData, sendAmount).catch(err => {
        if (err instanceof Error) {
          LOG.error('Failed to get invoice from lnurl server:', err.message);
          if (err.name === 'AbortError') {
            setAlertMessage(t('lnurlPay:requestTimeout'));
            return;
          }
        }
        throw err;
      });
      if (!invoice) return;

      const decodedInvoice = await decodePayReq(invoice).catch(err => {
        LOG.error('Failed to decode invoice:', err.message);
        setAlertMessage(t('lnurlPay:invalidInvoice'));
      });
      if (!decodedInvoice) return;

      const maxFee = Satoshi.max(sendAmount.mul(store.maxFeeRate / 100), Satoshi.fromSat(constants.lnMinFeeSats));
      const maxStruck = confirmMaximumAmount(status.channels, sendAmount, maxFee);

      navigation.navigate('Root', {invoice, decoded: decodedInvoice, maxStruck: maxStruck});
    } catch (err) {
      LOG.error('Unexpected error occured:', err instanceof Error ? err.message : err);
      setAlertMessage(t('lnurlPay:unexpectedError'));
    } finally {
      setPaymentProcessing(false);
    }
  };

  const sendAmountRangeMessage = (payment: PaymentData) => {
    const minAmount = store.crypto === 'btc' ? payment.minSendable.toBTC() : payment.minSendable;
    const maxAmount = store.crypto === 'btc' ? payment.maxSendable.toBTC() : payment.maxSendable;

    return t('lnurlPay:sendAmountRange', {minAmount, maxAmount});
  };

  const changeHandler = (value: Satoshi | null) => {
    if (!value) return;
    setSendAmount(value);
  };

  return (
    <ScrollablePage title={t('lnurlPay:title')} headerLeft={headerLeft} hideBackButton={true}>
      <View style={styles.container}>
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionTitle}>{t('lnurlPay:destination', {destination: url.hostname})}</Text>
          <Text style={styles.description}>{paymentData?.metadata ? getMetaData(paymentData.metadata, 'text/plain') : ''}</Text>
        </View>
        <TextInputForm
          autoFocus
          satInput
          onChange={changeHandler}
          placeholder={t('amount')}
          keyboardType="numeric"
          error={inputErrorMessage}
          defaultValue={store.crypto === 'btc' ? defaultSendAmount?.toBTC().toString() : defaultSendAmount?.toString() ?? ''}
          disabled={!!defaultSendAmount}
        />
        <Button
          onPress={executePaymentProcess}
          loading={paymentProcessing}
          loadingIconSize={25.1}
          style={styles.button}
          disabled={sendAmount == null || sendAmount?.toNumber() <= 0 || paymentProcessing}>
          <Text style={styles.buttonLabel}>{t('lnurlPay:sendPayment')}</Text>
        </Button>
      </View>
      <Alert isAlertVisible={alertMessage !== ''} title={t('error')} message={alertMessage} button={backToHome} />
    </ScrollablePage>
  );
}

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    container: {
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
    amountContainer: {
      marginVertical: 16,
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
    infoIcon: {
      color: theme.color.textColor,
    },
    modalMsgContainer: {
      marginBottom: 24,
    },
    modalMsgText: {
      fontFamily: typographyFonts.notoSans,
      color: theme.color.textColor,
      fontSize: fontSizes.basic5,
    },
    form: {
      flexDirection: 'row',
      paddingVertical: 16,
      marginBottom: 16,
    },
  });
  return styles;
};
