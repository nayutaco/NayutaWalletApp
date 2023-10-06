//
//  ExportFiles.m
//  Core2
//
//  Created by ueno on 2023/04/15.
//

#import "React/RCTBridgeModule.h"

@interface RCT_EXTERN_MODULE(ExportFiles, NSObject)
  RCT_EXTERN_METHOD(
    exportTextFile: (NSString)filename
    text: (NSString)text
  )
  RCT_EXTERN_METHOD(
    readTextFile: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
  RCT_EXTERN_METHOD(
    exportBackups: (NSString)chanBackup
  )
  RCT_EXTERN_METHOD(
    readSubmarineBackup: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
  RCT_EXTERN_METHOD(
    createSubmarineDbFile: (NSString)dbBase64
    resolver: (RCTPromiseResolveBlock)resolve
    rejecter: (RCTPromiseRejectBlock)reject
  )
@end