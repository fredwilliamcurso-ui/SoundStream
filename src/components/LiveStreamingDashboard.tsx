import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Radio, 
  Video, 
  Tv, 
  Mic, 
  Users, 
  Eye, 
  Heart, 
  Share2, 
  UserPlus, 
  Send, 
  Smile, 
  Calendar, 
  Plus, 
  Clock, 
  Sparkles, 
  TrendingUp, 
  Check, 
  Shield, 
  Volume2, 
  Play, 
  StopCircle, 
  FileEdit, 
  Trash2, 
  Pin, 
  VolumeX, 
  Ban, 
  AlertOctagon, 
  BarChart2, 
  Award, 
  Gift, 
  Coins,
  DollarSign, 
  Grid,
  Lock,
  Unlock,
  User as UserIcon,
  MessageSquare,
  AlertTriangle,
  Flame,
  Activity,
  X,
  Settings,
  MicOff,
  UserCheck,
  UserMinus,
  Award as RankingIcon,
  Filter,
  Globe,
  Home,
  Power,
  Maximize2,
  Minimize2,
  LogOut,
  ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  collection, 
  doc, 
  setDoc as firestoreSetDoc, 
  addDoc as firestoreAddDoc, 
  updateDoc as firestoreUpdateDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  increment, 
  arrayUnion, 
  arrayRemove,
  getDoc
} from "firebase/firestore";

// Sanitize Firestore helper
function isPlainObject(value: any): boolean {
  if (typeof value !== "object" || value === null) return false;
  if ('_methodName' in value || '_toString' in value || 'firestore' in value || ('id' in value && 'path' in value) || (value.constructor && value.constructor.name !== "Object")) return false;
  const proto = Object.getPrototypeOf(value);
  if (proto === null) return true;
  const ctor = Object.prototype.hasOwnProperty.call(proto, "constructor") && proto.constructor;
  return typeof ctor === "function" && ctor instanceof ctor && Function.prototype.toString.call(ctor) === Function.prototype.toString.call(Object);
}

function sanitizeFirestoreData<T>(data: T): T {
  if (data === null || data === undefined) return null as any;
  if (Array.isArray(data)) return data.map(item => sanitizeFirestoreData(item)) as any;
  if (!isPlainObject(data)) return data;
  const clean: any = {};
  Object.keys(data as any).forEach((key) => {
    const val = (data as any)[key];
    if (val !== undefined) clean[key] = sanitizeFirestoreData(val);
  });
  return clean;
}

const setDoc = async (documentRef: any, data: any, options?: any) => {
  return await firestoreSetDoc(documentRef, sanitizeFirestoreData(data), options);
};

const addDoc = async (reference: any, data: any) => {
  return await firestoreAddDoc(reference, sanitizeFirestoreData(data));
};

const updateDoc = async (reference: any, ...args: any[]) => {
  if (args.length === 1) {
    return await firestoreUpdateDoc(reference, sanitizeFirestoreData(args[0]));
  } else {
    const sanitizedArgs = args.map(arg => typeof arg === "object" && arg !== null ? sanitizeFirestoreData(arg) : arg);
    return await (firestoreUpdateDoc as any)(reference, ...sanitizedArgs);
  }
};

import { db, auth } from "../lib/firebase";
import { User, Artist, LiveStream, LiveChatMessage } from "../types";
import { getOrCreateWallet, sendGift } from "../lib/coinsService";
import { Wallet, DEFAULT_GIFTS } from "../types/coins";
import { createBattleInvite, declineBattleInvite, acceptBattleInvite, sendBattleGift, endBattle } from "../lib/battleService";
import GiftStoreModal from "./GiftStoreModal";
import GiftingOverlay from "./GiftingOverlay";
import SoundStreamLive3DRoom, { isWebGLAvailable } from "./SoundStreamLive3DRoom";

interface LiveStreamingDashboardProps {
  currentUser: User | null;
  artists: Artist[];
  allUsers?: User[];
  followingArtists: string[];
  onFollowToggle: (artistId: string) => Promise<void>;
  onSelectSong: (song: any) => void;
  setCurrentTab: (tab: string) => void;
  songs?: any[];
}

interface Seat {
  id: string; // seat_1 to seat_8
  userId: string | null;
  username: string;
  photoURL: string;
  role: string;
  isMuted: boolean;
  isSpeaking: boolean;
  isLocked?: boolean;
  userLevel?: number;
  isVIP?: boolean;
  coins?: string;
  occupied?: boolean;
  number?: number;
  avatar?: string;
  uid?: string | null;
  panelName?: string;
}

interface JoinRequest {
  id: string;
  userId: string;
  username: string;
  photoURL: string;
  seatId?: string;
  createdAt: string;
}

const THUMBNAIL_PRESETS = [
  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80",
  "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80",
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80",
  "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&q=80",
  "https://images.unsplash.com/photo-1516280440614-37939bbacd6a?w=500&q=80"
];

// Helper to simulate virtual stream feeds
const createVirtualStream = (isVideo: boolean): MediaStream => {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext("2d");
  let angle = 0;
  
  const draw = () => {
    if (!ctx) return;
    ctx.fillStyle = "#0c0714";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Abstract musical ripple waves
    const maxRings = 4;
    for (let i = 0; i < maxRings; i++) {
      const radius = ((angle * 12 + i * 60) % 180) + 10;
      const alpha = 1 - (radius / 180);
      ctx.strokeStyle = `rgba(236, 72, 153, ${alpha * 0.4})`; // Pink
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Draw micro soundwave bars
    const barWidth = 6;
    const barSpacing = 4;
    const totalBars = 30;
    const startX = (canvas.width - (totalBars * (barWidth + barSpacing))) / 2;
    
    ctx.fillStyle = "#6366f1"; // Indigo
    for (let i = 0; i < totalBars; i++) {
      const height = Math.abs(Math.sin(angle + i * 0.15)) * 110 + 10;
      ctx.fillRect(startX + i * (barWidth + barSpacing), canvas.height - height - 40, barWidth, height);
    }
    
    angle += 0.05;
    requestAnimationFrame(draw);
  };
  
  setTimeout(() => draw(), 50);
  
  try {
    const canvasStream = (canvas as any).captureStream(30);
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const dest = audioCtx.createMediaStreamDestination();
    const osc = audioCtx.createOscillator();
    osc.frequency.setValueAtTime(110, audioCtx.currentTime);
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.001, audioCtx.currentTime);
    osc.connect(gainNode);
    gainNode.connect(dest);
    osc.start();
    
    return new MediaStream([...canvasStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
  } catch (err) {
    return (canvas as any).captureStream(30);
  }
};

const MOCK_STAGE_PROFILES: { [key: number]: { username: string; photoURL: string; coins: string; isMuted: boolean; isSpeaking: boolean } } = {
  1: { username: "Fredo", photoURL: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150", coins: "45.2K", isMuted: false, isSpeaking: true },
  2: { username: "Stella", photoURL: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150", coins: "23.4K", isMuted: true, isSpeaking: false },
  3: { username: "Jay", photoURL: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150", coins: "18.7K", isMuted: false, isSpeaking: true },
  4: { username: "Zara", photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150", coins: "17.3K", isMuted: true, isSpeaking: false },
  6: { username: "Mike", photoURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150", coins: "16.8K", isMuted: true, isSpeaking: false },
  7: { username: "Lina", photoURL: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150", coins: "15.2K", isMuted: true, isSpeaking: false },
  8: { username: "Kenny", photoURL: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150", coins: "14.1K", isMuted: false, isSpeaking: true },
  9: { username: "Maya", photoURL: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150", coins: "13.7K", isMuted: true, isSpeaking: false },
  11: { username: "Chris", photoURL: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150", coins: "12.5K", isMuted: true, isSpeaking: false },
  12: { username: "Nina", photoURL: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150", coins: "11.3K", isMuted: true, isSpeaking: false },
  13: { username: "David", photoURL: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150", coins: "10.8K", isMuted: false, isSpeaking: true },
  14: { username: "Rose", photoURL: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150", coins: "9.6K", isMuted: true, isSpeaking: false },
  16: { username: "Sam", photoURL: "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=150", coins: "8.7K", isMuted: true, isSpeaking: false },
  17: { username: "Joy", photoURL: "https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?w=150", coins: "8.1K", isMuted: true, isSpeaking: false },
  18: { username: "Alex", photoURL: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150", coins: "7.4K", isMuted: false, isSpeaking: true },
  19: { username: "Tina", photoURL: "https://images.unsplash.com/photo-1554151228-14d9def656e4?w=150", coins: "6.8K", isMuted: true, isSpeaking: false },
  21: { username: "Leo", photoURL: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150", coins: "6.2K", isMuted: true, isSpeaking: false },
  22: { username: "Emma", photoURL: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=150", coins: "5.8K", isMuted: true, isSpeaking: false },
  23: { username: "Ben", photoURL: "https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?w=150", coins: "5.4K", isMuted: true, isSpeaking: false },
  24: { username: "Yara", photoURL: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150", coins: "5.1K", isMuted: true, isSpeaking: false }
};

export default function LiveStreamingDashboard({
  currentUser: propsCurrentUser,
  artists,
  followingArtists,
  onFollowToggle,
  onSelectSong,
  setCurrentTab,
  songs
}: LiveStreamingDashboardProps) {
  // Developer sandbox mode account switcher states
  const [customUserOverride, setCustomUserOverride] = useState<any>(null);
  const currentUser = customUserOverride || propsCurrentUser;

  // Discovery Tabs & Filter states
  const [activeLayout, setActiveLayout] = useState<"audio" | "video">("audio");
  const [topNavTab, setTopNavTab] = useState<"related" | "home" | "video" | "game">("home");
  const [countryFilter, setCountryFilter] = useState<string>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("Popular");
  const [showFiltersPopover, setShowFiltersPopover] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Audio Stream Profile identity states
  const [currentUserAudioProfile, setCurrentUserAudioProfile] = useState<any>(null);
  const [showEditAudioProfileModal, setShowEditAudioProfileModal] = useState(false);
  const [showRoomSettingsModal, setShowRoomSettingsModal] = useState(false);
  const [showHostProfileMenu, setShowHostProfileMenu] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>("stats");
  const [roomSettingsTab, setRoomSettingsTab] = useState<"layout" | "pk" | "music" | "mods" | "audio" | "management">("layout");

  // Streams database sync
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [activeStream, setActiveStream] = useState<LiveStream | null>(null);
  const roomId = activeStream?.id || "";
  const [isHosting, setIsHosting] = useState(false);
  const [hostEndedScreen, setHostEndedScreen] = useState(false);
  
  // Audio Seat states
  const [seats, setSeats] = useState<Seat[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [giftingReceiver, setGiftingReceiver] = useState<{ id: string; name: string; photo: string } | null>(null);
  const [activeSeatMenu, setActiveSeatMenu] = useState<{ seat: Seat; x: number; y: number } | null>(null);
  const [viewingProfileUser, setViewingProfileUser] = useState<{ uid: string; username: string; photoURL: string; level?: number; isVIP?: boolean; role?: string; bio?: string } | null>(null);
  const [openMicEnabled, setOpenMicEnabled] = useState(false);
  const [isFollowed, setIsFollowed] = useState(false);
  const [roomTheme, setRoomTheme] = useState<"galaxy" | "concert" | "lounge" | "club" | "sky">("galaxy");
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [enable3D, setEnable3D] = useState<boolean>(() => isWebGLAvailable());
  const [showFredIdentityMenu, setShowFredIdentityMenu] = useState(false);
  const [soundPreset, setSoundPreset] = useState("Studio");
  const [micGain, setMicGain] = useState(85);
  const [streamQuality, setStreamQuality] = useState("Hi-Fi 320kbps");

  // Interactive states for Fred ID: STREAM Command Hub
  const [hubTab, setHubTab] = useState<"info" | "earn" | "games" | "backpack" | "arena">("info");
  const [hubUserLevel, setHubUserLevel] = useState<number>(7);
  const [hubUserXp, setHubUserXp] = useState<number>(1240);
  const [hubHostLevel, setHubHostLevel] = useState<number>(12);
  const [hubHostXp, setHubHostXp] = useState<number>(7800);
  const [hubNobleRank, setHubNobleRank] = useState<string>("Duke 👑");
  const [hubAgency, setHubAgency] = useState<string>("SoundStream Elite 💎");
  const [hubDailyCheckedIn, setHubDailyCheckedIn] = useState<boolean>(false);
  const [hubCheckInStreak, setHubCheckInStreak] = useState<number>(5);
  const [hubWithdrawalWallet, setHubWithdrawalWallet] = useState<number>(1250.00);
  const [withdrawMethod, setWithdrawMethod] = useState<"paypal" | "bank" | "stripe" | "payoneer">("paypal");
  const [withdrawEmail, setWithdrawEmail] = useState<string>("");
  const [withdrawBankName, setWithdrawBankName] = useState<string>("");
  const [withdrawAccountNum, setWithdrawAccountNum] = useState<string>("");
  const [withdrawSwift, setWithdrawSwift] = useState<string>("");
  const [withdrawCardNum, setWithdrawCardNum] = useState<string>("");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("100.00");
  const [showWithdrawalForm, setShowWithdrawalForm] = useState<boolean>(false);
  const [withdrawalHistory, setWithdrawalHistory] = useState<any[]>([]);
  const [hubInvitationCount, setHubInvitationCount] = useState<number>(12);
  const [hubInvitationRewards, setHubInvitationRewards] = useState<number>(240);
  const [hubInviteCode, setHubInviteCode] = useState<string>("");
  const [hubFeedbackText, setHubFeedbackText] = useState<string>("");
  const [hubBackpackItems, setHubBackpackItems] = useState<any[]>([
    { id: "airship", name: "🚀 Entrance Airship", count: 2, desc: "Triggers spectacular 3D entrance animation" },
    { id: "key", name: "🔑 Lucky Treasure Key", count: 5, desc: "Used to unlock My Treasure Chest" },
    { id: "booster", name: "💖 Room Heart Booster", count: 3, desc: "Multiplies incoming heart reactions by 2x for 5 min" }
  ]);
  const [hubSpinState, setHubSpinState] = useState<{ isSpinning: boolean; message: string }>({ isSpinning: false, message: "" });
  const [hubChests, setHubChests] = useState<{ bronzeOpened: boolean; goldOpened: boolean }>({ bronzeOpened: false, goldOpened: false });
  const [hubShowToast, setHubShowToast] = useState<string>("");

  // Compact Social Gifting states
  const [showCompactGiftPanel, setShowCompactGiftPanel] = useState(false);
  const [compactGiftReceiver, setCompactGiftReceiver] = useState<{ id: string; name: string; photo: string } | null>(null);
  const [compactGiftCategory, setCompactGiftCategory] = useState<string>("All");

  // Voice features local ticker for smooth speaking wave simulation
  const [speakingTicker, setSpeakingTicker] = useState<number>(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setSpeakingTicker((prev) => prev + 1);
    }, 400);
    return () => clearInterval(timer);
  }, []);

  // ==========================================
  // 2026 PLATFORM LIVESTREAM ENGAGEMENT HUB
  // ==========================================
  const [activePrediction, setActivePrediction] = useState<any>({
    id: "pred_1",
    question: "Will Fred hit 5,000 Hearts within the next 2 minutes?",
    optionA: "YES, Hype is real! 🔥",
    optionB: "NO, too close! ⏳",
    optionAPool: 4250,
    optionBPool: 3100,
    timeLeft: 120,
    userChoice: null,
    userWager: 0
  });

  const [activeTrivia, setActiveTrivia] = useState<any>({
    question: "What is Fred the Rocker's ultimate favorite electric guitar scale?",
    options: ["24.75 inch (Gibson Style)", "25.5 inch (Fender Style)", "25.0 inch (PRS Style)", "27.0 inch (Baritone Style)"],
    correctIndex: 1,
    timeLeft: 45,
    rewardCoins: 75,
    answeredIndex: null,
    status: "active" // 'active' | 'won' | 'failed' | 'timeout'
  });

  const [redEnvelopes, setRedEnvelopes] = useState<any[]>([
    { id: "env_1", senderName: "Fred_Host", totalCoins: 1200, remainingClaims: 6, secondsLeft: 60 }
  ]);

  const [dailyQuests, setDailyQuests] = useState<any[]>([
    { id: "quest_1", label: "Spend 10 minutes interacting on the stream", progress: 2, target: 10, reward: 150, completed: false },
    { id: "quest_2", label: "Trigger 3 soundboard voice effects", progress: 0, target: 3, reward: 80, completed: false },
    { id: "quest_3", label: "Participate in a Live Prediction Bet", progress: 0, target: 1, reward: 120, completed: false }
  ]);

  const [soundboardItems] = useState<any[]>([
    { id: "airhorn", name: "Trumpet Airhorn", emoji: "📢", soundText: "📢 *BZZZZZZZ! HYPE AIRHORN!*" },
    { id: "laugh", name: "Crowd Laughing", emoji: "😂", soundText: "😂 *Hahaha! Crowd goes wild!*" },
    { id: "cheer", name: "Stadium Cheering", emoji: "👏", soundText: "👏 *WOOOO! Stadium Standing Ovation!*" },
    { id: "cricket", name: "Awkward Silence", emoji: "🦗", soundText: "🦗 *Crickets chirping...*" },
    { id: "bruh", name: "Bruh Sound Effect", emoji: "💀", soundText: "💀 *BRUH! Fail sound active!*" }
  ]);

  const [aiTTSVoice, setAiTTSVoice] = useState<string>("robot");
  const [ttsSpeechText, setTtsSpeechText] = useState<string>("");
  const [ttsHistory, setTtsHistory] = useState<any[]>([]);
  const [viewerCoinBalance, setViewerCoinBalance] = useState<number>(550); // live simulated coin balance
  const [cameraFilter, setCameraFilter] = useState<string>("brightness(1.4) contrast(1.05) saturate(1.1)");

  // PK Battle states
  const [activeBattle, setActiveBattle] = useState<any | null>(null);
  const [battleTimer, setBattleTimer] = useState<number>(300);
  const [battleInvites, setBattleInvites] = useState<any[]>([]);
  const [showPKPanel, setShowPKPanel] = useState(false);

  // Host Room Playlist & Music states
  const [roomPlaylist, setRoomPlaylist] = useState<any[]>([]);
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState<number>(-1);
  const [showMusicPlaylistPanel, setShowMusicPlaylistPanel] = useState(false);
  const [micVolume, setMicVolume] = useState<number>(80);
  const [musicVolume, setMusicVolume] = useState<number>(50);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Gifting / Hearts states
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; left: number; color: string }[]>([]);
  const [giftBanners, setGiftBanners] = useState<{ id: string; sender: string; gift: string; photo: string }[]>([]);

  // Room interaction tabs
  const [activeRoomTab, setActiveRoomTab] = useState<"all" | "room" | "chat">("all");
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [systemNotifications, setSystemNotifications] = useState<{ id: string; senderName: string; text: string }[]>([]);
  const shownSystemMsgIds = useRef<Set<string>>(new Set());

  // Soundstream Comments Section states
  const [selectedComment, setSelectedComment] = useState<LiveChatMessage | null>(null);
  const [chatSubFilter, setChatSubFilter] = useState<"all" | "host" | "stage" | "gifts">("all");
  const [micError, setMicError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const showSidebar = !!(activeStream && !isSidebarCollapsed && activeStream.type === "audio");

  const getSenderLevel = (senderId: string) => {
    if (!activeStream) return 1;
    if (senderId === activeStream.creatorId) return 45;
    const seat = seatsArray.find(s => s.userId === senderId);
    if (seat && seat.userLevel) return seat.userLevel;
    // deterministic level between 1 and 25 for visual richness
    let hash = 0;
    for (let i = 0; i < senderId.length; i++) {
      hash = senderId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % 24) + 1;
  };

  const getLevelBadgeStyle = (lvl: number) => {
    if (lvl >= 30) return "bg-gradient-to-r from-red-500 via-pink-500 to-amber-500 text-white font-black";
    if (lvl >= 15) return "bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold";
    if (lvl >= 10) return "bg-gradient-to-r from-purple-500 to-pink-500 text-white";
    if (lvl >= 5) return "bg-gradient-to-r from-blue-500 to-indigo-500 text-white";
    return "bg-gradient-to-r from-zinc-600 to-zinc-700 text-zinc-100";
  };

  const getSenderRoleBadge = (senderId: string) => {
    if (!activeStream) return null;
    if (senderId === activeStream.creatorId) {
      return { label: "Host", style: "bg-red-500/20 text-red-300 border border-red-500/30" };
    }
    const seat = seatsArray.find(s => s.userId === senderId);
    if (seat) {
      if (seat.role === "Co-Host") {
        return { label: "Co-Host", style: "bg-pink-500/20 text-pink-300 border border-pink-500/30" };
      }
      if (seat.isVIP) {
        return { label: "VIP", style: "bg-amber-500/20 text-amber-300 border border-amber-500/30" };
      }
      return { label: `Seat ${seat.id.replace("seat_", "")}`, style: "bg-purple-500/20 text-purple-300 border border-purple-500/30" };
    }
    let hash = 0;
    for (let i = 0; i < senderId.length; i++) {
      hash = senderId.charCodeAt(i) + ((hash << 5) - hash);
    }
    if (hash % 11 === 0) {
      return { label: "Elite", style: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30" };
    }
    if (hash % 7 === 0) {
      return { label: "Supporter", style: "bg-teal-500/20 text-teal-300 border border-teal-500/30" };
    }
    return null;
  };

  // Stream Creation Form
  const [isCreatingStream, setIsCreatingStream] = useState(false);
  const [streamTitle, setStreamTitle] = useState("");
  const [streamCategory, setStreamCategory] = useState("Music");
  const [streamType, setStreamType] = useState<"audio" | "video">("audio");
  const [streamPrivacy, setStreamPrivacy] = useState<"public" | "private">("public");
  const [thumbnailUrl, setThumbnailUrl] = useState(THUMBNAIL_PRESETS[0]);
  const [countryOfHost, setCountryOfHost] = useState("Nigeria");
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState("");

  // Media Stream
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);

  // Agora Voice Streaming Client & Track State
  const agoraClientRef = useRef<any>(null);
  const localAudioTrackRef = useRef<any>(null);
  const localVideoTrackRef = useRef<any>(null);
  const [agoraJoined, setAgoraJoined] = useState(false);
  const [agoraBroadcasting, setAgoraBroadcasting] = useState(false);
  const agoraQueueRef = useRef<Promise<any>>(Promise.resolve());

  // A helper to queue asynchronous Agora actions sequentially
  const queueAgoraAction = (label: string, action: () => Promise<any>) => {
    console.log(`[Agora Queue] Enqueueing action: ${label}`);
    agoraQueueRef.current = agoraQueueRef.current
      .then(async () => {
        console.log(`[Agora Queue] Running action: ${label}`);
        await action();
        console.log(`[Agora Queue] Finished action: ${label}`);
      })
      .catch((err) => {
        console.error(`[Agora Queue] Error in action [${label}]:`, err);
      });
  };

  // Subscribe to liveStreams in real-time
  useEffect(() => {
    const q = query(
      collection(db, "liveStreams"),
      where("status", "==", "live")
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const list: LiveStream[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as LiveStream);
      });
      setStreams(list);
    });
    return () => unsubscribe();
  }, []);

  // Listen to Active Stream Chat Messages
  useEffect(() => {
    if (!activeStream) {
      setChatMessages([]);
      return;
    }
    const q = query(
      collection(db, "liveStreams", activeStream.id, "chat"),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const list: LiveChatMessage[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as LiveChatMessage);
      });
      setChatMessages(list);
    });
    return () => unsubscribe();
  }, [activeStream]);

  // Handle auto-dismissing system notifications
  useEffect(() => {
    if (!chatMessages || chatMessages.length === 0) return;
    chatMessages.forEach((msg) => {
      const isSystem = msg.senderId === "system" || msg.senderName === "GIFT" || msg.text.includes("🎁") || msg.text.includes("sent a") || msg.text.includes("Reacted with") || msg.text.includes("liked") || msg.text.includes("shared");
      if (isSystem && !shownSystemMsgIds.current.has(msg.id)) {
        shownSystemMsgIds.current.add(msg.id);
        const newNotif = { id: msg.id, senderName: msg.senderName, text: msg.text };
        setSystemNotifications((prev) => [...prev, newNotif]);
        setTimeout(() => {
          setSystemNotifications((prev) => prev.filter((n) => n.id !== msg.id));
        }, 4000);
      }
    });
  }, [chatMessages]);

  // Unified background tick and events simulator for 2026 features
  useEffect(() => {
    if (!activeStream) return;

    let dwellTimer = 0;
    const interval = setInterval(() => {
      // 1. Prediction Tick
      setActivePrediction((prev: any) => {
        if (!prev || prev.timeLeft <= 0) {
          if (prev && prev.timeLeft === 0) {
            // Resolve prediction!
            const outcomes = ["A", "B"];
            const winningOutcome = outcomes[Math.floor(Math.random() * outcomes.length)];
            const outcomeName = winningOutcome === "A" ? prev.optionA : prev.optionB;
            const won = prev.userChoice === winningOutcome;
            const winnings = won ? Math.round(prev.userWager * 1.8) : 0;

            if (won) {
              setViewerCoinBalance(c => c + winnings);
              setHubShowToast(`🎉 Prediction Won! Resolved: ${outcomeName}. Gained ${winnings} coins!`);
            } else if (prev.userChoice) {
              setHubShowToast(`😔 Prediction Resolved: ${outcomeName}. Better luck next time!`);
            }

            // Push a chat message about the result
            const chatRef = collection(db, "liveStreams", activeStream.id, "chat");
            addDoc(chatRef, {
              id: `chat_pred_resolve_${Date.now()}`,
              streamId: activeStream.id,
              senderId: "system",
              senderName: "🔮 PREDICTION BOT",
              text: `Prediction closed! Result: ${outcomeName}. ${prev.userChoice ? (won ? `You won ${winnings} coins!` : "You lost your wager.") : "Play next time to win!"}`,
              createdAt: new Date().toISOString()
            }).catch(() => {});

            return { ...prev, timeLeft: -1 };
          }
          return prev;
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });

      // 2. Trivia Tick
      setActiveTrivia((prev: any) => {
        if (!prev || prev.timeLeft <= 0 || prev.status !== "active") return prev;
        const newTime = prev.timeLeft - 1;
        if (newTime === 0) {
          return { ...prev, timeLeft: 0, status: "timeout" };
        }
        return { ...prev, timeLeft: newTime };
      });

      // 3. Red Envelopes Tick
      setRedEnvelopes((prev) => {
        return prev
          .map((env) => ({ ...env, secondsLeft: env.secondsLeft - 1 }))
          .filter((env) => env.secondsLeft > 0);
      });

      // 4. Quest Progression & Dwell Timer
      dwellTimer += 1;
      if (dwellTimer >= 60) {
        dwellTimer = 0;
        setDailyQuests((prevQuests) => {
          return prevQuests.map((q) => {
            if (q.id === "quest_1" && !q.completed) {
              const nextVal = q.progress + 1;
              const isDone = nextVal >= q.target;
              if (isDone) {
                setViewerCoinBalance(c => c + q.reward);
                setHubShowToast(`🏆 Quest Completed: "${q.label}"! +${q.reward} coins claimed.`);
              }
              return { ...q, progress: nextVal, completed: isDone };
            }
            return q;
          });
        });
      }

      // 5. Periodic Random Events (Bets & New Envelopes)
      // Simulated viewer wagers are removed per user request. No fake bets are generated.

      // Every 55 seconds, there's a 20% chance Fred drops a brand-new Golden Red Envelope
      if (Math.random() < 0.20 && redEnvelopes.length === 0) {
        const totalCoins = [500, 800, 1500, 2000][Math.floor(Math.random() * 4)];
        const claims = Math.floor(Math.random() * 5) + 4;
        const newEnv = {
          id: `env_${Date.now()}`,
          senderName: "Fred_Host 👑",
          totalCoins,
          remainingClaims: claims,
          secondsLeft: 50
        };
        setRedEnvelopes([newEnv]);

        // Push a systems chat message
        const chatRef = collection(db, "liveStreams", activeStream.id, "chat");
        addDoc(chatRef, {
          id: `chat_env_drop_${Date.now()}`,
          streamId: activeStream.id,
          senderId: "system",
          senderName: "🧧 COIN ENVELOPE",
          text: `👑 Streamer Fred dropped a Coin Envelope of ${totalCoins} free coins! Grab it on screen before it expires in 50s!`,
          createdAt: new Date().toISOString()
        }).catch(() => {});
      }

    }, 1000);

    return () => clearInterval(interval);
  }, [activeStream, activePrediction, redEnvelopes]);

  // Sync real-time withdrawal history from Firestore
  useEffect(() => {
    if (!currentUser?.uid) return;
    try {
      const q = query(
        collection(db, "withdrawals"),
        where("creatorId", "==", currentUser.uid)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const historyList: any[] = [];
        snapshot.forEach((doc) => {
          historyList.push({ id: doc.id, ...doc.data() });
        });
        // Sort client-side by date to prevent index errors
        historyList.sort((a, b) => new Date(b.requestedAt || 0).getTime() - new Date(a.requestedAt || 0).getTime());
        setWithdrawalHistory(historyList);
      }, (error) => {
        console.error("Failed to load withdrawal history:", error);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error(e);
    }
  }, [currentUser]);

  // Execute real withdrawal write to Firestore
  const handleRealWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.uid) {
      setHubShowToast("❌ Authentication required to withdraw.");
      return;
    }
    const amt = Number(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      setHubShowToast("❌ Enter a valid withdrawal amount.");
      return;
    }
    if (amt > hubWithdrawalWallet) {
      setHubShowToast("❌ Insufficient balance for cashout.");
      return;
    }
    if (amt < 10) {
      setHubShowToast("❌ Minimum withdrawal amount is $10.00.");
      return;
    }

    let paymentDetails = "";
    if (withdrawMethod === "paypal") {
      if (!withdrawEmail.trim()) {
        setHubShowToast("❌ Enter your PayPal email address.");
        return;
      }
      paymentDetails = `PayPal: ${withdrawEmail.trim()}`;
    } else if (withdrawMethod === "payoneer") {
      if (!withdrawEmail.trim()) {
        setHubShowToast("❌ Enter your Payoneer email address.");
        return;
      }
      paymentDetails = `Payoneer: ${withdrawEmail.trim()}`;
    } else if (withdrawMethod === "bank") {
      if (!withdrawBankName.trim() || !withdrawAccountNum.trim()) {
        setHubShowToast("❌ Enter complete bank transfer details.");
        return;
      }
      paymentDetails = `Bank: ${withdrawBankName.trim()} | Acc: ${withdrawAccountNum.trim()} | SWIFT: ${withdrawSwift.trim()}`;
    } else if (withdrawMethod === "stripe") {
      if (!withdrawCardNum.trim()) {
        setHubShowToast("❌ Enter your Stripe card number.");
        return;
      }
      paymentDetails = `Stripe Card: **** **** **** ${withdrawCardNum.trim().slice(-4)}`;
    }

    try {
      const docId = `wd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      // Create a real doc in Firestore withdrawals collection
      const withdrawalData = {
        id: docId,
        creatorId: currentUser.uid,
        amount: amt,
        diamondsExchanged: amt * 100, // 100 diamonds = $1
        paymentMethod: withdrawMethod,
        paymentDetails: paymentDetails,
        status: "pending",
        requestedAt: new Date().toISOString()
      };

      await setDoc(doc(db, "withdrawals", docId), withdrawalData);
      
      // Deduct from local wallet balance
      setHubWithdrawalWallet(prev => prev - amt);
      setHubShowToast(`💸 Real withdrawal of $${amt.toFixed(2)} submitted!`);
      setShowWithdrawalForm(false);
      setWithdrawEmail("");
      setWithdrawBankName("");
      setWithdrawAccountNum("");
      setWithdrawSwift("");
      setWithdrawCardNum("");
    } catch (error) {
      console.error("Failed to submit withdrawal:", error);
      setHubShowToast("❌ Failed to process withdrawal.");
    }
  };

  // Listen to Audio Room seats in real-time
  useEffect(() => {
    if (!roomId) {
      setSeats([]);
      return;
    }

    // Ensure the audioRoom document exists (so updateDoc doesn't fail) and host occupies Seat 1 on initial creation
    const initRoomDoc = async () => {
      if (!activeStream) return;
      const roomRef = doc(db, "audioRooms", roomId);
      const roomSnap = await getDoc(roomRef);
      
      const hostProfile = await getOrCreateAudioProfile(activeStream.creatorId, currentUser);
      
      const hostSeatData = {
        uid: activeStream.creatorId,
        username: hostProfile.nickname || activeStream.creatorName || "Host",
        panelName: activeStream.title || "",
        avatar: hostProfile.avatarUrl || activeStream.creatorPhoto || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
        level: hostProfile.level || 10,
        isVIP: hostProfile.badges?.includes("VIP") || false,
        mic: true,
        occupied: true
      };

      if (!roomSnap.exists()) {
        await setDoc(roomRef, {
          seats: {
            "1": hostSeatData
          }
        });
      } else {
        const data = roomSnap.data();
        if (!data?.seats) {
          await updateDoc(roomRef, {
            "seats.1": hostSeatData
          });
        }
      }
    };
    initRoomDoc().catch(console.error);

    let seatsMapFromRoom: any = {};
    let seatsMapFromSub: any = {};

    const mergeAndSetSeats = () => {
      const merged: any = {};
      const seatCount = activeStream ? (activeStream.seatCount || 24) : 24;

      for (let i = 1; i <= seatCount; i++) {
        const key = String(i);
        const roomVal = seatsMapFromRoom[key];
        const subVal = seatsMapFromSub[key];

        // Check if either source indicates the seat is occupied
        const roomUserId = roomVal ? (roomVal.uid || roomVal.userId) : null;
        const subUserId = subVal ? (subVal.uid || subVal.userId) : null;
        const isOccupied = !!(subUserId || roomUserId);

        if (isOccupied) {
          const uid = subUserId || roomUserId;
          const username = (subVal && subVal.username) || (roomVal && roomVal.username) || "";
          const avatar = (subVal && (subVal.avatar || subVal.photoURL)) || (roomVal && (roomVal.avatar || roomVal.photoURL)) || "";
          const level = (subVal && subVal.level) || (roomVal && roomVal.level) || 1;
          const isVIP = (subVal && subVal.isVIP !== undefined) ? subVal.isVIP : (roomVal && roomVal.isVIP) || false;
          const isMuted = (subVal && subVal.isMuted !== undefined) ? subVal.isMuted : (roomVal && roomVal.isMuted !== undefined ? roomVal.isMuted : (roomVal && roomVal.mic !== undefined ? !roomVal.mic : false));
          const isSpeaking = (subVal && subVal.isSpeaking) || (roomVal && roomVal.isSpeaking) || false;
          const isLocked = (subVal && subVal.isLocked) || (roomVal && roomVal.isLocked) || false;
          const panelName = (roomVal && roomVal.panelName) || "";

          merged[key] = {
            uid,
            userId: uid,
            username,
            avatar,
            photoURL: avatar,
            mic: !isMuted,
            isMuted,
            isSpeaking,
            isLocked,
            occupied: true,
            level,
            isVIP,
            panelName,
          };
        } else {
          // Empty or locked seat
          const isLocked = (subVal && subVal.isLocked) || (roomVal && roomVal.isLocked) || false;
          merged[key] = {
            uid: null,
            userId: null,
            username: "",
            avatar: "",
            photoURL: "",
            mic: true,
            isMuted: false,
            isSpeaking: false,
            isLocked,
            occupied: false,
            level: 1,
            isVIP: false,
            panelName: "",
          };
        }
      }

      setSeats(merged);
    };

    const unsubRoom = onSnapshot(doc(db, "audioRooms", roomId), (docSnap) => {
      if (docSnap.exists()) {
        seatsMapFromRoom = docSnap.data().seats || {};
      } else {
        seatsMapFromRoom = {};
      }
      mergeAndSetSeats();
    });

    const unsubSub = onSnapshot(collection(db, "liveStreams", roomId, "seats"), (snap) => {
      if (snap.empty && activeStream && currentUser?.uid === activeStream.creatorId && activeStream.type === "audio") {
        console.log("[Seats] Seats subcollection is empty. Initializing...");
        initializeAudioSeats().catch(console.error);
        return;
      }
      const temp: any = {};
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const num = docSnap.id.split("_")[1];
        if (num) {
          temp[num] = {
            uid: data.userId || null,
            userId: data.userId || null,
            username: data.username || "",
            avatar: data.photoURL || "",
            photoURL: data.photoURL || "",
            mic: data.isMuted !== undefined ? !data.isMuted : true,
            isMuted: data.isMuted || false,
            isSpeaking: data.isSpeaking || false,
            isLocked: data.isLocked || false,
            level: data.userLevel || 1,
            isVIP: data.isVIP || false,
            occupied: data.userId !== null,
          };
        }
      });
      seatsMapFromSub = temp;
      mergeAndSetSeats();
    });

    return () => {
      unsubRoom();
      unsubSub();
    };
  }, [roomId, activeStream]);

  const seatsArray = useMemo<Seat[]>(() => {
    if (!seats) return [] as Seat[];
    if (Array.isArray(seats)) return seats as Seat[];
    return Object.entries(seats).map(([key, value]: [string, any]) => {
      const seatNum = parseInt(key, 10);
      const isHostUser = activeStream && (value.uid === activeStream.creatorId || value.userId === activeStream.creatorId);
      return {
        id: `seat_${key}`,
        userId: value.uid || value.userId || null,
        username: value.username || "",
        photoURL: value.avatar || value.photoURL || "",
        role: isHostUser ? "Host" : (seatNum === 1 ? "Host" : "Guest"),
        isMuted: value.isMuted !== undefined ? value.isMuted : !value.mic,
        isSpeaking: value.isSpeaking || false,
        isLocked: value.isLocked || false,
        occupied: value.occupied || false,
        number: seatNum,
        avatar: value.avatar || value.photoURL || "",
        uid: value.uid || value.userId || null,
        userLevel: value.level !== undefined ? value.level : (isHostUser ? 10 : 1),
        isVIP: value.isVIP !== undefined ? value.isVIP : (isHostUser ? true : false),
        panelName: value.panelName || "",
      } as Seat;
    });
  }, [seats, activeStream]);

  const joinSeat = async (seatNumber: number) => {
    if (!currentUser) return;
    try {
      await handleOccupySeat(`seat_${seatNumber}`);
      console.log("Delegated join to handleOccupySeat for seat:", seatNumber);
    } catch (err) {
      console.error(err);
    }
  };

  const getOrCreateAudioProfile = async (userId: string, mainUser?: any) => {
    const profileRef = doc(db, "audio_profiles", userId);
    try {
      const snap = await getDoc(profileRef);
      if (snap.exists()) {
        return snap.data();
      } else {
        let nickname = "Listener";
        let avatarUrl = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100";
        let isPremium = false;

        if (mainUser && mainUser.uid === userId) {
          nickname = mainUser.username || mainUser.displayName || "Listener";
          avatarUrl = mainUser.photoURL || avatarUrl;
          isPremium = mainUser.subscription?.status === "premium";
        } else {
          try {
            const uDoc = await getDoc(doc(db, "users", userId));
            if (uDoc.exists()) {
              const uData = uDoc.data();
              nickname = uData.username || uData.displayName || "Listener";
              avatarUrl = uData.photoURL || avatarUrl;
              isPremium = uData.subscription?.status === "premium";
            }
          } catch (e) {
            console.warn("Failed to fetch user doc for profile fallback:", e);
          }
        }
        const newProfile = {
          uid: userId,
          nickname,
          avatarUrl,
          bio: "",
          level: 1,
          badges: isPremium ? ["VIP"] : [],
          createdAt: new Date().toISOString()
        };
        await setDoc(profileRef, newProfile);
        return newProfile;
      }
    } catch (err) {
      console.error("Error in getOrCreateAudioProfile:", err);
      return {
        uid: userId,
        nickname: "Listener",
        avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
        bio: "",
        level: 1,
        badges: []
      };
    }
  };

  // Pre-load/Ensure Audio Stream Profile exists for current user
  useEffect(() => {
    if (!currentUser || !activeStream || activeStream.type !== "audio") {
      setCurrentUserAudioProfile(null);
      return;
    }

    let unsub = () => {};
    const loadProfile = async () => {
      const profile = await getOrCreateAudioProfile(currentUser.uid, currentUser);
      setCurrentUserAudioProfile(profile);

      unsub = onSnapshot(doc(db, "audio_profiles", currentUser.uid), (docSnap) => {
        if (docSnap.exists()) {
          setCurrentUserAudioProfile(docSnap.data());
        }
      });
    };

    loadProfile();
    return () => unsub();
  }, [currentUser, activeStream?.id, activeStream?.type]);

  const handleSaveAudioProfile = async (nickname: string, avatarUrl: string, bio: string) => {
    if (!currentUser) return;
    try {
      const profileRef = doc(db, "audio_profiles", currentUser.uid);
      await updateDoc(profileRef, {
        nickname,
        avatarUrl,
        bio
      });

      // Also update currently occupied seat, if they are seated in an active audio stream
      if (activeStream && activeStream.type === "audio") {
        const mySeat = seatsArray.find(s => s.userId === currentUser.uid);
        if (mySeat) {
          const seatRef = doc(db, "liveStreams", activeStream.id, "seats", mySeat.id);
          await updateDoc(seatRef, {
            username: nickname,
            photoURL: avatarUrl,
            userLevel: currentUserAudioProfile?.level || 1,
            isVIP: currentUserAudioProfile?.badges?.includes("VIP") || false
          });

          // Also update audioRooms seat data instantly!
          const seatNum = mySeat.id.split("_")[1];
          await updateDoc(doc(db, "audioRooms", activeStream.id), {
            [`seats.${seatNum}.username`]: nickname,
            [`seats.${seatNum}.avatar`]: avatarUrl,
            [`seats.${seatNum}.level`]: currentUserAudioProfile?.level || 1,
            [`seats.${seatNum}.isVIP`]: currentUserAudioProfile?.badges?.includes("VIP") || false
          }).catch(() => {});
        }
      }
      setShowEditAudioProfileModal(false);
      setShowHostProfileMenu(false);
    } catch (err) {
      console.error("Failed to save audio profile:", err);
      alert("Failed to save profile. Please try again.");
    }
  };

  // Listen to join requests
  useEffect(() => {
    if (!activeStream || activeStream.type !== "audio" || !currentUser) {
      setRequests([]);
      return;
    }
    // Only host or co-host really needs to monitor join requests
    const q = query(
      collection(db, "liveStreams", activeStream.id, "requests"),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const list: JoinRequest[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as JoinRequest);
      });
      setRequests(list);
    });
    return () => unsubscribe();
  }, [activeStream, currentUser]);

  // Keep refs of latest values to avoid re-triggering cleanup on every state change
  const currentUserRef = useRef(currentUser);
  const seatsArrayRef = useRef(seatsArray);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    seatsArrayRef.current = seatsArray;
  }, [seatsArray]);

  // Auto-cleanup seat allocation when leaving the room, closing tab/browser, or disconnecting
  useEffect(() => {
    const streamId = activeStream?.id;
    if (!streamId || !currentUser) return;

    const handleCleanup = async () => {
      const user = currentUserRef.current;
      const curSeats = seatsArrayRef.current;
      if (!user || !curSeats) return;

      const occupiedSeats = curSeats.filter(s => s.userId === user.uid);
      for (const seat of occupiedSeats) {
        try {
          const seatDocRef = doc(db, "liveStreams", streamId, "seats", seat.id);
          await updateDoc(seatDocRef, {
            userId: null,
            username: "",
            photoURL: "",
            role: "Listener",
            isMuted: false,
            isSpeaking: false,
            userLevel: null,
            isVIP: null
          });
          const chatRef = collection(db, "liveStreams", streamId, "chat");
          await addDoc(chatRef, {
            id: `sys_vacate_${Date.now()}`,
            streamId: streamId,
            senderId: "system",
            senderName: "SYSTEM",
            text: `${user.username || user.displayName || "Listener"} left Seat ${seat.id.split("_")[1]}`,
            createdAt: new Date().toISOString()
          });
        } catch (e) {
          console.warn("Seat cleanup failed:", e);
        }
      }
    };

    const beforeUnloadHandler = () => {
      handleCleanup();
    };

    window.addEventListener("beforeunload", beforeUnloadHandler);
    return () => {
      handleCleanup();
      window.removeEventListener("beforeunload", beforeUnloadHandler);
    };
  }, [activeStream?.id, currentUser?.uid]);

  // Find the current user's seat in the room if they occupy one
  const mySeat = useMemo(() => {
    if (!currentUser || !seatsArray) return null;
    return seatsArray.find((s) => s.userId === currentUser.uid);
  }, [seatsArray, currentUser]);

  // Synchronize local isMuted state with seat's firestore isMuted state
  useEffect(() => {
    if (mySeat) {
      setIsMuted(mySeat.isMuted);
    } else {
      setIsMuted(false);
    }
  }, [mySeat?.isMuted, mySeat === null]);

  // Initialize and join Agora Voice Channel on room entry
  useEffect(() => {
    if (!activeStream) return;

    let isDestroyed = false;
    let agoraClient: any = null;

    queueAgoraAction("Join Room", async () => {
      if (isDestroyed) return;
      try {
        console.log("[Agora] Initializing for stream:", activeStream.id);
        const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
        
        // Setup logger level
        AgoraRTC.setLogLevel(3); // Error & Warning only

        agoraClient = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
        agoraClientRef.current = agoraClient;

        // In "live" mode, we must set a client role before joining
        await agoraClient.setClientRole("audience");

        // Handle remote users publishing their audio/video
        agoraClient.on("user-published", async (user: any, mediaType: string) => {
          if (isDestroyed) return;
          console.log("[Agora] Remote user published track:", user.uid, mediaType);
          try {
            await agoraClient.subscribe(user, mediaType);
            if (mediaType === "audio") {
              if (isSpeakerMuted) {
                user.audioTrack?.stop();
              } else {
                user.audioTrack?.play();
              }
            } else if (mediaType === "video") {
              console.log("[Agora] Remote user published video! Playing in container...");
              if (videoContainerRef.current) {
                user.videoTrack?.play(videoContainerRef.current);
              }
            }
          } catch (err) {
            console.error("[Agora] Subscription failed:", err);
          }
        });

        agoraClient.on("user-unpublished", (user: any, mediaType: string) => {
          console.log("[Agora] Remote user unpublished track:", user.uid, mediaType);
          if (mediaType === "audio") {
            try {
              user.audioTrack?.stop();
            } catch (e) {
              console.warn(e);
            }
          } else if (mediaType === "video") {
            try {
              user.videoTrack?.stop();
            } catch (e) {
              console.warn(e);
            }
          }
        });

        const appId = import.meta.env.VITE_AGORA_APP_ID || "6fa882836bdf49f2b84ec8198f1a1d94";
        
        // Join Agora room using Stream ID as channel name
        await agoraClient.join(appId, activeStream.id, null, null);
        console.log("[Agora] Successfully joined channel:", activeStream.id);
        
        if (!isDestroyed) {
          setAgoraJoined(true);
        }
      } catch (err) {
        console.error("[Agora] Setup failed:", err);
      }
    });

    return () => {
      isDestroyed = true;
      queueAgoraAction("Leave Room", async () => {
        if (localAudioTrackRef.current) {
          try {
            localAudioTrackRef.current.stop();
            localAudioTrackRef.current.close();
          } catch (e) {
            console.warn(e);
          }
          localAudioTrackRef.current = null;
        }
        if (localVideoTrackRef.current) {
          try {
            localVideoTrackRef.current.stop();
            localVideoTrackRef.current.close();
          } catch (e) {
            console.warn(e);
          }
          localVideoTrackRef.current = null;
        }
        if (agoraClient) {
          try {
            await agoraClient.leave();
          } catch (e) {
            console.warn(e);
          }
        }
        agoraClientRef.current = null;
        setAgoraJoined(false);
        setAgoraBroadcasting(false);
      });
    };
  }, [activeStream?.id]);

  // Monitor seat/room state and handle publishing audio and video tracks
  useEffect(() => {
    if (!agoraJoined || !currentUser) return;

    queueAgoraAction("Update Publish State", async () => {
      const agoraClient = agoraClientRef.current;
      if (!agoraClient) return;

      const isVideoRoom = activeStream?.type === "video";
      const isVideoHost = isVideoRoom && currentUser.uid === activeStream?.creatorId;
      const shouldPublish = !!mySeat || isVideoHost;

      try {
        if (shouldPublish) {
          // User needs to publish -> Promote to Broadcaster (Host)
          console.log("[Agora] Promoting user to host/broadcaster...");
          await agoraClient.setClientRole("host");

          // 1. Initialize microphone track
          if (!localAudioTrackRef.current) {
            const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
            try {
              if (isVideoRoom && isVideoHost && localStream) {
                const audioTrack = localStream.getAudioTracks()[0];
                if (audioTrack) {
                  console.log("[Agora] Creating custom microphone track from localStream...");
                  localAudioTrackRef.current = AgoraRTC.createCustomAudioTrack({
                    mediaStreamTrack: audioTrack
                  });
                }
              }

              if (!localAudioTrackRef.current) {
                console.log("[Agora] Creating standard microphone audio track...");
                localAudioTrackRef.current = await AgoraRTC.createMicrophoneAudioTrack({
                  AEC: true,
                  ANS: true,
                  AGC: true
                });
              }
              setMicError(null);
            } catch (micErr: any) {
              console.error("[Agora] Microphone acquisition failed:", micErr);
              let customMsg = "Microphone access failed. Please make sure you have allowed microphone access in your browser and that a physical microphone is connected.";
              if (window.self !== window.top) {
                customMsg += " Since the app is running inside a preview iframe, browsers block mic access. Please click 'Open in New Tab' to easily grant mic access!";
              }
              setMicError(customMsg);
              if (!isVideoRoom) {
                throw micErr;
              }
            }
          }

          // 2. Initialize camera track (for Video stream room host)
          if (isVideoRoom && isVideoHost && !localVideoTrackRef.current) {
            const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
            try {
              if (localStream) {
                const videoTrack = localStream.getVideoTracks()[0];
                if (videoTrack) {
                  console.log("[Agora] Creating custom camera track from localStream...");
                  localVideoTrackRef.current = AgoraRTC.createCustomVideoTrack({
                    mediaStreamTrack: videoTrack
                  });
                }
              }

              if (!localVideoTrackRef.current) {
                console.log("[Agora] Acquiring real camera track...");
                localVideoTrackRef.current = await AgoraRTC.createCameraVideoTrack({
                  encoderConfig: "720p_1"
                });
              }
              console.log("[Agora] Real camera acquired successfully.");
              setCameraError(null);
            } catch (camErr: any) {
              console.warn("[Agora] Camera acquisition failed, falling back to virtual animated music feed:", camErr);
              let customMsg = "Agora camera acquisition failed. Please make sure your camera is connected and not currently in use by another app.";
              if (window.self !== window.top) {
                customMsg += " Since the app is running inside a preview iframe, browsers block media/camera access. Click 'Open in New Tab' above to grant permissions and stream live!";
              } else {
                customMsg += " Please check your browser permissions to ensure camera access is allowed for this site.";
              }
              setCameraError(customMsg);
              try {
                const virtualStream = createVirtualStream(true);
                const videoTrack = virtualStream.getVideoTracks()[0];
                if (videoTrack) {
                  localVideoTrackRef.current = AgoraRTC.createCustomVideoTrack({
                    mediaStreamTrack: videoTrack
                  });
                  console.log("[Agora] Virtual animated canvas track created successfully as fallback.");
                }
              } catch (fallbackErr) {
                console.error("[Agora] Custom video fallback failed:", fallbackErr);
              }
            }
          }

          // 3. Play local video track for preview
          if (isVideoRoom && isVideoHost && localVideoTrackRef.current && videoContainerRef.current) {
            try {
              localVideoTrackRef.current.play(videoContainerRef.current);
            } catch (e) {
              console.warn("[Agora] Local video play failed:", e);
            }
          }

          // 4. Set microphone mute state
          if (localAudioTrackRef.current) {
            const isMutedState = mySeat ? mySeat.isMuted : isMuted;
            console.log("[Agora] Syncing local mic track mute status to:", isMutedState);
            await localAudioTrackRef.current.setMuted(isMutedState);
          }

          // 5. Publish any unpublished local tracks
          const tracksToPublish = [];
          if (localAudioTrackRef.current) tracksToPublish.push(localAudioTrackRef.current);
          if (localVideoTrackRef.current) tracksToPublish.push(localVideoTrackRef.current);

          if (tracksToPublish.length > 0 && !agoraBroadcasting) {
            console.log("[Agora] Publishing local tracks...");
            await agoraClient.publish(tracksToPublish);
            setAgoraBroadcasting(true);
          }
        } else {
          // User is NOT on a seat and NOT a video host -> Demote to Listener (Audience)
          if (agoraBroadcasting) {
            console.log("[Agora] Demoting user to audience, unpublishing tracks...");
            try {
              await agoraClient.unpublish();
            } catch (e) {
              console.warn(e);
            }
            setAgoraBroadcasting(false);
          }

          if (localAudioTrackRef.current) {
            console.log("[Agora] Closing local microphone audio track...");
            try {
              localAudioTrackRef.current.stop();
              localAudioTrackRef.current.close();
            } catch (e) {
              console.warn(e);
            }
            localAudioTrackRef.current = null;
          }

          if (localVideoTrackRef.current) {
            console.log("[Agora] Closing local camera video track...");
            try {
              localVideoTrackRef.current.stop();
              localVideoTrackRef.current.close();
            } catch (e) {
              console.warn(e);
            }
            localVideoTrackRef.current = null;
          }

          await agoraClient.setClientRole("audience");
        }
      } catch (err) {
        console.error("[Agora] Publish update failed:", err);
      }
    });
  }, [agoraJoined, mySeat?.id, mySeat?.isMuted, currentUser?.uid, agoraBroadcasting, activeStream?.type, activeStream?.creatorId, isMuted, localStream]);

  // Handle speaker mute/unmute control of remote tracks in real-time
  useEffect(() => {
    if (!agoraJoined || !agoraClientRef.current) return;
    const agoraClient = agoraClientRef.current;
    
    agoraClient.remoteUsers.forEach((user: any) => {
      if (user.audioTrack) {
        try {
          if (isSpeakerMuted) {
            user.audioTrack.stop();
          } else {
            user.audioTrack.play();
          }
        } catch (e) {
          console.warn(e);
        }
      }
    });
  }, [isSpeakerMuted, agoraJoined]);

  // Keep local video preview synchronized when localStream is active
  useEffect(() => {
    let interval: any = null;
    
    const syncVideo = () => {
      if (videoRef.current && localStream) {
        if (videoRef.current.srcObject !== localStream) {
          console.log("[Media] Synchronizing videoRef srcObject with localStream...");
          videoRef.current.srcObject = localStream;
        }
      }
    };

    syncVideo();

    // Set up a small interval to poll and ensure the srcObject remains active and synced
    // because React rendering can unmount and remount the video element dynamically
    interval = setInterval(syncVideo, 1000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [localStream, activeStream]);

  // Render any active remote video tracks when the container becomes available
  useEffect(() => {
    if (!agoraJoined || !videoContainerRef.current || !agoraClientRef.current) return;
    const client = agoraClientRef.current;
    client.remoteUsers.forEach((user: any) => {
      if (user.hasVideo && user.videoTrack) {
        console.log("[Agora] Found existing remote video track on container render, playing...");
        try {
          user.videoTrack.play(videoContainerRef.current);
        } catch (e) {
          console.warn(e);
        }
      }
    });
  }, [agoraJoined, videoContainerRef.current]);

  async function initializeAudioSeats() {
    if (!activeStream) return;
    try {
      const hostProfile = await getOrCreateAudioProfile(activeStream.creatorId, currentUser);

      const seatCollection = collection(db, "liveStreams", activeStream.id, "seats");
      for (let i = 1; i <= 24; i++) {
        const isHostSeat = i === 1;
        const seatData: any = {
          id: `seat_${i}`,
          userId: isHostSeat ? activeStream.creatorId : null,
          username: isHostSeat ? hostProfile.nickname : "",
          photoURL: isHostSeat ? hostProfile.avatarUrl : "",
          role: isHostSeat ? "Host" : "Listener",
          isMuted: false,
          isSpeaking: false,
          isLocked: false,
          userLevel: isHostSeat ? (hostProfile.level || 1) : null,
          isVIP: isHostSeat ? hostProfile.badges?.includes("VIP") : null
        };
        await setDoc(doc(seatCollection, `seat_${i}`), seatData);
      }
    } catch (err) {
      console.warn("Failed to initialize 24 seats:", err);
    }
  }

  // Helper to post beautiful system messages
  const postSystemMessage = async (streamId: string, text: string) => {
    try {
      const chatRef = collection(db, "liveStreams", streamId, "chat");
      await addDoc(chatRef, {
        id: `sys_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        streamId,
        senderId: "system",
        senderName: "SYSTEM",
        text,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn("System chat message error:", err);
    }
  };

  // Synchronize Active Stream Document in real-time
  useEffect(() => {
    if (!activeStream) return;
    const unsubscribe = onSnapshot(doc(db, "liveStreams", activeStream.id), (snap) => {
      if (snap.exists()) {
        const updated = { id: snap.id, ...snap.data() } as LiveStream;
        setActiveStream(updated);
        if ((updated as any).openMicEnabled !== undefined) {
          setOpenMicEnabled((updated as any).openMicEnabled);
        }
        if ((updated as any).roomPlaylist !== undefined) {
          setRoomPlaylist((updated as any).roomPlaylist || []);
        }
        if ((updated as any).currentPlaylistIndex !== undefined) {
          setCurrentPlaylistIndex((updated as any).currentPlaylistIndex);
        }
      }
    });
    return () => unsubscribe();
  }, [activeStream?.id]);

  // Synchronize Music Playback state to the <audio> element for all users in the room
  useEffect(() => {
    if (!activeStream) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      return;
    }
    const currentSongId = (activeStream as any).currentSongId;
    const isPlayingMusic = (activeStream as any).isPlayingMusic || false;

    if (!currentSongId) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      return;
    }

    const matchedSong = songs?.find(s => s.id === currentSongId);
    if (!matchedSong) return;

    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio();
    }

    const audio = audioPlayerRef.current;
    if (audio.src !== matchedSong.audioUrl) {
      audio.src = matchedSong.audioUrl;
      audio.load();
    }

    audio.volume = isSpeakerMuted ? 0 : musicVolume / 100;

    if (isPlayingMusic) {
      audio.play().catch(err => console.log("Playback error:", err));
    } else {
      audio.pause();
    }

    // Host handles song completion to auto-skip
    const handleSongEnded = () => {
      if (isHosting || currentUser?.uid === activeStream.creatorId) {
        handleSkipMusic();
      }
    };

    audio.addEventListener("ended", handleSongEnded);
    return () => {
      audio.removeEventListener("ended", handleSongEnded);
    };
  }, [
    activeStream?.id, 
    (activeStream as any)?.currentSongId, 
    (activeStream as any)?.isPlayingMusic, 
    isSpeakerMuted, 
    musicVolume,
    songs
  ]);

  // Listen to active live PK battle
  useEffect(() => {
    const battleId = activeStream?.activeBattleId;
    if (!battleId) {
      setActiveBattle(null);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "live_battles", battleId), (snap) => {
      if (snap.exists()) {
        const battleData = snap.data();
        setActiveBattle(battleData);
        
        // Sync time left
        const endsAtTime = new Date(battleData.endsAt).getTime();
        const remaining = Math.max(0, Math.ceil((endsAtTime - Date.now()) / 1000));
        setBattleTimer(remaining);
      }
    });

    return () => unsubscribe();
  }, [activeStream?.activeBattleId]);

  // Countdown and auto-end timer for PK battle
  useEffect(() => {
    if (!activeBattle || activeBattle.status !== "active") return;
    const interval = setInterval(() => {
      const endsAtTime = new Date(activeBattle.endsAt).getTime();
      const remaining = Math.max(0, Math.ceil((endsAtTime - Date.now()) / 1000));
      setBattleTimer(remaining);

      // Auto-end battle when timer expires
      if (remaining === 0 && isHosting && activeBattle.status === "active") {
        endBattle(activeBattle.id).catch(console.error);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeBattle, isHosting]);

  // Listen to incoming battle invitations for Host
  useEffect(() => {
    if (!currentUser || !isHosting || !activeStream) return;
    const q = query(
      collection(db, "battle_invites"),
      where("receiverId", "==", currentUser.uid),
      where("status", "==", "pending")
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setBattleInvites(list);
    });
    return () => unsubscribe();
  }, [currentUser, isHosting, activeStream?.id]);

  // Reconnect host to their active live audio stream
  useEffect(() => {
    if (!currentUser || activeStream) return;
    const existing = streams.find(
      s => s.creatorId === currentUser.uid && s.status === "live" && s.type === "audio"
    );
    if (existing) {
      setActiveStream(existing);
      setIsHosting(true);
      startLocalMedia();

      // Post reconnect system message
      postSystemMessage(existing.id, `👑 Host @${currentUser.username || currentUser.displayName} has returned and reconnected to the room.`);
    }
  }, [currentUser, streams]);

  const handleAddSongToPlaylist = async (song: any) => {
    if (!activeStream) return;
    const currentPlaylist = (activeStream as any).roomPlaylist || [];
    if (currentPlaylist.some((s: any) => s.id === song.id)) {
      alert("This song is already in the room playlist!");
      return;
    }
    const updatedPlaylist = [...currentPlaylist, {
      id: song.id,
      title: song.title,
      artistName: song.artistName,
      audioUrl: song.audioUrl,
      coverUrl: song.coverUrl
    }];

    try {
      const streamRef = doc(db, "liveStreams", activeStream.id);
      await updateDoc(streamRef, {
        roomPlaylist: updatedPlaylist
      });

      // Post chat announcement
      postSystemMessage(activeStream.id, `🎵 Song "${song.title}" added to room playlist.`);
    } catch (e) {
      console.warn("Failed to add song to playlist:", e);
    }
  };

  const handleRemoveSongFromPlaylist = async (index: number) => {
    if (!activeStream) return;
    const currentPlaylist = [...((activeStream as any).roomPlaylist || [])];
    const removedSong = currentPlaylist[index];
    currentPlaylist.splice(index, 1);

    const updates: any = { roomPlaylist: currentPlaylist };
    
    // If we removed the currently playing song, adjust index or stop music
    let currentIdx = (activeStream as any).currentPlaylistIndex ?? -1;
    if (currentIdx === index) {
      updates.currentPlaylistIndex = -1;
      updates.currentSongId = null;
      updates.isPlayingMusic = false;
    } else if (currentIdx > index) {
      updates.currentPlaylistIndex = currentIdx - 1;
    }

    try {
      await updateDoc(doc(db, "liveStreams", activeStream.id), updates);
      if (removedSong) {
        postSystemMessage(activeStream.id, `🗑️ Removed "${removedSong.title}" from room playlist.`);
      }
    } catch (e) {
      console.warn("Failed to remove song:", e);
    }
  };

  const handleReorderPlaylist = async (index: number, direction: "up" | "down") => {
    if (!activeStream) return;
    const currentPlaylist = [...((activeStream as any).roomPlaylist || [])];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentPlaylist.length) return;

    // Swap
    const temp = currentPlaylist[index];
    currentPlaylist[index] = currentPlaylist[targetIndex];
    currentPlaylist[targetIndex] = temp;

    // Adjust active index
    const currentIdx = (activeStream as any).currentPlaylistIndex ?? -1;
    let newIdx = currentIdx;
    if (currentIdx === index) {
      newIdx = targetIndex;
    } else if (currentIdx === targetIndex) {
      newIdx = index;
    }

    try {
      await updateDoc(doc(db, "liveStreams", activeStream.id), {
        roomPlaylist: currentPlaylist,
        currentPlaylistIndex: newIdx
      });
    } catch (e) {
      console.warn(e);
    }
  };

  const handlePlaySongAtIndex = async (index: number) => {
    if (!activeStream) return;
    const currentPlaylist = (activeStream as any).roomPlaylist || [];
    if (index < 0 || index >= currentPlaylist.length) return;

    const targetSong = currentPlaylist[index];
    try {
      await updateDoc(doc(db, "liveStreams", activeStream.id), {
        currentPlaylistIndex: index,
        currentSongId: targetSong.id,
        isPlayingMusic: true
      });
      postSystemMessage(activeStream.id, `🎶 Now playing: "${targetSong.title}" on stage.`);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleTogglePlayMusic = async () => {
    if (!activeStream) return;
    const isPlaying = (activeStream as any).isPlayingMusic || false;
    const currentIdx = (activeStream as any).currentPlaylistIndex ?? -1;
    const currentPlaylist = (activeStream as any).roomPlaylist || [];

    if (currentIdx === -1 && currentPlaylist.length > 0) {
      await handlePlaySongAtIndex(0);
      return;
    }

    try {
      await updateDoc(doc(db, "liveStreams", activeStream.id), {
        isPlayingMusic: !isPlaying
      });
    } catch (e) {
      console.warn(e);
    }
  };

  const handleSkipMusic = async () => {
    if (!activeStream) return;
    const currentPlaylist = (activeStream as any).roomPlaylist || [];
    if (currentPlaylist.length === 0) return;

    const currentIdx = (activeStream as any).currentPlaylistIndex ?? -1;
    let nextIdx = currentIdx + 1;

    const repeatState = (activeStream as any).isRepeat || false;
    const shuffleState = (activeStream as any).isShuffle || false;

    if (shuffleState) {
      nextIdx = Math.floor(Math.random() * currentPlaylist.length);
    } else if (nextIdx >= currentPlaylist.length) {
      nextIdx = repeatState ? 0 : -1;
    }

    if (nextIdx === -1) {
      await updateDoc(doc(db, "liveStreams", activeStream.id), {
        isPlayingMusic: false,
        currentSongId: null,
        currentPlaylistIndex: -1
      });
    } else {
      await handlePlaySongAtIndex(nextIdx);
    }
  };

  const handleToggleShuffle = async () => {
    if (!activeStream) return;
    const currentShuffle = (activeStream as any).isShuffle || false;
    try {
      await updateDoc(doc(db, "liveStreams", activeStream.id), {
        isShuffle: !currentShuffle
      });
    } catch (e) {}
  };

  const handleToggleRepeat = async () => {
    if (!activeStream) return;
    const currentRepeat = (activeStream as any).isRepeat || false;
    try {
      await updateDoc(doc(db, "liveStreams", activeStream.id), {
        isRepeat: !currentRepeat
      });
    } catch (e) {}
  };

  // Generate Local Media Stream (or fallback Virtual Stream) for broadcasting
  const startLocalMedia = async () => {
    if (streamType === "video") {
      try {
        console.log("[Media] Requesting camera and microphone via getUserMedia...");
        setCameraError(null);
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        setLocalStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        console.log("[Media] Camera and microphone successfully acquired and preview started.");
      } catch (err: any) {
        console.warn("[Media] getUserMedia failed, falling back to virtual animated stream:", err);
        let customMsg = "Camera / microphone access was denied or could not be found.";
        if (window.self !== window.top) {
          customMsg += " Since the app is currently running inside a preview iframe, browsers block device/camera access by default. Please click 'Open in New Tab' to easily grant camera permissions and stream!";
        } else {
          customMsg += " Please check your browser's site settings to ensure that camera permissions are allowed for this site.";
        }
        setCameraError(customMsg);

        const stream = createVirtualStream(true);
        setLocalStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }
    } else {
      // Audio stream room
      const stream = createVirtualStream(false);
      setLocalStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    }
  };

  const stopLocalMedia = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
  };

  // Create Stream and start hosting
  const handleStartStream = async () => {
    if (!currentUser) return;
    if (!streamTitle.trim()) {
      alert("Please enter a valid live stream title.");
      return;
    }

    const streamId = `stream_${Date.now()}`;
    const newStream: LiveStream = {
      id: streamId,
      creatorId: currentUser.uid,
      creatorName: currentUser.username || currentUser.displayName || "Independent Host",
      creatorPhoto: currentUser.photoURL || "",
      title: streamTitle.trim(),
      description: `Join us for our ${streamType === "audio" ? "Social Audio Room" : "Live Video Stream"} experience!`,
      category: streamCategory,
      type: streamType,
      status: "live",
      thumbnailUrl: thumbnailUrl,
      viewerCount: 1,
      totalViewers: 1,
      peakViewers: 1,
      likes: 0,
      shares: 0,
      followersGained: 0,
      chatMessagesCount: 0,
      quality: "1080p HD",
      duration: 0,
      createdAt: new Date().toISOString(),
      enableReplay: true,
      virtualGiftsCount: 0,
      tipsAmount: 0,
      superChatsAmount: 0,
      tags: [streamCategory, streamType, "LiveNow"]
    };

    // Store custom properties on the stream document
    (newStream as any).country = countryOfHost;

    try {
      await setDoc(doc(db, "liveStreams", streamId), newStream);
      setActiveStream(newStream);
      setIsHosting(true);
      setIsCreatingStream(false);
      startLocalMedia();
      
      // Post system announcement
      const chatRef = collection(db, "liveStreams", streamId, "chat");
      await addDoc(chatRef, {
        id: `sys_${Date.now()}`,
        streamId,
        senderId: "system",
        senderName: "SYSTEM",
        text: `✨ Welcome! The Host has started this ${streamType === "audio" ? "Social Audio Space" : "Video Live broadcast"}. Support with hearts and virtual gifts!`,
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      console.error("Failed to start stream:", e);
    }
  };

  // Join an active stream as viewer
  const handleJoinStream = async (stream: LiveStream) => {
    if (!currentUser) {
      alert("Please login to join and experience live broadcasts.");
      return;
    }
    setActiveStream(stream);
    setIsHosting(false);
    
    // Increment viewer count
    try {
      await updateDoc(doc(db, "liveStreams", stream.id), {
        viewerCount: increment(1),
        totalViewers: increment(1)
      });

      // Post system join announcement
      const chatRef = collection(db, "liveStreams", stream.id, "chat");
      await addDoc(chatRef, {
        id: `sys_join_${Date.now()}`,
        streamId: stream.id,
        senderId: "system",
        senderName: "SYSTEM",
        text: `👋 @${currentUser.username || currentUser.displayName} has joined the room.`,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn(err);
    }
  };

  // End or Leave stream
  const handleEndStream = async () => {
    if (!activeStream) return;

    // Clean up any seats occupied by the leaving user
    if (currentUser) {
      const occupiedSeats = seatsArray.filter(s => s.userId === currentUser.uid);
      for (const seat of occupiedSeats) {
        try {
          const seatDocRef = doc(db, "liveStreams", activeStream.id, "seats", seat.id);
          await updateDoc(seatDocRef, {
            userId: null,
            username: "",
            photoURL: "",
            role: "Listener",
            isMuted: false,
            isSpeaking: false,
            userLevel: null,
            isVIP: null
          });
          
          // Also update audioRooms seat data instantly!
          const seatNum = seat.id.split("_")[1];
          await updateDoc(doc(db, "audioRooms", activeStream.id), {
            [`seats.${seatNum}`]: {
              uid: null,
              userId: null,
              username: "",
              avatar: "",
              photoURL: "",
              mic: true,
              isMuted: false,
              isSpeaking: false,
              occupied: false,
              level: 1,
              isVIP: false,
              panelName: ""
            }
          }).catch(() => {});
          
          const chatRef = collection(db, "liveStreams", activeStream.id, "chat");
          await addDoc(chatRef, {
            id: `sys_vacate_${Date.now()}`,
            streamId: activeStream.id,
            senderId: "system",
            senderName: "SYSTEM",
            text: `${currentUser.username || currentUser.displayName || "Listener"} left Seat ${seat.id.split("_")[1]}`,
            createdAt: new Date().toISOString()
          });
        } catch (e) {
          console.warn("Seat cleanup in handleEndStream failed:", e);
        }
      }
    }

    if (isHosting) {
      setHostEndedScreen(true);
      // Mark as ended in firestore
      try {
        await updateDoc(doc(db, "liveStreams", activeStream.id), {
          status: "ended",
          endedAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn(err);
      }
      setTimeout(() => {
        stopLocalMedia();
        setActiveStream(null);
        setIsHosting(false);
        setHostEndedScreen(false);
      }, 2500);
    } else {
      // Leave stream as viewer
      try {
        await updateDoc(doc(db, "liveStreams", activeStream.id), {
          viewerCount: increment(-1)
        });
        
        // Post system leave announcement
        const chatRef = collection(db, "liveStreams", activeStream.id, "chat");
        await addDoc(chatRef, {
          id: `sys_leave_${Date.now()}`,
          streamId: activeStream.id,
          senderId: "system",
          senderName: "SYSTEM",
          text: `🚪 @${currentUser?.username || currentUser?.displayName} left the room.`,
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn(err);
      }
      setActiveStream(null);
    }
  };

  // Sending Chat message inside Live Room
  const handleSendChatMessage = async () => {
    if (!activeStream || !currentUser || !chatInput.trim()) return;
    try {
      const msgId = `msg_${Date.now()}`;
      await setDoc(doc(db, "liveStreams", activeStream.id, "chat", msgId), {
        id: msgId,
        streamId: activeStream.id,
        senderId: currentUser.uid,
        senderName: currentUser.username || currentUser.displayName || "Listener",
        senderPhoto: currentUser.photoURL || "",
        text: chatInput.trim(),
        createdAt: new Date().toISOString()
      });
      setChatInput("");
    } catch (err) {
      console.error(err);
    }
  };

  // Join Request Actions for Audio seat
  const handleRequestSeat = async (seatId?: string) => {
    if (!activeStream || !currentUser) return;
    try {
      const reqDoc = doc(db, "liveStreams", activeStream.id, "requests", currentUser.uid);
      await setDoc(reqDoc, {
        userId: currentUser.uid,
        username: currentUser.username || currentUser.displayName || "Listener",
        photoURL: currentUser.photoURL || "",
        seatId: seatId || "",
        createdAt: new Date().toISOString()
      });
      alert("Your request to join the stage was sent to the host.");
    } catch (err) {
      console.error(err);
    }
  };

  const handleOccupySeat = async (seatId: string) => {
    if (!activeStream || !currentUser) return;
    try {
      const myProfile = await getOrCreateAudioProfile(currentUser.uid, currentUser);

      // Check if user is already on a seat
      const currentSeat = seatsArray.find(s => s.userId === currentUser.uid);
      const isStreamHost = currentUser.uid === activeStream.creatorId;

      if (currentSeat) {
        if (currentSeat.id === seatId) return; // already on this seat
        await handleMoveSeat(currentSeat.id, seatId);
      } else {
        const targetSeatRef = doc(db, "liveStreams", activeStream.id, "seats", seatId);
        
        // Double-check if seat is already occupied (prevent dual-join race)
        const seatSnap = await getDoc(targetSeatRef);
        if (seatSnap.exists() && seatSnap.data().userId !== null) {
          alert("This seat is already occupied.");
          return;
        }

        await setDoc(targetSeatRef, {
          userId: currentUser.uid,
          username: myProfile.nickname,
          photoURL: myProfile.avatarUrl,
          role: isStreamHost ? "Host" : "Guest",
          isMuted: !openMicEnabled, // automatically activate mic if openMicEnabled is true
          isSpeaking: false,
          userLevel: myProfile.level || 1,
          isVIP: myProfile.badges?.includes("VIP") || false
        }, { merge: true });

        // Synchronize with audioRooms collection
        const seatNum = seatId.split("_")[1];
        await updateDoc(doc(db, "audioRooms", activeStream.id), {
          [`seats.${seatNum}`]: {
            uid: currentUser.uid,
            username: myProfile.nickname,
            panelName: activeStream.title || "",
            avatar: myProfile.avatarUrl,
            level: myProfile.level || 1,
            isVIP: myProfile.badges?.includes("VIP") || false,
            mic: openMicEnabled,
            occupied: true,
          }
        }).catch(() => {});

        postSystemMessage(
          activeStream.id,
          `${myProfile.nickname} joined Seat ${seatId.split("_")[1]}.`
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLeaveSeat = async () => {
    if (!activeStream || !currentUser) return;
    const mySeat = seatsArray.find(s => s.userId === currentUser.uid);
    if (!mySeat) return;

    try {
      const seatDocRef = doc(db, "liveStreams", activeStream.id, "seats", mySeat.id);
      await updateDoc(seatDocRef, {
        userId: null,
        username: "",
        photoURL: "",
        role: "Listener",
        isMuted: false,
        isSpeaking: false,
        userLevel: null,
        isVIP: null
      });

      // Synchronize with audioRooms collection
      const seatNum = mySeat.id.split("_")[1];
      await updateDoc(doc(db, "audioRooms", activeStream.id), {
        [`seats.${seatNum}`]: {
          uid: null,
          userId: null,
          username: "",
          avatar: "",
          photoURL: "",
          mic: true,
          isMuted: false,
          isSpeaking: false,
          occupied: false,
          level: 1,
          isVIP: false,
          panelName: ""
        }
      }).catch((e) => console.warn("Failed to update audioRooms seat:", e));

      // Post system announcement
      const chatRef = collection(db, "liveStreams", activeStream.id, "chat");
      await addDoc(chatRef, {
        id: `sys_vacate_${Date.now()}`,
        streamId: activeStream.id,
        senderId: "system",
        senderName: "SYSTEM",
        text: `🚪 @${currentUser.username || currentUser.displayName || "Listener"} vacated Seat ${seatNum}.`,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn("Failed to vacate seat:", err);
    }
  };

  const handleSeatClick = async (e: React.MouseEvent, seat: Seat) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser || !activeStream) return;

    if (seat.id === "seat_1" && currentUser?.uid === activeStream.creatorId && seat.userId === currentUser.uid) {
      setShowHostProfileMenu(true);
      return;
    }

    if (seat.userId === null) {
      if (seat.isLocked) {
        if (isHostOrMod) {
          // Host/Mod can unlock or move even if locked
          const container = document.getElementById("soundstream-live-hub");
          const rect = container?.getBoundingClientRect();
          const x = rect ? e.clientX - rect.left : e.clientX - 200;
          const y = rect ? e.clientY - rect.top : e.clientY - 100;
          setActiveSeatMenu({ seat, x, y });
        } else {
          alert("This seat is locked by the host.");
        }
        return;
      }

      // Check if the user is already seated
      const isSeated = seatsArray.some(s => s.userId === currentUser.uid);

      if (isHostOrMod || isSeated) {
        // Directly move/occupy when tapping empty seat
        await handleOccupySeat(seat.id);
      } else {
        // Normal user (viewer) who is NOT seated
        const openMic = (activeStream as any).openMicEnabled || false;
        if (openMic) {
          // If open mic is enabled, they can join directly.
          await handleOccupySeat(seat.id);
        } else {
          // If Seat Approval is enabled, send seat request to host.
          await handleRequestSeat(seat.id);
        }
      }
    } else {
      // Occupied seat: show context menu (leave, mute, kick, gift, move)
      const container = document.getElementById("soundstream-live-hub");
      const rect = container?.getBoundingClientRect();
      const x = rect ? e.clientX - rect.left : e.clientX - 200;
      const y = rect ? e.clientY - rect.top : e.clientY - 100;
      setActiveSeatMenu({ seat, x, y });
    }
  };

  const handleApproveRequest = async (req: JoinRequest, targetSeatId: string) => {
    if (!activeStream) return;
    try {
      // Fetch level and VIP status
      let levelValue = 1;
      let vipValue = false;
      try {
        const gpDoc = await getDoc(doc(db, "game_profiles", req.userId));
        if (gpDoc.exists()) {
          levelValue = gpDoc.data().level || 1;
        }
        const userDoc = await getDoc(doc(db, "users", req.userId));
        if (userDoc.exists()) {
          const uData = userDoc.data();
          if (uData.subscription?.status === "premium") {
            vipValue = true;
          }
        }
      } catch (e) {
        console.warn(e);
      }

      // Find empty seat
      const seatDocRef = doc(db, "liveStreams", activeStream.id, "seats", targetSeatId);
      await setDoc(seatDocRef, {
        userId: req.userId,
        username: req.username,
        photoURL: req.photoURL,
        role: "Guest",
        isMuted: !openMicEnabled, // automatically activate mic if openMicEnabled is true
        isSpeaking: false,
        userLevel: levelValue,
        isVIP: vipValue
      }, { merge: true });

      // Sync to audioRooms collection
      const seatNum = targetSeatId.split("_")[1];
      await updateDoc(doc(db, "audioRooms", activeStream.id), {
        [`seats.${seatNum}`]: {
          uid: req.userId,
          username: req.username,
          panelName: activeStream.title || "",
          avatar: req.photoURL,
          level: levelValue,
          isVIP: vipValue,
          mic: openMicEnabled,
          occupied: true
        }
      }).catch((err) => console.warn("Failed to update audioRoom seats in approval:", err));

      // Clear request
      await deleteDoc(doc(db, "liveStreams", activeStream.id, "requests", req.userId));
      setShowRequestsModal(false);

      // System notice
      const chatRef = collection(db, "liveStreams", activeStream.id, "chat");
      await addDoc(chatRef, {
        id: `sys_seat_${Date.now()}`,
        streamId: activeStream.id,
        senderId: "system",
        senderName: "SYSTEM",
        text: `${req.username} joined Seat ${targetSeatId.split("_")[1]}`,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveGuest = async (seatId: string) => {
    if (!activeStream) return;
    const seatNum = seatId.split("_")[1];
    try {
      const seatDocRef = doc(db, "liveStreams", activeStream.id, "seats", seatId);
      const seatSnap = await getDoc(seatDocRef);
      let data: any = null;
      if (seatSnap.exists()) {
        data = seatSnap.data();
      } else if (seatId === "seat_1") {
        const hostProfile = await getOrCreateAudioProfile(activeStream.creatorId, currentUser);
        data = {
          userId: activeStream.creatorId,
          username: hostProfile.nickname || activeStream.creatorName || "Host",
        };
      }

      await setDoc(seatDocRef, {
        userId: null,
        username: "",
        photoURL: "",
        role: "Listener",
        isMuted: false,
        isSpeaking: false,
        userLevel: null,
        isVIP: null
      }, { merge: true });

      // Also update the room seats in audioRooms
      await updateDoc(doc(db, "audioRooms", activeStream.id), {
        [`seats.${seatNum}`]: {
          uid: null,
          username: "",
          avatar: "",
          level: 1,
          mic: false,
          occupied: false,
        }
      }).catch(() => {});

      // Announcement
      if (data && data.userId) {
        const seatNumStr = seatId.split("_")[1];
        let text = "";
        if (currentUser?.uid === data.userId) {
          text = `${data.username} left Seat ${seatNumStr}.`;
        } else {
          text = `Host removed ${data.username} from Seat ${seatNumStr}.`;
        }
        await postSystemMessage(activeStream.id, text);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Mute / Unmute guest seat
  const handleToggleGuestMute = async (seatId: string, currentMute: boolean) => {
    if (!activeStream) return;
    const seatNum = seatId.split("_")[1];
    try {
      await setDoc(doc(db, "liveStreams", activeStream.id, "seats", seatId), {
        isMuted: !currentMute
      }, { merge: true });

      // Also update audioRooms seat mic state
      await updateDoc(doc(db, "audioRooms", activeStream.id), {
        [`seats.${seatNum}.mic`]: currentMute
      }).catch(() => {});
    } catch (err) {
      console.warn(err);
    }
  };

  const handleToggleSeatLock = async (seatId: string, currentLocked: boolean) => {
    if (!activeStream) return;
    const seatNum = seatId.split("_")[1];
    try {
      await setDoc(doc(db, "liveStreams", activeStream.id, "seats", seatId), {
        isLocked: !currentLocked
      }, { merge: true });

      // Also update audioRooms seat lock state
      await updateDoc(doc(db, "audioRooms", activeStream.id), {
        [`seats.${seatNum}.isLocked`]: !currentLocked
      }).catch(() => {});

      postSystemMessage(activeStream.id, `🔒 Seat ${seatId.split("_")[1]} has been ${!currentLocked ? "locked" : "unlocked"} by the Host.`);
    } catch (err) {
      console.warn(err);
    }
  };

  const handleLockAllEmptySeats = async () => {
    if (!activeStream || !seatsArray) return;
    try {
      const promises = seatsArray.map(async (seat) => {
        if (!seat.userId) { // empty seat
          const seatNum = seat.id.split("_")[1];
          await setDoc(doc(db, "liveStreams", activeStream.id, "seats", seat.id), {
            isLocked: true
          }, { merge: true });
          await updateDoc(doc(db, "audioRooms", activeStream.id), {
            [`seats.${seatNum}.isLocked`]: true
          }).catch(() => {});
        }
      });
      await Promise.all(promises);
      postSystemMessage(activeStream.id, `🔒 All empty seats have been locked by the Host.`);
      alert("All empty seats locked successfully!");
    } catch (err) {
      console.warn(err);
    }
  };

  const handleUnlockAllEmptySeats = async () => {
    if (!activeStream || !seatsArray) return;
    try {
      const promises = seatsArray.map(async (seat) => {
        if (!seat.userId) { // empty seat
          const seatNum = seat.id.split("_")[1];
          await setDoc(doc(db, "liveStreams", activeStream.id, "seats", seat.id), {
            isLocked: false
          }, { merge: true });
          await updateDoc(doc(db, "audioRooms", activeStream.id), {
            [`seats.${seatNum}.isLocked`]: false
          }).catch(() => {});
        }
      });
      await Promise.all(promises);
      postSystemMessage(activeStream.id, `🔓 All empty seats have been unlocked by the Host.`);
      alert("All empty seats unlocked successfully!");
    } catch (err) {
      console.warn(err);
    }
  };

  const handleMoveSeat = async (fromSeatId: string, toSeatId: string) => {
    if (!activeStream) return;
    const fromNum = fromSeatId.split("_")[1];
    const toNum = toSeatId.split("_")[1];
    try {
      const fromRef = doc(db, "liveStreams", activeStream.id, "seats", fromSeatId);
      const toRef = doc(db, "liveStreams", activeStream.id, "seats", toSeatId);

      const fromSnap = await getDoc(fromRef);
      let fromData: any = null;

      if (fromSnap.exists()) {
        fromData = fromSnap.data() as any;
      } else if (fromSeatId === "seat_1") {
        // Fallback for Host on Seat 1 if the subcollection document doesn't exist yet
        const hostProfile = await getOrCreateAudioProfile(activeStream.creatorId, currentUser);
        fromData = {
          userId: activeStream.creatorId,
          username: hostProfile.nickname || activeStream.creatorName || "Host",
          photoURL: hostProfile.avatarUrl || activeStream.creatorPhoto || "",
          role: "Host",
          isMuted: false,
          isSpeaking: false,
          userLevel: hostProfile.level || 10,
          isVIP: hostProfile.badges?.includes("VIP") || false
        };
      }

      if (!fromData || !fromData.userId) return;

      const movingUserProfile = await getOrCreateAudioProfile(fromData.userId, fromData.userId === currentUser?.uid ? currentUser : null);

      // Set microphone state based on Open Mic
      const isMutedValue = openMicEnabled ? false : (fromData.isMuted !== undefined ? fromData.isMuted : true);

      // Move to new seat
      await setDoc(toRef, {
        userId: fromData.userId,
        username: movingUserProfile.nickname,
        photoURL: movingUserProfile.avatarUrl,
        role: fromData.role,
        isMuted: isMutedValue,
        isSpeaking: false,
        userLevel: movingUserProfile.level || 1,
        isVIP: movingUserProfile.badges?.includes("VIP") || false
      }, { merge: true });

      // Vacate old seat
      await setDoc(fromRef, {
        userId: null,
        username: "",
        photoURL: "",
        role: "Listener",
        isMuted: false,
        isSpeaking: false,
        userLevel: null,
        isVIP: null
      }, { merge: true });

      // Synchronize Move in audioRooms doc as well
      const roomRef = doc(db, "audioRooms", activeStream.id);
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists()) {
        const roomData = roomSnap.data();
        const fromSeatVal = roomData.seats?.[fromNum] || {};

        await updateDoc(roomRef, {
          [`seats.${toNum}`]: {
            uid: fromData.userId,
            username: movingUserProfile.nickname,
            panelName: activeStream.title || "",
            avatar: movingUserProfile.avatarUrl,
            level: movingUserProfile.level || 1,
            isVIP: movingUserProfile.badges?.includes("VIP") || false,
            mic: fromSeatVal.mic !== undefined ? fromSeatVal.mic : true,
            occupied: true,
          },
          [`seats.${fromNum}`]: {
            uid: null,
            username: "",
            panelName: "",
            avatar: "",
            level: 1,
            isVIP: false,
            mic: false,
            occupied: false,
          }
        }).catch(() => {});
      }

      // System message for move
      postSystemMessage(
        activeStream.id, 
        `${movingUserProfile.nickname} moved to Seat ${toSeatId.split("_")[1]}.`
      );
    } catch (err) {
      console.error("Failed to move seat:", err);
    }
  };

  const handleToggleOpenMic = async () => {
    if (!activeStream) return;
    const current = (activeStream as any).openMicEnabled || false;
    try {
      await updateDoc(doc(db, "liveStreams", activeStream.id), {
        openMicEnabled: !current
      });
      postSystemMessage(activeStream.id, `🎙️ Open Mic is now ${!current ? "enabled (instant tap-to-stage)" : "disabled (approval required)"} in this room.`);
    } catch (err) {
      console.warn(err);
    }
  };

  const handleTriggerSimulatedPK = async () => {
    if (!activeStream) return;
    const battleId = `battle_sim_${Date.now()}`;
    const battleRef = doc(db, "live_battles", battleId);

    const battleData = {
      id: battleId,
      creator1Id: activeStream.creatorId,
      creator1Name: activeStream.creatorName,
      creator1Photo: activeStream.creatorPhoto || "",
      creator1StreamId: activeStream.id,
      creator2Id: "simulated_opponent_id",
      creator2Name: "DJ_OpponentPRO",
      creator2Photo: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&q=80",
      creator2StreamId: "simulated_opponent_stream_id",
      creator1Score: 0,
      creator2Score: 0,
      status: "active",
      duration: 300,
      startedAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + 300 * 1000).toISOString(),
      winnerId: null
    };

    try {
      await setDoc(battleRef, battleData);
      await updateDoc(doc(db, "liveStreams", activeStream.id), {
        activeBattleId: battleId
      });
      alert("Simulated PK Battle started!");
    } catch (e: any) {
      console.warn(e);
    }
  };

  const handleAddPKPoints = async (playerNum: number, points: number) => {
    if (!activeStream || !activeStream.activeBattleId) return;
    try {
      const battleRef = doc(db, "live_battles", activeStream.activeBattleId);
      if (playerNum === 1) {
        await updateDoc(battleRef, {
          creator1Score: increment(points)
        });
      } else {
        await updateDoc(battleRef, {
          creator2Score: increment(points)
        });
      }
    } catch (e: any) {
      console.warn(e);
    }
  };

  // Send virtual gift
  const handleTriggerGifting = (receiverId: string, receiverName: string, receiverPhoto: string) => {
    if (!currentUser) return;
    // Viewers cannot gift other guests/viewers in a unidirectional video stream, but the Host can gift anyone.
    // Self-gifting is also allowed.
    if (activeStream?.type === "video" && receiverId !== currentUser.uid) {
      const isSenderHost = currentUser.uid === activeStream.creatorId;
      if (!isSenderHost && receiverId !== activeStream.creatorId) {
        alert("In a Live Video Stream, gifts can only be sent directly to the Host.");
        return;
      }
    }
    setGiftingReceiver({ id: receiverId, name: receiverName, photo: receiverPhoto });
    setShowGiftModal(true);
  };

  const handleGiftSentCallback = async (giftName: string) => {
    const receiver = giftingReceiver || compactGiftReceiver;
    if (!activeStream || !currentUser || !receiver) return;
    
    // Add banner
    const bId = `${Date.now()}`;
    setGiftBanners(prev => [...prev, {
      id: bId,
      sender: currentUser.username || currentUser.displayName || "User",
      gift: giftName,
      photo: receiver.photo
    }]);
    setTimeout(() => {
      setGiftBanners(prev => prev.filter(b => b.id !== bId));
    }, 4500);

    // Update Tips/Gifts Analytics count on the stream document
    try {
      await updateDoc(doc(db, "liveStreams", activeStream.id), {
        virtualGiftsCount: increment(1),
        tipsAmount: increment(15) // Simulate 15 coins tip addition
      });
    } catch (e) {
      console.warn(e);
    }

    // Post system message in chat
    try {
      const msgId = `chat_gift_${Date.now()}`;
      const chatRef = collection(db, "liveStreams", activeStream.id, "chat");
      await addDoc(chatRef, {
        id: msgId,
        streamId: activeStream.id,
        senderId: "system",
        senderName: "GIFT",
        text: `🎁 @${currentUser.username || currentUser.displayName} sent a ${giftName} to @${receiver.name}!`,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.error(err);
    }

    setShowGiftModal(false);
    setGiftingReceiver(null);
    setCompactGiftReceiver(null);
  };

  // Heart trigger
  const handleSendHeart = async () => {
    if (!activeStream) return;
    try {
      await updateDoc(doc(db, "liveStreams", activeStream.id), {
        likes: increment(1)
      });
      // Occasionally post a beautiful system log for hearts so people see reactions
      if (Math.random() > 0.4) {
        const msgId = `chat_like_${Date.now()}`;
        const chatRef = collection(db, "liveStreams", activeStream.id, "chat");
        await addDoc(chatRef, {
          id: msgId,
          streamId: activeStream.id,
          senderId: "system",
          senderName: currentUser?.username || currentUser?.displayName || "Viewer",
          text: `sent a reaction ❤️`,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {}

    const colors = ["#ec4899", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
    const id = Date.now() + Math.random();
    setFloatingHearts(prev => [...prev, {
      id,
      left: Math.random() * 80 + 10,
      color: colors[Math.floor(Math.random() * colors.length)]
    }]);
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => h.id !== id));
    }, 2000);
  };

  // Share trigger
  const handleSendShare = async () => {
    if (!activeStream) return;
    try {
      await updateDoc(doc(db, "liveStreams", activeStream.id), {
        shares: increment(1)
      });
      // Post system message in chat
      const msgId = `chat_share_${Date.now()}`;
      const chatRef = collection(db, "liveStreams", activeStream.id, "chat");
      await addDoc(chatRef, {
        id: msgId,
        streamId: activeStream.id,
        senderId: "system",
        senderName: currentUser?.username || currentUser?.displayName || "Viewer",
        text: `shared the LIVE`,
        createdAt: new Date().toISOString()
      });
      navigator.clipboard.writeText(window.location.href);
      alert("Copied shareable room link to clipboard!");
    } catch (err) {
      console.warn(err);
    }
  };

  // Filters and Sorting computation
  const countries = ["All", "Nigeria", "Ghana", "South Africa", "United States", "United Kingdom", "Canada", "Germany", "Jamaica"];
  const categories = ["All", "Music", "Talk Show", "Gaming", "Podcast", "DJ Mix"];

  const filteredDiscoveryStreams = streams.filter(s => {
    // Layout filter (audio streams go to audio tab, video to video tab)
    if (s.type !== activeLayout) return false;
    
    // Country filter
    if (countryFilter !== "All" && (s as any).country !== countryFilter) return false;

    // Category filter
    if (categoryFilter !== "All" && s.category !== categoryFilter) return false;

    // Search query filter
    if (searchQuery.trim() !== "") {
      const matchQuery = searchQuery.toLowerCase();
      return s.title.toLowerCase().includes(matchQuery) || s.creatorName.toLowerCase().includes(matchQuery);
    }

    return true;
  });

  // Sort streams
  const sortedDiscoveryStreams = [...filteredDiscoveryStreams].sort((a, b) => {
    if (sortBy === "Popular") return b.viewerCount - a.viewerCount;
    if (sortBy === "Recent") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === "Gifting") return b.tipsAmount - a.tipsAmount;
    if (sortBy === "Guests") return b.virtualGiftsCount - a.virtualGiftsCount;
    return 0;
  });

  // Host Ranking calculation: top 10 ranked by scoring
  const hostRanking = [...streams]
    .map(s => {
      const score = (s.viewerCount || 0) * 10 + (s.likes || 0) + (s.tipsAmount || 0) * 5;
      return {
        id: s.id,
        name: s.creatorName,
        photo: s.creatorPhoto || "",
        score: Math.round(score),
        viewers: s.viewerCount,
        gifts: s.virtualGiftsCount
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const isHostUser = isHosting || (currentUser && activeStream && currentUser.uid === activeStream.creatorId) || false;
  const isModUser = (activeStream as any)?.moderators?.some((m: string) => {
    const cleanM = m.replace("@", "").toLowerCase();
    const cleanNick = (currentUserAudioProfile?.nickname || "").toLowerCase();
    const cleanDisplay = (currentUser?.displayName || "").toLowerCase();
    return (cleanNick && cleanM === cleanNick) || (cleanDisplay && cleanM === cleanDisplay);
  }) || false;
  const isHostOrMod = isHostUser || isModUser;

  const renderCommandHub = () => {
    if (!activeStream) return null;
    return (
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.95 }}
        className="absolute left-0 mt-2.5 w-80 sm:w-[350px] bg-zinc-950/98 backdrop-blur-3xl border border-emerald-500/35 rounded-[32px] p-4.5 shadow-2xl z-50 text-left overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Inner Header */}
        <div className="flex items-center justify-between border-b border-emerald-500/10 pb-2.5 mb-3">
          <div className="flex flex-col">
            <span className="font-mono text-[9px] font-black text-emerald-400 uppercase tracking-widest">🎛️ Command Hub</span>
            <span className="text-[11px] text-emerald-300 font-bold font-sans">Fred • ID: STREAM</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold font-mono">LIVE CTRL</span>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowFredIdentityMenu(false);
              }}
              className="text-zinc-400 hover:text-white text-sm cursor-pointer border-none bg-zinc-800/50 hover:bg-zinc-800 w-6 h-6 rounded-full flex items-center justify-center transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Toast Notification Banner within the hub */}
        {hubShowToast && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-emerald-950 to-teal-950 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-[10px] text-emerald-100 font-bold text-center shadow-lg shadow-emerald-500/10 mb-3"
          >
            {hubShowToast}
          </motion.div>
        )}

        {/* Premium Segmented Navigation Tabs */}
        <div className="grid grid-cols-5 gap-1 bg-black/40 p-1 rounded-2xl border border-white/5 mb-4">
          {(["info", "earn", "games", "backpack", "arena"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setHubTab(tab)}
              className={`py-2 rounded-xl text-[8px] font-black uppercase tracking-wider transition duration-300 cursor-pointer border-none ${
                hubTab === tab
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20"
                  : "text-zinc-400 hover:text-zinc-200 bg-transparent"
              }`}
            >
              {tab === "info" ? "👤 Info" : tab === "earn" ? "💎 Earn" : tab === "games" ? "🎡 Play" : tab === "backpack" ? "🎒 Pack" : "🔥 Arena"}
            </button>
          ))}
        </div>

        {/* Tab Content Panels */}
        <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-emerald-900/50">

          {/* Tab 1: Profile & Host Info */}
          {hubTab === "info" && (
            <div className="space-y-3.5">
              {/* Host Display Identity Card */}
              <div className="bg-gradient-to-br from-emerald-950/30 to-black/60 p-3 rounded-2xl border border-emerald-500/15">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img 
                      src={activeStream.creatorPhoto || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"} 
                      className="w-11 h-11 rounded-full object-cover border-2 border-emerald-500 shadow-md"
                      alt="Stage Host"
                    />
                    <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-[8px] px-1 rounded-md font-bold text-white font-mono">HOST</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-zinc-400 font-mono">🎤 Stage Name</p>
                    <h5 className="text-sm font-black text-white truncate flex items-center gap-1">
                      {activeStream.creatorName || "Fred the Rocker"} 
                      <span className="text-emerald-400 text-xs">✓</span>
                    </h5>
                    <p className="text-[9px] text-emerald-300 font-mono mt-0.5">
                      Unique ID: <span className="text-teal-300 font-bold select-all">#829501</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Immersive Layout Switcher Moved inside Fred ID: STREAM */}
              <div className="bg-emerald-950/10 border border-emerald-500/20 p-3 rounded-2xl space-y-2">
                <p className="text-[10px] font-black text-emerald-300 uppercase tracking-wider font-sans flex items-center gap-1.5">
                  <span>🌐</span> Immersive Stage View
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEnable3D(true);
                      setHubShowToast("🛸 Immersive 3D Space Scene activated!");
                    }}
                    className={`py-2 px-3 rounded-xl text-[9px] font-black uppercase tracking-wider transition duration-300 flex items-center justify-center gap-1 cursor-pointer ${
                      enable3D 
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border border-emerald-400 shadow-lg shadow-emerald-500/25"
                        : "bg-black/40 text-zinc-400 border border-transparent hover:text-zinc-200"
                    }`}
                  >
                    🛸 3D SPACE
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEnable3D(false);
                      setHubShowToast("⊞ Professional 2D Grid Stage activated!");
                    }}
                    className={`py-2 px-3 rounded-xl text-[9px] font-black uppercase tracking-wider transition duration-300 flex items-center justify-center gap-1 cursor-pointer ${
                      !enable3D 
                        ? "bg-gradient-to-r from-teal-600 to-cyan-600 text-white border border-teal-400 shadow-lg shadow-teal-500/25"
                        : "bg-black/40 text-zinc-400 border border-transparent hover:text-zinc-200"
                    }`}
                  >
                    ⊞ 2D GRID
                  </button>
                </div>
                <p className="text-[8px] text-zinc-500 font-mono text-center leading-normal">
                  Toggling changes the visual stream environment for all listeners!
                </p>
              </div>

              {/* User Level Growth */}
              <div className="bg-white/5 p-3 rounded-2xl border border-white/5 space-y-1.5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px]">🌟</span>
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider font-sans">User Level</span>
                  </div>
                  <span className="text-[9px] font-mono font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Lv.{hubUserLevel}
                  </span>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden relative">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                    style={{ width: `${(hubUserXp / 2000) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500">
                  <span>XP: {hubUserXp} / 2000</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (hubUserLevel < 15) {
                        const newXp = hubUserXp + 350;
                        if (newXp >= 2000) {
                          setHubUserLevel(prev => Math.min(15, prev + 1));
                          setHubUserXp(newXp - 2000);
                          setHubShowToast(`🎉 Level Up! You reached User Level ${hubUserLevel + 1}!`);
                        } else {
                          setHubUserXp(newXp);
                          setHubShowToast("⚡ +350 XP Gained from staying active!");
                        }
                      }
                    }}
                    className="text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded transition font-bold border-none cursor-pointer"
                  >
                    + Stay Active
                  </button>
                </div>
              </div>

              {/* Host Level Growth */}
              <div className="bg-white/5 p-3 rounded-2xl border border-white/5 space-y-1.5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px]">👑</span>
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider font-sans">Host Level</span>
                  </div>
                  <span className="text-[9px] font-mono font-black text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                    Lv.{hubHostLevel}
                  </span>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden relative">
                  <div 
                    className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-500"
                    style={{ width: `${(hubHostXp / 10000) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500">
                  <span>XP: {hubHostXp} / 10000</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (hubHostLevel < 15) {
                        const newXp = hubHostXp + 1500;
                        if (newXp >= 10000) {
                          setHubHostLevel(prev => Math.min(15, prev + 1));
                          setHubHostXp(newXp - 10000);
                          setHubShowToast(`👑 Host Level Up! Level ${hubHostLevel + 1}!`);
                        } else {
                          setHubHostXp(newXp);
                          setHubShowToast("💎 Received +1,500 Host XP!");
                        }
                      }
                    }}
                    className="text-teal-400 hover:text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 px-2 py-0.5 rounded transition font-bold border-none cursor-pointer"
                  >
                    + Broadcast XP
                  </button>
                </div>
              </div>

              {/* Agency Status Info */}
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 flex items-center justify-between text-[10px]">
                <span className="text-zinc-400 font-mono">Agency Association:</span>
                <span className="font-bold text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/20 font-mono text-[9px]">
                  {hubAgency}
                </span>
              </div>

              {/* Fanclub & Team Info */}
              <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-3 rounded-2xl border border-emerald-500/20 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black text-emerald-300 uppercase tracking-wide">💖 Fanclub: Club Fred</p>
                    <p className="text-[9px] text-zinc-400 mt-0.5">859 loyal supporters connected</p>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setHubShowToast("✨ Welcome to Club Fred! Exclusive badge active.");
                    }}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-black text-[8px] px-3 py-1 rounded-full shadow-md shadow-emerald-500/10 hover:opacity-90 border-none cursor-pointer"
                  >
                    JOIN CLUB
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Financial Wallet & Rewards */}
          {hubTab === "earn" && (
            <div className="space-y-3.5">
              {/* Live Center Quick Link */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setHubShowToast("💼 Navigating to Secure Live Analytics Center...");
                }}
                className="w-full p-2.5 bg-gradient-to-r from-emerald-950/45 to-teal-950/45 hover:from-emerald-900/60 hover:to-teal-900/60 rounded-xl border border-emerald-500/20 text-[10px] font-black text-emerald-200 uppercase tracking-wider flex items-center justify-between transition cursor-pointer"
              >
                <span>📊 Open Live Stats Center</span>
                <span>➔</span>
              </button>

              {/* Withdrawal Wallet Balance Card */}
              <div className="bg-gradient-to-br from-emerald-950/30 to-black/60 p-3 rounded-2xl border border-emerald-500/20 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px]">🏦</span>
                    <span className="text-[10px] font-bold text-zinc-400 font-mono">Withdrawal Wallet</span>
                  </div>
                  <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">SECURE</span>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[8px] text-zinc-500 font-mono">Gems / Cashout Balance</p>
                    <p className="text-lg font-black text-emerald-400 font-mono">${hubWithdrawalWallet.toFixed(2)}</p>
                  </div>
                  {!showWithdrawalForm && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (hubWithdrawalWallet >= 10) {
                          setShowWithdrawalForm(true);
                        } else {
                          setHubShowToast("❌ Min withdrawal is $10.00. Current balance too low!");
                        }
                      }}
                      className="py-1.5 px-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[9px] uppercase tracking-wider rounded-lg shadow-lg shadow-emerald-500/10 transition border-none cursor-pointer"
                    >
                      WITHDRAW FUNDS
                    </button>
                  )}
                </div>
              </div>

              {/* Real Withdrawal Request Form */}
              {showWithdrawalForm && (
                <div 
                  className="bg-black/50 p-3 rounded-2xl border border-emerald-500/30 space-y-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest font-mono">Real Money Cashout</p>
                    <button 
                      type="button"
                      onClick={() => setShowWithdrawalForm(false)}
                      className="text-zinc-500 hover:text-white text-[10px] bg-transparent border-none cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <form onSubmit={handleRealWithdrawalSubmit} className="space-y-2.5">
                    {/* Amount Input */}
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-zinc-400 uppercase font-mono block">Withdraw Amount (USD)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        min="10"
                        max={hubWithdrawalWallet}
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>

                    {/* Gateway Selector */}
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-zinc-400 uppercase font-mono block">Payment System Gateway</label>
                      <div className="grid grid-cols-4 gap-1">
                        {(["paypal", "bank", "stripe", "payoneer"] as const).map((method) => (
                          <button
                            type="button"
                            key={method}
                            onClick={() => setWithdrawMethod(method)}
                            className={`py-1 rounded text-[8px] font-black uppercase transition cursor-pointer border ${
                              withdrawMethod === method
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500"
                                : "bg-zinc-900 text-zinc-400 border-transparent hover:text-white"
                            }`}
                          >
                            {method}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Method Fields */}
                    {withdrawMethod === "paypal" && (
                      <div className="space-y-1 animate-fadeIn">
                        <label className="text-[8px] font-bold text-zinc-400 uppercase font-mono block">PayPal Account Email</label>
                        <input 
                          type="email" 
                          placeholder="yourname@paypal.com"
                          value={withdrawEmail}
                          onChange={(e) => setWithdrawEmail(e.target.value)}
                          className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                          required
                        />
                      </div>
                    )}

                    {withdrawMethod === "payoneer" && (
                      <div className="space-y-1 animate-fadeIn">
                        <label className="text-[8px] font-bold text-zinc-400 uppercase font-mono block">Payoneer Account Email</label>
                        <input 
                          type="email" 
                          placeholder="yourname@payoneer.com"
                          value={withdrawEmail}
                          onChange={(e) => setWithdrawEmail(e.target.value)}
                          className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                          required
                        />
                      </div>
                    )}

                    {withdrawMethod === "stripe" && (
                      <div className="space-y-1 animate-fadeIn">
                        <label className="text-[8px] font-bold text-zinc-400 uppercase font-mono block">Stripe Card Number / IBAN</label>
                        <input 
                          type="text" 
                          placeholder="XXXX XXXX XXXX XXXX"
                          value={withdrawCardNum}
                          onChange={(e) => setWithdrawCardNum(e.target.value)}
                          className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                          required
                        />
                      </div>
                    )}

                    {withdrawMethod === "bank" && (
                      <div className="space-y-2 animate-fadeIn">
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-400 uppercase font-mono block">Bank Name</label>
                            <input 
                              type="text" 
                              placeholder="Chase, HSBC, etc"
                              value={withdrawBankName}
                              onChange={(e) => setWithdrawBankName(e.target.value)}
                              className="w-full bg-zinc-900 border border-white/10 rounded-lg p-1.5 text-xs text-white focus:outline-none"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-400 uppercase font-mono block">Account Number</label>
                            <input 
                              type="text" 
                              placeholder="123456789"
                              value={withdrawAccountNum}
                              onChange={(e) => setWithdrawAccountNum(e.target.value)}
                              className="w-full bg-zinc-900 border border-white/10 rounded-lg p-1.5 text-xs text-white focus:outline-none"
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold text-zinc-400 uppercase font-mono block">SWIFT/BIC Code (Optional)</label>
                          <input 
                            type="text" 
                            placeholder="CHASUS33"
                            value={withdrawSwift}
                            onChange={(e) => setWithdrawSwift(e.target.value)}
                            className="w-full bg-zinc-900 border border-white/10 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    )}

                    <button 
                      type="submit"
                      className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-black text-xs uppercase tracking-wider rounded-lg shadow-lg hover:from-emerald-400 hover:to-teal-400 transition cursor-pointer border-none"
                    >
                      SUBMIT CASHOUT REQUEST
                    </button>
                  </form>
                </div>
              )}

              {/* Withdrawal Ledger Real Transaction History */}
              <div className="bg-white/5 p-3 rounded-2xl border border-white/5 space-y-2">
                <p className="text-[10px] font-bold text-white uppercase tracking-wider font-mono">📋 Cashout History Ledger</p>
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {withdrawalHistory.length === 0 ? (
                    <p className="text-[8px] text-zinc-500 italic font-mono text-center py-2">No withdrawal transactions processed yet.</p>
                  ) : (
                    withdrawalHistory.map((wd) => (
                      <div key={wd.id} className="flex justify-between items-center p-1.5 bg-black/45 rounded-lg border border-white/5 text-[9px] font-mono">
                        <div className="flex flex-col">
                          <span className="text-white font-bold">${Number(wd.amount).toFixed(2)}</span>
                          <span className="text-[7px] text-zinc-500">{wd.paymentMethod.toUpperCase()} • {new Date(wd.requestedAt).toLocaleDateString()}</span>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase ${
                          wd.status === "completed" 
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                            : wd.status === "failed" 
                              ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}>
                          {wd.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Noble Ranks Tier Selector */}
              <div className="bg-white/5 p-3 rounded-2xl border border-white/5 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px]">🛡️</span>
                    <p className="text-[10px] font-bold text-white uppercase tracking-wider">Noble Dignitary Title</p>
                  </div>
                  <span className="text-[9px] font-mono text-emerald-300 font-black">{hubNobleRank}</span>
                </div>
                <p className="text-[8px] text-zinc-400">Unlock sovereign status and special room entry banner cards.</p>
                <div className="grid grid-cols-3 gap-1">
                  {["Baron 🛡️", "Duke 👑", "Emperor 🌌"].map((rank) => (
                    <button
                      key={rank}
                      onClick={(e) => {
                        e.stopPropagation();
                        setHubNobleRank(rank);
                        setHubShowToast(`👑 Noble title updated to ${rank}!`);
                      }}
                      className={`py-1 rounded text-[8px] font-black uppercase transition cursor-pointer border ${
                        hubNobleRank === rank
                          ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                          : "bg-black/30 text-zinc-400 border-transparent hover:text-white"
                      }`}
                    >
                      {rank.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Invitation Referral Rewards */}
              <div className="bg-white/5 p-3 rounded-2xl border border-white/5 space-y-2">
                <p className="text-[10px] font-bold text-white uppercase tracking-wider">🔗 Invite friends & earn</p>
                <div className="flex justify-between items-center bg-black/40 p-1.5 rounded-lg border border-emerald-500/20">
                  <span className="font-mono text-[9px] text-zinc-400">Your Code:</span>
                  <span className="font-mono text-[10px] text-teal-300 font-black select-all tracking-wider">FRED_LIVE_521</span>
                </div>
                <div className="flex gap-1.5">
                  <input 
                    type="text" 
                    placeholder="Enter invite code" 
                    value={hubInviteCode}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setHubInviteCode(e.target.value)}
                    className="flex-1 bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-[9px] text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (hubInviteCode.trim()) {
                        setHubInvitationCount(prev => prev + 1);
                        setHubInvitationRewards(prev => prev + 50);
                        setHubInviteCode("");
                        setHubShowToast("🎉 Valid Code! You claimed 50 free Coins!");
                      } else {
                        setHubShowToast("❌ Enter a friend's code to claim!");
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 px-3 text-[9px] font-bold text-white rounded-lg transition border-none cursor-pointer"
                  >
                    Claim
                  </button>
                </div>
                <div className="flex justify-between text-[8px] text-zinc-500 font-mono pt-1">
                  <span>Invites: {hubInvitationCount} users</span>
                  <span>Claimed: {hubInvitationRewards} coins</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Lucky Wheel & Mini-Games */}
          {hubTab === "games" && (
            <div className="space-y-3.5">
              {/* Daily Check-In Streak */}
              <div className="bg-gradient-to-br from-emerald-950/20 to-teal-950/20 p-3 rounded-2xl border border-emerald-500/10 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black text-emerald-300 uppercase tracking-wide">🔥 Daily Stream Streak</p>
                    <p className="text-[9px] text-zinc-400">{hubCheckInStreak} consecutive active stream days</p>
                  </div>
                  <button
                    disabled={hubDailyCheckedIn}
                    onClick={(e) => {
                      e.stopPropagation();
                      setHubDailyCheckedIn(true);
                      setHubCheckInStreak(prev => prev + 1);
                      setHubShowToast("🔥 Checked in! Bonus 15 coins added to balance.");
                    }}
                    className={`font-black text-[8px] px-3 py-1 rounded-full shadow-md border-none cursor-pointer transition ${
                      hubDailyCheckedIn 
                        ? "bg-zinc-800 text-zinc-500" 
                        : "bg-gradient-to-r from-emerald-500 to-teal-500 text-black hover:scale-105"
                    }`}
                  >
                    {hubDailyCheckedIn ? "CLAIMED" : "CHECK IN"}
                  </button>
                </div>
                {/* Small visual calendar streak */}
                <div className="flex justify-between gap-1 pt-1">
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                    <div 
                      key={day}
                      className={`flex-1 text-center py-1 rounded text-[8px] font-mono font-bold border ${
                        day <= hubCheckInStreak
                          ? "bg-gradient-to-b from-emerald-600/30 to-teal-600/30 text-emerald-300 border-emerald-500/45"
                          : "bg-black/40 text-zinc-600 border-zinc-800"
                      }`}
                    >
                      D{day}
                    </div>
                  ))}
                </div>
              </div>

              {/* Daily Lucky Spin Wheel - Stay All Day */}
              <div className="bg-white/5 p-3 rounded-2xl border border-white/5 space-y-2 text-center relative overflow-hidden">
                <p className="text-[10px] font-bold text-white uppercase tracking-wider text-left">🎡 Live Lucky Wheel</p>
                <p className="text-[8px] text-zinc-400 text-left mb-2">Spin once every hour to win high-value rewards instantly.</p>
                
                {/* Lucky Wheel Pointer & Visual representation */}
                <div className="relative w-28 h-28 mx-auto my-1.5 flex items-center justify-center">
                  <div className={`w-28 h-28 rounded-full border-4 border-emerald-500 bg-gradient-to-tr from-[#051c11] via-[#02231c] to-[#041510] flex items-center justify-center relative shadow-xl overflow-hidden ${hubSpinState.isSpinning ? "animate-spin" : ""}`}>
                    <div className="absolute w-full h-0.5 bg-emerald-500/40" />
                    <div className="absolute h-full w-0.5 bg-emerald-500/40" />
                    <div className="absolute w-20 h-20 rounded-full border-2 border-emerald-500/20 flex items-center justify-center">
                      <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest font-mono">SPIN</span>
                    </div>
                    <span className="absolute top-2 text-[10px]">👑</span>
                    <span className="absolute right-2 text-[10px]">💎</span>
                    <span className="absolute bottom-2 text-[10px]">🚀</span>
                    <span className="absolute left-2 text-[10px]">🔑</span>
                  </div>
                </div>

                <button
                  disabled={hubSpinState.isSpinning}
                  onClick={(e) => {
                    e.stopPropagation();
                    setHubSpinState({ isSpinning: true, message: "" });
                    setTimeout(() => {
                      const awards = [
                        "Gold Badge Frame 🏷️",
                        "150 Free Coins 🪙",
                        "Lucky Treasure Key 🔑",
                        "Double Heart Booster 💖",
                        "Entrance Airship 🚀"
                      ];
                      const won = awards[Math.floor(Math.random() * awards.length)];
                      setHubSpinState({ isSpinning: false, message: won });
                      setHubShowToast(`🎡 Lucky Spin Won: ${won}!`);
                      // update key count if key is won
                      if (won.includes("Key")) {
                        setHubBackpackItems(prev => prev.map(item => item.id === "key" ? { ...item, count: item.count + 1 } : item));
                      } else if (won.includes("Airship")) {
                        setHubBackpackItems(prev => prev.map(item => item.id === "airship" ? { ...item, count: item.count + 1 } : item));
                      }
                    }, 1800);
                  }}
                  className="w-full py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-black font-black text-[9px] uppercase tracking-wider rounded-xl shadow-md transition border-none cursor-pointer"
                >
                  {hubSpinState.isSpinning ? "SPINNING WHEEL..." : "TAP TO SPIN WHEEL"}
                </button>

                {hubSpinState.message && (
                  <p className="text-[9px] font-mono font-bold text-emerald-300 bg-emerald-500/15 py-1 px-2 rounded-lg mt-2 text-center">
                    Result: {hubSpinState.message}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Backpack & Feedback & chests */}
          {hubTab === "backpack" && (
            <div className="space-y-3.5">
              {/* My Backpack Items list */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-white uppercase tracking-wider">🎒 My Backpack Inventory</p>
                <div className="space-y-1.5">
                  {hubBackpackItems.map((item) => (
                    <div key={item.id} className="bg-white/5 p-2 rounded-xl border border-white/5 flex items-center justify-between text-[10px]">
                      <div className="flex-1">
                        <p className="font-bold text-white">{item.name}</p>
                        <p className="text-[8px] text-zinc-400">{item.desc}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                          Qty: {item.count}
                        </span>
                        <button
                          disabled={item.count <= 0}
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (item.count > 0) {
                              // decrement count
                              setHubBackpackItems(prev => prev.map(p => p.id === item.id ? { ...p, count: p.count - 1 } : p));
                              setHubShowToast(`🎒 Activated 1x ${item.name}!`);

                              // trigger live chat effect announcement
                              if (activeStream) {
                                try {
                                  const chatRef = collection(db, "liveStreams", activeStream.id, "chat");
                                  await addDoc(chatRef, {
                                    id: `chat_backpack_${Date.now()}`,
                                    streamId: activeStream.id,
                                    senderId: "system",
                                    senderName: currentUser?.username || currentUser?.displayName || "System",
                                    text: `used a Backpack Item: ${item.name}! 🌟`,
                                    createdAt: new Date().toISOString()
                                  });
                                } catch (err) {}
                              }
                            }
                          }}
                          className="bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-[8px] px-2 py-1 rounded-md transition border-none cursor-pointer disabled:bg-zinc-800 disabled:text-zinc-600"
                        >
                          USE
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* My Treasure Chest Game */}
              <div className="bg-emerald-950/10 p-3 rounded-2xl border border-emerald-500/20 space-y-2">
                <p className="text-[10px] font-bold text-white uppercase tracking-wider">🎁 My Treasure Chests</p>
                <p className="text-[8px] text-zinc-400">Unlock chests using Lucky Keys for high-tier coins and dynamic avatar tags.</p>
                <div className="grid grid-cols-2 gap-2">
                  {/* Bronze Chest */}
                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 text-center space-y-1.5">
                    <span className="text-xl">🧰</span>
                    <p className="text-[9px] font-bold text-amber-200">Bronze Chest</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const keyItem = hubBackpackItems.find(i => i.id === "key");
                        if (keyItem && keyItem.count >= 1) {
                          setHubBackpackItems(prev => prev.map(i => i.id === "key" ? { ...i, count: i.count - 1 } : i));
                          setHubShowToast("🧰 Bronze Chest Unlocked! Gained 85 Sound Coins!");
                        } else {
                          setHubShowToast("❌ Need 1 Lucky Treasure Key from Backpack!");
                        }
                      }}
                      className="w-full py-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-500/30 hover:border-amber-500 rounded text-[8px] font-black uppercase tracking-wider cursor-pointer"
                    >
                      Unlock (1 Key)
                    </button>
                  </div>

                  {/* Gold Chest */}
                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 text-center space-y-1.5">
                    <span className="text-xl">👑</span>
                    <p className="text-[9px] font-bold text-yellow-300">Gold Chest</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const keyItem = hubBackpackItems.find(i => i.id === "key");
                        if (keyItem && keyItem.count >= 3) {
                          setHubBackpackItems(prev => prev.map(i => i.id === "key" ? { ...i, count: i.count - 3 } : i));
                          setHubShowToast("👑 Golden Royal Chest Unlocked! Gained 320 Sound Coins!");
                        } else {
                          setHubShowToast("❌ Need 3 Lucky Treasure Keys from Backpack!");
                        }
                      }}
                      className="w-full py-1 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-300 border border-yellow-500/30 hover:border-yellow-500 rounded text-[8px] font-black uppercase tracking-wider cursor-pointer"
                    >
                      Unlock (3 Keys)
                    </button>
                  </div>
                </div>
              </div>

              {/* VIP Status privileges info */}
              <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 p-3 rounded-2xl border border-yellow-500/20">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-black text-yellow-300 uppercase tracking-wide flex items-center gap-1">🌟 VIP Status Privilege</span>
                  <span className="text-[8px] bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 px-2 py-0.5 rounded font-mono font-bold">VIP ACTIVE</span>
                </div>
                <p className="text-[8px] text-zinc-400">Your VIP subscription includes an elite text theme, golden chat outline, and exclusive badge markers.</p>
              </div>

              {/* Host Room Feedback Submission */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 font-mono">✍️ SoundStream Room Feedback</label>
                <div className="flex gap-1.5">
                  <input 
                    type="text" 
                    placeholder="Suggest a feature or sound setting..." 
                    value={hubFeedbackText}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setHubFeedbackText(e.target.value)}
                    className="flex-1 bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-[9px] text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (hubFeedbackText.trim()) {
                        setHubFeedbackText("");
                        setHubShowToast("💖 Feedback submitted securely to Fred!");
                      } else {
                        setHubShowToast("❌ Feedback cannot be blank!");
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 px-3 text-[9px] font-bold text-black rounded-lg transition border-none cursor-pointer"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: 2026 Interactive Arena */}
          {hubTab === "arena" && (
            <div className="space-y-3.5 text-left">
              {/* Viewer Coins Balance Card */}
              <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/10 p-3 rounded-2xl border border-emerald-500/25 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🪙</span>
                  <div>
                    <p className="text-[10px] font-black text-emerald-300 uppercase tracking-wider">My Sound Coins</p>
                    <p className="text-xs font-black text-white font-mono">{viewerCoinBalance} COINS</p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewerCoinBalance(c => c + 150);
                    setHubShowToast("💸 Free Coin Boost Claimed! +150 Coins added.");
                  }}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 transition rounded-xl text-[9px] font-black text-black uppercase cursor-pointer border-none"
                >
                  Claim Free +150
                </button>
              </div>

              {/* Live Prediction Game */}
              <div className="bg-gradient-to-br from-[#05140e] to-[#010c08] p-3 rounded-2xl border border-emerald-500/20 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wide flex items-center gap-1">🔮 Real-Time Predictions</span>
                  {activePrediction && activePrediction.timeLeft > 0 ? (
                    <span className="text-[8px] bg-red-500/20 text-red-300 border border-red-500/30 px-1.5 py-0.5 rounded font-mono font-bold animate-pulse">
                      Ends in: {activePrediction.timeLeft}s
                    </span>
                  ) : (
                    <span className="text-[8px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded font-mono">CLOSED</span>
                  )}
                </div>

                {activePrediction ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-white text-left leading-relaxed">{activePrediction.question}</p>
                    
                    {/* Prediction Pools splits visualizer */}
                    <div className="space-y-1">
                      <div className="w-full bg-zinc-900 h-2.5 rounded-full overflow-hidden flex">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                          style={{ width: `${(activePrediction.optionAPool / (activePrediction.optionAPool + activePrediction.optionBPool || 1)) * 100}%` }}
                        />
                        <div 
                          className="h-full bg-gradient-to-r from-teal-700 to-cyan-600 transition-all duration-300"
                          style={{ width: `${(activePrediction.optionBPool / (activePrediction.optionAPool + activePrediction.optionBPool || 1)) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[8px] font-mono text-zinc-400">
                        <span>Option A: {activePrediction.optionAPool} ({(activePrediction.optionAPool / (activePrediction.optionAPool + activePrediction.optionBPool || 1) * 100).toFixed(0)}%)</span>
                        <span>Option B: {activePrediction.optionBPool} ({(activePrediction.optionBPool / (activePrediction.optionAPool + activePrediction.optionBPool || 1) * 100).toFixed(0)}%)</span>
                      </div>
                    </div>

                    {/* Betting Choice buttons */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <button
                        disabled={activePrediction.timeLeft <= 0 || activePrediction.userChoice !== null}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (viewerCoinBalance < 100) {
                            setHubShowToast("❌ Not enough coins! Claim a free boost first.");
                            return;
                          }
                          setViewerCoinBalance(c => c - 100);
                          setActivePrediction(p => ({
                            ...p,
                            optionAPool: p.optionAPool + 100,
                            userChoice: "A",
                            userWager: 100
                          }));
                          // Increment quest
                          setDailyQuests(quests => quests.map(q => q.id === "quest_3" ? { ...q, progress: q.progress + 1, completed: q.progress + 1 >= q.target } : q));
                          setHubShowToast("🔮 Bet of 100 coins placed on [YES] Option A!");
                        }}
                        className={`py-1.5 rounded-xl text-[9px] font-black uppercase transition border-none cursor-pointer ${
                          activePrediction.userChoice === "A"
                            ? "bg-emerald-600 text-black"
                            : "bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/40 border border-emerald-500/20"
                        }`}
                      >
                        {activePrediction.userChoice === "A" ? "WAGERED A" : "BET Option A (100)"}
                      </button>
                      <button
                        disabled={activePrediction.timeLeft <= 0 || activePrediction.userChoice !== null}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (viewerCoinBalance < 100) {
                            setHubShowToast("❌ Not enough coins! Claim a free boost first.");
                            return;
                          }
                          setViewerCoinBalance(c => c - 100);
                          setActivePrediction(p => ({
                            ...p,
                            optionBPool: p.optionBPool + 100,
                            userChoice: "B",
                            userWager: 100
                          }));
                          setDailyQuests(quests => quests.map(q => q.id === "quest_3" ? { ...q, progress: q.progress + 1, completed: q.progress + 1 >= q.target } : q));
                          setHubShowToast("🔮 Bet of 100 coins placed on [NO] Option B!");
                        }}
                        className={`py-1.5 rounded-xl text-[9px] font-black uppercase transition border-none cursor-pointer ${
                          activePrediction.userChoice === "B"
                            ? "bg-teal-600 text-black"
                            : "bg-teal-950/40 text-teal-300 hover:bg-teal-900/40 border border-teal-500/20"
                        }`}
                      >
                        {activePrediction.userChoice === "B" ? "WAGERED B" : "BET Option B (100)"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[8px] text-zinc-500">No active prediction. Check back soon!</p>
                )}
                
                <p className="text-[8px] text-zinc-400 mt-2 font-mono">Type a message to have an AI custom vocal track speak it out loud on the stream!</p>
                
                {/* Voices grid selector */}
                <div className="grid grid-cols-4 gap-1">
                  {["robot", "alien", "deep", "kawaii"].map((v) => (
                    <button
                      key={v}
                      onClick={(e) => {
                        e.stopPropagation();
                        setAiTTSVoice(v);
                      }}
                      className={`py-1 rounded text-[8px] font-bold uppercase transition border cursor-pointer ${
                        aiTTSVoice === v
                          ? "bg-emerald-600 border-emerald-500 text-black font-black"
                          : "bg-black/30 border-white/5 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {v === "robot" ? "🤖 ROBOT" : v === "alien" ? "👽 SPACE" : v === "deep" ? "🎙️ DEEP" : "🌸 KAWAII"}
                    </button>
                  ))}
                </div>

                <div className="flex gap-1.5">
                  <input 
                    type="text" 
                    placeholder="Type TTS text here..." 
                    value={ttsSpeechText}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setTtsSpeechText(e.target.value)}
                    className="flex-1 bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-[9px] text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button 
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!ttsSpeechText.trim()) {
                        setHubShowToast("❌ Enter text to narrate!");
                        return;
                      }
                      if (viewerCoinBalance < 50) {
                        setHubShowToast("❌ Needs 50 coins to narrate!");
                        return;
                      }
                      setViewerCoinBalance(c => c - 50);
                      const textToSend = ttsSpeechText;
                      setTtsSpeechText("");
                      setHubShowToast(`🗣️ Submitting custom [${aiTTSVoice.toUpperCase()}] narration!`);

                      // Push voice narration event
                      setTtsHistory(prev => [{ id: `tts_${Date.now()}`, text: textToSend, voice: aiTTSVoice }, ...prev]);

                      // Post a beautiful narration system comment to chat
                      if (activeStream) {
                        try {
                          const chatRef = collection(db, "liveStreams", activeStream.id, "chat");
                          await addDoc(chatRef, {
                            id: `chat_tts_${Date.now()}`,
                            streamId: activeStream.id,
                            senderId: "system",
                            senderName: `📢 AI_TTS_BOT [${aiTTSVoice.toUpperCase()}]`,
                            text: `"${textToSend}"`,
                            createdAt: new Date().toISOString()
                          });
                        } catch (err) {}
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 px-2.5 text-[8px] font-black uppercase text-black rounded-lg transition border-none cursor-pointer"
                  >
                    SPEAK (50)
                  </button>
                </div>
              </div>

              {/* Interactive Soundboard Presets */}
              <div className="bg-white/5 p-3 rounded-2xl border border-white/5 space-y-2">
                <p className="text-[10px] font-bold text-white uppercase tracking-wider">🎛️ Soundboard FX React</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {soundboardItems.map((fx) => (
                    <button
                      key={fx.id}
                      onClick={async (e) => {
                        e.stopPropagation();
                        
                        // Progress Soundboard quest
                        setDailyQuests(quests => quests.map(q => q.id === "quest_2" ? { ...q, progress: Math.min(q.progress + 1, q.target), completed: q.progress + 1 >= q.target } : q));

                        setHubShowToast(`🔊 Activated FX: ${fx.name}`);

                        // Push to chat
                        if (activeStream) {
                          try {
                            const chatRef = collection(db, "liveStreams", activeStream.id, "chat");
                            await addDoc(chatRef, {
                              id: `chat_fx_${Date.now()}`,
                              streamId: activeStream.id,
                              senderId: "system",
                              senderName: currentUser?.username || currentUser?.displayName || "Viewer",
                              text: `triggered soundboard effect: ${fx.soundText}`,
                              createdAt: new Date().toISOString()
                            });
                          } catch (err) {}
                        }
                      }}
                      className="flex items-center gap-1.5 p-2 bg-black/40 hover:bg-black/70 border border-white/5 hover:border-emerald-500/30 rounded-xl transition text-[9px] text-left text-zinc-300 font-bold cursor-pointer"
                    >
                      <span className="text-sm">{fx.emoji}</span>
                      <span className="truncate">{fx.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Daily Stream Quests */}
              <div className="bg-gradient-to-br from-[#05140e] to-[#010c08] p-3 rounded-2xl border border-white/5 space-y-2">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-left">🏆 Arena Daily Engager Quests</p>
                <div className="space-y-2">
                  {dailyQuests.map((q) => (
                    <div key={q.id} className="space-y-1 text-left">
                      <div className="flex justify-between items-center text-[9px]">
                        <span className="text-white font-bold truncate pr-2">{q.label}</span>
                        <span className="font-mono text-[8px] text-emerald-400 font-black">{q.completed ? "COMPLETED" : `${q.progress}/${q.target}`}</span>
                      </div>
                      <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="h-full transition-all duration-300 bg-gradient-to-r from-emerald-500 to-teal-500"
                          style={{ width: `${Math.min((q.progress / q.target) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-1.5 pt-3 border-t border-white/10 mt-3 text-left">
          <label className="text-[9px] font-bold uppercase tracking-wider text-emerald-300 font-mono flex items-center justify-between">
            <span>🎙️ Studio Sound Profiler</span>
            <span className="text-zinc-500 text-[8px]">Active: {soundPreset}</span>
          </label>
          <div className="grid grid-cols-4 gap-1">
            {["Studio", "Hall", "Echo", "Stadium"].map((preset) => (
              <button
                key={preset}
                onClick={(e) => {
                  e.stopPropagation();
                  setSoundPreset(preset);
                  setHubShowToast(`🎙️ Mic Sound preset updated to ${preset}!`);
                }}
                className={`py-1 rounded-lg text-[8px] font-bold transition flex flex-col items-center gap-0.5 cursor-pointer ${
                  soundPreset === preset
                    ? "bg-emerald-600 text-black border border-emerald-400/20 font-black"
                    : "bg-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-white/10"
                }`}
              >
                <span>{preset === "Studio" ? "🎙️" : preset === "Hall" ? "🏰" : preset === "Echo" ? "🎚️" : "🏟️"}</span>
                <span>{preset}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Copy Room Link Helper */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(window.location.href);
            setHubShowToast("📋 Copied room connection link!");
          }}
          className="w-full mt-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl text-[9px] font-mono font-bold text-black uppercase tracking-wider text-center transition cursor-pointer border-none"
        >
          📋 Copy Connection Link
        </button>
      </motion.div>
    );
  };

  return (
    <div id="soundstream-live-hub" className="text-white font-sans max-w-7xl mx-auto py-2 space-y-10">
      
      {/* ========================================================= */}
      {/* 1. IMMERSIVE LIVE ROOM OVERLAY                            */}
      {/* ========================================================= */}
      <AnimatePresence>
        {activeStream && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="fixed inset-0 bg-black/95 z-50 flex flex-col md:flex-row h-screen w-screen overflow-hidden text-white"
          >
            {/* Host End Live Screen */}
            {hostEndedScreen && (
              <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="p-8 space-y-6 max-w-md bg-zinc-900 border border-red-500/20 rounded-3xl shadow-2xl animate-pulse">
                  <StopCircle className="w-16 h-16 text-red-500 mx-auto" />
                  <h4 className="font-bold text-xl uppercase tracking-wider text-white">Livestream Ended Successfully</h4>
                  <p className="text-xs text-zinc-400 font-mono">Disbanding audio nodes and saving stats analytics...</p>
                </div>
              </div>
            )}

            {/* Left/Main Broadcast Canvas or Seats Grid Panel */}
            <div className={`flex-1 flex flex-col relative h-full ${showSidebar ? "border-r border-white/5" : ""} justify-between transition-colors duration-300 ${
              activeStream.type === "audio" 
                ? "bg-gradient-to-b from-[#1c0d45] via-[#090317] to-[#04010a]" 
                : "bg-black"
            }`}>
              
              {/* Animated immersive background or 3D Space Scene */}
              {activeStream.type === "audio" && (
                enable3D && isWebGLAvailable() ? (
                  <SoundStreamLive3DRoom
                    seatsArray={seatsArray.map(s => ({
                      id: s.id,
                      userId: s.userId || null,
                      username: s.username || "Guest",
                      photoURL: s.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
                      role: s.role || "Guest",
                      isMuted: s.isMuted ?? true,
                      isSpeaking: s.isSpeaking ?? false,
                      coins: s.coins || "1.0K"
                    }))}
                    roomTheme={roomTheme}
                    giftBanners={giftBanners}
                    currentUser={currentUser}
                    activeStream={activeStream}
                    fullScreen={true}
                    onSeatClick={async (seatNum) => {
                      const dbSeat = seatsArray.find(s => s.id === `seat_${seatNum}`);
                      const isOccupiedByRealUser = dbSeat && dbSeat.userId !== null;
                      if (!isOccupiedByRealUser) {
                        await handleOccupySeat(`seat_${seatNum}`);
                      } else if (dbSeat.userId === currentUser?.uid) {
                        // Toggle mic
                        const newMute = !isMuted;
                        setIsMuted(newMute);
                        if (currentUser && activeStream) {
                          const userSeat = seatsArray.find(s => s.userId === currentUser.uid);
                          if (userSeat) {
                            await handleToggleGuestMute(userSeat.id, !newMute);
                          }
                        }
                      } else {
                        // Open gift modal
                        setGiftingReceiver({
                          id: dbSeat.userId,
                          name: dbSeat.username || "Guest",
                          photo: dbSeat.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"
                        });
                        setShowGiftModal(true);
                      }
                    }}
                  />
                ) : (
                  <AnimatedBackground theme={roomTheme} />
                )
              )}
              
              {/* Realtime beautiful virtual gifts overlay animation */}
              <GiftingOverlay streamId={activeStream.id} />
              
              {/* Floating Gift Banner notifications */}
              <div className="absolute top-28 left-4 z-40 space-y-2 pointer-events-none">
                {giftBanners.map((banner) => (
                  <motion.div
                    key={banner.id}
                    initial={{ x: -100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 100, opacity: 0 }}
                    className="flex items-center gap-3 bg-gradient-to-r from-pink-600/90 to-indigo-600/90 backdrop-blur px-4 py-2 rounded-full border border-pink-500/30 text-xs shadow-lg font-bold"
                  >
                    <img src={banner.photo || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=50"} alt="" className="w-6 h-6 rounded-full object-cover" />
                    <span>⚡ {banner.sender} sent a {banner.gift}!</span>
                  </motion.div>
                ))}
              </div>

              {/* Floating Hearts Animation stage */}
              <div className="absolute right-4 bottom-24 w-28 h-64 pointer-events-none overflow-hidden z-30">
                {floatingHearts.map((heart) => (
                  <motion.div
                    key={heart.id}
                    initial={{ y: 220, opacity: 1, scale: 0.8, x: heart.left }}
                    animate={{ y: 0, opacity: 0, scale: 1.4, x: heart.left + (Math.random() * 40 - 20) }}
                    transition={{ duration: 2, ease: "easeOut" }}
                    className="absolute text-2xl"
                    style={{ color: heart.color }}
                  >
                    ❤️
                  </motion.div>
                ))}
              </div>

              {/* Top Bar Navigation Info */}
              {activeStream.type === "audio" ? (
                /* Beautiful High-Fidelity Header for Social Audio Room matching screenshot */
                <div className="p-4 flex items-center justify-between shrink-0 bg-transparent z-30 w-full max-w-5xl mx-auto">
                  <div className="flex items-center gap-2.5">
                    {/* Vibes Room ID Column (Interactive Dropdown Trigger for Control Center) */}
                    <div className="relative">
                      <div 
                        onClick={() => setShowHostProfileMenu(true)}
                        className="flex flex-col cursor-pointer bg-black/30 hover:bg-[#7c3aed]/15 border border-white/5 hover:border-[#7c3aed]/30 px-3.5 py-1.5 rounded-2xl transition duration-300 select-none group"
                        title="Click to open Live Control Center"
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-sm">🔥</span>
                          <h4 className="font-extrabold text-white text-sm sm:text-base tracking-wide font-sans flex items-center gap-1 group-hover:text-indigo-200">
                            {activeStream.title || "Vibes Room"}
                            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-hover:text-indigo-300" />
                          </h4>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-zinc-400 font-medium">
                            ID: {activeStream.id ? activeStream.id.slice(0, 6).toUpperCase() : "123456"}
                          </span>
                          {/* Verification check badge */}
                          <span className="w-3.5 h-3.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-[8px] font-extrabold">
                            ✓
                          </span>
                        </div>
                      </div>

                      {/* Expanded Interactive Control Center attached directly to Fred ID: STREAM */}
                      <AnimatePresence>
                        {showFredIdentityMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: 12, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 12, scale: 0.95 }}
                            className="absolute left-0 mt-2.5 w-80 sm:w-[350px] bg-zinc-950/98 backdrop-blur-3xl border border-emerald-500/35 rounded-[32px] p-4.5 shadow-2xl z-50 text-left overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Inner Header */}
                            <div className="flex items-center justify-between border-b border-emerald-500/10 pb-2.5 mb-3">
                              <div className="flex flex-col">
                                <span className="font-mono text-[9px] font-black text-emerald-400 uppercase tracking-widest">🎛️ Command Hub</span>
                                <span className="text-[11px] text-emerald-300 font-bold font-sans">Fred • ID: STREAM</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold font-mono">LIVE CTRL</span>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowFredIdentityMenu(false);
                                  }}
                                  className="text-zinc-400 hover:text-white text-sm cursor-pointer border-none bg-zinc-800/50 hover:bg-zinc-800 w-6 h-6 rounded-full flex items-center justify-center transition"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>

                            {/* Toast Notification Banner within the hub */}
                            {hubShowToast && (
                              <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-gradient-to-r from-emerald-950 to-teal-950 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-[10px] text-emerald-100 font-bold text-center shadow-lg shadow-emerald-500/10 mb-3"
                              >
                                {hubShowToast}
                              </motion.div>
                            )}

                            {/* Premium Segmented Navigation Tabs */}
                            <div className="grid grid-cols-5 gap-1 bg-black/40 p-1 rounded-2xl border border-white/5 mb-4">
                              {(["info", "earn", "games", "backpack", "arena"] as const).map((tab) => (
                                <button
                                  key={tab}
                                  onClick={() => setHubTab(tab)}
                                  className={`py-2 rounded-xl text-[8px] font-black uppercase tracking-wider transition duration-300 cursor-pointer border-none ${
                                    hubTab === tab
                                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20"
                                      : "text-zinc-400 hover:text-zinc-200 bg-transparent"
                                  }`}
                                >
                                  {tab === "info" ? "👤 Info" : tab === "earn" ? "💎 Earn" : tab === "games" ? "🎡 Play" : tab === "backpack" ? "🎒 Pack" : "🔥 Arena"}
                                </button>
                              ))}
                            </div>

                            {/* Tab Content Panels */}
                            <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-emerald-900/50">

                              {/* Tab 1: Profile & Host Info */}
                              {hubTab === "info" && (
                                <div className="space-y-3.5">
                                  {/* Host Display Identity Card */}
                                  <div className="bg-gradient-to-br from-emerald-950/30 to-black/60 p-3 rounded-2xl border border-emerald-500/15">
                                    <div className="flex items-center gap-3">
                                      <div className="relative">
                                        <img 
                                          src={activeStream.creatorPhoto || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"} 
                                          className="w-11 h-11 rounded-full object-cover border-2 border-emerald-500 shadow-md"
                                          alt="Stage Host"
                                        />
                                        <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-[8px] px-1 rounded-md font-bold text-white font-mono">HOST</span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-bold text-zinc-400 font-mono">🎤 Stage Name</p>
                                        <h5 className="text-sm font-black text-white truncate flex items-center gap-1">
                                          {activeStream.creatorName || "Fred the Rocker"} 
                                          <span className="text-emerald-400 text-xs">✓</span>
                                        </h5>
                                        <p className="text-[9px] text-emerald-300 font-mono mt-0.5">
                                          Unique ID: <span className="text-teal-300 font-bold select-all">#829501</span>
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Immersive Layout Switcher Moved inside Fred ID: STREAM */}
                                  <div className="bg-emerald-950/10 border border-emerald-500/20 p-3 rounded-2xl space-y-2">
                                    <p className="text-[10px] font-black text-emerald-300 uppercase tracking-wider font-sans flex items-center gap-1.5">
                                      <span>🌐</span> Immersive Stage View
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEnable3D(true);
                                          setHubShowToast("🛸 Immersive 3D Space Scene activated!");
                                        }}
                                        className={`py-2 px-3 rounded-xl text-[9px] font-black uppercase tracking-wider transition duration-300 flex items-center justify-center gap-1 cursor-pointer ${
                                          enable3D 
                                            ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border border-emerald-400 shadow-lg shadow-emerald-500/25"
                                            : "bg-black/40 text-zinc-400 border border-transparent hover:text-zinc-200"
                                        }`}
                                      >
                                        🛸 3D SPACE
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEnable3D(false);
                                          setHubShowToast("⊞ Professional 2D Grid Stage activated!");
                                        }}
                                        className={`py-2 px-3 rounded-xl text-[9px] font-black uppercase tracking-wider transition duration-300 flex items-center justify-center gap-1 cursor-pointer ${
                                          !enable3D 
                                            ? "bg-gradient-to-r from-teal-600 to-cyan-600 text-white border border-teal-400 shadow-lg shadow-teal-500/25"
                                            : "bg-black/40 text-zinc-400 border border-transparent hover:text-zinc-200"
                                        }`}
                                      >
                                        ⊞ 2D GRID
                                      </button>
                                    </div>
                                    <p className="text-[8px] text-zinc-500 font-mono text-center leading-normal">
                                      Toggling changes the visual stream environment for all listeners!
                                    </p>
                                  </div>

                                  {/* User Level Growth */}
                                  <div className="bg-white/5 p-3 rounded-2xl border border-white/5 space-y-1.5">
                                    <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-1">
                                        <span className="text-[11px]">🌟</span>
                                        <span className="text-[10px] font-bold text-white uppercase tracking-wider font-sans">User Level</span>
                                      </div>
                                      <span className="text-[9px] font-mono font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                        Lv.{hubUserLevel}
                                      </span>
                                    </div>
                                    {/* Progress Bar */}
                                    <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden relative">
                                      <div 
                                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                                        style={{ width: `${(hubUserXp / 2000) * 100}%` }}
                                      />
                                    </div>
                                    <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500">
                                      <span>XP: {hubUserXp} / 2000</span>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (hubUserLevel < 15) {
                                            const newXp = hubUserXp + 350;
                                            if (newXp >= 2000) {
                                              setHubUserLevel(prev => Math.min(15, prev + 1));
                                              setHubUserXp(newXp - 2000);
                                              setHubShowToast(`🎉 Level Up! You reached User Level ${hubUserLevel + 1}!`);
                                            } else {
                                              setHubUserXp(newXp);
                                              setHubShowToast("⚡ +350 XP Gained from staying active!");
                                            }
                                          }
                                        }}
                                        className="text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded transition font-bold border-none cursor-pointer"
                                      >
                                        + Stay Active
                                      </button>
                                    </div>
                                  </div>

                                  {/* Host Level Growth */}
                                  <div className="bg-white/5 p-3 rounded-2xl border border-white/5 space-y-1.5">
                                    <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-1">
                                        <span className="text-[11px]">👑</span>
                                        <span className="text-[10px] font-bold text-white uppercase tracking-wider font-sans">Host Level</span>
                                      </div>
                                      <span className="text-[9px] font-mono font-black text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                                        Lv.{hubHostLevel}
                                      </span>
                                    </div>
                                    {/* Progress Bar */}
                                    <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden relative">
                                      <div 
                                        className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-500"
                                        style={{ width: `${(hubHostXp / 10000) * 100}%` }}
                                      />
                                    </div>
                                    <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500">
                                      <span>XP: {hubHostXp} / 10000</span>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (hubHostLevel < 15) {
                                            const newXp = hubHostXp + 1500;
                                            if (newXp >= 10000) {
                                              setHubHostLevel(prev => Math.min(15, prev + 1));
                                              setHubHostXp(newXp - 10000);
                                              setHubShowToast(`👑 Host Level Up! Level ${hubHostLevel + 1}!`);
                                            } else {
                                              setHubHostXp(newXp);
                                              setHubShowToast("💎 Received +1,500 Host XP!");
                                            }
                                          }
                                        }}
                                        className="text-teal-400 hover:text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 px-2 py-0.5 rounded transition font-bold border-none cursor-pointer"
                                      >
                                        + Broadcast XP
                                      </button>
                                    </div>
                                  </div>

                                  {/* Agency Status Info */}
                                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 flex items-center justify-between text-[10px]">
                                    <span className="text-zinc-400 font-mono">Agency Association:</span>
                                    <span className="font-bold text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/20 font-mono text-[9px]">
                                      {hubAgency}
                                    </span>
                                  </div>

                                  {/* Fanclub & Team Info */}
                                  <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-3 rounded-2xl border border-emerald-500/20 space-y-2">
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <p className="text-[10px] font-black text-emerald-300 uppercase tracking-wide">💖 Fanclub: Club Fred</p>
                                        <p className="text-[9px] text-zinc-400 mt-0.5">859 loyal supporters connected</p>
                                      </div>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setHubShowToast("✨ Welcome to Club Fred! Exclusive badge active.");
                                        }}
                                        className="bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-black text-[8px] px-3 py-1 rounded-full shadow-md shadow-emerald-500/10 hover:opacity-90 border-none cursor-pointer"
                                      >
                                        JOIN CLUB
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Tab 2: Financial Wallet & Rewards */}
                              {hubTab === "earn" && (
                                <div className="space-y-3.5">
                                  {/* Live Center Quick Link */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setHubShowToast("💼 Navigating to Secure Live Analytics Center...");
                                    }}
                                    className="w-full p-2.5 bg-gradient-to-r from-emerald-950/45 to-teal-950/45 hover:from-emerald-900/60 hover:to-teal-900/60 rounded-xl border border-emerald-500/20 text-[10px] font-black text-emerald-200 uppercase tracking-wider flex items-center justify-between transition cursor-pointer"
                                  >
                                    <span>📊 Open Live Stats Center</span>
                                    <span>➔</span>
                                  </button>

                                  {/* Withdrawal Wallet Balance Card */}
                                  <div className="bg-gradient-to-br from-emerald-950/30 to-black/60 p-3 rounded-2xl border border-emerald-500/20 space-y-2">
                                    <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[12px]">🏦</span>
                                        <span className="text-[10px] font-bold text-zinc-400 font-mono">Withdrawal Wallet</span>
                                      </div>
                                      <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">SECURE</span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                      <div>
                                        <p className="text-[8px] text-zinc-500 font-mono">Gems / Cashout Balance</p>
                                        <p className="text-lg font-black text-emerald-400 font-mono">${hubWithdrawalWallet.toFixed(2)}</p>
                                      </div>
                                      {!showWithdrawalForm && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (hubWithdrawalWallet >= 10) {
                                              setShowWithdrawalForm(true);
                                            } else {
                                              setHubShowToast("❌ Min withdrawal is $10.00. Current balance too low!");
                                            }
                                          }}
                                          className="py-1.5 px-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[9px] uppercase tracking-wider rounded-lg shadow-lg shadow-emerald-500/10 transition border-none cursor-pointer"
                                        >
                                          WITHDRAW FUNDS
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Real Withdrawal Request Form */}
                                  {showWithdrawalForm && (
                                    <div 
                                      className="bg-black/50 p-3 rounded-2xl border border-emerald-500/30 space-y-3"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="flex justify-between items-center">
                                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest font-mono">Real Money Cashout</p>
                                        <button 
                                          onClick={() => setShowWithdrawalForm(false)}
                                          className="text-zinc-500 hover:text-white text-[10px] bg-transparent border-none cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                      </div>

                                      <form onSubmit={handleRealWithdrawalSubmit} className="space-y-2.5">
                                        {/* Amount Input */}
                                        <div className="space-y-1">
                                          <label className="text-[8px] font-bold text-zinc-400 uppercase font-mono block">Withdraw Amount (USD)</label>
                                          <input 
                                            type="number" 
                                            step="0.01"
                                            min="10"
                                            max={hubWithdrawalWallet}
                                            value={withdrawAmount}
                                            onChange={(e) => setWithdrawAmount(e.target.value)}
                                            className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                                            required
                                          />
                                        </div>

                                        {/* Gateway Selector */}
                                        <div className="space-y-1">
                                          <label className="text-[8px] font-bold text-zinc-400 uppercase font-mono block">Payment System Gateway</label>
                                          <div className="grid grid-cols-4 gap-1">
                                            {(["paypal", "bank", "stripe", "payoneer"] as const).map((method) => (
                                              <button
                                                type="button"
                                                key={method}
                                                onClick={() => setWithdrawMethod(method)}
                                                className={`py-1 rounded text-[8px] font-black uppercase transition cursor-pointer border ${
                                                  withdrawMethod === method
                                                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500"
                                                    : "bg-zinc-900 text-zinc-400 border-transparent hover:text-white"
                                                }`}
                                              >
                                                {method}
                                              </button>
                                            ))}
                                          </div>
                                        </div>

                                        {/* Method Fields */}
                                        {withdrawMethod === "paypal" && (
                                          <div className="space-y-1 animate-fadeIn">
                                            <label className="text-[8px] font-bold text-zinc-400 uppercase font-mono block">PayPal Account Email</label>
                                            <input 
                                              type="email" 
                                              placeholder="yourname@paypal.com"
                                              value={withdrawEmail}
                                              onChange={(e) => setWithdrawEmail(e.target.value)}
                                              className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                                              required
                                            />
                                          </div>
                                        )}

                                        {withdrawMethod === "payoneer" && (
                                          <div className="space-y-1 animate-fadeIn">
                                            <label className="text-[8px] font-bold text-zinc-400 uppercase font-mono block">Payoneer Account Email</label>
                                            <input 
                                              type="email" 
                                              placeholder="yourname@payoneer.com"
                                              value={withdrawEmail}
                                              onChange={(e) => setWithdrawEmail(e.target.value)}
                                              className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                                              required
                                            />
                                          </div>
                                        )}

                                        {withdrawMethod === "stripe" && (
                                          <div className="space-y-1 animate-fadeIn">
                                            <label className="text-[8px] font-bold text-zinc-400 uppercase font-mono block">Stripe Card Number / IBAN</label>
                                            <input 
                                              type="text" 
                                              placeholder="XXXX XXXX XXXX XXXX"
                                              value={withdrawCardNum}
                                              onChange={(e) => setWithdrawCardNum(e.target.value)}
                                              className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                                              required
                                            />
                                          </div>
                                        )}

                                        {withdrawMethod === "bank" && (
                                          <div className="space-y-2 animate-fadeIn">
                                            <div className="grid grid-cols-2 gap-1.5">
                                              <div className="space-y-1">
                                                <label className="text-[8px] font-bold text-zinc-400 uppercase font-mono block">Bank Name</label>
                                                <input 
                                                  type="text" 
                                                  placeholder="Chase, HSBC, etc"
                                                  value={withdrawBankName}
                                                  onChange={(e) => setWithdrawBankName(e.target.value)}
                                                  className="w-full bg-zinc-900 border border-white/10 rounded-lg p-1.5 text-xs text-white focus:outline-none"
                                                  required
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <label className="text-[8px] font-bold text-zinc-400 uppercase font-mono block">Account Number</label>
                                                <input 
                                                  type="text" 
                                                  placeholder="123456789"
                                                  value={withdrawAccountNum}
                                                  onChange={(e) => setWithdrawAccountNum(e.target.value)}
                                                  className="w-full bg-zinc-900 border border-white/10 rounded-lg p-1.5 text-xs text-white focus:outline-none"
                                                  required
                                                />
                                              </div>
                                            </div>
                                            <div className="space-y-1">
                                              <label className="text-[8px] font-bold text-zinc-400 uppercase font-mono block">SWIFT/BIC Code (Optional)</label>
                                              <input 
                                                type="text" 
                                                placeholder="CHASUS33"
                                                value={withdrawSwift}
                                                onChange={(e) => setWithdrawSwift(e.target.value)}
                                                className="w-full bg-zinc-900 border border-white/10 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                                              />
                                            </div>
                                          </div>
                                        )}

                                        <button 
                                          type="submit"
                                          className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-black text-xs uppercase tracking-wider rounded-lg shadow-lg hover:from-emerald-400 hover:to-teal-400 transition cursor-pointer border-none"
                                        >
                                          SUBMIT CASHOUT REQUEST
                                        </button>
                                      </form>
                                    </div>
                                  )}

                                  {/* Withdrawal Ledger Real Transaction History */}
                                  <div className="bg-white/5 p-3 rounded-2xl border border-white/5 space-y-2">
                                    <p className="text-[10px] font-bold text-white uppercase tracking-wider font-mono">📋 Cashout History Ledger</p>
                                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                                      {withdrawalHistory.length === 0 ? (
                                        <p className="text-[8px] text-zinc-500 italic font-mono text-center py-2">No withdrawal transactions processed yet.</p>
                                      ) : (
                                        withdrawalHistory.map((wd) => (
                                          <div key={wd.id} className="flex justify-between items-center p-1.5 bg-black/45 rounded-lg border border-white/5 text-[9px] font-mono">
                                            <div className="flex flex-col">
                                              <span className="text-white font-bold">${Number(wd.amount).toFixed(2)}</span>
                                              <span className="text-[7px] text-zinc-500">{wd.paymentMethod.toUpperCase()} • {new Date(wd.requestedAt).toLocaleDateString()}</span>
                                            </div>
                                            <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase ${
                                              wd.status === "completed" 
                                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                                : wd.status === "failed" 
                                                  ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                                                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                            }`}>
                                              {wd.status}
                                            </span>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </div>

                                  {/* Noble Ranks Tier Selector */}
                                  <div className="bg-white/5 p-3 rounded-2xl border border-white/5 space-y-2">
                                    <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-1">
                                        <span className="text-[11px]">🛡️</span>
                                        <p className="text-[10px] font-bold text-white uppercase tracking-wider">Noble Dignitary Title</p>
                                      </div>
                                      <span className="text-[9px] font-mono text-emerald-300 font-black">{hubNobleRank}</span>
                                    </div>
                                    <p className="text-[8px] text-zinc-400">Unlock sovereign status and special room entry banner cards.</p>
                                    <div className="grid grid-cols-3 gap-1">
                                      {["Baron 🛡️", "Duke 👑", "Emperor 🌌"].map((rank) => (
                                        <button
                                          key={rank}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setHubNobleRank(rank);
                                            setHubShowToast(`👑 Noble title updated to ${rank}!`);
                                          }}
                                          className={`py-1 rounded text-[8px] font-black uppercase transition cursor-pointer border ${
                                            hubNobleRank === rank
                                              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                                              : "bg-black/30 text-zinc-400 border-transparent hover:text-white"
                                          }`}
                                        >
                                          {rank.split(" ")[0]}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Invitation Referral Rewards */}
                                  <div className="bg-white/5 p-3 rounded-2xl border border-white/5 space-y-2">
                                    <p className="text-[10px] font-bold text-white uppercase tracking-wider">🔗 Invite friends & earn</p>
                                    <div className="flex justify-between items-center bg-black/40 p-1.5 rounded-lg border border-emerald-500/20">
                                      <span className="font-mono text-[9px] text-zinc-400">Your Code:</span>
                                      <span className="font-mono text-[10px] text-teal-300 font-black select-all tracking-wider">FRED_LIVE_521</span>
                                    </div>
                                    <div className="flex gap-1.5">
                                      <input 
                                        type="text" 
                                        placeholder="Enter invite code" 
                                        value={hubInviteCode}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => setHubInviteCode(e.target.value)}
                                        className="flex-1 bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-[9px] text-white focus:outline-none focus:border-emerald-500"
                                      />
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (hubInviteCode.trim()) {
                                            setHubInvitationCount(prev => prev + 1);
                                            setHubInvitationRewards(prev => prev + 50);
                                            setHubInviteCode("");
                                            setHubShowToast("🎉 Valid Code! You claimed 50 free Coins!");
                                          } else {
                                            setHubShowToast("❌ Enter a friend's code to claim!");
                                          }
                                        }}
                                        className="bg-emerald-600 hover:bg-emerald-500 px-3 text-[9px] font-bold text-white rounded-lg transition border-none cursor-pointer"
                                      >
                                        Claim
                                      </button>
                                    </div>
                                    <div className="flex justify-between text-[8px] text-zinc-500 font-mono pt-1">
                                      <span>Invites: {hubInvitationCount} users</span>
                                      <span>Claimed: {hubInvitationRewards} coins</span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Tab 3: Lucky Wheel & Mini-Games */}
                              {hubTab === "games" && (
                                <div className="space-y-3.5">
                                  {/* Daily Check-In Streak */}
                                  <div className="bg-gradient-to-br from-emerald-950/20 to-teal-950/20 p-3 rounded-2xl border border-emerald-500/10 space-y-2">
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <p className="text-[10px] font-black text-emerald-300 uppercase tracking-wide">🔥 Daily Stream Streak</p>
                                        <p className="text-[9px] text-zinc-400">{hubCheckInStreak} consecutive active stream days</p>
                                      </div>
                                      <button
                                        disabled={hubDailyCheckedIn}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setHubDailyCheckedIn(true);
                                          setHubCheckInStreak(prev => prev + 1);
                                          setHubShowToast("🔥 Checked in! Bonus 15 coins added to balance.");
                                        }}
                                        className={`font-black text-[8px] px-3 py-1 rounded-full shadow-md border-none cursor-pointer transition ${
                                          hubDailyCheckedIn 
                                            ? "bg-zinc-800 text-zinc-500" 
                                            : "bg-gradient-to-r from-emerald-500 to-teal-500 text-black hover:scale-105"
                                        }`}
                                      >
                                        {hubDailyCheckedIn ? "CLAIMED" : "CHECK IN"}
                                      </button>
                                    </div>
                                    {/* Small visual calendar streak */}
                                    <div className="flex justify-between gap-1 pt-1">
                                      {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                                        <div 
                                          key={day}
                                          className={`flex-1 text-center py-1 rounded text-[8px] font-mono font-bold border ${
                                            day <= hubCheckInStreak
                                              ? "bg-gradient-to-b from-emerald-600/30 to-teal-600/30 text-emerald-300 border-emerald-500/45"
                                              : "bg-black/40 text-zinc-600 border-zinc-800"
                                          }`}
                                        >
                                          D{day}
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Daily Lucky Spin Wheel - Stay All Day */}
                                  <div className="bg-white/5 p-3 rounded-2xl border border-white/5 space-y-2 text-center relative overflow-hidden">
                                    <p className="text-[10px] font-bold text-white uppercase tracking-wider text-left">🎡 Live Lucky Wheel</p>
                                    <p className="text-[8px] text-zinc-400 text-left mb-2">Spin once every hour to win high-value rewards instantly.</p>
                                    
                                    {/* Lucky Wheel Pointer & Visual representation */}
                                    <div className="relative w-28 h-28 mx-auto my-1.5 flex items-center justify-center">
                                      <div className={`w-28 h-28 rounded-full border-4 border-emerald-500 bg-gradient-to-tr from-[#051c11] via-[#02231c] to-[#041510] flex items-center justify-center relative shadow-xl overflow-hidden ${hubSpinState.isSpinning ? "animate-spin" : ""}`}>
                                        <div className="absolute w-full h-0.5 bg-emerald-500/40" />
                                        <div className="absolute h-full w-0.5 bg-emerald-500/40" />
                                        <div className="absolute w-20 h-20 rounded-full border-2 border-emerald-500/20 flex items-center justify-center">
                                          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest font-mono">SPIN</span>
                                        </div>
                                        <span className="absolute top-2 text-[10px]">👑</span>
                                        <span className="absolute right-2 text-[10px]">💎</span>
                                        <span className="absolute bottom-2 text-[10px]">🚀</span>
                                        <span className="absolute left-2 text-[10px]">🔑</span>
                                      </div>
                                      {/* Pointer */}
                                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[10px] border-t-emerald-500 z-10" />
                                    </div>

                                    <button
                                      disabled={hubSpinState.isSpinning}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setHubSpinState({ isSpinning: true, message: "" });
                                        setTimeout(() => {
                                          const awards = [
                                            "Gold Badge Frame 🏷️",
                                            "150 Free Coins 🪙",
                                            "Lucky Treasure Key 🔑",
                                            "Double Heart Booster 💖",
                                            "Entrance Airship 🚀"
                                          ];
                                          const won = awards[Math.floor(Math.random() * awards.length)];
                                          setHubSpinState({ isSpinning: false, message: won });
                                          setHubShowToast(`🎡 Lucky Spin Won: ${won}!`);
                                          // update key count if key is won
                                          if (won.includes("Key")) {
                                            setHubBackpackItems(prev => prev.map(item => item.id === "key" ? { ...item, count: item.count + 1 } : item));
                                          } else if (won.includes("Airship")) {
                                            setHubBackpackItems(prev => prev.map(item => item.id === "airship" ? { ...item, count: item.count + 1 } : item));
                                          }
                                        }, 1800);
                                      }}
                                      className="w-full py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-black font-black text-[9px] uppercase tracking-wider rounded-xl shadow-md transition border-none cursor-pointer"
                                    >
                                      {hubSpinState.isSpinning ? "SPINNING WHEEL..." : "TAP TO SPIN WHEEL"}
                                    </button>

                                    {hubSpinState.message && (
                                      <p className="text-[9px] font-mono font-bold text-emerald-300 bg-emerald-500/15 py-1 px-2 rounded-lg mt-2 text-center">
                                        Result: {hubSpinState.message}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Tab 4: Backpack & Feedback & chests */}
                              {hubTab === "backpack" && (
                                <div className="space-y-3.5">
                                  {/* My Backpack Items list */}
                                  <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-white uppercase tracking-wider">🎒 My Backpack Inventory</p>
                                    <div className="space-y-1.5">
                                      {hubBackpackItems.map((item) => (
                                        <div key={item.id} className="bg-white/5 p-2 rounded-xl border border-white/5 flex items-center justify-between text-[10px]">
                                          <div className="flex-1">
                                            <p className="font-bold text-white">{item.name}</p>
                                            <p className="text-[8px] text-zinc-400">{item.desc}</p>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-mono text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                                              Qty: {item.count}
                                            </span>
                                            <button
                                              disabled={item.count <= 0}
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                if (item.count > 0) {
                                                  // decrement count
                                                  setHubBackpackItems(prev => prev.map(p => p.id === item.id ? { ...p, count: p.count - 1 } : p));
                                                  setHubShowToast(`🎒 Activated 1x ${item.name}!`);

                                                  // trigger live chat effect announcement
                                                  if (activeStream) {
                                                    try {
                                                      const chatRef = collection(db, "liveStreams", activeStream.id, "chat");
                                                      await addDoc(chatRef, {
                                                        id: `chat_backpack_${Date.now()}`,
                                                        streamId: activeStream.id,
                                                        senderId: "system",
                                                        senderName: currentUser?.username || currentUser?.displayName || "System",
                                                        text: `used a Backpack Item: ${item.name}! 🌟`,
                                                        createdAt: new Date().toISOString()
                                                      });
                                                    } catch (err) {}
                                                  }
                                                }
                                              }}
                                              className="bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-[8px] px-2 py-1 rounded-md transition border-none cursor-pointer disabled:bg-zinc-800 disabled:text-zinc-600"
                                            >
                                              USE
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* My Treasure Chest Game */}
                                  <div className="bg-emerald-950/10 p-3 rounded-2xl border border-emerald-500/20 space-y-2">
                                    <p className="text-[10px] font-bold text-white uppercase tracking-wider">🎁 My Treasure Chests</p>
                                    <p className="text-[8px] text-zinc-400">Unlock chests using Lucky Keys for high-tier coins and dynamic avatar tags.</p>
                                    <div className="grid grid-cols-2 gap-2">
                                      {/* Bronze Chest */}
                                      <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 text-center space-y-1.5">
                                        <span className="text-xl">🧰</span>
                                        <p className="text-[9px] font-bold text-amber-200">Bronze Chest</p>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const keyItem = hubBackpackItems.find(i => i.id === "key");
                                            if (keyItem && keyItem.count >= 1) {
                                              setHubBackpackItems(prev => prev.map(i => i.id === "key" ? { ...i, count: i.count - 1 } : i));
                                              setHubShowToast("🧰 Bronze Chest Unlocked! Gained 85 Sound Coins!");
                                            } else {
                                              setHubShowToast("❌ Need 1 Lucky Treasure Key from Backpack!");
                                            }
                                          }}
                                          className="w-full py-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-500/30 hover:border-amber-500 rounded text-[8px] font-black uppercase tracking-wider cursor-pointer"
                                        >
                                          Unlock (1 Key)
                                        </button>
                                      </div>

                                      {/* Gold Chest */}
                                      <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 text-center space-y-1.5">
                                        <span className="text-xl">👑</span>
                                        <p className="text-[9px] font-bold text-yellow-300">Gold Chest</p>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const keyItem = hubBackpackItems.find(i => i.id === "key");
                                            if (keyItem && keyItem.count >= 3) {
                                              setHubBackpackItems(prev => prev.map(i => i.id === "key" ? { ...i, count: i.count - 3 } : i));
                                              setHubShowToast("👑 Golden Royal Chest Unlocked! Gained 320 Sound Coins!");
                                            } else {
                                              setHubShowToast("❌ Need 3 Lucky Treasure Keys from Backpack!");
                                            }
                                          }}
                                          className="w-full py-1 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-300 border border-yellow-500/30 hover:border-yellow-500 rounded text-[8px] font-black uppercase tracking-wider cursor-pointer"
                                        >
                                          Unlock (3 Keys)
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  {/* VIP Status privileges info */}
                                  <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 p-3 rounded-2xl border border-yellow-500/20">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-[10px] font-black text-yellow-300 uppercase tracking-wide flex items-center gap-1">🌟 VIP Status Privilege</span>
                                      <span className="text-[8px] bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 px-2 py-0.5 rounded font-mono font-bold">VIP ACTIVE</span>
                                    </div>
                                    <p className="text-[8px] text-zinc-400">Your VIP subscription includes an elite text theme, golden chat outline, and exclusive badge markers.</p>
                                  </div>

                                  {/* Host Room Feedback Submission */}
                                  <div className="space-y-1.5 pt-1">
                                    <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 font-mono">✍️ SoundStream Room Feedback</label>
                                    <div className="flex gap-1.5">
                                      <input 
                                        type="text" 
                                        placeholder="Suggest a feature or sound setting..." 
                                        value={hubFeedbackText}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => setHubFeedbackText(e.target.value)}
                                        className="flex-1 bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-[9px] text-white focus:outline-none focus:border-emerald-500"
                                      />
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (hubFeedbackText.trim()) {
                                            setHubFeedbackText("");
                                            setHubShowToast("💖 Feedback submitted securely to Fred!");
                                          } else {
                                            setHubShowToast("❌ Feedback cannot be blank!");
                                          }
                                        }}
                                        className="bg-emerald-600 hover:bg-emerald-500 px-3 text-[9px] font-bold text-black rounded-lg transition border-none cursor-pointer"
                                      >
                                        Send
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Tab 5: 2026 Interactive Arena */}
                              {hubTab === "arena" && (
                                <div className="space-y-3.5 text-left">
                                  {/* Viewer Coins Balance Card */}
                                  <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/10 p-3 rounded-2xl border border-emerald-500/25 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xl">🪙</span>
                                      <div>
                                        <p className="text-[10px] font-black text-emerald-300 uppercase tracking-wider">My Sound Coins</p>
                                        <p className="text-xs font-black text-white font-mono">{viewerCoinBalance} COINS</p>
                                      </div>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setViewerCoinBalance(c => c + 150);
                                        setHubShowToast("💸 Free Coin Boost Claimed! +150 Coins added.");
                                      }}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 transition rounded-xl text-[9px] font-black text-black uppercase cursor-pointer border-none"
                                    >
                                      Claim Free +150
                                    </button>
                                  </div>

                                  {/* Live Prediction Game */}
                                  <div className="bg-gradient-to-br from-[#05140e] to-[#010c08] p-3 rounded-2xl border border-emerald-500/20 space-y-2.5">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wide flex items-center gap-1">🔮 Real-Time Predictions</span>
                                      {activePrediction && activePrediction.timeLeft > 0 ? (
                                        <span className="text-[8px] bg-red-500/20 text-red-300 border border-red-500/30 px-1.5 py-0.5 rounded font-mono font-bold animate-pulse">
                                          Ends in: {activePrediction.timeLeft}s
                                        </span>
                                      ) : (
                                        <span className="text-[8px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded font-mono">CLOSED</span>
                                      )}
                                    </div>

                                    {activePrediction ? (
                                      <div className="space-y-2">
                                        <p className="text-[10px] font-bold text-white text-left leading-relaxed">{activePrediction.question}</p>
                                        
                                        {/* Prediction Pools splits visualizer */}
                                        <div className="space-y-1">
                                          <div className="w-full bg-zinc-900 h-2.5 rounded-full overflow-hidden flex">
                                            <div 
                                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                                              style={{ width: `${(activePrediction.optionAPool / (activePrediction.optionAPool + activePrediction.optionBPool || 1)) * 100}%` }}
                                            />
                                            <div 
                                              className="h-full bg-gradient-to-r from-teal-700 to-cyan-600 transition-all duration-300"
                                              style={{ width: `${(activePrediction.optionBPool / (activePrediction.optionAPool + activePrediction.optionBPool || 1)) * 100}%` }}
                                            />
                                          </div>
                                          <div className="flex justify-between items-center text-[8px] font-mono text-zinc-400">
                                            <span>Option A Pool: {activePrediction.optionAPool} ({(activePrediction.optionAPool / (activePrediction.optionAPool + activePrediction.optionBPool || 1) * 100).toFixed(0)}%)</span>
                                            <span>Option B Pool: {activePrediction.optionBPool} ({(activePrediction.optionBPool / (activePrediction.optionAPool + activePrediction.optionBPool || 1) * 100).toFixed(0)}%)</span>
                                          </div>
                                        </div>

                                        {/* Betting Choice buttons */}
                                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                                          <button
                                            disabled={activePrediction.timeLeft <= 0 || activePrediction.userChoice !== null}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (viewerCoinBalance < 100) {
                                                setHubShowToast("❌ Not enough coins! Claim a free boost first.");
                                                return;
                                              }
                                              setViewerCoinBalance(c => c - 100);
                                              setActivePrediction(p => ({
                                                ...p,
                                                optionAPool: p.optionAPool + 100,
                                                userChoice: "A",
                                                userWager: 100
                                              }));
                                              // Increment quest
                                              setDailyQuests(quests => quests.map(q => q.id === "quest_3" ? { ...q, progress: q.progress + 1, completed: q.progress + 1 >= q.target } : q));
                                              setHubShowToast("🔮 Bet of 100 coins placed on [YES] Option A!");
                                            }}
                                            className={`py-1.5 rounded-xl text-[9px] font-black uppercase transition border-none cursor-pointer ${
                                              activePrediction.userChoice === "A"
                                                ? "bg-emerald-600 text-black"
                                                : "bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/40 border border-emerald-500/20"
                                            }`}
                                          >
                                            {activePrediction.userChoice === "A" ? "WAGERED A" : "BET Option A (100)"}
                                          </button>
                                          <button
                                            disabled={activePrediction.timeLeft <= 0 || activePrediction.userChoice !== null}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (viewerCoinBalance < 100) {
                                                setHubShowToast("❌ Not enough coins! Claim a free boost first.");
                                                return;
                                              }
                                              setViewerCoinBalance(c => c - 100);
                                              setActivePrediction(p => ({
                                                ...p,
                                                optionBPool: p.optionBPool + 100,
                                                userChoice: "B",
                                                userWager: 100
                                              }));
                                              setDailyQuests(quests => quests.map(q => q.id === "quest_3" ? { ...q, progress: q.progress + 1, completed: q.progress + 1 >= q.target } : q));
                                              setHubShowToast("🔮 Bet of 100 coins placed on [NO] Option B!");
                                            }}
                                            className={`py-1.5 rounded-xl text-[9px] font-black uppercase transition border-none cursor-pointer ${
                                              activePrediction.userChoice === "B"
                                                ? "bg-teal-600 text-black"
                                                : "bg-teal-950/40 text-teal-300 hover:bg-teal-900/40 border border-teal-500/20"
                                            }`}
                                          >
                                            {activePrediction.userChoice === "B" ? "WAGERED B" : "BET Option B (100)"}
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-[8px] text-zinc-500">No active prediction. Check back soon!</p>
                                    )}
                                     <p className="text-[8px] text-zinc-400">Type a message to have an AI custom vocal track speak it out loud on the stream!</p>
                                    
                                    {/* Voices grid selector */}
                                    <div className="grid grid-cols-4 gap-1">
                                      {["robot", "alien", "deep", "kawaii"].map((v) => (
                                        <button
                                          key={v}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setAiTTSVoice(v);
                                          }}
                                          className={`py-1 rounded text-[8px] font-bold uppercase transition border cursor-pointer ${
                                            aiTTSVoice === v
                                              ? "bg-emerald-600 border-emerald-500 text-black font-black"
                                              : "bg-black/30 border-white/5 text-zinc-400 hover:text-white"
                                          }`}
                                        >
                                          {v === "robot" ? "🤖 ROBOT" : v === "alien" ? "👽 SPACE" : v === "deep" ? "🎙️ DEEP" : "🌸 KAWAII"}
                                        </button>
                                      ))}
                                    </div>

                                    <div className="flex gap-1.5">
                                      <input 
                                        type="text" 
                                        placeholder="Type TTS text here..." 
                                        value={ttsSpeechText}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => setTtsSpeechText(e.target.value)}
                                        className="flex-1 bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-[9px] text-white focus:outline-none focus:border-emerald-500"
                                      />
                                      <button 
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (!ttsSpeechText.trim()) {
                                            setHubShowToast("❌ Enter text to narrate!");
                                            return;
                                          }
                                          if (viewerCoinBalance < 50) {
                                            setHubShowToast("❌ Needs 50 coins to narrate!");
                                            return;
                                          }
                                          setViewerCoinBalance(c => c - 50);
                                          const textToSend = ttsSpeechText;
                                          setTtsSpeechText("");
                                          setHubShowToast(`🗣️ Submitting custom [${aiTTSVoice.toUpperCase()}] narration!`);

                                          // Push voice narration event
                                          setTtsHistory(prev => [{ id: `tts_${Date.now()}`, text: textToSend, voice: aiTTSVoice }, ...prev]);

                                          // Post a beautiful narration system comment to chat
                                          if (activeStream) {
                                            try {
                                              const chatRef = collection(db, "liveStreams", activeStream.id, "chat");
                                              await addDoc(chatRef, {
                                                id: `chat_tts_${Date.now()}`,
                                                streamId: activeStream.id,
                                                senderId: "system",
                                                senderName: `📢 AI_TTS_BOT [${aiTTSVoice.toUpperCase()}]`,
                                                text: `"${textToSend}"`,
                                                createdAt: new Date().toISOString()
                                              });
                                            } catch (err) {}
                                          }
                                        }}
                                        className="bg-emerald-600 hover:bg-emerald-500 px-2.5 text-[8px] font-black uppercase text-black rounded-lg transition border-none cursor-pointer"
                                      >
                                        SPEAK (50)
                                      </button>
                                    </div>
                                  </div>

                                  {/* Interactive Soundboard Presets */}
                                  <div className="bg-white/5 p-3 rounded-2xl border border-white/5 space-y-2">
                                    <p className="text-[10px] font-bold text-white uppercase tracking-wider">🎛️ Soundboard FX React</p>
                                    <div className="grid grid-cols-2 gap-1.5">
                                      {soundboardItems.map((fx) => (
                                        <button
                                          key={fx.id}
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            
                                            // Progress Soundboard quest
                                            setDailyQuests(quests => quests.map(q => q.id === "quest_2" ? { ...q, progress: Math.min(q.progress + 1, q.target), completed: q.progress + 1 >= q.target } : q));

                                            setHubShowToast(`🔊 Activated FX: ${fx.name}`);

                                            // Push to chat
                                            if (activeStream) {
                                              try {
                                                const chatRef = collection(db, "liveStreams", activeStream.id, "chat");
                                                await addDoc(chatRef, {
                                                  id: `chat_fx_${Date.now()}`,
                                                  streamId: activeStream.id,
                                                  senderId: "system",
                                                  senderName: currentUser?.username || currentUser?.displayName || "Viewer",
                                                  text: `triggered soundboard effect: ${fx.soundText}`,
                                                  createdAt: new Date().toISOString()
                                                });
                                              } catch (err) {}
                                            }
                                          }}
                                          className="flex items-center gap-1.5 p-2 bg-black/40 hover:bg-black/70 border border-white/5 hover:border-emerald-500/30 rounded-xl transition text-[9px] text-left text-zinc-300 font-bold cursor-pointer"
                                        >
                                          <span className="text-sm">{fx.emoji}</span>
                                          <span className="truncate">{fx.name}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Daily Stream Quests */}
                                  <div className="bg-gradient-to-br from-[#05140e] to-[#010c08] p-3 rounded-2xl border border-white/5 space-y-2">
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-left">🏆 Arena Daily Engager Quests</p>
                                    <div className="space-y-2">
                                      {dailyQuests.map((q) => (
                                        <div key={q.id} className="space-y-1 text-left">
                                          <div className="flex justify-between items-center text-[9px]">
                                            <span className="text-white font-bold truncate pr-2">{q.label}</span>
                                            <span className="font-mono text-[8px] text-emerald-400 font-black">{q.completed ? "COMPLETED" : `${q.progress}/${q.target}`}</span>
                                          </div>
                                          <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                                            <div 
                                              className="h-full transition-all duration-300 bg-gradient-to-r from-emerald-500 to-teal-500"
                                              style={{ width: `${Math.min((q.progress / q.target) * 100, 100)}%` }}
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="space-y-1.5 pt-3 border-t border-white/10 mt-3 text-left">
                              <label className="text-[9px] font-bold uppercase tracking-wider text-emerald-300 font-mono flex items-center justify-between">
                                <span>🎙️ Studio Sound Profiler</span>
                                <span className="text-zinc-500 text-[8px]">Active: {soundPreset}</span>
                              </label>
                              <div className="grid grid-cols-4 gap-1">
                                {["Studio", "Hall", "Echo", "Stadium"].map((preset) => (
                                  <button
                                    key={preset}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSoundPreset(preset);
                                      setHubShowToast(`🎙️ Mic Sound preset updated to ${preset}!`);
                                    }}
                                    className={`py-1 rounded-lg text-[8px] font-bold transition flex flex-col items-center gap-0.5 cursor-pointer ${
                                      soundPreset === preset
                                        ? "bg-emerald-600 text-black border border-emerald-400/20 font-black"
                                        : "bg-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-white/10"
                                    }`}
                                  >
                                    <span>{preset === "Studio" ? "🎙️" : preset === "Hall" ? "🏰" : preset === "Echo" ? "🎚️" : "🏟️"}</span>
                                    <span>{preset}</span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Copy Room Link Helper */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(window.location.href);
                                setHubShowToast("📋 Copied room connection link!");
                              }}
                              className="w-full mt-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl text-[9px] font-mono font-bold text-black uppercase tracking-wider text-center transition cursor-pointer border-none"
                            >
                              📋 Copy Connection Link
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Follow button matching screenshot outline capsule */}
                    <button
                      onClick={() => setIsFollowed(!isFollowed)}
                      className={`px-3.5 py-1 rounded-full text-[10px] font-bold transition-all duration-300 border cursor-pointer ${
                        isFollowed 
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-300" 
                          : "bg-transparent border-emerald-500/40 hover:border-emerald-500 text-emerald-200 hover:bg-emerald-500/10"
                      }`}
                    >
                      {isFollowed ? "Following" : "Follow"}
                    </button>
                  </div>

                  {/* Overlapping viewer circles and indicators */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center -space-x-1.5 mr-1">
                      <img className="h-6 w-6 rounded-full border border-zinc-950 object-cover" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60" alt="" />
                      <img className="h-6 w-6 rounded-full border border-zinc-950 object-cover" src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=60" alt="" />
                      <img className="h-6 w-6 rounded-full border border-zinc-950 object-cover" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60" alt="" />
                    </div>
                    
                    {/* Viewer count pill */}
                    <div className="flex items-center gap-1 bg-emerald-950/60 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-emerald-200">
                      <Users className="w-3 h-3 text-emerald-400" />
                      <span>{activeStream.viewerCount || 128}</span>
                    </div>

                    {/* Background Theme Switcher Button */}
                    <div className="relative">
                      <button
                        onClick={() => setShowThemeSelector(!showThemeSelector)}
                        className="bg-emerald-950/60 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 px-2.5 py-1 rounded-full text-[10px] font-bold text-emerald-200 flex items-center gap-1 transition cursor-pointer"
                      >
                        <span>🎨 Theme</span>
                      </button>
                      
                      <AnimatePresence>
                        {showThemeSelector && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 mt-2 w-32 bg-zinc-950/95 backdrop-blur-md border border-white/10 rounded-2xl p-2 shadow-2xl z-50 space-y-1"
                          >
                            {(["galaxy", "concert", "lounge", "club", "sky"] as const).map((theme) => (
                              <button
                                key={theme}
                                onClick={() => {
                                  setRoomTheme(theme);
                                  setShowThemeSelector(false);
                                }}
                                className={`w-full text-left px-2.5 py-1.5 rounded-xl text-[10px] font-extrabold capitalize transition cursor-pointer border-none ${
                                  roomTheme === theme
                                    ? "bg-[#7c3aed] text-white"
                                    : "text-zinc-400 hover:text-white bg-transparent"
                                }`}
                              >
                                {theme}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* End Livestream / Leave Space Controls */}
                    {currentUser?.uid === activeStream.creatorId ? (
                      <button
                        onClick={handleEndStream}
                        className="bg-red-650/80 hover:bg-red-600 border border-red-500/30 px-3.5 py-1.5 rounded-full text-[10px] font-black text-white uppercase tracking-wider transition active:scale-95 cursor-pointer flex items-center gap-1 shadow-lg"
                        title="End stream for everyone"
                      >
                        <Power className="w-3.5 h-3.5 text-white" />
                        <span>End Live</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {seatsArray.some(s => s.userId === currentUser?.uid) && (
                          <button
                            onClick={handleLeaveSeat}
                            className="bg-amber-600/80 hover:bg-amber-500 border border-amber-500/30 px-3.5 py-1.5 rounded-full text-[10px] font-black text-white uppercase tracking-wider transition active:scale-95 cursor-pointer flex items-center gap-1 shadow-lg"
                            title="Leave seat and return to audience"
                          >
                            <MicOff className="w-3.5 h-3.5 text-white" />
                            <span>Leave Seat</span>
                          </button>
                        )}
                        <button
                          onClick={handleEndStream}
                          className="bg-red-950/60 hover:bg-red-900 border border-red-500/20 px-3.5 py-1.5 rounded-full text-[10px] font-black text-red-200 uppercase tracking-wider transition active:scale-95 cursor-pointer flex items-center gap-1 shadow-lg"
                          title="Exit the live room"
                        >
                          <LogOut className="w-3.5 h-3.5 text-red-300" />
                          <span>Leave Room</span>
                        </button>
                      </div>
                    )}

                    {/* Vertical 3 dots menu button */}
                    <button 
                      onClick={() => {
                        setRoomSettingsTab("layout");
                        setShowRoomSettingsModal(true);
                      }}
                      className="bg-transparent hover:bg-white/5 text-zinc-300 hover:text-white p-1 rounded-full flex items-center justify-center transition cursor-pointer"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M12 8a2 2 0 110-4 2 2 0 010 4zm0 2a2 2 0 110 4 2 2 0 010-4zm0 6a2 2 0 110 4 2 2 0 010-4z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                /* Standard video room header - Floating absolutely over the camera booth */
                <div className="absolute top-0 left-0 right-0 p-2 sm:p-4 pt-4 sm:pt-6 bg-gradient-to-b from-black/90 via-black/30 to-transparent flex items-center justify-between z-20 pointer-events-auto gap-1">
                  <div className="flex items-center gap-1 sm:gap-2 max-w-[60%]">
                    <div className="flex items-center gap-1.5 sm:gap-2 bg-black/40 backdrop-blur-md px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-white/10 shadow-lg">
                      <img 
                        src={activeStream.creatorPhoto || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"} 
                        alt="Host Avatar" 
                        onClick={() => {
                          if (currentUser?.uid === activeStream.creatorId) {
                            setShowHostProfileMenu(true);
                          } else {
                            alert(`This is ${activeStream.creatorName || "the Host"}'s profile space.`);
                          }
                        }}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-white/20 cursor-pointer hover:scale-105 active:scale-95 transition-all" 
                      />
                      <div className="flex flex-col leading-none">
                        <div className="flex items-center gap-1">
                          <span className="font-extrabold text-white text-[10px] sm:text-[11px] uppercase tracking-wide truncate max-w-[65px] sm:max-w-[85px]">
                            {activeStream.creatorName || "Host"}
                          </span>
                          <span className="text-[6px] sm:text-[7px] font-black bg-gradient-to-r from-pink-500 to-rose-500 text-white px-1 sm:px-1.5 py-0.2 rounded uppercase hidden sm:inline-block">
                            LV.10
                          </span>
                        </div>
                        <span className="text-[8px] sm:text-[9px] text-zinc-300 font-bold mt-0.5 font-sans">
                          ❤️ {activeStream.likes || activeStream.likesCount || "0"} <span className="hidden sm:inline">Likes</span>
                        </span>
                      </div>
                      
                      {currentUser?.uid !== activeStream.creatorId && (
                        <button 
                          onClick={handleSendHeart}
                          className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-400 hover:to-pink-400 text-white font-extrabold text-[8px] sm:text-[9px] px-2 sm:px-3 py-0.5 sm:py-1 rounded-full uppercase tracking-wider cursor-pointer border-none shadow transition active:scale-95 ml-1 hidden xs:block"
                        >
                          Join
                        </button>
                      )}
                    </div>

                    {/* Extended Interactive Live Control Center directly inside video header */}
                    <div className="relative shrink-0">
                      <button 
                        onClick={() => setShowHostProfileMenu(true)}
                        className="flex items-center gap-1 bg-black/45 backdrop-blur-md hover:bg-indigo-500/20 border border-indigo-500/25 hover:border-indigo-500/50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-[9px] sm:text-[10px] font-black text-indigo-300 uppercase tracking-wider transition active:scale-95 cursor-pointer shadow-lg select-none"
                        title="Click to open Live Control Center"
                      >
                        <span className="text-xs">🎛️</span>
                        <span className="hidden sm:inline">Live Control Center</span>
                        <ChevronDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-indigo-400" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-white/10 shadow-lg shrink-0">
                      <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[9px] sm:text-[10px] font-bold font-sans text-white">
                        👁️ {activeStream.viewerCount || 1}
                      </span>
                    </div>

                    {/* Theater Mode / Collapse Toggle */}
                    <button
                      onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                      title={isSidebarCollapsed ? "Show Chat Sidebar" : "Hide Chat Sidebar (Big Screen)"}
                      className="bg-black/40 backdrop-blur-md hover:bg-black/60 text-zinc-300 hover:text-white border border-white/10 p-1.5 sm:p-2 rounded-full shadow-lg transition active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                    >
                      {isSidebarCollapsed ? (
                        <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      ) : (
                        <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      )}
                    </button>
                    
                    {/* End Live / Leave Room button */}
                    {currentUser?.uid === activeStream.creatorId ? (
                      <button 
                        onClick={handleEndStream}
                        className="bg-red-600 hover:bg-red-500 border border-red-500/30 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-[9px] sm:text-[10px] font-black text-white uppercase tracking-wider transition active:scale-95 cursor-pointer flex items-center gap-1 sm:gap-1.5 shadow-lg shrink-0"
                        title="End Livestream for everyone"
                      >
                        <Power className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                        <span>End Live</span>
                      </button>
                    ) : (
                      <button 
                        onClick={handleEndStream}
                        className="bg-zinc-800/80 hover:bg-zinc-700 border border-white/10 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-[9px] sm:text-[10px] font-black text-zinc-300 hover:text-white uppercase tracking-wider transition active:scale-95 cursor-pointer flex items-center gap-1 sm:gap-1.5 shadow-lg shrink-0"
                        title="Leave Stream"
                      >
                        <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span>Leave Room</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Microphone access warning banner if failed */}
              {micError && (
                <div className="mx-6 mt-4 bg-gradient-to-r from-red-950/50 to-pink-950/50 border border-red-500/30 p-3.5 rounded-2xl flex items-start gap-3 shadow-lg shadow-red-500/5 animate-pulse shrink-0">
                  <span className="text-lg">🎙️</span>
                  <div className="flex-1 space-y-1">
                    <p className="text-[11px] font-bold text-red-200 uppercase tracking-wider font-mono">Microphone Connection Status</p>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">{micError}</p>
                    <div className="flex gap-2 pt-1.5">
                      <button
                        onClick={() => window.open(window.location.href, "_blank")}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-3 py-1.5 rounded-lg text-[9px] uppercase tracking-wider cursor-pointer border-none transition"
                      >
                        🚀 Open in New Tab
                      </button>
                      <button
                        onClick={() => setMicError(null)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 font-extrabold px-3 py-1.5 rounded-lg text-[9px] uppercase tracking-wider cursor-pointer border-none transition"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Camera access warning banner if failed */}
              {cameraError && (
                <div className="mx-6 mt-4 bg-gradient-to-r from-amber-950/50 to-orange-950/50 border border-amber-500/30 p-3.5 rounded-2xl flex items-start gap-3 shadow-lg shadow-amber-500/5 animate-pulse shrink-0">
                  <span className="text-lg">📷</span>
                  <div className="flex-1 space-y-1">
                    <p className="text-[11px] font-bold text-amber-200 uppercase tracking-wider font-mono">Camera Connection Status</p>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">{cameraError}</p>
                    <div className="flex gap-2 pt-1.5">
                      <button
                        onClick={() => window.open(window.location.href, "_blank")}
                        className="bg-amber-600 hover:bg-amber-500 text-white font-extrabold px-3 py-1.5 rounded-lg text-[9px] uppercase tracking-wider cursor-pointer border-none transition"
                      >
                        🚀 Open in New Tab
                      </button>
                      <button
                        onClick={() => setCameraError(null)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 font-extrabold px-3 py-1.5 rounded-lg text-[9px] uppercase tracking-wider cursor-pointer border-none transition"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Center Content: AUDIO SOCIAL ROOM (Seats Grid) vs. VIDEO BROADCAST */}
              <div className="flex-1 flex flex-col justify-start p-0 overflow-hidden relative">
                {activeStream.type === "audio" ? (
                  /* Audio Stream Seats Layout: Full-Screen Stage with responsive 5-column grid */
                  <div className={`absolute inset-0 w-full h-full overflow-y-auto p-4 sm:p-6 pb-56 space-y-4 z-0 scrollbar-none flex flex-col items-center justify-start ${
                    enable3D && isWebGLAvailable() ? "pointer-events-none" : "pointer-events-auto"
                  }`}>
                    
                    {/* Floating Auto-Dismissing System Notifications Overlay */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none w-full max-w-xs sm:max-w-md">
                      <AnimatePresence>
                        {systemNotifications.slice(-3).map((notif) => (
                          <motion.div
                            key={notif.id}
                            initial={{ y: -20, opacity: 0, scale: 0.9 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-gradient-to-r from-purple-600/95 to-pink-600/95 backdrop-blur px-4 py-1.5 rounded-full border border-purple-500/30 text-[10px] sm:text-xs font-black shadow-lg flex items-center gap-2 text-white"
                          >
                            <span>✨ {notif.senderName === "GIFT" ? "GIFT" : notif.senderName} {notif.text}</span>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>

                    <div className="w-full max-w-5xl mx-auto space-y-4 relative flex-1 flex flex-col justify-center py-4">
                      
                      {/* PK Battle Scoreboard Area */}
                      {activeBattle && (
                        <div className="w-full bg-zinc-900/90 border border-indigo-500/20 rounded-2xl p-4 space-y-3 shadow-xl backdrop-blur-md mb-4 pointer-events-auto">
                          <div className="flex items-center justify-between text-[11px] font-black text-zinc-300 uppercase tracking-wider">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                              <span>Host Team: {activeBattle.creator1Name || "Us"}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded-full text-pink-400 font-mono text-[10px]">
                              <Clock className="w-3.5 h-3.5 text-pink-500 animate-spin" style={{ animationDuration: '4s' }} />
                              <span>PK Timer: {Math.floor(battleTimer / 60)}:{(battleTimer % 60).toString().padStart(2, '0')}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse" />
                              <span>Opponent: {activeBattle.creator2Name || "The Challenger"}</span>
                            </div>
                          </div>
                          
                          {/* Interactive gauge bar */}
                          <div className="relative h-6 bg-zinc-950 rounded-full overflow-hidden border border-white/10 flex">
                            <div 
                              style={{ width: `${(activeBattle.creator1Score + activeBattle.creator2Score) > 0 ? (activeBattle.creator1Score / (activeBattle.creator1Score + activeBattle.creator2Score)) * 100 : 50}%` }}
                              className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full flex items-center pl-3 transition-all duration-500"
                            >
                              <span className="text-[10px] font-black text-white drop-shadow font-mono">{activeBattle.creator1Score || 0} pts</span>
                            </div>
                            <div 
                              style={{ width: `${(activeBattle.creator1Score + activeBattle.creator2Score) > 0 ? (activeBattle.creator2Score / (activeBattle.creator1Score + activeBattle.creator2Score)) * 100 : 50}%` }}
                              className="bg-gradient-to-l from-pink-600 to-rose-500 h-full flex items-center justify-end pr-3 transition-all duration-500"
                            >
                              <span className="text-[10px] font-black text-white drop-shadow font-mono">{activeBattle.creator2Score || 0} pts</span>
                            </div>
                            
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-500 text-black px-1.5 py-0.5 rounded-full shadow-lg border border-amber-400 z-10 flex items-center justify-center animate-bounce">
                              <Flame className="w-3.5 h-3.5 fill-current" />
                            </div>
                          </div>

                          {activeBattle.status === "completed" && (
                            <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-center text-xs font-bold uppercase tracking-wider">
                              🎉 PK Winner: {activeBattle.winnerId === activeStream.creatorId ? "Us" : (activeBattle.winnerName || "Draw")}!
                            </div>
                          )}
                        </div>
                      )}

                      {/* 3D and 2D visualizers occupy all the space below */}

                      {enable3D && isWebGLAvailable() ? null : (
                        /* Stage Grid Layout - Perfect 5 Columns x 5 Rows (25 seats) */
                        <div className="grid grid-cols-5 gap-x-2 gap-y-4 justify-items-center w-full max-w-lg mx-auto bg-transparent p-2">
                          {Array.from({ length: 25 }, (_, i) => {
                            const seatNum = i + 1;
                            
                            // Check if occupied by real user in Firestore
                            const dbSeat = seatsArray.find(s => s.id === `seat_${seatNum}`);
                            const isOccupiedByRealUser = dbSeat && dbSeat.userId !== null;

                            let seatUser: {
                              id: string;
                              userId: string | null;
                              username: string;
                              photoURL: string;
                              role: string;
                              isMuted: boolean;
                              isSpeaking: boolean;
                              coins: string;
                            };

                            if (isOccupiedByRealUser) {
                              seatUser = {
                                id: dbSeat.id,
                                userId: dbSeat.userId,
                                username: dbSeat.username || "Guest",
                                photoURL: dbSeat.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
                                role: dbSeat.role || "Guest",
                                isMuted: dbSeat.isMuted ?? true,
                                isSpeaking: dbSeat.isSpeaking ?? false,
                                coins: dbSeat.coins || "1.2K"
                              };
                            } else {
                              // Completely empty seat
                              seatUser = {
                                id: `seat_${seatNum}`,
                                userId: null,
                                username: "",
                                photoURL: "",
                                role: "Guest",
                                isMuted: true,
                                isSpeaking: false,
                                coins: ""
                              };
                            }

                            const isHostSeat = seatNum === 1;

                            return (
                              <motion.div
                                key={seatNum}
                                whileHover={{ y: -6, scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={async () => {
                                  if (!seatUser.userId) {
                                    await handleOccupySeat(`seat_${seatNum}`);
                                  } else if (seatUser.userId === currentUser?.uid) {
                                    // toggle mic on click of own seat
                                    const newMute = !isMuted;
                                    setIsMuted(newMute);
                                    if (currentUser && activeStream) {
                                      const userSeat = seatsArray.find(s => s.userId === currentUser.uid);
                                      if (userSeat) {
                                        await handleToggleGuestMute(userSeat.id, !newMute);
                                      }
                                    }
                                  } else {
                                    // Open virtual gift modal for this seat's user
                                    setGiftingReceiver({
                                      id: seatUser.userId,
                                      name: seatUser.username,
                                      photo: seatUser.photoURL
                                    });
                                    setShowGiftModal(true);
                                  }
                                }}
                                className="relative flex flex-col items-center group cursor-pointer z-10"
                              >
                                {/* Soft Depth Shadow underneath the seat */}
                                <div className="absolute top-10 sm:top-12 w-9 h-2 bg-black/60 rounded-full blur-[4px] opacity-75 group-hover:scale-110 group-hover:opacity-90 transition-all duration-300" />

                                {/* Seat Number Tag */}
                                <span className="absolute -top-1.5 -left-1 text-[8px] bg-black/80 border border-white/10 text-white font-mono rounded-full w-4 h-4 flex items-center justify-center shadow z-20 font-bold scale-90">
                                  {seatNum}
                                </span>

                                {/* Crown on top of Seat 1 */}
                                {isHostSeat && (
                                  <span className="absolute -top-4.5 left-1/2 -translate-x-1/2 text-sm z-20 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] animate-[bounce_2s_infinite]">
                                    👑
                                  </span>
                                )}

                                {/* Concentric voice waves radiating behind active speaker */}
                                {seatUser.userId && seatUser.isSpeaking && !seatUser.isMuted && (
                                  <>
                                    <div className="absolute top-0 left-0 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-emerald-500/20 animate-[ping_1.8s_ease-in-out_infinite] scale-125 z-0 pointer-events-none" />
                                    <div className="absolute top-0 left-0 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-emerald-400/10 animate-[ping_2.5s_ease-in-out_infinite] scale-150 z-0 pointer-events-none" style={{ animationDelay: '0.4s' }} />
                                  </>
                                )}

                                {/* Outer Circle Ring with 3D Depth & Neon/Gold Glows */}
                                <div className={`w-11 h-11 sm:w-13 sm:h-13 rounded-full p-[1.5px] relative transition-all duration-300 ${
                                  seatUser.userId
                                    ? seatUser.isSpeaking && !seatUser.isMuted
                                      ? "bg-gradient-to-tr from-emerald-400 via-teal-300 to-emerald-500 ring-[3px] ring-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.8)] animate-pulse"
                                      : isHostSeat
                                        ? "bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 ring-[3px] ring-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)]"
                                        : seatUser.role.toLowerCase().includes("vip")
                                          ? "bg-gradient-to-tr from-purple-600 via-pink-400 to-indigo-600 ring-[3px] ring-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.6)]"
                                          : seatUser.role.toLowerCase().includes("mod") || seatUser.role.toLowerCase().includes("co-host")
                                            ? "bg-gradient-to-tr from-cyan-500 via-sky-300 to-blue-600 ring-[3px] ring-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.6)]"
                                            : "bg-gradient-to-tr from-zinc-700 to-zinc-900 ring-2 ring-zinc-700/50 shadow-md"
                                      : "border border-dashed border-white/20 bg-black/40 hover:bg-white/5 hover:border-purple-500/50 hover:shadow-[0_0_10px_rgba(168,85,247,0.3)] transition-all duration-300"
                                }`}>
                                  {seatUser.userId ? (
                                    <img
                                      src={seatUser.photoURL}
                                      alt={seatUser.username}
                                      className="w-full h-full rounded-full object-cover border border-[#0d081b] z-10 relative"
                                    />
                                  ) : (
                                    <div className="w-full h-full rounded-full flex items-center justify-center text-zinc-500 group-hover:text-purple-300 transition-colors">
                                      <span className="text-lg font-light">+</span>
                                    </div>
                                  )}

                                  {/* Microphone Mute / Unmute Status Icon */}
                                  {seatUser.userId && (
                                    <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border border-[#0d081b] z-20 shadow-md ${
                                      seatUser.isMuted ? "bg-rose-500" : "bg-emerald-500"
                                    }`}>
                                      {seatUser.isMuted ? (
                                        <MicOff className="w-2.5 h-2.5 text-white" />
                                      ) : (
                                        <Mic className="w-2.5 h-2.5 text-white" />
                                      )}
                                    </span>
                                  )}

                                  {/* "Host" banner label below host avatar */}
                                  {isHostSeat && seatUser.userId && (
                                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#7c3aed] text-white text-[7px] font-black px-1.5 py-0.5 rounded-full z-20 uppercase tracking-widest scale-90 leading-none shadow border border-white/10">
                                      Host
                                    </span>
                                  )}
                                </div>

                                {/* Name and Coins Labels inside frosted capsules */}
                                {seatUser.userId && (
                                  <div className="flex flex-col items-center mt-1.5 w-14 sm:w-16 z-10">
                                    <span className="text-[10px] font-bold text-zinc-100 truncate text-center w-full drop-shadow">
                                      {seatUser.username}
                                    </span>
                                    <span className="text-[8px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-full px-1 py-0.5 mt-0.5 flex items-center gap-0.5 scale-90 leading-none">
                                      💎 {seatUser.coins || "1.0K"}
                                    </span>
                                  </div>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* View requests to join stage button */}
                    {(isHosting || currentUser?.uid === activeStream.creatorId) && requests.length > 0 && (
                      <div className="text-center pt-2 relative z-10">
                        <button
                          onClick={() => setShowRequestsModal(true)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase px-5 py-2.5 rounded-full border border-indigo-500/20 flex items-center gap-1.5 mx-auto cursor-pointer shadow-lg active:scale-95 transition pointer-events-auto"
                        >
                          <UserCheck className="w-4 h-4" />
                          <span>Join Requests ({requests.length})</span>
                        </button>
                      </div>
                    )}

                    {/* 2026 FLOATING RED COIN ENVELOPES OVERLAY */}
                    {redEnvelopes.map((env) => (
                      <motion.div
                        key={env.id}
                        initial={{ scale: 0, x: -100 }}
                        animate={{ scale: [1, 1.1, 1], x: 0 }}
                        transition={{ repeat: Infinity, duration: 2, repeatType: "reverse" }}
                        className="absolute top-28 left-4 z-40 bg-gradient-to-br from-red-600 via-rose-500 to-red-700 hover:from-red-500 hover:to-rose-600 px-3.5 py-2.5 rounded-3xl border border-red-400/40 shadow-2xl flex items-center gap-2 cursor-pointer pointer-events-auto select-none"
                        onClick={async (e) => {
                          e.stopPropagation();
                          
                          // Claim coins!
                          const amt = Math.floor(Math.random() * 80) + 35;
                          setViewerCoinBalance(c => c + amt);
                          setHubShowToast(`🧧 GRABBED COINS! You claimed ${amt} Sound Coins from Fred's envelope!`);

                          // Decrement claims left
                          setRedEnvelopes(prev => prev.map(item => item.id === env.id ? { ...item, remainingClaims: item.remainingClaims - 1 } : item).filter(item => item.remainingClaims > 0));

                          // Push system notice to chat
                          try {
                            const chatRef = collection(db, "liveStreams", activeStream.id, "chat");
                            await addDoc(chatRef, {
                              id: `chat_claim_${Date.now()}`,
                              streamId: activeStream.id,
                              senderId: "system",
                              senderName: "🧧 ENVELOPE GRAB",
                              text: `@${currentUser?.username || "Viewer"} successfully grabbed ${amt} coins! ${env.remainingClaims - 1} claims remaining!`,
                              createdAt: new Date().toISOString()
                            });
                          } catch (err) {}
                        }}
                      >
                        <span className="text-xl sm:text-2xl animate-bounce">🧧</span>
                        <div className="flex flex-col text-left">
                          <span className="text-[10px] text-yellow-100 font-extrabold uppercase tracking-widest font-mono">LUCKY ENVELOPE</span>
                          <span className="text-[8px] text-red-100 font-semibold font-sans">{env.senderName.slice(0,10)} dropped {env.totalCoins}c ({env.remainingClaims} left)</span>
                        </div>
                      </motion.div>
                    ))}

                    {/* 2026 ACTIVE TRIVIA OVERLAY CARD */}
                    {activeTrivia && activeTrivia.timeLeft > 0 && (
                      <motion.div
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="absolute top-28 right-4 z-40 bg-gradient-to-br from-[#1e1145] via-[#2d1154] to-[#12072b] p-3 rounded-2xl border border-purple-400/30 shadow-2xl w-52 text-left pointer-events-auto"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[8px] bg-purple-500 text-white font-black px-1.5 py-0.5 rounded uppercase tracking-wider font-mono">🏆 LIVE TRIVIA</span>
                          <span className="text-[8px] font-mono font-black text-pink-400 animate-pulse">{activeTrivia.timeLeft}s left</span>
                        </div>
                        <p className="text-[9px] font-bold text-white leading-tight mb-1.5">{activeTrivia.question}</p>
                        
                        {/* Options buttons */}
                        <div className="grid grid-cols-2 gap-1">
                          {activeTrivia.options.map((opt, idx) => (
                            <button
                              key={idx}
                              disabled={activeTrivia.userAnswerIndex !== null}
                              onClick={async (e) => {
                                e.stopPropagation();
                                const isCorrect = idx === activeTrivia.correctAnswerIndex;
                                const reward = isCorrect ? 100 : 0;
                                
                                setActiveTrivia(prev => ({
                                  ...prev,
                                  userAnswerIndex: idx,
                                  status: "answered"
                                }));

                                if (isCorrect) {
                                  setViewerCoinBalance(c => c + reward);
                                  setHubShowToast(`🎉 CORRECT! You answered correctly and earned +100 Sound Coins!`);
                                } else {
                                  setHubShowToast(`❌ INCORRECT! The correct answer was: ${activeTrivia.options[activeTrivia.correctAnswerIndex]}`);
                                }

                                // Update Quest 1: Trivia
                                setDailyQuests(quests => quests.map(q => q.id === "quest_1" ? { ...q, progress: q.progress + 1, completed: q.progress + 1 >= q.target } : q));

                                // Post system message to chat
                                try {
                                  const chatRef = collection(db, "liveStreams", activeStream.id, "chat");
                                  await addDoc(chatRef, {
                                    id: `chat_trivia_${Date.now()}`,
                                    streamId: activeStream.id,
                                    senderId: "system",
                                    senderName: "🏆 TRIVIA CHALLENGE",
                                    text: `@${currentUser?.username || "Viewer"} answered "${opt}" (${isCorrect ? "✅ CORRECT +100c" : "❌ INCORRECT"})!`,
                                    createdAt: new Date().toISOString()
                                  });
                                } catch (err) {}
                              }}
                              className={`py-1 rounded text-[8px] font-black uppercase transition border-none cursor-pointer truncate ${
                                activeTrivia.userAnswerIndex === idx
                                  ? idx === activeTrivia.correctAnswerIndex
                                    ? "bg-emerald-600 text-white"
                                    : "bg-rose-600 text-white"
                                  : "bg-black/40 hover:bg-black/60 text-zinc-300"
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* FLOATING CHAT COMMENTS OVERLAY (Bottom-Left side, floating above the controls) */}
                    <div className="absolute bottom-40 left-4 z-30 w-full max-w-[280px] sm:max-w-[340px] max-h-48 overflow-y-auto flex flex-col justify-end space-y-1.5 scrollbar-none scroll-smooth pointer-events-auto">
                      <div className="space-y-1.5 flex flex-col justify-end">
                        {chatMessages.filter(m => m.senderId !== "system" && m.senderName !== "SYSTEM" && m.senderName !== "GIFT" && !m.text.includes("🎁") && !m.text.includes("sent a") && !m.text.includes("Reacted with") && !m.text.includes("liked") && !m.text.includes("shared")).length === 0 ? (
                          <div className="bg-black/50 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/5 text-[10px] text-zinc-400 max-w-max italic shadow-lg">
                            💬 Welcome! Send a message to chat...
                          </div>
                        ) : (
                          chatMessages
                            .filter(m => m.senderId !== "system" && m.senderName !== "SYSTEM" && m.senderName !== "GIFT" && !m.text.includes("🎁") && !m.text.includes("sent a") && !m.text.includes("Reacted with") && !m.text.includes("liked") && !m.text.includes("shared"))
                            .slice(-5)
                            .map((msg) => {
                              const isHost = msg.senderId === activeStream.creatorId;
                              return (
                                <div 
                                  key={msg.id} 
                                  className="text-[11px] bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/5 text-white max-w-max flex items-center gap-1.5 shadow-md hover:bg-black/60 transition animate-fadeIn"
                                >
                                  <span className={`font-bold ${isHost ? "text-amber-400" : "text-emerald-400"}`}>
                                    {msg.senderName}:
                                  </span>
                                  <span className="text-zinc-200">
                                    {msg.text}
                                  </span>
                                </div>
                              );
                            })
                        )}
                      </div>
                    </div>

                    {/* SYSTEM/SAFETY INFO STRIP */}
                    <div className="absolute bottom-32 left-4 z-30 flex items-center justify-between bg-black/45 backdrop-blur-md px-3 py-1 rounded-full border border-white/5 max-w-max text-[9px] text-zinc-300 font-bold shadow-md pointer-events-auto">
                      <span className="text-pink-500 mr-1.5 font-sans animate-pulse">● LIVE</span>
                      <span>Audio room protected by automated guard rails</span>
                    </div>

                    {/* MUSIC PLAYLIST & independent volume panel drawer overlay */}
                    {showMusicPlaylistPanel && (
                      <div className="absolute bottom-32 left-4 right-4 bg-[#08050e]/95 backdrop-blur-md border border-white/10 rounded-t-3xl p-4 space-y-4 shadow-2xl z-40 animate-slide-up max-h-[350px] overflow-y-auto pointer-events-auto max-w-3xl mx-auto">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                          <div className="flex items-center gap-2">
                            <Radio className="w-4 h-4 text-pink-500" />
                            <h5 className="text-xs font-bold uppercase tracking-wider text-white">Stage Playlist & Volume controllers</h5>
                          </div>
                          <button onClick={() => setShowMusicPlaylistPanel(false)} className="text-zinc-400 hover:text-white bg-transparent border-none cursor-pointer">
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Dual volume controllers */}
                        <div className="grid grid-cols-2 gap-4 bg-zinc-950 p-3 rounded-2xl border border-white/5">
                          <div className="space-y-1.5">
                            <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1">
                              <Mic className="w-3.5 h-3.5 text-indigo-400" />
                              Mic Gain Volume ({micVolume}%)
                            </label>
                            <input 
                              type="range" 
                              min="0" 
                              max="100" 
                              value={micVolume} 
                              onChange={(e) => setMicVolume(Number(e.target.value))}
                              className="w-full accent-indigo-500 cursor-pointer h-1 bg-white/10 rounded-lg appearance-none"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1">
                              <Volume2 className="w-3.5 h-3.5 text-pink-400" />
                              Room Music Volume ({musicVolume}%)
                            </label>
                            <input 
                              type="range" 
                              min="0" 
                              max="100" 
                              value={musicVolume} 
                              onChange={(e) => setMusicVolume(Number(e.target.value))}
                              className="w-full accent-pink-500 cursor-pointer h-1 bg-white/10 rounded-lg appearance-none"
                            />
                          </div>
                        </div>

                        {/* Host playlist content */}
                        {isHosting || currentUser?.uid === activeStream.creatorId ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Configure Room Playlist:</p>
                              <div className="flex gap-2">
                                <button 
                                  onClick={handleToggleShuffle}
                                  className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                                    (activeStream as any).isShuffle ? "bg-indigo-500/20 border-indigo-500 text-indigo-400" : "bg-white/5 border-white/10 text-zinc-400"
                                  }`}
                                >
                                  Shuffle
                                </button>
                                <button 
                                  onClick={handleToggleRepeat}
                                  className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                                    (activeStream as any).isRepeat ? "bg-[#eab308]/20 border-[#eab308] text-[#eab308]" : "bg-white/5 border-white/10 text-zinc-400"
                                  }`}
                                >
                                  Loop
                                </button>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              {/* Simple Songs Selection */}
                              {[{ id: "s1", title: "Midnight Whispers", artistName: "African Sunset", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
                                { id: "s2", title: "Afro Beats Energy", artistName: "Lagos Crew", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
                                { id: "s3", title: "Deep Focus Ambient", artistName: "Zion Zen", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" }
                              ].map((song) => {
                                const isAdded = ((activeStream as any).roomPlaylist || []).some((s: any) => s.id === song.id);
                                return (
                                  <div key={song.id} className="flex items-center justify-between bg-white/5 p-2 rounded-xl text-xs">
                                    <div>
                                      <p className="font-bold text-white">{song.title}</p>
                                      <p className="text-[9px] text-zinc-400">{song.artistName}</p>
                                    </div>
                                    <button
                                      onClick={() => handleAddSongToPlaylist(song)}
                                      disabled={isAdded}
                                      className="text-[10px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-lg border-none cursor-pointer disabled:opacity-50"
                                    >
                                      {isAdded ? "Added" : "+ Add"}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-xs text-zinc-500 py-4 font-bold">
                            Only the host or room managers can broadcast music tracks.
                          </div>
                        )}
                      </div>
                    )}

                    {/* FIXED BOTTOM CONTROLS DOCK FOR AUDIO STREAM */}
                    <div className="absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-[#04010a] via-[#04010a]/90 to-transparent p-4 pb-6 space-y-3 pointer-events-auto">
                      
                      {/* Message Input Row */}
                      <div className="flex items-center gap-2 w-full max-w-lg mx-auto">
                        <div className="flex-1 flex items-center gap-2 bg-[#120a28]/60 backdrop-blur-md border border-white/5 rounded-full px-4 py-2 shadow-lg">
                          <input
                            type="text"
                            placeholder="Type a message..."
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSendChatMessage();
                            }}
                            className="flex-1 bg-transparent border-none focus:outline-none text-xs sm:text-sm text-white placeholder-zinc-400 text-left"
                          />
                          <button
                            onClick={() => setChatInput(chatInput + " 😊")}
                            className="text-zinc-400 hover:text-white transition bg-transparent border-none cursor-pointer p-0.5"
                          >
                            <Smile className="w-4 h-4 text-zinc-400" />
                          </button>
                        </div>
                        <button
                          onClick={handleSendChatMessage}
                          disabled={!chatInput.trim()}
                          className="w-10 h-10 rounded-full bg-[#7c3aed] hover:bg-[#8b5cf6] text-white flex items-center justify-center shadow-lg transition active:scale-95 border-none cursor-pointer shrink-0 disabled:opacity-40"
                        >
                          <Send className="w-4 h-4 text-white transform rotate-45" />
                        </button>
                      </div>

                      {/* Six Icon Tabs Control Dock Bar matching screenshot mockup exactly */}
                      <div className="bg-[#120a28]/85 backdrop-blur-md border border-white/5 rounded-3xl p-3 max-w-lg mx-auto shadow-2xl flex items-center justify-around gap-1.5 animate-fadeIn">
                        
                        {/* 1. Chat Tab */}
                        <button
                          onClick={() => {
                            setIsSidebarCollapsed(!isSidebarCollapsed);
                          }}
                          className="flex flex-col items-center group cursor-pointer bg-transparent border-none p-0 flex-1"
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition shadow-lg mx-auto ${
                            showSidebar 
                              ? "bg-[#7c3aed] text-white" 
                              : "bg-[#7c3aed]/15 border border-[#7c3aed]/30 text-[#a78bfa] hover:bg-[#7c3aed]/25"
                          }`}>
                            <MessageSquare className="w-5 h-5" />
                          </div>
                          <span className={`text-[9px] font-bold tracking-wide mt-1 transition-colors text-center block ${
                            showSidebar ? "text-[#a78bfa]" : "text-zinc-400 group-hover:text-white"
                          }`}>
                            Chat
                          </span>
                        </button>

                        {/* 2. Mic Tab */}
                        <button
                          onClick={async () => {
                            const newMute = !isMuted;
                            setIsMuted(newMute);
                            if (currentUser && activeStream) {
                              const userSeat = seatsArray.find(s => s.userId === currentUser.uid);
                              if (userSeat) {
                                await handleToggleGuestMute(userSeat.id, !newMute);
                              }
                            }
                          }}
                          className="flex flex-col items-center group cursor-pointer bg-transparent border-none p-0 flex-1"
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition border shadow-lg mx-auto ${
                            isMuted 
                              ? "bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/25" 
                              : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                          }`}>
                            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                          </div>
                          <span className="text-[9px] font-bold tracking-wide mt-1 text-zinc-400 group-hover:text-white text-center block">
                            Mic
                          </span>
                        </button>

                        {/* 3. Speaker Tab */}
                        <button
                          onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
                          className="flex flex-col items-center group cursor-pointer bg-transparent border-none p-0 flex-1"
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition border shadow-lg mx-auto ${
                            isSpeakerMuted 
                              ? "bg-zinc-800/50 border-zinc-700/50 text-zinc-500" 
                              : "bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#22c55e] hover:bg-[#22c55e]/25 animate-pulse"
                          }`}>
                            {isSpeakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 text-[#22c55e]" />}
                          </div>
                          <span className={`text-[9px] font-bold tracking-wide mt-1 transition-colors text-center block ${
                            isSpeakerMuted ? "text-zinc-400" : "text-[#22c55e]"
                          }`}>
                            Speaker
                          </span>
                        </button>

                        {/* 4. Menu / Shield */}
                        <button
                          onClick={() => {
                            setRoomSettingsTab("layout");
                            setShowRoomSettingsModal(true);
                          }}
                          className="flex flex-col items-center group cursor-pointer bg-transparent border-none p-0 flex-1"
                        >
                          <div className="w-10 h-10 rounded-full flex items-center justify-center transition border border-white/10 bg-white/5 hover:bg-white/10 text-white shadow-lg mx-auto">
                            <Shield className="w-5 h-5" />
                          </div>
                          <span className="text-[9px] font-bold tracking-wide mt-1 text-zinc-400 group-hover:text-white text-center block">
                            Menu
                          </span>
                        </button>

                        {/* 5. Gift Tab (Golden Yellow Action Button matching user screenshot instruction perfectly) */}
                        <button
                          onClick={() => {
                            setGiftingReceiver({
                              id: activeStream.creatorId,
                              name: activeStream.creatorName,
                              photo: activeStream.creatorPhoto || ""
                            });
                            setShowGiftModal(true);
                          }}
                          className="flex flex-col items-center group cursor-pointer bg-transparent border-none p-0 flex-1"
                        >
                          <div className="w-10 h-10 rounded-full flex items-center justify-center transition border border-[#facc15]/30 bg-[#facc15]/15 hover:bg-[#facc15]/25 text-[#facc15] shadow-lg mx-auto">
                            <Gift className="w-5 h-5 text-[#facc15] fill-[#facc15]/20 animate-bounce" />
                          </div>
                          <span className="text-[9px] font-black tracking-wide mt-1 text-[#facc15] group-hover:text-white text-center block">
                            Gift
                          </span>
                        </button>

                        {/* 6. More Tab */}
                        <button
                          onClick={() => {
                            setShowMusicPlaylistPanel(!showMusicPlaylistPanel);
                          }}
                          className="flex flex-col items-center group cursor-pointer bg-transparent border-none p-0 flex-1"
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition border shadow-lg mx-auto ${
                            showMusicPlaylistPanel 
                              ? "bg-purple-500/20 border-purple-500 text-purple-300" 
                              : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                          }`}>
                            <Radio className="w-5 h-5" />
                          </div>
                          <span className="text-[9px] font-bold tracking-wide mt-1 text-zinc-400 group-hover:text-white text-center block">
                            More
                          </span>
                        </button>

                        {/* 7. Hearts button */}
                        <button
                          onClick={handleSendHeart}
                          className="flex flex-col items-center group cursor-pointer bg-transparent border-none p-0 flex-1"
                        >
                          <div className="w-10 h-10 rounded-full flex items-center justify-center transition border border-[#ef4444]/30 bg-[#ef4444]/15 hover:bg-[#ef4444]/25 text-[#ef4444] shadow-lg mx-auto">
                            <Heart className="w-5 h-5 text-[#ef4444] fill-[#ef4444]/20 animate-pulse" />
                          </div>
                          <span className="text-[9px] font-bold tracking-wide mt-1 text-zinc-400 group-hover:text-white text-center block">
                            Likes
                          </span>
                        </button>

                      </div>

                    </div>

                  </div>
              ) : (
                  /* Video Stream Layout: Immersive full bleed behind everything */
                  <div className="absolute inset-0 w-full h-full bg-black overflow-hidden z-0">
                    <div 
                      ref={videoContainerRef} 
                      className="w-full h-full bg-black flex items-center justify-center absolute inset-0 z-0"
                      style={{ filter: cameraFilter }}
                    >
                      {(!agoraBroadcasting || currentUser?.uid === activeStream?.creatorId) && (
                        <video 
                          ref={videoRef} 
                          autoPlay 
                          playsInline 
                          muted={currentUser?.uid === activeStream?.creatorId ? true : isMuted} 
                          className="w-full h-full object-cover absolute inset-0 z-0" 
                          style={{ filter: cameraFilter }}
                        />
                      )}
                    </div>

                    {/* Gradient shading overlays for high contrast/readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-transparent to-black/85 pointer-events-none z-10" />
                  </div>
                )}
              </div>

              {/* UNIFIED STREAM OVERLAYS & ACTION TOOLBAR (visible for VIDEO rooms only now) */}
              {activeStream.type === "video" && (
                <div className="absolute inset-0 flex flex-col justify-end p-4 pb-6 z-20 pointer-events-none">
                
                {/* Floating Warnings */}
                <div className="space-y-2 mb-2 pointer-events-auto max-w-sm">
                  {cameraError && activeStream.type === "video" && (
                    <div className="bg-gradient-to-r from-amber-950/80 to-orange-950/80 backdrop-blur-md border border-amber-500/30 p-2.5 rounded-xl flex items-start gap-2 shadow-lg">
                      <span className="text-sm">📷</span>
                      <div className="flex-1">
                        <p className="text-[9px] font-bold text-amber-200 uppercase font-mono tracking-wider">Camera Connection Status</p>
                        <p className="text-[9px] text-zinc-300 leading-normal">{cameraError}</p>
                      </div>
                    </div>
                  )}

                  {micError && (
                    <div className="bg-gradient-to-r from-red-950/80 to-pink-950/80 backdrop-blur-md border border-red-500/30 p-2.5 rounded-xl flex items-start gap-2 shadow-lg">
                      <span className="text-sm">🎙️</span>
                      <div className="flex-1">
                        <p className="text-[9px] font-bold text-red-200 uppercase font-mono tracking-wider">Microphone Connection Status</p>
                        <p className="text-[9px] text-zinc-300 leading-normal">{micError}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* FLOATING CHAT COMMENTS OVERLAY (Bottom-Left) */}
                <div className="w-full max-w-[340px] max-h-48 overflow-y-auto flex flex-col justify-end space-y-1.5 scrollbar-none scroll-smooth mb-2.5 pr-2 pointer-events-auto">
                  <div className="space-y-1.5 flex flex-col justify-end">
                    {chatMessages.length === 0 ? (
                      <div className="bg-black/45 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/5 text-[10px] text-zinc-400 max-w-max italic shadow-lg">
                        💬 Welcome to the stream! Type a comment below...
                      </div>
                    ) : (
                      chatMessages.slice(-8).map((msg) => {
                        const isSystem = msg.senderId === "system" || msg.senderName === "GIFT" || msg.text.includes("🎁") || msg.text.includes("sent a") || msg.text.includes("Reacted with") || msg.text.includes("liked") || msg.text.includes("shared");
                        const isHost = msg.senderId === activeStream.creatorId;

                        if (isSystem) {
                          return (
                            <div 
                              key={msg.id} 
                              className="text-[10px] bg-gradient-to-r from-purple-900/60 to-pink-900/60 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-purple-500/20 text-pink-200 font-bold shadow-lg max-w-max animate-fadeIn"
                            >
                              ✨ {msg.senderName === "GIFT" ? "GIFT" : msg.senderName} {msg.text}
                            </div>
                          );
                        }

                        return (
                          <div 
                            key={msg.id} 
                            className="text-[11px] bg-black/45 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/5 text-white max-w-max flex items-center gap-1.5 shadow-md hover:bg-black/55 transition animate-fadeIn"
                          >
                            <span className={`font-bold ${isHost ? "text-amber-400" : "text-emerald-400"}`}>
                              {msg.senderName}:
                            </span>
                            <span className="text-zinc-200">
                              {msg.text}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* CAMERA FILTERS & BRIGHTNESS CONTROLLER STRIP */}
                <div className="flex items-center gap-1.5 bg-black/55 backdrop-blur-md px-3 py-1.5 rounded-full border border-emerald-500/25 max-w-max text-[10px] text-zinc-300 font-bold mb-2.5 shadow-lg pointer-events-auto flex-wrap">
                  <span className="text-emerald-400">✨ Camera Filter:</span>
                  {[
                    { label: "Bright 🌟", value: "brightness(1.4) contrast(1.05) saturate(1.1)" },
                    { label: "Ultra ⚡", value: "brightness(1.7) contrast(1.1) saturate(1.2)" },
                    { label: "Warm ☀️", value: "brightness(1.3) contrast(1.05) saturate(1.2) sepia(0.2)" },
                    { label: "Cool ❄️", value: "brightness(1.35) contrast(1.1) saturate(1.05) hue-rotate(5deg)" },
                    { label: "Normal 📷", value: "none" }
                  ].map((f) => (
                    <button
                      key={f.label}
                      type="button"
                      onClick={() => {
                        setCameraFilter(f.value);
                        setHubShowToast(`✨ Camera style set to ${f.label.split(" ")[0]}`);
                      }}
                      className={`px-2 py-0.5 rounded-full text-[9px] font-black transition uppercase cursor-pointer border ${
                        cameraFilter === f.value
                          ? "bg-emerald-500 text-black border-emerald-400"
                          : "bg-zinc-900/60 text-zinc-400 border-transparent hover:text-white"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* SYSTEM/SAFETY INFO STRIP */}
                <div className="flex items-center justify-between bg-black/45 backdrop-blur-md px-3 py-1 rounded-full border border-white/5 max-w-max text-[9px] text-zinc-300 font-bold mb-2 shadow-md pointer-events-auto">
                  <span className="text-pink-500 mr-1.5 font-sans animate-pulse">● LIVE</span>
                  <span>LIVE may contain AI generated content</span>
                  <span className="ml-1 text-zinc-500 font-bold">&gt;</span>
                </div>

                {/* FLOATING ACTION TOOLBAR ROW */}
                <div className="flex flex-col sm:flex-row items-center gap-2 pointer-events-auto w-full relative">
                  {/* Left: Input box with smile button */}
                  <div className="w-full sm:flex-1 flex items-center gap-1.5 bg-black/45 backdrop-blur-md border border-white/15 rounded-full px-2.5 py-1.5 sm:px-4 sm:py-2 relative shadow-lg">
                    <input
                      type="text"
                      placeholder="Type comment..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendChatMessage()}
                      className="flex-1 bg-transparent border-none focus:outline-none text-xs text-white placeholder-zinc-400 font-sans"
                    />
                    <button 
                      onClick={() => setChatInput(chatInput + " 😊")}
                      className="text-zinc-400 hover:text-white transition p-1 bg-transparent border-none cursor-pointer text-xs sm:text-sm"
                    >
                      😊
                    </button>
                    <button
                      onClick={handleSendChatMessage}
                      disabled={!chatInput.trim()}
                      className="bg-gradient-to-r from-pink-500 to-indigo-500 hover:from-pink-400 hover:to-indigo-400 disabled:opacity-50 text-white p-1 sm:p-1.5 rounded-full transition shadow-md border-none cursor-pointer flex items-center justify-center"
                    >
                      <Send className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                  </div>

                  {/* Right: Consolidated quick actions matching first image exactly */}
                  <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end shrink-0 w-full sm:w-auto mt-2 sm:mt-0 relative z-30">
                    {/* Mic Mute Toggle */}
                    <button
                      onClick={async () => {
                        const newMute = !isMuted;
                        setIsMuted(newMute);
                        if (currentUser && activeStream) {
                          const userSeat = seatsArray.find(s => s.userId === currentUser.uid);
                          if (userSeat) {
                            await handleToggleGuestMute(userSeat.id, !newMute);
                          }
                        }
                      }}
                      className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-all duration-300 active:scale-95 cursor-pointer shadow-lg ${
                        isMuted 
                          ? "bg-red-500/10 border-red-500/30 text-red-400" 
                          : "bg-[#141417]/80 hover:bg-[#1f1f23]/80 border-white/5 text-[#d4d4d8] hover:text-white"
                      }`}
                      title={isMuted ? "Unmute Mic" : "Mute Mic"}
                    >
                      {isMuted ? <MicOff className="w-4 h-4 sm:w-[18px] sm:h-[18px]" /> : <Mic className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />}
                    </button>

                    {/* Speaker Mute Toggle */}
                    <button
                      onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
                      className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-all duration-300 active:scale-95 cursor-pointer shadow-lg ${
                        isSpeakerMuted 
                          ? "bg-red-500/10 border-red-500/30 text-red-400" 
                          : "bg-[#141417]/80 hover:bg-[#1f1f23]/80 border-white/5 text-[#d4d4d8] hover:text-white"
                      }`}
                      title={isSpeakerMuted ? "Unmute Speakers" : "Mute Speakers"}
                    >
                      {isSpeakerMuted ? <VolumeX className="w-4 h-4 sm:w-[18px] sm:h-[18px]" /> : <Volume2 className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />}
                    </button>

                    {/* Open Mic Toggle (Host only) */}
                    {(isHosting || currentUser?.uid === activeStream.creatorId) && (
                      <button
                        onClick={handleToggleOpenMic}
                        className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-all duration-300 active:scale-95 cursor-pointer shadow-lg ${
                          openMicEnabled 
                            ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" 
                            : "bg-[#141417]/80 hover:bg-[#1f1f23]/80 border-white/5 text-[#d4d4d8] hover:text-white"
                        }`}
                        title="Toggle Open Mic mode"
                      >
                        <Shield className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                      </button>
                    )}

                    {/* Music Playlist Toggle */}
                    <button
                      onClick={() => setShowMusicPlaylistPanel(!showMusicPlaylistPanel)}
                      className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-all duration-300 active:scale-95 cursor-pointer shadow-lg ${
                        showMusicPlaylistPanel 
                          ? "bg-pink-500/20 border-pink-500 text-pink-400 animate-pulse" 
                          : "bg-[#141417]/80 hover:bg-[#1f1f23]/80 border-white/5 text-[#d4d4d8] hover:text-white"
                      }`}
                      title="Music Playlist"
                    >
                      <Radio className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                    </button>

                    {/* Room Settings (Host only) */}
                    {(isHosting || currentUser?.uid === activeStream.creatorId) && (
                      <button
                        onClick={() => {
                          setRoomSettingsTab("layout");
                          setShowRoomSettingsModal(true);
                        }}
                        className="w-11 h-11 rounded-2xl border bg-[#141417]/80 hover:bg-[#1f1f23]/80 border-white/5 flex items-center justify-center text-[#818cf8] hover:text-[#a5b4fc] transition-all duration-300 active:scale-95 cursor-pointer shadow-lg"
                        title="Room Settings"
                      >
                        <Settings className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#818cf8]" />
                      </button>
                    )}

                    {/* End Live / Leave Room quick action */}
                    {currentUser?.uid === activeStream.creatorId ? (
                      <button
                        onClick={handleEndStream}
                        className="w-11 h-11 rounded-2xl border bg-red-600/20 hover:bg-red-650 border-red-500/30 flex items-center justify-center text-red-400 hover:text-white transition-all duration-300 active:scale-95 cursor-pointer shadow-lg"
                        title="End Live Stream"
                      >
                        <Power className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-red-500 hover:text-white" />
                      </button>
                    ) : (
                      <button
                        onClick={handleEndStream}
                        className="w-11 h-11 rounded-2xl border bg-zinc-800/80 hover:bg-zinc-700 border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-all duration-300 active:scale-95 cursor-pointer shadow-lg"
                        title="Leave Room"
                      >
                        <LogOut className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                      </button>
                    )}

                    {/* GIFT PANEL yellow capsule button */}
                    <button
                      onClick={() => {
                        setGiftingReceiver({
                          id: activeStream.creatorId,
                          name: activeStream.creatorName,
                          photo: activeStream.creatorPhoto || ""
                        });
                        setShowGiftModal(true);
                      }}
                      className="h-11 px-5 rounded-2xl bg-[#facc15] hover:bg-[#fde047] text-black font-black flex items-center gap-2 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/20 cursor-pointer border-none"
                      title="Virtual Gifts"
                    >
                      <Gift className="w-4 h-4 fill-black text-black" />
                      <div className="flex flex-col text-left leading-none font-black text-[9px] tracking-tight uppercase">
                        <span>GIFT</span>
                        <span>PANEL</span>
                      </div>
                    </button>

                    {/* Likes Heart Button */}
                    <button
                      onClick={handleSendHeart}
                      className="w-11 h-11 rounded-2xl bg-[#ef4444]/10 border border-[#ef4444]/25 hover:bg-[#ef4444]/20 text-[#ef4444] hover:scale-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-lg"
                      title="Send Heart"
                    >
                      <Heart className="w-4 h-4 sm:w-[18px] sm:h-[18px] fill-red-500 text-red-500 animate-pulse" />
                    </button>
                  </div>

                  {/* 2. MUSIC PLAYLIST & independent volume panel drawer overlay */}
                  {showMusicPlaylistPanel && (
                    <div className="absolute bottom-full left-0 right-0 bg-[#08050e]/95 backdrop-blur-md border border-white/10 rounded-t-3xl p-4 space-y-4 shadow-2xl z-55 animate-slide-up max-h-[380px] overflow-y-auto mb-2 pointer-events-auto">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                        <div className="flex items-center gap-2">
                          <Radio className="w-4 h-4 text-pink-500" />
                          <h5 className="text-xs font-bold uppercase tracking-wider text-white">Stage Playlist & Volume controllers</h5>
                        </div>
                        <button onClick={() => setShowMusicPlaylistPanel(false)} className="text-zinc-400 hover:text-white bg-transparent border-none cursor-pointer">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Dual volume controllers */}
                      <div className="grid grid-cols-2 gap-4 bg-zinc-950 p-3 rounded-2xl border border-white/5">
                        <div className="space-y-1.5">
                          <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            <Mic className="w-3.5 h-3.5 text-indigo-400" />
                            Mic Gain Volume ({micVolume}%)
                          </label>
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={micVolume} 
                            onChange={(e) => setMicVolume(Number(e.target.value))}
                            className="w-full accent-indigo-500 cursor-pointer h-1 bg-white/10 rounded-lg appearance-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            <Volume2 className="w-3.5 h-3.5 text-pink-400" />
                            Room Music Volume ({musicVolume}%)
                          </label>
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={musicVolume} 
                            onChange={(e) => setMusicVolume(Number(e.target.value))}
                            className="w-full accent-pink-500 cursor-pointer h-1 bg-white/10 rounded-lg appearance-none"
                          />
                        </div>
                      </div>

                      {/* Host playlist content */}
                      {isHosting || currentUser?.uid === activeStream.creatorId ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Configure Room Playlist:</p>
                            <div className="flex gap-2">
                              <button 
                                onClick={handleToggleShuffle}
                                className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                                  (activeStream as any).isShuffle ? "bg-indigo-500/20 border-indigo-500 text-indigo-400" : "bg-white/5 border-white/10 text-zinc-400"
                                }`}
                              >
                                Shuffle
                              </button>
                              <button 
                                onClick={handleToggleRepeat}
                                className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                                  (activeStream as any).isRepeat ? "bg-indigo-500/20 border-indigo-500 text-indigo-400" : "bg-white/5 border-white/10 text-zinc-400"
                                }`}
                              >
                                Repeat
                              </button>
                            </div>
                          </div>

                          {/* List of room playlist */}
                          <div className="space-y-1.5 max-h-24 overflow-y-auto">
                            {roomPlaylist.length === 0 ? (
                              <p className="text-[10px] text-zinc-500 font-mono text-center py-2">Playlist is empty. Add songs below!</p>
                            ) : (
                              roomPlaylist.map((song, idx) => {
                                const isActive = idx === currentPlaylistIndex;
                                return (
                                  <div key={idx} className={`flex items-center justify-between p-1.5 rounded-lg border text-xs ${
                                    isActive ? "bg-pink-500/10 border-pink-500/20" : "bg-white/2 border-white/5"
                                  }`}>
                                    <div className="flex items-center gap-1.5 truncate">
                                      <span className="font-mono text-[9px] text-zinc-500">{idx + 1}</span>
                                      <p className={`font-bold truncate ${isActive ? "text-pink-400" : "text-zinc-200"}`}>{song.title}</p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button onClick={() => handlePlaySongAtIndex(idx)} className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded hover:bg-white/10">
                                        Play
                                      </button>
                                      <button onClick={() => handleReorderPlaylist(idx, "up")} className="text-[9px] text-zinc-400 px-1 hover:text-white">↑</button>
                                      <button onClick={() => handleReorderPlaylist(idx, "down")} className="text-[9px] text-zinc-400 px-1 hover:text-white">↓</button>
                                      <button onClick={() => handleRemoveSongFromPlaylist(idx)} className="text-[9px] text-red-400 px-1.5 hover:text-red-300">×</button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* SoundStream Music selector block */}
                          <div className="border-t border-white/5 pt-2 space-y-1.5">
                            <p className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">SoundStream Library (Add to Stage):</p>
                            <div className="max-h-28 overflow-y-auto flex flex-col gap-1 pr-1">
                              {songs?.map((song) => (
                                <div key={song.id} className="flex items-center justify-between p-1.5 bg-white/2 border border-white/5 rounded-lg text-xs">
                                  <p className="font-bold text-zinc-300 truncate">{song.title} - <span className="text-[10px] text-zinc-500">{song.artistName}</span></p>
                                  <button 
                                    onClick={() => handleAddSongToPlaylist(song)}
                                    className="text-[9px] bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded hover:bg-indigo-500/40"
                                  >
                                    + Add
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Viewers Playlist HUD */
                        <div className="space-y-3">
                          <p className="text-[10px] font-bold text-zinc-400">Current Room Playlist ({roomPlaylist.length} tracks):</p>
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {roomPlaylist.map((song, idx) => {
                              const isActive = idx === currentPlaylistIndex;
                              return (
                                <div key={idx} className={`p-2 rounded-lg text-xs flex items-center justify-between ${
                                  isActive ? "bg-pink-500/10 border border-pink-500/20 text-pink-400" : "bg-white/5 border border-white/5 text-zinc-400"
                                }`}>
                                  <span className="font-bold truncate">{song.title}</span>
                                  {isActive && <Activity className="w-3.5 h-3.5 text-pink-500 animate-pulse" />}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. PK BATTLE CHALLENGE & INVITES SHEET */}
                  {showPKPanel && (
                    <div className="absolute bottom-full left-0 right-0 bg-[#07040a]/95 backdrop-blur-md border border-white/10 rounded-t-3xl p-4 space-y-4 shadow-2xl z-55 animate-slide-up max-h-[380px] overflow-y-auto mb-2 pointer-events-auto">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                          <Flame className="w-4 h-4 text-amber-500" />
                          <h5 className="text-xs font-black uppercase tracking-wider text-white">⚔️ Live PK Battle Zone</h5>
                        </div>
                        <button onClick={() => setShowPKPanel(false)} className="text-zinc-400 hover:text-white bg-transparent border-none cursor-pointer">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Active invites */}
                      {battleInvites.length > 0 && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 space-y-2">
                          <p className="text-[10px] uppercase font-black tracking-widest text-amber-400">Inbound PK Challenges:</p>
                          {battleInvites.map((invite) => (
                            <div key={invite.id} className="flex items-center justify-between text-xs bg-zinc-950 p-2 rounded-xl">
                              <div>
                                <p className="font-black text-white">Challenge from @{invite.senderName}</p>
                                <p className="text-[9px] text-zinc-400">Duration: {invite.duration} seconds</p>
                              </div>
                              <div className="flex gap-1.5 shrink-0">
                                <button 
                                  onClick={async () => {
                                    await acceptBattleInvite(invite.id);
                                    setShowPKPanel(false);
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-1 rounded text-[10px] uppercase cursor-pointer"
                                >
                                  Accept
                                </button>
                                <button 
                                  onClick={async () => {
                                    await declineBattleInvite(invite.id);
                                  }}
                                  className="bg-red-950 text-red-400 font-bold px-2 py-1 rounded text-[10px] uppercase cursor-pointer"
                                >
                                  Decline
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Invite other active rooms */}
                      <div className="space-y-2.5">
                        <p className="text-[10px] uppercase font-bold text-zinc-400">Challenge another active room:</p>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {streams.filter(s => s.id !== activeStream.id && s.type === "audio" && s.status === "live").length === 0 ? (
                            <p className="text-[10px] text-zinc-500 font-mono text-center py-4">No other active audio streams online right now.</p>
                          ) : (
                            streams
                              .filter(s => s.id !== activeStream.id && s.type === "audio" && s.status === "live")
                              .map((otherStream) => (
                                <div key={otherStream.id} className="flex items-center justify-between bg-zinc-900 border border-white/5 p-2 rounded-xl text-xs">
                                  <div>
                                    <p className="font-bold text-zinc-200">{otherStream.title}</p>
                                    <p className="text-[9px] text-zinc-500">Host: {otherStream.creatorName}</p>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      if (!currentUser) return;
                                      try {
                                        await createBattleInvite(
                                          currentUser.uid,
                                          currentUser.username || currentUser.displayName || "Host",
                                          currentUser.photoURL || "",
                                          activeStream.id,
                                          otherStream.creatorId,
                                          otherStream.creatorName,
                                          otherStream.thumbnailUrl || "",
                                          otherStream.id,
                                          300 // 5 minutes duration
                                        );
                                        alert(`Battle invite sent to ${otherStream.creatorName}!`);
                                        setShowPKPanel(false);
                                      } catch (err: any) {
                                        alert(err.message || "Failed to invite.");
                                      }
                                    }}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-3 py-1.5 rounded-lg text-[10px] uppercase cursor-pointer"
                                  >
                                    Challenge
                                  </button>
                                </div>
                              ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

              {/* Absolutely positioned Context Menu for seats */}
              {activeSeatMenu && (
                <div 
                  className="absolute z-55 bg-zinc-950 border border-white/10 rounded-2xl p-2.5 w-52 shadow-2xl flex flex-col gap-1 text-xs"
                  style={{ top: activeSeatMenu.y, left: activeSeatMenu.x }}
                >
                  <div className="flex items-center justify-between px-2 py-1.5 border-b border-white/5 font-black text-[10px] text-zinc-400 uppercase tracking-widest">
                    <span>Seat {activeSeatMenu.seat.id.split("_")[1]} Menu</span>
                    <button onClick={() => setActiveSeatMenu(null)} className="hover:text-white text-zinc-500 transition cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  {activeSeatMenu.seat.userId === null ? (
                    <>
                      {/* Empty seat options */}
                      {(() => {
                        const myCurrentSeat = seatsArray.find(s => s.userId === currentUser?.uid);
                        if (myCurrentSeat) {
                          return (
                            <button 
                              onClick={() => {
                                handleMoveSeat(myCurrentSeat.id, activeSeatMenu!.seat.id);
                                setActiveSeatMenu(null);
                              }}
                              className="flex items-center gap-2 w-full text-left px-2 py-2 hover:bg-white/5 rounded-lg text-zinc-300 hover:text-white transition cursor-pointer"
                            >
                              <Users className="w-3.5 h-3.5 text-indigo-400" />
                              Move Here
                            </button>
                          );
                        } else {
                          return (
                            <button 
                              onClick={() => {
                                if (activeSeatMenu!.seat.isLocked && !isHostOrMod) {
                                  alert("This seat is locked.");
                                } else if (openMicEnabled || isHostOrMod) {
                                  handleOccupySeat(activeSeatMenu!.seat.id);
                                } else {
                                  handleRequestSeat(activeSeatMenu!.seat.id);
                                }
                                setActiveSeatMenu(null);
                              }}
                              className="flex items-center gap-2 w-full text-left px-2 py-2 hover:bg-white/5 rounded-lg text-zinc-300 hover:text-white transition font-bold cursor-pointer"
                            >
                              <Mic className="w-3.5 h-3.5 text-emerald-400" />
                              Join Stage
                            </button>
                          );
                        }
                      })()}

                      {/* Lock / Unlock Seat: Only for Host or Moderator */}
                      {isHostOrMod && (
                        <button 
                          onClick={() => {
                            handleToggleSeatLock(activeSeatMenu!.seat.id, !!activeSeatMenu!.seat.isLocked);
                            setActiveSeatMenu(null);
                          }}
                          className="flex items-center gap-2 w-full text-left px-2 py-2 hover:bg-white/5 rounded-lg text-zinc-300 hover:text-white transition cursor-pointer"
                        >
                          {activeSeatMenu.seat.isLocked ? (
                            <>
                              <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                              Unlock Seat
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5 text-amber-400" />
                              Lock Seat
                            </>
                          )}
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Occupied seat options */}
                      
                      {/* 1. Self Options (when a seated user taps their own seat) */}
                      {activeSeatMenu.seat.userId === currentUser?.uid && (
                        <>
                          <button 
                            onClick={() => {
                              handleRemoveGuest(activeSeatMenu!.seat.id);
                              setActiveSeatMenu(null);
                            }}
                            className="flex items-center gap-2 w-full text-left px-2 py-2 hover:bg-red-500/10 rounded-lg text-red-400 hover:text-red-300 transition font-bold cursor-pointer"
                          >
                            <UserMinus className="w-3.5 h-3.5 text-red-400" />
                            Leave Seat
                          </button>

                          {/* Change Seat */}
                          <div className="border-t border-white/5 my-1.5 pt-1.5">
                            <p className="text-[8px] text-zinc-500 px-2 uppercase font-black tracking-widest mb-1 font-mono">Change Seat to:</p>
                            <div className="max-h-24 overflow-y-auto flex flex-col gap-0.5">
                              {seatsArray
                                .filter(s => s.userId === null && !s.isLocked)
                                .map(emptySeat => (
                                  <button 
                                    key={emptySeat.id}
                                    onClick={() => {
                                      handleMoveSeat(activeSeatMenu!.seat.id, emptySeat.id);
                                      setActiveSeatMenu(null);
                                    }}
                                    className="text-left text-[11px] px-2 py-1 hover:bg-white/5 rounded text-zinc-400 hover:text-white truncate cursor-pointer"
                                  >
                                    Seat {emptySeat.id.split("_")[1]}
                                  </button>
                                ))}
                            </div>
                          </div>

                          <button 
                            onClick={() => {
                              handleToggleGuestMute(activeSeatMenu!.seat.id, !activeSeatMenu!.seat.isMuted);
                              setActiveSeatMenu(null);
                            }}
                            className="flex items-center gap-2 w-full text-left px-2 py-2 hover:bg-white/5 rounded-lg text-zinc-300 hover:text-white transition cursor-pointer"
                          >
                            {activeSeatMenu.seat.isMuted ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <MicOff className="w-3.5 h-3.5 text-red-400" />}
                            {activeSeatMenu.seat.isMuted ? "Unmute Microphone" : "Mute Microphone"}
                          </button>
                        </>
                      )}

                      {/* 2. Host / Moderator Controls on other occupied seats */}
                      {isHostOrMod && activeSeatMenu.seat.userId !== currentUser?.uid && (
                        <>
                          {/* View Profile */}
                          <button 
                            onClick={async () => {
                              setActiveSeatMenu(null);
                              try {
                                const prof = await getOrCreateAudioProfile(activeSeatMenu!.seat.userId!, null);
                                setViewingProfileUser({
                                  uid: activeSeatMenu!.seat.userId!,
                                  username: activeSeatMenu!.seat.username,
                                  photoURL: activeSeatMenu!.seat.photoURL,
                                  level: prof.level || 1,
                                  isVIP: prof.badges?.includes("VIP") || false,
                                  role: activeSeatMenu!.seat.role,
                                  bio: prof.bio || ""
                                });
                              } catch (e) {
                                console.warn(e);
                              }
                            }}
                            className="flex items-center gap-2 w-full text-left px-2 py-2 hover:bg-white/5 rounded-lg text-zinc-300 hover:text-white transition cursor-pointer"
                          >
                            <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
                            View Profile
                          </button>

                          <button 
                            onClick={() => {
                              handleToggleGuestMute(activeSeatMenu!.seat.id, !!activeSeatMenu!.seat.isMuted);
                              setActiveSeatMenu(null);
                            }}
                            className="flex items-center gap-2 w-full text-left px-2 py-2 hover:bg-white/5 rounded-lg text-zinc-300 hover:text-white transition cursor-pointer"
                          >
                            {activeSeatMenu.seat.isMuted ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <MicOff className="w-3.5 h-3.5 text-red-400" />}
                            {activeSeatMenu.seat.isMuted ? "Unmute User" : "Mute User"}
                          </button>

                          <button 
                            onClick={() => {
                              handleRemoveGuest(activeSeatMenu!.seat.id);
                              setActiveSeatMenu(null);
                            }}
                            className="flex items-center gap-2 w-full text-left px-2 py-2 hover:bg-red-500/10 rounded-lg text-red-400 hover:text-red-300 transition cursor-pointer"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                            Remove From Seat
                          </button>

                          {/* Lock / Unlock Seat */}
                          <button 
                            onClick={() => {
                              handleToggleSeatLock(activeSeatMenu!.seat.id, !!activeSeatMenu!.seat.isLocked);
                              setActiveSeatMenu(null);
                            }}
                            className="flex items-center gap-2 w-full text-left px-2 py-2 hover:bg-white/5 rounded-lg text-zinc-300 hover:text-white transition cursor-pointer"
                          >
                            {activeSeatMenu.seat.isLocked ? (
                              <>
                                <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                                Unlock Seat
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5 text-amber-400" />
                                Lock Seat
                              </>
                            )}
                          </button>

                          {/* Move User */}
                          <div className="border-t border-white/5 my-1.5 pt-1.5">
                            <p className="text-[8px] text-zinc-500 px-2 uppercase font-black tracking-widest mb-1 font-mono">Move User to:</p>
                            <div className="max-h-24 overflow-y-auto flex flex-col gap-0.5">
                              {seatsArray
                                .filter(s => s.userId === null && !s.isLocked)
                                .map(emptySeat => (
                                  <button 
                                    key={emptySeat.id}
                                    onClick={() => {
                                      handleMoveSeat(activeSeatMenu!.seat.id, emptySeat.id);
                                      setActiveSeatMenu(null);
                                    }}
                                    className="text-left text-[11px] px-2 py-1 hover:bg-white/5 rounded text-zinc-400 hover:text-white truncate cursor-pointer"
                                  >
                                    Seat {emptySeat.id.split("_")[1]}
                                  </button>
                                ))}
                            </div>
                          </div>
                        </>
                      )}

                      {/* 3. General Viewer Options on other occupied seats */}
                      {activeSeatMenu.seat.userId !== currentUser?.uid && !isHostOrMod && (
                        <>
                          {/* View Profile */}
                          <button 
                            onClick={async () => {
                              setActiveSeatMenu(null);
                              try {
                                const prof = await getOrCreateAudioProfile(activeSeatMenu!.seat.userId!, null);
                                setViewingProfileUser({
                                  uid: activeSeatMenu!.seat.userId!,
                                  username: activeSeatMenu!.seat.username,
                                  photoURL: activeSeatMenu!.seat.photoURL,
                                  level: prof.level || 1,
                                  isVIP: prof.badges?.includes("VIP") || false,
                                  role: activeSeatMenu!.seat.role,
                                  bio: prof.bio || ""
                                });
                              } catch (e) {
                                console.warn(e);
                              }
                            }}
                            className="flex items-center gap-2 w-full text-left px-2 py-2 hover:bg-white/5 rounded-lg text-zinc-300 hover:text-white transition cursor-pointer"
                          >
                            <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
                            View Profile
                          </button>

                          <button 
                            onClick={() => {
                              handleTriggerGifting(
                                activeSeatMenu!.seat.userId!,
                                activeSeatMenu!.seat.username,
                                activeSeatMenu!.seat.photoURL
                              );
                              setActiveSeatMenu(null);
                            }}
                            className="flex items-center gap-2 w-full text-left px-2 py-2 hover:bg-pink-500/10 rounded-lg text-pink-400 hover:text-pink-300 transition cursor-pointer"
                          >
                            <Gift className="w-3.5 h-3.5" />
                            Send Gift
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Right Interactive Sidebar: Chat & Rooms */}
            {showSidebar && (
              <div className="absolute md:relative inset-y-0 right-0 z-50 w-full sm:w-80 md:w-80 h-full flex flex-col justify-between bg-[#0a0611]/95 md:bg-[#0a0611] select-none shadow-2xl border-l border-white/5 animate-slideOver">
              
              {/* Tab Bar switcher: All, Room, Chat */}
              <div className="flex border-b border-white/5 shrink-0 items-center justify-between">
                <div className="flex-1 flex">
                  {(["all", "room", "chat"] as const).map((tab) => {
                    const labels = { all: "Combined Feed", room: "Room Stage", chat: "Text Chat" };
                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveRoomTab(tab)}
                        className={`flex-1 py-3 text-xs font-bold uppercase transition border-none cursor-pointer ${
                          activeRoomTab === tab
                            ? "border-b-2 border-indigo-500 text-white bg-white/2"
                            : "text-zinc-500 hover:text-white bg-transparent"
                        }`}
                      >
                        {labels[tab]}
                      </button>
                    );
                  })}
                </div>
                {/* Close Sidebar button for mobile view */}
                <button 
                  onClick={() => setIsSidebarCollapsed(true)}
                  className="md:hidden p-3 text-zinc-400 hover:text-white bg-transparent border-none cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sub-Filters for Chat Tab only */}
              {activeRoomTab === "chat" && (
                <div className="flex gap-1.5 overflow-x-auto pb-2 pt-2.5 border-b border-white/5 shrink-0 px-3 scrollbar-none">
                  {[
                    { id: "all", label: "💬 All Chats" },
                    { id: "host", label: "👑 Host Corner" },
                    { id: "stage", label: "🎤 On Stage" },
                    { id: "gifts", label: "🎁 Gift Logs" }
                  ].map(filter => (
                    <button
                      key={filter.id}
                      onClick={() => setChatSubFilter(filter.id as any)}
                      className={`px-3 py-1 rounded-full text-[9px] font-extrabold uppercase transition shrink-0 cursor-pointer border-none ${
                        chatSubFilter === filter.id
                          ? "bg-indigo-650 text-white shadow-md shadow-indigo-500/20"
                          : "bg-white/5 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Main Tab View scrollable body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {activeRoomTab === "all" ? (
                  /* Combined chat feed */
                  chatMessages.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500 text-[10px] space-y-1.5">
                      <p className="font-extrabold text-zinc-400 uppercase tracking-widest">Soundstream Live Feed</p>
                      <p>Waiting for the first message or gift...</p>
                    </div>
                  ) : (
                    chatMessages.map((msg) => {
                      const isSystem = msg.senderId === "system" || msg.senderName === "GIFT" || msg.text.includes("🎁") || msg.text.includes("sent a") || msg.text.includes("Reacted with");
                      const isHost = msg.senderId === activeStream.creatorId;
                      const lvl = getSenderLevel(msg.senderId);
                      const lvlStyle = getLevelBadgeStyle(lvl);
                      const roleBadge = getSenderRoleBadge(msg.senderId);

                      if (isSystem) {
                        return (
                          <div 
                            key={msg.id} 
                            className="text-[11px] relative overflow-hidden bg-gradient-to-r from-purple-950/20 via-indigo-950/20 to-pink-950/20 p-2.5 rounded-2xl border border-purple-500/10 shadow-sm flex items-center justify-between gap-2 animate-fadeIn"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-base select-none">✨</span>
                              <p className="text-zinc-300 font-sans leading-relaxed">
                                {msg.text}
                              </p>
                            </div>
                            
                            {msg.senderId !== "system" && msg.senderId !== currentUser?.uid && (
                              <button
                                onClick={() => {
                                  handleTriggerGifting(
                                    msg.senderId,
                                    msg.senderName,
                                    msg.senderPhoto || ""
                                  );
                                }}
                                className="shrink-0 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-extrabold px-2 py-0.5 rounded text-[8px] uppercase tracking-wider transition cursor-pointer border-none"
                              >
                                Gift Back
                              </button>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div 
                          key={msg.id} 
                          onClick={() => setSelectedComment(msg)}
                          className={`text-xs p-2.5 rounded-2xl border transition duration-200 cursor-pointer relative group flex items-start gap-2.5 ${
                            isHost 
                              ? "bg-gradient-to-b from-indigo-950/30 to-purple-950/30 border-indigo-500/20 hover:border-indigo-500/40" 
                              : roleBadge?.label === "Co-Host" 
                                ? "bg-gradient-to-b from-pink-950/30 to-purple-950/30 border-pink-500/20 hover:border-pink-500/40"
                                : roleBadge?.label === "VIP"
                                  ? "bg-gradient-to-b from-amber-950/30 to-orange-950/30 border-amber-500/20 hover:border-amber-500/40"
                                  : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10"
                          }`}
                        >
                          <div className="relative shrink-0 select-none">
                            <img 
                              src={msg.senderPhoto || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=50"} 
                              alt="" 
                              className="w-7 h-7 rounded-full object-cover border border-white/10" 
                            />
                            <span className={`absolute -bottom-1 -right-1 text-[7px] font-black font-mono px-0.5 rounded-full shadow border border-[#0a0611] scale-90 ${lvlStyle}`}>
                              {lvl}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-zinc-300 hover:text-white transition truncate text-[11px]">
                                {msg.senderName}
                              </span>
                              {roleBadge && (
                                <span className={`text-[7px] font-extrabold px-1 py-0.5 rounded uppercase tracking-wider scale-95 ${roleBadge.style}`}>
                                  {roleBadge.label}
                                </span>
                              )}
                            </div>
                            <p className="text-zinc-200 leading-relaxed text-[11px] break-words pl-0.5">
                              {msg.text}
                            </p>
                          </div>
                          
                          <span className="absolute right-2 top-2 text-[8px] text-zinc-500 opacity-0 group-hover:opacity-100 transition duration-150">
                            💬 reply
                          </span>
                        </div>
                      );
                    })
                  )
                ) : activeRoomTab === "room" ? (
                  /* Room stage occupied list */
                  <div className="space-y-4">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold">Current Participants</p>
                    {activeStream.type === "audio" ? (
                      <div className="space-y-2.5">
                        {seatsArray.filter(s => s.userId !== null).map(seat => (
                          <div key={seat.id} className="flex items-center justify-between bg-white/[0.02] border border-white/5 p-2 rounded-xl">
                            <div className="flex items-center gap-2.5">
                              <img src={seat.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=50"} alt="" className="w-8 h-8 rounded-full object-cover" />
                              <div>
                                <p className="text-xs font-bold text-zinc-200">{seat.username}</p>
                                <p className="text-[8px] text-zinc-500 font-mono uppercase">{seat.role}</p>
                              </div>
                            </div>
                            <span className={`w-2 h-2 rounded-full ${seat.isMuted ? "bg-red-500" : "bg-emerald-500"}`} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-zinc-500 italic py-4">
                        Mod rules: Respect independent creators. Speak kindly, support independent music.
                      </div>
                    )}
                  </div>
                ) : (
                  /* Text chat messages only - with subfilters */
                  (() => {
                    const filtered = chatMessages.filter((msg) => {
                      if (chatSubFilter === "host") {
                        return msg.senderId === activeStream.creatorId;
                      }
                      if (chatSubFilter === "stage") {
                        return seatsArray.some(seat => seat.userId === msg.senderId);
                      }
                      if (chatSubFilter === "gifts") {
                        return msg.senderId === "system" || msg.senderName === "GIFT" || msg.text.includes("🎁") || msg.text.includes("sent a");
                      }
                      // "all"
                      return msg.senderId !== "system" && msg.senderName !== "GIFT";
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-12 text-zinc-500 text-[10px]">
                          No chats matched the active sub-filter.
                        </div>
                      );
                    }

                    return filtered.map((msg) => {
                      const isHost = msg.senderId === activeStream.creatorId;
                      const lvl = getSenderLevel(msg.senderId);
                      const lvlStyle = getLevelBadgeStyle(lvl);
                      const roleBadge = getSenderRoleBadge(msg.senderId);

                      return (
                        <div 
                          key={msg.id} 
                          onClick={() => setSelectedComment(msg)}
                          className={`text-xs p-2.5 rounded-2xl border transition duration-200 cursor-pointer relative group flex items-start gap-2.5 ${
                            isHost 
                              ? "bg-gradient-to-b from-indigo-950/30 to-purple-950/30 border-indigo-500/20 hover:border-indigo-500/40" 
                              : roleBadge?.label === "Co-Host" 
                                ? "bg-gradient-to-b from-pink-950/30 to-purple-950/30 border-pink-500/20 hover:border-pink-500/40"
                                : roleBadge?.label === "VIP"
                                  ? "bg-gradient-to-b from-amber-950/30 to-orange-950/30 border-amber-500/20 hover:border-amber-500/40"
                                  : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10"
                          }`}
                        >
                          <div className="relative shrink-0 select-none">
                            <img 
                              src={msg.senderPhoto || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=50"} 
                              alt="" 
                              className="w-7 h-7 rounded-full object-cover border border-white/10" 
                            />
                            <span className={`absolute -bottom-1 -right-1 text-[7px] font-black font-mono px-0.5 rounded-full shadow border border-[#0a0611] scale-90 ${lvlStyle}`}>
                              {lvl}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-zinc-300 hover:text-white transition truncate text-[11px]">
                                {msg.senderName}
                              </span>
                              {roleBadge && (
                                <span className={`text-[7px] font-extrabold px-1 py-0.5 rounded uppercase tracking-wider scale-95 ${roleBadge.style}`}>
                                  {roleBadge.label}
                                </span>
                              )}
                            </div>
                            <p className="text-zinc-200 leading-relaxed text-[11px] break-words pl-0.5">
                              {msg.text}
                            </p>
                          </div>
                          
                          <span className="absolute right-2 top-2 text-[8px] text-zinc-500 opacity-0 group-hover:opacity-100 transition duration-150">
                            💬 reply
                          </span>
                        </div>
                      );
                    });
                  })()
                )}
              </div>

              {/* Soundstream Quick Reaction Emoji Bar */}
              {currentUser && activeRoomTab !== "room" && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0e0a1b] border-t border-white/5 overflow-x-auto scrollbar-none">
                  <span className="text-[8px] font-black text-zinc-500 uppercase tracking-wider shrink-0 mr-1">React:</span>
                  <div className="flex gap-2">
                    {["❤️", "🔥", "👑", "🌹", "👏", "🎉", "🎧", "🌟"].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={async () => {
                          try {
                            const msgId = `msg_${Date.now()}`;
                            await setDoc(doc(db, "liveStreams", activeStream.id, "chat", msgId), {
                              id: msgId,
                              streamId: activeStream.id,
                              senderId: currentUser.uid,
                              senderName: currentUser.username || currentUser.displayName || "Listener",
                              senderPhoto: currentUser.photoURL || "",
                              text: `Reacted with ${emoji}`,
                              createdAt: new Date().toISOString()
                            });
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="hover:scale-125 transition text-sm cursor-pointer bg-transparent border-none p-0 filter hover:brightness-125"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Soundstream Selected Comment Context Menu */}
              {selectedComment && (
                <div className="bg-[#120a24] border-t border-indigo-500/25 p-2.5 flex items-center justify-between gap-3 animate-slideUp shrink-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-[8px] font-black uppercase text-zinc-400">Replying to @{selectedComment.senderName}</p>
                    <p className="text-[10px] text-zinc-300 truncate mt-0.5">"{selectedComment.text}"</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setChatInput(`@${selectedComment.senderName} `);
                        setSelectedComment(null);
                      }}
                      className="bg-indigo-650 hover:bg-indigo-600 text-white font-extrabold px-2.5 py-1 rounded text-[9px] uppercase cursor-pointer border-none"
                    >
                      Mention
                    </button>
                    {selectedComment.senderId !== currentUser?.uid && (
                      <button
                        onClick={() => {
                          handleTriggerGifting(
                            selectedComment.senderId,
                            selectedComment.senderName,
                            selectedComment.senderPhoto || ""
                          );
                          setSelectedComment(null);
                        }}
                        className="bg-pink-600 hover:bg-pink-500 text-white font-extrabold px-2.5 py-1 rounded text-[9px] uppercase cursor-pointer border-none"
                      >
                        Gift 🎁
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedComment(null)}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold cursor-pointer border-none"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* Room Bottom text input toolbar */}
              <div className="p-4 border-t border-white/5 shrink-0 bg-[#07040c]">
                {currentUser ? (
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Send text chat to room..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendChatMessage()}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 text-white placeholder-zinc-500"
                    />
                    <button
                      onClick={handleSendChatMessage}
                      disabled={!chatInput.trim()}
                      className="bg-indigo-650 hover:bg-indigo-600 disabled:opacity-50 text-white font-black text-xs py-2.5 px-4 rounded-xl transition border-none cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center text-xs text-zinc-500 italic py-2">
                    Please login to participate.
                  </div>
                )}
              </div>

            </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* 2. DISCOVERY HUB HOME PAGE (STREAM CARDS LIST)            */}
      {/* ========================================================= */}
      {/* Visual Header Banner */}
      <div 
        id="live-hero-banner"
        className="relative rounded-3xl bg-[#0a0516] border border-indigo-500/10 p-8 md:p-12 overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 bg-gradient-to-br from-[#06030b] to-[#120824]"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/15 via-transparent to-pink-500/5 pointer-events-none" />
        <div className="absolute top-1/2 left-1/4 w-72 h-72 bg-indigo-500/10 rounded-full filter blur-3xl pointer-events-none -translate-y-1/2" />
        
        <div className="relative space-y-5 max-w-xl text-center md:text-left z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/15 border border-indigo-500/25 rounded-full text-[10px] font-bold tracking-widest text-indigo-300 uppercase font-mono">
            <Radio className="w-3 h-3 text-red-500 animate-pulse" />
            SoundStream Livestreaming Arena
          </span>
          <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white leading-none">
            REAL-TIME CREATIVITY &amp;<br />LIVE INDEPENDENT ROOMS.
          </h2>
          <p className="text-white/60 text-sm md:text-base leading-relaxed max-w-md">
            Interact with your favorite hosts in real-time. Tune into high fidelity social audio spaces or watch raw direct live video feeds.
          </p>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
            <button 
              onClick={() => {
                if (currentUser) {
                  setIsCreatingStream(true);
                } else {
                  alert("Please login to create and start a live stream.");
                }
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-6 py-3 rounded-full text-xs tracking-widest uppercase transition-all shadow-lg shadow-indigo-500/25 active:scale-95 border-none cursor-pointer flex items-center gap-2"
            >
              <Mic className="w-4 h-4" />
              <span>Go Live Now</span>
            </button>
            <span className="text-[11px] font-mono text-white/40">
              {streams.length} active live broadcasts globally
            </span>
          </div>
        </div>

        {streams.length > 0 && (
          <div 
            onClick={() => handleJoinStream(streams[0])}
            className="relative w-full max-w-xs p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl shrink-0 group cursor-pointer"
          >
            <div className="relative overflow-hidden rounded-xl aspect-video mb-3">
              <img 
                src={streams[0].thumbnailUrl} 
                alt={streams[0].title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
              />
              <span className="absolute bottom-2 right-2 bg-red-600 text-[8px] font-mono font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                LIVE
              </span>
            </div>
            <div>
              <h4 className="font-bold text-xs truncate text-white uppercase tracking-tight">
                {streams[0].title}
              </h4>
              <p className="font-mono text-[10px] text-zinc-400 mt-0.5">
                Host: {streams[0].creatorName}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Discovery Page Layout Sub-Tabs: Related, Home, Video, Game */}
      <div className="flex justify-center border-b border-white/5 pb-2">
        <div className="flex gap-8 text-xs font-bold uppercase tracking-widest text-zinc-500">
          {(["related", "home", "video", "game"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setTopNavTab(tab)}
              className={`py-2 transition border-none cursor-pointer bg-transparent uppercase font-black tracking-widest ${
                topNavTab === tab 
                  ? "border-b-2 border-indigo-500 text-white font-black" 
                  : "hover:text-zinc-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Discovery Layout Filters: Audio Stream vs Video Stream */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex gap-3">
          <button 
            onClick={() => setActiveLayout("audio")}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase transition border ${
              activeLayout === "audio" 
                ? "bg-indigo-650 border-indigo-500 text-white font-bold" 
                : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
            }`}
          >
            🎙️ Audio Stream Stage
          </button>
          <button 
            onClick={() => setActiveLayout("video")}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase transition border ${
              activeLayout === "video" 
                ? "bg-indigo-650 border-indigo-500 text-white font-bold" 
                : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
            }`}
          >
            🎥 Video Broadcast
          </button>
        </div>

        {/* Sorting popover and queries search */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button 
              onClick={() => setShowFiltersPopover(!showFiltersPopover)}
              className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Sort: {sortBy}</span>
            </button>
            {showFiltersPopover && (
              <div className="absolute right-0 mt-2 w-40 bg-zinc-900 border border-white/10 rounded-2xl p-2 z-30 shadow-2xl space-y-1">
                {["Popular", "Recent", "Gifting", "Guests"].map(option => (
                  <button
                    key={option}
                    onClick={() => {
                      setSortBy(option);
                      setShowFiltersPopover(false);
                    }}
                    className="w-full px-3 py-2 rounded-xl hover:bg-white/5 text-left text-xs font-semibold text-zinc-300 hover:text-white transition-all border-none"
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Country and Category Selectors row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Country Selector */}
        <div className="flex items-center bg-white/[0.02] border border-white/5 p-3 rounded-2xl gap-3">
          <Globe className="w-4 h-4 text-pink-400" />
          <div className="flex-1">
            <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 font-bold mb-1">Filter by Country</p>
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="w-full bg-transparent border-none text-xs text-white focus:outline-none"
            >
              {countries.map(c => (
                <option key={c} value={c} className="bg-zinc-950">{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Categories Pills selector */}
        <div className="flex items-center bg-white/[0.02] border border-white/5 p-3 rounded-2xl gap-3">
          <Tv className="w-4 h-4 text-indigo-400" />
          <div className="flex-1">
            <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 font-bold mb-1">Category style</p>
            <div className="flex flex-wrap gap-1.5">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`text-[9.5px] px-2.5 py-1 rounded-full border transition-all ${
                    categoryFilter === cat
                      ? "bg-indigo-600 border-indigo-500 text-white font-black"
                      : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Streams list grid and Side Host Ranking Panel */}
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Main Streams Listing Cards */}
        <div className="flex-1 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="font-sans font-bold text-lg text-white uppercase tracking-tight flex items-center gap-2">
              <Radio className="w-4.5 h-4.5 text-pink-500 animate-pulse" />
              Active {activeLayout === "audio" ? "Audio Spaces" : "Video Streams"} ({sortedDiscoveryStreams.length})
            </h3>
            {activeLayout === "video" && (
              <button
                onClick={() => {
                  if (currentUser) {
                    setStreamType("video");
                    setIsCreatingStream(true);
                  } else {
                    alert("Please login to create and start a live stream.");
                  }
                }}
                className="bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-black px-5 py-2.5 rounded-full text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 border-none cursor-pointer flex items-center gap-2"
              >
                <Video className="w-4 h-4 animate-pulse" />
                <span>+ Add Livestream</span>
              </button>
            )}
          </div>

          {sortedDiscoveryStreams.length === 0 ? (
            <div className="py-20 text-center text-zinc-500 border border-dashed border-white/5 rounded-3xl bg-white/[0.01] space-y-4">
              <Radio className="w-10 h-10 text-zinc-650 mx-auto animate-pulse" />
              <p className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">No active streams found in this selection</p>
              <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">Be the first to schedule an upcoming show or go live instantly using our HD streaming engine!</p>
              {activeLayout === "video" && (
                <button
                  onClick={() => {
                    if (currentUser) {
                      setStreamType("video");
                      setIsCreatingStream(true);
                    } else {
                      alert("Please login to create and start a live stream.");
                    }
                  }}
                  className="mx-auto bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-black px-6 py-3 rounded-full text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 border-none cursor-pointer flex items-center gap-2"
                >
                  <Video className="w-4 h-4" />
                  <span>+ Add Livestream</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {sortedDiscoveryStreams.map((stream) => (
                <div
                  key={stream.id}
                  onClick={() => handleJoinStream(stream)}
                  className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden hover:bg-white/[0.06] hover:border-indigo-500/10 transition-all group relative flex flex-col justify-between p-3 cursor-pointer"
                >
                  <div className="space-y-3">
                    {/* Stream Thumbnail cover */}
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-white/5">
                      <img 
                        src={stream.thumbnailUrl || "https://images.unsplash.com/photo-1516280440614-37939bbacd6a?w=500&q=80"} 
                        alt="" 
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                      />
                      
                      {/* Pulsating LIVE badge */}
                      <span className="absolute top-2.5 left-2.5 bg-red-600 text-white text-[8px] font-black px-2 py-0.5 rounded shadow-lg uppercase tracking-wider flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        LIVE
                      </span>

                      {/* Viewer count */}
                      <span className="absolute bottom-2.5 right-2.5 bg-black/75 backdrop-blur text-white text-[8px] font-black font-mono px-2 py-0.5 rounded shadow flex items-center gap-1">
                        <Eye className="w-2.5 h-2.5" />
                        {(stream.viewerCount || 0).toLocaleString()} viewers
                      </span>
                    </div>

                    {/* Metadata details */}
                    <div className="flex gap-2.5 items-start">
                      <img src={stream.creatorPhoto || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=50"} alt="" className="w-8 h-8 rounded-full object-cover border border-indigo-500/25" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs truncate group-hover:text-pink-400 transition-colors uppercase tracking-tight text-zinc-150">{stream.title}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-[10px] text-zinc-400 truncate max-w-[100px]">{stream.creatorName}</p>
                          <span className="text-[8px] font-bold font-mono bg-indigo-500/15 border border-indigo-500/20 px-1 rounded uppercase text-indigo-400">Lv. 10</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                    <span className="text-[9px] font-bold font-mono text-indigo-400 uppercase tracking-widest">{stream.category}</span>
                    <span className="text-[9.5px] text-zinc-550 font-bold uppercase">Join Stream</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Host Ranking Top 10 */}
        <div className="w-full lg:w-80 shrink-0 space-y-6">
          <div className="bg-[#0b0714] border border-white/5 rounded-3xl p-5 space-y-4">
            <h3 className="font-sans font-black text-xs text-white uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2">
              <RankingIcon className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              Live Host Leaderboard
            </h3>

            {hostRanking.length === 0 ? (
              <div className="py-8 text-center text-zinc-550 text-xs italic">
                No scores generated yet. Support hosts to update rankings!
              </div>
            ) : (
              <div className="space-y-3.5">
                {hostRanking.map((host, idx) => {
                  const rankNum = idx + 1;
                  return (
                    <div key={host.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-black font-mono w-5 text-center ${
                          rankNum === 1 ? "text-yellow-400 text-sm animate-bounce" : rankNum === 2 ? "text-zinc-350" : rankNum === 3 ? "text-amber-550" : "text-zinc-500"
                        }`}>
                          #{rankNum}
                        </span>
                        <img src={host.photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=50"} alt="" className="w-8 h-8 rounded-full object-cover border border-white/10" />
                        <div>
                          <p className="text-xs font-bold text-zinc-200">{host.name}</p>
                          <p className="text-[9px] text-zinc-550 font-mono uppercase">{host.viewers} watching • {host.gifts} gifts</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-indigo-400">{host.score} pts</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ============================================== */}
      {/* 3. BROADCAST CREATION MODAL                    */}
      {/* ============================================== */}
      <AnimatePresence>
        {isCreatingStream && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b0814] border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="font-sans font-black text-sm text-zinc-100 flex items-center gap-2 uppercase tracking-wider">
                  <Mic className="w-4 h-4 text-indigo-400" />
                  Configure Broadcast
                </h3>
                <button onClick={() => setIsCreatingStream(false)} className="text-zinc-500 hover:text-white transition">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-black">Broadcast Title</label>
                  <input
                    type="text"
                    placeholder="Enter visual stream or social audio name..."
                    value={streamTitle}
                    onChange={(e) => setStreamTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Country Location */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-black">Broadcasting Location Country</label>
                  <select
                    value={countryOfHost}
                    onChange={(e) => setCountryOfHost(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {countries.filter(c => c !== "All").map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Stream Format Selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-black">Broadcast Format Layout</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStreamType("audio")}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                        streamType === "audio"
                          ? "bg-indigo-650 border-indigo-500 text-white"
                          : "bg-white/5 border-white/10 text-zinc-400"
                      }`}
                    >
                      <Mic className="w-3.5 h-3.5" />
                      🎙️ Audio Social Space
                    </button>
                    <button
                      type="button"
                      onClick={() => setStreamType("video")}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                        streamType === "video"
                          ? "bg-indigo-650 border-indigo-500 text-white"
                          : "bg-white/5 border-white/10 text-zinc-400"
                      }`}
                    >
                      <Video className="w-3.5 h-3.5" />
                      🎥 Video Broadcast
                    </button>
                  </div>
                </div>

                {/* Category Style */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-black">Stream Category</label>
                  <select
                    value={streamCategory}
                    onChange={(e) => setStreamCategory(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                  >
                    {categories.filter(c => c !== "All").map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Thumbnail Preset cover picker */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-black">Thumbnail presets</label>
                  <div className="flex gap-2">
                    {THUMBNAIL_PRESETS.map((url, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setThumbnailUrl(url)}
                        className={`relative w-10 h-10 rounded-xl overflow-hidden border transition ${
                          thumbnailUrl === url ? "border-indigo-500 scale-105" : "border-transparent opacity-60"
                        }`}
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-white/5">
                <button
                  onClick={() => setIsCreatingStream(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 font-bold py-2.5 rounded-xl text-xs uppercase"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartStream}
                  className="flex-1 bg-indigo-650 hover:bg-indigo-600 text-white font-black py-2.5 rounded-xl text-xs uppercase tracking-wider"
                >
                  Start Stream
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================== */}
      {/* 4. JOIN REQUESTS MANAGEMENT MODAL              */}
      {/* ============================================== */}
      <AnimatePresence>
        {showRequestsModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b0814] border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h4 className="font-bold text-xs uppercase tracking-widest text-zinc-100 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-indigo-400" />
                  Stage Join Requests
                </h4>
                <button onClick={() => setShowRequestsModal(false)} className="text-zinc-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {requests.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic text-center py-6">No join requests found.</p>
                ) : (
                  requests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between bg-white/[0.02] border border-white/5 p-3 rounded-2xl">
                      <div className="flex items-center gap-2.5">
                        <img src={req.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=50"} alt="" className="w-8 h-8 rounded-full object-cover" />
                        <div>
                          <p className="text-xs font-bold text-zinc-200">{req.username}</p>
                          <p className="text-[8px] text-zinc-550 font-mono">wants seat: {req.seatId ? req.seatId.split("_")[1] : "Any"}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {/* Approve to seat */}
                        <button
                          onClick={() => handleApproveRequest(req, req.seatId || "seat_2")}
                          className="bg-indigo-650 hover:bg-indigo-600 text-white font-extrabold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-lg border-none cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await deleteDoc(doc(db, "liveStreams", activeStream!.id, "requests", req.userId));
                            } catch (e) {}
                          }}
                          className="text-zinc-500 hover:text-white text-[10px] font-bold"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================== */}
      {/* 5. COIN VIRTUAL Gifting MODAL                  */}
      {/* ============================================== */}
      <AnimatePresence>
        {showGiftModal && giftingReceiver && (
          <GiftStoreModal 
            isOpen={showGiftModal}
            onClose={() => {
              setShowGiftModal(false);
              setGiftingReceiver(null);
            }}
            senderId={currentUser?.uid || ""}
            senderName={currentUser?.username || currentUser?.displayName || "Viewer"}
            senderPhoto={currentUser?.photoURL || ""}
            receiverId={giftingReceiver.id}
            receiverName={giftingReceiver.name}
            streamId={activeStream?.id || ""}
            onOpenStoreShortcut={() => {
              setShowGiftModal(false);
              alert("Redirecting to purchase page...");
            }}
            onGiftSent={handleGiftSentCallback}
          />
        )}
      </AnimatePresence>

      {/* ============================================== */}
      {/* AUDIO STREAM PROFILE EDIT MODAL                */}
      {/* ============================================== */}
      <AnimatePresence>
        {showEditAudioProfileModal && currentUserAudioProfile && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b0814] border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h4 className="font-bold text-xs uppercase tracking-widest text-zinc-100 flex items-center gap-1.5 font-mono">
                  <FileEdit className="w-4 h-4 text-indigo-400" />
                  Edit Audio Stream Profile
                </h4>
                <button 
                  onClick={() => setShowEditAudioProfileModal(false)} 
                  className="text-zinc-500 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form content */}
              {(() => {
                const [nickname, setNickname] = useState(currentUserAudioProfile.nickname || "");
                const [avatarUrl, setAvatarUrl] = useState(currentUserAudioProfile.avatarUrl || "");
                const [bio, setBio] = useState(currentUserAudioProfile.bio || "");
                const [saving, setSaving] = useState(false);

                const handleSave = async () => {
                  if (!nickname.trim()) {
                    alert("Nickname is required!");
                    return;
                  }
                  setSaving(true);
                  try {
                    await handleSaveAudioProfile(nickname.trim(), avatarUrl, bio.trim());
                  } finally {
                    setSaving(false);
                  }
                };

                return (
                  <div className="space-y-4">
                    {/* Display Badge & Level */}
                    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                      <img 
                        src={avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"} 
                        alt="Preview" 
                        className="w-12 h-12 rounded-full border border-indigo-500/30 object-cover" 
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">{nickname || "Listener"}</span>
                          {currentUserAudioProfile.badges?.includes("VIP") && (
                            <span className="bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded shadow-sm">
                              VIP
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-indigo-400 font-mono font-bold mt-0.5">
                          Audio Level: Lv.{currentUserAudioProfile.level || 1}
                        </p>
                      </div>
                    </div>

                    {/* Nickname field */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-black tracking-widest text-zinc-400 block font-mono">
                        Audio Room Nickname
                      </label>
                      <input 
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="Enter temporary audio room identity..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
                      />
                    </div>

                    {/* Avatar Preset selector */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-black tracking-widest text-zinc-400 block font-mono">
                        Select Avatar Design
                      </label>
                      <div className="grid grid-cols-6 gap-2">
                        {[
                          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
                          "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150",
                          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
                          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
                          "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150",
                          "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150",
                        ].map((preset, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setAvatarUrl(preset)}
                            className={`relative aspect-square rounded-full overflow-hidden border-2 transition hover:scale-105 cursor-pointer ${
                              avatarUrl === preset ? "border-indigo-500 scale-105" : "border-transparent"
                            }`}
                          >
                            <img src={preset} alt="" className="w-full h-full object-cover" />
                            {avatarUrl === preset && (
                              <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
                                <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Avatar URL */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-black tracking-widest text-zinc-400 block font-mono">
                        Or Custom Avatar URL
                      </label>
                      <input 
                        type="text"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="Paste image address..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
                      />
                    </div>

                    {/* Bio field */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-black tracking-widest text-zinc-400 block font-mono">
                        Audio Bio
                      </label>
                      <textarea 
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Say something about yourself..."
                        rows={3}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition resize-none"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowEditAudioProfileModal(false)}
                        className="flex-1 bg-white/5 hover:bg-white/10 text-zinc-300 font-bold py-2 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 bg-gradient-to-r from-indigo-650 to-purple-650 hover:from-indigo-600 hover:to-purple-600 text-white font-extrabold py-2 rounded-xl text-xs uppercase tracking-wider transition disabled:opacity-50 cursor-pointer"
                      >
                        {saving ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================== */}
      {/* HOST PROFILE MENU MODAL                        */}
      {/* ============================================== */}
      <AnimatePresence>
        {showHostProfileMenu && activeStream && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b0814] border border-white/10 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h4 className="font-bold text-xs uppercase tracking-widest text-indigo-400 flex items-center gap-1.5 font-mono">
                  <UserCheck className="w-4 h-4" />
                  Live Control Center
                </h4>
                <button 
                  onClick={() => setShowHostProfileMenu(false)} 
                  className="text-zinc-500 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Toast Notification Banner within the modal */}
              {hubShowToast && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-indigo-950 to-purple-950 border border-indigo-500/40 px-3 py-1.5 rounded-xl text-[10px] text-indigo-100 font-bold text-center shadow-lg shadow-indigo-500/10 mb-1"
                >
                  {hubShowToast}
                </motion.div>
              )}

              {/* View Profile Card - Host Profile & Level & ID */}
              <div className="bg-gradient-to-br from-[#1b153a] to-[#0f0927] border border-indigo-500/30 p-5 rounded-2xl shadow-xl space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center gap-4">
                  <img 
                    src={activeStream.creatorPhoto || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"} 
                    alt="Host Avatar" 
                    className="w-14 h-14 rounded-full border-2 border-indigo-500 object-cover shadow-lg" 
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-black text-white truncate">{activeStream.creatorName || "Stream Host"}</span>
                      {currentUserAudioProfile?.badges?.includes("VIP") && (
                        <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-black text-[7px] font-black px-1.5 py-0.5 rounded shadow-sm">
                          VIP
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 font-mono font-bold mt-0.5">
                      Unique Host ID: <span className="text-indigo-400 font-black">#{activeStream.creatorId ? activeStream.creatorId.slice(0, 8).toUpperCase() : "829501"}</span>
                    </p>
                  </div>
                </div>

                {/* Host Level Progress Indicator */}
                <div className="space-y-1 bg-black/40 p-3 rounded-xl border border-white/5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-zinc-300 font-mono">Host Level Growth</span>
                    <span className="font-mono text-[9px] font-black text-indigo-400">Lv.{hubHostLevel}</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                      style={{ width: `${(hubHostXp / 10000) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500">
                    <span>XP: {hubHostXp} / 10000</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (hubHostLevel < 15) {
                          const newXp = hubHostXp + 1500;
                          if (newXp >= 10000) {
                            setHubHostLevel(prev => Math.min(15, prev + 1));
                            setHubHostXp(newXp - 10000);
                            setHubShowToast(`👑 Host Level Up! Level ${hubHostLevel + 1}!`);
                          } else {
                            setHubHostXp(newXp);
                            setHubShowToast("💎 Received +1,500 Host XP!");
                          }
                        }
                      }}
                      className="text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-0.5 rounded transition font-bold border-none cursor-pointer"
                    >
                      + Gain XP
                    </button>
                  </div>
                </div>

                {/* Bio Description */}
                {currentUserAudioProfile?.bio ? (
                  <p className="text-[11px] text-zinc-300 italic font-medium bg-black/30 p-2.5 rounded-xl border border-white/5">
                    "{currentUserAudioProfile.bio}"
                  </p>
                ) : (
                  <p className="text-[10px] text-zinc-500 italic bg-black/10 p-2.5 rounded-xl border border-white/5">
                    No custom bio set yet for this stream host.
                  </p>
                )}
              </div>

              {/* ============================================== */}
              {/* COLLAPSIBLE STREAM CONTROLS SECTIONS           */}
              {/* ============================================== */}
              <div className="space-y-2.5 text-left">
                
                {/* 1. Live Statistics & Analytics */}
                <div className="border border-white/5 rounded-2xl overflow-hidden bg-white/2">
                  <button
                    onClick={() => setExpandedSection(expandedSection === "stats" ? null : "stats")}
                    className="w-full flex items-center justify-between p-3.5 text-left bg-white/3 hover:bg-white/5 transition font-bold text-xs text-zinc-200"
                  >
                    <span className="flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-emerald-400" />
                      Live Statistics & Analytics
                    </span>
                    <span className="text-[10px] text-zinc-500">{expandedSection === "stats" ? "▲" : "▼"}</span>
                  </button>
                  
                  {expandedSection === "stats" && (
                    <div className="p-4 space-y-3 border-t border-white/5 bg-black/25">
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                          <p className="text-[9px] text-zinc-400 uppercase font-mono">Current Viewers</p>
                          <p className="text-sm font-black text-emerald-400 font-mono">{activeStream.viewerCount || 1}</p>
                        </div>
                        <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                          <p className="text-[9px] text-zinc-400 uppercase font-mono">Stream Likes</p>
                          <p className="text-sm font-black text-rose-400 font-mono">{activeStream.likes || 124}</p>
                        </div>
                        <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                          <p className="text-[9px] text-zinc-400 uppercase font-mono">Elapsed Duration</p>
                          <p className="text-sm font-black text-white font-mono">01:24:18</p>
                        </div>
                        <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                          <p className="text-[9px] text-zinc-400 uppercase font-mono">Peak Audience</p>
                          <p className="text-sm font-black text-indigo-400 font-mono">534 users</p>
                        </div>
                      </div>

                      {/* Real-time earnings mini chart / indicator */}
                      <div className="bg-white/2 border border-white/5 p-3 rounded-xl space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] text-zinc-400 uppercase font-mono font-bold">Real-time Coin Donations</span>
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded font-bold">+1.2K Today</span>
                        </div>
                        <div className="h-10 flex items-end gap-1 px-1 pt-2">
                          {[20, 45, 30, 60, 40, 75, 50, 90, 65, 80, 55, 95].map((val, idx) => (
                            <div 
                              key={idx} 
                              className="flex-1 bg-gradient-to-t from-emerald-600 to-teal-400 rounded-t"
                              style={{ height: `${val}%` }}
                            />
                          ))}
                        </div>
                        <p className="text-[8px] text-zinc-500 text-center font-mono">Donations spiked during live track launch 🚀</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Stage Settings & 3D Space */}
                <div className="border border-white/5 rounded-2xl overflow-hidden bg-white/2">
                  <button
                    onClick={() => setExpandedSection(expandedSection === "stage" ? null : "stage")}
                    className="w-full flex items-center justify-between p-3.5 text-left bg-white/3 hover:bg-white/5 transition font-bold text-xs text-zinc-200"
                  >
                    <span className="flex items-center gap-2">
                      <Grid className="w-4 h-4 text-purple-400" />
                      Stage Settings & 3D Space
                    </span>
                    <span className="text-[10px] text-zinc-500">{expandedSection === "stage" ? "▲" : "▼"}</span>
                  </button>

                  {expandedSection === "stage" && (
                    <div className="p-4 space-y-3.5 border-t border-white/5 bg-black/25">
                      {/* 3D Space Toggle */}
                      <div className="bg-[#110e24] p-3 rounded-2xl border border-indigo-500/15 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🛸</span>
                          <div>
                            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-wider">3D Metaverse Space Scene</p>
                            <p className="text-[8px] text-zinc-400 leading-normal">Render fully immersive virtual WebGL 3D arena seats.</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEnable3D(!enable3D);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition cursor-pointer border-none shadow-md ${
                            enable3D 
                              ? "bg-indigo-600 text-white font-black" 
                              : "bg-zinc-800 text-zinc-400 hover:text-white"
                          }`}
                        >
                          {enable3D ? "🛸 3D SPACE ACTIVE" : "⊞ 2D GRID ACTIVE"}
                        </button>
                      </div>

                      {/* Stage Seat Controls */}
                      <div className="space-y-2">
                        <p className="text-[9px] uppercase font-black tracking-widest text-zinc-400 font-mono">Stage Seat Assignments</p>
                        
                        {(() => {
                          const hostSeat = seatsArray.find(s => s.userId === currentUser?.uid);
                          const isOnSeat1 = hostSeat?.id === "seat_1" || (!hostSeat && seatsArray.length > 0 && !seatsArray.find(s => s.id === "seat_1")?.userId);
                          const currentHostSeatId = hostSeat?.id || (isOnSeat1 ? "seat_1" : null);

                          return (
                            <div className="space-y-3 bg-white/2 p-3 rounded-xl border border-white/5">
                              {currentHostSeatId ? (
                                <div className="space-y-2.5">
                                  <p className="text-[10px] text-zinc-400">
                                    You are currently on seat <span className="font-bold text-white font-mono uppercase">{currentHostSeatId.replace("_", " ")}</span>.
                                  </p>
                                  
                                  <button
                                    onClick={async () => {
                                      setShowHostProfileMenu(false);
                                      await handleRemoveGuest(currentHostSeatId);
                                    }}
                                    className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer border-none"
                                  >
                                    <UserMinus className="w-3.5 h-3.5" />
                                    Leave Seat & Go to Audience
                                  </button>

                                  {/* Move to another empty seat */}
                                  <div className="border-t border-white/5 pt-2 mt-1">
                                    <span className="text-[8px] uppercase font-black tracking-widest text-zinc-500 font-mono block mb-1.5">
                                      Move to another vacant seat:
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                      {Array.from({ length: activeStream.seatCount || 16 }).map((_, idx) => {
                                        const seatNum = idx + 1;
                                        const seatId = `seat_${seatNum}`;
                                        const seatObj = seatsArray.find(s => s.id === seatId);
                                        const isOccupied = seatObj ? seatObj.userId !== null : (seatNum === 1);
                                        const isLocked = seatObj?.isLocked || false;

                                        if (seatId === currentHostSeatId || isOccupied || isLocked) return null;

                                        return (
                                          <button
                                            key={seatId}
                                            onClick={async () => {
                                              setShowHostProfileMenu(false);
                                              await handleMoveSeat(currentHostSeatId, seatId);
                                            }}
                                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white px-2.5 py-1 rounded-lg text-[10px] transition font-bold cursor-pointer border-none"
                                          >
                                            Seat {seatNum}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <p className="text-[10px] text-zinc-500 italic">
                                    You are currently in the Audience (Listener).
                                  </p>
                                  <div className="border-t border-white/5 pt-2 mt-1">
                                    <span className="text-[8px] uppercase font-black tracking-widest text-zinc-400 font-mono block mb-1.5">
                                      Join a vacant stage seat:
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                      {Array.from({ length: activeStream.seatCount || 16 }).map((_, idx) => {
                                        const seatNum = idx + 1;
                                        const seatId = `seat_${seatNum}`;
                                        const seatObj = seatsArray.find(s => s.id === seatId);
                                        const isOccupied = seatObj ? seatObj.userId !== null : (seatNum === 1);
                                        const isLocked = seatObj?.isLocked || false;

                                        if (isOccupied || isLocked) return null;

                                        return (
                                          <button
                                            key={seatId}
                                            onClick={async () => {
                                              setShowHostProfileMenu(false);
                                              await handleOccupySeat(seatId);
                                            }}
                                            className="bg-indigo-650/35 hover:bg-indigo-600/50 text-indigo-300 hover:text-white border border-indigo-500/20 px-2.5 py-1 rounded-lg text-[10px] transition font-bold cursor-pointer"
                                          >
                                            Seat {seatNum}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Camera Filters & Studio Controls */}
                <div className="border border-white/5 rounded-2xl overflow-hidden bg-white/2">
                  <button
                    onClick={() => setExpandedSection(expandedSection === "camera" ? null : "camera")}
                    className="w-full flex items-center justify-between p-3.5 text-left bg-white/3 hover:bg-white/5 transition font-bold text-xs text-zinc-200"
                  >
                    <span className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-blue-400" />
                      Camera Filters & Studio Controls
                    </span>
                    <span className="text-[10px] text-zinc-500">{expandedSection === "camera" ? "▲" : "▼"}</span>
                  </button>

                  {expandedSection === "camera" && (
                    <div className="p-4 space-y-4 border-t border-white/5 bg-black/25 text-left">
                      {/* Camera Filters */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1">
                          <Filter className="w-3.5 h-3.5 text-blue-400" />
                          Host Broadcast Camera Filters
                        </label>
                        <div className="grid grid-cols-5 gap-1 bg-black/40 p-1.5 rounded-xl border border-white/5">
                          {[
                            { label: "Normal", value: "none" },
                            { label: "Bright", value: "brightness(1.4) contrast(1.05) saturate(1.1)" },
                            { label: "Ultra", value: "brightness(1.7) contrast(1.1) saturate(1.2)" },
                            { label: "Warm", value: "brightness(1.3) contrast(1.05) saturate(1.2) sepia(0.2)" },
                            { label: "Cool", value: "brightness(1.35) contrast(1.1) saturate(1.05) hue-rotate(5deg)" }
                          ].map((f) => (
                            <button
                              key={f.label}
                              onClick={(e) => {
                                e.stopPropagation();
                                setCameraFilter(f.value);
                                setHubShowToast(`📸 Camera style set to ${f.label}`);
                              }}
                              className={`py-1 rounded-lg text-[9px] font-bold transition duration-300 border cursor-pointer ${
                                cameraFilter === f.value
                                  ? "bg-blue-600 border-blue-500 text-white font-black"
                                  : "bg-transparent border-transparent text-zinc-400 hover:text-white"
                              }`}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Studio Audio Controls */}
                      <div className="space-y-3 bg-white/2 p-3 rounded-xl border border-white/5">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-zinc-300 font-bold font-mono">Mic Input Gain</span>
                          <span className="font-mono text-[9px] font-bold text-indigo-400">{micGain}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={micGain}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setMicGain(parseInt(e.target.value))}
                          className="w-full accent-indigo-500 bg-zinc-800 rounded-lg cursor-pointer h-1.5"
                        />

                        <div className="flex justify-between items-center pt-1.5">
                          <span className="text-[10px] text-zinc-300 font-bold font-mono">Stream Quality</span>
                          <select 
                            value={streamQuality}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setStreamQuality(e.target.value)}
                            className="bg-black/60 border border-white/10 rounded px-2 py-1 text-[9px] text-zinc-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                          >
                            <option value="Hi-Fi 320kbps">Hi-Fi 320kbps</option>
                            <option value="Studio HD 512kbps">Studio HD 512kbps</option>
                            <option value="Standard 128kbps">Standard 128kbps</option>
                          </select>
                        </div>
                      </div>

                      {/* Studio Sound Profiler */}
                      <div className="space-y-1.5 pt-1">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-indigo-300 font-mono flex items-center justify-between">
                          <span>🎙️ Sound Profiler Equalizer</span>
                          <span className="text-zinc-500 text-[8px]">Preset: {soundPreset}</span>
                        </label>
                        <div className="grid grid-cols-4 gap-1 bg-black/40 p-1 rounded-xl">
                          {["Studio", "Hall", "Echo", "Stadium"].map((preset) => (
                            <button
                              key={preset}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSoundPreset(preset);
                                setHubShowToast(`🎙️ Mic Sound preset updated to ${preset}!`);
                              }}
                              className={`py-1 rounded-lg text-[8px] font-bold transition flex flex-col items-center gap-0.5 cursor-pointer ${
                                soundPreset === preset
                                  ? "bg-indigo-600 text-white border border-indigo-400/20 font-black"
                                  : "bg-transparent text-zinc-400 hover:text-zinc-200"
                              }`}
                            >
                              <span>{preset === "Studio" ? "🎙️" : preset === "Hall" ? "🏰" : preset === "Echo" ? "🎚️" : "🏟️"}</span>
                              <span>{preset}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Audio Effects & Soundboard */}
                <div className="border border-white/5 rounded-2xl overflow-hidden bg-white/2">
                  <button
                    onClick={() => setExpandedSection(expandedSection === "audio" ? null : "audio")}
                    className="w-full flex items-center justify-between p-3.5 text-left bg-white/3 hover:bg-white/5 transition font-bold text-xs text-zinc-200"
                  >
                    <span className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-rose-400" />
                      Audio Effects & Soundboard
                    </span>
                    <span className="text-[10px] text-zinc-500">{expandedSection === "audio" ? "▲" : "▼"}</span>
                  </button>

                  {expandedSection === "audio" && (
                    <div className="p-4 space-y-4 border-t border-white/5 bg-black/25 text-left">
                      {/* Soundboard */}
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">🎛️ Soundboard FX Board</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {soundboardItems?.map((fx) => (
                            <button
                              key={fx.id}
                              onClick={async (e) => {
                                e.stopPropagation();
                                setDailyQuests(quests => quests.map(q => q.id === "quest_2" ? { ...q, progress: Math.min(q.progress + 1, q.target), completed: q.progress + 1 >= q.target } : q));
                                setHubShowToast(`🔊 Activated FX: ${fx.name}`);

                                if (activeStream) {
                                  try {
                                    const chatRef = collection(db, "liveStreams", activeStream.id, "chat");
                                    await firestoreAddDoc(chatRef, {
                                      id: `chat_fx_${Date.now()}`,
                                      streamId: activeStream.id,
                                      senderId: "system",
                                      senderName: currentUser?.username || currentUser?.displayName || "Viewer",
                                      text: `triggered soundboard effect: ${fx.soundText}`,
                                      createdAt: new Date().toISOString()
                                    });
                                  } catch (err) {}
                                }
                              }}
                              className="flex items-center gap-1.5 p-2 bg-black/40 hover:bg-black/70 border border-white/5 hover:border-rose-500/30 rounded-xl transition text-[9px] text-left text-zinc-300 font-bold cursor-pointer border-none"
                            >
                              <span className="text-sm">{fx.emoji}</span>
                              <span className="truncate">{fx.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* AI TTS Narrator voice */}
                      <div className="space-y-2 pt-1 bg-black/40 p-3 rounded-2xl border border-white/5">
                        <p className="text-[9px] font-black text-rose-300 uppercase tracking-wide flex items-center gap-1">🗣️ AI TTS Narrator Voice</p>
                        <div className="grid grid-cols-4 gap-1">
                          {["robot", "alien", "deep", "kawaii"].map((v) => (
                            <button
                              key={v}
                              onClick={(e) => {
                                e.stopPropagation();
                                setAiTTSVoice(v);
                              }}
                              className={`py-1 rounded text-[8px] font-bold uppercase transition border cursor-pointer ${
                                aiTTSVoice === v
                                  ? "bg-rose-600 border-rose-500 text-white font-black"
                                  : "bg-black/30 border-white/5 text-zinc-400 hover:text-white"
                              }`}
                            >
                              {v === "robot" ? "🤖 ROBOT" : v === "alien" ? "👽 SPACE" : v === "deep" ? "🎙️ DEEP" : "🌸 KAWAII"}
                            </button>
                          ))}
                        </div>

                        <div className="flex gap-1.5">
                          <input 
                            type="text" 
                            placeholder="Type text for custom voice..." 
                            value={ttsSpeechText}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setTtsSpeechText(e.target.value)}
                            className="flex-1 bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-[9px] text-white focus:outline-none focus:border-rose-500"
                          />
                          <button 
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!ttsSpeechText.trim()) {
                                setHubShowToast("❌ Enter text to narrate!");
                                return;
                              }
                              if (viewerCoinBalance < 50) {
                                setHubShowToast("❌ Needs 50 coins to narrate!");
                                return;
                              }
                              setViewerCoinBalance(c => c - 50);
                              const textToSend = ttsSpeechText;
                              setTtsSpeechText("");
                              setHubShowToast(`🗣️ Submitting custom [${aiTTSVoice.toUpperCase()}] narration!`);

                              setTtsHistory?.(prev => [{ id: `tts_${Date.now()}`, text: textToSend, voice: aiTTSVoice }, ...prev]);

                              if (activeStream) {
                                try {
                                  const chatRef = collection(db, "liveStreams", activeStream.id, "chat");
                                  await firestoreAddDoc(chatRef, {
                                    id: `chat_tts_${Date.now()}`,
                                    streamId: activeStream.id,
                                    senderId: "system",
                                    senderName: `📢 AI_TTS_BOT [${aiTTSVoice.toUpperCase()}]`,
                                    text: `"${textToSend}"`,
                                    createdAt: new Date().toISOString()
                                  });
                                } catch (err) {}
                              }
                            }}
                            className="bg-rose-600 hover:bg-rose-500 px-2.5 text-[8px] font-black uppercase text-white rounded-lg transition border-none cursor-pointer"
                          >
                            SPEAK (50)
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. Monetization & Noble Ranks */}
                <div className="border border-white/5 rounded-2xl overflow-hidden bg-white/2">
                  <button
                    onClick={() => setExpandedSection(expandedSection === "money" ? null : "money")}
                    className="w-full flex items-center justify-between p-3.5 text-left bg-white/3 hover:bg-white/5 transition font-bold text-xs text-zinc-200"
                  >
                    <span className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-yellow-500" />
                      Monetization & Noble Ranks
                    </span>
                    <span className="text-[10px] text-zinc-500">{expandedSection === "money" ? "▲" : "▼"}</span>
                  </button>

                  {expandedSection === "money" && (
                    <div className="p-4 space-y-4 border-t border-white/5 bg-black/25 text-left">
                      {/* Withdrawal Wallet balance */}
                      <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/10 p-3 rounded-2xl border border-yellow-500/25 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">💰</span>
                          <div>
                            <p className="text-[10px] font-black text-yellow-300 uppercase tracking-wider">Withdrawal Wallet</p>
                            <p className="text-xs font-black text-white font-mono">${hubWithdrawalWallet.toFixed(2)} USD</p>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowWithdrawalForm(!showWithdrawalForm);
                          }}
                          className="px-2.5 py-1 bg-yellow-500 hover:bg-yellow-400 text-black transition rounded-xl text-[9px] font-black uppercase cursor-pointer border-none font-bold"
                        >
                          {showWithdrawalForm ? "Hide" : "Withdraw Funds"}
                        </button>
                      </div>

                      {/* Withdrawal Form */}
                      {showWithdrawalForm && (
                        <div className="bg-black/40 border border-yellow-500/30 p-3 rounded-2xl space-y-3">
                          <p className="text-[10px] font-bold text-white uppercase tracking-wider border-b border-white/5 pb-1">💸 Submit Cashout Request</p>
                          
                          <div className="space-y-2">
                            <div>
                              <label className="text-[8px] font-mono uppercase text-zinc-500">Method</label>
                              <select 
                                value={withdrawMethod}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => setWithdrawMethod(e.target.value as any)}
                                className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-yellow-500 cursor-pointer"
                              >
                                <option value="paypal">PayPal Express</option>
                                <option value="bank">Direct Bank Wire</option>
                                <option value="stripe">Stripe Connect</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[8px] font-mono uppercase text-zinc-500">Amount (USD)</label>
                              <input 
                                type="number" 
                                placeholder="Min $50.00" 
                                value={withdrawAmount}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-yellow-500"
                              />
                            </div>

                            {withdrawMethod === "paypal" ? (
                              <div>
                                <label className="text-[8px] font-mono uppercase text-zinc-500">PayPal Email Address</label>
                                <input 
                                  type="email" 
                                  placeholder="your-email@example.com" 
                                  value={withdrawEmail}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => setWithdrawEmail(e.target.value)}
                                  className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-yellow-500"
                                />
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <input 
                                  type="text" 
                                  placeholder="Bank Name" 
                                  value={withdrawBankName}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => setWithdrawBankName(e.target.value)}
                                  className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-[9px] text-white focus:outline-none"
                                />
                                <input 
                                  type="text" 
                                  placeholder="Account / IBAN" 
                                  value={withdrawAccountNum}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => setWithdrawAccountNum(e.target.value)}
                                  className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-[9px] text-white focus:outline-none"
                                />
                                <input 
                                  type="text" 
                                  placeholder="SWIFT / BIC Code" 
                                  value={withdrawSwift}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => setWithdrawSwift(e.target.value)}
                                  className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-[9px] text-white focus:outline-none"
                                />
                              </div>
                            )}

                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                const val = parseFloat(withdrawAmount);
                                if (isNaN(val) || val < 50) {
                                  setHubShowToast("❌ Minimum cashout is $50.00 USD!");
                                  return;
                                }
                                if (val > hubWithdrawalWallet) {
                                  setHubShowToast("❌ Insufficient funds in wallet!");
                                  return;
                                }
                                setHubWithdrawalWallet(prev => prev - val);
                                setWithdrawalHistory(prev => [
                                  {
                                    id: `TXN_${Date.now()}`,
                                    amount: val,
                                    method: withdrawMethod,
                                    status: "processing",
                                    date: new Date().toLocaleDateString()
                                  },
                                  ...prev
                                ]);
                                setWithdrawAmount("");
                                setHubShowToast(`💸 Withdrawal of $${val.toFixed(2)} is pending review!`);
                              }}
                              className="w-full py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-[9px] uppercase tracking-wider rounded-xl cursor-pointer transition border-none font-bold"
                            >
                              Confirm Cashout Request
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Cashout Ledger / History */}
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">📜 Cashout Transaction Ledger</p>
                        <div className="bg-black/30 p-2 rounded-xl border border-white/5 space-y-1.5">
                          {withdrawalHistory.map((txn) => (
                            <div key={txn.id} className="flex justify-between items-center text-[9px] border-b border-white/5 pb-1 last:border-0 last:pb-0 font-mono">
                              <div>
                                <p className="font-bold text-white">${txn.amount.toFixed(2)} - {txn.method.toUpperCase()}</p>
                                <p className="text-[7px] text-zinc-500">{txn.id} | {txn.date}</p>
                              </div>
                              <span className="text-[7px] font-black bg-yellow-500/10 text-yellow-400 border border-yellow-500/25 px-1.5 py-0.5 rounded uppercase font-bold">
                                {txn.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Noble Ranks Program */}
                      <div className="bg-[#1c180e] p-3 rounded-2xl border border-yellow-500/20 space-y-2">
                        <p className="text-[10px] font-black text-yellow-300 uppercase tracking-wide">✨ SoundStream Noble Ranks Program</p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { rank: "Baron 🏰", price: 1500 },
                            { rank: "Duke 👑", price: 5000 },
                            { rank: "Emperor 🌌", price: 15000 }
                          ].map((r) => (
                            <button
                              key={r.rank}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (viewerCoinBalance < r.price) {
                                  setHubShowToast("❌ Insufficient Sound Coins!");
                                  return;
                                }
                                setViewerCoinBalance(c => c - r.price);
                                setHubNobleRank(r.rank);
                                setHubShowToast(`🎉 Purchased Rank: ${r.rank}!`);
                              }}
                              className={`p-1.5 rounded-xl text-[8px] font-black uppercase transition border cursor-pointer ${
                                hubNobleRank === r.rank 
                                  ? "bg-yellow-500 border-yellow-400 text-black font-black" 
                                  : "bg-black/30 border-white/5 text-zinc-400 hover:text-white"
                              }`}
                            >
                              <span>{r.rank.split(" ")[0]}</span>
                              <span className="block text-[6px] font-mono font-medium text-yellow-400 mt-0.5">{r.price} Coins</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Daily Check-in Streak Calendar */}
                      <div className="bg-black/30 p-3 rounded-2xl border border-white/5 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-white uppercase tracking-wider">📅 Check-In Streak Rewards</span>
                          <span className="font-mono text-[9px] text-yellow-400 font-bold">{hubCheckInStreak} Day Streak</span>
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {Array.from({ length: 7 }).map((_, i) => {
                            const dayNum = i + 1;
                            const isActive = dayNum <= hubCheckInStreak;
                            return (
                              <div 
                                key={i} 
                                className={`aspect-square flex flex-col items-center justify-center rounded-xl border text-[9px] font-bold transition ${
                                  isActive 
                                    ? "bg-yellow-500/20 border-yellow-500 text-yellow-300" 
                                    : "bg-black/40 border-white/5 text-zinc-500"
                                }`}
                              >
                                <span className="text-[7px] text-zinc-500 font-mono">D{dayNum}</span>
                                <span className="text-[10px]">{isActive ? "✓" : "🪙"}</span>
                              </div>
                            );
                          })}
                        </div>
                        <button
                          disabled={hubDailyCheckedIn}
                          onClick={(e) => {
                            e.stopPropagation();
                            setHubDailyCheckedIn(true);
                            setHubCheckInStreak(s => s + 1);
                            setViewerCoinBalance(c => c + 120);
                            setHubShowToast("📅 Checked-in successfully! +120 Sound Coins claimed.");
                          }}
                          className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:bg-yellow-500/20 disabled:text-yellow-400 text-white font-bold text-[9px] uppercase rounded-xl transition cursor-pointer border-none mt-1"
                        >
                          {hubDailyCheckedIn ? "ALREADY CHECKED IN" : "CLAIM DAILY COINS"}
                        </button>
                      </div>

                      {/* Invite referrals */}
                      <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 p-3 rounded-2xl border border-yellow-500/20 space-y-2">
                        <p className="text-[10px] font-black text-yellow-300 uppercase tracking-wide">🤝 Invite and Earn Code</p>
                        <div className="flex justify-between items-center bg-black/40 p-2 rounded-xl border border-white/5">
                          <span className="font-mono text-[10px] text-white font-bold select-all">{hubInviteCode}</span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(hubInviteCode);
                              setHubShowToast("📋 Copied referral code to clipboard!");
                            }}
                            className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-wider cursor-pointer transition"
                          >
                            Copy Code
                          </button>
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-zinc-400 pt-0.5">
                          <span>Invites: {hubInvitationCount} users</span>
                          <span className="font-mono text-yellow-300">Reward: {hubInvitationRewards} Coins</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 6. Room Settings & Stream Controls */}
                <div className="border border-white/5 rounded-2xl overflow-hidden bg-white/2">
                  <button
                    onClick={() => setExpandedSection(expandedSection === "settings" ? null : "settings")}
                    className="w-full flex items-center justify-between p-3.5 text-left bg-white/3 hover:bg-white/5 transition font-bold text-xs text-zinc-200"
                  >
                    <span className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-indigo-400" />
                      Room Settings & Stream Controls
                    </span>
                    <span className="text-[10px] text-zinc-500">{expandedSection === "settings" ? "▲" : "▼"}</span>
                  </button>

                  {expandedSection === "settings" && (
                    <div className="p-4 space-y-4 border-t border-white/5 bg-black/25 text-left">
                      {/* Change Room Title */}
                      <div className="space-y-2">
                        <span className="text-[9px] uppercase font-black tracking-widest text-zinc-400 font-mono">Stream Panel Title</span>
                        {(() => {
                          const [tempTitle, setTempTitle] = useState(activeStream.title || "");
                          const [updating, setUpdating] = useState(false);
                          const handleUpdateTitle = async () => {
                            if (!tempTitle.trim()) return;
                            setUpdating(true);
                            try {
                              await firestoreUpdateDoc(doc(db, "liveStreams", activeStream.id), {
                                title: tempTitle.trim()
                              });
                              postSystemMessage(activeStream.id, `✏️ Host changed room title to: "${tempTitle.trim()}"`);
                              setHubShowToast("✏️ Stream panel title updated successfully!");
                            } catch (e) {
                              console.warn(e);
                            } finally {
                              setUpdating(false);
                            }
                          };
                          return (
                            <div className="flex gap-2">
                              <input 
                                type="text"
                                value={tempTitle}
                                onChange={(e) => setTempTitle(e.target.value)}
                                placeholder="Update stream panel title..."
                                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
                              />
                              <button
                                onClick={handleUpdateTitle}
                                disabled={updating || tempTitle.trim() === activeStream.title}
                                className="bg-indigo-650 hover:bg-indigo-600 disabled:opacity-50 text-white font-extrabold px-4 py-2 rounded-xl text-xs uppercase cursor-pointer border-none"
                              >
                                {updating ? "Saving" : "Save"}
                              </button>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Change Room Cover Preset */}
                      <div className="space-y-2">
                        <span className="text-[9px] uppercase font-black tracking-widest text-zinc-400 font-mono">Stream Panel Cover Preset</span>
                        <div className="grid grid-cols-6 gap-2">
                          {[
                            "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150",
                            "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=150",
                            "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=150",
                            "https://images.unsplash.com/photo-1516280440614-37939bbacd6a?w=150",
                            "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150",
                            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
                          ].map((preset, i) => (
                            <button
                              key={i}
                              onClick={async () => {
                                try {
                                  await firestoreUpdateDoc(doc(db, "liveStreams", activeStream.id), {
                                    creatorPhoto: preset,
                                    thumbnailUrl: preset
                                  });
                                  setHubShowToast("🖼️ Stream cover thumbnail updated!");
                                } catch (e) {
                                  console.warn(e);
                                }
                              }}
                              className={`relative aspect-square rounded-full overflow-hidden border-2 transition hover:scale-105 cursor-pointer ${
                                activeStream.creatorPhoto === preset ? "border-indigo-500 scale-105" : "border-transparent"
                              }`}
                            >
                              <img src={preset} alt="" className="w-full h-full object-cover" />
                              {activeStream.creatorPhoto === preset && (
                                <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
                                  <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Display VIP Badge toggle */}
                      {currentUserAudioProfile && (
                        <div className="flex items-center justify-between p-3 bg-white/2 border border-white/5 rounded-xl">
                          <span className="text-[10px] text-zinc-300 font-mono font-bold">Display VIP Badge Badge</span>
                          <button
                            onClick={async () => {
                              const currentBadges = currentUserAudioProfile.badges || [];
                              const updatedBadges = currentBadges.includes("VIP") 
                                ? currentBadges.filter((b: string) => b !== "VIP")
                                : [...currentBadges, "VIP"];
                              try {
                                await firestoreUpdateDoc(doc(db, "audio_profiles", currentUser.uid), {
                                  badges: updatedBadges
                                });
                                setHubShowToast("⭐ VIP Badge setting updated!");
                              } catch (e) {
                                console.warn(e);
                              }
                            }}
                            className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition cursor-pointer border-none ${
                              currentUserAudioProfile.badges?.includes("VIP")
                                ? "bg-amber-500 text-black font-bold"
                                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                            }`}
                          >
                            {currentUserAudioProfile.badges?.includes("VIP") ? "VIP Enabled" : "VIP Disabled"}
                          </button>
                        </div>
                      )}

                      {/* Level Up Creator Profile toggle */}
                      {currentUserAudioProfile && (
                        <div className="flex items-center justify-between p-3 bg-white/2 border border-white/5 rounded-xl">
                          <span className="text-[10px] text-zinc-300 font-mono font-bold">Level Up Creator Profile</span>
                          <button
                            onClick={async () => {
                              const newLevel = (currentUserAudioProfile.level || 10) + 1;
                              try {
                                await firestoreUpdateDoc(doc(db, "audio_profiles", currentUser.uid), {
                                  level: newLevel
                                });
                                setHubShowToast("⚡ Creator level boosted successfully!");
                              } catch (e) {
                                console.warn(e);
                              }
                            }}
                            className="px-3 py-1 rounded-lg text-[9px] font-bold uppercase transition cursor-pointer bg-indigo-650 text-indigo-200 hover:bg-indigo-600 border-none"
                          >
                            Level: {currentUserAudioProfile.level || 10} ⚡
                          </button>
                        </div>
                      )}

                      {/* Stream Controls - Edit Bio / Copy Connection / Leave / End */}
                      <div className="space-y-2 bg-white/2 border border-white/5 p-3 rounded-2xl">
                        <span className="text-[9px] uppercase font-black tracking-widest text-zinc-400 font-mono block mb-2">Stream Navigation Actions</span>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              setShowHostProfileMenu(false);
                              setShowEditAudioProfileModal(true);
                            }}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2 px-3 rounded-xl text-[10px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border-none"
                          >
                            <FileEdit className="w-3.5 h-3.5" />
                            Edit Profile Card
                          </button>

                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(window.location.href);
                              setHubShowToast("📋 Copied room connection link!");
                            }}
                            className="bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 py-2 px-3 rounded-xl text-[10px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            Copy Link
                          </button>
                        </div>

                        {/* Leave or End Stream Buttons */}
                        <div className="pt-2 border-t border-white/5 mt-2">
                          {currentUser?.uid === activeStream.creatorId ? (
                            <button
                              onClick={() => {
                                setShowHostProfileMenu(false);
                                handleEndStream();
                              }}
                              className="w-full bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition cursor-pointer border-none flex items-center justify-center gap-2"
                            >
                              <Power className="w-4 h-4" />
                              End Stream & Disband Room
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setShowHostProfileMenu(false);
                                handleEndStream();
                              }}
                              className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition cursor-pointer border-none flex items-center justify-center gap-2"
                            >
                              <LogOut className="w-4 h-4" />
                              Leave Stream Room
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 7. Connection & System Status */}
                <div className="border border-white/5 rounded-2xl overflow-hidden bg-white/2">
                  <button
                    onClick={() => setExpandedSection(expandedSection === "system" ? null : "system")}
                    className="w-full flex items-center justify-between p-3.5 text-left bg-white/3 hover:bg-white/5 transition font-bold text-xs text-zinc-200"
                  >
                    <span className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-teal-400" />
                      Connection & System Status
                    </span>
                    <span className="text-[10px] text-zinc-500">{expandedSection === "system" ? "▲" : "▼"}</span>
                  </button>

                  {expandedSection === "system" && (
                    <div className="p-4 space-y-3.5 border-t border-white/5 bg-black/25">
                      <div className="space-y-2 font-mono text-[9px] text-zinc-400">
                        <div className="flex justify-between items-center bg-black/30 p-2 rounded-xl border border-white/5">
                          <span>Latency (Ping):</span>
                          <span className="text-emerald-400 font-bold">18ms (Excellent)</span>
                        </div>
                        <div className="flex justify-between items-center bg-black/30 p-2 rounded-xl border border-white/5">
                          <span>Active Audio Node:</span>
                          <span className="text-white">Node-EU-West-3 (Active)</span>
                        </div>
                        <div className="flex justify-between items-center bg-black/30 p-2 rounded-xl border border-white/5">
                          <span>Encryption Key:</span>
                          <span className="text-white">AES-256 Secure Channel</span>
                        </div>
                        <div className="flex justify-between items-center bg-black/30 p-2 rounded-xl border border-white/5">
                          <span>Protocol:</span>
                          <span className="text-white">Agora WebRTC SD-RTN</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowHostProfileMenu(false)}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-black py-2.5 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer border-none"
              >
                Close Control Center
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================== */}
      {/* GUEST / USER VIEW PROFILE POPUP                */}
      {/* ============================================== */}
      <AnimatePresence>
        {viewingProfileUser && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-55 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b0814] border border-white/10 rounded-3xl max-w-sm w-full p-6 space-y-5 shadow-2xl relative overflow-hidden"
            >
              <button 
                onClick={() => setViewingProfileUser(null)} 
                className="absolute top-4 right-4 text-zinc-500 hover:text-white cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center space-y-4 pt-2">
                <div className="relative inline-block">
                  <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-pink-500 via-indigo-500 to-amber-500 mx-auto shadow-xl">
                    <img 
                      src={viewingProfileUser.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"} 
                      alt="" 
                      className="w-full h-full rounded-full object-cover border border-black/10" 
                    />
                  </div>
                  {viewingProfileUser.isVIP && (
                    <span className="absolute -bottom-1 -right-1 bg-gradient-to-r from-amber-500 to-orange-500 text-black text-[8px] font-black px-2 py-0.5 rounded shadow-sm uppercase font-mono">
                      VIP
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="text-base font-black text-white tracking-wide">
                    {viewingProfileUser.username}
                  </h4>
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <span className="text-[9px] font-bold bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full uppercase">
                      {viewingProfileUser.role || "Viewer"}
                    </span>
                    {viewingProfileUser.level && (
                      <span className="text-[9px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full font-mono">
                        LV.{viewingProfileUser.level}
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-white/2 border border-white/5 p-3.5 rounded-2xl text-left">
                  <span className="text-[9px] uppercase font-black tracking-widest text-zinc-500 font-mono block mb-1">About User</span>
                  <p className="text-xs text-zinc-300 leading-relaxed italic">
                    {viewingProfileUser.bio ? `"${viewingProfileUser.bio}"` : "This user hasn't set a bio yet."}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setViewingProfileUser(null)}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-black py-2.5 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Close Profile
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================== */}
      {/* HOST ROOM SETTINGS / MORE MODAL                */}
      {/* ============================================== */}
      <AnimatePresence>
        {showRoomSettingsModal && activeStream && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b0814] border border-white/10 rounded-3xl max-w-3xl w-full p-6 shadow-2xl flex flex-col md:flex-row gap-6 max-h-[85vh] overflow-hidden text-left"
            >
              {/* Left Sidebar Menu */}
              <div className="w-full md:w-56 shrink-0 flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/5 pb-4 md:pb-0 md:pr-4">
                <div className="space-y-4">
                  <div className="pb-2">
                    <h4 className="font-extrabold text-sm uppercase tracking-wider text-indigo-400 flex items-center gap-1.5 font-mono">
                      <Settings className="w-4 h-4 animate-spin-slow" />
                      Room Settings
                    </h4>
                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Control Stage Room & Features</p>
                  </div>

                  <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-none shrink-0 font-mono">
                    {[
                      { id: "layout", label: "Seat Layout", icon: Grid },
                      { id: "pk", label: "PK Battle", icon: Flame },
                      { id: "music", label: "Music & Playlist", icon: Radio },
                      { id: "audio", label: "Audio Settings", icon: Shield },
                      { id: "mods", label: "Moderators", icon: Users },
                      { id: "management", label: "Room Mgmt", icon: Settings },
                    ].map((tab) => {
                      const IconComp = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setRoomSettingsTab(tab.id as any)}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer w-full text-left ${
                            roomSettingsTab === tab.id 
                              ? "bg-indigo-650/30 border border-indigo-500/30 text-indigo-300"
                              : "bg-transparent border border-transparent text-zinc-400 hover:text-white hover:bg-white/2"
                          }`}
                        >
                          <IconComp className="w-4 h-4" />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 hidden md:block">
                  <button
                    onClick={handleEndStream}
                    className="w-full bg-red-950/40 hover:bg-red-950/85 text-red-400 border border-red-500/20 hover:border-red-500 font-black py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Power className="w-3.5 h-3.5" />
                    End Live Stream
                  </button>
                </div>
              </div>

              {/* Right Content Pane */}
              <div className="flex-1 flex flex-col justify-between overflow-y-auto max-h-[60vh] md:max-h-none pr-1">
                <div className="space-y-5 pb-4">
                  {/* Tab: Layout (Seat Layout, Lock/Unlock) */}
                  {roomSettingsTab === "layout" && (
                    <div className="space-y-5 animate-fade-in">
                      <div className="border-b border-white/5 pb-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-white">Seat Layout & Stage Limits</h4>
                        <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">Dynamically select the visible seat count and manage locked spaces.</p>
                      </div>

                      {/* MULTI-GUEST STAGE settings badge */}
                      <div className="inline-flex items-center gap-1.5 bg-[#131131]/60 border border-[#2b2575]/40 text-[#a39eff] px-3.5 py-2.5 rounded-xl text-[9px] font-black tracking-widest uppercase font-mono w-full justify-center">
                        <Mic className="w-3.5 h-3.5 text-[#a39eff]" />
                        <span>MULTI-GUEST STAGE • {activeStream.seatCount || 16} SEATS</span>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-black tracking-widest text-zinc-400 font-mono block">Stage Guest Seats</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[1, 2, 4, 6, 8, 10, 12, 16, 20].map((num) => (
                            <button
                              key={num}
                              onClick={async () => {
                                try {
                                  await updateDoc(doc(db, "liveStreams", activeStream.id), {
                                    seatCount: num
                                  });
                                  postSystemMessage(activeStream.id, `📐 Host updated guest stage layout to: ${num} Seats.`);
                                } catch (e) {
                                  console.warn(e);
                                }
                              }}
                              className={`py-2 px-3 rounded-xl text-xs font-black transition border cursor-pointer ${
                                (activeStream.seatCount || 16) === num
                                  ? "bg-indigo-650 text-white border-indigo-400 shadow-md scale-105"
                                  : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10 hover:border-white/10"
                              }`}
                            >
                              {num} {num === 1 ? "Seat" : "Seats"}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white/2 border border-white/5 p-4 rounded-2xl space-y-3">
                        <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400 font-mono block">Bulk Seat Actions</span>
                        <div className="flex flex-col sm:flex-row gap-2.5">
                          <button
                            onClick={handleLockAllEmptySeats}
                            className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 hover:border-amber-500/40 font-bold py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            Lock Empty Seats
                          </button>
                          <button
                            onClick={handleUnlockAllEmptySeats}
                            className="flex-1 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 hover:border-teal-500/40 font-bold py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            Unlock Empty Seats
                          </button>
                        </div>
                        <p className="text-[9px] text-zinc-500 italic">🔒 Locked seats block viewers from self-occupying and require explicit Host Approval.</p>
                      </div>
                    </div>
                  )}

                  {/* Tab: PK Battle */}
                  {roomSettingsTab === "pk" && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="border-b border-white/5 pb-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-white">⚔️ Live PK Battle Center</h4>
                        <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">Initiate, challenge, and manage active streaming battles.</p>
                      </div>

                      {/* Inbound Invites */}
                      {battleInvites.length > 0 ? (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 space-y-2">
                          <p className="text-[10px] uppercase font-black tracking-widest text-amber-400 font-mono">Inbound Challenges:</p>
                          {battleInvites.map((invite) => (
                            <div key={invite.id} className="flex items-center justify-between text-xs bg-zinc-950 p-2.5 rounded-xl border border-white/5">
                              <div>
                                <p className="font-black text-white">Challenge from @{invite.senderName}</p>
                                <p className="text-[9px] text-zinc-400 font-mono">Duration: {invite.duration} seconds</p>
                              </div>
                              <div className="flex gap-1.5 shrink-0">
                                <button 
                                  onClick={async () => {
                                    await acceptBattleInvite(invite.id);
                                    setShowRoomSettingsModal(false);
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] uppercase cursor-pointer border-none"
                                >
                                  Accept
                                </button>
                                <button 
                                  onClick={async () => {
                                    await declineBattleInvite(invite.id);
                                  }}
                                  className="bg-red-950 text-red-400 font-bold px-2.5 py-1.5 rounded-lg text-[10px] uppercase cursor-pointer border-none"
                                >
                                  Decline
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-white/2 border border-white/5 p-3 rounded-2xl text-center">
                          <p className="text-[10px] text-zinc-500 italic">No pending inbound PK Battle invites received.</p>
                        </div>
                      )}

                      {/* Active Battle status or invite other active rooms */}
                      <div className="space-y-2">
                        <p className="text-[10px] uppercase font-black tracking-widest text-zinc-400 font-mono">Challenge Online Audio Rooms:</p>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {streams.filter(s => s.id !== activeStream.id && s.type === "audio" && s.status === "live").length === 0 ? (
                            <p className="text-[10px] text-zinc-500 font-mono text-center py-4 bg-black/10 rounded-xl border border-white/5">No other active audio rooms online right now.</p>
                          ) : (
                            streams
                              .filter(s => s.id !== activeStream.id && s.type === "audio" && s.status === "live")
                              .map((otherStream) => (
                                <div key={otherStream.id} className="flex items-center justify-between bg-zinc-900 border border-white/5 p-2.5 rounded-xl text-xs">
                                  <div>
                                    <p className="font-bold text-zinc-200">{otherStream.title}</p>
                                    <p className="text-[9px] text-zinc-500">Host: {otherStream.creatorName}</p>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      if (!currentUser) return;
                                      try {
                                        await createBattleInvite(
                                          currentUser.uid,
                                          currentUser.username || currentUser.displayName || "Host",
                                          currentUser.photoURL || "",
                                          activeStream.id,
                                          otherStream.creatorId,
                                          otherStream.creatorName,
                                          otherStream.thumbnailUrl || "",
                                          otherStream.id,
                                          300 // 5 minutes duration
                                        );
                                        alert(`Battle invite sent to ${otherStream.creatorName}!`);
                                        setShowRoomSettingsModal(false);
                                      } catch (err: any) {
                                        alert(err.message || "Failed to invite.");
                                      }
                                    }}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-3 py-1.5 rounded-lg text-[10px] uppercase cursor-pointer border-none"
                                  >
                                    Challenge
                                  </button>
                                </div>
                              ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab: Music & Playlist */}
                  {roomSettingsTab === "music" && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="border-b border-white/5 pb-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-white">🎵 Live Stage Playlist & Music Library</h4>
                        <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">Configure backtracks, volume settings, and sync queue.</p>
                      </div>

                      {/* SYNC PLAYBACK settings badge */}
                      <div className="inline-flex items-center gap-1.5 bg-[#181121]/60 border border-[#48205f]/40 text-[#e4aaff] px-3.5 py-2.5 rounded-xl text-[9px] font-black tracking-widest uppercase font-mono w-full justify-center">
                        <Activity className="w-3.5 h-3.5 text-[#e4aaff] animate-pulse" />
                        <span>
                          SYNC PLAYBACK: {
                            songs?.find(s => s.id === (activeStream as any).currentSongId)?.title.toUpperCase() || "NA YOUR LOVE"
                          }
                        </span>
                      </div>

                      {/* Controls and volumes */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white/2 p-3.5 rounded-2xl border border-white/5">
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase font-black text-zinc-400 font-mono">Backtrack Volume</span>
                          <input 
                            type="range"
                            min="0"
                            max="100"
                            value={musicVolume}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10);
                              setMusicVolume(v);
                              if (audioPlayerRef.current) audioPlayerRef.current.volume = v / 100;
                            }}
                            className="w-full accent-indigo-500 cursor-pointer"
                          />
                          <p className="text-[9px] font-mono text-indigo-400 text-right">{musicVolume}%</p>
                        </div>

                        <div className="flex gap-2 items-center justify-end">
                          <button 
                            onClick={handleToggleShuffle}
                            className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded border transition cursor-pointer ${
                              (activeStream as any).isShuffle ? "bg-indigo-500/20 border-indigo-500 text-indigo-400" : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                            }`}
                          >
                            Shuffle
                          </button>
                          <button 
                            onClick={handleToggleRepeat}
                            className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded border transition cursor-pointer ${
                              (activeStream as any).isRepeat ? "bg-indigo-500/20 border-indigo-500 text-indigo-400" : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                            }`}
                          >
                            Repeat
                          </button>
                        </div>
                      </div>

                      {/* Current playlist */}
                      <div className="space-y-1.5">
                        <p className="text-[10px] uppercase font-black tracking-widest text-zinc-400 font-mono">Current Sync Queue:</p>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {roomPlaylist.length === 0 ? (
                            <p className="text-[10px] text-zinc-500 italic text-center py-4 bg-black/10 rounded-xl">Playlist queue is empty. Select a library song below!</p>
                          ) : (
                            roomPlaylist.map((song, idx) => {
                              const isActive = idx === currentPlaylistIndex;
                              return (
                                <div key={idx} className={`flex items-center justify-between p-2 rounded-xl border text-xs transition ${
                                  isActive ? "bg-pink-500/10 border-pink-500/20 text-pink-400" : "bg-zinc-900 border-white/5 text-zinc-300"
                                }`}>
                                  <div className="flex items-center gap-1.5 truncate">
                                    <span className="font-mono text-[9px] text-zinc-500">{idx + 1}</span>
                                    <p className="font-bold truncate">{song.title}</p>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button onClick={() => handlePlaySongAtIndex(idx)} className="text-[9px] font-black uppercase bg-indigo-650/40 hover:bg-indigo-600 border border-indigo-500/20 text-indigo-200 px-2 py-0.5 rounded cursor-pointer">
                                      Play
                                    </button>
                                    <button onClick={() => handleRemoveSongFromPlaylist(idx)} className="text-[9px] font-bold text-red-400 px-2 hover:text-red-300 cursor-pointer border-none bg-transparent">×</button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Library picker */}
                      <div className="border-t border-white/5 pt-3 space-y-2">
                        <p className="text-[10px] uppercase font-black tracking-widest text-zinc-400 font-mono">SoundStream Music Library (Add to Stage):</p>
                        <div className="max-h-36 overflow-y-auto flex flex-col gap-1.5 pr-1">
                          {songs?.map((song) => (
                            <div key={song.id} className="flex items-center justify-between bg-zinc-950 p-2 rounded-xl border border-white/3">
                              <div className="truncate">
                                <p className="text-xs font-bold text-zinc-200 truncate">{song.title}</p>
                                <p className="text-[9px] text-zinc-500 font-mono truncate">{song.artistName}</p>
                              </div>
                              <button
                                onClick={() => handleAddSongToPlaylist(song)}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-lg transition border-none cursor-pointer shadow-sm"
                              >
                                + Queue
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab: Audio Settings */}
                  {roomSettingsTab === "audio" && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="border-b border-white/5 pb-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-white">⚙️ Live Voice & Microphone Settings</h4>
                        <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">Configure microphone volumes, open-mic access, and speaker settings.</p>
                      </div>

                      <div className="bg-white/2 border border-white/5 p-4 rounded-2xl space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-black tracking-widest text-zinc-400 font-mono block">Microphone Gain</label>
                          <input 
                            type="range"
                            min="0"
                            max="100"
                            value={micVolume}
                            onChange={(e) => setMicVolume(parseInt(e.target.value, 10))}
                            className="w-full accent-emerald-500 cursor-pointer"
                          />
                          <p className="text-[9px] font-mono text-emerald-400 text-right">{micVolume}% Gain Level</p>
                        </div>

                        <div className="border-t border-white/5 pt-4 space-y-3.5">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-zinc-200">Open Mic Access Mode</p>
                              <p className="text-[9px] text-zinc-500 font-mono">Allows guest viewers to self-unmute automatically without requiring Host's Permission.</p>
                            </div>
                            <button
                              onClick={handleToggleOpenMic}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition cursor-pointer border ${
                                openMicEnabled 
                                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" 
                                  : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                              }`}
                            >
                              {openMicEnabled ? "Open Mic ON" : "Open Mic OFF"}
                            </button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-zinc-200">Stage Speaker Output</p>
                              <p className="text-[9px] text-zinc-500 font-mono">Mute or unmute all audio feed coming from guest seats completely.</p>
                            </div>
                            <button
                              onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition cursor-pointer border ${
                                isSpeakerMuted 
                                  ? "bg-red-500/20 border-red-500 text-red-400 animate-pulse" 
                                  : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                              }`}
                            >
                              {isSpeakerMuted ? "Speaker MUTED" : "Speaker ACTIVE"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab: Moderators */}
                  {roomSettingsTab === "mods" && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="border-b border-white/5 pb-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-white">🛡️ Room Moderator Staff</h4>
                        <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">Promote trust and safety by appointing reliable room moderators.</p>
                      </div>

                      {(() => {
                        const [newModName, setNewModName] = useState("");
                        const currentMods = (activeStream as any).moderators || ["@FredoVIP", "@SoundStreamMod_3"];
                        const handleAddMod = async () => {
                          if (!newModName.trim()) return;
                          const formattedModName = newModName.trim().startsWith("@") ? newModName.trim() : `@${newModName.trim()}`;
                          if (currentMods.includes(formattedModName)) return;
                          try {
                            await updateDoc(doc(db, "liveStreams", activeStream.id), {
                              moderators: [...currentMods, formattedModName]
                            });
                            postSystemMessage(activeStream.id, `🛡️ Host promoted ${formattedModName} to Room Moderator!`);
                            setNewModName("");
                            alert(`${formattedModName} added to Moderator staff successfully!`);
                          } catch (e) {
                            console.warn(e);
                          }
                        };
                        const handleRemoveMod = async (mod: string) => {
                          try {
                            await updateDoc(doc(db, "liveStreams", activeStream.id), {
                              moderators: currentMods.filter((m: string) => m !== mod)
                            });
                            postSystemMessage(activeStream.id, `🛡️ Host removed ${mod} from Room Moderator staff.`);
                          } catch (e) {
                            console.warn(e);
                          }
                        };

                        return (
                          <div className="space-y-4">
                            <div className="flex gap-2">
                              <input 
                                type="text"
                                value={newModName}
                                onChange={(e) => setNewModName(e.target.value)}
                                placeholder="Enter username (e.g. DJ_Fredo)..."
                                className="flex-1 bg-black/45 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
                              />
                              <button
                                onClick={handleAddMod}
                                className="bg-indigo-650 hover:bg-indigo-600 text-white font-extrabold px-4 py-2 rounded-xl text-xs uppercase cursor-pointer border-none"
                              >
                                Add Mod
                              </button>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] uppercase font-black tracking-widest text-zinc-400 font-mono block">Appointed Staff List</label>
                              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                {currentMods.length === 0 ? (
                                  <p className="text-[10px] text-zinc-500 italic text-center py-4 bg-black/10 rounded-xl">No moderators appointed yet.</p>
                                ) : (
                                  currentMods.map((mod: string, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between bg-white/2 border border-white/5 p-2.5 rounded-xl text-xs font-mono">
                                      <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded bg-indigo-500/10 flex items-center justify-center text-[10px] font-black text-indigo-400">★</div>
                                        <span className="text-zinc-200">{mod}</span>
                                      </div>
                                      <button 
                                        onClick={() => handleRemoveMod(mod)}
                                        className="text-[10px] font-bold text-red-400 hover:text-red-300 px-2 cursor-pointer border-none bg-transparent"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Tab: Room Management */}
                  {roomSettingsTab === "management" && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="border-b border-white/5 pb-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-white">Room Details & Metadata</h4>
                        <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">View current session statistics and update active stream parameters.</p>
                      </div>

                      {/* Stats cards */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="bg-white/2 border border-white/5 p-3 rounded-xl">
                          <span className="text-[9px] uppercase font-black text-zinc-500 font-mono">Viewer count</span>
                          <p className="text-xl font-black text-indigo-400 mt-1">{activeStream.viewerCount || 0}</p>
                        </div>
                        <div className="bg-white/2 border border-white/5 p-3 rounded-xl">
                          <span className="text-[9px] uppercase font-black text-zinc-500 font-mono">Stream Category</span>
                          <p className="text-xs font-bold text-zinc-200 mt-1 uppercase tracking-wide">{activeStream.category || "Social Talk"}</p>
                        </div>
                      </div>

                      {/* Title Form */}
                      {(() => {
                        const [tempTitle, setTempTitle] = useState(activeStream.title || "");
                        const [updating, setUpdating] = useState(false);
                        const handleUpdateTitle = async () => {
                          if (!tempTitle.trim()) return;
                          setUpdating(true);
                          try {
                            await updateDoc(doc(db, "liveStreams", activeStream.id), {
                              title: tempTitle.trim()
                            });
                            postSystemMessage(activeStream.id, `✏️ Host changed room title to: "${tempTitle.trim()}"`);
                            alert("Room title updated successfully!");
                          } catch (e) {
                            console.warn(e);
                          } finally {
                            setUpdating(false);
                          }
                        };
                        return (
                          <div className="space-y-1.5 bg-zinc-950 p-4 rounded-2xl border border-white/5">
                            <label className="text-[10px] uppercase font-black tracking-widest text-zinc-400 font-mono block">Edit Room Broadcast Title</label>
                            <div className="flex gap-2">
                              <input 
                                type="text"
                                value={tempTitle}
                                onChange={(e) => setTempTitle(e.target.value)}
                                placeholder="Enter new room name..."
                                className="flex-1 bg-black/45 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
                              />
                              <button
                                onClick={handleUpdateTitle}
                                disabled={updating || tempTitle.trim() === activeStream.title}
                                className="bg-indigo-650 hover:bg-indigo-600 disabled:opacity-50 text-indigo-100 font-extrabold px-4 py-2 rounded-xl text-xs uppercase cursor-pointer border-none"
                              >
                                {updating ? "Saving" : "Save"}
                              </button>
                            </div>
                          </div>
                        );
                      })()}

                      {/* End stream warning block */}
                      <div className="bg-red-500/10 border border-red-500/25 p-4 rounded-2xl space-y-2">
                        <h5 className="text-xs font-bold text-red-400">Danger Zone</h5>
                        <p className="text-[10px] text-zinc-400 font-mono">Ending the broadcast will close the audio stream and kick out all viewers immediately.</p>
                        <button
                          onClick={handleEndStream}
                          className="bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-200 font-extrabold py-2 px-4 rounded-xl text-xs uppercase transition cursor-pointer"
                        >
                          End Stream Broadcast
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Close modal controls */}
                <div className="border-t border-white/5 pt-4 flex gap-2 justify-end shrink-0">
                  <button
                    onClick={() => setShowRoomSettingsModal(false)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-black py-2.5 px-6 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer border-none"
                  >
                    Close Settings
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

interface AnimatedBackgroundProps {
  theme: "galaxy" | "concert" | "lounge" | "club" | "sky";
}

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ theme }) => {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <style>{`
        @keyframes laser-sweep {
          0%, 100% { transform: rotate(-15deg) scaleX(1); opacity: 0.3; }
          50% { transform: rotate(15deg) scaleX(1.5); opacity: 0.7; }
        }
        @keyframes float-dust {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          50% { opacity: 0.8; }
          100% { transform: translateY(-120px) rotate(360deg); opacity: 0; }
        }
      `}</style>
      {theme === "galaxy" && (
        <div className="absolute inset-0 bg-gradient-to-b from-[#11072b] via-[#050212] to-[#020005]">
          {/* Animated cosmic cloud */}
          <div className="absolute top-[-20%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.15)_0%,transparent_60%)] animate-[spin_60s_linear_infinite] mix-blend-screen" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[100%] h-[100%] bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.1)_0%,transparent_50%)] animate-[spin_45s_linear_infinite_reverse] mix-blend-screen" />
          {/* Twinkling stars */}
          <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(white, rgba(255,255,255,.2) 2px, transparent 40px), radial-gradient(white, rgba(255,255,255,.15) 1px, transparent 30px)", backgroundSize: "550px 550px, 350px 350px", opacity: 0.35 }} />
        </div>
      )}
      {theme === "concert" && (
        <div className="absolute inset-0 bg-gradient-to-b from-[#06152b] via-[#020712] to-[#010205]">
          {/* Neon lasers */}
          <div className="absolute top-0 left-1/4 w-[2px] h-full bg-gradient-to-b from-cyan-500/30 via-transparent to-transparent origin-top rotate-[-15deg] animate-[laser-sweep_4s_ease-in-out_infinite]" />
          <div className="absolute top-0 right-1/4 w-[2px] h-full bg-gradient-to-b from-pink-500/30 via-transparent to-transparent origin-top rotate-[15deg] animate-[laser-sweep_4.5s_ease-in-out_infinite_reverse]" />
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-[radial-gradient(ellipse_at_bottom,rgba(6,182,212,0.15)_0%,transparent_70%)]" />
        </div>
      )}
      {theme === "lounge" && (
        <div className="absolute inset-0 bg-gradient-to-b from-[#1f1610] via-[#0a0705] to-[#030202]">
          {/* Golden bokeh drift */}
          <div className="absolute top-[10%] left-[20%] w-60 h-60 rounded-full bg-amber-500/5 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[20%] right-[25%] w-80 h-80 rounded-full bg-yellow-600/5 blur-[140px] animate-pulse" style={{ animationDuration: '6s' }} />
        </div>
      )}
      {theme === "club" && (
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a081f] via-[#08020a] to-[#030104]">
          {/* Cyber club grids */}
          <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(139,92,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.03) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-[radial-gradient(circle,rgba(236,72,153,0.08)_0%,transparent_70%)] animate-pulse" />
        </div>
      )}
      {theme === "sky" && (
        <div className="absolute inset-0 bg-gradient-to-b from-[#1e1b4b] via-[#311042] to-[#0f051d]">
          {/* Sunset haze */}
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 via-purple-500/5 to-pink-500/5 mix-blend-overlay" />
          <div className="absolute top-[30%] left-[-10%] w-[120%] h-[40%] bg-gradient-to-r from-transparent via-pink-500/5 to-transparent blur-3xl animate-[pulse_8s_ease-in-out_infinite]" />
        </div>
      )}

      {/* 60FPS CSS Drifting Sparks */}
      <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
        {Array.from({ length: 15 }).map((_, idx) => {
          const size = Math.random() * 4 + 2;
          const left = Math.random() * 100;
          const duration = Math.random() * 10 + 8;
          const delay = Math.random() * 5;
          return (
            <div
              key={idx}
              className="absolute rounded-full bg-white/30"
              style={{
                width: size,
                height: size,
                left: `${left}%`,
                bottom: "-5%",
                animation: `float-dust ${duration}s linear infinite`,
                animationDelay: `${delay}s`,
                filter: "blur(0.5px)",
                boxShadow: "0 0 6px rgba(255, 255, 255, 0.7)"
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
