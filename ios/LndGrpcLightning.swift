//
//  LndGrpcLightning.swift
//  Core2
//
//  Created by ueno on 2023/04/15.
//

import Foundation
import Lndmobile
import GRPC
import NIO
import NIOSSL
import NIOHPACK

@objc(LndGrpcLightning)
class LndGrpcLightning : RCTEventEmitter {
  var subscribeBackupsNum = 0

  @objc
  override static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc
  override func supportedEvents() -> [String]! {
    return [
      "grpc_watchLnInv",
      "grpc_watchTx",
      "grpc_watchCh",
      "grpc_watchChanBackup"
    ]
  }

  @objc
  func startWatchLnInvoices(
    _ startDate: Double,
    adminMacaroon: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let eventName = "grpc_watchLnInv"

    do {
      let headers: HPACKHeaders = ["macaroon": adminMacaroon]
      let channel = try LndGrpc.getInstance().createChannel()
      func callback(invoice: Lnrpc_Invoice) {
        if (invoice.state.rawValue == Lnrpc_InvoiceHTLCState.settled.rawValue && invoice.settleDate >= Int64(startDate)) {
          let rhash = dataToHex(invoice.rHash)
          let result: [String: Any] = [
            "event": "settled",
            "param": rhash
          ]
          sendEvent(withName: eventName, body: result)
        }
      }
      func completeHanlder() {
        let result: [String: Any] = [
          "event": "completed",
        ]
        sendEvent(withName: eventName, body: result)
      }
      func errorHandler(_ error: String?) {
        let result: [String: Any] = [
          "event": "error",
          "param": error ?? "unknown error"
        ]
        sendEvent(withName: eventName, body: result)
      }
      let client = Lnrpc_LightningNIOClient(channel: channel)
      let req = Lnrpc_InvoiceSubscription()
      let callOption = CallOptions(customMetadata: headers) // timeoutはcallbackも含む？
      let call = client.subscribeInvoices(req, callOptions: callOption, handler: callback)
      call.status.whenComplete { response in
        print("startWatchLnInvoices complete: \(response)")
        switch (response) {
          case .success(let status):
            if (status.code.rawValue == 0) {
              completeHanlder()
            } else {
              errorHandler(status.message)
            }
            break
          default:
            errorHandler("unknown error")
            break
        }
      }
      resolve(nil)
    } catch {
      print("startWatchLnInvoices error: \(error)")
      reject("LndGrpcLightning", "startWatchLnInvoices", error)
    }
  }
  
  @objc
  func closeChannelStart(
    _ fundingTxid: String,
    outPointIndex: Double,
    forceClose: Bool,
    satPerVByte: Double,
    adminMacaroon: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    do {
      var done = false
      let headers: HPACKHeaders = ["macaroon": adminMacaroon]
      let channel = try LndGrpc.getInstance().createChannel()
      func callback(update: Lnrpc_CloseStatusUpdate) {
        print("closeChannelStart update: \(update)")
        if (!done) {
          done = true
          resolve(true)
        }
      }
      let client = Lnrpc_LightningNIOClient(channel: channel)
      var channelPoint = Lnrpc_ChannelPoint()
      channelPoint.fundingTxidStr = fundingTxid
      channelPoint.outputIndex = UInt32(outPointIndex)
      var req = Lnrpc_CloseChannelRequest()
      req.channelPoint = channelPoint
      if (forceClose) {
        req.force = true
      } else {
        req.satPerVbyte = UInt64(satPerVByte)
      }
      let callOption = CallOptions(customMetadata: headers)
      let call = client.closeChannel(req, callOptions: callOption, handler: callback)
      call.status.whenComplete { response in
        print("closeChannelStart complete: \(response)")
        if (!done) {
          done = true
          resolve(true)
        }
      }
    } catch {
      print("closeChannelStart error: \(error)")
      resolve(false)
    }
  }

  @objc
  func subscribeTransactions(
    _ adminMacaroon: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let eventName = "grpc_watchTx"

    do {
      let headers: HPACKHeaders = ["macaroon": adminMacaroon]
      let channel = try LndGrpc.getInstance().createChannel()
      func callback(transaction: Lnrpc_Transaction) {
        if (transaction.numConfirmations > 0) {
          print("subscribeTransactions.callback: \(transaction)")
          let result: [String: Any] = [
            "event": "detect",
            "txid": transaction.txHash,
            "confirm": transaction.numConfirmations,
            "amount": transaction.amount,
            "height": transaction.blockHeight,
            "addresses": transaction.destAddresses
          ]
          sendEvent(withName: eventName, body: result)
        }
      }
      func completeHanlder() {
        let result: [String: Any] = [
          "event": "completed",
        ]
        sendEvent(withName: eventName, body: result)
      }
      func errorHandler(_ error: String?) {
        let result: [String: Any] = [
          "event": "error",
          "reason": error ?? "unknown error"
        ]
        sendEvent(withName: eventName, body: result)
      }
      let client = Lnrpc_LightningNIOClient(channel: channel)
      let req = Lnrpc_GetTransactionsRequest()
      let callOption = CallOptions(customMetadata: headers)
      let call = client.subscribeTransactions(req, callOptions: callOption, handler: callback)
      call.status.whenComplete { response in
        print("subscribeTransactions complete: \(response)")
        switch (response) {
          case .success(let status):
            if (status.code.rawValue == 0) {
              completeHanlder()
            } else {
              errorHandler(status.message)
            }
            break
          default:
            errorHandler("unknown error")
            break
        }
      }
      resolve(nil)
    } catch {
      print("subscribeTransactions error: \(error)")
      reject("LndGrpcLightning", "subscribeTransactions", error)
    }
  }

  @objc
  func subscribeChannelEvents(
    _ adminMacaroon: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let eventName = "grpc_watchCh"

    do {
      let headers: HPACKHeaders = ["macaroon": adminMacaroon]
      let channel = try LndGrpc.getInstance().createChannel()
      func callback(event: Lnrpc_ChannelEventUpdate) {
        print("subscribeChannelEvents.callback: \(event)")
        switch event.type {
        case .openChannel:
          let result: [String: Any] = [
            "event": "OPEN_CHANNEL",
            "channel_point": event.openChannel.channelPoint
          ]
          sendEvent(withName: eventName, body: result)
        case .closedChannel:
          let result: [String: Any] = [
            "event": "CLOSED_CHANNEL",
            "channel_point": event.closedChannel.channelPoint
          ]
          sendEvent(withName: eventName, body: result)
        default:
          print("subscribeChannelEvents.callback: \(event.type)")
          break
        }
      }
      func completeHanlder() {
        let result: [String: Any] = [
          "event": "completed",
        ]
        sendEvent(withName: eventName, body: result)
      }
      func errorHandler(_ error: String?) {
        let result: [String: Any] = [
          "event": "error",
          "reason": error ?? "unknown error"
        ]
        sendEvent(withName: eventName, body: result)
      }
      let client = Lnrpc_LightningNIOClient(channel: channel)
      let req = Lnrpc_ChannelEventSubscription()
      let callOption = CallOptions(customMetadata: headers)
      let call = client.subscribeChannelEvents(req, callOptions: callOption, handler: callback)
      call.status.whenComplete { response in
        print("subscribeChannelEvents complete: \(response)")
        switch (response) {
          case .success(let status):
            if (status.code.rawValue == 0) {
              completeHanlder()
            } else {
              errorHandler(status.message)
            }
            break
          default:
            errorHandler("unknown error")
            break
        }
      }
      resolve(nil)
    } catch {
      print("subscribeChannelEvents error: \(error)")
      reject("LndGrpcLightning", "subscribeChannelEvents", error)
    }
  }

  @objc
  func subscribeChannelBackups(
    _ adminMacaroon: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let eventName = "grpc_watchChanBackup"

    do {
      let headers: HPACKHeaders = ["macaroon": adminMacaroon]
      let channel = try LndGrpc.getInstance().createChannel()
      func callback(backup: Lnrpc_ChanBackupSnapshot) {
        print("subscribeChannelBackups.callback: \(backup)")
        let backupBase64 = backup.multiChanBackup.multiChanBackup.base64EncodedString()
        var chanPoints: [[String: Any]] = []
        for chanBackup in backup.singleChanBackups.chanBackups {
          let chanPoint: [String: Any] = [
            "funding_txid_str": chanBackup.chanPoint.fundingTxidStr,
            "output_index": chanBackup.chanPoint.outputIndex
          ]
          chanPoints.append(chanPoint)
        }
        subscribeBackupsNum += 1
        let result: [String: Any] = [
          "event": "detect",
          "count": subscribeBackupsNum,
          "backupBase64": backupBase64,
          "chanPoints": chanPoints
        ]
        sendEvent(withName: eventName, body: result)
      }
      func completeHanlder() {
        let result: [String: Any] = [
          "event": "completed",
        ]
        sendEvent(withName: eventName, body: result)
      }
      func errorHandler(_ error: String?) {
        let result: [String: Any] = [
          "event": "error",
          "reason": error ?? "unknown error"
        ]
        sendEvent(withName: eventName, body: result)
      }
      let client = Lnrpc_LightningNIOClient(channel: channel)
      let req = Lnrpc_ChannelBackupSubscription()
      let callOption = CallOptions(customMetadata: headers)
      let call = client.subscribeChannelBackups(req, callOptions: callOption, handler: callback)
      call.status.whenComplete { response in
        print("subscribeChannelBackups complete: \(response)")
        switch (response) {
          case .success(let status):
            if (status.code.rawValue == 0) {
              completeHanlder()
            } else {
              errorHandler(status.message)
            }
            break
          default:
            errorHandler("unknown error")
            break
        }
      }
      resolve(nil)
    } catch {
      print("subscribeChannelBackups error: \(error)")
      reject("LndGrpcLightning", "subscribeChannelBackups", error)
    }
  }
}
