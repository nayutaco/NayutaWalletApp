import {EventEmitter, EventSubscription} from 'fbemitter';
import {isEqual} from 'lodash';
import {Platform} from 'react-native';
import RNRestart from 'react-native-restart';

import {sync as closeCheckerSync} from './closechecker';
import {getBalanceInfo, getChanInfo} from './info';
import * as lccontrol from './lccontrol';
import * as notification from './notification';
import {request} from './request';
import * as wallet from './wallet';

import * as appDb from 'appdb';
import LndReactController, {EventEmitter as nee} from 'bridge/LndReactController';
import {waitForFactory, waitForSec} from 'tools/async';
import {LOG} from 'tools/logging';
import * as types from 'types/';

const ee = new EventEmitter(); // useLND subscribe with this.
const waitForNativeEvent = waitForFactory(nee);

let timerId: ReturnType<typeof setTimeout> | null = null;
let prevStatus: types.LNDStatus;

// lifecycle flag
// Note that these values can be destroyed
let started = false;
let shutdownRequested = false;
let lndExitReason = '';

nee.removeAllListeners('error');
nee.addListener('error', arg => {
  LOG.error(`NativeEvent.Listener(error): ${arg}`);
});

nee.removeAllListeners('exit');
nee.addListener('exit', arg => {
  lndExitReason = arg;
  LOG.error(`NativeEvent.Listener(exit): ${JSON.stringify(arg)}`);
  started = false;
  if (Platform.OS === 'android') {
    // Androidではアプリ終了することもあるのでそれまでの捜査に任せる
    ee.emit('statusUpdated', {running: false, walletUnlockerReady: false, ready: false, shutdownRequested: true, started});
  } else {
    // iOSではアプリ終了するメニューがないので、常に再起動して良い
    forceRestart();
  }
});

// Android: notification bar action
nee.removeAllListeners('stop');
nee.addListener('stop', async (arg: string) => {
  LOG.error(`NativeEvent.Listener(stop): arg=${arg}`);
  await stopLND();
  switch (arg) {
    case 'com.nayuta.core2.action.TERMINATE':
      killProcess();
      break;
    case 'com.nayuta.core2.action.RESTART':
      forceRestart();
      break;
    default:
      LOG.error(`stop event: ${arg}`);
  }
});

// Maybe gRPC service is stopped.
// Cannot continue application.
ee.addListener('eventCompleted', (info: {from: string; event: string}) => {
  LOG.error(`Event.Listener(eventCompleted): from=${info.from}, event=${info.event}`);
  shutdownRequested = true;
  ee.removeCurrentListener();
  LndReactController.shutdownLnd(); // emit 'exit' event from Lndmobile after stopped.
});

export function emitEventCompleted(from: string, event: string) {
  LOG.info(`manager.emitEventCompleted(from:${from}, event:${event})`);
  ee.emit('eventCompleted', {from, event});
}

export function statusUpdatedListener(listener: any): EventSubscription {
  return ee.addListener('statusUpdated', listener);
}

export function getLndExitReason(): string {
  return lndExitReason;
}

export function isShutdownRequested(): boolean {
  return shutdownRequested;
}

/**
 * Start LND
 * @param peers peer to connect
 */
export async function startSystem(peers: string[], wtclient: boolean, rescanWallet: boolean) {
  LOG.info(`startSystem: started=${started}, rescanWallet=${rescanWallet}`);
  await appDb.init();
  if ((await wallet.getState()) === null) {
    wallet.startLnd(peers, wtclient, rescanWallet);
    LOG.info('LND starting...');
  } else {
    LOG.warn('LND already started for JS');
  }
  started = true;
}

async function rpcReadyAndGetState(): Promise<string | null> {
  let state = await wallet.getState();
  if (state === null) {
    await waitForNativeEvent('rpcReady');
    state = await wallet.getState();
  }
  return state;
}

export async function lnWaitLocked(): Promise<boolean> {
  let active = false;
  const state = await rpcReadyAndGetState();
  LOG.info(`lnWaitLocked(${state})...`);

  // When lnd tls.cert is outdated, lnd updates the tls.cert automatically on startup.
  // initialize() copys tls.cert string to lspclient after lnd update tls.cert.
  // If wallet not exist, lccontrol.initialize() called after creating wallet in wallet.createWallet().
  lccontrol.initialize();
  LOG.debug('lnWaitLocked: lccontol.initialize()');

  scheduleRefresh(); // watch changes
  switch (state) {
    case null:
    case 'WAITING_TO_START': {
      await wallet.waitForState(['LOCKED']);
      break;
    }
    case 'LOCKED':
      break;
    case 'RPC_ACTIVE':
      await wallet.waitForState(['SERVER_ACTIVE']);
      active = true;
      break;
    case 'SERVER_ACTIVE':
      active = true;
      break;
    default:
      throw new Error(`invalid locked state: ${state}`);
  }
  LOG.info(`lnWaitLocked: done(active=${active})`);
  return active;
}

async function lnWaitNonExist() {
  const state = await rpcReadyAndGetState();
  LOG.info(`lnWaitNonExist(${state})...`);
  switch (state) {
    case null:
    case 'WAITING_TO_START':
      scheduleRefresh(); // watch changes
      await wallet.waitForState(['NON_EXISTING']);
      break;
    case 'NON_EXISTING':
      break;
    default:
      throw new Error(`invalid non-exist state: ${state}`);
  }
  LOG.info('lnWaitNonExist: done');
}

export async function lnWaitActive() {
  const state = await wallet.getState();
  LOG.info(`lnWaitActive(${state})...`);
  switch (state) {
    case null:
      throw 'LND not started';
    case 'UNLOCKED':
    case 'RPC_ACTIVE':
      scheduleRefresh(); // watch changes
      await wallet.waitForState('SERVER_ACTIVE');
      // will be SERVER_ACTIVE and have macaroon
      break;
    case 'SERVER_ACTIVE': {
      break;
    }
    default:
      throw new Error(`invalid rpcactive state: ${state}`);
  }
  LOG.info('lnWaitActive: done');
}

/**
 * Confirm LND startup and invoke new wallet
 */
export async function invokeNewWallet() {
  try {
    LOG.info('wallet: new...');
    await lnWaitNonExist();
    await wallet.newWallet();
    LOG.info('wallet: new: DONE');
  } catch (e: any) {
    LOG.error(`invokeNewWallet: ${JSON.stringify(e)}`);
    throw e;
  }
}

export async function invokeRecoveryWallet(seed: string[], scb: string) {
  try {
    LOG.info('wallet: recovery...');
    await lnWaitNonExist();
    await wallet.recoveryWallet(seed, scb);
    LOG.info('wallet: recovery: DONE');
  } catch (e: any) {
    // ユーザのミス入力などによって失敗しやすい
    LOG.error(`invokeRecoveryWallet: ${JSON.stringify(e)}`);
    throw e;
  }
}

/**
 * Request LND to gracefully shutdown. Request via HTTP first, if it failed, request via internal API
 */
export async function stopLND() {
  shutdownRequested = true;
  await closeCheckerSync();
  notification.messageAlert(notification.message.shutdown);
  try {
    await request('POST', '/v1/stop', null);
  } catch (e: any) {
    LOG.log(`manager.stopLND: ${e.toString()}`);
  }
  ee.emit('statusUpdated', {running: true, walletUnlockerReady: false, ready: false, shutdownRequested, started: true});
  if (await wallet.isRunning()) {
    // if still running, wait for exit or 30 sec timeout
    await Promise.race([waitForSec(30), waitForNativeEvent('exit')]);
  }
  LndReactController.stopService();
}

/**
 * Low level API -- use this to get info, or check if rpc is ready
 */
export async function getInfo(): Promise<any> {
  const info = await request('GET', '/v1/getinfo', null);
  return info;
}

/**
 * refresh status
 */
export async function refresh() {
  const status = await getStatus();

  if (!isEqual(status, prevStatus)) {
    prevStatus = status;
    ee.emit('statusUpdated', status);
  }
}

/**
 * schedule refresh
 */
function scheduleRefresh() {
  timerId !== null && clearTimeout(timerId);
  timerId = setTimeout(async () => {
    try {
      await refresh();
    } catch (e) {
      // RPC is not ready
    }
    scheduleRefresh();
  }, 1000);
}

/**
 * Get Status
 */
export async function getStatus(): Promise<types.LNDStatus> {
  const currentState = await wallet.getState();
  switch (currentState) {
    case null:
      return {running: await wallet.isRunning(), walletUnlockerReady: false, ready: false, loading: false, shutdownRequested, started, nodeId: ''};
    case 'WAITING_TO_START':
      return {running: true, walletUnlockerReady: false, ready: false, loading: false, shutdownRequested, started: true, nodeId: ''};
    case 'LOCKED': // fallthrough
    case 'NON_EXISTING': // fallthrough
    case 'UNLOCKED':
      return {running: true, walletUnlockerReady: true, ready: false, loading: false, shutdownRequested, started: true, nodeId: ''};
    case 'RPC_ACTIVE':
    case 'SERVER_ACTIVE':
      break;
  }
  const [info, balance, channels] = await Promise.all([getInfo(), getBalanceInfo(), getChanInfo()]);
  return {
    running: true,
    syncedToChain: info?.synced_to_chain,
    ready: true,
    walletUnlockerReady: true,
    loading: false,
    blockHeight: info?.block_height,
    channels,
    color: info?.color,
    shutdownRequested,
    balance,
    started,
    nodeId: info?.identity_pubkey,
  };
}
export function killProcess() {
  LOG.info('manager killProcess');
  LndReactController.killProcess();
}
export function forceRestart() {
  LOG.info('manager forceRestart');
  if (Platform.OS === 'android') {
    LndReactController.restartApp();
  } else if (Platform.OS === 'ios') {
    RNRestart.Restart();
  }
}
