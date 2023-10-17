import * as bip21 from 'bip21';
import queryString from 'query-string';
import {NativeModules} from 'react-native';

import {decodePayReq} from 'bridge/payment';
import {LnInvoiceResponse} from 'navigation/paramList';
import {btcAddressValidate} from 'tools/btctools';
import {parseLnurl} from 'tools/lnurl';
import {LOG} from 'tools/logging';

import {NetworkKind} from 'types';
import Satoshi from 'types/Satoshi';

export type QrType =
  | {
      type: 'bitcoin';
      address: string;
      params?: {
        amount?: Satoshi;
        message?: string;
      };
    }
  | {
      type: 'lninvoice';
      invoice: string;
      decoded: LnInvoiceResponse;
    }
  | {type: 'lnnode'; value: string}
  | {
      type: 'lnurl';
      decoded: string;
    };

export async function qrResolver(text: string): Promise<QrType> {
  const {NETWORK} = NativeModules.AppConfig;
  const smallText = text.toLocaleLowerCase();

  if (smallText.startsWith('bitcoin:')) {
    return decodeBitcoinUri(text, NETWORK);
  }

  if (smallText.startsWith('lightning:')) {
    return await decodeLightning(text);
  }

  if (
    smallText.startsWith('bc') ||
    smallText.startsWith('tb') ||
    smallText[0] === '1' ||
    smallText[0] === '3' ||
    smallText[0] === 'm' ||
    smallText[0] === 'n'
  ) {
    if (btcAddressValidate(text, NETWORK)) {
      return {type: 'bitcoin', address: text};
    } else {
      const err = new Error('qrscanner:invalidAddr');
      if (btcAddressValidate(text)) {
        err.name = 'address not for current active network';
      }
      throw err;
    }
  }

  return decodeLightning(text);
}

function decodeBitcoinUri(text: string, network: NetworkKind): QrType {
  const addr = bip21.decode(text);
  if (!btcAddressValidate(addr.address, network)) {
    const err = new Error('qrscanner:invalidAddr');
    if (btcAddressValidate(addr.address)) {
      err.name = 'address not for current active network';
    }
    throw err;
  }
  /* @ts-ignore */
  if (addr.options.amount !== undefined) {
    /* @ts-ignore */
    return {type: 'bitcoin', address: addr.address, params: {amount: Satoshi.fromBTC(addr.options.amount), message: addr.options.message}};
  }
  /* @ts-ignore */
  return {type: 'bitcoin', address: addr.address, params: {message: addr.options.message}};
}

async function decodeLightning(text: string): Promise<QrType> {
  text = text.replace('lightning:', '').replace('LIGHTNING:', '');

  // lightning node
  if (isLnnode(text, true)) {
    if (text.toLocaleLowerCase().match(/\.onion/)) {
      throw new Error('qrscanner:torNotSupported');
    }
    return {type: 'lnnode', value: text};
  }

  // TODO: lnd connect is not supported now
  if (text.startsWith('lndconnect')) {
    throw new Error('qrscanner:errorInvalid');
    // lightning invoice
  }

  text = text.toLocaleLowerCase();
  if (text.startsWith('lnurl')) {
    const parsed = parseLnurl(text);
    return {type: 'lnurl', decoded: parsed};
    // this case is a fallback scheme of lnurl
  } else if (text.startsWith('ln')) {
    let decoded: LnInvoiceResponse;
    try {
      decoded = await decodePayReq(text);
    } catch (e: any) {
      LOG.error(`qrresolver ${e.toString()}`);
      const err = new Error('qrscanner:errorInvalid');
      err.name = e.message;
      throw err;
    }
    if (decoded.expired) {
      throw new Error('qrscanner:expiredInvoice');
    }
    return {type: 'lninvoice', invoice: text, decoded: decoded};
  } else if (text.startsWith('http')) {
    const query = queryString.parse(text).lightning;
    if (query != null && typeof query === 'string') {
      if (query.startsWith('lnurl1')) {
        const parsed = parseLnurl(query);
        return {type: 'lnurl', decoded: parsed};
      } else {
        throw new Error('qrscanner:notCorrectLnurl');
      }
    } else {
      throw new Error('qrscanner:errorInvalid');
    }
  }
  throw new Error('qrscanner:errorInvalid');
}

export function isLnnode(node: string, uriFlag: boolean): boolean {
  if (uriFlag) {
    //Node URI(NODEID@IP:PORT)の場合
    const reg = new RegExp(/^0[23][0-9A-Fa-f]{64}@.+/);
    return reg.test(node);
  } else {
    //Node IDの場合
    const reg = new RegExp(/^0[23][0-9A-Fa-f]{64}$/);
    return reg.test(node);
  }
}

export function isLnnodeTor(node: string): boolean {
  const regv2 = new RegExp(/^(0[23][0-9A-Fa-f]{64})@([2-7a-z]{16})\.onion/);
  const regv3 = new RegExp(/^(0[23][0-9A-Fa-f]{64})@([2-7a-z]{56})\.onion/);
  return regv3.test(node.toLocaleLowerCase()) || regv2.test(node.toLocaleLowerCase());
}
