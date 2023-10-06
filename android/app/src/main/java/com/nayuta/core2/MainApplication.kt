package com.nayuta.core2

import android.app.Application
import android.content.Context
import com.facebook.react.*
import com.facebook.react.config.ReactFeatureFlags;
import com.facebook.soloader.SoLoader
import com.nayuta.core2.newarchitecture.MainApplicationReactNativeHost;
import java.lang.reflect.InvocationTargetException

import com.facebook.react.bridge.JSIModulePackage
import com.swmansion.reanimated.ReanimatedJSIModulePackage

class MainApplication : Application(), ReactApplication {
    private val mReactNativeHost: ReactNativeHost = object : ReactNativeHost(this) {
        override fun getUseDeveloperSupport(): Boolean {
            return BuildConfig.DEBUG
        }

        override fun getPackages(): List<ReactPackage> {
            val packages: MutableList<ReactPackage> = PackageList(this).packages
            // Packages that cannot be autolinked yet can be added manually here, for example:
            // packages.add(new MyReactNativePackage());
            packages.add(CustomWrapperPackage())
            return packages
        }

        override fun getJSMainModuleName(): String {
            return "index"
        }

        override fun getJSIModulePackage(): JSIModulePackage {
            return ReanimatedJSIModulePackage()
        }
    }

    private val mNewArchitectureNativeHost: ReactNativeHost = MainApplicationReactNativeHost(this)

    override fun getReactNativeHost(): ReactNativeHost {
        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
            return mNewArchitectureNativeHost
        } else {
            return mReactNativeHost
        }
    }

    override fun onCreate() {
        super.onCreate()
        // If you opted-in for the New Architecture, we enable the TurboModule system
        ReactFeatureFlags.useTurboModules = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        SoLoader.init(this,  /* native exopackage */false)
        initializeFlipper(this, reactNativeHost.reactInstanceManager) // Remove this line if you don't want Flipper enabled
    }

    companion object {
        /**
         * Loads Flipper in React Native templates.
         *
         * @param context
         */
        private fun initializeFlipper(context: Context, reactInstanceManager: ReactInstanceManager) {
            if (BuildConfig.DEBUG) {
                try {
                    /*
                     We use reflection here to pick up the class that initializes Flipper,
                     since Flipper library is not available in release mode
                    */
                    val aClass = Class.forName("com.nayuta.core2.ReactNativeFlipper")
                    aClass
                        .getMethod(
                            "initializeFlipper",
                            Context::class.java,
                            ReactInstanceManager::class.java
                        )
                        .invoke(null, context, reactInstanceManager)
                } catch (e: ClassNotFoundException) {
                    e.printStackTrace()
                } catch (e: NoSuchMethodException) {
                    e.printStackTrace()
                } catch (e: IllegalAccessException) {
                    e.printStackTrace()
                } catch (e: InvocationTargetException) {
                    e.printStackTrace()
                }
            }
        }
    }
}
