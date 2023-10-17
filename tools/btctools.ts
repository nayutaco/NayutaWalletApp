import {validate, Network} from 'bitcoin-address-validation';
import {NativeModules} from 'react-native';

import {urlBlockstream, mempoolSpace, mempoolFee} from './constants';

import {LOG} from 'tools/logging';
import {Explorer, NetworkKind} from 'types';
import {Crypto, Fiat} from 'types/currency';
import Satoshi from 'types/Satoshi';

/**
 * a subset of Crypto
 * This is a workaround for supporting only BTC
 * TODO: extend it
 */
type CryptoSubset = Extract<Crypto, 'btc'>;

type RateData = {
  rate: number;
  epoch: number;
};
/** caches the result of exchange rates */
const exchangeRates: {[key: string]: RateData} = {};

/** get exchange rate from coinbase */
export function getRateData(from: CryptoSubset, to: Fiat): Promise<number> {
  const exchangeRatePeriod = 10 * 60 * 1000;
  const key = from.toString() + '-' + to.toString();
  if (exchangeRates[key] && Date.now() - exchangeRates[key].epoch < exchangeRatePeriod) {
    return Promise.resolve(exchangeRates[key].rate);
  }
  return fetch('https://api.coinbase.com/v2/prices/' + key + '/spot')
    .then(response => response.json())
    .then(data => {
      exchangeRates[key] = {
        rate: data.data.amount,
        epoch: Date.now(),
      };
      return data.data.amount;
    });
}

/** convert to crypto currency value to fiat currency */
export function convertCryptoToFiat(value: number, from: CryptoSubset, to: Fiat): Promise<number> {
  return getRateData(from, to).then(rate => value * rate);
}
/** convert from fiat currency to crypto currency */
export function convertFiatToCrypto(value: number, from: Fiat, to: CryptoSubset): Promise<number> {
  return getRateData(to, from).then(rate => value / rate);
}

function getExplorerBaseUrl(explorer: Explorer): string {
  const {NETWORK} = NativeModules.AppConfig;
  if (NETWORK === 'mainnet') {
    if (explorer === 'blockstream') {
      return `${urlBlockstream}`;
    } else if (explorer === 'mempoolSpace') {
      return `${mempoolSpace}`;
    } else {
      throw new Error('not set explorer');
    }
    // when running on testnet or signet, only use mempool.space
  } else {
    return `${mempoolSpace}/${NETWORK}`;
  }
}

export function getExplorerTxidUrl(explorer: Explorer, txid: string): string {
  return `${getExplorerBaseUrl(explorer)}/tx/${txid}`;
}

export function getExplorerBlockUrl(explorer: Explorer, block: string): string {
  return `${getExplorerBaseUrl(explorer)}/block/${block}`;
}

export function getExplorerHeightUrl(explorer: Explorer, height: number): string {
  if (explorer === 'blockstream') {
    return `${getExplorerBaseUrl(explorer)}/block-height/${height}`;
  } else if (explorer === 'mempoolSpace') {
    return `${getExplorerBaseUrl(explorer)}/block/${height}`;
  } else {
    throw new Error('not set explorer');
  }
}

export type BlockInfo = {
  id: string;
  height: number;
  version: number;
  timestamp: number;
  tx_count: number;
  size: number;
  weight: number;
  merkle_root: string;
  previousblockhash: string;
  mediantime: number;
  nonce: number;
  bits: number;
  difficulty: number;
};
export async function getBlockInfo(height: number): Promise<BlockInfo> {
  let apiUrl = `${mempoolSpace}`;
  const {NETWORK} = NativeModules.AppConfig;
  switch (NETWORK) {
    case 'mainnet':
      apiUrl = `${mempoolSpace}/api/blocks/${height}`;
      break;
    case 'testnet':
      apiUrl = `${mempoolSpace}/testnet/api/blocks/${height}`;
      break;
    case 'signet':
      apiUrl = `${mempoolSpace}/signet/api/blocks/${height}`;
      break;
  }
  try {
    const res = await fetch(apiUrl);
    const arr = await res.json();
    return arr[0];
  } catch (e: any) {
    throw new Error(e);
  }
}

let lastBlockHeight = 1;
let estimationCache: any = null;
export async function getEstimateFee(blockHeight: number) {
  try {
    if (!estimationCache || (blockHeight !== 0 && lastBlockHeight !== blockHeight)) {
      const {NETWORK} = NativeModules.AppConfig;
      const url = mempoolFee.replace('{NETWORK}', NETWORK === 'mainnet' ? '' : `${NETWORK}/`);
      const response = await fetch(url);
      const ret = await response.json();
      estimationCache = ret;
      if (blockHeight > 0) {
        lastBlockHeight = blockHeight;
      }
    }
  } catch (e: any) {
    LOG.error(`getEstimateFee: ${e.toString()}`);
    return {
      fast: Satoshi.fromSat(3),
      medium: Satoshi.fromSat(2),
      slow: Satoshi.fromSat(1),
    };
  }

  const estimated = {
    fast: Satoshi.fromSat(estimationCache.fastestFee),
    medium: Satoshi.fromSat(estimationCache.halfHourFee),
    slow: Satoshi.fromSat(estimationCache.hourFee),
  };

  return estimated;
}

export async function getBlockHeight(): Promise<number> {
  const {NETWORK} = NativeModules.AppConfig;
  const url = `${mempoolSpace}/{NETWORK}api/blocks/tip/height`.replace('{NETWORK}', NETWORK === 'mainnet' ? '' : `${NETWORK}/`);
  try {
    const res = await fetch(url);
    return parseInt(await res.text(), 10);
  } catch (e: any) {
    return 0;
  }
}

export function btcAddressValidate(address: string, network?: NetworkKind | undefined): boolean {
  if (network && network === 'signet') {
    network = 'testnet';
  }
  return validate(address, network as Network | undefined);
}
