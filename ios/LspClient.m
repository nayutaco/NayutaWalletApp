//
//  LspClient.m
//  Core2
//
//  Created by ueno on 2023/04/15.
//

#import "React/RCTBridgeModule.h"
#import "React/RCTEventEmitter.h"

@interface RCT_EXTERN_MODULE(LspClient, RCTEventEmitter)
  RCT_EXTERN_METHOD(
    initialize: (NSString)lspCert
    adminMacaroon: (NSString)adminMacaroon
    lspAddr: (NSString)lspAddr
    lspToken: (NSString)lspToken
    resolver: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
  RCT_EXTERN_METHOD(
    ping: (double)nonce
    resolver: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
  RCT_EXTERN_METHOD(
    getLspVersion: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
  RCT_EXTERN_METHOD(
    getHubLnNodeString: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
  RCT_EXTERN_METHOD(
    getFeePermyriad: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
  RCT_EXTERN_METHOD(
    receiveMax: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
  RCT_EXTERN_METHOD(
    paymentFee: (double)reqAmount
    resolver: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
  RCT_EXTERN_METHOD(
    paymentRegister: (double)reqAmount
    memo: (NSString)memo
    resolver: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
  RCT_EXTERN_METHOD(
    submarineRefundBlock: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
  RCT_EXTERN_METHOD(
    submarineCreateKeys: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
  RCT_EXTERN_METHOD(
    submarineRegister: (NSString)paymentHash
    repayPubkey: (NSString)repayPubkey
    resolver: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
  RCT_EXTERN_METHOD(
    submarineReceive: (NSString)paymentHash
    invoice: (NSString)invoice
    resolver: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
  RCT_EXTERN_METHOD(
    submarineRepayment: (NSArray)repayParams
    repayAddress: (NSString)repayAddress
    label: (NSString)label
    resolver: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
  RCT_EXTERN_METHOD(
    submarineReregister: (NSString)script
    resolver: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
  RCT_EXTERN_METHOD(
    selfRebalance: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
  RCT_EXTERN_METHOD(
    queryRoutePayment: (NSString)invoice
    feeLimitSat: (double)feeLimitSat
    amtSat: (double)amtSat
  )
  RCT_EXTERN_METHOD(
    requestOpenChannel: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
  RCT_EXTERN_METHOD(
    integrityAppCheck: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
@end
