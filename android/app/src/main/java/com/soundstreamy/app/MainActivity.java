package com.soundstreamy.app;

import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onPause() {
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
