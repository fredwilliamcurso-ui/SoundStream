package com.soundstreamy.app;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onPause() {
        super.onPause();
        // Keep WebView timers and media active for background audio playback
        try {
            WebView webView = this.bridge.getWebView();
            if (webView != null) {
                webView.resumeTimers();
                webView.onResume();
            }
        } catch (Exception e) {
            android.util.Log.e("MainActivity", "Error resuming WebView on pause", e);
        }
    }
}
