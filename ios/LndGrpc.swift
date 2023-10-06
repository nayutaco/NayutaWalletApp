//
//  LndGrpc.swift
//  Core2
//
//  Created by ueno on 2023/04/15.
//

import Foundation
import GRPC
import NIO
import NIOSSL

class LndGrpc {
  static let instance = LndGrpc()

  var lndHost: String = ""
  var lndPort: Int = 0

  private init() {}

  static func getInstance() -> LndGrpc {
    return instance
  }

  func setLndGrpcAddr(host: String, port: Int) {
    lndHost = host
    lndPort = port
  }
  func getLndGrpcString() -> String {
    return "\(lndHost):\(lndPort)"
  }

  func createChannel() throws -> GRPCChannel {
    let group = MultiThreadedEventLoopGroup(numberOfThreads: 1)
    // let group = PlatformSupport.makeEventLoopGroup(loopCount: 1, networkPreference: .best)
    let certConf = GRPCTLSConfiguration.makeClientConfigurationBackedByNIOSSL(
      trustRoots: .file(LndReactController.getCertFilePath()),
      certificateVerification: .noHostnameVerification
    )
    let channel = try GRPCChannelPool.with(
      target: .host(lndHost, port: lndPort),
      transportSecurity: .tls(certConf),
      eventLoopGroup: group
    )
    return channel
  }
}
