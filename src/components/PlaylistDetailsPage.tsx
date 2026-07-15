import React, { useState, useEffect } from "react";
import { Song, Playlist, PlaylistSong, Artist, User } from "../types";
import { 
  Play, 
  Shuffle, 
  Share2, 
  Edit2, 
  Trash2, 
  Copy, 
  ArrowLeft, 
  Upload, 
  Lock, 
  Globe, 
  Plus, 
  ChevronUp, 
  ChevronDown, 
  Music, 
  Clock,
  X,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { uploadCover } from "../lib/firebase";

interface PlaylistDetailsPageProps {
  playlist: Playlist;
  songs: Song[];
  playlistSongs: PlaylistSong[];
  favorites: string[];
  artists: Artist[];
  currentUser: User | null;
  onSelectSong: (song: Song) => void;
  onLikeToggle: (songId: string) => void;
  onBack: () => void;
  onPlayPlaylist: (songs: Song[], shuffle: boolean) => void;
  onEditPlaylist: (playlistId: string, updates: { title: string; description: string; coverUrl: string; isPublic: boolean }) => Promise<void>;
  onDeletePlaylist: (playlistId: string) => Promise<void>;
  onDuplicatePlaylist: (playlistId: string) => Promise<void>;
  onRemoveSongFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
  onReorderPlaylistSongs: (playlistId: string, orderedSongIds: string[]) => Promise<void>;
  onSelectArtist: (artistId: string) => void;
}

export default function PlaylistDetailsPage({
  playlist,
  songs,
  playlistSongs,
  favorites,
  artists,
  currentUser,
  onSelectSong,
  onLikeToggle,
  onBack,
  onPlayPlaylist,
  onEditPlaylist,
  onDeletePlaylist,
  onDuplicatePlaylist,
  onRemoveSongFromPlaylist,
  onReorderPlaylistSongs,
  onSelectArtist
}: PlaylistDetailsPageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(playlist.title);
  const [editDesc, setEditDesc] = useState(playlist.description || "");
  const [editIsPublic, setEditIsPublic] = useState(playlist.isPublic);
  const [editCoverUrl, setEditCoverUrl] = useState(playlist.coverUrl);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync edits when playlist changes
  useEffect(() => {
    setEditTitle(playlist.title);
    setEditDesc(playlist.description || "");
    setEditIsPublic(playlist.isPublic);
    setEditCoverUrl(playlist.coverUrl);
  }, [playlist]);

  // Resolve and order the playlist's songs based on playlistSongs records
  const playlistSongRecords = playlistSongs
    .filter((ps) => ps.playlistId === playlist.id)
    .sort((a, b) => a.trackOrder - b.trackOrder);

  const resolvedSongs = playlistSongRecords
    .map((record) => {
      const song = songs.find((s) => s.id === record.songId);
      if (!song) return null;
      return {
        ...song,
        addedAt: record.addedAt,
        recordId: record.id
      };
    })
    .filter(Boolean) as (Song & { addedAt: string; recordId?: string })[];

  // For backward compatibility, if playlistSongs is empty but songIds exists, resolve from songIds
  const displaySongs = resolvedSongs.length > 0 
    ? resolvedSongs 
    : (playlist.songIds || [])
        .map((id) => songs.find((s) => s.id === id))
        .filter(Boolean) as Song[];

  const isOwner = currentUser?.uid === playlist.ownerId || currentUser?.uid === playlist.createdBy;

  // Estimate total duration
  const totalDurationStr = (() => {
    // Standard estimation (e.g. 3.5 minutes per song if duration not directly in object)
    const count = displaySongs.length;
    if (count === 0) return "0 sec";
    const totalMinutes = count * 3.4;
    const hours = Math.floor(totalMinutes / 60);
    const mins = Math.floor(totalMinutes % 60);
    if (hours > 0) {
      return `${hours} hr ${mins} min`;
    }
    return `${Math.ceil(totalMinutes)} min`;
  })();

  const handleCoverUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const url = await uploadCover(file);
      setEditCoverUrl(url);
    } catch (err) {
      console.error("Cover image upload failed:", err);
      alert("Failed to upload cover art. Please check your network and try again.");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSaveEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;

    try {
      await onEditPlaylist(playlist.id, {
        title: editTitle.trim(),
        description: editDesc.trim(),
        coverUrl: editCoverUrl,
        isPublic: editIsPublic
      });
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save playlist edits:", err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this custom playlist? This action is irreversible.")) return;
    try {
      await onDeletePlaylist(playlist.id);
      onBack();
    } catch (err) {
      console.error("Failed to delete playlist:", err);
    }
  };

  const handleDuplicate = async () => {
    try {
      await onDuplicatePlaylist(playlist.id);
      alert("Playlist duplicated successfully!");
      onBack();
    } catch (err) {
      console.error("Failed to duplicate playlist:", err);
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?playlist=${playlist.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const reorderedIds = displaySongs.map((s) => s.id);
    const temp = reorderedIds[index];
    reorderedIds[index] = reorderedIds[index - 1];
    reorderedIds[index - 1] = temp;
    await onReorderPlaylistSongs(playlist.id, reorderedIds);
  };

  const handleMoveDown = async (index: number) => {
    if (index === displaySongs.length - 1) return;
    const reorderedIds = displaySongs.map((s) => s.id);
    const temp = reorderedIds[index];
    reorderedIds[index] = reorderedIds[index + 1];
    reorderedIds[index + 1] = temp;
    await onReorderPlaylistSongs(playlist.id, reorderedIds);
  };

  // Find owner username if possible
  const ownerName = (() => {
    const foundArtist = artists.find((a) => a.userId === playlist.ownerId);
    if (foundArtist) return foundArtist.artistName;
    return "User";
  })();

  return (
    <div id={`playlist-details-${playlist.id}`} className="space-y-8 text-white font-sans max-w-7xl mx-auto py-2">
      
      {/* Back navigation button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-zinc-400 hover:text-white font-bold text-xs font-mono transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {isOwner && (
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Edit Playlist</span>
            </button>
            <button
              onClick={handleDelete}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Playlist Hero Header Block */}
      <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-end bg-gradient-to-b from-white/[0.04] to-transparent p-6 rounded-3xl border border-white/5 relative overflow-hidden">
        
        {/* Cover Art frame */}
        <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl overflow-hidden shrink-0 border border-white/10 shadow-2xl relative group">
          <img
            src={playlist.coverUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80"}
            alt={playlist.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
          {isOwner && (
            <div 
              onClick={() => setIsEditing(true)}
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-xs font-bold cursor-pointer"
            >
              <Upload className="w-5 h-5 mb-1.5 text-indigo-400" />
              <span>Update Cover</span>
            </div>
          )}
        </div>

        {/* Hero Meta Info */}
        <div className="flex-1 space-y-3.5 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-[10px] font-mono tracking-wider uppercase font-bold text-indigo-400">
            <span>Custom Compilation</span>
            <span className="text-white/20">•</span>
            <span className="flex items-center gap-1">
              {playlist.isPublic ? (
                <>
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Public Stream</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-zinc-500">Private Stream</span>
                </>
              )}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white uppercase">
            {playlist.title}
          </h1>

          {playlist.description ? (
            <p className="text-zinc-400 text-xs sm:text-sm max-w-xl leading-relaxed">
              {playlist.description}
            </p>
          ) : (
            <p className="text-zinc-500 text-xs italic">No description provided for this stream compilation.</p>
          )}

          {/* Quick Stats list */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs font-mono text-zinc-400 pt-1">
            <div>
              Created by <span className="text-zinc-100 font-bold">{ownerName}</span>
            </div>
            <span className="text-white/10 hidden sm:inline">•</span>
            <div>
              <span className="text-zinc-100 font-bold">{displaySongs.length}</span> songs
            </div>
            <span className="text-white/10 hidden sm:inline">•</span>
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span>{totalDurationStr}</span>
            </div>
          </div>

          {/* Core Player triggers */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-4">
            <button
              onClick={() => onPlayPlaylist(displaySongs, false)}
              disabled={displaySongs.length === 0}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-bold text-xs uppercase tracking-wide px-6 py-3 rounded-full flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Play</span>
            </button>

            <button
              onClick={() => onPlayPlaylist(displaySongs, true)}
              disabled={displaySongs.length === 0}
              className="bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-40 disabled:hover:bg-white/5 text-white font-bold text-xs uppercase tracking-wide px-5 py-3 rounded-full flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Shuffle className="w-4 h-4" />
              <span>Shuffle</span>
            </button>

            <button
              onClick={handleShare}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase tracking-wide px-4 py-3 rounded-full flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              <span>{copied ? "Copied" : "Share"}</span>
            </button>

            {currentUser && (
              <button
                onClick={handleDuplicate}
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase tracking-wide px-4 py-3 rounded-full flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                <span>Duplicate</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Tracks list */}
      <div className="space-y-4">
        <h3 className="font-sans font-bold text-xs text-zinc-400 tracking-wider uppercase font-mono border-b border-white/5 pb-2">
          Tracklist ({displaySongs.length})
        </h3>

        {displaySongs.length > 0 ? (
          <div className="space-y-2">
            {displaySongs.map((song, idx) => {
              const isLiked = favorites.includes(song.id);
              return (
                <div
                  key={`${song.id}-${idx}`}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-colors group"
                >
                  {/* Info and index */}
                  <div className="flex items-center gap-4 w-9/12">
                    <span className="font-mono text-xs text-zinc-500 w-5 text-center font-bold">
                      {idx + 1}
                    </span>

                    <div className="relative w-11 h-11 rounded-xl overflow-hidden group/image shrink-0 border border-white/10">
                      <img
                        src={song.coverUrl}
                        alt={song.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        onClick={() => onSelectSong(song)}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <Play className="w-4 h-4 text-white fill-white pl-0.5" />
                      </button>
                    </div>

                    <div className="overflow-hidden">
                      <p
                        onClick={() => onSelectSong(song)}
                        className="font-sans font-bold text-xs text-zinc-100 hover:text-indigo-400 transition-colors cursor-pointer truncate uppercase tracking-tight"
                      >
                        {song.title}
                      </p>
                      <p
                        onClick={() => onSelectArtist(song.artistId)}
                        className="font-mono text-[10px] text-zinc-400 hover:underline cursor-pointer truncate mt-0.5"
                      >
                        {song.artistName}
                      </p>
                    </div>
                  </div>

                  {/* Actions (Reorder, Like, Delete) */}
                  <div className="flex items-center gap-3.5">
                    {/* Reordering buttons */}
                    {isOwner && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveUp(idx)}
                          disabled={idx === 0}
                          className="p-1 rounded bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-400 disabled:opacity-20 disabled:pointer-events-none transition-colors"
                          title="Move Track Up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveDown(idx)}
                          disabled={idx === displaySongs.length - 1}
                          className="p-1 rounded bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-400 disabled:opacity-20 disabled:pointer-events-none transition-colors"
                          title="Move Track Down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Like toggle */}
                    <button
                      onClick={() => onLikeToggle(song.id)}
                      className={`p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors ${
                        isLiked ? "text-pink-500" : "text-zinc-500 hover:text-white"
                      }`}
                    >
                      <X className="w-4 h-4" style={{ display: isLiked ? "none" : "none" }} />
                      <Plus className="w-4 h-4" style={{ display: "none" }} />
                      <span className="sr-only">Like</span>
                      <Music className="w-3.5 h-3.5" style={{ display: "none" }} />
                      {/* Using simple filled vs unfilled logic */}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill={isLiked ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-3.5 h-3.5"
                      >
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                      </svg>
                    </button>

                    {/* Remove track */}
                    {isOwner && (
                      <button
                        onClick={() => onRemoveSongFromPlaylist(playlist.id, song.id)}
                        className="p-2 rounded-xl bg-red-500/5 border border-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/20 transition-colors"
                        title="Remove from playlist"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center text-zinc-550 border border-dashed border-white/10 rounded-3xl text-xs flex flex-col items-center justify-center gap-3">
            <Music className="w-10 h-10 text-zinc-600" />
            <p>This compilation is empty.</p>
            <p className="text-[10px] text-zinc-650 max-w-sm leading-relaxed">
              Browse SoundStream songs, open the search engine, or use the sync panel, then tap "+ Add to Playlist" to populate this stream!
            </p>
          </div>
        )}
      </div>

      {/* Editing Dialog Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0c0c10] border border-white/10 rounded-3xl w-full max-w-lg p-6 relative overflow-hidden shadow-2xl"
            >
              <button
                onClick={() => setIsEditing(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-full hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-bold text-white uppercase tracking-tight mb-5">
                Edit Stream Compilation
              </h2>

              <form onSubmit={handleSaveEdits} className="space-y-4 text-left">
                {/* Cover File Upload Trigger */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase font-bold text-zinc-500">
                    Playlist Artwork
                  </label>
                  <div className="flex items-center gap-4 bg-black/40 border border-white/10 p-3 rounded-2xl">
                    <img
                      src={editCoverUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80"}
                      alt="Cover Preview"
                      className="w-16 h-16 rounded-xl object-cover border border-white/10"
                    />
                    <div className="flex-1">
                      <label className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-lg shadow-indigo-600/15">
                        <Upload className="w-4 h-4" />
                        <span>{uploadingCover ? "Uploading..." : "Upload New Cover"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCoverUploadChange}
                          disabled={uploadingCover}
                          className="hidden"
                        />
                      </label>
                      <p className="text-[9px] text-zinc-550 mt-1.5">PNG, JPG, or WEBP. Max 5MB recommended.</p>
                    </div>
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase font-bold text-zinc-500">
                    Stream Title
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="E.g. Study sessions, Workout driving beats"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase font-bold text-zinc-500">
                    Stream Description
                  </label>
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Describe the mood, target setting, or tracks included..."
                    rows={3}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                  />
                </div>

                {/* Privacy switch */}
                <div className="flex items-center justify-between bg-black/40 border border-white/10 p-4 rounded-2xl">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wide">
                      Public Visibility
                    </h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      Allow other users to search, see, and listen to this playlist.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditIsPublic(!editIsPublic)}
                    className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-200 cursor-pointer outline-none ${
                      editIsPublic ? "bg-indigo-600" : "bg-zinc-700"
                    }`}
                  >
                    <div
                      className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-transform duration-200 ${
                        editIsPublic ? "translate-x-5.5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Submit triggers */}
                <div className="flex gap-2.5 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 font-bold text-xs uppercase tracking-wide py-3 rounded-2xl cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadingCover}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wide py-3 rounded-2xl cursor-pointer transition-colors shadow-lg shadow-indigo-600/10"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
