import {NativeModules, NativeEventEmitter} from 'react-native';
interface ILndReactController {
  setup(addr: string, port: number): Promise<void>;
  startLnd(startArgs: string, config: string): Promise<void>;
  shutdownLnd(): void;
  getCert(): Promise<string>;
  request(method: 'GET' | 'POST' | 'DELETE', url: string, bodyJson: string | null, adminMacaroon: string): Promise<string>;
  isRunning(): Promise<boolean>;
  messageNotification(message: string, iconType: number): void;
  restartApp(): void;
  stopService(): void;
  killProcess(): void;
  resetWallet(): Promise<void>;

  ccAddChannelList(channelPoint: string): Promise<void>;
  ccRemoveChannelList(channelPoint: string): Promise<void>;
  ccRemoveChannelListAll(): Promise<void>;
  ccGetAlarmParams(): Promise<{enabled: boolean; intervalMinute: string; limitMinute: string}>;
  ccSetAlarmParams(enabled: boolean, intervalMinute: number, limitMinute: number): Promise<void>;
}
const {LndReactController: _LndReactController} = NativeModules;

export const EventEmitter = new NativeEventEmitter(_LndReactController);
const LndReactController = _LndReactController as ILndReactController;
export default LndReactController as ILndReactController;
