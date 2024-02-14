import {Buffer} from 'buffer';

import {NativeModules} from 'react-native';
import {generateSecureRandom} from 'react-native-securerandom';

import * as lccontrol from './lccontrol';
import LndReactController from './LndReactController';
import {setBridgeAdminMacaroon} from './macaroon';
import * as payment from './payment';
import {request} from './request';

import * as keychain from 'store/keychain';
import {walletExists} from 'store/keychain';
import {generateConf} from 'tools';
import {waitForSec} from 'tools/async';
import {receiveInvoiceExpiry} from 'tools/constants';
import {LOG} from 'tools/logging';
import Satoshi from 'types/Satoshi';

const {NETWORK} = NativeModules.AppConfig;
const recoveryWindow = 2500; // lncli default window size

/**
 * Starts LND
 * TODO: unsafe関数を作る
 * @throws If already running, throws an error.
 */
export async function startLnd(peers: string[], wtclient: boolean, rescanWallet: boolean) {
  if (await isRunning()) {
    throw new Error('LND is already running');
  }
  const confFile = generateConf(NETWORK, false, peers, wtclient, rescanWallet);
  LndReactController.startLnd('', confFile);
}

/**
 * create new wallet for new passphrase
 */
export async function newWallet() {
  // securely create and save wallet seed
  const resJson = await request('GET', '/v1/genseed', {});
  const seed = resJson.cipher_seed_mnemonic;
  await createWallet(seed, null, 0);
}

export async function recoveryWallet(seed: string[], scb: string) {
  let channel_backups = {};
  if (scb.length > 0) {
    channel_backups = {
      multi_chan_backup: {
        multi_chan_backup: scb,
      },
    };
  }
  await createWallet(seed, channel_backups, recoveryWindow);
}

export async function recoveryProgress(): Promise<any> {
  try {
    const result = await request('GET', '/v1/getrecoveryinfo');
    return result;
  } catch (e) {
    return 0;
  }
}

/**
 * Initializes wallet and save credentials
 * TODO: unsafe関数を作る
 *
 * @param seed 24-word mnemonic that encodes a prior aezeed
 * @throws If LND is not running, throws an error.
 * @throws If status is not NON_EXISTING, it will fail.
 * @throws If wallet already exists, throws an error.
 */
async function createWallet(seed: string[], backups: any, window: number) {
  if (!(await isRunning())) {
    throw new Error('LND is not running');
  }
  if (await walletExists()) {
    throw new Error('Wallet already exists');
  }

  // securely create and save password
  const password = Buffer.from(await generateSecureRandom(32)).toString('hex');

  // create wallet
  // throws 500 if wallet is already created
  LOG.info('wallet: createWallet');
  const {admin_macaroon} = await request('POST', '/v1/initwallet', {
    cipher_seed_mnemonic: seed,
    wallet_password: Buffer.from(password, 'utf8').toString('base64'),
    stateless_init: true,
    recovery_window: window,
    channel_backups: backups,
  });

  // securely save
  await keychain.setSecureData(seed.join(' '), password, admin_macaroon);

  // set for internal use
  setBridgeAdminMacaroon(Buffer.from(admin_macaroon, 'base64').toString('hex'));
  // initialize lspclient(LND macaroon, cert, LSP cert, ...)
  lccontrol.initialize().catch(e => {
    if (e instanceof Error) {
      LOG.error(`createWallet: lccontrol.initialize: ${e.message}`);
    } else {
      LOG.error(`createWallet: lccontrol.initialize: ${String(e)}`);
    }
  });
}
/**
 * Load credentials and unlocks existing wallet
 * TODO: unsafe関数を作る
 *
 * @param recovering true=unlock with recovery
 * @throws If status is not LOCKED, it will fail.
 * @throws If wallet doesn't exist, throws an error.
 * @throws If LND is not running, throws an error.
 */
export async function unlockWallet(recovering: boolean) {
  if (!(await isRunning())) {
    throw new Error('LND is not running');
  }
  if (!(await walletExists())) {
    throw new Error('Wallet not exist');
  }

  const passwordCred = await keychain.getPassword();
  if (!passwordCred) {
    // only with a miracle or tocttou attack is attemted
    throw new Error('Fatal error: wallet is broken');
  }

  try {
    LOG.info(`unlockwallet: recovering=${recovering}`);
    await request('POST', '/v1/unlockwallet', {
      wallet_password: Buffer.from(passwordCred.password, 'utf8').toString('base64'),
      stateless_init: true,
      recovery_window: recovering ? recoveryWindow : 0,
    });
  } catch (e) {
    throw new Error('Failed to unlock');
  }
}

/**
 * enum lnrpcWalletState
 * (StateService is not alive)->WAITING_TO_START->one of NON_EXISTING, LOCKED->UNLOCKED->RPC_ACTIVE->(die as a result of shutdown)
 * Note: UNLOCKED state stays a moment.
 */
type LnrpcWalletState = 'NON_EXISTING' | 'LOCKED' | 'UNLOCKED' | 'RPC_ACTIVE' | 'SERVER_ACTIVE' | 'WAITING_TO_START';
/**
 * Call GetState
 * Will return null if LND's StateService is not running.
 */
export async function getState(): Promise<LnrpcWalletState | null> {
  try {
    const result = await request('GET', '/v1/state'); // this function doesn't need macaroon
    return result.state as LnrpcWalletState; // cast without checking
  } catch (e) {
    // network error
    return null;
  }
}
/**
 * Checks LND is running. Whether unlocked or not is not concerned.
 */
export async function isRunning() {
  return await LndReactController.isRunning();
}

/**
 * Waits until state matches one of given states.
 * Use such like when you wait until rpc gets ready.
 * @throws Throws if throwsIfUnavailable == true and LND's StateService is not running.
 *
 * Why throw option?
 * @param targetStates array of state
 * @param throwsIfUnavailable throw error if LND's StateService is not running.
 */
export async function waitForState(targetStates: LnrpcWalletState[] | LnrpcWalletState): Promise<void> {
  if (!Array.isArray(targetStates)) {
    targetStates = [targetStates];
  }
  if (__DEV__ && targetStates.includes('UNLOCKED')) {
    LOG.warn('UNLOCK stays only a moment so it is not recommended');
  }
  for (;;) {
    const currentState = await getState();
    if (currentState === null) {
      throw new Error('State service is unavailable');
    }
    if (targetStates.includes(currentState)) {
      break;
    }
    await waitForSec(0.5);
  }
}

/**
 * set admin macaroon with keychain data
 */
export async function setMacaroonWithKeychain() {
  const macCred = await keychain.getMacaroon();
  if (!macCred) {
    throw new Error('Macaroon is not found');
  }
  setBridgeAdminMacaroon(Buffer.from(macCred.password, 'base64').toString('hex'));
}

export async function newAddress(): Promise<string> {
  const url = '/v1/newaddress?p2wkh';
  const res = await request('GET', url, null);
  return res.address;
}

export type LnrpcAddInvoiceResponse = {
  r_hash: string;
  /**
   * A bare-bones invoice for a payment within the Lightning Network. With the
   * details of the invoice, the sender has all the data necessary to send a
   * payment to the recipient.
   */
  payment_request: string;
  /**
   * The "add" index of this invoice. Each newly created invoice will increment
   * this index making it monotonically increasing. Callers to the
   * SubscribeInvoices call can use this to instantly get notified of all added
   * invoices with an add_index greater than this one.
   */
  add_index: string;
  /**
   * The payment address of the generated invoice. This value should be used
   * in all payments for this invoice as we require it for end to end
   * security.
   */
  payment_addr: string;
};

/**
 * Adds a new invoice to the invoice database
 */
export async function addInvoice(
  /** Amount in msat precision */
  value: Satoshi,
  /** payment description attached to invoice */
  memo: string,
  /** Payment request expiry time in seconds. Default is 3600 (1 hour). */
  expiry = receiveInvoiceExpiry,
  /** Preimage. Default is LND random. */
  preimage = '',
  /** if true, add private channel to invoice and check route_hints > 0 */
  addPrivateChan = true,
  // the rest of the arguments will be added in the future
): Promise<string> {
  if (preimage.length !== 0) {
    preimage = Buffer.from(preimage, 'hex').toString('base64');
  }
  const resp = (await request('POST', '/v1/invoices', {
    value_msat: value.toMsat().toString(),
    memo,
    expiry: expiry.toString(),
    private: addPrivateChan,
    r_preimage: preimage,
  })) as LnrpcAddInvoiceResponse;

  // check private route hints
  if (addPrivateChan) {
    LOG.debug(resp.payment_request);
    const decode = await payment.decodePayReq(resp.payment_request);
    LOG.trace(decode);
    if (decode.route_hints.length === 0) {
      LOG.error('no route hints');
      throw new Error('no route hints');
    }
  } else {
    LOG.trace('skip route hints check');
  }
  return resp.payment_request;
}

type LnPayStatus = 'UNKNOWN' | 'IN_FLIGHT' | 'SUCCEEDED' | 'FAILED';
export type LnPayment = {
  // REST API
  value_sat: Satoshi;
  fee_sat: Satoshi;
  status: LnPayStatus;
  creation_time_ns: string;
  payment_request: string;
  payment_hash: string;
  payment_preimage: string;
  payment_index: string;
  failure_reason: string;
  htlcs: any[];
  // internal
  timestamp: string;
};
export type ListPayments = {
  first_index_offset: string;
  last_index_offset: string;
  payments: LnPayment[];
};

type LnInvState = 'OPEN' | 'SETTLED' | 'CANCELED' | 'ACCEPTED';
export type LnInvoice = {
  // REST API
  value: Satoshi;
  state: LnInvState;
  creation_date: string;
  settled: boolean;
  settle_date: string;
  payment_request: string;
  add_index: string;
  r_hash: string;
  r_preimage: string;
  memo: string;
  expiry: string;
  // internal
  timestamp: string;
};
export type ListInvoices = {
  first_index_offset: string;
  last_index_offset: string;
  invoices: LnInvoice[];
};

export type BtcTxn = {
  // REST API
  amount: string;
  total_fees: string;
  dest_addresses: string[];
  time_stamp: string;
  label: string;
  tx_hash: string;
  block_hash: string;
  block_height: number;
  num_confirmations: number;
};
export type BtcChainTxns = {
  transactions: BtcTxn[];
};
export type ListUnspent = {
  address_type: number;
  address: string;
  amount_sat: string;
};
export type BtcUnspents = {
  utxos: ListUnspent[];
};

export async function listTransactions(startHeight: number, endHeight = -1): Promise<BtcChainTxns> {
  return await request('GET', `/v1/transactions?start_height=${startHeight}&end_height=${endHeight}`, null);
}

export async function listUnspent(): Promise<BtcUnspents> {
  return await request('GET', '/v1/utxos?min_confs=1&max_confs=2147483647');
}

export async function listPayments(reversed: boolean, indexOffset: string, lnHistoryMax: number): Promise<ListPayments> {
  const url = `/v1/payments?include_incomplete=true&reversed=${reversed}&index_offset=${indexOffset}&max_payments=${lnHistoryMax}`;
  return await request('GET', url, null);
}

export async function listInvoices(reversed: boolean, indexOffset: string, lnHistoryMax: number): Promise<ListInvoices> {
  const url = `/v1/invoices?index_offset=${indexOffset}&reversed=${reversed}&num_max_invoices=${lnHistoryMax}`;
  return await request('GET', url, null);
}

export async function lookupInvoice(paymentHash: string): Promise<any> {
  const url = `/v1/invoice/${paymentHash}`;
  return await request('GET', url, null);
}

export async function labelTransaction(txid: string, label: string): Promise<ListInvoices> {
  const txidBuf = Buffer.from(txid, 'hex');
  for (let idx = 0; idx < 16; idx++) {
    const tmp = txidBuf[idx];
    txidBuf[idx] = txidBuf[31 - idx];
    txidBuf[31 - idx] = tmp;
  }
  const data = {
    txid: txidBuf.toString('base64'),
    label: label,
    overwrite: true,
  };
  return await request('POST', '/v2/wallet/tx/label', data);
}

export async function resetWallet(): Promise<boolean> {
  try {
    await LndReactController.resetWallet();
    await keychain.resetSecureData();
    return true;
  } catch {
    return false;
  }
}
