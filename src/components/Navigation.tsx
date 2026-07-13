import React, { useState, useEffect } from "react";
import { 
  Home, 
  Search, 
  TrendingUp, 
  Heart, 
  Clock, 
  Youtube, 
  Award, 
  Bell, 
  Settings, 
  HelpCircle, 
  FileText, 
  Upload, 
  Video, 
  BarChart3, 
  Disc, 
  MessageSquare, 
  CheckCircle2, 
  ShieldCheck, 
  Users, 
  AlertTriangle, 
  UserCheck, 
  CreditCard, 
  Megaphone, 
  Smartphone, 
  Lock, 
  UserPlus, 
  ClipboardList, 
  LogOut, 
  Menu, 
  X, 
  Radio, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  Languages, 
  Moon, 
  Sun,
  Inbox,
  Award as PremiumIcon,
  Check,
  Download,
  Gamepad2,
  Building
} from "lucide-react";
import { User, Song, Artist, Playlist } from "../types";
import { admob } from "../lib/admob";
import { analytics } from "../lib/analytics";
import { doc, updateDoc, deleteField, collection, query, where, getDocs } from "firebase/firestore";
import { db, uploadProfilePicture } from "../lib/firebase";
import { motion, AnimatePresence } from "motion/react";
// @ts-ignore
import logoUrl from "../assets/images/soundstream_logo_1782150206757.jpg";

interface NavigationProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: User | null;
  isArtist: boolean;
  onLogout: () => void;
  onBecomeArtist: () => void;
  isAdmin?: boolean;
  onWatchRewardedAd?: () => void;
  setLibraryTabSection?: (section: string) => void;
  isInstallable?: boolean;
  isAppInstalled?: boolean;
  onInstall?: () => void;
  isAndroid?: boolean;
  isIOS?: boolean;
  onShowIOSPrompt?: () => void;
  playlists?: Playlist[];
  songs?: Song[];
  artists?: Artist[];
  favorites?: string[];
  followingArtists?: string[];
  recentlyPlayed?: { songId: string; playedAt: string }[];
}

export default function Navigation({
  currentTab,
  setCurrentTab,
  currentUser,
  isArtist,
  onLogout,
  onBecomeArtist,
  isAdmin = false,
  onWatchRewardedAd,
  setLibraryTabSection,
  isInstallable = false,
  isAppInstalled = false,
  onInstall,
  isAndroid = false,
  isIOS = false,
  onShowIOSPrompt,
  playlists = [],
  songs = [],
  artists = [],
  favorites = [],
  followingArtists = [],
  recentlyPlayed = []
}: NavigationProps) {
  const [imgError, setImgError] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Interactive modal states
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  
  // Localized preferences
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [language, setLanguage] = useState("English");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [audioQuality, setAudioQuality] = useState("High Fidelity (320kbps)");

  // SoundStream Profile system states
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [isPrivateProfile, setIsPrivateProfile] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [settingsTab, setSettingsTab] = useState<"view" | "edit" | "system">("view");
  const [initiatingDonation, setInitiatingDonation] = useState(false);

  const handleInitiateDonationSidebar = async () => {
    if (!currentUser) return;
    setInitiatingDonation(true);
    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: currentUser.uid,
          email: currentUser.email || "",
          packageId: "donation",
          amount: 15.00,
          customName: "SoundStream Support Donation"
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to establish checkout session.");
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Stripe checkout URL is missing.");
      }
    } catch (err: any) {
      console.error("❌ Stripe donation error:", err);
      alert(err.message || "Failed to initiate secure donation. Please try again from the Legal & Support tab.");
      setInitiatingDonation(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      setEditDisplayName(currentUser.displayName || currentUser.username || "");
      setEditUsername(currentUser.username || "");
      setEditBio(currentUser.bio || "");
      setEditCountry(currentUser.country || "");
      setEditWebsite(currentUser.website || "");
      setIsPrivateProfile(currentUser.isPrivate || false);
    }
  }, [currentUser, showSettings]);

  const isValidUrl = (url: string): boolean => {
    if (!url) return true;
    let testUrl = url;
    if (!/^https?:\/\//i.test(url)) {
      testUrl = 'https://' + url;
    }
    try {
      const parsed = new URL(testUrl);
      return parsed.hostname.includes('.') && parsed.hostname.length >= 4;
    } catch (_) {
      return false;
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setUploadingImage(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const downloadURL = await uploadProfilePicture(currentUser.uid, file);
      
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        photoURL: downloadURL,
        updatedAt: new Date().toISOString()
      });

      setProfileSuccess("Profile picture updated successfully!");
      triggerToast("New profile picture applied.");
    } catch (err: any) {
      console.error("Error uploading profile image:", err);
      setProfileError(err.message || "Failed to upload image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);

    if (!editDisplayName.trim()) {
      setProfileError("Display name cannot be empty.");
      setSavingProfile(false);
      return;
    }

    const cleanUsername = editUsername.trim();
    if (!cleanUsername) {
      setProfileError("Username cannot be empty.");
      setSavingProfile(false);
      return;
    }

    if (editWebsite.trim() && !isValidUrl(editWebsite.trim())) {
      setProfileError("Please enter a valid website URL (e.g. https://example.com).");
      setSavingProfile(false);
      return;
    }

    try {
      if (cleanUsername.toLowerCase() !== currentUser.username.toLowerCase()) {
        const usersRef = collection(db, "users");
        const qLowercase = query(usersRef, where("username_lowercase", "==", cleanUsername.toLowerCase()));
        const snapLowercase = await getDocs(qLowercase);
        
        let taken = false;
        snapLowercase.forEach((doc) => {
          if (doc.id !== currentUser.uid) taken = true;
        });

        if (taken) {
          setProfileError(`The username "${cleanUsername}" is already taken. Please try another one.`);
          setSavingProfile(false);
          return;
        }

        const qStandard = query(usersRef, where("username", "==", cleanUsername));
        const snapStandard = await getDocs(qStandard);
        snapStandard.forEach((doc) => {
          if (doc.id !== currentUser.uid) taken = true;
        });

        if (taken) {
          setProfileError(`The username "${cleanUsername}" is already taken. Please try another one.`);
          setSavingProfile(false);
          return;
        }
      }

      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        displayName: editDisplayName.trim(),
        username: cleanUsername,
        username_lowercase: cleanUsername.toLowerCase(),
        bio: editBio.trim(),
        country: editCountry.trim(),
        website: editWebsite.trim(),
        isPrivate: isPrivateProfile,
        updatedAt: new Date().toISOString()
      });

      setProfileSuccess("Profile updated successfully!");
      triggerToast("Profile changes saved to cloud.");
      setTimeout(() => {
        setSettingsTab("view");
        setProfileSuccess(null);
      }, 1500);
    } catch (err: any) {
      console.error("Error saving user profile:", err);
      setProfileError(`Failed to save changes: ${err.message || err}`);
    } finally {
      setSavingProfile(false);
    }
  };

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
  };

  const handleLinkSoundstream = async () => {
    if (!currentUser) return;
    try {
      const response = await fetch(`/api/auth/soundstream/url?userId=${currentUser.uid}&isArtist=${isArtist}`);
      if (!response.ok) {
        throw new Error("Failed to fetch Soundstream link URL.");
      }
      const { url } = await response.json();
      const width = 580;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      const popup = window.open(
        url,
        "soundstream_link_popup",
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,status=yes`
      );
      if (!popup) {
        setToastMessage("Please allow popups for this site to link with Soundstream.");
      }
    } catch (error: any) {
      setToastMessage(error.message || "Soundstream linking failed.");
    }
  };

  const handleUnlinkSoundstream = async () => {
    if (!currentUser) return;
    try {
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        soundstreamId: deleteField(),
        soundstreamUsername: deleteField(),
        soundstreamAccessToken: deleteField()
      });

      if (isArtist) {
        const artistRef = doc(db, "artists", currentUser.uid);
        await updateDoc(artistRef, {
          soundstreamId: deleteField(),
          soundstreamUsername: deleteField()
        });
      }

      setToastMessage("Soundstream account unlinked successfully.");
    } catch (error: any) {
      console.error("Failed to unlink Soundstream:", error);
      setToastMessage("Failed to unlink Soundstream account.");
    }
  };

  useEffect(() => {
    const handleSoundstreamLinkMessage = async (event: MessageEvent) => {
      if (event.data?.type === "SOUNDSTREAM_AUTH_SUCCESS") {
        const { openId, username, accessToken, userId, isArtist: authIsArtist } = event.data.data;
        if (!userId || !currentUser || userId !== currentUser.uid) return;

        try {
          // 1. Update user profile
          const userRef = doc(db, "users", currentUser.uid);
          await updateDoc(userRef, {
            soundstreamId: openId,
            soundstreamUsername: username,
            soundstreamAccessToken: accessToken
          });

          // 2. Update artist profile if registered
          if (isArtist || authIsArtist) {
            const artistRef = doc(db, "artists", currentUser.uid);
            await updateDoc(artistRef, {
              soundstreamId: openId,
              soundstreamUsername: username
            });
          }

          setToastMessage(`Successfully connected @${username}!`);
        } catch (error: any) {
          console.error("Failed to update Firestore with Soundstream details:", error);
          setToastMessage("Failed to connect Soundstream account.");
        }
      }
    };

    window.addEventListener("message", handleSoundstreamLinkMessage);
    return () => window.removeEventListener("message", handleSoundstreamLinkMessage);
  }, [currentUser, isArtist]);

  // Helper to determine the single active role
  const getActiveRole = () => {
    if (isAdmin) return "Admin";
    if (isArtist) return "Artist";
    return "Listener";
  };

  const activeRole = getActiveRole();

  // Navigation handlers
  const handleNavigation = (tabId: string, subTab?: string, librarySection?: string) => {
    setCurrentTab(tabId);
    setIsDrawerOpen(false); // Close mobile drawer if open
    
    if (librarySection && setLibraryTabSection) {
      setLibraryTabSection(librarySection);
    }
    
    if (subTab) {
      if (tabId === "upload") {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("set-upload-subtab", { detail: subTab }));
        }, 30);
      } else if (tabId === "admin") {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("set-admin-tab", { detail: subTab }));
        }, 30);
      }
    }
  };

  // Modals / dialog handlers
  const openModal = (modalType: "notifications" | "settings" | "comments" | "verification") => {
    setIsDrawerOpen(false);
    if (modalType === "notifications") setShowNotifications(true);
    if (modalType === "settings") setShowSettings(true);
    if (modalType === "comments") setShowComments(true);
    if (modalType === "verification") setShowVerification(true);
  };

  // 1. LISTENER MENU ITEMS
  const listenerMenuItems = [
    { id: "home", label: "Home Feed", icon: Home, action: () => handleNavigation("home") },
    { id: "shorts", label: "Shorts Feed", icon: Video, action: () => handleNavigation("shorts") },
    { id: "live", label: "Live Streaming", icon: Radio, action: () => handleNavigation("live") },
    { id: "live-center", label: "Live Center", icon: Sparkles, action: () => handleNavigation("live-center") },
    { id: "games", label: "Games Center", icon: Gamepad2, action: () => handleNavigation("games") },
    { id: "agency", label: "Agency & Record Label", icon: Building, action: () => handleNavigation("agency") },
    { id: "ads", label: "Ads Manager", icon: Megaphone, action: () => handleNavigation("ads") },
    { id: "wallet", label: "My Wallet", icon: CreditCard, action: () => handleNavigation("wallet") },
    { id: "leaderboards", label: "Leaderboards", icon: PremiumIcon, action: () => handleNavigation("leaderboards") },
    { id: "chat", label: "Messages", icon: MessageSquare, action: () => handleNavigation("chat") },
    { id: "search", label: "Browse & Search", icon: Search, action: () => handleNavigation("search") },
    { id: "trending", label: "Trending", icon: TrendingUp, action: () => handleNavigation("trending") },
    { id: "playlists", label: "My Playlists", icon: Disc, action: () => handleNavigation("library", undefined, "playlists") },
    { id: "liked", label: "Liked Songs", icon: Heart, action: () => handleNavigation("library", undefined, "liked") },
    { id: "recent", label: "Recently Played", icon: Clock, action: () => handleNavigation("library", undefined, "recent") },
    { id: "ytsync", label: "YT Sync Hub", icon: Youtube, action: () => handleNavigation("yt-sync") },
    { id: "premium", label: "Premium Upgrade", icon: Award, action: () => handleNavigation("premium") },
    { id: "notifications", label: "Notifications", icon: Bell, action: () => openModal("notifications") },
    { id: "settings", label: "Settings", icon: Settings, action: () => openModal("settings") },
    { id: "legal", label: "Legal & Support", icon: HelpCircle, action: () => handleNavigation("legal") },
  ];

  // 2. ARTIST MENU ITEMS
  const artistMenuItems = [
    { id: "dashboard", label: "Artist Dashboard", icon: Radio, action: () => handleNavigation("upload", "manager") },
    { id: "live", label: "Live Streaming", icon: Radio, action: () => handleNavigation("live") },
    { id: "live-center", label: "Live Center", icon: Sparkles, action: () => handleNavigation("live-center") },
    { id: "games", label: "Games Center", icon: Gamepad2, action: () => handleNavigation("games") },
    { id: "agency", label: "Agency & Record Label", icon: Building, action: () => handleNavigation("agency") },
    { id: "ads", label: "Ads Manager", icon: Megaphone, action: () => handleNavigation("ads") },
    { id: "creator-hub", label: "Creator Studio", icon: PremiumIcon, action: () => handleNavigation("creator-hub") },
    { id: "wallet", label: "My Wallet", icon: CreditCard, action: () => handleNavigation("wallet") },
    { id: "leaderboards", label: "Leaderboards", icon: Award, action: () => handleNavigation("leaderboards") },
    { id: "shorts", label: "Shorts Feed", icon: Video, action: () => handleNavigation("shorts") },
    { id: "chat", label: "Messages", icon: MessageSquare, action: () => handleNavigation("chat") },
    { id: "upload", label: "Upload Music", icon: Upload, action: () => handleNavigation("upload", "upload") },
    { id: "upload-video", label: "Upload Videos", icon: Video, action: () => handleNavigation("upload", "upload") },
    { id: "analytics", label: "Analytics", icon: BarChart3, action: () => handleNavigation("upload", "manager") },
    { id: "releases", label: "My Releases", icon: Disc, action: () => handleNavigation("upload", "manager") },
    { id: "comments", label: "Comments", icon: MessageSquare, action: () => openModal("comments") },
    { id: "verification", label: "Verification Status", icon: CheckCircle2, action: () => openModal("verification") },
    { id: "settings", label: "Settings", icon: Settings, action: () => openModal("settings") },
    { id: "legal", label: "Legal & Support", icon: HelpCircle, action: () => handleNavigation("legal") },
  ];

  // 3. ADMIN MENU ITEMS
  const adminMenuItems = [
    { id: "admin-hq", label: "Admin HQ", icon: ShieldCheck, action: () => handleNavigation("admin", "dashboard") },
    { id: "games", label: "Games Center", icon: Gamepad2, action: () => handleNavigation("games") },
    { id: "agency", label: "Agency & Record Label", icon: Building, action: () => handleNavigation("agency") },
    { id: "ads", label: "Ads Manager", icon: Megaphone, action: () => handleNavigation("ads") },
    { id: "users", label: "User Management", icon: Users, action: () => handleNavigation("admin", "users") },
    { id: "moderation", label: "Content Moderation", icon: AlertTriangle, action: () => handleNavigation("admin", "reports") },
    { id: "verification", label: "Artist Verification", icon: UserCheck, action: () => handleNavigation("admin", "artists") },
    { id: "analytics", label: "Platform Analytics", icon: BarChart3, action: () => handleNavigation("admin", "analytics") },
    { id: "subscriptions", label: "Subscription Management", icon: CreditCard, action: () => handleNavigation("admin", "monetization") },
    { id: "admin-ads", label: "Advertisements", icon: Megaphone, action: () => handleNavigation("admin", "monetization") },
    { id: "settings", label: "Platform Settings", icon: Settings, action: () => handleNavigation("admin", "settings") },
    { id: "android", label: "Android Releases", icon: Smartphone, action: () => handleNavigation("admin", "android") },
    { id: "manage-admins", label: "Manage Admins", icon: Lock, action: () => handleNavigation("admin", "users") },
    { id: "create-admin", label: "Create Admin", icon: UserPlus, action: () => handleNavigation("admin", "settings") },
    { id: "audit-logs", label: "Audit Logs", icon: ClipboardList, action: () => handleNavigation("admin", "settings") },
    { id: "legal-pages", label: "Legal Pages", icon: FileText, action: () => handleNavigation("admin", "legal") },
  ];

  // Get current active menu list
  const getActiveMenuItems = () => {
    let baseItems = [];
    if (isAdmin) baseItems = [...adminMenuItems];
    else if (isArtist) baseItems = [...artistMenuItems];
    else baseItems = [...listenerMenuItems];

    const items = [...baseItems];

    const isNativelyRunning = isAppInstalled || (typeof window !== "undefined" && (window as any).Capacitor !== undefined);

    if (!isNativelyRunning) {
      // Always add Google Drive Download option
      items.push({
        id: "download-apk-drive",
        label: "Download App (Google Drive)",
        icon: Download,
        action: () => {
          analytics.trackEvent("apk_download", currentUser?.uid || "anonymous", currentUser?.email || "anonymous", {
            fileName: "Soundstream_v3.5.0_Drive.apk",
            location: "sidebar_navigation_drive"
          });
          window.open("https://drive.google.com/file/d/1ul_JJPVklagFQidiFiNDzd95e4AG51l-/view?usp=drivesdk", "_blank", "noopener,noreferrer");
        }
      });

      // Always add Direct APK Download option
      items.push({
        id: "download-apk-direct",
        label: "Direct APK Download",
        icon: Download,
        action: () => {
          analytics.trackEvent("apk_download", currentUser?.uid || "anonymous", currentUser?.email || "anonymous", {
            fileName: "Soundstream_v3.5.0_Direct.apk",
            location: "sidebar_navigation_direct"
          });
          const link = document.createElement("a");
          link.href = "/Soundstream.apk";
          link.download = "Soundstream.apk";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      });

      // Always add Install Web App option
      items.push({
        id: "install-pwa",
        label: "Install Web App",
        icon: Smartphone,
        action: () => {
          if (isIOS) {
            if (onShowIOSPrompt) onShowIOSPrompt();
          } else {
            if (onInstall) onInstall();
          }
        }
      });
    }

    return items;
  };

  const activeMenuItems = getActiveMenuItems();

  return (
    <>
      {/* ========================================================= */}
      {/* 1. MOBILE TOP ACTION NAVIGATION BAR                       */}
      {/* ========================================================= */}
      <div 
        id="soundstream-mobile-navbar"
        className="md:hidden w-full bg-black/95 border-b border-white/5 px-4 py-3.5 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md select-none"
      >
        <button 
          onClick={() => setIsDrawerOpen(true)}
          className="p-1.5 hover:bg-white/5 rounded-xl transition-colors text-white border-none bg-transparent cursor-pointer"
          title="Open Menu"
        >
          <Menu className="w-6 h-6 text-zinc-100" />
        </button>

        <div className="flex items-center gap-2" onClick={() => handleNavigation("home")}>
          {!imgError ? (
            <img 
              src={logoUrl} 
              alt="Logo" 
              className="w-7.5 h-7.5 rounded-lg object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-7.5 h-7.5 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Radio className="w-4 h-4 text-white" />
            </div>
          )}
          <span className="font-sans font-black text-sm tracking-tight text-white">SoundStream</span>
        </div>

        {currentUser ? (
          <img 
            src={currentUser.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80"} 
            alt="User" 
            className="w-7.5 h-7.5 rounded-full object-cover border border-white/10"
            onClick={() => handleNavigation(isArtist ? "artist-profile-own" : "library")}
          />
        ) : (
          <button 
            onClick={() => handleNavigation("login")}
            className="text-[10px] bg-indigo-650 hover:bg-indigo-600 text-white font-bold px-3 py-1.5 rounded-lg transition-colors border-none"
          >
            Login
          </button>
        )}
      </div>

      {/* ========================================================= */}
      {/* 2. MOBILE HAMBURGER DRAWER WITH ANIMS                     */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 md:hidden"
            />

            {/* Left sliding Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed top-0 left-0 h-full w-[80vw] max-w-[325px] bg-black border-r border-white/5 z-50 flex flex-col justify-between text-zinc-300 md:hidden overflow-y-auto"
            >
              {/* Drawer Top Header / Identity */}
              <div className="p-5 space-y-5 border-b border-white/5 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img 
                      src={logoUrl} 
                      alt="Logo" 
                      className="w-8 h-8 rounded-lg object-cover"
                      onError={() => setImgError(true)}
                    />
                    <div>
                      <h2 className="font-sans font-black text-sm tracking-tight text-white mb-0 leading-tight">SoundStream</h2>
                      <p className="font-mono text-[8px] uppercase tracking-wider text-indigo-400 font-semibold mb-0">Independent Hub</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-1 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white border-none bg-transparent cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Profile Card inside drawer */}
                {currentUser ? (
                  <div className="bg-zinc-900/40 border border-white/5 p-3 rounded-2xl flex items-center gap-3">
                    <img 
                      src={currentUser.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80"} 
                      alt="Profile" 
                      className="w-10 h-10 rounded-full object-cover border border-white/15 shadow-md"
                    />
                    <div className="overflow-hidden flex-1">
                      <p className="text-xs font-bold text-zinc-100 truncate mb-0 leading-tight">
                        {currentUser.username || currentUser.displayName}
                      </p>
                      <p className="text-[10px] text-zinc-500 truncate mb-1">
                        {currentUser.email}
                      </p>
                      <div className="flex items-center gap-1">
                        <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          activeRole === "Admin" 
                            ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                            : activeRole === "Artist" 
                            ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" 
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}>
                          {activeRole}
                        </span>
                        {admob.isPremiumUser(currentUser) && (
                          <span className="text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-indigo-650 text-indigo-200">
                            Premium
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-zinc-900/40 border border-white/5 p-3.5 rounded-2xl text-center">
                    <p className="text-xs text-zinc-400 mb-2 font-medium">Enjoy lossless streaming today!</p>
                    <button 
                      onClick={() => handleNavigation("login")}
                      className="w-full bg-indigo-650 hover:bg-indigo-600 text-white font-extrabold text-xs py-2 rounded-xl transition-colors border-none"
                    >
                      Login / SignUp
                    </button>
                  </div>
                )}
              </div>

              {/* Scrollable Role-matching navigation lists */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
                <p className="font-mono text-[9px] uppercase tracking-widest text-zinc-550 font-black px-3 mb-2">
                  {activeRole} Menu
                </p>
                {activeMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isSelected = currentTab === item.id || 
                    (item.id === "playlists" && currentTab === "library") ||
                    (item.id === "liked" && currentTab === "library") ||
                    (item.id === "recent" && currentTab === "library") ||
                    (item.id === "dashboard" && currentTab === "upload") ||
                    (item.id === "admin-hq" && currentTab === "admin");
                    
                  return (
                    <button
                      key={item.id}
                      onClick={item.action}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-xs font-semibold border-none text-left cursor-pointer ${
                        isSelected 
                          ? "bg-white/5 text-white border-l-2 border-indigo-500" 
                          : "hover:bg-white/5 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
                
                {/* Premium Rewards Module inside drawer for non-premium */}
                {currentUser && !admob.isPremiumUser(currentUser) && activeRole === "Listener" && (
                  <div className="border border-indigo-500/10 bg-indigo-950/10 rounded-2xl p-3 text-center mt-3 relative overflow-hidden">
                    <Award className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
                    <p className="text-[10px] text-zinc-200 font-sans font-bold leading-tight">SoundStream Spotlight</p>
                    <p className="text-[8px] text-zinc-400 mb-2">Unlock 1 Hour of Premium Ad-Free sessions by viewing a spotlight sponsor ad!</p>
                    <button 
                      onClick={() => {
                        setIsDrawerOpen(false);
                        if (onWatchRewardedAd) onWatchRewardedAd();
                      }}
                      className="w-full text-[8.5px] bg-indigo-650 hover:bg-indigo-600 text-white font-black uppercase py-1.5 rounded-lg border-none cursor-pointer"
                    >
                      Watch Sponsor Spotlight
                    </button>
                  </div>
                )}
              </div>

              {/* Drawer Bottom Actions */}
              <div className="p-4 border-t border-white/5 space-y-3 shrink-0">
                {/* Dark Mode Row */}
                <div className="flex items-center justify-between px-3 py-1">
                  <div className="flex items-center gap-2.5 text-xs text-zinc-400">
                    <Moon className="w-4 h-4" />
                    <span>Dark Mode</span>
                  </div>
                  <button 
                    onClick={() => {
                      setIsDarkMode(!isDarkMode);
                      triggerToast(isDarkMode ? "Lights On! Standard Theme." : "Midnight Theme locked for high-fidelity comfort.");
                    }}
                    className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 cursor-pointer border-none flex items-center ${isDarkMode ? "bg-indigo-600 justify-end" : "bg-zinc-750 justify-start"}`}
                  >
                    <span className="w-4.5 h-4.5 rounded-full bg-white shadow-md block" />
                  </button>
                </div>

                {/* Language Selector Row */}
                <div className="flex items-center justify-between px-3">
                  <div className="flex items-center gap-2.5 text-xs text-zinc-400">
                    <Languages className="w-4 h-4" />
                    <span>Language</span>
                  </div>
                  <select 
                    value={language}
                    onChange={(e) => {
                      setLanguage(e.target.value);
                      triggerToast(`Language updated to ${e.target.value}`);
                    }}
                    className="bg-zinc-900 text-white text-[10px] rounded-lg border border-white/5 p-1 px-1.5 focus:outline-none"
                  >
                    <option value="English">English</option>
                    <option value="Yoruba">Yoruba</option>
                    <option value="Igbo">Igbo</option>
                    <option value="Hausa">Hausa</option>
                    <option value="Español">Español</option>
                    <option value="Français">Français</option>
                  </select>
                </div>

                {/* Logout button */}
                {currentUser && (
                  <button 
                    onClick={() => {
                      setIsDrawerOpen(false);
                      onLogout();
                    }}
                    className="w-full mt-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-950/20 hover:bg-red-900/30 text-red-400 hover:text-red-300 font-bold text-xs rounded-xl transition-all border-none cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout Account</span>
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* 3. DESKTOP SIDEBAR NAVIGATION PANEL                       */}
      {/* ========================================================= */}
      <div 
        id="soundstream-desktop-sidebar"
        className={`hidden md:flex flex-col justify-between bg-black border-r border-white/5 h-screen sticky top-0 transition-all duration-300 select-none z-30 shadow-2xl shrink-0 p-5 ${
          isCollapsed ? "w-20" : "w-20 lg:w-64"
        }`}
      >
        <div className="flex flex-col gap-5 overflow-y-auto max-h-[85vh] no-scrollbar">
          {/* Logo brand header */}
          <div 
            onClick={() => handleNavigation("home")}
            className={`flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity ${
              isCollapsed ? "justify-center" : "justify-center lg:justify-start"
            }`}
          >
            {!imgError ? (
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="w-10 h-10 rounded-xl object-cover shadow-md border border-white/5 shadow-indigo-500/10"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                <Radio className="w-5 h-5 text-white" />
              </div>
            )}
            <div className={isCollapsed ? "hidden" : "hidden lg:block animate-fade-in"}>
              <h1 className="font-sans font-black text-sm tracking-tight text-white mb-0">SoundStream</h1>
              <p className="font-mono text-[8px] uppercase tracking-widest text-indigo-400 font-bold mb-0">Independent Hub</p>
            </div>
          </div>

          {/* Active Navigation Menu List */}
          <div className="flex flex-col gap-1 pr-1">
            <p className={`font-mono text-[8.5px] uppercase tracking-widest text-zinc-550 font-black mb-2 ${
              isCollapsed ? "text-center" : "text-center lg:text-left px-3"
            }`}>
              {isCollapsed ? "Menu" : "General"}
            </p>

            {activeMenuItems.map((item) => {
              const Icon = item.icon;
              const isSelected = currentTab === item.id || 
                (item.id === "playlists" && currentTab === "library") ||
                (item.id === "liked" && currentTab === "library") ||
                (item.id === "recent" && currentTab === "library") ||
                (item.id === "dashboard" && currentTab === "upload") ||
                (item.id === "admin-hq" && currentTab === "admin");

              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  title={item.label}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-xs font-semibold whitespace-nowrap border-none cursor-pointer ${
                    isCollapsed ? "justify-center" : "justify-center lg:justify-start"
                  } ${
                    isSelected 
                      ? "bg-white/5 text-white border-l-2 border-indigo-500" 
                      : "hover:bg-white/5 text-zinc-400 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className={isCollapsed ? "hidden" : "hidden lg:block"}>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Sponsor spotlights on Desktop */}
          {currentUser && !admob.isPremiumUser(currentUser) && activeRole === "Listener" && !isCollapsed && (
            <div className="hidden lg:block border border-indigo-500/10 bg-indigo-950/10 rounded-2xl p-4 text-center relative overflow-hidden">
              <Award className="w-4 h-4 text-indigo-400 mx-auto mb-1 animate-pulse" />
              <p className="text-[10px] text-zinc-200 font-sans font-bold leading-tight">SoundStream Spotlight</p>
              <p className="text-[8px] text-zinc-400 mb-2 leading-relaxed">Enjoy ad-free High Fidelity streaming by supporting independent spots.</p>
              <button 
                onClick={onWatchRewardedAd}
                className="w-full text-[8px] bg-indigo-650 hover:bg-indigo-600 text-white font-black uppercase py-1.5 rounded-lg border-none cursor-pointer"
              >
                Watch Sponsor Spotlight
              </button>
            </div>
          )}
        </div>

        {/* Desktop Sidebar Bottom Identity and Collapse toggles */}
        <div className="border-t border-white/5 pt-4 space-y-3 shrink-0">
          {currentUser ? (
            <div className="space-y-3">
              <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : "justify-center lg:justify-start"}`}>
                <img 
                  src={currentUser.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80"} 
                  alt="Avatar" 
                  className="w-8 h-8 rounded-full object-cover border border-white/10"
                />
                <div className={isCollapsed ? "hidden" : "hidden lg:block overflow-hidden"}>
                  <p className="text-xs font-bold text-zinc-100 truncate mb-0 leading-tight">
                    {currentUser.username || currentUser.displayName}
                  </p>
                  <span className="text-[8px] px-1.5 py-0.2 bg-white/5 text-zinc-400 border border-white/10 rounded font-bold uppercase tracking-wider">
                    {activeRole}
                  </span>
                </div>
              </div>

              {/* Action row at bottom */}
              <div className="flex gap-2">
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="flex-1 hidden lg:flex p-2 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/5 rounded-xl justify-center items-center transition-colors cursor-pointer"
                  title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                  {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
                <button 
                  onClick={onLogout}
                  className={`bg-white/5 hover:bg-red-950/20 hover:text-red-400 border border-white/5 rounded-xl flex items-center justify-center cursor-pointer transition-colors ${
                    isCollapsed ? "w-10 h-10 mx-auto" : "p-2 px-3 flex-1"
                  }`}
                  title="Logout Account"
                >
                  <LogOut className="w-4 h-4" />
                  <span className={isCollapsed ? "hidden" : "hidden lg:block text-[10px] ml-1.5 font-bold"}>Logout</span>
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => handleNavigation("login")}
              className={`w-full bg-indigo-650 text-white hover:bg-indigo-600 font-extrabold text-xs py-2 rounded-xl transition-colors flex items-center justify-center gap-2 border-none cursor-pointer ${
                isCollapsed ? "p-2 h-10" : "py-2.5"
              }`}
              title="Login"
            >
              <Radio className="w-4 h-4 shrink-0" />
              <span className={isCollapsed ? "hidden" : "hidden lg:block"}>Login</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. MODALS & IN-APP DRAWER POPUPS (RICH INTERACTION)      */}
      {/* ========================================================= */}
      
      {/* Notifications Modal */}
      <AnimatePresence>
        {showNotifications && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-md p-6 relative shadow-2xl"
            >
              <button 
                onClick={() => setShowNotifications(false)}
                className="absolute top-4 right-4 p-1 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white border-none cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <h3 className="text-sm font-sans font-black uppercase tracking-wider text-white flex items-center gap-2 mb-4">
                <Bell className="w-4 h-4 text-indigo-400 animate-swing" />
                <span>Inbox Notifications</span>
              </h3>
              
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                <div className="bg-white/5 border border-white/5 p-3 rounded-xl flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-200">Welcome to SoundStream!</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">Enjoy streaming high-fidelity lossless independent audios natively.</p>
                  </div>
                </div>
                
                <div className="bg-white/5 border border-white/5 p-3 rounded-xl flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-200">History Sync Active</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">Your recently played releases are securely synchronized on the cloud.</p>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/5 p-3 rounded-xl flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Award className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-200">Sponsor Spotlight Active</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">View a single 30-second Spotlight Sponsor to unlock 1 hour of premium listening.</p>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setShowNotifications(false)}
                className="w-full mt-5 bg-zinc-800 hover:bg-zinc-750 text-white font-bold py-2 rounded-xl text-xs border-none cursor-pointer"
              >
                Close Inbox
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && currentUser && (() => {
          const likedSongsList = songs.filter((s) => favorites.includes(s.id)).slice(0, 5);
          const recentlyPlayedList = recentlyPlayed
            .map((rp) => songs.find((s) => s.id === rp.songId))
            .filter((s): s is Song => !!s)
            .slice(0, 5);

          return (
            <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-zinc-950 border border-white/10 rounded-3xl w-full max-w-lg p-6 relative shadow-2xl flex flex-col max-h-[90vh]"
              >
                <button 
                  onClick={() => {
                    setShowSettings(false);
                    setSettingsTab("view");
                    setProfileError(null);
                    setProfileSuccess(null);
                  }}
                  className="absolute top-5 right-5 p-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white border-none cursor-pointer z-10"
                >
                  <X className="w-4 h-4" />
                </button>
                
                <h3 className="text-xs font-sans font-black uppercase tracking-widest text-white flex items-center gap-2 mb-4 shrink-0">
                  <Settings className="w-4 h-4 text-indigo-400 animate-spin-slow" />
                  <span>Profile & Application Settings</span>
                </h3>

                {/* Tab Navigation header */}
                <div className="flex border-b border-white/5 mb-4 shrink-0">
                  <button
                    onClick={() => {
                      setSettingsTab("view");
                      setProfileError(null);
                      setProfileSuccess(null);
                    }}
                    className={`flex-1 pb-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-b-2 ${
                      settingsTab === "view"
                        ? "border-indigo-500 text-white font-black"
                        : "border-transparent text-zinc-550 hover:text-zinc-300"
                    }`}
                  >
                    My Profile
                  </button>
                  <button
                    onClick={() => {
                      setSettingsTab("edit");
                      setProfileError(null);
                      setProfileSuccess(null);
                    }}
                    className={`flex-1 pb-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-b-2 ${
                      settingsTab === "edit"
                        ? "border-indigo-500 text-white font-black"
                        : "border-transparent text-zinc-550 hover:text-zinc-300"
                    }`}
                  >
                    Edit Details
                  </button>
                  <button
                    onClick={() => {
                      setSettingsTab("system");
                      setProfileError(null);
                      setProfileSuccess(null);
                    }}
                    className={`flex-1 pb-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-b-2 ${
                      settingsTab === "system"
                        ? "border-indigo-500 text-white font-black"
                        : "border-transparent text-zinc-550 hover:text-zinc-300"
                    }`}
                  >
                    Preferences
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-1">
                  {settingsTab === "view" && (
                    <div className="space-y-4 py-1">
                      {/* Header Section */}
                      <div className="flex items-center gap-4 bg-white/2 p-3.5 rounded-2xl border border-white/5">
                        <div className="relative shrink-0">
                          <img
                            src={currentUser.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80"}
                            alt="Profile"
                            className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500/30 shadow-md"
                          />
                          {currentUser.isVerified && (
                            <span className="absolute -bottom-1 -right-1 bg-indigo-600 border border-zinc-950 text-white p-0.5 rounded-full flex items-center justify-center shadow-lg" title="Verified Creator">
                              <CheckCircle2 className="w-3.5 h-3.5 fill-white text-indigo-600" />
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-sm font-black text-white truncate mb-0 leading-tight">
                              {currentUser.displayName || currentUser.username}
                            </h4>
                            {currentUser.isVerified && (
                              <span title="Verified Independent Creator"><CheckCircle2 className="w-4 h-4 text-indigo-400 fill-indigo-400/10 shrink-0" /></span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 font-mono mt-0.5 mb-1">@{currentUser.username}</p>
                          
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              currentUser.role === "admin" 
                                ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                                : currentUser.role === "artist" 
                                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" 
                                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            }`}>
                              {currentUser.role}
                            </span>
                            {currentUser.isPrivate ? (
                              <span className="text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-zinc-800 text-zinc-450 border border-white/5 flex items-center gap-0.5">
                                <Lock className="w-2 h-2" /> Private
                              </span>
                            ) : (
                              <span className="text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                Public
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Metrics Grid */}
                      <div className="grid grid-cols-4 gap-2 text-center bg-zinc-900/40 p-3 rounded-2xl border border-white/5 shrink-0">
                        <div>
                          <p className="font-mono text-xs font-black text-white leading-none">
                            {currentUser.followersCount || 0}
                          </p>
                          <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold mt-1">Followers</p>
                        </div>
                        <div>
                          <p className="font-mono text-xs font-black text-white leading-none">
                            {currentUser.followingCount || followingArtists.length || 0}
                          </p>
                          <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold mt-1">Following</p>
                        </div>
                        <div>
                          <p className="font-mono text-xs font-black text-white leading-none">
                            {playlists.filter(p => p.ownerId === currentUser.uid || p.userId === currentUser.uid).length}
                          </p>
                          <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold mt-1">Playlists</p>
                        </div>
                        <div>
                          <p className="font-mono text-xs font-black text-white leading-none">
                            {favorites.length}
                          </p>
                          <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold mt-1">Likes</p>
                        </div>
                      </div>

                      {/* Biography & Metadata Section */}
                      <div className="space-y-2 bg-zinc-900/20 p-3.5 rounded-2xl border border-white/5 text-xs text-zinc-300">
                        {currentUser.bio ? (
                          <div className="mb-2">
                            <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-extrabold block mb-1">Biography</span>
                            <p className="leading-relaxed text-zinc-350 whitespace-pre-line">{currentUser.bio}</p>
                          </div>
                        ) : (
                          <div className="mb-2">
                            <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-extrabold block mb-1">Biography</span>
                            <p className="text-zinc-550 italic leading-relaxed">No biography added yet. Click 'Edit Details' to introduce yourself to the community.</p>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                          <div>
                            <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-extrabold block">Location / Country</span>
                            <p className="text-zinc-200 mt-1 font-semibold">{currentUser.country || "Global Space"}</p>
                          </div>
                          <div>
                            <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-extrabold block">Personal Website</span>
                            {currentUser.website ? (
                              <a
                                href={currentUser.website.startsWith('http') ? currentUser.website : `https://${currentUser.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-400 hover:text-indigo-300 transition-colors font-semibold flex items-center gap-1 mt-1 break-all truncate"
                              >
                                {currentUser.website}
                              </a>
                            ) : (
                              <p className="text-zinc-550 mt-1 italic">Not set</p>
                            )}
                          </div>
                        </div>
                        <div className="pt-2.5 border-t border-white/5 flex items-center justify-between text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                          <span>Joined SoundStream</span>
                          <span className="font-mono font-black text-zinc-400">{new Date(currentUser.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </div>
                      </div>

                      {/* Linked Accounts */}
                      <div className="space-y-2">
                        <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-extrabold block">Linked Auth Provider Connections</span>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-zinc-900/40 border border-white/5 p-2.5 rounded-xl flex items-center gap-2">
                            <div className="w-5 h-5 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center shrink-0">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold">Google Auth</p>
                              <p className="text-[10px] text-emerald-455 font-black truncate">Active Integration</p>
                            </div>
                          </div>
                          <div className="bg-zinc-900/40 border border-white/5 p-2.5 rounded-xl flex items-center gap-2">
                            <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 ${
                              currentUser.soundstreamUsername ? "bg-pink-500/10 text-pink-400" : "bg-zinc-800 text-zinc-550"
                            }`}>
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.19a8.1 8.1 0 0 0 3.93 2.45v3.91c-.88-.08-1.75-.32-2.58-.66a8.04 8.04 0 0 1-3.1-2.28c-.06 2.3-.01 4.59-.02 6.89-.04 1.34-.33 2.7-.93 3.89a7.33 7.33 0 0 1-4.71 4.14c-1.63.49-3.41.48-5.02-.1a7.35 7.35 0 0 1-4.14-4.52c-.52-1.57-.45-3.32.19-4.83a7.32 7.32 0 0 1 4.88-4.27V12.7a3.42 3.42 0 0 0-2.07 1.37 3.44 3.44 0 0 0-.42 3.04 3.42 3.42 0 0 0 2.76 2.3c.96.1 1.95-.15 2.72-.75.83-.65 1.29-1.67 1.28-2.72.03-3.99.01-7.98.02-11.97-.01-.32.03-.64.12-.95.27-1.14.94-2.15 1.88-2.84.44-.31.93-.55 1.45-.69.45-.11.9-.17 1.35-.17Z"/>
                              </svg>
                            </div>
                            <div className="min-w-0">
                              <p className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold">Soundstream Auth</p>
                              <p className={`text-[10px] font-black truncate ${currentUser.soundstreamUsername ? "text-pink-400" : "text-zinc-550"}`}>
                                {currentUser.soundstreamUsername ? `@${currentUser.soundstreamUsername}` : "Unavailable"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Recently Played Songs List */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] uppercase tracking-wider text-zinc-400 font-extrabold block">Recently Played Tracks</span>
                          <span className="text-[8px] text-zinc-500 font-mono font-black uppercase tracking-wider">LATEST 5</span>
                        </div>
                        {recentlyPlayedList.length === 0 ? (
                          <p className="text-[10px] text-zinc-555 bg-zinc-900/10 p-3 rounded-2xl text-center border border-dashed border-white/5 italic">No play history recorded in this workspace sandbox.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {recentlyPlayedList.map((song) => (
                              <div key={`recent-row-${song.id}`} className="flex items-center gap-2.5 bg-zinc-900/30 hover:bg-zinc-900/60 p-2 rounded-xl border border-white/2 transition-colors min-w-0">
                                <img src={song.coverUrl} alt={song.title} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-white truncate leading-tight">{song.title}</p>
                                  <p className="text-[10px] text-zinc-500 truncate mt-0.5">{song.artistName || "Independent Artist"}</p>
                                </div>
                                <span className="text-[8px] px-2 py-0.5 rounded bg-white/5 text-zinc-400 font-mono uppercase tracking-wider shrink-0 font-bold">Played</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Liked Songs List */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] uppercase tracking-wider text-zinc-400 font-extrabold block">Liked & Favorite Tracks</span>
                          <span className="text-[8px] text-zinc-500 font-mono font-black uppercase tracking-wider">LATEST 5</span>
                        </div>
                        {likedSongsList.length === 0 ? (
                          <p className="text-[10px] text-zinc-555 bg-zinc-900/10 p-3 rounded-2xl text-center border border-dashed border-white/5 italic">No tracks marked as favorite yet.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {likedSongsList.map((song) => (
                              <div key={`liked-row-${song.id}`} className="flex items-center gap-2.5 bg-zinc-900/30 hover:bg-zinc-900/60 p-2 rounded-xl border border-white/2 transition-colors min-w-0">
                                <img src={song.coverUrl} alt={song.title} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-white truncate leading-tight">{song.title}</p>
                                  <p className="text-[10px] text-zinc-500 truncate mt-0.5">{song.artistName || "Independent Artist"}</p>
                                </div>
                                <div className="text-pink-500 shrink-0 pr-1">
                                  <Heart className="w-3.5 h-3.5 fill-pink-500" />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {settingsTab === "edit" && (
                    <div className="space-y-4 py-1">
                      {profileError && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-2.5 rounded-xl text-xs font-bold">
                          {profileError}
                        </div>
                      )}
                      {profileSuccess && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-2.5 rounded-xl text-xs font-bold">
                          {profileSuccess}
                        </div>
                      )}

                      {/* Avatar Upload */}
                      <div className="flex flex-col items-center gap-2 bg-zinc-900/30 p-3.5 rounded-2xl border border-white/5 shrink-0">
                        <div className="relative shrink-0">
                          <img
                            src={currentUser.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80"}
                            alt="Edit Avatar"
                            className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500/30 hover:border-indigo-500 transition-colors"
                          />
                          {uploadingImage && (
                            <div className="absolute inset-0 bg-black/70 rounded-full flex items-center justify-center text-[8px] font-black text-white uppercase tracking-widest text-center">
                              Uploading
                            </div>
                          )}
                        </div>
                        <label className="text-[9px] bg-white/5 hover:bg-white/10 text-zinc-350 px-3 py-1.5 rounded-lg border border-white/10 transition-all cursor-pointer font-black uppercase tracking-wider block">
                          {uploadingImage ? "Processing..." : "Change Picture"}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                            disabled={uploadingImage || savingProfile}
                          />
                        </label>
                        <p className="text-[8px] text-zinc-550 font-bold uppercase tracking-wide">PNG, JPG, or JPEG up to 5MB</p>
                      </div>

                      {/* Display Name Input */}
                      <div>
                        <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-extrabold block mb-1">Display Name</label>
                        <input
                          type="text"
                          value={editDisplayName}
                          onChange={(e) => setEditDisplayName(e.target.value)}
                          disabled={savingProfile}
                          placeholder="e.g. Liam Fred"
                          className="w-full bg-white/5 border border-white/5 focus:border-indigo-500/50 text-white rounded-xl py-2.5 px-3.5 text-xs outline-none transition-all font-sans"
                        />
                      </div>

                      {/* Username Input */}
                      <div>
                        <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-extrabold block mb-1">Username (Unique handle)</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs text-zinc-555 font-bold">@</span>
                          <input
                            type="text"
                            value={editUsername}
                            onChange={(e) => setEditUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                            disabled={savingProfile}
                            placeholder="username"
                            className="w-full bg-white/5 border border-white/5 focus:border-indigo-500/50 text-white rounded-xl py-2.5 pl-7 pr-3.5 text-xs outline-none transition-all font-mono"
                          />
                        </div>
                      </div>

                      {/* Biography Input */}
                      <div>
                        <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-extrabold block mb-1">Biography</label>
                        <textarea
                          value={editBio}
                          onChange={(e) => setEditBio(e.target.value)}
                          disabled={savingProfile}
                          placeholder="Introduce yourself to other listeners and creators..."
                          rows={3}
                          className="w-full bg-white/5 border border-white/5 focus:border-indigo-500/50 text-white rounded-xl py-2.5 px-3.5 text-xs outline-none transition-all resize-none font-sans"
                        />
                      </div>

                      {/* Country Input */}
                      <div>
                        <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-extrabold block mb-1">Country</label>
                        <input
                          type="text"
                          value={editCountry}
                          onChange={(e) => setEditCountry(e.target.value)}
                          disabled={savingProfile}
                          placeholder="e.g. United Kingdom"
                          className="w-full bg-white/5 border border-white/5 focus:border-indigo-500/50 text-white rounded-xl py-2.5 px-3.5 text-xs outline-none transition-all font-sans"
                        />
                      </div>

                      {/* Website Input */}
                      <div>
                        <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-extrabold block mb-1">Personal Website</label>
                        <input
                          type="text"
                          value={editWebsite}
                          onChange={(e) => setEditWebsite(e.target.value)}
                          disabled={savingProfile}
                          placeholder="e.g. https://github.com/liam"
                          className="w-full bg-white/5 border border-white/5 focus:border-indigo-500/50 text-white rounded-xl py-2.5 px-3.5 text-xs outline-none transition-all font-sans"
                        />
                      </div>

                      {/* Privacy Toggle */}
                      <div className="flex items-center justify-between bg-zinc-900/30 p-3.5 rounded-2xl border border-white/5">
                        <div className="min-w-0 pr-2">
                          <p className="text-[10px] text-zinc-300 font-extrabold uppercase tracking-wider">Private Account Profile</p>
                          <p className="text-[8px] text-zinc-500 mt-0.5 leading-normal">Hide your liked song history and playlists list from searches.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsPrivateProfile(!isPrivateProfile)}
                          disabled={savingProfile}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isPrivateProfile ? "bg-indigo-600" : "bg-zinc-800"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                              isPrivateProfile ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Save Changes Button */}
                      <button
                        type="button"
                        onClick={handleSaveProfile}
                        disabled={savingProfile || uploadingImage}
                        className="w-full bg-indigo-650 hover:bg-indigo-600 disabled:bg-zinc-850 text-white text-xs font-black uppercase py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 border-none shrink-0"
                      >
                        {savingProfile ? "Saving Profile Changes..." : "Save Profile Details"}
                      </button>
                    </div>
                  )}

                  {settingsTab === "system" && (
                    <div className="space-y-4 py-1">
                      {/* Streaming Quality */}
                      <div>
                        <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-extrabold block mb-1.5">Lossless Audio Quality</label>
                        <div className="grid grid-cols-2 gap-2">
                          {["High Fidelity (320kbps)", "Studio Master (Lossless)"].map((q) => (
                            <button
                              key={q}
                              onClick={() => {
                                setAudioQuality(q);
                                triggerToast(`Audio engine configured to ${q}`);
                              }}
                              className={`p-3 rounded-xl border text-[10px] font-bold text-center transition-all cursor-pointer ${
                                audioQuality === q 
                                  ? "bg-indigo-600/10 border-indigo-500 text-indigo-300" 
                                  : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10"
                              }`}
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Local Cache Cleaner */}
                      <div>
                        <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-extrabold block mb-1.5">Local Storage Sandbox</label>
                        <button 
                          onClick={() => triggerToast("Device Audio Buffer Cache purged successfully (0 bytes).")}
                          className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-350 hover:text-white text-xs font-bold uppercase py-3 rounded-xl transition-all cursor-pointer"
                        >
                          Clean Cached Metadata & Assets
                        </button>
                      </div>

                      {/* Soundstream Connection Section */}
                      <div className="bg-zinc-900/40 p-3.5 rounded-2xl border border-white/5 space-y-2.5">
                        <p className="text-[10px] text-zinc-300 font-black uppercase tracking-widest flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-pink-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.19a8.1 8.1 0 0 0 3.93 2.45v3.91c-.88-.08-1.75-.32-2.58-.66a8.04 8.04 0 0 1-3.1-2.28c-.06 2.3-.01 4.59-.02 6.89-.04 1.34-.33 2.7-.93 3.89a7.33 7.33 0 0 1-4.71 4.14c-1.63.49-3.41.48-5.02-.1a7.35 7.35 0 0 1-4.14-4.52c-.52-1.57-.45-3.32.19-4.83a7.32 7.32 0 0 1 4.88-4.27V12.7a3.42 3.42 0 0 0-2.07 1.37 3.44 3.44 0 0 0-.42 3.04 3.42 3.42 0 0 0 2.76 2.3c.96.1 1.95-.15 2.72-.75.83-.65 1.29-1.67 1.28-2.72.03-3.99.01-7.98.02-11.97-.01-.32.03-.64.12-.95.27-1.14.94-2.15 1.88-2.84.44-.31.93-.55 1.45-.69.45-.11.9-.17 1.35-.17Z"/>
                          </svg>
                          <span>Soundstream Account Integration</span>
                        </p>

                        {currentUser.soundstreamUsername ? (
                          <div className="flex items-center justify-between bg-zinc-950/40 p-2.5 rounded-xl border border-pink-500/10 min-w-0">
                            <div className="min-w-0 pr-2">
                              <p className="text-[8px] text-zinc-500 font-extrabold uppercase tracking-wider">Connected Account</p>
                              <p className="text-xs text-pink-400 font-extrabold font-mono truncate">@{currentUser.soundstreamUsername}</p>
                            </div>
                            <button
                              type="button"
                              onClick={handleUnlinkSoundstream}
                              className="px-3.5 py-1.5 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/10 text-[9px] font-black uppercase rounded-lg transition-all cursor-pointer shrink-0"
                            >
                              Unlink
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-[10px] text-zinc-500 leading-normal">
                              Link your Soundstream developer credentials to activate instant content synchronization and display video clips directly inside your creator spaces.
                            </p>
                            <button
                              type="button"
                              onClick={handleLinkSoundstream}
                              className="w-full bg-black hover:bg-zinc-950 text-white border border-white/10 hover:border-pink-500/50 py-3 px-4 text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm shadow-pink-500/5"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.19a8.1 8.1 0 0 0 3.93 2.45v3.91c-.88-.08-1.75-.32-2.58-.66a8.04 8.04 0 0 1-3.1-2.28c-.06 2.3-.01 4.59-.02 6.89-.04 1.34-.33 2.7-.93 3.89a7.33 7.33 0 0 1-4.71 4.14c-1.63.49-3.41.48-5.02-.1a7.35 7.35 0 0 1-4.14-4.52c-.52-1.57-.45-3.32.19-4.83a7.32 7.32 0 0 1 4.88-4.27V12.7a3.42 3.42 0 0 0-2.07 1.37 3.44 3.44 0 0 0-.42 3.04 3.42 3.42 0 0 0 2.76 2.3c.96.1 1.95-.15 2.72-.75.83-.65 1.29-1.67 1.28-2.72.03-3.99.01-7.98.02-11.97-.01-.32.03-.64.12-.95.27-1.14.94-2.15 1.88-2.84.44-.31.93-.55 1.45-.69.45-.11.9-.17 1.35-.17Z"/>
                              </svg>
                              <span>Connect Soundstream Account</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Support SoundStream section */}
                      <div className="bg-gradient-to-br from-indigo-950/20 to-zinc-900/40 p-3.5 rounded-2xl border border-indigo-500/10 space-y-2.5">
                        <p className="text-[10px] text-rose-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/10 animate-pulse" />
                          <span>Support SoundStream</span>
                        </p>
                        <p className="text-[10px] text-zinc-400 leading-normal">
                          Love SoundStream? Supporting our independent development is completely optional. Listeners, visitors, and registered users can all use SoundStream for FREE.
                        </p>
                        <button
                          onClick={handleInitiateDonationSidebar}
                          disabled={initiatingDonation}
                          className="w-full bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 py-2.5 px-4 text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <Heart className="w-3 h-3" />
                          <span>{initiatingDonation ? "Connecting secure gateway..." : "Support SoundStream"}</span>
                        </button>
                      </div>

                      {/* Identity info */}
                      <div className="bg-zinc-900/40 p-3.5 rounded-2xl border border-white/5 space-y-1.5 text-xs text-zinc-400 font-sans">
                        <p className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-widest">Authenticated User Identity</p>
                        <div className="flex items-center justify-between">
                          <span>User UID:</span>
                          <span className="font-mono text-[10px] text-zinc-300 font-semibold">{currentUser.uid}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Register Date:</span>
                          <span className="font-mono text-[10px] text-zinc-300 font-semibold">{new Date(currentUser.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => {
                    setShowSettings(false);
                    setSettingsTab("view");
                    setProfileError(null);
                    setProfileSuccess(null);
                  }}
                  className="w-full mt-4 bg-[#1e1e20] hover:bg-[#2e2e32] border border-white/5 text-zinc-350 hover:text-white font-black py-2.5 rounded-xl text-xs uppercase tracking-wider cursor-pointer shrink-0 transition-all"
                >
                  Save & Close
                </button>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Artist Comments Modal */}
      <AnimatePresence>
        {showComments && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-md p-6 relative shadow-2xl"
            >
              <button 
                onClick={() => setShowComments(false)}
                className="absolute top-4 right-4 p-1 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white border-none cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              
              <h3 className="text-sm font-sans font-black uppercase tracking-wider text-white flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <span>Fan Comments Box</span>
              </h3>
              
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs font-bold text-zinc-200">Temi O.</p>
                    <span className="text-[8px] text-zinc-500">Lagos, NG</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 italic">"This Amapiano beat is insane! 🔥 Playing it on repeat."</p>
                </div>

                <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs font-bold text-zinc-200">Lukas K.</p>
                    <span className="text-[8px] text-zinc-500">Berlin, DE</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 italic">"Loved the transition at 1:45. Absolute high-fidelity masterpiece!"</p>
                </div>

                <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs font-bold text-zinc-200">Sarah M.</p>
                    <span className="text-[8px] text-zinc-500">London, UK</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 italic">"When is the next release dropping? Underworld vibes!"</p>
                </div>
              </div>
              
              <button 
                onClick={() => setShowComments(false)}
                className="w-full mt-5 bg-zinc-800 hover:bg-zinc-750 text-white font-bold py-2 rounded-xl text-xs border-none cursor-pointer"
              >
                Close Inbox
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Verification Status Modal */}
      <AnimatePresence>
        {showVerification && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-md p-6 relative shadow-2xl"
            >
              <button 
                onClick={() => setShowVerification(false)}
                className="absolute top-4 right-4 p-1 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white border-none cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              
              <h3 className="text-sm font-sans font-black uppercase tracking-wider text-white flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Verification Badging</span>
              </h3>
              
              <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                <div>
                  <p className="text-sm font-bold text-white uppercase tracking-wider">Independent Artist Verified</p>
                  <p className="text-[10px] text-zinc-400 mt-1">Your SoundStream credentials are 100% authenticated. Your streams carry weight in our verified payouts matrix.</p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-zinc-400 mt-4">
                <p className="font-bold text-zinc-300">Creator Perks Enabled:</p>
                <p>• Lossless publishing enabled (MP3 / MP4 up to 50MB)</p>
                <p>• Fast-tracked playlist inclusions</p>
                <p>• Direct Fan engagement comments dashboard unlocked</p>
              </div>
              
              <button 
                onClick={() => setShowVerification(false)}
                className="w-full mt-5 bg-zinc-800 hover:bg-zinc-750 text-white font-bold py-2 rounded-xl text-xs border-none cursor-pointer"
              >
                Awesome
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating System Notification Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 bg-indigo-950/95 border border-indigo-500/30 text-indigo-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold backdrop-blur-md"
          >
            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
