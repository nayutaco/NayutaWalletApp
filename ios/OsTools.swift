//
//  OsTools.swift
//  Core2
//
//  Created by ueno on 2023/04/15.
//

import Foundation

@objc(OsTools)
class OsTools : NSObject {
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc
  func screenshotPrevent(
    _ enable: Bool
  ) {
    print("OsTools.screenshotPrevent not implemented");
  }
}
