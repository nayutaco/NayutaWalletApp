//
//  LndGrpcRouter.swift
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

@objc(LndGrpcRouter)
class LndGrpcRouter : RCTEventEmitter {
  @objc
  override static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc
  override func supportedEvents() -> [String]! {
    return ["grpc_payment"]
  }

  @objc
  func sendPaymentV2(
    _ paymentRequest: String,
    feeLimitSat: Double,
    timeoutSec: Double,
    amt: Double,
    adminMacaroon: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let eventName = "grpc_payment"

    do {
      let headers: HPACKHeaders = ["macaroon": adminMacaroon]
      let channel = try LndGrpc.getInstance().createChannel()
      func callback(result: Lnrpc_Payment) {
        print("sendPaymentV2.callback: \(result)")
        let result: [String: Any] = [
          "event": "payment",
          "invoice": result.paymentRequest,
          "hash": result.paymentHash,
          "value": result.value,
          "status": result.status.rawValue,
          "failure": result.failureReason.rawValue
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
          "param": error ?? "unknown error"
        ]
        sendEvent(withName: eventName, body: result)
      }
      let client = Routerrpc_RouterNIOClient(channel: channel)
      var req = Routerrpc_SendPaymentRequest()
      req.paymentRequest = paymentRequest
      req.feeLimitSat = Int64(feeLimitSat)
      req.timeoutSeconds = Int32(timeoutSec)
      if (amt != 0) {
        print("sendPaymentV2 - amt=\(amt)")
        req.amt = Int64(amt)
      }
      let callOption = CallOptions(customMetadata: headers)
      let call = client.sendPaymentV2(req, callOptions: callOption, handler: callback)
      call.status.whenComplete { response in
        print("sendPaymentV2 complete: \(response)")
        let result: [String: Any]
        switch response {
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
      print("sendPaymentV2() - started")
      resolve(nil)
    } catch {
      print("sendPaymentV2 error: \(error)")
      reject("LndGrpcRouter", "sendPaymentV2", error)
    }
  }
}
