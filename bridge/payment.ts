import LndGrpcRouter, {EventEmitter as nee} from './LndGrpcRouter';
import {EventEmitter as neeLsp} from './LspClient';

import * as appDb from 'appdb';
import {queryRoutePayment} from 'bridge/lccontrol';
import {request} from 'bridge/request';
import {LnInvoiceResponse} from 'navigation/paramList';
import {payLnTimeoutSec} from 'tools/constants';
import {LOG} from 'tools/logging';
import {Channel} from 'types';
import Satoshi from 'types/Satoshi';

const dummyFunc = () => {
  LOG.trace('bridge/payment: dummy');
};

let adminMacaroon: string;

/**
 * set admin macaroon
 * Note that it doesn't save macaroons to keychain.
 * @param macaroonHex Hexadecimal macaroon
 */
export function setAdminMacaroon(macaroonHex: string) {
  adminMacaroon = macaroonHex;
}

export async function payBtc(address: string, sendAll: boolean, feeRate: Satoshi, amount?: Satoshi, label?: string): Promise<void> {
  let payreq;
  if (sendAll) {
    payreq = {
      addr: address,
      send_all: true,
      sat_per_vbyte: feeRate.toString(),
      label,
    };
  } else {
    if (amount) {
      payreq = {
        addr: address,
        amount: amount.toString(),
        sat_per_vbyte: feeRate.toString(),
        label,
      };
    }
  }

  LOG.info(`payBtc: ${JSON.stringify(payreq)}`);
  const url = '/v1/transactions';
  await request('POST', url, payreq);
}

export async function decodePayReq(invoice: string): Promise<LnInvoiceResponse> {
  const url = `/v1/payreq/${invoice}`;
  const payreq: LnInvoiceResponse = await request('GET', url, null);
  const nowTime = Date.now() / 1000;
  const expiryTime = parseInt(payreq.timestamp, 10) + parseInt(payreq.expiry, 10);
  payreq.expired = nowTime >= expiryTime;
  payreq.expiryTime = expiryTime;
  return payreq;
}

export async function payLn(invoice: string, fee: Satoshi): Promise<void> {
  const payreq = {
    payment_request: invoice,
    fee_limit: {
      fixed_msat: fee.toMsat().toString(),
    },
  };

  const url = '/v1/channels/transactions';
  const result = await request('POST', url, payreq);
  if (result.payment_error !== '') {
    throw new Error(result.payment_error);
  }
}

export async function payLnAsync(invoice: string, fee: Satoshi, amt: Satoshi, isManual: boolean) {
  // memo: `timeout_seconds`
  //  https://github.com/lightningnetwork/lnd/issues/4269
  await LndGrpcRouter.sendPaymentV2(invoice, fee.toNumber(), payLnTimeoutSec, isManual ? amt.toNumber() : 0, adminMacaroon);
}

export async function payLnHubRoutingAsync(invoice: string, fee: Satoshi, amt: Satoshi, isManual: boolean) {
  const url = `/v1/payreq/${invoice}`;
  const payreq: LnInvoiceResponse = await request('GET', url, null);
  await appDb.addPaymentInvoice(payreq.payment_hash, invoice);
  queryRoutePayment(invoice, fee.toNumber(), isManual ? amt.toNumber() : 0);
}

// https://api.lightning.community/#paymentstatus
export const statusUnknown = 0;
export const statusInFlight = 1;
export const statusSucceeded = 2;
export const statusFailed = 3;
export const statusError = 99;

// https://api.lightning.community/#paymentfailurereason
export const failureNone = 0;
export const failureTimeout = 1;
export const failureNoRoute = 2;
export const failureError = 3;
export const failureIncorrectPaymentDetails = 4;
export const failureInsufficientBalance = 5;

export type SentHandlerType = 'home' | 'submarine';
type FnLnSentArgs = (invoice: string, value: number, paymentHash: string, status: number, failure: number, err: string) => void;
type FnLnSentArgsType = FnLnSentArgs;
let sentFnHome: FnLnSentArgsType = dummyFunc;

export function addLnSentHandler(key: SentHandlerType, fn: FnLnSentArgsType) {
  // if (!lnSentHandler.has(key)) {
  //   lnSentHandler.set(key, fn);
  // }
  switch (key) {
    case 'home':
      sentFnHome = fn;
      break;
    default:
      throw new Error(`addLnSentHandler(${key})`);
  }
}

export function addLnSentListener() {
  nee.removeAllListeners('grpc_payment');
  nee.addListener('grpc_payment', result => {
    LOG.info(`NativeEvent.Listener(grpc_payment): ${result.event}`);
    if (result) {
      switch (result.event) {
        case 'payment':
          // lnSentHandler.forEach((fn, _) => {
          //   fn(result.hash, result.status, result.failure);
          // });
          sentFnHome(result.invoice, result.value, result.hash, result.status, result.failure, '');
          LOG.trace(`grpc_payment payment: ${result.hash}, status: ${result.status}, failure: ${result.failure}`);
          break;
        case 'completed':
          LOG.trace('grpc_payment completed');
          break;
        case 'error':
          sentFnHome(result.invoice, result.value, result.hash, statusError, 0, result.param);
          LOG.trace(`grpc_payment error: ${result.param}`);
          break;
        default:
          LOG.error(`grpc_payment.default: ${result}`);
      }
    } else {
      LOG.error('grpc_payment null');
    }
  });
}

export type RouteSentHandlerType = 'home';
type FnLnRouteSentArgs = (paymentHash: string, status: number, failure: number, err: string) => void;
type FnLnRouteSentArgsType = FnLnRouteSentArgs;
let routeSentFn: FnLnRouteSentArgsType = dummyFunc;

export function addLnRouteSentHandler(key: string, fn: FnLnRouteSentArgsType) {
  // if (!lnSentHandler.has(key)) {
  //   lnSentHandler.set(key, fn);
  // }
  switch (key) {
    case 'home':
      routeSentFn = fn;
      break;
    default:
      throw new Error(`addLnRouteSentHandler(${key})`);
  }
}

export function addLnRouteSentListener() {
  neeLsp.removeAllListeners('grpc_route_payment');
  neeLsp.addListener('grpc_route_payment', result => {
    LOG.info(`LspEvent.Listener(grpc_route_payment): ${result.event}`);
    if (result) {
      switch (result.event) {
        case 'payment':
          // lnSentHandler.forEach((fn, _) => {
          //   fn(result.hash, result.status, result.failure);
          // });
          routeSentFn(result.hash, result.status, result.failure, '');
          LOG.trace(`grpc_route_payment payment: ${result.hash}, status: ${result.status}, failure: ${result.failure}`);
          break;
        case 'error':
          routeSentFn(result.hash, statusError, 0, result.param);
          LOG.trace(`grpc_route_payment error: ${result.param}`);
          break;
        default:
          LOG.error(`grpc_route_payment.default: ${result}`);
      }
    } else {
      LOG.error('grpc_route_payment null');
    }
  });
}
export const confirmMinimumReserve = (channels: Channel[]): boolean => {
  let overMinReserves = false;
  for (const chan of channels) {
    if (chan.localBalance.toNumber() > (chan.localConstraintReserveSat ? chan.localConstraintReserveSat?.toNumber() : 0)) {
      overMinReserves = true;
      break;
    }
  }
  return overMinReserves;
};

export const confirmMaximumAmount = (channels: Channel[], sendAmount: Satoshi, maxFee: Satoshi): boolean => {
  let maxAmount = 0;
  for (const chan of channels) {
    const amount = chan.localBalance.toNumber() - (chan.localConstraintReserveSat ? chan.localConstraintReserveSat?.toNumber() : 0);
    if (amount > maxAmount) {
      maxAmount = amount;
    }
  }
  return sendAmount.toNumber() + maxFee.toNumber() > maxAmount;
};
