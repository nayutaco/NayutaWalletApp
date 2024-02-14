import * as channel from './channel';
import LspClient, * as LspClientType from './LspClient';

import * as constants from 'tools/constants';
import {LOG} from 'tools/logging';

export type createKeysResultType = LspClientType.submarineCreateKeysResultType;
export type repaymentType = LspClientType.submarineRepaymentType;
export type registerResultType = LspClientType.submarineRegisterResultType;

// NayutaCore2Lnd/lspclient/error.go
export const ErrCode = {
  ChanInfo: 1,
  Client: 100,
  ClientConn: 101,
  Ping: 200,
  OnTheFly: 300,
  OnTheFlyHaveChan: 301,
  SubmarineCreateKey: 400,
  SubmarineReg: 500,
  SubmarineSwap: 501,
  SubmarineRecv: 600,
  SubmarineRefund: 700,
  SubmarineReReg: 800,
  SelfRebalance: 900,
  QueryPay: 1000,
  QueryPayRouting: 1001,
  QueryPayPay: 1002,
  RegisterUserInfo: 1100,
  Integrity: 1200,
  IntegrityNonce: 1201,
  IntegrityVerify: 1202,
  IntegrityApi: 1203,
  OpenChan: 1300,
  OpenChanHaveChan: 1301,
  OpenChanRecently: 1302,
  OpenChanNotCheck: 1303,
  OpenChanCheckOOD: 1304,
  OpenChanCheckFail: 1305,
  OpenChanLnd: 1306,
  OpenChanInternal: 1399,

  // something error
  Error: 999999,
} as const;

interface ErrType {
  [code: number]: string;
}
const errLspClient: ErrType = {};
errLspClient[ErrCode.ChanInfo] = 'No LSP channel information';

errLspClient[ErrCode.Client] = 'connect: Error';
errLspClient[ErrCode.ClientConn] = 'connect: No channel info';

errLspClient[ErrCode.Ping] = 'connect: Fail ping';

errLspClient[ErrCode.OnTheFly] = 'OnTheFly: Error';
errLspClient[ErrCode.OnTheFlyHaveChan] = 'OnTheFly: There is receivable channel already.';

errLspClient[ErrCode.SubmarineCreateKey] = 'Submarine: Create keys error';
errLspClient[ErrCode.SubmarineReg] = 'Submarine: Registration is currently not available.';
errLspClient[ErrCode.SubmarineSwap] = 'Submarine: Swap script mismatch';
errLspClient[ErrCode.SubmarineRecv] = 'Submarine: Receive error';
errLspClient[ErrCode.SubmarineRefund] = 'Submarine: Refund error';
errLspClient[ErrCode.SubmarineReReg] = 'Submarine: Re-registration error';

errLspClient[ErrCode.SelfRebalance] = 'SelfRebalance: Error';

errLspClient[ErrCode.QueryPay] = 'QueryPay: Error';
errLspClient[ErrCode.QueryPayRouting] = 'QueryPay: Routing error';
errLspClient[ErrCode.QueryPayPay] = 'QueryPay: Payment error';

errLspClient[ErrCode.RegisterUserInfo] = 'RegisterUserInfo: Error';

errLspClient[ErrCode.Integrity] = 'Integrity: Error';
errLspClient[ErrCode.IntegrityNonce] = 'Integrity: Nonce error';
errLspClient[ErrCode.IntegrityVerify] = 'Integrity: Verify error';

errLspClient[ErrCode.OpenChan] = 'OpenChannel: Error';
errLspClient[ErrCode.OpenChanHaveChan] = 'OpenChannel: Already channel opening or opened';
errLspClient[ErrCode.OpenChanRecently] = 'OpenChannel: Recently channel opened';
errLspClient[ErrCode.OpenChanNotCheck] = 'OpenChannel: App/Device not checked';
errLspClient[ErrCode.OpenChanCheckOOD] = 'OpenChannel: App/Device check result is out of date';
errLspClient[ErrCode.OpenChanCheckFail] = 'OpenChannel: App/Device check failed';
errLspClient[ErrCode.OpenChanLnd] = 'OpenChannel: LND open channel failed';
errLspClient[ErrCode.OpenChanInternal] = 'OpenChannel: Internal error';

errLspClient[ErrCode.Error] = 'Internal error';

export class LcControlError extends Error {
  code: number; // error code from LspClient/LSP
  goerr: string; // error message from LSP

  constructor(initMessage: string, initName: string, initCode: number, initGoErr: string) {
    super();
    this.message = initMessage;
    this.name = initName;
    this.code = initCode;
    this.goerr = initGoErr;
  }

  toString(): string {
    return `${this.message}(name=${this.name}, code=${this.code}, err=${this.goerr})`;
  }
}

export class IntegrityError extends Error {
  static readonly ErrRetry = 1;
  static readonly ErrNetwork = 2;
  static readonly ErrGooglePlay = 3;
  static readonly ErrOther = 99;

  code: number;
  integrityCode: number; // error code from Google Integrity API

  constructor(initMessage: string, initCode: number, integrityCode: number) {
    super();
    this.message = initMessage;
    this.name = 'IntegrityError';
    this.code = initCode;
    this.integrityCode = integrityCode;
  }

  toString(): string {
    return `${this.message}(name=${this.name}, code=${this.code})`;
  }
}

let adminMacaroon = '';

function convThrow(lspErr: any): Error {
  const errSplit = lspErr.message.split('@');
  // <FIRST>@<SECOND>@<THIRD>
  //  FIRST: LSP error code
  //  SECOND: LSP error string
  //  THIRD: golang error string
  if (errSplit.length >= 3 && errSplit[0].match(/^([1-9]\d*|0)$/)) {
    let goerr;
    if (errSplit.length > 3) {
      // maybe <THIRD> contain '@'.
      goerr = lspErr.message.substring(2 + errSplit[0].length + errSplit[1].length);
    } else {
      goerr = errSplit[2];
    }
    const lspCode = parseInt(errSplit[0], 10);
    const errName = errSplit[1];
    LOG.debug(`convThrow: ${errLspClient[lspCode]}, errName=${errName}, lspCode=${lspCode}, goerr=${goerr}`);
    if (lspCode in errLspClient) {
      const e = new LcControlError(`LSP Error(${errLspClient[lspCode]})`, errName, lspCode, goerr);
      return e;
    }
  } else {
    LOG.debug(`convThrow: not LSP error(lspErr=${lspErr.message})`);
  }
  return lspErr;
}

function convThrowOpenChannel(lspErr: LcControlError): LcControlError {
  // OpenChannel error message: (EOPENCHAN=xxxx)
  const numStr = lspErr.goerr.replace(/^.*\(EOPENCHAN=([0-9]+)\).*$/, '$1');
  const lspCode = parseInt(numStr, 10);
  if (lspCode in errLspClient) {
    if (lspCode === ErrCode.OpenChanLnd) {
      // LND error
      lspErr = new LcControlError(`Server LND Error(${errLspClient[lspCode]})`, lspErr.name, lspCode, lspErr.goerr);
    } else {
      lspErr = new LcControlError(`Server Error(${errLspClient[lspCode]})`, lspErr.name, lspCode, lspErr.goerr);
    }
  } else {
    LOG.warn(`convThrowOpenChannel: not OpenChannel error(lspErr=${lspErr.message})`);
  }
  return lspErr;
}

function convThrowIntegrity(e: Error): IntegrityError {
  // OpenChannel error message: (EINTEGRITY=-nn)
  const numStr = e.message.replace(/^.*\(EINTEGRITY=[-]?([0-9]+)\).*$/s, '$1');
  const integrityCode = parseInt(numStr, 10);
  // https://developer.android.com/google/play/integrity/reference/com/google/android/play/core/integrity/model/IntegrityErrorCode.html
  //  retry:
  //    TOO_MANY_REQUESTS(-8), GOOGLE_SERVER_UNAVAILABLE(-12), INTERNAL_ERROR(-100)
  //  Google Play:
  //    API_NOT_AVAILABLE(-1), PLAY_STORE_NOT_FOUND(-2), PLAY_STORE_ACCOUNT_NOT_FOUND(-4),
  //    PLAY_SERVICES_NOT_FOUND(-6), CANNOT_BIND_TO_SERVICE(-9),
  //    PLAY_STORE_VERSION_OUTDATED(-14), PLAY_SERVICES_VERSION_OUTDATED(-15)
  //  network:
  //    NETWORK_ERROR(-3)
  //  other:
  //    APP_NOT_INSTALLED(-5), APP_UID_MISMATCH(-7), CLOUD_PROJECT_NUMBER_IS_INVALID(-16),
  //    NONCE_IS_NOT_BASE64(-13), NONCE_TOO_LONG(-11), NONCE_TOO_SHORT(-10),
  let convCode = IntegrityError.ErrOther;
  switch (integrityCode) {
    case 0:
      LOG.warn('convThrowIntegrity: integrityCode=0');
      break;
    case 3:
      convCode = IntegrityError.ErrNetwork;
      break;
    case 8:
    case 12:
    case 100:
      convCode = IntegrityError.ErrRetry;
      break;
    case 1:
    case 2:
    case 4:
    case 6:
    case 9:
    case 14:
    case 15:
      convCode = IntegrityError.ErrGooglePlay;
      break;
  }
  return new IntegrityError(`Integrity Error(${e.message})`, convCode, integrityCode);
}

/**
 * Set admin macaroon
 * Note that it doesn't save macaroons to keychain.
 * @param macaroonHex Hexadecimal macaroon
 */
export function setAdminMacaroon(macaroonHex: string) {
  adminMacaroon = macaroonHex;
}

export function initialize(): Promise<void> {
  return LspClient.initialize(constants.lspHost.cert, adminMacaroon, constants.lspHost.host, constants.lspHost.token);
}

export async function connectHub() {
  const nodeStr = await hubNodeString();
  const conn = await channel.connect(nodeStr);
  if (!conn.success) {
    LOG.warn(`lccontrol.connectAll: fail nodeStr=${nodeStr}`);
    throw new Error(conn.error || 'something error');
  }
}

export async function ping(): Promise<boolean> {
  const nonce = Math.floor(Math.random() * 1000000);
  try {
    const res = await LspClient.ping(nonce);
    return res === nonce;
  } catch (e) {
    LOG.trace(`lccontrol.ping: error=${convThrow(e).message}`);
  }
  return false;
}

export async function getVersion(): Promise<string> {
  const ver = await LspClient.getLspVersion();
  if (ver.length > 0) {
    LOG.info(`lccontrol.getVersion: ${ver}`);
  } else {
    LOG.error('lccontrol.getVersion: no LSP chan info');
  }
  return ver;
}

export async function feePercent(): Promise<number> {
  try {
    return (await LspClient.getFeePermyriad()) / 100;
  } catch (e: any) {
    LOG.warn(`lccontrol.feePercent: err=${e.message}`);
    throw convThrow(e);
  }
}

export async function hubNodeString(): Promise<string> {
  try {
    return await LspClient.getHubLnNodeString();
  } catch (e: any) {
    LOG.warn(`lccontrol.hubNodeString: err=${e.message}`);
    throw convThrow(e);
  }
}

/**
 * receiveMax returns the maximum amount LND can receive in the current channel state.
 */
export async function receiveMax(): Promise<number> {
  try {
    return await LspClient.receiveMax();
  } catch (e: any) {
    LOG.warn(`lccontrol.receiveMax: err=${e.message}`);
    // throw convThrow(e);
    return 0;
  }
}

export async function paymentFeeMin(): Promise<number> {
  try {
    return await paymentFee(0);
  } catch (e: any) {
    LOG.warn(`lccontrol.paymentFeeMin: err=${e.message}`);
    throw convThrow(e);
  }
}

export async function paymentFee(reqAmount: number): Promise<number> {
  try {
    return await LspClient.paymentFee(reqAmount);
  } catch (e: any) {
    LOG.warn(`lccontrol.paymentFee: err=${e.message}`);
    throw convThrow(e);
  }
}

export async function paymentRegister(reqAmount: number, memo: string): Promise<string> {
  try {
    await connectHub();
    const result = await LspClient.paymentRegister(reqAmount, memo);
    if (result) {
      LOG.info('lccontrol.paymentRegister: OK');
    } else {
      LOG.error('lccontrol.paymentRegister: fail');
    }
    return result;
  } catch (e: any) {
    LOG.warn(`lccontrol.paymentRegister: err=${e.message}`);
    throw convThrow(e);
  }
}

export async function submarineRefundBlock(): Promise<number> {
  try {
    return await LspClient.submarineRefundBlock();
  } catch (e: any) {
    LOG.warn(`lccontrol.submarineRefundBlock: err=${e.message}`);
    throw convThrow(e);
  }
}

export async function submarineCreateKeys(): Promise<createKeysResultType> {
  try {
    return await LspClient.submarineCreateKeys();
  } catch (e: any) {
    LOG.warn(`lccontrol.submarineCreateKeys: err=${e.message}`);
    throw convThrow(e);
  }
}

export async function submarineRegister(paymentHash: string, repayPubkey: string): Promise<registerResultType> {
  try {
    await connectHub();
    return await LspClient.submarineRegister(paymentHash, repayPubkey);
  } catch (e: any) {
    LOG.warn(`lccontrol.submarineRegister: err=${e.message}`);
    throw convThrow(e);
  }
}

export async function submarineReceive(paymentHash: string, invoice: string): Promise<void> {
  try {
    await connectHub();
    return await LspClient.submarineReceive(paymentHash, invoice);
  } catch (e: any) {
    LOG.warn(`lccontrol.submarineReceive: err=${e.message}`);
    throw convThrow(e);
  }
}

export async function submarineRepayment(repayParams: repaymentType[], repayAddress: string, label: string): Promise<string> {
  try {
    return await LspClient.submarineRepayment(repayParams, repayAddress, label);
  } catch (e: any) {
    LOG.warn(`lccontrol.submarineRepayment: err=${e.message}`);
    throw convThrow(e);
  }
}

export async function submarineReregister(script: string): Promise<string> {
  try {
    return await LspClient.submarineReregister(script);
  } catch (e: any) {
    if (e.code && e.code.indexOf('already exists') === -1) {
      LOG.trace(`lccontrol.submarineReregister: already exists(${script})`);
    } else {
      LOG.warn(`lccontrol.submarineReregister: err=${e.message}`);
    }
    throw convThrow(e);
  }
}

export async function selfRebalance(): Promise<void> {
  LOG.trace('lccontrol.selfRebalance');
  try {
    await LspClient.selfRebalance();
  } catch (e: any) {
    LOG.warn(`lccontrol.selfRebalance: err=${e.message}`);
  }
}

export function queryRoutePayment(invoice: string, feeLimitSat: number, amtSat: number): void {
  LspClient.queryRoutePayment(invoice, feeLimitSat, amtSat);
}

export async function requestOpenChannel(): Promise<void> {
  try {
    await connectHub();
    await LspClient.requestOpenChannel();
  } catch (e: any) {
    let err = convThrow(e);
    if (err instanceof LcControlError && err.code === ErrCode.OpenChan) {
      err = convThrowOpenChannel(err);
    }
    throw err;
  }
}

export async function integrityAppCheck(): Promise<boolean> {
  try {
    return await LspClient.integrityAppCheck();
  } catch (e: any) {
    let err = convThrow(e);
    if (!(err instanceof LcControlError)) {
      err = convThrowIntegrity(err);
    }
    throw err;
  }
}
