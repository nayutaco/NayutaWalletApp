import {Buffer} from 'buffer';

import bech32 from 'bech32';

import {connect} from 'bridge/channel';
import {getInfo} from 'bridge/manager';
import {addInvoice} from 'bridge/wallet';
import * as constants from 'tools/constants';
import {LOG} from 'tools/logging';
import Satoshi, {isInput} from 'types/Satoshi';

const lnurlDecodeLimit = 2000;

export function parseLnurl(bech32Encoded: string): string {
  bech32Encoded = bech32Encoded.toLowerCase();
  const {prefix, words} = bech32.decode(bech32Encoded, lnurlDecodeLimit);
  if (prefix !== 'lnurl') {
    throw new Error('prefix is invalid: ' + prefix);
  }
  return Buffer.from(bech32.fromWords(words)).toString('utf8');
}

export async function requestChannel(lnurl: string, isPrivate = true) {
  const response = await fetch(lnurl, {method: 'GET'});
  const connInfo = await response.json();

  if (!response.ok || connInfo.status?.toLowerCase() === 'error') {
    throw new Error(connInfo.reason || 'Not OK');
  }
  if (connInfo.tag !== 'channelRequest') {
    throw new Error('Tag other than channelRequest is not currently supported');
  }

  // connected, valid json, not an error, status is 200, and supported format, is valid

  const resConn = await connect(connInfo.uri);
  if (!resConn.success) {
    throw new Error(resConn.error);
  }

  const myPubkey = (await getInfo()).identity_pubkey;
  const response2 = await fetch(`${connInfo.callback}?k1=${connInfo.k1}&remoteid=${myPubkey}&private=${isPrivate ? '1' : '0'}`, {
    method: 'GET',
  });
  const result = await response2.json();

  LOG.trace(response2, result);
  if (!response2.ok || result.status?.toLowerCase() === 'error') {
    throw new Error(result.reason || 'Not OK');
  }

  // Channel has been requested! Please wait for open channel.
}

export type WithdrawMetaData = {
  tag: 'withdrawRequest';
  callback: URL;
  k1: string;
  minWithdrawable: Satoshi;
  maxWithdrawable: Satoshi;
  defaultDescription: string;
};

const isWithdrawMetaData = (arg: unknown): arg is WithdrawMetaData => {
  if (arg == null) {
    return false;
  }
  const r = arg as Record<string, unknown>;

  return (
    r.tag === 'withdrawRequest' &&
    r.callback instanceof URL &&
    typeof r.k1 === 'string' &&
    r.minWithdrawable instanceof Satoshi &&
    r.maxWithdrawable instanceof Satoshi &&
    typeof r.defaultDescription === 'string'
  );
};

export const fromRawUrl = (decodedLnurl: URL): WithdrawMetaData | null => {
  const params = decodedLnurl.searchParams;

  const minWithdrawable = params.get('minWithdrawable');
  const maxWithdrawable = params.get('maxWithdrawable');
  const callback = params.get('callback');
  if (minWithdrawable == null || maxWithdrawable == null || callback == null) return null;

  try {
    const withdraw = {
      tag: params.get('tag'),
      callback: new URL(callback),
      defaultDescription: params.get('defaultDescription'),
      k1: params.get('k1'),
      minWithdrawable: Satoshi.fromMilliSat(minWithdrawable),
      maxWithdrawable: Satoshi.fromMilliSat(maxWithdrawable),
    };
    if (!isWithdrawMetaData(withdraw)) return null;
    return withdraw;
  } catch (error) {
    const message = error instanceof Error ? error.message : `Unknown error is thrown: ${error}`;
    LOG.error('Failed to create WithdrawMetaData', message);
    return null;
  }
};

const fromJson = (json: string): WithdrawMetaData => {
  const obj = JSON.parse(JSON.stringify(json));

  if (!isInput(obj.minWithdrawable)) throw new Error(`minWithdrawable=${obj.minWithdrawable} is invalid value`);
  if (!isInput(obj.maxWithdrawable)) throw new Error(`maxWithdrawable=${obj.maxWithdrawable} is invalid value`);

  const metaData = {
    tag: obj.tag,
    callback: new URL(obj.callback),
    defaultDescription: obj.defaultDescription,
    k1: obj.k1,
    minWithdrawable: Satoshi.fromMilliSat(obj.minWithdrawable),
    maxWithdrawable: Satoshi.fromMilliSat(obj.maxWithdrawable),
  };

  if (!isWithdrawMetaData(metaData)) throw new Error(`given JSON can not be converted into WithdrawMetaData: ${JSON.stringify(json)}`);
  return metaData;
};

export const getWithdrawMetaData = async (withdrawEndpoint: URL): Promise<WithdrawMetaData> => {
  LOG.debug(`Start request to get withdraw metadata from ${withdrawEndpoint}`);

  const response = await fetch(withdrawEndpoint.toString(), {method: 'GET'}).then(async resp => {
    LOG.debug('Got response from lnurl server');

    if (!resp.ok) {
      throw new Error(
        `got error response from lnurl server. status=${resp.status}, message=${resp.statusText}: ${JSON.stringify(await resp.json())}`,
      );
    }

    return resp.json();
  });

  const metaData = fromJson(response);
  if (!isWithdrawMetaData(metaData)) throw new Error(`response is invalid: ${metaData}`);

  return metaData;
};

export const requestWithdraw = async (metaData: WithdrawMetaData) => {
  const withdrawSats = metaData.maxWithdrawable;

  const expiry = constants.receiveInvoiceExpiry;
  const description = metaData.defaultDescription;
  let payment_request: string;

  try {
    LOG.debug('Call addInvoice to LND');
    payment_request = await addInvoice(withdrawSats, description, expiry);
  } catch (err: any) {
    throw new Error(`failed to create invoice: ${err}`);
  }

  const callbackUrl = `${metaData.callback}?k1=${metaData.k1}&pr=${payment_request}`;

  LOG.debug('Start request to', callbackUrl);
  return fetch(callbackUrl, {method: 'GET'}).then(async resp => {
    if (resp.ok) {
      LOG.debug('Get success for request to', callbackUrl);
      return resp.json();
    }
    throw new Error(`got failed response: status=${resp.status}, message=${resp.statusText}: ${JSON.stringify(await resp.json())}`);
  });
};
