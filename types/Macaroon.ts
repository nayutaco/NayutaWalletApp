import {Buffer} from 'buffer';

/** Class that holds the value of macaroon */

export class Macaroon {
  constructor(private macaroonHex: string, public readonly kind: MacaroonKind) {}
  /** hex view */
  public asHex(): string {
    return this.macaroonHex;
  }
  /** hex view */
  public asBase64(): string {
    // not implemented
    return Buffer.from(this.macaroonHex, 'hex').toString('base64').replace(/[=]/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }
}
/** kind of macaroon without extension `.macaroon`, predefined or custom(the decimal string of rootKeyId) */
export type MacaroonKind = 'admin' | 'invoice' | 'readonly' | string;
/** lnrpcMacaroonPermission */

export type MacPermission =
  | {
      entity: 'onchain' | 'offchain' | 'address' | 'message' | 'peers' | 'info' | 'invoices' | 'signer' | 'macaroon';
      action: 'read' | 'write' | 'generate';
    }
  | {
      entity: 'url';
      action: string;
    };
