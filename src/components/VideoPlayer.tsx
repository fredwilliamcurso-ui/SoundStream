import React, { useRef, useState, useEffect } from "react";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  X, 
  Loader2,
  Tv,
  Settings,
  Monitor
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { analytics } from "../lib/analytics";
import { auth } from "../lib/firebase";

interface VideoPlayerProps {
  videoUrl: string;
  title: string;
  artistName: string;
  coverUrl?: string;
  onClose?: () => void;
}

type VideoQuality = "Auto (Source)" | "1080p HD" | "720p HD" | "480p SD" | "360p SD";

export default function VideoPlayer({
  videoUrl,
  title,
  artistName,
  coverUrl,
  onClose
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [bufferingText, setBufferingText] = useState("Buffering media stream...");
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<number | null>(null);

  // Quality settings
  const [quality, setQuality] = useState<VideoQuality>("Auto (Source)");
  const [showQualityDropdown, setShowQualityDropdown] = useState(false);
  const [isChangingQuality, setIsChangingQuality] = useState(false);

  // Picture-in-Picture
  const [isPipSupported, setIsPipSupported] = useState(false);

  useEffect(() => {
    if (typeof document !== "undefined" && document.pictureInPictureEnabled) {
      setIsPipSupported(true);
    }
  }, []);

  useEffect(() => {
    // Reset state when video URL changes
    setIsLoading(true);
    setIsPlaying(false);
    setCurrentTime(0);
  }, [videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      setIsPlaying(true);
      analytics.trackEvent("video_play", auth.currentUser?.uid, auth.currentUser?.email, {
        title,
        artistName,
        videoUrl
      });
    };
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => {
      if (!isChangingQuality) {
        setCurrentTime(video.currentTime);
      }
    };
    const handleDurationChange = () => setDuration(video.duration || 0);
    const handleCanPlay = () => {
      if (!isChangingQuality) {
        setIsLoading(false);
      }
    };
    const handleWaiting = () => {
      if (!isChangingQuality) {
        setBufferingText("Optimizing high-fidelity stream...");
        setIsLoading(true);
      }
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("waiting", handleWaiting);

    // Initial load
    video.load();

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("waiting", handleWaiting);
    };
  }, [videoUrl, isChangingQuality]);

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(err => console.log("Video playback block:", err));
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = clickX / width;
    videoRef.current.currentTime = percentage * duration;
    setCurrentTime(percentage * duration);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
    if (val > 0) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    videoRef.current.muted = nextMuted;
    videoRef.current.volume = nextMuted ? 0 : volume;
  };

  const toggleFullScreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error("Failed to enter fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleTogglePip = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.error("Picture-in-Picture error:", err);
    }
  };

  const selectQuality = (selected: VideoQuality) => {
    setQuality(selected);
    setShowQualityDropdown(false);
    
    // Simulate resolution stream reload
    if (!videoRef.current) return;
    
    const wasPlaying = isPlaying;
    const currentPos = videoRef.current.currentTime;
    
    setIsChangingQuality(true);
    setIsLoading(true);
    setBufferingText(`Adjusting to ${selected}...`);
    
    if (wasPlaying) {
      videoRef.current.pause();
    }
    
    // Set mock buffering delay
    setTimeout(() => {
      setIsChangingQuality(false);
      setIsLoading(false);
      if (videoRef.current) {
        videoRef.current.currentTime = currentPos;
        if (wasPlaying) {
          videoRef.current.play().catch(e => console.log(e));
        }
      }
    }, 600);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const qualities: VideoQuality[] = [
    "Auto (Source)",
    "1080p HD",
    "720p HD",
    "480p SD",
    "360p SD"
  ];

  return (
    <div 
      ref={containerRef}
      id="soundstream-video-player-overlay"
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 group cursor-pointer shadow-2xl"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoUrl}
        preload="metadata"
        playsInline
        onClick={handlePlayPause}
        className="w-full h-full object-contain bg-black"
      />

      {/* Loading/Buffering Indicator Overlay */}
      {(isLoading || isChangingQuality) && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-md flex flex-col items-center justify-center gap-3 z-20 pointer-events-none">
          <Loader2 className="w-9 h-9 text-pink-500 animate-spin" />
          <span className="text-[11px] font-mono tracking-widest text-zinc-300 uppercase font-black">
            {bufferingText}
          </span>
          <span className="text-[9px] font-mono text-zinc-500 uppercase">
            Lossless SoundStream CDN Routing
          </span>
        </div>
      )}

      {/* Shadow overlays and Controls Panel */}
      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/50 flex flex-col justify-between p-5 pointer-events-none z-10"
          >
            {/* Header controls */}
            <div className="flex items-center justify-between pointer-events-auto">
              <div className="flex items-center gap-2.5">
                <Tv className="w-4 h-4 text-pink-500 animate-pulse" />
                <div>
                  <h4 className="font-sans font-bold text-xs uppercase tracking-tight text-white">{title}</h4>
                  <p className="font-mono text-[9.5px] text-zinc-400">By {artistName}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-[8.5px] font-mono font-black tracking-wider bg-pink-550/20 text-pink-300 border border-pink-500/30 px-2.5 py-0.5 rounded-full uppercase">
                  ⚡ MP4 HD Stream
                </span>
                {onClose && (
                  <button 
                    onClick={onClose}
                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Play/Pause center overlay (on pause) */}
            <div className="flex-1 flex items-center justify-center">
              {!isPlaying && !isLoading && !isChangingQuality && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handlePlayPause}
                  className="w-14 h-14 rounded-full bg-pink-600/90 text-white flex items-center justify-center shadow-lg border border-pink-500/30 pointer-events-auto hover:bg-pink-500"
                >
                  <Play className="w-6 h-6 fill-white ml-1 text-white" />
                </motion.button>
              )}
            </div>

            {/* Footer custom video controls */}
            <div className="space-y-4.5 pointer-events-auto">
              {/* Scrub Progress Slider */}
              <div className="space-y-1">
                <div 
                  onClick={handleSeek}
                  className="h-1.5 w-full bg-white/20 rounded-full cursor-pointer relative group/scrub"
                >
                  <div 
                    className="h-full bg-gradient-to-r from-pink-500 to-indigo-550 rounded-full relative"
                    style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow scale-0 group-hover/scrub:scale-100 transition-transform duration-150" />
                  </div>
                </div>
                <div className="flex justify-between font-mono text-[9px] text-zinc-400">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Lower Controls Toolbar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={handlePlayPause}
                    className="text-white hover:text-pink-400 transition-colors p-1"
                  >
                    {isPlaying ? <Pause className="w-4.5 h-4.5" /> : <Play className="w-4.5 h-4.5 fill-white" />}
                  </button>

                  {/* Volume Control */}
                  <div className="flex items-center gap-2 group/vol">
                    <button onClick={toggleMute} className="text-white hover:text-pink-400 transition-colors p-1">
                      {isMuted || volume === 0 ? <VolumeX className="w-4.5 h-4.5 text-zinc-450" /> : <Volume2 className="w-4.5 h-4.5" />}
                    </button>
                    <input 
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-pink-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Quality Selector */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowQualityDropdown(!showQualityDropdown);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-zinc-900/85 border border-white/10 text-white hover:text-pink-400 transition-all text-[10px] font-mono uppercase cursor-pointer"
                    >
                      <Settings className="w-3 h-3" />
                      {quality}
                    </button>
                    
                    <AnimatePresence>
                      {showQualityDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-full right-0 mb-2 w-36 rounded-lg bg-zinc-950 border border-white/10 overflow-hidden shadow-2xl z-30 flex flex-col p-1.5 gap-0.5"
                        >
                          <span className="text-[8.5px] font-mono text-zinc-500 px-2 py-1 uppercase border-b border-white/5 mb-1 block">
                            Select Quality
                          </span>
                          {qualities.map((q) => (
                            <button
                              key={q}
                              onClick={(e) => {
                                e.stopPropagation();
                                selectQuality(q);
                              }}
                              className={`w-full text-left px-2 py-1.5 rounded font-mono text-[9.5px] transition-colors cursor-pointer ${
                                quality === q
                                  ? "bg-pink-500/15 text-pink-400 font-bold"
                                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
                              }`}
                            >
                              {q}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Picture in Picture */}
                  {isPipSupported && (
                    <button
                      onClick={handleTogglePip}
                      className="text-white hover:text-pink-400 transition-colors p-1.5 bg-zinc-900/85 border border-white/10 rounded"
                      title="Picture in Picture"
                    >
                      <Monitor className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Fullscreen Button */}
                  <button 
                    onClick={toggleFullScreen}
                    className="text-white hover:text-pink-400 transition-colors p-1.5 bg-zinc-900/85 border border-white/10 rounded"
                    title="Full Screen"
                  >
                    <Maximize className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
