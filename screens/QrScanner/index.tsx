import Clipboard from '@react-native-clipboard/clipboard';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import React, {useState, useRef, useCallback} from 'react';
import {useTranslation} from 'react-i18next';
import {View, StyleSheet, Text, ActivityIndicator, AppState, SafeAreaView, Vibration} from 'react-native';
import {Camera, CameraApi, CameraType} from 'react-native-camera-kit';
import {RESULTS, openSettings} from 'react-native-permissions';

import {confirmMaximumAmount} from 'bridge/payment';
import {Alert, AlertButtonProps} from 'components/projects/AlertTheme';
import {Button} from 'components/uiParts/ButtonTheme';
import Header from 'components/uiParts/Header';
import {useLND} from 'hooks/useLND';
import {LnInvoiceResponse, ParamList} from 'navigation/paramList';
import {useStore} from 'store/storeContext';
import {Theme} from 'styles/theme/interface';
import {useTheme} from 'styles/theme/themeContext';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {typographyFonts, fontSizes} from 'styles/variables';
import {repaymentAmount} from 'submarine';
import {lnMinFeeSats, refundMinimumAmount} from 'tools/constants';
import {LOG} from 'tools/logging';
import {checkCameraPermission, requestCameraPermission} from 'tools/permission';
import {qrResolver} from 'tools/qrresolver';

import Satoshi from 'types/Satoshi';

export default function QrScanner() {
  const navigation = useNavigation<StackNavigationProp<ParamList>>();
  const {t} = useTranslation();
  const {theme} = useTheme();
  const styles = useThemeAwareObject(createStyles);
  const [store] = useStore();

  const [loading, setLoading] = useState(false);
  const [alertIndex, setAlertIndex] = useState(0);
  const [readError, setReadError] = useState('');
  const [cameraEnabled, setCameraEnabled] = useState(false);

  const {status} = useLND();

  const cameraRef = useRef<CameraApi>(null);

  useFocusEffect(
    useCallback(() => {
      const subscription = AppState.addEventListener('change', nextAppState => {
        if (nextAppState === 'background' || nextAppState === 'inactive') {
          setLoading(false);
          setAlertIndex(0);
        }
      });
      return () => {
        subscription.remove();
      };
    }, []),
  );

  const balanceAlertButton: AlertButtonProps[] = [
    {
      text: t('close'),
      style: 'submit',
      onPress: () => {
        setAlertIndex(0);
      },
    },
  ];

  const readErrorAlertButton: AlertButtonProps[] = [
    {
      text: t('close'),
      style: 'submit',
      onPress: () => {
        setAlertIndex(0);
        setReadError('');
      },
    },
  ];

  const permissionDeniedAlertButton: AlertButtonProps[] = [
    {
      text: t('cancel'),
      style: 'cancel',
      onPress: () => {
        setAlertIndex(0);
      },
    },
    {
      text: t('permissions:alertGoToSettingButton'),
      style: 'submit',
      onPress() {
        setAlertIndex(0);
        (async () => await openSettings())();
      },
    },
  ];

  useFocusEffect(() => {
    (async () => {
      const permissionResult = await checkCameraPermission();
      if (permissionResult[0]) {
        setCameraEnabled(true);
      }
    })();
  });

  const submitRequestPermission = async () => {
    const permissionResult = await checkCameraPermission();
    if (permissionResult[1] === RESULTS.UNAVAILABLE) {
      setAlertIndex(3);
    }
    const requestResult = await requestCameraPermission();
    if (requestResult) {
      setCameraEnabled(true);
    } else {
      setAlertIndex(4);
    }
  };

  const actionBtcSend = async (address: string) => {
    setLoading(false);

    const onchainBalance = status?.balance?.onChain.confirmed.toNumber() ?? 0;
    const swapRefund = await repaymentAmount(status?.blockHeight ?? 0);
    if (onchainBalance >= refundMinimumAmount || swapRefund >= refundMinimumAmount) {
      navigation.reset({
        index: 0,
        routes: [{name: 'Root'}, {name: 'Refund', params: {screen: 'Refund', address}}],
      });
    } else {
      setAlertIndex(1);
    }
  };

  const actionLnInvoice = (invoice: string, decoded: LnInvoiceResponse) => {
    if (!status?.channels) {
      setReadError(t('send:notExistChannel'));
      return;
    }
    if (decoded.num_msat === '') {
      decoded.num_msat = '0';
    }
    const sendAmount = Satoshi.fromMilliSat(decoded.num_msat);
    // maxFee is at least 1 satoshi
    const maxFee = Satoshi.max(sendAmount.mul(store.maxFeeRate / 100), Satoshi.fromSat(lnMinFeeSats));
    const maxStruck = confirmMaximumAmount(status.channels, sendAmount, maxFee);
    navigation.navigate('Root', {invoice: invoice, decoded: decoded, maxStruck: maxStruck});
  };

  const paste = async () => {
    onRead(await Clipboard.getString());
  };

  const onRead = async (data: string) => {
    setLoading(true);
    Vibration.vibrate(100);
    setReadError('');
    LOG.trace(`onRead: ${data}`);
    try {
      const qrType = await qrResolver(data);
      switch (qrType.type) {
        case 'bitcoin':
          actionBtcSend(qrType.address);
          break;
        case 'lninvoice':
          actionLnInvoice(qrType.invoice, qrType.decoded);
          break;
        case 'lnurl':
          navigation.navigate('LNURLPay', {decodedLNURL: qrType.decoded});
          break;
        case 'lnnode':
          setReadError(t('qrscanner:nodeNotSupported'));
          setAlertIndex(2);
          break;
        default:
          setReadError(`default: ${JSON.stringify(qrType)}`);
          setAlertIndex(2);
          break;
      }
    } catch (e: any) {
      setReadError(`${t(e.message)}${e.name && e.name !== 'Error' ? '\n\n' + e.name : ''}`);
      setAlertIndex(2);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View>
        <Header headerStyle={styles.header}>{t('qrscanner:header')}</Header>
        <View style={styles.container}>
          {/* the following codes prevent that camera cannot read anything consecutively. */}
          {!loading && alertIndex === 0 ? (
            <>
              <View style={styles.cameraContainer}>
                {cameraEnabled ? (
                  <Camera
                    style={styles.camera}
                    ref={cameraRef}
                    cameraType={CameraType.Back}
                    flashMode="off"
                    zoomMode="off"
                    scanBarcode={true}
                    onReadCode={(event: {nativeEvent: {codeStringValue: string}}) => onRead(event.nativeEvent.codeStringValue)}
                  />
                ) : (
                  <View style={styles.permissionContainer}>
                    <View style={styles.permissionCard}>
                      <Text style={styles.permissionText}>{t('qrscanner:requestPermission')}</Text>
                      <Button onPress={submitRequestPermission} style={styles.permissionButton}>
                        <Text style={styles.permissionButtonText}>{t('enable')}</Text>
                      </Button>
                    </View>
                  </View>
                )}
              </View>
              <View style={styles.footer}>
                <Button outline onPress={paste} style={styles.bottomButton}>
                  <Text style={styles.bottomButtonText}>{t('qrscanner:paste')}</Text>
                </Button>
              </View>
            </>
          ) : (
            <View style={styles.modalBackground}>
              <View style={styles.dialog}>
                <View style={styles.spinnerArea}>
                  <ActivityIndicator size="large" color={theme.color.textColor} />
                </View>
                <Text style={styles.loadingText}>{t('loading')}</Text>
              </View>
            </View>
          )}
          <Alert isAlertVisible={alertIndex === 1} title={t('error')} message={t('qrscanner:alertOnchainBalance')} button={balanceAlertButton} />
          <Alert isAlertVisible={alertIndex === 2} title={t('error')} message={readError} button={readErrorAlertButton} />
          <Alert
            isAlertVisible={alertIndex === 3}
            title={t('attention')}
            message={t('permissions:alertUnavailableCamera')}
            closing={() => setAlertIndex(0)}
          />
          <Alert
            isAlertVisible={alertIndex === 4}
            title={t('attention')}
            message={t('permissions:alertCameraText')}
            button={permissionDeniedAlertButton}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.color.black,
    },
    header: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
    },
    container: {
      height: '100%',
      backgroundColor: 'black',
    },
    permissionContainer: {
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.color.disabled,
    },
    permissionCard: {
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 16,
      backgroundColor: theme.color.modal,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.color.primary,
    },
    permissionText: {
      marginHorizontal: 36,
      marginTop: 24,
      fontFamily: typographyFonts.notoSans,
      color: theme.color.textColor,
      fontSize: fontSizes.checkText,
    },
    permissionButton: {
      marginTop: 12,
      marginBottom: 24,
    },
    permissionButtonText: {
      fontFamily: typographyFonts.notoSans,
      color: theme.color.buttonTextColor,
      fontSize: fontSizes.buttonLabel,
      letterSpacing: 4,
      margin: 4,
    },
    cameraContainer: {
      justifyContent: 'center',
      width: '100%',
    },
    camera: {
      height: '100%', // covers the whole screen
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      position: 'absolute',
      backgroundColor: theme.color.transparent,
      bottom: 0,
      width: '100%',
      paddingBottom: 80,
    },
    bottomButton: {
      marginHorizontal: 8,
      borderColor: theme.color.white,
    },
    bottomButtonText: {
      fontFamily: typographyFonts.notoSans,
      color: theme.color.buttonTextColor,
      fontSize: fontSizes.buttonLabel,
      letterSpacing: 4,
      margin: 4,
    },
    modalBackground: {
      backgroundColor: theme.color.modalBackground,
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    dialog: {
      backgroundColor: theme.color.modal,
      padding: 20,
      borderRadius: 20,
      flexDirection: 'column',
      alignItems: 'center',
    },
    dismissButton: {
      marginTop: 12,
    },
    dismissButtonText: {
      fontFamily: typographyFonts.notoSans,
      width: '100%',
      textAlign: 'center',
      fontSize: fontSizes.basic6,
      color: theme.color.textColor,
      letterSpacing: 4,
    },
    spinnerArea: {
      padding: 10,
      width: 30,
    },
    loadingText: {
      fontFamily: typographyFonts.notoSansBold,
      textAlign: 'center',
      fontSize: fontSizes.basic6,
      color: theme.color.textColor,
      letterSpacing: 4,
    },
    errorContainer: {
      width: '65%',
      alignItems: 'center',
    },
    title: {
      fontFamily: typographyFonts.notoSansBold,
      fontSize: fontSizes.basic4,
      color: theme.color.textColor,
    },
    description: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic5,
      color: theme.color.textColor,
      marginVertical: 10,
    },
  });
  return styles;
};
