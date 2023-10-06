import {useFocusEffect, useNavigation} from '@react-navigation/native';
import React, {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {View, Text, StyleSheet, Pressable, Animated, ActivityIndicator, AppState} from 'react-native';
import MIcon from 'react-native-vector-icons/MaterialIcons';

import {Alert as AlertTheme, AlertButtonProps} from 'components/projects/AlertTheme';
import Page from 'components/projects/Page';
import {TxItem} from 'components/projects/TxItem/TxItem';
import {HeaderButtonProps} from 'components/uiParts/Header';
import {Theme} from 'styles/theme/interface';
import {useTheme} from 'styles/theme/themeContext';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {fontSizes, typographyFonts} from 'styles/variables';
import {writeLnTxHistory} from 'tools';
import {LOG} from 'tools/logging';
import * as txhistory from 'txhistory';

/**
 * Return Transacrion List screen
 * @returns {JSX.Element} Transacrion List Screen
 */
export const TransactionListScreen = () => {
  const {t} = useTranslation();
  const {theme} = useTheme();
  const styles = useThemeAwareObject(createStyles);
  const navigation = useNavigation();

  const [descent, setDescent] = useState(true);
  const [isTxHistoryLoading, setIsTxHistoryLoading] = useState(false);
  const [transactions, setTransactions] = useState([] as txhistory.LnDb[]);
  const [index, setIndex] = useState(0);
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

  const alertNothingButton: AlertButtonProps[] = [
    {
      text: t('yes'),
      style: 'submit',
      onPress: () => {
        setAlertIndex(0);
        navigation.goBack();
      },
    },
  ];

  const alertExportButton: AlertButtonProps[] = [
    {
      text: t('cancel'),
      style: 'cancel',
      onPress: () => {
        setAlertIndex(0);
      },
    },
    {
      text: t('export'),
      style: 'submit',
      onPress: () => {
        setAlertIndex(0);
        writeLnTxHistory();
      },
    },
  ];

  const txHistoryFetch = async () => {
    if (isTxHistoryLoading) return;
    setIsTxHistoryLoading(true);
    try {
      const result = await txhistory.getHistoryLnAllList(descent ? 'descent' : 'ascent');
      if (result.length === 0) {
        setAlertIndex(1);
        return;
      }
      setTransactions(result);
    } catch (err: any) {
      LOG.error(err.toString());
    }
    setIsTxHistoryLoading(false);
  };

  useLayoutEffect(() => {
    setTransactions([]);
    (async () => {
      await txHistoryFetch();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [descent]);

  const exportTx = () => {
    setAlertIndex(2);
  };

  const sliceByNumber = (txs: txhistory.LnDb[], number: number) => {
    if (transactions.length > 0) {
      const length = Math.ceil(txs.length / number);
      return new Array(length).fill(transactions).map((_, i) => txs.slice(i * number, (i + 1) * number));
    } else {
      return [];
    }
  };

  const separatedTxList = sliceByNumber(transactions, 10);

  const exportButton: HeaderButtonProps = {
    isAlter: true,
    pressed: exportTx,
    iconName: 'file-download',
    buttonStyle: {paddingRight: 12},
    color: theme.color.textColor,
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fadeIn = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    fadeIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const backwardList = () => {
    if (index !== 0) {
      fadeAnim.setValue(0);
      setIndex(index - 1);
    }
  };

  const forwardList = () => {
    if (index < separatedTxList.length - 1) {
      fadeAnim.setValue(0);
      setIndex(index + 1);
    }
  };

  return (
    <Page title={t('home:allTransacrtionsList')} headerRight={exportButton}>
      {transactions.length > 0 ? (
        <View style={styles.container}>
          <View style={styles.listContainer}>
            <Pressable style={styles.listHeader} onPress={() => setDescent(!descent)}>
              <Text style={styles.sortDirection}>{descent ? t('descent') : t('ascent')}</Text>
              <MIcon name={descent ? 'expand-more' : 'expand-less'} size={fontSizes.basic4} color={theme.color.textColor} />
            </Pressable>
            <Animated.ScrollView style={{opacity: fadeAnim}}>
              <View>
                {separatedTxList[index].map(tx => {
                  return <TxItem item={tx} key={tx.payment_hash} />;
                })}
              </View>
            </Animated.ScrollView>
          </View>
          <View style={styles.bottom}>
            <Pressable style={styles.chevron} onPress={backwardList} hitSlop={20}>
              {index === 0 ? (
                <MIcon name="chevron-left" size={fontSizes.basic3} color={theme.color.transparent} />
              ) : (
                <MIcon name="chevron-left" size={fontSizes.basic3} color={theme.color.textColor} />
              )}
            </Pressable>
            <Text style={styles.index}>{index + 1}</Text>
            <Pressable
              style={styles.chevron}
              onPress={forwardList}
              hitSlop={{
                bottom: 20,
                left: 20,
                right: 20,
                top: 20,
              }}>
              {index === separatedTxList.length - 1 ? (
                <MIcon name="chevron-right" size={fontSizes.basic3} color={theme.color.transparent} />
              ) : (
                <MIcon name="chevron-right" size={fontSizes.basic3} color={theme.color.textColor} />
              )}
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.spinnerArea}>
          <ActivityIndicator size="large" color={theme.color.textColor} />
        </View>
      )}
      <AlertTheme
        isAlertVisible={alertIndex === 1}
        title={t('attention')}
        message={t('detailSettings:nothingTransaction')}
        button={alertNothingButton}
      />
      <AlertTheme isAlertVisible={alertIndex === 2} title={t('home:exportAll')} message={t('home:exportAllTxsMsg')} button={alertExportButton} />
    </Page>
  );
};

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'space-around',
    },
    listContainer: {
      height: '85%',
    },
    listHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      margin: 16,
    },
    sortDirection: {
      fontFamily: typographyFonts.notoSans,
      color: theme.color.textColor,
      fontSize: fontSizes.basic5,
    },
    bottom: {
      width: '100%',
      flexDirection: 'row',
      marginTop: 16,
      marginBottom: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chevron: {
      marginHorizontal: 16,
    },
    index: {
      fontFamily: typographyFonts.notoSans,
      color: theme.color.textColor,
      fontSize: fontSizes.basic4,
    },
    spinnerArea: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nothingDescription: {
      fontFamily: typographyFonts.notoSans,
      color: theme.color.textColor,
      fontSize: fontSizes.basic5,
    },
  });
  return styles;
};
