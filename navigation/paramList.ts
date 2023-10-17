export type ParamList = {
  Root: SendLightningParams;
  Start: any;
  Disclaimer: {
    value: string;
  };
  Check: {
    value: string;
  };
  RestorePassphrase: {
    number: number;
    phrases: string[];
    initialValue: string;
  };
  RestoreStart: {
    phrases: string[];
  };
  QrScanner: any;
  Connect: {
    appId: string;
  };
  Channels: any;
  ChannelDetails: {
    id: string | null | undefined;
    status: string | null | undefined;
  };
  TransactionList: any;
  OnchainTransactionList: any;
  Lapps: any;
  Settings: {
    checking: boolean;
  };
  SettingsLanguage: any;
  SettingSwitchTheme: any;
  DetailSettings: {
    checking: boolean;
  };
  SettingsUnit: any;
  BackupPassphrase: {
    init: boolean;
  };
  ConfirmPassphrase: any;
  Support: any;
  Tutorial: {
    id: string;
  };
  SettingDigit: {start: boolean};
  SettingExplorer: any;
  SecureLockSettings: any;
  EnterPin: any;
  Pin: {
    status: InputStatus;
    reset: boolean;
    screen?: {
      name: keyof ParamList;
      params: any;
    };
  };
  Debug: any;
  SupportOpenSource: any;
  Shutdown: {
    option: 'QUIT' | 'RESTART' | 'NONE';
    rescan: boolean;
  };
  SwapReceive: {
    address: string;
    feePercent: number;
    minFee: number;
  };
  Refund: {
    address?: string;
  };
  ReceiveDetail: ReceiveLightningParams | ReceiveOnchainParams;
  OtfReceive: OtfReceiveParams;
  Withdraw: {
    lnurl: string;
  };
  LNURLPay: {
    decodedLNURL: string;
  };
};

export type routeStateParamError = 'UNKNOWN_PATH';

export type SendLightningParams = {
  invoice: string;
  decoded: LnInvoiceResponse;
  maxStruck: boolean;
  errorReason?: routeStateParamError;
};

type ReceiveLightningParams = {
  invoice: string;
  amount: string; // in satoshi, allows msat (with decimal point)
  expiresIn: string; // timestamp string
  description?: string;
};
type ReceiveOnchainParams = {
  address: string;
  amount?: string; // in satoshi
  message?: string;
};
type OtfReceiveParams = {
  invoice: string;
  amount: string; // in satoshi
  expiresIn: string; // timestamp string
  description?: string;
  proportionalFeeRate: number;
  minFee: number;
};

export type InputStatus = 'ENTER' | 'FORE' | 'REGISTER' | 'CONFIRM' | 'ERROR' | 'SETTINGS';

export type LnInvoiceResponse = {
  destination: string;
  payment_hash: string;
  num_satoshis: string;
  timestamp: string;
  expiry: string;
  description: string;
  description_hash: string;
  fallback_addr: string;
  cltv_expiry: string;
  route_hints: any[];
  payment_addr: string;
  num_msat: string;
  features: any;
  expired: boolean;
  expiryTime: number;
};
