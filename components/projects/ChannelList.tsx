import {useNavigation} from '@react-navigation/native';

import {StackNavigationProp} from '@react-navigation/stack';
import React from 'react';
import {useTranslation} from 'react-i18next';
import {Pressable, StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';

import {withStyle} from 'components/uiParts/Sat';

import {ParamList} from 'navigation/paramList';
import {Theme} from 'styles/theme/interface';
import {useTheme} from 'styles/theme/themeContext';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {colors, typographyFonts, fontSizes} from 'styles/variables';
import * as types from 'types/';
import Satoshi from 'types/Satoshi';

type Prop = {
  channels: types.LNDStatus['channels'];
};

export function ChannelList({channels}: Prop) {
  const {t} = useTranslation();
  const navigation = useNavigation<StackNavigationProp<ParamList>>();
  const {theme} = useTheme();
  const styles = useThemeAwareObject(createStyles);

  const Balance = withStyle({
    valueStyle: styles.balanceText,
    unitStyle: styles.balanceText,
    showSwapButton: false,
  });

  function calcBalanceRatio(local: Satoshi, remote: Satoshi, localFrag: boolean) {
    const capacity = local.add(remote).toNumber();
    let ratio = local.div(capacity).mul(100).toString() + '%';
    const style: StyleProp<ViewStyle> = {
      height: 8,
      width: ratio,
      backgroundColor: theme.color.accentSecondary,
      borderRadius: 5,
      alignSelf: 'flex-start',
    };
    if (!localFrag) {
      ratio = remote.div(capacity).mul(100).toString() + '%';
      style.width = ratio;
      style.backgroundColor = theme.color.accentPrimary;
      style.alignSelf = 'flex-end';
    }
    return style;
  }

  function makeListUnit(channel: types.Channel) {
    const goDetail = (chanIdentifier?: string, status?: string) => {
      navigation.navigate('ChannelDetails', {id: chanIdentifier, status: status});
    };

    if (channel.status === 'active' || channel.status === 'inactive') {
      return (
        <Pressable onPress={() => goDetail(channel.channelPoint, channel.status)} key={channel.channelPoint}>
          <View style={styles.item}>
            <View style={styles.head}>
              <Text style={styles.alias}>{`${channel.alias}`}</Text>
              <Text style={channel.status ? styles.activeStatus : styles.status}>{t(`channelStatus:${channel.status}` as string)}</Text>
            </View>
            <View style={styles.balance}>
              <View style={styles.balanceLocal}>
                <Text style={styles.balanceText}>{t('channel:localBalance')}</Text>
                <View style={styles.balanceBarBackground}>
                  <View style={calcBalanceRatio(channel.localBalance, channel.remoteBalance, true)} />
                </View>
                <Balance value={channel.localBalance} />
              </View>
              <View style={styles.balanceRemote}>
                <Text style={styles.balanceText}>{t('channel:remoteBalance')}</Text>
                <View style={styles.balanceBarBackground}>
                  <View style={calcBalanceRatio(channel.localBalance, channel.remoteBalance, false)} />
                </View>
                <Balance value={channel.remoteBalance} />
              </View>
            </View>
          </View>
        </Pressable>
      );
    } else if (
      channel.status === 'opening' ||
      channel.status === 'closing' ||
      channel.status === 'forceClosing' ||
      channel.status === 'closeWaiting'
    ) {
      return (
        <Pressable onPress={() => goDetail(channel.channelPoint, channel.status)} key={channel.channelPoint}>
          <View style={styles.notOpened} key={channel.channelPoint}>
            <Text style={styles.notOpenedAlias}>{`${channel.alias}`}</Text>
            <Text style={styles.status}>{t(`channelStatus:${channel.status}` as string)}</Text>
          </View>
        </Pressable>
      );
    }
  }

  return <View style={styles.container}>{channels && channels.map(channel => makeListUnit(channel))}</View>;
}

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    container: {},
    head: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingBottom: 8,
    },
    notOpened: {
      height: 80,
      padding: 8,
      justifyContent: 'center',
      borderBottomColor: theme.color.borderColor,
      borderBottomWidth: 1,
    },
    alias: {
      width: '60%',
      color: theme.color.textColor,
      fontSize: fontSizes.basic5,
      fontFamily: typographyFonts.notoSansBold,
    },
    notOpenedAlias: {
      color: theme.color.textColor,
      fontSize: fontSizes.basic5,
      fontFamily: typographyFonts.notoSansBold,
    },
    activeStatus: {
      color: theme.color.textColor,
      fontSize: fontSizes.basic5,
      fontFamily: typographyFonts.notoSans,
    },
    status: {
      color: theme.color.textColorTranslucent,
      fontSize: fontSizes.basic5,
      fontFamily: typographyFonts.notoSans,
    },
    balance: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    balanceLocal: {
      width: '50%',
      alignItems: 'flex-start',
    },
    balanceRemote: {
      width: '50%',
      alignItems: 'flex-end',
    },
    balanceText: {
      color: theme.color.textColor,
      fontSize: fontSizes.basic8,
      fontFamily: typographyFonts.notoSans,
      paddingLeft: 4,
    },
    balanceBarBackground: {
      height: 8,
      width: '90%',
      backgroundColor: colors.balanceBarBackground,
      borderRadius: 5,
    },
    balanceBarRemote: {
      height: 8,
      width: '50%',
      backgroundColor: theme.color.textColor,
      borderRadius: 5,
      alignSelf: 'flex-end',
    },
    item: {
      padding: 8,
      borderBottomColor: theme.color.textColorTranslucent,
      borderBottomWidth: 1,
    },
  });
  return styles;
};
