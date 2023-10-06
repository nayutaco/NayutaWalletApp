package com.nayuta.core2

import android.annotation.SuppressLint
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.*
import com.google.android.gms.tasks.Task
import com.google.android.play.core.integrity.IntegrityManagerFactory
import com.google.android.play.core.integrity.IntegrityServiceException
import com.google.android.play.core.integrity.IntegrityTokenRequest
import com.google.android.play.core.integrity.IntegrityTokenResponse
import com.google.protobuf.ByteString
import com.nayuta.core2.LndGrpc.getLndGrpcString
import lndmobile.Lndmobile
import lspclient.LspClient.IntegrityResult
import java.io.File

class LspClient(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String {
        return "LspClient"
    }

    @ReactMethod
    fun addListener(eventName: String?) {
        // Keep: Required for RN built in Event Emitter Calls.
    }

    @ReactMethod
    fun removeListeners(count: Double) {
        // Keep: Required for RN built in Event Emitter Calls.
    }

    private fun ByteArray.toHexString() = joinToString("") { "%02x".format(it) }
    private fun String.toHexByteArray(): ByteArray {
        // https://stackoverflow.com/questions/66613717/kotlin-convert-hex-string-to-bytearray
        check(length % 2 == 0) { "odd length" }
        val byteIterator = chunkedSequence(2)
            .map { it.toInt(16).toByte() }
            .iterator()
        return ByteArray(length / 2) { byteIterator.next() }
    }

    @ReactMethod
    fun initialize(
        lspCert: String,
        adminMacaroon: String,
        lspAddr: String,
        lspToken: String,
        promise: Promise
    ) {
        val path = "${reactContext.filesDir}/tls.cert"
        try {
            val lndCert = File(path).readText(Charsets.UTF_8)
            Lndmobile.lcInit(
                lspCert,
                lndCert,
                getLndGrpcString(),
                adminMacaroon,
                lspAddr,
                lspToken
            )
            promise.resolve(null)
        } catch (e: Exception) {
            Log.w(TAG, "connect: ${e.message}")
            promise.reject("connect", e)
        }
    }

    @ReactMethod
    fun ping(nonce: Int, promise: Promise) {
        try {
            val result = Lndmobile.lcPing(nonce)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ping", e)
        }
    }

    @ReactMethod
    fun getLspVersion(promise: Promise) {
        promise.resolve(Lndmobile.lcGetLspVersion())
    }

    @ReactMethod
    fun getHubLnNodeString(promise: Promise) {
        try {
            promise.resolve(Lndmobile.lcGetHubLnNodeString())
        } catch (e: Exception) {
            Log.w(TAG, "getNodeString: ${e.message}")
            promise.reject("getNodeString", e)
        }
    }

    @ReactMethod
    fun getFeePermyriad(promise: Promise) {
        try {
            promise.resolve(Lndmobile.lcGetLcFeePermyriad().toInt())
        } catch (e: Exception) {
            Log.w(TAG, "getFeePermyriad: ${e.message}")
            promise.reject("getFeePermyriad", e)
        }
    }

    @ReactMethod
    fun receiveMax(promise: Promise) {
        try {
            promise.resolve(Lndmobile.lcReceiveMax().toInt())
        } catch (e: Exception) {
            Log.w(TAG, "receiveMax: ${e.message}")
            promise.reject("receiveMax", e)
        }
    }

    @ReactMethod
    fun paymentFee(reqAmount: Int, promise: Promise) {
        try {
            promise.resolve(Lndmobile.lcPaymentFee(reqAmount.toLong()).toInt())
        } catch (e: Exception) {
            Log.w(TAG, "paymentFee: ${e.message}")
            promise.reject("paymentFee", e)
        }
    }

    @ReactMethod
    fun paymentRegister(reqAmount: Int, memo: String, promise: Promise) {
        try {
            val result = Lndmobile.lcPaymentRegister(reqAmount.toLong(), memo)
            promise.resolve(result)
        } catch (e: Exception) {
            Log.w(TAG, "paymentRegister: ${e.message}")
            promise.reject("paymentRegister", e)
        }
    }

    @ReactMethod
    fun submarineRefundBlock(promise: Promise) {
        promise.resolve(Lndmobile.lcSubmarineRefundBlock())
    }

    @ReactMethod
    fun submarineCreateKeys(promise: Promise) {
        try {
            val result = Lndmobile.lcSubmarineCreateKeys()
            val decoded = lspclient.LspClient.SubmarineCreateKeysResult.parseFrom(result)
            val res = Arguments.createMap()
            res.putString("preimage", decoded.preimage.toByteArray().toHexString())
            res.putString("paymentHash", decoded.paymentHash.toByteArray().toHexString())
            res.putString("repayPrivkey", decoded.repayPrivkey.toByteArray().toHexString())
            res.putString("repayPubkey", decoded.repayPubkey.toByteArray().toHexString())
            promise.resolve(res)
        } catch (e: Exception) {
            Log.w(TAG, "submarineCreateKeys: ${e.message}")
            promise.reject("submarineCreateKeys", e)
        }
    }

    @ReactMethod
    fun submarineRegister(paymentHash: String, repayPubkey: String, promise: Promise) {
        try {
            Log.d(TAG, "submarineRegister: paymentHash=${paymentHash}, repayPubkey=${repayPubkey}")
            val result = Lndmobile.lcSubmarineRegister(paymentHash.toHexByteArray(), repayPubkey.toHexByteArray())
            val decoded = lspclient.LspClient.SubmarineRegisterResult.parseFrom(result)
            val res = Arguments.createMap()
            res.putString("htlcPubkey", decoded.htlcPubkey.toByteArray().toHexString())
            res.putString("script", decoded.script.toByteArray().toHexString())
            res.putString("scriptAddress", decoded.scriptAddress)
            res.putInt("height", decoded.height)
            promise.resolve(res)
        } catch (e: Exception) {
            Log.w(TAG, "submarineRegister: ${e.message}")
            promise.reject("submarineRegister", e)
        }
    }

    @ReactMethod
    fun submarineReceive(paymentHash: String, invoice: String, promise: Promise) {
        try {
            Log.d(TAG, "submarineReceive: paymentHash=${paymentHash}")
            Lndmobile.lcSubmarineReceive(paymentHash.toHexByteArray(), invoice)
            promise.resolve(null)
        } catch (e: Exception) {
            Log.w(TAG, "submarineReceive: ${e.message}")
            promise.reject("submarineReceive", e)
        }
    }

    @ReactMethod
    fun submarineRepayment(repayParams: ReadableArray, repayAddress: String, label: String, promise: Promise) {
        try {
            val requestBuilder = lspclient.LspClient.SubmarineRepayRequest.newBuilder()
            for (idx in 0 until repayParams.size()) {
                val value = repayParams.getMap(idx)
                val repayPrivKey = value.getString("privkey")
                val script = value.getString("script")
                val inTxid = value.getString("txid")
                val inIndex = value.getInt("index")
                val inAmount = value.getInt("amount")
                val repay = lspclient.LspClient.SubmarineRepayData.newBuilder()
                    .setPrivkey(ByteString.copyFrom(repayPrivKey!!.toHexByteArray()))
                    .setScript(ByteString.copyFrom(script!!.toHexByteArray()))
                    .setTxid(inTxid)
                    .setIndex(inIndex)
                    .setAmount(inAmount.toLong())
                    .build()
                requestBuilder.addData(repay)
            }

            val result = Lndmobile.lcSubmarineRepayment(requestBuilder.build().toByteArray(), repayAddress, label)
            Log.d(TAG, "submarineRepayment: txid $result")
            promise.resolve(result)
        } catch (e: Exception) {
            Log.w(TAG, "submarineRepayment: ${e.message}")
            promise.reject("submarineRepayment", e)
        }
    }

    @ReactMethod
    fun submarineReregister(script: String, promise: Promise) {
        try {
            Log.d(TAG, "submarineReregister")
            val result = Lndmobile.lcSubmarineReregister(script.toHexByteArray())
            promise.resolve(result)
        } catch (e: Exception) {
            Log.w(TAG, "submarineReregister: ${e.message}")
            promise.reject("submarineReregister", e)
        }
    }

    @ReactMethod
    fun selfRebalance(promise: Promise) {
        try {
            Lndmobile.lcSelfRebalance()
            promise.resolve(null)
        } catch (e: Exception) {
            Log.w(TAG, "selfRebalance: ${e.message}")
            promise.reject("selfRebalance", e)
        }
    }

    @ReactMethod
    fun queryRoutePayment(invoice: String, feeLimitSat: Int, amtSat: Int) {
        Thread {
            val eventName = "grpc_route_payment"
            try {
                val result = Lndmobile.lcQueryRoutePayment(invoice, feeLimitSat, amtSat.toLong())
                val decoded = lspclient.LspClient.QueryRoutePaymentResult.parseFrom(result)
                val param = Arguments.createMap()
                param.putString("event", "payment")
                param.putString("hash", decoded.paymentHash)
                param.putInt("status", decoded.status)
                param.putInt("failure", decoded.failure)
                LndGrpc.sendEventToJs(reactContext, eventName, param)
            } catch (e: Exception) {
                Log.w(TAG, "selfRebalance: ${e.message}")
                val result = Arguments.createMap()
                result.putString("event", "error")
                result.putString("param", e.message)
                LndGrpc.sendEventToJs(reactContext, eventName, result)
            }
        }.start()
    }

    @ReactMethod
    fun requestOpenChannel(promise: Promise) {
        try {
            Lndmobile.lcRequestOpenChannel()
            promise.resolve(null)
        } catch (e: Exception) {
            Log.w(TAG, "lcRequestOpenChannel: ${e.message}")
            promise.reject("lcRequestOpenChannel", e)
        }
    }

    // get Google Integrity API token
    // https://developer.android.com/google/play/integrity/verdict?hl=ja#request
    @ReactMethod
    fun integrityAppCheck(promise: Promise?) {
        try {
            val id = "" // reserve future use
            val prevResult = Lndmobile.lcIntegrityVerify(id, "")
            if (prevResult != IntegrityResult.INTEGRITYRESULT_NONE.number) {
                Log.d("integrityAppCheck", "prev result = $prevResult")
                promise?.resolve(prevResult == IntegrityResult.INTEGRITYRESULT_OK.number)
                return
            }

            Log.d("integrityAppCheck", "get Token")
            val nonce = Lndmobile.lcIntegrityNonce(id)
            val integrityManager = IntegrityManagerFactory.create(reactContext)
            val integrityTokenResponse: Task<IntegrityTokenResponse> =
                integrityManager.requestIntegrityToken(
                    IntegrityTokenRequest.builder()
                        .setNonce(nonce)
                        .build()
                )
            integrityTokenResponse.addOnSuccessListener {
                Log.d("integrityAppCheck", "get Token: OK")
                try {
                    val verify = Lndmobile.lcIntegrityVerify(id, it.token())
                    Log.d("integrityAppCheck", "new result = $verify")
                    promise?.resolve(verify == IntegrityResult.INTEGRITYRESULT_OK.number)
                } catch (e: Exception) {
                    Log.e("integrityAppCheck", "verify Token NG: ${e.message}")
                    promise?.reject("integrityAppCheck: verify Token NG", e.message)
                }
            }
            integrityTokenResponse.addOnFailureListener {
                Log.e("integrityAppCheck", "get Token: NG: ${it.message}")
                var errCode = ""
                if (it is IntegrityServiceException) {
                    errCode = "(EINTEGRITY=${it.errorCode})"
                    Log.e(
                        "integrityAppCheck",
                        "get Token: NG: message=${it.message}, errorCode=$errCode"
                    )
                }
                promise?.reject(
                    "integrityAppCheck: get Token NG",
                    "Get Token API NG: ${it.message}$errCode)"
                )
            }
        } catch (e: IntegrityServiceException) {
            Log.e("integrityAppCheck", "IntegrityServiceException: message=${e.message}, errorCode=${e.errorCode}, statusCode=${e.statusCode}")
            promise?.reject("integrityAppCheck", e.message)
        } catch (e: Exception) {
            Log.e("integrityAppCheck", "get request Token: NG: ${e.message}")
            promise?.reject("integrityAppCheck", e.message)
        }
    }

    companion object {
        private val TAG = LspClient::class.java.name
    }
}
