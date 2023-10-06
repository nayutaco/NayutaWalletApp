//
//  AppConfig.swift
//  Core2
//
//  Created by ueno on 2023/04/13.
//

import Foundation

func getNetwork() -> String {
#if MAINNET
  return "mainnet"
#elseif TESTNET
  return "testnet"
#elseif SIGNET
  return "signet"
#else
#error ("Invalid Network")
#endif
}

func getBuildType() -> String {
#if DEBUG
  return "DEBUG"
#elseif RELEASE
  return "RELEASE"
#else
#error ("Invalid Build Type")
#endif
}

@objc(AppConfig)
class AppConfig : NSObject, RCTBridgeModule {
  static func moduleName() -> String! {
    return "AppConfig"
  }
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc
  func constantsToExport() -> [AnyHashable : Any]! {
    let type = getBuildType()
    let network = getNetwork()

    print("BUILD_TYPE: " + type)
    print("NETWORK: " + network)
    
    return [
      "BUILD_TYPE": type,
      "NETWORK": network,
    ]
  }
}
