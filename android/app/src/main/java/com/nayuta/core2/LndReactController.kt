package com.nayuta.core2

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.util.Base64
import android.util.Log
import com.android.volley.DefaultRetryPolicy
import com.android.volley.Request
import com.android.volley.RequestQueue
import com.android.volley.Response
import com.android.volley.toolbox.BasicNetwork
import com.android.volley.toolbox.HurlStack
import com.android.volley.toolbox.JsonObjectRequest
import com.android.volley.toolbox.NoCache
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.jakewharton.processphoenix.ProcessPhoenix
import com.nayuta.core2.LndGrpc.setLndGrpcAddr
import com.nayuta.core2.LndService.Companion.intentActionTerminate
import com.nayuta.core2.LndService.Companion.messageServiceNotification
import com.nayuta.core2.LndService.Companion.startLndService
import com.nayuta.core2.LndService.Companion.stopLndService
import com.nayuta.core2.LndService.LndCallback
import lndmobile.Lndmobile
import org.json.JSONObject
import java.io.BufferedInputStream
import java.io.File
import java.io.FileInputStream
import java.io.UnsupportedEncodingException
import java.nio.charset.Charset
import java.security.KeyStore
import java.security.cert.Certificate
import java.security.cert.CertificateFactory
import java.util.*
import javax.net.ssl.HttpsURLConnection
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLSocketFactory
import javax.net.ssl.TrustManagerFactory

class LndReactController(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private var requestQueue = RequestQueue(NoCache(), BasicNetwork(HurlStack())).apply { start() }

    init{
        registerReceiver()
    }

    override fun getName(): String {
        return "LndReactController"
    }

    private lateinit var mReceiver: BroadcastReceiver

    private fun registerReceiver() {
        mReceiver = object: BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                Log.i(TAG, "LndReactController::onReceive ${intent?.action}")
                sendEventToJs("stop", intent?.action)
            }
        }
        val filter = IntentFilter()
        filter.addAction(intentActionTerminate)
        reactContext.registerReceiver(mReceiver, filter)
    }

    @ReactMethod
    fun addListener(eventName: String?) {
        // Keep: Required for RN built in Event Emitter Calls.
    }

    @ReactMethod
    fun removeListeners(count: Double) {
        // Keep: Required for RN built in Event Emitter Calls.
    }

    // first call after app started.
    @ReactMethod
    fun setup(addr: String, port: Int) {
        setLndGrpcAddr(addr, port)
    }

    @ReactMethod
    fun startLnd(startArgs: String, config: String) {
        ccGetAlarmParams(null)
        startLndService(reactContext, startArgs, config, LndEvent())
    }

    @ReactMethod
    fun shutdownLnd() {
        Lndmobile.shutdown()
    }

    @ReactMethod
    fun isRunning(promise: Promise) {
        promise.resolve(Lndmobile.isRunning())
    }

    @ReactMethod
    fun messageNotification(message: String, iconType: Int) {
        messageServiceNotification(message, iconType)
    }

    inner class LndEvent : LndCallback() {
        override fun onRpcReady() {
            Log.i(TAG, "lndmobile callback: RPC is Ready")
            sendEventToJs("rpcReady", null)
        }

        override fun onExit(reason: String?) {
            val param = reason ?: "gracefully stopped"
            Log.e(TAG, "lndmobile callback error: $param")
            sendEventToJs("exit", param)
        }
    }

    @ReactMethod
    fun getCert(promise: Promise) {
        val path = "${reactContext.filesDir}/tls.cert"
        try {
            val pemCert = File(path).readText(Charsets.UTF_8)
            val unsafeB58Cert =
                pemCert.replace("-----BEGIN CERTIFICATE-----", "").replace("-----END CERTIFICATE-----", "")
                    .replace("\n", "").replace("\r", "").toByteArray()
            val derCert = Base64.decode(unsafeB58Cert, Base64.DEFAULT)
            val encoded = Base64.encode(derCert, Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP)
            val cert = encoded!!.toString(Charset.forName("US-ASCII"))
            promise.resolve(cert)
        } catch (e: Exception) {
            promise.reject("getCert failed", e)
        }
    }

    @ReactMethod
    fun stopService() {
        try {
            stopLndService(reactContext)
        } catch (_: Exception) {
            return
        }
    }

    @ReactMethod
    fun killProcess() {
        android.os.Process.killProcess(android.os.Process.myPid())
    }

    @ReactMethod
    fun restartApp() {
        stopService()
        ProcessPhoenix.triggerRebirth(reactContext)
    }

    @ReactMethod
    fun request(method: String, url: String, bodyJson: String?, adminMacaroon: String?, promise: Promise) {
        Thread {
            try {
                val reqBody = JSONObject(bodyJson ?: "{}")
                val requestType = when (method.uppercase(Locale.ROOT)) {
                    "GET" -> Request.Method.GET
                    "POST" -> Request.Method.POST
                    "DELETE" -> Request.Method.DELETE
                    else -> {
                        promise.reject("makeLndRequest", "Unsupported method: " + method.uppercase(Locale.ROOT))
                        return@Thread
                    }
                }
                HttpsURLConnection.setDefaultSSLSocketFactory(getSocketFactory())
                val req = object : JsonObjectRequest(requestType, url, reqBody, Response.Listener { response ->
                    promise.resolve(response.toString())
                }, Response.ErrorListener { error -> //Failure Callback
                    if (error.networkResponse == null) {
                        promise.reject("makeLndRequest", "error but no response")
                        return@ErrorListener
                    }
                    //get status code here
                    val statusCode = error.networkResponse.statusCode.toString()
                    //get response body and parse with appropriate encoding
                    try {
                        val body = error.networkResponse.data.toString(Charset.forName("UTF-8"))
                        Log.d(TAG, "$url: $body")
                        val map = Arguments.createMap()
                        map.putString("error", body)
                        promise.reject("makeLndRequest", "HTTP status code $statusCode", map)
                    } catch (e: UnsupportedEncodingException) {
                        promise.reject("makeLndRequest", "Unsupported encoding")
                    }
                }) {
                    override fun getHeaders(): MutableMap<String, String> {
                        val headers = HashMap<String, String>()
                        headers["Content-Type"] = "application/json"
                        headers["Grpc-Metadata-macaroon"] = adminMacaroon ?: ""
                        return headers
                    }
                }
                req.retryPolicy = DefaultRetryPolicy(
                    REQUEST_TIMEOUT_MSEC,
                    DefaultRetryPolicy.DEFAULT_MAX_RETRIES,
                    DefaultRetryPolicy.DEFAULT_BACKOFF_MULT
                )
                requestQueue.add(req)
            } catch (e: Exception) {
                promise.reject("makeLndRequest", e)
            }
        }.start()
    }

    private fun sendEventToJs(evtName: String, params: Any?) {
        Log.d(TAG, "sendEventToJs($evtName), $params")
        reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit(evtName, params)
    }

    fun getSocketFactory(): SSLSocketFactory {
        val cf = CertificateFactory.getInstance("X.509")
        val path = "${reactContext.filesDir}/tls.cert"
        val file = File(path)
        val fis = FileInputStream(file)
        val ca: Certificate = BufferedInputStream(fis).use { caInput ->
            cf.generateCertificate(caInput)
        }

        // Create a KeyStore containing our trusted CAs
        val keyStoreType = KeyStore.getDefaultType()
        val keyStore = KeyStore.getInstance(keyStoreType)
        keyStore.load(null, null)
        keyStore.setCertificateEntry("ca", ca)

        // Create a TrustManager that trusts the CAs in our KeyStore
        val tmfAlgorithm = TrustManagerFactory.getDefaultAlgorithm()
        val tmf = TrustManagerFactory.getInstance(tmfAlgorithm)
        tmf.init(keyStore)

        // Create an SSLContext that uses our TrustManager
        val sslContext = SSLContext.getInstance("TLS")
        sslContext.init(null, tmf.trustManagers, null)
        return sslContext.socketFactory
    }

    @ReactMethod
    fun resetWallet() {
        Log.i(TAG, "resetWallet: this function has not been implemented yet.")
    }

    @ReactMethod
    fun ccAddChannelList(channelPoint: String) {
        Lndmobile.ccAddChannelList(channelPoint)
    }

    @ReactMethod
    fun ccRemoveChannelList(channelPoint: String) {
        Lndmobile.ccRemoveChannelList(channelPoint)
    }

    @ReactMethod
    fun ccRemoveChannelListAll() {
        Lndmobile.ccRemoveChannelListAll()
        AlarmReceiver.removeLastFailTime(reactContext)
    }

    @ReactMethod
    fun ccGetAlarmParams(promise: Promise?) {
        val result = AlarmReceiver.getAlarmParams(reactContext)
        val retval = Arguments.createMap()
        retval.putBoolean("enabled", result.first)
        retval.putString("intervalMinute", result.second)
        retval.putString("limitMinute", result.third)
        Log.i(TAG, "ccGetAlarmParams: enabled=${result.first}, intervalMinute=${result.second}, limitMinute=${result.third}")
        promise?.resolve(retval)
    }

    @ReactMethod
    fun ccSetAlarmParams(enabled: Boolean, intervalMinute: Int, limitMinute: Int) {
        AlarmReceiver.setAlarmParams(reactContext, enabled, intervalMinute, limitMinute)
    }

    companion object {
        private val TAG = LndReactController::class.java.name
        private const val REQUEST_TIMEOUT_MSEC = 20000
    }
}
