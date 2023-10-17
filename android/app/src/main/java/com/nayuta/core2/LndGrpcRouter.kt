package com.nayuta.core2

import android.util.Log
import com.facebook.react.bridge.*
import com.nayuta.core2.LndGrpc.grpcAndroidChannel
import com.nayuta.core2.LndGrpc.sendEventToJs
import io.grpc.stub.StreamObserver

// router.proto
//  android/app/build/generated/source/proto/xxx/grpc/routerrpc/RouterGrpc.java
class LndGrpcRouter(private val reactContext: ReactApplicationContext, private val lndController: LndReactController) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "LndGrpcRouter"
    }

    @ReactMethod
    fun addListener(eventName: String?) {
        // Keep: Required for RN built in Event Emitter Calls.
    }

    @ReactMethod
    fun removeListeners(count: Double) {
        // Keep: Required for RN built in Event Emitter Calls.
    }

    // fun ByteArray.toHexString() = joinToString("") { "%02x".format(it) }

    /** send payment
     *      https://api.lightning.community/#sendpaymentv2
     *
     * @param adminMacaroon admin macaroon
     */
    @ReactMethod
    fun sendPaymentV2(paymentRequest: String, feeLimitSat: Int, timeLimitSec: Int, amt: Int, adminMacaroon: String, promise: Promise) {
        Log.i(TAG, "sendPaymentV2()")

        val responseObserver: StreamObserver<lnrpc.LightningOuterClass.Payment> = object :
            StreamObserver<lnrpc.LightningOuterClass.Payment> {
            val TAG = "sendPaymentV2"
            val eventName = "grpc_payment"

            override fun onNext(result: lnrpc.LightningOuterClass.Payment) {
                Log.i(TAG, "onNext: ${result.getPaymentHash()}, status=${result.getStatusValue()}, reason=${result.getFailureReason()}")
                val param = Arguments.createMap()
                param.putString("event", "payment")
                param.putString("invoice", result.getPaymentRequest())
                param.putString("hash", result.getPaymentHash())
                param.putInt("value", result.getValue().toInt())
                param.putInt("status", result.getStatusValue())
                param.putInt("failure", result.getFailureReasonValue())
                sendEventToJs(reactContext, eventName, param)
            }

            override fun onError(t: Throwable) {
                Log.e(TAG, "onError: $t")
                val result = Arguments.createMap()
                result.putString("event", "error")
                result.putString("param", t.message)
                sendEventToJs(reactContext, eventName, result)
            }

            override fun onCompleted() {
                Log.e(TAG, "onCompleted")
                val result = Arguments.createMap()
                result.putString("event", "completed")
                sendEventToJs(reactContext, eventName, result)
            }
        }

        // gRPC Request: routerrpc.RouterOuterClass.SendPaymentRequest
        //  android/app/build/generated/source/proto/xxx/java/routerrpc/RouterOuterClass.java
        val request = routerrpc.RouterOuterClass.SendPaymentRequest.newBuilder()
            .setPaymentRequest(paymentRequest)
            .setFeeLimitSat(feeLimitSat.toLong())
            .setTimeoutSeconds(timeLimitSec)
        if (amt != 0) {
            Log.i(TAG, "sendPaymentV2() - amt=$amt")
            request.amt = amt.toLong()
        }
        val asyncStub = routerrpc.RouterGrpc.newStub(grpcAndroidChannel(reactContext, lndController)).withCallCredentials(
            LndGrpc.MacaroonCallCredential(adminMacaroon)
        )
        asyncStub.sendPaymentV2(request.build(), responseObserver)

        Log.i(TAG, "sendPaymentV2() - started")
        promise.resolve(null)
    }

    companion object {
        private val TAG = LndGrpcRouter::class.java.name
    }
}