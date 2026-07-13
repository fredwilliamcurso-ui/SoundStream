import React, { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2
} from "lucide-react";

interface PlayerBarProps {
  currentSong?: {
    title: string;
    artistName: string;
    coverUrl: string;
    audioUrl: string;
  };
}

export default function PlayerBar({
  currentSong
}: PlayerBarProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(100);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!audioRef.current || !currentSong) return;

    audioRef.current.src = currentSong.audioUrl;
    audioRef.current.load();

    setPlaying(false);
    setProgress(0);
    setError(null);
  }, [currentSong]);

  const togglePlay = async () => {
    if (!audioRef.current || !currentSong) return;

    console.log("PLAYBAR AUDIO URL:", currentSong.audioUrl);

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setPlaying(true);
        setError(null);
      } catch (err) {
        console.error("Playbar block:", err);
        setError("Autoplay blocked. Press play again to stream.");
        setPlaying(false);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;

    const current = audioRef.current.currentTime;
    const duration = audioRef.current.duration || 1;

    setProgress((current / duration) * 100);
  };

  const handleSeek = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!audioRef.current) return;

    const value = Number(e.target.value);

    setProgress(value);

    audioRef.current.currentTime =
      (audioRef.current.duration * value) / 100;
  };

  const handleVolume = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = Number(e.target.value);

    setVolume(value);

    if (audioRef.current) {
      audioRef.current.volume = value / 100;
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-zinc-800 p-4 z-50">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onCanPlay={() => {
          setError(null);
          console.log("Playbar can play successfully");
        }}
        onLoadedMetadata={() => {
          console.log("Playbar loaded metadata successfully");
        }}
        onEnded={() => {
          setPlaying(false);
          setProgress(100);
          console.log("Playbar reached end of track");
        }}
        onError={(e) => {
          console.error("Playbar error:", e);
          setError("Failed to stream audio file.");
        }}
      />

      {error && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full bg-red-900 text-white text-xs px-3 py-1 rounded-t-md font-sans">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">

        <div className="flex items-center gap-3 min-w-[250px]">
          <img
            src={
              currentSong?.coverUrl ||
              "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80"
            }
            alt=""
            className="w-14 h-14 rounded object-cover"
          />

          <div>
            <p className="text-white text-sm font-semibold">
              {currentSong?.title || "No song selected"}
            </p>

            <p className="text-zinc-400 text-xs">
              {currentSong?.artistName || ""}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center flex-1 max-w-2xl">

          <div className="flex items-center gap-4 mb-2">

            <button className="text-white hover:text-indigo-400 transition-colors">
              <SkipBack size={20} />
            </button>

            <button
              onClick={togglePlay}
              className="bg-white hover:bg-zinc-200 text-black rounded-full p-2 transition-colors"
            >
              {playing ? (
                <Pause size={20} />
              ) : (
                <Play size={20} />
              )}
            </button>

            <button className="text-white hover:text-indigo-400 transition-colors">
              <SkipForward size={20} />
            </button>

          </div>

          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={handleSeek}
            className="w-full accent-indigo-500 cursor-pointer h-1 rounded-lg bg-zinc-800"
          />

        </div>

        <div className="flex items-center gap-2 min-w-[150px]">
          <Volume2
            size={18}
            className="text-white"
          />

          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={handleVolume}
            className="w-full accent-indigo-500 cursor-pointer h-1 rounded-lg bg-zinc-800"
          />
        </div>

      </div>
    </div>
  );
}
