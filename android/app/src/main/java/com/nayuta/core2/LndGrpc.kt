package com.nayuta.core2

import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import io.grpc.CallCredentials
import io.grpc.ManagedChannel
import io.grpc.Metadata
import io.grpc.Status
import io.grpc.android.AndroidChannelBuilder
import io.grpc.okhttp.OkHttpChannelBuilder
import java.util.concurrent.Executor

object LndGrpc {
    private var lndHost: String = ""
    private var lndPort: Int = 0
    private val TAG = LndGrpc::class.java.name

    fun setLndGrpcAddr(host: String, port: Int) {
        lndHost = host
        lndPort = port
    }
    fun getLndGrpcString() : String {
        return "$lndHost:$lndPort"
    }

    fun grpcAndroidChannel(reactContext: ReactApplicationContext, lndController: LndReactController): ManagedChannel {
        val okBuilder = OkHttpChannelBuilder
            .forAddress(lndHost, lndPort)
            .sslSocketFactory(lndController.getSocketFactory())
        return AndroidChannelBuilder
            .usingBuilder(okBuilder)
            .context(reactContext.applicationContext)
            .build()
    }

    fun sendEventToJs(reactContext: ReactApplicationContext,evtName: String, params: Any) {
        Log.d(TAG, "sendEventToJs($evtName), $params")
        reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit(evtName, params)
    }

    // https://github.com/LN-Zap/zap-android/blob/master/app/src/main/java/zapsolutions/zap/connection/lndConnection/MacaroonCallCredential.java
    class MacaroonCallCredential(private val macaroon: String) : CallCredentials() {
        override fun thisUsesUnstableApi() {}

        override fun applyRequestMetadata(
            requestInfo: RequestInfo,
            executor: Executor,
            metadataApplier: MetadataApplier
        ) {
            executor.execute {
                try {
                    val headers = Metadata()
                    val macaroonKey = Metadata.Key.of("macaroon", Metadata.ASCII_STRING_MARSHALLER)
                    headers.put(macaroonKey, macaroon)
                    metadataApplier.apply(headers)
                } catch (e: Throwable) {
                    metadataApplier.fail(Status.UNAUTHENTICATED.withCause(e))
                }
            }
        }
    }
}