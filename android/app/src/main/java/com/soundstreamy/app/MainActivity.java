package com.soundstreamy.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onPause() {
        super.onPause();
        // Prevent WebView from fully suspending JavaScript timers and audio when minimized or locked
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().resumeTimers();
        }
    }
}
