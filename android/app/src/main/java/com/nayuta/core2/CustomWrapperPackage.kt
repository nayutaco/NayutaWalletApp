package com.nayuta.core2

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class CustomWrapperPackage : ReactPackage {
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }

    override fun createNativeModules(
        reactContext: ReactApplicationContext
    ): List<NativeModule> {
        val modules: MutableList<NativeModule> = ArrayList()
        val lndController = LndReactController(reactContext)
        val lndGrpcLightning = LndGrpcLightning(reactContext, lndController)
        val lndGrpcRouter = LndGrpcRouter(reactContext, lndController)
        modules.add(lndController)
        modules.add(lndGrpcLightning)
        modules.add(lndGrpcRouter)
        modules.add(LspClient(reactContext))
        modules.add(ExportFiles(reactContext))
        modules.add(AppConfig(reactContext))
        modules.add(AppOpener(reactContext))
        modules.add(OsTools(reactContext))
        return modules
    }
}
