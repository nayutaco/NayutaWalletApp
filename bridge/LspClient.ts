import {NativeModules, NativeEventEmitter} from 'react-native';

export type submarineCreateKeysResultType = {
  preimage: string;
  paymentHash: string;
  repayPrivkey: string;
  repayPubkey: string;
};

export type submarineRepaymentType = {
  privkey: string;
  script: string;
  txid: string;
  index: number;
  amount: number;
};

export type submarineRegisterResultType = {
  htlcPubkey: string;
  script: string;
  scriptAddress: string;
  height: number;
};

interface ILspClient {
  initialize(lspCert: string, adminMacaroon: string, lspAddr: string, lspToken: string): Promise<void>;
  ping(nonce: number): Promise<number>;
  getLspVersion(): Promise<string>;
  getHubLnNodeString(): Promise<string>;
  getFeePermyriad(): Promise<number>;
  receiveMax(): Promise<number>;
  paymentFee(reqAmount: number): Promise<number>;
  paymentRegister(reqAmount: number, memo: string): Promise<string>;
  submarineRefundBlock(): Promise<number>;
  submarineCreateKeys(): Promise<submarineCreateKeysResultType>;
  submarineRegister(paymentHash: string, repayPubkey: string): Promise<any>;
  submarineReceive(paymentHash: string, invoice: string): Promise<void>;
  submarineRepayment(repayParams: submarineRepaymentType[], repayAddress: string, labe: string): Promise<string>;
  submarineReregister(script: string): Promise<string>;
  selfRebalance(): Promise<void>;
  queryRoutePayment(invoice: string, feeLimitSat: number, amtSat: number): void;
  requestOpenChannel(): Promise<void>;
  integrityAppCheck(): Promise<boolean>;
}
const {LspClient: _LspClient} = NativeModules;

export const EventEmitter = new NativeEventEmitter(_LspClient);
const LspClient = _LspClient as ILspClient;
export default LspClient as ILspClient;
