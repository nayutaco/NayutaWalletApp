package com.nayuta.core2

import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.util.Log

class BootedReceiver: BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        Log.d(TAG, "onReceive")
        if (context == null) {
            Log.d(TAG, "null context")
            return
        }
        if (intent?.action == "android.intent.action.BOOT_COMPLETED") {
            Log.d(TAG, "BOOT_COMPLETED")
            registerBootedIntentReceiver(context)
            AlarmReceiver.registerAlarmReceiver(context)
        }

        // val builder = createNotification(context)
        // val notificationManager: NotificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        // notificationManager.notify(LndService.NOTIFICATION_ID_BOOTED, builder.build())
    }

    // private fun createNotification(context: Context): NotificationCompat.Builder {
    //     val wakeupMeIntent = Intent(context, MainActivity::class.java).apply {
    //         flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
    //     }
    //     val wakeupMePendingIntent: PendingIntent = PendingIntent.getActivity(context, 0, wakeupMeIntent,
    //         PendingIntent.FLAG_IMMUTABLE
    //     )

    //     return NotificationCompat.Builder(context, LndService.NOTIFICATION_CHAN_ID)
    //         .setSmallIcon(R.drawable.ic_stat_notification2)
    //         .setContentTitle(context.getString(R.string.service_indicator_alarm))
    //         .setContentText(context.getString(R.string.service_indicator_alarm_desc))
    //         .setPriority(NotificationCompat.PRIORITY_DEFAULT)
    //         .setContentIntent(wakeupMePendingIntent)
    //         .setAutoCancel(true)
    // }

    companion object {
        private val TAG = BootedReceiver::class.java.name

        fun registerBootedIntentReceiver(context: Context) {
            Log.i(TAG, "registerBootedIntentReceiver")
            val receiver = ComponentName(context, BootedReceiver::class.java)
            context.packageManager.setComponentEnabledSetting(
                receiver,
                PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                PackageManager.DONT_KILL_APP
            )
        }
    }
}