package com.soundstreamy.app;

import android.content.Intent;
import android.os.Build;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BackgroundAudio")
public class BackgroundAudioPlugin extends Plugin implements BackgroundAudioService.MediaControlListener {
    private static final String TAG = "BackgroundAudioPlugin";

    @Override
    public void load() {
        super.load();
        Log.d(TAG, "BackgroundAudioPlugin loaded and registering listener");
        BackgroundAudioService.setListener(this);
    }

    @PluginMethod
    public void startService(PluginCall call) {
        try {
            String title = call.getString("title", "SoundStream");
            String artist = call.getString("artist", "Independent Artist");
            String coverUrl = call.getString("coverUrl", "");
            boolean isPlaying = call.getBoolean("isPlaying", false);
            double duration = call.getDouble("duration", 0.0); // seconds
            double position = call.getDouble("position", 0.0); // seconds

            Log.d(TAG, "startService: " + title + " - " + artist);

            Intent intent = new Intent(getContext(), BackgroundAudioService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(intent);
            } else {
                getContext().startService(intent);
            }

            // Update the service with initial playback parameters (converting seconds to ms)
            // Wait, we need to make sure the service instance is not null. Since startService is async, we can post a delayed update or wait, or the service onCreate will be called and we can set static properties.
            // A safer way is to have the service check static properties or we just update the service if it's already running, and also have a tiny retry/delay.
            updateServicePlayback(title, artist, coverUrl, isPlaying, (long)(position * 1000), (long)(duration * 1000));

            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Failed to start background audio service: " + e.getMessage());
            call.reject("Failed to start service", e);
        }
    }

    @PluginMethod
    public void stopService(PluginCall call) {
        try {
            Log.d(TAG, "stopService requested");
            Intent intent = new Intent(getContext(), BackgroundAudioService.class);
            getContext().stopService(intent);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Failed to stop background audio service: " + e.getMessage());
            call.reject("Failed to stop service", e);
        }
    }

    @PluginMethod
    public void updateState(PluginCall call) {
        try {
            String title = call.getString("title");
            String artist = call.getString("artist");
            String coverUrl = call.getString("coverUrl");
            Boolean isPlaying = call.getBoolean("isPlaying");
            Double duration = call.getDouble("duration"); // seconds
            Double position = call.getDouble("position"); // seconds

            long posMs = position != null ? (long)(position * 1000) : -1;
            long durMs = duration != null ? (long)(duration * 1000) : -1;

            updateServicePlayback(title, artist, coverUrl, isPlaying != null ? isPlaying : false, posMs, durMs);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to update state", e);
        }
    }

    private void updateServicePlayback(final String title, final String artist, final String coverUrl, final boolean isPlaying, final long position, final long duration) {
        // Try to update immediately
        BackgroundAudioService service = BackgroundAudioService.getInstance();
        if (service != null) {
            service.updatePlayback(title, artist, coverUrl, isPlaying, position, duration);
        } else {
            // Service might be starting, wait 100ms and retry once
            new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(new Runnable() {
                @Override
                public void run() {
                    BackgroundAudioService activeService = BackgroundAudioService.getInstance();
                    if (activeService != null) {
                        activeService.updatePlayback(title, artist, coverUrl, isPlaying, position, duration);
                    }
                }
            }, 250);
        }
    }

    // MediaControlListener callbacks triggered from native Android notifications or hardware buttons
    @Override
    public void onPlay() {
        Log.d(TAG, "Listener triggered: onPlay");
        JSObject ret = new JSObject();
        notifyListeners("onPlay", ret);
    }

    @Override
    public void onPause() {
        Log.d(TAG, "Listener triggered: onPause");
        JSObject ret = new JSObject();
        notifyListeners("onPause", ret);
    }

    @Override
    public void onNext() {
        Log.d(TAG, "Listener triggered: onNext");
        JSObject ret = new JSObject();
        notifyListeners("onNext", ret);
    }

    @Override
    public void onPrev() {
        Log.d(TAG, "Listener triggered: onPrev");
        JSObject ret = new JSObject();
        notifyListeners("onPrev", ret);
    }

    @Override
    public void onSeek(long positionMs) {
        Log.d(TAG, "Listener triggered: onSeek " + positionMs);
        JSObject ret = new JSObject();
        ret.put("position", positionMs / 1000.0); // convert back to seconds
        notifyListeners("onSeek", ret);
    }

    @PluginMethod
    public void setKeepScreenOn(final PluginCall call) {
        final boolean keepOn = call.getBoolean("keepOn", false);
        getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    if (keepOn) {
                        getActivity().getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                        Log.d(TAG, "Keep screen ON flag added");
                    } else {
                        getActivity().getWindow().clearFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                        Log.d(TAG, "Keep screen ON flag cleared");
                    }
                    call.resolve();
                } catch (Exception e) {
                    Log.e(TAG, "Failed to set keep screen on: " + e.getMessage());
                    call.reject("Failed to set keep screen on", e);
                }
            }
        });
    }
}
