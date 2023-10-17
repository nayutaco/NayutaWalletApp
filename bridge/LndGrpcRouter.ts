import {NativeModules, NativeEventEmitter} from 'react-native';
interface ILndGrpcRouter {
  sendPaymentV2(paymentRequest: string, feeLimitSat: number, timeoutSec: number, amt: number, adminMacaroon: string): Promise<void>;
}
const {LndGrpcRouter: _LndGrpcRouter} = NativeModules;

export const EventEmitter = new NativeEventEmitter(_LndGrpcRouter);
const LndGrpcRouter = _LndGrpcRouter as ILndGrpcRouter;
export default LndGrpcRouter as ILndGrpcRouter;
