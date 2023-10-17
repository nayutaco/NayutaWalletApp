import 'react-native-get-random-values';
import {Linking, Platform} from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import {v4 as uuid} from 'uuid';

import {
  lndAddr,
  lndFeeUrl,
  lndGrpcPort,
  lndRestPort,
  promotionInfo,
  promotionReportMailTo,
  debugApi,
  appStoreLink,
  googlePlayLink,
} from './constants';
import {LOG} from './logging';

import {exportTextFile} from 'bridge/exports';
import * as manager from 'bridge/manager';
import * as label from 'tools/const-labels';
import * as txhistory from 'txhistory';
import {csvColumnOrder as btcCsvColumnOrder, prepareDataSetForCsv} from 'txhistory/btc';
import {csvColumnOrder as lnCsvColumnOrder} from 'txhistory/ln';
import {PromotionInfo} from 'types';
import Satoshi from 'types/Satoshi';

export function buildTemplateString(template: string, keys: {[key: string]: string}): string {
  for (const key in keys) {
    if (!/^[0-9a-zA-Z_-]+$/.test(key)) {
      // unmatched key will violate Regexp
      continue;
    }
    template = template.replace(new RegExp(`({${key}})`, 'g'), encodeURIComponent(keys[key]));
  }
  return template;
}

type ConnectParams = {
  /** Host name */
  host: string;
  /** Port number in string */
  port: string;
  /** macaroon in b64 string */
  macaroonB64: string;
  /** macaroon in hex string */
  macaroonHex: string;
  /** certificate in PEM */
  cert: string;
};
export function buildConnectString(template: string, params: ConnectParams): string {
  return buildTemplateString(template, params);
}

export function generateConf(network: string, _autopilot: boolean, peers: string[], wtclient: boolean, rescanWallet: boolean): string {
  const peersString = peers
    .filter(q => q && q.length > 0)
    .map(peer => `neutrino.addpeer=${peer}`)
    .join('\n');

  // NOTE: Alias must be fit in 32 bytes according to BOLT. Ref: https://github.com/lightning/bolts/blob/master/07-routing-gossip.md#the-node_announcement-message
  // Prefix 'wallet-nc2-' is referenced by other apps. If you need to change the prefix, carefully check side effects.
  const alias = `wallet-nc2-${uuid().slice(0, 21)}`;

  return `
[Application Options]
debuglevel=debug,BTCN=warn,DISC=info,CRTR=info,CNCT=info,SRVR=info
maxlogfiles=7
maxlogfilesize=10
nolisten=true
rpclisten=${lndAddr}:${lndGrpcPort}
restlisten=${lndAddr}:${lndRestPort}
nat=false
maxbackoff=2s
maxpendingchannels=2
tlsdisableautofill=true
feeurl=${lndFeeUrl}
${rescanWallet ? 'reset-wallet-transactions=true' : ''}
alias=${alias}

[Bitcoin]
bitcoin.active=true
bitcoin.${network}=true
bitcoin.node=neutrino
bitcoin.defaultchanconfs=1
bitcoin.defaultremotedelay=4032

[neutrino]
${peersString}

[protocol]
protocol.option-scid-alias=true
protocol.zero-conf=true

[wtclient]
wtclient.active=${wtclient ? 'true' : 'false'}
wtclient.sweep-fee-rate=20
`;
}

/** integer or not
 *
 * @param numStr target string
 * @param allowSign true=allow +/-
 * @result true=integer
 */
export function canParseInt(numStr: string, allowSign: boolean): boolean {
  const reg = allowSign ? /^[+,-]?([1-9]\d*|0)$/ : /^([1-9]\d*|0)$/;
  return reg.test(numStr);
}

/** canParseFloat returns true when numStr is a number like string such as integer or float.
 *
 * @param numStr target string
 * @param allowSign true=allow +/-
 * @result true=float
 */
export function canParseFloat(numStr: string, allowSign: boolean): boolean {
  const reg = allowSign ? /^[+,-]?([1-9]\d*|0)(\.\d+)?$/ : /^([1-9]\d*|0)(\.\d+)?$/;
  return reg.test(numStr);
}

export function dateFilename(dateObj: Date): string {
  const yyyy = dateObj.getFullYear();
  const MM = ('00' + (dateObj.getMonth() + 1)).slice(-2);
  const dd = ('00' + dateObj.getDate()).slice(-2);
  const hh = ('00' + dateObj.getHours()).slice(-2);
  const mm = ('00' + dateObj.getMinutes()).slice(-2);
  const ss = ('00' + dateObj.getSeconds()).slice(-2);
  return `${yyyy}${MM}${dd}${hh}${mm}${ss}`;
}

export async function writeLnTxHistory() {
  const lnHist = await txhistory.getHistoryLnAll('ascent');
  const txs = intoCsv(lnCsvColumnOrder, lnHist);
  const dateFname = dateFilename(new Date());
  const fname = `nw-lnTxs-${dateFname}.csv`;
  LOG.info(`backup: ${fname}`);
  if (Platform.OS === 'android') {
    await exportTextFile(fname, txs);
  } else {
    const iosCacheFile = `${RNFS.CachesDirectoryPath}/${fname}`;

    if (await RNFS.exists(iosCacheFile)) {
      await RNFS.unlink(iosCacheFile);
    }
    await RNFS.writeFile(iosCacheFile, txs);

    const option = {
      title: 'export lightning transactions file',
      failOnCancel: false,
      saveToFiles: false,
      url: iosCacheFile,
    };
    const res = await Share.open(option);
    LOG.debug(`Export CSV RESULT: ${JSON.stringify(res)}`);
  }
}

export async function writeBtcTxHistory() {
  const btcHist = await txhistory.getHistoryBtc(label.regExpRefund);
  const txs = intoCsv(btcCsvColumnOrder, prepareDataSetForCsv(btcHist));
  const dateFname = dateFilename(new Date());
  const fname = `nw-btcTxs-${dateFname}.csv`;
  LOG.info(`backup: ${fname}`);
  if (Platform.OS === 'android') {
    await exportTextFile(fname, txs);
  } else {
    const iosCacheFile = `${RNFS.CachesDirectoryPath}/${fname}`;

    if (await RNFS.exists(iosCacheFile)) {
      await RNFS.unlink(iosCacheFile);
    }
    await RNFS.writeFile(iosCacheFile, txs);

    const option = {
      title: 'export onchain transactions file',
      failOnCancel: false,
      saveToFiles: false,
      url: iosCacheFile,
    };
    const res = await Share.open(option);
    LOG.debug(`Export CSV RESULT: ${JSON.stringify(res)}`);
  }
}

// NOTE: line break in CSV is CRLF
// Refer RFC4180: https://www.rfc-editor.org/rfc/rfc4180.html#section-2
const newLine = '\r\n';
const delimiter = ',';

const intoCsv = <T>(order: (keyof T)[], dbs: T[]): string => {
  const header = order.join();
  let csv = '';

  dbs.forEach(lnDb => {
    csv += intoCsvRow(order, lnDb) + newLine;
  });

  return header + newLine + csv;
};

const intoCsvRow = <T>(order: (keyof T)[], db: T): string => {
  let csvRow = '';

  order.forEach((key, index) => {
    const value = db[key];
    if (index > 0) csvRow += delimiter;

    let str;
    // NOTE: JSON.strigify escapes double quote and new lien codes such as \n
    // Refer ECMA spec: https://tc39.es/ecma262/#sec-quotejsonstring
    str = JSON.stringify(value);
    if (value instanceof Satoshi) str = value.toString();

    csvRow += str;
  });

  return csvRow;
};

export async function getPromotions(): Promise<PromotionInfo[]> {
  try {
    const res = await fetch(promotionInfo, {method: 'GET'});
    const result = await res.json();
    if (!result.length) {
      LOG.error('getPromotions: result is undefined');
      throw new Error('getPromotions: result is undefined');
    }
    return result;
  } catch (e: any) {
    LOG.error('getPromotions: ' + e.message);
    throw new Error(e);
  }
}

export async function isInPromotion(name: string): Promise<boolean> {
  try {
    const info = await getPromotions();
    for (const obj of info) {
      if (obj.name === name) {
        return obj.info.is_active;
      }
    }
    LOG.error('isInPromotion: Invalid Promotion Name');
    return false;
  } catch (e: any) {
    LOG.error('isInPromotion: ' + e.message);
    throw new Error(e);
  }
}

export function createReportTemplate(promotionName: string) {
  return promotionReportMailTo.replace('PROMOTION', promotionName);
}

export function isBase64(text: string): boolean {
  return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/.test(text);
}

export async function isPermittedDebug(node: string): Promise<boolean> {
  try {
    const res = await fetch(debugApi + '/confirm/' + node, {method: 'GET'});
    const isPermitted = await res.json();
    return isPermitted.result;
  } catch {
    throw new Error('Failed Confirm ID');
  }
}

export const linkingOpenStore = () => {
  if (Platform.OS === 'android') {
    Linking.openURL(googlePlayLink);
    manager.killProcess();
  } else if (Platform.OS === 'ios') {
    Linking.openURL(appStoreLink);
  } else {
    LOG.debug('linkingOpenStore: OTHER OS');
  }
};
