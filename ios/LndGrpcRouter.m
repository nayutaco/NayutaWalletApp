//
//  LndGrpcRouter.m
//  Core2
//
//  Created by ueno on 2023/04/15.
//

#import "React/RCTBridgeModule.h"
#import "React/RCTEventEmitter.h"

@interface RCT_EXTERN_MODULE(LndGrpcRouter, RCTEventEmitter)
  RCT_EXTERN_METHOD(
    sendPaymentV2: (NSString)paymentRequest
    feeLimitSat: (double)feeLimitSat
    timeoutSec: (double)timeoutSec
    amt: (double)amt
    adminMacaroon: (NSString)adminMacaroon
    resolver: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
@end