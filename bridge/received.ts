import {ChanPoint} from 'bridge/backup';
import {EventEmitter as nee} from 'bridge/LndGrpcLightning';
import {emitEventCompleted} from 'bridge/manager';
import {LOG} from 'tools/logging';

const dummyFunc = () => {
  LOG.trace('bridge/received: dummy');
};

type fnLnReceiveType = (paymentHash: string) => void;
// const lnReceivedHandler = new Map<string, fnLnReceiveType>();
let lnReceivedHandlerHome: fnLnReceiveType = dummyFunc;
let lnReceivedHandlerSubmarine: fnLnReceiveType = dummyFunc;

// request.startWatchLnInvoices()
export function addLnRecievedHandler(key: string, fn: fnLnReceiveType) {
  // 画面表示する関数をMapに登録すると、呼び出しで期待通りに動作しないことがある
  // if (!lnReceivedHandler.has(key)) {
  //   lnReceivedHandler.set(key, fn);
  // }
  switch (key) {
    case 'home':
      lnReceivedHandlerHome = fn;
      break;
    case 'submarine':
      lnReceivedHandlerSubmarine = fn;
      break;
    default:
      throw new Error(`addLnRecievedHandler(${key})`);
  }
}

export function addLnReceivedListener() {
  nee.removeAllListeners('grpc_watchLnInv');
  nee.addListener('grpc_watchLnInv', result => {
    LOG.info(`NativeEvent.Listener(grpc_watchLnInv): ${result.event}`);
    if (result) {
      switch (result.event) {
        case 'settled':
          // lnReceivedHandler.forEach((fn, _) => {
          //   fn(result.param);
          // });
          lnReceivedHandlerHome(result.param);
          lnReceivedHandlerSubmarine(result.param);
          LOG.trace(`grpc_watchLnInv SETTLED: ${result.param}`);
          break;
        case 'completed':
          LOG.trace('grpc_watchLnInv completed');
          emitEventCompleted('addLnReceivedListener:completed', result.event);
          break;
        case 'error':
          LOG.trace(`grpc_watchLnInv error: ${result.param}`);
          emitEventCompleted('addLnReceivedListener:error', result.event);
          break;
        default:
          LOG.error(`grpc_watchLnInv.default: ${result}`);
          emitEventCompleted('addLnReceivedListener:unknown event', result.event);
      }
    } else {
      LOG.error('grpc_watchLnInv null');
    }
  });
}

export type TxReceiveData = {
  event: string;
  txid: string;
  confirm: number;
  amount: number;
  height: number;
  addresses: string[];
};

type fnTxReceiveType = (data: TxReceiveData) => void;

export function addTxidReceivedListener(txReceivedHandlerSubmarine: fnTxReceiveType) {
  nee.removeAllListeners('grpc_watchTx');
  nee.addListener('grpc_watchTx', result => {
    LOG.info(`NativeEvent.Listener(grpc_watchTx): ${result.event}`);
    if (result) {
      switch (result.event) {
        case 'detect':
          txReceivedHandlerSubmarine(result);
          LOG.trace(`grpc_watchTx: ${result.txid}`);
          break;
        case 'completed':
          // if you keep watching, call subscribeTransactions().
          LOG.trace('grpc_watchTx completed');
          emitEventCompleted('addTxidReceivedListener:completed', result.event);
          break;
        case 'error':
          // if you keep watching, call subscribeTransactions().
          LOG.trace(`grpc_watchTx error: ${result.reason}`);
          emitEventCompleted('addTxidReceivedListener:error', result.event);
          break;
        default:
          LOG.error(`grpc_watchTx.default: ${result}`);
          emitEventCompleted('addTxidReceivedListener:unknown error', result.event);
      }
    } else {
      LOG.error('grpc_watchTx null');
    }
  });
}

type fnLnBackupType = (backupBase64: string, chanPoints: ChanPoint[], count: number) => void;

export function addLnBackupListener(lnBackupHandler: fnLnBackupType) {
  nee.removeAllListeners('grpc_watchChanBackup');
  nee.addListener('grpc_watchChanBackup', result => {
    LOG.info(`NativeEvent.Listener(grpc_watchChanBackup): ${result.event}`);
    if (result) {
      switch (result.event) {
        case 'detect':
          lnBackupHandler(result.backupBase64, result.chanPoints, result.count);
          LOG.trace('grpc_watchChanBackup detect');
          break;
        case 'completed':
          LOG.trace('grpc_watchChanBackup completed');
          emitEventCompleted('addLnBackupListener:completed', result.event);
          break;
        case 'error':
          LOG.trace(`grpc_watchChanBackup error: ${result.param}`);
          emitEventCompleted('addLnBackupListener:error', result.event);
          break;
        default:
          LOG.error(`grpc_watchChanBackup.default: ${result}`);
          emitEventCompleted('addLnBackupListener:unknown event', result.event);
      }
    } else {
      LOG.error('grpc_watchChanBackup null');
    }
  });
}
