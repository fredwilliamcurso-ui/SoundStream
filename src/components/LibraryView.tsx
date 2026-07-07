import React, { useState, useEffect } from "react";
import { Song, Artist, Playlist, Album } from "../types";
import { 
  Plus, 
  ListMusic, 
  Heart, 
  Users, 
  Play, 
  HeartCrack, 
  Disc, 
  Clock, 
  Download, 
  Search, 
  Sparkles, 
  ChevronRight, 
  Headphones, 
  Calendar, 
  ArrowLeft,
  Music,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface LibraryViewProps {
  playlists: Playlist[];
  songs: Song[];
  artists: Artist[];
  albums?: Album[];
  favorites: string[];
  followingArtists: string[];
  recentlyPlayed?: { songId: string; playedAt: string }[];
  currentPlayingSong: Song | null;
  onSelectSong: (song: Song) => void;
  onSelectArtist: (artistId: string) => void;
  onSelectAlbum?: (albumId: string) => void;
  onSelectPlaylist?: (playlistId: string) => void;
  onLikeToggle: (songId: string) => void;
  onFollowToggle: (artistId: string) => void;
  onCreatePlaylist: (playlistName: string) => void;
  onAddSongToPlaylist: (playlistId: string, songId: string) => void;
  onRemoveSongFromPlaylist: (playlistId: string, songId: string) => void;
  initialSection?: string;
  onClearHistory?: () => void;
}

export default function LibraryView({
  playlists,
  songs,
  artists,
  albums = [],
  favorites,
  followingArtists,
  recentlyPlayed = [],
  currentPlayingSong,
  onSelectSong,
  onSelectArtist,
  onSelectAlbum,
  onSelectPlaylist,
  onLikeToggle,
  onFollowToggle,
  onCreatePlaylist,
  onAddSongToPlaylist,
  onRemoveSongFromPlaylist,
  initialSection = "liked",
  onClearHistory
}: LibraryViewProps) {
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>(initialSection);

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  const getSongAlbumName = (song: Song) => {
    if (song.albumTitle) return song.albumTitle;
    if (song.albumId && albums) {
      const album = albums.find(a => a.id === song.albumId);
      if (album) return album.title;
    }
    return "Single";
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"trending" | "new" | "plays" | "likes" | "recent">("trending");

  const getSortedAllSongs = () => {
    let filtered = songs.filter(s => (s as any).isPublic !== false);
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      filtered = filtered.filter(song => {
        const titleMatch = song.title.toLowerCase().includes(query);
        const artistMatch = song.artistName.toLowerCase().includes(query);
        const genreMatch = song.genre?.toLowerCase().includes(query);
        const albumMatch = getSongAlbumName(song).toLowerCase().includes(query);
        return titleMatch || artistMatch || genreMatch || albumMatch;
      });
    }

    return [...filtered].sort((a, b) => {
      if (sortBy === "trending") {
        const scoreA = (a.playCount || 0) * 1.5 + (a.likes || 0) * 2;
        const scoreB = (b.playCount || 0) * 1.5 + (b.likes || 0) * 2;
        return scoreB - scoreA;
      }
      if (sortBy === "new" || sortBy === "recent") {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      if (sortBy === "plays") {
        return (b.playCount || 0) - (a.playCount || 0);
      }
      if (sortBy === "likes") {
        return (b.likes || 0) - (a.likes || 0);
      }
      return 0;
    });
  };

  // Filter lists based on states
  const likedSongs = songs.filter(s => favorites.includes(s.id));
  const followedCreators = artists.filter(a => followingArtists.includes(a.userId));
  
  // Resolve recently played songs (map play events to actual Song objects)
  const recentlyPlayedSongs = recentlyPlayed
    .map(rp => {
      const song = songs.find(s => s.id === rp.songId);
      if (!song) return null;
      return {
        ...song,
        playedAt: rp.playedAt
      };
    })
    .filter(Boolean) as (Song & { playedAt: string })[];

  const handleCreatePlaylistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    onCreatePlaylist(newPlaylistName.trim());
    setNewPlaylistName("");
  };

  const selectedPlaylist = playlists.find(p => p.id === selectedPlaylistId);
  const selectedPlaylistSongs = selectedPlaylist 
    ? songs.filter(s => selectedPlaylist.songIds.includes(s.id))
    : [];

  // Helper to format playedAt timestamp
  const formatPlayedAt = (isoString: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  // Bento filter cards config
  const bentoCards = [
    {
      id: "all_songs",
      title: "All Songs",
      subtitle: "Full SoundStream Catalog",
      count: `${songs.filter(s => (s as any).isPublic !== false).length} track${songs.filter(s => (s as any).isPublic !== false).length !== 1 ? "s" : ""}`,
      icon: <Music className="w-5 h-5 text-indigo-400" />,
      coverUrl: songs.filter(s => (s as any).isPublic !== false)[0]?.coverUrl,
      bgGradient: "from-indigo-500/20 to-indigo-500/5 hover:border-indigo-500/30",
      activeClass: "border-indigo-500/50 bg-indigo-500/10 text-indigo-400"
    },
    {
      id: "liked",
      title: "Liked Songs",
      subtitle: "Your handpicked tracks",
      count: `${likedSongs.length} track${likedSongs.length !== 1 ? "s" : ""}`,
      icon: <Heart className="w-5 h-5 text-pink-500 fill-pink-500/20" />,
      coverUrl: likedSongs[0]?.coverUrl,
      bgGradient: "from-pink-500/20 to-rose-500/5 hover:border-pink-500/30",
      activeClass: "border-pink-500/50 bg-pink-500/10 text-pink-400"
    },
    {
      id: "playlists",
      title: "Playlists",
      subtitle: "Custom compilations",
      count: `${playlists.length} playlist${playlists.length !== 1 ? "s" : ""}`,
      icon: <ListMusic className="w-5 h-5 text-indigo-400" />,
      coverUrl: playlists[0]?.coverUrl || (playlists[0]?.songIds?.[0] ? songs.find(s => s.id === playlists[0].songIds[0])?.coverUrl : undefined),
      bgGradient: "from-indigo-500/20 to-purple-500/5 hover:border-indigo-500/30",
      activeClass: "border-indigo-500/50 bg-indigo-500/10 text-indigo-400"
    },
    {
      id: "albums",
      title: "Albums",
      subtitle: "Independent records",
      count: `${albums.length} album${albums.length !== 1 ? "s" : ""}`,
      icon: <Disc className="w-5 h-5 text-amber-400" />,
      coverUrl: albums[0]?.coverUrl,
      bgGradient: "from-amber-500/20 to-yellow-500/5 hover:border-amber-500/30",
      activeClass: "border-amber-500/50 bg-amber-500/10 text-amber-400"
    },
    {
      id: "following",
      title: "Following",
      subtitle: "Monitored creators",
      count: `${followedCreators.length} curator${followedCreators.length !== 1 ? "s" : ""}`,
      icon: <Users className="w-5 h-5 text-teal-400" />,
      coverUrl: followedCreators[0]?.profilePhoto,
      bgGradient: "from-teal-500/20 to-emerald-500/5 hover:border-teal-500/30",
      activeClass: "border-teal-500/50 bg-teal-500/10 text-teal-400"
    },
    {
      id: "recent",
      title: "Recently Played",
      subtitle: "Listening history",
      count: `${recentlyPlayedSongs.length} track${recentlyPlayedSongs.length !== 1 ? "s" : ""}`,
      icon: <Clock className="w-5 h-5 text-cyan-400" />,
      coverUrl: recentlyPlayedSongs[0]?.coverUrl,
      bgGradient: "from-cyan-500/20 to-blue-500/5 hover:border-cyan-500/30",
      activeClass: "border-cyan-500/50 bg-cyan-500/10 text-cyan-400"
    },
    {
      id: "downloads",
      title: "Downloads",
      subtitle: "Coming Soon",
      count: "Offline FLAC",
      icon: <Download className="w-5 h-5 text-zinc-500" />,
      coverUrl: undefined,
      bgGradient: "from-zinc-500/10 to-zinc-500/2 hover:border-zinc-500/20 opacity-70",
      activeClass: "border-zinc-500/50 bg-zinc-500/10 text-zinc-400"
    }
  ];

  return (
    <div id="soundstream-library-page" className="space-y-10 text-white font-sans max-w-7xl mx-auto py-2">
      
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-[#020204]/90 backdrop-blur-md border-b border-white/5 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2 uppercase tracking-tight">
            <ListMusic className="w-6 h-6 text-indigo-400" />
            My Library
          </h2>
          <p className="text-zinc-400 text-xs mt-1">
            Access your personalized collections, custom play streams, and monitored creators.
          </p>
        </div>

        {/* Sticky horizontal pill navigation bar */}
        <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {bentoCards.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSection(tab.id);
                setSelectedPlaylistId(null);
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeSection === tab.id
                  ? "bg-indigo-600 text-white"
                  : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {tab.icon}
              <span>{tab.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bento Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {bentoCards.map((card) => {
          const isActive = activeSection === card.id && !selectedPlaylistId;
          return (
            <div
              key={card.id}
              onClick={() => {
                setActiveSection(card.id);
                setSelectedPlaylistId(null);
              }}
              className={`relative overflow-hidden rounded-2xl border p-4 cursor-pointer transition-all duration-300 flex flex-col justify-between aspect-square group ${
                isActive 
                  ? card.activeClass 
                  : `bg-gradient-to-br ${card.bgGradient} border-white/5`
              }`}
            >
              {/* Background Cover Image or Gradient */}
              {card.coverUrl ? (
                <div className="absolute inset-0 z-0 opacity-15 group-hover:opacity-25 transition-opacity duration-300">
                  <img
                    src={card.coverUrl}
                    alt={card.title}
                    className="w-full h-full object-cover filter blur-[2px]"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#020204] via-transparent to-transparent" />
                </div>
              ) : null}

              {/* Icon & Count */}
              <div className="relative z-10 flex items-center justify-between">
                <div className={`p-2 rounded-xl bg-white/5 border border-white/10 group-hover:scale-105 transition-transform`}>
                  {card.icon}
                </div>
                <span className="text-[10px] font-mono font-bold text-zinc-400 bg-black/40 px-2 py-0.5 rounded-full border border-white/5">
                  {card.count}
                </span>
              </div>

              {/* Title & Subtitle */}
              <div className="relative z-10 mt-4 text-left">
                <h3 className="font-bold text-xs text-zinc-100 group-hover:text-white transition-colors truncate">
                  {card.title}
                </h3>
                <p className="text-[9px] text-zinc-400 mt-0.5 line-clamp-1">
                  {card.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dynamic Content Detail Section */}
      <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl relative min-h-[400px]">
        
        {/* Search/Filter Bar inside Active Section */}
        {activeSection !== "downloads" && activeSection !== "playlists" && (
          <div className="mb-6 flex flex-col sm:flex-row gap-3 items-center justify-between border-b border-white/5 pb-5">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-sans font-bold text-base text-zinc-100 flex items-center gap-2 tracking-tight uppercase">
                {activeSection === "all_songs" && <Music className="w-5 h-5 text-indigo-500" />}
                {activeSection === "liked" && <Heart className="w-5 h-5 text-pink-500" />}
                {activeSection === "albums" && <Disc className="w-5 h-5 text-amber-500" />}
                {activeSection === "following" && <Users className="w-5 h-5 text-teal-500" />}
                {activeSection === "recent" && <Clock className="w-5 h-5 text-cyan-500" />}
                
                {activeSection === "all_songs" && `All Songs Catalog (${songs.filter(s => (s as any).isPublic !== false).length})`}
                {activeSection === "liked" && `Liked Songs (${likedSongs.length})`}
                {activeSection === "albums" && `Albums & EPs (${albums.length})`}
                {activeSection === "following" && `Following Creators (${followedCreators.length})`}
                {activeSection === "recent" && `Recently Played History (${recentlyPlayedSongs.length})`}
              </h3>
              
              {activeSection === "recent" && onClearHistory && recentlyPlayedSongs.length > 0 && (
                <button
                  onClick={onClearHistory}
                  className="text-[10px] uppercase tracking-wider font-bold font-mono text-zinc-400 hover:text-red-400 transition-colors bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/25 px-3 py-1.5 rounded-full flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear History
                </button>
              )}
            </div>

            {/* Quick Filter Search Input & Sort Selector */}
            <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto items-stretch sm:items-center">
              {activeSection === "all_songs" && (
                <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 shrink-0">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider font-bold">Sort</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent text-xs text-zinc-200 focus:outline-none cursor-pointer font-sans font-bold pr-1"
                  >
                    <option value="trending" className="bg-zinc-950 text-white">Trending 🔥</option>
                    <option value="new" className="bg-zinc-950 text-white">New Releases 🆕</option>
                    <option value="plays" className="bg-zinc-950 text-white">Most Played 🎧</option>
                    <option value="likes" className="bg-zinc-950 text-white">Most Liked ❤️</option>
                    <option value="recent" className="bg-zinc-950 text-white">Recently Added 📅</option>
                  </select>
                </div>
              )}

              <div className="relative w-full sm:w-64">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-3.5 w-3.5 text-zinc-500" />
                </span>
                <input
                  type="text"
                  placeholder={activeSection === "all_songs" ? "Search title, artist, album, genre..." : `Filter ${activeSection}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-indigo-500 text-zinc-150 placeholder-zinc-500 transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={selectedPlaylistId || activeSection}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            
            {/* ALL SONGS CATALOG VIEW */}
            {activeSection === "all_songs" && (
              <div className="space-y-3">
                {getSortedAllSongs().length > 0 ? (
                  <div className="space-y-2">
                    {getSortedAllSongs().map((song, idx) => {
                      const isPlayingThis = currentPlayingSong?.id === song.id;
                      const isLiked = favorites.includes(song.id);
                      return (
                        <div 
                          key={song.id}
                          className={`flex items-center justify-between p-3 rounded-2xl hover:bg-white/10 transition-colors group border ${
                            isPlayingThis ? "border-indigo-500 bg-white/5" : "border-transparent"
                          }`}
                        >
                          <div 
                            onClick={() => onSelectSong(song)}
                            className="flex items-center gap-3.5 w-8/12 cursor-pointer text-left"
                          >
                            <img 
                              src={song.coverUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop&q=80"} 
                              alt={song.title} 
                              className="w-10 h-10 object-cover rounded-xl border border-white/10 shrink-0"
                              referrerPolicy="no-referrer" 
                            />
                            <div className="overflow-hidden">
                              <p className="font-sans font-bold text-xs text-zinc-150 truncate group-hover:text-indigo-400 transition-colors uppercase tracking-tight">
                                {song.title}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[10px] text-zinc-550 font-mono">
                                <span>{song.artistName}</span>
                                <span className="text-zinc-650">•</span>
                                <span className="italic text-zinc-450">Album: {getSongAlbumName(song)}</span>
                                {song.genre && (
                                  <>
                                    <span className="text-zinc-650">•</span>
                                    <span className="bg-white/5 px-1.5 py-0.5 rounded text-[8px] uppercase">{song.genre}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3.5 pl-2 text-right shrink-0">
                            {/* Analytics metadata indicators */}
                            <div className="hidden sm:flex items-center gap-3 text-[10px] font-mono text-zinc-550 mr-2">
                              <span className="flex items-center gap-0.5" title="Plays">
                                <span className="text-indigo-400">▶</span> {song.playCount || 0}
                              </span>
                              <span className="flex items-center gap-0.5" title="Likes">
                                <span className="text-pink-500">♥</span> {song.likes || 0}
                              </span>
                            </div>

                            {/* Like Toggle */}
                            <button
                              onClick={() => onLikeToggle(song.id)}
                              className={`p-1.5 rounded-full hover:bg-white/5 transition-colors ${
                                isLiked ? "text-pink-500" : "text-zinc-550 hover:text-white"
                              }`}
                            >
                              <Heart className={`w-4 h-4 ${isLiked ? "fill-pink-500" : ""}`} />
                            </button>

                            {/* Play Button */}
                            <button
                              onClick={() => onSelectSong(song)}
                              className="p-1.5 bg-indigo-650 hover:bg-indigo-600 rounded-full text-white transition-colors animate-pulse"
                            >
                              <Play className="w-3.5 h-3.5 fill-white pl-0.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-16 text-center text-zinc-550 border border-dashed border-white/10 rounded-2xl text-xs flex flex-col items-center justify-center gap-2">
                    <Music className="w-10 h-10 text-zinc-600" />
                    <span>{searchQuery ? "No matching songs found in catalog." : "No songs uploaded yet."}</span>
                  </div>
                )}
              </div>
            )}

            {/* LIKED SONGS VIEW */}
            {activeSection === "liked" && (
              <div className="space-y-3">
                {likedSongs.length > 0 && likedSongs.some(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.artistName.toLowerCase().includes(searchQuery.toLowerCase())) ? (
                  <div className="space-y-2">
                    {likedSongs
                      .filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.artistName.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((song, idx) => {
                        const isPlayingThis = currentPlayingSong?.id === song.id;
                        return (
                          <div 
                            key={song.id}
                            className={`flex items-center justify-between p-3.5 rounded-2xl hover:bg-white/10 transition-colors group border ${
                              isPlayingThis ? "border-indigo-500/30 bg-white/5" : "border-transparent"
                            }`}
                          >
                            <div 
                              onClick={() => onSelectSong(song)}
                              className="flex items-center gap-4 w-10/12 cursor-pointer"
                            >
                              <span className="font-mono text-xs text-zinc-500 w-4 font-bold text-center">
                                {idx + 1}
                              </span>
                              <img 
                                src={song.coverUrl} 
                                alt={song.title} 
                                className="w-11 h-11 object-cover rounded-xl border border-white/10 shrink-0"
                                referrerPolicy="no-referrer" 
                              />
                              <div className="overflow-hidden">
                                <p className="font-sans font-bold text-xs text-zinc-150 truncate group-hover:text-indigo-400 transition-colors uppercase tracking-tight">
                                  {song.title}
                                </p>
                                <p className="font-mono text-[10px] text-zinc-500 mt-1">
                                  {song.artistName}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3.5 pl-2 text-right shrink-0">
                              {/* Playlist Add Dropdown */}
                              {playlists.length > 0 && (
                                <select 
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      onAddSongToPlaylist(e.target.value, song.id);
                                      e.target.value = ""; // reset
                                    }
                                  }}
                                  className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-[9px] hover:text-white text-zinc-400 font-bold transition-all focus:outline-none cursor-pointer"
                                >
                                  <option value="">+ Add to Playlist</option>
                                  {playlists.map(p => (
                                    <option key={p.id} value={p.id}>{p.title}</option>
                                  ))}
                                </select>
                              )}

                              <button 
                                onClick={() => onLikeToggle(song.id)}
                                className="text-pink-500 hover:text-zinc-600 p-2 transition-colors shrink-0"
                                title="Unlike Track"
                              >
                                <HeartCrack className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    }
                  </div>
                ) : (
                  <div className="py-16 text-center text-zinc-550 border border-dashed border-white/10 rounded-2xl text-xs flex flex-col items-center justify-center gap-3">
                    <Heart className="w-10 h-10 text-zinc-600" />
                    <p>
                      {searchQuery ? "No matches found for your filter query." : "Your Liked Songs collection is empty."}
                    </p>
                    {!searchQuery && <p className="text-[10px] text-zinc-650 max-w-sm leading-relaxed">Tap the heart icon on any SoundStream song to instantly build your quick-access favorites list!</p>}
                  </div>
                )}
              </div>
            )}

            {/* PLAYLISTS VIEW */}
            {activeSection === "playlists" && (
              <div className="space-y-6">
                
                {/* Custom Playlist Creator Block */}
                {!selectedPlaylistId && (
                  <div className="bg-[#050508] border border-white/5 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-sm text-zinc-200">Create custom Playstream</h4>
                      <p className="text-[11px] text-zinc-500 mt-0.5">Bundle songs together to curate the ultimate high-fidelity lossless vibes.</p>
                    </div>
                    <form onSubmit={handleCreatePlaylistSubmit} className="flex gap-2 w-full md:w-auto shrink-0">
                      <input 
                        type="text"
                        placeholder="Compilation name..."
                        value={newPlaylistName}
                        onChange={(e) => setNewPlaylistName(e.target.value)}
                        className="bg-black/60 border border-white/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-indigo-500 text-zinc-150 placeholder-zinc-500 transition-colors w-full md:w-48"
                        required
                      />
                      <button 
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 cursor-pointer transition-colors shadow-lg shadow-indigo-600/15"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        <span>Assemble</span>
                      </button>
                    </form>
                  </div>
                )}

                {/* Inline Playlist Songs Details panel */}
                {selectedPlaylistId && selectedPlaylist ? (
                  <div className="space-y-4">
                    {/* Header bar inside details */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                      <button
                        onClick={() => setSelectedPlaylistId(null)}
                        className="flex items-center gap-1.5 text-zinc-400 hover:text-white font-bold text-xs font-mono transition-colors cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to compilations</span>
                      </button>

                      {selectedPlaylistSongs.length > 0 && (
                        <button 
                          onClick={() => onSelectSong(selectedPlaylistSongs[0])}
                          className="bg-indigo-650 hover:bg-indigo-600 text-white px-4 py-2 rounded-full font-bold text-xs tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
                        >
                          <Play className="w-4 h-4 fill-white" />
                          <span>Stream compiles</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                      <div className="w-14 h-14 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-white/10 shrink-0">
                        <ListMusic className="w-7 h-7 text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-white">{selectedPlaylist.title}</h3>
                        <p className="text-[11px] text-zinc-400 mt-1 font-mono">{selectedPlaylistSongs.length} tracks bundled in this stream</p>
                      </div>
                    </div>

                    {/* Playlist Songs List */}
                    <div className="space-y-2 mt-2">
                      {selectedPlaylistSongs.map((song, idx) => {
                        const isPlayingThis = currentPlayingSong?.id === song.id;
                        return (
                          <div 
                            key={song.id}
                            className={`flex items-center justify-between p-3 rounded-2xl hover:bg-white/10 transition-colors group border ${
                              isPlayingThis ? "border-indigo-500/20 bg-white/5" : "border-transparent"
                            }`}
                          >
                            <div 
                              onClick={() => onSelectSong(song)}
                              className="flex items-center gap-3 w-10/12 cursor-pointer"
                            >
                              <span className="font-mono text-xs text-zinc-500 w-4 font-bold text-center">
                                {idx + 1}
                              </span>
                              <img 
                                src={song.coverUrl} 
                                alt={song.title} 
                                className="w-10 h-10 object-cover rounded-lg border border-white/10"
                                referrerPolicy="no-referrer" 
                              />
                              <div className="overflow-hidden">
                                <p className="font-sans font-bold text-xs text-zinc-150 truncate group-hover:text-indigo-400 transition-colors uppercase tracking-tight">
                                  {song.title}
                                </p>
                                <p className="font-mono text-[10px] text-zinc-500 mt-0.5">
                                  {song.artistName}
                                </p>
                              </div>
                            </div>

                            <button 
                              onClick={() => onRemoveSongFromPlaylist(selectedPlaylist.id, song.id)}
                              className="text-[11px] text-zinc-500 hover:text-red-400 px-3 py-1.5 hover:underline font-mono"
                              title="Remove track"
                            >
                              ✕ Remove
                            </button>
                          </div>
                        );
                      })}

                      {selectedPlaylistSongs.length === 0 && (
                        <div className="py-12 border border-dashed border-white/10 rounded-2xl text-center text-zinc-500 text-xs">
                          This playlist compiles are empty. Tap Browse, click "+ Add to Playlist" on any track!
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Playlists Grid */
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {playlists.map((playlist) => {
                      const firstSong = playlist.songIds?.[0] ? songs.find(s => s.id === playlist.songIds[0]) : null;
                      return (
                        <div 
                          key={playlist.id}
                          onClick={() => onSelectPlaylist ? onSelectPlaylist(playlist.id) : setSelectedPlaylistId(playlist.id)}
                          className="p-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-2xl cursor-pointer transition-all flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-3.5 overflow-hidden">
                            <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-white/10 shrink-0 overflow-hidden relative">
                              {firstSong ? (
                                <img src={firstSong.coverUrl} alt={playlist.title} className="w-full h-full object-cover" />
                              ) : (
                                <ListMusic className="w-6 h-6 text-indigo-400" />
                              )}
                            </div>
                            <div className="overflow-hidden text-left">
                              <p className="text-xs font-bold text-zinc-100 group-hover:text-indigo-400 transition-colors truncate uppercase tracking-tight">
                                {playlist.title}
                              </p>
                              <p className="text-[10px] text-zinc-500 font-mono mt-1">{playlist.songIds?.length || 0} tracks bundled</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
                        </div>
                      );
                    })}

                    {playlists.length === 0 && (
                      <div className="col-span-full py-16 text-center text-zinc-550 border border-dashed border-white/10 rounded-2xl text-xs flex flex-col items-center justify-center gap-2">
                        <ListMusic className="w-10 h-10 text-zinc-600" />
                        <span>No playlists assembled yet. Build a Compilation using the header block above!</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ALBUMS VIEW */}
            {activeSection === "albums" && (
              <div className="space-y-4">
                {albums.length > 0 && albums.some(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()) || a.artistName.toLowerCase().includes(searchQuery.toLowerCase())) ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {albums
                      .filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()) || a.artistName.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((album) => (
                        <div
                          key={album.id}
                          onClick={() => onSelectAlbum && onSelectAlbum(album.id)}
                          className="bg-[#050508] hover:bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl p-3 cursor-pointer transition-all group"
                        >
                          <div className="relative aspect-square overflow-hidden rounded-xl mb-2.5 border border-white/5">
                            <img
                              src={album.coverUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop&q=80"}
                              alt={album.title}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              loading="lazy"
                            />
                            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[8px] font-mono font-bold border border-white/10">
                              {album.isEP ? "EP" : "Album"}
                            </div>
                          </div>
                          <h4 className="font-bold text-xs text-zinc-100 group-hover:text-indigo-400 truncate uppercase tracking-tight text-left">
                            {album.title}
                          </h4>
                          <p className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate text-left">{album.artistName}</p>
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[9px] font-mono text-zinc-550">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-zinc-600" />
                              {album.releaseDate ? new Date(album.releaseDate).getFullYear() : "Indie"}
                            </span>
                            <span>{album.trackCount} track{album.trackCount !== 1 ? "s" : ""}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="py-16 text-center text-zinc-550 border border-dashed border-white/10 rounded-2xl text-xs flex flex-col items-center justify-center gap-2">
                    <Disc className="w-10 h-10 text-zinc-600" />
                    <span>{searchQuery ? "No matching albums found." : "No albums available."}</span>
                  </div>
                )}
              </div>
            )}

            {/* FOLLOWING VIEW */}
            {activeSection === "following" && (
              <div className="space-y-4">
                {followedCreators.length > 0 && followedCreators.some(a => a.artistName.toLowerCase().includes(searchQuery.toLowerCase())) ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {followedCreators
                      .filter(a => a.artistName.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((artist) => {
                        // Resolve followed artist's latest release
                        const artistSongs = songs.filter(s => s.artistId === artist.userId || s.artistId === artist.uid);
                        const latestRelease = artistSongs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

                        return (
                          <div 
                            key={artist.userId}
                            className="flex flex-col p-4 bg-[#050508] border border-white/5 rounded-2xl hover:border-white/10 transition-colors gap-4"
                          >
                            <div className="flex items-center justify-between">
                              <div 
                                onClick={() => onSelectArtist(artist.userId)}
                                className="flex items-center gap-3 overflow-hidden cursor-pointer flex-1 text-left"
                              >
                                <img 
                                  src={artist.profilePhoto} 
                                  alt={artist.artistName} 
                                  className="w-11 h-11 rounded-full object-cover border border-white/10 shrink-0"
                                  referrerPolicy="no-referrer" 
                                />
                                <div className="overflow-hidden">
                                  <p className="text-xs font-bold text-zinc-100 font-sans truncate hover:text-indigo-400 transition-colors uppercase tracking-tight">{artist.artistName}</p>
                                  <p className="text-[10px] text-zinc-550 font-mono mt-0.5">{artist.followersCount} followers</p>
                                </div>
                              </div>
                              
                              <button 
                                onClick={() => onFollowToggle(artist.userId)}
                                className="text-[10px] font-mono text-zinc-400 hover:text-red-400 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 shrink-0 transition-colors cursor-pointer select-none"
                              >
                                Unfollow
                              </button>
                            </div>

                            {/* Latest Release block for followed artists */}
                            {latestRelease ? (
                              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex items-center justify-between gap-3 group/release hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-2.5 overflow-hidden text-left">
                                  <img 
                                    src={latestRelease.coverUrl} 
                                    alt={latestRelease.title} 
                                    className="w-8 h-8 rounded-lg object-cover border border-white/5 shrink-0" 
                                  />
                                  <div className="overflow-hidden">
                                    <span className="text-[8px] uppercase tracking-wider font-mono text-indigo-400 font-semibold block">Latest Release</span>
                                    <p className="text-[10px] font-bold text-zinc-200 truncate uppercase tracking-tight mt-0.5 group-hover/release:text-indigo-400 transition-colors">
                                      {latestRelease.title}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => onSelectSong(latestRelease)}
                                  className="p-1.5 bg-indigo-650 hover:bg-indigo-600 rounded-full text-white shrink-0 transition-colors"
                                  title="Play Latest Track"
                                >
                                  <Play className="w-3.5 h-3.5 fill-white pl-0.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="text-center py-2 text-[9px] text-zinc-600 border border-dashed border-white/5 rounded-xl font-mono">
                                No uploaded releases available yet.
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="py-16 text-center text-zinc-550 border border-dashed border-white/10 rounded-2xl text-xs flex flex-col items-center justify-center gap-2">
                    <Users className="w-10 h-10 text-zinc-600" />
                    <span>{searchQuery ? "No matching creators found." : "You aren't active following any curators yet."}</span>
                  </div>
                )}
              </div>
            )}

            {/* RECENTLY PLAYED VIEW */}
            {activeSection === "recent" && (
              <div className="space-y-3">
                {recentlyPlayedSongs.length > 0 && recentlyPlayedSongs.some(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.artistName.toLowerCase().includes(searchQuery.toLowerCase())) ? (
                  <div className="space-y-2">
                    {recentlyPlayedSongs
                      .filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.artistName.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((song, idx) => {
                        const isPlayingThis = currentPlayingSong?.id === song.id;
                        return (
                          <div 
                            key={`${song.id}-${song.playedAt}-${idx}`}
                            className={`flex items-center justify-between p-3 rounded-2xl hover:bg-white/10 transition-colors group border ${
                              isPlayingThis ? "border-indigo-500 bg-white/5" : "border-transparent"
                            }`}
                          >
                            <div 
                              onClick={() => onSelectSong(song)}
                              className="flex items-center gap-3.5 w-10/12 cursor-pointer"
                            >
                              <img 
                                src={song.coverUrl} 
                                alt={song.title} 
                                className="w-10 h-10 object-cover rounded-xl border border-white/10"
                                referrerPolicy="no-referrer" 
                              />
                              <div className="overflow-hidden">
                                <p className="font-sans font-bold text-xs text-zinc-150 truncate group-hover:text-indigo-400 transition-colors uppercase tracking-tight">
                                  {song.title}
                                </p>
                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[10px] text-zinc-550 font-mono">
                                  <span>{song.artistName}</span>
                                  <span className="text-zinc-650">•</span>
                                  <span className="italic text-zinc-450">Album: {getSongAlbumName(song)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3.5 pl-2 text-right shrink-0">
                              <span className="text-[10px] font-mono text-zinc-550 flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                                <Clock className="w-3 h-3 text-zinc-600" />
                                {formatPlayedAt(song.playedAt)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="py-16 text-center text-zinc-550 border border-dashed border-white/10 rounded-2xl text-xs flex flex-col items-center justify-center gap-2">
                    <Clock className="w-10 h-10 text-zinc-600" />
                    <span>{searchQuery ? "No matching tracks in recently played history." : "No listening play history found."}</span>
                  </div>
                )}
              </div>
            )}

            {/* DOWNLOADS VIEW */}
            {activeSection === "downloads" && (
              <div className="py-16 text-center max-w-md mx-auto space-y-6 flex flex-col items-center justify-center">
                <div className="p-4 bg-zinc-500/10 border border-white/5 rounded-full">
                  <Download className="w-10 h-10 text-indigo-400 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-200">High-Fidelity Offline Listening</h3>
                  <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                    We are currently building direct local disk synchronization engine using secure IndexedDB to store lossless FLAC format audio directly in your browser.
                  </p>
                </div>
                <div className="bg-[#050508] border border-white/5 p-4 rounded-xl text-[10px] font-mono text-zinc-550 w-full text-left space-y-2">
                  <div className="flex justify-between">
                    <span>Engine Status:</span>
                    <span className="text-indigo-400">Processing Audio Codecs</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Target Format:</span>
                    <span className="text-zinc-400">FLAC Lossless (24-bit/96kHz)</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-indigo-500 h-full w-2/3 rounded-full animate-pulse" />
                  </div>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}
