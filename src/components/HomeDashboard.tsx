import React from "react";
import { Song, Artist, Album } from "../types";
import { Play, TrendingUp, Music, Star, Heart, Share2, Layers, Clock, Video } from "lucide-react";
import { motion } from "motion/react";

interface HomeDashboardProps {
  songs: Song[];
  artists: Artist[];
  albums?: Album[];
  favorites: string[];
  currentPlayingSong: Song | null;
  onSelectSong: (song: Song) => void;
  onLikeToggle: (songId: string) => void;
  onSelectArtist: (artistId: string) => void;
  onSelectAlbum?: (albumId: string) => void;
  selectedGenre: string;
  setSelectedGenre: (genre: string) => void;
  genres: string[];
  onShareSong: (song: Song) => void;
  onShareArtist: (artist: Artist) => void;
  recentlyPlayed?: { songId: string; playedAt: string }[];
  onViewRecentlyPlayedAll?: () => void;
  onViewTrendingAll?: () => void;
}

export default function HomeDashboard({
  songs,
  artists,
  albums = [],
  favorites,
  currentPlayingSong,
  onSelectSong,
  onLikeToggle,
  onSelectArtist,
  onSelectAlbum,
  selectedGenre,
  setSelectedGenre,
  genres,
  onShareSong,
  onShareArtist,
  recentlyPlayed = [],
  onViewRecentlyPlayedAll,
  onViewTrendingAll
}: HomeDashboardProps) {

  const trendingSongs = [...songs]
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, 5);

  const trendingVideos = [...songs]
    .filter(s => !!s.videoUrl)
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, 4);

  const newReleases = [...songs]
    .slice(0, 4);

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

  const getSongAlbumName = (song: Song) => {
    if (song.albumTitle) return song.albumTitle;
    if (song.albumId && albums) {
      const album = albums.find(a => a.id === song.albumId);
      if (album) return album.title;
    }
    return "Single";
  };

  // Filter songs based on genre
  const filteredSongs = selectedGenre === "All" 
    ? songs 
    : songs.filter(s => s.genre.toLowerCase() === selectedGenre.toLowerCase());

  return (
    <div id="soundstream-home-dashboard" className="space-y-10 text-white font-sans max-w-7xl mx-auto py-2">
      
      {/* 1. Hero Promo Banner designed around the "Elegant Dark" spotlight/neon themes */}
      <div 
        id="home-hero-banner"
        className="relative rounded-3xl bg-[#09090f] border border-indigo-500/10 p-8 md:p-12 overflow-hidden shadow-2xl shadow-indigo-550/5 flex flex-col md:flex-row items-center justify-between gap-8 bg-gradient-to-br from-[#050508] to-[#11111d]"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-transparent to-purple-500/5 pointer-events-none" />
        <div className="absolute top-1/2 left-1/4 w-72 h-72 bg-indigo-650/10 rounded-full filter blur-3xl pointer-events-none -translate-y-1/2" />
        
        <div className="relative space-y-5 max-w-xl text-center md:text-left z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/15 border border-indigo-500/25 rounded-full text-[10px] font-bold tracking-widest text-indigo-300 uppercase font-mono">
            <Star className="w-3 h-3 fill-indigo-400 text-indigo-300" />
            SPOTLIGHT: INDEPENDENT REVOLUTION
          </span>
          <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white leading-none">
            NEON REVERIE &amp;<br />RAW INDEPENDENT SOUNDS.
          </h2>
          <p className="text-white/60 text-sm md:text-base leading-relaxed max-w-md">
            SoundStream amplifies real creators with high-fidelity lossless playback, granular stream transparency, and complete creative freedom.
          </p>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-1">
            <button 
              id="hero-play-trending-btn"
              onClick={() => trendingSongs.length > 0 && onSelectSong(trendingSongs[0])}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-6 py-3 rounded-full text-xs tracking-widest uppercase transition-all shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={trendingSongs.length === 0}
            >
              {trendingSongs.length > 0 ? "Stream Spotlight Track" : "No Spotlight Track"}
            </button>
            <span className="text-[11px] font-mono text-white/40">
              {songs.reduce((acc, curr) => acc + curr.playCount, 0).toLocaleString()} direct fan streams
            </span>
          </div>
        </div>

        {/* Highlight featured release mini card */}
        {trendingSongs.length > 0 && (
          <div className="relative w-full max-w-xs p-5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl shrink-0 group">
            <div className="relative overflow-hidden rounded-xl aspect-square mb-4">
              <img 
                src={trendingSongs[0].coverUrl} 
                alt={trendingSongs[0].title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                referrerPolicy="referrer"
              />
              {!!trendingSongs[0].videoUrl && (
                <span className="absolute top-2.5 left-2.5 bg-indigo-650/95 backdrop-blur-md text-[8px] font-mono font-black tracking-widest text-white px-2 py-0.5 rounded-md uppercase z-10 select-none shadow">
                  🎥 MUSIC VIDEO
                </span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button 
                  onClick={() => onSelectSong(trendingSongs[0])}
                  className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-2xl transform scale-90 group-hover:scale-100 transition-all"
                >
                  <Play className="w-5 h-5 fill-black pl-0.5" />
                </button>
              </div>
            </div>
            <div>
              <span className="text-[9px] font-mono tracking-widest font-bold text-indigo-400 uppercase">
                #1 PLATFORM SPOTLIGHT
              </span>
              <h4 className="font-bold text-sm truncate text-white mt-1 uppercase tracking-tight">
                {trendingSongs[0].title}
              </h4>
              <p className="font-mono text-xs text-white/50">
                {trendingSongs[0].artistName}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Recently Played Section */}
      {recentlyPlayedSongs.length > 0 && (
        <div id="home-recently-played" className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="font-sans font-bold text-lg text-zinc-100 flex items-center gap-2 uppercase tracking-tight">
              <Clock className="w-4 h-4 text-cyan-400" />
              Recently Played
            </h3>
            {onViewRecentlyPlayedAll && (
              <button
                onClick={onViewRecentlyPlayedAll}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-mono uppercase bg-indigo-500/10 hover:bg-indigo-500/15 px-3 py-1.5 rounded-full border border-indigo-500/20 transition-all cursor-pointer"
              >
                View Full History
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pt-2">
            {recentlyPlayedSongs.slice(0, 6).map((song) => {
              const isPlayingThis = currentPlayingSong?.id === song.id;
              return (
                <motion.div
                  key={`recent-${song.id}-${song.playedAt}`}
                  id={`recent-song-${song.id}`}
                  onClick={() => onSelectSong(song)}
                  className={`bg-white/[0.03] border rounded-2xl p-4 transition-all relative group flex flex-col justify-between hover:bg-white/10 cursor-pointer ${
                    isPlayingThis ? 'border-cyan-500/50 ring-1 ring-cyan-500/20' : 'border-white/5'
                  }`}
                  whileHover={{ y: -3 }}
                >
                  <div>
                    <div className="relative aspect-square overflow-hidden rounded-xl mb-3 border border-white/10">
                      <img
                        src={song.coverUrl}
                        alt={song.title}
                        className="w-full h-full object-cover rounded-xl transition-all duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-10 h-10 bg-cyan-500 text-black rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-105">
                          <Play className="w-4 h-4 fill-black text-black pl-0.5" />
                        </div>
                      </div>
                    </div>
                    <h5 className="font-bold text-xs truncate text-zinc-100 group-hover:text-cyan-400 transition-colors uppercase tracking-tight">
                      {song.title}
                    </h5>
                    <p className="font-mono text-[10px] text-white/40 truncate mt-0.5">
                      {song.artistName}
                    </p>
                    <p className="font-mono text-[9px] text-zinc-550 truncate mt-1 italic">
                      Album: {getSongAlbumName(song)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 mt-3 pt-2">
                    <span className="font-mono text-[8px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formatPlayedAt(song.playedAt)}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Quick Genre Filtering System */}
      <div id="genre-filtering" className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <h3 className="font-sans font-bold text-lg text-zinc-100 flex items-center gap-2 uppercase tracking-tight">
            <Music className="w-4 h-4 text-indigo-400" />
            Discover by Style
          </h3>
          <span className="text-xs text-indigo-400 font-mono uppercase bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
            {filteredSongs.length} Independent releases
          </span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs py-1">
          {genres.map((g) => (
            <button 
              key={g}
              id={`filter-${g.toLowerCase().replace(' ', '-')}`}
              onClick={() => setSelectedGenre(g)}
              className={`px-4 py-2 rounded-full font-semibold transition-all border ${
                selectedGenre === g 
                  ? "bg-indigo-650 text-white font-bold border-indigo-500 scale-105 shadow-md shadow-indigo-500/20" 
                  : "bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Genre Tracks Flow List */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4.5 pt-2">
          {filteredSongs.map((song) => {
            const isPlayingThis = currentPlayingSong?.id === song.id;
            const isLiked = favorites.includes(song.id);
            return (
              <motion.div 
                key={song.id}
                id={`song-card-${song.id}`}
                className={`bg-white/5 border rounded-2xl p-4 transition-all relative group flex flex-col justify-between hover:bg-white/10 ${
                  isPlayingThis ? 'border-indigo-500 ring-1 ring-indigo-500/30' : 'border-white/5'
                }`}
                whileHover={{ y: -3 }}
              >
                <div>
                  <div className="relative aspect-square overflow-hidden rounded-xl mb-3 border border-white/10">
                    <img 
                      src={song.coverUrl} 
                      alt={song.title} 
                      className="w-full h-full object-cover rounded-xl transition-all duration-300" 
                      referrerPolicy="no-referrer"
                    />
                    {!!song.videoUrl && (
                      <span className="absolute top-2 left-2 bg-indigo-650/95 backdrop-blur-md text-[8px] font-mono font-black tracking-widest text-white px-2 py-0.5 rounded-md uppercase z-10 select-none shadow">
                        🎥 VIDEO
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button 
                        onClick={() => onSelectSong(song)}
                        className="w-11 h-11 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-105"
                      >
                        <Play className="w-4.5 h-4.5 fill-white pl-0.5 text-white" />
                      </button>
                    </div>
                  </div>
                  <h5 className="font-bold text-xs truncate text-zinc-100 group-hover:text-indigo-400 transition-colors uppercase tracking-tight">
                    {song.title}
                  </h5>
                  <p 
                    onClick={() => onSelectArtist(song.artistId)}
                    className="font-mono text-[11px] text-white/40 hover:underline cursor-pointer truncate mt-0.5"
                  >
                    {song.artistName}
                  </p>
                </div>
                
                <div className="flex items-center justify-between border-t border-white/5 mt-3 pt-2">
                  <span className="font-mono text-[9px] text-white/50 bg-white/5 px-2.5 py-0.5 rounded-full select-none">
                    {song.genre}
                  </span>
                  
                  <div className="flex items-center gap-0.5">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onLikeToggle(song.id);
                      }}
                      className={`p-1.5 transition-colors ${
                        isLiked ? "text-pink-500" : "text-zinc-500 hover:text-white"
                      }`}
                      title="Like song"
                    >
                      <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-pink-500" : ""}`} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onShareSong(song);
                      }}
                      className="p-1.5 text-zinc-500 hover:text-indigo-400 transition-colors"
                      title="Share song"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {filteredSongs.length === 0 && (
            <div className="col-span-full py-12 text-center text-zinc-550 border border-dashed border-white/10 rounded-2xl bg-white/5">
              <Star className="w-8 h-8 text-indigo-450 mx-auto mb-2 animate-bounce" />
              <p className="text-zinc-400 font-medium">No tracks published in this genre yet.</p>
              <p className="text-[11px] text-zinc-550 mt-1">Independent artists are currently uploading files! Stand by.</p>
            </div>
          )}
        </div>
      </div>

      {/* 2.5 Featured Albums & EPs */}
      {albums.length > 0 && (
        <div id="featured-albums-section" className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="font-sans font-bold text-lg text-zinc-100 flex items-center gap-2 uppercase tracking-tight">
              <Layers className="w-4 h-4 text-indigo-400" />
              Featured Albums &amp; EPs
            </h3>
            <span className="text-xs text-indigo-400 font-mono uppercase bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
              {albums.length} Releases
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4.5 pt-2">
            {albums.map((album) => (
              <motion.div
                key={album.id}
                id={`album-card-${album.id}`}
                onClick={() => onSelectAlbum && onSelectAlbum(album.id)}
                className="bg-white/5 border border-white/5 rounded-2xl p-4 transition-all relative group flex flex-col justify-between hover:bg-white/10 hover:border-white/10 cursor-pointer"
                whileHover={{ y: -3 }}
              >
                <div>
                  <div className="relative aspect-square overflow-hidden rounded-xl mb-3 border border-white/10">
                    <img
                      src={album.coverUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop&q=80"}
                      alt={album.title}
                      className="w-full h-full object-cover rounded-xl transition-all duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-11 h-11 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-105">
                        <Play className="w-4.5 h-4.5 fill-white pl-0.5 text-white" />
                      </div>
                    </div>
                  </div>
                  <h5 className="font-bold text-xs truncate text-zinc-100 group-hover:text-indigo-400 transition-colors uppercase tracking-tight">
                    {album.title}
                  </h5>
                  <p className="font-mono text-[10px] text-white/40 truncate mt-0.5">
                    {album.artistName}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 mt-3 pt-2">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-550/10 px-1.5 py-0.5 rounded">
                    {album.isEP ? "EP" : "Album"}
                  </span>
                  <span className="font-mono text-[9px] text-white/50">
                    {album.trackCount} Tracks
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* 3. New Releases & Trending Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
        {/* Trending Songs Column */}
        <div id="trending-section" className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <h3 className="font-sans font-bold text-lg text-white uppercase tracking-tight">Trending Independent Tracks</h3>
            </div>
            {onViewTrendingAll && (
              <button
                onClick={onViewTrendingAll}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-mono uppercase bg-indigo-500/10 hover:bg-indigo-500/15 px-3 py-1.5 rounded-full border border-indigo-500/20 transition-all cursor-pointer"
              >
                View Charts
              </button>
            )}
          </div>

          <div className="space-y-2">
            {trendingSongs.map((song, idx) => {
              const isPlayingThis = currentPlayingSong?.id === song.id;
              return (
                <div 
                  key={song.id}
                  onClick={() => onSelectSong(song)}
                  className={`flex items-center justify-between p-3.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group border ${
                    isPlayingThis ? 'border-indigo-500/20 bg-white/5' : 'border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 w-10/12">
                    <span className="font-mono text-sm text-zinc-500 w-5 font-bold text-center">
                      {idx + 1}
                    </span>
                    <img 
                      src={song.coverUrl} 
                      alt={song.title} 
                      className="w-11 h-11 object-cover rounded-lg border border-white/10"
                      referrerPolicy="no-referrer" 
                    />
                    <div className="overflow-hidden">
                      <p className="font-sans font-semibold text-xs text-zinc-150 truncate group-hover:text-indigo-400 transition-colors uppercase tracking-tight flex items-center gap-1.5">
                        {song.title}
                        {!!song.videoUrl && (
                          <span className="text-[8.5px] bg-indigo-500/10 text-indigo-450 border border-indigo-550/20 px-1 rounded uppercase tracking-wide">
                            Video
                          </span>
                        )}
                      </p>
                      <p className="font-mono text-[10.5px] text-zinc-450 truncate">
                        {song.artistName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-[9px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                      {song.playCount.toLocaleString()} plays
                    </span>
                  </div>
                </div>
              );
            })}

            {trendingSongs.length === 0 && (
              <div className="py-12 text-center text-zinc-500 border border-dashed border-white/5 rounded-2xl bg-white/2">
                <Music className="w-7 h-7 text-indigo-500/40 mx-auto mb-2" />
                <p className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">No trending tracks</p>
                <p className="text-[10px] text-zinc-500 mt-1">Ready to feature upcoming uploads!</p>
              </div>
            )}
          </div>
        </div>

        {/* Featured Artists Grid Column */}
        <div id="featured-artists-section" className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="font-sans font-bold text-lg text-white flex items-center gap-2 uppercase tracking-tight">
              <Star className="w-4 h-4 text-indigo-400" />
              Verified creators
            </h3>
            <span className="text-xs text-white/40 font-mono">
              {artists.length} artists
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {artists.slice(0, 4).map((artist) => (
              <div 
                key={artist.userId}
                onClick={() => onSelectArtist(artist.userId)}
                className="bg-white/5 border border-white/5 rounded-2xl p-4.5 flex flex-col items-center text-center cursor-pointer hover:bg-white/10 group transition-all relative"
              >
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShareArtist(artist);
                  }}
                  className="absolute top-3 right-3 bg-white/5 hover:bg-white/10 text-zinc-500 hover:text-indigo-400 p-1.5 rounded-full transition-all"
                  title="Share creator profile"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
                <img 
                  src={artist.profilePhoto} 
                  alt={artist.artistName} 
                  className="w-16 h-16 rounded-full object-cover border border-white/10 mb-3 group-hover:border-indigo-500 transition-colors"
                  referrerPolicy="no-referrer" 
                />
                <h4 className="font-sans font-bold text-sm text-zinc-100 truncate w-full group-hover:text-indigo-400 transition-colors">
                  {artist.artistName}
                </h4>
                <p className="font-mono text-[9px] text-indigo-400 mt-1 uppercase tracking-wider">
                  {artist.followersCount.toLocaleString()} followers
                </p>
                <p className="text-[10px] text-zinc-450 line-clamp-2 mt-2 leading-relaxed">
                  {artist.bio}
                </p>
              </div>
            ))}

            {artists.length === 0 && (
              <div className="col-span-2 py-12 text-center text-zinc-500 border border-dashed border-white/5 rounded-2xl bg-white/2">
                <Star className="w-7 h-7 text-indigo-500/40 mx-auto mb-2" />
                <p className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">No creators registered</p>
                <p className="text-[10px] text-zinc-500 mt-1">Become the first verified independent creator!</p>
              </div>
            )}
          </div>
        </div>

        {/* 4. Trending Music Videos */}
        <div id="trending-videos-section" className="space-y-4 pt-6 border-t border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="w-5 h-5 text-pink-500 animate-pulse" />
              <h3 className="font-sans font-bold text-lg text-white uppercase tracking-tight">Trending Music Videos</h3>
            </div>
            <span className="text-xs text-zinc-550 font-mono hidden sm:inline uppercase">Independent Cinema releases</span>
          </div>

          {trendingVideos.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 border border-dashed border-white/5 rounded-2xl bg-zinc-950/20">
              <Video className="w-7 h-7 text-pink-500/30 mx-auto mb-2" />
              <p className="text-zinc-400 font-semibold text-xs uppercase tracking-wider font-mono">No Music Videos published yet</p>
              <p className="text-[10px] text-zinc-500 mt-1">Creators can publish MP4 videos from the Upload dashboard!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {trendingVideos.map((video) => {
                const isPlayingThis = currentPlayingSong?.id === video.id;
                return (
                  <div
                    key={video.id}
                    onClick={() => onSelectSong(video)}
                    className={`bg-white/[0.02] border rounded-2xl p-3 hover:bg-white/5 transition-all group cursor-pointer relative flex flex-col justify-between ${
                      isPlayingThis ? "border-pink-500 ring-1 ring-pink-550/15" : "border-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="relative aspect-video overflow-hidden rounded-xl border border-white/5 bg-zinc-950">
                        <img
                          src={video.coverUrl}
                          alt={video.title}
                          className="w-full h-full object-cover rounded-xl transition-transform duration-300 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-10 h-10 bg-pink-500 text-white rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-all">
                            <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                          </div>
                        </div>
                        <span className="absolute bottom-2 right-2 bg-black/75 backdrop-blur-sm text-[8px] font-mono font-bold text-zinc-300 px-2 py-0.5 rounded uppercase border border-white/5">
                          MP4 VIDEO
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-xs truncate text-zinc-150 group-hover:text-pink-400 transition-colors uppercase tracking-tight">
                          {video.title}
                        </h4>
                        <p className="font-mono text-[9.5px] text-zinc-500 mt-0.5 truncate uppercase">
                          {video.artistName} • {video.playCount.toLocaleString()} plays
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
