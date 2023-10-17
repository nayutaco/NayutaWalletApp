import {NativeModules, NativeEventEmitter} from 'react-native';
interface ILndGrpcLightning {
  startWatchLnInvoices(startIndex: number, adminMacaroon: string): Promise<void>;
  closeChannelStart(fundingTxid: string, outPointIndex: number, forceClose: boolean, satPerVByte: number, adminMacaroon: string): Promise<boolean>;
  subscribeTransactions(adminMacaroon: string): Promise<void>;
  subscribeChannelEvents(adminMacaroon: string): Promise<void>;
  subscribeChannelBackups(adminMacaroon: string): Promise<void>;
}
const {LndGrpcLightning: _LndGrpcLightning} = NativeModules;

export const EventEmitter = new NativeEventEmitter(_LndGrpcLightning);
const LndGrpcLightning = _LndGrpcLightning as ILndGrpcLightning;
export default LndGrpcLightning as ILndGrpcLightning;
