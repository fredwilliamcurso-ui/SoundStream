import React from "react";
import { Song, Artist, Album } from "../types";
import { Play, Heart, Users, Music, ShieldCheck, Share2, ExternalLink, Youtube, Layers, Video } from "lucide-react";
import { motion } from "motion/react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

interface ArtistProfileViewProps {
  artist: Artist;
  songs: Song[];
  albums?: Album[];
  isFollowing: boolean;
  onFollowToggle: (artistId: string) => void;
  onSelectSong: (song: Song) => void;
  onSelectAlbum?: (albumId: string) => void;
  favorites: string[];
  onLikeToggle: (songId: string) => void;
  currentPlayingSong: Song | null;
  onShareArtist: (artist: Artist) => void;
  isOwner?: boolean;
  onUploadClick?: () => void;
}

export default function ArtistProfileView({
  artist,
  songs,
  albums = [],
  isFollowing,
  onFollowToggle,
  onSelectSong,
  onSelectAlbum,
  favorites,
  onLikeToggle,
  currentPlayingSong,
  onShareArtist,
  isOwner = false,
  onUploadClick
}: ArtistProfileViewProps) {
  const [activeSubTab, setActiveSubTab] = React.useState<"catalog" | "videos">("catalog");
  const artistSongs = songs.filter(s => s.artistId === artist.userId);
  const artistAlbums = albums.filter(a => a.artistId === artist.userId || a.artistId === artist.uid);
  const artistVideos = artistSongs.filter(s => !!s.videoUrl);
  const totalArtistPlayCount = artistSongs.reduce((sum, s) => sum + s.playCount, 0);
  const socialArtist = artist as any;

  // Real-time listener for creator's public shorts on their profile page
  const [artistShorts, setArtistShorts] = React.useState<any[]>([]);
  React.useEffect(() => {
    const artistId = artist.userId || artist.uid;
    if (!artistId) return;

    const shortsQuery = query(
      collection(db, "shorts"),
      where("creatorId", "==", artistId),
      where("visibility", "==", "public")
    );

    const unsubscribe = onSnapshot(shortsQuery, (snapshot) => {
      const docsList: any[] = [];
      snapshot.forEach((doc) => {
        docsList.push({ id: doc.id, ...doc.data() });
      });
      setArtistShorts(docsList);
    }, (error) => {
      console.error("Error listening to artist profile shorts:", error);
    });

    return () => unsubscribe();
  }, [artist.userId, artist.uid]);

  const totalShortsViews = artistShorts.reduce((acc, s) => acc + (s.views || 0), 0);
  const totalShortsLikes = artistShorts.reduce((acc, s) => acc + (s.likes || 0), 0);

  return (
    <div id="soundstream-artist-profile" className="text-white font-sans max-w-5xl mx-auto py-2 space-y-8">
      {/* 1. Header Banner Cover */}
      <div className="relative rounded-3xl bg-[#050508] border border-white/5 overflow-hidden shadow-2xl flex flex-col md:flex-row items-center md:items-end p-6 md:p-10 gap-6 md:gap-8">
        {/* Background Ambient Aura */}
        <div className="absolute inset-0 bg-gradient-to-t from-black to-indigo-950/20 pointer-events-none" />
        <div className="absolute top-12 right-12 w-48 h-48 bg-indigo-500/10 rounded-full filter blur-3xl pointer-events-none" />

        {/* Profile Circle Photo */}
        <img 
          id="profile-view-photo"
          src={artist.profilePhoto} 
          alt={artist.artistName} 
          className="w-24 h-24 md:w-36 md:h-36 rounded-full object-cover border-4 border-[#050508] shadow-2xl relative shrink-0"
          referrerPolicy="no-referrer" 
        />

        {/* Metadatas */}
        <div className="relative space-y-3 text-center md:text-left flex-1">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified SoundStream Creator
            </span>
          </div>

          <h2 id="profile-view-artist-name" className="text-2xl md:text-4xl font-extrabold tracking-tight text-white mb-1 uppercase leading-none">
            {artist.artistName}
          </h2>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4.5 text-xs text-zinc-405 font-mono">
            <span className="flex items-center gap-1 text-zinc-300">
              <Users className="w-4 h-4 text-indigo-400" />
              <strong id="profile-view-follower-count" className="text-white font-bold">
                {(artist.followersCount + (isFollowing ? 1 : 0)).toLocaleString()}
              </strong> followers
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <strong className="text-white font-bold">{(socialArtist.followingCount || 0).toLocaleString()}</strong> following
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Music className="w-4 h-4 text-indigo-400" />
              <strong className="text-white font-bold">{artistSongs.length}</strong> catalog track{artistSongs.length !== 1 ? 's' : ''}
            </span>
            <span>•</span>
            <span>
              <strong className="text-white font-bold">{totalArtistPlayCount.toLocaleString()}</strong> stream plays
            </span>
            {artistShorts.length > 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Video className="w-4 h-4 text-indigo-400" />
                  <strong className="text-white font-bold">{artistShorts.length}</strong> short{artistShorts.length !== 1 ? 's' : ''}
                </span>
                <span>•</span>
                <span>
                  <strong className="text-white font-bold">{totalShortsViews.toLocaleString()}</strong> video views
                </span>
                <span>•</span>
                <span>
                  <strong className="text-white font-bold">{totalShortsLikes.toLocaleString()}</strong> video likes
                </span>
              </>
            )}
          </div>
        </div>

        {/* Actions Pane */}
        <div className="flex items-center gap-3 relative shrink-0">
          <button 
            id="profile-share-btn"
            onClick={() => onShareArtist(artist)}
            className="p-3 bg-white/5 hover:bg-white/10 text-zinc-305 hover:text-indigo-400 rounded-full border border-white/10 transition-all cursor-pointer"
            title="Share Artist Profile"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {isOwner ? (
            <button 
              id="profile-upload-song-btn"
              onClick={onUploadClick}
              className="px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider relative transition-all active:scale-95 cursor-pointer bg-indigo-650 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 flex items-center gap-1.5"
            >
              <Music className="w-3.5 h-3.5" />
              Upload Song
            </button>
          ) : (
            <button 
              id="profile-follow-toggle-btn"
              onClick={() => onFollowToggle(artist.userId)}
              className={`px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider relative transition-all active:scale-95 cursor-pointer ${
                isFollowing 
                  ? "bg-[#ffffff10] text-[#f4f4f5] hover:bg-[#ffffff15] hover:text-[#ffffff] border border-white/10" 
                  : "bg-indigo-650 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
              }`}
            >
              {isFollowing ? "✓ Following" : "Follow Artist"}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Biography Panel */}
        <div className="bg-white/5 border border-white/5 rounded-3xl p-6 md:p-8 lg:col-span-4 space-y-4">
          <h3 className="font-sans font-bold text-xs text-zinc-400 tracking-wider uppercase font-mono border-b border-white/5 pb-3">
            Artist Biography
          </h3>
          <p id="profile-view-bio" className="text-xs text-zinc-300 leading-relaxed font-sans font-medium">
            {artist.bio}
          </p>

          {/* External Streaming Platform Portals */}
          {(socialArtist.spotifyUrl || socialArtist.appleMusicUrl || socialArtist.audiomackUrl || socialArtist.amazonMusicUrl || socialArtist.youtubeUrl || socialArtist.soundstreamUsername) && (
            <div className="border-t border-white/5 pt-4.5 space-y-3">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block font-bold">
                External Hubs
              </span>
              <div className="grid grid-cols-1 gap-2">
                {socialArtist.soundstreamUsername && (
                  <a 
                    id="portal-soundstream-link"
                    href={`https://www.soundstream.com/@${socialArtist.soundstreamUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between bg-black hover:bg-zinc-950 border border-pink-500/20 hover:border-pink-500/50 rounded-xl px-3.5 py-2.5 transition-all group cursor-pointer shadow-sm shadow-pink-500/5 animate-pulse"
                  >
                    <span className="text-xs font-bold text-white font-sans flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 text-pink-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.19a8.1 8.1 0 0 0 3.93 2.45v3.91c-.88-.08-1.75-.32-2.58-.66a8.04 8.04 0 0 1-3.1-2.28c-.06 2.3-.01 4.59-.02 6.89-.04 1.34-.33 2.7-.93 3.89a7.33 7.33 0 0 1-4.71 4.14c-1.63.49-3.41.48-5.02-.1a7.35 7.35 0 0 1-4.14-4.52c-.52-1.57-.45-3.32.19-4.83a7.32 7.32 0 0 1 4.88-4.27V12.7a3.42 3.42 0 0 0-2.07 1.37 3.44 3.44 0 0 0-.42 3.04 3.42 3.42 0 0 0 2.76 2.3c.96.1 1.95-.15 2.72-.75.83-.65 1.29-1.67 1.28-2.72.03-3.99.01-7.98.02-11.97-.01-.32.03-.64.12-.95.27-1.14.94-2.15 1.88-2.84.44-.31.93-.55 1.45-.69.45-.11.9-.17 1.35-.17Z"/>
                      </svg>
                      Follow on Soundstream
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-pink-400/80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </a>
                )}
                {socialArtist.spotifyUrl && (
                  <a 
                    id="portal-spotify-link"
                    href={socialArtist.spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between bg-[#1ED760]/5 hover:bg-[#1ED760]/10 border border-[#1ED760]/15 hover:border-[#1ED760]/30 rounded-xl px-3.5 py-2.5 transition-all group cursor-pointer"
                  >
                    <span className="text-xs font-bold text-[#1ED760] font-sans flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1ED760] animate-pulse" />
                      Spotify Artist Profile
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#1ED760]/70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </a>
                )}
                {socialArtist.appleMusicUrl && (
                  <a 
                    id="portal-apple-link"
                    href={socialArtist.appleMusicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between bg-[#FC3C44]/5 hover:bg-[#FC3C44]/10 border border-[#FC3C44]/15 hover:border-[#FC3C44]/30 rounded-xl px-3.5 py-2.5 transition-all group cursor-pointer"
                  >
                    <span className="text-xs font-bold text-[#FC3C44] font-sans flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FC3C44] animate-pulse" />
                      Apple Music Profile
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#FC3C44]/70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </a>
                )}
                {socialArtist.audiomackUrl && (
                  <a 
                    id="portal-audiomack-link"
                    href={socialArtist.audiomackUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between bg-[#FFA200]/5 hover:bg-[#FFA200]/10 border border-[#FFA200]/15 hover:border-[#FFA200]/30 rounded-xl px-3.5 py-2.5 transition-all group cursor-pointer"
                  >
                    <span className="text-xs font-bold text-[#FFA200] font-sans flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FFA200] animate-pulse" />
                      Audiomack Profile
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#FFA200]/70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </a>
                )}
                {socialArtist.amazonMusicUrl && (
                  <a 
                    id="portal-amazon-link"
                    href={socialArtist.amazonMusicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between bg-[#00A8E1]/5 hover:bg-[#00A8E1]/10 border border-[#00A8E1]/15 hover:border-[#00A8E1]/30 rounded-xl px-3.5 py-2.5 transition-all group cursor-pointer"
                  >
                    <span className="text-xs font-bold text-[#00A8E1] font-sans flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00A8E1] animate-pulse" />
                      Amazon Music
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#00A8E1]/70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </a>
                )}
                {socialArtist.youtubeUrl && (
                  <a 
                    id="portal-youtube-link"
                    href={socialArtist.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between bg-[#FF0000]/5 hover:bg-[#FF0000]/10 border border-[#FF0000]/15 hover:border-[#FF0000]/30 rounded-xl px-3.5 py-2.5 transition-all group cursor-pointer"
                  >
                    <span className="text-xs font-bold text-[#FF0000] font-sans flex items-center gap-2">
                      <Youtube className="w-3.5 h-3.5" />
                      YouTube Channel
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#FF0000]/70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="border-t border-white/5 pt-4.5 space-y-3">
            <span className="text-[10px] font-mono text-zinc-550 uppercase tracking-widest block">SoundStream Independent Guarantee</span>
            <p className="text-[10px] text-zinc-500 leading-relaxed font-sans">
              By supporting {artist.artistName} directly on SoundStream, 100% of organic stream counts and listeners support local modular and creative music loops directly. No media giants involved.
            </p>
          </div>
        </div>

        {/* Popular Tracks list / Videos tab */}
        <div className="bg-white/5 border border-white/5 rounded-3xl p-6 md:p-8 lg:col-span-8 space-y-5">
          {/* Sub-tabs Navigation */}
          <div className="flex items-center gap-5 border-b border-white/5 pb-2.5">
            <button
              onClick={() => setActiveSubTab("catalog")}
              className={`pb-2.5 text-xs uppercase font-mono tracking-wider font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === "catalog"
                  ? "border-indigo-500 text-white"
                  : "border-transparent text-zinc-400 hover:text-white"
              }`}
            >
              <Music className="w-3.5 h-3.5 text-indigo-400" />
              Published Catalog ({artistSongs.length})
            </button>
            <button
              onClick={() => setActiveSubTab("videos")}
              className={`pb-2.5 text-xs uppercase font-mono tracking-wider font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === "videos"
                  ? "border-pink-500 text-white"
                  : "border-transparent text-zinc-400 hover:text-white"
              }`}
            >
              <Video className="w-3.5 h-3.5 text-pink-400" />
              Videos ({artistVideos.length})
            </button>
          </div>

          {activeSubTab === "catalog" ? (
            <div className="space-y-6">
              <div className="space-y-2">
                {artistSongs.map((song, idx) => {
                  const isPlayingThis = currentPlayingSong?.id === song.id;
                  const isLiked = favorites.includes(song.id);
                  return (
                    <div 
                      key={song.id}
                      className={`flex items-center justify-between p-3 rounded-2xl hover:bg-white/10 transition-colors group border cursor-default ${
                        isPlayingThis ? "border-indigo-500 bg-white/5" : "border-transparent"
                      }`}
                    >
                      <div 
                        onClick={() => onSelectSong(song)}
                        className="flex items-center gap-3 w-10/12 cursor-pointer"
                      >
                        <span className="font-mono text-xs text-zinc-550 w-4 font-bold text-center">
                          {idx + 1}
                        </span>
                        <img 
                          src={song.coverUrl} 
                          alt={song.title} 
                          className="w-10 h-10 object-cover rounded-lg border border-white/10"
                          referrerPolicy="no-referrer" 
                        />
                        <div className="overflow-hidden">
                          <p className="font-sans font-bold text-xs text-zinc-150 truncate group-hover:text-indigo-400 transition-colors uppercase tracking-tight flex items-center gap-1.5">
                            {song.title}
                            {!!song.videoUrl && (
                              <span className="text-[8.5px] bg-pink-550/15 text-pink-300 border border-pink-500/20 px-1.5 py-0.5 rounded uppercase tracking-wide font-mono font-bold">
                                Video
                              </span>
                            )}
                          </p>
                          <p className="font-mono text-[10px] text-zinc-550 mt-0.5">
                            {song.genre}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3.5 text-right pl-2 shrink-0">
                        <span className="font-mono text-[10px] text-zinc-450">
                          {song.playCount.toLocaleString()} streams
                        </span>
                        <button 
                          onClick={() => onLikeToggle(song.id)}
                          className={`p-1.5 transition-colors ${
                            isLiked ? "text-pink-505 hover:text-pink-400" : "text-zinc-500 hover:text-white"
                          }`}
                        >
                          <Heart className={`w-4.5 h-4.5 ${isLiked ? "fill-pink-500 text-pink-500" : ""}`} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {artistSongs.length === 0 && (
                  <div className="py-12 text-center text-zinc-550 border border-dashed border-white/10 rounded-xl">
                    This creator hasn't published any releases to their SoundStream catalogue yet.
                  </div>
                )}
              </div>

              {/* Albums & EPs Section */}
              <div className="space-y-4 pt-6 border-t border-white/5">
                <h3 className="font-sans font-bold text-xs text-zinc-400 tracking-wider uppercase font-mono pb-2 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  Albums &amp; EPs ({artistAlbums.length})
                </h3>

                {artistAlbums.length === 0 ? (
                  <div className="py-8 text-center text-zinc-550 border border-dashed border-white/10 rounded-xl text-xs">
                    This creator hasn't published any Albums or EPs yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {artistAlbums.map((album) => (
                      <div
                        key={album.id}
                        onClick={() => onSelectAlbum && onSelectAlbum(album.id)}
                        className="bg-white/[0.02] hover:bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl p-3 cursor-pointer transition-all group animate-fade-in"
                      >
                        <div className="relative aspect-square overflow-hidden rounded-xl mb-2 border border-white/5">
                          <img
                            src={album.coverUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop&q=80"}
                            alt={album.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                        </div>
                        <h4 className="font-bold text-xs text-zinc-100 group-hover:text-indigo-400 truncate uppercase tracking-tight">
                          {album.title}
                        </h4>
                        <div className="flex items-center justify-between mt-1.5 text-[9.5px] font-mono text-zinc-550">
                          <span>{album.isEP ? "EP" : "Album"}</span>
                          <span>{album.trackCount} track{album.trackCount !== 1 ? "s" : ""}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Videos Sub-tab View */
            <div className="space-y-4">
              {artistVideos.length === 0 ? (
                <div className="py-16 text-center text-zinc-550 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-3">
                  <Video className="w-8 h-8 text-zinc-600" />
                  <div className="space-y-1">
                    <p className="font-bold text-xs text-zinc-400 uppercase font-mono">No Music Videos published</p>
                    <p className="text-[10px] text-zinc-500 max-w-sm">This creator hasn't added high-definition MP4 cinematic music videos to their catalog yet.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {artistVideos.map((video) => {
                    const isPlayingThis = currentPlayingSong?.id === video.id;
                    const isLiked = favorites.includes(video.id);
                    return (
                      <div
                        key={video.id}
                        onClick={() => onSelectSong(video)}
                        className={`bg-zinc-950/40 border rounded-2xl p-3.5 hover:bg-white/10 transition-all cursor-pointer group flex flex-col justify-between ${
                          isPlayingThis ? "border-pink-500 ring-1 ring-pink-550/15" : "border-white/5"
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
                            <img
                              src={video.coverUrl}
                              alt={video.title}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              referrerPolicy="no-referrer"
                            />
                            {/* Video overlay with play icon */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <div className="w-10 h-10 bg-pink-500 text-white rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-all">
                                <Play className="w-4.5 h-4.5 fill-white text-white ml-0.5" />
                              </div>
                            </div>
                            <span className="absolute bottom-2 right-2 bg-black/75 backdrop-blur-sm text-[8px] font-mono font-bold text-zinc-300 px-2 py-0.5 rounded uppercase border border-white/5 tracking-wider">
                              MP4 CINEMA
                            </span>
                          </div>

                          <div className="flex items-start justify-between gap-2.5">
                            <div className="overflow-hidden">
                              <h4 className="font-bold text-xs truncate text-zinc-200 group-hover:text-pink-400 transition-colors uppercase tracking-tight">
                                {video.title}
                              </h4>
                              <p className="font-mono text-[9px] text-zinc-550 mt-0.5 uppercase">
                                {video.genre} • {video.playCount.toLocaleString()} streams
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onLikeToggle(video.id);
                              }}
                              className={`p-1 transition-colors shrink-0 ${
                                isLiked ? "text-pink-500" : "text-zinc-500 hover:text-white"
                              }`}
                            >
                              <Heart className={`w-4 h-4 ${isLiked ? "fill-pink-500 text-pink-500" : ""}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Creator's Soundstream Feed */}
              {artist.soundstreamUsername && (
                <div className="pt-6 border-t border-white/5 space-y-4 animate-fade-in">
                  <h3 className="font-sans font-bold text-xs text-zinc-350 tracking-wider uppercase font-mono flex items-center gap-2">
                    <svg className="w-4 h-4 text-pink-500 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.19a8.1 8.1 0 0 0 3.93 2.45v3.91c-.88-.08-1.75-.32-2.58-.66a8.04 8.04 0 0 1-3.1-2.28c-.06 2.3-.01 4.59-.02 6.89-.04 1.34-.33 2.7-.93 3.89a7.33 7.33 0 0 1-4.71 4.14c-1.63.49-3.41.48-5.02-.1a7.35 7.35 0 0 1-4.14-4.52c-.52-1.57-.45-3.32.19-4.83a7.32 7.32 0 0 1 4.88-4.27V12.7a3.42 3.42 0 0 0-2.07 1.37 3.44 3.44 0 0 0-.42 3.04 3.42 3.42 0 0 0 2.76 2.3c.96.1 1.95-.15 2.72-.75.83-.65 1.29-1.67 1.28-2.72.03-3.99.01-7.98.02-11.97-.01-.32.03-.64.12-.95.27-1.14.94-2.15 1.88-2.84.44-.31.93-.55 1.45-.69.45-.11.9-.17 1.35-.17Z"/>
                    </svg>
                    Latest Soundstream creator Videos (@{artist.soundstreamUsername})
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      {
                        id: "tt_v1",
                        title: "Behind the scenes in the studio making my new album loop! 🎧🔥",
                        views: "242.5K",
                        likes: "42.1K",
                        duration: "0:30",
                        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-young-man-playing-music-on-synthesizer-in-studio-41712-large.mp4",
                        coverUrl: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&q=80"
                      },
                      {
                        id: "tt_v2",
                        title: "Unboxing my new analog synth rig, this thing is a monster! 🎹🎚️",
                        views: "128.9K",
                        likes: "22.4K",
                        duration: "0:45",
                        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-producer-working-at-soundboard-in-studio-41707-large.mp4",
                        coverUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80"
                      },
                      {
                        id: "tt_v3",
                        title: "Visualizer test for the leading single. Let me know what you think! 🌌💫",
                        views: "85.2K",
                        likes: "15.8K",
                        duration: "0:15",
                        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-disc-jockey-mixing-music-on-soundboard-41708-large.mp4",
                        coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80"
                      }
                    ].map((v) => (
                      <div 
                        key={v.id}
                        className="bg-black border border-white/5 rounded-2xl overflow-hidden hover:border-pink-500/30 transition-all group flex flex-col justify-between"
                      >
                        <div className="relative aspect-[9/16] bg-zinc-900 overflow-hidden">
                          <video 
                            src={v.videoUrl} 
                            poster={v.coverUrl}
                            className="w-full h-full object-cover cursor-pointer"
                            loop
                            muted
                            playsInline
                            onMouseEnter={(e) => {
                              try {
                                e.currentTarget.play();
                              } catch (err) {}
                            }}
                            onMouseLeave={(e) => {
                              try {
                                e.currentTarget.pause();
                              } catch (err) {}
                            }}
                          />
                          
                          <div className="absolute inset-0 bg-black/35 opacity-100 group-hover:opacity-0 transition-opacity flex flex-col justify-between p-3.5 pointer-events-none">
                            <span className="self-end bg-pink-500 text-white text-[8px] font-mono font-black px-1.5 py-0.5 rounded-md uppercase tracking-wide">
                              Hover to Play
                            </span>
                            <div className="space-y-1">
                              <p className="text-[10px] text-zinc-100 font-sans font-bold leading-snug line-clamp-2">
                                {v.title}
                              </p>
                              <div className="flex items-center gap-2.5 text-[9px] font-mono text-zinc-350">
                                <span>👁️ {v.views}</span>
                                <span>❤️ {v.likes}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
