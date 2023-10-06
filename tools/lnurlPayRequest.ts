import {LOG} from './logging';

import Satoshi, {isInput} from 'types/Satoshi';

export type PaymentDataJson = {
  tag: 'payRequest';
  callback: string;
  minSendable: string;
  maxSendable: string;
  metadata: string;
};

type callbackEndpointResponseJson = {
  pr: string;
  routes: [];
};

export type PaymentData = {
  tag: 'payRequest';
  callback: URL;
  minSendable: Satoshi;
  maxSendable: Satoshi;
  metadata: string;
};

const isPaymentData = (arg: unknown): arg is PaymentData => {
  if (arg == null) {
    return false;
  }
  const r = arg as Record<string, unknown>;

  return (
    r.tag === 'payRequest' &&
    r.callback instanceof URL &&
    r.minSendable instanceof Satoshi &&
    r.maxSendable instanceof Satoshi &&
    typeof r.metadata === 'string'
  );
};

const fromJson = (json: PaymentDataJson): PaymentData => {
  if (!isInput(json.minSendable)) throw new Error(`minSendable=${json.minSendable} is invalid value`);
  if (!isInput(json.maxSendable)) throw new Error(`maxSendable=${json.maxSendable} is invalid value`);

  let metaData: PaymentData;
  try {
    metaData = {
      tag: json.tag,
      callback: new URL(json.callback),
      metadata: json.metadata,
      minSendable: Satoshi.fromMilliSat(json.minSendable),
      maxSendable: Satoshi.fromMilliSat(json.maxSendable),
    };
  } catch (err) {
    if (err instanceof Error) throw new Error(`given JSON can not be converted into PaymentData: ${JSON.stringify(json)}: ${err.message}`);

    LOG.error('Unknown error occured:', err);
    throw new Error(`given JSON can not be converted into PaymentData: ${JSON.stringify(json)}`);
  }

  if (!isPaymentData(metaData)) throw new Error(`given JSON can not be converted into PaymentData: ${JSON.stringify(json)}`);
  return metaData;
};

export const getPaymentData = async (lnurlEndpoint: URL): Promise<PaymentData> => {
  LOG.debug(`Start request to get pay metadata from ${lnurlEndpoint}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  const response: PaymentDataJson = await fetch(lnurlEndpoint.toString(), {method: 'GET', signal: controller.signal})
    .then(async resp => {
      clearTimeout(timeoutId);
      LOG.debug('Got response from lnurl server');

      if (!resp.ok) {
        throw new Error(
          `got error response from lnurl server. status=${resp.status}, message=${resp.statusText}: ${JSON.stringify(await resp.json())}`,
        );
      }

      return resp.json() as unknown as PaymentDataJson;
    })
    .catch(err => {
      if (err.name === 'AbortError') {
        err.message = `Failed to get data from ${lnurlEndpoint}} due to timeout`;
        throw err;
      }
      throw new Error(`Failed to get data from ${lnurlEndpoint}: ${err.message}`);
    });

  const paymentData = fromJson(response);

  return paymentData;
};

export const requestInvoice = async (metaData: PaymentData, sendAmount: Satoshi) =>
  await requestToCallbackEndpoint(metaData.callback, sendAmount).then(resp => resp.pr);

const requestToCallbackEndpoint = (callbackEndpoint: URL, sendAmountSats: Satoshi): Promise<callbackEndpointResponseJson> => {
  const url = new URL(callbackEndpoint.toString());
  url.searchParams.set('amount', sendAmountSats.toMsat().toString());
  const callbackUrl = url.href;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  LOG.debug('Start request invoice to', callbackUrl);
  return fetch(callbackUrl, {method: 'GET', signal: controller.signal})
    .then(async resp => {
      clearTimeout(timeoutId);

      if (resp.ok) {
        LOG.debug('Got success from request to', callbackUrl);
        return resp.json();
      }
      throw new Error(`Got failed response: status=${resp.status}, message=${resp.statusText}: ${JSON.stringify(await resp.json())}`);
    })
    .catch(err => {
      if (err.name === 'AbortError') {
        err.message = `Failed to get data from ${callbackUrl}} due to timeout`;
      }
      throw err;
    });
};

const parseMetaDataArray = (jsonArray: string) => {
  return JSON.parse(jsonArray);
};

export const getMetaData = (metadataArray: string, key: string): string => {
  const metadata: [] = parseMetaDataArray(metadataArray);
  const result = metadata.find(array => array[0] === key);

  if (result == null) return '';
  return result[1];
};

export const isInSendableRange = (amount: Satoshi, payment: PaymentData) => {
  return amount.toMsat().gte(payment.minSendable.toMsat()) && amount.toMsat().lte(payment.maxSendable.toMsat());
};
