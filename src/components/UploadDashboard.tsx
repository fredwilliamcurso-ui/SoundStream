import React, { useState, useEffect } from "react";
import { doc, collection, setDoc, updateDoc, deleteDoc, query, where, onSnapshot, getDoc } from "firebase/firestore";
import { db, uploadSong, uploadCover, uploadVideo, auth } from "../lib/firebase";
import { analytics } from "../lib/analytics";
import { Song, Artist, Album, Playlist, PlaylistSong, ShortVideo } from "../types";
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
  Sparkle,
  DollarSign,
  Wallet,
  Landmark,
  Award,
  Shield,
  ShieldCheck,
  Search,
  Eye,
  HelpCircle,
  Send,
  Bell,
  Percent,
  Share2,
  Download,
  UserPlus,
  X
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

const getAudioDurationAndWaveform = (file: File): Promise<{ duration: number; waveform: number[] }> => {
  return new Promise((resolve) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("AudioContext not supported");
      }
      const audioContext = new AudioContextClass();
      const reader = new FileReader();

      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (!arrayBuffer) {
          resolve({ duration: 0, waveform: [] });
          return;
        }

        try {
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          const duration = Math.round(audioBuffer.duration);

          // Generate waveform from channel data
          const channelData = audioBuffer.getChannelData(0);
          const step = Math.ceil(channelData.length / 40); // Generate 40 points
          const waveform: number[] = [];

          for (let i = 0; i < 40; i++) {
            let sum = 0;
            const start = i * step;
            const end = Math.min(start + step, channelData.length);
            for (let j = start; j < end; j++) {
              sum += Math.abs(channelData[j]);
            }
            const avg = sum / (end - start || 1);
            // Scale average and round to 2 decimal places
            waveform.push(parseFloat((Math.min(0.95, Math.max(0.1, avg * 8)) + Math.random() * 0.05).toFixed(2)));
          }

          resolve({ duration, waveform });
        } catch (err) {
          console.error("Error decoding audio data for waveform", err);
          // Fallback synthetic waveform if decode fails
          const mockWaveform: number[] = [];
          for (let i = 0; i < 40; i++) {
            const factor = Math.sin((i / 40) * Math.PI);
            mockWaveform.push(parseFloat((0.2 + factor * 0.6 + Math.random() * 0.1).toFixed(2)));
          }
          resolve({ duration: 180, waveform: mockWaveform });
        }
      };

      reader.onerror = () => {
        const mockWaveform: number[] = [];
        for (let i = 0; i < 40; i++) {
          const factor = Math.sin((i / 40) * Math.PI);
          mockWaveform.push(parseFloat((0.2 + factor * 0.6 + Math.random() * 0.1).toFixed(2)));
        }
        resolve({ duration: 180, waveform: mockWaveform });
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error("Web Audio API not supported or error in context instantiation", err);
      const mockWaveform: number[] = [];
      for (let i = 0; i < 40; i++) {
        const factor = Math.sin((i / 40) * Math.PI);
        mockWaveform.push(parseFloat((0.2 + factor * 0.6 + Math.random() * 0.1).toFixed(2)));
      }
      resolve({ duration: 180, waveform: mockWaveform });
    }
  });
};

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
  const [activeSubTab, setActiveSubTab] = useState<"upload" | "manager" | "album" | "revenue" | "verification">("upload");
  const [chartTimeframe, setChartTimeframe] = useState<"7d" | "30d" | "12m">("7d");
  const [analyticsTopTab, setAnalyticsTopTab] = useState<"played" | "liked" | "growing" | "recent">("played");
  
  // Custom Analytics sub-chart tab
  const [activeAnalyticsChartTab, setActiveAnalyticsChartTab] = useState<"listeners" | "streams_views" | "growth" | "locations" | "watch_time">("listeners");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Scheduled Releases states
  const [scheduledReleaseDate, setScheduledReleaseDate] = useState("");
  const [scheduledShortReleaseDate, setScheduledShortReleaseDate] = useState("");

  // Verification Form states
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [verifyRealName, setVerifyRealName] = useState("");
  const [verifyStageName, setVerifyStageName] = useState(currentUserArtist?.artistName || "");
  const [verifyIdType, setVerifyIdType] = useState("National ID");
  const [verifyIdNumber, setVerifyIdNumber] = useState("");
  const [verifySocialLink, setVerifySocialLink] = useState("");

  // Album Edit / Create Publish Status
  const [albumIsPublic, setAlbumIsPublic] = useState(true);

  useEffect(() => {
    const handleSubTabChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (["upload", "manager", "album", "revenue", "verification"].includes(customEvent.detail)) {
        setActiveSubTab(customEvent.detail as any);
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
        isEP,
        isPublic: albumIsPublic
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
  const [editDescription, setEditDescription] = useState("");
  const [editLyrics, setEditLyrics] = useState("");
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [updatingSong, setUpdatingSong] = useState(false);

  // Shorts Upload States
  const [shortVideoFile, setShortVideoFile] = useState<File | null>(null);
  const [shortTitle, setShortTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [shortHashtags, setShortHashtags] = useState("");
  const [shortVisibility, setShortVisibility] = useState<"public" | "private">("public");
  const [shortMusicId, setShortMusicId] = useState("");

  const handleShortsUpload = async () => {
    if (!shortVideoFile) {
      setMessageType("error");
      setMessage("Please select a vertical short video file first.");
      return;
    }

    // Support MP4, MOV, and WebM formats
    const allowedTypes = ["video/mp4", "video/quicktime", "video/webm", "video/x-matroska"];
    const fileExt = shortVideoFile.name.split('.').pop()?.toLowerCase();
    const isSupportedExt = ["mp4", "mov", "webm"].includes(fileExt || "");
    if (!allowedTypes.includes(shortVideoFile.type) && !isSupportedExt) {
      setMessageType("error");
      setMessage("Invalid video format. Supported formats are MP4, MOV, and WebM.");
      return;
    }

    setUploading(true);
    setMessageType("");
    setMessage("Analyzing short video duration and extracting thumbnail...");

    try {
      const info = await generateVideoThumbnailAndDuration(shortVideoFile);
      
      // Maximum duration: 3 minutes (180 seconds)
      if (info.duration > 180) {
        throw new Error("Maximum duration allowed for SoundStream Shorts is 3 minutes (180 seconds).");
      }

      setMessage("Uploading vertical short video stream to storage...");
      const videoUrl = await uploadVideo(shortVideoFile);

      let coverUrl = "";
      if (info.dataUrl) {
        setMessage("Uploading automatic vertical video thumbnail...");
        const thumbFile = dataURLtoFile(info.dataUrl, `${Date.now()}-shorts-thumbnail.jpg`);
        coverUrl = await uploadCover(thumbFile);
      } else {
        coverUrl = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80";
      }

      setMessage("Publishing short video metadata...");
      const authUser = auth.currentUser;
      const creatorId = authUser?.uid || "anonymous";
      const creatorName = currentUserArtist?.artistName || authUser?.displayName || "Independent Artist";
      const creatorPhoto = currentUserArtist?.profilePhoto || authUser?.photoURL || "";

      const shortRef = doc(collection(db, "shorts"));
      const videoId = shortRef.id;

      // Extract hashtags from title/description or space-separated input
      const hashtagsList = shortHashtags
        .split(/[ ,#]+/)
        .map((tag) => tag.trim().replace(/^#/, "").toLowerCase())
        .filter((tag) => tag.length > 0 && tag !== "short" && tag !== "shorts");

      const releaseTimeShort = scheduledShortReleaseDate ? new Date(scheduledShortReleaseDate).getTime() : Date.now();
      const isScheduledShort = !!scheduledShortReleaseDate && releaseTimeShort > Date.now();

      const newShort = {
        id: videoId,
        videoId: videoId,
        creatorId,
        creatorName,
        creatorPhoto,
        title: shortTitle || "Untitled Short",
        description: shortDescription,
        hashtags: hashtagsList,
        videoUrl,
        thumbnailUrl: coverUrl,
        duration: Math.round(info.duration) || 15,
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        bookmarks: 0,
        musicId: shortMusicId || null,
        visibility: isScheduledShort ? "private" : shortVisibility,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        likedBy: [],
        bookmarkedBy: [],
        scheduledReleaseDate: scheduledShortReleaseDate || null,
        status: isScheduledShort ? "scheduled" : "published"
      };

      await setDoc(shortRef, newShort);

      setMessageType("success");
      setMessage("Your SoundStream Short has been published successfully!");
      
      // Reset form fields
      setShortVideoFile(null);
      setShortTitle("");
      setShortDescription("");
      setShortHashtags("");
      setShortMusicId("");
      
      // Redirect to catalog & stats tab
      setActiveSubTab("manager");
    } catch (err: any) {
      console.error("Shorts upload process failed:", err);
      setMessageType("error");
      setMessage(err.message || "An error occurred during Shorts publishing.");
    } finally {
      setUploading(false);
    }
  };


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

const generateVideoThumbnailAndDuration = (file: File): Promise<{ duration: number; dataUrl: string }> => {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    
    video.onloadedmetadata = () => {
      // loaded
    };

    video.onloadeddata = () => {
      video.currentTime = Math.min(1, video.duration / 2);
    };
    
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 360;
        canvas.height = 640;
        const ctx = canvas.getContext("2d");
        const duration = video.duration || 0;
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          resolve({ duration, dataUrl });
        } else {
          resolve({ duration, dataUrl: "" });
        }
      } catch (err) {
        console.error("Failed to draw video frame for shorts", err);
        resolve({ duration: video.duration || 0, dataUrl: "" });
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    video.onerror = () => {
      resolve({ duration: 0, dataUrl: "" });
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

      // Format & size validation
      if (audioFile) {
        const ext = audioFile.name.split('.').pop()?.toLowerCase();
        const allowedAudioExts = ["mp3", "aac", "wav", "flac", "m4a"];
        if (!ext || !allowedAudioExts.includes(ext)) {
          throw new Error("Unsupported audio format. SoundStream supports: MP3, AAC, WAV, FLAC, M4A.");
        }
        const maxAudioSize = 50 * 1024 * 1024; // 50MB
        if (audioFile.size > maxAudioSize) {
          throw new Error("Audio file size is too large. Maximum size allowed is 50MB.");
        }
      }

      if (videoFile) {
        const ext = videoFile.name.split('.').pop()?.toLowerCase();
        if (ext !== "mp4") {
          throw new Error("Unsupported video format. Only MP4 format is supported for music videos.");
        }
        const maxVideoSize = 150 * 1024 * 1024; // 150MB
        if (videoFile.size > maxVideoSize) {
          throw new Error("Video file size is too large. Maximum size allowed is 150MB.");
        }
      }

      // Duplicate check within artist's existing catalog
      const lowercaseTitle = title.trim().toLowerCase();
      const isDuplicate = artistSongs.some(s => s.title.toLowerCase().trim() === lowercaseTitle);
      if (isDuplicate) {
        throw new Error(`A song with the title "${title.trim()}" already exists in your catalog.`);
      }

      let audioUrl = "";
      let coverUrl = "";
      let videoUrl = "";
      let calculatedDuration = 0;
      let calculatedWaveform: number[] = [];

      // Determine mediaType
      const mediaType: "audio" | "video" | "both" = 
        audioFile && videoFile ? "both" : videoFile ? "video" : "audio";

      if (audioFile) {
        setMessage("Analyzing audio format, calculating duration and extracting waveform...");
        try {
          const result = await getAudioDurationAndWaveform(audioFile);
          calculatedDuration = result.duration;
          calculatedWaveform = result.waveform;
          console.log(`UPLOAD TRACE: Audio analysis successful. Duration: ${calculatedDuration}s, Waveform items: ${calculatedWaveform.length}`);
        } catch (analysisErr) {
          console.warn("UPLOAD TRACE: Web Audio API decoding failed, using fallback estimation.", analysisErr);
          calculatedDuration = 180; // default to 3 minutes fallback
          calculatedWaveform = Array.from({ length: 40 }, () => parseFloat((0.15 + Math.random() * 0.75).toFixed(2)));
        }

        setMessage("Uploading lossless audio file to secure storage...");
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
          if (!audioFile) {
            calculatedDuration = 180; // default for video-only track
            calculatedWaveform = Array.from({ length: 40 }, () => parseFloat((0.2 + Math.random() * 0.6).toFixed(2)));
          }
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

      const releaseTime = scheduledReleaseDate ? new Date(scheduledReleaseDate).getTime() : Date.now();
      const isScheduled = !!scheduledReleaseDate && releaseTime > Date.now();

      const newSong: Song & {
        songId: string;
        album: string;
        description: string;
        coverArt: string;
        duration: number;
        plays: number;
        likes: number;
        shares: number;
        downloads: number;
        isPublic: boolean;
        updatedAt: string;
        waveform: number[];
        mediaType?: "audio" | "video" | "both";
        scheduledReleaseDate?: string | null;
        status?: "published" | "scheduled";
      } = {
        id: songRef.id,
        songId: songRef.id,
        title: (title || "").trim(),
        artistId: targetArtistId,
        artistName: (artistName || "").trim(),
        album: "Single",
        genre: genre || "",
        description: "",
        coverArt: coverUrl,
        coverUrl: coverUrl,
        audioUrl: audioUrl || "",
        videoUrl: videoUrl || "",
        duration: calculatedDuration,
        lyrics: (lyricsText || "").trim() || "",
        playCount: 0,
        plays: 0,
        likes: 0,
        shares: 0,
        downloads: 0,
        isPublic: !isScheduled,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        type: "song",
        waveform: calculatedWaveform,
        mediaType: mediaType,
        scheduledReleaseDate: scheduledReleaseDate || null,
        status: isScheduled ? "scheduled" : "published"
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
        onPublishSong(newSong as any as Song);
      }

      setMessageType("success");
      setMessage(
        videoFile && !audioFile 
          ? "Music Video published successfully with automated waveform and high-res thumbnail!" 
          : "Lossless audio track published successfully with real-time waveform!"
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
    setEditDescription((song as any).description || "");
    setEditLyrics(song.lyrics || "");
    setEditIsPublic((song as any).isPublic !== false);
    setEditCoverFile(null);
  };

  const handleSaveChanges = async () => {
    if (!editingSong) return;
    try {
      setUpdatingSong(true);
      setMessage("Updating song configurations...");
      
      let finalCoverUrl = editingSong.coverUrl;
      if (editCoverFile) {
        setMessage("Uploading replacement cover art artwork...");
        finalCoverUrl = await uploadCover(editCoverFile);
      }

      const songDocRef = doc(db, "songs", editingSong.id);
      await updateDoc(songDocRef, {
        title: (editTitle || "").trim(),
        genre: editGenre || "",
        description: (editDescription || "").trim(),
        lyrics: (editLyrics || "").trim() || "",
        coverUrl: finalCoverUrl,
        coverArt: finalCoverUrl,
        isPublic: editIsPublic,
        updatedAt: new Date().toISOString()
      });

      setEditingSong(null);
      setMessageType("success");
      setMessage("Song metadata and configurations updated successfully!");
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

  // Real-time listener for creator's shorts
  const [myShorts, setMyShorts] = useState<ShortVideo[]>([]);
  useEffect(() => {
    const authUser = auth.currentUser;
    if (!authUser) return;

    const shortsQuery = query(
      collection(db, "shorts"),
      where("creatorId", "==", authUser.uid)
    );

    const unsubscribe = onSnapshot(shortsQuery, (snapshot) => {
      const docsList: ShortVideo[] = [];
      snapshot.forEach((doc) => {
        docsList.push({ id: doc.id, ...doc.data() } as ShortVideo);
      });
      docsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMyShorts(docsList);
    }, (error) => {
      console.error("Error listening to creator shorts:", error);
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  const handleDeleteShort = async (videoId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this Short video?")) return;
    try {
      await deleteDoc(doc(db, "shorts", videoId));
      setMessageType("success");
      setMessage("Short video deleted successfully.");
    } catch (error: any) {
      console.error("Error deleting short video:", error);
      setMessageType("error");
      setMessage("Could not delete short video.");
    }
  };

  // Real-time listener for creator stats, revenue, verification, notifications, and follower statistics
  const [artistStats, setArtistStats] = useState<any | null>(null);

  // New monetization state additions
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<"bank_transfer" | "paypal" | "stripe_connect">("bank_transfer");
  const [customPayoutAmount, setCustomPayoutAmount] = useState("");
  const [payoutAccountDetails, setPayoutAccountDetails] = useState("");

  const [simulatedRevenueType, setSimulatedRevenueType] = useState<string>("royalty");
  const [simulatedRevenueAmount, setSimulatedRevenueAmount] = useState("15.00");
  const [simulatedRevenueSource, setSimulatedRevenueSource] = useState("Spotify Premium Fan");

  useEffect(() => {
    const authUser = auth.currentUser;
    if (!authUser) return;

    const statsRef = doc(db, "artistStats", authUser.uid);

    const unsubscribe = onSnapshot(statsRef, async (docSnap) => {
      if (!docSnap.exists()) {
        const initialStats = {
          uid: authUser.uid,
          followingCount: 48,
          profileVisits: 1240,
          downloadsCount: 382,
          sharesCount: 195,
          commentsCount: 84,
          livestreamHours: 12.5,
          livestreamCount: 4,
          livestreamViewers: 320,
          playlistSaves: 18,
          revenue: {
            adRevenue: 452.10,
            premiumRevenue: 620.40,
            creatorTips: 180.00,
            livestreamGifts: 112.00,
            merchSales: 60.00,
            monthlyEarnings: 310.50,
            totalEarnings: 1424.50,
            pendingPayouts: 224.50,
            completedPayouts: 1200.00,
            estimatedEarnings: 1424.50,
            transactionHistory: [
              { id: "tx_001", date: "2026-06-28", type: "Creator Tip", amount: 50.00, status: "Completed" },
              { id: "tx_002", date: "2026-06-25", type: "Livestream Gift", amount: 25.00, status: "Completed" },
              { id: "tx_003", date: "2026-06-20", type: "Merchandise Sale", amount: 60.00, status: "Completed" },
              { id: "tx_004", date: "2026-06-15", type: "Payout", amount: -1200.00, status: "Completed" },
              { id: "tx_005", date: "2026-07-01", type: "Ad Revenue Share", amount: 152.10, status: "Completed" },
              { id: "tx_006", date: "2026-07-02", type: "Premium Streaming Royalty", amount: 224.50, status: "Pending" }
            ]
          },
          followersStats: {
            newFollowers: 142,
            lostFollowers: 12,
            mostEngaged: [
              { name: "Chinedu Okechukwu", handle: "@chinedu", photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80", score: 98 },
              { name: "Amara Adebayo", handle: "@amara_ade", photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80", score: 92 },
              { name: "Tunde Olatunji", handle: "@tunde_vibe", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80", score: 85 },
              { name: "Fatima Yusuf", handle: "@fatima_y", photo: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&q=80", score: 79 }
            ],
            topSupporters: [
              { name: "Amara Adebayo", handle: "@amara_ade", photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80", contribution: 150.00 },
              { name: "Chinedu Okechukwu", handle: "@chinedu", photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80", contribution: 110.00 },
              { name: "Tunde Olatunji", handle: "@tunde_vibe", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80", contribution: 80.00 }
            ]
          },
          notifications: [
            { id: "notif_1", title: "Milestone Reached! 🎉", body: "Your artist profile passed 1,000 monthly active listeners! Keep rising!", type: "milestone", read: false, timestamp: new Date().toISOString() },
            { id: "notif_2", title: "Lossless Track Trending 🚀", body: "Your latest single is trending in top Fuji releases! Playback velocity is up 140%.", type: "trend", read: false, timestamp: new Date(Date.now() - 86400000).toISOString() },
            { id: "notif_3", title: "Creator Tip Received 💰", body: "A fan tipped you ₦15,000 for your latest upload! Funds added to wallet.", type: "revenue", read: false, timestamp: new Date(Date.now() - 172800000).toISOString() }
          ],
          verification: {
            status: "none",
            idReviewStatus: "",
            submittedAt: ""
          }
        };
        await setDoc(statsRef, initialStats);
        setArtistStats(initialStats);
      } else {
        setArtistStats(docSnap.data());
      }
    }, (error) => {
      console.error("Error listening to artistStats:", error);
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  // Real-time listener for creator's livestreams
  const [myLiveStreams, setMyLiveStreams] = useState<any[]>([]);
  useEffect(() => {
    const authUser = auth.currentUser;
    if (!authUser) return;

    const streamsQuery = query(
      collection(db, "liveStreams"),
      where("creatorId", "==", authUser.uid)
    );

    const unsubscribe = onSnapshot(streamsQuery, (snapshot) => {
      const docsList: any[] = [];
      snapshot.forEach((doc) => {
        docsList.push({ id: doc.id, ...doc.data() });
      });
      docsList.sort((a, b) => new Date(b.createdAt || b.scheduledTime).getTime() - new Date(a.createdAt || a.scheduledTime).getTime());
      setMyLiveStreams(docsList);
    }, (error) => {
      console.error("Error listening to creator livestreams:", error);
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  // Mark single notification as read in real-time Firestore
  const handleMarkNotificationRead = async (id: string) => {
    if (!artistStats || !auth.currentUser) return;
    try {
      const statsRef = doc(db, "artistStats", auth.currentUser.uid);
      const updatedNotifs = artistStats.notifications.map((n: any) => 
        n.id === id ? { ...n, read: true } : n
      );
      await updateDoc(statsRef, { notifications: updatedNotifs });
    } catch (err) {
      console.error("Error marking notification read:", err);
    }
  };

  // Clear all notifications in real-time Firestore
  const handleClearAllNotifications = async () => {
    if (!artistStats || !auth.currentUser) return;
    try {
      const statsRef = doc(db, "artistStats", auth.currentUser.uid);
      await updateDoc(statsRef, { notifications: [] });
    } catch (err) {
      console.error("Error clearing notifications:", err);
    }
  };

  // Submit creator verification request
  const handleRequestVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    if (!verifyRealName.trim() || !verifyStageName.trim() || !verifyIdNumber.trim()) {
      setMessageType("error");
      setMessage("Please complete all required fields for identity verification.");
      return;
    }

    setSubmittingVerification(true);
    try {
      const statsRef = doc(db, "artistStats", auth.currentUser.uid);
      await updateDoc(statsRef, {
        verification: {
          status: "pending",
          idReviewStatus: "Government-issued credentials under active administrative review.",
          submittedAt: new Date().toISOString(),
          realName: verifyRealName.trim(),
          stageName: verifyStageName.trim(),
          idType: verifyIdType,
          idNumber: verifyIdNumber.trim(),
          socialLink: verifySocialLink.trim()
        }
      });
      setMessageType("success");
      setMessage("Verification request submitted successfully! Your credentials are now under review.");
    } catch (err: any) {
      setMessageType("error");
      setMessage(err.message || "Failed to submit verification request.");
    } finally {
      setSubmittingVerification(false);
    }
  };

  // Simulates administrative review approval
  const handleSimulateAdminApproval = async () => {
    if (!auth.currentUser) return;
    try {
      const statsRef = doc(db, "artistStats", auth.currentUser.uid);
      await updateDoc(statsRef, {
        "verification.status": "approved",
        "verification.idReviewStatus": "Verification approved. Approved Creator badge active."
      });

      const artistRef = doc(db, "artists", auth.currentUser.uid);
      await updateDoc(artistRef, {
        verified: true
      });

      const newNotif = {
        id: `notif_${Date.now()}`,
        title: "Creator Profile Verified! 🌟",
        body: "Congratulations! Your SoundStream Artist Profile has been approved. The blue verification checkmark is now active across all your tracks, profiles and social views!",
        type: "milestone",
        read: false,
        timestamp: new Date().toISOString()
      };
      await updateDoc(statsRef, {
        notifications: [newNotif, ...(artistStats?.notifications || [])]
      });

      setMessageType("success");
      setMessage("Success! Creator verification granted and blue badge unlocked!");
    } catch (err: any) {
      setMessageType("error");
      setMessage(err.message || "Failed to trigger admin simulation.");
    }
  };

  // Request earnings payout
  const handleRequestPayout = async () => {
    if (!artistStats || !auth.currentUser || (artistStats.revenue?.pendingPayouts || 0) <= 0) return;
    setIsPayoutModalOpen(true);
    setCustomPayoutAmount(artistStats.revenue.pendingPayouts.toFixed(2));
    setPayoutAccountDetails("");
  };

  const handleConfirmPayoutRequest = async (amount: number, method: "bank_transfer" | "paypal" | "stripe_connect", account: string) => {
    if (!artistStats || !auth.currentUser || amount <= 0 || amount > artistStats.revenue.pendingPayouts) {
      setMessageType("error");
      setMessage("Invalid withdrawal amount requested.");
      return;
    }

    try {
      const statsRef = doc(db, "artistStats", auth.currentUser.uid);
      const methodLabels = {
        bank_transfer: "Bank Transfer",
        paypal: "PayPal Withdrawal",
        stripe_connect: "Stripe Connect Direct"
      };

      const newTx = {
        id: `tx_${Date.now()}`,
        date: new Date().toISOString().split("T")[0],
        type: `Payout (${methodLabels[method]})`,
        amount: -amount,
        status: "Completed",
        payoutMethod: method,
        payoutAccount: account || "Default Sandbox Account"
      };

      await updateDoc(statsRef, {
        "revenue.completedPayouts": artistStats.revenue.completedPayouts + amount,
        "revenue.pendingPayouts": artistStats.revenue.pendingPayouts - amount,
        "revenue.transactionHistory": [newTx, ...artistStats.revenue.transactionHistory]
      });

      const newNotif = {
        id: `notif_${Date.now()}`,
        title: "Payout Disbursed! 🏦",
        body: `Your payout transfer of $${amount.toFixed(2)} via ${methodLabels[method]} was completed successfully to account ${account || "Default"}.`,
        type: "revenue",
        read: false,
        timestamp: new Date().toISOString()
      };

      await updateDoc(statsRef, {
        notifications: [newNotif, ...artistStats.notifications]
      });

      setMessageType("success");
      setMessage(`Successfully disbursed payout of $${amount.toFixed(2)} via ${methodLabels[method]}!`);
      setIsPayoutModalOpen(false);
    } catch (err: any) {
      setMessageType("error");
      setMessage(err.message || "Could not process payout.");
    }
  };

  // Simulates custom revenue generation channels for creators
  const handleSimulateCustomRevenue = async (type: string, amount: number, source: string) => {
    if (!artistStats || !auth.currentUser || amount <= 0) return;
    try {
      const statsRef = doc(db, "artistStats", auth.currentUser.uid);
      const typeLabels: Record<string, string> = {
        royalty: "Streaming Royalty",
        shorts: "Shorts Monetization",
        livestream_gift: "Livestream Gift",
        fan_tip: "Creator Tip",
        subscription_share: "Premium Subscription Share",
        ads: "Ad Share Revenue",
        merchandise: "Merchandise Sale",
        digital_product: "Digital Product Sale",
        event_ticket: "Event Ticket Sale"
      };

      const label = typeLabels[type] || "General Creator Revenue";
      const newTx = {
        id: `tx_${Date.now()}`,
        date: new Date().toISOString().split("T")[0],
        type: label,
        amount: amount,
        status: "Completed",
        source: source || "Anonymous Listener"
      };

      const newNotif = {
        id: `notif_${Date.now()}`,
        title: `New Earning: ${label}! 💰`,
        body: `You earned $${amount.toFixed(2)} from ${source || "Anonymous"} via ${label}! Keep rising.`,
        type: "revenue",
        read: false,
        timestamp: new Date().toISOString()
      };

      // Map to correct stats counters
      const updateData: Record<string, any> = {
        "revenue.totalEarnings": artistStats.revenue.totalEarnings + amount,
        "revenue.pendingPayouts": artistStats.revenue.pendingPayouts + amount,
        "revenue.monthlyEarnings": artistStats.revenue.monthlyEarnings + amount,
        "revenue.estimatedEarnings": artistStats.revenue.estimatedEarnings + amount,
        "revenue.transactionHistory": [newTx, ...artistStats.revenue.transactionHistory],
        notifications: [newNotif, ...artistStats.notifications]
      };

      if (type === "fan_tip") {
        updateData["revenue.creatorTips"] = artistStats.revenue.creatorTips + amount;
      } else if (type === "livestream_gift") {
        updateData["revenue.livestreamGifts"] = artistStats.revenue.livestreamGifts + amount;
      } else if (type === "ads") {
        updateData["revenue.adRevenue"] = artistStats.revenue.adRevenue + amount;
      } else if (type === "royalty") {
        updateData["revenue.premiumRevenue"] = artistStats.revenue.premiumRevenue + amount;
      } else if (type === "merchandise") {
        updateData["revenue.merchSales"] = (artistStats.revenue.merchSales || 0) + amount;
      }

      await updateDoc(statsRef, updateData);

      setMessageType("success");
      setMessage(`Simulated incoming ${label} of $${amount.toFixed(2)} from ${source || "Anonymous"}!`);
    } catch (err: any) {
      setMessageType("error");
      setMessage(err.message || "Failed to simulate incoming revenue.");
    }
  };

  const handleSimulateTip = async () => {
    const amount = parseFloat((5 + Math.random() * 45).toFixed(2));
    await handleSimulateCustomRevenue("fan_tip", amount, "Support Fan Tip");
  };

  const handleToggleAlbumPublish = async (albumId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "albums", albumId), {
        isPublic: !currentStatus
      });
      setMessageType("success");
      setMessage(`Successfully ${!currentStatus ? "published" : "unpublished"} Album/EP!`);
    } catch (err: any) {
      setMessageType("error");
      setMessage("Could not update album visibility.");
    }
  };

  const handleDeleteAlbum = async (albumId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this Album/EP? This will unlink all songs currently assigned to this album, but will not delete the constituent tracks.")) return;
    try {
      await deleteDoc(doc(db, "albums", albumId));
      setMessageType("success");
      setMessage("Album deleted successfully.");
    } catch (err: any) {
      setMessageType("error");
      setMessage("Could not delete album.");
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-white/5 pb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img 
              src={currentUserArtist?.profilePhoto || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80"} 
              alt="" 
              className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500/30" 
              referrerPolicy="no-referrer"
            />
            {currentUserArtist?.verified && (
              <span className="absolute -bottom-0.5 -right-0.5 bg-indigo-600 text-white p-0.5 rounded-full border border-zinc-950 flex items-center justify-center" title="Approved Creator Badge">
                <Check className="w-2.5 h-2.5 text-white" />
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl font-bold tracking-tight uppercase">{currentUserArtist?.artistName || "Independent Artist"}</h1>
              {currentUserArtist?.verified && (
                <span className="inline-flex items-center bg-indigo-500/10 text-indigo-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-indigo-500/20">
                  VERIFIED CREATOR
                </span>
              )}
            </div>
            <p className="text-[10px] text-zinc-400 mt-0.5">SoundStream Partner • {currentUserArtist?.followersCount || 0} Followers</p>
          </div>
        </div>

        {/* Sub tabs */}
        <div className="flex flex-wrap md:flex-nowrap bg-zinc-950 p-1 rounded-xl border border-white/5 gap-1 w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveSubTab("upload")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
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
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === "album" 
                ? "bg-indigo-600 text-white" 
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Create Album
          </button>
          <button
            onClick={() => setActiveSubTab("shorts" as any)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === ("shorts" as any)
                ? "bg-indigo-600 text-white" 
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            Upload Short
          </button>
          <button
            onClick={() => setActiveSubTab("manager")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === "manager" 
                ? "bg-indigo-600 text-white" 
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Catalog &amp; Stats
          </button>
          <button
            onClick={() => setActiveSubTab("revenue")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === "revenue" 
                ? "bg-indigo-600 text-white" 
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Revenue Hub
          </button>
          <button
            onClick={() => setActiveSubTab("verification")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === "verification" 
                ? "bg-indigo-600 text-white" 
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Verification
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

            {/* Schedule Release */}
            <div className="border border-white/5 bg-zinc-950/40 p-4.5 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                  <Calendar className="w-4 h-4" />
                </div>
                <p className="text-xs uppercase font-mono tracking-wider text-zinc-300 font-bold">Schedule Release Date (Optional)</p>
              </div>
              <p className="text-[10px] text-zinc-500 mb-3">Leave empty for instant public release. If configured, the track will remain private/scheduled until the selected date and time.</p>
              <input
                id="upload-scheduled-date"
                type="datetime-local"
                value={scheduledReleaseDate}
                onChange={(e) => setScheduledReleaseDate(e.target.value)}
                className="w-full p-3 rounded-xl bg-zinc-950/60 border border-white/5 focus:border-indigo-500/40 text-xs text-zinc-300 focus:outline-none transition-colors"
              />
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

      {activeSubTab === ("shorts" as any) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left panel form */}
          <div className="lg:col-span-8 space-y-6 bg-zinc-900/35 border border-white/5 p-6 rounded-2xl backdrop-blur-md">
            
            {/* Short Title */}
            <div>
              <label className="block text-[11px] uppercase font-mono tracking-wider text-zinc-400 mb-2 font-bold">
                Short Video Title
              </label>
              <input
                id="shorts-title-input"
                className="w-full p-3 rounded-xl bg-zinc-950/60 border border-white/5 focus:border-indigo-500/40 text-sm placeholder-zinc-550 focus:outline-none transition-colors text-zinc-250"
                placeholder="e.g. Backstage vibes! 🎤"
                value={shortTitle}
                onChange={(e) => setShortTitle(e.target.value)}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-[11px] uppercase font-mono tracking-wider text-zinc-400 mb-2 font-bold">
                Description
              </label>
              <textarea
                id="shorts-desc-input"
                rows={4}
                className="w-full p-3 rounded-xl bg-zinc-950/60 border border-white/5 focus:border-indigo-500/40 text-sm placeholder-zinc-550 focus:outline-none transition-colors text-zinc-250 resize-none"
                placeholder="Describe your short clip..."
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
              />
            </div>

            {/* Hashtags */}
            <div>
              <label className="block text-[11px] uppercase font-mono tracking-wider text-zinc-400 mb-2 font-bold">
                Hashtags
              </label>
              <input
                id="shorts-hashtags-input"
                className="w-full p-3 rounded-xl bg-zinc-950/60 border border-white/5 focus:border-indigo-500/40 text-sm placeholder-zinc-550 focus:outline-none transition-colors text-zinc-250"
                placeholder="e.g. music, viral, live, amapiano (separated by spaces or commas)"
                value={shortHashtags}
                onChange={(e) => setShortHashtags(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Linked SoundStream Song */}
              <div>
                <label className="block text-[11px] uppercase font-mono tracking-wider text-zinc-400 mb-2 font-bold">
                  Link SoundStream Song <span className="text-zinc-500 font-normal">(Optional)</span>
                </label>
                <select
                  value={shortMusicId}
                  onChange={(e) => setShortMusicId(e.target.value)}
                  className="w-full p-3 rounded-xl bg-zinc-950/60 border border-white/5 focus:border-indigo-500/40 text-sm focus:outline-none text-zinc-250 cursor-pointer"
                >
                  <option value="">No linked song</option>
                  {artistSongs.map((song) => (
                    <option key={song.id} value={song.id}>
                      {song.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Visibility */}
              <div>
                <label className="block text-[11px] uppercase font-mono tracking-wider text-zinc-400 mb-2 font-bold">
                  Publish Privacy Status
                </label>
                <div className="flex bg-zinc-950/60 p-1 rounded-xl border border-white/5 h-[46px] items-center">
                  <button
                    type="button"
                    onClick={() => setShortVisibility("public")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      shortVisibility === "public" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Public
                  </button>
                  <button
                    type="button"
                    onClick={() => setShortVisibility("private")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      shortVisibility === "private" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Private (Draft)
                  </button>
                </div>
              </div>
            </div>

            {/* Video File Upload */}
            <div className="border border-white/5 bg-zinc-950/40 p-5 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                  <Video className="w-4 h-4" />
                </div>
                <p className="text-xs uppercase font-mono tracking-wider text-zinc-300 font-bold">
                  Vertical Short Video File <span className="text-rose-500">*</span>
                </p>
              </div>
              <input
                id="shorts-video-file"
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                onChange={(e) => setShortVideoFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-zinc-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-xs file:font-semibold
                  file:bg-indigo-500/10 file:text-indigo-400
                  hover:file:bg-indigo-500/20 cursor-pointer"
              />
              <p className="text-[10px] text-zinc-500 mt-2 font-mono leading-relaxed">
                Supports vertical aspect ratios (e.g. 9:16). Allowed formats: MP4, MOV, WebM. Max duration: 3 minutes.
              </p>
              {shortVideoFile && (
                <p className="text-[10px] text-zinc-400 font-mono mt-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Selected: {shortVideoFile.name} ({(shortVideoFile.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
              )}
            </div>

            {/* Schedule Short Release */}
            <div className="border border-white/5 bg-zinc-950/40 p-4.5 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                  <Calendar className="w-4 h-4" />
                </div>
                <p className="text-xs uppercase font-mono tracking-wider text-zinc-300 font-bold">Schedule Release Date (Optional)</p>
              </div>
              <p className="text-[10px] text-zinc-500 mb-3">Leave empty for instant public release. If configured, this vertical Short will remain private/scheduled until the selected date and time.</p>
              <input
                id="shorts-scheduled-date"
                type="datetime-local"
                value={scheduledShortReleaseDate}
                onChange={(e) => setScheduledShortReleaseDate(e.target.value)}
                className="w-full p-3 rounded-xl bg-zinc-950/60 border border-white/5 focus:border-indigo-500/40 text-xs text-zinc-300 focus:outline-none transition-colors"
              />
            </div>

            {/* Submit Button */}
            <button
              id="shorts-upload-submit-btn"
              onClick={handleShortsUpload}
              disabled={uploading}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm tracking-wide transition-all ${
                uploading 
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5" 
                  : "bg-indigo-650 hover:bg-indigo-600 text-white cursor-pointer active:scale-[0.98] shadow-lg shadow-indigo-600/10"
              }`}
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span>
                  Publishing Short Video...
                </span>
              ) : (
                "PUBLISH VERTICAL SHORT VIDEO"
              )}
            </button>

            {/* Progress / Response Message */}
            {message && (
              <div className={`p-4.5 rounded-xl border text-xs leading-relaxed ${
                messageType === "success" 
                  ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400" 
                  : messageType === "error"
                  ? "bg-rose-500/5 border-rose-500/10 text-rose-400"
                  : "bg-indigo-500/5 border-indigo-500/10 text-indigo-400"
              }`}>
                <div className="flex items-start gap-2.5">
                  <span className="font-semibold uppercase font-mono tracking-wider">Status:</span>
                  <p>{message}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right panel instructions */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-zinc-900/20 border border-white/5 p-6 rounded-2xl backdrop-blur-md">
              <h3 className="font-sans font-bold text-sm text-zinc-200 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Video className="w-4 h-4 text-indigo-400" />
                Shorts Guidelines
              </h3>
              <ul className="space-y-3 text-xs text-zinc-400 pl-4 list-disc leading-relaxed">
                <li>Upload engaging vertical footage (9:16) capturing backstage moments, snippet drops, live sets, or direct fan messages.</li>
                <li>Ensure the clip does not exceed 3 minutes. Our video stream processing will automatically validate and reject longer uploads.</li>
                <li>Link one of your cataloged SoundStream audio tracks! This allows viewers to directly stream the song or buy tickets right from the Short.</li>
                <li>Our advanced WebRTC/HTML5 audio context will automatically grab a frame at 50% video duration and publish it as your high-res vertical thumbnail.</li>
              </ul>
            </div>

            <div className="bg-zinc-900/10 border border-dashed border-white/5 p-6 rounded-2xl text-center">
              <BarChart3 className="w-8 h-8 text-indigo-455 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold text-zinc-350">Analytics &amp; Engagement</p>
              <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                Gain instant visibility on total views, watch time, comment replies, shares, and followed creations.
              </p>
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

            {/* Visibility Selection */}
            <div className="border border-white/5 bg-zinc-950/40 p-4.5 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                  <Shield className="w-4 h-4" />
                </div>
                <p className="text-xs uppercase font-mono tracking-wider text-zinc-300 font-bold">Album Visibility</p>
              </div>
              <div className="flex bg-zinc-950/60 p-1 rounded-xl border border-white/5 h-[46px] items-center">
                <button
                  type="button"
                  onClick={() => setAlbumIsPublic(true)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    albumIsPublic ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Public (Active Release)
                </button>
                <button
                  type="button"
                  onClick={() => setAlbumIsPublic(false)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    !albumIsPublic ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Private (Draft Stage)
                </button>
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
                  <label className="block text-[10px] uppercase font-mono tracking-widest text-zinc-450 mb-1.5 font-bold">Description</label>
                  <textarea
                    rows={3}
                    className="w-full p-3 rounded-xl bg-zinc-950/60 border border-white/5 focus:border-indigo-500/40 text-xs focus:outline-none text-zinc-200 resize-y"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Provide a description about this song..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-widest text-zinc-450 mb-1.5 font-bold">Publish Status / Privacy</label>
                  <div className="flex bg-zinc-950/60 p-1 rounded-xl border border-white/5 max-w-xs">
                    <button
                      type="button"
                      onClick={() => setEditIsPublic(true)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        editIsPublic ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Public (Published)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditIsPublic(false)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        !editIsPublic ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Private (Draft)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-widest text-zinc-450 mb-1.5 font-bold">Change Cover Artwork</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setEditCoverFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-zinc-400
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-xs file:font-semibold
                      file:bg-indigo-500/10 file:text-indigo-400
                      hover:file:bg-indigo-500/20 cursor-pointer"
                  />
                  {editCoverFile && (
                    <p className="text-[10px] text-zinc-400 font-mono mt-1.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Staged artwork: {editCoverFile.name}
                    </p>
                  )}
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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-3">
                      <div>
                        <h3 className="text-xs uppercase font-mono tracking-wider font-bold text-zinc-200">
                          Catalog Release Operations
                        </h3>
                        <p className="text-[10px] text-zinc-500">Manage metadata tags, details, lyrics, and permanent catalog deletions.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-indigo-400 font-semibold bg-indigo-500/10 border border-indigo-550/15 px-2 py-0.5 rounded-full shrink-0">
                          {artistSongs.length} Active Tracks
                        </span>
                      </div>
                    </div>

                    {/* Search filter input */}
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        id="catalog-search-input"
                        type="text"
                        placeholder="Search songs by title or genre..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950/60 border border-white/5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500/40 transition-colors placeholder-zinc-550"
                      />
                    </div>

                    {artistSongs.length === 0 ? (
                      <div className="py-12 text-center text-zinc-500 border border-dashed border-white/5 rounded-xl text-xs">
                        No tracks published yet. Stride over to the "Upload Track" tab to start your journey.
                      </div>
                    ) : artistSongs.filter(song => 
                        song.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (song.genre || "").toLowerCase().includes(searchQuery.toLowerCase())
                      ).length === 0 ? (
                      <div className="py-12 text-center text-zinc-500 border border-dashed border-white/5 rounded-xl text-xs">
                        No songs match your search query: "{searchQuery}"
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {artistSongs.filter(song => 
                          song.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (song.genre || "").toLowerCase().includes(searchQuery.toLowerCase())
                        ).map((song) => (
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

                  {/* Shorts Video Catalog Operations */}
                  <div className="bg-zinc-900/35 border border-white/5 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div>
                        <h3 className="text-xs uppercase font-mono tracking-wider font-bold text-zinc-200">
                          Short Video Catalog Operations
                        </h3>
                        <p className="text-[10px] text-zinc-500">Manage and delete your vertical short videos.</p>
                      </div>
                      <span className="text-[10px] font-mono text-indigo-400 font-semibold bg-indigo-500/10 border border-indigo-550/15 px-2 py-0.5 rounded-full">
                        {myShorts.length} Active Shorts
                      </span>
                    </div>

                    {myShorts.length === 0 ? (
                      <div className="py-12 text-center text-zinc-500 border border-dashed border-white/5 rounded-xl text-xs">
                        No Shorts published yet. Go to "Upload Short" tab to publish your first short.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {myShorts.map((short) => (
                          <div key={short.id} className="flex items-center justify-between bg-zinc-950/40 border border-white/5 p-3 rounded-xl group hover:border-white/10 transition-colors">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <img src={short.thumbnailUrl} alt="" className="w-9 h-12 object-cover rounded-lg border border-white/10" />
                              <div className="overflow-hidden">
                                <h4 className="font-extrabold text-xs text-zinc-200 truncate uppercase tracking-tight">{short.title}</h4>
                                <p className="font-mono text-[9px] text-zinc-500 mt-0.5 flex items-center gap-2">
                                  <span className={short.visibility === "public" ? "text-emerald-400 font-bold" : "text-yellow-500 font-bold"}>
                                    {short.visibility.toUpperCase()}
                                  </span>
                                  <span>•</span>
                                  <span>{short.views} Views</span>
                                  <span>•</span>
                                  <span>{short.likes} Likes</span>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleDeleteShort(short.id)}
                                className="p-2 bg-white/5 hover:bg-rose-950/20 hover:text-rose-400 border border-white/5 rounded-lg text-zinc-400 transition-colors cursor-pointer"
                                title="Delete Short Video"
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

      {activeSubTab === "revenue" && (
        <div className="space-y-8">
          {/* Revenue header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div>
              <h2 className="text-lg font-bold uppercase tracking-tight flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-indigo-400" />
                Revenue &amp; Fan Support Wallet
              </h2>
              <p className="text-[11px] text-zinc-500 font-medium">Monitor your streaming royalties, ad-shares, creator tips, and request direct bank payouts.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSimulateTip}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600/10 hover:bg-indigo-650/20 text-indigo-400 border border-indigo-500/20 transition-all cursor-pointer flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                Simulate fan tip
              </button>
              <button
                onClick={handleRequestPayout}
                disabled={!artistStats || (artistStats.revenue?.pendingPayouts || 0) <= 0}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 ${
                  !artistStats || (artistStats.revenue?.pendingPayouts || 0) <= 0
                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer active:scale-[0.98] shadow-lg shadow-indigo-600/10"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Request Payout
              </button>
            </div>
          </div>

          {/* Wallet Balance Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-zinc-900/35 border border-white/5 p-4.5 rounded-2xl flex flex-col justify-between hover:border-indigo-500/10 transition-all">
              <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 font-bold block mb-2">Pending Balance</span>
              <div>
                <h3 className="text-2xl font-black text-indigo-400 tracking-tight">
                  ${(artistStats?.revenue?.pendingPayouts ?? 224.50).toFixed(2)}
                </h3>
                <p className="text-[9px] text-zinc-500 mt-1 leading-relaxed">Available for immediate wire transfer</p>
              </div>
            </div>

            <div className="bg-zinc-900/35 border border-white/5 p-4.5 rounded-2xl flex flex-col justify-between hover:border-emerald-500/10 transition-all">
              <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 font-bold block mb-2">Total Earnings</span>
              <div>
                <h3 className="text-2xl font-black text-emerald-400 tracking-tight">
                  ${(artistStats?.revenue?.totalEarnings ?? 1424.50).toFixed(2)}
                </h3>
                <p className="text-[9px] text-zinc-500 mt-1 leading-relaxed">Cumulative sound assets earnings</p>
              </div>
            </div>

            <div className="bg-zinc-900/35 border border-white/5 p-4.5 rounded-2xl flex flex-col justify-between hover:border-violet-500/10 transition-all">
              <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 font-bold block mb-2">Monthly Earnings</span>
              <div>
                <h3 className="text-2xl font-black text-violet-400 tracking-tight">
                  ${(artistStats?.revenue?.monthlyEarnings ?? 310.50).toFixed(2)}
                </h3>
                <p className="text-[9px] text-zinc-500 mt-1 leading-relaxed">Averages active this cycle</p>
              </div>
            </div>

            <div className="bg-zinc-900/35 border border-white/5 p-4.5 rounded-2xl flex flex-col justify-between hover:border-amber-500/10 transition-all">
              <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 font-bold block mb-2">Completed Payouts</span>
              <div>
                <h3 className="text-2xl font-black text-zinc-300 tracking-tight">
                  ${(artistStats?.revenue?.completedPayouts ?? 1200.00).toFixed(2)}
                </h3>
                <p className="text-[9px] text-zinc-500 mt-1 leading-relaxed">Settled bank wired transfers</p>
              </div>
            </div>
          </div>

          {/* Revenue Breakdown & Ledger splits */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Ledger and revenue sources */}
            <div className="lg:col-span-8 space-y-6">
              {/* Detailed Sources */}
              <div className="bg-zinc-900/35 border border-white/5 p-6 rounded-2xl space-y-4">
                <h3 className="text-xs uppercase font-mono tracking-wider font-bold text-zinc-200">Revenue Stream Allocations</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-zinc-950/60 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-mono uppercase text-zinc-500">Premium Royalties</p>
                      <p className="text-xs font-bold text-zinc-300 mt-1">${(artistStats?.revenue?.premiumRevenue ?? 620.40).toFixed(2)}</p>
                    </div>
                    <span className="text-[9px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded font-mono font-bold">43.5%</span>
                  </div>

                  <div className="bg-zinc-950/60 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-mono uppercase text-zinc-500">Ad Revenue Share</p>
                      <p className="text-xs font-bold text-zinc-300 mt-1">${(artistStats?.revenue?.adRevenue ?? 452.10).toFixed(2)}</p>
                    </div>
                    <span className="text-[9px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded font-mono font-bold">31.7%</span>
                  </div>

                  <div className="bg-zinc-950/60 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-mono uppercase text-zinc-500">Creator Fan Tips</p>
                      <p className="text-xs font-bold text-zinc-300 mt-1">${(artistStats?.revenue?.creatorTips ?? 180.00).toFixed(2)}</p>
                    </div>
                    <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-mono font-bold">12.6%</span>
                  </div>

                  <div className="bg-zinc-950/60 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-mono uppercase text-zinc-500">Livestream Giftings</p>
                      <p className="text-xs font-bold text-zinc-300 mt-1">${(artistStats?.revenue?.livestreamGifts ?? 112.00).toFixed(2)}</p>
                    </div>
                    <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono font-bold">7.9%</span>
                  </div>
                </div>
              </div>

              {/* Transaction history Ledger */}
              <div className="bg-zinc-900/35 border border-white/5 p-6 rounded-2xl space-y-4">
                <h3 className="text-xs uppercase font-mono tracking-wider font-bold text-zinc-200">Transaction History Ledger</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-zinc-400">
                    <thead>
                      <tr className="border-b border-white/5 text-zinc-550 font-mono text-[9px] uppercase tracking-wider">
                        <th className="py-2.5">Date</th>
                        <th className="py-2.5">Transaction ID</th>
                        <th className="py-2.5">Type</th>
                        <th className="py-2.5 text-right">Amount</th>
                        <th className="py-2.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(artistStats?.revenue?.transactionHistory ?? [
                        { id: "tx_001", date: "2026-06-28", type: "Creator Tip", amount: 50.00, status: "Completed" },
                        { id: "tx_002", date: "2026-06-25", type: "Livestream Gift", amount: 25.00, status: "Completed" },
                        { id: "tx_003", date: "2026-06-20", type: "Merchandise Sale", amount: 60.00, status: "Completed" },
                        { id: "tx_004", date: "2026-06-15", type: "Payout", amount: -1200.00, status: "Completed" }
                      ]).map((tx: any) => (
                        <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-3 font-mono text-[10px] text-zinc-500">{tx.date}</td>
                          <td className="py-3 font-mono text-[10px] text-zinc-500">{tx.id}</td>
                          <td className="py-3 text-zinc-250 font-semibold">{tx.type}</td>
                          <td className={`py-3 text-right font-bold ${tx.amount < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                            {tx.amount < 0 ? "-" : "+"}${Math.abs(tx.amount).toFixed(2)}
                          </td>
                          <td className="py-3 text-right">
                            <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded font-mono uppercase font-bold ${
                              tx.status === "Completed" ? "bg-emerald-500/10 text-emerald-400" : "bg-yellow-500/10 text-yellow-500"
                            }`}>
                              {tx.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column: Top Supporters */}
            <div className="lg:col-span-4 space-y-6">
              {/* Top Contributors */}
              <div className="bg-zinc-900/35 border border-white/5 p-5 rounded-2xl space-y-4">
                <div className="border-b border-white/5 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Top Supporters Wallet</h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Listeners contributing the highest tips and gifts to your streams.</p>
                </div>

                <div className="space-y-4">
                  {(artistStats?.followersStats?.topSupporters ?? [
                    { name: "Amara Adebayo", handle: "@amara_ade", photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80", contribution: 150.00 },
                    { name: "Chinedu Okechukwu", handle: "@chinedu", photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80", contribution: 110.00 },
                    { name: "Tunde Olatunji", handle: "@tunde_vibe", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80", contribution: 80.00 }
                  ]).map((sup: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <img src={sup.photo} alt="" className="w-8 h-8 rounded-full object-cover border border-white/10" referrerPolicy="no-referrer" />
                        <div className="overflow-hidden">
                          <p className="text-[11px] font-semibold text-zinc-200 truncate">{sup.name}</p>
                          <p className="font-mono text-[9px] text-zinc-500">{sup.handle}</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-extrabold text-indigo-400">${sup.contribution.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sandbox Creator Earnings Simulator */}
              <div className="bg-zinc-900/35 border border-indigo-500/15 p-5 rounded-2xl space-y-4">
                <div className="border-b border-white/5 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    Earnings Channel Simulator
                  </h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Simulate incoming revenue for any of the 9 monetization streams.</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[9px] uppercase font-mono tracking-wider text-zinc-550 mb-1 font-bold">Select Revenue Stream</label>
                    <select
                      value={simulatedRevenueType}
                      onChange={(e) => setSimulatedRevenueType(e.target.value)}
                      className="w-full p-2 rounded-xl bg-zinc-950 border border-white/5 text-[11px] text-zinc-200 focus:outline-none transition-colors cursor-pointer"
                    >
                      <option value="royalty">Music Streaming Royalties</option>
                      <option value="shorts">Short Video Monetization</option>
                      <option value="livestream_gift">Live Stream Gifts</option>
                      <option value="fan_tip">Tips from Fans (Tip Link)</option>
                      <option value="subscription_share">Premium Subscriptions Share</option>
                      <option value="ads">Advertising Revenue Share</option>
                      <option value="merchandise">Merchandise Sales</option>
                      <option value="digital_product">Digital Product Sales</option>
                      <option value="event_ticket">Event Ticket Sales</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] uppercase font-mono tracking-wider text-zinc-550 mb-1 font-bold">Amount (USD)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="15.00"
                        value={simulatedRevenueAmount}
                        onChange={(e) => setSimulatedRevenueAmount(e.target.value)}
                        className="w-full p-2 rounded-xl bg-zinc-950 border border-white/5 text-[11px] focus:outline-none transition-all text-zinc-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase font-mono tracking-wider text-zinc-550 mb-1 font-bold">Source Name</label>
                      <input
                        type="text"
                        placeholder="Spotify Premium Fan"
                        value={simulatedRevenueSource}
                        onChange={(e) => setSimulatedRevenueSource(e.target.value)}
                        className="w-full p-2 rounded-xl bg-zinc-950 border border-white/5 text-[11px] focus:outline-none transition-all text-zinc-200"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => handleSimulateCustomRevenue(simulatedRevenueType, parseFloat(simulatedRevenueAmount) || 10, simulatedRevenueSource)}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-550 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-650/15"
                  >
                    Simulate Earning
                  </button>
                </div>
              </div>

              {/* Engagement analytics details */}
              <div className="bg-zinc-900/10 border border-dashed border-white/5 p-6 rounded-2xl text-center">
                <ShieldCheck className="w-8 h-8 text-indigo-400 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold text-zinc-350">Royalty Decentralization</p>
                <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">West African micro-licensing automatically issues payments on every stream with 0% middleman deduction fees.</p>
              </div>
            </div>
          </div>

          {/* ==========================================
              PAYOUT REQUEST MODAL (Sandbox popup)
             ========================================== */}
          {isPayoutModalOpen && (
            <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-md text-zinc-300">
              <div className="bg-[#121214] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative overflow-hidden text-left">
                
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-white">Request Wallet Payout</h3>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Secure Settlement Portal</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsPayoutModalOpen(false)}
                    className="p-1.5 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-full transition-colors cursor-pointer border-none"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Current Available balance block */}
                  <div className="bg-zinc-950/60 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Maximum Available:</span>
                      <h5 className="text-emerald-400 text-lg font-black mt-0.5">
                        ${(artistStats?.revenue?.pendingPayouts || 0).toFixed(2)} USD
                      </h5>
                    </div>
                    <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">
                      ESCROW BALANCES
                    </span>
                  </div>

                  {/* Amount to withdraw input */}
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5 font-bold">Withdraw Amount (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      max={artistStats?.revenue?.pendingPayouts || 0}
                      value={customPayoutAmount}
                      onChange={(e) => setCustomPayoutAmount(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-zinc-950 border border-white/5 text-xs text-white focus:outline-none focus:border-indigo-500/30 font-bold"
                    />
                  </div>

                  {/* Payout method select */}
                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-bold">Select Payout Provider</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["bank_transfer", "paypal", "stripe_connect"] as const).map((method) => {
                        const labelMap = {
                          bank_transfer: "Bank Wire",
                          paypal: "PayPal",
                          stripe_connect: "Stripe Connect"
                        };
                        return (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setPayoutMethod(method)}
                            className={`py-2 text-[9px] font-bold uppercase rounded-lg border text-center transition-all cursor-pointer ${
                              payoutMethod === method 
                                ? "bg-indigo-950/20 border-indigo-500 text-white shadow" 
                                : "bg-zinc-950/40 border-white/5 text-zinc-500 hover:text-zinc-300"
                            }`}
                          >
                            {labelMap[method]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Account detail input depending on provider */}
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5 font-bold">
                      {payoutMethod === "bank_transfer" && "Bank Routing / Checking Account"}
                      {payoutMethod === "paypal" && "Registered PayPal Email"}
                      {payoutMethod === "stripe_connect" && "Stripe Account ID (acct_*)"}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={
                        payoutMethod === "bank_transfer" ? "e.g. 121000248 - 983100248" :
                        payoutMethod === "paypal" ? "e.g. recipient-wallet@paypal.com" :
                        "e.g. acct_1H1Z9a2e3r4t5y6u"
                      }
                      value={payoutAccountDetails}
                      onChange={(e) => setPayoutAccountDetails(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-zinc-950 border border-white/5 text-xs text-white focus:outline-none placeholder-zinc-750"
                    />
                  </div>

                  <div className="pt-3">
                    <button
                      onClick={() => handleConfirmPayoutRequest(parseFloat(customPayoutAmount) || 0, payoutMethod, payoutAccountDetails)}
                      disabled={!customPayoutAmount || parseFloat(customPayoutAmount) <= 0 || parseFloat(customPayoutAmount) > (artistStats?.revenue?.pendingPayouts || 0)}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-550 disabled:opacity-40 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg cursor-pointer"
                    >
                      Authorize Wallet Withdrawal
                    </button>
                    <p className="text-[9px] text-zinc-650 text-center mt-2 leading-relaxed">
                      Withdrawal settlements are simulated and cleared instantly to your ledger history inside Firestore database. No actual bank transfers or financial transactions are processed.
                    </p>
                  </div>

                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeSubTab === "verification" && (
        <div className="space-y-8">
          {/* Verification header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div>
              <h2 className="text-lg font-bold uppercase tracking-tight flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                Creator Identity &amp; Badging
              </h2>
              <p className="text-[11px] text-zinc-500 font-medium">Register your legal entity details to gain the approved blue check mark on your SoundStream profile.</p>
            </div>
            {artistStats?.verification?.status === "pending" && (
              <button
                onClick={handleSimulateAdminApproval}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/15 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Trigger Admin Approval (Sim)
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left form */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Application Status Banner */}
              <div className={`p-6 rounded-2xl border ${
                artistStats?.verification?.status === "approved"
                  ? "bg-emerald-500/5 border-emerald-500/15 text-emerald-400"
                  : artistStats?.verification?.status === "pending"
                  ? "bg-yellow-500/5 border-yellow-500/15 text-yellow-400"
                  : "bg-zinc-900/40 border-white/5 text-zinc-300"
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl shrink-0 ${
                    artistStats?.verification?.status === "approved"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : artistStats?.verification?.status === "pending"
                      ? "bg-yellow-500/10 text-yellow-400"
                      : "bg-white/5 text-zinc-400"
                  }`}>
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider">
                      Verification Status: {artistStats?.verification?.status?.toUpperCase() || "UNSUBMITTED"}
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {artistStats?.verification?.status === "approved"
                        ? "Congratulations! Your account is verified as an Approved SoundStream Creator. The blue verification check is active."
                        : artistStats?.verification?.status === "pending"
                        ? "Your verification request is currently under active administrative review. This usually takes less than 24 hours."
                        : "Gain a blue checkmark, trust badge, higher search catalog weighting, and unlock monetization streaming royalties."}
                    </p>
                    {artistStats?.verification?.idReviewStatus && (
                      <p className="font-mono text-[10px] text-zinc-500 bg-zinc-950/40 px-2.5 py-1.5 rounded-lg border border-white/5 mt-2">
                        {artistStats.verification.idReviewStatus}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {artistStats?.verification?.status !== "approved" && (
                <form onSubmit={handleRequestVerification} className="bg-zinc-900/35 border border-white/5 p-6 rounded-2xl space-y-6">
                  <h3 className="text-xs uppercase font-mono tracking-wider font-bold text-zinc-200">Legal Entity Identification Form</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] uppercase font-mono tracking-wider text-zinc-500 mb-2 font-bold">Legal Real Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Burna Damini"
                        value={verifyRealName}
                        onChange={(e) => setVerifyRealName(e.target.value)}
                        className="w-full p-3 rounded-xl bg-zinc-950/60 border border-white/5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500/40 transition-colors placeholder-zinc-550"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase font-mono tracking-wider text-zinc-500 mb-2 font-bold">Stage / Artist Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Burna Boy"
                        value={verifyStageName}
                        onChange={(e) => setVerifyStageName(e.target.value)}
                        className="w-full p-3 rounded-xl bg-zinc-950/60 border border-white/5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500/40 transition-colors placeholder-zinc-550"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] uppercase font-mono tracking-wider text-zinc-500 mb-2 font-bold">Government ID Type</label>
                      <select
                        value={verifyIdType}
                        onChange={(e) => setVerifyIdType(e.target.value)}
                        className="w-full p-3 rounded-xl bg-zinc-950/60 border border-white/5 text-xs text-zinc-200 focus:outline-none cursor-pointer"
                      >
                        <option value="National Identity Number (NIN)">National Identity Number (NIN)</option>
                        <option value="Driver's License">Driver's License</option>
                        <option value="International Passport">International Passport</option>
                        <option value="Voters Card">Voters Card</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase font-mono tracking-wider text-zinc-500 mb-2 font-bold">ID Card Number</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 12048591823"
                        value={verifyIdNumber}
                        onChange={(e) => setVerifyIdNumber(e.target.value)}
                        className="w-full p-3 rounded-xl bg-zinc-950/60 border border-white/5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500/40 transition-colors placeholder-zinc-550"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase font-mono tracking-wider text-zinc-500 mb-2 font-bold">Social Media Link / Website (Optional)</label>
                    <input
                      type="url"
                      placeholder="e.g. https://instagram.com/burnaboy"
                      value={verifySocialLink}
                      onChange={(e) => setVerifySocialLink(e.target.value)}
                      className="w-full p-3 rounded-xl bg-zinc-950/60 border border-white/5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500/40 transition-colors placeholder-zinc-550"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingVerification}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-550 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xl shadow-indigo-600/10 cursor-pointer disabled:opacity-50"
                  >
                    {submittingVerification ? "Submitting Registration Details..." : "Submit Verification Documents"}
                  </button>
                </form>
              )}
            </div>

            {/* Right side rules */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-zinc-900/35 border border-white/5 p-6 rounded-2xl">
                <h3 className="text-xs uppercase font-mono tracking-widest text-indigo-400 font-bold mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Identity Integrity
                </h3>
                <ul className="space-y-3 text-xs text-zinc-350 leading-relaxed list-disc list-inside">
                  <li>Your legal name MUST correspond to the details on your government-issued ID card.</li>
                  <li>Stage names cannot contain generic placeholders, impersonate other popular creators, or violate platform standards.</li>
                  <li>Approved creator accounts are audited regularly. Violations can lead to automatic monetization cancellation.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
