import Clipboard from '@react-native-clipboard/clipboard';
import React, {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity, Vibration, NativeModules} from 'react-native';
import DeviceInfo from 'react-native-device-info';

import * as lccontrol from 'bridge/lccontrol';
import {request} from 'bridge/request';
import * as watchtower from 'bridge/watchtower';
import Page from 'components/projects/Page';
import List from 'components/uiParts/List';
import WrapListItem from 'components/uiParts/List/WrapListItem';
import {useLND} from 'hooks/useLND';
import {useStore} from 'store';
import {Theme, useThemeAwareObject} from 'styles/theme';
import {fontSizes, typographyFonts} from 'styles/variables';
import * as label from 'tools/const-labels';
import {LOG} from 'tools/logging';
import * as txhistory from 'txhistory';

/**
 * Return the debug screen
 * @returns {JSX.Element} debug Screen
 */
export default function DebugScreen() {
  const {status} = useLND();
  const [store, dispatch] = useStore();

  const [resultText, setResultText] = useState<string>();

  const styles = useThemeAwareObject(createStyles);
  const {t} = useTranslation();

  const copyResult = () => {
    Clipboard.setString(resultText || '');
    Vibration.vibrate(50);
  };
  const setResult = (text: string) => {
    setResultText(text);
    LOG.trace(`[RESULT]\n${text}`);
  };

  const walletBalance = async () => {
    const url = '/v1/balance/blockchain';
    const result = await request('GET', url, null);
    const resJson = JSON.stringify(result, null, 2);
    setResult(resJson);
  };

  const channelBalance = async () => {
    const url = '/v1/balance/channels';
    const result = await request('GET', url, null);
    const resJson = JSON.stringify(result, null, 2);
    setResult(resJson);
  };

  const listChannels = async () => {
    const url = '/v1/channels';
    const result = await request('GET', url, null);
    const resJson = JSON.stringify(result, null, 2);
    setResult(resJson);
  };

  const closedChannels = async () => {
    const url = '/v1/channels/closed';
    const result = await request('GET', url, null);
    const resJson = JSON.stringify(result, null, 2);
    setResult(resJson);
  };

  const pendingChannels = async () => {
    const url = '/v1/channels/pending';
    const result = await request('GET', url, null);
    const resJson = JSON.stringify(result, null, 2);
    setResult(resJson);
  };

  const getinfo = async () => {
    const url = '/v1/getinfo';
    const result = await request('GET', url, null);
    const resJson = JSON.stringify(result, null, 2);
    const devJson =
      '\n\nDevInfo:\n' +
      `getApplicationName: ${DeviceInfo.getApplicationName()}\n` +
      `getSystemVersion: ${DeviceInfo.getSystemVersion()}\n` +
      `getVersion: ${DeviceInfo.getVersion()}\n`;
    setResult(`${resJson}\n\n${devJson}`);
  };

  const resetMc = async () => {
    const url = '/v2/router/mc/reset';
    await request('POST', url, null);
    setResult('resetmc');
  };

  const listInvoices = async () => {
    const url = `/v1/invoices?num_max_invoices=10&reversed=true`;
    const result = await request('GET', url, null);
    const resJson = JSON.stringify(result, null, 2);
    setResult(resJson);
  };

  const listPayments = async () => {
    const url = '/v1/payments?max_payments=10&reversed=true&include_incomplete=true';
    const result = await request('GET', url, null);
    const resJson = JSON.stringify(result, null, 2);
    setResult(resJson);
  };

  const lastPaymentError = async () => {
    const info = await request('GET', '/v1/getinfo', null);
    const myNode = info.identity_pubkey;
    const url = '/v1/payments?max_payments=100&reversed=true&include_incomplete=true';
    const result = await request('GET', url, null);
    let errorInfo = 'no error';
    for (let idx = result.payments.length - 1; idx >= 0; idx--) {
      console.log(`${result.payments[idx].failure_reason}`);
      if (result.payments[idx].failure_reason !== 'FAILURE_REASON_NONE') {
        const failure = result.payments[idx];
        errorInfo = JSON.stringify(failure, null, 2);
        errorInfo += '\n';
        for (let lp1 = 0; lp1 < failure.htlcs.length; lp1++) {
          const chanId = failure.htlcs[lp1].failure?.channel_update?.chan_id;
          errorInfo += `fail chanId: ${chanId}\n`;
          const graphEdgeUrl = `/v1/graph/edge/${chanId}`;
          try {
            const edge = await request('GET', graphEdgeUrl, null);
            let peerNode;
            if (edge.node1_pub === myNode) {
              peerNode = edge.node2_pub;
            } else {
              peerNode = edge.node1_pub;
            }
            errorInfo += `fail node: ${peerNode}\n\n`;
          } catch (e: any) {
            console.log(`edge: ${graphEdgeUrl} - ${e.toString()}`);
            errorInfo += 'fail node: ???\n\n';
          }
        }
        break;
      }
    }
    setResult(errorInfo);
  };

  const listPeers = async () => {
    const url = '/v1/peers';
    const result = await request('GET', url, null);
    const resJson = JSON.stringify(result, null, 2);
    setResult(resJson);
  };

  const listChainTxns = async () => {
    const url = '/v1/transactions';
    const result = await request('GET', url, null);
    const resJson = JSON.stringify(result, null, 2);
    setResult(resJson);
  };

  const listRefundTxns = async () => {
    const result = await txhistory.getHistoryBtc(label.regExpRefund);
    const resJson = JSON.stringify(result, null, 2);
    setResult(resJson);
  };

  const listUtxos = async () => {
    const url = '/v1/utxos?min_confs=1&max_confs=2147483647';
    const result = await request('GET', url, null);
    const resJson = JSON.stringify(result, null, 2);
    setResult(resJson);
  };

  const statusInfo = () => {
    if (status) {
      setResult(JSON.stringify(status, null, 2));
    } else {
      setResult('status is null');
    }
  };

  const graphInfo = async () => {
    const url = '/v1/graph/info';
    const result = await request('GET', url, null);
    const resJson = JSON.stringify(result, null, 2);
    setResult(resJson);
  };

  const lndLogLevel = async () => {
    const url = '/v1/debuglevel';
    const body = {
      show: true,
      level_spec: 'BTCN=debug',
    };
    const result = await request('POST', url, body);
    const resJson = JSON.stringify(result, null, 2);
    setResult(resJson);
  };

  const getEnv = () => {
    setResult('BUILD_TYPE: ' + NativeModules.AppConfig.BUILD_TYPE + '\nNETWORK: ' + NativeModules.AppConfig.NETWORK);
  };

  const rnLogLevel = () => {
    LOG.info('----------');
    LOG.error('LOG.error');
    LOG.warn('LOG.warn');
    LOG.info('LOG.info');
    LOG.debug('LOG.debug');
    LOG.trace('LOG.trace');
    const level = LOG.getSeverity() === 'trace' ? 'debug' : 'trace';
    LOG.setSeverity(level);
    LOG.info('----------');
    LOG.error('LOG.error');
    LOG.warn('LOG.warn');
    LOG.info('LOG.info');
    LOG.debug('LOG.debug');
    LOG.trace('LOG.trace');
    LOG.info('----------');
    setResult(`ReactNative log level: ${level}`);
  };

  const wtToggle = () => {
    const enabled = !store.wtclient;
    dispatch({
      type: 'enableWtClient',
      wtclient: enabled,
    });
    setResult(`wtclient setting: ${enabled}`);
  };

  const wtList = async () => {
    try {
      const list = await watchtower.getWatchtower();
      const result = JSON.stringify(list, null, 2);
      setResult(result);
    } catch (e) {
      setResult(`${JSON.stringify(e)}`);
    }
  };

  const lcVersion = async () => {
    const result = await lccontrol.getVersion();
    setResult(result);
  };

  return (
    <Page title={t('settings:debug')}>
      <View style={styles.container}>
        <ScrollView style={styles.containerUpper}>
          <List title={'Info'}>
            <WrapListItem indent onPress={getEnv} label={'Get Environment'} />
            <WrapListItem indent onPress={getinfo} label={'LND getinfo'} />
            <WrapListItem indent onPress={statusInfo} label={'LND status'} />
            <WrapListItem indent onPress={graphInfo} label={'LND graph info'} />
            <WrapListItem indent onPress={lndLogLevel} label={'LND loglevel'} />
            <WrapListItem indent onPress={rnLogLevel} label={'RN loglevel (debug <==> trace)'} />
          </List>

          <List title={'List'}>
            <WrapListItem indent onPress={listChannels} label={'channels'} />
            <WrapListItem indent onPress={listChainTxns} label={'transactions'} />
            <WrapListItem indent onPress={listRefundTxns} label={'refund transactions'} />
            <WrapListItem indent onPress={listPeers} label={'peers'} />
            <WrapListItem indent onPress={closedChannels} label={'closed channels'} />
            <WrapListItem indent onPress={pendingChannels} label={'pending channels'} />
            <WrapListItem indent onPress={listInvoices} label={'invoices'} />
            <WrapListItem indent onPress={listPayments} label={'payments'} />
            <WrapListItem indent onPress={lastPaymentError} label={'last payments error'} />
            <WrapListItem indent onPress={listUtxos} label={'UTXOs'} />
          </List>

          <List title={'On-Chain'}>
            <WrapListItem indent onPress={walletBalance} label={'wallet balance'} />
          </List>

          <List title={'Lightning'}>
            <WrapListItem indent onPress={channelBalance} label={'channel balance'} />
            <WrapListItem indent onPress={resetMc} label={'reset mc'} />
          </List>

          <List title={'WtClient'}>
            <WrapListItem indent onPress={wtToggle} label={'toggle wtclient setting'} />
            <WrapListItem indent onPress={wtList} label={'registered watchtowers'} />
          </List>

          <List title={'LSP client'}>
            <WrapListItem indent onPress={lcVersion} label={'LSP version'} />
          </List>
        </ScrollView>

        <View style={styles.span} />
        <ScrollView style={styles.textBackground}>
          <TouchableOpacity
            style={styles.bottomButton}
            onPress={copyResult}
            hitSlop={{
              bottom: 20,
              left: 20,
              top: 20,
            }}>
            <Text style={styles.bottomButtonText}>{t('common:copy')}</Text>
          </TouchableOpacity>
          <ScrollView style={styles.textBackground} horizontal>
            <Text style={styles.text}>{resultText}</Text>
          </ScrollView>
        </ScrollView>
      </View>
    </Page>
  );
}

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    container: {
      paddingHorizontal: 8,
    },
    containerUpper: {
      paddingHorizontal: 20,
      height: '59%',
    },
    text: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic6,
      color: theme.color.primary,
      marginHorizontal: 6,
    },
    textBackground: {
      backgroundColor: `${theme.color.secondaryLighten}` + 70,
      width: '100%',
      height: '40%',
    },
    span: {
      height: '1%',
    },
    bottomButton: {
      flex: 1,
      flexDirection: 'row',
      alignSelf: 'flex-end',
      maxHeight: 56,
      padding: 12,
    },
    bottomButtonText: {
      fontSize: fontSizes.basic8,
      fontFamily: typographyFonts.notoSansBold,
      textAlign: 'center',
      color: theme.color.buttonTextColor,
      backgroundColor: theme.color.accentPrimary,
      borderRadius: 12,
      padding: 8,
    },
  });
  return styles;
};
