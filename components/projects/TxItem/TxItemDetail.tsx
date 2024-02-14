import React, {useEffect, useState} from 'react';

import {useTranslation} from 'react-i18next';
import {ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';

import {formatDate} from '../DateTime';
import {DictTableCopyableItem} from '../DictTableCopyableItem';
import {StatusIcon} from '../StatusIcon';

import DictTable from 'components/uiParts/DictTable';
import DictTableItem from 'components/uiParts/DictTable/Item';
import {TxDetailValue} from 'components/uiParts/Sat/WithStyleParts';
import {useStore} from 'store';
import {Theme} from 'styles/theme/interface';
import {useTheme} from 'styles/theme/themeContext';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {typographyFonts, fontSizes} from 'styles/variables';
import {LnDb, emptyLnDb, getHistoryLnDetail} from 'txhistory';

type Props = {
  item: LnDb;
  whole: boolean;
  setWhole: React.Dispatch<React.SetStateAction<boolean>>;
};
export const TxItemDetail = ({item, whole, setWhole}: Props) => {
  const {theme} = useTheme();
  const styles = useThemeAwareObject(createStyles);
  const [store] = useStore();
  const {t} = useTranslation();
  const [detail, setDetail] = useState<LnDb>(emptyLnDb);
  useEffect(() => {
    let isUnmounted = false;
    (async () => {
      const histDetail = await getHistoryLnDetail(item.dir, item.payment_hash);
      if (isUnmounted) return;
      setDetail(histDetail);
    })();
    return () => {
      isUnmounted = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.table}>
        <View style={styles.descriptionContainer}>
          <StatusIcon chain={'LN'} direction={item.dir} status={item.state} />
          {!whole ? (
            <Pressable onPress={() => setWhole(!whole)}>
              <Text style={[styles.label, !item.description && {color: theme.color.textColorTranslucent}]} numberOfLines={3} ellipsizeMode={'tail'}>
                {item.description ? item.description : t('noDescription')}
              </Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => setWhole(!whole)}>
              <Text style={[styles.label, !item.description && {color: theme.color.textColorTranslucent}]}>
                {item.description ? item.description : t('noDescription')}
              </Text>
            </Pressable>
          )}
        </View>
        {detail.dir !== 'dummy' ? (
          <DictTable>
            <DictTableItem label={detail.dir === 'pay' ? t('amount') + ' + ' + t('transactionDetail:feeLabel') : t('amount')}>
              <ScrollView horizontal={true}>
                <View style={styles.amountContainer}>
                  <TxDetailValue value={detail.amount} overrideUnit={'sat'} />
                  <Text style={styles.dirText}>(</Text>
                  <TxDetailValue value={detail.amount} overrideUnit={store.fiat} />
                  <Text style={styles.dirText}>)</Text>
                  {detail.dir === 'pay' && (
                    <>
                      <Text style={styles.dirText}>+</Text>
                      <TxDetailValue value={detail.fee} overrideUnit={'sat'} />
                    </>
                  )}
                </View>
              </ScrollView>
            </DictTableItem>
            <DictTableCopyableItem label={t('transactionDetail:dateTimeLabel')} value={formatDate(detail.timestamp, '---', true)} />
            <DictTableItem label={t('transactionDetail:stateLabel')} value={detail.state} />
            {!(detail.failure_reason === '' || detail.failure_reason === 'FAILURE_REASON_NONE') && (
              <DictTableCopyableItem label={t('transactionDetail:failureReasonLabel')} value={detail.failure_reason} />
            )}
            {detail.dir === 'pay' && <DictTableCopyableItem label={t('transactionDetail:destinationLabel')} value={detail.destination} />}
            <DictTableCopyableItem label={t('transactionDetail:paymentHashLabel')} value={detail.payment_hash} />
            <DictTableCopyableItem label={t('transactionDetail:preimageLabel')} value={detail.state !== 'FAILED' ? detail.preimage : '---'} />
          </DictTable>
        ) : (
          <View style={styles.spinnerArea}>
            <ActivityIndicator size="large" color={theme.color.textColor} />
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    table: {
      width: '100%',
    },
    descriptionContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomColor: theme.color.accentSecondary,
      borderBottomWidth: 2,
      marginTop: 6,
      marginBottom: 12,
      paddingBottom: 8,
      paddingRight: 8,
    },
    label: {
      fontFamily: typographyFonts.notoSansBold,
      color: theme.color.textColor,
      fontSize: fontSizes.basic5,
      marginLeft: 8,
      marginRight: 32,
    },
    icon: {
      color: theme.color.textColor,
      opacity: 0.6,
    },
    amountContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    dirText: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.dictTableItem,
      color: theme.color.textColor,
      marginRight: 5,
    },
    spinnerArea: {
      padding: 24,
      alignItems: 'center',
    },
  });
  return styles;
};
