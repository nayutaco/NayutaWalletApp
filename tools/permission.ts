import {Platform} from 'react-native';
import {PERMISSIONS, PermissionStatus, RESULTS, check, request} from 'react-native-permissions';

import {LOG} from './logging';

export const checkCameraPermission = async (): Promise<[boolean, PermissionStatus]> => {
  if (Platform.OS === 'android') {
    const cameraPermissionStatus = await check(PERMISSIONS.ANDROID.CAMERA);
    LOG.debug(`Permission Check (Camera): ${cameraPermissionStatus}`);
    if (cameraPermissionStatus === RESULTS.UNAVAILABLE) {
      return [false, cameraPermissionStatus];
    }
    if (cameraPermissionStatus === RESULTS.DENIED) {
      return [false, cameraPermissionStatus];
    }
    if (cameraPermissionStatus === RESULTS.GRANTED) {
      return [true, cameraPermissionStatus];
    }
    return [false, cameraPermissionStatus];
  } else {
    const cameraPermissionStatus = await check(PERMISSIONS.IOS.CAMERA);
    LOG.debug(`Permission Check (Camera): ${cameraPermissionStatus}`);
    if (cameraPermissionStatus === RESULTS.UNAVAILABLE) {
      return [false, cameraPermissionStatus];
    }
    if (cameraPermissionStatus === RESULTS.DENIED) {
      return [false, cameraPermissionStatus];
    }
    if (cameraPermissionStatus === RESULTS.GRANTED) {
      return [true, cameraPermissionStatus];
    }
    return [false, cameraPermissionStatus];
  }
};

export const requestCameraPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    const cameraPermissionStatus = await request(PERMISSIONS.ANDROID.CAMERA);
    LOG.debug(`Permission Request Result (Camera): ${cameraPermissionStatus}`);
    if (cameraPermissionStatus === RESULTS.GRANTED) {
      return true;
    }
    return false;
  } else {
    const cameraPermissionStatus = await request(PERMISSIONS.IOS.CAMERA);
    LOG.debug(`Permission Request Result (Camera): ${cameraPermissionStatus}`);
    if (cameraPermissionStatus === RESULTS.GRANTED) {
      return true;
    }
    return false;
  }
};
