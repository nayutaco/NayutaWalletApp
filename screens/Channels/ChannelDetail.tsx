import {BigNumber} from 'bignumber.js';
import React, {useCallback, useState, useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {View, Text, StyleSheet, Linking, Pressable, ActivityIndicator} from 'react-native';

import {splitChannelPoint} from 'bridge/channel';
import {DictTableCopyableItem} from 'components/projects/DictTableCopyableItem';
import {ScrollablePage} from 'components/projects/Page';
import DictTable from 'components/uiParts/DictTable';
import DictTableItem from 'components/uiParts/DictTable/Item';
import {withStyle} from 'components/uiParts/Sat';
import {useLND} from 'hooks/useLND';
import {useStore} from 'store';
import {Theme} from 'styles/theme/interface';
import {useTheme} from 'styles/theme/themeContext';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {typographyFonts, fontSizes} from 'styles/variables';
import {getExplorerTxidUrl} from 'tools/btctools';
import * as types from 'types/index';
import Satoshi from 'types/Satoshi';

export function searchChannel(chanIdentifier: string, chan: types.Channel[]): types.Channel[] {
  const result: types.Channel[] = chan.filter(output => {
    return output.channelId === chanIdentifier;
  });
  return result;
}

type LinkButton = {url: string; title?: string};

export function ChannelDetailScreen(nav: any) {
  const {status} = useLND();
  const {t} = useTranslation();
  const [store] = useStore();
  const {theme} = useTheme();
  const styles = useThemeAwareObject(createStyles);

  const Amount = withStyle({
    valueStyle: styles.tableBalance,
    unitStyle: styles.tableUnit,
    showSwapButton: false,
  });

  const OpenURLButton = ({url, title}: LinkButton) => {
    const handlePress = useCallback(async () => {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    }, [url]);

    return (
      <Pressable onPress={handlePress} style={styles.linkButton}>
        <Text style={styles.linkText}>{title}</Text>
      </Pressable>
    );
  };

  const chanIdentifier: string = nav.route.params.id;
  const [channel, setChannel] = useState<types.Channel>();
  let explorerUrl = '';

  useEffect(() => {
    if (status && status.channels) {
      let result = status.channels.filter(output => {
        // search in opened channels (active, inactive)
        return output.channelPoint === chanIdentifier;
      });
      if (result.length === 0) {
        // search in pending channels
        result = status.channels.filter(output => {
          return output.channelPoint === chanIdentifier;
        });
      }
      if (result.length > 0) {
        setChannel(result[0]);
      }
    }
  }, [chanIdentifier, status]);

  const chanStatus = channel?.status;
  if (
    chanStatus === 'active' ||
    chanStatus === 'inactive' ||
    chanStatus === 'opening' ||
    chanStatus === 'closing' ||
    chanStatus === 'forceClosing' ||
    chanStatus === 'closeWaiting'
  ) {
    const channelDetail = channel as types.Channel;
    if (chanStatus === 'active' || chanStatus === 'inactive') {
      if (channelDetail && channelDetail.channelPoint) {
        const splitted = splitChannelPoint(channelDetail.channelPoint);
        if (splitted.success) {
          explorerUrl = getExplorerTxidUrl(store.explorer, splitted.txid);
        }
      } else {
        return (
          <View style={styles.head}>
            <ActivityIndicator size="large" color={theme.color.textColor} />
          </View>
        );
      }
    } else {
      const splitted = splitChannelPoint(chanIdentifier);
      if (splitted.success) {
        explorerUrl = getExplorerTxidUrl(store.explorer, splitted.txid);
      }
    }
    let visibility;
    if (channelDetail.private) {
      visibility = t('channel:visibilityPrivate');
    } else {
      visibility = t('channel:visibilityPublic');
    }
    if (channelDetail.channelId) {
      const chanId = new BigNumber(channelDetail.channelId);
      const height = chanId.dividedToIntegerBy(1099511627776).toNumber();
      if (height >= 16000000 && height <= 16250000) {
        visibility += ' (alias-scid)';
      }
    }
    return (
      <ScrollablePage title={t('channel:details')}>
        <View style={styles.container}>
          {channelDetail ? (
            <>
              <View style={styles.head}>
                <Text style={styles.alias}>{channelDetail.alias}</Text>
                <Text style={styles.status}>{t(`channelStatus:${chanStatus}` as string)}</Text>
              </View>
              <DictTable>
                <DictTableCopyableItem label={t('channel:remotePubKey')} value={channelDetail.remoteNodePub} />
                <DictTableCopyableItem label={t('channel:localBalance')}>
                  <Amount value={Satoshi.fromSat(channelDetail.localBalance.toString())} overrideUnit={'sat'} />
                </DictTableCopyableItem>
                <DictTableCopyableItem label={t('channel:remoteBalance')}>
                  <Amount value={Satoshi.fromSat(channelDetail.remoteBalance.toString())} overrideUnit={'sat'} />
                </DictTableCopyableItem>
                {channelDetail.private && <DictTableCopyableItem label={t('channel:visibility')} value={visibility} />}
                <DictTableItem label={t('channel:fundingTransaction')}>
                  <OpenURLButton url={explorerUrl} title={channelDetail.channelPoint ? channelDetail.channelPoint : ''} />
                </DictTableItem>
                {channelDetail.localConstraintReserveSat && (
                  <DictTableCopyableItem label={t('channel:constraintReserve')} value={channelDetail.localConstraintReserveSat.toString()}>
                    <View style={styles.rowPosition}>
                      <Text style={styles.tableBalance}>{channelDetail.localConstraintReserveSat.toString()}</Text>
                      <Text style={styles.tableUnit}>{t('currencyUnit:sat')}</Text>
                    </View>
                  </DictTableCopyableItem>
                )}
                {channelDetail.dustLimitSat && (
                  <DictTableCopyableItem label={t('channel:dustLimitSat')} value={channelDetail.dustLimitSat.toString()}>
                    <View style={styles.rowPosition}>
                      <Text style={styles.tableBalance}>{channelDetail.dustLimitSat.toString()}</Text>
                      <Text style={styles.tableUnit}>{t('currencyUnit:sat')}</Text>
                    </View>
                  </DictTableCopyableItem>
                )}
              </DictTable>
            </>
          ) : (
            <View style={styles.head}>
              <ActivityIndicator size="large" color={theme.color.textColor} />
            </View>
          )}
        </View>
      </ScrollablePage>
    );
  } else {
    return (
      <ScrollablePage title={t('channel:details')}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color={theme.color.textColor} />
        </View>
      </ScrollablePage>
    );
  }
}

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    container: {
      margin: 16,
    },
    head: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 10,
      marginBottom: 10,
      paddingHorizontal: 4,
      borderBottomColor: theme.color.accentSecondary,
      borderBottomWidth: 2,
    },
    alias: {
      width: '60%',
      color: theme.color.textColor,
      fontSize: fontSizes.basic4,
      fontFamily: typographyFonts.notoSansBold,
    },
    status: {
      width: '40%',
      textAlign: 'right',
      color: theme.color.textColor,
      fontSize: fontSizes.basic5,
      fontFamily: typographyFonts.notoSans,
    },
    rowPosition: {
      flexDirection: 'row',
    },
    linkButton: {
      width: '100%',
      backgroundColor: 'transparent',
      alignSelf: 'flex-start',
    },
    linkText: {
      color: theme.color.textColor,
      fontSize: fontSizes.dictTableLabel,
      textDecorationLine: 'underline',
    },
    tableBalance: {
      color: theme.color.textColor,
      fontSize: fontSizes.dictTableLabel,
      fontFamily: typographyFonts.notoSans,
    },
    tableUnit: {
      color: theme.color.textColor,
      fontSize: fontSizes.dictTableLabel,
      fontFamily: typographyFonts.notoSans,
      paddingLeft: 4,
    },
  });
  return styles;
};
