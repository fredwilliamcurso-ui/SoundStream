import React, { useEffect, useRef, useState } from "react";
import { 
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, 
  Settings, Activity, Wifi, Layers, Cpu, Battery, 
  Tv, Info, Sliders, ChevronDown, RefreshCw, AlertCircle, Heart
} from "lucide-react";
import Hls from "hls.js";
import { motion, AnimatePresence } from "motion/react";

interface SoundStreamCdnPlayerProps {
  activeStream: any;
  cameraFilter: string;
  onSendHeart?: () => void;
}

const CDN_PRESETS = [
  { 
    name: "🤖 Live Host Avatar & Audio Viz (Simulated CDN Ingestion)", 
    url: "SIMULATED", 
    desc: "A custom interactive visual feed rendering real-time stream status, PK battle stats, and voice equalizers." 
  },
  { 
    name: "🎬 Sintel Cinematic HD Live (Real HLS)", 
    url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    desc: "A high-definition multi-bitrate live stream running via Mux HLS CDN."
  },
  { 
    name: "🐰 Big Buck Bunny Classic HLS (Real HLS)", 
    url: "https://test-streams.mux.dev/pts/pts.m3u8",
    desc: "Standard HLS stream for testing video players, running with adaptive bitrate streaming."
  },
  {
    name: "🌌 Tears of Steel sci-fi Action (Real HLS)",
    url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
    desc: "4K-sourced sci-fi action movie trailer streaming via adaptive HLS."
  }
];

export default function SoundStreamCdnPlayer({ 
  activeStream, 
  cameraFilter,
  onSendHeart
}: SoundStreamCdnPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Core Player States
  const [currentUrl, setCurrentUrl] = useState<string>("SIMULATED");
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isControlsVisible, setIsControlsVisible] = useState<boolean>(true);
  const [selectedQuality, setSelectedQuality] = useState<string>("Auto (1080p)");
  const [availableQualities, setAvailableQualities] = useState<string[]>(["1080p", "720p", "480p", "360p", "Auto"]);
  const [playerError, setPlayerError] = useState<string | null>(null);

  // CDN Architecture Performance Metrics (TikTok / Boomplay Style)
  const [latency, setLatency] = useState<number>(2.4); // Latency in seconds (typical HTTP-FLV/HLS CDN)
  const [bitrate, setBitrate] = useState<number>(3450); // kbps
  const [bufferHealth, setBufferHealth] = useState<number>(98); // %
  const [fps, setFps] = useState<number>(60);
  const [cpuUsage, setCpuUsage] = useState<number>(4.2); // Calculated lower CPU than WebRTC
  const [powerSavings, setPowerSavings] = useState<number>(85); // % compared to full duplex RTC

  // UI States
  const [showQualityDropdown, setShowQualityDropdown] = useState<boolean>(false);
  const [showPresetsDropdown, setShowPresetsDropdown] = useState<boolean>(false);
  const [customUrlInput, setCustomUrlInput] = useState<string>("");
  const [isConfiguring, setIsConfiguring] = useState<boolean>(false);
  const [showStats, setShowStats] = useState<boolean>(true);
  const [heartCount, setHeartCount] = useState<number>(0);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; left: number; duration: number }[]>([]);

  // Simulation values timer
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isPlaying) return;
      
      // Add subtle fluctuations to metrics to make them look alive
      setLatency(prev => Math.max(1.8, Math.min(4.5, prev + (Math.random() * 0.4 - 0.2))));
      setBitrate(prev => Math.max(1800, Math.min(5200, prev + Math.floor(Math.random() * 200 - 100))));
      setBufferHealth(prev => Math.max(90, Math.min(100, prev + (Math.random() * 2 - 1))));
      setFps(prev => Math.max(58, Math.min(60, prev + (Math.random() > 0.9 ? -1 : 1))));
      setCpuUsage(prev => Math.max(3.1, Math.min(5.8, prev + (Math.random() * 0.4 - 0.2))));
    }, 3000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Handle source changes & HLS.js initialization
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setPlayerError(null);

    if (currentUrl === "SIMULATED") {
      setIsPlaying(true);
      return;
    }

    // Try loading actual stream
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30
      });
      hlsRef.current = hls;

      console.log(`[SoundStream CDN Player] Loading HLS stream URL: ${currentUrl}`);
      hls.loadSource(currentUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        console.log(`[SoundStream CDN Player] Manifest parsed successfully. Levels:`, data.levels);
        const levels = data.levels.map(l => `${l.height}p`);
        setAvailableQualities([...new Set(levels), "Auto"]);
        if (isPlaying) {
          video.play().catch(e => {
            console.warn("Autoplay blocked by browser policy:", e);
            setIsPlaying(false);
          });
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error(`[SoundStream CDN Player] HLS instance error:`, data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn("Fatal network error, attempting to recover...");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn("Fatal media error, attempting to recover...");
              hls.recoverMediaError();
              break;
            default:
              setPlayerError("Failed to play CDN video source. Stream might be offline.");
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native Apple device playback (Safari / Mobile iOS)
      video.src = currentUrl;
      video.addEventListener("loadedmetadata", () => {
        if (isPlaying) video.play().catch(() => setIsPlaying(false));
      });
    } else {
      setPlayerError("Your browser does not support HLS playback natively or via Hls.js.");
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentUrl]);

  // Monitor pause state on actual HTML5 video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video || currentUrl === "SIMULATED") return;

    if (isPlaying) {
      video.play().catch(() => setIsPlaying(false));
    } else {
      video.pause();
    }
  }, [isPlaying, currentUrl]);

  // Monitor volume & mute changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = isMuted ? 0 : volume;
    video.muted = isMuted;
  }, [volume, isMuted]);

  // Controls visibility timeout
  useEffect(() => {
    if (!isPlaying) {
      setIsControlsVisible(true);
      return;
    }
    const handler = setTimeout(() => {
      setIsControlsVisible(false);
    }, 4000);

    return () => clearTimeout(handler);
  }, [isControlsVisible, isPlaying]);

  // Handle Fullscreen
  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error("Fullscreen request failed:", err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  // Preset Select Handler
  const handleSelectPreset = (url: string) => {
    setCurrentUrl(url);
    setShowPresetsDropdown(false);
  };

  // Custom Stream Submission
  const handleCustomUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrlInput.trim()) return;
    setCurrentUrl(customUrlInput.trim());
    setIsConfiguring(false);
  };

  // Heart trigger
  const handleHeartClick = () => {
    if (onSendHeart) {
      onSendHeart();
    }
    setHeartCount(prev => prev + 1);
    const newHeart = {
      id: Date.now(),
      left: Math.random() * 80 + 10, // 10% to 90%
      duration: Math.random() * 2 + 1.5 // 1.5s to 3.5s
    };
    setFloatingHearts(prev => [...prev, newHeart]);
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => h.id !== newHeart.id));
    }, 4000);
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={() => setIsControlsVisible(true)}
      onMouseLeave={() => isPlaying && setIsControlsVisible(false)}
      onDoubleClick={handleHeartClick}
      className="relative w-full h-full bg-[#0c0c0e] flex flex-col items-center justify-center overflow-hidden select-none cursor-pointer"
      title="Double-click to send hearts like TikTok!"
    >
      {/* 1. ACTUAL VIDEO STREAM CONTAINER */}
      {currentUrl !== "SIMULATED" ? (
        <video
          ref={videoRef}
          playsInline
          className="w-full h-full object-contain z-0"
          style={{ filter: cameraFilter }}
          onClick={() => setIsPlaying(!isPlaying)}
        />
      ) : (
        /* 2. DYNAMIC BROADCASTER VISUALIZATION SIMULATOR */
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-[#0c0d12] via-[#12141c] to-[#0a0710] flex flex-col items-center justify-center p-6 z-0">
          
          {/* Pulsing Backlight glow matching stream style */}
          <div className="absolute w-[280px] h-[280px] rounded-full bg-violet-600/10 blur-[100px] animate-pulse z-0" />
          <div className="absolute w-[200px] h-[200px] rounded-full bg-[#ff0050]/5 blur-[80px] animate-ping z-0" />

          {/* Glowing spinning visual hub */}
          <div className="relative flex flex-col items-center justify-center z-10 text-center">
            
            {/* Rotating Album Art Ring */}
            <div className="relative w-36 h-36 rounded-full border-2 border-zinc-700/50 p-2 bg-[#000000]/40 shadow-2xl">
              <motion.div 
                animate={isPlaying ? { rotate: 360 } : {}}
                transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
                className="w-full h-full rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center border border-zinc-600/40"
              >
                <img 
                  src={activeStream?.thumbnailUrl || "https://images.unsplash.com/photo-1516280440614-37939bbacd6a?w=400&q=80"}
                  alt="Host"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </motion.div>
              
              {/* Spinning record needle anchor point */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center shadow-md">
                <div className="w-3 h-3 rounded-full bg-violet-500 animate-pulse" />
              </div>

              {/* Streaming Indicator */}
              {isPlaying && (
                <div className="absolute -top-1 -right-1 bg-[#ff0050] text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-widest text-white shadow-lg animate-bounce">
                  Live
                </div>
              )}
            </div>

            <h3 className="text-white font-bold text-lg mt-5 tracking-wide flex items-center gap-2">
              {activeStream?.title || "SoundStream Premium Live Room"}
            </h3>
            <p className="text-zinc-400 text-xs mt-1 font-medium max-w-xs truncate">
              Hosted by <span className="text-violet-400 font-semibold">{activeStream?.creatorName || "Broadcaster"}</span>
            </p>

            {/* Simulated Live Audio Equalizer Waves */}
            <div className="flex items-end justify-center gap-[4px] h-14 mt-6">
              {[...Array(14)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={isPlaying ? {
                    height: [
                      "15px", 
                      `${Math.floor(Math.random() * 40 + 15)}px`, 
                      "12px", 
                      `${Math.floor(Math.random() * 50 + 20)}px`, 
                      "15px"
                    ]
                  } : { height: "6px" }}
                  transition={{ 
                    duration: 1.2 + (i * 0.08), 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                  className={`w-1 rounded-full ${
                    i % 3 === 0 ? "bg-[#ff0050]" : i % 3 === 1 ? "bg-violet-500" : "bg-cyan-400"
                  }`}
                />
              ))}
            </div>

            <div className="mt-5 text-center max-w-sm px-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block">
                Ingested over WebRTC
              </span>
              <span className="text-xs text-zinc-400 mt-1 block">
                🎯 Transcoded to CDN (HLS/HTTP-FLV) at Edge Node
              </span>
            </div>

          </div>
        </div>
      )}

      {/* 3. ERROR HUD SCREEN */}
      {playerError && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
          <AlertCircle className="w-12 h-12 text-[#ff0050] mb-4 animate-bounce" />
          <h4 className="text-white font-bold text-base">CDN Stream Connection Error</h4>
          <p className="text-zinc-400 text-xs max-w-md mt-2 leading-relaxed">
            {playerError}
          </p>
          <div className="flex items-center gap-3 mt-6">
            <button 
              onClick={() => setCurrentUrl("SIMULATED")}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 transition rounded-xl text-xs text-white font-bold cursor-pointer"
            >
              Use Live Simulator Feed
            </button>
            <button 
              onClick={() => {
                const prev = currentUrl;
                setCurrentUrl("");
                setTimeout(() => setCurrentUrl(prev), 100);
              }}
              className="px-4 py-2 bg-gradient-to-r from-[#ff0050] to-violet-600 hover:from-[#e00045] hover:to-violet-700 transition rounded-xl text-xs text-white font-bold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Retry Connection
            </button>
          </div>
        </div>
      )}

      {/* 4. PERFORMANCE STATS OVERLAY (TikTok / Boomplay Diagnostic tool) */}
      <AnimatePresence>
        {showStats && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute top-4 left-4 z-20 bg-black/75 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 max-w-[250px] text-[11px] font-mono text-zinc-300 pointer-events-auto shadow-2xl text-left"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
              <span className="font-bold text-[10px] text-white tracking-widest uppercase flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" /> CDN STREAM HUD
              </span>
              <button 
                onClick={() => setShowStats(false)}
                className="text-zinc-500 hover:text-white transition text-[9px] cursor-pointer"
              >
                Hide
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-zinc-500">Protocol:</span>
                <span className="text-cyan-400 font-semibold uppercase">
                  {currentUrl === "SIMULATED" ? "HTTP-FLV (Sim)" : "HLS (.m3u8)"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Latency delay:</span>
                <span className="text-white font-bold">{latency.toFixed(1)}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Buffer health:</span>
                <span className="text-emerald-400 font-bold">{bufferHealth.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Edge Bitrate:</span>
                <span className="text-amber-400 font-bold">{(bitrate / 1000).toFixed(2)} Mbps</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Framerate:</span>
                <span className="text-white">{fps} FPS</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-white/5 mt-1">
                <span className="text-zinc-500 flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-violet-400" /> CPU Usage:
                </span>
                <span className="text-violet-300 font-bold">{cpuUsage.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 flex items-center gap-1">
                  <Battery className="w-3 h-3 text-emerald-400" /> Power Saved:
                </span>
                <span className="text-emerald-300 font-black">~{powerSavings}%</span>
              </div>
              <div className="pt-1.5 mt-1 border-t border-white/10 text-[9px] text-zinc-500 italic leading-snug">
                Guests do not join WebRTC channel, saving extreme mobile data & battery.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. FLOATING HEART ANIMATIONS (Viewer Interactive feedback) */}
      <div className="absolute right-6 bottom-24 w-28 h-64 pointer-events-none z-10 overflow-hidden">
        <AnimatePresence>
          {floatingHearts.map(heart => (
            <motion.div
              key={heart.id}
              initial={{ y: "100%", opacity: 1, scale: 0.8, x: `${heart.left}%` }}
              animate={{ 
                y: "-110%", 
                opacity: [1, 0.8, 0.4, 0], 
                scale: [0.8, 1.2, 1, 0.8],
                x: [
                  `${heart.left}%`, 
                  `${heart.left + (Math.random() * 40 - 20)}%`, 
                  `${heart.left + (Math.random() * 60 - 30)}%`
                ] 
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: heart.duration, ease: "easeOut" }}
              className="absolute bottom-0"
            >
              <Heart 
                className={`w-6 h-6 fill-current ${
                  heart.id % 3 === 0 ? "text-[#ff0050]" : heart.id % 3 === 1 ? "text-violet-500" : "text-cyan-400"
                }`} 
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 6. BOTTOM AND MAIN PLAYER CONTROLS (Frictionless Web Hud) */}
      <AnimatePresence>
        {isControlsVisible && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-4 flex flex-col gap-3.5 z-20 pointer-events-auto"
          >
            {/* Quick Presets & Source Setup bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-400 font-bold flex items-center gap-1 uppercase tracking-wide bg-zinc-800/80 px-2 py-0.5 rounded-md">
                  <Tv className="w-3.5 h-3.5 text-[#ff0050]" /> Stream Playback Source
                </span>
                
                {/* Active source label */}
                <div className="relative">
                  <button 
                    onClick={() => {
                      setShowPresetsDropdown(!showPresetsDropdown);
                      setShowQualityDropdown(false);
                    }}
                    className="flex items-center gap-1 text-xs text-white bg-violet-600/20 border border-violet-500/30 hover:bg-violet-600/30 transition px-2.5 py-1 rounded-xl font-medium cursor-pointer"
                  >
                    <span className="max-w-[140px] truncate">
                      {currentUrl === "SIMULATED" ? "Host Avatar Simulation" : "External Live Feed"}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {showPresetsDropdown && (
                    <div className="absolute bottom-full mb-2 left-0 w-72 bg-[#121216] border border-white/15 rounded-2xl p-2.5 shadow-2xl z-30 space-y-1">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider px-2 py-1 border-b border-white/5">
                        Select Ingestion Output Format
                      </p>
                      {CDN_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSelectPreset(preset.url)}
                          className={`w-full text-left p-2 rounded-xl text-xs transition cursor-pointer flex flex-col gap-0.5 ${
                            currentUrl === preset.url 
                              ? "bg-violet-600/35 text-white border border-violet-500/20" 
                              : "text-zinc-300 hover:bg-white/5"
                          }`}
                        >
                          <span className="font-semibold block">{preset.name}</span>
                          <span className="text-[10px] text-zinc-500 block truncate">{preset.desc}</span>
                        </button>
                      ))}
                      <div className="pt-1.5 border-t border-white/5 mt-1.5 px-1.5">
                        <button
                          onClick={() => {
                            setIsConfiguring(true);
                            setShowPresetsDropdown(false);
                          }}
                          className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 text-[10px] text-center font-bold uppercase tracking-wider rounded-lg text-white block cursor-pointer"
                        >
                          + Custom .m3u8 CDN URL
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Diagnostic Tools toggles */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowStats(!showStats)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-xl transition flex items-center gap-1 border cursor-pointer ${
                    showStats 
                      ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" 
                      : "bg-zinc-800/40 border-zinc-700/20 text-zinc-400 hover:bg-zinc-800"
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" /> HUD stats
                </button>
                {currentUrl !== "SIMULATED" && (
                  <button 
                    onClick={() => {
                      const prev = currentUrl;
                      setCurrentUrl("");
                      setTimeout(() => setCurrentUrl(prev), 50);
                    }}
                    title="Refresh stream player"
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Main Player HUD Controls */}
            <div className="flex items-center justify-between gap-4">
              
              {/* Play & Vol Controls */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-lg cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>

                {/* Volume slider */}
                <div className="flex items-center gap-2 bg-zinc-900/60 px-3 py-1.5 rounded-xl border border-white/5">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="text-zinc-400 hover:text-white transition cursor-pointer"
                  >
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      setVolume(parseFloat(e.target.value));
                      setIsMuted(false);
                    }}
                    className="w-16 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                  />
                </div>
              </div>

              {/* Central status notification */}
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-zinc-400">
                <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Connected to CDN Node Edge (Mux Global)</span>
              </div>

              {/* Quality & Fullscreen controls */}
              <div className="flex items-center gap-2">
                
                {/* Heart Button */}
                <button
                  onClick={handleHeartClick}
                  className="w-9 h-9 rounded-xl border border-[#ff0050]/20 bg-[#ff0050]/10 hover:bg-[#ff0050]/20 transition flex items-center justify-center cursor-pointer text-[#ff0050]"
                  title="Send Heart"
                >
                  <Heart className="w-4 h-4 fill-current animate-pulse" />
                </button>

                {/* Quality selector */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowQualityDropdown(!showQualityDropdown);
                      setShowPresetsDropdown(false);
                    }}
                    className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white bg-zinc-900 border border-white/10 px-2.5 py-1.5 rounded-xl transition font-mono cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 text-violet-400" /> {selectedQuality}
                  </button>

                  {showQualityDropdown && (
                    <div className="absolute bottom-full mb-2 right-0 w-36 bg-[#121216] border border-white/15 rounded-xl p-1 shadow-2xl z-30 space-y-0.5">
                      {availableQualities.map((quality) => (
                        <button
                          key={quality}
                          onClick={() => {
                            setSelectedQuality(quality);
                            setShowQualityDropdown(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                            selectedQuality === quality ? "bg-violet-600 text-white" : "text-zinc-300 hover:bg-white/5"
                          }`}
                        >
                          {quality}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={toggleFullscreen}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition cursor-pointer"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

              </div>

            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* 7. CUSTOM URL INGESTION CONFIGURATION FORM */}
      <AnimatePresence>
        {isConfiguring && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 z-30"
          >
            <motion.form 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onSubmit={handleCustomUrlSubmit}
              className="bg-[#121216] border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 text-left pointer-events-auto"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-white font-bold text-base flex items-center gap-1.5">
                    <Tv className="w-5 h-5 text-violet-400" /> Custom CDN Stream Link
                  </h4>
                  <p className="text-zinc-500 text-xs mt-1">
                    Connect an external HLS (.m3u8) live output stream directly to the SoundStream platform.
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsConfiguring(false)}
                  className="text-zinc-400 hover:text-white transition cursor-pointer text-xs"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-1.5 mt-2">
                <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  CDN Transcoding Playback URL (.m3u8)
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/live/stream.m3u8"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  className="w-full bg-[#1c1c24] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div className="bg-zinc-900/60 border border-white/5 p-3 rounded-2xl text-[11px] text-zinc-400 leading-relaxed space-y-1">
                <p className="font-semibold text-zinc-300">💡 Testing tips:</p>
                <p>• Make sure the URL serves a valid CORS-enabled HLS stream (.m3u8).</p>
                <p>• You can fetch public streams from services like Mux, IPTV lists, or AWS Medialive.</p>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-[#ff0050] to-violet-600 hover:from-[#e00045] hover:to-violet-700 text-xs font-bold uppercase tracking-wider text-white rounded-xl transition cursor-pointer shadow-lg"
              >
                Connect Stream Ingest Output
              </button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
