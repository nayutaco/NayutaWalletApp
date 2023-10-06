//
//  AppOpener.swift
//  Core2
//
//  Created by ueno on 2023/04/15.
//

import Foundation

@objc(AppOpener)
class AppOpener : NSObject {
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc
  func openAppWithUrl(
    _ url: String,
    packageId: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    print("AppOpener.openAppWithUrl not supported");
    reject("AppOpener", "openAppWithUrl not supported", nil)
  }

  @objc
  func canOpenAppWithUrl(
    _ url: String,
    packageId: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    print("AppOpener.canOpenAppWithUrl not supported");
    reject("AppOpener", "canOpenAppWithUrl not supported", nil)
  }
}
