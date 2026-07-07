import React, { useState, useEffect } from "react";
import { Song, Artist, Playlist, User } from "../types";
import { 
  Play, 
  Heart, 
  MessageSquare, 
  Share2, 
  Plus, 
  Bookmark, 
  Check, 
  UserPlus, 
  UserMinus, 
  Search, 
  Star, 
  Video, 
  Eye, 
  ThumbsUp, 
  Calendar, 
  Trash2, 
  X,
  PlusCircle,
  FolderPlus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, query, orderBy, onSnapshot, doc, setDoc, addDoc, deleteDoc, updateDoc, increment, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

interface VideoDashboardProps {
  songs: Song[];
  artists: Artist[];
  currentUser: User | null;
  favorites: string[];
  followingArtists?: string[];
  playlists?: Playlist[];
  onSelectSong: (song: Song) => void;
  onLikeToggle: (songId: string) => void;
  onShareSong: (song: Song) => void;
  onFollowToggle?: (artistId: string) => void;
  onAddSongToPlaylist?: (playlistId: string, songId: string) => void;
  onCreatePlaylist?: (title: string, description?: string) => Promise<any>;
}

interface VideoComment {
  id: string;
  userId: string;
  username: string;
  userPhoto?: string;
  text: string;
  likes: number;
  likedBy?: string[];
  createdAt: string;
}

export default function VideoDashboard({
  songs,
  artists,
  currentUser,
  favorites,
  followingArtists = [],
  playlists = [],
  onSelectSong,
  onLikeToggle,
  onShareSong,
  onFollowToggle,
  onAddSongToPlaylist,
  onCreatePlaylist
}: VideoDashboardProps) {
  const [selectedGenre, setSelectedGenre] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("").trim();
  const [activeVideoComments, setActiveVideoComments] = useState<Song | null>(null);
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [showSaveModal, setShowSaveModal] = useState<Song | null>(null);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState("");
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);

  // Filter out songs that are strictly videos based on videoUrl presence
  const isVideo = (song: Song) => {
    if (song.videoUrl && song.videoUrl.trim() !== "") return true;
    if (song.audioUrl) {
      const urlWithoutQuery = song.audioUrl.toLowerCase().split("?")[0];
      return (
        urlWithoutQuery.endsWith(".mp4") ||
        urlWithoutQuery.endsWith(".webm") ||
        urlWithoutQuery.endsWith(".mov") ||
        urlWithoutQuery.endsWith(".m4v") ||
        urlWithoutQuery.includes("video")
      );
    }
    return false;
  };

  const videoSongs = songs.filter(isVideo);

  // Genre filtered videos
  const genreFilteredVideos = selectedGenre === "All"
    ? videoSongs
    : videoSongs.filter(v => v.genre.toLowerCase() === selectedGenre.toLowerCase());

  // Search filtered videos
  const searchFilteredVideos = searchQuery === ""
    ? genreFilteredVideos
    : genreFilteredVideos.filter(v => 
        v.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        v.artistName.toLowerCase().includes(searchQuery.toLowerCase())
      );

  // Trending videos (sorted by plays count)
  const trendingVideos = [...videoSongs]
    .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
    .slice(0, 10);

  // New music videos (sorted by createdAt date)
  const newVideos = [...videoSongs]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  // Recommended videos (random/featured subset)
  const recommendedVideos = [...videoSongs]
    .filter(v => v.isFeatured || (v.playCount || 0) > 5)
    .slice(0, 10);

  // Official Videos (labeled as Single or containing Official/Music Video in title)
  const officialVideos = videoSongs.filter(v => 
    v.title.toLowerCase().includes("official") || 
    v.title.toLowerCase().includes("video") || 
    v.title.toLowerCase().includes("mv")
  ).slice(0, 10);

  const genresList = ["All", "Afrobeats", "Amapiano", "Gospel", "Hip Hop", "Fuji", "Highlife"];

  // Real-time comments loader for active video
  useEffect(() => {
    if (!activeVideoComments) {
      setComments([]);
      return;
    }

    const commentsQuery = query(
      collection(db, "songs", activeVideoComments.id, "comments"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const list: VideoComment[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as VideoComment);
      });
      setComments(list);
    }, (err) => {
      console.warn("Failed to subscribe to video comments:", err);
    });

    return () => unsubscribe();
  }, [activeVideoComments]);

  const handlePostComment = async () => {
    if (!currentUser || !activeVideoComments || !newCommentText.trim()) return;

    try {
      const commentRef = collection(db, "songs", activeVideoComments.id, "comments");
      await addDoc(commentRef, {
        userId: currentUser.uid,
        username: currentUser.username || currentUser.displayName || "Anonymous",
        userPhoto: currentUser.photoURL || "",
        text: newCommentText.trim(),
        likes: 0,
        likedBy: [],
        createdAt: new Date().toISOString()
      });

      // Increment comments count on song document
      const songDocRef = doc(db, "songs", activeVideoComments.id);
      await updateDoc(songDocRef, {
        commentsCount: increment(1)
      }).catch(() => {});

      setNewCommentText("");
    } catch (err) {
      console.error("Error posting video comment:", err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!currentUser || !activeVideoComments) return;

    try {
      const commentDocRef = doc(db, "songs", activeVideoComments.id, "comments", commentId);
      await deleteDoc(commentDocRef);

      // Decrement comments count
      const songDocRef = doc(db, "songs", activeVideoComments.id);
      await updateDoc(songDocRef, {
        commentsCount: increment(-1)
      }).catch(() => {});
    } catch (err) {
      console.error("Error deleting comment:", err);
    }
  };

  const handleLikeComment = async (comment: VideoComment) => {
    if (!currentUser || !activeVideoComments) return;

    const likedBy = comment.likedBy || [];
    const isLiked = likedBy.includes(currentUser.uid);
    const newLikedBy = isLiked
      ? likedBy.filter(uid => uid !== currentUser.uid)
      : [...likedBy, currentUser.uid];

    try {
      const commentDocRef = doc(db, "songs", activeVideoComments.id, "comments", comment.id);
      await updateDoc(commentDocRef, {
        likedBy: newLikedBy,
        likes: newLikedBy.length
      });
    } catch (err) {
      console.error("Error liking comment:", err);
    }
  };

  const handleCreatePlaylistAndAdd = async () => {
    if (!currentUser || !showSaveModal || !newPlaylistTitle.trim() || !onCreatePlaylist || !onAddSongToPlaylist) return;

    setIsCreatingPlaylist(true);
    try {
      const playlistId = await onCreatePlaylist(newPlaylistTitle.trim(), "My saved music videos on SoundStream");
      if (playlistId) {
        onAddSongToPlaylist(playlistId, showSaveModal.id);
        setNewPlaylistTitle("");
        setShowSaveModal(null);
      }
    } catch (err) {
      console.error("Failed to create and add:", err);
    } finally {
      setIsCreatingPlaylist(false);
    }
  };

  const isFollowingCreator = (creatorId: string) => {
    return followingArtists.includes(creatorId);
  };

  return (
    <div id="soundstream-video-dashboard" className="space-y-10 text-white font-sans max-w-7xl mx-auto py-2">
      
      {/* 1. Video Premium Header */}
      <div 
        id="video-hero-banner"
        className="relative rounded-3xl bg-[#09090f] border border-pink-500/10 p-8 md:p-12 overflow-hidden shadow-2xl shadow-pink-550/5 flex flex-col md:flex-row items-center justify-between gap-8 bg-gradient-to-br from-[#050508] to-[#1a111a]"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 via-transparent to-indigo-500/5 pointer-events-none" />
        <div className="absolute top-1/2 left-1/4 w-72 h-72 bg-pink-500/10 rounded-full filter blur-3xl pointer-events-none -translate-y-1/2" />
        
        <div className="relative space-y-5 max-w-xl text-center md:text-left z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-pink-500/15 border border-pink-500/25 rounded-full text-[10px] font-bold tracking-widest text-pink-300 uppercase font-mono">
            <Video className="w-3 h-3 text-pink-400 animate-pulse" />
            SoundStream Independent Cinema
          </span>
          <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white leading-none">
            MUSIC IN MOTION &amp;<br />VISUAL MASTERPIECES.
          </h2>
          <p className="text-white/60 text-sm md:text-base leading-relaxed max-w-md">
            Dive into full HD music videos, raw lyric loops, and official visuals published directly by independent global creators.
          </p>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
            <div className="relative flex items-center bg-white/5 border border-white/10 rounded-full px-4 py-1.5 max-w-xs">
              <Search className="w-4 h-4 text-zinc-500 mr-2" />
              <input
                type="text"
                placeholder="Search music videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-white focus:outline-none placeholder-zinc-550 w-44"
              />
            </div>
            <span className="text-[11px] font-mono text-white/40">
              {videoSongs.length} official independent visuals
            </span>
          </div>
        </div>

        {trendingVideos.length > 0 && (
          <div 
            onClick={() => onSelectSong(trendingVideos[0])}
            className="relative w-full max-w-xs p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl shrink-0 group cursor-pointer"
          >
            <div className="relative overflow-hidden rounded-xl aspect-video mb-3">
              <img 
                src={trendingVideos[0].coverUrl} 
                alt={trendingVideos[0].title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-10 h-10 bg-pink-500 text-white rounded-full flex items-center justify-center shadow-2xl">
                  <Play className="w-4.5 h-4.5 fill-white pl-0.5" />
                </div>
              </div>
              <span className="absolute bottom-2 right-2 bg-pink-650/95 backdrop-blur-md text-[8px] font-mono font-black px-1.5 py-0.5 rounded uppercase">
                TRENDING MVP
              </span>
            </div>
            <div>
              <h4 className="font-bold text-xs truncate text-white uppercase tracking-tight">
                {trendingVideos[0].title}
              </h4>
              <p className="font-mono text-[10px] text-zinc-400 mt-0.5">
                by {trendingVideos[0].artistName}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 2. Style Filter System */}
      <div id="video-categories" className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <h3 className="font-sans font-bold text-lg text-zinc-150 flex items-center gap-2 uppercase tracking-tight">
            <Video className="w-4.5 h-4.5 text-pink-400" />
            Discover by Video Category
          </h3>
          <span className="text-xs text-pink-400 font-mono bg-pink-500/10 px-2.5 py-0.5 rounded-full border border-pink-500/20 uppercase">
            {selectedGenre} Category
          </span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs py-1">
          {genresList.map((g) => (
            <button 
              key={g}
              onClick={() => setSelectedGenre(g)}
              className={`px-4 py-1.5 rounded-full font-semibold transition-all border ${
                selectedGenre === g 
                  ? "bg-pink-600 text-white font-bold border-pink-550 scale-105 shadow-md shadow-pink-500/20" 
                  : "bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* If Search is Active, display simple search results grid */}
      {searchQuery !== "" ? (
        <div id="search-video-results" className="space-y-6">
          <h3 className="font-sans font-bold text-lg text-white uppercase tracking-tight border-b border-white/5 pb-2">
            Search Results for "{searchQuery}" ({searchFilteredVideos.length})
          </h3>
          {searchFilteredVideos.length === 0 ? (
            <div className="py-12 text-center text-zinc-550 border border-dashed border-white/10 rounded-2xl bg-white/2">
              <Video className="w-8 h-8 text-zinc-650 mx-auto mb-2" />
              <p className="text-zinc-400 font-medium text-xs">No videos match your search query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {searchFilteredVideos.map((video) => (
                <VideoCard 
                  key={video.id}
                  video={video}
                  favorites={favorites}
                  currentUser={currentUser}
                  onSelect={onSelectSong}
                  onLikeToggle={onLikeToggle}
                  onShare={onShareSong}
                  onSave={() => setShowSaveModal(video)}
                  onFollow={onFollowToggle}
                  isFollowing={isFollowingCreator(video.artistId)}
                  onOpenComments={() => setActiveVideoComments(video)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Normal Video Page Sections */
        <div className="space-y-12">
          
          {/* A. Trending Videos Carousel/Grid */}
          {trendingVideos.length > 0 && (
            <div id="trending-videos" className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h3 className="font-sans font-bold text-lg text-white flex items-center gap-2 uppercase tracking-tight">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 animate-pulse" />
                  Trending Music Videos
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {trendingVideos.map((video) => (
                  <VideoCard 
                    key={`trending-${video.id}`}
                    video={video}
                    favorites={favorites}
                    currentUser={currentUser}
                    onSelect={onSelectSong}
                    onLikeToggle={onLikeToggle}
                    onShare={onShareSong}
                    onSave={() => setShowSaveModal(video)}
                    onFollow={onFollowToggle}
                    isFollowing={isFollowingCreator(video.artistId)}
                    onOpenComments={() => setActiveVideoComments(video)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* B. New Music Videos */}
          {newVideos.length > 0 && (
            <div id="new-videos" className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h3 className="font-sans font-bold text-lg text-white flex items-center gap-2 uppercase tracking-tight">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  New Music Videos
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {newVideos.map((video) => (
                  <VideoCard 
                    key={`new-${video.id}`}
                    video={video}
                    favorites={favorites}
                    currentUser={currentUser}
                    onSelect={onSelectSong}
                    onLikeToggle={onLikeToggle}
                    onShare={onShareSong}
                    onSave={() => setShowSaveModal(video)}
                    onFollow={onFollowToggle}
                    isFollowing={isFollowingCreator(video.artistId)}
                    onOpenComments={() => setActiveVideoComments(video)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* C. Official Videos */}
          {officialVideos.length > 0 && (
            <div id="official-videos" className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h3 className="font-sans font-bold text-lg text-white flex items-center gap-2 uppercase tracking-tight">
                  <Video className="w-4 h-4 text-pink-400" />
                  Official Videos
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {officialVideos.map((video) => (
                  <VideoCard 
                    key={`official-${video.id}`}
                    video={video}
                    favorites={favorites}
                    currentUser={currentUser}
                    onSelect={onSelectSong}
                    onLikeToggle={onLikeToggle}
                    onShare={onShareSong}
                    onSave={() => setShowSaveModal(video)}
                    onFollow={onFollowToggle}
                    isFollowing={isFollowingCreator(video.artistId)}
                    onOpenComments={() => setActiveVideoComments(video)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* D. Recommended Videos */}
          {recommendedVideos.length > 0 && (
            <div id="recommended-videos" className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h3 className="font-sans font-bold text-lg text-white flex items-center gap-2 uppercase tracking-tight">
                  <Heart className="w-4 h-4 text-pink-400 fill-pink-500/10" />
                  Recommended Videos
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {recommendedVideos.map((video) => (
                  <VideoCard 
                    key={`rec-${video.id}`}
                    video={video}
                    favorites={favorites}
                    currentUser={currentUser}
                    onSelect={onSelectSong}
                    onLikeToggle={onLikeToggle}
                    onShare={onShareSong}
                    onSave={() => setShowSaveModal(video)}
                    onFollow={onFollowToggle}
                    isFollowing={isFollowingCreator(video.artistId)}
                    onOpenComments={() => setActiveVideoComments(video)}
                  />
                ))}
              </div>
            </div>
          )}

          {videoSongs.length === 0 && (
            <div className="py-20 text-center text-zinc-500 border border-dashed border-white/5 rounded-2xl bg-[#0e0c12]/20">
              <Video className="w-12 h-12 text-pink-500/20 mx-auto mb-4 animate-pulse" />
              <p className="text-zinc-400 font-bold uppercase tracking-wider text-sm">No Music Videos uploaded yet</p>
              <p className="text-xs text-zinc-550 max-w-sm mx-auto mt-2 leading-relaxed">
                Independent artists can publish video releases directly to SoundStream through their creator dashboard.
              </p>
            </div>
          )}

        </div>
      )}

      {/* ============================================== */}
      {/* 3. INTERACTIVE COMMENTS DRAWER/MODAL           */}
      {/* ============================================== */}
      <AnimatePresence>
        {activeVideoComments && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveVideoComments(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />
            
            {/* Sliding Drawer (TikTok style) */}
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 h-[80vh] md:h-[70vh] max-w-2xl mx-auto bg-[#0d0914] border-t border-pink-500/20 rounded-t-[2.5rem] z-50 flex flex-col p-6 shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-sans font-black text-sm text-white uppercase tracking-wide">
                      Comments ({comments.length})
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-mono truncate max-w-sm">
                      {activeVideoComments.title} by {activeVideoComments.artistName}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveVideoComments(null)}
                  className="p-1.5 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Comments list */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 scrollbar-thin">
                {comments.length === 0 ? (
                  <div className="py-16 text-center text-zinc-650 flex flex-col items-center">
                    <MessageSquare className="w-8 h-8 text-zinc-700 mb-2" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">No Comments Yet</p>
                    <p className="text-[10px] text-zinc-600 mt-1">Be the first to share your feedback on this release!</p>
                  </div>
                ) : (
                  comments.map((comment) => {
                    const isLiked = currentUser && comment.likedBy?.includes(currentUser.uid);
                    const canDelete = currentUser && (comment.userId === currentUser.uid || currentUser.role === "admin");
                    
                    return (
                      <div key={comment.id} className="flex gap-3 bg-white/[0.01] border border-white/5 p-3 rounded-2xl">
                        <img 
                          src={comment.userPhoto || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80"} 
                          alt={comment.username}
                          className="w-8 h-8 rounded-full object-cover border border-white/10"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-sans font-bold text-xs text-zinc-200 truncate pr-2">
                              @{comment.username}
                            </span>
                            <span className="font-mono text-[8px] text-zinc-550 shrink-0">
                              {new Date(comment.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-350 leading-relaxed mt-1 break-words">
                            {comment.text}
                          </p>
                          
                          <div className="flex items-center gap-4 mt-2.5">
                            <button 
                              onClick={() => handleLikeComment(comment)}
                              className={`flex items-center gap-1 text-[9.5px] font-bold ${isLiked ? "text-pink-500" : "text-zinc-500 hover:text-white"}`}
                            >
                              <ThumbsUp className="w-3 h-3" />
                              <span>{comment.likes || 0}</span>
                            </button>
                            
                            {canDelete && (
                              <button 
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-zinc-550 hover:text-red-400 text-[9px] font-bold flex items-center gap-1 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Text Input Footer */}
              <div className="border-t border-white/5 pt-4 shrink-0">
                {currentUser ? (
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Share your thoughts about this masterpiece..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handlePostComment()}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-pink-500/50 text-white"
                    />
                    <button
                      onClick={handlePostComment}
                      disabled={!newCommentText.trim()}
                      className="bg-pink-650 hover:bg-pink-600 disabled:opacity-50 text-white font-extrabold text-[10px] uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all cursor-pointer border-none"
                    >
                      Post
                    </button>
                  </div>
                ) : (
                  <div className="bg-white/5 border border-white/5 p-3 rounded-xl text-center">
                    <p className="text-[11px] text-zinc-400">Please login to write comments and support this creator.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ============================================== */}
      {/* 4. SAVE TO PLAYLIST / LIBRARY MODAL            */}
      {/* ============================================== */}
      <AnimatePresence>
        {showSaveModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSaveModal(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed inset-0 m-auto w-full max-w-md h-fit bg-[#0d0914] border border-white/5 rounded-3xl p-6 z-50 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                <h4 className="font-bold text-sm uppercase tracking-wider text-zinc-100 flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-pink-400" />
                  Save video to library
                </h4>
                <button onClick={() => setShowSaveModal(null)} className="text-zinc-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {currentUser ? (
                <div className="space-y-4">
                  {/* Playlists List */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-black">Your Playlists</p>
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                      {playlists.length === 0 ? (
                        <p className="text-xs text-zinc-550 italic py-2">No playlists created yet.</p>
                      ) : (
                        playlists.map((playlist) => {
                          const hasVideo = playlist.songIds?.includes(showSaveModal.id);
                          return (
                            <button
                              key={playlist.id}
                              onClick={() => {
                                if (onAddSongToPlaylist) {
                                  onAddSongToPlaylist(playlist.id, showSaveModal.id);
                                  setShowSaveModal(null);
                                }
                              }}
                              disabled={hasVideo}
                              className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/5 text-left border border-white/5 hover:border-pink-500/20 transition-all cursor-pointer disabled:opacity-60"
                            >
                              <div className="flex items-center gap-3">
                                <img src={playlist.coverUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100"} alt="" className="w-8 h-8 rounded-lg object-cover border border-white/10" />
                                <div>
                                  <p className="text-xs font-bold text-zinc-200">{playlist.title}</p>
                                  <p className="text-[9px] text-zinc-500 font-mono">{playlist.songIds?.length || 0} tracks</p>
                                </div>
                              </div>
                              {hasVideo ? (
                                <span className="text-[9px] font-mono text-pink-400 bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded">Added</span>
                              ) : (
                                <Plus className="w-3.5 h-3.5 text-zinc-400" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Create New Playlist Box */}
                  {onCreatePlaylist && onAddSongToPlaylist && (
                    <div className="border-t border-white/5 pt-4 space-y-2.5">
                      <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-black">Create New Playlist</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="My Awesome Playlist..."
                          value={newPlaylistTitle}
                          onChange={(e) => setNewPlaylistTitle(e.target.value)}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-pink-500/50 text-white"
                        />
                        <button
                          onClick={handleCreatePlaylistAndAdd}
                          disabled={isCreatingPlaylist || !newPlaylistTitle.trim()}
                          className="bg-pink-650 hover:bg-pink-600 disabled:opacity-50 text-white font-extrabold text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl transition-all border-none cursor-pointer flex items-center gap-1.5"
                        >
                          <FolderPlus className="w-3.5 h-3.5" />
                          <span>Create &amp; Add</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-xs text-zinc-400">Please login to save independent music videos to your custom library playlists.</p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}

// Sub-component for individual video card to avoid duplication and optimize React virtual renders
interface VideoCardProps {
  key?: string;
  video: Song;
  favorites: string[];
  currentUser: User | null;
  onSelect: (video: Song) => void;
  onLikeToggle: (id: string) => void;
  onShare: (video: Song) => void;
  onSave: () => void;
  onFollow?: (artistId: string) => void;
  isFollowing: boolean;
  onOpenComments: () => void;
}

function VideoCard({
  video,
  favorites,
  currentUser,
  onSelect,
  onLikeToggle,
  onShare,
  onSave,
  onFollow,
  isFollowing,
  onOpenComments
}: VideoCardProps) {
  const isLiked = favorites.includes(video.id);

  return (
    <motion.div
      className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 hover:bg-white/5 hover:border-pink-500/10 transition-all group relative flex flex-col justify-between"
      whileHover={{ y: -3 }}
    >
      <div className="space-y-3">
        {/* Video Thumbnail area */}
        <div className="relative aspect-video overflow-hidden rounded-xl bg-zinc-950 border border-white/5">
          <img
            src={video.coverUrl}
            alt={video.title}
            className="w-full h-full object-cover rounded-xl transition-transform duration-500 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
          
          {/* Main Play overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button 
              onClick={() => onSelect(video)}
              className="w-10 h-10 bg-pink-500 text-white rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-105"
            >
              <Play className="w-4.5 h-4.5 fill-white text-white ml-0.5" />
            </button>
          </div>

          <span className="absolute bottom-2.5 right-2.5 bg-black/75 backdrop-blur-sm text-[8px] font-mono font-bold text-zinc-300 px-2 py-0.5 rounded border border-white/5">
            MP4 VIDEO
          </span>
          <span className="absolute top-2.5 left-2.5 bg-pink-650/95 text-[8px] font-mono font-bold text-white px-2 py-0.5 rounded shadow">
            {video.genre}
          </span>
        </div>

        {/* Video metadata */}
        <div className="space-y-1">
          <h4 className="font-bold text-xs truncate text-zinc-100 group-hover:text-pink-400 transition-colors uppercase tracking-tight">
            {video.title}
          </h4>
          <div className="flex items-center justify-between gap-1">
            <p className="font-mono text-[9.5px] text-zinc-500 truncate max-w-[130px]">
              {video.artistName}
            </p>
            <span className="font-mono text-[8.5px] text-zinc-400">
              {(video.playCount || 0).toLocaleString()} views
            </span>
          </div>
        </div>
      </div>

      {/* Video Interactive toolbar */}
      <div className="flex items-center justify-between border-t border-white/5 mt-3 pt-2.5">
        <div className="flex items-center gap-0.5">
          {/* Like */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onLikeToggle(video.id);
            }}
            className={`p-1.5 rounded-full transition-colors ${isLiked ? "text-pink-500" : "text-zinc-500 hover:text-white"}`}
            title="Like Video"
          >
            <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-pink-500" : ""}`} />
          </button>

          {/* Comment */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onOpenComments();
            }}
            className="p-1.5 rounded-full text-zinc-500 hover:text-pink-400 transition-colors relative"
            title="Video discussion"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {(video as any).commentsCount && (video as any).commentsCount > 0 ? (
              <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-pink-500 rounded-full" />
            ) : null}
          </button>

          {/* Share */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onShare(video);
            }}
            className="p-1.5 rounded-full text-zinc-500 hover:text-indigo-400 transition-colors"
            title="Share Video"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>

          {/* Save to Playlist */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onSave();
            }}
            className="p-1.5 rounded-full text-zinc-500 hover:text-cyan-400 transition-colors"
            title="Save to Playlist"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Follow Creator */}
        {onFollow && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFollow(video.artistId);
            }}
            className={`flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-md transition-all ${
              isFollowing 
                ? "bg-white/5 text-zinc-400 border border-white/5" 
                : "bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20"
            }`}
          >
            {isFollowing ? (
              <>
                <UserMinus className="w-2.5 h-2.5" />
                <span>Unfollow</span>
              </>
            ) : (
              <>
                <UserPlus className="w-2.5 h-2.5" />
                <span>Follow</span>
              </>
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}
