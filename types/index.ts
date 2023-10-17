import {MacPermission} from './Macaroon';
import Satoshi from './Satoshi';

/** kind of network */
export type NetworkKind = 'mainnet' | 'testnet' | 'signet' | 'simnet';

export type AppDetail = {
  /** enable to navigate connect screen*/
  connect: boolean;
  /** enable to display in iOS*/
  enableIos: boolean;
  /** App ID */
  appId: string;
  /** App name */
  name: string;
  /** Category */
  category: 'game' | 'wallet' | 'utility';
  /** App authors's name */
  author: string;
  /** Homepage URL of app */
  homepage: string;
  icon: any;
  description: string;
  /** Android specific information*/
  android?: (
    | {
        /** pass URL via intent */
        mode: 'intent';
        /** android package ID if mode is intent */
        packageId: string;
      }
    | {
        /** pass URL via clipboard */
        mode: 'copy';
      }
  ) & {
    /** common field */
    /** URL that passed to app. */ url: string;
    /** connection protocol */
    protocol: 'grpc' | 'rest';
    /** macaroon permissions */
    macaroonPermissions: MacPermission[];
  };
};

/** kind of LND request */
export type LNDRequestKind = 'GET' | 'POST' | 'DELETE';

export interface LNDStatus {
  /**
   * true if LND daemon is running
   * @defaultValue false
   */
  running: boolean;
  /**
   * true if WalletUnlocker is ready
   * @defaultValue false
   */
  walletUnlockerReady: boolean;
  /**
   * true if wallet is unlocked and rpc is ready
   * @defaultValue false
   */
  ready: boolean;
  /**
   * true if status is unknown and can't show any information
   * @defaultValue true
   */
  loading: boolean;
  /**
   * true if lnd is caught up to chain
   */
  syncedToChain?: boolean;
  /**
   * block height
   */
  blockHeight?: number;
  /**
   * list of open channels
   */
  channels?: Channel[];
  /**
   * node color
   */
  color?: string;
  /**
   * whether stopLND() is already called.
   * If true, you should not make RPC calls
   */
  shutdownRequested?: boolean;
  /**
   * balance
   */
  balance?: Balance;
  /**
   * true if startLND is called
   */
  started: boolean;
  /**
   * node id
   */
  nodeId: string;
}
export interface Channel {
  status: 'active' | 'inactive' | 'opening' | 'closing' | 'forceClosing' | 'closeWaiting';
  localBalance: Satoshi;
  remoteBalance: Satoshi;
  channelId?: string;
  capacity: Satoshi;
  numUpdates?: number;
  localReserve: Satoshi;
  remoteReserve: Satoshi;
  remoteNodePub: string;
  channelPoint?: string;
  alias: string;
  private?: boolean;
  localConstraintReserveSat?: Satoshi;
  dustLimitSat?: Satoshi;
  sendableBandwidth?: Satoshi;
}
export interface ClosedChannel {
  channelPoint: string;
  channelId: string;
  chainHash: string;
  closingTxHash: string;
  remoteNodePub: string;
  capacity: string;
  closeHeight: number;
  settledBalance: string;
  timeLockedBalance: string;
  closeType: string;
  openInitiator: string;
  closeInitiator: string;
  resolutions?: any[];
  alias?: string;
  timestamp?: number;
}
export interface ChannelInfo {
  channel_id: string;
  chan_point: string;
  last_update: number;
  node1_pub: string;
  node2_pub: string;
  capacity: string;
  node1_policy: any[];
  node2_policy: any[];
  alias: string;
}

export interface Balance {
  /** sum of satoshi users can spend */
  total: Satoshi;
  /** sum of satoshi that there is chance that users can't spend */
  unconfirmed: Satoshi;
  onChain: {
    total: Satoshi;
    confirmed: Satoshi;
    unconfirmed: Satoshi;
  };
  offChain: {
    localPending: Satoshi;
    localUnsettled: Satoshi;
    local: Satoshi;
    total: Satoshi;
    remote: Satoshi;
  };
}

const digitRule = ['default', 'european'] as const;
export type DigitRule = typeof digitRule[number];

const explorer = ['blockstream', 'mempoolSpace'] as const;
export type Explorer = typeof explorer[number];

export interface NotifiedInfo {
  title: string;
  message: string;
}

export interface ReceivedNotification {
  os: 'Android' | 'iOS';
  version: string;
  info: {
    index: number;
    notification: boolean;
    en: NotifiedInfo[];
    es: NotifiedInfo[];
    ja: NotifiedInfo[];
  };
}

export interface PromotionInfo {
  name: string;
  info: {
    is_active: boolean;
  };
}
