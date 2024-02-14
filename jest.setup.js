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
jest.mock('sp-react-native-in-app-updates', () => 'SpInAppUpdates');
jest.mock('react-native-vector-icons/MaterialIcons', () => 'MIcon');
jest.mock('react-native-cloud-store', () => 'cloudstore');
jest.mock('@react-navigation/native-stack', () => 'createNativeStackNavigator');
jest.mock('react-native-circular-progress', () => 'AnimatedCircularProgress');
jest.mock('@react-native-google-signin/google-signin', () => 'GoogleSignin');
jest.mock('@robinbobin/react-native-google-drive-api-wrapper', () => 'GDrive', 'ListQueryBuilder', 'MimeTypes');
jest.mock('react-native-vector-icons/FontAwesome', () => 'FAIcon');
jest.mock('react-native-vector-icons/FontAwesome5', () => 'FA5Icon');
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'MCIcon');
jest.mock('react-native-permissions', () => 'RNPermissionsModule');
jest.mock('react-native-reanimated', () => 'Animated');
jest.mock('react-native-qrcode-svg', () => 'QRCode');
jest.mock('react-native-touch-id', () => 'TouchID');
jest.mock('react-native-app-intro-slider', () => 'AppIntroSlider');
jest.mock('react-native-camera-kit', () => 'Camera');
jest.mock('bridge/request', () => 'request');
jest.mock('bridge/manager', () => 'manager');
jest.mock('bridge/wallet');
jest.mock('tools/logging');

NativeModules.AppConfig = {
  NETWORK: 'mainnet',
};
