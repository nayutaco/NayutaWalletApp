package com.nayuta.core2

import android.content.Intent
import android.net.Uri
import com.facebook.react.bridge.*
import java.lang.Exception

class AppOpener(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    override fun getName() = "AppOpener"

    @ReactMethod
    fun openAppWithUrl(url: String, packageId: String, promise: Promise) {
        if (url == null || url == "") {
            promise.reject(JSApplicationIllegalArgumentException("Invalid URL: $url"))
            return
        }
        try {
            val intent = Intent().apply {
                action = Intent.ACTION_VIEW
                data = Uri.parse(url).normalizeScheme()
                `package` = packageId
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            (currentActivity ?: reactApplicationContext).startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject(
                JSApplicationIllegalArgumentException(
                    "Could not open URL '$url': ${e.message}"
                )
            )
        }
    }
    @ReactMethod
    fun canOpenAppWithUrl(url: String, packageId: String, promise: Promise) {
        if (url == null || url == "") {
            promise.reject(JSApplicationIllegalArgumentException("Invalid URL: $url"))
            return
        }
        try {
            val intent = Intent().apply {
                action = Intent.ACTION_VIEW
                data = Uri.parse(url).normalizeScheme()
                `package` = packageId
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            val targetComponent = intent.resolveActivity(reactApplicationContext.packageManager)
            val canOpen = targetComponent != null && targetComponent.packageName == packageId
            promise.resolve(canOpen)
        } catch (e: Exception) {
            promise.reject(
                JSApplicationIllegalArgumentException(
                    "Could not open URL '$url': ${e.message}"
                )
            )
        }
    }
}
