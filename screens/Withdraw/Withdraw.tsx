import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import React, {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {StyleSheet, Text, View} from 'react-native';

import * as lccontrol from 'bridge/lccontrol';
import {Alert, AlertButtonProps} from 'components/projects/AlertTheme';
import {ScrollablePage} from 'components/projects/Page';
import {Button} from 'components/uiParts/ButtonTheme';
import {HeaderButtonProps} from 'components/uiParts/Header';
import {ModalTheme} from 'components/uiParts/Modal';
import {Crypto} from 'components/uiParts/Sat/WithStyleParts';
import {ParamList} from 'navigation/paramList';
import {useStore} from 'store/storeContext';
import {Theme} from 'styles/theme/interface';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {fontSizes, typographyFonts} from 'styles/variables';
import {fromRawUrl, getWithdrawMetaData, parseLnurl, requestWithdraw, WithdrawMetaData} from 'tools/lnurl';
import {LOG} from 'tools/logging';
import Satoshi from 'types/Satoshi';

export function WithdrawScreen() {
  const navigation = useNavigation<StackNavigationProp<ParamList>>();
  const styles = useThemeAwareObject(createStyles);
  const {t} = useTranslation();
  const {
    params: {lnurl},
  } = useRoute<RouteProp<ParamList, 'Withdraw'>>();

  const [currentInboundCapacity, setCurrentInboundCapacity] = useState<Satoshi>();
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [withdrawMetaData, setWithdrawMetaData] = useState<WithdrawMetaData>();

  const [store] = useStore();

  const withdrawSats = withdrawMetaData?.maxWithdrawable;

  useEffect(() => {
    (async () => {
      await lccontrol.receiveMax().then(number => setCurrentInboundCapacity(Satoshi.fromSat(number)));
    })();
  }, []);

  useEffect(() => {
    (async () => {
      let url: URL;

      try {
        if (!lnurl) throw new Error('lnurl not found');
        url = new URL(parseLnurl(lnurl));

        // When url search param contains 'withdrawRequest' as 'tag' value, it may conpatible with a fast withdrawal.
        // Ref. https://github.com/lnurl/luds/blob/luds/08.md
        if (url.searchParams.get('tag') === 'withdrawRequest') {
          const dataFromUrlParams = fromRawUrl(url);
          if (dataFromUrlParams) {
            setWithdrawMetaData(dataFromUrlParams);
            return;
          }
        } else if (url.searchParams.get('tag') != null) {
          setErrorMessage(t('withdraw:incompatibleLnurl'));
          return;
        }
      } catch (error) {
        LOG.error('Failed to process given LNURL:', error);
        setErrorMessage(t('withdraw:processLnurlFailed'));
        return;
      }

      try {
        const resp = await getWithdrawMetaData(url);
        setWithdrawMetaData(resp);
      } catch (error) {
        LOG.error('Failed to getMetaData from lnurl server:', error);
        setErrorMessage(t('withdraw:getWithdrawFailed'));
      }
    })();
  }, [lnurl, t]);

  useEffect(() => {
    if (withdrawMetaData == null) return;
    if (currentInboundCapacity == null) return;
    if (withdrawMetaData?.maxWithdrawable.toNumber() > currentInboundCapacity.toNumber()) {
      setErrorMessage(
        t('withdraw:lackOfInboundCapacity', {receivableAmount: currentInboundCapacity.toString() + ' ' + t(`currencyUnit:${store.crypto}`)}),
      );
    }
  }, [withdrawMetaData, currentInboundCapacity, setErrorMessage, t, store]);

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

  const headerLeft: HeaderButtonProps = {
    isAlter: true,
    pressed: () => {
      navigation.canGoBack()
        ? navigation.goBack()
        : navigation.reset({
            index: 0,
            routes: [{name: 'Root'}],
          });
    },
    iconName: 'close',
  };

  const headerRight: HeaderButtonProps = {
    isAlter: true,
    pressed: () => {
      setInfoMessage(t('withdraw:withdrawaFeatureDescription'));
    },
    iconName: 'info-outline',
    color: styles.infoIcon.color,
  };

  return (
    <ScrollablePage title={t('withdraw:title')} headerLeft={headerLeft} headerRight={headerRight} hideBackButton={true}>
      <View style={styles.container}>
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionTitle}>{t('withdraw:source', {source: withdrawMetaData?.callback.hostname})}</Text>
          <Text style={styles.description}>{withdrawMetaData?.defaultDescription}</Text>
        </View>
        <View style={styles.amountContainer}>
          <Text style={styles.descriptionTitle}>{t('withdraw:amount')}</Text>
          <Crypto value={withdrawSats} />
        </View>
        <Button
          onPress={async () => {
            if (withdrawMetaData == null) {
              LOG.error('withdrawMetaData not found');
              setErrorMessage(t('errUnknown'));
              return;
            }
            if (currentInboundCapacity == null) {
              LOG.error('currentInboundCapacity not found');
              setErrorMessage(t('errUnknown'));
              return;
            }

            const amount = withdrawMetaData.maxWithdrawable.toNumber();
            let maxReceivable: number;
            try {
              maxReceivable = await lccontrol.receiveMax();
            } catch (error) {
              LOG.error(error);
              setErrorMessage(t('errUnknown'));
              return;
            }

            if (amount > maxReceivable) {
              t('withdraw:lackOfInboundCapacity', {receivableAmount: currentInboundCapacity.toString() + ' ' + t(`currencyUnit:${store.crypto}`)});
            }

            try {
              await requestWithdraw(withdrawMetaData).then(() => {
                setRequestSuccess(true);
              });
            } catch (err) {
              LOG.error('Error on request withdraw:', err);
              setErrorMessage(t('withdraw:requestWithdrawFailed', {domain: withdrawMetaData?.callback.hostname}));
            }
          }}
          style={styles.button}
          disabled={withdrawMetaData == null || requestSuccess}>
          <Text style={styles.buttonLabel}>{t('withdraw:execute')}</Text>
        </Button>
      </View>
      <Alert isAlertVisible={errorMessage !== ''} title={t('error')} message={errorMessage} button={backToHome} />
      <Alert
        isAlertVisible={requestSuccess}
        title={t('success')}
        message={t('withdraw:requestSuccessMessage', {domain: withdrawMetaData?.callback.hostname})}
        button={backToHome}
      />
      <ModalTheme
        visible={!!infoMessage}
        closing={() => setInfoMessage('')}
        title={t('withdraw:aboutWithdraw')}
        children={
          <View style={styles.modalMsgContainer}>
            <Text style={styles.modalMsgText}>{infoMessage}</Text>
          </View>
        }
      />
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
  });
  return styles;
};
