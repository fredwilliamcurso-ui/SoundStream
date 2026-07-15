import React, { useState, useEffect, useRef } from "react";
import { 
  Play, Pause, Volume2, VolumeX, Radio, Users, MessageSquare, Calendar, 
  Flame, Disc, Sparkles, Music, Sliders, Settings, Send, Trash2, Plus, 
  Heart, Clock, TrendingUp, Share2, Info, ChevronRight, Check, AlertCircle, BarChart2, Award
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Song, User } from "../types";
import { db } from "../lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp } from "firebase/firestore";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, Cell 
} from "recharts";

interface RadioViewProps {
  currentUser: User | null;
  isAdmin: boolean;
  songs: Song[];
  mainPlayerIsPlaying: boolean;
  setMainPlayerIsPlaying: (playing: boolean) => void;
}

interface ChatMessage {
  id: string;
  user: string;
  text: string;
  timestamp: string;
  avatar?: string;
  isSystem?: boolean;
}

interface DJ {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  active: boolean;
}

interface ScheduleShow {
  id: string;
  time: string;
  title: string;
  dj: string;
  genre: string;
}

export default function RadioView({
  currentUser,
  isAdmin,
  songs,
  mainPlayerIsPlaying,
  setMainPlayerIsPlaying
}: RadioViewProps) {
  // --- STATIONS DEFINITION ---
  const stations = [
    { id: "hits", name: "SoundStreamy Hits", desc: "The biggest songs and hottest releases", icon: Flame, color: "from-pink-500 to-rose-500" },
    { id: "new", name: "New Music Discovery", desc: "Fresh tracks and emerging artists", icon: Sparkles, color: "from-purple-500 to-indigo-500" },
    { id: "hiphop", name: "Hip-Hop Network", desc: "Vibrant beats and lyricists", icon: Disc, color: "from-amber-500 to-orange-500" },
    { id: "pop", name: "Pop Avenue", desc: "Smooth sounds and catchy melodies", icon: Music, color: "from-emerald-500 to-teal-500" },
    { id: "afrobeats", name: "Afrobeats Pulse", desc: "Vibrant African rhythms and grooves", icon: TrendingUp, color: "from-cyan-500 to-blue-500" },
    { id: "chill", name: "Chill & Relax", desc: "Ambient sounds for your everyday moments", icon: Clock, color: "from-indigo-500 to-violet-500" },
  ];

  // --- STATE MANAGEMENT ---
  const [activeStation, setActiveStation] = useState(stations[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [prevVolume, setPrevVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [listeners, setListeners] = useState(148);
  
  // Radio Queue & Track state
  const [radioQueue, setRadioQueue] = useState<Song[]>([]);
  const [currentRadioSong, setCurrentRadioSong] = useState<Song | null>(null);
  const [recentlyPlayedIds, setRecentlyPlayedIds] = useState<string[]>([]);
  
  // Audio state
  const radioAudioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  
  // Interactive UI Tabs
  const [activeTab, setActiveTab] = useState<"player" | "schedule" | "about" | "admin">("player");
  
  // Ticker announcement
  const [announcement, setAnnouncement] = useState("🎙️ Welcome to SoundStreamy Radio! Live DJ Sessions every Friday and Saturday night! Host submissions are now open.");
  
  // DJs list
  const [djs, setDjs] = useState<DJ[]>([
    { id: "1", name: "DJ Aurora", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80", bio: "Late Night Chill host and electronic music wizard.", active: true },
    { id: "2", name: "Spitfire", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80", bio: "Hip-Hop enthusiast spinning underground gems.", active: true },
    { id: "3", name: "DJ Melody", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80", bio: "SoundStreamy Hits manager and morning show producer.", active: false }
  ]);

  // Shows schedule
  const [schedule, setSchedule] = useState<ScheduleShow[]>([
    { id: "1", time: "08:00 - 10:00", title: "Morning Vibe DJ Show", dj: "DJ Melody", genre: "Hits & Pop" },
    { id: "2", time: "12:00 - 14:00", title: "The Hip-Hop Hour", dj: "Spitfire", genre: "Hip-Hop" },
    { id: "3", time: "17:00 - 19:00", title: "Sunset Afrobeats Pulse", dj: "Guest DJ", genre: "Afrobeats" },
    { id: "4", time: "21:00 - 23:00", title: "Late Night Chill Sessions", dj: "DJ Aurora", genre: "Chill" }
  ]);

  // Approved songs ids (for rotation filter in admin panel)
  const [approvedSongIds, setApprovedSongIds] = useState<string[]>(() => {
    // Default to approving all existing songs
    return songs.map(s => s.id);
  });

  // Listener Analytics (Recharts simulated data)
  const [analyticsData] = useState([
    { hour: "12 AM", listeners: 120 },
    { hour: "3 AM", listeners: 85 },
    { hour: "6 AM", listeners: 95 },
    { hour: "9 AM", listeners: 150 },
    { hour: "12 PM", listeners: 230 },
    { hour: "3 PM", listeners: 280 },
    { hour: "6 PM", listeners: 340 },
    { hour: "9 PM", listeners: 410 },
  ]);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: "init-1", user: "System", text: "Welcome to the SoundStreamy Live Chat! Keep it friendly.", timestamp: "12:00", isSystem: true },
    { id: "init-2", user: "Marcus_K", text: "This station is absolutely fire today! 🎧🔥", timestamp: "12:02", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80" },
    { id: "init-3", user: "Clara_Sky", text: "What song is this playing? It's so good!", timestamp: "12:03", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=80&q=80" },
    { id: "init-4", user: "BeatMaker99", text: "DJ Aurora is coming up next, can't wait!", timestamp: "12:04", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80" }
  ]);
  const [newMessage, setNewMessage] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // --- AUTOMATIC SONG SELECTION (RADIO AUTOMATION AI) ---
  const generateQueueAndSetSong = (stationId: string, initialPlay = false) => {
    // 1. Filter songs available in main catalog
    let filtered = songs.filter(s => approvedSongIds.includes(s.id));
    
    if (filtered.length === 0) {
      filtered = songs; // Fallback to all songs if none approved
    }

    // 2. Select based on Station criteria
    switch (stationId) {
      case "hits":
        // Sort by play count or likes descending
        filtered = [...filtered].sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
        break;
      case "new":
        // Sort by creation date descending
        filtered = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "hiphop":
        filtered = filtered.filter(s => s.genre?.toLowerCase().includes("hip"));
        break;
      case "pop":
        filtered = filtered.filter(s => s.genre?.toLowerCase().includes("pop"));
        break;
      case "afrobeats":
        filtered = filtered.filter(s => s.genre?.toLowerCase().includes("afro") || s.genre?.toLowerCase().includes("beat"));
        break;
      case "chill":
        filtered = filtered.filter(s => s.genre?.toLowerCase().includes("chill") || s.genre?.toLowerCase().includes("relax") || s.genre?.toLowerCase().includes("lofi") || s.genre?.toLowerCase().includes("ambient"));
        break;
      default:
        break;
    }

    // If filter yields nothing, fallback to all approved
    if (filtered.length === 0) {
      filtered = songs.filter(s => approvedSongIds.includes(s.id));
      if (filtered.length === 0) filtered = songs;
    }

    // Shuffle rotation (excluding recently played to prevent repeats)
    let availableSongs = filtered.filter(s => !recentlyPlayedIds.includes(s.id));
    if (availableSongs.length === 0) {
      availableSongs = filtered; // Reset recently played if all exhausted
      setRecentlyPlayedIds([]);
    }

    // Shuffle helper
    const shuffled = [...availableSongs].sort(() => Math.random() - 0.5);
    
    if (shuffled.length > 0) {
      const active = shuffled[0];
      const queue = shuffled.slice(1, 5); // next 4 songs
      
      setCurrentRadioSong(active);
      setRadioQueue(queue);

      // Track recently played
      setRecentlyPlayedIds(prev => {
        const updated = [active.id, ...prev];
        if (updated.length > 15) updated.pop(); // limit memory size
        return updated;
      });

      // Update listener counts dynamically per track switch for realism
      setListeners(Math.floor(120 + Math.random() * 80 + (active.playCount ? active.playCount % 30 : 0)));

      // If already playing, start playing new song
      if (initialPlay && radioAudioRef.current) {
        radioAudioRef.current.src = active.audioUrl || (active as any).url;
        radioAudioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(e => console.error("Radio play failed:", e));
      }
    }
  };

  // Dynamic SEO meta description and keywords for SoundStreamy Radio
  useEffect(() => {
    // Save original title & meta tags to restore on unmount
    const originalTitle = document.title;
    
    document.title = "SoundStreamy Radio - Always Playing. Always Discovering.";
    
    let metaDesc = document.querySelector('meta[name="description"]');
    let originalDesc = metaDesc ? metaDesc.getAttribute("content") : "";
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", "Listen to SoundStreamy Radio 24/7 for nonstop music, trending hits, new artists, fresh releases, and curated playlists. Discover your next favorite sound anytime, anywhere.");

    let metaKeywords = document.querySelector('meta[name="keywords"]');
    let originalKeywords = metaKeywords ? metaKeywords.getAttribute("content") : "";
    if (!metaKeywords) {
      metaKeywords = document.createElement("meta");
      metaKeywords.setAttribute("name", "keywords");
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute("content", "SoundStreamy Radio, online radio, live radio, music streaming, 24/7 radio, nonstop music, internet radio, music station, online music station, free music streaming, new music, trending music, music discovery, new artists, rising artists, global music, hit songs, music playlists, digital radio, live music, independent artists");

    return () => {
      document.title = originalTitle;
      if (metaDesc) {
        if (originalDesc) {
          metaDesc.setAttribute("content", originalDesc);
        } else {
          metaDesc.remove();
        }
      }
      if (metaKeywords) {
        if (originalKeywords) {
          metaKeywords.setAttribute("content", originalKeywords);
        } else {
          metaKeywords.remove();
        }
      }
    };
  }, []);

  // Trigger automation when station changes
  useEffect(() => {
    generateQueueAndSetSong(activeStation.id, isPlaying);
  }, [activeStation, approvedSongIds]);

  // Audio setup and auto-advance
  useEffect(() => {
    const audio = new Audio();
    radioAudioRef.current = audio;
    audio.volume = volume;

    // Load initial song if currentRadioSong exists
    if (currentRadioSong) {
      audio.src = currentRadioSong.audioUrl || (currentRadioSong as any).url;
    }

    const handleEnded = () => {
      console.log("[Radio Automation] Track ended, auto-switching to next song...");
      // Auto-switch: first song in queue becomes active
      if (radioQueue.length > 0) {
        const nextSong = radioQueue[0];
        setCurrentRadioSong(nextSong);
        
        // Remove first and generate more
        const updatedQueue = radioQueue.slice(1);
        
        // Find a new song to push to the end of the queue
        let filtered = songs.filter(s => approvedSongIds.includes(s.id));
        if (filtered.length === 0) filtered = songs;
        
        let available = filtered.filter(s => s.id !== nextSong.id && !radioQueue.map(q => q.id).includes(s.id) && !recentlyPlayedIds.includes(s.id));
        if (available.length === 0) available = filtered;
        
        const nextInLine = available[Math.floor(Math.random() * available.length)];
        
        setRadioQueue([...updatedQueue, nextInLine]);
        setRecentlyPlayedIds(prev => [nextSong.id, ...prev.slice(0, 14)]);
        
        // Load and play
        audio.src = nextSong.audioUrl || (nextSong as any).url;
        audio.play().catch(e => console.error("Radio continuous autoplay failed:", e));
      } else {
        // Queue empty, rebuild
        generateQueueAndSetSong(activeStation.id, true);
      }
    };

    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("ended", handleEnded);
    };
  }, [currentRadioSong, radioQueue, activeStation]);

  // Sync volume
  useEffect(() => {
    if (radioAudioRef.current) {
      radioAudioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Manage main player conflict
  useEffect(() => {
    if (mainPlayerIsPlaying && isPlaying) {
      // Pause radio if main music player started playing
      handlePauseRadio();
    }
  }, [mainPlayerIsPlaying]);

  // Clean background playback on exit
  useEffect(() => {
    return () => {
      if (radioAudioRef.current) {
        radioAudioRef.current.pause();
      }
    };
  }, []);

  // Simulated active chat messages generator
  useEffect(() => {
    const chatInterval = setInterval(() => {
      const activeDJs = djs.filter(d => d.active).map(d => d.name);
      const userNames = ["Lara_Cruzer", "VibeMaster", "SoundLover", "Aero_9", "AlexMusic", "Zoe_Chords", "Tariq_Afro", "K-Pop-Fan", "SynthWaver"];
      const messages = [
        "Yes! Absolute vibe 🎶⚡",
        "Lovin the vibes on this station right now",
        "SoundStreamy Radio is my favorite tab!",
        "Requesting some more music in the next block please!",
        "Awesome song selections! 🔥🔊",
        "Hello from London! Enjoying the stream",
        "The audio quality is crystal clear today 🙌",
        "Perfect study companion, thank you SoundStreamy!",
        "This station really knows how to curate!"
      ];

      const randomUser = userNames[Math.floor(Math.random() * userNames.length)];
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // 10% chance a DJ chats
      const isDJChat = Math.random() < 0.15 && activeDJs.length > 0;
      const chatter = isDJChat ? `[DJ] ${activeDJs[Math.floor(Math.random() * activeDJs.length)]}` : randomUser;
      const chatterText = isDJChat ? "📻 Listening live with you guys! Let me know what genre you want next!" : randomMsg;

      setChatMessages(prev => [
        ...prev,
        {
          id: `sim-${Date.now()}`,
          user: chatter,
          text: chatterText,
          timestamp: timeStr,
          avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 999999)}?auto=format&fit=crop&w=80&q=80`
        }
      ].slice(-30)); // limit chat logs
    }, 12000);

    return () => clearInterval(chatInterval);
  }, [djs]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // --- AUDIO ACTIONS ---
  const handlePlayRadio = () => {
    // If main music player is playing, stop it!
    if (mainPlayerIsPlaying) {
      setMainPlayerIsPlaying(false);
    }
    
    if (radioAudioRef.current && currentRadioSong) {
      radioAudioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          startVisualizer();
        })
        .catch(err => {
          console.error("Playback failed:", err);
        });
    }
  };

  const handlePauseRadio = () => {
    if (radioAudioRef.current) {
      radioAudioRef.current.pause();
    }
    setIsPlaying(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val > 0) setIsMuted(false);
  };

  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      setVolume(prevVolume);
    } else {
      setPrevVolume(volume);
      setIsMuted(true);
      setVolume(0);
    }
  };

  // --- INTERACTIVE VISUALIZER (CSS / Canvas-based fallback) ---
  const startVisualizer = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;

    const barCount = 35;
    const barWidth = width / barCount - 2;
    const bars: { x: number; targetHeight: number; currentHeight: number; speed: number }[] = [];

    for (let i = 0; i < barCount; i++) {
      bars.push({
        x: i * (barWidth + 2),
        targetHeight: 0,
        currentHeight: 5,
        speed: 0.1 + Math.random() * 0.15
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      bars.forEach((bar, index) => {
        if (isPlaying) {
          // Generate organic music waves
          const time = Date.now() * 0.003;
          bar.targetHeight = (Math.sin(index * 0.15 + time) * 0.4 + 0.6) * (height - 10) * (0.4 + Math.random() * 0.6);
        } else {
          bar.targetHeight = 4;
        }

        // Smooth interpolation
        bar.currentHeight += (bar.targetHeight - bar.currentHeight) * bar.speed;
        
        // Draw elegant gradient bar
        const grad = ctx.createLinearGradient(0, height, 0, height - bar.currentHeight);
        grad.addColorStop(0, "rgba(99, 102, 241, 0.2)"); // Indigo
        grad.addColorStop(0.5, "rgba(139, 92, 246, 0.6)"); // Violet
        grad.addColorStop(1, "rgba(236, 72, 153, 0.95)"); // Pink

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(bar.x, height - bar.currentHeight, barWidth, bar.currentHeight, 3);
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  useEffect(() => {
    startVisualizer();
    
    // Handle container resize
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = canvasRef.current.offsetWidth;
        canvasRef.current.height = canvasRef.current.offsetHeight;
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isPlaying]);

  // --- CHAT SUBMIT ---
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const userAlias = currentUser ? (currentUser.displayName || currentUser.username) : "Anonymous Listener";

    const msg: ChatMessage = {
      id: `user-${Date.now()}`,
      user: userAlias,
      text: newMessage.trim(),
      timestamp: timeStr,
      avatar: currentUser?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80"
    };

    setChatMessages(prev => [...prev, msg]);
    setNewMessage("");

    // Simulate DJ or System reply occasionally
    setTimeout(() => {
      if (Math.random() < 0.4) {
        const djReplies = [
          `Hey @${userAlias}, glad you are rocking out with us! 🤘`,
          "Awesome message! Thanks for tuning in!",
          `Shoutout to @${userAlias} listening live on SoundStreamy Radio!`,
          "Tune in tonight for the live request block!"
        ];
        const activeDJs = djs.filter(d => d.active).map(d => d.name);
        const replier = activeDJs.length > 0 ? `[DJ] ${activeDJs[0]}` : "Station Host";
        
        setChatMessages(prev => [
          ...prev,
          {
            id: `reply-${Date.now()}`,
            user: replier,
            text: djReplies[Math.floor(Math.random() * djReplies.length)],
            timestamp: timeStr,
            avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
          }
        ]);
      }
    }, 1500);
  };

  // --- ADMIN ACTIONS ---
  const handleToggleSongApproval = (songId: string) => {
    setApprovedSongIds(prev => {
      if (prev.includes(songId)) {
        // Must keep at least 1 song approved
        if (prev.length <= 1) {
          alert("At least one song must be approved for the radio automation system.");
          return prev;
        }
        return prev.filter(id => id !== songId);
      } else {
        return [...prev, songId];
      }
    });
  };

  const handleUpdateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = form.elements.namedItem("announcementText") as HTMLInputElement;
    if (input && input.value.trim()) {
      setAnnouncement(input.value.trim());
      alert("Radio broadcast announcement ticker updated successfully!");
    }
  };

  const handleAddDJ = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const nameInput = form.elements.namedItem("djName") as HTMLInputElement;
    const bioInput = form.elements.namedItem("djBio") as HTMLInputElement;
    if (nameInput && nameInput.value.trim()) {
      const newDJ: DJ = {
        id: `dj-${Date.now()}`,
        name: nameInput.value.trim(),
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
        bio: bioInput ? bioInput.value.trim() : "SoundStreamy Resident DJ.",
        active: true
      };
      setDjs(prev => [...prev, newDJ]);
      nameInput.value = "";
      if (bioInput) bioInput.value = "";
      alert("New Resident DJ onboarded successfully!");
    }
  };

  const handleToggleDJActive = (djId: string) => {
    setDjs(prev => prev.map(d => d.id === djId ? { ...d, active: !d.active } : d));
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 font-sans">
      
      {/* 24/7 Neon Announcement Banner */}
      <div className="relative bg-[#18181b] border border-violet-500/20 rounded-2xl p-3 px-4 flex items-center gap-3 overflow-hidden shadow-lg shadow-violet-900/5">
        <div className="absolute top-0 left-0 w-1 h-full bg-violet-500" />
        <div className="flex-shrink-0 bg-violet-500/10 text-violet-400 p-1.5 rounded-lg border border-violet-500/15">
          <Radio className="w-4 h-4 animate-pulse" />
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="whitespace-nowrap inline-block animate-[marquee_25s_linear_infinite] text-xs font-medium text-zinc-300">
            {announcement}
          </div>
        </div>
      </div>

      {/* Main Container Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Radio Core Player, Stations & Visualizer */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Main Glassmorphic Deck */}
          <div className="relative bg-[#161619] border border-white/5 rounded-3xl p-6 md:p-8 overflow-hidden shadow-2xl">
            {/* Ambient Background Aura */}
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-violet-600/10 rounded-full filter blur-3xl pointer-events-none animate-pulse" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-pink-600/5 rounded-full filter blur-3xl pointer-events-none animate-pulse" />

            <div className="relative z-10 space-y-6">
              
              {/* Deck Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-full text-[10px] font-bold text-red-400 uppercase tracking-widest animate-pulse">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  Live Broadcast
                </div>
                
                <div className="flex items-center gap-4 text-xs text-zinc-400 font-medium">
                  <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                    <Users className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{listeners} Tuning In</span>
                  </div>
                  <div className="hidden sm:block bg-zinc-800/40 text-zinc-400 px-3 py-1.5 rounded-full border border-white/5">
                    Hi-Fi Stereo (320kbps)
                  </div>
                </div>
              </div>

              {/* Now Playing Visual Hub */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                
                {/* Artwork Center */}
                <div className="sm:col-span-4 flex justify-center">
                  <div className="relative group w-44 h-44 sm:w-40 sm:h-40 md:w-44 md:h-44 flex-shrink-0">
                    {/* Glowing Backshadow */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-violet-600 to-pink-500 rounded-full filter blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
                    
                    {/* Vinyl Record */}
                    <div className={`relative w-full h-full rounded-full bg-black border-4 border-zinc-800 flex items-center justify-center overflow-hidden shadow-2xl transition-all duration-700 ${isPlaying ? "animate-[spin_10s_linear_infinite]" : ""}`}>
                      <img 
                        src={currentRadioSong?.coverUrl || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=400&q=80"} 
                        alt={currentRadioSong?.title || "SoundStreamy Station"} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover rounded-full"
                      />
                      {/* Vinyl Spindle Center Hole */}
                      <div className="absolute w-8 h-8 bg-[#161619] border border-zinc-700 rounded-full flex items-center justify-center">
                        <div className="w-2.5 h-2.5 bg-zinc-800 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Track Metadata and Visualizer */}
                <div className="sm:col-span-8 text-center sm:text-left space-y-4">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-violet-400">Now Broadcasting</p>
                    <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight line-clamp-1">
                      {currentRadioSong?.title || "Connecting to Airwaves..."}
                    </h2>
                    <p className="text-sm font-medium text-zinc-400">
                      {currentRadioSong?.artistName || "SoundStreamy Automation"}
                    </p>
                  </div>

                  {/* Frequency Visualizer Canvas */}
                  <div className="h-14 w-full bg-black/30 border border-white/5 rounded-xl overflow-hidden p-2">
                    <canvas ref={canvasRef} className="w-full h-full" />
                  </div>
                </div>

              </div>

              {/* Master Control Deck Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/5">
                
                {/* Play / Pause */}
                <div className="flex items-center gap-3">
                  {isPlaying ? (
                    <button 
                      onClick={handlePauseRadio}
                      className="w-14 h-14 bg-white text-black hover:bg-zinc-200 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer border-none"
                    >
                      <Pause className="w-6 h-6 fill-black" />
                    </button>
                  ) : (
                    <button 
                      onClick={handlePlayRadio}
                      className="w-14 h-14 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-violet-500/20 hover:from-violet-600 hover:to-pink-600 transition-transform hover:scale-105 active:scale-95 cursor-pointer border-none"
                    >
                      <Play className="w-6 h-6 fill-white ml-1" />
                    </button>
                  )}
                  
                  <div className="text-left">
                    <p className="text-xs font-semibold text-white">
                      {isPlaying ? "STATION STREAMING LIVE" : "STATION MUTED / PAUSED"}
                    </p>
                    <p className="text-[10px] text-zinc-500 font-mono">
                      {isPlaying ? "ACTIVE BROADCASTING" : "CLICK PLAY TO LISTEN"}
                    </p>
                  </div>
                </div>

                {/* Volume slider */}
                <div className="flex items-center gap-2 w-full sm:w-auto min-w-[150px] bg-black/20 p-2 px-3 rounded-xl border border-white/5">
                  <button 
                    onClick={handleToggleMute}
                    className="text-zinc-400 hover:text-white transition-colors border-none bg-transparent cursor-pointer"
                  >
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input 
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                  />
                </div>

              </div>

            </div>
          </div>

          {/* Up Next / Queue Tracklist */}
          <div className="bg-[#161619] border border-white/5 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-violet-400" />
                Upcoming in Rotation
              </h3>
              <span className="text-[10px] bg-white/5 border border-white/5 px-2 py-1 rounded text-zinc-400 uppercase font-mono">
                Auto DJ Queue
              </span>
            </div>

            <div className="space-y-2.5">
              {radioQueue.map((song, idx) => (
                <div 
                  key={song.id || idx}
                  className="flex items-center gap-3.5 bg-black/20 hover:bg-black/40 border border-white/5 p-2 px-3.5 rounded-2xl transition-all"
                >
                  <div className="text-xs font-bold text-zinc-500 font-mono w-4">
                    #{idx + 1}
                  </div>
                  <img 
                    src={song.coverUrl || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=80&q=80"} 
                    alt={song.title} 
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 object-cover rounded-xl"
                  />
                  <div className="flex-1 min-w-0 text-left">
                    <h4 className="text-xs font-bold text-zinc-200 truncate">{song.title}</h4>
                    <p className="text-[10px] text-zinc-500 truncate">{song.artistName}</p>
                  </div>
                  <div className="text-[10px] font-medium bg-violet-500/10 border border-violet-500/15 text-violet-400 px-2.5 py-1 rounded-full">
                    {song.genre || "Music"}
                  </div>
                </div>
              ))}
              
              {radioQueue.length === 0 && (
                <div className="text-center py-6 text-zinc-500 text-xs font-medium">
                  Scanning SoundStreamy database to populate live rotation queue...
                </div>
              )}
            </div>
          </div>

          {/* Featured Radio Stations Grid */}
          <div className="space-y-4">
            <div className="text-left">
              <h3 className="text-md font-bold tracking-tight text-white flex items-center gap-2">
                <Disc className="w-5 h-5 text-violet-400" />
                Explore Radio Stations
              </h3>
              <p className="text-xs text-zinc-400">Select a themed broadcast frequency to instantly adjust live automation rules</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stations.map((station) => {
                const StationIcon = station.icon;
                const isSelected = activeStation.id === station.id;
                return (
                  <button
                    key={station.id}
                    onClick={() => {
                      setActiveStation(station);
                    }}
                    className={`relative overflow-hidden text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected 
                        ? "bg-[#1d1b26] border-violet-500 shadow-lg shadow-violet-950/20" 
                        : "bg-[#161619] border-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className="flex items-start gap-3.5 relative z-10">
                      <div className={`p-2.5 rounded-xl bg-gradient-to-tr ${station.color} text-white shadow-md`}>
                        <StationIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                          {station.name}
                          {isSelected && (
                            <span className="w-2 h-2 bg-violet-500 rounded-full animate-ping" />
                          )}
                        </h4>
                        <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{station.desc}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="border-b border-white/5 flex gap-6 pb-2">
            <button
              onClick={() => setActiveTab("player")}
              className={`text-xs uppercase tracking-widest font-bold pb-2 border-b-2 transition-all cursor-pointer border-none bg-transparent ${
                activeTab === "player" ? "text-white border-violet-500" : "text-zinc-500 border-transparent hover:text-zinc-300"
              }`}
            >
              Show Schedule
            </button>
            <button
              onClick={() => setActiveTab("about")}
              className={`text-xs uppercase tracking-widest font-bold pb-2 border-b-2 transition-all cursor-pointer border-none bg-transparent ${
                activeTab === "about" ? "text-white border-violet-500" : "text-zinc-500 border-transparent hover:text-zinc-300"
              }`}
            >
              About Station
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab("admin")}
                className={`text-xs uppercase tracking-widest font-bold pb-2 border-b-2 transition-all cursor-pointer border-none bg-transparent flex items-center gap-1 ${
                  activeTab === "admin" ? "text-violet-400 border-violet-500" : "text-zinc-500 border-transparent hover:text-zinc-300"
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                Admin Controls
              </button>
            )}
          </div>

          {/* Tab Area: Schedule */}
          {activeTab === "player" && (
            <div className="bg-[#161619] border border-white/5 rounded-3xl p-6 text-left space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-violet-400" />
                <h4 className="font-bold text-white">Daily Show Schedule</h4>
              </div>
              <div className="relative border-l border-zinc-800 ml-3.5 pl-5 space-y-6">
                {schedule.map((show) => (
                  <div key={show.id} className="relative">
                    {/* Time node */}
                    <div className="absolute -left-[27px] top-1 w-3 h-3 bg-violet-500 rounded-full border border-[#161619] shadow shadow-violet-500" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                          {show.time}
                        </span>
                        <span className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest">
                          {show.genre}
                        </span>
                      </div>
                      <h5 className="text-sm font-bold text-zinc-100">{show.title}</h5>
                      <p className="text-xs text-zinc-500">Scheduled DJ: <span className="text-zinc-300 font-medium">{show.dj}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab Area: About */}
          {activeTab === "about" && (
            <div className="bg-[#161619] border border-white/5 rounded-3xl p-6 text-left space-y-6">
              <div className="space-y-4">
                <h4 className="text-md font-black text-white uppercase tracking-tight">About SoundStreamy Radio</h4>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                  Welcome to SoundStreamy Radio — your destination for nonstop music, fresh discoveries, and the sounds that connect people around the world.
                </p>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  SoundStreamy Radio brings you a 24/7 music experience featuring the latest hits, rising artists, timeless favorites, and carefully selected playlists across different genres. Whether you are working, relaxing, discovering new artists, or simply enjoying great music, SoundStreamy Radio keeps the soundtrack going.
                </p>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  Our mission is to create a global music destination where listeners can discover new sounds, support talented artists, and enjoy a seamless radio experience anytime, anywhere.
                </p>
              </div>

              <div className="border-t border-white/5 pt-4 space-y-4">
                <h5 className="text-xs font-black text-white uppercase tracking-widest">What You Can Expect</h5>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3 bg-black/10 p-3 rounded-2xl border border-white/5">
                    <span className="text-sm">🎵</span>
                    <div>
                      <h6 className="text-xs font-extrabold text-white">Nonstop Music</h6>
                      <p className="text-[10px] text-zinc-400 leading-relaxed">Enjoy continuous music with handpicked playlists and rotating selections.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-black/10 p-3 rounded-2xl border border-white/5">
                    <span className="text-sm">🌟</span>
                    <div>
                      <h6 className="text-xs font-extrabold text-white">Discover New Artists</h6>
                      <p className="text-[10px] text-zinc-400 leading-relaxed">Find emerging talent and fresh sounds from independent and established artists.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-black/10 p-3 rounded-2xl border border-white/5">
                    <span className="text-sm">🔥</span>
                    <div>
                      <h6 className="text-xs font-extrabold text-white">Trending Tracks</h6>
                      <p className="text-[10px] text-zinc-400 leading-relaxed">Stay connected with popular songs and the latest music movements.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-black/10 p-3 rounded-2xl border border-white/5">
                    <span className="text-sm">🎤</span>
                    <div>
                      <h6 className="text-xs font-extrabold text-white">Artist Features</h6>
                      <p className="text-[10px] text-zinc-400 leading-relaxed">Discover stories, releases, and special features from artists around the world.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-black/10 p-3 rounded-2xl border border-white/5">
                    <span className="text-sm">📻</span>
                    <div>
                      <h6 className="text-xs font-extrabold text-white">Live Radio Experience</h6>
                      <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">Enjoy a modern digital radio station with scheduled shows, special events, and future live DJ sessions.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-4 text-center">
                <p className="text-xs text-zinc-400 italic">
                  SoundStreamy Radio is more than a station — it is a community built around music, creativity, and discovery.
                </p>
                <p className="text-xs text-violet-400 font-extrabold uppercase tracking-widest mt-2 animate-pulse">
                  Press play and let SoundStreamy Radio be your everyday soundtrack.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Right Side: Radio Chatroom & DJ Showcase */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Live Chat Component */}
          <div className="bg-[#161619] border border-white/5 rounded-3xl p-5 flex flex-col h-[520px] shadow-xl text-left">
            
            {/* Chat Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3.5">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Live Chatroom</h3>
              </div>
              <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded text-[9px] font-bold text-red-400 uppercase tracking-widest">
                <span className="w-1 h-1 bg-red-500 rounded-full" />
                Live
              </div>
            </div>

            {/* Chat Body scrolling area */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex items-start gap-2.5 ${msg.isSystem ? "bg-white/5 p-2 rounded-xl border border-white/5 text-center block" : ""}`}>
                  {msg.isSystem ? (
                    <p className="text-[10px] font-semibold text-zinc-400 w-full">{msg.text}</p>
                  ) : (
                    <>
                      <img 
                        src={msg.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80"} 
                        alt={msg.user} 
                        className="w-7.5 h-7.5 rounded-full object-cover border border-white/10"
                      />
                      <div className="flex-1 space-y-0.5 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className={`font-bold truncate text-[11px] ${msg.user.startsWith("[DJ]") ? "text-violet-400" : "text-zinc-300"}`}>
                            {msg.user}
                          </span>
                          <span className="text-[9px] text-zinc-500 font-mono flex-shrink-0">{msg.timestamp}</span>
                        </div>
                        <p className="text-zinc-400 leading-relaxed break-words">{msg.text}</p>
                      </div>
                    </>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChat} className="mt-4 pt-3 border-t border-white/5 flex gap-2">
              <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={currentUser ? "Say something in chat..." : "Log in to post a message..."}
                disabled={!currentUser}
                className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 placeholder-zinc-500"
              />
              <button 
                type="submit"
                disabled={!currentUser || !newMessage.trim()}
                className="bg-violet-600 hover:bg-violet-500 text-white p-2 rounded-xl transition-all flex items-center justify-center disabled:opacity-40 disabled:hover:bg-violet-600 cursor-pointer border-none"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

          </div>

          {/* Active DJs List Showcase */}
          <div className="bg-[#161619] border border-white/5 rounded-3xl p-5 text-left space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-violet-400" />
              Resident DJs & Hosts
            </h3>
            
            <div className="space-y-3">
              {djs.map((dj) => (
                <div key={dj.id} className="flex items-center gap-3 bg-black/10 p-2 rounded-2xl border border-white/5">
                  <img 
                    src={dj.avatar} 
                    alt={dj.name} 
                    className="w-10 h-10 object-cover rounded-xl"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-zinc-200">{dj.name}</h4>
                      {dj.active ? (
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 px-1.5 py-0.5 rounded font-bold font-mono">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="text-[9px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded font-semibold font-mono">
                          OFF AIR
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">{dj.bio}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Admin Dashboard Tab (Toggleable tab content) */}
      {isAdmin && activeTab === "admin" && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="bg-[#161619] border border-violet-500/30 rounded-3xl p-6 md:p-8 text-left space-y-8 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-pink-500 to-rose-500" />
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-violet-400" />
                RADIO BROADCAST MANAGEMENT
              </h2>
              <p className="text-xs text-zinc-400">Manage 24/7 rotation playlist rules, DJs, schedule, and view listener statistics</p>
            </div>
            <div className="bg-violet-500/15 text-violet-400 text-xs font-bold border border-violet-500/20 px-3.5 py-1.5 rounded-xl uppercase tracking-wider font-mono">
              Admin Portal
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Admin Left Column: Automation Catalog Approval */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Rotation Catalog Approval ({approvedSongIds.length}/{songs.length} Approved)
                </h4>
                <p className="text-[10px] text-zinc-400">Only approved songs play in live automation</p>
              </div>

              <div className="bg-black/30 border border-white/5 rounded-2xl p-4 max-h-[300px] overflow-y-auto space-y-2">
                {songs.map((song) => {
                  const isApproved = approvedSongIds.includes(song.id);
                  return (
                    <div 
                      key={song.id}
                      className="flex items-center justify-between bg-black/10 hover:bg-black/20 p-2 rounded-xl border border-white/5 transition-all text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img 
                          src={song.coverUrl || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=80&q=80"} 
                          alt={song.title} 
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 object-cover rounded-lg"
                        />
                        <div className="text-left min-w-0">
                          <p className="font-bold text-zinc-200 truncate">{song.title}</p>
                          <p className="text-[10px] text-zinc-500 truncate">{song.artistName}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleSongApproval(song.id)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer border-none ${
                          isApproved 
                            ? "bg-violet-500/20 text-violet-400 border border-violet-500/20" 
                            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        }`}
                      >
                        {isApproved ? "Approved" : "Excluded"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Admin Right Column: Update Announcement, DJs Onboarding */}
            <div className="space-y-6">
              
              {/* Announcement ticker update */}
              <div className="space-y-3 bg-black/20 p-4 border border-white/5 rounded-2xl">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-violet-400" />
                  Live Announcement Ticker
                </h4>
                <form onSubmit={handleUpdateAnnouncement} className="flex gap-2">
                  <input 
                    name="announcementText"
                    type="text"
                    placeholder="Enter station wide scrolling announcement text..."
                    className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 placeholder-zinc-500"
                  />
                  <button 
                    type="submit"
                    className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer border-none"
                  >
                    Broadcast
                  </button>
                </form>
              </div>

              {/* Onboard Resident DJ */}
              <div className="space-y-3 bg-black/20 p-4 border border-white/5 rounded-2xl">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-violet-400" />
                  Onboard Resident DJ / Host
                </h4>
                <form onSubmit={handleAddDJ} className="space-y-3">
                  <input 
                    name="djName"
                    type="text"
                    placeholder="DJ / Host Stage Name"
                    required
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 placeholder-zinc-500"
                  />
                  <input 
                    name="djBio"
                    type="text"
                    placeholder="Short description/biography..."
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 placeholder-zinc-500"
                  />
                  <button 
                    type="submit"
                    className="w-full bg-gradient-to-r from-violet-500 to-pink-500 text-white py-2 rounded-xl text-xs font-bold hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer border-none"
                  >
                    Add Host Profile
                  </button>
                </form>
              </div>

            </div>

          </div>

          {/* Listener Analytics Charts */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-violet-400" />
              Live Listener Analytics (Last 24 Hours)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Listener volume area chart */}
              <div className="bg-black/30 border border-white/5 p-4 rounded-2xl">
                <h5 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Audience Engagement</h5>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData}>
                      <defs>
                        <linearGradient id="colorListeners" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="hour" stroke="#71717a" fontSize={9} />
                      <YAxis stroke="#71717a" fontSize={9} />
                      <Tooltip contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", fontSize: "11px", color: "#fff" }} />
                      <Area type="monotone" dataKey="listeners" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorListeners)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Station performance bar chart */}
              <div className="bg-black/30 border border-white/5 p-4 rounded-2xl">
                <h5 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Station Popularity Index</h5>
                <div className="h-44 w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: "Hits", count: 420 },
                      { name: "New", count: 280 },
                      { name: "HipHop", count: 350 },
                      { name: "Pop", count: 310 },
                      { name: "Afrobeats", count: 240 },
                      { name: "Chill", count: 390 }
                    ]}>
                      <XAxis dataKey="name" stroke="#71717a" fontSize={9} />
                      <YAxis stroke="#71717a" fontSize={9} />
                      <Tooltip contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", fontSize: "11px" }} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        <Cell fill="#ec4899" />
                        <Cell fill="#8b5cf6" />
                        <Cell fill="#f59e0b" />
                        <Cell fill="#10b981" />
                        <Cell fill="#06b6d4" />
                        <Cell fill="#6366f1" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </div>

        </motion.div>
      )}

    </div>
  );
}
