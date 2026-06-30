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
import { admob } from "./lib/admob";
import { GDPRConsentDialog, AdMobInterstitial, AdMobRewarded, AdMobBanner } from "./components/AdMobComponents";
import MonetizationPortal from "./components/MonetizationPortal";
import LegalAndSupport from "./components/LegalAndSupport";
import { analytics } from "./lib/analytics";

import { Music, AlertCircle, Award, Sparkles } from "lucide-react";

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
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackTime, setPlaybackTime] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  
  // Audio Mode / Video Mode selection state
  const [playbackMode, setPlaybackMode] = useState<"audio" | "video">("video");
  
  // Core HTML5 media tag reference
  const audioRef = useRef<HTMLVideoElement | null>(null);

  // AdMob States
  const [showInterstitialAd, setShowInterstitialAd] = useState<boolean>(false);
  const [showRewardedAd, setShowRewardedAd] = useState<boolean>(false);
  const [pendingSongToPlay, setPendingSongToPlay] = useState<Song | null>(null);
  const [tempPremiumRemaining, setTempPremiumRemaining] = useState<number>(0);

  // Initialize AdMob on app startup
  useEffect(() => {
    admob.initialize();

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
      clearInterval(interval);
      window.removeEventListener("open-premium-upgrade", handleUpgradeRequest);
    };
  }, [currentUser]);

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
              displayName: d.username || firebaseUser.email?.split("@")[0] || "User",
              email: firebaseUser.email || "",
              photoURL: d.photoURL || firebaseUser.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80",
              createdAt: d.createdAt || new Date().toISOString(),
              role: d.role || "listener",
              isSuspended: d.isSuspended || false
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
              isSuspended: false
            };
            await setDoc(userDocRef, {
              uid: newUser.uid || "",
              username: newUser.username || "",
              email: newUser.email || "",
              photoURL: newUser.photoURL || "",
              createdAt: newUser.createdAt || new Date().toISOString(),
              role: newUser.role || "listener",
              isSuspended: false,
              isAdmin: isTargetAdmin
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
      audioRef.current.play().catch((err) => {
        console.warn("Media playback autoplay blocked by browser sandbox policy.", err);
        setIsPlaying(false);
        setPlaybackError("Playback blocked or paused. Click the Play button to resume streaming.");
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

  // 6. Interaction Actions: Play song, Like Song, Follow Artist, Create/Add playlist
  const onSelectSong = async (song: Song) => {
    // Check if free user has triggered an AdMob interstitial ad before starting playback
    if (admob.recordSongTransition(currentUser, isPlaying)) {
      setPendingSongToPlay(song);
      setShowInterstitialAd(true);
      return;
    }

    setCurrentPlayingSong(song);
    setIsPlaying(true);

    // Track play analytics event
    analytics.trackEvent("play", currentUser?.uid, currentUser?.email, {
      songId: song.id,
      title: song.title,
      artistId: song.artistId,
      playbackMode: song.videoUrl ? "video" : "audio"
    });

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
      default:
        return null;
    }
  };

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
      />

      {/* Main Content Pane */}
      <main className="flex-1 p-6 md:p-10 pb-36 overflow-y-auto max-h-screen">
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
              // Bypasses further transition increment checks to prevent recursion loops
              setCurrentPlayingSong(song);
              setIsPlaying(true);
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

    </div>
  );
}
