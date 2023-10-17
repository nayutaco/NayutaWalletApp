//
//  LndReactController.swift
//  Core2
//
//  Created by Yuta Nakano on 2022/12/13.
//

import Foundation
import Lndmobile
import Alamofire

#if DEBUG
let REQUEST_TIMEOUT_SEC = 300.0 // Xcode接続中は非常に時間がかかる
#else
let REQUEST_TIMEOUT_SEC = 20.0
#endif
let CORE2DIR = NSHomeDirectory() + "/Library/core2"
let LNDDIR = CORE2DIR + "/.lnd"

func dataToHex(_ data: Data) -> String {
  return data.map { String(format: "%02hhx", $0) }.joined()
}

func hexToData(_ hex: String) -> Data? {
  if (hex.count % 2 != 0) {
    return nil
  }
  var data = Data(capacity: hex.count / 2)
  for lp in 0 ..< hex.count / 2 {
    let sidx = hex.index(hex.startIndex, offsetBy: lp * 2)
    let eidx = hex.index(hex.startIndex, offsetBy: (lp + 1) * 2)
    let s = String(hex[sidx..<eidx])
    let num = UInt8(s, radix: 16)!
    data.append(num)
  }
  return data
}

class RpcReadyHandler : NSObject, LndmobileCallbackProtocol {
  var module: LndReactController

  init(module: LndReactController) {
    self.module = module
  }

  // Notifies Service has started.
  func onResponse(_ data: Data?) {
    print("lndmobile callback: RPC is Ready")
    LndReactController.lndStarted = true
    module.eventSender(withName: "rpcReady", body: [:])
  }

  // Notifies Service stop/crash.
  func onError(_ err: Error?) {
    let reason = err?.localizedDescription ?? "gracefully stopped" // null if gracefully stopped
    print("lndmobile callback: error: \(reason)")
    module.eventSender(withName: "exit", body: ["reason": reason])
  }
}

@objc(LndReactController)
class LndReactController: RCTEventEmitter {

  static var lndStarted = false
  var session: Session!
  var certString: String!
  let lockSession = NSLock()

  @objc
  override static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc
  override func supportedEvents() -> [String]! {
    return ["rpcReady", "exit", "stop", "error"]
  }

  func eventSender(withName: String, body: [String: Any]) {
    sendEvent(withName: withName, body: body)
  }

  func writeConfig(config: String) -> NSError? {
    let path = "\(LNDDIR)/lnd.conf"
    do {
      try config.write(toFile: path, atomically: true, encoding: .utf8)
      return nil
    } catch {
      print("失敗:", error)
      return error as NSError
    }
  }

  @objc
  func setup(
    _ addr: String,
    port: Double,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    LndGrpc.getInstance().setLndGrpcAddr(host: addr, port: Int(port))
    resolve(nil)
  }

  @objc
  func startLnd(
    _ startArgs: String,
    config: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    print("LndReactController.startLnd()")
    let fileManager = FileManager.default

    do {
      try fileManager.createDirectory(atPath: LNDDIR, withIntermediateDirectories: true, attributes: nil)
    } catch {
      print("MAKE DIR NG")
    }

    let args = "\(startArgs) --lnddir=\(LNDDIR)"
    let writeErr = writeConfig(config: config)
    if (writeErr != nil) {
      reject("startLnd", "writeConfig", writeErr)
      return
    }

    var lndError: NSError?
    let network = getNetwork()

    LndmobileInit(CORE2DIR, "\(LNDDIR)/logs/bitcoin/\(network)", &lndError)
    if (lndError == nil) {
      LndmobileStart(args, RpcReadyHandler(module: self))
      resolve(nil)
    } else {
      print("LndReactController.startLnd \(lndError as Any)")
      reject("startLnd", "LndmobileInit", lndError)
    }
  }

  @objc
  func shutdownLnd() {
    print("LndReactController.shutdownLnd()")
    LndReactController.lndStarted = false
    LndmobileShutdown()
    print("shutdownLnd: done")
  }

  @objc
  func getCert(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    print("LndReactController.getCert()")

    let str = LndReactController.getCertRawString()
    if (str.count == 0) {
      print("getCert: cert is empty")
      reject("getCert", "cert is empty", nil)
      return
    }
    let strData: Data = str.data(using: .utf8)!
    var certData = strData.base64EncodedString()
    // base64 to base64url
    certData = certData.replacingOccurrences(of: "+", with: "-")
    certData = certData.replacingOccurrences(of: "/", with: "_")
    certData = certData.replacingOccurrences(of: "=", with: "")
    resolve(certData)
  }

  @objc
  func request(
    _ method: String,
    url: String,
    bodyJson: String?,
    adminMacaroon: String?,
    resolver  resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    var requestType: HTTPMethod = HTTPMethod.init(rawValue: "");
    switch method.uppercased() {
    case "GET": requestType = .get
    case "POST": requestType = .post
    case "DELETE": requestType = .delete
    default:
      reject("request", "UnsupportedMethod: " + method, nil)
    }

    let session = getSecureSession()
    if (session == nil) {
      print("session is null")
      reject("request", "session is null", nil)
      return;
    }

    var bodyData: [String: Any] = [:]
    if (bodyJson != nil) {
      do {
        let data1: Data =  bodyJson!.data(using: .utf8)!
        let data = try JSONSerialization.jsonObject(with: data1)
        bodyData = data as! [String : Any]
      } catch {
        print(error.localizedDescription)
        reject("request", error.localizedDescription, error)
      }
    }
    //*/
    let header: HTTPHeaders = [
      "Contenttype": "application/json",
      "Grpc-Metadata-macaroon" : (adminMacaroon != nil) ? adminMacaroon! : ""
    ]

    // https://github.com/Alamofire/Alamofire/issues/1819
    session!.request(
      url,
      method: requestType,
      parameters: bodyData as Parameters,
      encoding: (requestType == .get) ? URLEncoding.default : JSONEncoding.default,
      headers: header,
      requestModifier: { $0.timeoutInterval = REQUEST_TIMEOUT_SEC }
    ).responseString { response in
      switch response.result {
      case let .success(data):
        if (response.response!.statusCode == 200) {
          // print("LndReactController.request 200: \(data)")
          if response.data != nil {
            resolve(String.init(data: response.data!, encoding: .utf8))
          } else {
            reject("request", "response.data is nil", nil)
          }
        } else {
          print("LndReactController.request \(response.response!.statusCode): \(data)")
          let err = NSError(domain: "request", code: response.response!.statusCode, userInfo: ["error" : data])
          reject("request", data, err)
        }
      case let .failure(error):
        print("LndReactController.request error: \(error)")
        reject("request", "InvalidRequest:\(error)", nil)
      }
    }
  }

  func getSecureSession() -> Session? {
    let str = LndReactController.getCertRawString()
    if (str.count == 0) {
      print("getSecureSession: cert is empty")
      return nil
    }
    defer { lockSession.unlock() }
    lockSession.lock()
    if (certString != nil && str == certString && self.session != nil) {
      return self.session
    }
    print("getSecureSession: create new session")
    let certData = Data(base64Encoded: str)
    if let certificate = SecCertificateCreateWithData(nil, certData! as CFData){
      let manager = ServerTrustManager(evaluators:[
        "127.0.0.1": PinnedCertificatesTrustEvaluator(
            certificates: [certificate],
            acceptSelfSignedCertificates: true,
            performDefaultValidation: true,
            validateHost: true
          )
      ])
      self.session = Session(serverTrustManager: manager)
      certString = str
      return self.session
    }
    print("ERROR-9")
    return nil
  }

  static func getCertFilePath() -> String {
    return "\(LNDDIR)/tls.cert"
  }
  
  static func getCertFile() -> String? {
    return try? String(contentsOfFile: LndReactController.getCertFilePath())
  }

  static func getCertRawString() -> String {
    if (!LndReactController.lndStarted) {
      print("getCertRawString: lnd not started")
      return ""
    }
    var str = LndReactController.getCertFile()
    if (str == nil) {
      print("getCertRawString: file is null")
      return ""
    }

    // remove the header, tail, eol
    str! = str!.replacingOccurrences(of: "-----BEGIN CERTIFICATE-----", with: "")
    str! = str!.replacingOccurrences(of: "-----END CERTIFICATE-----", with: "")
    str! = str!.replacingOccurrences(of: "\n", with: "")
    str! = str!.replacingOccurrences(of: "\r", with: "")
    return str!
  }

  @objc
  func isRunning(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    resolve(LndmobileIsRunning())
  }

  @objc
  func messageNotification(
    _ message: String,
    iconType: Double
  ) {
    print("LndController.messageNotification(\(message), \(iconType))")
  }

  @objc
  func restartApp() {
    print("LndController.restartApp: nothing to do")
  }

  @objc
  func stopService() {
    // Service not running in iOS
    print("LndController.stopService")
  }

  @objc
  func killProcess() {
    print("LndController.killProcess")
    sendEvent(withName: "stop", body: ["reason": "killProcess"])
    exit(0)
  }

  @objc
  func resetWallet(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    print("DELETE DIR START")
    let closeCheckDbPath = CORE2DIR + "/closecheck.db"
    let appDbPath = NSHomeDirectory() + "/Library/LocalDatabase/app.db"
        
    do {
      try FileManager.default.removeItem(atPath: LNDDIR)
      try FileManager.default.removeItem(atPath: closeCheckDbPath)
      try FileManager.default.removeItem(atPath: appDbPath)
    } catch let error{
      print("DELETE DIR NG")
      print(error)
      reject("LndReactController", "resetWallet", error)
      return
    }
    print("DELETE DIR OK")
    resolve(nil)
  }
  
  @objc
  func ccAddChannelList(
    _ channelPoint: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    print("LndReactController.ccAddChannelList")
    var myError:NSError?
    LndmobileCcAddChannelList(channelPoint, &myError)
    if (myError == nil) {
      resolve(nil)
    } else {
      reject("LndReactController", "ccAddChannelList", myError)
    }
  }

  @objc
  func ccRemoveChannelList(
    _ channelPoint: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    print("LndReactController.ccRemoveChannelList")
    var lndError: NSError?
    LndmobileCcRemoveChannelList(channelPoint, &lndError)
    if (lndError == nil) {
      resolve(nil)
    } else {
      reject("LndReactController", "ccRemoveChannelList", lndError)
    }
  }

  @objc
  func ccRemoveChannelListAll(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    print("LndReactController.ccRemoveChannelListAll")
    var lndError: NSError?
    LndmobileCcRemoveChannelListAll(&lndError)
    if (lndError == nil) {
      resolve(nil)
    } else {
      reject("LndReactController", "ccRemoveChannelListAll", lndError)
    }
  }

  @objc
  func ccGetAlarmParams(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    // ToDo 実装
    print("LndReactController.ccGetAlarmParams not implemented")
    let retval: [String: Any] = [
      "enabled": false,
      "intervalMinute": 0,
      "limitMinute": 0
    ]
    resolve(retval)
  }

  @objc
  func ccSetAlarmParams(
    _ channelPoint: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    // ToDo 実装
    print("LndReactController.ccSetAlarmParams not implemented")
    reject("LndReactController", "ccSetAlarmParams not implemented", nil)
  }
}
