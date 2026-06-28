import React, { useState, useEffect } from "react";
import { Song, Artist, Album, Playlist } from "../types";
import { Search as SearchIcon, Play, Heart, Star, Layers } from "lucide-react";
import { motion } from "motion/react";
import { analytics } from "../lib/analytics";

interface SearchPageProps {
  songs: Song[];
  artists: Artist[];
  albums?: Album[];
  playlists?: Playlist[];
  favorites: string[];
  currentPlayingSong: Song | null;
  onSelectSong: (song: Song) => void;
  onSelectArtist: (artistId: string) => void;
  onSelectAlbum?: (albumId: string) => void;
  onSelectPlaylist?: (playlistId: string) => void;
  onLikeToggle: (songId: string) => void;
}

export default function SearchPage({
  songs,
  artists,
  albums = [],
  playlists = [],
  favorites,
  currentPlayingSong,
  onSelectSong,
  onSelectArtist,
  onSelectAlbum,
  onSelectPlaylist,
  onLikeToggle
}: SearchPageProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const trimmedQuery = searchQuery.trim().toLowerCase();

  // Track search query events in analytics
  useEffect(() => {
    if (!trimmedQuery) return;
    const timer = setTimeout(() => {
      analytics.trackEvent("search", undefined, undefined, { query: trimmedQuery });
    }, 1200);
    return () => clearTimeout(timer);
  }, [trimmedQuery]);

  // Filter songs
  const matchedSongs = songs.filter(song => {
    return (
      song.title.toLowerCase().includes(trimmedQuery) ||
      song.artistName.toLowerCase().includes(trimmedQuery) ||
      song.genre.toLowerCase().includes(trimmedQuery)
    );
  });

  // Filter artists
  const matchedArtists = artists.filter(artist => {
    return (
      artist.artistName.toLowerCase().includes(trimmedQuery) ||
      artist.bio.toLowerCase().includes(trimmedQuery)
    );
  });

  // Filter albums
  const matchedAlbums = albums.filter(album => {
    return (
      album.title.toLowerCase().includes(trimmedQuery) ||
      album.artistName.toLowerCase().includes(trimmedQuery) ||
      album.genre.toLowerCase().includes(trimmedQuery)
    );
  });

  // Filter public playlists
  const matchedPlaylists = playlists.filter(playlist => {
    return (
      playlist.isPublic &&
      (playlist.title.toLowerCase().includes(trimmedQuery) ||
        (playlist.description || "").toLowerCase().includes(trimmedQuery))
    );
  });

  // Set default recommendation lists when query is empty
  const defaultRecentSearches = ["Synthwave", "Lofi STUDY Sessions", "Neon Horizon", "Celia"];

  return (
    <div id="soundstream-search-page" className="space-y-8 text-white font-sans max-w-7xl mx-auto py-2">
      
      {/* Search Header and Input */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2 uppercase tracking-tight">
            <SearchIcon className="w-5 h-5 text-indigo-400" />
            Universal Indie Search
          </h2>
          <p className="text-zinc-400 text-xs mt-1">
            Discover independent talent across our entire decentralised artist network.
          </p>
        </div>

        <div className="relative">
          <SearchIcon className="w-5 h-5 text-zinc-500 absolute left-4.5 top-1/2 -translate-y-1/2" />
          <input 
            id="search-input-field"
            type="text"
            placeholder="Search songs, independent artists, lyrics, or specific musical genres..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#050508] border border-white/10 rounded-2xl py-3.5 pl-13 pr-4 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-zinc-100 placeholder-zinc-500 transition-all shadow-xl"
          />
        </div>

        {/* Search Recommendations */}
        {searchQuery === "" && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-white/40 font-mono">Popular searches:</span>
            {defaultRecentSearches.map((tag) => (
              <button 
                key={tag}
                onClick={() => setSearchQuery(tag)}
                className="bg-white/5 hover:bg-white/10 text-zinc-300 font-medium px-4 py-1.5 rounded-full border border-white/10 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {searchQuery !== "" ? (
        <div className="space-y-8">
          
          {/* Matched Songs Section */}
          <div className="space-y-3">
            <h3 className="font-sans font-bold text-sm text-zinc-400 tracking-wider uppercase font-mono border-b border-white/5 pb-2">
              Songs ({matchedSongs.length})
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {matchedSongs.map((song) => {
                const isPlayingThis = currentPlayingSong?.id === song.id;
                const isLiked = favorites.includes(song.id);
                return (
                  <div 
                    key={song.id}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border bg-white/5 hover:bg-white/10 transition-all ${
                      isPlayingThis ? 'border-indigo-550' : 'border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 w-10/12">
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden group shrink-0">
                        <img 
                          src={song.coverUrl} 
                          alt={song.title} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                        <button 
                          onClick={() => onSelectSong(song)}
                          className="absolute inset-0 bg-black/50 translucent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Play className="w-5.5 h-5.5 text-white fill-white pl-0.5" />
                        </button>
                      </div>

                      <div className="overflow-hidden">
                        <p 
                          onClick={() => onSelectSong(song)}
                          className="font-sans font-bold text-xs truncate text-zinc-100 hover:text-indigo-400 cursor-pointer uppercase tracking-tight"
                        >
                          {song.title}
                        </p>
                        <p 
                          onClick={() => onSelectArtist(song.artistId)}
                          className="font-mono text-[10.5px] text-indigo-400 hover:underline cursor-pointer truncate mt-0.5"
                        >
                          {song.artistName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[9.5px] font-mono text-zinc-455 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full uppercase">
                        {song.genre}
                      </span>
                      <button 
                        onClick={() => onLikeToggle(song.id)}
                        className={`p-1.5 transition-colors ${
                          isLiked ? "text-pink-500" : "text-zinc-500 hover:text-white"
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isLiked ? "fill-pink-500" : ""}`} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {matchedSongs.length === 0 && (
                <div className="col-span-full py-8 text-center text-zinc-550 text-xs">
                  No matching song titles or tags found.
                </div>
              )}
            </div>
          </div>

          {/* Matched Albums Section */}
          {matchedAlbums.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-sans font-bold text-sm text-zinc-400 tracking-wider uppercase font-mono border-b border-white/5 pb-2">
                Albums &amp; EPs ({matchedAlbums.length})
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {matchedAlbums.map((album) => {
                  return (
                    <div 
                      key={album.id}
                      onClick={() => onSelectAlbum && onSelectAlbum(album.id)}
                      className="p-3.5 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all cursor-pointer group"
                    >
                      <div className="relative aspect-square overflow-hidden rounded-xl mb-3 border border-white/10">
                        <img 
                          src={album.coverUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop&q=80"} 
                          alt={album.title} 
                          className="w-full h-full object-cover rounded-xl transition-all duration-300" 
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-5.5 h-5.5 text-white fill-white pl-0.5" />
                        </div>
                      </div>

                      <div className="overflow-hidden">
                        <p className="font-sans font-bold text-xs truncate text-zinc-100 group-hover:text-indigo-400 transition-colors uppercase tracking-tight">
                          {album.title}
                        </p>
                        <p className="font-mono text-[10.5px] text-indigo-400 truncate mt-0.5">
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
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Matched Playlists Section */}
          {matchedPlaylists.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-sans font-bold text-sm text-zinc-400 tracking-wider uppercase font-mono border-b border-white/5 pb-2">
                Public Playlists ({matchedPlaylists.length})
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {matchedPlaylists.map((playlist) => {
                  return (
                    <div 
                      key={playlist.id}
                      onClick={() => onSelectPlaylist && onSelectPlaylist(playlist.id)}
                      className="p-3.5 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all cursor-pointer group"
                    >
                      <div className="relative aspect-square overflow-hidden rounded-xl mb-3 border border-white/10">
                        <img 
                          src={playlist.coverUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop&q=80"} 
                          alt={playlist.title} 
                          className="w-full h-full object-cover rounded-xl transition-all duration-300" 
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-5.5 h-5.5 text-white fill-white pl-0.5" />
                        </div>
                      </div>

                      <div className="overflow-hidden">
                        <p className="font-sans font-bold text-xs truncate text-zinc-100 group-hover:text-indigo-400 transition-colors uppercase tracking-tight">
                          {playlist.title}
                        </p>
                        <p className="font-mono text-[10.5px] text-zinc-400 truncate mt-0.5">
                          Public Playlist
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-white/5 mt-3 pt-2">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-550/10 px-1.5 py-0.5 rounded">
                          Playlist
                        </span>
                        <span className="font-mono text-[9px] text-white/50">
                          {playlist.songCount || 0} Tracks
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Matched Artists Section */}
          <div className="space-y-3">
            <h3 className="font-sans font-bold text-sm text-zinc-400 tracking-wider uppercase font-mono border-b border-white/5 pb-2">
              Creators & Artists ({matchedArtists.length})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {matchedArtists.map((artist) => {
                return (
                  <div 
                    key={artist.userId}
                    onClick={() => onSelectArtist(artist.userId)}
                    className="flex items-center gap-3.5 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/30 cursor-pointer hover:bg-white/10 transition-all"
                  >
                    <img 
                      src={artist.profilePhoto} 
                      alt={artist.artistName} 
                      className="w-12 h-12 rounded-full object-cover border border-white/10"
                      referrerPolicy="no-referrer" 
                    />
                    <div className="overflow-hidden">
                      <h4 className="font-sans font-bold text-sm text-white truncate">
                        {artist.artistName}
                      </h4>
                      <p className="font-mono text-[9px] text-indigo-400 font-semibold uppercase tracking-wider mt-0.5">
                        {artist.followersCount} Followers
                      </p>
                    </div>
                  </div>
                );
              })}

              {matchedArtists.length === 0 && (
                <div className="col-span-full py-8 text-center text-zinc-550 text-xs">
                  No matching artist bios or stage names detected.
                </div>
              )}
            </div>
          </div>

        </div>
      ) : (
        /* Search Welcome state showing dynamic catalogs */
        <div className="py-12 border border-dashed border-white/10 rounded-3xl bg-[#050508] text-center space-y-4 max-w-2xl mx-auto">
          <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center mx-auto text-zinc-400 border border-white/10">
            <SearchIcon className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="space-y-1">
            <h4 className="font-sans font-semibold text-zinc-200">Start discovery session</h4>
            <p className="text-zinc-550 text-xs max-w-sm mx-auto leading-relaxed">
              Find customized lo-fi beats, synthwave drivers, acoustic arrangements, electronic glitches, or specific musical releases.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
