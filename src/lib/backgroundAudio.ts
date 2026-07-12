import { registerPlugin, Capacitor } from '@capacitor/core';

export interface BackgroundAudioPlugin {
  startService(options: {
    title: string;
    artist: string;
    coverUrl: string;
    isPlaying: boolean;
    duration: number;
    position: number;
  }): Promise<void>;
  stopService(): Promise<void>;
  updateState(options: {
    title?: string;
    artist?: string;
    coverUrl?: string;
    isPlaying?: boolean;
    duration?: number;
    position?: number;
  }): Promise<void>;
  setKeepScreenOn(options: {
    keepOn: boolean;
  }): Promise<void>;
}

export const BackgroundAudio = Capacitor.isNativePlatform()
  ? registerPlugin<BackgroundAudioPlugin>('BackgroundAudio')
  : null;

export function setupBackgroundAudioListeners(callbacks: {
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (position: number) => void;
}) {
  if (!BackgroundAudio) return () => {};

  const playListener = (BackgroundAudio as any).addListener('onPlay', () => {
    callbacks.onPlay();
  });

  const pauseListener = (BackgroundAudio as any).addListener('onPause', () => {
    callbacks.onPause();
  });

  const nextListener = (BackgroundAudio as any).addListener('onNext', () => {
    callbacks.onNext();
  });

  const prevListener = (BackgroundAudio as any).addListener('onPrev', () => {
    callbacks.onPrev();
  });

  const seekListener = (BackgroundAudio as any).addListener('onSeek', (data: { position: number }) => {
    callbacks.onSeek(data.position);
  });

  return () => {
    playListener.remove();
    pauseListener.remove();
    nextListener.remove();
    prevListener.remove();
    seekListener.remove();
  };
}
