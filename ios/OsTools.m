//
//  OsTools.m
//  Core2
//
//  Created by ueno on 2023/04/15.
//

#import "React/RCTBridgeModule.h"

@interface RCT_EXTERN_MODULE(OsTools, NSObject)
  // RN module
  RCT_EXTERN_METHOD(
    screenshotPrevent: (BOOL)enable
  )
@end