package com.nayuta.core2

import android.util.Base64
import android.util.Log
import com.facebook.react.bridge.*
import com.nayuta.core2.LndGrpc.grpcAndroidChannel
import com.nayuta.core2.LndGrpc.sendEventToJs
import io.grpc.stub.StreamObserver
import java.nio.charset.Charset
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

// lightning.proto
//  android/app/build/generated/source/proto/xxx/grpc/lnrpc/LightningGrpc.java
class LndGrpcLightning(private val reactContext: ReactApplicationContext, private val lndController: LndReactController) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "LndGrpcLightning"
    }

    @ReactMethod
    fun addListener(eventName: String?) {
        // Keep: Required for RN built in Event Emitter Calls.
    }

    @ReactMethod
    fun removeListeners(count: Double) {
        // Keep: Required for RN built in Event Emitter Calls.
    }

    private var isLnInvoiceWatching = false
    private var isSubscribeTransactions = false
    private var isSubscribeChannelEvents = false
    private var isSubscribeBackups = false
    private var subscribeBackupsNum = 0
    fun ByteArray.toHexString() = joinToString("") { "%02x".format(it) }

    /** notify settled invoice
     *
     * @param startDate notify invoices.settle_date >= startDate
     * @param adminMacaroon admin macaroon
     * @param promise promise
     */
    @ReactMethod
    fun startWatchLnInvoices(startDate: Int, adminMacaroon: String, promise: Promise) {
        if (isLnInvoiceWatching) {
            Log.i(TAG, "startWatchLnInvoices() already watching")
            promise.resolve(null)
            return
        }
        isLnInvoiceWatching = true

        Log.i(TAG, "startWatchLnInvoices(${startDate})")

        // https://grpc.io/docs/platforms/android/java/basics/#client-side-streaming-rpc
        val responseObserver: StreamObserver<lnrpc.LightningOuterClass.Invoice> = object :
            StreamObserver<lnrpc.LightningOuterClass.Invoice> {
            val TAG = "startWatchLnInvoices"
            val eventName = "grpc_watchLnInv"

            override fun onNext(summary: lnrpc.LightningOuterClass.Invoice) {
                Log.i(TAG, "onNext: ${summary.getSettleDate()}")
                if ((summary.getState() == lnrpc.LightningOuterClass.Invoice.InvoiceState.SETTLED) && (summary.getSettleDate() >= startDate.toLong())) {
                    val result = Arguments.createMap()
                    result.putString("event", "settled")
                    result.putString("param", summary.getRHash().toByteArray().toHexString())
                    sendEventToJs(reactContext, eventName, result)
                }
            }

            override fun onError(t: Throwable) {
                Log.e(TAG, "onError: $t")
                isLnInvoiceWatching = false
                val result = Arguments.createMap()
                result.putString("event", "error")
                result.putString("param", t.toString())
                sendEventToJs(reactContext, eventName, result)
            }

            override fun onCompleted() {
                Log.e(TAG, "onCompleted")
                isLnInvoiceWatching = false
                val result = Arguments.createMap()
                result.putString("event", "completed")
                sendEventToJs(reactContext, eventName, result)
            }
        }

        val req = lnrpc.LightningOuterClass.InvoiceSubscription.newBuilder()
            .build()
        val asyncStub = lnrpc.LightningGrpc.newStub(grpcAndroidChannel(reactContext, lndController)).withCallCredentials(
            LndGrpc.MacaroonCallCredential(adminMacaroon)
        )
        asyncStub.subscribeInvoices(req, responseObserver)

        Log.i(TAG, "startWatchLnInvoices() - started")
        promise.resolve(null)
    }

    /** close channel
     *      https://api.lightning.community/#closechannel
     *
     * @param adminMacaroon admin macaroon
     */
    @ReactMethod
    fun closeChannelStart(fundingTxid: String, outPointIndex: Int, forceClose: Boolean, satPerVByte: Int, adminMacaroon: String, promise: Promise) {
        Log.i(TAG, "closeChannelStart(${fundingTxid}:${outPointIndex} force=${forceClose} satPerVbyte=${satPerVByte})")

        var closeStarted = false
        val finishLatch = CountDownLatch(1)
        val closeChannelResponseObserver: StreamObserver<lnrpc.LightningOuterClass.CloseStatusUpdate> = object :
            StreamObserver<lnrpc.LightningOuterClass.CloseStatusUpdate> {
            val TAG = "closeChannelStart"

            override fun onNext(summary: lnrpc.LightningOuterClass.CloseStatusUpdate) {
                Log.i(TAG, "onNext: hasClosePending=${summary.hasClosePending()}, hasChanClose=${summary.hasChanClose()}")
                closeStarted = true
                finishLatch.countDown()
            }

            override fun onError(t: Throwable) {
                Log.e(TAG, "onError: $t")
                finishLatch.countDown()
            }

            override fun onCompleted() {
                Log.e(TAG, "onCompleted")
                closeStarted = true
                finishLatch.countDown()
            }
        }

        // gRPC Request: lnrpc.CloseChannelRequest
        //  android/app/build/generated/source/proto/xxx/java/LightningOuterClass.java
        val channelPoint = lnrpc.LightningOuterClass.ChannelPoint.newBuilder()
            .setFundingTxidStr(fundingTxid)
            .setOutputIndex(outPointIndex)
            .build()
        val req = lnrpc.LightningOuterClass.CloseChannelRequest.newBuilder()
            .setChannelPoint(channelPoint)
            .setForce(forceClose)
            .setSatPerVbyte(if (forceClose) 0 else satPerVByte.toLong()) // force時に0以外を設定すると"force closing a channel uses a pre-defined fee"になる
            .build()
        val asyncStub = lnrpc.LightningGrpc.newStub(grpcAndroidChannel(reactContext, lndController)).withCallCredentials(
            LndGrpc.MacaroonCallCredential(adminMacaroon)
        )
        asyncStub.closeChannel(req, closeChannelResponseObserver)

        if (!finishLatch.await(1, TimeUnit.MINUTES)) {
            Log.e(TAG, "closeChannelStart() - timeout")
        }

        Log.i(TAG, "closeChannelStart() - started=$closeStarted")
        promise.resolve(closeStarted)
    }

    /** subscribe transactions
     *      https://api.lightning.community/#subscribetransactions
     *
     * @param adminMacaroon admin macaroon
     */
    @ReactMethod
    fun subscribeTransactions(adminMacaroon: String, promise: Promise) {
        Log.i(TAG, "subscribeTransactions()")

        if (isSubscribeTransactions) {
            Log.i(TAG, "subscribeTransactions() already watching")
            promise.resolve(null)
            return
        }
        isSubscribeTransactions = true

        // https://grpc.io/docs/platforms/android/java/basics/#client-side-streaming-rpc
        val responseObserver: StreamObserver<lnrpc.LightningOuterClass.Transaction> = object :
            StreamObserver<lnrpc.LightningOuterClass.Transaction> {
            val TAG = "subscribeTransactions"
            val eventName = "grpc_watchTx"

            override fun onNext(transaction: lnrpc.LightningOuterClass.Transaction) {
                Log.i(TAG, "onNext: ${transaction.getTxHash()}")
                if ((transaction.getNumConfirmations() > 0)) {
                    val result = Arguments.createMap()
                    result.putString("event", "detect")
                    result.putString("txid", transaction.getTxHash())
                    result.putInt("confirm", transaction.getNumConfirmations())
                    result.putInt("amount", transaction.getAmount().toInt())
                    result.putInt("height", transaction.getBlockHeight())
                    val addresses = WritableNativeArray()
                    for (addr in transaction.getDestAddressesList()) {
                        Log.d(TAG, addr)
                        addresses.pushString(addr)
                    }
                    result.putArray("addresses", addresses)
                    sendEventToJs(reactContext, eventName, result)
                }
            }

            override fun onError(t: Throwable) {
                Log.e(TAG, "onError: $t")
                isSubscribeTransactions = false
                val result = Arguments.createMap()
                result.putString("event", "error")
                result.putString("reason", t.toString())
                sendEventToJs(reactContext, eventName, result)
            }

            override fun onCompleted() {
                Log.e(TAG, "onCompleted")
                isSubscribeTransactions = false
                val result = Arguments.createMap()
                result.putString("event", "completed")
                sendEventToJs(reactContext, eventName, result)
            }
        }

        val req = lnrpc.LightningOuterClass.GetTransactionsRequest.newBuilder()
            .build()
        val asyncStub = lnrpc.LightningGrpc.newStub(grpcAndroidChannel(reactContext, lndController)).withCallCredentials(
            LndGrpc.MacaroonCallCredential(adminMacaroon)
        )
        asyncStub.subscribeTransactions(req, responseObserver)

        Log.i(TAG, "startWatchLnInvoices() - started")
        promise.resolve(null)
    }


    /** subscribe channel events
     *      https://api.lightning.community/#subscribechannelevents
     *
     * @param adminMacaroon admin macaroon
     */
    @ReactMethod
    fun subscribeChannelEvents(adminMacaroon: String, promise: Promise) {
        Log.i(TAG, "subscribeChannelEvents()")

        if (isSubscribeChannelEvents) {
            Log.i(TAG, "subscribeChannelEvents() already watching")
            promise.resolve(null)
            return
        }
        isSubscribeChannelEvents = true

        // https://grpc.io/docs/platforms/android/java/basics/#client-side-streaming-rpc
        val responseObserver: StreamObserver<lnrpc.LightningOuterClass.ChannelEventUpdate> = object :
            StreamObserver<lnrpc.LightningOuterClass.ChannelEventUpdate> {
            val TAG = "subscribeChannelEvents"
            val eventName = "grpc_watchCh"

            override fun onNext(event: lnrpc.LightningOuterClass.ChannelEventUpdate) {
                Log.i(TAG, "onNext: eventupdate: ${event.getType()}")
                when (event.getType()) {
                    lnrpc.LightningOuterClass.ChannelEventUpdate.UpdateType.OPEN_CHANNEL -> {
                        val result = Arguments.createMap()
                        result.putString("event", "OPEN_CHANNEL")
                        result.putString("channel_point", event.getOpenChannel().getChannelPoint())
                        sendEventToJs(reactContext, eventName, result)
                    }
                    lnrpc.LightningOuterClass.ChannelEventUpdate.UpdateType.CLOSED_CHANNEL -> {
                        val result = Arguments.createMap()
                        result.putString("event", "CLOSED_CHANNEL")
                        result.putString("channel_point", event.getClosedChannel().getChannelPoint())
                        sendEventToJs(reactContext, eventName, result)
                    }
                }
            }

            override fun onError(t: Throwable) {
                Log.e(TAG, "onError: $t")
                isSubscribeChannelEvents = false
                val result = Arguments.createMap()
                result.putString("event", "error")
                result.putString("reason", t.toString())
                sendEventToJs(reactContext, eventName, result)
            }

            override fun onCompleted() {
                Log.e(TAG, "onCompleted")
                isSubscribeChannelEvents = false
                val result = Arguments.createMap()
                result.putString("event", "completed")
                sendEventToJs(reactContext, eventName, result)
            }
        }

        val req = lnrpc.LightningOuterClass.ChannelEventSubscription.newBuilder()
            .build()
        val asyncStub = lnrpc.LightningGrpc.newStub(grpcAndroidChannel(reactContext, lndController)).withCallCredentials(
            LndGrpc.MacaroonCallCredential(adminMacaroon)
        )
        asyncStub.subscribeChannelEvents(req, responseObserver)

        Log.i(TAG, "startWatchLnInvoices() - started")
        promise.resolve(null)
    }

    /** subscribe channel backups
     *      https://api.lightning.community/#subscribechannelbackups
     *
     * @param adminMacaroon admin macaroon
     */
    @ReactMethod
    fun subscribeChannelBackups(adminMacaroon: String, promise: Promise) {
        Log.i(TAG, "subscribeChannelBackups()")

        if (isSubscribeBackups) {
            Log.i(TAG, "subscribeChannelBackups() already watching")
            promise.resolve(null)
            return
        }
        isSubscribeBackups = true

        // https://grpc.io/docs/platforms/android/java/basics/#client-side-streaming-rpc
        val responseObserver: StreamObserver<lnrpc.LightningOuterClass.ChanBackupSnapshot> = object :
            StreamObserver<lnrpc.LightningOuterClass.ChanBackupSnapshot> {
            val TAG = "subscribeChannelBackups"
            val eventName = "grpc_watchChanBackup"

            override fun onNext(backup: lnrpc.LightningOuterClass.ChanBackupSnapshot) {
                Log.i(TAG, "onNext: ${backup.getSingleChanBackups().getChanBackupsCount()}")
                val backupBase64 = Base64.encode(backup.getMultiChanBackup().getMultiChanBackup().toByteArray(), Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP)
                val result = Arguments.createMap()
                result.putString("event", "detect")
                result.putInt("count", ++subscribeBackupsNum)
                result.putString(
                    "backupBase64", backupBase64!!.toString(Charset.forName("US-ASCII"))
                )
                val chanPoints = Arguments.createArray()
                for (chanBackup in backup.getSingleChanBackups().getChanBackupsList()) {
                    val chanPoint = Arguments.createMap()
                    chanPoint.putString("funding_txid_str", chanBackup.getChanPoint().getFundingTxidBytes().toByteArray().reversedArray().toHexString())
                    chanPoint.putInt("output_index", chanBackup.getChanPoint().getOutputIndex())
                    chanPoints.pushMap(chanPoint)
                }
                result.putArray("chanPoints", chanPoints)
                sendEventToJs(reactContext, eventName, result)
            }

            override fun onError(t: Throwable) {
                Log.e(TAG, "onError: $t")
                isSubscribeTransactions = false
                val result = Arguments.createMap()
                result.putString("event", "error")
                result.putString("reason", t.toString())
                sendEventToJs(reactContext, eventName, result)
            }

            override fun onCompleted() {
                Log.e(TAG, "onCompleted")
                isSubscribeTransactions = false
                val result = Arguments.createMap()
                result.putString("event", "completed")
                sendEventToJs(reactContext, eventName, result)
            }
        }

        val req = lnrpc.LightningOuterClass.ChannelBackupSubscription.newBuilder()
            .build()
        val asyncStub = lnrpc.LightningGrpc.newStub(grpcAndroidChannel(reactContext, lndController)).withCallCredentials(
            LndGrpc.MacaroonCallCredential(adminMacaroon)
        )
        asyncStub.subscribeChannelBackups(req, responseObserver)

        Log.i(TAG, "startWatchLnInvoices() - started")
        promise.resolve(null)
    }

    companion object {
        private val TAG = LndGrpcLightning::class.java.name
    }
}