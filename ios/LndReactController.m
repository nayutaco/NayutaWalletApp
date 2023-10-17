//
//  LndReactController.m
//  Core2
//
//  Created by Yuta Nakano on 2022/12/13.
//

#import "React/RCTBridgeModule.h"
#import "React/RCTEventEmitter.h"

@interface RCT_EXTERN_MODULE(LndReactController, RCTEventEmitter)
  RCT_EXTERN_METHOD(
    setup: (NSString)addr
    port: (double)port
    resolver: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
  RCT_EXTERN_METHOD(
    startLnd: (NSString)startArgs
    config: (NSString)config
    resolver: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
  RCT_EXTERN_METHOD(shutdownLnd)
  RCT_EXTERN_METHOD(
    getCert: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
  RCT_EXTERN_METHOD(
    request: (NSString)method
    url: (NSString)url
    bodyJson: (NSString)bodyJson
    adminMacaroon: (NSString)adminMacaroon
    resolver: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
  RCT_EXTERN_METHOD(
    isRunning: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
  RCT_EXTERN_METHOD(
    messageNotification: (NSString)message
    iconType: (double)iconType
  )
  RCT_EXTERN_METHOD(restartApp)
  RCT_EXTERN_METHOD(stopService)
  RCT_EXTERN_METHOD(killProcess)
  RCT_EXTERN_METHOD(
    resetWallet: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )

  RCT_EXTERN_METHOD(
    ccAddChannelList: (NSString)channelPoint
    resolver: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
  RCT_EXTERN_METHOD(
    ccRemoveChannelList: (NSString)channelPoint
    resolver: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
  RCT_EXTERN_METHOD(
    ccRemoveChannelListAll: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
  RCT_EXTERN_METHOD(
    ccGetAlarmParams: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
  RCT_EXTERN_METHOD(
    ccSetAlarmParams: (BOOL)enabled
    intervalMinute: (double)intervalMinute
    limitMinute: (double)limitMinute
    resolver: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
@end
