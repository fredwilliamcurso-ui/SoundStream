import React, { useRef, useState, useEffect } from "react";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  X, 
  Loader2,
  Tv,
  Settings,
  Monitor,
  FastForward,
  Rewind,
  Sun,
  Sliders,
  Sparkles,
  ChevronRight,
  Info
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

type VideoQuality = "Auto (Source)" | "4K UHD" | "1080p HD" | "720p HD" | "480p SD";

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
  const [bufferingText, setBufferingText] = useState("Establishing secure high-fidelity stream...");
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<number | null>(null);

  // Advanced features
  const [quality, setQuality] = useState<VideoQuality>("Auto (Source)");
  const [showQualityDropdown, setShowQualityDropdown] = useState(false);
  const [isChangingQuality, setIsChangingQuality] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [showSpeedDropdown, setShowSpeedDropdown] = useState(false);
  const [isPipSupported, setIsPipSupported] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"controls" | "ai" | "info">("controls");

  // Interactive Gestures / HUD States
  const [brightness, setBrightness] = useState<number>(1); // 0.2 to 1.5
  const [hudMessage, setHudMessage] = useState<{ text: string; icon: React.ReactNode } | null>(null);
  const hudTimeoutRef = useRef<number | null>(null);

  // Mouse tilt effect values for 3D card layout
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  // Recommendations data (Aesthetic & structural integration)
  const simulatedRecommendations = [
    { id: "rec1", title: `${title} (Live Acoustic Live Room)`, artist: artistName, match: "98% Match", duration: "4:24", views: "145K views" },
    { id: "rec2", title: "Midnight Synthesis Live Session", artist: "SoundStream Collective", match: "92% Match", duration: "5:10", views: "89K views" },
    { id: "rec3", title: "Hyper-ambient Electronic Chillout", artist: "DJ Burna Wave", match: "87% Match", duration: "3:45", views: "340K views" }
  ];

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
    setBrightness(1);
    triggerHUD("Holographic stream connected", <Sparkles className="w-5 h-5 text-pink-400" />);
  }, [videoUrl]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      setIsPlaying(true);
      if (videoRef.current) {
        videoRef.current.playbackRate = playbackRate;
      }
      analytics.trackEvent("video_play", auth.currentUser?.uid, auth.currentUser?.email, {
        title,
        artistName,
        videoUrl
      });
      triggerHUD("PLAYING", <Play className="w-5 h-5 text-pink-400" />);
    };
    const handlePause = () => {
      setIsPlaying(false);
      triggerHUD("PAUSED", <Pause className="w-5 h-5 text-zinc-400" />);
    };
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
    const handlePlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
    };
    const handleWaiting = () => {
      if (!isChangingQuality) {
        setBufferingText("Bypassing server lag & buffer queues...");
        setIsLoading(true);
      }
    };
    const handleSeeking = () => {
      setIsLoading(true);
    };
    const handleSeeked = () => {
      setIsLoading(false);
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("seeking", handleSeeking);
    video.addEventListener("seeked", handleSeeked);

    // Initial load
    video.load();

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("seeking", handleSeeking);
      video.removeEventListener("seeked", handleSeeked);
    };
  }, [videoUrl, isChangingQuality, playbackRate]);

  const handlePlayPause = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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
    const nextTime = percentage * duration;
    videoRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
    triggerHUD(`Seeking to ${formatTime(nextTime)}`, <FastForward className="w-5 h-5 text-indigo-400" />);
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
    triggerHUD(`Volume ${Math.round(val * 100)}%`, <Volume2 className="w-5 h-5 text-indigo-400" />);
  };

  const toggleMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    videoRef.current.muted = nextMuted;
    videoRef.current.volume = nextMuted ? 0 : volume;
    if (nextMuted) {
      triggerHUD("MUTED", <VolumeX className="w-5 h-5 text-red-400" />);
    } else {
      triggerHUD(`Volume ${Math.round(volume * 100)}%`, <Volume2 className="w-5 h-5 text-emerald-400" />);
    }
  };

  const triggerHUD = (text: string, icon: React.ReactNode) => {
    setHudMessage({ text, icon });
    if (hudTimeoutRef.current) window.clearTimeout(hudTimeoutRef.current);
    hudTimeoutRef.current = window.setTimeout(() => {
      setHudMessage(null);
    }, 1500);
  };

  // Double-tap or Swipe gestures on video content
  const handleContainerClick = (e: React.MouseEvent<any>) => {
    e.stopPropagation();
    // Handle double clicks for skip
    if (e.detail === 2 && videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      
      if (clickX > width / 2) {
        // Fast forward 10s
        const targetTime = Math.min(videoRef.current.currentTime + 10, duration);
        videoRef.current.currentTime = targetTime;
        triggerHUD("+10 seconds", <FastForward className="w-6 h-6 text-pink-500" />);
      } else {
        // Rewind 10s
        const targetTime = Math.max(videoRef.current.currentTime - 10, 0);
        videoRef.current.currentTime = targetTime;
        triggerHUD("-10 seconds", <Rewind className="w-6 h-6 text-pink-500" />);
      }
    } else if (e.detail === 1) {
      handlePlayPause();
    }
  };

  // Drag simulation variables for Swipe Control (Volume/Brightness)
  const touchStartY = useRef<number>(0);
  const touchStartX = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    touchStartY.current = touch.clientY;
    touchStartX.current = touch.clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging.current || !videoRef.current) return;
    const touch = e.touches[0];
    const diffY = touchStartY.current - touch.clientY; // swipe up is positive
    const diffX = touch.clientX - touchStartX.current;
    
    const containerWidth = containerRef.current?.getBoundingClientRect().width || 1;
    
    // Left half vertical swipe = Brightness, Right half vertical swipe = Volume
    if (touchStartX.current < containerWidth / 2) {
      const change = diffY / 300; // sensitivity
      const nextBrightness = Math.min(Math.max(brightness + change, 0.2), 1.5);
      setBrightness(nextBrightness);
      triggerHUD(`Brightness ${Math.round(nextBrightness * 100)}%`, <Sun className="w-5 h-5 text-amber-400" />);
    } else {
      const change = diffY / 300; // sensitivity
      const nextVolume = Math.min(Math.max(volume + change, 0), 1);
      setVolume(nextVolume);
      videoRef.current.volume = nextVolume;
      triggerHUD(`Volume ${Math.round(nextVolume * 100)}%`, <Volume2 className="w-5 h-5 text-cyan-400" />);
    }
    
    touchStartY.current = touch.clientY;
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
  };

  const toggleFullScreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile && videoRef.current) {
      const video: any = videoRef.current;
      if (video.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();
        return;
      } else if (video.requestFullscreen) {
        video.requestFullscreen();
        return;
      }
    }

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
    
    if (!videoRef.current) return;
    const wasPlaying = isPlaying;
    const currentPos = videoRef.current.currentTime;
    
    setIsChangingQuality(true);
    setIsLoading(true);
    setBufferingText(`Holographic stream morphing to ${selected}...`);
    
    if (wasPlaying) {
      videoRef.current.pause();
    }
    
    setTimeout(() => {
      setIsChangingQuality(false);
      setIsLoading(false);
      if (videoRef.current) {
        videoRef.current.currentTime = currentPos;
        if (wasPlaying) {
          videoRef.current.play().catch(e => console.log(e));
        }
      }
      triggerHUD(`Hologram Mode: ${selected}`, <Tv className="w-5 h-5 text-indigo-400" />);
    }, 800);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3500);

    // Calculate mouse tilt coordinates for modern 3D perspective effect
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5; // -0.5 to 0.5
      setTilt({ x: x * 8, y: y * -8 }); // Max 8 degrees tilt
    }
  };

  const handleMouseLeave = () => {
    if (isPlaying) {
      setShowControls(false);
    }
    setTilt({ x: 0, y: 0 });
  };

  const qualities: VideoQuality[] = [
    "Auto (Source)",
    "4K UHD",
    "1080p HD",
    "720p HD",
    "480p SD"
  ];

  return (
    <div 
      ref={containerRef}
      id="soundstream-video-player-3d"
      className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden border border-white/10 group shadow-2xl transition-all duration-300 select-none"
      style={{
        transform: `perspective(1000px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
        filter: `brightness(${brightness})`,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Cinematic Ambient Light Bleed (Background dynamic glow behind the video frame) */}
      <div 
        className="absolute -inset-10 bg-gradient-to-r from-pink-500/15 via-purple-600/10 to-indigo-500/15 filter blur-3xl pointer-events-none -z-10 transition-opacity duration-1000"
        style={{ opacity: isPlaying ? 0.8 : 0.2 }}
      />

      {/* Actual HTML5 Video Element */}
      <video
        ref={videoRef}
        src={videoUrl}
        preload="metadata"
        playsInline
        onClick={handleContainerClick}
        className="w-full h-full object-contain bg-[#030305]"
      />

      {/* Buffering/Loading Screen */}
      {(isLoading || isChangingQuality) && (
        <div className="absolute inset-0 bg-[#08080c]/90 backdrop-blur-md flex flex-col items-center justify-center gap-3.5 z-20 pointer-events-none">
          <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[11px] font-mono tracking-widest text-pink-400 uppercase font-bold"
          >
            {bufferingText}
          </motion.span>
          <span className="text-[8.5px] font-mono text-zinc-500 uppercase tracking-widest">
            Ultra-low Latency 2026 Core Delivery
          </span>
        </div>
      )}

      {/* Advanced Heads Up Display Overlay (HUD) for gesture feedback */}
      <AnimatePresence>
        {hudMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="absolute top-1/3 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-lg border border-white/20 rounded-2xl px-6 py-4 flex items-center gap-3 z-30 pointer-events-none text-white shadow-3xl"
          >
            {hudMessage.icon}
            <span className="text-xs uppercase font-mono tracking-widest font-black text-zinc-100">
              {hudMessage.text}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Immersive Cinematic Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-gradient-to-t from-black/95 via-transparent to-black/60 flex flex-col justify-between p-6 pointer-events-none z-10"
          >
            {/* Header Toolbar */}
            <div className="flex items-center justify-between pointer-events-auto">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-pink-500 rounded-full animate-pulse" />
                <div>
                  <h4 className="font-sans font-black text-sm uppercase tracking-tight text-white flex items-center gap-2">
                    {title}
                  </h4>
                  <p className="font-mono text-[10px] text-zinc-400">By {artistName}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2.5">
                {/* HUD tab controllers for smart player options */}
                <div className="flex bg-black/60 border border-white/15 rounded-full p-0.5">
                  {[
                    { id: "controls", label: "Player" },
                    { id: "ai", label: "AI Sync", icon: <Sparkles className="w-3 h-3" /> },
                    { id: "info", label: "Info", icon: <Info className="w-3 h-3" /> }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTab(tab.id as any);
                      }}
                      className={`px-3 py-1 rounded-full text-[9px] font-mono uppercase font-bold tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                        activeTab === tab.id
                          ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black shadow"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>

                {onClose && (
                  <button 
                    onClick={onClose}
                    className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors cursor-pointer"
                    title="Exit Theater"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Smart Sliding Panels based on Tabs */}
            <div className="flex-1 flex items-center justify-center relative w-full pointer-events-auto">
              {/* Main Play overlay if paused */}
              {activeTab === "controls" && !isPlaying && !isLoading && !isChangingQuality && (
                <motion.button
                  whileHover={{ scale: 1.15, rotate: 10 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => handlePlayPause(e)}
                  className="w-16 h-16 rounded-full bg-pink-600 border border-pink-500/40 text-white flex items-center justify-center shadow-2xl shadow-pink-500/30 cursor-pointer hover:bg-pink-500"
                >
                  <Play className="w-7 h-7 fill-white ml-1 text-white" />
                </motion.button>
              )}

              {/* AI Recommendation Deck Overlay */}
              <AnimatePresence>
                {activeTab === "ai" && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="absolute bg-black/85 border border-white/15 backdrop-blur-xl rounded-2xl p-5 w-80 max-w-sm flex flex-col gap-3.5 shadow-2xl"
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="text-[10px] uppercase font-mono tracking-wider font-black text-pink-400 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" /> Smart Sound Matching
                      </span>
                      <span className="text-[8.5px] font-mono text-zinc-500">AI MODEL v5</span>
                    </div>

                    <div className="space-y-2">
                      {simulatedRecommendations.map(rec => (
                        <div key={rec.id} className="flex flex-col gap-0.5 p-2 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 cursor-pointer transition-all group/rec">
                          <div className="flex justify-between items-center text-[9.5px]">
                            <span className="font-bold text-zinc-200 truncate pr-2 group-hover/rec:text-pink-400 transition-colors">{rec.title}</span>
                            <span className="font-mono text-[8.5px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-1.5 py-0.5 rounded shrink-0">{rec.match}</span>
                          </div>
                          <div className="flex justify-between text-[8px] text-zinc-550 font-mono mt-0.5">
                            <span>{rec.artist}</span>
                            <span>{rec.duration} • {rec.views}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        triggerHUD("Smart Playlist Generated", <Sparkles className="w-5 h-5 text-emerald-400 animate-bounce" />);
                        setActiveTab("controls");
                      }}
                      className="w-full bg-pink-600 hover:bg-pink-500 text-white font-mono uppercase text-[9px] py-2 rounded-lg font-black tracking-widest border-none cursor-pointer"
                    >
                      Generate Smart AI Queue
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Info Deck Overlay */}
              <AnimatePresence>
                {activeTab === "info" && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="absolute bg-black/85 border border-white/15 backdrop-blur-xl rounded-2xl p-5 w-80 max-w-sm flex flex-col gap-3.5 shadow-2xl text-white font-sans text-xs"
                  >
                    <div className="flex items-center gap-2 border-b border-white/10 pb-2 text-[10px] uppercase font-mono tracking-wider font-black text-indigo-400">
                      <Sliders className="w-4 h-4" /> Stream Telemetry & Info
                    </div>
                    
                    <div className="space-y-2 font-mono text-[9px] text-zinc-300">
                      <div className="flex justify-between border-b border-white/5 py-1">
                        <span className="text-zinc-500">FORMAT:</span>
                        <span>MPEG-4 AVC (H.264)</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 py-1">
                        <span className="text-zinc-500">BITRATE:</span>
                        <span>12.4 Mbps (Lossless Source)</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 py-1">
                        <span className="text-zinc-500">CDN ROUTE:</span>
                        <span>Soundstream Hyper-Edge</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 py-1">
                        <span className="text-zinc-500">RENDER ENGINE:</span>
                        <span>WebGL 3D GPU-Accelerated</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setActiveTab("controls")}
                      className="w-full bg-white/10 hover:bg-white/15 text-zinc-300 font-mono text-[9px] py-1.5 rounded-lg uppercase tracking-wider cursor-pointer border border-white/10"
                    >
                      Dismiss Monitor
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom Glass Control Dashboard (Floating 3D pill deck) */}
            <div className="space-y-4 pointer-events-auto bg-black/55 backdrop-blur-md border border-white/10 rounded-2xl p-4 md:p-5 shadow-2xl relative">
              
              {/* Seek Timeline */}
              <div className="space-y-1">
                <div 
                  onClick={handleSeek}
                  className="h-1.5 w-full bg-white/15 rounded-full cursor-pointer relative group/scrub"
                >
                  <div 
                    className="h-full bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-500 rounded-full relative"
                    style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow scale-0 group-hover/scrub:scale-100 transition-transform duration-150" />
                  </div>
                </div>
                <div className="flex justify-between font-mono text-[9px] text-zinc-400">
                  <span>{formatTime(currentTime)}</span>
                  <span className="text-zinc-550 select-none">Double-tap side to Skip 10s • Swipe Left for Brightness • Swipe Right for Volume</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Lower Control Actions */}
              <div className="flex items-center justify-between gap-4">
                {/* Play/Pause & Volume */}
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => handlePlayPause()}
                    className="w-10 h-10 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white hover:text-pink-400 hover:bg-white/10 transition-colors p-0 cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-4.5 h-4.5" /> : <Play className="w-4.5 h-4.5 fill-white ml-0.5" />}
                  </button>

                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleMute()} className="text-zinc-400 hover:text-white transition-colors p-1 cursor-pointer bg-transparent border-none">
                      {isMuted || volume === 0 ? <VolumeX className="w-4.5 h-4.5 text-pink-500" /> : <Volume2 className="w-4.5 h-4.5" />}
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

                {/* Subtitle / Holographic Quality & Speed Controls */}
                <div className="flex items-center gap-3">
                  {/* Quality Dropdown */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowQualityDropdown(!showQualityDropdown);
                        setShowSpeedDropdown(false);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-zinc-200 hover:text-pink-400 hover:border-pink-500/30 transition-all text-[10px] font-mono uppercase cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      {quality}
                    </button>
                    
                    <AnimatePresence>
                      {showQualityDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-full right-0 mb-3 w-36 rounded-xl bg-[#09090c] border border-white/15 overflow-hidden shadow-2xl z-30 flex flex-col p-1.5 gap-0.5"
                        >
                          <span className="text-[8px] font-mono text-zinc-550 px-2 py-1 uppercase border-b border-white/5 mb-1 block">
                            Resolution
                          </span>
                          {qualities.map((q) => (
                            <button
                              key={q}
                              onClick={(e) => {
                                e.stopPropagation();
                                selectQuality(q);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg font-mono text-[9px] transition-colors cursor-pointer border-none ${
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

                  {/* Playback Rate Selector */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSpeedDropdown(!showSpeedDropdown);
                        setShowQualityDropdown(false);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-zinc-200 hover:text-pink-400 hover:border-pink-500/30 transition-all text-[10px] font-mono uppercase cursor-pointer"
                    >
                      <FastForward className="w-3.5 h-3.5" />
                      {playbackRate}x
                    </button>
                    
                    <AnimatePresence>
                      {showSpeedDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-full right-0 mb-3 w-28 rounded-xl bg-[#09090c] border border-white/15 overflow-hidden shadow-2xl z-30 flex flex-col p-1.5 gap-0.5"
                        >
                          <span className="text-[8px] font-mono text-zinc-550 px-2 py-1 uppercase border-b border-white/5 mb-1 block">
                            Speed
                          </span>
                          {[0.5, 0.75, 1, 1.25, 1.5, 2, 3].map((speed) => (
                            <button
                              key={speed}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPlaybackRate(speed);
                                if (videoRef.current) {
                                  videoRef.current.playbackRate = speed;
                                }
                                setShowSpeedDropdown(false);
                                triggerHUD(`Playback Speed: ${speed}x`, <FastForward className="w-5 h-5 text-indigo-400" />);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg font-mono text-[9px] transition-colors cursor-pointer border-none ${
                                playbackRate === speed
                                  ? "bg-pink-500/15 text-pink-400 font-bold"
                                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
                              }`}
                            >
                              {speed}x
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Picture-In-Picture Mode */}
                  {isPipSupported && (
                    <button
                      onClick={handleTogglePip}
                      className="w-10 h-10 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-zinc-350 hover:text-white hover:bg-white/10 transition-colors p-0 cursor-pointer"
                      title="Floating Mode (PiP)"
                    >
                      <Monitor className="w-4 h-4" />
                    </button>
                  )}

                  {/* Native Fullscreen */}
                  <button 
                    onClick={toggleFullScreen}
                    className="w-10 h-10 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-zinc-350 hover:text-white hover:bg-white/10 transition-colors p-0 cursor-pointer"
                    title="Fullscreen"
                  >
                    <Maximize2 className="w-4 h-4" />
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
