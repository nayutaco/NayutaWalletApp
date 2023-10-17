import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {GDrive, ListQueryBuilder, MimeTypes} from '@robinbobin/react-native-google-drive-api-wrapper';

import {LOG} from './logging';

/* structure
 *
 * GoogleDrive/
 *   |
 *   +-- MyDrive/
 *        |
 *        +-- <application>/
 *              |
 *              +-- <buildValiant>/
 *                    |
 *                    +-- chan-<node_id>.backup
 *                    +-- submarine-<node_id>.backup
 */

// https://developers.google.com/drive/api/guides/appdata#create_a_file_in_the_application_data_folder
const appDataFolder = 'appDataFolder';
const apiTimeoutMsec = 10000;
const retryMax = 5;
const retrySleepMs = 1000;
const retrySleep = () => new Promise(resolve => setTimeout(resolve, retrySleepMs));

export type Metadata = {
  name: string;
  date: Date;
};

export async function googleSignIn(): Promise<string> {
  try {
    LOG.debug('googleSignIn');
    GoogleSignin.configure({
      // https://developers.google.com/identity/protocols/oauth2/scopes#drive
      scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.appdata'],
    });
    // await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    return userInfo.user.email;
  } catch (e: any) {
    LOG.debug(`googleSignIn fail: ${e.toString()}`);
    throw e;
  }
}

export async function googleSignOut() {
  await GoogleSignin.signOut();
}

async function googleDrive(): Promise<GDrive> {
  const g = new GDrive();
  g.accessToken = (await GoogleSignin.getTokens()).accessToken;
  g.fetchCoercesTypes = true;
  g.fetchRejectsOnHttpErrors = true;
  g.fetchTimeout = apiTimeoutMsec;
  return g;
}

async function queryFiles(q: ListQueryBuilder): Promise<[GDrive, any[]]> {
  const gDrive = await googleDrive();
  const l = await gDrive.files.list({
    q,
    spaces: appDataFolder,
  });
  return [gDrive, l.files];
}

export async function gdriveSetup() {
  await googleDrive();
}

async function fileUpload(fileName: string, data: string, isBin: boolean) {
  const q = new ListQueryBuilder().e('name', fileName);
  const [gDrive, files] = await queryFiles(q);
  let retry = retryMax;
  let err;
  while (retry--) {
    try {
      const uploader = gDrive.files.newMultipartUploader().setData(data, isBin ? MimeTypes.BINARY : MimeTypes.TEXT);
      if (files.length === 0) {
        uploader.setRequestBody({name: fileName, parents: [appDataFolder]});
      } else {
        uploader.setIdOfFileToUpdate(files[0].id);
      }
      if (isBin) {
        uploader.setIsBase64(true);
      }
      await uploader.execute();
      return;
    } catch (e: any) {
      LOG.debug(`fileUpload[${retry}] fail: ${e.toString()}`);
      err = e;
    }
    retrySleep();
  }
  LOG.error(`fileUpload fail: ${err.toString()}`);
  throw err;
}

export async function gdriveUploadText(fileName: string, data: string) {
  await fileUpload(fileName, data, false);
}

export async function gdriveUploadBin(fileName: string, base64Data: string) {
  await fileUpload(fileName, base64Data, true);
}

async function fileRead(fileName: string, isBin: boolean): Promise<Uint8Array | string> {
  let retry = retryMax;
  let err;
  while (retry--) {
    try {
      const q = new ListQueryBuilder().e('name', fileName);
      const [gDrive, files] = await queryFiles(q);
      if (files.length === 1) {
        if (isBin) {
          // @return Uint8Array
          return await gDrive.files.getBinary(files[0].id);
        } else {
          // @return string
          return await gDrive.files.getText(files[0].id);
        }
      } else {
        err = new Error(`fileRead[${retry}]: not 1 file: ${fileName}, ${isBin ? 'BIN' : 'TEXT'}, ${files.length}`);
        break;
      }
    } catch (e: any) {
      LOG.warn(`fileRead[${retry}]: ${e.toString()}`);
      err = e;
    }
    retrySleep();
  }
  LOG.error(`fileRead fail: ${err.toString()}`);
  throw err;
}

export async function gdriveFileReadText(fileName: string): Promise<string> {
  const result = await fileRead(fileName, false);
  if (typeof result === 'string') {
    return result;
  } else {
    const msg = `gdriveFileReadText: not string result(${fileName})`;
    LOG.error(msg);
    throw new Error(msg);
  }
}

export async function gdriveFileReadBin(fileName: string): Promise<Uint8Array> {
  const result = await fileRead(fileName, true);
  if (result instanceof Uint8Array) {
    return result;
  } else {
    const msg = `gdriveFileReadBin: not Uint8Array result(${fileName})`;
    LOG.error(msg);
    throw new Error(msg);
  }
}

export async function gdriveDeleteFile(fileName: string) {
  try {
    const q = new ListQueryBuilder().e('name', fileName);
    const [gDrive, files] = await queryFiles(q);
    if (files.length === 1) {
      await gDrive.files.delete(files[0].id);
    } else {
      const msg = `gdriveDeleteFile: not 1 file: ${fileName}, ${files.length}`;
      throw new Error(msg);
    }
  } catch (e: any) {
    LOG.error(`gdriveDeleteFile: ${e}`);
    throw e;
  }
}

export async function gdriveMetadata(mask: string): Promise<Metadata[]> {
  const q = new ListQueryBuilder().contains('name', mask);
  const [gDrive, files] = await queryFiles(q);

  const ret = [];
  for (let lp = 0; lp < files.length; lp++) {
    const m = await gDrive.files.getMetadata(files[lp].id, {fields: 'name,modifiedTime'});
    // modifiedTime is RFC-3339 format
    const dt = new Date(Date.parse(m.modifiedTime));
    ret.push({name: m.name, date: dt});
  }
  return ret;
}

export async function gdriveFiles(): Promise<Metadata[]> {
  const q = new ListQueryBuilder();
  const [gDrive, files] = await queryFiles(q);

  const ret = [];
  for (let lp = 0; lp < files.length; lp++) {
    const m = await gDrive.files.getMetadata(files[lp].id, {fields: 'name,modifiedTime'});
    // modifiedTime is RFC-3339 format
    const dt = new Date(Date.parse(m.modifiedTime));
    ret.push({name: m.name, date: dt});
  }
  return ret;
}
