package com.soundstreamy.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.net.wifi.WifiManager;
import android.os.Binder;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.SystemClock;
import android.util.Log;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class BackgroundAudioService extends Service {
    private static final String TAG = "BackgroundAudioService";
    private static final String CHANNEL_ID = "soundstream_background_audio_channel";
    private static final int NOTIFICATION_ID = 40401;

    private static BackgroundAudioService instance = null;
    private static MediaControlListener listener = null;

    private MediaSession mediaSession;
    private PowerManager.WakeLock wakeLock;
    private WifiManager.WifiLock wifiLock;
    private AudioManager audioManager;
    private AudioFocusRequest audioFocusRequest;

    // Current track metadata cache
    private String currentTitle = "SoundStream";
    private String currentArtist = "Independent Artist";
    private String currentCoverUrl = "";
    private Bitmap currentArtwork = null;
    private boolean currentIsPlaying = false;
    private long currentPosition = 0; // ms
    private long currentDuration = 0; // ms

    public interface MediaControlListener {
        void onPlay();
        void onPause();
        void onNext();
        void onPrev();
        void onSeek(long positionMs);
    }

    public static BackgroundAudioService getInstance() {
        return instance;
    }

    public static void setListener(MediaControlListener l) {
        listener = l;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        Log.d(TAG, "onCreate: Background Audio Service Created");

        createNotificationChannel();
        initMediaSession();
        acquireLocks();
        requestAudioFocus();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && intent.getAction() != null) {
            String action = intent.getAction();
            Log.d(TAG, "onStartCommand action: " + action);
            if ("ACTION_PLAY".equals(action)) {
                if (listener != null) listener.onPlay();
            } else if ("ACTION_PAUSE".equals(action)) {
                if (listener != null) listener.onPause();
            } else if ("ACTION_NEXT".equals(action)) {
                if (listener != null) listener.onNext();
            } else if ("ACTION_PREV".equals(action)) {
                if (listener != null) listener.onPrev();
            }
        }
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        Log.d(TAG, "onDestroy: Background Audio Service Destroyed");
        releaseLocks();
        abandonAudioFocus();
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
        }
        instance = null;
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return new LocalBinder();
    }

    public class LocalBinder extends Binder {
        public BackgroundAudioService getService() {
            return BackgroundAudioService.this;
        }
    }

    private void initMediaSession() {
        mediaSession = new MediaSession(this, "SoundStreamMediaSession");
        mediaSession.setCallback(new MediaSession.Callback() {
            @Override
            public void onPlay() {
                super.onPlay();
                Log.d(TAG, "MediaSession Callback: onPlay");
                if (listener != null) listener.onPlay();
            }

            @Override
            public void onPause() {
                super.onPause();
                Log.d(TAG, "MediaSession Callback: onPause");
                if (listener != null) listener.onPause();
            }

            @Override
            public void onSkipToNext() {
                super.onSkipToNext();
                Log.d(TAG, "MediaSession Callback: onSkipToNext");
                if (listener != null) listener.onNext();
            }

            @Override
            public void onSkipToPrevious() {
                super.onSkipToPrevious();
                Log.d(TAG, "MediaSession Callback: onSkipToPrevious");
                if (listener != null) listener.onPrev();
            }

            @Override
            public void onSeekTo(long pos) {
                super.onSeekTo(pos);
                Log.d(TAG, "MediaSession Callback: onSeekTo " + pos);
                if (listener != null) listener.onSeek(pos);
            }
        });

        mediaSession.setFlags(MediaSession.FLAG_HANDLES_MEDIA_BUTTONS | MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS);
        mediaSession.setActive(true);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "SoundStream Playback",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Media controls for SoundStream background playback");
            channel.setShowBadge(false);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void acquireLocks() {
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null && (wakeLock == null || !wakeLock.isHeld())) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "SoundStream::BackgroundAudioWakeLock");
            wakeLock.acquire();
        }
        WifiManager wm = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
        if (wm != null && (wifiLock == null || !wifiLock.isHeld())) {
            wifiLock = wm.createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, "SoundStream::BackgroundAudioWifiLock");
            wifiLock.acquire();
        }
    }

    private void releaseLocks() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
            wakeLock = null;
        }
        if (wifiLock != null && wifiLock.isHeld()) {
            wifiLock.release();
            wifiLock = null;
        }
    }

    private final AudioManager.OnAudioFocusChangeListener audioFocusChangeListener = new AudioManager.OnAudioFocusChangeListener() {
        @Override
        public void onAudioFocusChange(int focusChange) {
            Log.d(TAG, "onAudioFocusChange: " + focusChange);
            switch (focusChange) {
                case AudioManager.AUDIOFOCUS_LOSS:
                case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
                case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
                    if (listener != null) listener.onPause();
                    break;
                case AudioManager.AUDIOFOCUS_GAIN:
                    if (listener != null) listener.onPlay();
                    break;
            }
        }
    };

    private boolean requestAudioFocus() {
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        if (audioManager == null) return false;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AudioAttributes playbackAttributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build();
            audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                    .setAudioAttributes(playbackAttributes)
                    .setAcceptsDelayedFocusGain(true)
                    .setOnAudioFocusChangeListener(audioFocusChangeListener)
                    .build();
            return audioManager.requestAudioFocus(audioFocusRequest) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
        } else {
            return audioManager.requestAudioFocus(audioFocusChangeListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
        }
    }

    private void abandonAudioFocus() {
        if (audioManager == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
            audioManager.abandonAudioFocusRequest(audioFocusRequest);
        } else {
            audioManager.abandonAudioFocus(audioFocusChangeListener);
        }
    }

    // Public method to start/update the foreground service state
    public void updatePlayback(String title, String artist, String coverUrl, boolean isPlaying, long position, long duration) {
        currentTitle = title != null ? title : currentTitle;
        currentArtist = artist != null ? artist : currentArtist;
        currentIsPlaying = isPlaying;
        currentPosition = position;
        currentDuration = duration;

        if (coverUrl != null && !coverUrl.equals(currentCoverUrl)) {
            currentCoverUrl = coverUrl;
            // Fetch artwork in a background thread
            loadArtworkAsync(coverUrl);
        } else {
            updateMediaMetadataAndNotification();
        }
    }

    private void loadArtworkAsync(final String coverUrl) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                Bitmap bitmap = null;
                if (coverUrl != null && !coverUrl.isEmpty()) {
                    try {
                        URL url = new URL(coverUrl);
                        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                        connection.setDoInput(true);
                        connection.setConnectTimeout(5000);
                        connection.setReadTimeout(5000);
                        connection.connect();
                        InputStream input = connection.getInputStream();
                        bitmap = BitmapFactory.decodeStream(input);
                    } catch (Exception e) {
                        Log.e(TAG, "Error downloading cover artwork: " + e.getMessage());
                    }
                }
                final Bitmap finalBitmap = bitmap;
                new Handler(Looper.getMainLooper()).post(new Runnable() {
                    @Override
                    public void run() {
                        currentArtwork = finalBitmap;
                        updateMediaMetadataAndNotification();
                    }
                });
            }
        }).start();
    }

    private void updateMediaMetadataAndNotification() {
        if (mediaSession == null) return;

        // 1. Update MediaSession Metadata
        MediaMetadata.Builder metadataBuilder = new MediaMetadata.Builder()
                .putString(MediaMetadata.METADATA_KEY_TITLE, currentTitle)
                .putString(MediaMetadata.METADATA_KEY_ARTIST, currentArtist)
                .putString(MediaMetadata.METADATA_KEY_ALBUM, "SoundStream")
                .putLong(MediaMetadata.METADATA_KEY_DURATION, currentDuration);

        if (currentArtwork != null) {
            metadataBuilder.putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART, currentArtwork);
            metadataBuilder.putBitmap(MediaMetadata.METADATA_KEY_DISPLAY_ICON, currentArtwork);
        } else {
            // Fallback artwork to app icon
            try {
                Bitmap appIcon = BitmapFactory.decodeResource(getResources(), getApplicationContext().getApplicationInfo().icon);
                metadataBuilder.putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART, appIcon);
                metadataBuilder.putBitmap(MediaMetadata.METADATA_KEY_DISPLAY_ICON, appIcon);
            } catch (Exception e) {
                Log.e(TAG, "Failed to load default app icon: " + e.getMessage());
            }
        }
        mediaSession.setMetadata(metadataBuilder.build());

        // 2. Update MediaSession PlaybackState (for Lock Screen & system progress updates)
        PlaybackState.Builder stateBuilder = new PlaybackState.Builder()
                .setActions(PlaybackState.ACTION_PLAY |
                            PlaybackState.ACTION_PAUSE |
                            PlaybackState.ACTION_PLAY_PAUSE |
                            PlaybackState.ACTION_SKIP_TO_NEXT |
                            PlaybackState.ACTION_SKIP_TO_PREVIOUS |
                            PlaybackState.ACTION_SEEK_TO);

        int state = currentIsPlaying ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED;
        stateBuilder.setState(state, currentPosition, 1.0f, SystemClock.elapsedRealtime());
        mediaSession.setPlaybackState(stateBuilder.build());

        // 3. Build & Post Persistent Notification
        Intent notificationIntent = new Intent(this, MainActivity.class);
        notificationIntent.setAction(Intent.ACTION_MAIN);
        notificationIntent.addCategory(Intent.CATEGORY_LAUNCHER);
        int pendingIntentFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pendingIntentFlags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, notificationIntent, pendingIntentFlags);

        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
        }

        builder.setSmallIcon(android.R.drawable.ic_media_play)
               .setContentTitle(currentTitle)
               .setContentText(currentArtist)
               .setSubText("SoundStream")
               .setLargeIcon(currentArtwork != null ? currentArtwork : BitmapFactory.decodeResource(getResources(), getApplicationContext().getApplicationInfo().icon))
               .setContentIntent(pendingIntent)
               .setVisibility(Notification.VISIBILITY_PUBLIC)
               .setOngoing(currentIsPlaying);

        // Actions for Playback control
        Intent prevIntent = new Intent(this, BackgroundAudioService.class).setAction("ACTION_PREV");
        PendingIntent prevPending = PendingIntent.getService(this, 1, prevIntent, pendingIntentFlags);
        builder.addAction(new Notification.Action.Builder(
                android.R.drawable.ic_media_previous, "Previous", prevPending).build());

        Intent playPauseIntent = new Intent(this, BackgroundAudioService.class).setAction(currentIsPlaying ? "ACTION_PAUSE" : "ACTION_PLAY");
        PendingIntent playPausePending = PendingIntent.getService(this, 2, playPauseIntent, pendingIntentFlags);
        builder.addAction(new Notification.Action.Builder(
                currentIsPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
                currentIsPlaying ? "Pause" : "Play", playPausePending).build());

        Intent nextIntent = new Intent(this, BackgroundAudioService.class).setAction("ACTION_NEXT");
        PendingIntent nextPending = PendingIntent.getService(this, 3, nextIntent, pendingIntentFlags);
        builder.addAction(new Notification.Action.Builder(
                android.R.drawable.ic_media_next, "Next", nextPending).build());

        // Use native Notification.MediaStyle
        Notification.MediaStyle mediaStyle = new Notification.MediaStyle()
                .setMediaSession(mediaSession.getSessionToken())
                .setShowActionsInCompactView(0, 1, 2);
        builder.setStyle(mediaStyle);

        Notification notification = builder.build();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIFICATION_ID, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }
}
