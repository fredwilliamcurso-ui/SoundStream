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
  Check
} from "lucide-react";
import { User } from "../types";
import { admob } from "../lib/admob";
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
  setLibraryTabSection
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
    { id: "users", label: "User Management", icon: Users, action: () => handleNavigation("admin", "users") },
    { id: "moderation", label: "Content Moderation", icon: AlertTriangle, action: () => handleNavigation("admin", "reports") },
    { id: "verification", label: "Artist Verification", icon: UserCheck, action: () => handleNavigation("admin", "artists") },
    { id: "analytics", label: "Platform Analytics", icon: BarChart3, action: () => handleNavigation("admin", "analytics") },
    { id: "subscriptions", label: "Subscription Management", icon: CreditCard, action: () => handleNavigation("admin", "monetization") },
    { id: "ads", label: "Advertisements", icon: Megaphone, action: () => handleNavigation("admin", "monetization") },
    { id: "settings", label: "Platform Settings", icon: Settings, action: () => handleNavigation("admin", "settings") },
    { id: "android", label: "Android Releases", icon: Smartphone, action: () => handleNavigation("admin", "android") },
    { id: "manage-admins", label: "Manage Admins", icon: Lock, action: () => handleNavigation("admin", "users") },
    { id: "create-admin", label: "Create Admin", icon: UserPlus, action: () => handleNavigation("admin", "settings") },
    { id: "audit-logs", label: "Audit Logs", icon: ClipboardList, action: () => handleNavigation("admin", "settings") },
    { id: "legal-pages", label: "Legal Pages", icon: FileText, action: () => handleNavigation("admin", "legal") },
  ];

  // Get current active menu list
  const getActiveMenuItems = () => {
    if (isAdmin) return adminMenuItems;
    if (isArtist) return artistMenuItems;
    return listenerMenuItems;
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
        {showSettings && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-md p-6 relative shadow-2xl"
            >
              <button 
                onClick={() => setShowSettings(false)}
                className="absolute top-4 right-4 p-1 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white border-none cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              
              <h3 className="text-sm font-sans font-black uppercase tracking-wider text-white flex items-center gap-2 mb-4">
                <Settings className="w-4 h-4 text-indigo-400" />
                <span>User Account Settings</span>
              </h3>
              
              <div className="space-y-4">
                {/* Streaming Quality */}
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block mb-1">Lossless Audio Quality</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["High Fidelity (320kbps)", "Studio Master (Lossless)"].map((q) => (
                      <button
                        key={q}
                        onClick={() => {
                          setAudioQuality(q);
                          triggerToast(`Audio engine configured to ${q}`);
                        }}
                        className={`p-2.5 rounded-xl border text-[10px] font-bold text-center transition-all cursor-pointer ${
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
                  <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block mb-1">Local Storage Sandbox</label>
                  <button 
                    onClick={() => triggerToast("Device Audio Buffer Cache purged successfully (0 bytes).")}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    Clean Cached Metadata & Assets
                  </button>
                </div>

                {/* Identity info */}
                {currentUser && (
                  <div className="bg-zinc-900/40 p-3 rounded-xl border border-white/5 space-y-1">
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Authenticated Identity</p>
                    <p className="text-xs text-zinc-200">UID: <span className="font-mono text-[10px] text-zinc-500">{currentUser.uid}</span></p>
                    <p className="text-xs text-zinc-200">Register: <span className="font-mono text-[10px] text-zinc-500">{new Date(currentUser.createdAt).toLocaleDateString()}</span></p>
                  </div>
                )}
              </div>
              
              <button 
                onClick={() => setShowSettings(false)}
                className="w-full mt-5 bg-indigo-650 hover:bg-indigo-600 text-white font-bold py-2 rounded-xl text-xs border-none cursor-pointer"
              >
                Save & Close
              </button>
            </motion.div>
          </div>
        )}
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
