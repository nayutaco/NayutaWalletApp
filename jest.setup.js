import {jest} from '@jest/globals';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import {NativeModules} from 'react-native';
import mockRNDeviceInfo from 'react-native-device-info/jest/react-native-device-info-mock';

jest.mock('react-native-device-info', () => mockRNDeviceInfo);
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');
jest.mock('react-native-aes-crypto', () => 'AesNS');
jest.mock('react-native-keychain', () => 'getGenericPassword');
jest.mock('react-native-securerandom', () => 'generateSecureRandom');
jest.mock('react-native-fs', () => 'RNFS');
jest.mock('react-native-share', () => 'Share');
jest.mock('react-native-background-timer', () => 'BackgroundTimer');
jest.mock('uuid', () => 'v4');

jest.mock('bridge/request', () => 'request');
jest.mock('bridge/manager', () => 'manager');
jest.mock('bridge/wallet');
jest.mock('tools/logging');

NativeModules.AppConfig = {
  NETWORK: 'mainnet',
};