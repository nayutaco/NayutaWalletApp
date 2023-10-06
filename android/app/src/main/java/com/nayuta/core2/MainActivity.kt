package com.nayuta.core2

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.ReactRootView;

class MainActivity : ReactActivity() {
    /**
     * Returns the name of the main component registered from JavaScript. This is used to schedule
     * rendering of the component.
     */
    override fun getMainComponentName(): String {
        return "Core2"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(null)
    }

    /**
     * Returns the instance of the [ReactActivityDelegate]. There the RootView is created and
     * you can specify the rendered you wish to use (Fabric or the older renderer).
     */
    override fun createReactActivityDelegate(): ReactActivityDelegate? {
        return MainActivityDelegate(this, getMainComponentName())
    }

    class MainActivityDelegate(activity: ReactActivity?, mainComponentName: String?) :
        ReactActivityDelegate(activity, mainComponentName) {
        override fun createRootView(): ReactRootView {
            val reactRootView = ReactRootView(getContext())
            // If you opted-in for the New Architecture, we enable the Fabric Renderer.
            reactRootView.setIsFabric(BuildConfig.IS_NEW_ARCHITECTURE_ENABLED)
            return reactRootView
        }
    }

    companion object {
    }
}
