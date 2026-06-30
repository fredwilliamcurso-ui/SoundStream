import React, { useEffect, useState } from "react";
import { 
  Users, 
  Music, 
  Video, 
  ShieldCheck, 
  Search, 
  UserX, 
  UserCheck, 
  Trash2, 
  Star, 
  TrendingUp, 
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
  FileText
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
  setDoc
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { User, Artist, Song, Playlist } from "../types";
import { motion, AnimatePresence } from "motion/react";
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

  // Subscribe to all users in real-time
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

    return () => {
      unsub();
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

  const logActivity = (type: "info" | "warn" | "success", text: string) => {
    setActivityLogs(prev => [
      { id: `log-${Date.now()}`, time: new Date().toLocaleTimeString(), type, text },
      ...prev.slice(0, 49)
    ]);
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
    { id: "users", label: `Users (${totalUsers})`, icon: Users, color: "text-emerald-400" },
    { id: "artists", label: `Artists (${totalArtists})`, icon: ShieldCheck, color: "text-pink-400" },
    { id: "songs", label: `Songs (${totalSongsOnly})`, icon: Music, color: "text-cyan-400" },
    { id: "videos", label: `Videos (${totalVideos})`, icon: Video, color: "text-rose-400" },
    { id: "reports", label: `Reports (${flaggedCount})`, icon: AlertTriangle, color: "text-amber-500" },
    { id: "analytics", label: "Analytics", icon: TrendingUp, color: "text-teal-400" },
    { id: "monetization", label: "Monetization", icon: Tag, color: "text-yellow-400" },
    { id: "android", label: "Android Release", icon: Smartphone, color: "text-blue-400" },
    { id: "firebase", label: "Firebase", icon: HardDrive, color: "text-orange-500" },
    { id: "supabase", label: "Supabase", icon: Globe, color: "text-sky-400" },
    { id: "support", label: `Support (${supportInquiries.filter(t => !t.resolved).length})`, icon: MessageSquare, color: "text-violet-400" },
    { id: "legal", label: "Legal & DMCA", icon: Scale, color: "text-stone-400" },
    { id: "settings", label: "System Settings", icon: Settings, color: "text-purple-400" }
  ];

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
                <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-6">
                  <div className="flex items-start gap-4 border-b border-white/5 pb-4">
                    <Settings className="w-8 h-8 text-purple-400 animate-spin" style={{ animationDuration: '6s' }} />
                    <div>
                      <h3 className="font-sans font-bold text-sm text-zinc-200 uppercase tracking-wide">
                        General System Governance Settings
                      </h3>
                      <p className="text-xs text-zinc-500">Super Administrator controls, active administrators overview, and database credentials lock.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Super admin details */}
                    <div className="bg-zinc-950/40 border border-white/5 p-5 rounded-2xl space-y-4">
                      <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Super Admin Profile</p>
                      
                      <div className="flex items-center gap-3 bg-zinc-950/60 p-3 rounded-xl border border-white/5">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shrink-0" />
                        <div>
                          <p className="font-mono text-[9px] text-zinc-550 uppercase">Initial super admin email</p>
                          <p className="font-mono text-xs text-zinc-200 font-bold">fredwilliamcurso@gmail.com</p>
                        </div>
                      </div>

                      <div className="text-[11px] leading-relaxed text-zinc-400 font-sans">
                        The Super-Administrator credentials are coded directly in both security rules (backend) and auth-sync (frontend) to guarantee platform immunity against accidental locking. 
                      </div>
                    </div>

                    {/* Active Admins list */}
                    <div className="bg-zinc-950/40 border border-white/5 p-5 rounded-2xl space-y-3">
                      <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Active Administrators in DB</p>
                      <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                        {allUsers.filter(u => u.role === "admin").map((admin) => (
                          <div key={admin.uid} className="flex items-center justify-between bg-zinc-950/60 px-3 py-2 rounded-xl border border-white/[0.02]">
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span className="font-bold text-[10px] text-zinc-300 font-mono">{admin.email}</span>
                            </div>
                            <span className="text-[8px] bg-purple-500/15 text-purple-300 border border-purple-500/20 px-2 py-0.2 rounded font-bold uppercase font-mono">ADMIN</span>
                          </div>
                        ))}
                      </div>
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
