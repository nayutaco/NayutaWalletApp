import * as cloudstore from 'react-native-cloud-store';

import {iosUploadTimeoutMsec, iosDownloadTimeoutMsec} from './constants';
import {LOG} from './logging';

export async function startup() {
  LOG.debug(`icloud.startup: available=${await isICloudAvailable()}`);

  // for onProgress()
  cloudstore.registerGlobalUploadEvent();
  cloudstore.registerGlobalDownloadEvent();

  // events
  cloudstore.onICloudIdentityDidChange(u => {
    LOG.debug('icloud.onICloudIdentityDidChange: ' + u);
    LOG.debug(`icloud.onICloudIdentityDidChange: ${JSON.stringify(u)}`);
  });
  cloudstore.onICloudDocumentsStartGathering(u => {
    LOG.debug(`icloud.onICloudDocumentsStartGathering: ${JSON.stringify(u)}`);
  });
  cloudstore.onICloudDocumentsGathering(u => {
    LOG.debug(`icloud.onICloudDocumentsGathering: ${JSON.stringify(u)}`);
  });
  cloudstore.onICloudDocumentsFinishGathering(u => {
    LOG.debug(`icloud.onICloudDocumentsFinishGathering: ${JSON.stringify(u)}`);
  });
  cloudstore.onICloudDocumentsUpdateGathering(u => {
    LOG.debug(`icloud.onICloudDocumentsUpdateGathering: ${JSON.stringify(u)}`);
  });
}

export async function isICloudAvailable(): Promise<boolean> {
  return await cloudstore.isICloudAvailable();
}

function icloudFilename(pathName: string, fileName: string): string {
  if (!cloudstore.defaultICloudContainerPath) {
    const msg = 'icloud.fileReadText: defaultICloudContainerPath';
    LOG.error(msg);
    throw new Error(msg);
  }
  return cloudstore.PathUtils.join(cloudstore.defaultICloudContainerPath, 'Documents', pathName, fileName);
}

export async function fileUpload(localPathName: string, pathName: string, fileName: string, removeBeforeUpload = true): Promise<void> {
  await uploadToIcloud(localPathName, pathName, fileName, removeBeforeUpload);
}

async function uploadToIcloud(localPathName: string, pathName: string, fileName: string, removeBeforeUpload = true): Promise<void> {
  LOG.debug(`icloud.uploadToIcloud: start: ${localPathName} -> ${fileName}`);

  const targetDir = icloudFilename(pathName, '');
  await cloudstore.createDir(targetDir);

  const icloudPath = icloudFilename(pathName, fileName);
  if (removeBeforeUpload) {
    if (await isExist(icloudPath)) {
      LOG.debug(`uploadToIcloud: exist(${icloudPath})`);
    }
    try {
      // remove already uploaded file
      await cloudstore.unlink(icloudPath);
    } catch (e: any) {
      LOG.warn(`unlink uploaded file: ${e.toString()}`);
    }
  }

  const uploadFile = async (localPath: string, iCloudPath: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      let progressing = false;
      const id = setInterval(() => {
        LOG.error('icloud.uploadFile: timeout');
        if (!progressing) {
          clearInterval(id);
          reject('iCloud upload timeout');
        }
        progressing = false;
      }, iosUploadTimeoutMsec);
      cloudstore.upload(localPath, iCloudPath, {
        onProgress: (data: {progress: number}) => {
          LOG.debug('icloud.uploadFile: progress');
          progressing = true;
          if (data.progress === 100) {
            LOG.debug('icloud.uploadFile: upload done.');
            clearInterval(id);
            resolve();
          }
        },
      });
    });
  };
  await uploadFile(localPathName, icloudPath);
  LOG.debug('icloud.uploadToIcloud: end');
}

export async function fileReadText(pathName: string, fileName: string): Promise<string> {
  const icloudPath = icloudFilename(pathName, fileName);
  await downloadFromIcloud(icloudPath);
  const text = await cloudstore.readFile(icloudPath);
  if (!text) {
    const msg = 'icloud.fileReadText: fail downloadFile';
    LOG.error(msg);
    throw new Error(msg);
  }
  return text;
}

export async function fileDownload(pathName: string, fileName: string): Promise<string> {
  const icloudPath = icloudFilename(pathName, fileName);
  await downloadFromIcloud(icloudPath);
  return icloudPath;
}

async function downloadFromIcloud(icloudPath: string): Promise<void> {
  LOG.debug(`icloud.downloadFromIcloud: start: ${icloudPath}`);

  const downloadFile = async (iCloudPath: string): Promise<void> => {
    let progressing = false;
    return new Promise((resolve, reject) => {
      const id = setInterval(() => {
        LOG.error('icloud.downloadFile: timeout');
        if (!progressing) {
          clearInterval(id);
          reject('iCloud download timeout');
        }
        progressing = false;
      }, iosDownloadTimeoutMsec);
      cloudstore.download(iCloudPath, {
        onProgress: (data: {progress: number}) => {
          LOG.debug('icloud.downloadFromIcloud: progress');
          progressing = true;
          if (data.progress === 100) {
            LOG.debug('icloud.downloadFromIcloud: download done.');
            clearInterval(id);
            resolve();
          }
        },
      });
    });
  };
  await downloadFile(icloudPath);
  LOG.debug('icloud.downloadFromIcloud: end');
}

async function isExist(icloudPath: string): Promise<boolean> {
  try {
    return await cloudstore.exist(icloudPath);
  } catch (e: any) {
    LOG.error(`icloud.isExist: ${e.toString}`);
    return false;
  }
}

export async function cloudstoreRemoveFiles(pubkey: string): Promise<void> {
  if (!cloudstore.defaultICloudContainerPath) {
    return;
  }
  LOG.debug(`cloudstoreRemoveFiles: Start`);
  LOG.debug(`pubkey: ${pubkey}`);

  const backupDir = icloudFilename('backup', '');
  const dir = await cloudstore.readDir(backupDir);
  for (let lp = 0; lp < dir.length; lp++) {
    LOG.debug(`fname: ${dir[lp]}`);
    if (dir[lp].includes(pubkey)) {
      LOG.debug(`  remove: ${dir[lp]}`);
      await cloudstore.unlink(dir[lp]);
    }
  }
}
