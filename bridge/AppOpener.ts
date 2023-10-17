import {NativeModules} from 'react-native';
interface IAppOpener {
  openAppWithUrl(url: string, packageId: string): Promise<void>;
  canOpenAppWithUrl(url: string, packageId: string): Promise<boolean>;
}
const _AppOpener = NativeModules.AppOpener as IAppOpener;
const AppOpener = _AppOpener;
export default AppOpener;
