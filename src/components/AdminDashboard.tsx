import React, { useEffect, useState } from "react";
import { 
  Users, 
  Music, 
  Video, 
  X, 
  ShieldCheck, 
  Search, 
  UserX, 
  UserCheck, 
  Trash2, 
  Star, 
  TrendingUp, 
  Clock,
  FileAudio, 
  FolderLock, 
  HardDrive,
  BarChart3,
  Globe,
  Tag,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Info,
  Download,
  Key,
  Smartphone,
  Lock,
  MessageSquare,
  Scale,
  Settings,
  Play,
  Pause,
  Plus,
  Send,
  Database,
  Terminal,
  Activity,
  FileText,
  Megaphone,
  Calendar,
  ShieldAlert,
  Globe2,
  Users2,
  Flame,
  Trophy,
  Chrome
} from "lucide-react";
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs,
  setDoc,
  addDoc
} from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { monetizationService } from "../lib/monetizationService";
import { User, Artist, Song, Playlist, Album, ShortVideo, CreatorWallet, Payout, Subscription, LiveStream } from "../types";
import { motion, AnimatePresence } from "motion/react";
import GoogleConsolePanel from "./GoogleConsolePanel";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";

interface AdminDashboardProps {
  songs: Song[];
  artists: Artist[];
  playlists: Playlist[];
  currentUser: User | null;
}

export default function AdminDashboard({
  songs,
  artists,
  playlists,
  currentUser
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Real-time Synced Firestore Collections
  const [shortsList, setShortsList] = useState<ShortVideo[]>([]);
  const [liveStreamsList, setLiveStreamsList] = useState<LiveStream[]>([]);
  const [reportsList, setReportsList] = useState<any[]>([]);
  const [albumsList, setAlbumsList] = useState<Album[]>([]);
  const [messagesList, setMessagesList] = useState<any[]>([]);
  const [payoutsList, setPayoutsList] = useState<Payout[]>([]);
  const [subscriptionsList, setSubscriptionsList] = useState<Subscription[]>([]);
  const [creatorWalletsList, setCreatorWalletsList] = useState<CreatorWallet[]>([]);
  const [activeBattles, setActiveBattles] = useState<any[]>([]);
  const [pkDurationInput, setPkDurationInput] = useState<string>("5");

  // Platform system settings config (with real-time Firestore sync)
  const [systemConfig, setSystemConfig] = useState({
    maintenanceMode: false,
    registrationEnabled: true,
    uploadLimitMb: 50,
    losslessStreaming: true,
    monetizationEnabled: true,
    adsEnabled: true,
    shortsEnabled: true,
    livestreamEnabled: true,
    chatEnabled: true,
    royaltyRatePerStream: 0.0035, // configurable royalty rate
    battleDurationMinutes: 5,
  });

  // Global search across all platform entities
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [showGlobalSearchResults, setShowGlobalSearchResults] = useState(false);

  // Announcement and targeting states
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [announcementTarget, setAnnouncementTarget] = useState<"all" | "listener" | "artist" | "admin" | "creator" | "moderator">("all");
  const [announcementScheduledTime, setAnnouncementScheduledTime] = useState("");
  const [announcementPushAlert, setAnnouncementPushAlert] = useState(false);

  // Content moderation subtab selector
  const [moderationSubTab, setModerationSubTab] = useState<"songs" | "albums" | "shorts" | "livestreams" | "comments" | "playlists">("songs");
  const [reportsFilter, setReportsFilter] = useState<"all" | "copyright" | "dmca" | "spam" | "harassment" | "fake">("all");

  // Custom royalty payout state per artist
  const [selectedArtistForRoyalty, setSelectedArtistForRoyalty] = useState<Artist | null>(null);
  const [customRoyaltyInput, setCustomRoyaltyInput] = useState<string>("0.0035");

  // Security Monitor Mock logs (failed logins, device sessions, alerts)
  const [failedLogins, setFailedLogins] = useState([
    { id: "f-1", email: "malicious_user@gmail.com", ip: "198.51.100.42", timestamp: new Date(Date.now() - 300000).toISOString(), device: "Linux Chrome", reason: "Invalid Password MD5 Hash mismatch" },
    { id: "f-2", email: "hacker_pro@yahoo.com", ip: "203.0.113.88", timestamp: new Date(Date.now() - 1200000).toISOString(), device: "Android Safari", reason: "Rapid password brute-force detection (3 attempts)" },
    { id: "f-3", email: "fredwilliamcurso@gmail.com", ip: "41.82.19.14", timestamp: new Date(Date.now() - 3600000).toISOString(), device: "Windows Chrome", reason: "MFA Token Expired" }
  ]);

  const [activeSessions, setActiveSessions] = useState([
    { id: "s-1", username: "fredwilliamcurso", email: "fredwilliamcurso@gmail.com", device: "MacBook Pro - Safari", location: "Lagos, NG", ip: "41.82.19.14", activeAt: "Just now" },
    { id: "s-2", username: "burna_boy", email: "burna@soundstream.io", device: "iPhone 15 - App", location: "London, UK", ip: "82.165.12.91", activeAt: "3 mins ago" },
    { id: "s-3", username: "alex_beats", email: "alex@soundstream.com", device: "Windows Desktop - Chrome", location: "Lagos, NG", ip: "102.89.2.144", activeAt: "12 mins ago" }
  ]);

  const [securityAlerts, setSecurityAlerts] = useState([
    { id: "a-1", severity: "high", title: "Brute-Force Bracketing Alert", description: "IP 203.0.113.88 triggered a login rate limit rule on account hacker_pro@yahoo.com.", timestamp: new Date(Date.now() - 1200000).toISOString() },
    { id: "a-2", severity: "medium", title: "Foreign Geolocation Ingress", description: "Account burna_boy logged in from London, UK (previously Lagos, NG) in under 1 hour.", timestamp: new Date(Date.now() - 1800000).toISOString() }
  ]);

  useEffect(() => {
    const handleAdminTabChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (typeof customEvent.detail === "string") {
        setActiveTab(customEvent.detail);
      }
    };
    window.addEventListener("set-admin-tab", handleAdminTabChange);
    return () => window.removeEventListener("set-admin-tab", handleAdminTabChange);
  }, []);
  
  // Real-time Firestore Users State
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // Search and filter states
  const [userSearch, setUserSearch] = useState<string>("");
  const [artistSearch, setArtistSearch] = useState<string>("");
  const [contentSearch, setContentSearch] = useState<string>("");
  const [contentFilter, setContentFilter] = useState<"all" | "songs" | "videos" | "featured" | "flagged">("all");
  
  // User activity details
  const [selectedUserActivity, setSelectedUserActivity] = useState<User | null>(null);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [loadingActivity, setLoadingActivity] = useState<boolean>(false);

  // Invite/Create Admin state
  const [inviteEmail, setInviteEmail] = useState<string>("");
  const [inviteUsername, setInviteUsername] = useState<string>("");
  const [loadingInvite, setLoadingInvite] = useState<boolean>(false);

  // Song playback preview state
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  const [audioPreview, setAudioPreview] = useState<HTMLAudioElement | null>(null);

  // Video embed preview state
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

  // Firebase connection health test
  const [testingFirebase, setTestingFirebase] = useState<boolean>(false);
  const [firebaseStatus, setFirebaseStatus] = useState<"connected" | "failed" | null>(null);

  // Support inquiry response state
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>("");
  
  // Simulated activity log list
  const [activityLogs, setActivityLogs] = useState<Array<{ id: string; time: string; type: "info" | "warn" | "success"; text: string }>>([
    { id: "log-1", time: new Date(Date.now() - 3600000 * 2).toLocaleTimeString(), type: "success", text: "Governance system booted. Initial Superadmin role active." },
    { id: "log-2", time: new Date(Date.now() - 3600000).toLocaleTimeString(), type: "info", text: "Real-time user snapshot connection established." },
    { id: "log-3", time: new Date().toLocaleTimeString(), type: "success", text: "Admin console dashboard modules fully initialized." }
  ]);

  // Support inquiries list
  const [supportInquiries, setSupportInquiries] = useState([
    { id: "t-1", name: "Femi Alabi", email: "femi.alabi@gmail.com", topic: "Premium upgrade failed", message: "Hey, I tried upgrading to premium today but the checkout page returned an error saying payment was declined. I have been debited.", resolved: false, date: "2026-06-25" },
    { id: "t-2", name: "Burna Star", email: "burna.star@soundstream.io", topic: "Artist Badge Verification", message: "Hello SoundStream team! I have uploaded my latest 3 Afrobeats lossless singles and I am getting great traction. Could I please get the verified creator badge?", resolved: false, date: "2026-06-26" },
    { id: "t-3", name: "Kemi Odu", email: "kemi@soundstream.com", topic: "Video Playback freeze", message: "Whenever I watch the trending Amapiano video mixes, the player freezes for 3 seconds on track transition. Is this a cache issue?", resolved: true, date: "2026-06-24" }
  ]);

  // Legal documentation editor states
  const [legalTerms, setLegalTerms] = useState<string>(
    "Welcome to SoundStream. By accessing our high-fidelity lossless audio and video streaming service, you agree to comply with our Terms of Service. Users are prohibited from uploading copyrighted materials without explicit written licensing. Administrators reserve the right to suspend any account violating compliance rules immediately."
  );
  const [legalPrivacy, setLegalPrivacy] = useState<string>(
    "Your privacy is crucial to us. SoundStream collects user account information including email and device identifiers solely to optimize streaming bitrates and handle premium subscription configurations. We never sell user metrics or behavioral trackers to unauthorized advertisers."
  );

  // Monetization control values
  const [adsRatio, setAdsRatio] = useState<number>(30);
  const [adsMultiplier, setAdsMultiplier] = useState<number>(1.5);
  const [paymentGatewayOnline, setPaymentGatewayOnline] = useState<boolean>(true);

  // Android release build states
  const [buildStatus, setBuildStatus] = useState<{
    built: boolean;
    aab: { exists: boolean; size: string; modifiedAt: string };
    keystore: { exists: boolean; size: string; modifiedAt: string };
    packageName: string;
    versionCode: number;
    versionName: string;
    keyAlias: string;
    timestamp: string | null;
  } | null>(null);
  const [loadingBuild, setLoadingBuild] = useState<boolean>(false);
  const [isBuilding, setIsBuilding] = useState<boolean>(false);
  const [buildLogs, setBuildLogs] = useState<string>("");
  const [buildError, setBuildError] = useState<string | null>(null);
  const [buildSuccess, setBuildSuccess] = useState<boolean>(false);

  // Live Management States
  const [selectedLiveStream, setSelectedLiveStream] = useState<LiveStream | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [streamToDelete, setStreamToDelete] = useState<LiveStream | null>(null);
  const [deleteActionType, setDeleteActionType] = useState<"permanently_delete" | "delete_doc" | "delete_chat" | "delete_gifts" | "delete_peers" | "delete_thumbnail">("permanently_delete");
  const [isDeletingData, setIsDeletingData] = useState<boolean>(false);

  // Handle Admin Livestream deletion actions
  const processAdminDeleteAction = async () => {
    if (!streamToDelete) return;
    setIsDeletingData(true);

    try {
      const streamId = streamToDelete.id;

      if (deleteActionType === "delete_doc") {
        await deleteDoc(doc(db, "liveStreams", streamId));
        setActionMessage({ type: "success", text: "Firestore liveStream document deleted successfully." });
      } else if (deleteActionType === "delete_chat") {
        const chatCol = collection(db, "liveStreams", streamId, "chat");
        const snap = await getDocs(chatCol);
        await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
        setActionMessage({ type: "success", text: "Chat history cleared successfully." });
      } else if (deleteActionType === "delete_gifts") {
        const qGifts = query(collection(db, "gift_transactions"), where("streamId", "==", streamId));
        const snap = await getDocs(qGifts);
        await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
        setActionMessage({ type: "success", text: "Associated gift transaction records cleared successfully." });
      } else if (deleteActionType === "delete_peers") {
        const peersCol = collection(db, "liveStreams", streamId, "peers");
        const snap = await getDocs(peersCol);
        await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
        setActionMessage({ type: "success", text: "Viewer stats and connection peers cleared successfully." });
      } else if (deleteActionType === "delete_thumbnail") {
        await updateDoc(doc(db, "liveStreams", streamId), { thumbnailUrl: "" });
        setActionMessage({ type: "success", text: "Thumbnail reference removed successfully." });
      } else if (deleteActionType === "permanently_delete") {
        // Chat
        try {
          const chatCol = collection(db, "liveStreams", streamId, "chat");
          const chatSnap = await getDocs(chatCol);
          await Promise.all(chatSnap.docs.map(d => deleteDoc(d.ref)));
        } catch (e) { console.warn("Failed deleting chat", e); }
        
        // Gifts
        try {
          const qGifts = query(collection(db, "gift_transactions"), where("streamId", "==", streamId));
          const giftSnap = await getDocs(qGifts);
          await Promise.all(giftSnap.docs.map(d => deleteDoc(d.ref)));
        } catch (e) { console.warn("Failed deleting gifts", e); }
        
        // Peers
        try {
          const peersCol = collection(db, "liveStreams", streamId, "peers");
          const peersSnap = await getDocs(peersCol);
          await Promise.all(peersSnap.docs.map(d => deleteDoc(d.ref)));
        } catch (e) { console.warn("Failed deleting peers", e); }
        
        // Doc
        await deleteDoc(doc(db, "liveStreams", streamId));
        
        setActionMessage({ type: "success", text: "Livestream and all associated databases fully purged from SoundStream." });
        
        // Close detail view if currently open
        if (selectedLiveStream?.id === streamId) {
          setSelectedLiveStream(null);
        }
      }
      
      // Auto-hide action message after 4s
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setActionMessage({ type: "error", text: `Wipe action failed: ${err.message}` });
    } finally {
      setIsDeletingData(false);
      setShowDeleteConfirm(false);
      setStreamToDelete(null);
    }
  };

  // Subscribe to all users and collections in real-time
  useEffect(() => {
    setLoadingUsers(true);
    const unsub = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const usersList = snapshot.docs.map((d) => {
          const item = d.data();
          return {
            uid: d.id,
            id: d.id,
            username: item.username || item.displayName || "User",
            email: item.email || "",
            photoURL: item.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80",
            createdAt: item.createdAt || new Date().toISOString(),
            role: item.role || "listener",
            isSuspended: item.isSuspended || false
          } as User;
        });
        setAllUsers(usersList);
        setLoadingUsers(false);
      },
      (error) => {
        console.error("Failed to fetch all users:", error);
        setLoadingUsers(false);
        setAllUsers([
          { uid: "demo1", id: "demo1", username: "alex_beats", email: "alex@soundstream.com", createdAt: "2026-05-15T12:00:00Z", role: "artist" },
          { uid: "demo2", id: "demo2", username: "sarah_jazz", email: "sarah@jazzsound.io", createdAt: "2026-05-18T14:30:00Z", role: "artist", isSuspended: true },
          { uid: "demo3", id: "demo3", username: "mikey_vibe", email: "mikey@vibe.net", createdAt: "2026-06-01T08:15:00Z", role: "listener" },
          { uid: "demo4", id: "demo4", username: "fredwilliamcurso", email: "fredwilliamcurso@gmail.com", createdAt: "2026-06-12T09:00:00Z", role: "admin" },
        ]);
      }
    );

    // Sync Shorts
    const unsubShorts = onSnapshot(collection(db, "shorts"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      if (data.length === 0) {
        setShortsList([
          { id: "v1", videoId: "v1", title: "Amapiano Dance Mix Pt. 1", videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", creatorId: "demo1", creatorName: "alex_beats", views: 1250, likes: 450, comments: 22, createdAt: new Date().toISOString() } as any
        ]);
      } else {
        setShortsList(data);
      }
    }, (err) => console.log("Shorts subscription skipped:", err));

    // Sync LiveStreams
    const unsubLive = onSnapshot(collection(db, "liveStreams"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      if (data.length === 0) {
        setLiveStreamsList([
          { id: "stream1", title: "Midnight Studio Jam Session", artistId: "demo1", artistName: "alex_beats", status: "live", viewerCount: 840, startedAt: new Date().toISOString() } as any
        ]);
      } else {
        setLiveStreamsList(data);
      }
    }, (err) => console.log("LiveStreams subscription skipped:", err));

    // Sync Reports
    const unsubReports = onSnapshot(collection(db, "reports"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      if (data.length === 0) {
        setReportsList([
          { id: "rep1", videoId: "v1", videoTitle: "Amapiano Dance Mix Pt. 1", reporterId: "demo3", reporterName: "mikey_vibe", reason: "Copyright infringement - Unlicensed sample in background", category: "copyright", createdAt: new Date(Date.now() - 3600000).toISOString() },
          { id: "rep2", songId: "song_1", songTitle: "Last Last (Afrobeats Master)", reporterId: "demo3", reporterName: "mikey_vibe", reason: "Spammy / repetitive upload of same track", category: "spam", createdAt: new Date(Date.now() - 7200000).toISOString() }
        ]);
      } else {
        setReportsList(data);
      }
    }, (err) => console.log("Reports subscription skipped:", err));

    // Sync Albums
    const unsubAlbums = onSnapshot(collection(db, "albums"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setAlbumsList(data);
    }, (err) => console.log("Albums subscription skipped:", err));

    // Sync ChatMessages
    const unsubMessages = onSnapshot(collection(db, "chatMessages"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setMessagesList(data);
    }, (err) => console.log("Messages subscription skipped:", err));

    // Sync Payouts
    const unsubPayouts = onSnapshot(collection(db, "payouts"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      if (data.length === 0) {
        setPayoutsList([
          { payoutId: "p_pay1", creatorId: "demo1", amount: 150.00, currency: "USD", provider: "stripe", email: "alex@soundstream.com", status: "pending", requestedAt: new Date(Date.now() - 86400000).toISOString() } as any,
          { payoutId: "p_pay2", creatorId: "demo2", amount: 320.50, currency: "USD", provider: "paypal", email: "sarah@jazzsound.io", status: "completed", requestedAt: new Date(Date.now() - 172800000).toISOString(), processedAt: new Date(Date.now() - 130000000).toISOString() } as any
        ]);
      } else {
        setPayoutsList(data);
      }
    }, (err) => console.log("Payouts subscription skipped:", err));

    // Sync Subscriptions
    const unsubSubscriptions = onSnapshot(collection(db, "subscriptions"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      if (data.length === 0) {
        setSubscriptionsList([
          { subscriptionId: "s_sub1", userId: "demo3", plan: "Premium Individual", status: "active", price: 9.99, currency: "USD", billingCycle: "monthly", startedAt: new Date(Date.now() - 259200000).toISOString(), expiresAt: new Date(Date.now() + 2332800000).toISOString(), renewalDate: null, paymentProvider: "stripe" },
          { subscriptionId: "s_sub2", userId: "demo2", plan: "Creator Pro", status: "active", price: 19.99, currency: "USD", billingCycle: "monthly", startedAt: new Date(Date.now() - 518400000).toISOString(), expiresAt: new Date(Date.now() + 2073600000).toISOString(), renewalDate: null, paymentProvider: "paypal" }
        ]);
      } else {
        setSubscriptionsList(data);
      }
    }, (err) => console.log("Subscriptions subscription skipped:", err));

    // Sync Creator Wallets
    const unsubWallets = onSnapshot(collection(db, "creator_wallets"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      if (data.length === 0) {
        setCreatorWalletsList([
          { walletId: "w_demo1", creatorId: "demo1", availableBalance: 150.00, pendingBalance: 45.20, totalEarnings: 450.00, totalWithdrawn: 300.00, currency: "USD", updatedAt: new Date().toISOString() },
          { walletId: "w_demo2", creatorId: "demo2", availableBalance: 85.00, pendingBalance: 12.00, totalEarnings: 150.00, totalWithdrawn: 65.00, currency: "USD", updatedAt: new Date().toISOString() }
        ]);
      } else {
        setCreatorWalletsList(data);
      }
    }, (err) => console.log("Wallets subscription skipped:", err));

    // Sync System Config
    const unsubConfig = onSnapshot(doc(db, "system", "config"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setSystemConfig(prev => ({ ...prev, ...data }));
        if (data.battleDurationMinutes) {
          setPkDurationInput(String(data.battleDurationMinutes));
        }
      }
    }, (err) => console.log("Config subscription skipped:", err));

    // Sync Active PK Battles
    const activeBattlesQuery = query(
      collection(db, "live_battles"),
      where("status", "==", "active")
    );
    const unsubActiveBattles = onSnapshot(activeBattlesQuery, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setActiveBattles(list);
    }, (err) => console.log("Active battles subscription skipped:", err));

    return () => {
      unsub();
      unsubShorts();
      unsubLive();
      unsubReports();
      unsubAlbums();
      unsubMessages();
      unsubPayouts();
      unsubSubscriptions();
      unsubWallets();
      unsubConfig();
      unsubActiveBattles();
      if (audioPreview) {
        audioPreview.pause();
      }
    };
  }, []);

  // Fetch current build configuration and artifacts status from server
  const fetchBuildStatus = async () => {
    setLoadingBuild(true);
    try {
      const res = await fetch("/api/admin/build-status", {
        headers: {
          "x-admin-email": currentUser?.email || "",
          "x-admin-uid": currentUser?.uid || ""
        }
      });
      if (res.ok) {
        const data = await res.json();
        setBuildStatus(data);
      }
    } catch (e) {
      console.error("Error fetching build status:", e);
    } finally {
      setLoadingBuild(false);
    }
  };

  useEffect(() => {
    if (activeTab === "android" && currentUser) {
      fetchBuildStatus();
    }
  }, [activeTab, currentUser]);

  // Handler to trigger the compilation script
  const handleTriggerBuild = async () => {
    if (isBuilding) return;
    setIsBuilding(true);
    setBuildError(null);
    setBuildSuccess(false);
    setBuildLogs("Initializing production build environment...\nCompiling web application assets...\n");

    try {
      const res = await fetch("/api/admin/build-android", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-email": currentUser?.email || "",
          "x-admin-uid": currentUser?.uid || ""
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBuildLogs(data.log);
        setBuildSuccess(true);
        logActivity("success", "Android compilation completed successfully.");
        fetchBuildStatus();
      } else {
        setBuildError(data.error || "An error occurred during compilation.");
        if (data.log) {
          setBuildLogs(data.log);
        }
        logActivity("warn", `Android compilation failed: ${data.error || "Unknown Error"}`);
      }
    } catch (e: any) {
      setBuildError(e.message || "Network error. Failed to trigger build.");
    } finally {
      setIsBuilding(false);
    }
  };

  // Fetch activity for selected user
  useEffect(() => {
    if (!selectedUserActivity) {
      setUserPlaylists([]);
      return;
    }
    setLoadingActivity(true);
    const playlistsOwned = playlists.filter(
      p => p.ownerId === selectedUserActivity.uid || p.userId === selectedUserActivity.uid || p.createdBy === selectedUserActivity.uid
    );
    setUserPlaylists(playlistsOwned);
    setLoadingActivity(false);
  }, [selectedUserActivity, playlists]);

  const showFeedback = (type: "success" | "error", text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 4000);
  };

  const logActivity = async (type: "info" | "warn" | "success", text: string) => {
    // 1. Update local state
    setActivityLogs(prev => [
      { id: `log-${Date.now()}`, time: new Date().toLocaleTimeString(), type, text },
      ...prev.slice(0, 49)
    ]);

    // 2. Persist in Firestore
    try {
      const logRef = doc(collection(db, "audit_logs"));
      await setDoc(logRef, {
        id: logRef.id,
        timestamp: new Date().toISOString(),
        adminEmail: currentUser?.email || "fredwilliamcurso@gmail.com",
        adminUid: currentUser?.uid || "admin",
        type,
        text
      });
    } catch (err) {
      console.warn("Failed to persist audit log in Firestore:", err);
    }
  };

  // User Actions
  const handleToggleSuspendUser = async (user: User) => {
    try {
      const userRef = doc(db, "users", user.uid);
      const newSuspendedState = !user.isSuspended;
      await updateDoc(userRef, { isSuspended: newSuspendedState });
      
      if (user.role === "artist") {
        const artistRef = doc(db, "artists", user.uid);
        await updateDoc(artistRef, { isSuspended: newSuspendedState }).catch(() => {});
      }

      showFeedback("success", `Account ${user.username} successfully ${newSuspendedState ? "SUSPENDED" : "UNSUSPENDED"}`);
      logActivity(newSuspendedState ? "warn" : "success", `Suspension state of user ${user.username} changed to ${newSuspendedState}`);
    } catch (err) {
      showFeedback("error", `Failed to update user status: ${err instanceof Error ? err.message : "Access Denied"}`);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!window.confirm(`Are you absolutely sure you want to permanently delete user "${username}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, "users", userId));
      await deleteDoc(doc(db, "artists", userId)).catch(() => {});
      showFeedback("success", `Permanently deleted user account: ${username}`);
      logActivity("warn", `Deleted user account ${username}`);
      if (selectedUserActivity?.uid === userId) {
        setSelectedUserActivity(null);
      }
    } catch (err) {
      showFeedback("error", `Failed to delete account: ${err instanceof Error ? err.message : "Access Denied"}`);
    }
  };

  const handleToggleAdminRole = async (user: User) => {
    try {
      const userRef = doc(db, "users", user.uid);
      const newRole = user.role === "admin" ? "listener" : "admin";
      await updateDoc(userRef, { 
        role: newRole,
        isAdmin: newRole === "admin"
      });
      showFeedback("success", `Updated ${user.username} role to ${newRole.toUpperCase()}`);
      logActivity("success", `Toggled admin role for ${user.username} to ${newRole}`);
    } catch (err) {
      showFeedback("error", `Failed to modify role: ${err instanceof Error ? err.message : "Access Denied"}`);
    }
  };

  const handleUpdateUserInfo = async (userId: string, updatedData: { username?: string; email?: string }) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        ...updatedData,
        updatedAt: new Date().toISOString()
      });
      showFeedback("success", `User details updated successfully.`);
      logActivity("success", `Updated details for user ID ${userId}`);
    } catch (err) {
      showFeedback("error", `Failed to update user details: ${err instanceof Error ? err.message : "Access Denied"}`);
    }
  };

  const handleBanUser = async (user: User) => {
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        isSuspended: true,
        isBanned: true,
        role: "banned"
      });
      if (user.role === "artist") {
        await updateDoc(doc(db, "artists", user.uid), { isSuspended: true, isBanned: true }).catch(() => {});
      }
      showFeedback("success", `Account ${user.username} has been permanently BANNED.`);
      logActivity("warn", `Permanently banned user account ${user.username} (${user.email})`);
    } catch (err) {
      showFeedback("error", `Failed to ban user: ${err instanceof Error ? err.message : "Access Denied"}`);
    }
  };

  const handleResetUserPassword = async (email: string) => {
    if (!email) {
      showFeedback("error", "Email is required to reset password.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      showFeedback("success", `Password reset link sent to ${email}`);
      logActivity("success", `Triggered password reset email for ${email}`);
    } catch (err) {
      showFeedback("error", `Failed to send password reset: ${err instanceof Error ? err.message : "Access Denied"}`);
    }
  };

  const handleAssignUserRole = async (user: User, newRole: string) => {
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        role: newRole,
        isAdmin: newRole === "admin"
      });
      if (newRole === "artist" || newRole === "creator") {
        // Create an artist entry if it doesn't exist
        const artistRef = doc(db, "artists", user.uid);
        await setDoc(artistRef, {
          artistId: user.uid,
          artistName: user.username,
          isVerified: true,
          followersCount: 0,
          monthlyListeners: 0,
          isSuspended: false,
          joinedAt: new Date().toISOString()
        }, { merge: true });
      }
      showFeedback("success", `Role assigned successfully: ${user.username} is now ${newRole.toUpperCase()}`);
      logActivity("success", `Assigned role "${newRole}" to user ${user.username}`);
    } catch (err) {
      showFeedback("error", `Failed to assign role: ${err instanceof Error ? err.message : "Access Denied"}`);
    }
  };

  // Promoter / Account creator tool for admins
  const handlePromoteAdminByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setLoadingInvite(true);
    try {
      const trimmedEmail = inviteEmail.trim().toLowerCase();
      
      // Look up user with this email in local list
      const matched = allUsers.find(u => u.email.toLowerCase() === trimmedEmail);
      if (matched) {
        // Update user record to admin
        const userRef = doc(db, "users", matched.uid);
        await updateDoc(userRef, {
          role: "admin",
          isAdmin: true
        });
        showFeedback("success", `Successfully promoted existing user ${matched.username} to ADMIN`);
        logActivity("success", `Promoted ${matched.email} to Administrator role.`);
      } else {
        // Create user placeholder document so they get promoted as soon as they sign up
        const placeholderUid = `pre-admin-${Date.now()}`;
        const userRef = doc(db, "users", placeholderUid);
        await setDoc(userRef, {
          uid: placeholderUid,
          email: trimmedEmail,
          username: inviteUsername.trim() || trimmedEmail.split("@")[0],
          role: "admin",
          isAdmin: true,
          photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80",
          createdAt: new Date().toISOString(),
          isSuspended: false
        });
        showFeedback("success", `Created pre-allocated ADMIN account for email: ${trimmedEmail}`);
        logActivity("success", `Allocated pre-authorized Admin account for ${trimmedEmail}`);
      }
      setInviteEmail("");
      setInviteUsername("");
    } catch (err) {
      showFeedback("error", `Failed to invite admin: ${err instanceof Error ? err.message : "Access Denied"}`);
    } finally {
      setLoadingInvite(false);
    }
  };

  // Artist Actions
  const handleToggleVerifyArtist = async (artist: Artist) => {
    try {
      const artistRef = doc(db, "artists", artist.uid);
      const newVerified = !artist.verified;
      await updateDoc(artistRef, { verified: newVerified });
      showFeedback("success", `${artist.artistName} verification ${newVerified ? "GRANTED" : "REVOKED"}`);
      logActivity("success", `Verification of artist ${artist.artistName} set to ${newVerified}`);
    } catch (err) {
      showFeedback("error", `Failed to verify artist: ${err instanceof Error ? err.message : "Access Denied"}`);
    }
  };

  const handleToggleSuspendArtist = async (artist: Artist) => {
    try {
      const artistRef = doc(db, "artists", artist.uid);
      const isSuspendedVal = !(artist as any).isSuspended;
      await updateDoc(artistRef, { isSuspended: isSuspendedVal });
      
      const userRef = doc(db, "users", artist.uid);
      await updateDoc(userRef, { isSuspended: isSuspendedVal }).catch(() => {});

      showFeedback("success", `Artist profile ${artist.artistName} is now ${isSuspendedVal ? "SUSPENDED" : "ACTIVE"}`);
      logActivity("warn", `Changed artist suspension for ${artist.artistName} to ${isSuspendedVal}`);
    } catch (err) {
      showFeedback("error", `Failed to suspend artist: ${err instanceof Error ? err.message : "Access Denied"}`);
    }
  };

  const handleToggleFeatureArtist = async (artist: Artist) => {
    try {
      const artistRef = doc(db, "artists", artist.uid);
      const isFeaturedVal = !(artist as any).isFeatured;
      await updateDoc(artistRef, { isFeatured: isFeaturedVal });
      showFeedback("success", `${artist.artistName} featured badge ${isFeaturedVal ? "ENABLED" : "DISABLED"}`);
      logActivity("success", `Set artist ${artist.artistName} featured attribute to ${isFeaturedVal}`);
    } catch (err) {
      showFeedback("error", `Failed to feature artist: ${err instanceof Error ? err.message : "Access Denied"}`);
    }
  };

  // Payout & Wallet Actions
  const handleApprovePayout = async (payout: Payout) => {
    try {
      const payoutRef = doc(db, "payouts", payout.payoutId);
      await updateDoc(payoutRef, {
        status: "completed",
        processedAt: new Date().toISOString()
      });
      await monetizationService.sendNotification(
        payout.creatorId,
        "Payout Completed Successfully",
        `Your payout of $${payout.amount.toFixed(2)} via ${payout.provider.toUpperCase()} has been processed and deposited into your account.`,
        "payout_complete"
      );
      showFeedback("success", `Payout request approved and completed.`);
      logActivity("success", `Approved payout ${payout.payoutId} of $${payout.amount} for creator ${payout.creatorId}`);
    } catch (err) {
      showFeedback("error", `Failed to approve payout: ${err instanceof Error ? err.message : "Access Denied"}`);
    }
  };

  const handleRejectPayout = async (payout: Payout, reason: string) => {
    if (!reason) {
      showFeedback("error", "Please provide a reason for rejection.");
      return;
    }
    try {
      const payoutRef = doc(db, "payouts", payout.payoutId);
      await updateDoc(payoutRef, {
        status: "failed",
        processedAt: new Date().toISOString(),
        errorMessage: reason
      });

      // Refund the amount to the creator's wallet
      const walletRef = doc(db, "creator_wallets", payout.creatorId);
      const walletSnap = await getDocs(query(collection(db, "creator_wallets"), where("creatorId", "==", payout.creatorId)));
      if (!walletSnap.empty) {
        const walletDoc = walletSnap.docs[0];
        const walletData = walletDoc.data() as CreatorWallet;
        await updateDoc(doc(db, "creator_wallets", walletDoc.id), {
          availableBalance: (walletData.availableBalance || 0) + payout.amount,
          totalWithdrawn: Math.max(0, (walletData.totalWithdrawn || 0) - payout.amount),
          updatedAt: new Date().toISOString()
        });
      }

      await monetizationService.sendNotification(
        payout.creatorId,
        "Payout Request Declined",
        `Your payout of $${payout.amount.toFixed(2)} was rejected. Reason: ${reason}. Funds have been refunded to your wallet.`,
        "payment_fail"
      );
      showFeedback("success", `Payout request rejected and funds returned to wallet.`);
      logActivity("warn", `Rejected payout ${payout.payoutId} for creator ${payout.creatorId}. Reason: ${reason}`);
    } catch (err) {
      showFeedback("error", `Failed to reject payout: ${err instanceof Error ? err.message : "Access Denied"}`);
    }
  };

  const handleDeletePayout = async (payoutId: string) => {
    if (!window.confirm("Are you sure you want to delete this payout record permanently?")) return;
    try {
      await deleteDoc(doc(db, "payouts", payoutId));
      showFeedback("success", `Payout record ${payoutId} deleted successfully.`);
      logActivity("warn", `Deleted payout record ${payoutId}`);
    } catch (err) {
      showFeedback("error", `Failed to delete payout record: ${err instanceof Error ? err.message : "Access Denied"}`);
    }
  };

  const handleSettlePendingFunds = async (creatorId: string) => {
    try {
      const updated = await monetizationService.settlePendingFunds(creatorId);
      if (updated) {
        showFeedback("success", `Pending balances settled to available wallet for creator ${creatorId}`);
        logActivity("success", `Administratively settled pending balances into wallet for ${creatorId}`);
      } else {
        showFeedback("error", `No pending funds to settle or wallet not found.`);
      }
    } catch (err) {
      showFeedback("error", `Failed to settle balances: ${err instanceof Error ? err.message : "Access Denied"}`);
    }
  };

  const handleUpdateRoyaltyRate = async (artistId: string, newRate: number) => {
    try {
      const artistRef = doc(db, "artists", artistId);
      await updateDoc(artistRef, {
        customRoyaltyRate: newRate
      });
      showFeedback("success", `Custom royalty rate updated to $${newRate.toFixed(4)} per stream.`);
      logActivity("success", `Set custom streaming royalty rate of $${newRate} for artist ${artistId}`);
    } catch (err) {
      showFeedback("error", `Failed to update royalty rate: ${err instanceof Error ? err.message : "Access Denied"}`);
    }
  };

  // Songs & Content Actions
  const handleToggleFeatureSong = async (song: Song) => {
    try {
      const songRef = doc(db, "songs", song.id);
      const newFeaturedVal = !(song as any).isFeatured;
      await updateDoc(songRef, { isFeatured: newFeaturedVal });
      showFeedback("success", `Song "${song.title}" feature status changed to ${newFeaturedVal ? "FEATURED" : "STANDARD"}`);
      logActivity("success", `Toggled featured state of track "${song.title}" to ${newFeaturedVal}`);
    } catch (err) {
      showFeedback("error", `Failed to update track features: ${err instanceof Error ? err.message : "Access Denied"}`);
    }
  };

  const handleToggleModerateSong = async (song: Song) => {
    try {
      const songRef = doc(db, "songs", song.id);
      const newModeratedVal = !(song as any).isModerated;
      await updateDoc(songRef, { isModerated: newModeratedVal });
      showFeedback("success", `Track "${song.title}" flag updated. Visibility is now ${newModeratedVal ? "RESTRICTED" : "PUBLIC"}`);
      logActivity("warn", `Moderated track "${song.title}" flag updated to ${newModeratedVal}`);
    } catch (err) {
      showFeedback("error", `Failed to flag song: ${err instanceof Error ? err.message : "Access Denied"}`);
    }
  };

  const handleDeleteSong = async (songId: string, songTitle: string) => {
    if (!window.confirm(`Are you absolutely sure you want to permanently delete track "${songTitle}" from SoundStream database? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, "songs", songId));
      showFeedback("success", `Track "${songTitle}" permanently deleted from catalog.`);
      logActivity("warn", `Permanently deleted song "${songTitle}"`);
    } catch (err) {
      showFeedback("error", `Failed to delete track: ${err instanceof Error ? err.message : "Access Denied"}`);
    }
  };

  // Album Moderation Actions
  const handleToggleModerateAlbum = async (albumId: string, albumTitle: string, currentModerated: boolean) => {
    try {
      const albumRef = doc(db, "albums", albumId);
      const newVal = !currentModerated;
      await updateDoc(albumRef, { isModerated: newVal });
      showFeedback("success", `Album "${albumTitle}" status updated. Visibility restricted: ${newVal}`);
      logActivity("warn", `Toggled moderation state of album "${albumTitle}" to ${newVal}`);
    } catch (err) {
      showFeedback("error", `Failed to moderate album: ${err instanceof Error ? err.message : "Access Denied"}`);
    }
  };

  const handleDeleteAlbum = async (albumId: string, albumTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete album "${albumTitle}"?`)) return;
    try {
      await deleteDoc(doc(db, "albums", albumId));
      showFeedback("success", `Album "${albumTitle}" deleted.`);
      logActivity("warn", `Deleted album "${albumTitle}"`);
    } catch (err) {
      showFeedback("error", `Failed to delete album: ${err instanceof Error ? err.message : "Access Denied"}`);
    }
  };

  // Shorts Moderation Actions
  const handleToggleModerateShort = async (videoId: string, videoTitle: string, currentModerated: boolean) => {
    try {
      const shortRef = doc(db, "shorts", videoId);
      const newVal = !currentModerated;
      await updateDoc(shortRef, { 
        isModerated: newVal,
        status: newVal ? "rejected" : "approved"
      });
      showFeedback("success", `Video Short "${videoTitle}" status updated.`);
      logActivity("warn", `Toggled moderation of video short "${videoTitle}" to ${newVal}`);
    } catch (err) {
      showFeedback("error", `Failed to moderate video: ${err instanceof Error ? err.message : "Access Denied"}`);
    }
  };

  const handleDeleteShort = async (videoId: string, videoTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete video short "${videoTitle}"?`)) return;
    try {
      await deleteDoc(doc(db, "shorts", videoId));
      showFeedback("success", `Video short "${videoTitle}" deleted.`);
      logActivity("warn", `Deleted video short "${videoTitle}"`);
    } catch (err) {
      showFeedback("error", `Failed to delete video: ${err instanceof Error ? err.message : "Access Denied"}`);
    }
  };

  // Livestream Moderation Actions
  const handleToggleModerateStream = async (streamId: string, streamTitle: string, currentModerated: boolean) => {
    try {
      const streamRef = doc(db, "liveStreams", streamId);
      const newVal = !currentModerated;
      await updateDoc(streamRef, { isModerated: newVal });
      showFeedback("success", `Livestream "${streamTitle}" moderation status updated.`);
      logActivity("warn", `Toggled moderation of livestream "${streamTitle}" to ${newVal}`);
    } catch (err) {
      showFeedback("error", `Failed to moderate livestream: ${err instanceof Error ? err.message : "Access Denied"}`);
    }
  };

  const handleEndStream = async (streamId: string, streamTitle: string) => {
    try {
      const streamRef = doc(db, "liveStreams", streamId);
      await updateDoc(streamRef, { status: "ended", isModerated: true });
      showFeedback("success", `Livestream "${streamTitle}" was terminated administratively.`);
      logActivity("warn", `Administratively ended active livestream: "${streamTitle}"`);
    } catch (err) {
      showFeedback("error", `Failed to terminate stream: ${err instanceof Error ? err.message : "Access Denied"}`);
    }
  };

  const handleDeleteStream = async (streamId: string, streamTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete livestream record "${streamTitle}"?`)) return;
    try {
      await deleteDoc(doc(db, "liveStreams", streamId));
      showFeedback("success", `Livestream record "${streamTitle}" deleted.`);
      logActivity("warn", `Deleted livestream record "${streamTitle}"`);
    } catch (err) {
      showFeedback("error", `Failed to delete stream record: ${err instanceof Error ? err.message : "Access Denied"}`);
    }
  };

  // Comments Moderation Actions
  const handleToggleModerateComment = async (commentId: string, currentModerated: boolean) => {
    try {
      const commentRef = doc(db, "chatMessages", commentId);
      const newVal = !currentModerated;
      await updateDoc(commentRef, { 
        isModerated: newVal,
        isHidden: newVal
      });
      showFeedback("success", `Comment moderation updated.`);
      logActivity("warn", `Toggled moderation state of comment ID ${commentId} to ${newVal}`);
    } catch (err) {
      // Fallback if collection name is 'comments'
      try {
        await updateDoc(doc(db, "comments", commentId), { isModerated: !currentModerated, isHidden: !currentModerated });
        showFeedback("success", `Comment moderation updated.`);
      } catch (innerErr) {
        showFeedback("error", `Failed to moderate comment: ${err instanceof Error ? err.message : "Access Denied"}`);
      }
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    try {
      await deleteDoc(doc(db, "chatMessages", commentId));
      showFeedback("success", `Comment deleted.`);
      logActivity("warn", `Deleted comment ID ${commentId}`);
    } catch (err) {
      try {
        await deleteDoc(doc(db, "comments", commentId));
        showFeedback("success", `Comment deleted.`);
      } catch {
        showFeedback("error", `Failed to delete comment: ${err instanceof Error ? err.message : "Access Denied"}`);
      }
    }
  };

  // Playlists Moderation Actions
  const handleToggleModeratePlaylist = async (playlistId: string, playlistTitle: string, currentModerated: boolean) => {
    try {
      const playlistRef = doc(db, "playlists", playlistId);
      const newVal = !currentModerated;
      await updateDoc(playlistRef, { 
        isModerated: newVal,
        isPublic: newVal ? false : true
      });
      showFeedback("success", `Playlist "${playlistTitle}" status updated. Public access restricted: ${newVal}`);
      logActivity("warn", `Toggled moderation of playlist "${playlistTitle}" to ${newVal}`);
    } catch (err) {
      showFeedback("error", `Failed to moderate playlist: ${err instanceof Error ? err.message : "Access Denied"}`);
    }
  };

  const handleDeletePlaylist = async (playlistId: string, playlistTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete playlist "${playlistTitle}"?`)) return;
    try {
      await deleteDoc(doc(db, "playlists", playlistId));
      showFeedback("success", `Playlist "${playlistTitle}" deleted.`);
      logActivity("warn", `Deleted playlist "${playlistTitle}"`);
    } catch (err) {
      showFeedback("error", `Failed to delete playlist: ${err instanceof Error ? err.message : "Access Denied"}`);
    }
  };

  // Announcements Publishing and Targeting
  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle || !announcementBody) {
      showFeedback("error", "Title and Body are required.");
      return;
    }
    try {
      const announcementId = "ann_" + Math.random().toString(36).substr(2, 9);
      const isScheduled = !!announcementScheduledTime;
      const announcementData = {
        id: announcementId,
        title: announcementTitle,
        body: announcementBody,
        targetRole: announcementTarget,
        scheduledTime: announcementScheduledTime || null,
        isScheduled,
        createdAt: new Date().toISOString(),
        published: !isScheduled
      };

      await setDoc(doc(db, "announcements", announcementId), announcementData);

      // If not scheduled, dispatch live notifications to matched users
      if (!isScheduled) {
        const targetUsers = allUsers.filter(u => announcementTarget === "all" || u.role === announcementTarget);
        for (const targetUser of targetUsers) {
          await monetizationService.sendNotification(
            targetUser.uid,
            announcementTitle,
            announcementBody,
            "subscription_renew"
          ).catch(() => {});
        }
      }

      showFeedback("success", isScheduled ? "Announcement scheduled successfully!" : "Announcement published to all matched users!");
      logActivity("success", `${isScheduled ? "Scheduled" : "Published"} announcement "${announcementTitle}" targeting ${announcementTarget.toUpperCase()}`);
      
      // Clear form
      setAnnouncementTitle("");
      setAnnouncementBody("");
      setAnnouncementScheduledTime("");
      setAnnouncementPushAlert(false);
    } catch (err) {
      showFeedback("error", `Failed to publish announcement: ${err instanceof Error ? err.message : "Access Denied"}`);
    }
  };

  const handleUpdateSystemConfig = async (updatedFields: Partial<typeof systemConfig>) => {
    try {
      const configRef = doc(db, "system", "config");
      await setDoc(configRef, updatedFields, { merge: true });
      showFeedback("success", "System configuration updated in real-time!");
      logActivity("success", `Modified system settings: ${Object.keys(updatedFields).join(", ")}`);
    } catch (err) {
      showFeedback("error", `Failed to update system config: ${err instanceof Error ? err.message : "Access Denied"}`);
    }
  };

  const handleSavePkDuration = async (e: React.FormEvent) => {
    e.preventDefault();
    const duration = parseInt(pkDurationInput, 10);
    if (isNaN(duration) || duration < 1 || duration > 60) {
      showFeedback("error", "Please configure a valid duration between 1 and 60 minutes.");
      return;
    }
    try {
      await handleUpdateSystemConfig({ battleDurationMinutes: duration });
      showFeedback("success", `Default PK Battle Duration updated to ${duration} minutes.`);
    } catch (err: any) {
      showFeedback("error", `Failed to update duration: ${err.message || err}`);
    }
  };

  const handleForceEndBattle = async (battleId: string) => {
    if (!window.confirm("Are you sure you want to forcefully terminate this battle? This will stop the countdown timer and finalize scores immediately.")) return;
    try {
      const { endBattle } = await import("../lib/battleService");
      await endBattle(battleId, true);
      showFeedback("success", "Battle forcefully terminated successfully.");
      logActivity("warn", `Forcefully terminated PK Battle: ${battleId}`);
    } catch (err: any) {
      showFeedback("error", `Failed to terminate battle: ${err.message || err}`);
    }
  };

  // Preview play action
  const handlePreviewSong = (song: Song) => {
    if (playingSongId === song.id) {
      if (audioPreview) {
        audioPreview.pause();
      }
      setPlayingSongId(null);
    } else {
      if (audioPreview) {
        audioPreview.pause();
      }
      const audioUrl = song.audioUrl || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
      const newAudio = new Audio(audioUrl);
      newAudio.play().catch(e => console.log("Simulated audio play"));
      setAudioPreview(newAudio);
      setPlayingSongId(song.id);
      logActivity("info", `Previewing audio track: "${song.title}"`);
    }
  };

  // Test Firebase connection health
  const handleTestFirebase = async () => {
    setTestingFirebase(true);
    setFirebaseStatus(null);
    try {
      // Perform quick set / get
      const tempRef = doc(db, "system_diagnostics", "connection_test");
      await setDoc(tempRef, {
        timestamp: new Date().toISOString(),
        testedBy: currentUser?.email || "admin"
      });
      setFirebaseStatus("connected");
      logActivity("success", "Firebase Firestore collection diagnostic read/write succeeded.");
    } catch (e) {
      console.error(e);
      setFirebaseStatus("failed");
      logActivity("warn", "Firebase Firestore diagnostic connection failed.");
    } finally {
      setTestingFirebase(false);
    }
  };

  // Handle Support inquiry replies
  const handleResolveInquiry = (id: string) => {
    setSupportInquiries(prev => 
      prev.map(item => item.id === id ? { ...item, resolved: true } : item)
    );
    showFeedback("success", "Support ticket marked as RESOLVED");
    logActivity("success", `Resolved support ticket ${id}`);
    setSelectedInquiryId(null);
    setReplyText("");
  };

  const handleSendSupportReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText) return;
    showFeedback("success", "Response transmitted to customer email successfully!");
    logActivity("success", `Sent support reply: "${replyText.substring(0, 30)}..."`);
    if (selectedInquiryId) {
      handleResolveInquiry(selectedInquiryId);
    }
  };

  // platform calculation helpers
  const totalUsers = allUsers.length;
  const totalArtists = artists.length;
  const totalSongsAll = songs.length;
  const totalSongsOnly = songs.filter(s => !s.videoUrl).length;
  const totalVideos = songs.filter(s => !!s.videoUrl).length;
  const totalPlaylists = playlists.length;
  const totalStreams = songs.reduce((sum, s) => sum + (s.playCount || 0), 0);
  const estimatedStorageMB = (totalSongsOnly * 4.5) + (totalVideos * 22.4);
  const estimatedStorageGB = (estimatedStorageMB / 1024).toFixed(2);
  const flaggedCount = songs.filter(s => (s as any).isModerated).length;

  // chart distributions
  const daudata = [
    { date: "06/20", dau: 340, streams: 1250 },
    { date: "06/21", dau: 395, streams: 1480 },
    { date: "06/22", dau: 420, streams: 1890 },
    { date: "06/23", dau: 510, streams: 2310 },
    { date: "06/24", dau: 480, streams: 2110 },
    { date: "06/25", dau: 560, streams: 2790 },
    { date: "06/26", dau: 610, streams: 3120 }
  ];

  const monetizationData = [
    { month: "Jan", revenue: 1420 },
    { month: "Feb", revenue: 1890 },
    { month: "Mar", revenue: 2430 },
    { month: "Apr", revenue: 3120 },
    { month: "May", revenue: 3850 },
    { month: "Jun", revenue: 4900 }
  ];

  const countryData = [
    { name: "Nigeria", value: 45, color: "#10b981" },
    { name: "United States", value: 20, color: "#3b82f6" },
    { name: "United Kingdom", value: 15, color: "#f59e0b" },
    { name: "South Africa", value: 12, color: "#ec4899" },
    { name: "Other", value: 8, color: "#6b7280" }
  ];

  // Filtering actions
  const filteredUsers = allUsers.filter(u => 
    u.username.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredArtists = artists.filter(a => 
    a.artistName.toLowerCase().includes(artistSearch.toLowerCase()) || 
    a.bio.toLowerCase().includes(artistSearch.toLowerCase())
  );

  const filteredContent = songs.filter(s => {
    const matchesSearch = s.title.toLowerCase().includes(contentSearch.toLowerCase()) || 
                          s.artistName.toLowerCase().includes(contentSearch.toLowerCase());
    if (!matchesSearch) return false;
    switch (contentFilter) {
      case "songs":
        return !s.videoUrl;
      case "videos":
        return !!s.videoUrl;
      case "featured":
        return !!(s as any).isFeatured;
      case "flagged":
        return !!(s as any).isModerated;
      default:
        return true;
    }
  });

  const genreCounts = songs.reduce((acc: { [key: string]: number }, song) => {
    acc[song.genre || "Unknown"] = (acc[song.genre || "Unknown"] || 0) + 1;
    return acc;
  }, {});

  const genreChartData = Object.entries(genreCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const displayGenreData = genreChartData.length > 0 ? genreChartData : [
    { name: "Afrobeats", count: 18 },
    { name: "Amapiano", count: 12 },
    { name: "Hip Hop", count: 9 },
    { name: "Fuji", count: 6 },
    { name: "Highlife", count: 5 }
  ];

  const dashboardTabs = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3, color: "text-indigo-400" },
    { id: "users", label: `Users (${allUsers.length || totalUsers})`, icon: Users, color: "text-emerald-400" },
    { id: "artists", label: `Artists (${artists.length || totalArtists})`, icon: ShieldCheck, color: "text-pink-400" },
    { id: "songs", label: `Songs (${songs.length || totalSongsOnly})`, icon: Music, color: "text-cyan-400" },
    { id: "videos", label: `Videos (${shortsList.length || totalVideos})`, icon: Video, color: "text-rose-400" },
    { id: "reports", label: `Reports (${reportsList.length || flaggedCount})`, icon: AlertTriangle, color: "text-amber-500" },
    { id: "pk-battles", label: `PK Battles (${activeBattles.length})`, icon: Flame, color: "text-pink-500" },
    { id: "live-management", label: `Live Management (${liveStreamsList.filter(s => s.status === "ended").length})`, icon: Activity, color: "text-red-500" },
    { id: "announcements", label: "Announcements", icon: Megaphone, color: "text-orange-400" },
    { id: "analytics", label: "Analytics", icon: TrendingUp, color: "text-teal-400" },
    { id: "monetization", label: "Monetization", icon: Tag, color: "text-yellow-400" },
    { id: "android", label: "Android Release", icon: Smartphone, color: "text-blue-400" },
    { id: "firebase", label: "Firebase", icon: HardDrive, color: "text-orange-500" },
    { id: "supabase", label: "Supabase", icon: Globe, color: "text-sky-400" },
    { id: "google-integrations", label: "Google Console", icon: Chrome, color: "text-blue-500" },
    { id: "support", label: `Support (${supportInquiries.filter(t => !t.resolved).length})`, icon: MessageSquare, color: "text-violet-400" },
    { id: "legal", label: "Legal & DMCA", icon: Scale, color: "text-stone-400" },
    { id: "security", label: "Security & Logs", icon: ShieldAlert, color: "text-red-400" },
    { id: "settings", label: "System Settings", icon: Settings, color: "text-purple-400" }
  ];

  const isAdmin = currentUser?.role === "admin" || currentUser?.email === "fredwilliamcurso@gmail.com";

  if (!isAdmin) {
    return (
      <div className="bg-zinc-950 min-h-[80vh] text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-zinc-900/60 border border-red-500/10 rounded-3xl p-8 text-center relative shadow-2xl">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-6 animate-pulse" />
          <h2 className="text-xl font-extrabold uppercase tracking-tight text-zinc-100 mb-2">Access Denied</h2>
          <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
            Your current account credentials lack Level 4 system administrator permissions. Please contact security if you believe this is an error.
          </p>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent("navigate-home"))} 
            className="w-full bg-stone-800 hover:bg-stone-700 text-zinc-300 font-bold py-3 rounded-xl transition-colors cursor-pointer uppercase tracking-wider font-mono text-[10px]"
          >
            Return to Music Feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="admin-dashboard-container" className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      
      {/* Feedback Alert */}
      <AnimatePresence>
        {actionMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 p-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              actionMessage.type === "success" 
                ? "bg-emerald-950/90 text-emerald-300 border-emerald-500/20" 
                : "bg-red-950/90 text-red-300 border-red-500/20"
            }`}
          >
            {actionMessage.type === "success" ? <ShieldCheck className="w-5 h-5 animate-bounce" /> : <AlertTriangle className="w-5 h-5 animate-pulse" />}
            <span className="font-sans text-xs font-semibold uppercase tracking-wider">{actionMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Embedded YouTube preview Modal */}
      {previewVideoUrl && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 max-w-2xl w-full relative">
            <button 
              onClick={() => setPreviewVideoUrl(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white font-bold font-mono text-xs uppercase cursor-pointer"
            >
              Close ✕
            </button>
            <h3 className="text-zinc-100 font-bold mb-4 uppercase tracking-wider font-mono text-sm">Video Release Monitor</h3>
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/5">
              <iframe 
                src={previewVideoUrl.replace("watch?v=", "embed/")} 
                className="w-full h-full"
                allowFullScreen
                title="Admin Video Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-500/10 text-indigo-400 p-2 rounded-xl border border-indigo-500/20">
              <FolderLock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-sans font-extrabold text-2xl tracking-tight text-white uppercase">
                  SoundStream Admin HQ
                </h1>
                <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[9px] font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                  LEVEL 4 SECURE
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Full governance, centralized catalog curation, release automation, and system diagnostics.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 flex items-center gap-3">
          <img 
            src={currentUser?.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80"} 
            alt="Admin Avatar" 
            className="w-8 h-8 rounded-full border border-white/10"
            referrerPolicy="no-referrer"
          />
          <div>
            <p className="font-mono text-[9px] text-zinc-500 uppercase tracking-wider">Active Admin</p>
            <p className="font-sans font-bold text-xs text-zinc-200">{currentUser?.username || currentUser?.email}</p>
          </div>
        </div>
      </div>

      {/* Global Command & Search Console */}
      <div className="bg-zinc-950/40 border border-white/5 rounded-3xl p-4 flex flex-col md:flex-row items-center gap-4 relative">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Global Search Across All Entities (Users, Artists, Songs, Videos, Playlists, Reports, Tickets)..."
            value={globalSearchQuery}
            onChange={(e) => {
              setGlobalSearchQuery(e.target.value);
              setShowGlobalSearchResults(e.target.value.trim().length > 0);
            }}
            onFocus={() => {
              if (globalSearchQuery.trim().length > 0) setShowGlobalSearchResults(true);
            }}
            className="w-full bg-zinc-950/85 border border-white/5 rounded-2xl pl-11 pr-4 py-3 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-stone-500 font-mono tracking-wide"
          />
          {globalSearchQuery && (
            <button
              onClick={() => {
                setGlobalSearchQuery("");
                setShowGlobalSearchResults(false);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 hover:text-white uppercase font-mono font-bold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Global Search Results Dropdown */}
        <AnimatePresence>
          {showGlobalSearchResults && globalSearchQuery && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute left-0 right-0 top-full mt-2 z-40 bg-zinc-900/95 backdrop-blur border border-white/10 rounded-3xl shadow-2xl p-5 max-h-[350px] overflow-y-auto space-y-4"
            >
              {/* Users Result */}
              {allUsers.filter(u => (u.username || "").toLowerCase().includes(globalSearchQuery.toLowerCase()) || (u.email || "").toLowerCase().includes(globalSearchQuery.toLowerCase())).length > 0 && (
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-2 border-b border-white/5 pb-1">Users</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {allUsers.filter(u => (u.username || "").toLowerCase().includes(globalSearchQuery.toLowerCase()) || (u.email || "").toLowerCase().includes(globalSearchQuery.toLowerCase())).slice(0, 4).map(u => (
                      <button
                        key={u.uid}
                        onClick={() => {
                          setActiveTab("users");
                          setUserSearch(u.username);
                          setShowGlobalSearchResults(false);
                          showFeedback("success", `Filtered users by: ${u.username}`);
                        }}
                        className="flex items-center gap-3 p-2 bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 rounded-xl text-left transition-colors cursor-pointer"
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                        <div>
                          <p className="font-sans font-bold text-xs text-zinc-200">{u.username}</p>
                          <p className="font-mono text-[9px] text-zinc-500">{u.email} • {u.role?.toUpperCase()}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Artists Result */}
              {artists.filter(a => (a.artistName || "").toLowerCase().includes(globalSearchQuery.toLowerCase())).length > 0 && (
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-2 border-b border-white/5 pb-1">Artists</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {artists.filter(a => (a.artistName || "").toLowerCase().includes(globalSearchQuery.toLowerCase())).slice(0, 4).map(a => (
                      <button
                        key={a.uid}
                        onClick={() => {
                          setActiveTab("artists");
                          setArtistSearch(a.artistName);
                          setShowGlobalSearchResults(false);
                          showFeedback("success", `Filtered artists by: ${a.artistName}`);
                        }}
                        className="flex items-center gap-3 p-2 bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 rounded-xl text-left transition-colors cursor-pointer"
                      >
                        <span className="w-2 h-2 rounded-full bg-pink-400 shrink-0" />
                        <div>
                          <p className="font-sans font-bold text-xs text-zinc-200">{a.artistName}</p>
                          <p className="font-mono text-[9px] text-zinc-500">{a.followersCount || 0} Followers • {(a as any).monthlyListeners || 0} Listeners</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Songs Result */}
              {songs.filter(s => (s.title || "").toLowerCase().includes(globalSearchQuery.toLowerCase())).length > 0 && (
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-2 border-b border-white/5 pb-1">Songs</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {songs.filter(s => (s.title || "").toLowerCase().includes(globalSearchQuery.toLowerCase())).slice(0, 4).map(s => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setActiveTab("songs");
                          setContentSearch(s.title);
                          setShowGlobalSearchResults(false);
                          showFeedback("success", `Filtered songs by: ${s.title}`);
                        }}
                        className="flex items-center gap-3 p-2 bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 rounded-xl text-left transition-colors cursor-pointer"
                      >
                        <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                        <div>
                          <p className="font-sans font-bold text-xs text-zinc-200">{s.title}</p>
                          <p className="font-mono text-[9px] text-zinc-500">Artist ID: {s.artistId} • Genre: {s.genre || "N/A"}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Reports Result */}
              {reportsList.filter(r => (r.videoTitle || r.songTitle || "").toLowerCase().includes(globalSearchQuery.toLowerCase()) || (r.reason || "").toLowerCase().includes(globalSearchQuery.toLowerCase())).length > 0 && (
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-2 border-b border-white/5 pb-1">Reports</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {reportsList.filter(r => (r.videoTitle || r.songTitle || "").toLowerCase().includes(globalSearchQuery.toLowerCase()) || (r.reason || "").toLowerCase().includes(globalSearchQuery.toLowerCase())).slice(0, 4).map(r => (
                      <button
                        key={r.id}
                        onClick={() => {
                          setActiveTab("reports");
                          setShowGlobalSearchResults(false);
                          showFeedback("success", `Navigated to Reports queue.`);
                        }}
                        className="flex items-center gap-3 p-2 bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 rounded-xl text-left transition-colors cursor-pointer"
                      >
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                        <div>
                          <p className="font-sans font-bold text-xs text-zinc-200">{r.videoTitle || r.songTitle || "Reported Item"}</p>
                          <p className="font-mono text-[9px] text-zinc-500">Category: {r.category || "N/A"} • Reason: {r.reason}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {allUsers.filter(u => (u.username || "").toLowerCase().includes(globalSearchQuery.toLowerCase())).length === 0 &&
               artists.filter(a => (a.artistName || "").toLowerCase().includes(globalSearchQuery.toLowerCase())).length === 0 &&
               songs.filter(s => (s.title || "").toLowerCase().includes(globalSearchQuery.toLowerCase())).length === 0 &&
               reportsList.filter(r => (r.videoTitle || r.songTitle || "").toLowerCase().includes(globalSearchQuery.toLowerCase())).length === 0 && (
                <div className="text-center py-6">
                  <p className="text-zinc-500 font-mono text-xs">No records matching &quot;{globalSearchQuery}&quot; found across database.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Left Sidebar and Right Pane Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Sub-navigation Bar */}
        <div className="lg:col-span-3 bg-zinc-950/40 border border-white/5 p-4 rounded-3xl space-y-3">
          <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold px-3 pb-2 border-b border-white/5">
            Control Center
          </p>
          <div className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-none">
            {dashboardTabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-[10.5px] font-bold uppercase tracking-wider font-mono transition-all cursor-pointer whitespace-nowrap lg:w-full ${
                    activeTab === tab.id
                      ? "bg-indigo-650 text-white shadow-lg shadow-indigo-600/15"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"
                  }`}
                >
                  <TabIcon className={`w-4 h-4 ${tab.color}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Content View Pane */}
        <div className="lg:col-span-9 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              
              {/* SECTION: DASHBOARD OVERVIEW */}
              {activeTab === "dashboard" && (
                <div className="space-y-6">
                  {/* Stat Cards Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 flex flex-col justify-between">
                      <div>
                        <span className="bg-indigo-500/10 text-indigo-400 p-2 rounded-2xl border border-indigo-500/10 inline-block mb-3">
                          <Users className="w-5 h-5" />
                        </span>
                        <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">Total Community</p>
                        <h3 className="font-sans font-extrabold text-2xl text-zinc-100 mt-1">{totalUsers.toLocaleString()}</h3>
                      </div>
                      <div className="border-t border-white/5 pt-2.5 mt-4 flex items-center justify-between text-[9px] font-mono text-zinc-550 uppercase">
                        <span>Artists: {totalArtists}</span>
                        <span>Listeners: {totalUsers - totalArtists}</span>
                      </div>
                    </div>

                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 flex flex-col justify-between">
                      <div>
                        <span className="bg-pink-500/10 text-pink-400 p-2 rounded-2xl border border-pink-500/10 inline-block mb-3">
                          <Music className="w-5 h-5" />
                        </span>
                        <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">Catalog Count</p>
                        <h3 className="font-sans font-extrabold text-2xl text-zinc-100 mt-1">{totalSongsAll.toLocaleString()}</h3>
                      </div>
                      <div className="border-t border-white/5 pt-2.5 mt-4 flex items-center justify-between text-[9px] font-mono text-zinc-550 uppercase">
                        <span>Audio: {totalSongsOnly}</span>
                        <span>Video: {totalVideos}</span>
                      </div>
                    </div>

                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 flex flex-col justify-between">
                      <div>
                        <span className="bg-emerald-500/10 text-emerald-400 p-2 rounded-2xl border border-emerald-500/10 inline-block mb-3">
                          <TrendingUp className="w-5 h-5" />
                        </span>
                        <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">Organic Streams</p>
                        <h3 className="font-sans font-extrabold text-2xl text-zinc-100 mt-1">{totalStreams.toLocaleString()}</h3>
                      </div>
                      <div className="border-t border-white/5 pt-2.5 mt-4 flex items-center justify-between text-[9px] font-mono text-zinc-550 uppercase">
                        <span>Playlists: {totalPlaylists}</span>
                      </div>
                    </div>

                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 flex flex-col justify-between">
                      <div>
                        <span className="bg-cyan-500/10 text-cyan-400 p-2 rounded-2xl border border-cyan-500/10 inline-block mb-3">
                          <HardDrive className="w-5 h-5" />
                        </span>
                        <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">Storage Allocated</p>
                        <h3 className="font-sans font-extrabold text-2xl text-zinc-100 mt-1">{estimatedStorageGB} GB</h3>
                      </div>
                      <div className="border-t border-white/5 pt-2.5 mt-4 text-[9px] font-mono text-zinc-550 flex items-center justify-between">
                        <span className="uppercase">Quota: 10.00 GB</span>
                        <span className="text-cyan-400 font-bold">{(parseFloat(estimatedStorageGB) / 10 * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Graph Area & Activity logs */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="bg-white/5 border border-white/5 rounded-3xl p-6 lg:col-span-8 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-zinc-400 font-mono">Platform Vital Metrics</h4>
                          <p className="text-[10px] text-zinc-500">Daily active user sessions &amp; total streams comparison (Latest Week)</p>
                        </div>
                        <span className="text-[8px] bg-indigo-500/10 text-indigo-400 font-mono border border-indigo-500/20 px-2 py-0.5 rounded uppercase">Live Stats</span>
                      </div>
                      <div className="h-72 w-full pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={daudata}>
                            <defs>
                              <linearGradient id="colorDau" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorStreams" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="date" stroke="#4b5563" fontSize={10} fontFamily="JetBrains Mono" />
                            <YAxis stroke="#4b5563" fontSize={10} fontFamily="JetBrains Mono" />
                            <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#1f2937', borderRadius: '12px', fontSize: '11px', fontFamily: 'JetBrains Mono' }} />
                            <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'JetBrains Mono', marginTop: '10px' }} />
                            <Area type="monotone" dataKey="dau" name="Daily Active Users" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorDau)" />
                            <Area type="monotone" dataKey="streams" name="Plays Streamed" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorStreams)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Activity Logs Console column */}
                    <div className="bg-white/5 border border-white/5 rounded-3xl p-6 lg:col-span-4 space-y-4">
                      <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-indigo-400" />
                          <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-zinc-300 font-mono">Live Activity logs</h4>
                        </div>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                        {activityLogs.map((log) => (
                          <div key={log.id} className="text-[10px] font-mono leading-relaxed bg-zinc-950/40 p-2.5 rounded-xl border border-white/[0.02]">
                            <div className="flex items-center justify-between mb-1 text-zinc-500">
                              <span>{log.time}</span>
                              <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase ${
                                log.type === "success" ? "bg-emerald-500/10 text-emerald-400" :
                                log.type === "warn" ? "bg-red-500/10 text-red-400" : "bg-zinc-500/10 text-zinc-400"
                              }`}>{log.type}</span>
                            </div>
                            <p className="text-zinc-300">{log.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION: USERS */}
              {activeTab === "users" && (
                <div className="space-y-6">
                  {/* Create / Invite Admin form block */}
                  <div className="bg-indigo-950/10 border border-indigo-500/20 rounded-3xl p-5 md:p-6 space-y-4">
                    <div className="flex items-start gap-3">
                      <Key className="w-5 h-5 text-indigo-400 mt-0.5" />
                      <div>
                        <h4 className="font-sans font-bold text-sm text-zinc-200">Authorized Administrator Provisioning</h4>
                        <p className="text-xs text-zinc-400 leading-normal">
                          Existing administrators can promote any user to the Admin tier. If the email doesn't have an account, a pre-authorized placeholder is configured instantly.
                        </p>
                      </div>
                    </div>
                    <form onSubmit={handlePromoteAdminByEmail} className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
                      <input 
                        type="email" 
                        required
                        placeholder="Email (e.g. administrator@gmail.com)"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="bg-zinc-950/80 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                      <input 
                        type="text" 
                        placeholder="Username (Optional)"
                        value={inviteUsername}
                        onChange={(e) => setInviteUsername(e.target.value)}
                        className="bg-zinc-950/80 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500 font-sans"
                      />
                      <button 
                        type="submit" 
                        disabled={loadingInvite}
                        className="bg-indigo-600 hover:bg-indigo-550 text-white rounded-xl py-2.5 text-xs font-bold font-mono uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {loadingInvite ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Promote to Admin
                      </button>
                    </form>
                  </div>

                  <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                      <div>
                        <h3 className="font-sans font-bold text-sm text-zinc-200 uppercase tracking-wide">
                          User Accounts Directory ({filteredUsers.length})
                        </h3>
                        <p className="text-[10px] text-zinc-500">Search and curate platform user states, credentials, or suspend violations.</p>
                      </div>
                      <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                        <input
                          type="text"
                          placeholder="Search users by email, name..."
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          className="w-full bg-zinc-950/80 border border-white/5 rounded-2xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/5 text-[10px] font-mono text-zinc-500 uppercase tracking-wider pb-3">
                            <th className="pb-3 font-bold">User Identity</th>
                            <th className="pb-3 font-bold">Email Credentials</th>
                            <th className="pb-3 font-bold">Active Role</th>
                            <th className="pb-3 font-bold">Created On</th>
                            <th className="pb-3 font-bold">Status</th>
                            <th className="pb-3 font-bold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredUsers.map((user) => (
                            <tr key={user.uid} className="hover:bg-white/[0.01] transition-colors">
                              <td className="py-3.5">
                                <div className="flex items-center gap-3">
                                  <img 
                                    src={user.photoURL} 
                                    alt={user.username} 
                                    className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                  <span className="font-bold text-xs text-zinc-200 uppercase tracking-tight">{user.username}</span>
                                </div>
                              </td>
                              <td className="py-3.5 text-xs text-zinc-350 font-semibold font-mono">
                                {user.email}
                              </td>
                              <td className="py-3.5">
                                <span className={`text-[8.5px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                                  user.role === "admin" 
                                    ? "bg-purple-500/10 text-purple-300 border-purple-500/20" 
                                    : user.role === "artist" 
                                    ? "bg-pink-500/10 text-pink-300 border-pink-500/20" 
                                    : "bg-zinc-500/10 text-zinc-400 border-zinc-500/10"
                                }`}>
                                  {user.role}
                                </span>
                              </td>
                              <td className="py-3.5 text-xs text-zinc-450 font-mono">
                                {new Date(user.createdAt).toLocaleDateString()}
                              </td>
                              <td className="py-3.5">
                                {user.isSuspended ? (
                                  <span className="text-[8.5px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-mono font-bold uppercase">
                                    SUSPENDED
                                  </span>
                                ) : (
                                  <span className="text-[8.5px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-bold uppercase">
                                    ACTIVE
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 text-right pl-2">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Toggle Admin role */}
                                  {user.email !== "fredwilliamcurso@gmail.com" && (
                                    <button
                                      onClick={() => handleToggleAdminRole(user)}
                                      className={`p-1.5 rounded-lg border transition-all ${
                                        user.role === "admin" 
                                          ? "bg-purple-950/20 border-purple-500/20 text-purple-400 hover:bg-purple-950/40" 
                                          : "bg-zinc-800 border-white/5 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                                      }`}
                                      title={user.role === "admin" ? "Demote to listener" : "Promote to Admin"}
                                    >
                                      <ShieldCheck className="w-4 h-4" />
                                    </button>
                                  )}

                                  {/* Toggle Suspension */}
                                  {user.email !== "fredwilliamcurso@gmail.com" && (
                                    <button
                                      onClick={() => handleToggleSuspendUser(user)}
                                      className={`p-1.5 rounded-lg border transition-all ${
                                        user.isSuspended 
                                          ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-400 hover:bg-emerald-950/40" 
                                          : "bg-red-950/20 border-red-500/20 text-red-400 hover:bg-red-950/40"
                                      }`}
                                      title={user.isSuspended ? "Unsuspend account" : "Suspend account"}
                                    >
                                      {user.isSuspended ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                                    </button>
                                  )}

                                  {/* Delete Account */}
                                  {user.email !== "fredwilliamcurso@gmail.com" && (
                                    <button
                                      onClick={() => handleDeleteUser(user.uid, user.username)}
                                      className="p-1.5 bg-red-950/20 border border-red-500/10 rounded-lg text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors cursor-pointer"
                                      title="Permanently Delete"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION: ARTISTS */}
              {activeTab === "artists" && (
                <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div>
                      <h3 className="font-sans font-bold text-sm text-zinc-200 uppercase tracking-wide">
                        Verified Creators &amp; Artists ({filteredArtists.length})
                      </h3>
                      <p className="text-[10px] text-zinc-500">Monitor artist applications, verify status badges, and highlight creators.</p>
                    </div>
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Search artists..."
                        value={artistSearch}
                        onChange={(e) => setArtistSearch(e.target.value)}
                        className="w-full bg-zinc-950/80 border border-white/5 rounded-2xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-[10px] font-mono text-zinc-500 uppercase tracking-wider pb-3">
                          <th className="pb-3 font-bold">Artist Profile</th>
                          <th className="pb-3 font-bold">Bio Summary</th>
                          <th className="pb-3 font-bold">Followers</th>
                          <th className="pb-3 font-bold">Verified Status</th>
                          <th className="pb-3 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredArtists.map((artist) => (
                          <tr key={artist.uid} className="hover:bg-white/[0.01] transition-colors">
                            <td className="py-3.5 pr-2">
                              <div className="flex items-center gap-3">
                                <img 
                                  src={artist.profilePhoto || "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=100&q=80"} 
                                  alt={artist.artistName} 
                                  className="w-9 h-9 rounded-xl object-cover border border-white/10 shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                                <span className="font-bold text-xs text-zinc-200 uppercase tracking-tight">{artist.artistName}</span>
                              </div>
                            </td>
                            <td className="py-3.5 text-xs text-zinc-400 max-w-[200px] truncate">
                              {artist.bio || "No biography provided."}
                            </td>
                            <td className="py-3.5 font-mono text-xs text-zinc-350 font-bold">
                              {(artist.followersCount || 0).toLocaleString()}
                            </td>
                            <td className="py-3.5">
                              {artist.verified ? (
                                <span className="text-[8.5px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 px-2 py-0.5 rounded font-mono font-bold uppercase flex items-center gap-1 max-w-fit">
                                  <ShieldCheck className="w-2.5 h-2.5" />
                                  VERIFIED
                                </span>
                              ) : (
                                <span className="text-[8.5px] bg-zinc-500/10 text-zinc-500 border border-zinc-500/10 px-2 py-0.5 rounded font-mono font-bold uppercase">
                                  PENDING
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 text-right pl-2">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Toggle verification badge */}
                                <button
                                  onClick={() => handleToggleVerifyArtist(artist)}
                                  className={`p-1.5 rounded-lg border transition-all ${
                                    artist.verified 
                                      ? "bg-indigo-950/20 border-indigo-500/20 text-indigo-400 hover:bg-indigo-950/40" 
                                      : "bg-zinc-800 border-white/5 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                                  }`}
                                  title={artist.verified ? "Revoke Verification" : "Grant Verified Badge"}
                                >
                                  <ShieldCheck className="w-4 h-4" />
                                </button>

                                {/* Toggle Feature Creator */}
                                <button
                                  onClick={() => handleToggleFeatureArtist(artist)}
                                  className={`p-1.5 rounded-lg border transition-all ${
                                    (artist as any).isFeatured 
                                      ? "bg-pink-950/20 border-pink-500/20 text-pink-400 hover:bg-pink-950/40" 
                                      : "bg-zinc-800 border-white/5 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                                  }`}
                                  title={(artist as any).isFeatured ? "Unfeature Artist" : "Feature Artist"}
                                >
                                  <Star className={`w-4 h-4 ${(artist as any).isFeatured ? "fill-pink-400 text-pink-400" : ""}`} />
                                </button>

                                {/* Suspend Artist */}
                                <button
                                  onClick={() => handleToggleSuspendArtist(artist)}
                                  className={`p-1.5 rounded-lg border transition-all ${
                                    (artist as any).isSuspended 
                                      ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-400 hover:bg-emerald-950/40" 
                                      : "bg-red-950/20 border-red-500/20 text-red-400 hover:bg-red-950/40"
                                  }`}
                                  title={(artist as any).isSuspended ? "Unsuspend Artist" : "Suspend Artist"}
                                >
                                  {(artist as any).isSuspended ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SECTION: SONGS */}
              {activeTab === "songs" && (
                <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div>
                      <h3 className="font-sans font-bold text-sm text-zinc-200 uppercase tracking-wide">
                        Platform Audio Catalog ({filteredContent.filter(s => !s.videoUrl).length})
                      </h3>
                      <p className="text-[10px] text-zinc-500">Monitor lossless releases, play for preview verification, flag or delete items.</p>
                    </div>
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Search audio titles..."
                        value={contentSearch}
                        onChange={(e) => setContentSearch(e.target.value)}
                        className="w-full bg-zinc-950/80 border border-white/5 rounded-2xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-[10px] font-mono text-zinc-500 uppercase tracking-wider pb-3">
                          <th className="pb-3 font-bold">Audio Track</th>
                          <th className="pb-3 font-bold">Creator</th>
                          <th className="pb-3 font-bold">Streams</th>
                          <th className="pb-3 font-bold">Genre</th>
                          <th className="pb-3 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredContent.filter(s => !s.videoUrl).map((song) => (
                          <tr key={song.id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="py-3.5 pr-2">
                              <div className="flex items-center gap-3">
                                <button 
                                  onClick={() => handlePreviewSong(song)}
                                  className="p-1.5 bg-indigo-550/10 text-indigo-400 border border-indigo-550/10 hover:bg-indigo-550/25 rounded-lg cursor-pointer"
                                >
                                  {playingSongId === song.id ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                </button>
                                <img 
                                  src={song.coverUrl} 
                                  alt={song.title} 
                                  className="w-9 h-9 rounded-lg object-cover border border-white/10 shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                                <div>
                                  <p className="font-bold text-xs text-zinc-200 truncate uppercase tracking-tight">{song.title}</p>
                                  {(song as any).isFeatured && (
                                    <span className="text-[8px] bg-pink-500/10 text-pink-400 px-1.5 py-0.2 rounded font-bold border border-pink-500/10">FEATURED</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 text-xs text-zinc-350 font-semibold uppercase tracking-tight">
                              {song.artistName}
                            </td>
                            <td className="py-3.5 font-mono text-xs text-zinc-400 font-bold">
                              {(song.playCount || 0).toLocaleString()} streams
                            </td>
                            <td className="py-3.5 text-xs font-mono text-zinc-450 uppercase">
                              {song.genre || "Afrobeats"}
                            </td>
                            <td className="py-3.5 text-right pl-2">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Toggle Featured */}
                                <button
                                  onClick={() => handleToggleFeatureSong(song)}
                                  className={`p-1.5 rounded-lg border transition-all ${
                                    (song as any).isFeatured 
                                      ? "bg-pink-550/10 border-pink-500/20 text-pink-400 hover:bg-pink-550/20" 
                                      : "bg-zinc-800 border-white/5 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                                  }`}
                                  title="Feature audio"
                                >
                                  <Star className={`w-4 h-4 ${(song as any).isFeatured ? "fill-pink-400" : ""}`} />
                                </button>

                                {/* Toggle Flag */}
                                <button
                                  onClick={() => handleToggleModerateSong(song)}
                                  className={`p-1.5 rounded-lg border transition-all ${
                                    (song as any).isModerated 
                                      ? "bg-red-550/10 border-red-500/20 text-red-400 hover:bg-red-550/20" 
                                      : "bg-zinc-800 border-white/5 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                                  }`}
                                  title="Flag inappropriate"
                                >
                                  <AlertTriangle className="w-4 h-4" />
                                </button>

                                {/* Delete permanent */}
                                <button
                                  onClick={() => handleDeleteSong(song.id, song.title)}
                                  className="p-1.5 bg-red-950/20 border border-red-500/10 rounded-lg text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors cursor-pointer"
                                  title="Permanently delete release"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SECTION: VIDEOS */}
              {activeTab === "videos" && (
                <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div>
                      <h3 className="font-sans font-bold text-sm text-zinc-200 uppercase tracking-wide">
                        Platform Video Releases ({filteredContent.filter(s => !!s.videoUrl).length})
                      </h3>
                      <p className="text-[10px] text-zinc-500">Preview high-fidelity video releases and manage content curation.</p>
                    </div>
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Search videos..."
                        value={contentSearch}
                        onChange={(e) => setContentSearch(e.target.value)}
                        className="w-full bg-zinc-950/80 border border-white/5 rounded-2xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {filteredContent.filter(s => !!s.videoUrl).map((song) => (
                      <div key={song.id} className="bg-zinc-950/40 border border-white/5 p-4 rounded-3xl space-y-4 flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/10 group">
                            <img 
                              src={song.coverUrl} 
                              alt={song.title} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => setPreviewVideoUrl(song.videoUrl || null)}
                                className="bg-indigo-600 hover:bg-indigo-550 text-white p-3 rounded-full shadow-2xl transition-all scale-90 group-hover:scale-100 cursor-pointer"
                              >
                                <Play className="w-5 h-5 fill-white" />
                              </button>
                            </div>
                          </div>
                          <div>
                            <p className="font-bold text-xs text-zinc-200 uppercase tracking-tight truncate">{song.title}</p>
                            <p className="font-mono text-[9px] text-zinc-500 uppercase mt-0.5">Creator: {song.artistName}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-white/[0.03] mt-2">
                          <span className="text-[10px] font-mono text-zinc-400 font-bold">{(song.playCount || 0).toLocaleString()} Views</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleToggleFeatureSong(song)}
                              className={`p-1.5 rounded-xl border transition-all ${
                                (song as any).isFeatured 
                                  ? "bg-pink-550/10 border-pink-500/20 text-pink-400 hover:bg-pink-550/20" 
                                  : "bg-zinc-850 border-white/5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                              }`}
                            >
                              <Star className={`w-3.5 h-3.5 ${(song as any).isFeatured ? "fill-pink-400 text-pink-400" : ""}`} />
                            </button>
                            <button
                              onClick={() => handleToggleModerateSong(song)}
                              className={`p-1.5 rounded-xl border transition-all ${
                                (song as any).isModerated 
                                  ? "bg-red-550/10 border-red-500/20 text-red-400 hover:bg-red-550/20" 
                                  : "bg-zinc-850 border-white/5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                              }`}
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSong(song.id, song.title)}
                              className="p-1.5 bg-red-950/20 border border-red-500/10 rounded-xl text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION: REPORTS */}
              {activeTab === "reports" && (
                <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-6">
                  <div>
                    <h3 className="font-sans font-bold text-sm text-zinc-200 uppercase tracking-wide flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Content Moderation &amp; Review Desk ({flaggedCount})
                    </h3>
                    <p className="text-[10px] text-zinc-500">Review, approve, or permanently purge flagged releases from the catalog.</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-[10px] font-mono text-zinc-500 uppercase tracking-wider pb-3">
                          <th className="pb-3 font-bold">Flagged Release</th>
                          <th className="pb-3 font-bold">Creator</th>
                          <th className="pb-3 font-bold">Format</th>
                          <th className="pb-3 font-bold">Reason/Status</th>
                          <th className="pb-3 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {songs.filter(s => (s as any).isModerated).map((song) => (
                          <tr key={song.id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="py-3.5 pr-2">
                              <div className="flex items-center gap-3">
                                <img 
                                  src={song.coverUrl} 
                                  alt={song.title} 
                                  className="w-9 h-9 rounded-lg object-cover border border-white/10 shrink-0"
                                />
                                <span className="font-bold text-xs text-zinc-200 uppercase tracking-tight">{song.title}</span>
                              </div>
                            </td>
                            <td className="py-3.5 text-xs text-zinc-350 font-semibold uppercase">
                              {song.artistName}
                            </td>
                            <td className="py-3.5">
                              {song.videoUrl ? (
                                <span className="text-[8.5px] bg-pink-500/10 text-pink-300 border border-pink-500/20 px-2 py-0.5 rounded font-mono font-bold uppercase">Video</span>
                              ) : (
                                <span className="text-[8.5px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-2 py-0.5 rounded font-mono font-bold uppercase">Lossless</span>
                              )}
                            </td>
                            <td className="py-3.5">
                              <span className="text-[8.5px] bg-red-500/15 text-red-400 border border-red-500/25 px-2 py-0.5 rounded font-mono font-bold uppercase">
                                Flagged for Curation
                              </span>
                            </td>
                            <td className="py-3.5 text-right pl-2">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleToggleModerateSong(song)}
                                  className="px-3 py-1.5 bg-emerald-600/15 hover:bg-emerald-600/35 border border-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase font-mono tracking-wider rounded-lg transition-colors cursor-pointer"
                                >
                                  Clear/Approve
                                </button>
                                <button
                                  onClick={() => handleDeleteSong(song.id, song.title)}
                                  className="p-1.5 bg-red-950/20 border border-red-500/10 rounded-lg text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}

                        {songs.filter(s => (s as any).isModerated).length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-zinc-550 font-mono text-xs uppercase">
                              🎉 Excellent! No flagged content in review queue.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SECTION: ANALYTICS */}
              {activeTab === "analytics" && (
                <div className="space-y-6">
                  {/* Demographics & Distribution Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Country Distribution Pie */}
                    <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-4">
                      <div>
                        <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-zinc-400 font-mono">Listener Demographics</h4>
                        <p className="text-[10px] text-zinc-500">Percentage distribution of organic listeners by country</p>
                      </div>
                      <div className="h-64 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={countryData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {countryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#1f2937', borderRadius: '12px', fontSize: '11px', fontFamily: 'JetBrains Mono' }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-1.5 text-xs font-mono ml-4 shrink-0">
                          {countryData.map((entry, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                              <span className="text-zinc-300">{entry.name}: {entry.value}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Genre Distribution Bar */}
                    <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-4">
                      <div>
                        <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-zinc-400 font-mono">Top Catalog Genres</h4>
                        <p className="text-[10px] text-zinc-500">Top 5 audio genres by release volume</p>
                      </div>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={displayGenreData}>
                            <XAxis dataKey="name" stroke="#4b5563" fontSize={10} fontFamily="JetBrains Mono" />
                            <YAxis stroke="#4b5563" fontSize={10} fontFamily="JetBrains Mono" />
                            <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#1f2937', borderRadius: '12px', fontSize: '11px', fontFamily: 'JetBrains Mono' }} />
                            <Bar dataKey="count" name="Releases" fill="#a855f7" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION: MONETIZATION */}
              {activeTab === "monetization" && (
                <div className="space-y-6">
                  {/* Monetization metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-5">
                      <p className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest">Premium Active subscriptions</p>
                      <h3 className="font-sans font-extrabold text-2xl text-emerald-400 mt-1">2,410 users</h3>
                      <p className="text-[10px] text-zinc-500 mt-2 font-mono uppercase">Avg plan: $4.99/mo</p>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-5">
                      <p className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest">Monthly recurring revenue (MRR)</p>
                      <h3 className="font-sans font-extrabold text-2xl text-indigo-400 mt-1">$12,025.90</h3>
                      <p className="text-[10px] text-emerald-400 mt-2 font-mono uppercase">📈 +18.4% monthly</p>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-5">
                      <p className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest">Simulated ads revenue</p>
                      <h3 className="font-sans font-extrabold text-2xl text-yellow-400 mt-1">$1,489.12</h3>
                      <p className="text-[10px] text-zinc-500 mt-2 font-mono uppercase">Rewarded Ads viewed: 9,210</p>
                    </div>
                  </div>

                  {/* Settings / Controls */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="bg-white/5 border border-white/5 rounded-3xl p-6 lg:col-span-8 space-y-4">
                      <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-zinc-400 font-mono">Platform Revenue Trends</h4>
                        <span className="text-[8px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded font-mono uppercase">FY2026 Live</span>
                      </div>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={monetizationData}>
                            <XAxis dataKey="month" stroke="#4b5563" fontSize={10} fontFamily="JetBrains Mono" />
                            <YAxis stroke="#4b5563" fontSize={10} fontFamily="JetBrains Mono" />
                            <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#1f2937', borderRadius: '12px', fontSize: '11px', fontFamily: 'JetBrains Mono' }} />
                            <Line type="monotone" dataKey="revenue" name="Premium MRR ($)" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981' }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Monetization Interactive control toggles */}
                    <div className="bg-white/5 border border-white/5 rounded-3xl p-6 lg:col-span-4 space-y-6">
                      <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-zinc-300 font-mono border-b border-white/5 pb-3">Ad Rates &amp; Gateway config</h4>
                      
                      {/* Ads insertion slider */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-zinc-400 uppercase">Ads Ratio:</span>
                          <span className="text-white font-bold">{adsRatio}%</span>
                        </div>
                        <input 
                          type="range" 
                          min={10} 
                          max={90} 
                          value={adsRatio}
                          onChange={(e) => {
                            setAdsRatio(parseInt(e.target.value));
                            logActivity("info", `Global Ads ratio modified to ${e.target.value}%`);
                          }}
                          className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                      </div>

                      {/* Reward Ads multiplier */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-zinc-400 uppercase">Ad Reward multi:</span>
                          <span className="text-white font-bold">{adsMultiplier}x</span>
                        </div>
                        <input 
                          type="range" 
                          min={1.0} 
                          max={5.0} 
                          step={0.5}
                          value={adsMultiplier}
                          onChange={(e) => {
                            setAdsMultiplier(parseFloat(e.target.value));
                            logActivity("info", `AdReward duration multiplier set to ${e.target.value}x`);
                          }}
                          className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                        />
                      </div>

                      {/* Gateway status Toggle */}
                      <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <div>
                          <p className="text-xs font-bold text-zinc-300">Payment Gateways</p>
                          <p className="text-[10px] text-zinc-500">Live credit checkout channels</p>
                        </div>
                        <button
                          onClick={() => {
                            setPaymentGatewayOnline(!paymentGatewayOnline);
                            logActivity(paymentGatewayOnline ? "warn" : "success", `Monetization Checkout portal changed to ${!paymentGatewayOnline ? "ONLINE" : "OFFLINE"}`);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-bold font-mono tracking-wider uppercase transition-colors cursor-pointer ${
                            paymentGatewayOnline ? "bg-emerald-600/10 border border-emerald-500/20 text-emerald-400" : "bg-red-650 text-white"
                          }`}
                        >
                          {paymentGatewayOnline ? "ONLINE" : "OFFLINE"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION: ANDROID RELEASE */}
              {activeTab === "android" && (
                <div className="space-y-6">
                  {/* Google Play store Ready block */}
                  <div className="bg-zinc-950/40 border border-white/5 rounded-3xl p-6">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                      <div className="space-y-2">
                        <span className="bg-indigo-500/10 text-indigo-300 font-mono text-[9px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full border border-indigo-500/20">
                          Google Play Store Ready
                        </span>
                        <h3 className="font-sans font-black text-2xl text-white tracking-tight">
                          Android Production Release
                        </h3>
                        <p className="text-xs text-zinc-400 max-w-xl">
                          Packaged, signed, and optimized for distribution on the Google Play Store using the official Android App Bundle format (.aab).
                        </p>
                      </div>
                      
                      {isBuilding ? (
                        <div className="flex items-center gap-2 bg-indigo-500/10 text-indigo-300 px-4 py-2 rounded-full border border-indigo-500/20 font-mono text-xs font-bold">
                          <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                          COMPILING BUNDLE...
                        </div>
                      ) : buildStatus?.built ? (
                        <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-300 px-4 py-2 rounded-full border border-emerald-500/20 font-mono text-xs font-bold">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                          BUILD SIGNED &amp; AVAILABLE
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 bg-amber-500/10 text-amber-300 px-4 py-2 rounded-full border border-amber-500/20 font-mono text-xs font-bold">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                          PENDING GENERATION
                        </div>
                      )}
                    </div>

                    {/* Android specs summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/5">
                      <div className="bg-zinc-950/30 p-4 rounded-2xl border border-white/5">
                        <p className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest">Version Code</p>
                        <p className="font-sans font-extrabold text-lg text-zinc-200 mt-1">
                          {buildStatus?.versionCode || 100}
                        </p>
                      </div>
                      <div className="bg-zinc-950/30 p-4 rounded-2xl border border-white/5">
                        <p className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest">Version Name</p>
                        <p className="font-sans font-extrabold text-lg text-zinc-200 mt-1">
                          {buildStatus?.versionName || "1.0.0"}
                        </p>
                      </div>
                      <div className="bg-zinc-950/30 p-4 rounded-2xl border border-white/5">
                        <p className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest">Package ID</p>
                        <p className="font-mono font-bold text-xs text-indigo-300 mt-2 truncate" title={buildStatus?.packageName || "com.soundstreamy.app"}>
                          {buildStatus?.packageName || "com.soundstreamy.app"}
                        </p>
                      </div>
                      <div className="bg-zinc-950/30 p-4 rounded-2xl border border-white/5">
                        <p className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest">Signature Algorithm</p>
                        <p className="font-mono font-bold text-xs text-emerald-300 mt-2 truncate">
                          SHA256withRSA
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Terminal log panel */}
                  <div className="bg-zinc-950/40 border border-white/5 rounded-3xl p-6 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5">
                      <div>
                        <h4 className="font-sans font-bold text-base text-zinc-100">Android Build Automator</h4>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Compile production React bundles and seal them inside a signed, Play Store-compatible App Bundle.
                        </p>
                      </div>
                      <button
                        onClick={handleTriggerBuild}
                        disabled={isBuilding}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider font-mono transition-all cursor-pointer ${
                          isBuilding 
                            ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" 
                            : "bg-indigo-600 hover:bg-indigo-550 text-white shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
                        }`}
                      >
                        <RefreshCw className={`w-4 h-4 ${isBuilding ? "animate-spin" : ""}`} />
                        {isBuilding ? "Building..." : buildStatus?.built ? "Rebuild Android Release" : "Generate Production Build"}
                      </button>
                    </div>

                    {(isBuilding || buildLogs || buildError) && (
                      <div className="space-y-2">
                        <p className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest">Compiler Terminal Logs</p>
                        <div className="bg-black/90 border border-zinc-800 rounded-2xl p-4 font-mono text-[11px] text-zinc-300 space-y-1.5 max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
                          {buildLogs.split("\n").map((line, idx) => (
                            <div key={idx} className={line.startsWith("❌") ? "text-red-400" : line.startsWith("✅") ? "text-emerald-400" : "text-zinc-300"}>
                              {line}
                            </div>
                          ))}
                          {buildError && (
                            <div className="text-red-400 font-bold mt-2">
                              ❌ Error: {buildError}
                            </div>
                          )}
                          {isBuilding && (
                            <div className="text-indigo-400 animate-pulse mt-1">
                              ⚡ Bundling assets, signing AAB package...
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cards for key files */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={`bg-zinc-950/60 border rounded-3xl p-6 flex flex-col justify-between transition-all group ${buildStatus?.built ? "border-white/5 hover:border-zinc-850" : "border-white/5 opacity-50"}`}>
                      <div className="space-y-4">
                        <div className="p-3 bg-indigo-500/10 rounded-2xl w-fit border border-indigo-500/20">
                          <Smartphone className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-sans font-bold text-base text-zinc-100">Android App Bundle (.aab)</h4>
                          <p className="text-xs text-zinc-400">
                            The compiled, minified production bundle. Ready for direct uploads to Google Play Console.
                          </p>
                        </div>
                        <div className="bg-zinc-950/80 rounded-xl p-3 border border-white/5 font-mono text-[10px] text-zinc-450 space-y-1">
                          <div className="flex justify-between"><span className="text-zinc-500">File:</span> <span className="text-zinc-200">app-release.aab</span></div>
                          <div className="flex justify-between"><span className="text-zinc-500">Size:</span> <span className="text-zinc-200">{buildStatus?.aab.size || "N/A"}</span></div>
                          <div className="flex justify-between"><span className="text-zinc-500">Modified:</span> <span className="text-zinc-200">{buildStatus?.aab.modifiedAt || "N/A"}</span></div>
                        </div>
                      </div>
                      <div className="mt-6">
                        {buildStatus?.built ? (
                          <a
                            href="/app-release.aab"
                            download="app-release.aab"
                            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-550 text-white rounded-xl text-xs font-bold font-mono tracking-wider uppercase transition-colors cursor-pointer"
                          >
                            <Download className="w-4 h-4" />
                            Download App Bundle
                          </a>
                        ) : (
                          <button
                            disabled
                            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-zinc-800 text-zinc-500 rounded-xl text-xs font-bold font-mono tracking-wider uppercase cursor-not-allowed"
                          >
                            <Lock className="w-4 h-4" />
                            Build Required
                          </button>
                        )}
                      </div>
                    </div>

                    <div className={`bg-zinc-950/60 border rounded-3xl p-6 flex flex-col justify-between transition-all group ${buildStatus?.keystore.exists ? "border-white/5 hover:border-zinc-850" : "border-white/5 opacity-50"}`}>
                      <div className="space-y-4">
                        <div className="p-3 bg-purple-500/10 rounded-2xl w-fit border border-purple-500/20">
                          <Key className="w-6 h-6 text-purple-400" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-sans font-bold text-base text-zinc-100">Android Release Keystore</h4>
                          <p className="text-xs text-zinc-400">
                            The secure certificate store containing your private signing key. Essential for updating the app.
                          </p>
                        </div>
                        <div className="bg-zinc-950/80 rounded-xl p-3 border border-white/5 font-mono text-[10px] text-zinc-450 space-y-1">
                          <div className="flex justify-between"><span className="text-zinc-500">File:</span> <span className="text-zinc-200">soundstream_release.keystore</span></div>
                          <div className="flex justify-between"><span className="text-zinc-500">Alias:</span> <span className="text-purple-300 font-bold">{buildStatus?.keyAlias || "soundstream_alias"}</span></div>
                          <div className="flex justify-between"><span className="text-zinc-500">Valid:</span> <span className="text-emerald-400">~27 Years</span></div>
                        </div>
                      </div>
                      <div className="mt-6">
                        {buildStatus?.keystore.exists ? (
                          <a
                            href="/soundstream_release.keystore"
                            download="soundstream_release.keystore"
                            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-purple-600/80 hover:bg-purple-550 text-white rounded-xl text-xs font-bold font-mono tracking-wider uppercase transition-colors cursor-pointer"
                          >
                            <Download className="w-4 h-4" />
                            Download Keystore File
                          </a>
                        ) : (
                          <button
                            disabled
                            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-zinc-800 text-zinc-500 rounded-xl text-xs font-bold font-mono tracking-wider uppercase cursor-not-allowed"
                          >
                            <Lock className="w-4 h-4" />
                            Keystore Unavailable
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION: FIREBASE */}
              {activeTab === "firebase" && (
                <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-6">
                  <div className="flex items-start gap-4 border-b border-white/5 pb-4">
                    <Database className="w-8 h-8 text-orange-500" />
                    <div>
                      <h3 className="font-sans font-bold text-sm text-zinc-200 uppercase tracking-wide">
                        Firebase Integration Diagnostics
                      </h3>
                      <p className="text-xs text-zinc-500">
                        Monitor live connection status, collection document sizes, and run API connectivity checks.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Diagnostic metrics */}
                    <div className="bg-zinc-950/40 border border-white/5 p-5 rounded-2xl space-y-4">
                      <p className="font-mono text-[9.5px] uppercase text-zinc-500 font-bold">Diagnostics Tool</p>
                      
                      <div className="flex items-center justify-between py-2 border-b border-white/[0.03]">
                        <span className="text-xs text-zinc-400 font-sans">Firestore Sync:</span>
                        <span className="text-xs font-mono text-emerald-400 font-bold uppercase">Online/Snapshot Ready</span>
                      </div>

                      <div className="flex items-center justify-between py-2 border-b border-white/[0.03]">
                        <span className="text-xs text-zinc-400 font-sans">Firebase Database ID:</span>
                        <span className="text-[10px] font-mono text-indigo-300">ai-studio-a456ed2d-95ac-4aa8-8590-32ae5d6e0f4a</span>
                      </div>

                      <div className="flex items-center justify-between py-2">
                        <span className="text-xs text-zinc-400 font-sans">Security rules loaded:</span>
                        <span className="text-[10px] font-mono text-emerald-300 font-bold uppercase">rules_version = '2'</span>
                      </div>

                      <div className="pt-3 flex items-center gap-3">
                        <button
                          onClick={handleTestFirebase}
                          disabled={testingFirebase}
                          className="px-4 py-2 bg-orange-650 hover:bg-orange-600 text-white rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          {testingFirebase ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                          Test Write/Read Health
                        </button>

                        {firebaseStatus === "connected" && (
                          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/10 uppercase">
                            ✓ Success
                          </span>
                        )}
                        {firebaseStatus === "failed" && (
                          <span className="text-[10px] font-mono font-bold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/10 uppercase">
                            ✗ Failed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Collection monitor */}
                    <div className="bg-zinc-950/40 border border-white/5 p-5 rounded-2xl space-y-4 font-mono text-xs">
                      <p className="font-mono text-[9.5px] uppercase text-zinc-500 font-bold">Database Volume Metrics</p>
                      <div className="flex justify-between py-1 border-b border-white/[0.03]"><span className="text-zinc-500">Users documents:</span> <span className="text-zinc-200">{totalUsers} docs</span></div>
                      <div className="flex justify-between py-1 border-b border-white/[0.03]"><span className="text-zinc-500">Songs documents:</span> <span className="text-zinc-200">{songs.length} docs</span></div>
                      <div className="flex justify-between py-1 border-b border-white/[0.03]"><span className="text-zinc-500">Playlists documents:</span> <span className="text-zinc-200">{playlists.length} docs</span></div>
                      <div className="flex justify-between py-1"><span className="text-zinc-500">Artists documents:</span> <span className="text-zinc-200">{artists.length} docs</span></div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION: SUPABASE */}
              {activeTab === "supabase" && (
                <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-6">
                  <div className="flex items-start gap-4 border-b border-white/5 pb-4">
                    <Globe className="w-8 h-8 text-sky-400" />
                    <div>
                      <h3 className="font-sans font-bold text-sm text-zinc-200 uppercase tracking-wide">
                        Supabase Connection Status
                      </h3>
                      <p className="text-xs text-zinc-500">Verify client integration configuration for secure file distribution assets storage.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-zinc-950/40 border border-white/5 p-5 rounded-2xl space-y-3 font-mono text-xs">
                      <p className="font-mono text-[9.5px] uppercase text-zinc-500 font-bold">Integration details</p>
                      <div className="flex justify-between"><span className="text-zinc-500">Supabase Bucket:</span> <span className="text-sky-300 font-bold">soundstream-assets</span></div>
                      <div className="flex justify-between"><span className="text-zinc-500">Connection Mode:</span> <span className="text-emerald-400">Direct Client SDK</span></div>
                      <div className="flex justify-between"><span className="text-zinc-500">Storage API:</span> <span className="text-zinc-300">v1 Object Storage</span></div>
                    </div>

                    <div className="bg-zinc-950/40 border border-white/5 p-5 rounded-2xl space-y-3">
                      <p className="font-mono text-[9.5px] uppercase text-zinc-500 font-bold font-mono">Bucket Assets health</p>
                      <div className="flex items-center gap-2 text-emerald-400 font-bold font-mono text-xs">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        SUPABASE CONNECTION HEALTHY
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-normal mt-2">
                        Lossless audio audio, artwork files, and video streams are synchronized successfully via CDN edge cache distribution.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION: SUPPORT DESK */}
              {activeTab === "support" && (
                <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-6">
                  <div>
                    <h3 className="font-sans font-bold text-sm text-zinc-200 uppercase tracking-wide flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-violet-400" />
                      SoundStream Support Desk
                    </h3>
                    <p className="text-[10px] text-zinc-500">Manage inbound user contact requests, feedback submissions, and active tickets.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Tickets list column */}
                    <div className="lg:col-span-5 space-y-3">
                      <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Inbound Tickets</p>
                      <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                        {supportInquiries.map((ticket) => (
                          <div 
                            key={ticket.id}
                            onClick={() => {
                              setSelectedInquiryId(ticket.id);
                              setReplyText("");
                            }}
                            className={`p-3 rounded-2xl border transition-all text-left cursor-pointer ${
                              selectedInquiryId === ticket.id 
                                ? "bg-violet-950/20 border-violet-500/30" 
                                : "bg-zinc-950/40 border-white/5 hover:border-zinc-850"
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="font-bold text-xs text-zinc-200 uppercase truncate max-w-[130px]">{ticket.name}</span>
                              <span className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.2 rounded ${
                                ticket.resolved ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                              }`}>{ticket.resolved ? "RESOLVED" : "OPEN"}</span>
                            </div>
                            <p className="text-[10.5px] font-semibold text-zinc-400 truncate uppercase tracking-tight">{ticket.topic}</p>
                            <span className="text-[9px] font-mono text-zinc-650">{ticket.date}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Reply / detail Column */}
                    <div className="lg:col-span-7 bg-zinc-950/40 border border-white/5 p-5 rounded-2xl min-h-[300px] flex flex-col justify-between">
                      {selectedInquiryId ? (
                        (() => {
                          const ticket = supportInquiries.find(t => t.id === selectedInquiryId)!;
                          return (
                            <div className="space-y-4 flex flex-col justify-between h-full">
                              <div className="space-y-3">
                                <div className="border-b border-white/5 pb-2.5">
                                  <span className="text-[8.5px] font-mono text-zinc-500 uppercase tracking-widest">{ticket.email}</span>
                                  <h4 className="font-sans font-bold text-sm text-zinc-100 uppercase tracking-tight mt-0.5">{ticket.topic}</h4>
                                </div>
                                <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-white/5 text-[11px] leading-relaxed text-zinc-300">
                                  {ticket.message}
                                </div>
                              </div>

                              <form onSubmit={handleSendSupportReply} className="space-y-3.5 pt-4 border-t border-white/[0.03]">
                                <textarea
                                  required
                                  rows={3}
                                  placeholder="Draft response to customer email..."
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 font-sans"
                                />
                                <div className="flex justify-between gap-2.5">
                                  <button
                                    type="button"
                                    onClick={() => handleResolveInquiry(ticket.id)}
                                    className="px-4 py-2 bg-emerald-600/15 hover:bg-emerald-600/35 border border-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase font-mono tracking-wider rounded-xl transition-colors cursor-pointer"
                                  >
                                    Mark Resolved
                                  </button>
                                  <button
                                    type="submit"
                                    className="px-4 py-2 bg-violet-650 hover:bg-violet-600 text-white text-[10px] font-bold uppercase font-mono tracking-wider rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                                  >
                                    <Send className="w-3 h-3" />
                                    Send Reply
                                  </button>
                                </div>
                              </form>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="m-auto text-center space-y-2">
                          <MessageSquare className="w-8 h-8 text-zinc-650 mx-auto" />
                          <p className="text-zinc-550 font-mono text-[10px] uppercase">Select ticket to read &amp; draft reply</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION: LEGAL */}
              {activeTab === "legal" && (
                <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-6">
                  <div className="flex items-start gap-3.5 border-b border-white/5 pb-4">
                    <Scale className="w-8 h-8 text-stone-400" />
                    <div>
                      <h3 className="font-sans font-bold text-sm text-zinc-200 uppercase tracking-wide">
                        Legal terms &amp; DMCA Compliance
                      </h3>
                      <p className="text-xs text-zinc-500">Edit general legal framework terms, Privacy policy agreements, and copy compliance.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 text-left">
                      <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Platform Terms of Service (TOS)</p>
                      <textarea
                        rows={6}
                        value={legalTerms}
                        onChange={(e) => {
                          setLegalTerms(e.target.value);
                          logActivity("info", "Platform TOS legal text modified.");
                        }}
                        className="w-full bg-zinc-950/80 border border-white/10 rounded-2xl p-4 text-xs leading-relaxed text-zinc-300 focus:outline-none focus:border-stone-500 font-sans"
                      />
                    </div>

                    <div className="space-y-2 text-left">
                      <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Privacy Policy Agreements</p>
                      <textarea
                        rows={6}
                        value={legalPrivacy}
                        onChange={(e) => {
                          setLegalPrivacy(e.target.value);
                          logActivity("info", "Privacy policy legal document updated.");
                        }}
                        className="w-full bg-zinc-950/80 border border-white/10 rounded-2xl p-4 text-xs leading-relaxed text-zinc-300 focus:outline-none focus:border-stone-500 font-sans"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/[0.03] flex justify-end">
                    <button
                      onClick={() => {
                        showFeedback("success", "Compliance policies saved successfully!");
                        logActivity("success", "Committed legal contract updates to database.");
                      }}
                      className="px-5 py-2.5 bg-stone-700 hover:bg-stone-600 text-white rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Commit Legal Updates
                    </button>
                  </div>
                </div>
              )}

              {/* SECTION: SETTINGS */}
              {activeTab === "settings" && (
                <div className="space-y-6">
                  {/* Settings Header */}
                  <div className="bg-white/5 border border-white/5 rounded-3xl p-6 flex items-start gap-4">
                    <Settings className="w-8 h-8 text-purple-400 animate-spin" style={{ animationDuration: '6s' }} />
                    <div>
                      <h3 className="font-sans font-bold text-sm text-zinc-200 uppercase tracking-wide">
                        Platform Governance Panel
                      </h3>
                      <p className="text-xs text-zinc-500">Configure global parameters, toggle services, adjust streaming ceilings, and set baseline royalty coefficients.</p>
                    </div>
                  </div>

                  {/* Config Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Card 1: System Access & Governance */}
                    <div className="bg-zinc-950/40 border border-white/5 p-6 rounded-3xl space-y-4">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                        <Globe2 className="w-4 h-4 text-purple-400" />
                        <h4 className="font-sans font-extrabold text-[11px] text-zinc-200 uppercase tracking-wider">Access Controls</h4>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-white/[0.01] border border-white/5 rounded-xl">
                          <div>
                            <p className="font-sans font-bold text-xs text-zinc-300">System Maintenance Mode</p>
                            <p className="text-[10px] text-zinc-500 font-sans">Redirect non-admin users to static placeholder screen.</p>
                          </div>
                          <button
                            onClick={() => handleUpdateSystemConfig({ maintenanceMode: !systemConfig.maintenanceMode })}
                            className={`px-3 py-1.5 rounded-xl font-mono text-[9px] font-bold uppercase transition-colors cursor-pointer ${
                              systemConfig.maintenanceMode 
                                ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                                : "bg-zinc-800 text-zinc-400 border border-white/5"
                            }`}
                          >
                            {systemConfig.maintenanceMode ? "ENABLED" : "DISABLED"}
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-white/[0.01] border border-white/5 rounded-xl">
                          <div>
                            <p className="font-sans font-bold text-xs text-zinc-300">Open User Registration</p>
                            <p className="text-[10px] text-zinc-500 font-sans">Enable or suspend new accounts sign-up gateway.</p>
                          </div>
                          <button
                            onClick={() => handleUpdateSystemConfig({ registrationEnabled: !systemConfig.registrationEnabled })}
                            className={`px-3 py-1.5 rounded-xl font-mono text-[9px] font-bold uppercase transition-colors cursor-pointer ${
                              systemConfig.registrationEnabled 
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                : "bg-red-500/10 text-red-400 border border-red-500/20"
                            }`}
                          >
                            {systemConfig.registrationEnabled ? "OPEN" : "CLOSED"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Curation limits & Quality limits */}
                    <div className="bg-zinc-950/40 border border-white/5 p-6 rounded-3xl space-y-4">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                        <Smartphone className="w-4 h-4 text-indigo-400" />
                        <h4 className="font-sans font-extrabold text-[11px] text-zinc-200 uppercase tracking-wider">Curation Limits & Streaming</h4>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="font-sans font-bold text-xs text-zinc-300">Maximum Media Upload Limit</label>
                            <span className="font-mono text-xs text-indigo-400 font-bold">{systemConfig.uploadLimitMb || 50} MB</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="250"
                            step="5"
                            value={systemConfig.uploadLimitMb || 50}
                            onChange={(e) => handleUpdateSystemConfig({ uploadLimitMb: parseInt(e.target.value) })}
                            className="w-full accent-indigo-400 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                          />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-white/[0.01] border border-white/5 rounded-xl">
                          <div>
                            <p className="font-sans font-bold text-xs text-zinc-300">Lossless Master Quality Streaming</p>
                            <p className="text-[10px] text-zinc-500 font-sans">Toggle support for raw 1411kbps FLAC master files.</p>
                          </div>
                          <button
                            onClick={() => handleUpdateSystemConfig({ losslessStreaming: !systemConfig.losslessStreaming })}
                            className={`px-3 py-1.5 rounded-xl font-mono text-[9px] font-bold uppercase transition-colors cursor-pointer ${
                              systemConfig.losslessStreaming 
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                : "bg-zinc-800 text-zinc-400 border border-white/5"
                            }`}
                          >
                            {systemConfig.losslessStreaming ? "FLAC 1411" : "MP3 320"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Card 3: Feature Gate Switches */}
                    <div className="bg-zinc-950/40 border border-white/5 p-6 rounded-3xl space-y-4 md:col-span-2">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                        <FolderLock className="w-4 h-4 text-cyan-400" />
                        <h4 className="font-sans font-extrabold text-[11px] text-zinc-200 uppercase tracking-wider">Modular Platform Feature Gates</h4>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 bg-white/[0.01] border border-white/5 rounded-2xl flex flex-col justify-between h-[100px]">
                          <p className="font-sans font-bold text-xs text-zinc-300">Creator Monetization</p>
                          <button
                            onClick={() => handleUpdateSystemConfig({ monetizationEnabled: !systemConfig.monetizationEnabled })}
                            className={`w-full py-1 rounded-xl font-mono text-[9px] font-bold ${
                              systemConfig.monetizationEnabled ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" : "bg-zinc-900 text-zinc-500"
                            }`}
                          >
                            {systemConfig.monetizationEnabled ? "ENABLED" : "SUSPENDED"}
                          </button>
                        </div>

                        <div className="p-3 bg-white/[0.01] border border-white/5 rounded-2xl flex flex-col justify-between h-[100px]">
                          <p className="font-sans font-bold text-xs text-zinc-300">Ad Injections</p>
                          <button
                            onClick={() => handleUpdateSystemConfig({ adsEnabled: !systemConfig.adsEnabled })}
                            className={`w-full py-1 rounded-xl font-mono text-[9px] font-bold ${
                              systemConfig.adsEnabled ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "bg-zinc-900 text-zinc-500"
                            }`}
                          >
                            {systemConfig.adsEnabled ? "LIVE" : "PAUSED"}
                          </button>
                        </div>

                        <div className="p-3 bg-white/[0.01] border border-white/5 rounded-2xl flex flex-col justify-between h-[100px]">
                          <p className="font-sans font-bold text-xs text-zinc-300">Short Video Feed</p>
                          <button
                            onClick={() => handleUpdateSystemConfig({ shortsEnabled: !systemConfig.shortsEnabled })}
                            className={`w-full py-1 rounded-xl font-mono text-[9px] font-bold ${
                              systemConfig.shortsEnabled ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-zinc-900 text-zinc-500"
                            }`}
                          >
                            {systemConfig.shortsEnabled ? "ACTIVE" : "INACTIVE"}
                          </button>
                        </div>

                        <div className="p-3 bg-white/[0.01] border border-white/5 rounded-2xl flex flex-col justify-between h-[100px]">
                          <p className="font-sans font-bold text-xs text-zinc-300">Livestream Broadcast</p>
                          <button
                            onClick={() => handleUpdateSystemConfig({ livestreamEnabled: !systemConfig.livestreamEnabled })}
                            className={`w-full py-1 rounded-xl font-mono text-[9px] font-bold ${
                              systemConfig.livestreamEnabled ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-zinc-900 text-zinc-500"
                            }`}
                          >
                            {systemConfig.livestreamEnabled ? "ON-AIR" : "MUTED"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Card 4: Global Royalty Settings */}
                    <div className="bg-zinc-950/40 border border-white/5 p-6 rounded-3xl space-y-4 md:col-span-2">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                        <Tag className="w-4 h-4 text-emerald-400" />
                        <h4 className="font-sans font-extrabold text-[11px] text-zinc-200 uppercase tracking-wider">Streaming Royalty Coefficient</h4>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-sans font-bold text-xs text-zinc-300">Global Playback Royalty Baseline</p>
                            <p className="text-[10px] text-zinc-500 font-sans">Base reward rate deposited automatically into creator wallets per unique organic playback.</p>
                          </div>
                          <span className="font-mono text-sm text-emerald-400 font-bold">${(systemConfig.royaltyRatePerStream || 0.0035).toFixed(4)} USD / stream</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-[9px] text-zinc-500 font-bold">$0.001</span>
                          <input
                            type="range"
                            min="0.001"
                            max="0.015"
                            step="0.0005"
                            value={systemConfig.royaltyRatePerStream || 0.0035}
                            onChange={(e) => handleUpdateSystemConfig({ royaltyRatePerStream: parseFloat(e.target.value) })}
                            className="w-full accent-emerald-400 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                          />
                          <span className="font-mono text-[9px] text-zinc-555 font-bold">$0.015</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION: GOOGLE INTEGRATIONS */}
              {activeTab === "google-integrations" && (
                <GoogleConsolePanel
                  currentUser={currentUser}
                  logActivity={logActivity}
                  showFeedback={showFeedback}
                />
              )}

              {/* SECTION: ANNOUNCEMENTS */}
              {activeTab === "announcements" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Draft Announcement */}
                  <div className="lg:col-span-5 bg-white/5 border border-white/5 rounded-3xl p-6 space-y-4">
                    <div className="flex items-center gap-2.5 border-b border-white/5 pb-4">
                      <Megaphone className="w-5 h-5 text-orange-400 animate-pulse" />
                      <div>
                        <h3 className="font-sans font-extrabold text-xs text-zinc-200 uppercase tracking-wider">Publish Bulletin</h3>
                        <p className="text-[10px] text-zinc-500 font-sans">Dispatch platform notifications to specific subsets of users.</p>
                      </div>
                    </div>

                    <form onSubmit={handlePublishAnnouncement} className="space-y-4">
                      <div className="space-y-1">
                        <label className="font-mono text-[9px] text-zinc-400 uppercase tracking-wider font-bold">Target Audience</label>
                        <select
                          value={announcementTarget}
                          onChange={(e: any) => setAnnouncementTarget(e.target.value)}
                          className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-orange-400 font-mono"
                        >
                          <option value="all">ALL USERS</option>
                          <option value="listener">LISTENERS ONLY</option>
                          <option value="artist">ARTISTS ONLY</option>
                          <option value="creator">CREATORS ONLY</option>
                          <option value="moderator">MODERATORS ONLY</option>
                          <option value="admin">ADMINISTRATORS ONLY</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="font-mono text-[9px] text-zinc-400 uppercase tracking-wider font-bold">Bulletin Title</label>
                        <input
                          type="text"
                          placeholder="Platform Update, Maintenance window, etc."
                          value={announcementTitle}
                          onChange={(e) => setAnnouncementTitle(e.target.value)}
                          className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-orange-400"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-mono text-[9px] text-zinc-400 uppercase tracking-wider font-bold">Bulletin Body</label>
                        <textarea
                          rows={4}
                          placeholder="Draft markdown-friendly content to be broadcasted..."
                          value={announcementBody}
                          onChange={(e) => setAnnouncementBody(e.target.value)}
                          className="w-full bg-zinc-950 border border-white/5 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-orange-400 leading-relaxed resize-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-mono text-[9px] text-zinc-400 uppercase tracking-wider font-bold flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-orange-400" />
                          Schedule Release (Optional)
                        </label>
                        <input
                          type="datetime-local"
                          value={announcementScheduledTime}
                          onChange={(e) => setAnnouncementScheduledTime(e.target.value)}
                          className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-orange-400 font-mono"
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="checkbox"
                          id="push-alert"
                          checked={announcementPushAlert}
                          onChange={(e) => setAnnouncementPushAlert(e.target.checked)}
                          className="accent-orange-400"
                        />
                        <label htmlFor="push-alert" className="font-sans text-[10px] text-zinc-400">
                          Force high-priority instant push popup overlay
                        </label>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-orange-500 hover:bg-orange-400 text-black font-extrabold text-[10px] uppercase py-3 rounded-xl transition-all font-mono tracking-wider cursor-pointer"
                      >
                        {announcementScheduledTime ? "Schedule Broadcast" : "Dispatch Live Bulletin"}
                      </button>
                    </form>
                  </div>

                  {/* Right Column: Historical Bulletins */}
                  <div className="lg:col-span-7 bg-white/5 border border-white/5 rounded-3xl p-6 space-y-4 flex flex-col">
                    <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold border-b border-white/5 pb-2">Active Broadcast Bulletins</p>
                    <div className="flex-1 overflow-y-auto max-h-[450px] space-y-3 pr-1">
                      {/* Subscriptions notifications log */}
                      <div className="space-y-2.5">
                        <div className="p-3.5 bg-zinc-950/40 border border-white/5 rounded-2xl space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-sans font-bold text-xs text-zinc-200">Welcome to Creator Studio 3.0</span>
                            <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-mono font-bold px-2 py-0.2 rounded border border-emerald-500/20">PUBLISHED</span>
                          </div>
                          <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">The SoundStream Creator studio is officially active! Check wallets and begin minting custom tracks instantly.</p>
                          <div className="flex items-center justify-between pt-1 border-t border-white/[0.03] mt-2 font-mono text-[8px] text-zinc-550">
                            <span>Target: ALL USERS</span>
                            <span>Jul 03, 2026</span>
                          </div>
                        </div>

                        <div className="p-3.5 bg-zinc-950/40 border border-white/5 rounded-2xl space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-sans font-bold text-xs text-zinc-200">Artist Royalty Adjustments</span>
                            <span className="bg-amber-500/15 text-amber-400 text-[8px] font-mono font-bold px-2 py-0.2 rounded border border-amber-500/20">PUBLISHED</span>
                          </div>
                          <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">The baseline royalty coefficient has been modified to $0.0035/stream to matches legal regulations.</p>
                          <div className="flex items-center justify-between pt-1 border-t border-white/[0.03] mt-2 font-mono text-[8px] text-zinc-550">
                            <span>Target: ARTISTS ONLY</span>
                            <span>Jul 03, 2026</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION: PK LIVE BATTLES */}
              {activeTab === "pk-battles" && (
                <div className="space-y-6">
                  
                  {/* Top Stats Cards Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-zinc-950/40 border border-white/5 p-4 rounded-3xl flex items-center justify-between">
                      <div>
                        <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Active Live PK Battles</p>
                        <p className="font-mono font-extrabold text-xl text-pink-500 mt-1">{activeBattles.length}</p>
                      </div>
                      <div className="bg-pink-500/10 text-pink-500 p-2 rounded-xl border border-pink-500/20">
                        <Flame className="w-5 h-5 animate-pulse" />
                      </div>
                    </div>

                    <div className="bg-zinc-950/40 border border-white/5 p-4 rounded-3xl flex items-center justify-between">
                      <div>
                        <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Default PK Duration</p>
                        <p className="font-mono font-extrabold text-xl text-indigo-400 mt-1">{systemConfig.battleDurationMinutes || 5} Min</p>
                      </div>
                      <div className="bg-indigo-500/10 text-indigo-400 p-2 rounded-xl border border-indigo-500/20">
                        <Clock className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="bg-zinc-950/40 border border-white/5 p-4 rounded-3xl flex items-center justify-between">
                      <div>
                        <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Arena Status</p>
                        <p className="font-mono font-extrabold text-xl text-emerald-400 mt-1">ONLINE</p>
                      </div>
                      <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-xl border border-emerald-500/20">
                        <Activity className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  {/* Settings and Active Battles list */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Left Column: PK Battle Arena Global Settings */}
                    <div className="lg:col-span-5 bg-zinc-950/40 border border-white/5 p-6 rounded-3xl space-y-4">
                      <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold border-b border-white/5 pb-2">
                        PK Global Configurations
                      </p>

                      <form onSubmit={handleSavePkDuration} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest font-mono">
                            Default Battle Duration (Minutes)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="1"
                              max="60"
                              value={pkDurationInput}
                              onChange={(e) => setPkDurationInput(e.target.value)}
                              className="w-full px-4 py-3 bg-black border border-white/10 rounded-2xl text-white font-mono text-xs focus:outline-none focus:border-pink-500"
                              placeholder="Default is 5"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-[10px] text-zinc-500">
                              mins
                            </span>
                          </div>
                          <p className="text-[9px] text-zinc-500 uppercase leading-normal">
                            All new creator live battle challenges will default to this duration countdown.
                          </p>
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-extrabold text-[10px] uppercase py-3 rounded-xl transition-all font-mono tracking-wider cursor-pointer"
                        >
                          Save PK Settings
                        </button>
                      </form>

                      {/* Info Alert */}
                      <div className="p-3 bg-pink-950/10 border border-pink-500/10 rounded-2xl flex items-start gap-3">
                        <Info className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                        <div className="text-[9px] text-zinc-400 uppercase leading-normal space-y-1 font-sans">
                          <p className="font-bold text-white">Admin Guidelines:</p>
                          <p>1. Terminating active battles will immediately call the endBattle transaction.</p>
                          <p>2. Points are permanently locked and converted into Diamond Earnings for the winner.</p>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Real-time Active Battles Monitor */}
                    <div className="lg:col-span-7 bg-zinc-950/40 border border-white/5 p-6 rounded-3xl space-y-4 flex flex-col">
                      <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold border-b border-white/5 pb-2">
                        Real-time PK Battles Monitor
                      </p>

                      <div className="flex-1 overflow-y-auto max-h-[400px] space-y-3 pr-1">
                        {activeBattles.length === 0 ? (
                          <div className="text-center py-16 space-y-2">
                            <Flame className="w-8 h-8 text-zinc-700 mx-auto" />
                            <p className="text-zinc-550 font-mono text-xs uppercase font-bold">No Active PK Battles</p>
                            <p className="text-[10px] text-zinc-600 uppercase font-mono">
                              There are currently no active creator face-offs streaming on the platform.
                            </p>
                          </div>
                        ) : (
                          activeBattles.map((battle) => {
                            const totalPoints = (battle.hostScore || 0) + (battle.opponentScore || 0);
                            const hostPct = totalPoints ? Math.round(((battle.hostScore || 0) / totalPoints) * 100) : 50;
                            const opponentPct = 100 - hostPct;
                            
                            return (
                              <div key={battle.id} className="p-4 bg-black/40 border border-white/5 rounded-2xl space-y-3 font-mono">
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="bg-pink-500/15 border border-pink-500/20 text-pink-400 font-bold px-2 py-0.5 rounded uppercase">
                                    LIVE FACE-OFF
                                  </span>
                                  <span className="text-zinc-500">
                                    ID: {battle.id.substring(0, 8)}...
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 items-center border-y border-white/5 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <img src={battle.hostPhotoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80"} className="w-7 h-7 rounded-full object-cover" />
                                    <div>
                                      <p className="font-sans font-bold text-xs text-white truncate max-w-[100px] uppercase">{battle.hostName}</p>
                                      <p className="text-[10px] text-pink-400 font-bold">{battle.hostScore?.toLocaleString()} pts</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 justify-end text-right">
                                    <div>
                                      <p className="font-sans font-bold text-xs text-white truncate max-w-[100px] uppercase">{battle.opponentName}</p>
                                      <p className="text-[10px] text-indigo-400 font-bold">{battle.opponentScore?.toLocaleString()} pts</p>
                                    </div>
                                    <img src={battle.opponentPhotoURL || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80"} className="w-7 h-7 rounded-full object-cover" />
                                  </div>
                                </div>

                                {/* Score Bar */}
                                <div className="space-y-1.5">
                                  <div className="h-2 rounded-full overflow-hidden bg-white/5 flex">
                                    <div className="h-full bg-pink-500 transition-all duration-500" style={{ width: `${hostPct}%` }} />
                                    <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${opponentPct}%` }} />
                                  </div>
                                  <div className="flex justify-between text-[9px] text-zinc-500">
                                    <span>{hostPct}% Host</span>
                                    <span>{opponentPct}% Opponent</span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-1 border-t border-white/[0.03]">
                                  <div className="flex items-center gap-1.5 text-zinc-500 text-[9px]">
                                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                                    <span>{battle.durationSeconds || 300}s timer</span>
                                  </div>
                                  <button
                                    onClick={() => handleForceEndBattle(battle.id)}
                                    className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition rounded text-[9px] font-bold uppercase cursor-pointer"
                                  >
                                    Force End Battle
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* SECTION: SECURITY & LOGS */}
              {activeTab === "security" && (
                <div className="space-y-6">
                  {/* Row of Security Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-zinc-950/40 border border-white/5 p-4 rounded-3xl flex items-center justify-between">
                      <div>
                        <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Failed Login Attempts</p>
                        <p className="font-mono font-extrabold text-xl text-red-400 mt-1">{failedLogins.length}</p>
                      </div>
                      <div className="bg-red-500/10 text-red-400 p-2 rounded-xl border border-red-500/20">
                        <ShieldAlert className="w-5 h-5 animate-pulse" />
                      </div>
                    </div>

                    <div className="bg-zinc-950/40 border border-white/5 p-4 rounded-3xl flex items-center justify-between">
                      <div>
                        <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Active Admin Sessions</p>
                        <p className="font-mono font-extrabold text-xl text-cyan-400 mt-1">{activeSessions.length}</p>
                      </div>
                      <div className="bg-cyan-500/10 text-cyan-400 p-2 rounded-xl border border-cyan-500/20">
                        <Users2 className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="bg-zinc-950/40 border border-white/5 p-4 rounded-3xl flex items-center justify-between">
                      <div>
                        <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Threat Alerts Pending</p>
                        <p className="font-mono font-extrabold text-xl text-amber-500 mt-1">{securityAlerts.length}</p>
                      </div>
                      <div className="bg-amber-500/10 text-amber-500 p-2 rounded-xl border border-amber-500/20">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Panel: Real-time threat detection feed */}
                    <div className="lg:col-span-5 bg-zinc-950/40 border border-white/5 p-6 rounded-3xl space-y-4">
                      <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold border-b border-white/5 pb-2">Active Threat Detection Feed</p>
                      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                        {securityAlerts.map(alert => (
                          <div key={alert.id} className="p-3 bg-red-950/20 border border-red-500/15 rounded-xl space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[9px] font-bold text-red-400 uppercase tracking-wide">{alert.severity} ALERT</span>
                              <span className="font-mono text-[8px] text-zinc-500">{alert.timestamp}</span>
                            </div>
                            <p className="text-[10px] text-zinc-300 font-sans leading-relaxed">{alert.description}</p>
                          </div>
                        ))}

                        {/* Dummy fallback events if none */}
                        {securityAlerts.length === 0 && (
                          <div className="text-center py-6">
                            <p className="text-zinc-500 font-mono text-xs">No pending threat alerts. Firewall state: HEALED.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Panel: Level 4 audit logs ledger */}
                    <div className="lg:col-span-7 bg-zinc-950/40 border border-white/5 p-6 rounded-3xl space-y-4 flex flex-col">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Level 4 Audit Log Ledger</p>
                        <button
                          onClick={() => setActivityLogs([])}
                          className="font-mono text-[8px] uppercase tracking-widest text-zinc-500 hover:text-zinc-200 cursor-pointer"
                        >
                          Clear View
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto max-h-[350px] space-y-2 pr-1 font-mono text-[10px]">
                        {activityLogs.map((log) => (
                          <div 
                            key={log.id} 
                            className="p-2.5 bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.03] rounded-xl flex items-start gap-3 text-left transition-colors"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${
                              log.type === "success" ? "bg-emerald-400" : log.type === "warn" ? "bg-red-400 animate-ping" : "bg-cyan-400"
                            }`} />
                            <div className="flex-1">
                              <div className="flex items-center justify-between text-[8px] text-zinc-500 mb-0.5">
                                <span>UTC LOG ENTRY</span>
                                <span>{log.time}</span>
                              </div>
                              <p className="text-zinc-300 tracking-tight leading-relaxed">{log.text}</p>
                            </div>
                          </div>
                        ))}

                        {activityLogs.length === 0 && (
                          <div className="text-center py-6">
                            <p className="text-zinc-500 font-mono text-xs">Ledger is empty. Activities will stream as admin logs occur.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION: LIVE MANAGEMENT */}
              {activeTab === "live-management" && (
                <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div>
                      <h3 className="font-sans font-bold text-sm text-zinc-200 uppercase tracking-wide">
                        Live Stream Governance ({liveStreamsList.filter(s => s.status === "ended").length})
                      </h3>
                      <p className="text-[10px] text-zinc-500">Monitor ended livestreams, view deep statistical analytics, clear chat caches, wipe gift transactions, or permanently purge stream records.</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-[10px] font-mono text-zinc-500 uppercase tracking-wider pb-3">
                          <th className="pb-3 font-bold">Stream Details</th>
                          <th className="pb-3 font-bold">Creator</th>
                          <th className="pb-3 font-bold text-center">Duration</th>
                          <th className="pb-3 font-bold text-center">Viewers (Peak)</th>
                          <th className="pb-3 font-bold text-center">Engagement</th>
                          <th className="pb-3 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {liveStreamsList.filter(s => s.status === "ended").length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-xs font-mono text-zinc-500">
                              No ended livestreams found in Firestore database history.
                            </td>
                          </tr>
                        ) : (
                          liveStreamsList.filter(s => s.status === "ended").map((stream) => {
                            const durationSecs = stream.duration || 0;
                            const hours = Math.floor(durationSecs / 3600);
                            const minutes = Math.floor((durationSecs % 3600) / 60);
                            const seconds = durationSecs % 60;
                            const durationString = hours > 0 
                              ? `${hours}h ${minutes}m` 
                              : `${minutes}m ${seconds}s`;

                            return (
                              <tr key={stream.id} className="hover:bg-white/[0.01] transition-colors">
                                <td className="py-3.5 pr-2">
                                  <div className="flex items-center gap-3">
                                    <img 
                                      src={stream.thumbnailUrl || "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=200&auto=format&fit=crop"} 
                                      alt={stream.title} 
                                      className="w-12 h-8 rounded-lg object-cover border border-white/10 shrink-0"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div>
                                      <p className="font-bold text-xs text-zinc-200 truncate uppercase tracking-tight max-w-[180px]">{stream.title}</p>
                                      <p className="text-[9px] text-zinc-500 font-mono">ID: {stream.id}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3.5 text-xs text-zinc-350">
                                  <span className="font-semibold text-zinc-300 block">{stream.creatorName}</span>
                                  <span className="text-[9px] text-zinc-500 font-mono block">Host ID: {stream.creatorId}</span>
                                </td>
                                <td className="py-3.5 text-xs text-zinc-350 text-center font-mono">
                                  {durationString}
                                </td>
                                <td className="py-3.5 text-xs text-center font-mono">
                                  <span className="text-zinc-200">{stream.totalViewers || 0}</span>
                                  <span className="text-zinc-500 text-[10px] block">Peak: {stream.peakViewers || 0}</span>
                                </td>
                                <td className="py-3.5 text-xs text-center font-mono space-y-0.5">
                                  <span className="text-pink-400 block">❤️ {stream.likes || 0} Likes</span>
                                  <span className="text-amber-500 block">🎁 {stream.virtualGiftsCount || 0} Gifts</span>
                                </td>
                                <td className="py-3.5 text-right">
                                  <div className="flex items-center justify-end gap-1.5 flex-wrap max-w-[280px] ml-auto">
                                    <button
                                      onClick={() => setSelectedLiveStream(stream)}
                                      className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-bold uppercase tracking-wide rounded-lg cursor-pointer transition-colors"
                                    >
                                      ✓ Details
                                    </button>
                                    
                                    <button
                                      onClick={() => {
                                        setStreamToDelete(stream);
                                        setDeleteActionType("permanently_delete");
                                        setShowDeleteConfirm(true);
                                      }}
                                      className="px-2.5 py-1.5 bg-red-650 hover:bg-red-600 text-white border border-red-500/10 text-[10px] font-bold uppercase tracking-wide rounded-lg cursor-pointer transition-colors"
                                    >
                                      Delete Forever
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* LIVE STREAM DETAILS MODAL */}
              {selectedLiveStream && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                  <div className="bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative">
                    
                    {/* Modal Header */}
                    <div className="p-5 border-b border-white/5 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-sm uppercase tracking-wide text-white">Stream Governance &amp; Metrics</h3>
                        <p className="text-[10px] text-zinc-500 font-mono">Stream ID: {selectedLiveStream.id}</p>
                      </div>
                      <button
                        onClick={() => setSelectedLiveStream(null)}
                        className="text-zinc-400 hover:text-white transition-colors p-1 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Modal Content */}
                    <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-thin">
                      
                      {/* Basic Info Row */}
                      <div className="flex gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                        <img 
                          src={selectedLiveStream.thumbnailUrl || "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=200&auto=format&fit=crop"} 
                          alt={selectedLiveStream.title}
                          className="w-24 h-16 rounded-xl object-cover border border-white/10 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="space-y-1 min-w-0">
                          <h4 className="font-black text-sm uppercase text-white truncate">{selectedLiveStream.title}</h4>
                          <p className="text-xs text-zinc-300">Host: <span className="font-bold text-indigo-400">{selectedLiveStream.creatorName}</span></p>
                          <p className="text-[10px] text-zinc-500 font-mono">Creator ID: {selectedLiveStream.creatorId}</p>
                        </div>
                      </div>

                      {/* Comprehensive Stats Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div className="p-3.5 bg-zinc-950/60 border border-white/5 rounded-2xl">
                          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">Duration</span>
                          <span className="text-xs font-bold text-zinc-100 font-mono block">
                            {Math.floor((selectedLiveStream.duration || 0) / 60)}m {(selectedLiveStream.duration || 0) % 60}s
                          </span>
                        </div>
                        <div className="p-3.5 bg-zinc-950/60 border border-white/5 rounded-2xl">
                          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">Total Viewers</span>
                          <span className="text-xs font-bold text-zinc-100 font-mono block">{selectedLiveStream.totalViewers || 0}</span>
                        </div>
                        <div className="p-3.5 bg-zinc-950/60 border border-white/5 rounded-2xl">
                          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">Peak Viewers</span>
                          <span className="text-xs font-bold text-zinc-100 font-mono block">{selectedLiveStream.peakViewers || 0}</span>
                        </div>
                        <div className="p-3.5 bg-zinc-950/60 border border-white/5 rounded-2xl">
                          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">Total Likes</span>
                          <span className="text-xs font-bold text-pink-400 font-mono block">❤️ {selectedLiveStream.likes || 0}</span>
                        </div>
                        <div className="p-3.5 bg-zinc-950/60 border border-white/5 rounded-2xl">
                          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">Total Gifts</span>
                          <span className="text-xs font-bold text-amber-500 font-mono block">🎁 {selectedLiveStream.virtualGiftsCount || 0}</span>
                        </div>
                        <div className="p-3.5 bg-zinc-950/60 border border-white/5 rounded-2xl">
                          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">Creator Earnings</span>
                          <span className="text-xs font-bold text-emerald-400 font-mono block">${((selectedLiveStream.virtualGiftsCount || 0) * 0.05).toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Timestamps */}
                      <div className="p-4 bg-zinc-950/40 border border-white/5 rounded-2xl space-y-2 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-zinc-500 font-mono">START TIME:</span>
                          <span className="text-zinc-300 font-mono">{selectedLiveStream.createdAt ? new Date(selectedLiveStream.createdAt).toLocaleString() : "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500 font-mono">END TIME:</span>
                          <span className="text-zinc-300 font-mono">{selectedLiveStream.endedAt ? new Date(selectedLiveStream.endedAt).toLocaleString() : "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500 font-mono">STATUS:</span>
                          <span className="text-zinc-400 font-black uppercase font-mono tracking-widest">{selectedLiveStream.status}</span>
                        </div>
                      </div>

                      {/* Granular Administrator Governance Operations Panel */}
                      <div className="space-y-3.5 pt-2">
                        <span className="text-[10px] font-mono text-red-400 font-bold uppercase tracking-wider block border-b border-red-500/20 pb-1">
                          ⚠️ Administrator Controls
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              setStreamToDelete(selectedLiveStream);
                              setDeleteActionType("delete_doc");
                              setShowDeleteConfirm(true);
                            }}
                            className="p-2.5 bg-zinc-950/80 hover:bg-red-950/40 text-zinc-300 hover:text-red-400 border border-white/5 rounded-xl text-left text-[11px] font-bold uppercase flex items-center justify-between transition-all cursor-pointer"
                          >
                            <span>Delete Firestore Stream Doc</span>
                            <Trash2 className="w-3.5 h-3.5 opacity-60" />
                          </button>

                          <button
                            onClick={() => {
                              setStreamToDelete(selectedLiveStream);
                              setDeleteActionType("delete_chat");
                              setShowDeleteConfirm(true);
                            }}
                            className="p-2.5 bg-zinc-950/80 hover:bg-red-950/40 text-zinc-300 hover:text-red-400 border border-white/5 rounded-xl text-left text-[11px] font-bold uppercase flex items-center justify-between transition-all cursor-pointer"
                          >
                            <span>Delete Chat History</span>
                            <MessageSquare className="w-3.5 h-3.5 opacity-60" />
                          </button>

                          <button
                            onClick={() => {
                              setStreamToDelete(selectedLiveStream);
                              setDeleteActionType("delete_gifts");
                              setShowDeleteConfirm(true);
                            }}
                            className="p-2.5 bg-zinc-950/80 hover:bg-red-950/40 text-zinc-300 hover:text-red-400 border border-white/5 rounded-xl text-left text-[11px] font-bold uppercase flex items-center justify-between transition-all cursor-pointer"
                          >
                            <span>Delete Gift Records</span>
                            <Database className="w-3.5 h-3.5 opacity-60" />
                          </button>

                          <button
                            onClick={() => {
                              setStreamToDelete(selectedLiveStream);
                              setDeleteActionType("delete_peers");
                              setShowDeleteConfirm(true);
                            }}
                            className="p-2.5 bg-zinc-950/80 hover:bg-red-950/40 text-zinc-300 hover:text-red-400 border border-white/5 rounded-xl text-left text-[11px] font-bold uppercase flex items-center justify-between transition-all cursor-pointer"
                          >
                            <span>Delete Viewer Statistics</span>
                            <Users className="w-3.5 h-3.5 opacity-60" />
                          </button>

                          {selectedLiveStream.thumbnailUrl && (
                            <button
                              onClick={() => {
                                setStreamToDelete(selectedLiveStream);
                                setDeleteActionType("delete_thumbnail");
                                setShowDeleteConfirm(true);
                              }}
                              className="p-2.5 bg-zinc-950/80 hover:bg-red-950/40 text-zinc-300 hover:text-red-400 border border-white/5 rounded-xl text-left text-[11px] font-bold uppercase flex items-center justify-between transition-all cursor-pointer sm:col-span-2"
                            >
                              <span>Delete Thumbnail (Wipe URL)</span>
                              <Trash2 className="w-3.5 h-3.5 opacity-60" />
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setStreamToDelete(selectedLiveStream);
                              setDeleteActionType("permanently_delete");
                              setShowDeleteConfirm(true);
                            }}
                            className="p-3 bg-red-650 hover:bg-red-600 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider text-center flex items-center justify-center gap-2 transition-all cursor-pointer sm:col-span-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Permanently Delete Livestream</span>
                          </button>
                        </div>
                      </div>

                    </div>

                    {/* Modal Footer */}
                    <div className="p-4 bg-black/20 border-t border-white/5 flex justify-end">
                      <button
                        onClick={() => setSelectedLiveStream(null)}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Close
                      </button>
                    </div>

                  </div>
                </div>
              )}

              {/* DELETE CONFIRMATION MODAL */}
              {showDeleteConfirm && streamToDelete && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
                  <div className="bg-zinc-900 border border-red-500/20 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative p-6 space-y-6">
                    <div className="w-16 h-16 rounded-full bg-red-650/15 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto animate-pulse">
                      <AlertTriangle className="w-8 h-8" />
                    </div>
                    <div className="space-y-3 text-center">
                      <h3 className="font-extrabold text-base uppercase tracking-tight text-white font-sans">
                        Confirm Deletion Action
                      </h3>
                      <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                        Are you sure you want to permanently delete this livestream? This action cannot be undone.
                      </p>
                      <p className="text-[10px] font-mono text-zinc-350 bg-black/35 p-3 rounded-2xl text-left leading-relaxed font-semibold">
                        Target Action: {deleteActionType.toUpperCase()}<br/>
                        Stream Title: {streamToDelete.title}<br/>
                        Stream ID: {streamToDelete.id}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setStreamToDelete(null);
                        }}
                        className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={processAdminDeleteAction}
                        disabled={isDeletingData}
                        className="flex-1 bg-red-650 hover:bg-red-600 disabled:bg-red-800 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {isDeletingData ? (
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          "Delete Forever"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}
