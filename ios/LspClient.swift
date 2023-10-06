//
//  LspClient.swift
//  Core2
//
//  Created by ueno on 2023/04/15.
//

import Foundation
import Lndmobile

@objc(LspClient)
class LspClient : RCTEventEmitter {
  @objc
  override static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc
  override func supportedEvents() -> [String]! {
    return ["grpc_route_payment"]
  }

  @objc
  func initialize(
    _ lspCert: String,
    adminMacaroon: String,
    lspAddr: String,
    lspToken: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    print("LspClient.initialize")
    let lndCert = LndReactController.getCertFile()
    LndmobileLcInit(
      lspCert,
      lndCert,
      LndGrpc.getInstance().getLndGrpcString(),
      adminMacaroon,
      lspAddr,
      lspToken
    )
    resolve(nil)
  }

  @objc
  func ping(
    _ nonce: Double,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    print("LspClient.ping")

    var result: Int32 = 0
    var lndError: NSError?
    LndmobileLcPing(Int32(nonce), &result, &lndError)
    if (lndError == nil) {
      resolve(result)
    } else {
      debugPrint(lndError!)
      reject("LspClient.ping", lndError?.localizedDescription, lndError)
    }
  }

  @objc
  func getLspVersion(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    print("LspClient.getLspVersion")

    resolve(LndmobileLcGetLspVersion())
  }

  @objc
  func getHubLnNodeString(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    print("LspClient.getHubLnNodeString")

    var lndError: NSError?
    let result = LndmobileLcGetHubLnNodeString(&lndError)
    if (lndError == nil) {
      resolve(result)
    } else {
      reject("LspClient.getHubLnNodeString", lndError?.localizedDescription, lndError);
    }
  }

  @objc
  func getFeePermyriad(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    print("LspClient.getFeePermyriad")

    var result: Int64 = 0
    var lndError: NSError?
    LndmobileLcGetLcFeePermyriad(&result, &lndError)
    if (lndError == nil) {
      resolve(result)
    } else {
      reject("LspClient.getFeePermyriad", lndError?.localizedDescription, lndError);
    }
  }

  @objc
  func receiveMax(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    print("LspClient.receiveMax")

    var result: Int64 = 0
    var lndError: NSError?
    LndmobileLcReceiveMax(&result, &lndError)
    if (lndError == nil) {
      resolve(result)
    } else {
      reject("LspClient.receiveMax", lndError?.localizedDescription, lndError);
    }
  }

  @objc
  func paymentFee(
    _ reqAmount: Double,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    print("LspClient.paymentFee")

    var result: Int64 = 0
    var lndError: NSError?
    LndmobileLcPaymentFee(Int64(reqAmount), &result, &lndError)
    if (lndError == nil) {
      resolve(result)
    } else {
      reject("LspClient.paymentFee", lndError?.localizedDescription, lndError);
    }
  }

  @objc
  func paymentRegister(
    _ reqAmount: Double,
    memo: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    print("LspClient.paymentRegister")

    var lndError: NSError?
    let result = LndmobileLcPaymentRegister(Int64(reqAmount), memo, &lndError)
    if (lndError == nil) {
      resolve(result)
    } else {
      print("paymentRegister error: \(lndError as Any)")
      reject("LspClient.paymentRegister error", lndError?.localizedDescription, lndError)
    }
  }

  @objc
  func submarineRefundBlock(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    print("LspClient.submarineRefundBlock")

    let result = LndmobileLcSubmarineRefundBlock()
    resolve(result)
  }

  @objc
  func submarineCreateKeys(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    print("LspClient.submarineCreateKeys")

    var lndError: NSError?
    let result = LndmobileLcSubmarineCreateKeys(&lndError)
    if (lndError != nil) {
      print("submarineCreateKeys error: \(lndError as Any)")
      reject("LspClient.submarineCreateKeys error", lndError?.localizedDescription, lndError)
      return
    }
    do {
      let decoded = try Lspclient_SubmarineCreateKeysResult.init(serializedData: result! as Data)
      let res: [String: Any] = [
        "preimage": dataToHex(decoded.preimage),
        "paymentHash": dataToHex(decoded.paymentHash),
        "repayPrivkey": dataToHex(decoded.repayPrivkey),
        "repayPubkey": dataToHex(decoded.repayPubkey)
      ]
      resolve(res)
    } catch {
      print("submarineCreateKeys.Lspclient_SubmarineCreateKeysResult error: \(lndError as Any)")
      reject("LspClient.submarineCreateKeys.Lspclient_SubmarineCreateKeysResult error", lndError?.localizedDescription, error)
    }
  }

  @objc
  func submarineRegister(
    _ paymentHash: String,
    repayPubkey: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    print("LspClient.submarineRegister");

    let paymentHashData = hexToData(paymentHash)
    let repayPubkeyData = hexToData(repayPubkey)
    if (paymentHashData == nil || repayPubkeyData == nil) {
      reject("LspClient.submarineRegister: nil data", "LspClient.submarineRegister: nil data", nil)
      return
    }
    var lndError: NSError?
    let result = LndmobileLcSubmarineRegister(paymentHashData, repayPubkeyData, &lndError)
    if (lndError != nil) {
      reject("LspClient.submarineRegister", lndError?.localizedDescription, lndError)
      return
    }
    do {
      let decoded = try Lspclient_SubmarineRegisterResult.init(serializedData: result! as Data)
      let res: [String: Any] = [
        "htlcPubkey": dataToHex(decoded.htlcPubkey),
        "script": dataToHex(decoded.script),
        "scriptAddress": decoded.scriptAddress,
        "height": decoded.height
      ]
      resolve(res)
    } catch {
      print("submarineCreateKeys.Lspclient_SubmarineRegisterResult error: \(error as Any)")
      reject("LspClient.submarineCreateKeys.Lspclient_SubmarineRegisterResult error", error.localizedDescription, error)
    }
  }

  @objc
  func submarineReceive(
    _ paymentHash: String,
    invoice: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    print("LspClient.submarineReceive");

    var lndError: NSError?
    let result = LndmobileLcSubmarineReceive(hexToData(paymentHash), invoice, &lndError)
    if (lndError == nil) {
      resolve(result)
    } else {
      print("submarineReceive error: \(lndError as Any)")
      reject("LspClient.submarineReceive error", lndError?.localizedDescription, lndError)
    }
  }

  @objc
  func submarineRepayment(
    _ repayParams: [Dictionary<String, Any>],
    repayAddress: String,
    label: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    print("LspClient.submarineRepayment");

    do {
      var req = Lspclient_SubmarineRepayRequest()
      for lp in 0 ..< repayParams.count {
        var repay = Lspclient_SubmarineRepayData()
        repay.privkey = hexToData(repayParams[lp]["privkey"] as! String)!
        repay.script = hexToData(repayParams[lp]["script"] as! String)!
        repay.txid = repayParams[lp]["txid"] as! String
        repay.index = repayParams[lp]["index"] as! Int32
        repay.amount = repayParams[lp]["amount"] as! Int64
        req.data.append(repay)
      }
      var lndError: NSError?
      let result = try LndmobileLcSubmarineRepayment(req.serializedData(), repayAddress, label, &lndError)
      if (lndError == nil) {
        resolve(result)
      } else {
        print("submarineRepayment error: \(lndError as Any)")
        reject("LspClient.submarineRepayment error", lndError?.localizedDescription, lndError)
      }
    } catch {
      print("submarineRepayment throw error: \(error)")
      reject("LspClient.submarineRepayment throw error", error.localizedDescription, error)
    }
  }

  @objc
  func submarineReregister(
    _ script: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    print("LspClient.submarineReregister");

    var lndError: NSError?
    let result = LndmobileLcSubmarineReregister(hexToData(script), &lndError)
    if (lndError == nil) {
      resolve(result)
    } else {
      print("submarineReregister error: \(lndError as Any)")
      reject("LspClient.submarineReregister error", lndError?.localizedDescription, lndError)
    }
  }

  @objc
  func selfRebalance(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    print("LspClient.selfRebalance");

    var lndError: NSError?
    let result = LndmobileLcSelfRebalance(&lndError)
    if (lndError == nil) {
      resolve(result)
    } else {
      print("selfRebalance error: \(lndError as Any)")
      reject("LspClient.selfRebalance error", lndError?.localizedDescription, lndError)
    }
  }

  @objc
  func queryRoutePayment(
    _ invoice: String,
    feeLimitSat: Double,
    amtSat: Double
  ) {
    print("LspClient.queryRoutePayment");
    let eventName = "grpc_route_payment"

    func errorHandler(_ error: String?) {
      let result: [String: Any] = [
        "event": "error",
        "param": error ?? "unknown error"
      ]
      sendEvent(withName: eventName, body: result)
    }

    var lndError: NSError?
    let result = LndmobileLcQueryRoutePayment(invoice, Int32(feeLimitSat), Int64(amtSat), &lndError)
    if (lndError != nil) {
      let err = lndError?.localizedDescription ?? "unknown error"
      print("submarineCreateKeys.queryRoutePayment error: \(err)")
      errorHandler(err)
      return
    }
    do {
      let decoded = try Lspclient_QueryRoutePaymentResult.init(serializedData: result! as Data)
      let result: [String: Any] = [
        "event": "payment",
        "hash": decoded.paymentHash,
        "status": decoded.status,
        "failure": decoded.failure
      ]
      sendEvent(withName: eventName, body: result)
    } catch {
      print("submarineCreateKeys.queryRoutePayment throw error: \(error)")
      errorHandler("\(error)")
    }
  }

  @objc
  func requestOpenChannel(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    print("LspClient.requestOpenChannel");

    var lndError: NSError?
    let result = LndmobileLcRequestOpenChannel(&lndError)
    if (lndError == nil) {
      resolve(result)
    } else {
      print("requestOpenChannel error: \(lndError as Any)")
      reject("LspClient.requestOpenChannel error", lndError?.localizedDescription, lndError)
    }
  }

  @objc
  func integrityAppCheck(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    var lndError: NSError?
    let id = "iOS"

    var prevResult: Int32 = 0
    LndmobileLcIntegrityVerify(id, "", &prevResult, &lndError)
    if (lndError != nil) {
      print("integrityAppCheck verify error: \(lndError as Any)")
      reject("LspClient.integrityAppCheck verify error", lndError?.localizedDescription, lndError)
      return
    }
    if (prevResult != Lspclient_IntegrityResult.none.rawValue) {
      print("LspClient.integrityAppCheck: prev result=\(prevResult)")
      resolve(prevResult == Lspclient_IntegrityResult.ok.rawValue)
      return
    }
    let nonce = LndmobileLcIntegrityNonce(id, &lndError)
    if (lndError != nil) {
      print("integrityAppCheck nonce error: \(lndError as Any)")
      reject("LspClient.integrityAppCheck nonce error", lndError?.localizedDescription, lndError)
      return
    }
    print("LspClient.integrityAppCheck: nonce=\(nonce)")
    var verify: Int32 = 0
    LndmobileLcIntegrityVerify(id, nonce, &verify, &lndError)
    print("LspClient.integrityAppCheck: verify=\(verify)")
    resolve(verify == Lspclient_IntegrityResult.ok.rawValue)
  }
}
