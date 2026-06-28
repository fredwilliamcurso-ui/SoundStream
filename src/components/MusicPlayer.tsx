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
  Share2,
  ScrollText,
  Sparkles,
  Tv,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Song } from "../types";
import VideoPlayer from "./VideoPlayer";

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
  const [showLyrics, setShowLyrics] = useState(false);
  const [showTheaterMode, setShowTheaterMode] = useState(false);
  const [audioQuality, setAudioQuality] = useState<"standard" | "high" | "lossless">("standard");
  const [qualityWarning, setQualityWarning] = useState(false);

  // Sync mute state and volume with audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted, song, audioRef]);

  if (!song) {
    return (
      <div 
        id="soundstream-no-player"
        className="fixed bottom-0 left-0 right-0 h-20 bg-black/90 backdrop-blur-md border-t border-white/5 flex items-center justify-center text-zinc-550 text-sm font-sans px-4 z-40"
      >
        <span className="animate-pulse tracking-wide font-medium">Select a song to start streaming the sound of independence 🎧</span>
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

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <>
      {/* Persistent HTML5 Video Player inside the DOM tree */}
      {song && (
        <div 
          style={{ pointerEvents: (!song.videoUrl || playbackMode === "audio") ? "none" : "auto" }}
          className={`transition-all duration-300 ease-in-out fixed shadow-2xl bg-black rounded-xl overflow-hidden cursor-pointer ${
            (!song.videoUrl || playbackMode === "audio")
              ? "w-0 h-0 opacity-0 pointer-events-none hidden" 
              : showFullPlayer
                ? showLyrics
                  ? "top-32 md:top-36 left-1/2 -translate-x-[365px] w-48 md:w-64 aspect-video border border-white/20 z-55"
                  : "top-28 md:top-24 left-1/2 -translate-x-1/2 w-[90vw] max-w-3xl aspect-video border border-white/25 z-55"
                : "bottom-5 left-4 md:left-8 w-14 h-14 rounded-lg border border-white/10 z-55"
          }`}
          onClick={song.videoUrl ? onPlayPauseToggle : undefined}
          title={isPlaying ? "Pause Media" : "Play Media"}
        >
          <video
            ref={audioRef}
            preload="auto"
            playsInline
            className="w-full h-full object-cover rounded-lg"
          />
        </div>
      )}

      {/* Playback error readable notification banner */}
      {playbackError && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-red-950/90 border border-red-500/40 text-red-200 text-xs px-5 py-3 rounded-full flex items-center gap-2.5 shadow-2xl backdrop-blur-md z-50 max-w-lg text-center font-sans animate-bounce">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span className="font-medium">{playbackError}</span>
        </div>
      )}

      {/* Bottom Sticky Player Bar */}
      <div 
        id="soundstream-player-bar"
        className="fixed bottom-0 left-0 right-0 h-24 bg-black/90 backdrop-blur-xl border-t border-white/10 flex items-center justify-between px-4 md:px-8 z-40 text-white select-none shadow-2xl"
      >
        {/* Album Art & Title Column */}
        <div className="flex items-center gap-3 w-1/4 min-w-[180px]">
          {!!song.videoUrl && playbackMode !== "audio" ? (
            <div className="w-14 h-14 rounded-lg bg-zinc-950/80 border border-white/10 shrink-0 flex items-center justify-center font-mono text-[9px] text-zinc-550 tracking-wider">
              {/* Spacer holding the space under the floating persistent video element */}
              <span>CINEMA</span>
            </div>
          ) : (
            <motion.img 
              id="player-album-art"
              src={song.coverUrl} 
              alt={song.title} 
              className={`w-14 h-14 rounded-lg object-cover shadow-lg border border-white/10 ${isPlaying ? 'animate-spin-slow' : ''}`}
              referrerPolicy="no-referrer"
              animate={{ scale: isPlaying ? 1.05 : 1 }}
              transition={{ duration: 0.3 }}
            />
          )}
          <div className="overflow-hidden">
            <h4 id="player-song-title" className="font-sans font-semibold text-sm truncate text-zinc-100 hover:text-indigo-400 cursor-pointer uppercase tracking-tight">
              {song.title}
            </h4>
            <p id="player-artist-name" className="font-mono text-xs text-zinc-450 hover:underline cursor-pointer truncate">
              {song.artistName}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <button 
              id="player-like-btn"
              onClick={() => onLikeToggle(song.id)}
              className="text-zinc-450 hover:text-pink-500 transition-colors p-1"
              title="Like song"
            >
              <Heart 
                className={`w-4.5 h-4.5 transition-transform duration-300 ${liked ? 'fill-pink-500 text-pink-500 scale-110' : ''}`} 
              />
            </button>
            <button 
              id="player-share-btn"
              onClick={() => onShareSong(song)}
              className="text-zinc-450 hover:text-indigo-400 transition-colors p-1"
              title="Share song"
            >
              <Share2 className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Center Control Panel */}
        <div className="flex flex-col items-center flex-1 max-w-xl px-4">
          <div className="flex items-center gap-5 mb-2">
            <button 
              id="player-shuffle-btn"
              onClick={onShuffleToggle}
              className={`transition-colors p-1.5 ${isShuffle ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button 
              id="player-prev-btn"
              onClick={onPrev}
              className="text-zinc-450 hover:text-white transition-colors p-1.5"
              title="Previous"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <motion.button 
              id="player-play-pause-btn"
              onClick={onPlayPauseToggle}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-white text-white" />
              ) : (
                <Play className="w-4 h-4 fill-white text-white ml-0.5" />
              )}
            </motion.button>

            <button 
              id="player-next-btn"
              onClick={onNext}
              className="text-zinc-450 hover:text-white transition-colors p-1.5"
              title="Next"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            <button 
              id="player-repeat-btn"
              onClick={onRepeatToggle}
              className={`transition-colors p-1.5 ${isRepeat ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Repeat"
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>

          {/* Timeline / Progress Bar */}
          <div className="w-full flex items-center gap-2.5">
            <span id="player-current-time" className="font-mono text-[10px] text-zinc-450 w-10 text-right">
              {formatTime(playbackTime.current)}
            </span>
            
            <div 
              id="player-progress-container"
              onClick={handleProgressBarClick}
              className="h-1 flex-1 bg-white/10 rounded-full cursor-pointer relative group"
            >
              <div 
                id="player-progress-bar"
                className="h-full bg-gradient-to-r from-indigo-550 to-purple-550 rounded-full relative transition-all duration-100"
                style={{ 
                  width: `${(playbackTime.current / (playbackTime.total || 1)) * 100}%` 
                }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            <span id="player-total-time" className="font-mono text-[10px] text-zinc-450 w-10">
              {formatTime(playbackTime.total)}
            </span>
          </div>
        </div>

        {/* Right Vol & Utility Bar */}
        <div className="flex items-center justify-end gap-3 w-1/4 min-w-[150px]">
          <button 
            id="player-mute-btn"
            onClick={toggleMute}
            className="text-zinc-450 hover:text-white transition-colors p-1.5"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-indigo-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input 
            id="player-volume-slider"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-20 hover:accent-indigo-455 cursor-pointer accent-indigo-600 bg-white/10 h-1 rounded-lg outline-none transition-all hidden md:block"
          />

          {!!song.videoUrl && !!song.audioUrl && (
            <div className="flex bg-white/5 border border-white/10 rounded-full p-0.5" title="Switch audio/video source">
              <button
                onClick={() => onPlaybackModeToggle?.("audio")}
                className={`px-2.5 py-1 rounded-full text-[8.5px] font-mono uppercase font-black tracking-wider transition-all cursor-pointer ${
                  playbackMode === "audio"
                    ? "bg-indigo-500 text-white shadow-md"
                    : "text-zinc-405 hover:text-white"
                }`}
              >
                Audio
              </button>
              <button
                onClick={() => onPlaybackModeToggle?.("video")}
                className={`px-2.5 py-1 rounded-full text-[8.5px] font-mono uppercase font-black tracking-wider transition-all cursor-pointer ${
                  playbackMode === "video"
                    ? "bg-pink-500 text-white shadow-md"
                    : "text-zinc-405 hover:text-white"
                }`}
              >
                Video
              </button>
            </div>
          )}

          {!!song.videoUrl && (
            <button 
              id="player-video-theater-btn"
              onClick={() => {
                setShowTheaterMode(true);
                if (isPlaying) {
                  onPlayPauseToggle(); // Pause background audio/video playback to avoid double audio
                }
              }}
              className="flex items-center gap-1 px-2.5 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 rounded-full font-mono text-[9px] font-black tracking-wider uppercase transition-all cursor-pointer"
              title="Watch Music Video"
            >
              <Tv className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Watch MV</span>
            </button>
          )}

          {/* Audio Quality Control */}
          <div className="relative">
            <button
              onClick={() => {
                if (!isPremium) {
                  setQualityWarning(true);
                  setTimeout(() => setQualityWarning(false), 3000);
                  return;
                }
                // Toggle through standard -> high -> lossless
                setAudioQuality(prev => {
                  if (prev === "standard") return "high";
                  if (prev === "high") return "lossless";
                  return "standard";
                });
              }}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-full font-mono text-[8.5px] font-black tracking-wider uppercase transition-all cursor-pointer border ${
                audioQuality === "lossless"
                  ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                  : audioQuality === "high"
                  ? "bg-teal-500/20 text-teal-300 border-teal-500/30"
                  : "bg-zinc-500/10 text-zinc-400 border-white/5 hover:border-zinc-500"
              }`}
              title="Stream Quality"
            >
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>{audioQuality === "lossless" ? "FLAC" : audioQuality === "high" ? "320K" : "128K"}</span>
              {!isPremium && <span className="text-[7.5px] opacity-70">🔒</span>}
            </button>

            {/* Quality Warning Tooltip */}
            <AnimatePresence>
              {qualityWarning && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full right-0 mb-2 w-48 bg-zinc-950/95 border border-purple-500/30 rounded-lg p-2 text-center text-[9px] text-zinc-200 shadow-xl backdrop-blur z-50 pointer-events-none"
                >
                  <p className="font-bold text-indigo-400 uppercase tracking-wider">🔒 Premium Feature</p>
                  <p className="mt-0.5 text-zinc-400">High-fidelity 320kbps & Lossless audio streams require a premium subscription.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            id="player-lyrics-toggle-btn"
            onClick={() => setShowLyrics(!showLyrics)}
            className={`transition-all p-1.5 rounded-full ${showLyrics ? 'text-indigo-400 bg-indigo-500/10 scale-105' : 'text-zinc-500 hover:text-white'}`}
            title="Toggle Lyrics"
          >
            <ScrollText className="w-4 h-4" />
          </button>

          <button 
            id="player-maximize-btn"
            onClick={() => setShowFullPlayer(true)}
            className="text-zinc-450 hover:text-white transition-colors p-1.5"
            title="Full Page Player"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating Mini Lyrics Companion Panel */}
      <AnimatePresence>
        {showLyrics && !showFullPlayer && (
          <motion.div 
            id="player-floating-lyrics-panel"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-28 right-4 md:right-8 w-80 max-w-[calc(100vw-2rem)] h-96 bg-[#09090e]/95 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl z-40 flex flex-col overflow-hidden text-white"
          >
            {/* Panel Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-indigo-400" />
                <span className="font-sans font-bold text-xs uppercase tracking-tight">Sing-along Lyrics</span>
              </div>
              <button 
                id="close-floating-lyrics"
                onClick={() => setShowLyrics(false)}
                className="text-zinc-500 hover:text-white font-bold text-xs bg-white/5 hover:bg-white/10 w-6 h-6 rounded-full flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-sans text-xs scrollbar-thin scrollbar-thumb-white/10">
              <div className="mb-4">
                <h5 className="font-sans font-semibold text-zinc-100 truncate text-xs uppercase tracking-tight">{song.title}</h5>
                <p className="text-[10px] text-zinc-500 font-mono truncate">{song.artistName}</p>
              </div>

              {song.lyrics ? (
                <div id="floating-lyrics-text" className="space-y-2 whitespace-pre-line text-zinc-300 leading-relaxed font-mono pr-2">
                  {song.lyrics}
                </div>
              ) : (
                <div id="floating-lyrics-empty" className="py-16 text-center space-y-2">
                  <p className="text-zinc-450 font-bold">No lyrics provided</p>
                  <p className="text-[10px] text-zinc-500 leading-relaxed">This independent release doesn't have written lyrics uploaded yet.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern Full Page Player Overlay */}
      {showFullPlayer && (
        <motion.div 
          id="soundstream-full-player-overlay"
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 120 }}
          className="fixed inset-0 bg-gradient-to-b from-[#050508] via-zinc-950 to-black z-50 p-6 md:p-12 flex flex-col justify-between text-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between w-full max-w-4xl mx-auto">
            <span className="font-sans text-xs bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-full uppercase tracking-widest text-indigo-450 font-semibold">
              Now Streaming
            </span>
            <button 
              id="close-full-player"
              onClick={() => setShowFullPlayer(false)}
              className="text-zinc-450 hover:text-white transition-all bg-white/5 hover:bg-white/10 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg"
            >
              ✕
            </button>
          </div>

          {/* Main Visual Section */}
          {showLyrics ? (
            <div className="flex flex-col md:flex-row items-center justify-center gap-10 max-w-4xl mx-auto w-full flex-1 overflow-hidden py-4">
              {/* Left Column: Medium sized artwork and back toggle */}
              <div className="flex flex-col items-center text-center gap-4 shrink-0">
                {!!song.videoUrl && playbackMode !== "audio" ? (
                  <div className="w-48 h-27 md:w-64 md:h-36 rounded-xl bg-zinc-950/80 border border-white/5 relative flex items-center justify-center">
                    <div className="absolute inset-0 bg-indigo-555/5 rounded-xl filter blur-xl pointer-events-none" />
                    <span className="text-[9px] text-zinc-550 font-mono tracking-widest uppercase">Video Monitor</span>
                  </div>
                ) : (
                  <div className="relative group">
                    <div className="absolute inset-0 bg-indigo-500/15 rounded-2xl filter blur-2xl pointer-events-none scale-90" />
                    <img 
                      src={song.coverUrl} 
                      alt={song.title} 
                      className="w-48 h-48 md:w-56 md:h-56 rounded-2xl object-cover shadow-2xl relative border border-white/10"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                <div>
                  <h3 className="text-lg md:text-xl font-sans font-black uppercase tracking-tight text-zinc-150 leading-tight">
                    {song.title}
                  </h3>
                  <p className="text-indigo-400 font-mono text-xs mt-0.5">
                    {song.artistName}
                  </p>
                </div>
                <button 
                  id="full-player-back-to-meta-btn"
                  onClick={() => setShowLyrics(false)}
                  className="bg-white/5 hover:bg-white/10 text-zinc-300 text-[10px] font-mono uppercase tracking-wider px-4 py-1.5 rounded-full border border-white/15 transition-all flex items-center gap-1.5 animate-pulse"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-405" />
                  Show Stream Info
                </button>
              </div>

              {/* Right Column: Full scrollable lyrics */}
              <div 
                id="full-player-large-lyrics-panel"
                className="w-full md:flex-1 h-64 md:h-[360px] bg-white/[0.02] border border-white/5 rounded-2xl p-6 md:p-8 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-white/10"
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <span className="text-xs uppercase font-mono tracking-wider font-bold text-indigo-400 flex items-center gap-1.5">
                    <ScrollText className="w-4 h-4" />
                    Sing-Along Lyrics
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500 uppercase">Interactive Prompter</span>
                </div>
                
                {song.lyrics ? (
                  <div className="whitespace-pre-line text-zinc-100 font-sans text-base leading-loose md:text-lg font-bold pr-2 tracking-tight">
                    {song.lyrics}
                  </div>
                ) : (
                  <div className="py-20 text-center space-y-2">
                    <p className="text-zinc-450 font-bold">No lyrics provided</p>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">This independent creator release does not have written lyrics uploaded yet.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-center justify-center gap-12 max-w-4xl mx-auto w-full flex-1">
              {/* Album Art with ambient glow / Video Backing Frame */}
              {!!song.videoUrl && playbackMode !== "audio" ? (
                <div className="w-[90vw] md:w-160 aspect-video rounded-2xl bg-zinc-950/85 border border-white/5 relative flex flex-col gap-3.5 items-center justify-center shadow-3xl shrink-0">
                  <div className="absolute inset-0 bg-indigo-500/10 rounded-2xl filter blur-3xl pointer-events-none" />
                  <span className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase animate-pulse">PLAYING INDEPENDENT VIDEO RELEASE</span>
                  
                  <button 
                    onClick={() => {
                      setShowTheaterMode(true);
                      if (isPlaying) {
                        onPlayPauseToggle(); // Pause background play to avoid double audio
                      }
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white border border-indigo-500 rounded-full font-mono text-xs font-bold tracking-wider uppercase transition-all cursor-pointer shadow-lg shadow-indigo-500/20 active:scale-95"
                  >
                    <Tv className="w-4 h-4 text-white" />
                    <span>Watch HD Cinema Video</span>
                  </button>
                </div>
              ) : (
                <div className="relative group">
                  <div 
                    className="absolute inset-0 bg-indigo-500/20 rounded-2xl filter blur-3xl group-hover:bg-indigo-500/35 transition-all duration-500 scale-95"
                  />
                  <img 
                    id="full-player-art"
                    src={song.coverUrl} 
                    alt={song.title} 
                    className={`w-72 h-72 md:w-96 md:h-96 rounded-2xl object-cover shadow-2xl relative border border-white/10 ${isPlaying ? 'animate-spin-slow' : ''}`}
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              {/* Song Metadata & Lyrics/Bio Accent */}
              <div className="flex flex-col items-center md:items-start text-center md:text-left gap-4 max-w-md">
                <div>
                  <h2 id="full-player-song-title" className="text-3.5xl md:text-4xl font-sans font-extrabold tracking-tight mb-2 text-zinc-50 uppercase leading-none">
                    {song.title}
                  </h2>
                  <p id="full-player-artist-name" className="text-indigo-400 font-mono text-lg font-medium hover:underline cursor-pointer">
                    {song.artistName}
                  </p>
                  <span className="inline-block mt-3 bg-white/5 border border-white/10 text-zinc-300 text-xs px-3 py-1 rounded-full font-mono uppercase tracking-tight">
                    Genre: {song.genre}
                  </span>
                </div>

                <div className="border-t border-white/5 pt-4 mt-2 w-full">
                  <p className="font-sans text-xs text-zinc-450 italic leading-relaxed">
                    "Unleash the sound of independent creation. No label. Just raw artistic expression."
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-4 text-xs font-mono justify-center md:justify-start">
                    <span className="text-zinc-550">Stream Count:</span>
                    <span className="text-indigo-400 font-semibold bg-indigo-500/5 border border-indigo-550/10 px-2 py-0.5 rounded">{song.playCount.toLocaleString()} plays</span>
                    
                    {song.lyrics && (
                      <button 
                        type="button"
                        onClick={() => setShowLyrics(true)}
                        className="text-[10px] font-bold text-white uppercase bg-white/10 hover:bg-white/15 px-2.5 py-0.5 rounded cursor-pointer transition-colors"
                      >
                        Has Lyrics ♫
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Controls & Progress */}
          <div className="w-full max-w-3xl mx-auto flex flex-col gap-6 mb-8">
            {/* Time Slider */}
            <div className="flex flex-col gap-2">
              <div className="w-full flex items-center justify-between text-xs font-mono text-zinc-400">
                <span>{formatTime(playbackTime.current)}</span>
                <span>{formatTime(playbackTime.total)}</span>
              </div>
              <div 
                id="full-player-progress-container"
                onClick={handleProgressBarClick}
                className="h-2 w-full bg-white/10 rounded-full cursor-pointer relative group"
              >
                <div 
                  id="full-player-progress-bar"
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full relative transition-all duration-100"
                  style={{ 
                    width: `${(playbackTime.current / (playbackTime.total || 1)) * 100}%` 
                  }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4.5 h-4.5 bg-white rounded-full shadow" />
                </div>
              </div>
            </div>

            {/* Icons controls */}
            <div className="flex items-center justify-between px-6">
              <button 
                id="full-player-shuffle-btn"
                onClick={onShuffleToggle}
                className={`p-3 rounded-full hover:bg-white/5 transition-colors ${isShuffle ? 'text-indigo-400' : 'text-zinc-550'}`}
              >
                <Shuffle className="w-6 h-6" />
              </button>

              <div className="flex items-center gap-6">
                <button 
                  id="full-player-prev-btn"
                  onClick={onPrev}
                  className="p-3 text-zinc-300 hover:text-white transition-transform duration-200 active:scale-90"
                >
                  <SkipBack className="w-8 h-8" />
                </button>

                <motion.button 
                  id="full-player-play-pause-btn"
                  onClick={onPlayPauseToggle}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-16 h-16 bg-indigo-650 rounded-full flex items-center justify-center text-white hover:bg-indigo-600 transition-colors shadow-2xl shadow-indigo-600/25"
                >
                  {isPlaying ? (
                    <Pause className="w-7 h-7 fill-white text-white" />
                  ) : (
                    <Play className="w-7 h-7 fill-white text-white ml-1" />
                  )}
                </motion.button>

                <button 
                  id="full-player-next-btn"
                  onClick={onNext}
                  className="p-3 text-zinc-300 hover:text-white transition-transform duration-200 active:scale-90"
                >
                  <SkipForward className="w-8 h-8" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  id="full-player-like-btn"
                  onClick={() => onLikeToggle(song.id)}
                  className={`p-3 rounded-full hover:bg-white/5 transition-colors ${liked ? 'text-pink-500' : 'text-zinc-550'}`}
                >
                  <Heart className={`w-6 h-6 ${liked ? 'fill-pink-500' : ''}`} />
                </button>
                <button 
                  id="full-player-repeat-btn"
                  onClick={onRepeatToggle}
                  className={`p-3 rounded-full hover:bg-white/5 transition-colors ${isRepeat ? 'text-indigo-400' : 'text-zinc-550'}`}
                >
                  <Repeat className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Immersive Cinematic Theater Mode Video Overlay */}
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
                onClose={() => {
                  setShowTheaterMode(false);
                }}
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
