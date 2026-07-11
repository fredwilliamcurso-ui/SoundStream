package com.soundstreamy.app;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        registerPlugin(BackgroundAudioPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onPause() {
        super.onPause();
        // Prevent WebView from fully suspending JavaScript timers and audio when minimized or locked
        Bridge bridgeObj = getBridge();
        if (bridgeObj != null) {
            WebView webView = bridgeObj.getWebView();
            if (webView != null) {
                webView.resumeTimers();
            }
        }
    }
}
