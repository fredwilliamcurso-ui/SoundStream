import React, { useRef, useEffect, useState } from "react";
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX, 
  Heart, 
  Repeat, 
  Shuffle,
  Maximize2,
  Minimize2,
  Share2,
  ScrollText,
  Sparkles,
  Tv,
  AlertCircle,
  Disc,
  Sliders,
  ChevronRight,
  ListMusic,
  Maximize
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Song } from "../types";
import VideoPlayer from "./VideoPlayer";
import { BackgroundAudio, setupBackgroundAudioListeners } from "../lib/backgroundAudio";

interface MusicPlayerProps {
  song: Song | null;
  isPlaying: boolean;
  onPlayPauseToggle: () => void;
  onNext: () => void;
  onPrev: () => void;
  liked: boolean;
  onLikeToggle: (songId: string) => void;
  audioRef: React.RefObject<HTMLVideoElement | null>;
  playbackTime: { current: number; total: number };
  onSeek: (time: number) => void;
  isShuffle: boolean;
  onShuffleToggle: () => void;
  isRepeat: boolean;
  onRepeatToggle: () => void;
  onShareSong: (song: Song) => void;
  playbackError?: string | null;
  playbackMode?: "audio" | "video";
  onPlaybackModeToggle?: (mode: "audio" | "video") => void;
  isPremium?: boolean;
}

type VisualizerStyle = "halo" | "wave" | "equalizer";

export default function MusicPlayer({
  song,
  isPlaying,
  onPlayPauseToggle,
  onNext,
  onPrev,
  liked,
  onLikeToggle,
  audioRef,
  playbackTime,
  onSeek,
  isShuffle,
  onShuffleToggle,
  isRepeat,
  onRepeatToggle,
  onShareSong,
  playbackError,
  playbackMode = "video",
  onPlaybackModeToggle,
  isPremium = false
}: MusicPlayerProps) {
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [showFullPlayer, setShowFullPlayer] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false); // Minimized compact Cyber Deck floating mode
  const [showLyrics, setShowLyrics] = useState(false);
  const [showTheaterMode, setShowTheaterMode] = useState(false);
  const [audioQuality, setAudioQuality] = useState<"standard" | "high" | "lossless">("standard");
  const [qualityWarning, setQualityWarning] = useState(false);
  
  // Custom Player Options
  const [visualizerStyle, setVisualizerStyle] = useState<VisualizerStyle>("halo");
  const [activeExtraTab, setActiveExtraTab] = useState<"lyrics" | "ai" | "queue">("lyrics");

  const lastSyncedPosRef = useRef(0);

  // Web Audio Visualizer References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Dynamic Glow Background Colors mapped by Genre/Vibe
  const getGlowColor = (genre: string) => {
    const clean = (genre || "").toLowerCase();
    if (clean.includes("afro")) return "from-amber-500/15 via-red-600/10 to-orange-500/15";
    if (clean.includes("hip")) return "from-indigo-600/15 via-blue-600/10 to-cyan-500/15";
    if (clean.includes("amapiano")) return "from-purple-600/15 via-pink-600/10 to-indigo-500/15";
    if (clean.includes("gospel")) return "from-yellow-400/15 via-emerald-500/10 to-teal-500/15";
    return "from-indigo-500/15 via-purple-600/10 to-pink-500/15";
  };

  // Sync volume with media tag
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted, song, audioRef]);

  // Media Session Integration
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator) || !song) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.artistName,
        album: "SoundStreamy",
        artwork: [
          { src: song.coverUrl, sizes: "192x192", type: "image/jpeg" },
          { src: song.coverUrl, sizes: "512x512", type: "image/jpeg" }
        ]
      });

      navigator.mediaSession.setActionHandler("play", onPlayPauseToggle);
      navigator.mediaSession.setActionHandler("pause", onPlayPauseToggle);
      navigator.mediaSession.setActionHandler("previoustrack", onPrev);
      navigator.mediaSession.setActionHandler("nexttrack", onNext);

      try {
        navigator.mediaSession.setActionHandler("seekto", (details) => {
          if (details.seekTime !== undefined) {
            onSeek(details.seekTime);
          }
        });
      } catch (e) {
        console.warn("MediaSession seekto not supported:", e);
      }
    } catch (err) {
      console.error("MediaSession error:", err);
    }

    return () => {
      if ("mediaSession" in navigator) {
        navigator.mediaSession.setActionHandler("play", null);
        navigator.mediaSession.setActionHandler("pause", null);
        navigator.mediaSession.setActionHandler("previoustrack", null);
        navigator.mediaSession.setActionHandler("nexttrack", null);
        try {
          navigator.mediaSession.setActionHandler("seekto", null);
        } catch (e) {}
      }
    };
  }, [song, onPlayPauseToggle, onNext, onPrev, onSeek]);

  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator) || !navigator.mediaSession.setPositionState) return;
    try {
      const duration = playbackTime.total || 0;
      const position = Math.min(playbackTime.current || 0, duration);
      if (duration > 0 && position >= 0) {
        navigator.mediaSession.setPositionState({
          duration,
          playbackRate: 1.0,
          position
        });
      }
    } catch (err) {}
  }, [playbackTime.current, playbackTime.total]);

  // Background audio sync
  useEffect(() => {
    if (!BackgroundAudio || !song) return;
    BackgroundAudio.startService({
      title: song.title,
      artist: song.artistName,
      coverUrl: song.coverUrl,
      isPlaying: isPlaying,
      duration: playbackTime.total || 0,
      position: playbackTime.current || 0
    }).catch(err => console.error("Failed to start BackgroundAudio:", err));
  }, [song?.id, isPlaying]);

  useEffect(() => {
    if (!BackgroundAudio || !song) return;
    const diff = Math.abs(playbackTime.current - lastSyncedPosRef.current);
    if (diff > 3) {
      BackgroundAudio.updateState({
        title: song.title,
        artist: song.artistName,
        coverUrl: song.coverUrl,
        isPlaying: isPlaying,
        duration: playbackTime.total || 0,
        position: playbackTime.current
      }).catch(err => console.error("BackgroundAudio sync failed:", err));
    }
    lastSyncedPosRef.current = playbackTime.current;
  }, [playbackTime.current, song, isPlaying, playbackTime.total]);

  useEffect(() => {
    if (!BackgroundAudio || !song) return;
    const cleanup = setupBackgroundAudioListeners({
      onPlay: () => { if (!isPlaying) onPlayPauseToggle(); },
      onPause: () => { if (isPlaying) onPlayPauseToggle(); },
      onNext: () => { onNext(); },
      onPrev: () => { onPrev(); },
      onSeek: (pos) => { onSeek(pos); }
    });
    return () => { cleanup(); };
  }, [song, isPlaying, onPlayPauseToggle, onNext, onPrev, onSeek]);

  // REAL-TIME CANVAS AUDIO VISUALIZER ENGINE
  useEffect(() => {
    // Canvas setup helper
    const initVisualizer = () => {
      const canvas = canvasRef.current;
      const audio = audioRef.current;
      if (!canvas || !audio) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Handle canvas resize
      const resizeCanvas = () => {
        canvas.width = canvas.parentElement?.clientWidth || 300;
        canvas.height = canvas.parentElement?.clientHeight || 120;
      };
      resizeCanvas();
      window.addEventListener("resize", resizeCanvas);

      // Lazy load & build Web Audio graph on play (CORS compliant)
      if (isPlaying) {
        try {
          if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          }
          if (!analyserRef.current && audioCtxRef.current) {
            analyserRef.current = audioCtxRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
          }
          
          // Set crossorigin on media node
          audio.crossOrigin = "anonymous";

          if (!sourceNodeRef.current && audioCtxRef.current && analyserRef.current) {
            sourceNodeRef.current = audioCtxRef.current.createMediaElementSource(audio);
            sourceNodeRef.current.connect(analyserRef.current);
            analyserRef.current.connect(audioCtxRef.current.destination);
          }
          
          if (audioCtxRef.current.state === "suspended") {
            audioCtxRef.current.resume();
          }
        } catch (e) {
          console.warn("CORS or AudioNode conflict (using hybrid visualizer fallback):", e);
        }
      }

      const draw = () => {
        animationFrameRef.current = requestAnimationFrame(draw);
        
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        const bufferLength = analyserRef.current ? analyserRef.current.frequencyBinCount : 64;
        const dataArray = new Uint8Array(bufferLength);
        
        let hasRealAudioData = false;
        if (analyserRef.current && isPlaying) {
          analyserRef.current.getByteFrequencyData(dataArray);
          // Check if it's muted or blocked by CORS (data is all zeros)
          for (let i = 0; i < bufferLength; i++) {
            if (dataArray[i] > 0) {
              hasRealAudioData = true;
              break;
            }
          }
        }

        // Hybrid Fallback: Generate premium algorithmic soundwaves if CORS blocks binary access or muted
        if (!hasRealAudioData) {
          const t = Date.now() * 0.003;
          for (let i = 0; i < bufferLength; i++) {
            if (isPlaying) {
              // Simulated sound waves reacting to current track info
              const base = Math.sin(i * 0.15 + t) * Math.cos(i * 0.05 - t * 0.5);
              const high = Math.sin(i * 0.8 + t * 2) * 0.3;
              dataArray[i] = Math.abs(base + high) * 120 + 30; // Bouncing frequencies
            } else {
              // Flat line with micro hum
              dataArray[i] = Math.sin(i * 0.2 + t * 0.1) * 3 + 4;
            }
          }
        }

        // Render dynamic style
        if (visualizerStyle === "halo") {
          // Circular floating spectrum wrapping the rotating vinyl disk
          const cx = w / 2;
          const cy = h / 2;
          const radius = Math.min(w, h) * 0.32;

          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
          ctx.lineWidth = 1;
          ctx.stroke();

          for (let i = 0; i < bufferLength; i += 2) {
            const percent = dataArray[i] / 255;
            const barHeight = percent * 45;
            const angle = (i / bufferLength) * Math.PI * 2;
            
            const x1 = cx + Math.cos(angle) * radius;
            const y1 = cy + Math.sin(angle) * radius;
            const x2 = cx + Math.cos(angle) * (radius + barHeight);
            const y2 = cy + Math.sin(angle) * (radius + barHeight);

            const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
            gradient.addColorStop(0, "rgba(99, 102, 241, 0.2)");
            gradient.addColorStop(0.5, "rgba(236, 72, 153, 0.6)");
            gradient.addColorStop(1, "rgba(236, 72, 153, 0)");

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 3;
            ctx.stroke();
          }
        } else if (visualizerStyle === "wave") {
          // Beautiful high-fidelity electronic wave stream
          ctx.beginPath();
          ctx.lineWidth = 3.5;
          const gradient = ctx.createLinearGradient(0, 0, w, 0);
          gradient.addColorStop(0, "rgba(99, 102, 241, 0.8)");
          gradient.addColorStop(0.5, "rgba(236, 72, 153, 0.9)");
          gradient.addColorStop(1, "rgba(6, 182, 212, 0.8)");
          ctx.strokeStyle = gradient;

          ctx.moveTo(0, h / 2);
          const sliceWidth = w / bufferLength;
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v * h) / 2;

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
            x += sliceWidth;
          }
          ctx.lineTo(w, h / 2);
          ctx.stroke();

          // Reflective floor
          ctx.lineTo(w, h);
          ctx.lineTo(0, h);
          ctx.closePath();
          ctx.fillStyle = "rgba(99, 102, 241, 0.03)";
          ctx.fill();
        } else {
          // Classic Solid Laser Columns with glowing neon points
          const barWidth = (w / bufferLength) * 2.2;
          let x = 0;

          for (let i = 0; i < bufferLength; i += 2) {
            const percent = dataArray[i] / 255;
            const barHeight = percent * (h * 0.85);

            const grad = ctx.createLinearGradient(x, h, x, h - barHeight);
            grad.addColorStop(0, "rgba(99, 102, 241, 0.1)");
            grad.addColorStop(0.6, "rgba(168, 85, 247, 0.6)");
            grad.addColorStop(1, "rgba(236, 72, 153, 1)");

            ctx.fillStyle = grad;
            ctx.fillRect(x, h - barHeight, barWidth - 2, barHeight);

            // Glowing crest dots
            ctx.fillStyle = "#fff";
            ctx.shadowColor = "rgba(236, 72, 153, 1)";
            ctx.shadowBlur = 8;
            ctx.fillRect(x, h - barHeight - 1.5, barWidth - 2, 2);
            ctx.shadowBlur = 0; // reset

            x += barWidth;
          }
        }
      };

      draw();
      return () => {
        window.removeEventListener("resize", resizeCanvas);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };
    };

    const cleanupVisualizer = initVisualizer();
    return () => {
      if (cleanupVisualizer) cleanupVisualizer();
    };
  }, [song?.id, isPlaying, visualizerStyle]);

  if (!song) {
    return (
      <div 
        id="soundstream-no-player"
        className="fixed bottom-0 left-0 right-0 h-20 bg-black/90 backdrop-blur-md border-t border-white/5 flex items-center justify-center text-zinc-500 text-xs font-sans px-4 z-40"
      >
        <span className="animate-pulse tracking-widest uppercase font-bold">SELECT AN INDEPENDENT TRACK TO ACTIVATE THE 3D MUSIC SYSTEM 🎧</span>
      </div>
    );
  }

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const pct = clickX / width;
    const newSeekTime = pct * (playbackTime.total || 0);
    onSeek(newSeekTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (newVol > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  // Automated smart playlist creator mock
  const generateSmartPlaylist = () => {
    alert("AI Sync Active: Deep analysis of rhythm, instruments, and vocal matches complete! Smart Playlist added to queue.");
  };

  return (
    <>
      {/* Video Element for Playback */}
      <div 
        style={{ pointerEvents: (!song.videoUrl || playbackMode === "audio") ? "none" : "auto", visibility: "hidden", position: "fixed", width: 1, height: 1 }}
        className="bottom-0 left-0"
      >
        <video
          ref={audioRef}
          preload="auto"
          playsInline
        />
      </div>

      {/* Playback Error Notifications */}
      {playbackError && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-red-950/90 border border-red-500/40 text-red-200 text-xs px-5 py-3 rounded-full flex items-center gap-2.5 shadow-2xl backdrop-blur-md z-50 animate-bounce">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span className="font-bold uppercase tracking-wider">{playbackError}</span>
        </div>
      )}

      {/* Sticky Bottom Player Bar (Hidden if fully expanded or minimized to capsule) */}
      {!showFullPlayer && !isMinimized && (
        <div 
          id="soundstream-player-bar"
          className="fixed bottom-0 left-0 right-0 h-24 bg-[#050508]/85 backdrop-blur-2xl border-t border-white/10 flex items-center justify-between px-4 md:px-8 z-40 text-white select-none shadow-2xl"
        >
          {/* Cover & metadata */}
          <div className="flex items-center gap-3.5 w-1/4 min-w-[180px]">
            <div className="relative group cursor-pointer" onClick={() => setShowFullPlayer(true)}>
              {/* Rotating Disk behind cover */}
              <motion.div 
                animate={{ rotate: isPlaying ? 360 : 0 }}
                transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                className="absolute inset-0 rounded-full bg-zinc-900 border border-black flex items-center justify-center -z-10 translate-x-3.5"
              >
                <Disc className="w-8 h-8 text-zinc-700" />
              </motion.div>
              
              <img 
                src={song.coverUrl} 
                alt={song.title} 
                className="w-14 h-14 rounded-xl object-cover shadow-lg border border-white/10 relative z-10"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="overflow-hidden">
              <h4 className="font-sans font-black text-sm truncate text-zinc-100 hover:text-pink-400 cursor-pointer uppercase tracking-tight" onClick={() => setShowFullPlayer(true)}>
                {song.title}
              </h4>
              <p className="font-mono text-xs text-zinc-450 hover:underline cursor-pointer truncate">
                {song.artistName}
              </p>
            </div>
            
            <div className="flex items-center gap-1">
              <button 
                onClick={() => onLikeToggle(song.id)}
                className="text-zinc-450 hover:text-pink-500 transition-colors p-1 bg-transparent border-none cursor-pointer"
              >
                <Heart className={`w-4 h-4 ${liked ? 'fill-pink-500 text-pink-500' : ''}`} />
              </button>
            </div>
          </div>

          {/* Timeline & Basic playback controls */}
          <div className="flex flex-col items-center flex-1 max-w-xl px-4">
            <div className="flex items-center gap-5 mb-2">
              <button 
                onClick={onShuffleToggle}
                className={`p-1 bg-transparent border-none cursor-pointer ${isShuffle ? 'text-pink-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                title="Shuffle"
              >
                <Shuffle className="w-4 h-4" />
              </button>

              <button 
                onClick={onPrev}
                className="text-zinc-400 hover:text-white transition-colors p-1 bg-transparent border-none cursor-pointer"
              >
                <SkipBack className="w-4.5 h-4.5" />
              </button>

              <button 
                onClick={onPlayPauseToggle}
                className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white hover:opacity-90 transition-all shadow-lg border-none cursor-pointer"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-white text-white" /> : <Play className="w-4 h-4 fill-white text-white ml-0.5" />}
              </button>

              <button 
                onClick={onNext}
                className="text-zinc-400 hover:text-white transition-colors p-1 bg-transparent border-none cursor-pointer"
              >
                <SkipForward className="w-4.5 h-4.5" />
              </button>

              <button 
                onClick={onRepeatToggle}
                className={`p-1 bg-transparent border-none cursor-pointer ${isRepeat ? 'text-pink-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                title="Repeat"
              >
                <Repeat className="w-4 h-4" />
              </button>
            </div>

            <div className="w-full flex items-center gap-2.5">
              <span className="font-mono text-[9px] text-zinc-450 w-8 text-right">{formatTime(playbackTime.current)}</span>
              <div 
                onClick={handleProgressBarClick}
                className="h-1 flex-1 bg-white/10 rounded-full cursor-pointer relative group"
              >
                <div 
                  className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full relative"
                  style={{ width: `${(playbackTime.current / (playbackTime.total || 1)) * 100}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <span className="font-mono text-[9px] text-zinc-450 w-8">{formatTime(playbackTime.total)}</span>
            </div>
          </div>

          {/* Right features controls */}
          <div className="flex items-center justify-end gap-3 w-1/4 min-w-[150px]">
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="text-zinc-400 hover:text-white transition-colors p-1 bg-transparent border-none cursor-pointer"
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-pink-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input 
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 hover:accent-pink-500 cursor-pointer accent-pink-600 bg-white/10 h-1 rounded-lg outline-none hidden md:block"
            />

            {/* Quality switch */}
            <button
              onClick={() => {
                if (!isPremium) {
                  setQualityWarning(true);
                  setTimeout(() => setQualityWarning(false), 3000);
                  return;
                }
                setAudioQuality(p => p === "standard" ? "high" : p === "high" ? "lossless" : "standard");
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-full border border-white/10 text-[8.5px] font-mono text-zinc-300 hover:border-pink-500 cursor-pointer bg-transparent"
            >
              <Sparkles className="w-3 h-3 text-pink-400" />
              <span>{audioQuality === "lossless" ? "FLAC" : audioQuality === "high" ? "320K" : "128K"}</span>
            </button>

            {/* Minimize button to turn into compact deck */}
            <button 
              onClick={() => setIsMinimized(true)}
              className="text-zinc-450 hover:text-white transition-colors p-1 bg-transparent border-none cursor-pointer"
              title="Minimize to Cyber Deck"
            >
              <Minimize2 className="w-4 h-4" />
            </button>

            {/* Maximize to full screen */}
            <button 
              onClick={() => setShowFullPlayer(true)}
              className="text-zinc-450 hover:text-white transition-colors p-1 bg-transparent border-none cursor-pointer"
              title="Full Screen Dashboard"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* MINIMIZED COMPACT CYBER DECK FLOATING WIDGET (Always-on Compact Glass Capsule) */}
      <AnimatePresence>
        {isMinimized && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            drag
            dragConstraints={{ left: -600, right: 20, top: -600, bottom: 20 }}
            className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-2rem)] bg-[#050508]/85 border border-white/15 backdrop-blur-2xl rounded-3xl p-4 md:p-5 shadow-2xl z-50 text-white select-none cursor-move flex flex-col gap-3.5"
          >
            {/* Header section of Compact Deck */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-500 animate-pulse" />
                <span className="font-mono text-[9px] uppercase tracking-widest font-black text-pink-400">Cyber Deck Console</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => setIsMinimized(false)}
                  className="p-1 rounded-full bg-white/5 hover:bg-white/10 border-none text-zinc-400 hover:text-white cursor-pointer"
                  title="Expand"
                >
                  <Maximize className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setIsMinimized(false)}
                  className="p-1 rounded-full bg-white/5 hover:bg-white/10 border-none text-zinc-400 hover:text-white cursor-pointer text-xs"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Middle: Disk spin & details info */}
            <div className="flex items-center gap-3.5">
              {/* Spinning Mini Vinyl */}
              <div className="relative shrink-0">
                <motion.div
                  animate={{ rotate: isPlaying ? 360 : 0 }}
                  transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                  className="w-16 h-16 rounded-full bg-[#111] border-2 border-zinc-800 flex items-center justify-center shadow-xl relative"
                  style={{ backgroundImage: `radial-gradient(circle, #222 20%, #000 65%)` }}
                >
                  {/* CD vinyl grooves */}
                  <div className="absolute inset-2 rounded-full border border-zinc-900 opacity-60" />
                  <div className="absolute inset-4 rounded-full border border-zinc-900 opacity-40" />
                  
                  {/* Central Album Artwork */}
                  <img 
                    src={song.coverUrl} 
                    alt={song.title} 
                    className="w-7 h-7 rounded-full object-cover relative z-10 border border-zinc-950"
                  />
                  <div className="absolute w-1.5 h-1.5 bg-zinc-950 rounded-full z-20" />
                </motion.div>
                
                {/* Physical Tone-arm stylus indicator */}
                <motion.div 
                  animate={{ rotate: isPlaying ? 28 : 5 }}
                  transition={{ type: "spring", stiffness: 100 }}
                  style={{ originX: 0.9, originY: 0.1 }}
                  className="absolute top-0 right-1 w-8 h-12 pointer-events-none z-20"
                >
                  <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-silver rounded-full border border-zinc-700" />
                  <div className="absolute top-1 right-1 w-0.5 h-10 bg-zinc-400 origin-top rotate-[2deg] shadow" />
                  <div className="absolute bottom-1 left-1.5 w-1.5 h-3 bg-zinc-600 rotate-[45deg]" />
                </motion.div>
              </div>

              {/* Title & artist */}
              <div className="overflow-hidden flex-1">
                <h5 className="font-sans font-black text-sm uppercase tracking-tight text-white truncate hover:text-pink-400 cursor-pointer" onClick={() => setShowFullPlayer(true)}>
                  {song.title}
                </h5>
                <p className="font-mono text-xs text-zinc-450 truncate">{song.artistName}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-[8px] font-mono uppercase bg-pink-500/10 text-pink-300 px-1.5 py-0.5 rounded border border-pink-500/20">{song.genre || "Social Audio"}</span>
                  <span className="text-[8px] font-mono text-zinc-500">{audioQuality.toUpperCase()} • HD Stream</span>
                </div>
              </div>
            </div>

            {/* Bouncing dynamic compact mini canvas visualizer */}
            <div className="w-full h-12 bg-black/40 border border-white/5 rounded-2xl overflow-hidden relative">
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
              {/* Visualizer tab switcher */}
              <div className="absolute bottom-1 right-1.5 flex gap-1 bg-black/80 rounded-lg p-0.5 z-10">
                {(["halo", "wave", "equalizer"] as VisualizerStyle[]).map(style => (
                  <button
                    key={style}
                    onClick={(e) => {
                      e.stopPropagation();
                      setVisualizerStyle(style);
                    }}
                    className={`px-1.5 py-0.5 rounded text-[7.5px] font-mono uppercase cursor-pointer ${
                      visualizerStyle === style ? "bg-pink-600 text-white font-bold" : "text-zinc-500 hover:text-zinc-200"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Seek progress timeline */}
            <div className="space-y-1">
              <div 
                onClick={handleProgressBarClick}
                className="h-1.5 w-full bg-white/10 rounded-full cursor-pointer relative group"
              >
                <div 
                  className="h-full bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-500 rounded-full relative"
                  style={{ width: `${(playbackTime.current / (playbackTime.total || 1)) * 100}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow" />
                </div>
              </div>
              <div className="flex justify-between font-mono text-[8.5px] text-zinc-450">
                <span>{formatTime(playbackTime.current)}</span>
                <span>{formatTime(playbackTime.total)}</span>
              </div>
            </div>

            {/* Compact playback control cluster */}
            <div className="flex items-center justify-between border-t border-white/10 pt-3.5">
              <div className="flex gap-2">
                <button onClick={() => onLikeToggle(song.id)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer border-none text-zinc-450 hover:text-pink-400">
                  <Heart className={`w-4 h-4 ${liked ? 'fill-pink-500 text-pink-500' : ''}`} />
                </button>
                <button onClick={generateSmartPlaylist} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer border-none text-zinc-400 hover:text-pink-400" title="Smart AI Sync">
                  <Sparkles className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-4">
                <button onClick={onPrev} className="p-1.5 text-zinc-400 hover:text-white cursor-pointer bg-transparent border-none">
                  <SkipBack className="w-4.5 h-4.5" />
                </button>
                <button 
                  onClick={onPlayPauseToggle} 
                  className="w-11 h-11 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center text-white hover:scale-105 transition-all shadow-md border-none cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-4.5 h-4.5 fill-white" /> : <Play className="w-4.5 h-4.5 fill-white ml-0.5" />}
                </button>
                <button onClick={onNext} className="p-1.5 text-zinc-400 hover:text-white cursor-pointer bg-transparent border-none">
                  <SkipForward className="w-4.5 h-4.5" />
                </button>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setIsMuted(!isMuted)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer border-none text-zinc-400">
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-pink-500" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <button onClick={() => { setIsMinimized(false); setShowFullPlayer(true); }} className="p-2 rounded-xl bg-pink-600 hover:bg-pink-500 cursor-pointer border-none text-white font-bold text-[9px] uppercase tracking-wide px-3">
                  Open
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NEXT-GENERATION FULL PAGE IMMERSIVE 3D PLAYER OVERLAY */}
      {showFullPlayer && (
        <motion.div 
          id="soundstream-full-player-overlay"
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ type: "spring", damping: 26, stiffness: 110 }}
          className="fixed inset-0 bg-gradient-to-b from-[#030305] via-[#08080d] to-black z-50 p-5 md:p-10 flex flex-col justify-between text-white overflow-y-auto"
        >
          {/* Dynamic dynamic background sphere reacting to the music */}
          <div 
            className={`absolute -top-1/4 left-1/4 w-[600px] h-[600px] bg-gradient-to-tr ${getGlowColor(song.genre)} rounded-full filter blur-[120px] pointer-events-none -z-10 transition-all duration-1000`}
            style={{ 
              opacity: isPlaying ? 0.75 : 0.25,
              transform: isPlaying ? `scale(${1 + Math.sin(playbackTime.current * 0.5) * 0.1})` : "scale(1)"
            }}
          />

          {/* Premium Header */}
          <div className="flex items-center justify-between w-full max-w-5xl mx-auto border-b border-white/5 pb-4 mb-4 select-none">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-pink-400 font-bold">SoundStream 3D Core</span>
            </div>
            
            {/* Quick minimizes */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => { setShowFullPlayer(false); setIsMinimized(true); }}
                className="text-zinc-400 hover:text-white transition-all bg-white/5 hover:bg-white/10 px-3.5 py-1.5 rounded-full border border-white/10 text-[9.5px] font-mono uppercase tracking-wider"
              >
                Minimize Deck
              </button>
              <button 
                onClick={() => setShowFullPlayer(false)}
                className="text-zinc-400 hover:text-white transition-all bg-white/5 hover:bg-white/10 w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border border-white/10"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Main Visualizer & 3D Album Center Deck */}
          <div className="flex flex-col lg:flex-row items-center justify-center gap-10 max-w-5xl mx-auto w-full flex-1 py-4">
            
            {/* Left Column: Glassmorphic 3D Turntable / Vinyl Disk Deck */}
            <div className="flex flex-col items-center gap-6 text-center lg:text-left">
              <div 
                className="relative bg-white/[0.02] border border-white/15 backdrop-blur-xl p-8 rounded-[40px] shadow-3xl flex items-center justify-center cursor-pointer group"
                style={{
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.75), inset 0 1px 0 0 rgba(255, 255, 255, 0.15)"
                }}
              >
                {/* Turntable Metallic plate circles */}
                <div className="absolute inset-4 rounded-[32px] border border-white/5 pointer-events-none" />
                <div className="absolute top-4 left-4 w-6 h-6 border-t border-l border-white/20 rounded-tl-xl" />
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b border-r border-white/20 rounded-br-xl" />

                {/* Main Spinning 3D Vinyl Disc */}
                <div className="relative p-1">
                  <motion.div
                    animate={{ rotate: isPlaying ? 360 : 0 }}
                    transition={{ repeat: Infinity, duration: 4.5, ease: "linear" }}
                    className="w-64 h-64 md:w-80 md:h-80 rounded-full bg-[#0d0d0e] border-4 border-zinc-800 flex items-center justify-center shadow-2xl relative"
                    style={{ 
                      backgroundImage: `radial-gradient(circle, #2d2d30 20%, #060606 70%)`
                    }}
                  >
                    {/* Vinyl grooves */}
                    <div className="absolute inset-3 rounded-full border border-zinc-900 opacity-70" />
                    <div className="absolute inset-8 rounded-full border border-zinc-900 opacity-60" />
                    <div className="absolute inset-16 rounded-full border border-zinc-900 opacity-50" />
                    <div className="absolute inset-24 rounded-full border border-zinc-900 opacity-40" />
                    
                    {/* CD Gloss Reflection Light */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-transparent rotate-[45deg] pointer-events-none mix-blend-overlay" />
                    
                    {/* Centered Album Artwork */}
                    <img 
                      src={song.coverUrl} 
                      alt={song.title} 
                      className="w-28 h-28 md:w-36 md:h-36 rounded-full object-cover relative z-10 border border-zinc-900"
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Center spindle hole */}
                    <div className="absolute w-4 h-4 bg-[#0a0a0c] border border-zinc-700 rounded-full z-20" />
                  </motion.div>

                  {/* Physical Stylus needle tone-arm */}
                  <motion.div 
                    animate={{ rotate: isPlaying ? 32 : 6 }}
                    transition={{ type: "spring", stiffness: 60, damping: 15 }}
                    style={{ originX: 0.9, originY: 0.08 }}
                    className="absolute top-2 right-4 w-20 h-40 pointer-events-none z-30"
                  >
                    {/* Base pivot pin */}
                    <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-b from-zinc-400 to-zinc-700 rounded-full border border-zinc-800 shadow-xl" />
                    <div className="absolute top-1 right-2.5 w-3 h-3 bg-zinc-900 rounded-full border border-zinc-600" />
                    
                    {/* Long arm shaft */}
                    <div className="absolute top-4 right-3.5 w-1 h-32 bg-zinc-400 shadow" />
                    
                    {/* Angled headshell needle */}
                    <div className="absolute bottom-2 left-6 w-3 h-8 bg-zinc-800 rotate-[35deg] rounded-sm border border-zinc-700 flex flex-col justify-between p-0.5 shadow-md">
                      <div className="w-1.5 h-1.5 bg-red-600 rounded-full" /> {/* red LED indicator */}
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Title & Metadata */}
              <div className="space-y-2">
                <h2 className="text-2xl md:text-3xl font-sans font-black tracking-tight text-white uppercase leading-none">
                  {song.title}
                </h2>
                <p className="text-pink-400 font-mono text-base font-semibold hover:underline">
                  {song.artistName}
                </p>
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 mt-2">
                  <span className="bg-white/5 border border-white/10 text-zinc-300 text-[10px] px-3 py-1 rounded-full font-mono uppercase tracking-wide">
                    Genre: {song.genre || "Independent"}
                  </span>
                  <span className="bg-pink-500/10 border border-pink-500/20 text-pink-300 text-[10px] px-3 py-1 rounded-full font-mono uppercase tracking-wide">
                    Stream: {song.playCount.toLocaleString()} plays
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Holographic Wave canvas + Advanced features tab drawer */}
            <div className="flex-1 w-full flex flex-col gap-5">
              
              {/* Dynamic Wave Visualizer Canvas Block */}
              <div className="relative h-44 bg-black/50 border border-white/10 rounded-3xl overflow-hidden shadow-inner flex flex-col justify-end p-4">
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
                
                {/* Visualizer Theme controls floating overlay */}
                <div className="absolute top-3 left-4 flex items-center gap-1.5 bg-black/80 rounded-xl p-1 z-10 border border-white/5">
                  <Sliders className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-[8.5px] font-mono text-zinc-400 mr-2 uppercase">Visualizer theme:</span>
                  {(["halo", "wave", "equalizer"] as VisualizerStyle[]).map(style => (
                    <button
                      key={style}
                      onClick={() => setVisualizerStyle(style)}
                      className={`px-2 py-1 rounded-lg text-[8.5px] font-mono uppercase transition-all border-none cursor-pointer ${
                        visualizerStyle === style ? "bg-pink-600 text-white font-black" : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced multi-tab dashboard prompter (Lyrics / AI recommendation sync / Queue details) */}
              <div className="bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden flex flex-col h-64">
                <div className="flex bg-black/40 border-b border-white/5 p-1">
                  {[
                    { id: "lyrics", label: "Sing-Along Lyrics", icon: <ScrollText className="w-3.5 h-3.5" /> },
                    { id: "ai", label: "AI Recommendations", icon: <Sparkles className="w-3.5 h-3.5" /> },
                    { id: "queue", label: "System Queue", icon: <ListMusic className="w-3.5 h-3.5" /> }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveExtraTab(tab.id as any)}
                      className={`flex-1 py-2.5 rounded-xl text-[10px] font-mono uppercase font-bold tracking-wider transition-all cursor-pointer border-none flex items-center justify-center gap-1.5 ${
                        activeExtraTab === tab.id
                          ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow"
                          : "text-zinc-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab content panel */}
                <div className="flex-1 overflow-y-auto p-5 text-sm scrollbar-thin scrollbar-thumb-white/10">
                  <AnimatePresence mode="wait">
                    {activeExtraTab === "lyrics" && (
                      <motion.div
                        key="lyrics"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-2 whitespace-pre-line text-zinc-200 leading-relaxed font-sans text-xs"
                      >
                        {song.lyrics ? (
                          <div className="font-bold text-center text-sm md:text-base text-zinc-100 py-3 leading-loose select-text selection:bg-pink-500/30 selection:text-white">
                            {song.lyrics}
                          </div>
                        ) : (
                          <div className="py-12 text-center text-zinc-550 space-y-1">
                            <p className="font-bold">No lyrics uploaded for this release</p>
                            <p className="text-[10px]">Independent releases can be synched via YT-Sync or manually synched in Creator Studio.</p>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {activeExtraTab === "ai" && (
                      <motion.div
                        key="ai"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-3"
                      >
                        {/* Audio fingerprint match analytics */}
                        <div className="p-3 bg-pink-500/5 border border-pink-500/20 rounded-2xl flex flex-col gap-2">
                          <div className="flex items-center justify-between text-[10px] font-mono font-bold text-pink-300 uppercase">
                            <span>Sonic Fingerprint matched</span>
                            <span className="bg-pink-600/30 px-2 py-0.5 rounded">99.8% Accuracy</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[9px] font-mono text-zinc-400">
                            <div>Tempo (BPM): <span className="text-white font-bold">116 (Med-High)</span></div>
                            <div>Mood Vibe: <span className="text-white font-bold">Cyber Synth-Chill</span></div>
                            <div>Melody Flow: <span className="text-white font-bold">Deep Harmonic Wave</span></div>
                            <div>Instruments: <span className="text-white font-bold">808 Drums, Synth Pad</span></div>
                          </div>
                        </div>

                        {/* AI matched songs feed */}
                        <div className="space-y-2">
                          {[
                            { title: `${song.title} (Cyber Lounge Mix)`, views: "45K Plays", match: "98% Match", duration: "4:12" },
                            { title: "Quantum Rhythm Live Stream", views: "12K Plays", match: "91% Match", duration: "3:50" }
                          ].map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all cursor-pointer">
                              <div>
                                <h6 className="font-sans font-bold text-xs text-zinc-200">{item.title}</h6>
                                <span className="text-[9px] font-mono text-zinc-500">{item.views}</span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-[9px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/25 px-1.5 py-0.5 rounded">{item.match}</span>
                                <p className="text-[9px] font-mono text-zinc-500 mt-1">{item.duration}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {activeExtraTab === "queue" && (
                      <motion.div
                        key="queue"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-2.5"
                      >
                        <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 border-b border-white/5 pb-2">
                          <span>SYSTEM QUEUE</span>
                          <span>1 SONG TOTAL IN CORE QUEUE</span>
                        </div>
                        <div className="flex items-center gap-3 p-2 bg-pink-500/10 border border-pink-500/20 rounded-xl">
                          <span className="font-mono text-xs text-pink-400 animate-pulse">PLAYING</span>
                          <img src={song.coverUrl} className="w-8 h-8 rounded-lg object-cover" />
                          <div className="overflow-hidden flex-1">
                            <h6 className="font-sans font-bold text-xs text-zinc-200 truncate">{song.title}</h6>
                            <p className="font-mono text-[9px] text-zinc-500 truncate">{song.artistName}</p>
                          </div>
                          <span className="font-mono text-[10px] text-zinc-400 shrink-0">NOW</span>
                        </div>
                        <p className="text-[10px] font-mono text-zinc-500 text-center py-4">Add more songs from the dashboard or click 'Generate AI Queue' under the AI tab to populate.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>

          {/* Core Controls Dashboard */}
          <div className="w-full max-w-4xl mx-auto flex flex-col gap-5 mb-6">
            
            {/* Timeline slider */}
            <div className="flex flex-col gap-1.5">
              <div className="w-full flex items-center justify-between text-xs font-mono text-zinc-400">
                <span>{formatTime(playbackTime.current)}</span>
                <span>{formatTime(playbackTime.total)}</span>
              </div>
              <div 
                onClick={handleProgressBarClick}
                className="h-2 w-full bg-white/10 rounded-full cursor-pointer relative group"
              >
                <div 
                  className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-full relative"
                  style={{ width: `${(playbackTime.current / (playbackTime.total || 1)) * 100}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow" />
                </div>
              </div>
            </div>

            {/* Playback actions bar */}
            <div className="flex items-center justify-between px-4 md:px-8 select-none">
              
              {/* Left actions: Shuffle & Like */}
              <div className="flex gap-4">
                <button 
                  onClick={onShuffleToggle}
                  className={`p-3 rounded-full hover:bg-white/5 cursor-pointer border-none transition-colors ${isShuffle ? 'text-pink-400 bg-pink-500/10' : 'text-zinc-500'}`}
                  title="Shuffle Mode"
                >
                  <Shuffle className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => onLikeToggle(song.id)}
                  className={`p-3 rounded-full hover:bg-white/5 cursor-pointer border-none transition-colors ${liked ? 'text-pink-500 bg-pink-500/10' : 'text-zinc-500'}`}
                  title="Like Track"
                >
                  <Heart className={`w-5 h-5 ${liked ? 'fill-pink-500' : ''}`} />
                </button>
              </div>

              {/* Center controls: Skip, Play */}
              <div className="flex items-center gap-6">
                <button 
                  onClick={onPrev}
                  className="p-3 text-zinc-300 hover:text-white transition-all active:scale-90 cursor-pointer bg-transparent border-none"
                  title="Previous Track"
                >
                  <SkipBack className="w-7 h-7" />
                </button>

                <button 
                  onClick={onPlayPauseToggle}
                  className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white hover:opacity-90 hover:scale-105 transition-all shadow-2xl shadow-pink-500/25 border-none cursor-pointer"
                  title={isPlaying ? "Pause Track" : "Play Track"}
                >
                  {isPlaying ? <Pause className="w-6.5 h-6.5 fill-white text-white" /> : <Play className="w-6.5 h-6.5 fill-white text-white ml-1" />}
                </button>

                <button 
                  onClick={onNext}
                  className="p-3 text-zinc-300 hover:text-white transition-all active:scale-90 cursor-pointer bg-transparent border-none"
                  title="Next Track"
                >
                  <SkipForward className="w-7 h-7" />
                </button>
              </div>

              {/* Right actions: Repeat & Volume */}
              <div className="flex items-center gap-4">
                <button 
                  onClick={onRepeatToggle}
                  className={`p-3 rounded-full hover:bg-white/5 cursor-pointer border-none transition-colors ${isRepeat ? 'text-pink-400 bg-pink-500/10' : 'text-zinc-500'}`}
                  title="Repeat Mode"
                >
                  <Repeat className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 group/vol hover:bg-white/5 p-2 rounded-xl transition-all">
                  <button onClick={() => setIsMuted(!isMuted)} className="text-zinc-400 hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer">
                    {isMuted || volume === 0 ? <VolumeX className="w-5 h-5 text-pink-400" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <input 
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-20 hover:accent-pink-500 cursor-pointer accent-pink-600 bg-white/10 h-1 rounded-lg outline-none"
                  />
                </div>
              </div>

            </div>
          </div>
        </motion.div>
      )}

      {/* Embedded Cinema Watch Overlays */}
      <AnimatePresence>
        {showTheaterMode && song && !!song.videoUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#020204]/95 backdrop-blur-md flex items-center justify-center p-4 md:p-8 z-[100]"
          >
            <div className="w-full max-w-4xl space-y-4">
              <VideoPlayer 
                videoUrl={song.videoUrl || song.audioUrl}
                title={song.title}
                artistName={song.artistName}
                coverUrl={song.coverUrl}
                onClose={() => setShowTheaterMode(false)}
              />
              <p className="text-center font-mono text-[10px] tracking-widest text-zinc-550 uppercase">
                Now experiencing high-definition independent cinema on SoundStream ⚡ Press Esc or click close to return
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
