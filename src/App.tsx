import React, { useEffect, useState, useRef } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { 
  collection, 
  onSnapshot, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  addDoc,
  limit,
  orderBy,
  getDocs
} from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "./lib/firebase";
import { User, Artist, Song, Playlist, Album, PlaylistSong } from "./types";

// Component imports
import Navigation from "./components/Navigation";
import HomeDashboard from "./components/HomeDashboard";
import SearchPage from "./components/SearchPage";
import LibraryView from "./components/LibraryView";
import LoginView from "./components/LoginView";
import ArtistProfileView from "./components/ArtistProfileView";
import UploadDashboard from "./components/UploadDashboard";
import MusicPlayer from "./components/MusicPlayer";
import YTMusicSync from "./components/YTMusicSync";
import ShareModal from "./components/ShareModal";
import AlbumDetailsPage from "./components/AlbumDetailsPage";
import PlaylistDetailsPage from "./components/PlaylistDetailsPage";
import TrendingCharts from "./components/TrendingCharts";
import AdminDashboard from "./components/AdminDashboard";
import ShortsFeed from "./components/ShortsFeed";
import ChatDashboard from "./components/ChatDashboard";
import LiveStreamingDashboard from "./components/LiveStreamingDashboard";
import VideoDashboard from "./components/VideoDashboard";
import { admob } from "./lib/admob";
import { GDPRConsentDialog, AdMobInterstitial, AdMobRewarded, AdMobBanner } from "./components/AdMobComponents";
import MonetizationPortal from "./components/MonetizationPortal";
import LegalAndSupport from "./components/LegalAndSupport";
import PrivacyPolicyPage from "./components/PrivacyPolicyPage";
import TermsOfServicePage from "./components/TermsOfServicePage";
import CreatorSubscriptionPage from "./components/CreatorSubscriptionPage";
import VideoPlayer from "./components/VideoPlayer";
import SoundStreamWallet from "./components/SoundStreamWallet";
import SoundStreamLiveCenter from "./components/SoundStreamLiveCenter";
import SoundStreamCreatorHub from "./components/SoundStreamCreatorHub";
import SoundStreamLeaderboards from "./components/SoundStreamLeaderboards";
import SoundStreamGamesCenter from "./components/SoundStreamGamesCenter";
import SoundStreamAgencyHub from "./components/SoundStreamAgencyHub";
import SoundStreamAdsManager from "./components/SoundStreamAdsManager";
import { motion, AnimatePresence } from "motion/react";
import { analytics } from "./lib/analytics";
import { crashlytics } from "./lib/google-services";
import { SplashScreen } from "@capacitor/splash-screen";
import { FirstLaunchIntro } from "./components/FirstLaunchIntro";

import { Music, AlertCircle, Award, Sparkles, Smartphone, Download, X, Share } from "lucide-react";

export default function App() {
  // Real-time subscribed collections lists
  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<PlaylistSong[]>([]);
  const [playbackQueue, setPlaybackQueue] = useState<Song[]>([]);
  
  // Current user profiles
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUserArtist, setCurrentUserArtist] = useState<Artist | null>(null);
  
  // User personalizations (synced with Firestore)
  const [favorites, setFavorites] = useState<string[]>([]); // liked song IDs
  const [followingArtists, setFollowingArtists] = useState<string[]>([]); // followed artist IDs
  const [recentlyPlayed, setRecentlyPlayed] = useState<{ songId: string; playedAt: string }[]>([]); // recently played tracks

  // Application routing / view navigation
  const [currentTab, setCurrentTab] = useState<string>("home");
  const [currentPathname, setCurrentPathname] = useState<string>(window.location.pathname);

  // First launch cinematic intro state
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    try {
      return localStorage.getItem("soundstream_first_launch_done") !== "true";
    } catch (e) {
      return false;
    }
  });

  // Automatically switch tab to "wallet" if we return from Stripe success/cancel
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    if (status === "success" || status === "cancel" || params.get("session_id")) {
      setCurrentTab("wallet");
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPathname(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleNavigate = (path: string) => {
    window.history.pushState({}, "", path);
    setCurrentPathname(path);
  };
  const [libraryTabSection, setLibraryTabSection] = useState<string>("liked");
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string>("All");
  
  const isAdmin = currentUser?.role === "admin" || currentUser?.email === "fredwilliamcurso@gmail.com";
  
  const visibleSongs = isAdmin 
    ? songs 
    : songs.filter((s) => !(s as any).isModerated);

  // Floating share system
  const [shareData, setShareData] = useState<{
    isOpen: boolean;
    type: "song" | "artist";
    id: string;
    title: string;
    subtitle: string;
  } | null>(null);

  // Audio/Video media player playback states
  const [currentPlayingSong, setCurrentPlayingSong] = useState<Song | null>(null);

  // Music startup & loading optimization
  useEffect(() => {
    if (songs.length > 0) {
      // 1. If no song is loaded yet, prepare the player with the top track
      // but keep isPlaying false, so the player bar is ready and clicking play is instant!
      if (!currentPlayingSong) {
        setCurrentPlayingSong(songs[0]);
        console.log("[Music Preloader] Player pre-populated with newest song:", songs[0].title);
      }

      // 2. Preload the top 3 songs' audio assets asynchronously into browser cache
      songs.slice(0, 3).forEach((song, idx) => {
        const audioUrl = song.audioUrl || (song as any).url;
        if (audioUrl) {
          const id = `preload-song-${song.id}`;
          if (!document.getElementById(id)) {
            const link = document.createElement("link");
            link.id = id;
            link.rel = "preload";
            link.as = "audio";
            link.href = audioUrl;
            document.head.appendChild(link);
            console.log(`[Music Preloader] Background-loaded top ${idx + 1} song:`, song.title);
          }
        }
      });
    }
  }, [songs, currentPlayingSong]);

  const [currentPlayingVideo, setCurrentPlayingVideo] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackTime, setPlaybackTime] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  
  // Audio Mode / Video Mode selection state
  const [playbackMode, setPlaybackMode] = useState<"audio" | "video">("video");
  
  // Core HTML5 media tag reference
  const audioRef = useRef<HTMLVideoElement | null>(null);

  // PWA Install States
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [isAppInstalled, setIsAppInstalled] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState<boolean>(false);

  // AdMob States
  const [showInterstitialAd, setShowInterstitialAd] = useState<boolean>(false);
  const [showRewardedAd, setShowRewardedAd] = useState<boolean>(false);
  const [pendingSongToPlay, setPendingSongToPlay] = useState<Song | null>(null);
  const [tempPremiumRemaining, setTempPremiumRemaining] = useState<number>(0);

  // Initialize AdMob on app startup (delayed non-blocking after Home screen loads)
  useEffect(() => {
    const adTimer = setTimeout(() => {
      admob.initialize().catch(err => console.error("Delayed AdMob init failed:", err));
    }, 3500);

    // Check temporary premium remaining minutes countdown
    setTempPremiumRemaining(admob.getTempPremiumRemainingMinutes());
    const interval = setInterval(() => {
      setTempPremiumRemaining(admob.getTempPremiumRemainingMinutes());
    }, 15000);

    // Listener for custom Premium Subscription Toggle events (for testing / triggers)
    const handleUpgradeRequest = async () => {
      if (currentUser) {
        const isCurrentlyPremium = admob.isPremiumUser(currentUser);
        const newStatus = isCurrentlyPremium ? "free" : "premium";
        await admob.updateUserSubscription(currentUser.uid, newStatus);
        alert(`Successfully toggled SoundStream subscription status to: ${newStatus.toUpperCase()}!`);
      } else {
        alert("Please login first to manage or upgrade your SoundStream subscription.");
      }
    };

    window.addEventListener("open-premium-upgrade", handleUpgradeRequest);

    return () => {
      clearTimeout(adTimer);
      clearInterval(interval);
      window.removeEventListener("open-premium-upgrade", handleUpgradeRequest);
    };
  }, [currentUser]);

  // PWA Install Handler & Detectors
  useEffect(() => {
    // Detect if running on Android or iOS
    const ua = navigator.userAgent.toLowerCase();
    setIsAndroid(/android/.test(ua));
    setIsIOS(/ipad|iphone|ipod/.test(ua) && !(window as any).MSStream);

    // Check if app is already running in standalone mode (i.e. already installed)
    const checkIsInstalled = () => {
      const isStandalone = 
        window.matchMedia("(display-mode: standalone)").matches || 
        (navigator as any).standalone === true ||
        document.referrer.includes("android-app://") ||
        (window as any).Capacitor !== undefined;
      
      setIsAppInstalled(isStandalone);
    };

    checkIsInstalled();

    // Dismiss Capacitor splash screen if running on native mobile
    SplashScreen.hide().then(() => {
      console.log("Capacitor SplashScreen hidden successfully.");
    }).catch((err) => {
      console.log("Capacitor SplashScreen.hide info (non-fatal):", err);
    });
    
    // Also monitor changes to display-mode
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsAppInstalled(e.matches);
    };
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleMediaChange);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      console.log("PWA beforeinstallprompt event fired.");
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      console.log("PWA appinstalled event fired.");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleMediaChange);
      }
    };
  }, []);

  // =========================================================================
  // DYNAMIC SEARCH ENGINE OPTIMIZATION & SEARCH GROUNDING ENGINE (Google SEO)
  // =========================================================================
  useEffect(() => {
    // 1. Identify active page and contextual details
    let seoTitle = "SoundStream - Social Music Stream, Live Rooms & Creator Hub";
    let seoDesc = "SoundStream is the premier social music streaming and creator dashboard platform. Discover trending tracks, listen to free music online, join group voice chats, go live in HD, and upload your music today.";
    let seoUrl = `https://soundstreamy.com${currentPathname || "/"}`;
    let schemaMarkup: any = null;

    const findSong = (id: string | null) => songs.find(s => s.id === id);
    const findArtist = (id: string | null) => artists.find(a => a.userId === id || a.uid === id);
    const findAlbum = (id: string | null) => albums.find(al => al.id === id);
    const findPlaylist = (id: string | null) => playlists.find(p => p.id === id);

    // 2. Compute dynamic title, description, and schemas based on user state / routes
    if (currentPathname === "/privacy") {
      seoTitle = "Privacy Policy - SoundStream Music & Streaming Platform";
      seoDesc = "Read the SoundStream Privacy Policy. Learn how we safeguard your independent audio tracks, personal creator profile, stream data, and payment information.";
    } else if (currentPathname === "/terms") {
      seoTitle = "Terms of Service - SoundStream Live Community Guidelines";
      seoDesc = "Review the official Terms of Service for SoundStream. Explore guidelines for music uploading, broadcasting group audio rooms, video live streaming, and creator wallet licensing.";
    } else {
      switch (currentTab) {
        case "home":
          seoTitle = "SoundStream - Social Music Stream, Live Rooms & Creator Hub";
          seoDesc = "SoundStream is the premier social music streaming and creator dashboard platform. Discover trending tracks, listen to free music online, join group voice chats, go live in HD, and upload your music today.";
          schemaMarkup = {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "SoundStream",
            "url": "https://soundstreamy.com/",
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://soundstreamy.com/?search={search_term_string}",
              "query-input": "required name=search_term_string"
            }
          };
          break;

        case "trending":
          seoTitle = "Trending Music Charts & Popular Audio Creators - SoundStream Live";
          seoDesc = "Explore the hottest independent artists, viral music videos, daily listening leaderboards, and popular group voice chat rooms today on SoundStream.";
          schemaMarkup = {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": "Trending Music Charts",
            "url": "https://soundstreamy.com/trending",
            "description": "The definitive list of top tracks, live streams, and viral music creators ascending the SoundStream charts.",
            "isPartOf": {
              "@type": "WebSite",
              "name": "SoundStream",
              "url": "https://soundstreamy.com/"
            }
          };
          break;

        case "search":
          seoTitle = "Search Free Music, Videos & Live Rooms - SoundStream";
          seoDesc = "Search and discover high-fidelity tracks, independent audio artists, live streaming rooms, and podcasts. Connect with your favorite sound creators.";
          break;

        case "library":
          seoTitle = "My Personal Music Library & Custom Playlists - SoundStream";
          seoDesc = "Manage your saved favorites, custom playlists, followed creators, and playback history on your personalized SoundStream media library.";
          break;

        case "upload":
          seoTitle = "Upload Tracks & Distribute Independent Music - SoundStream Studio";
          seoDesc = "Join the SoundStream independent artist community. Upload high-fidelity songs, launch custom music albums, and track play analytics from your Creator Hub.";
          break;

        case "shorts":
          seoTitle = "Vertical Music Clips & Looping Shorts - SoundStream Feed";
          seoDesc = "Watch, discover, and enjoy vertical short-form looping music videos, creative talent expressions, and live broadcast clips from the SoundStream community.";
          break;

        case "live":
          seoTitle = "Live Stream Broadcasts & HD Video Live Center - SoundStream";
          seoDesc = "Watch real-time live video streams, discover independent broadcasters, join global talent shows, and send virtual gifts to your favorite video creators.";
          break;

        case "live-center":
          seoTitle = "Live Broadcaster Console & Stream Studio - SoundStream";
          seoDesc = "Control your livestreaming setup. Set camera filters, manage virtual guest requests, view stream telemetry, and review live viewer engagement analytics.";
          break;

        case "video":
          seoTitle = "Social Video Streaming & Live Creator Hub - SoundStream";
          seoDesc = "Access professional HD video streaming channels, music uploads, and community group sessions. Watch your favorite independent video creators live.";
          break;

        case "chat":
          seoTitle = "Global Direct Messenger & Fan Chat Dashboard - SoundStream";
          seoDesc = "Connect directly with creators and other fans. Share tracks, coordinate live sessions, and build close fan circles with direct messaging on SoundStream.";
          break;

        case "artist-profile":
        case "artist-profile-own": {
          const targetId = currentTab === "artist-profile-own" ? currentUser?.uid : selectedArtistId;
          const artist = findArtist(targetId);
          if (artist) {
            seoTitle = `${artist.artistName || "Artist Profile"} - SoundStream Independent Creator`;
            seoDesc = `Stream free music by ${artist.artistName || "Artist"}. ${artist.bio || "Listen to original recordings, discover albums, and support this independent creator on SoundStream."}`;
            schemaMarkup = {
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "MusicGroup",
                  "name": artist.artistName,
                  "description": artist.bio || "",
                  "image": artist.profilePhoto,
                  "genre": (artist as any).genres || ["Music"],
                  "interactionStatistic": {
                    "@type": "InteractionCounter",
                    "interactionType": "https://schema.org/FollowAction",
                    "userInteractionCount": artist.followersCount || 0
                  }
                },
                {
                  "@type": "BreadcrumbList",
                  "itemListElement": [
                    {
                      "@type": "ListItem",
                      "position": 1,
                      "name": "Home",
                      "item": "https://soundstreamy.com/"
                    },
                    {
                      "@type": "ListItem",
                      "position": 2,
                      "name": "Artists",
                      "item": "https://soundstreamy.com/trending"
                    },
                    {
                      "@type": "ListItem",
                      "position": 3,
                      "name": artist.artistName,
                      "item": `https://soundstreamy.com/artist/${artist.userId || artist.uid}`
                    }
                  ]
                }
              ]
            };
          }
          break;
        }

        case "album": {
          const album = findAlbum(selectedAlbumId);
          if (album) {
            seoTitle = `${album.title || "Album"} by ${album.artistName || "Artist"} - Stream on SoundStream`;
            seoDesc = `Listen to the full album '${album.title}' containing ${album.trackCount || 0} tracks on SoundStream. Support independent artists with high-fidelity music streaming.`;
            schemaMarkup = {
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "MusicAlbum",
                  "name": album.title,
                  "byArtist": {
                    "@type": "MusicGroup",
                    "name": album.artistName
                  },
                  "image": album.coverUrl,
                  "numTracks": album.trackCount
                },
                {
                  "@type": "BreadcrumbList",
                  "itemListElement": [
                    {
                      "@type": "ListItem",
                      "position": 1,
                      "name": "Home",
                      "item": "https://soundstreamy.com/"
                    },
                    {
                      "@type": "ListItem",
                      "position": 2,
                      "name": "Albums",
                      "item": "https://soundstreamy.com/trending"
                    },
                    {
                      "@type": "ListItem",
                      "position": 3,
                      "name": album.title,
                      "item": `https://soundstreamy.com/album/${album.id}`
                    }
                  ]
                }
              ]
            };
          }
          break;
        }

        case "playlist": {
          const playlist = findPlaylist(selectedPlaylistId);
          if (playlist) {
            seoTitle = `${playlist.title || "Playlist"} - Custom Music Selection | SoundStream`;
            seoDesc = `Stream the custom curated playlist '${playlist.title}' containing original hits, independent tracks, and popular radio streams on SoundStream.`;
            schemaMarkup = {
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "MusicPlaylist",
                  "name": playlist.title,
                  "description": playlist.description || "Curated playlist on SoundStream",
                  "numTracks": playlist.songCount
                },
                {
                  "@type": "BreadcrumbList",
                  "itemListElement": [
                    {
                      "@type": "ListItem",
                      "position": 1,
                      "name": "Home",
                      "item": "https://soundstreamy.com/"
                    },
                    {
                      "@type": "ListItem",
                      "position": 2,
                      "name": "Playlists",
                      "item": "https://soundstreamy.com/search"
                    },
                    {
                      "@type": "ListItem",
                      "position": 3,
                      "name": playlist.title,
                      "item": `https://soundstreamy.com/playlist/${playlist.id}`
                    }
                  ]
                }
              ]
            };
          }
          break;
        }

        case "wallet":
          seoTitle = "Stripe Creator Wallet, Tipping & Payments - SoundStream Wallet";
          seoDesc = "Access your secure SoundStream Wallet. Buy platform coin tokens, tip active creators, receive support donations, and cash out streaming rewards.";
          break;

        case "creator-hub":
          seoTitle = "Artist Dashboard, Telemetry & Insights - SoundStream Creator Hub";
          seoDesc = "Review key stats for your uploaded songs, watch time, subscription revenues, and livestream viewer engagement metrics in the Creator Hub.";
          break;

        case "leaderboards":
          seoTitle = "Platform Gifting Leaderboards & Active Supporters - SoundStream";
          seoDesc = "Track the top supporters, active fans, high-gifting curators, and leading broadcasters in real-time on the SoundStream Leaderboards.";
          break;

        case "games":
          seoTitle = "Social Streaming Arcade & Interactive Games - SoundStream";
          seoDesc = "Play engaging browser mini-games, compete with other viewers, and win platform awards directly from the SoundStream Games Center.";
          break;

        case "agency":
          seoTitle = "Agency Management Hub & Broadcaster Teams - SoundStream";
          seoDesc = "Empower digital talent agencies. Track team streaming statistics, manage broadcaster schedules, and optimize agency-wide tipping earnings.";
          break;

        case "ads":
          seoTitle = "Self-Serve Ads Manager & Audio Campaigns - SoundStream Ads";
          seoDesc = "Promote your independent tracks, albums, live rooms, or podcasts. Target relevant listeners with the self-serve SoundStream Ad Manager.";
          break;

        default:
          break;
      }
    }

    // Adjust title if a track/video is actively playing (Dynamic audio enhancement for SEO & Engagement)
    if (currentPlayingSong) {
      seoTitle = `Now Playing: ${currentPlayingSong.title} by ${currentPlayingSong.artistName} - SoundStream`;
      seoDesc = `Stream '${currentPlayingSong.title}' by independent artist ${currentPlayingSong.artistName} on SoundStream. Read song lyrics, explore full music catalog, and download.`;
      
      schemaMarkup = {
        "@context": "https://schema.org",
        "@type": "MusicRecording",
        "name": currentPlayingSong.title,
        "byArtist": {
          "@type": "MusicGroup",
          "name": currentPlayingSong.artistName
        },
        "url": `https://soundstreamy.com/?song=${currentPlayingSong.id}`,
        "image": currentPlayingSong.coverUrl,
        "audio": currentPlayingSong.audioUrl,
        "genre": currentPlayingSong.genre || "Music"
      };
    }

    // 3. Update the browser document DOM attributes
    document.title = seoTitle;

    // Helper function to safely update/insert meta tags
    const updateMetaTag = (nameAttr: string, valueAttr: string, isProperty = false) => {
      const attributeSelector = isProperty ? `property="${nameAttr}"` : `name="${nameAttr}"`;
      let el = document.querySelector(`meta[${attributeSelector}]`);
      if (!el) {
        el = document.createElement("meta");
        if (isProperty) {
          el.setAttribute("property", nameAttr);
        } else {
          el.setAttribute("name", nameAttr);
        }
        document.head.appendChild(el);
      }
      el.setAttribute("content", valueAttr);
    };

    // Update Core Search Metas
    updateMetaTag("description", seoDesc);
    updateMetaTag("keywords", "SoundStream, SoundStream Live, Music Streaming, Live Streaming, Audio Streaming, Video Streaming, Music Platform, Music App, Listen to Music Online, Upload Music, Independent Artists, Creator Platform, Live Audio Rooms, Voice Chat, Live Music, Podcast Platform, Online Radio, Social Music Platform, Entertainment Platform, Go Live, Video Creator Platform, Music Community");

    // Update Open Graph (Facebook/LinkedIn)
    updateMetaTag("og:title", seoTitle, true);
    updateMetaTag("og:description", seoDesc, true);
    updateMetaTag("og:url", seoUrl, true);
    updateMetaTag("og:type", "website", true);
    
    // Update Twitter Cards
    updateMetaTag("twitter:title", seoTitle, false);
    updateMetaTag("twitter:description", seoDesc, false);
    updateMetaTag("twitter:url", seoUrl, false);

    // Update Canonical URL
    let canonicalLink = document.querySelector("link[rel='canonical']");
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute("href", seoUrl);

    // 4. Update Schema.org Structured Data
    let schemaScript = document.getElementById("seo-schema");
    if (schemaScript) {
      schemaScript.remove();
    }
    
    if (schemaMarkup) {
      schemaScript = document.createElement("script");
      schemaScript.setAttribute("id", "seo-schema");
      schemaScript.setAttribute("type", "application/ld+json");
      schemaScript.innerHTML = JSON.stringify(schemaMarkup, null, 2);
      document.head.appendChild(schemaScript);
    }

  }, [
    currentTab, 
    currentPathname, 
    currentPlayingSong, 
    selectedArtistId, 
    selectedAlbumId, 
    selectedPlaylistId, 
    songs, 
    artists, 
    albums, 
    playlists,
    currentUser
  ]);

  // One-time self-repair check to scan and clean up any historically corrupted database documents from previous turns
  useEffect(() => {
    const repairCorruptedData = async () => {
      try {
        console.log("Running one-time self-repair scan for corrupted database fields...");
        
        // 1. Repair liveStreams collection
        const streamsSnap = await getDocs(collection(db, "liveStreams"));
        for (const docSnap of streamsSnap.docs) {
          const data = docSnap.data();
          let needsUpdate = false;
          const updatedFields: any = {};
          
          const fieldsToClean = [
            "likes", "viewerCount", "totalViewers", "peakViewers", 
            "chatMessagesCount", "virtualGiftsCount", "tipsAmount", "superChatsAmount"
          ];
          
          fieldsToClean.forEach(field => {
            const val = data[field];
            if (val && typeof val === "object" && ('_methodName' in val || 'Pr' in val)) {
              updatedFields[field] = 0;
              needsUpdate = true;
            }
          });
          
          if (needsUpdate) {
            await updateDoc(docSnap.ref, updatedFields);
            console.log(`Self-repair: Cleaned corrupted fields in liveStream document: ${docSnap.id}`);
          }
        }

        // 2. Repair users collection
        const usersSnap = await getDocs(collection(db, "users"));
        for (const docSnap of usersSnap.docs) {
          const data = docSnap.data();
          let needsUpdate = false;
          const updatedFields: any = {};
          
          const userFieldsToClean = ["followersCount", "followingCount", "playlistsCount"];
          userFieldsToClean.forEach(field => {
            const val = data[field];
            if (val && typeof val === "object" && ('_methodName' in val || 'Pr' in val)) {
              updatedFields[field] = 0;
              needsUpdate = true;
            }
          });
          
          if (needsUpdate) {
            await updateDoc(docSnap.ref, updatedFields);
            console.log(`Self-repair: Cleaned corrupted fields in user document: ${docSnap.id}`);
          }
        }
        
        console.log("Self-repair scan and repair completed successfully.");
      } catch (err) {
        console.warn("Self-repair scan encountered a warning or completed with skipped items:", err);
      }
    };

    // Run slightly deferred to avoid blocking main thread at mount
    const timer = setTimeout(() => {
      repairCorruptedData();
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.warn("PWA install prompt is not available.");
      alert("To install SoundStreamy as a Web App: \n\n1. On Chrome / Edge: Click the install icon (🖥️ or ➕) in your address bar.\n2. On Safari: Tap 'Share' and select 'Add to Home Screen'.\n3. On Firefox: Tap the menu button and select 'Install'.");
      return;
    }
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    if (outcome === "accepted") {
      setIsAppInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  // Sync mode based on track availability
  useEffect(() => {
    if (currentPlayingSong) {
      if (currentPlayingSong.videoUrl && !currentPlayingSong.audioUrl) {
        setPlaybackMode("video");
      } else if (currentPlayingSong.audioUrl && !currentPlayingSong.videoUrl) {
        setPlaybackMode("audio");
      }
    }
  }, [currentPlayingSong]);

  // 1. Listen to global music, artists, and playlists collection changes
  useEffect(() => {
    const unsubSongs = onSnapshot(
      collection(db, "songs"),
      (snapshot) => {
        const data = snapshot.docs.map((d) => {
          const item = d.data();
          return {
            id: d.id,
            title: item.title || "Untitled",
            artistId: item.artistId || "anonymous",
            artistName: item.artistName || "Unknown Artist",
            genre: item.genre || "",
            coverUrl: item.coverUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80",
            audioUrl: item.audioUrl || item.url || item.audio || item.mp3 || item.src || "",
            videoUrl: item.videoUrl || "",
            lyrics: item.lyrics || "",
            playCount: item.playCount || 0,
            likes: item.likes || 0,
            createdAt: item.createdAt || new Date().toISOString(),
            type: item.type || "song"
          } as Song;
        });
        // Sort so newest are displayed first
        const sortedSongs = data.sort((a, b) => {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
        setSongs(sortedSongs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "songs");
      }
    );

    const unsubArtists = onSnapshot(
      collection(db, "artists"),
      (snapshot) => {
        const data = snapshot.docs.map((d) => {
          const item = d.data();
          return {
            uid: item.uid || d.id,
            userId: item.userId || item.uid || d.id,
            artistName: item.artistName || "",
            bio: item.bio || "",
            verified: item.verified || false,
            profilePhoto: item.profilePhoto || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&q=80",
            followersCount: item.followersCount || 0,
            createdAt: item.createdAt || new Date().toISOString()
          } as Artist;
        });
        setArtists(data);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "artists");
      }
    );

    const unsubAlbums = onSnapshot(
      collection(db, "albums"),
      (snapshot) => {
        const data = snapshot.docs.map((d) => {
          const item = d.data();
          return {
            id: d.id,
            title: item.title || "Untitled Album",
            artistId: item.artistId || "anonymous",
            artistName: item.artistName || "Unknown Artist",
            description: item.description || "",
            genre: item.genre || "Indie",
            coverUrl: item.coverUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80",
            releaseDate: item.releaseDate || "",
            createdAt: item.createdAt || new Date().toISOString(),
            trackCount: item.trackCount || 0,
            totalDuration: item.totalDuration || 0,
            isEP: item.isEP || false
          } as Album;
        });
        const sortedAlbums = data.sort((a, b) => {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
        setAlbums(sortedAlbums);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "albums");
      }
    );

    const unsubPlaylistsGlobal = onSnapshot(
      collection(db, "playlists"),
      (snapshot) => {
        const data = snapshot.docs.map((d) => {
          const item = d.data();
          return {
            id: d.id,
            title: item.title || item.name || "Untitled Playlist",
            description: item.description || "",
            coverUrl: item.coverUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80",
            createdBy: item.createdBy || item.userId || item.ownerId || "",
            userId: item.userId || item.ownerId || "",
            ownerId: item.ownerId || item.userId || "",
            songIds: item.songIds || item.songsList || [],
            isPublic: item.isPublic !== undefined ? item.isPublic : true,
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
            songCount: item.songCount !== undefined ? item.songCount : (item.songIds ? item.songIds.length : 0)
          } as Playlist;
        });
        setPlaylists(data);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "playlists");
      }
    );

    const unsubPlaylistSongs = onSnapshot(
      collection(db, "playlistSongs"),
      (snapshot) => {
        const data = snapshot.docs.map((d) => {
          const item = d.data();
          return {
            id: d.id,
            playlistId: item.playlistId || "",
            songId: item.songId || "",
            trackOrder: item.trackOrder !== undefined ? item.trackOrder : 0,
            addedAt: item.addedAt || new Date().toISOString()
          } as PlaylistSong;
        });
        setPlaylistSongs(data);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "playlistSongs");
      }
    );

    return () => {
      unsubSongs();
      unsubArtists();
      unsubAlbums();
      unsubPlaylistsGlobal();
      unsubPlaylistSongs();
    };
  }, []);

  // 2. Real-time Firebase Authentication listener & user profile fetcher
  useEffect(() => {
    let unsubUserDoc: (() => void) | null = null;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubUserDoc) {
        unsubUserDoc();
        unsubUserDoc = null;
      }

      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        
        // Listen to current user document changes in real-time
        unsubUserDoc = onSnapshot(userDocRef, async (userDocSnap) => {
          if (userDocSnap.exists()) {
            const d = userDocSnap.data();
            
            // Auto-promote fredwilliamcurso@gmail.com to admin if role/isAdmin is not set
            if (firebaseUser.email === "fredwilliamcurso@gmail.com" && (d.role !== "admin" || d.isAdmin !== true || !d.email)) {
              try {
                await updateDoc(userDocRef, { 
                  role: "admin", 
                  isAdmin: true,
                  email: "fredwilliamcurso@gmail.com"
                });
                console.log("Automatically promoted fredwilliamcurso@gmail.com to admin in Firestore.");
              } catch (e) {
                console.error("Failed to auto-promote admin in Firestore:", e);
              }
            }

            setCurrentUser({
              uid: firebaseUser.uid,
              id: firebaseUser.uid,
              username: d.username || firebaseUser.email?.split("@")[0] || "User",
              displayName: d.displayName || d.username || firebaseUser.email?.split("@")[0] || "User",
              email: firebaseUser.email || "",
              photoURL: d.photoURL || firebaseUser.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80",
              createdAt: d.createdAt || new Date().toISOString(),
              role: d.role || "listener",
              isSuspended: d.isSuspended || false,
              soundstreamId: d.soundstreamId || undefined,
              soundstreamUsername: d.soundstreamUsername || undefined,
              bio: d.bio || "",
              country: d.country || "",
              website: d.website || "",
              googleLinked: d.googleLinked !== undefined ? d.googleLinked : true,
              soundstreamLinked: d.soundstreamLinked || false,
              followersCount: d.followersCount || 0,
              followingCount: d.followingCount || 0,
              playlistsCount: d.playlistsCount || 0,
              likedSongs: d.likedSongs || [],
              recentlyPlayed: d.recentlyPlayed || [],
              isVerified: d.isVerified || false,
              isPrivate: d.isPrivate || false,
              creatorSubscriptionStatus: d.creatorSubscriptionStatus || undefined,
              creatorSubscriptionDate: d.creatorSubscriptionDate || undefined,
              creatorSubscriptionProvider: d.creatorSubscriptionProvider || undefined,
              creatorSubscriptionActive: d.creatorSubscriptionActive !== undefined ? d.creatorSubscriptionActive : false,
              updatedAt: d.updatedAt || d.createdAt || new Date().toISOString()
            });
          } else {
            // Setup new listener user record
            const isTargetAdmin = firebaseUser.email === "fredwilliamcurso@gmail.com";
            const newUser: User = {
              uid: firebaseUser.uid,
              id: firebaseUser.uid,
              username: firebaseUser.email?.split("@")[0] || "User",
              displayName: firebaseUser.email?.split("@")[0] || "User",
              email: firebaseUser.email || "",
              photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80",
              createdAt: new Date().toISOString(),
              role: isTargetAdmin ? "admin" : "listener",
              isSuspended: false,
              bio: "",
              country: "",
              website: "",
              googleLinked: true,
              soundstreamLinked: false,
              followersCount: 0,
              followingCount: 0,
              playlistsCount: 0,
              likedSongs: [],
              recentlyPlayed: [],
              isVerified: false,
              isPrivate: false
            };
            await setDoc(userDocRef, {
              uid: newUser.uid || "",
              username: newUser.username || "",
              displayName: newUser.displayName || "",
              email: newUser.email || "",
              photoURL: newUser.photoURL || "",
              createdAt: newUser.createdAt || new Date().toISOString(),
              role: newUser.role || "listener",
              isSuspended: false,
              isAdmin: isTargetAdmin,
              bio: "",
              country: "",
              website: "",
              googleLinked: true,
              soundstreamLinked: false,
              followersCount: 0,
              followingCount: 0,
              playlistsCount: 0,
              likedSongs: [],
              recentlyPlayed: [],
              isVerified: false,
              isPrivate: false,
              updatedAt: new Date().toISOString()
            });
            setCurrentUser(newUser);
          }
        }, (error) => {
          console.error("Failed to sync current user profile doc:", error);
        });
      } else {
        setCurrentUser(null);
        setCurrentUserArtist(null);
      }
    });

    return () => {
      unsubscribe();
      if (unsubUserDoc) unsubUserDoc();
    };
  }, []);

  // 3. Listen to Current User's Artist document & personalized items (likes, follows, playlists)
  useEffect(() => {
    if (!currentUser) {
      setFavorites([]);
      setFollowingArtists([]);
      setPlaylists([]);
      setCurrentUserArtist(null);
      return;
    }

    // Subscribe to current user's artist details
    const unsubArtistOwn = onSnapshot(
      doc(db, "artists", currentUser.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          const item = docSnap.data();
          setCurrentUserArtist({
            uid: currentUser.uid,
            userId: currentUser.uid,
            artistName: item.artistName || currentUser.username.toUpperCase(),
            bio: item.bio || "",
            verified: item.verified || false,
            profilePhoto: item.profilePhoto || currentUser.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80",
            followersCount: item.followersCount || 0,
            createdAt: item.createdAt || new Date().toISOString()
          });
        } else {
          setCurrentUserArtist(null);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `artists/${currentUser.uid}`);
      }
    );

    // Subscribe to likedSongs collection for current user
    const unsubLikes = onSnapshot(
      query(collection(db, "likedSongs"), where("userId", "==", currentUser.uid)),
      (snapshot) => {
        const userLikes = snapshot.docs.map((d) => (d.data() as any).songId);
        setFavorites(userLikes);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "likedSongs");
      }
    );

    // Subscribe to following collection for current user
    const unsubFollows = onSnapshot(
      query(collection(db, "following"), where("userId", "==", currentUser.uid)),
      (snapshot) => {
        const userFollows = snapshot.docs.map((d) => (d.data() as any).artistId);
        setFollowingArtists(userFollows);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "following");
      }
    );

    // Subscribe to recentlyPlayed collection for current user
    const unsubRecentlyPlayed = onSnapshot(
      query(collection(db, "recentlyPlayed"), where("userId", "==", currentUser.uid)),
      (snapshot) => {
        const plays = snapshot.docs.map((d) => {
          const item = d.data();
          return {
            songId: item.songId || "",
            playedAt: item.playedAt || ""
          };
        });
        const sortedPlays = plays
          .sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
          .slice(0, 200);
        setRecentlyPlayed(sortedPlays);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "recentlyPlayed");
      }
    );

    return () => {
      unsubArtistOwn();
      unsubLikes();
      unsubFollows();
      unsubRecentlyPlayed();
    };
  }, [currentUser]);

  // Synchronize user counts and lists (playlistsCount, likedSongs, recentlyPlayed, followingCount) automatically to Firestore user doc
  useEffect(() => {
    if (!currentUser || !currentUser.uid) return;
    
    // User's playlists count
    const userPlaylistsCount = playlists.filter(p => p.ownerId === currentUser.uid || p.userId === currentUser.uid).length;
    // User's liked song IDs
    const userLikedSongIds = favorites;
    // User's recently played song IDs (unique list)
    const userRecentlyPlayedSongIds = Array.from(new Set(recentlyPlayed.map(rp => rp.songId))).slice(0, 20);
    // User's following count
    const userFollowingCount = followingArtists.length;
    
    // Only update if there is actually a difference to prevent infinite loops
    if (
      currentUser.playlistsCount !== userPlaylistsCount ||
      JSON.stringify(currentUser.likedSongs) !== JSON.stringify(userLikedSongIds) ||
      JSON.stringify(currentUser.recentlyPlayed) !== JSON.stringify(userRecentlyPlayedSongIds) ||
      currentUser.followingCount !== userFollowingCount
    ) {
      const userDocRef = doc(db, "users", currentUser.uid);
      updateDoc(userDocRef, {
        playlistsCount: userPlaylistsCount,
        likedSongs: userLikedSongIds,
        recentlyPlayed: userRecentlyPlayedSongIds,
        followingCount: userFollowingCount,
        updatedAt: new Date().toISOString()
      }).catch(err => {
        console.error("Failed to sync profile counts to Firestore:", err);
      });
    }
  }, [favorites, recentlyPlayed, playlists, followingArtists, currentUser?.uid]);

  // 4. Handle incoming deep links (query params)
  useEffect(() => {
    if (songs.length === 0 && artists.length === 0 && albums.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const songId = params.get("song");
    const artistId = params.get("artist");
    const albumId = params.get("album");

    if (songId) {
      const song = songs.find((s) => s.id === songId);
      if (song) {
        onSelectSong(song);
        // Clear param to prevent looping trigger
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } else if (artistId) {
      const artist = artists.find((a) => a.userId === artistId || a.uid === artistId);
      if (artist) {
        setSelectedArtistId(artistId);
        setCurrentTab("artist-profile");
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } else if (albumId) {
      const album = albums.find((a) => a.id === albumId);
      if (album) {
        setSelectedAlbumId(albumId);
        setCurrentTab("album");
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [songs, artists, albums]);

  // 5. Synchronous HTML5 video/audio playback triggers
  useEffect(() => {
    if (!audioRef.current || !currentPlayingSong) return;

    // Resolve media src based on playback mode and availability
    const hasBoth = !!currentPlayingSong.videoUrl && !!currentPlayingSong.audioUrl;
    const currentMediaSrc = (hasBoth && playbackMode === "audio")
      ? currentPlayingSong.audioUrl
      : (currentPlayingSong.videoUrl || currentPlayingSong.audioUrl);
    
    if (audioRef.current.src !== currentMediaSrc) {
      audioRef.current.src = currentMediaSrc;
      audioRef.current.load();
    }

    if (isPlaying) {
      console.log("PLAYING SONG MEDIA URL:", currentMediaSrc);
      audioRef.current.play().catch((err: any) => {
        // Safe check for aborted play requests which are completely normal when transitioning or swapping tracks
        if (err && err.name === "AbortError") {
          console.log("[Playback] Play promise was aborted due to track switch or transition.");
          return;
        }
        
        console.warn("Media playback autoplay blocked by browser sandbox policy.", err);
        setIsPlaying(false);
        setPlaybackError("Playback blocked or paused. Click the Play button to resume streaming.");

        // Log genuine failures to Crashlytics
        crashlytics.logException(err instanceof Error ? err : new Error(String(err)), "playback_autoplay_blocked", {
          songId: currentPlayingSong?.id,
          songTitle: currentPlayingSong?.title,
          mediaSrc: currentMediaSrc,
          errorName: err?.name,
          errorMessage: err?.message
        });
      });
    } else {
      audioRef.current.pause();
    }
  }, [currentPlayingSong, isPlaying, playbackMode]);

  // Seamlessly transition playback between Audio & Video modes
  const handlePlaybackModeToggle = (mode: "audio" | "video") => {
    if (!audioRef.current || !currentPlayingSong) return;
    
    const wasPlaying = isPlaying;
    const currentPos = audioRef.current.currentTime;
    
    // Set state
    setPlaybackMode(mode);
    setIsPlaying(false);
    
    // Small delay to allow the source update to bind before resuming
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.currentTime = currentPos;
        if (wasPlaying) {
          setIsPlaying(true);
        }
      }
    }, 150);
  };

  // Attach timeline events to audio/video reference
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const handleTimeUpdate = () => {
      setPlaybackTime({
        current: el.currentTime,
        total: el.duration || 0
      });
    };

    const handleLoadedMetadata = () => {
      console.log("Media loaded metadata successfully:", currentPlayingSong?.audioUrl);
      setPlaybackTime((prev) => ({
        ...prev,
        total: el.duration || 0
      }));
    };

    const handleMediaEnded = () => {
      console.log("Media track ended successfully:", currentPlayingSong?.audioUrl);
      if (isRepeat) {
        el.currentTime = 0;
        el.play().catch((e) => console.error("Error auto-looping track playback", e));
      } else {
        handleNextTrack();
      }
    };

    const handleCanPlay = () => {
      setPlaybackError(null);
      console.log("Media ready to play successfully:", currentPlayingSong?.audioUrl);
    };

    const handleMediaError = (e: any) => {
      console.error("HTML5 Media Playback Error:", e);
      const err = el.error;
      let errorMsg = "Failed to stream audio file. Please check your network connection or try re-uploading the file.";
      if (err) {
        switch (err.code) {
          case err.MEDIA_ERR_ABORTED:
            errorMsg = "Playback was aborted by the browser.";
            break;
          case err.MEDIA_ERR_NETWORK:
            errorMsg = "A network error occurred. Failed to download the song from storage.";
            break;
          case err.MEDIA_ERR_DECODE:
            errorMsg = "The audio/video file is corrupted or could not be decoded by the browser.";
            break;
          case err.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMsg = "This format is not supported or the audio file could not be found in storage.";
            break;
        }
      }
      setPlaybackError(errorMsg);
    };

    el.addEventListener("timeupdate", handleTimeUpdate);
    el.addEventListener("loadedmetadata", handleLoadedMetadata);
    el.addEventListener("ended", handleMediaEnded);
    el.addEventListener("canplay", handleCanPlay);
    el.addEventListener("error", handleMediaError);

    return () => {
      el.removeEventListener("timeupdate", handleTimeUpdate);
      el.removeEventListener("loadedmetadata", handleLoadedMetadata);
      el.removeEventListener("ended", handleMediaEnded);
      el.removeEventListener("canplay", handleCanPlay);
      el.removeEventListener("error", handleMediaError);
    };
  }, [currentPlayingSong, isRepeat, isShuffle, songs, playbackQueue]);

  // Playback navigation methods
  const handleNextTrack = () => {
    const queueList = playbackQueue.length > 0 ? playbackQueue : songs;
    if (queueList.length === 0) return;
    if (isShuffle) {
      const randIdx = Math.floor(Math.random() * queueList.length);
      onSelectSong(queueList[randIdx]);
    } else {
      const currIdx = queueList.findIndex((s) => s.id === currentPlayingSong?.id);
      const nextIdx = (currIdx + 1) % queueList.length;
      onSelectSong(queueList[nextIdx]);
    }
  };

  const handlePrevTrack = () => {
    const queueList = playbackQueue.length > 0 ? playbackQueue : songs;
    if (queueList.length === 0) return;
    const currIdx = queueList.findIndex((s) => s.id === currentPlayingSong?.id);
    const prevIdx = currIdx <= 0 ? queueList.length - 1 : currIdx - 1;
    onSelectSong(queueList[prevIdx]);
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setPlaybackTime((prev) => ({ ...prev, current: time }));
    }
  };

  const cleanUpOldHistory = async (userId: string) => {
    try {
      const q = query(collection(db, "recentlyPlayed"), where("userId", "==", userId));
      const snap = await getDocs(q);
      if (snap.size > 200) {
        const docs = snap.docs.map(d => ({
          id: d.id,
          playedAt: d.data().playedAt || ""
        }));
        docs.sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime());
        const toDelete = docs.slice(200);
        for (const d of toDelete) {
          await deleteDoc(doc(db, "recentlyPlayed", d.id));
        }
      }
    } catch (err) {
      console.error("Error cleaning up old history:", err);
    }
  };

  const onClearHistory = async () => {
    if (!currentUser) return;
    try {
      const q = query(collection(db, "recentlyPlayed"), where("userId", "==", currentUser.uid));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await deleteDoc(doc(db, "recentlyPlayed", d.id));
      }
      setRecentlyPlayed([]);
    } catch (err) {
      console.error("Error clearing recently played history:", err);
    }
  };

  const isSongVideo = (song: Song | null): boolean => {
    if (!song) return false;
    if (song.videoUrl && song.videoUrl.trim() !== "") {
      return true;
    }
    if (song.audioUrl) {
      const urlWithoutQuery = song.audioUrl.toLowerCase().split("?")[0];
      if (
        urlWithoutQuery.endsWith(".mp4") ||
        urlWithoutQuery.endsWith(".webm") ||
        urlWithoutQuery.endsWith(".mov") ||
        urlWithoutQuery.endsWith(".m4v") ||
        urlWithoutQuery.includes("video")
      ) {
        return true;
      }
    }
    return false;
  };

  // 6. Interaction Actions: Play song, Like Song, Follow Artist, Create/Add playlist
  const onSelectSong = async (song: Song, bypassAd = false) => {
    // Check if free user has triggered an AdMob interstitial ad before starting playback
    if (!bypassAd && admob.recordSongTransition(currentUser, isPlaying)) {
      setPendingSongToPlay(song);
      setShowInterstitialAd(true);
      return;
    }

    if (isSongVideo(song)) {
      // Pause audio player so they don't play simultaneously
      setIsPlaying(false);
      setCurrentPlayingVideo(song);

      // Track play analytics event for video
      analytics.trackEvent("video_play", currentUser?.uid, currentUser?.email, {
        songId: song.id,
        title: song.title,
        artistId: song.artistId,
        videoUrl: song.videoUrl || song.audioUrl
      });
    } else {
      // It is an audio song! Play in MusicPlayer
      setCurrentPlayingSong(song);
      setIsPlaying(true);

      // Track play analytics event
      analytics.trackEvent("play", currentUser?.uid, currentUser?.email, {
        songId: song.id,
        title: song.title,
        artistId: song.artistId,
        playbackMode: "audio"
      });
    }

    if (playbackQueue.length > 0 && !playbackQueue.some((s) => s.id === song.id)) {
      setPlaybackQueue([]);
    }

    // Save song to recentlyPlayed if user is logged in
    if (currentUser) {
      try {
        const playRef = doc(db, "recentlyPlayed", `${currentUser.uid}_${song.id}`);
        await setDoc(playRef, {
          userId: currentUser.uid,
          songId: song.id,
          playedAt: new Date().toISOString()
        }, { merge: true });

        // Asynchronously clean up old play history if we exceed 200 tracks
        cleanUpOldHistory(currentUser.uid);
      } catch (err) {
        console.error("Error saving recently played:", err);
      }
    }

    // Dynamic stream statistics incrementation
    try {
      const songRef = doc(db, "songs", song.id);
      const songSnap = await getDoc(songRef);
      if (songSnap.exists()) {
        const plays = songSnap.data().playCount || 0;
        await updateDoc(songRef, { playCount: plays + 1 });
      }
    } catch (err) {
      console.error("Telemetry failed to log play count:", err);
    }
  };

  const onPlayAlbum = (albumSongs: Song[], shuffle: boolean) => {
    if (albumSongs.length === 0) return;
    
    let songsToQueue = [...albumSongs];
    if (shuffle) {
      songsToQueue.sort(() => Math.random() - 0.5);
    }
    
    setPlaybackQueue(songsToQueue);
    onSelectSong(songsToQueue[0]);
  };

  const onLikeToggle = async (songId: string) => {
    if (!currentUser) {
      setCurrentTab("login");
      return;
    }

    const likeId = `${currentUser.uid}_${songId}`;
    const likedSongDocRef = doc(db, "likedSongs", likeId);
    const isLiked = favorites.includes(songId);

    try {
      if (isLiked) {
        await deleteDoc(likedSongDocRef);
        const songRef = doc(db, "songs", songId);
        const snap = await getDoc(songRef);
        if (snap.exists()) {
          const l = snap.data().likes || 0;
          await updateDoc(songRef, { likes: Math.max(0, l - 1) });
        }
        analytics.trackEvent("unlike", currentUser.uid, currentUser.email, { songId });
      } else {
        await setDoc(likedSongDocRef, {
          userId: currentUser.uid || "",
          songId: songId || "",
          likedAt: new Date().toISOString()
        });
        const songRef = doc(db, "songs", songId);
        const snap = await getDoc(songRef);
        if (snap.exists()) {
          const l = snap.data().likes || 0;
          await updateDoc(songRef, { likes: l + 1 });
        }
        analytics.trackEvent("like", currentUser.uid, currentUser.email, { songId });
      }
    } catch (err) {
      console.error("Toggling track like failed:", err);
    }
  };

  const onFollowToggle = async (artistId: string) => {
    if (!currentUser) {
      setCurrentTab("login");
      return;
    }

    const followId = `${currentUser.uid}_${artistId}`;
    const followDocRef = doc(db, "following", followId);
    const isFollowing = followingArtists.includes(artistId);

    try {
      if (isFollowing) {
        await deleteDoc(followDocRef);
        const artistRef = doc(db, "artists", artistId);
        const snap = await getDoc(artistRef);
        if (snap.exists()) {
          const f = snap.data().followersCount || 0;
          await updateDoc(artistRef, { followersCount: Math.max(0, f - 1) });
        }
        analytics.trackEvent("unfollow", currentUser.uid, currentUser.email, { artistId });
      } else {
        await setDoc(followDocRef, {
          userId: currentUser.uid || "",
          artistId: artistId || "",
          followedAt: new Date().toISOString()
        });
        const artistRef = doc(db, "artists", artistId);
        const snap = await getDoc(artistRef);
        if (snap.exists()) {
          const f = snap.data().followersCount || 0;
          await updateDoc(artistRef, { followersCount: f + 1 });
        }
        analytics.trackEvent("follow", currentUser.uid, currentUser.email, { artistId });
      }
    } catch (err) {
      console.error("Toggling artist subscription failed:", err);
    }
  };

  const onCreatePlaylist = async (playlistName: string) => {
    if (!currentUser) return;
    try {
      const playlistRef = doc(collection(db, "playlists"));
      const now = new Date().toISOString();
      await setDoc(playlistRef, {
        id: playlistRef.id,
        title: playlistName || "",
        name: playlistName || "",
        description: "",
        userId: currentUser.uid || "",
        ownerId: currentUser.uid || "",
        createdBy: currentUser.uid || "",
        songIds: [],
        songsList: [],
        isPublic: true,
        coverUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80",
        createdAt: now,
        updatedAt: now,
        songCount: 0
      });
      analytics.trackEvent("create_playlist", currentUser.uid, currentUser.email, { playlistName });
    } catch (err) {
      console.error("Could not instantiate new custom playlist:", err);
    }
  };

  const onAddSongToPlaylist = async (playlistId: string, songId: string) => {
    try {
      const ref = doc(db, "playlists", playlistId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const item = snap.data();
        const songsList = item.songIds || item.songsList || [];
        if (!songsList.includes(songId)) {
          const updated = [...songsList, songId];
          await updateDoc(ref, {
            songIds: updated,
            songsList: updated,
            songCount: updated.length,
            updatedAt: new Date().toISOString()
          });

          // Also write to playlistSongs collection
          const pSongRef = doc(collection(db, "playlistSongs"));
          await setDoc(pSongRef, {
            playlistId,
            songId,
            trackOrder: songsList.length,
            addedAt: new Date().toISOString()
          });
        }
      }
    } catch (err) {
      console.error("Could not insert song into playlist array:", err);
    }
  };

  const onRemoveSongFromPlaylist = async (playlistId: string, songId: string) => {
    try {
      const ref = doc(db, "playlists", playlistId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const item = snap.data();
        const songsList = item.songIds || item.songsList || [];
        const updated = songsList.filter((id: string) => id !== songId);
        await updateDoc(ref, {
          songIds: updated,
          songsList: updated,
          songCount: updated.length,
          updatedAt: new Date().toISOString()
        });

        // Remove from playlistSongs
        const pSongs = playlistSongs.filter(ps => ps.playlistId === playlistId);
        const matchRecord = pSongs.find(ps => ps.songId === songId);
        if (matchRecord && matchRecord.id) {
          await deleteDoc(doc(db, "playlistSongs", matchRecord.id));
        }

        // Re-index remaining trackOrder indexes
        const remaining = pSongs
          .filter(ps => ps.songId !== songId)
          .sort((a, b) => a.trackOrder - b.trackOrder);
        
        for (let i = 0; i < remaining.length; i++) {
          if (remaining[i].id) {
            await updateDoc(doc(db, "playlistSongs", remaining[i].id!), {
              trackOrder: i
            });
          }
        }
      }
    } catch (err) {
      console.error("Could not remove song from playlist array:", err);
    }
  };

  const onEditPlaylist = async (playlistId: string, updates: { title: string; description: string; coverUrl: string; isPublic: boolean }) => {
    try {
      const ref = doc(db, "playlists", playlistId);
      await updateDoc(ref, {
        title: updates.title,
        name: updates.title,
        description: updates.description,
        coverUrl: updates.coverUrl,
        isPublic: updates.isPublic,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Could not update playlist:", err);
    }
  };

  const onDeletePlaylist = async (playlistId: string) => {
    try {
      await deleteDoc(doc(db, "playlists", playlistId));
      
      const pSongs = playlistSongs.filter(ps => ps.playlistId === playlistId);
      for (const ps of pSongs) {
        if (ps.id) {
          await deleteDoc(doc(db, "playlistSongs", ps.id));
        }
      }
    } catch (err) {
      console.error("Could not delete playlist:", err);
    }
  };

  const onDuplicatePlaylist = async (playlistId: string) => {
    if (!currentUser) return;
    const original = playlists.find(p => p.id === playlistId);
    if (!original) return;

    try {
      const playlistRef = doc(collection(db, "playlists"));
      const newTitle = `${original.title} (Copy)`;
      const now = new Date().toISOString();
      await setDoc(playlistRef, {
        id: playlistRef.id,
        title: newTitle,
        name: newTitle,
        description: original.description || "",
        coverUrl: original.coverUrl,
        userId: currentUser.uid,
        ownerId: currentUser.uid,
        createdBy: currentUser.uid,
        songIds: original.songIds || [],
        songsList: original.songIds || [],
        isPublic: original.isPublic,
        createdAt: now,
        updatedAt: now,
        songCount: original.songCount || 0
      });

      const pSongs = playlistSongs
        .filter(ps => ps.playlistId === playlistId)
        .sort((a, b) => a.trackOrder - b.trackOrder);
      
      for (const ps of pSongs) {
        const psRef = doc(collection(db, "playlistSongs"));
        await setDoc(psRef, {
          playlistId: playlistRef.id,
          songId: ps.songId,
          trackOrder: ps.trackOrder,
          addedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error("Could not duplicate playlist:", err);
    }
  };

  const onReorderPlaylistSongs = async (playlistId: string, orderedSongIds: string[]) => {
    try {
      const ref = doc(db, "playlists", playlistId);
      await updateDoc(ref, {
        songIds: orderedSongIds,
        songsList: orderedSongIds,
        updatedAt: new Date().toISOString()
      });

      const pSongs = playlistSongs.filter(ps => ps.playlistId === playlistId);
      for (const ps of pSongs) {
        const newIndex = orderedSongIds.indexOf(ps.songId);
        if (newIndex !== -1 && ps.id) {
          await updateDoc(doc(db, "playlistSongs", ps.id), {
            trackOrder: newIndex
          });
        }
      }
    } catch (err) {
      console.error("Could not reorder playlist songs:", err);
    }
  };

  const onPlayPlaylist = (playlistSongsList: Song[], shuffle: boolean) => {
    if (playlistSongsList.length === 0) return;
    
    let songsToQueue = [...playlistSongsList];
    if (shuffle) {
      songsToQueue.sort(() => Math.random() - 0.5);
    }
    
    setPlaybackQueue(songsToQueue);
    onSelectSong(songsToQueue[0]);
  };

  const onBecomeArtist = async () => {
    if (!currentUser) return;
    try {
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, { role: "artist" });

      const artistRef = doc(db, "artists", currentUser.uid);
      await setDoc(artistRef, {
        uid: currentUser.uid || "",
        userId: currentUser.uid || "",
        artistName: (currentUser.username || "").toUpperCase() || "ARTIST",
        bio: "Independent sound waves from Burna, Wiz, Davido inspired SoundStream pioneer.",
        verified: false,
        profilePhoto: currentUser.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80",
        followersCount: 0,
        createdAt: new Date().toISOString()
      });

      setCurrentUser((prev) => (prev ? { ...prev, role: "artist" } : null));
      setCurrentTab("upload");
    } catch (err) {
      console.error("Could not register artist profile:", err);
    }
  };

  const onLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setCurrentUserArtist(null);
      setCurrentTab("home");
    } catch (err) {
      console.error("Sign out process failed:", err);
    }
  };

  const onShareSong = (song: Song) => {
    setShareData({
      isOpen: true,
      type: "song",
      id: song.id,
      title: song.title,
      subtitle: song.artistName
    });
  };

  const onShareArtist = (artist: Artist) => {
    setShareData({
      isOpen: true,
      type: "artist",
      id: artist.userId || artist.uid,
      title: artist.artistName,
      subtitle: `${artist.followersCount} followers`
    });
  };

  // 7. Render Route Selector
  const renderTabContent = () => {
    // Subscription gate check for new Creator/Artist registrations
    if (currentUser && currentUser.role === "artist") {
      const DEPLOYMENT_THRESHOLD = "2026-07-03T08:50:00.000Z";
      const isNewUser = currentUser.createdAt > DEPLOYMENT_THRESHOLD;
      if (isNewUser && !currentUser.creatorSubscriptionActive) {
        return (
          <CreatorSubscriptionPage
            currentUser={currentUser}
            onLogout={onLogout}
            onActivationSuccess={(updatedUser) => {
              setCurrentUser(updatedUser);
              setCurrentTab("upload");
            }}
          />
        );
      }
    }

    switch (currentTab) {
      case "home":
        return (
          <HomeDashboard
            songs={visibleSongs}
            artists={artists}
            albums={albums}
            favorites={favorites}
            currentPlayingSong={currentPlayingSong}
            onSelectSong={onSelectSong}
            onLikeToggle={onLikeToggle}
            onSelectArtist={(id) => {
              setSelectedArtistId(id);
              setCurrentTab("artist-profile");
            }}
            onSelectAlbum={(id) => {
              setSelectedAlbumId(id);
              setCurrentTab("album");
            }}
            selectedGenre={selectedGenre}
            setSelectedGenre={setSelectedGenre}
            genres={["All", "Afrobeats", "Amapiano", "Gospel", "Hip Hop", "Fuji", "Highlife"]}
            onShareSong={onShareSong}
            onShareArtist={onShareArtist}
            recentlyPlayed={recentlyPlayed}
            onViewRecentlyPlayedAll={() => {
              setCurrentTab("library");
              setLibraryTabSection("recent");
            }}
            onViewTrendingAll={() => {
              setCurrentTab("trending");
            }}
            isInstallable={isInstallable}
            isAppInstalled={isAppInstalled}
            onInstall={handleInstallClick}
            isAndroid={isAndroid}
            isIOS={isIOS}
            onShowIOSPrompt={() => setShowIOSPrompt(true)}
            followingArtists={followingArtists}
            setCurrentTab={setCurrentTab}
          />
        );
      case "trending":
        return (
          <TrendingCharts
            songs={visibleSongs}
            artists={artists}
            albums={albums}
            playlistSongs={playlistSongs}
            currentPlayingSong={currentPlayingSong}
            onSelectSong={onSelectSong}
            onSelectArtist={(id) => {
              setSelectedArtistId(id);
              setCurrentTab("artist-profile");
            }}
            onSelectAlbum={(id) => {
              setSelectedAlbumId(id);
              setCurrentTab("album");
            }}
            favorites={favorites}
            onLikeToggle={onLikeToggle}
          />
        );
      case "search":
        return (
          <SearchPage
            songs={visibleSongs}
            artists={artists}
            albums={albums}
            playlists={playlists}
            favorites={favorites}
            currentPlayingSong={currentPlayingSong}
            onSelectSong={onSelectSong}
            onSelectArtist={(id) => {
              setSelectedArtistId(id);
              setCurrentTab("artist-profile");
            }}
            onSelectAlbum={(id) => {
              setSelectedAlbumId(id);
              setCurrentTab("album");
            }}
            onSelectPlaylist={(id) => {
              setSelectedPlaylistId(id);
              setCurrentTab("playlist");
            }}
            onLikeToggle={onLikeToggle}
          />
        );
      case "library":
        return (
          <LibraryView
            playlists={playlists.filter(p => p.ownerId === currentUser?.uid || p.userId === currentUser?.uid || p.createdBy === currentUser?.uid)}
            songs={visibleSongs}
            artists={artists}
            albums={albums}
            favorites={favorites}
            followingArtists={followingArtists}
            recentlyPlayed={recentlyPlayed}
            currentPlayingSong={currentPlayingSong}
            onSelectSong={onSelectSong}
            onSelectArtist={(id) => {
              setSelectedArtistId(id);
              setCurrentTab("artist-profile");
            }}
            onSelectAlbum={(id) => {
              setSelectedAlbumId(id);
              setCurrentTab("album");
            }}
            onSelectPlaylist={(id) => {
              setSelectedPlaylistId(id);
              setCurrentTab("playlist");
            }}
            onLikeToggle={onLikeToggle}
            onFollowToggle={onFollowToggle}
            onCreatePlaylist={onCreatePlaylist}
            onAddSongToPlaylist={onAddSongToPlaylist}
            onRemoveSongFromPlaylist={onRemoveSongFromPlaylist}
            initialSection={libraryTabSection}
            onClearHistory={onClearHistory}
          />
        );
      case "upload":
        if (!currentUser || currentUser.role !== "artist") {
          return (
            <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
              <AlertCircle className="w-12 h-12 text-zinc-600 mb-4" />
              <h3 className="text-lg font-bold text-zinc-300">Creator Account Required</h3>
              <p className="text-xs text-zinc-500 mt-1 mb-6">You must register as a creator to publish lossless tracks, monitor plays and configure stats.</p>
              <button
                onClick={onBecomeArtist}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-colors uppercase tracking-wide cursor-pointer"
              >
                Become SoundStream Creator
              </button>
            </div>
          );
        }
        return (
          <UploadDashboard
            currentUserArtist={currentUserArtist}
            onPublishSong={(song) => onSelectSong(song)}
            artistSongs={songs.filter((s) => s.artistId === currentUser.uid)}
            allArtists={artists}
            playlists={playlists}
            playlistSongs={playlistSongs}
            albums={albums}
          />
        );
      case "shorts":
        return (
          <ShortsFeed
            currentUser={currentUser}
            followingArtists={followingArtists}
            onFollowToggle={onFollowToggle}
            songs={songs}
            artists={artists}
            onSelectSong={onSelectSong}
            setCurrentTab={setCurrentTab}
          />
        );
      case "live":
        return (
          <LiveStreamingDashboard
            currentUser={currentUser}
            artists={artists}
            followingArtists={followingArtists}
            onFollowToggle={onFollowToggle}
            onSelectSong={onSelectSong}
            setCurrentTab={setCurrentTab}
            songs={visibleSongs}
          />
        );
      case "live-center":
        return (
          <SoundStreamLiveCenter
            userId={currentUser?.uid || "guest"}
            currentUser={currentUser}
            onBack={() => setCurrentTab("live")}
          />
        );
      case "video":
        return (
          <VideoDashboard
            songs={visibleSongs}
            artists={artists}
            currentUser={currentUser}
            favorites={favorites}
            followingArtists={followingArtists}
            playlists={playlists.filter(p => p.ownerId === currentUser?.uid || p.userId === currentUser?.uid || p.createdBy === currentUser?.uid)}
            onSelectSong={onSelectSong}
            onLikeToggle={onLikeToggle}
            onShareSong={onShareSong}
            onFollowToggle={onFollowToggle}
            onAddSongToPlaylist={onAddSongToPlaylist}
            onCreatePlaylist={onCreatePlaylist}
          />
        );
      case "chat":
        return (
          <ChatDashboard
            currentUser={currentUser}
            songs={songs}
            playlists={playlists}
            artists={artists}
            onSelectSong={onSelectSong}
            setCurrentTab={setCurrentTab}
            setSelectedPlaylistId={setSelectedPlaylistId}
            setSelectedArtistId={setSelectedArtistId}
          />
        );
      case "artist-profile":
        const selectedArtist = artists.find((a) => a.userId === selectedArtistId || a.uid === selectedArtistId);
        if (!selectedArtist) {
          return (
            <div className="py-20 text-center text-zinc-550">
              <p>Requested independent creator profile not found or is currently loading.</p>
            </div>
          );
        }
        return (
          <ArtistProfileView
            artist={selectedArtist}
            songs={visibleSongs}
            albums={albums}
            isFollowing={followingArtists.includes(selectedArtist.userId)}
            onFollowToggle={onFollowToggle}
            onSelectSong={onSelectSong}
            onSelectAlbum={(id) => {
              setSelectedAlbumId(id);
              setCurrentTab("album");
            }}
            favorites={favorites}
            onLikeToggle={onLikeToggle}
            currentPlayingSong={currentPlayingSong}
            onShareArtist={onShareArtist}
            isOwner={currentUser?.uid === selectedArtist.userId}
            onUploadClick={() => setCurrentTab("upload")}
          />
        );
      case "artist-profile-own":
        if (!currentUser) return null;
        const ownArtist = artists.find((a) => a.userId === currentUser.uid || a.uid === currentUser.uid);
        if (!ownArtist) {
          return (
            <div className="py-20 text-center text-zinc-550">
              <p>Your artist account profile is being initiated. Please wait.</p>
            </div>
          );
        }
        return (
          <ArtistProfileView
            artist={ownArtist}
            songs={visibleSongs}
            albums={albums}
            isFollowing={false}
            onFollowToggle={() => {}}
            onSelectSong={onSelectSong}
            onSelectAlbum={(id) => {
              setSelectedAlbumId(id);
              setCurrentTab("album");
            }}
            favorites={favorites}
            onLikeToggle={onLikeToggle}
            currentPlayingSong={currentPlayingSong}
            onShareArtist={onShareArtist}
            isOwner={true}
            onUploadClick={() => setCurrentTab("upload")}
          />
        );
      case "album": {
        const album = albums.find((a) => a.id === selectedAlbumId);
        if (!album) {
          return (
            <div className="text-zinc-400 text-center py-20 bg-[#050508] rounded-3xl border border-white/5 max-w-lg mx-auto">
              <AlertCircle className="w-12 h-12 text-zinc-650 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-zinc-300">Album Not Found</h3>
              <p className="text-xs text-zinc-500 mt-1 mb-6">This independent release may be undergoing verification, processing lossless audio formats, or was removed by the publisher.</p>
              <button
                onClick={() => setCurrentTab("home")}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-colors uppercase tracking-wide cursor-pointer"
              >
                Back to Home Dashboard
              </button>
            </div>
          );
        }
        return (
          <AlbumDetailsPage
            album={album}
            songs={visibleSongs}
            favorites={favorites}
            currentPlayingSong={currentPlayingSong}
            isPlaying={isPlaying}
            onSelectSong={onSelectSong}
            onLikeToggle={onLikeToggle}
            onBack={() => setCurrentTab("home")}
            onPlayAlbum={onPlayAlbum}
          />
        );
      }
      case "playlist": {
        const playlist = playlists.find((p) => p.id === selectedPlaylistId);
        if (!playlist) {
          return (
            <div className="text-zinc-400 text-center py-20 bg-[#050508] rounded-3xl border border-white/5 max-w-lg mx-auto">
              <AlertCircle className="w-12 h-12 text-zinc-650 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-zinc-300">Playlist Not Found</h3>
              <p className="text-xs text-zinc-500 mt-1 mb-6">This playlist compilation may have been deleted, or is private.</p>
              <button
                onClick={() => setCurrentTab("library")}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-colors uppercase tracking-wide cursor-pointer"
              >
                Back to My Library
              </button>
            </div>
          );
        }
        return (
          <PlaylistDetailsPage
            playlist={playlist}
            songs={visibleSongs}
            playlistSongs={playlistSongs}
            favorites={favorites}
            artists={artists}
            currentUser={currentUser}
            onSelectSong={onSelectSong}
            onLikeToggle={onLikeToggle}
            onBack={() => setCurrentTab("library")}
            onPlayPlaylist={onPlayPlaylist}
            onEditPlaylist={onEditPlaylist}
            onDeletePlaylist={onDeletePlaylist}
            onDuplicatePlaylist={onDuplicatePlaylist}
            onRemoveSongFromPlaylist={onRemoveSongFromPlaylist}
            onReorderPlaylistSongs={onReorderPlaylistSongs}
            onSelectArtist={(id) => {
              setSelectedArtistId(id);
              setCurrentTab("artist-profile");
            }}
          />
        );
      }
      case "yt-sync":
        return (
          <YTMusicSync
            onSelectSong={onSelectSong}
            existingSongs={visibleSongs}
            existingArtists={artists}
            onSyncComplete={() => {
              // We can trigger any refresh logic if needed, but onSnapshot automatically handles it
            }}
          />
        );
      case "login":
        return (
          <LoginView
            onLoginSuccess={(user, artist) => {
              setCurrentUser(user);
              if (artist) setCurrentUserArtist(artist);
              analytics.trackEvent("signup", user.uid, user.email, {
                role: user.role,
                method: "email_or_google"
              });
              setCurrentTab("home");
            }}
            users={[]}
            onBackToHome={() => setCurrentTab("home")}
          />
        );
      case "admin":
        return (
          <AdminDashboard
            songs={songs}
            artists={artists}
            playlists={playlists}
            currentUser={currentUser}
          />
        );
      case "premium":
        return (
          <MonetizationPortal
            currentUser={currentUser}
            onSubscriptionUpdated={(updatedUser) => {
              setCurrentUser(updatedUser);
            }}
          />
        );
      case "legal":
        return (
          <LegalAndSupport
            currentUser={currentUser}
          />
        );
      case "wallet":
        return (
          <SoundStreamWallet
            currentUser={currentUser}
            userId={currentUser?.uid || ""}
          />
        );
      case "creator-hub":
        return (
          <SoundStreamCreatorHub
            creatorId={currentUser?.uid || ""}
            onNavigateToUpload={() => setCurrentTab("upload")}
          />
        );
      case "leaderboards":
        return (
          <SoundStreamLeaderboards />
        );
      case "games":
        return (
          <SoundStreamGamesCenter
            userId={currentUser?.uid || ""}
            username={currentUser?.username || currentUser?.displayName || ""}
            avatar={currentUser?.photoURL || ""}
            isAdmin={isAdmin}
          />
        );
      case "agency":
        return (
          <SoundStreamAgencyHub
            userId={currentUser?.uid || ""}
            userEmail={currentUser?.email || ""}
            isArtist={currentUser?.role === "artist"}
            isAdmin={isAdmin}
          />
        );
      case "ads":
        return (
          <SoundStreamAdsManager
            userId={currentUser?.uid || "guest"}
            userEmail={currentUser?.email || "guest@soundstream.com"}
            isAdmin={isAdmin}
            onSelectSong={onSelectSong}
            setCurrentTab={setCurrentTab}
          />
        );
      default:
        return null;
    }
  };

  if (currentPathname === "/privacy") {
    return <PrivacyPolicyPage onNavigate={handleNavigate} />;
  }

  if (currentPathname === "/terms") {
    return <TermsOfServicePage onNavigate={handleNavigate} />;
  }

  if (currentUser?.isSuspended) {
    return (
      <div className="bg-[#0c0c0e] min-h-screen text-white flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden w-full">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-950/10 rounded-full filter blur-3xl pointer-events-none" />
        <div className="max-w-md w-full bg-[#121214] border border-red-500/10 rounded-3xl p-8 text-center relative z-10 shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold uppercase tracking-tight text-white mb-2">
            Profile Suspended
          </h2>
          <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
            Your SoundStream account (<span className="text-zinc-200 font-mono text-xs">{currentUser.email}</span>) has been suspended by the platform administration due to violations of our independent community guidelines.
          </p>
          <div className="bg-black/40 border border-white/5 rounded-2xl p-4 mb-6 text-left space-y-2">
            <p className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Restriction Details</p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500 font-sans">Status:</span>
              <span className="font-bold text-red-400 uppercase tracking-wider font-mono text-[10px]">Restricted</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500 font-sans">User ID:</span>
              <span className="font-mono text-zinc-400 text-[10px]">{currentUser.uid.slice(0, 16)}...</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => onLogout()}
              className="flex-1 bg-red-650 hover:bg-red-600 text-white text-xs font-bold uppercase py-3 rounded-xl transition-colors cursor-pointer border-none font-sans"
            >
              Sign Out Account
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-[#1e1e20] hover:bg-[#2e2e32] text-zinc-300 border border-white/5 text-xs font-bold uppercase py-3 rounded-xl transition-colors cursor-pointer font-sans"
            >
              Refresh Check
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showIntro) {
    return <FirstLaunchIntro onComplete={() => setShowIntro(false)} />;
  }

  return (
    <div className="bg-[#121212] min-h-screen text-white flex flex-col md:flex-row font-sans">
      
      {/* Sidebar Navigation */}
      <Navigation
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={currentUser}
        isArtist={currentUser?.role === "artist"}
        onLogout={onLogout}
        onBecomeArtist={onBecomeArtist}
        isAdmin={isAdmin}
        onWatchRewardedAd={() => setShowRewardedAd(true)}
        setLibraryTabSection={setLibraryTabSection}
        isInstallable={isInstallable}
        isAppInstalled={isAppInstalled}
        onInstall={handleInstallClick}
        isAndroid={isAndroid}
        isIOS={isIOS}
        onShowIOSPrompt={() => setShowIOSPrompt(true)}
        playlists={playlists}
        songs={songs}
        artists={artists}
        favorites={favorites}
        followingArtists={followingArtists}
        recentlyPlayed={recentlyPlayed}
      />

      {/* Main Content Pane */}
      <main className="flex-1 p-6 md:p-10 pb-36 overflow-y-auto max-h-screen">
        {/* Premium Unified Top Navigation Header */}
        {currentTab !== "login" && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5 mb-8 select-none">
            <div className="space-y-0.5">
              <h1 className="text-xl font-extrabold tracking-tight text-white uppercase font-sans">
                SoundStream <span className="text-indigo-400 font-mono text-xs ml-1.5">v3.5.0</span>
              </h1>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest font-semibold">
                High-Fidelity Independent Workspace
              </p>
            </div>

            {/* Segmented Section Controller */}
            <div className="flex items-center gap-1 bg-zinc-950/40 border border-white/5 p-1 rounded-2xl self-start sm:self-auto shadow-inner">
              {[
                { id: "home", label: "Music" },
                { id: "video", label: "Video" },
                { id: "live", label: "Livestream" },
                { id: "library", label: "Library" }
              ].map((section) => {
                const isActive = currentTab === section.id || 
                  (section.id === "library" && ["library", "playlist", "album", "artist-profile", "artist-profile-own"].includes(currentTab)) ||
                  (section.id === "home" && ["trending", "yt-sync"].includes(currentTab));
                return (
                  <button
                    key={section.id}
                    onClick={() => {
                      setCurrentTab(section.id);
                      if (section.id === "library") {
                        setLibraryTabSection("playlists");
                      }
                    }}
                    className={`px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border-none cursor-pointer font-sans ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]"
                    }`}
                  >
                    {section.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {renderTabContent()}
        {["home", "search", "library", "trending", "artist-profile"].includes(currentTab) && (
          <div className="mt-8">
            <AdMobBanner user={currentUser} placementId={currentTab} />
          </div>
        )}
      </main>

      {/* Persistent Media Player Engine */}
      <MusicPlayer
        song={currentPlayingSong}
        isPlaying={isPlaying}
        onPlayPauseToggle={() => setIsPlaying(!isPlaying)}
        onNext={handleNextTrack}
        onPrev={handlePrevTrack}
        liked={currentPlayingSong ? favorites.includes(currentPlayingSong.id) : false}
        onLikeToggle={onLikeToggle}
        audioRef={audioRef}
        playbackTime={playbackTime}
        onSeek={handleSeek}
        isShuffle={isShuffle}
        onShuffleToggle={() => setIsShuffle(!isShuffle)}
        isRepeat={isRepeat}
        onRepeatToggle={() => setIsRepeat(!isRepeat)}
        onShareSong={onShareSong}
        playbackError={playbackError}
        playbackMode={playbackMode}
        onPlaybackModeToggle={handlePlaybackModeToggle}
        isPremium={currentUser ? admob.isPremiumUser(currentUser) : false}
      />

      {/* Interactive Floating Share Modal */}
      {shareData && (
        <ShareModal
          isOpen={shareData.isOpen}
          onClose={() => setShareData(null)}
          type={shareData.type}
          id={shareData.id}
          title={shareData.title}
          subtitle={shareData.subtitle}
        />
      )}

      {/* GDPR Consent Flow Dialog */}
      <GDPRConsentDialog 
        user={currentUser} 
        onConsentComplete={(consent) => {
          console.log("GDPR user choices recorded:", consent);
        }} 
      />

      {/* AdMob Interstitial Overlay */}
      {showInterstitialAd && (
        <AdMobInterstitial
          user={currentUser}
          onAdClosed={() => {
            setShowInterstitialAd(false);
            if (pendingSongToPlay) {
              const song = pendingSongToPlay;
              setPendingSongToPlay(null);
              // Bypasses further transition increment checks to prevent recursion loops and ensures proper routing
              onSelectSong(song, true);
            }
          }}
        />
      )}

      {/* AdMob Rewarded Video Overlay */}
      {showRewardedAd && (
        <AdMobRewarded
          user={currentUser}
          onRewardEarned={() => {
            const expiry = admob.grantTemporaryPremium(1);
            setTempPremiumRemaining(60);
            console.log("Temporary premium tier earned until timestamp:", expiry);
          }}
          onAdClosed={() => {
            setShowRewardedAd(false);
          }}
        />
      )}

      {/* Floating Install/Download Banner */}
      {!isAppInstalled && (
        <div className="fixed bottom-24 md:bottom-28 right-4 md:right-10 z-40 animate-fade-in animate-bounce-subtle flex flex-col sm:flex-row gap-2">
          {/* Always offer APK Download */}
          <a
            href="/Soundstream.apk"
            download="Soundstream.apk"
            onClick={() => {
              analytics.trackEvent("apk_download", currentUser?.uid || "anonymous", currentUser?.email || "anonymous", {
                fileName: "Soundstream.apk",
                location: "floating_install_banner"
              });
            }}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-sans font-bold text-xs rounded-full shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer border-none no-underline"
          >
            <Download className="w-4 h-4 text-white animate-pulse" />
            <span>Download Android App</span>
          </a>

          {/* Always offer Web App Installation Option */}
          <button
            onClick={() => {
              if (isIOS) {
                setShowIOSPrompt(true);
              } else {
                handleInstallClick();
              }
            }}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-sans font-bold text-xs rounded-full shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer border-none"
          >
            <Smartphone className="w-4 h-4 text-white" />
            <span>Install Web App</span>
          </button>
        </div>
      )}

      {/* iOS PWA Instructions Overlay */}
      {showIOSPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm bg-[#121214] border border-white/10 rounded-3xl p-6 shadow-2xl text-center animate-scale-up">
            {/* Close button */}
            <button
              onClick={() => setShowIOSPrompt(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-full transition-all cursor-pointer border-none"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 bg-purple-600/10 text-purple-400 border border-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white mb-2">Install SoundStreamy</h3>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              Add SoundStreamy to your home screen to enjoy a immersive full-screen experience and instant offline audio listening!
            </p>

            {/* Instruction Steps */}
            <div className="text-left space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-600/20 text-purple-400 font-sans font-bold text-[10px] mt-0.5">
                  1
                </div>
                <div className="flex-1 text-xs text-zinc-350">
                  Tap the <span className="inline-flex items-center gap-1 font-bold text-white bg-white/5 px-1.5 py-0.5 rounded"><Share className="w-3 h-3" /> Share</span> button at the bottom (or top) of your Safari browser.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-600/20 text-purple-400 font-sans font-bold text-[10px] mt-0.5">
                  2
                </div>
                <div className="flex-1 text-xs text-zinc-350">
                  Scroll down the share sheet and select <span className="font-bold text-white">"Add to Home Screen"</span>.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-600/20 text-purple-400 font-sans font-bold text-[10px] mt-0.5">
                  3
                </div>
                <div className="flex-1 text-xs text-zinc-350">
                  Tap <span className="font-bold text-purple-400">"Add"</span> in the top-right corner to complete the install!
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSPrompt(false)}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold uppercase py-3 rounded-xl transition-all cursor-pointer border-none shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* Immersive Dedicated Video Player Overlay */}
      <AnimatePresence>
        {currentPlayingVideo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#020204]/98 backdrop-blur-md flex flex-col items-center justify-center p-4 md:p-8 z-[100]"
          >
            <div className="w-full max-w-4xl space-y-4 relative flex flex-col items-center">
              <VideoPlayer 
                videoUrl={currentPlayingVideo.videoUrl || currentPlayingVideo.audioUrl}
                title={currentPlayingVideo.title}
                artistName={currentPlayingVideo.artistName}
                coverUrl={currentPlayingVideo.coverUrl}
                onClose={() => {
                  setCurrentPlayingVideo(null);
                }}
              />
              <p className="text-center font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
                Now experiencing high-definition independent cinema on SoundStream ⚡ Press Esc or click close to return
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
