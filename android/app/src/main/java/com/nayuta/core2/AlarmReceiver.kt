package com.nayuta.core2

import android.app.AlarmManager
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Context.ALARM_SERVICE
import android.content.Intent
import android.os.AsyncTask
import android.os.SystemClock
import android.util.Log
import androidx.core.app.NotificationCompat
import com.nayuta.core2.OsTools.Companion.isInternetAvailable
import lndmobile.Lndmobile
import java.lang.ref.WeakReference
import java.time.LocalDateTime

class AlarmReceiver: BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        Log.d(TAG, "onReceive")
        if (context == null) {
            Log.d(TAG, "null context")
            return
        }
        val sharedPref = context.getSharedPreferences(context.getString(R.string.preference_file_key), Context.MODE_PRIVATE)
        val alarmEnabled = sharedPref.getBoolean(context.getString(R.string.preference_cchk_alarm_enabled), true)
        val lndRunning = Lndmobile.isRunning()
        if (lndRunning || !alarmEnabled) {
            Log.i(TAG, "skip closed check(lndRunning=$lndRunning, alarmEnabled=$alarmEnabled)")
            removeLastFailTime(context)
            return
        }

        val pendingResult = goAsync()
        val asyncTask = Task(pendingResult, WeakReference(context), this)
        asyncTask.execute()
    }

    private class Task(
        private val pendingResult: PendingResult,
        private val contextRef: WeakReference<Context>, private val receiver: AlarmReceiver): AsyncTask<Void, Void, Void>()
    {
        override fun doInBackground(vararg params: Void?): Void? {
            Log.d(TAG, "doInBackground")

            val context = contextRef.get()
            if (context == null) {
                Log.e(TAG, "ccStart: null context")
                return null
            }

            try {
                Lndmobile.init(
                    context.filesDir.toString(),
                    "${context.filesDir}/logs/bitcoin/${context.getString(R.string.network)}/",
                )
                if (isInternetAvailable(context)) {
                    Lndmobile.ccStart(context.getString(R.string.network) != "mainnet")
                    val result = Lndmobile.ccCheckClosedChannels()
                    Log.d(TAG, "has closed channel: $result")
                    Lndmobile.ccEnd()

                    val notificationManager =
                        context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                    notificationManager.cancel(LndService.NOTIFICATION_ID_ALARM) // hide previous alarm notification
                    if (result) {
                        val now = LocalDateTime.now()
                        val title = context.getString(R.string.service_indicator_closed)
                        val description =
                            "${context.getString(R.string.service_indicator_closed_desc)}\n$now"
                        val builder = receiver.createNotification(context, title, description)
                        notificationManager.notify(
                            LndService.NOTIFICATION_ID_ALARM,
                            builder.build()
                        )
                    }
                    removeLastFailTime(context)
                } else {
                    throw Exception("network inactive")
                }
            } catch (e: Exception) {
                val failTime = lastFailTime(context, true)
                val currentTime = System.currentTimeMillis()
                val sharedPref = context.getSharedPreferences(context.getString(R.string.preference_file_key), Context.MODE_PRIVATE)
                val alarmLimit = sharedPref.getLong(context.getString(R.string.preference_cchk_alarm_limit), alarmLongOfflineDefault)
                Log.e(TAG, "closecheck($currentTime - $failTime = ${currentTime - failTime}): $e")
                if (currentTime - failTime >= alarmLimit) {
                    Log.d(TAG, "fail check long time")
                    val title = context.getString(R.string.service_indicator_longoff)
                    val description = context.getString(R.string.service_indicator_longoff_desc)
                    val builder = receiver.createNotification(context, title, description)
                    val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                    notificationManager.notify(LndService.NOTIFICATION_ID_ALARM, builder.build())
                }
            }

            Log.d(TAG, "doInBackground done")
            return null
        }

        override fun onPostExecute(result: Void?) {
            super.onPostExecute(result)
            pendingResult.finish()
            Log.d(TAG, "ccStart: onPostExecute")
        }
    }

    private fun createNotification(context: Context, title: String, description: String): NotificationCompat.Builder {
        val wakeupMeIntent = Intent(context, MainActivity::class.java).apply {
            action = Intent.ACTION_MAIN
            addCategory(Intent.CATEGORY_LAUNCHER)
        }
        val wakeupMePendingIntent: PendingIntent = PendingIntent.getActivity(context, 0, wakeupMeIntent,
            PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(context, LndService.NOTIFICATION_CHANHIGH_ID)
            .setSmallIcon(R.drawable.ic_stat_notification2)
            .setContentTitle(title)
            .setContentText(description)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(wakeupMePendingIntent)
            .setAutoCancel(true)
    }

    companion object {
        private val TAG = AlarmReceiver::class.java.name
        private const val alarmIntervalDefault: Long = 8 * 60 * 60 * 1000 // about 8hour
        private const val alarmLongOfflineDefault: Long = 20L * 24L * 60L * 60L * 1000L // abount 20day

        fun registerAlarmReceiver(context: Context) {
            val sharedPref = context.getSharedPreferences(context.getString(R.string.preference_file_key), Context.MODE_PRIVATE)
            val alarmInterval = sharedPref.getLong(context.getString(R.string.preference_cchk_alarm_period), alarmIntervalDefault)
            Log.i(TAG, "registerAlarmReceiver: $alarmInterval msec")

            val intent = Intent(context, AlarmReceiver::class.java)
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                0,
                intent,
                PendingIntent.FLAG_IMMUTABLE)

            val alarmManager = context.getSystemService(ALARM_SERVICE) as AlarmManager
            alarmManager.setInexactRepeating(
                AlarmManager.ELAPSED_REALTIME,
                SystemClock.elapsedRealtime() + alarmInterval,
                alarmInterval,
                pendingIntent)
        }

        fun getAlarmParams(context: Context): Triple<Boolean, String, String> {
            val sharedPref = context.getSharedPreferences(context.getString(R.string.preference_file_key), Context.MODE_PRIVATE)
            val alarmEnabled = sharedPref.getBoolean(context.getString(R.string.preference_cchk_alarm_enabled), true)
            val alarmIntervalMinute = sharedPref.getLong(context.getString(R.string.preference_cchk_alarm_period), alarmIntervalDefault) / 60L / 1000L
            val alarmLimitMinute = sharedPref.getLong(context.getString(R.string.preference_cchk_alarm_limit), alarmLongOfflineDefault) / 60L / 1000L
            return Triple(alarmEnabled, alarmIntervalMinute.toString(), alarmLimitMinute.toString())
        }

        fun setAlarmParams(context: Context, enabled: Boolean, intervalMinute: Int, limitMinute: Int) {
            val sharedPref = context.getSharedPreferences(context.getString(R.string.preference_file_key), Context.MODE_PRIVATE)
            with (sharedPref.edit()) {
                Log.d(TAG, "setAlarm: enabled=$enabled")
                putBoolean(
                    context.getString(R.string.preference_cchk_alarm_enabled),
                    enabled
                )
                if (intervalMinute > 0 && limitMinute > 0) {
                    Log.d(TAG, "setAlarm: intervalMinute=$intervalMinute, limitMinute=$limitMinute")
                    putLong(
                        context.getString(R.string.preference_cchk_alarm_period),
                        intervalMinute * 60L * 1000L
                    )
                    putLong(
                        context.getString(R.string.preference_cchk_alarm_limit),
                        limitMinute * 60L * 1000L
                    )
                } else if (intervalMinute == 0 && limitMinute == 0) {
                    Log.d(TAG, "setAlarm: remove")
                    remove(context.getString(R.string.preference_cchk_alarm_period))
                    remove(context.getString(R.string.preference_cchk_alarm_limit))
                } else {
                    Log.d(TAG, "setAlarm: not set")
                }
                commit()
            }
        }

        /*
         * Get last check fail time(msec).
         *
         * @param context Context
         * @param update true: update SharedPreference to current time if not exist.
         * @return last check fail time or current time
         */
        private fun lastFailTime(context: Context, update: Boolean): Long {
            val sharedPref = context.getSharedPreferences(context.getString(R.string.preference_file_key), Context.MODE_PRIVATE)
            val lastTime = sharedPref.getLong(
                context.getString(R.string.preference_cchk_fail_started),
                0L,
            )
            return if (lastTime != 0L) {
                lastTime
            } else {
                val currentTime = System.currentTimeMillis()
                if (update) {
                    with(sharedPref.edit()) {
                        Log.d(TAG, "fail time: $currentTime")
                        putLong(
                            context.getString(R.string.preference_cchk_fail_started),
                            currentTime,
                        )
                        apply()
                    }
                }
                currentTime
            }
        }

        fun removeLastFailTime(context: Context) {
            val sharedPref = context.getSharedPreferences(context.getString(R.string.preference_file_key), Context.MODE_PRIVATE)
            with(sharedPref.edit()) {
                remove(context.getString(R.string.preference_cchk_fail_started))
                commit()
            }
            Log.d(TAG, "lastFailTime: removed")
        }

//    private fun cancelAlarm() {
//        if (pendIntentAlarm != null) {
//            val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
//            alarmManager.cancel(pendIntentAlarm)
//        }
//    }
    }
}