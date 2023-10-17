//
//  AppOpener.m
//  Core2
//
//  Created by ueno on 2023/04/15.
//

#import "React/RCTBridgeModule.h"

@interface RCT_EXTERN_MODULE(AppOpener, NSObject)
  // RN module
  RCT_EXTERN_METHOD(
    openAppWithUrl: (NSString)url
    packageId: (NSNumber)packageId
    resolver: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
  RCT_EXTERN_METHOD(
    canOpenAppWithUrl: (NSString)url
    packageId: (NSNumber)packageId
    resolver: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
@end