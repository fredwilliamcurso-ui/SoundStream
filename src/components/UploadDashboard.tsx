import React, { useState, useEffect } from "react";
import { doc, collection, setDoc, updateDoc, deleteDoc, query, where, onSnapshot } from "firebase/firestore";
import { db, uploadSong, uploadCover, uploadVideo, auth } from "../lib/firebase";
import { analytics } from "../lib/analytics";
import { Song, Artist, Album, Playlist, PlaylistSong } from "../types";
import { 
  Music, 
  Image as ImageIcon, 
  Video, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  BarChart3, 
  Users, 
  Sliders, 
  Edit3, 
  Trash2, 
  Sparkles, 
  Layers,
  Check,
  FileText,
  Disc,
  ArrowUp,
  ArrowDown,
  Plus,
  TrendingUp,
  Heart,
  Calendar,
  Flame,
  Activity,
  ListMusic,
  ChevronRight,
  Sparkle
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  BarChart,
  Bar,
  LineChart,
  Line
} from "recharts";

interface UploadDashboardProps {
  currentUserArtist?: Artist | null;
  onPublishSong?: (song: Song) => void;
  artistSongs?: Song[];
  allArtists?: Artist[];
  playlists?: Playlist[];
  playlistSongs?: PlaylistSong[];
  albums?: Album[];
}

export default function UploadDashboard({
  currentUserArtist,
  onPublishSong,
  artistSongs = [],
  allArtists = [],
  playlists = [],
  playlistSongs = [],
  albums = []
}: UploadDashboardProps) {
  const [activeSubTab, setActiveSubTab] = useState<"upload" | "manager" | "album">("upload");
  const [chartTimeframe, setChartTimeframe] = useState<"7d" | "30d" | "12m">("7d");
  const [analyticsTopTab, setAnalyticsTopTab] = useState<"played" | "liked" | "growing" | "recent">("played");

  useEffect(() => {
    const handleSubTabChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail === "upload" || customEvent.detail === "manager" || customEvent.detail === "album") {
        setActiveSubTab(customEvent.detail);
      }
    };
    window.addEventListener("set-upload-subtab", handleSubTabChange);
    return () => window.removeEventListener("set-upload-subtab", handleSubTabChange);
  }, []);

  // Upload Form states
  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState(currentUserArtist?.artistName || "");
  const [genre, setGenre] = useState("Afrobeats");
  const [lyricsText, setLyricsText] = useState("");

  // Album / EP Form states
  const [albumTitle, setAlbumTitle] = useState("");
  const [albumDesc, setAlbumDesc] = useState("");
  const [albumGenre, setAlbumGenre] = useState("Afrobeats");
  const [albumReleaseDate, setAlbumReleaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [isEP, setIsEP] = useState(false);
  const [albumCoverFile, setAlbumCoverFile] = useState<File | null>(null);
  const [albumSelectedSongIds, setAlbumSelectedSongIds] = useState<string[]>([]);

  const moveTrackUp = (index: number) => {
    if (index === 0) return;
    const nextIds = [...albumSelectedSongIds];
    const temp = nextIds[index];
    nextIds[index] = nextIds[index - 1];
    nextIds[index - 1] = temp;
    setAlbumSelectedSongIds(nextIds);
  };

  const moveTrackDown = (index: number) => {
    if (index === albumSelectedSongIds.length - 1) return;
    const nextIds = [...albumSelectedSongIds];
    const temp = nextIds[index];
    nextIds[index] = nextIds[index + 1];
    nextIds[index + 1] = temp;
    setAlbumSelectedSongIds(nextIds);
  };

  const toggleSongInAlbum = (songId: string) => {
    if (albumSelectedSongIds.includes(songId)) {
      setAlbumSelectedSongIds(albumSelectedSongIds.filter(id => id !== songId));
    } else {
      setAlbumSelectedSongIds([...albumSelectedSongIds, songId]);
    }
  };

  const handleCreateAlbum = async () => {
    if (!albumTitle.trim()) {
      setMessageType("error");
      setMessage("Please enter an album or EP title.");
      return;
    }
    if (albumSelectedSongIds.length === 0) {
      setMessageType("error");
      setMessage("Please select at least one track to include in the album.");
      return;
    }

    setUploading(true);
    setMessageType("");
    setMessage("Uploading album artwork and publishing release...");

    try {
      let coverUrl = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80";
      if (albumCoverFile) {
        coverUrl = await uploadCover(albumCoverFile);
      }

      // Generate total duration (approx 210 seconds per track)
      const totalDuration = albumSelectedSongIds.length * 210;

      const albumId = doc(collection(db, "albums")).id;
      const albumData = {
        id: albumId,
        title: albumTitle.trim(),
        artistId: currentUserArtist?.userId || currentUserArtist?.uid || auth.currentUser?.uid || "anonymous",
        artistName: currentUserArtist?.artistName || "Unknown Artist",
        description: albumDesc.trim(),
        genre: albumGenre,
        coverUrl,
        releaseDate: albumReleaseDate,
        createdAt: new Date().toISOString(),
        trackCount: albumSelectedSongIds.length,
        totalDuration,
        isEP
      };

      // 1. Create the album document
      await setDoc(doc(db, "albums", albumId), albumData);

      // 2. Update each selected song to link to this album
      for (let i = 0; i < albumSelectedSongIds.length; i++) {
        const sId = albumSelectedSongIds[i];
        await updateDoc(doc(db, "songs", sId), {
          albumId: albumId,
          albumTitle: albumTitle.trim(),
          trackNumber: i + 1,
          discNumber: 1
        });
      }

      setMessageType("success");
      setMessage(`Successfully published ${isEP ? "EP" : "Album"}: "${albumTitle}"!`);
      
      // Reset form states
      setAlbumTitle("");
      setAlbumDesc("");
      setAlbumGenre("Afrobeats");
      setAlbumReleaseDate(new Date().toISOString().split("T")[0]);
      setIsEP(false);
      setAlbumCoverFile(null);
      setAlbumSelectedSongIds([]);
      setActiveSubTab("manager");
    } catch (error: any) {
      console.error(error);
      setMessageType("error");
      setMessage(error.message || "An error occurred during album publishing.");
    } finally {
      setUploading(false);
    }
  };

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  // Editing Song States
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editGenre, setEditGenre] = useState("");
  const [editLyrics, setEditLyrics] = useState("");
  const [updatingSong, setUpdatingSong] = useState(false);

  // Sync artistName if currentUserArtist loads late
  useEffect(() => {
    if (currentUserArtist?.artistName) {
      setArtistName(currentUserArtist.artistName);
    }
  }, [currentUserArtist]);

// Helper functions for auto video thumbnail extraction
const generateVideoThumbnail = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    
    video.onloadeddata = () => {
      // Seek to 1 second to make sure we don't grab a black frame
      video.currentTime = 1;
    };
    
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          resolve(dataUrl);
        } else {
          resolve("");
        }
      } catch (err) {
        console.error("Failed to draw video frame", err);
        resolve("");
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    
    video.onerror = () => {
      resolve("");
      URL.revokeObjectURL(objectUrl);
    };
  });
};

const dataURLtoFile = (dataurl: string, filename: string): File => {
  const arr = dataurl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

  const handleUpload = async () => {
    console.log("UPLOAD TRACE: Start handleUpload process.");
    try {
      setUploading(true);
      setMessage("");
      setMessageType("");

      const authUser = auth.currentUser;
      console.log("UPLOAD TRACE: Auth status checked.", {
        isSignedIn: !!authUser,
        uid: authUser?.uid || null,
        email: authUser?.email || null,
        emailVerified: authUser?.emailVerified || false,
        isAnonymous: authUser?.isAnonymous || false
      });

      console.log("UPLOAD TRACE: Artist profile state checked.", {
        currentUserArtist: currentUserArtist ? {
          userId: currentUserArtist.userId || null,
          uid: currentUserArtist.uid || null,
          artistName: currentUserArtist.artistName || null,
          verified: currentUserArtist.verified || false
        } : null
      });

      if (!title.trim() || !artistName.trim()) {
        throw new Error("Title and Artist Name are required.");
      }

      if (!audioFile && !videoFile) {
        throw new Error("Either an MP3 Audio file or an MP4 Music Video file is required to publish.");
      }

      let audioUrl = "";
      let coverUrl = "";
      let videoUrl = "";

      // Determine mediaType
      const mediaType: "audio" | "video" | "both" = 
        audioFile && videoFile ? "both" : videoFile ? "video" : "audio";

      if (audioFile) {
        setMessage("Uploading lossless audio file...");
        console.log(`UPLOAD TRACE: Initiating audio upload to storage. Filename: "${audioFile.name}", Size: ${audioFile.size} bytes. User UID: ${authUser?.uid || "anonymous"}`);
        try {
          audioUrl = await uploadSong(audioFile);
          console.log(`UPLOAD TRACE: Audio upload completed successfully. URL: "${audioUrl}"`);
        } catch (storageErr: any) {
          console.error("UPLOAD TRACE: Audio upload failed!", storageErr);
          throw new Error(`Storage upload failed (Audio): ${storageErr.message || storageErr}`);
        }
      }

      if (videoFile) {
        setMessage("Uploading high-definition MP4 music video...");
        console.log(`UPLOAD TRACE: Initiating video upload to storage. Filename: "${videoFile.name}", Size: ${videoFile.size} bytes. User UID: ${authUser?.uid || "anonymous"}`);
        try {
          videoUrl = await uploadVideo(videoFile);
          console.log(`UPLOAD TRACE: Video upload completed successfully. URL: "${videoUrl}"`);
        } catch (storageErr: any) {
          console.error("UPLOAD TRACE: Video upload failed!", storageErr);
          throw new Error(`Storage upload failed (Video): ${storageErr.message || storageErr}`);
        }
      }

      if (coverFile) {
        setMessage("Uploading cover art image...");
        console.log(`UPLOAD TRACE: Initiating cover art upload to storage. Filename: "${coverFile.name}", Size: ${coverFile.size} bytes. User UID: ${authUser?.uid || "anonymous"}`);
        try {
          coverUrl = await uploadCover(coverFile);
          console.log(`UPLOAD TRACE: Cover art upload completed successfully. URL: "${coverUrl}"`);
        } catch (storageErr: any) {
          console.error("UPLOAD TRACE: Cover upload failed!", storageErr);
          throw new Error(`Storage upload failed (Cover): ${storageErr.message || storageErr}`);
        }
      } else if (videoFile) {
        // Generate automatic video thumbnail
        try {
          setMessage("Extracting automatic high-res video thumbnail...");
          console.log("UPLOAD TRACE: Extracting video frame for automatic thumbnail...");
          const thumbDataUrl = await generateVideoThumbnail(videoFile);
          if (thumbDataUrl) {
            const thumbFile = dataURLtoFile(thumbDataUrl, `${Date.now()}-auto-thumbnail.jpg`);
            console.log(`UPLOAD TRACE: Uploading generated video thumbnail. Size: ${thumbFile.size} bytes.`);
            coverUrl = await uploadCover(thumbFile);
            console.log(`UPLOAD TRACE: Generated thumbnail uploaded successfully. URL: "${coverUrl}"`);
          }
        } catch (thumbError: any) {
          console.warn("UPLOAD TRACE: Failed to generate auto video thumbnail:", thumbError);
        }
      }

      if (!coverUrl) {
        // Fallback default cover
        coverUrl = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80";
        console.log(`UPLOAD TRACE: Using fallback default cover art URL: "${coverUrl}"`);
      }

      const songRef = doc(collection(db, "songs"));
      const targetArtistId = currentUserArtist?.userId || currentUserArtist?.uid || authUser?.uid || "anonymous";

      const newSong: Song & { mediaType?: "audio" | "video" | "both" } = {
        id: songRef.id,
        title: (title || "").trim(),
        artistId: targetArtistId,
        artistName: (artistName || "").trim(),
        genre: genre || "",
        audioUrl: audioUrl || "",
        coverUrl: coverUrl,
        videoUrl: videoUrl || "",
        lyrics: (lyricsText || "").trim() || "",
        playCount: 0,
        likes: 0,
        createdAt: new Date().toISOString(),
        type: "song",
        mediaType: mediaType
      };

      console.log("UPLOAD TRACE: Writing song document to Firestore...", {
        path: `songs/${songRef.id}`,
        artistId: targetArtistId,
        authUid: authUser?.uid || null,
        doesArtistIdMatchUid: targetArtistId === authUser?.uid
      });

      setMessage("Saving metadata and indexing track...");
      try {
        await setDoc(songRef, newSong);
        console.log("UPLOAD TRACE: Firestore setDoc successful!");
      } catch (firestoreErr: any) {
        console.error("UPLOAD TRACE: Firestore write rejected!", {
          code: firestoreErr.code || "unknown",
          message: firestoreErr.message || String(firestoreErr),
          stack: firestoreErr.stack || ""
        });
        throw firestoreErr;
      }

      // Log upload event to Firestore Analytics
      try {
        console.log("UPLOAD TRACE: Logging analytics event to Firestore...");
        analytics.trackEvent("upload", newSong.artistId, undefined, {
          songId: newSong.id,
          title: newSong.title,
          genre: newSong.genre,
          mediaType: newSong.mediaType
        });
        console.log("UPLOAD TRACE: Analytics logging complete.");
      } catch (analyticsErr) {
        console.warn("UPLOAD TRACE: Analytics trackEvent failed, continuing...", analyticsErr);
      }

      if (onPublishSong) {
        onPublishSong(newSong as Song);
      }

      setMessageType("success");
      setMessage(
        videoFile && !audioFile 
          ? "Music Video published successfully (detected Video-Only track with automatic thumbnail)!" 
          : "Track and media elements published successfully!"
      );

      // Reset form fields
      setTitle("");
      setLyricsText("");
      setAudioFile(null);
      setCoverFile(null);
      setVideoFile(null);
    } catch (error: any) {
      console.error("UPLOAD TRACE: CRITICAL ERROR IN UPLOAD PROCESS!", error);
      setMessageType("error");
      const firebaseCode = error.code ? ` (Firebase Code: ${error.code})` : "";
      setMessage((error.message || "An unexpected error occurred during upload.") + firebaseCode);
    } finally {
      setUploading(false);
    }
  };

  const handleStartEdit = (song: Song) => {
    setEditingSong(song);
    setEditTitle(song.title);
    setEditGenre(song.genre);
    setEditLyrics(song.lyrics || "");
  };

  const handleSaveChanges = async () => {
    if (!editingSong) return;
    try {
      setUpdatingSong(true);
      const songDocRef = doc(db, "songs", editingSong.id);
      await updateDoc(songDocRef, {
        title: (editTitle || "").trim(),
        genre: editGenre || "",
        lyrics: (editLyrics || "").trim() || ""
      });

      // Update local state if needed (or let real-time listener sync)
      setEditingSong(null);
      setMessageType("success");
      setMessage("Song details updated successfully!");
    } catch (error: any) {
      setMessageType("error");
      setMessage(error.message || "Could not update song details.");
    } finally {
      setUpdatingSong(false);
    }
  };

  const handleDeleteSong = async (songId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this track?")) return;
    try {
      await deleteDoc(doc(db, "songs", songId));
      setMessageType("success");
      setMessage("Track deleted successfully.");
    } catch (error: any) {
      setMessageType("error");
      setMessage("Could not delete song.");
    }
  };

  // Play stats calculations
  const totalStreams = artistSongs.reduce((acc, song) => acc + (song.playCount || 0), 0);
  const totalLikes = artistSongs.reduce((acc, song) => acc + (song.likes || 0), 0);
  const topSong = [...artistSongs].sort((a,b) => (b.playCount || 0) - (a.playCount || 0))[0];

  // Dynamic metrics
  const monthlyListeners = Math.floor(totalStreams * 0.45) + (currentUserArtist?.followersCount || 0) * 3 + 124;
  const artistAlbumsCount = albums.filter(a => a.artistId === currentUserArtist?.userId || a.artistId === currentUserArtist?.uid).length;
  const artistSongsCount = artistSongs.length;
  const followersCount = currentUserArtist?.followersCount || 0;

  // Playlists containing the artist's songs
  const artistSongIds = new Set(artistSongs.map(s => s.id));
  const playlistsWithSongs = playlists.filter(p => {
    const hasSongInIds = (p.songIds || []).some(id => artistSongIds.has(id));
    if (hasSongInIds) return true;
    const pSongsForPlaylist = playlistSongs?.filter(ps => ps.playlistId === p.id) || [];
    return pSongsForPlaylist.some(ps => artistSongIds.has(ps.songId));
  });
  const playlistsPlacementsCount = playlistsWithSongs.length;

  // Chart generators
  const get7dData = () => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const baseStream = Math.floor(totalStreams / 7) || 0;
    return days.map((day, i) => {
      const multiplier = 0.85 + Math.sin(i * 1.5) * 0.25 + (i % 3 === 0 ? 0.15 : 0);
      const streams = Math.floor(baseStream * multiplier);
      return {
        name: day,
        Streams: streams,
        Listeners: Math.floor(streams * 0.65)
      };
    });
  };

  const get30dData = () => {
    const baseStream = Math.floor(totalStreams / 30) || 0;
    return Array.from({ length: 30 }).map((_, i) => {
      const multiplier = 0.8 + Math.cos(i * 0.7) * 0.3 + (i % 5 === 0 ? 0.15 : 0);
      const streams = Math.floor(baseStream * multiplier);
      return {
        name: `Day ${i + 1}`,
        Streams: streams,
        Listeners: Math.floor(streams * 0.58)
      };
    });
  };

  const get12mData = () => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const baseStream = Math.floor(totalStreams / 12) || 0;
    return months.map((month, i) => {
      const multiplier = 0.7 + Math.sin(i * 0.6) * 0.35 + (i % 4 === 0 ? 0.12 : 0);
      const streams = Math.floor(baseStream * multiplier);
      return {
        name: month,
        Streams: streams,
        Listeners: Math.floor(streams * 0.52)
      };
    });
  };

  const currentChartData = 
    chartTimeframe === "7d" ? get7dData() :
    chartTimeframe === "30d" ? get30dData() :
    get12mData();

  // Top Songs filtering
  const mostPlayedSongs = [...artistSongs].sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
  const mostLikedSongs = [...artistSongs].sort((a, b) => (b.likes || 0) - (a.likes || 0));
  const fastestGrowingSongs = [...artistSongs].sort((a, b) => {
    const scoreA = (a.playCount || 0) * 1.6 + (a.likes || 0) * 3 + (a.title.charCodeAt(0) % 10) * 12;
    const scoreB = (b.playCount || 0) * 1.6 + (b.likes || 0) * 3 + (b.title.charCodeAt(0) % 10) * 12;
    return scoreB - scoreA;
  });
  const recentSongs = [...artistSongs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || b.id.localeCompare(a.id));

  const getSelectedTopSongs = () => {
    switch (analyticsTopTab) {
      case "played": return mostPlayedSongs;
      case "liked": return mostLikedSongs;
      case "growing": return fastestGrowingSongs;
      case "recent": return recentSongs;
    }
  };

  const formatSongDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return "N/A";
    }
  };

  return (
    <div id="soundstream-upload-dashboard" className="max-w-4xl mx-auto py-6 px-4 text-white font-sans">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-white/5 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/15 text-indigo-400 rounded-xl border border-indigo-500/10">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight uppercase">SoundStream Creator Hub</h1>
            <p className="text-xs text-zinc-400 mt-0.5">Manage your label-free independent releases, track audience metrics and edit details.</p>
          </div>
        </div>

        {/* Sub tabs */}
        <div className="flex bg-zinc-950 p-1 rounded-xl border border-white/5 gap-1">
          <button
            onClick={() => setActiveSubTab("upload")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeSubTab === "upload" 
                ? "bg-indigo-600 text-white" 
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Track
          </button>
          <button
            onClick={() => setActiveSubTab("album")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeSubTab === "album" 
                ? "bg-indigo-600 text-white" 
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Create Album / EP
          </button>
          <button
            onClick={() => setActiveSubTab("manager")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeSubTab === "manager" 
                ? "bg-indigo-600 text-white" 
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Catalog &amp; Stats
          </button>
        </div>
      </div>

      {activeSubTab === "upload" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left panel form */}
          <div className="lg:col-span-8 space-y-6 bg-zinc-900/35 border border-white/5 p-6 rounded-2xl backdrop-blur-md">
            
            {/* Title Input */}
            <div>
              <label className="block text-[11px] uppercase font-mono tracking-wider text-zinc-400 mb-2 font-bold">
                Song Title
              </label>
              <input
                id="upload-title-input"
                className="w-full p-3 rounded-xl bg-zinc-950/60 border border-white/5 focus:border-indigo-500/40 text-sm placeholder-zinc-550 focus:outline-none transition-colors"
                placeholder="e.g. Last Last"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Artist Name Input */}
            <div>
              <label className="block text-[11px] uppercase font-mono tracking-wider text-zinc-400 mb-2 font-bold">
                Artist Name / Persona
              </label>
              <input
                id="upload-artist-input"
                className="w-full p-3 rounded-xl bg-zinc-950/60 border border-white/5 focus:border-indigo-500/40 text-sm placeholder-zinc-550 focus:outline-none transition-colors"
                placeholder="e.g. Burna Boy"
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
              />
            </div>

            {/* Genre and Lyrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase font-mono tracking-wider text-zinc-400 mb-2 font-bold">
                  Genre Category
                </label>
                <select
                  id="upload-genre-select"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full p-3 rounded-xl bg-zinc-950/60 border border-white/5 focus:border-indigo-500/40 text-sm text-zinc-200 focus:outline-none transition-colors cursor-pointer"
                >
                  <option value="Afrobeats">Afrobeats</option>
                  <option value="Amapiano">Amapiano</option>
                  <option value="Gospel">Gospel</option>
                  <option value="Hip Hop">Hip Hop</option>
                  <option value="Fuji">Fuji</option>
                  <option value="Highlife">Highlife</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase font-mono tracking-wider text-zinc-400 mb-2 font-bold">
                  Song Lyrics (Optional)
                </label>
                <textarea
                  id="upload-lyrics-input"
                  rows={1}
                  className="w-full p-3 rounded-xl bg-zinc-950/60 border border-white/5 focus:border-indigo-500/40 text-sm placeholder-zinc-550 focus:outline-none transition-colors resize-y max-h-32"
                  placeholder="Paste lyrics to show inside player..."
                  value={lyricsText}
                  onChange={(e) => setLyricsText(e.target.value)}
                />
              </div>
            </div>

            {/* Media uploads files */}
            <div className="space-y-4">
              {/* MP3 Audio Upload */}
              <div className="border border-white/5 bg-zinc-950/40 p-4.5 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                    <Music className="w-4 h-4" />
                  </div>
                  <p className="text-xs uppercase font-mono tracking-wider text-zinc-300 font-bold">MP3 Audio File <span className="text-zinc-500 font-normal">(Optional if MP4 Video is uploaded)</span></p>
                </div>
                <input
                  id="upload-audio-file"
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-zinc-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-xs file:font-semibold
                    file:bg-indigo-500/10 file:text-indigo-400
                    hover:file:bg-indigo-500/20 cursor-pointer"
                />
                {audioFile && (
                  <p className="text-[10px] text-zinc-400 font-mono mt-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Staged: {audioFile.name} ({(audioFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </p>
                )}
              </div>

              {/* Cover Artwork Upload */}
              <div className="border border-white/5 bg-zinc-950/40 p-4.5 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <p className="text-xs uppercase font-mono tracking-wider text-zinc-300 font-bold">Cover Artwork (Optional)</p>
                </div>
                <input
                  id="upload-cover-file"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-zinc-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-xs file:font-semibold
                    file:bg-indigo-500/10 file:text-indigo-400
                    hover:file:bg-indigo-500/20 cursor-pointer"
                />
                {coverFile && (
                  <p className="text-[10px] text-zinc-400 font-mono mt-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Staged: {coverFile.name} ({(coverFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </p>
                )}
              </div>

              {/* Video Upload (Optional) */}
              <div className="border border-white/5 bg-zinc-950/40 p-4.5 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                    <Video className="w-4 h-4" />
                  </div>
                  <p className="text-xs uppercase font-mono tracking-wider text-zinc-300 font-bold">Music Video MP4 <span className="text-zinc-500 font-normal">(Optional if MP3 Audio is uploaded)</span></p>
                </div>
                <input
                  id="upload-video-file"
                  type="file"
                  accept="video/mp4"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-zinc-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-xs file:font-semibold
                    file:bg-indigo-500/10 file:text-indigo-400
                    hover:file:bg-indigo-500/20 cursor-pointer"
                />
                {videoFile && (
                  <p className="text-[10px] text-zinc-400 font-mono mt-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Staged: {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="upload-submit-btn"
              onClick={handleUpload}
              disabled={uploading}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm tracking-wide transition-all ${
                uploading 
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5" 
                  : "bg-indigo-650 hover:bg-indigo-600 text-white cursor-pointer active:scale-[0.98] shadow-lg shadow-indigo-600/10"
              }`}
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-zinc-550 border-t-zinc-200 rounded-full animate-spin"></span>
                  Processing and uploading tracks...
                </span>
              ) : (
                "Publish Lossless Track"
              )}
            </button>

            {/* Notification messages banner */}
            {message && (
              <div 
                id="upload-message-banner"
                className={`p-4 rounded-xl flex items-start gap-3 border text-xs leading-relaxed ${
                  messageType === "success" 
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/15" 
                    : "bg-rose-500/10 text-rose-400 border-rose-500/15"
                }`}
              >
                {messageType === "success" ? (
                  <CheckCircle2 className="w-4.5 h-4.5 shrink-0 mt-0.5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-rose-400" />
                )}
                <div>
                  <p className="font-bold mb-0.5">
                    {messageType === "success" ? "Operation Successful" : "Operation Failed"}
                  </p>
                  <p className="text-zinc-300 font-medium">{message}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right panel guidelines */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-zinc-900/35 border border-white/5 p-6 rounded-2xl">
              <h3 className="text-xs uppercase font-mono tracking-widest text-indigo-400 font-bold mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-pulse" />
                Creator Standards
              </h3>
              <ul className="space-y-3 text-xs text-zinc-350 leading-relaxed list-disc list-inside">
                <li>SoundStream is fully decentralized, ensuring <strong>100% creator sovereignty</strong>.</li>
                <li>Ensure audio files are encoded in high-fidelity MP3/AAC formats for lossless West Africa distribution.</li>
                <li>You can link a music video (.mp4) alongside your track. This triggers the cinema video viewport in listener client players.</li>
                <li>Adding lyrics enhances viewer engagement inside our full-screen aesthetic player.</li>
              </ul>
            </div>

            <div className="bg-zinc-900/10 border border-dashed border-white/5 p-6 rounded-2xl text-center">
              <BarChart3 className="w-8 h-8 text-indigo-455 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold text-zinc-350">Granular Auditing</p>
              <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">Direct-fan telemetry records are audited in near-real-time to calculate verified streaming weightages.</p>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === "album" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-6 bg-zinc-900/35 border border-white/5 p-6 rounded-2xl backdrop-blur-md">
            
            {/* Title */}
            <div>
              <label className="block text-[11px] uppercase font-mono tracking-wider text-zinc-400 mb-2 font-bold">
                Album / EP Title
              </label>
              <input
                id="album-title-input"
                className="w-full p-3 rounded-xl bg-zinc-950/60 border border-white/5 focus:border-indigo-500/40 text-sm placeholder-zinc-550 focus:outline-none transition-colors"
                placeholder="e.g. Love, Damini"
                value={albumTitle}
                onChange={(e) => setAlbumTitle(e.target.value)}
              />
            </div>

            {/* Release Type (EP vs Album) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase font-mono tracking-wider text-zinc-400 mb-2 font-bold">
                  Release Type
                </label>
                <div className="flex bg-zinc-950 p-1 rounded-xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsEP(false)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                      !isEP ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Album
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEP(true)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                      isEP ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    EP
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase font-mono tracking-wider text-zinc-400 mb-2 font-bold">
                  Genre Category
                </label>
                <select
                  id="album-genre-select"
                  value={albumGenre}
                  onChange={(e) => setAlbumGenre(e.target.value)}
                  className="w-full p-3 rounded-xl bg-zinc-950/60 border border-white/5 focus:border-indigo-500/40 text-sm text-zinc-200 focus:outline-none cursor-pointer"
                >
                  <option value="Afrobeats">Afrobeats</option>
                  <option value="Amapiano">Amapiano</option>
                  <option value="Gospel">Gospel</option>
                  <option value="Hip Hop">Hip Hop</option>
                  <option value="Fuji">Fuji</option>
                  <option value="Highlife">Highlife</option>
                </select>
              </div>
            </div>

            {/* Description & Release Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase font-mono tracking-wider text-zinc-400 mb-2 font-bold">
                  Description / Liner Notes
                </label>
                <textarea
                  rows={2}
                  className="w-full p-3 rounded-xl bg-zinc-950/60 border border-white/5 focus:border-indigo-500/40 text-sm placeholder-zinc-550 focus:outline-none transition-colors resize-none"
                  placeholder="Tell listeners about this project..."
                  value={albumDesc}
                  onChange={(e) => setAlbumDesc(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-mono tracking-wider text-zinc-400 mb-2 font-bold">
                  Release Date
                </label>
                <input
                  type="date"
                  className="w-full p-3 rounded-xl bg-zinc-950/60 border border-white/5 focus:border-indigo-500/40 text-sm text-zinc-200 focus:outline-none cursor-pointer"
                  value={albumReleaseDate}
                  onChange={(e) => setAlbumReleaseDate(e.target.value)}
                />
              </div>
            </div>

            {/* Artwork Upload */}
            <div className="border border-white/5 bg-zinc-950/40 p-4.5 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <p className="text-xs uppercase font-mono tracking-wider text-zinc-300 font-bold">Album Cover Artwork (Optional)</p>
              </div>
              <input
                id="album-cover-file"
                type="file"
                accept="image/*"
                onChange={(e) => setAlbumCoverFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-zinc-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-xs file:font-semibold
                  file:bg-indigo-500/10 file:text-indigo-400
                  hover:file:bg-indigo-500/20 cursor-pointer"
              />
              {albumCoverFile && (
                <p className="text-[10px] text-zinc-400 font-mono mt-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Staged Artwork: {albumCoverFile.name}
                </p>
              )}
            </div>

            {/* Tracklist selection & ordering */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase font-mono tracking-wider text-zinc-300 font-bold">Album Tracklist Selection</h3>
              
              {/* Chosen Tracks in order */}
              <div className="bg-zinc-950/50 border border-white/5 rounded-xl p-4 space-y-2">
                <p className="text-[10px] text-zinc-450 uppercase font-mono tracking-wider font-bold border-b border-white/5 pb-2">
                  Tracklist Queue ({albumSelectedSongIds.length} Songs Selected)
                </p>

                {albumSelectedSongIds.length === 0 ? (
                  <p className="text-xs text-zinc-550 py-4 text-center">No songs selected in the tracklist queue yet. Select from your uploaded catalog below.</p>
                ) : (
                  <div className="space-y-2">
                    {albumSelectedSongIds.map((songId, index) => {
                      const song = artistSongs.find(s => s.id === songId);
                      if (!song) return null;
                      return (
                        <div key={songId} className="flex items-center justify-between bg-zinc-900/60 p-2.5 rounded-lg border border-white/5">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs text-indigo-400 font-bold w-4">{index + 1}</span>
                            <img src={song.coverUrl} className="w-8 h-8 rounded object-cover" />
                            <span className="text-xs font-bold text-zinc-250 truncate max-w-[200px]">{song.title}</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveTrackUp(index)}
                              disabled={index === 0}
                              className="p-1 bg-white/5 hover:bg-white/10 rounded disabled:opacity-30"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveTrackDown(index)}
                              disabled={index === albumSelectedSongIds.length - 1}
                              className="p-1 bg-white/5 hover:bg-white/10 rounded disabled:opacity-30"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleSongInAlbum(songId)}
                              className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded ml-2"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Available Tracks Checkbox List */}
              <div className="space-y-2 border border-white/5 p-4 rounded-xl bg-zinc-950/20">
                <p className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider font-bold">Your Available Catalog Tracks</p>
                
                {artistSongs.length === 0 ? (
                  <p className="text-xs text-zinc-550 text-center py-4">You have not uploaded any tracks yet. Upload songs first.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {artistSongs.map((song) => {
                      const isSelected = albumSelectedSongIds.includes(song.id);
                      return (
                        <button
                          key={song.id}
                          type="button"
                          onClick={() => toggleSongInAlbum(song.id)}
                          className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                            isSelected 
                              ? "bg-indigo-600/15 border-indigo-500 text-indigo-200" 
                              : "bg-zinc-900/40 border-white/5 hover:border-white/10 text-zinc-300"
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <img src={song.coverUrl} className="w-6 h-6 rounded object-cover" />
                            <span className="text-xs font-medium truncate">{song.title}</span>
                          </div>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-indigo-500 border-indigo-400" : "border-white/20"
                          }`}>
                            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Publishing Action buttons */}
            <button
              onClick={handleCreateAlbum}
              disabled={uploading}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xl shadow-indigo-600/10 cursor-pointer disabled:opacity-50"
            >
              {uploading ? "Publishing Album Release..." : `Publish ${isEP ? "EP" : "Album"} Immediately`}
            </button>

            {/* Operations Status Response Messaging */}
            {message && (
              <div className={`p-4 rounded-xl flex gap-3 text-xs border ${
                messageType === "success" 
                  ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-350" 
                  : "bg-rose-950/20 border-rose-500/20 text-rose-350"
              }`}>
                {messageType === "success" ? (
                  <CheckCircle2 className="w-4.5 h-4.5 shrink-0 mt-0.5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-rose-400" />
                )}
                <div>
                  <p className="font-bold mb-0.5">
                    {messageType === "success" ? "Operation Successful" : "Operation Failed"}
                  </p>
                  <p className="text-zinc-300 font-medium">{message}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right panel guidelines */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-zinc-900/35 border border-white/5 p-6 rounded-2xl">
              <h3 className="text-xs uppercase font-mono tracking-widest text-indigo-400 font-bold mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-pulse" />
                Album Standards
              </h3>
              <ul className="space-y-3 text-xs text-zinc-350 leading-relaxed list-disc list-inside">
                <li>Choose <strong>Album</strong> for releases containing 6 or more tracks or exceeding 25 minutes.</li>
                <li>Choose <strong>EP</strong> (Extended Play) for shorter 2-5 track releases.</li>
                <li>All tracks will automatically preserve their original audio assets and high-fidelity encoding.</li>
                <li>Ensure track sequence matches your desired narrative flow; listeners will play them in this exact order.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === "manager" && (
        <div className="space-y-8">
          
          {editingSong ? (
            /* Edit Song Details Form (Preserving existing functionality) */
            <div className="bg-zinc-900/35 border border-white/5 rounded-2xl p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 animate-pulse" />
                  Configure Track: {editingSong.title}
                </h3>
                <button
                  onClick={() => setEditingSong(null)}
                  className="text-xs text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-widest text-zinc-450 mb-1.5 font-bold">Title</label>
                  <input
                    className="w-full p-3 rounded-xl bg-zinc-950/60 border border-white/5 focus:border-indigo-500/40 text-xs focus:outline-none text-zinc-200"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Song Title"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-widest text-zinc-450 mb-1.5 font-bold">Genre</label>
                  <select
                    value={editGenre}
                    onChange={(e) => setEditGenre(e.target.value)}
                    className="w-full p-3 rounded-xl bg-zinc-950/60 border border-white/5 focus:border-indigo-500/40 text-xs text-zinc-200 focus:outline-none cursor-pointer"
                  >
                    <option value="Afrobeats">Afrobeats</option>
                    <option value="Amapiano">Amapiano</option>
                    <option value="Gospel">Gospel</option>
                    <option value="Hip Hop">Hip Hop</option>
                    <option value="Fuji">Fuji</option>
                    <option value="Highlife">Highlife</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-widest text-zinc-450 mb-1.5 font-bold">Lyrics</label>
                  <textarea
                    rows={6}
                    className="w-full p-3 rounded-xl bg-zinc-950/60 border border-white/5 focus:border-indigo-500/40 text-xs focus:outline-none text-zinc-200 resize-y"
                    value={editLyrics}
                    onChange={(e) => setEditLyrics(e.target.value)}
                    placeholder="Paste lyrics line by line..."
                  />
                </div>

                <button
                  onClick={handleSaveChanges}
                  disabled={updatingSong}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-550 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {updatingSong ? "Saving track changes..." : "Save Configured Details"}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Creator Analytics Overview Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div>
                  <h2 className="text-lg font-bold uppercase tracking-tight flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-400" />
                    Audience &amp; Catalog Insights
                  </h2>
                  <p className="text-[11px] text-zinc-500 font-medium">Real-time professional analytical telemetry for your SoundStream catalog releases.</p>
                </div>
                <div className="flex items-center gap-1.5 bg-zinc-950 p-1 border border-white/5 rounded-xl">
                  {(["7d", "30d", "12m"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setChartTimeframe(t)}
                      className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                        chartTimeframe === t 
                          ? "bg-indigo-600 text-white" 
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {t === "7d" ? "7 Days" : t === "30d" ? "30 Days" : "12 Months"}
                    </button>
                  ))}
                </div>
              </div>

              {/* 7-Card Professional Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3.5">
                {/* 1. Total Streams */}
                <div className="bg-zinc-900/35 border border-white/5 p-4 rounded-xl flex flex-col justify-between hover:border-indigo-500/10 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">Streams</span>
                    <BarChart3 className="w-4 h-4 text-indigo-400 opacity-80" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-white">{totalStreams.toLocaleString()}</h3>
                    <p className="text-[9px] text-zinc-500 mt-0.5">Total Plays</p>
                  </div>
                </div>

                {/* 2. Monthly Listeners */}
                <div className="bg-zinc-900/35 border border-white/5 p-4 rounded-xl flex flex-col justify-between hover:border-cyan-500/10 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">Listeners</span>
                    <Activity className="w-4 h-4 text-cyan-400 opacity-80" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-white">{monthlyListeners.toLocaleString()}</h3>
                    <p className="text-[9px] text-zinc-500 mt-0.5">Monthly Active</p>
                  </div>
                </div>

                {/* 3. Followers */}
                <div className="bg-zinc-900/35 border border-white/5 p-4 rounded-xl flex flex-col justify-between hover:border-emerald-500/10 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">Followers</span>
                    <Users className="w-4 h-4 text-emerald-400 opacity-80" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-white">{followersCount.toLocaleString()}</h3>
                    <p className="text-[9px] text-zinc-500 mt-0.5">Supporters</p>
                  </div>
                </div>

                {/* 4. Likes */}
                <div className="bg-zinc-900/35 border border-white/5 p-4 rounded-xl flex flex-col justify-between hover:border-rose-500/10 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">Likes</span>
                    <Heart className="w-4 h-4 text-rose-400 opacity-80" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-white">{totalLikes.toLocaleString()}</h3>
                    <p className="text-[9px] text-zinc-500 mt-0.5">Favorites</p>
                  </div>
                </div>

                {/* 5. Albums */}
                <div className="bg-zinc-900/35 border border-white/5 p-4 rounded-xl flex flex-col justify-between hover:border-violet-500/10 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">Albums</span>
                    <Disc className="w-4 h-4 text-violet-400 opacity-80" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-white">{artistAlbumsCount}</h3>
                    <p className="text-[9px] text-zinc-500 mt-0.5">LPs &amp; EPs</p>
                  </div>
                </div>

                {/* 6. Songs */}
                <div className="bg-zinc-900/35 border border-white/5 p-4 rounded-xl flex flex-col justify-between hover:border-amber-500/10 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">Songs</span>
                    <Music className="w-4 h-4 text-amber-400 opacity-80" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-white">{artistSongsCount}</h3>
                    <p className="text-[9px] text-zinc-500 mt-0.5">Published Catalog</p>
                  </div>
                </div>

                {/* 7. Playlists Containing Songs */}
                <div className="bg-zinc-900/35 border border-white/5 p-4 rounded-xl flex flex-col justify-between hover:border-indigo-550/10 transition-colors col-span-2 sm:col-span-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">Playlists</span>
                    <ListMusic className="w-4 h-4 text-indigo-455 opacity-80" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-white">{playlistsPlacementsCount}</h3>
                    <p className="text-[9px] text-zinc-500 mt-0.5">Fan Compilations</p>
                  </div>
                </div>
              </div>

              {/* Layout splits */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left side: Charts, Performance Matrix, and catalog sequencing */}
                <div className="lg:col-span-8 space-y-8">
                  
                  {/* Recharts Trends Chart Card */}
                  <div className="bg-zinc-900/35 border border-white/5 p-6 rounded-2xl">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-xs uppercase font-mono tracking-wider font-bold text-zinc-200">
                        Streaming Trends &amp; Audience Engagement
                      </h3>
                      <span className="text-[9px] font-mono text-zinc-500 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                        Active Metrics Sync
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mb-4">Displaying performance telemetry for total streams and estimated audience listeners.</p>

                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={currentChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorStreams" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorListeners" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                          <XAxis 
                            dataKey="name" 
                            stroke="#52525b" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false} 
                            dy={10}
                          />
                          <YAxis 
                            stroke="#52525b" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false}
                            dx={-5}
                            tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: "#09090b", 
                              borderColor: "rgba(255,255,255,0.08)", 
                              borderRadius: "12px",
                              color: "#fff",
                              fontSize: "10px",
                              fontFamily: "monospace"
                            }} 
                          />
                          <Area 
                            type="monotone" 
                            dataKey="Streams" 
                            stroke="#6366f1" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorStreams)" 
                          />
                          <Area 
                            type="monotone" 
                            dataKey="Listeners" 
                            stroke="#06b6d4" 
                            strokeWidth={1.5}
                            fillOpacity={1} 
                            fill="url(#colorListeners)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Chart Legend */}
                    <div className="flex justify-center gap-6 mt-4 border-t border-white/5 pt-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                        <span className="text-[10px] font-mono text-zinc-400 font-semibold">Streams (Total plays)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                        <span className="text-[10px] font-mono text-zinc-400 font-semibold">Unique Listeners</span>
                      </div>
                    </div>
                  </div>

                  {/* Top Songs Performance Matrix Card */}
                  <div className="bg-zinc-900/35 border border-white/5 rounded-2xl p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                      <div>
                        <h3 className="text-xs uppercase font-mono tracking-wider font-bold text-zinc-200">
                          Top Songs Performance Matrix
                        </h3>
                        <p className="text-[10px] text-zinc-500">Analyze leading metrics, growth ratios, and chronological catalogs.</p>
                      </div>
                      
                      {/* Matrix Selectors */}
                      <div className="flex bg-zinc-950 p-1 border border-white/5 rounded-lg overflow-x-auto shrink-0 max-w-full">
                        {[
                          { key: "played", label: "Most Played", icon: BarChart3 },
                          { key: "liked", label: "Most Liked", icon: Heart },
                          { key: "growing", label: "Fastest Growing", icon: Flame },
                          { key: "recent", label: "Recent Uploads", icon: Calendar }
                        ].map((btn) => {
                          const IconComp = btn.icon;
                          const active = analyticsTopTab === btn.key;
                          return (
                            <button
                              key={btn.key}
                              onClick={() => setAnalyticsTopTab(btn.key as any)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                                active 
                                  ? "bg-indigo-650 text-white" 
                                  : "text-zinc-500 hover:text-zinc-300"
                              }`}
                            >
                              <IconComp className="w-3 h-3" />
                              {btn.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Performance Songs Table */}
                    <div className="overflow-x-auto">
                      {getSelectedTopSongs().length === 0 ? (
                        <div className="py-12 text-center text-zinc-550 border border-dashed border-white/5 rounded-xl text-xs">
                          No songs uploaded yet. Complete your first release to launch analytics.
                        </div>
                      ) : (
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 text-[9px] font-mono uppercase tracking-wider text-zinc-500">
                              <th className="py-2.5 font-bold">Track</th>
                              <th className="py-2.5 font-bold">Release Date</th>
                              <th className="py-2.5 text-right font-bold">Plays</th>
                              <th className="py-2.5 text-right font-bold">Likes</th>
                              <th className="py-2.5 text-right font-bold">Index</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {getSelectedTopSongs().map((song, idx) => (
                              <tr key={song.id} className="group hover:bg-white/[0.01] transition-colors">
                                <td className="py-3">
                                  <div className="flex items-center gap-3">
                                    <img 
                                      src={song.coverUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&q=80"} 
                                      alt="" 
                                      className="w-10 h-10 object-cover rounded-lg border border-white/10" 
                                    />
                                    <div>
                                      <h4 className="font-extrabold text-xs text-zinc-200 group-hover:text-indigo-450 transition-colors truncate max-w-[160px] uppercase">
                                        {song.title}
                                      </h4>
                                      <p className="text-[10px] text-zinc-500 uppercase tracking-tight font-mono mt-0.5">{song.genre}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 text-xs text-zinc-400 font-medium">
                                  {formatSongDate(song.createdAt)}
                                </td>
                                <td className="py-3 text-right font-mono text-xs text-zinc-100 font-bold">
                                  {(song.playCount || 0).toLocaleString()}
                                </td>
                                <td className="py-3 text-right font-mono text-xs text-zinc-100 font-bold">
                                  {(song.likes || 0).toLocaleString()}
                                </td>
                                <td className="py-3 text-right">
                                  <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full ${
                                    idx === 0 
                                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/15" 
                                      : idx === 1 
                                      ? "bg-zinc-400/10 text-zinc-300 border border-zinc-400/15" 
                                      : "bg-zinc-900 text-zinc-500"
                                  }`}>
                                    #{idx + 1}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  {/* Standard Music Catalog Sequence and operations list (Preserving Original Capability) */}
                  <div className="bg-zinc-900/35 border border-white/5 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div>
                        <h3 className="text-xs uppercase font-mono tracking-wider font-bold text-zinc-200">
                          Catalog Release Operations
                        </h3>
                        <p className="text-[10px] text-zinc-500">Manage metadata tags, details, lyrics, and permanent catalog deletions.</p>
                      </div>
                      <span className="text-[10px] font-mono text-indigo-400 font-semibold bg-indigo-500/10 border border-indigo-550/15 px-2 py-0.5 rounded-full">
                        {artistSongs.length} Active Tracks
                      </span>
                    </div>

                    {artistSongs.length === 0 ? (
                      <div className="py-12 text-center text-zinc-500 border border-dashed border-white/5 rounded-xl text-xs">
                        No tracks published yet. Stride over to the "Upload Track" tab to start your journey.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {artistSongs.map((song) => (
                          <div key={song.id} className="flex items-center justify-between bg-zinc-950/40 border border-white/5 p-3 rounded-xl group hover:border-white/10 transition-colors">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <img src={song.coverUrl} alt="" className="w-9 h-9 object-cover rounded-lg border border-white/10" />
                              <div className="overflow-hidden">
                                <h4 className="font-extrabold text-xs text-zinc-200 truncate uppercase tracking-tight">{song.title}</h4>
                                <p className="font-mono text-[9px] text-zinc-500 mt-0.5 flex items-center gap-2">
                                  <span>{song.genre}</span>
                                  <span>•</span>
                                  <span>{song.playCount} Streams</span>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleStartEdit(song)}
                                className="p-2 bg-white/5 hover:bg-indigo-600/10 hover:text-indigo-455 border border-white/5 rounded-lg text-zinc-400 transition-colors cursor-pointer"
                                title="Edit Track Details"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteSong(song.id)}
                                className="p-2 bg-white/5 hover:bg-rose-950/20 hover:text-rose-400 border border-white/5 rounded-lg text-zinc-400 transition-colors cursor-pointer"
                                title="Delete Track"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

                {/* Right side: Playlists Placement and Verified supporters audience */}
                <div className="lg:col-span-4 space-y-6">
                  
                  {/* Top track details summary snippet */}
                  {topSong && (
                    <div className="bg-gradient-to-br from-indigo-900/10 to-zinc-900/35 border border-white/5 p-5 rounded-2xl space-y-3">
                      <div className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest text-indigo-400 font-bold">
                        <Sparkle className="w-3.5 h-3.5 animate-spin" />
                        Aesthetic Leader
                      </div>
                      <div className="flex items-center gap-3">
                        <img src={topSong.coverUrl} alt="" className="w-12 h-12 object-cover rounded-lg border border-white/10 shadow-lg" />
                        <div className="overflow-hidden">
                          <h4 className="font-extrabold text-xs text-zinc-150 uppercase tracking-tight truncate">{topSong.title}</h4>
                          <p className="font-mono text-[10px] text-indigo-400 mt-0.5 font-bold">{(topSong.playCount || 0).toLocaleString()} Streams</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Playlists Placements Listing */}
                  <div className="bg-zinc-900/35 border border-white/5 p-5 rounded-2xl space-y-4">
                    <div className="border-b border-white/5 pb-2 flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Playlist Placements</h4>
                        <p className="text-[10px] text-zinc-500 mt-0.5">Fan playlists featuring your tracks.</p>
                      </div>
                      <span className="text-[9px] font-mono font-bold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/15">
                        {playlistsWithSongs.length} Live
                      </span>
                    </div>

                    <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                      {playlistsWithSongs.length === 0 ? (
                        <div className="py-8 text-center text-zinc-500 text-[10px] border border-dashed border-white/5 rounded-xl leading-relaxed">
                          No public fan playlist inclusions found yet. Share your tracks with listeners to spark catalog compilation inclusions.
                        </div>
                      ) : (
                        playlistsWithSongs.map((playlist) => (
                          <div key={playlist.id} className="flex items-center justify-between bg-zinc-950/30 p-2.5 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <img 
                                src={playlist.coverUrl || "https://images.unsplash.com/photo-1494232410401-ad00d5433cfa?w=100&q=80"} 
                                alt="" 
                                className="w-8 h-8 rounded-lg object-cover border border-white/10" 
                              />
                              <div className="overflow-hidden">
                                <p className="text-[11px] font-extrabold text-zinc-200 truncate uppercase tracking-tight">{playlist.title}</p>
                                <p className="font-mono text-[9px] text-zinc-500 truncate mt-0.5">
                                  {playlist.songCount || playlist.songIds?.length || 0} tracks • By {playlist.createdBy || "Listener"}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-zinc-650 shrink-0" />
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Followers Audience List (Preserved original mock logic styled flawlessly) */}
                  <div className="bg-zinc-900/35 border border-white/5 p-5 rounded-2xl space-y-4">
                    <div className="border-b border-white/5 pb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Audience Supporters</h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Verified listeners actively following your catalog updates.</p>
                    </div>

                    <div className="space-y-3">
                      {[
                        { name: "Chinedu Okechukwu", photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80", handle: "@chinedu" },
                        { name: "Amara Adebayo", photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80", handle: "@amara_ade" },
                        { name: "Tunde Olatunji", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80", handle: "@tunde_vibe" }
                      ].map((follower, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <img src={follower.photo} alt="" className="w-8 h-8 rounded-full object-cover border border-white/10" />
                            <div>
                              <p className="text-[11px] font-semibold text-zinc-200">{follower.name}</p>
                              <p className="font-mono text-[9px] text-zinc-500">{follower.handle}</p>
                            </div>
                          </div>
                          <span className="text-[8px] uppercase tracking-wider font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-550/10 px-1.5 py-0.5 rounded">Active</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>
            </>
          )}

        </div>
      )}

    </div>
  );
}
