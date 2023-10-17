import {NativeModules} from 'react-native';

interface IOsTools {
  screenshotPrevent(enable: boolean): void;
}

const {OsTools: _OsTools} = NativeModules;

const OsTools = _OsTools as IOsTools;
export default OsTools as IOsTools;
