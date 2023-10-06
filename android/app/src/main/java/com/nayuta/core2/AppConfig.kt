package com.nayuta.core2

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule

class AppConfig internal constructor(var mContext: ReactApplicationContext) : ReactContextBaseJavaModule(mContext) {
    override fun getName(): String {
        return "AppConfig"
    }

    override fun getConstants(): Map<String, Any> {
        val constants: MutableMap<String, Any> = HashMap()
        constants["BUILD_TYPE"] = mContext.getString(R.string.buildType)
        constants["NETWORK"] = mContext.getString(R.string.network)
        return constants
    }
}
