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
  Power
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
  role: "Host" | "Co-host" | "Guest" | "Listener";
  isMuted: boolean;
  isSpeaking: boolean;
  isLocked?: boolean;
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

  // Boomplay Comments Section states
  const [selectedComment, setSelectedComment] = useState<LiveChatMessage | null>(null);
  const [chatSubFilter, setChatSubFilter] = useState<"all" | "host" | "stage" | "gifts">("all");
  const [micError, setMicError] = useState<string | null>(null);

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

  const seatsArray = useMemo(() => {
    if (!seats) return [];
    if (Array.isArray(seats)) return seats;
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
      };
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
            } catch (camErr) {
              console.warn("[Agora] Camera acquisition failed, falling back to virtual animated music feed:", camErr);
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
      } catch (err) {
        console.warn("[Media] getUserMedia failed, falling back to virtual animated stream:", err);
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
            <div className={`flex-1 flex flex-col relative h-full border-r border-white/5 justify-between transition-colors duration-300 ${
              activeStream.type === "audio" 
                ? "bg-[#080511]" 
                : "bg-zinc-950"
            }`}>
              
              {/* Floating Gift Banner notifications */}
              <div className="absolute top-20 left-4 z-40 space-y-2 pointer-events-none">
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
                <div className="p-4 flex items-center justify-between shrink-0 border-b border-white/5 bg-[#080511]">
                  <div className="flex items-center gap-3">
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
                      className="w-11 h-11 rounded-full object-cover border-2 border-[#a39eff]/20 shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-all" 
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-white text-sm tracking-wide uppercase">
                          {activeStream.creatorName || "FREDOMUSIC02"}
                        </h4>
                        <span className="text-[8px] font-black bg-pink-500 text-white px-1.5 py-0.5 rounded-md uppercase font-sans">
                          LV. 10
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 font-medium tracking-wide mt-0.5">
                        {activeStream.title || "hr"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-black bg-red-600 text-white px-3 py-1.5 rounded-full flex items-center gap-1 animate-pulse shadow-md">
                      <Eye className="w-3.5 h-3.5" />
                      {activeStream.viewerCount || 1} Viewers
                    </span>
                    
                    <button 
                      onClick={handleEndStream}
                      className="bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white px-4 py-2 rounded-full text-xs font-extrabold uppercase transition border-none cursor-pointer tracking-wider"
                    >
                      LEAVE ROOM
                    </button>
                  </div>
                </div>
              ) : (
                /* Standard video room header */
                <div className="p-4 bg-gradient-to-b from-black/85 to-transparent flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
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
                      className="w-10 h-10 rounded-full object-cover border border-indigo-500 cursor-pointer hover:scale-105 active:scale-95 transition-all" 
                    />
                    <div>
                      <h4 className="font-bold text-xs flex items-center gap-1.5 uppercase">
                        {activeStream.creatorName}
                        <span className="text-[9px] font-mono bg-pink-500/10 text-pink-400 border border-pink-500/20 px-1.5 py-0.2 rounded uppercase">Lv. 10</span>
                      </h4>
                      <p className="text-[10px] text-zinc-400 font-mono truncate max-w-[200px]">{activeStream.title}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-bold font-mono bg-red-600 text-white px-2 py-0.8 rounded-full flex items-center gap-1 animate-pulse">
                      <Eye className="w-3 h-3" />
                      {activeStream.viewerCount} Viewers
                    </span>
                    
                    {/* Leave stream button */}
                    <button 
                      onClick={handleEndStream}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white px-3 py-1.5 rounded-full text-xs font-bold uppercase transition border-none cursor-pointer"
                    >
                      Leave Room
                    </button>
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

              {/* Center Content: AUDIO SOCIAL ROOM (Seats Grid) vs. VIDEO BROADCAST */}
              <div className="flex-1 flex flex-col justify-start p-6 overflow-y-auto space-y-4">
                {activeStream.type === "audio" ? (
                  /* Audio Stream Seats Layout: 24 occupied/unoccupied seats */
                  <div className="w-full max-w-4xl mx-auto space-y-4 relative">
                    
                    {/* PK Battle Scoreboard Area */}
                    {activeBattle && (
                      <div className="w-full bg-zinc-900/90 border border-indigo-500/20 rounded-2xl p-4 space-y-3 shadow-xl backdrop-blur-md">
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

                    {/* Compact Utility Row matching screenshot */}
                    <div className="flex flex-wrap items-center gap-3 justify-center py-2">
                      <div className="inline-flex items-center gap-1.5 bg-[#131131]/60 border border-[#2b2575]/40 text-[#a39eff] px-3.5 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase font-mono">
                        <Mic className="w-3.5 h-3.5 text-[#a39eff]" />
                        <span>MULTI-GUEST STAGE • {activeStream.seatCount || 16} SEATS</span>
                      </div>
                      
                      <div className="inline-flex items-center gap-1.5 bg-[#181121]/60 border border-[#48205f]/40 text-[#e4aaff] px-3.5 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase font-mono">
                        <Activity className="w-3.5 h-3.5 text-[#e4aaff] animate-pulse" />
                        <span>
                          SYNC PLAYBACK: {
                            songs?.find(s => s.id === (activeStream as any).currentSongId)?.title.toUpperCase() || "NA YOUR LOVE"
                          }
                        </span>
                      </div>
                    </div>

                    {/* Stage Area - Full Width */}
                    <div className="w-full max-w-4xl mx-auto py-3 space-y-6">
                      {/* 1. Host Spotlight Stage (Seat 1) */}
                      {(() => {
                        const seatNum = 1;
                        const actualSeat = seatsArray.find(s => s.id === "seat_1") || {
                          id: "seat_1",
                          userId: activeStream.creatorId,
                          username: activeStream.creatorName || "Host",
                          photoURL: activeStream.creatorPhoto || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
                          role: "Host",
                          isMuted: false,
                          isSpeaking: false,
                          isLocked: false,
                          userLevel: 10,
                          isVIP: true
                        };
                        const isOccupied = actualSeat.userId !== null;
                        const isHost = isOccupied && actualSeat.userId === activeStream.creatorId;
                        const isSpeakingSimulated = isOccupied && !actualSeat.isMuted && (((speakingTicker + seatNum) % 5 === 0) || ((speakingTicker + seatNum) % 7 === 0) || actualSeat.isSpeaking);

                        return (
                          <div 
                            onClick={(e) => handleSeatClick(e, actualSeat)}
                            className="relative mx-auto max-w-md bg-gradient-to-b from-[#1b153e]/80 via-[#0e0a24]/90 to-[#070514]/95 border border-purple-500/20 rounded-3xl p-5 shadow-2xl overflow-hidden group cursor-pointer hover:border-purple-500/40 hover:scale-[1.02] transition-all duration-300"
                          >
                            {/* Glass background highlights and particles */}
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent opacity-70 pointer-events-none" />
                            <div className="absolute -right-20 -top-20 w-40 h-40 bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />
                            <div className="absolute -left-20 -bottom-20 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

                            <div className="relative flex flex-col items-center">
                              {/* Glowing voice waves / spotlight pulsing rings when speaking */}
                              {isSpeakingSimulated ? (
                                <div className="absolute -top-1">
                                  <span className="absolute -inset-6 bg-purple-500/20 rounded-full animate-ping pointer-events-none" />
                                  <span className="absolute -inset-4 bg-purple-500/10 rounded-full animate-pulse pointer-events-none" />
                                </div>
                              ) : (
                                <div className="absolute -top-1">
                                  <span className="absolute -inset-4 bg-white/2 rounded-full pointer-events-none" />
                                </div>
                              )}

                              {/* Host Spotlight Ring */}
                              <div className="relative mb-3">
                                {/* Beautiful Animated Glowing Ring */}
                                <div className={`w-20 h-20 rounded-full p-0.5 shadow-xl transition-all duration-500 ${
                                  isSpeakingSimulated 
                                    ? "bg-gradient-to-r from-[#d946ef] via-[#a855f7] to-[#6366f1] animate-spin" 
                                    : "bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400"
                                }`} style={{ animationDuration: isSpeakingSimulated ? '3s' : '0s' }}>
                                  <img 
                                    src={actualSeat.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"} 
                                    alt="Host" 
                                    className="w-full h-full rounded-full object-cover border border-black/20" 
                                  />
                                </div>

                                {/* Shimmering Crown Tag */}
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 text-black text-[9px] font-black px-2.5 py-0.5 rounded-full shadow-lg z-10 leading-none flex items-center gap-1 border border-yellow-300">
                                  👑 HOST
                                </span>

                                {/* Host Level Badge */}
                                {actualSeat.userLevel !== undefined && actualSeat.userLevel !== null && (
                                  <span className="absolute -bottom-1 -left-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-md z-10 font-mono">
                                    L.{actualSeat.userLevel}
                                  </span>
                                )}

                                {/* Mic status indicator on bottom-right */}
                                <span className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border border-black/20 text-xs shadow-lg z-10 ${
                                  actualSeat.isMuted ? "bg-red-500 text-white" : "bg-emerald-500 text-white animate-bounce"
                                }`}>
                                  {actualSeat.isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                                </span>
                              </div>

                              {/* Host Name & Animated Audio Bars */}
                              <div className="text-center space-y-1">
                                <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center justify-center gap-1.5">
                                  {actualSeat.username || "Host"}
                                  {actualSeat.isVIP && (
                                    <span className="bg-gradient-to-r from-amber-400 to-amber-600 text-black font-mono text-[8px] font-black px-1 rounded leading-none">
                                      VIP
                                    </span>
                                  )}
                                </h4>
                                
                                {isSpeakingSimulated ? (
                                  <div className="flex items-center justify-center gap-0.5 h-3 py-0.5">
                                    <span className="w-0.5 bg-emerald-400 rounded animate-bounce h-2" style={{ animationDelay: '0.1s' }} />
                                    <span className="w-0.5 bg-emerald-400 rounded animate-bounce h-3" style={{ animationDelay: '0.3s' }} />
                                    <span className="w-0.5 bg-emerald-400 rounded animate-bounce h-1.5" style={{ animationDelay: '0.5s' }} />
                                    <span className="w-0.5 bg-emerald-400 rounded animate-bounce h-3" style={{ animationDelay: '0.2s' }} />
                                    <span className="w-0.5 bg-emerald-400 rounded animate-bounce h-2" style={{ animationDelay: '0.4s' }} />
                                  </div>
                                ) : (
                                  <p className="text-[10px] font-mono text-zinc-500 tracking-wider">ON THE MICROPHONE</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* 2. Guest Grid Section (Seats 2 and above) */}
                      {(() => {
                        const totalSeats = activeStream.seatCount || 16;
                        const isCompactLayout = totalSeats > 10;
                        const gridColsClass = isCompactLayout ? "grid-cols-5" : "grid-cols-4 sm:grid-cols-5";
                        const seatSizeClass = isCompactLayout ? "w-11 h-11 sm:w-12 sm:h-12" : "w-14 h-14";
                        const textWidthClass = isCompactLayout ? "w-12 sm:w-14" : "w-16";
                        const numBadgeClass = isCompactLayout ? "w-4 h-4 text-[7px]" : "w-5 h-5 text-[9px]";
                        const micBadgeClass = isCompactLayout ? "w-4 h-4 text-[7px]" : "w-5 h-5 text-[9px]";
                        const micIconClass = isCompactLayout ? "w-2.5 h-2.5" : "w-2.5 h-2.5";
                        const paddingClass = isCompactLayout ? "p-3 sm:p-4 pt-7 sm:pt-8" : "p-6 pt-8";
                        const gapClass = isCompactLayout ? "gap-x-2 sm:gap-x-3 gap-y-4 pt-2" : "gap-x-4 gap-y-7 pt-4";

                        return (
                          <div className={`bg-[#0c0817]/90 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden ${paddingClass}`}>
                            {/* Title overlay in the grid */}
                            <div className="absolute top-2 left-6 right-6 flex items-center justify-between text-[8px] font-bold tracking-widest text-zinc-500 uppercase border-b border-white/5 pb-1">
                              <span>Guest Panel Seats</span>
                              <span>Multi-guest Audio Mode</span>
                            </div>

                            <div className={`grid ${gridColsClass} ${gapClass}`}>
                              {Array.from({ length: (activeStream.seatCount || 16) - 1 }).map((_, idx) => {
                                const seatNum = idx + 2; // Offset by 2 (seat 2, 3, etc.)
                                const actualSeat = seatsArray.find(s => s.id === `seat_${seatNum}`) || {
                                  id: `seat_${seatNum}`,
                                  userId: null,
                                  username: "",
                                  photoURL: "",
                                  role: "Listener",
                                  isMuted: false,
                                  isSpeaking: false,
                                  isLocked: false,
                                  userLevel: null,
                                  isVIP: null,
                                  panelName: ""
                                };
                                const isOccupied = actualSeat.userId !== null;
                                const isSpeakingSimulated = isOccupied && !actualSeat.isMuted && (((speakingTicker + seatNum) % 5 === 0) || ((speakingTicker + seatNum) % 7 === 0) || actualSeat.isSpeaking);

                                // Dynamically label empty seats with Boomplay style roles
                                let seatPlaceholder = `Mic ${seatNum}`;
                                if (seatNum === 2 || seatNum === 3) seatPlaceholder = "Co-Host";
                                else if (seatNum === 4 || seatNum === 5) seatPlaceholder = "VIP Guest";
                                else if (seatNum === 6) seatPlaceholder = "Singer Seat";

                                // Color for levels
                                const getLevelColor = (lvl: number) => {
                                  if (lvl >= 15) return "from-amber-500 to-orange-600";
                                  if (lvl >= 10) return "from-purple-600 to-pink-600";
                                  if (lvl >= 5) return "from-blue-600 to-indigo-600";
                                  return "from-emerald-600 to-teal-600";
                                };

                                return (
                                  <div 
                                    key={seatNum} 
                                    onClick={(e) => handleSeatClick(e, actualSeat)}
                                    className="flex flex-col items-center space-y-1.5 group cursor-pointer hover:scale-105 transition duration-200"
                                  >
                                    <div className="relative">
                                      {/* Pulse speaking indicator ring */}
                                      {isSpeakingSimulated && (
                                        <span className="absolute -inset-2 bg-purple-500/30 rounded-full animate-pulse pointer-events-none" />
                                      )}
                                      
                                      {!isOccupied ? (
                                        <button
                                          className={`seat-button rounded-full flex flex-col items-center justify-center transition border border-dashed border-white/10 bg-[#100c1e] hover:bg-[#191433] hover:border-purple-500/30 relative ${seatSizeClass}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            handleOccupySeat(`seat_${seatNum}`);
                                          }}
                                        >
                                          {actualSeat.isLocked ? (
                                            <span className="text-zinc-600 text-xs">🔒</span>
                                          ) : (
                                            <span className="text-zinc-500 text-base font-light group-hover:text-purple-400 group-hover:font-bold transition">+</span>
                                          )}
                                          
                                          {/* Bottom-left small dark badge with seat number */}
                                          <span className={`absolute -bottom-1 -left-1 rounded-full bg-[#171328] border border-white/5 text-zinc-400 font-mono font-bold flex items-center justify-center shadow-md ${numBadgeClass}`}>
                                            {seatNum}
                                          </span>
                                        </button>
                                      ) : (
                                        <div className="seat-user relative">
                                          {/* Outer glowing border ring matching image */}
                                          <div className={`rounded-full p-0.5 shadow-lg transition-all duration-300 ${seatSizeClass} ${
                                            isSpeakingSimulated 
                                              ? "bg-gradient-to-tr from-purple-500 via-pink-500 to-indigo-500 animate-pulse ring-2 ring-purple-400" 
                                              : actualSeat.isVIP 
                                                ? "bg-gradient-to-tr from-amber-400 to-orange-500" 
                                                : "bg-gradient-to-tr from-zinc-700 to-zinc-800"
                                          }`}>
                                            <img 
                                              src={actualSeat.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"} 
                                              alt="" 
                                              className="w-full h-full rounded-full object-cover border border-black/10" 
                                            />
                                          </div>

                                          {/* Level Badge overlay at top-left */}
                                          {actualSeat.userLevel !== undefined && actualSeat.userLevel !== null && (
                                            <span className={`absolute -top-1.5 -left-1.5 bg-gradient-to-r ${getLevelColor(actualSeat.userLevel)} text-white text-[7px] font-black px-1 py-0.5 rounded shadow-md z-10 font-mono`}>
                                              L.{actualSeat.userLevel}
                                            </span>
                                          )}

                                          {/* VIP Badge overlay at top-right */}
                                          {actualSeat.isVIP && (
                                            <span className="absolute -top-1.5 -right-1 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-[7px] font-black px-1 py-0.5 rounded shadow-sm z-10">
                                              VIP
                                            </span>
                                          )}

                                          {/* Bottom-left seat number badge */}
                                          <span className={`absolute -bottom-1 -left-1 rounded-full bg-[#1c182a] border border-white/5 text-white font-mono font-bold flex items-center justify-center shadow-md z-10 ${numBadgeClass}`}>
                                            {seatNum}
                                          </span>

                                          {/* Mic status indicator on bottom-right */}
                                          <span className={`absolute -bottom-1 -right-1 rounded-full flex items-center justify-center border z-10 ${numBadgeClass} ${
                                            actualSeat.isMuted ? "bg-red-500 border-black/20 text-white" : "bg-emerald-500 border-black/20 text-white"
                                          }`}>
                                            {actualSeat.isMuted ? <MicOff className={micIconClass} /> : <Mic className={micIconClass} />}
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Seat Label text underneath */}
                                    <div className={`text-center ${textWidthClass}`}>
                                      {isOccupied ? (
                                        <div className="space-y-0.5">
                                          <p className="text-[9px] sm:text-[10px] font-bold text-white truncate drop-shadow-sm font-sans leading-none">
                                            {actualSeat.username}
                                          </p>
                                          {isSpeakingSimulated && (
                                            <p className="text-[6px] sm:text-[7px] font-black text-emerald-400 uppercase tracking-widest animate-pulse leading-none">Talking</p>
                                          )}
                                        </div>
                                      ) : (
                                        <p className="text-[8px] sm:text-[9px] font-medium text-zinc-500 truncate font-sans">
                                          {seatPlaceholder}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* View requests to join stage button */}
                    {(isHosting || currentUser?.uid === activeStream.creatorId) && requests.length > 0 && (
                      <div className="text-center pt-2">
                        <button
                          onClick={() => setShowRequestsModal(true)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase px-5 py-2.5 rounded-full border border-indigo-500/20 flex items-center gap-1.5 mx-auto cursor-pointer shadow-lg active:scale-95 transition"
                        >
                          <UserCheck className="w-4 h-4" />
                          <span>Join Requests ({requests.length})</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Video Stream Layout */
                  <div className="w-full h-full max-w-4xl mx-auto relative flex items-center justify-center bg-black rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
                    <div 
                      ref={videoContainerRef} 
                      className="w-full h-full rounded-2xl overflow-hidden bg-black flex items-center justify-center relative inset-0 absolute"
                    >
                      {/* Fallback local / virtual stream video element if Agora is not actively broadcasting, or if we are the host showing local camera preview */}
                      {(!agoraBroadcasting || currentUser?.uid === activeStream?.creatorId) && (
                        <video 
                          ref={videoRef} 
                          autoPlay 
                          playsInline 
                          muted={currentUser?.uid === activeStream?.creatorId ? true : isMuted} 
                          className="w-full h-full object-cover absolute inset-0 z-0" 
                        />
                      )}
                    </div>
                    <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur border border-white/5 px-3 py-1.5 rounded-xl flex items-center gap-2 z-10">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                      <span className="text-[10px] font-mono tracking-widest font-black uppercase text-zinc-200">BROADCASTING IN HD</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Gifting Toolbar for Video stream & interactive toolbar */}
              <div className="p-4 bg-zinc-950 border-t border-white/5 shrink-0 relative">
                
                {/* 1. COMPACT SOCIAL Gifting PANEL (Inline slide-up sheet) */}
                {showCompactGiftPanel && compactGiftReceiver && (
                  <div className="absolute bottom-full left-0 right-0 bg-[#0c0817] border-t border-white/10 rounded-t-3xl p-4 space-y-4 shadow-2xl z-50 animate-slide-up">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-pink-500" />
                        <h5 className="text-xs font-bold uppercase tracking-wider text-white">Compact Gift Sender</h5>
                      </div>
                      <button 
                        onClick={() => {
                          setShowCompactGiftPanel(false);
                          setCompactGiftReceiver(null);
                        }} 
                        className="text-zinc-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* All occupied seats selection scroll container */}
                    <div className="space-y-1.5">
                      <p className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Select Recipient:</p>
                      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                        {/* Gift Yourself Option */}
                        {currentUser && (
                          <button 
                            onClick={() => setCompactGiftReceiver({ id: currentUser.uid, name: currentUser.username || currentUser.displayName || "Me", photo: currentUser.photoURL || "" })}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border transition whitespace-nowrap ${
                              compactGiftReceiver.id === currentUser.uid
                                ? "bg-indigo-500/20 border-indigo-500 text-indigo-400"
                                : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
                            }`}
                          >
                            <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
                            <span>👤 Myself (Gift Yourself)</span>
                          </button>
                        )}
                        {/* Always include Host */}
                        <button 
                          onClick={() => setCompactGiftReceiver({ id: activeStream.creatorId, name: activeStream.creatorName, photo: activeStream.creatorPhoto || "" })}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border transition whitespace-nowrap ${
                            compactGiftReceiver.id === activeStream.creatorId
                              ? "bg-amber-500/20 border-amber-500 text-amber-400"
                              : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
                          }`}
                        >
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          <span>👑 {activeStream.creatorName} (Host)</span>
                        </button>
                        {/* Guests in seats */}
                        {seatsArray
                          .filter(s => s.userId !== null && s.userId !== activeStream.creatorId)
                          .map(guestSeat => (
                            <button
                              key={guestSeat.id}
                              onClick={() => setCompactGiftReceiver({ id: guestSeat.userId!, name: guestSeat.username, photo: guestSeat.photoURL })}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border transition whitespace-nowrap ${
                                compactGiftReceiver.id === guestSeat.userId
                                  ? "bg-pink-500/20 border-pink-500 text-pink-400"
                                  : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
                              }`}
                            >
                              <img src={guestSeat.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=40"} className="w-4 h-4 rounded-full object-cover" alt="" />
                              <span>{guestSeat.username} (Seat {guestSeat.id.split("_")[1]})</span>
                            </button>
                          ))}
                      </div>
                    </div>

                    {/* Compact Categories Selector */}
                    <div className="flex gap-1 overflow-x-auto pb-1.5 scrollbar-none border-b border-white/5">
                      {["All", "Popular", "African Vibe", "Music", "Hype", "Elite"].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setCompactGiftCategory(cat)}
                          className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider whitespace-nowrap transition border ${
                            compactGiftCategory === cat
                              ? "bg-[#7c3aed] text-white border-[#7c3aed]"
                              : "bg-white/5 text-zinc-400 hover:bg-white/10 border-transparent"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {/* Gifts Grid selection */}
                    <div className="grid grid-cols-4 gap-2.5 max-h-[165px] overflow-y-auto pr-0.5 scrollbar-thin">
                      {DEFAULT_GIFTS
                        .filter((g) => compactGiftCategory === "All" || g.category === compactGiftCategory)
                        .map((g) => (
                          <button
                            key={g.id}
                            onClick={async () => {
                              if (!currentUser) return;
                              try {
                                if (activeStream.activeBattleId) {
                                  await sendBattleGift(
                                    currentUser.uid,
                                    currentUser.username || currentUser.displayName || "User",
                                    currentUser.photoURL || "",
                                    compactGiftReceiver.id,
                                    compactGiftReceiver.name,
                                    activeStream.id,
                                    g,
                                    activeStream.activeBattleId
                                  );
                                } else {
                                  await sendGift(
                                    currentUser.uid,
                                    currentUser.username || currentUser.displayName || "User",
                                    currentUser.photoURL || "",
                                    compactGiftReceiver.id,
                                    compactGiftReceiver.name,
                                    activeStream.id,
                                    g
                                  );
                                }
                                handleGiftSentCallback(g.name);
                                setShowCompactGiftPanel(false);
                              } catch (err: any) {
                                alert(err.message || "Failed to send virtual gift.");
                              }
                            }}
                            className="flex flex-col items-center p-2 bg-zinc-900 border border-white/5 rounded-xl hover:bg-white/5 transition"
                          >
                            <span className="text-2xl mb-1 filter drop-shadow-sm select-none">{g.icon}</span>
                            <span className="text-[9px] font-black text-white uppercase truncate w-full text-center">{g.name}</span>
                            <span className="text-[8px] font-mono text-zinc-400 mt-0.5 flex items-center gap-0.5">
                              <Coins className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                              {g.cost}
                            </span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* 2. MUSIC PLAYLIST & independent volume panel drawer overlay */}
                {showMusicPlaylistPanel && (
                  <div className="absolute bottom-full left-0 right-0 bg-[#08050e] border-t border-white/10 rounded-t-3xl p-4 space-y-4 shadow-2xl z-55 animate-slide-up max-h-[380px] overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Radio className="w-4 h-4 text-pink-500" />
                        <h5 className="text-xs font-bold uppercase tracking-wider text-white">Stage Playlist & Volume controllers</h5>
                      </div>
                      <button onClick={() => setShowMusicPlaylistPanel(false)} className="text-zinc-400 hover:text-white">
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
                  <div className="absolute bottom-full left-0 right-0 bg-[#07040a] border-t border-white/10 rounded-t-3xl p-4 space-y-4 shadow-2xl z-55 animate-slide-up max-h-[380px] overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-amber-500" />
                        <h5 className="text-xs font-black uppercase tracking-wider text-white">⚔️ Live PK Battle Zone</h5>
                      </div>
                      <button onClick={() => setShowPKPanel(false)} className="text-zinc-400 hover:text-white">
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

                <div className="flex items-center justify-between gap-4">
                  {/* Left: Media and control toggles */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        const newMute = !isMuted;
                        setIsMuted(newMute);
                        
                        // Sync with Firestore seat if user is on a seat
                        if (currentUser && activeStream) {
                          const userSeat = seatsArray.find(s => s.userId === currentUser.uid);
                          if (userSeat) {
                            await handleToggleGuestMute(userSeat.id, !newMute);
                          }
                        }
                      }}
                      className={`p-2.5 rounded-xl border transition cursor-pointer ${
                        isMuted 
                          ? "bg-red-500/10 border-red-500/30 text-red-400" 
                          : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                      }`}
                      title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
                    >
                      {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
                      className={`p-2.5 rounded-xl border transition cursor-pointer ${
                        isSpeakerMuted 
                          ? "bg-red-500/10 border-red-500/30 text-red-400" 
                          : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                      }`}
                      title={isSpeakerMuted ? "Unmute Speaker" : "Mute Speaker"}
                    >
                      {isSpeakerMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>

                    {/* Open Mic Toggle (Host only, Audio Rooms only) */}
                    {(isHosting || currentUser?.uid === activeStream.creatorId) && activeStream.type === "audio" && (
                      <button
                        onClick={handleToggleOpenMic}
                        className={`p-2.5 rounded-xl border transition cursor-pointer text-xs font-black uppercase flex items-center gap-1.5 ${
                          openMicEnabled 
                            ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" 
                            : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                        }`}
                        title="Toggle Open Mic mode"
                      >
                        <Shield className="w-4 h-4" />
                        <span className="hidden sm:inline">{openMicEnabled ? "Open Mic ON" : "Open Mic OFF"}</span>
                      </button>
                    )}
                  </div>

                  {/* Right: Social & Interactive triggers */}
                  <div className="flex items-center gap-2">
                    {/* Room music playlist button */}
                    <button
                      onClick={() => setShowMusicPlaylistPanel(!showMusicPlaylistPanel)}
                      className={`p-2.5 rounded-xl border transition cursor-pointer text-xs font-bold uppercase flex items-center gap-1.5 ${
                        showMusicPlaylistPanel ? "bg-pink-500/20 border-pink-500 text-pink-400" : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Radio className="w-4 h-4" />
                      <span className="hidden sm:inline">🎵 Playlist</span>
                    </button>

                    {/* Room Settings & More controls button (Hosts only, Audio Rooms only) */}
                    {(isHosting || currentUser?.uid === activeStream.creatorId) && activeStream.type === "audio" && (
                      <button
                        onClick={() => {
                          setRoomSettingsTab("layout");
                          setShowRoomSettingsModal(true);
                        }}
                        className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition cursor-pointer text-xs font-black uppercase flex items-center gap-1.5 shadow-lg"
                      >
                        <Settings className="w-4 h-4 text-indigo-400" />
                        <span className="hidden sm:inline">⚙️ Room Settings</span>
                      </button>
                    )}

                    {/* Compact Gift panel trigger */}
                    <button
                      onClick={() => {
                        setCompactGiftReceiver({ id: activeStream.creatorId, name: activeStream.creatorName, photo: activeStream.creatorPhoto || "" });
                        setShowCompactGiftPanel(!showCompactGiftPanel);
                      }}
                      className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 uppercase transition border-none cursor-pointer shadow-lg shadow-amber-500/20"
                    >
                      <Gift className="w-4 h-4 fill-black" />
                      <span>Gift Panel</span>
                    </button>

                    {/* Likes Heart Button */}
                    <button
                      onClick={handleSendHeart}
                      className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:text-white hover:bg-red-500/25 transition cursor-pointer"
                      title="Send Heart"
                    >
                      <Heart className="w-4 h-4 fill-red-500" />
                    </button>
                  </div>
                </div>
              </div>

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
                              setCompactGiftReceiver({
                                id: activeSeatMenu!.seat.userId!,
                                name: activeSeatMenu!.seat.username,
                                photo: activeSeatMenu!.seat.photoURL
                              });
                              setShowCompactGiftPanel(true);
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
            <div className="w-full md:w-80 h-[50vh] md:h-full flex flex-col justify-between bg-[#0a0611] select-none">
              
              {/* Tab Bar switcher: All, Room, Chat */}
              <div className="flex border-b border-white/5 shrink-0">
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
                      <p className="font-extrabold text-zinc-400 uppercase tracking-widest">Boomplay Live Feed</p>
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
                                  setCompactGiftReceiver({
                                    id: msg.senderId,
                                    name: msg.senderName,
                                    photo: msg.senderPhoto || ""
                                  });
                                  setShowCompactGiftPanel(true);
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

              {/* Boomplay Quick Reaction Emoji Bar */}
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

              {/* Boomplay Selected Comment Context Menu */}
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
                          setCompactGiftReceiver({
                            id: selectedComment.senderId,
                            name: selectedComment.senderName,
                            photo: selectedComment.senderPhoto || ""
                          });
                          setShowCompactGiftPanel(true);
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
          <h3 className="font-sans font-bold text-lg text-white uppercase tracking-tight flex items-center gap-2">
            <Radio className="w-4.5 h-4.5 text-pink-500 animate-pulse" />
            Active {activeLayout === "audio" ? "Audio Spaces" : "Video Streams"} ({sortedDiscoveryStreams.length})
          </h3>

          {sortedDiscoveryStreams.length === 0 ? (
            <div className="py-20 text-center text-zinc-500 border border-dashed border-white/5 rounded-3xl bg-white/[0.01] space-y-3">
              <Radio className="w-10 h-10 text-zinc-650 mx-auto animate-pulse" />
              <p className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">No active streams found in this selection</p>
              <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">Be the first to schedule an upcoming show or go live instantly using our HD streaming engine!</p>
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
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b0814] border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h4 className="font-bold text-xs uppercase tracking-widest text-zinc-100 flex items-center gap-1.5 font-mono">
                  <UserCheck className="w-4 h-4 text-indigo-400" />
                  Host Profile Menu
                </h4>
                <button 
                  onClick={() => setShowHostProfileMenu(false)} 
                  className="text-zinc-500 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* View Profile Card */}
              <div className="bg-gradient-to-br from-[#1b153a] to-[#0f0927] border border-indigo-500/30 p-4.5 rounded-2xl shadow-xl space-y-3.5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center gap-4">
                  <img 
                    src={activeStream.creatorPhoto || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"} 
                    alt="Host Avatar" 
                    className="w-14 h-14 rounded-full border-2 border-indigo-500 object-cover shadow-lg" 
                  />
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-black text-white">{activeStream.creatorName || "Fredo Host"}</span>
                      {currentUserAudioProfile?.badges?.includes("VIP") && (
                        <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-black text-[7px] font-black px-1.5 py-0.5 rounded shadow-sm">
                          VIP
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-indigo-400 font-mono font-bold mt-0.5">
                      Stream Host • Creator Level {currentUserAudioProfile?.level || 10}
                    </p>
                  </div>
                </div>
                {currentUserAudioProfile?.bio ? (
                  <p className="text-[11px] text-zinc-300 italic font-medium bg-black/30 p-2.5 rounded-xl border border-white/5">
                    "{currentUserAudioProfile.bio}"
                  </p>
                ) : (
                  <p className="text-[10px] text-zinc-500 italic bg-black/10 p-2.5 rounded-xl border border-white/5">
                    No bio set yet. Customise this in profile settings below.
                  </p>
                )}
              </div>

              <div className="space-y-4 pt-1">
                {/* Edit Profile Action */}
                <div className="space-y-1.5">
                  <span className="text-[9px] uppercase font-black tracking-widest text-zinc-500 font-mono">Profile Identity</span>
                  <button
                    onClick={() => {
                      setShowHostProfileMenu(false);
                      setShowEditAudioProfileModal(true);
                    }}
                    className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <FileEdit className="w-3.5 h-3.5 text-teal-400" />
                      Edit Profile Card details
                    </span>
                    <span className="text-[10px] text-zinc-500">Edit →</span>
                  </button>
                </div>

                {/* Change Panel Name */}
                <div className="space-y-2">
                  <span className="text-[9px] uppercase font-black tracking-widest text-zinc-500 font-mono">Change Panel Name (Title)</span>
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
                          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-extrabold px-4 py-2 rounded-xl text-xs uppercase cursor-pointer"
                        >
                          {updating ? "Saving" : "Save"}
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* Change Panel Avatar */}
                <div className="space-y-2">
                  <span className="text-[9px] uppercase font-black tracking-widest text-zinc-500 font-mono">Change Panel Avatar (Cover)</span>
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
                            await updateDoc(doc(db, "liveStreams", activeStream.id), {
                              creatorPhoto: preset,
                              thumbnailUrl: preset
                            });
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

                {/* Creator Profile Settings */}
                <div className="space-y-2 bg-white/2 border border-white/5 p-3 rounded-2xl">
                  <span className="text-[9px] uppercase font-black tracking-widest text-zinc-400 font-mono block mb-2">Creator Profile Settings</span>
                  
                  {currentUserAudioProfile && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zinc-300 font-mono">Display VIP Badge</span>
                        <button
                          onClick={async () => {
                            const currentBadges = currentUserAudioProfile.badges || [];
                            const updatedBadges = currentBadges.includes("VIP") 
                              ? currentBadges.filter((b: string) => b !== "VIP")
                              : [...currentBadges, "VIP"];
                            try {
                              await updateDoc(doc(db, "audio_profiles", currentUser.uid), {
                                badges: updatedBadges
                              });
                            } catch (e) {
                              console.warn(e);
                            }
                          }}
                          className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition cursor-pointer ${
                            currentUserAudioProfile.badges?.includes("VIP")
                              ? "bg-amber-500 text-black font-bold"
                              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                          }`}
                        >
                          {currentUserAudioProfile.badges?.includes("VIP") ? "VIP Enabled" : "VIP Disabled"}
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zinc-300 font-mono">Level Up Creator Profile</span>
                        <button
                          onClick={async () => {
                            const newLevel = (currentUserAudioProfile.level || 1) + 1;
                            try {
                              await updateDoc(doc(db, "audio_profiles", currentUser.uid), {
                                level: newLevel
                              });
                            } catch (e) {
                              console.warn(e);
                            }
                          }}
                          className="px-3 py-1 rounded-lg text-[9px] font-bold uppercase transition cursor-pointer bg-indigo-650 text-indigo-200 hover:bg-indigo-600"
                        >
                          Level: {currentUserAudioProfile.level || 1} ⚡
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Stage Seat Controls for Host */}
                {currentUser?.uid === activeStream.creatorId && (
                  <div className="space-y-2 bg-white/2 border border-white/5 p-3 rounded-2xl">
                    <span className="text-[9px] uppercase font-black tracking-widest text-zinc-400 font-mono block mb-2">Stage Seat Controls</span>
                    
                    {(() => {
                      const hostSeat = seatsArray.find(s => s.userId === currentUser.uid);
                      const isOnSeat1 = hostSeat?.id === "seat_1" || (!hostSeat && seatsArray.length > 0 && !seatsArray.find(s => s.id === "seat_1")?.userId);
                      const currentHostSeatId = hostSeat?.id || (isOnSeat1 ? "seat_1" : null);

                      return (
                        <div className="space-y-3">
                          {currentHostSeatId ? (
                            <div className="space-y-2.5">
                              <p className="text-[10px] text-zinc-400">
                                You are currently on <span className="font-bold text-white font-mono uppercase">{currentHostSeatId.replace("_", " ")}</span>.
                              </p>
                              
                              <button
                                onClick={async () => {
                                  setShowHostProfileMenu(false);
                                  await handleRemoveGuest(currentHostSeatId);
                                }}
                                className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
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
                                    // Check if this seat is empty
                                    const seatObj = seatsArray.find(s => s.id === seatId);
                                    const isOccupied = seatObj ? seatObj.userId !== null : (seatNum === 1); // seat 1 might be occupied by host by fallback
                                    const isLocked = seatObj?.isLocked || false;

                                    if (seatId === currentHostSeatId || isOccupied || isLocked) return null;

                                    return (
                                      <button
                                        key={seatId}
                                        onClick={async () => {
                                          setShowHostProfileMenu(false);
                                          await handleMoveSeat(currentHostSeatId, seatId);
                                        }}
                                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white px-2.5 py-1 rounded-lg text-[10px] transition font-bold cursor-pointer"
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
                                <span className="text-[8px] uppercase font-black tracking-widest text-zinc-500 font-mono block mb-1.5">
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
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowHostProfileMenu(false)}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-black py-2.5 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Close Menu
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
