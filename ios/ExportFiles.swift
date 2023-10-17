//
//  ExportFiles.swift
//  Core2
//
//  Created by ueno on 2023/04/15.
//

import Foundation

@objc(ExportFiles)
class ExportFiles : NSObject {
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc
  func exportTextFile(
    _ filename: String,
    text: String
  ) {
    // ToDo 実装
    print("ExportFiles.exportTextFile not implemented");
  }

  @objc
  func readTextFile(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    // ToDo 実装
    print("ExportFiles. not implemented");
    reject("ExportFiles", "readTextFile not implemented", nil)
  }

  @objc
  func exportBackups(
    _ chanBackup: String
  ) {
    // ToDo 実装
    print("ExportFiles.exportBackups not implemented");
  }

  @objc
  func readSubmarineBackup(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    // ToDo 実装
    print("ExportFiles.readSubmarineBackup not implemented");
    reject("ExportFiles", "readSubmarineBackup not implemented", nil)
  }

  @objc
  func createSubmarineDbFile(
    _ dbBase64: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    // ToDo 実装
    print("ExportFiles.createSubmarineDbFile not implemented");
    reject("ExportFiles", "createSubmarineDbFile not implemented", nil)
  }
}
