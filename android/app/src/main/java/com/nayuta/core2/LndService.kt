package com.nayuta.core2

import android.app.PendingIntent
import android.app.Service
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.Binder
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationChannelCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import lndmobile.Callback
import lndmobile.Lndmobile
import java.io.FileOutputStream

class LndService : Service() {
    private val binder = LocalBinder()
    private var notificationBuilder: NotificationCompat.Builder? = null

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "onCreate()")
        Lndmobile.init(
            applicationContext.filesDir.toString(),
            "${applicationContext.filesDir}/logs/bitcoin/${applicationContext.getString(R.string.network)}/",
        )
    }

    private fun startLnd(startArgs: String, config: String) {
        val args = "$startArgs --lnddir=${applicationContext.filesDir}"
        writeConfig(config)
        Lndmobile.start(args, RpcReadyHandler())
    }

    private fun writeConfig(config: String) {
        val filename = "lnd.conf"
        try {
            val outputStream: FileOutputStream = applicationContext.openFileOutput(filename, MODE_PRIVATE)
            outputStream.write(config.toByteArray())
            outputStream.close()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun onStartCommand(intent: Intent, flags: Int, startId: Int): Int {
        val extras = intent.extras!!

        val startArgs = extras.getString("startArgs") ?: ""
        val config = extras.getString("config")!! // CONFIG IS REQUIRED!! OR YOU'RE SLAPPED!!
        startLnd(startArgs, config)
        BootedReceiver.registerBootedIntentReceiver(applicationContext)
        AlarmReceiver.registerAlarmReceiver(applicationContext)
        createNotificationChannel()
        notificationBuilder = createNotification()
        startForeground(NOTIFICATION_ID, notificationBuilder!!.build())

        // service won't be restarted if this service's process is killed. See android docs
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        Log.d(TAG, "onDestroy")
        super.onDestroy()
    }

    override fun onBind(p0: Intent): IBinder {
        return binder
    }

    private fun createNotificationChannel() {
        val notificationManager = NotificationManagerCompat.from(applicationContext)
        val chan = NotificationChannelCompat.Builder(NOTIFICATION_CHAN_ID, NotificationManagerCompat.IMPORTANCE_LOW)
            .setName(getString(R.string.service_indicator_chan_name))
            .setDescription((getString(R.string.service_indicator_chan_desc))).build()
        notificationManager.createNotificationChannel(chan)

        val chanHigh = NotificationChannelCompat.Builder(NOTIFICATION_CHANHIGH_ID, NotificationManagerCompat.IMPORTANCE_HIGH)
            .setName(getString(R.string.service_indicator_chanhigh_name))
            .setDescription((getString(R.string.service_indicator_chan_desc))).build()
        notificationManager.createNotificationChannel(chanHigh)
    }

    private fun createNotification(): NotificationCompat.Builder {
        val appIntent = Intent(applicationContext, MainActivity::class.java).apply {
            action = Intent.ACTION_MAIN
            addCategory(Intent.CATEGORY_LAUNCHER)
        }
        val pendIntent = PendingIntent.getActivity(
                applicationContext,
                0,
                appIntent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)

        val appIntentSafeStop = Intent(Intent.ACTION_MAIN).apply {
            action = intentActionTerminate
            flags = Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendIntentSafeStop = PendingIntent.getBroadcast(
                this,
                0,
                appIntentSafeStop,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_ONE_SHOT)

        return NotificationCompat.Builder(applicationContext, NOTIFICATION_CHAN_ID)
            .setContentTitle(getString(R.string.app_name))
            .setSmallIcon(R.drawable.ic_stat_notification)
            .setContentIntent(pendIntent)
            .setOngoing(true)
            .addAction(R.drawable.ic_stat_notification, getString(R.string.service_indicator_safestop), pendIntentSafeStop)
    }

    private fun terminateService() {
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    fun messageNotification(message: String, iconType: Int) {
        var changed = false
        if (message.isNotEmpty()) {
            notificationBuilder!!.setContentText(message)
            changed = true
        }
        if (iconType >= 0) {
            notificationBuilder!!
                .setSmallIcon(
                    when (iconType) {
                        2 -> R.drawable.ic_stat_notification2
                        else -> R.drawable.ic_stat_notification
                    }
                )
            changed = true
        }
        if (changed) {
            with(NotificationManagerCompat.from(applicationContext)) {
                notify(NOTIFICATION_ID, notificationBuilder!!.build())
            }
        }
    }

    inner class LocalBinder: Binder() {
        fun getService(): LndService = this@LndService
    }

    inner class RpcReadyHandler : Callback {
        override fun onError(p0: Exception?) {
            val reason = p0?.message // null if gracefully stopped
            Log.d(TAG, "onError($reason)")
            lndCallback.onExit(reason)
            terminateService()
        }

        override fun onResponse(data: ByteArray?) {
            Log.d(TAG, "RPC is Ready")
            lndCallback.onRpcReady()
        }
    }

    companion object {
        // notification
        const val NOTIFICATION_CHAN_ID = "service_indicator"
        const val NOTIFICATION_CHANHIGH_ID = "high_priority_indicator"
        const val NOTIFICATION_ID_ALARM = 200
        private const val NOTIFICATION_ID = 334
        const val intentActionTerminate = "com.nayuta.core2.action.TERMINATE"

        // public
        lateinit var lndCallback: LndCallback
        lateinit var mService: LndService
        var mBound: Boolean = false

        fun startLndService(ctx: Context, startArgs: String, config: String, callback: LndCallback) {
            Log.d(TAG, "startLndService")
            val startIntent = Intent(ctx, LndService::class.java)
            startIntent.putExtra("startArgs", startArgs)
            startIntent.putExtra("config", config)

            ctx.startForegroundService(startIntent)
            lndCallback = callback

            Intent(ctx, LndService::class.java).also { intent ->
                ctx.bindService(intent, connection, Context.BIND_AUTO_CREATE)
            }
        }
        fun stopLndService(ctx: Context) {
            ctx.stopService(Intent(ctx, LndService::class.java))
        }
        fun messageServiceNotification(message: String, iconType: Int) {
            if (mBound) {
                mService.messageNotification(message, iconType)
            }
        }

        // private
        private val TAG = LndService::class.java.name
        private val connection = object: ServiceConnection {
            override fun onServiceConnected(className: ComponentName, service: IBinder) {
                Log.d(TAG, "onServiceConnected")
                val binder = service as LndService.LocalBinder
                mService = binder.getService()
                mBound = true
            }

            override fun onServiceDisconnected(p0: ComponentName?) {
                mBound = false
            }
        }
    }

    abstract class LndCallback {
        // Notifies Service has started.
        abstract fun onRpcReady()

        // Notifies Service stop/crash.
        abstract fun onExit(reason: String?)
    }

}
