//
//  LndGrpcLightning.m
//  Core2
//
//  Created by ueno on 2023/04/15.
//

#import "React/RCTBridgeModule.h"
#import "React/RCTEventEmitter.h"

@interface RCT_EXTERN_MODULE(LndGrpcLightning, RCTEventEmitter)
  RCT_EXTERN_METHOD(
    startWatchLnInvoices: (double)startIndex
    adminMacaroon: (NSString)adminMacaroon
    resolver: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
  RCT_EXTERN_METHOD(
    closeChannelStart: (NSString)fundingTxid
    outPointIndex: (double)outPointIndex
    forceClose: (BOOL)forceClose
    satPerVByte: (double)satPerVByte
    adminMacaroon: (NSString)adminMacaroon
    resolver: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
  RCT_EXTERN_METHOD(
    subscribeTransactions: (NSString)adminMacaroon
    resolver: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
  RCT_EXTERN_METHOD(
    subscribeChannelEvents: (NSString)adminMacaroon
    resolver: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
  RCT_EXTERN_METHOD(
    subscribeChannelBackups: (NSString)adminMacaroon
    resolver: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
@end