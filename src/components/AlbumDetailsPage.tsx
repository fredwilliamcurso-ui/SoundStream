import React from "react";
import { Album, Song } from "../types";
import { 
  Play, 
  Shuffle, 
  Share2, 
  ArrowLeft, 
  Heart, 
  Disc, 
  Music, 
  Clock, 
  CheckCircle,
  Volume2
} from "lucide-react";

interface AlbumDetailsPageProps {
  album: Album;
  songs: Song[];
  favorites: string[];
  currentPlayingSong: Song | null;
  isPlaying: boolean;
  onSelectSong: (song: Song) => void;
  onLikeToggle: (songId: string) => void;
  onBack: () => void;
  onPlayAlbum: (albumSongs: Song[], shuffle: boolean) => void;
}

export default function AlbumDetailsPage({
  album,
  songs,
  favorites,
  currentPlayingSong,
  isPlaying,
  onSelectSong,
  onLikeToggle,
  onBack,
  onPlayAlbum
}: AlbumDetailsPageProps) {
  // Filter and sort songs of this album
  const albumSongs = songs
    .filter((s) => s.albumId === album.id)
    .sort((a, b) => (a.trackNumber || 0) - (b.trackNumber || 0));

  const isLiked = (songId: string) => favorites.includes(songId);

  // Format total duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Human-readable total duration
  const formatTotalDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    if (mins < 60) {
      return `${mins} min`;
    }
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hrs} hr ${remainingMins} min`;
  };

  const handleShareAlbum = () => {
    const url = `${window.location.origin}${window.location.pathname}?album=${album.id}`;
    navigator.clipboard.writeText(url);
    alert(`Album link copied to clipboard: ${url}`);
  };

  return (
    <div id={`album-details-${album.id}`} className="space-y-6 text-white font-sans pb-10">
      
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-xs font-semibold group uppercase tracking-wider"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to music
      </button>

      {/* Album Header Block */}
      <div className="flex flex-col md:flex-row items-end gap-6 bg-gradient-to-t from-zinc-950/80 to-zinc-900/20 p-6 rounded-3xl border border-white/5 backdrop-blur-md">
        
        {/* Cover Art */}
        <div className="relative group shrink-0 w-44 h-44 md:w-52 md:h-52 mx-auto md:mx-0 shadow-2xl rounded-2xl overflow-hidden border border-white/10">
          <img
            src={album.coverUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop&q=80"}
            alt={album.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Disc className="w-12 h-12 text-indigo-400 animate-spin" />
          </div>
        </div>

        {/* Text Metadata */}
        <div className="flex-1 space-y-3 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <span className="text-[10px] uppercase font-mono tracking-widest bg-indigo-500/10 border border-indigo-550/20 text-indigo-400 px-2.5 py-0.5 rounded-full font-bold">
              {album.isEP ? "EP Release" : "LP Album"}
            </span>
            <span className="text-[10px] uppercase font-mono tracking-widest bg-white/5 text-zinc-300 px-2.5 py-0.5 rounded-full">
              {album.genre}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white uppercase">
            {album.title}
          </h1>

          <p className="text-zinc-400 text-xs leading-relaxed max-w-xl">
            {album.description || `Liner notes and high-fidelity West African streams for ${album.title}.`}
          </p>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-3 gap-y-1.5 text-xs text-zinc-400 font-medium">
            <span className="text-white font-bold">{album.artistName}</span>
            <span>•</span>
            <span>{album.releaseDate ? new Date(album.releaseDate).getFullYear() : "2026"}</span>
            <span>•</span>
            <span>{albumSongs.length} tracks</span>
            <span>•</span>
            <span className="font-mono">{formatTotalDuration(album.totalDuration || (albumSongs.length * 210))}</span>
          </div>
        </div>
      </div>

      {/* Buttons Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => onPlayAlbum(albumSongs, false)}
          disabled={albumSongs.length === 0}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-full transition-all shadow-lg shadow-indigo-600/10 cursor-pointer disabled:opacity-50"
        >
          <Play className="w-4 h-4 fill-white" />
          Play Album
        </button>

        <button
          onClick={() => onPlayAlbum(albumSongs, true)}
          disabled={albumSongs.length === 0}
          className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/5 font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-full transition-all cursor-pointer disabled:opacity-50"
        >
          <Shuffle className="w-4 h-4" />
          Shuffle
        </button>

        <button
          onClick={handleShareAlbum}
          className="p-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-350 border border-white/5 rounded-full transition-all cursor-pointer"
          title="Copy Link to Share"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      {/* Tracklist Table */}
      <div className="bg-zinc-900/25 border border-white/5 rounded-3xl overflow-hidden">
        <div className="p-4.5 border-b border-white/5 bg-zinc-950/20 flex items-center justify-between">
          <h3 className="text-xs uppercase font-mono tracking-widest text-zinc-400 font-bold flex items-center gap-2">
            <Music className="w-4 h-4 text-indigo-400" />
            Official Release Tracklist
          </h3>
          <span className="text-[10px] font-mono text-zinc-500">LOSSLESS STREAMING READY</span>
        </div>

        {albumSongs.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 border-t border-white/5 text-xs">
            No tracks have been assigned to this album yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] uppercase font-mono tracking-wider text-zinc-500">
                  <th className="py-3 px-5 text-center w-12">#</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4 hidden md:table-cell">Genre</th>
                  <th className="py-3 px-4 text-center hidden sm:table-cell">Streams</th>
                  <th className="py-3 px-5 text-right w-24">
                    <Clock className="w-3.5 h-3.5 ml-auto" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-zinc-300">
                {albumSongs.map((song, index) => {
                  const isCurrent = currentPlayingSong?.id === song.id;
                  return (
                    <tr
                      key={song.id}
                      className={`hover:bg-white/[0.02] transition-colors group ${
                        isCurrent ? "bg-indigo-600/5 text-indigo-200" : ""
                      }`}
                    >
                      {/* Track number / Active Play Icon */}
                      <td className="py-3.5 px-5 text-center font-mono">
                        {isCurrent && isPlaying ? (
                          <Volume2 className="w-4 h-4 text-indigo-400 mx-auto animate-pulse" />
                        ) : (
                          <button
                            onClick={() => onSelectSong(song)}
                            className="w-4 h-4 mx-auto items-center justify-center hidden group-hover:flex text-indigo-400 transition-colors"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                        )}
                        <span className="group-hover:hidden">{index + 1}</span>
                      </td>

                      {/* Song Title Info */}
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <img
                            src={song.coverUrl}
                            className="w-8 h-8 rounded object-cover border border-white/5 shrink-0"
                            alt=""
                          />
                          <div className="truncate">
                            <span className={isCurrent ? "text-indigo-400" : ""}>
                              {song.title}
                            </span>
                            <span className="block text-[10px] font-medium text-zinc-500 mt-0.5">
                              {song.artistName}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Genre */}
                      <td className="py-3.5 px-4 hidden md:table-cell font-mono text-[10px] text-zinc-450">
                        {song.genre}
                      </td>

                      {/* Plays */}
                      <td className="py-3.5 px-4 text-center hidden sm:table-cell font-mono text-[10px] text-zinc-400">
                        {(song.playCount || 0).toLocaleString()}
                      </td>

                      {/* Actions & Like button */}
                      <td className="py-3.5 px-5 text-right font-mono text-zinc-400">
                        <div className="flex items-center justify-end gap-3.5">
                          <button
                            onClick={() => onLikeToggle(song.id)}
                            className={`hover:scale-105 transition-transform ${
                              isLiked(song.id) ? "text-rose-500" : "text-zinc-500 hover:text-rose-400"
                            }`}
                          >
                            <Heart
                              className={`w-3.5 h-3.5 ${isLiked(song.id) ? "fill-current" : ""}`}
                            />
                          </button>
                          <span className="text-[10px]">3:30</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
