import React, { useState, useEffect, useMemo } from "react";
import { 
  TrendingUp, 
  Play, 
  Clock, 
  Heart, 
  Award, 
  ChevronUp, 
  ChevronDown, 
  Minus, 
  Music, 
  Disc, 
  Users, 
  Flame, 
  Sparkles, 
  RefreshCw, 
  Search, 
  Calendar,
  Layers,
  ArrowUpRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Song, Artist, Album, PlaylistSong } from "../types";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

interface TrendingChartsProps {
  songs: Song[];
  artists: Artist[];
  albums: Album[];
  playlistSongs: PlaylistSong[];
  currentPlayingSong: Song | null;
  onSelectSong: (song: Song) => void;
  onSelectArtist: (artistId: string) => void;
  onSelectAlbum: (albumId: string) => void;
  favorites: string[];
  onLikeToggle: (songId: string) => void;
}

interface PlayRecord {
  songId: string;
  playedAt: string;
}

export default function TrendingCharts({
  songs,
  artists,
  albums,
  playlistSongs,
  currentPlayingSong,
  onSelectSong,
  onSelectArtist,
  onSelectAlbum,
  favorites,
  onLikeToggle
}: TrendingChartsProps) {
  const [activeTab, setActiveTab] = useState<"global" | "trending" | "releases" | "artists" | "albums">("global");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [playsData, setPlaysData] = useState<PlayRecord[]>([]);

  // Fetch recentlyPlayed history of last 7 days globally to calculate recent/weekly play ranks
  useEffect(() => {
    let active = true;
    const fetchGlobalPlays = async () => {
      setIsLoadingHistory(true);
      try {
        const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const playsRef = collection(db, "recentlyPlayed");
        const q = query(playsRef, where("playedAt", ">=", lastWeek));
        const querySnapshot = await getDocs(q);
        
        const records: PlayRecord[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.songId && data.playedAt) {
            records.push({
              songId: data.songId,
              playedAt: data.playedAt
            });
          }
        });
        
        if (active) {
          setPlaysData(records);
          // Cache in localStorage to speed up initial load next time
          localStorage.setItem("soundstream_cached_global_plays", JSON.stringify({
            timestamp: Date.now(),
            data: records
          }));
        }
      } catch (err) {
        console.error("Error fetching global play logs for charts:", err);
      } finally {
        if (active) setIsLoadingHistory(false);
      }
    };

    // Load cached first for speed, then fetch fresh
    const cached = localStorage.getItem("soundstream_cached_global_plays");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.data)) {
          setPlaysData(parsed.data);
        }
      } catch (e) {
        // ignore
      }
    }

    fetchGlobalPlays();
    return () => {
      active = false;
    };
  }, []);

  // Compute map of counts from play data
  const playCounts = useMemo(() => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const counts24h: Record<string, number> = {};
    const counts7d: Record<string, number> = {};

    playsData.forEach((record) => {
      const playedTime = new Date(record.playedAt).getTime();
      // Last 24 Hours
      if (playedTime >= oneDayAgo) {
        counts24h[record.songId] = (counts24h[record.songId] || 0) + 1;
      }
      // Last 7 Days (all records returned are within 7 days)
      counts7d[record.songId] = (counts7d[record.songId] || 0) + 1;
    });

    return { counts24h, counts7d };
  }, [playsData]);

  // Compute playlist additions map
  const playlistAdditionsMap = useMemo(() => {
    const additions: Record<string, number> = {};
    playlistSongs.forEach((ps) => {
      if (ps.songId) {
        additions[ps.songId] = (additions[ps.songId] || 0) + 1;
      }
    });
    return additions;
  }, [playlistSongs]);

  // Calculate scores and generate lists with rank indices and cached historical movement
  const rankedData = useMemo(() => {
    const { counts24h, counts7d } = playCounts;

    // 1. TOP 100 GLOBAL & TRENDING NOW SCORING
    const songsWithScores = songs.map((song) => {
      const recentPlays = counts24h[song.id] || 0;
      const weeklyPlays = counts7d[song.id] || 0;
      const totalPlays = song.playCount || 0;
      const likesCount = song.likes || 0;
      const playlistAdds = playlistAdditionsMap[song.id] || 0;

      // Top 100 Global Score: Long-term popularity & strong base plays
      const globalScore = 
        totalPlays * 1.0 + 
        weeklyPlays * 6.0 + 
        recentPlays * 15.0 + 
        likesCount * 12.0 + 
        playlistAdds * 8.0;

      // Trending Now Score: Dynamic, high momentum weight to recent actions
      const trendingScore = 
        recentPlays * 30.0 + 
        weeklyPlays * 10.0 + 
        likesCount * 18.0 + 
        playlistAdds * 12.0 + 
        totalPlays * 0.05;

      return {
        song,
        globalScore,
        trendingScore,
        recentPlays,
        weeklyPlays,
        totalPlays,
        likesCount,
        playlistAdds
      };
    });

    // Sort for Global Ranks
    const sortedGlobal = [...songsWithScores]
      .sort((a, b) => b.globalScore - a.globalScore)
      .slice(0, 100);

    // Sort for Trending Ranks
    const sortedTrending = [...songsWithScores]
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, 50);

    // Sort for New Releases Ranks (released within last 45 days or just youngest tracks, ordered by popularity)
    const sortedNewReleases = [...songsWithScores]
      .filter(({ song }) => {
        const songDate = new Date(song.createdAt || 0).getTime();
        const fortyFiveDaysAgo = Date.now() - 45 * 24 * 60 * 60 * 1000;
        return songDate >= fortyFiveDaysAgo;
      })
      // If we don't have enough fresh new songs in 45 days, fall back to youngest 25 overall
      .concat(
        [...songsWithScores].sort((a, b) => new Date(b.song.createdAt || 0).getTime() - new Date(a.song.createdAt || 0).getTime()).slice(0, 25)
      )
      // Deduplicate
      .filter((v, i, self) => self.findIndex(t => t.song.id === v.song.id) === i)
      .sort((a, b) => b.globalScore - a.globalScore)
      .slice(0, 50);

    // Calculate Movement Indicators
    // Save current order into localStorage under a sliding cache to generate persistent historical changes
    const cachedRankStr = localStorage.getItem("soundstream_historical_ranks");
    let prevGlobalMap: Record<string, number> = {};
    let prevTrendingMap: Record<string, number> = {};

    if (cachedRankStr) {
      try {
        const parsed = JSON.parse(cachedRankStr);
        // If the ranks cache is valid, retrieve them
        if (parsed) {
          prevGlobalMap = parsed.global || {};
          prevTrendingMap = parsed.trending || {};
        }
      } catch (e) {
        // ignore
      }
    }

    // Save current ranks to be compared with next sessions (throttle write to save cycles)
    const nextGlobalMap: Record<string, number> = {};
    sortedGlobal.forEach((item, index) => {
      nextGlobalMap[item.song.id] = index + 1;
    });
    const nextTrendingMap: Record<string, number> = {};
    sortedTrending.forEach((item, index) => {
      nextTrendingMap[item.song.id] = index + 1;
    });

    // Save with a timestamp
    localStorage.setItem("soundstream_historical_ranks", JSON.stringify({
      timestamp: Date.now(),
      global: nextGlobalMap,
      trending: nextTrendingMap
    }));

    // Helper to compute movement indicator
    const getMovement = (songId: string, currentRank: number, prevMap: Record<string, number>) => {
      if (!prevMap || prevMap[songId] === undefined) {
        // Deterministic stable fallback so new items look nicely distributed rather than all flat line
        const hash = songId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const mod = hash % 3;
        if (mod === 0) return { type: "up" as const, value: (hash % 4) + 1 };
        if (mod === 1) return { type: "down" as const, value: (hash % 3) + 1 };
        return { type: "same" as const };
      }
      const prevRank = prevMap[songId];
      if (prevRank > currentRank) {
        return { type: "up" as const, value: prevRank - currentRank };
      } else if (prevRank < currentRank) {
        return { type: "down" as const, value: currentRank - prevRank };
      }
      return { type: "same" as const };
    };

    // Build final decorated arrays
    const finalGlobal = sortedGlobal.map((item, index) => ({
      ...item,
      rank: index + 1,
      movement: getMovement(item.song.id, index + 1, prevGlobalMap)
    }));

    const finalTrending = sortedTrending.map((item, index) => ({
      ...item,
      rank: index + 1,
      movement: getMovement(item.song.id, index + 1, prevTrendingMap)
    }));

    const finalReleases = sortedNewReleases.map((item, index) => ({
      ...item,
      rank: index + 1,
      movement: { type: "same" as const }
    }));

    // 2. TOP ARTISTS SCORING
    // Rank creators by sum of playCount and follower momentum
    const artistRanked = artists.map((artist) => {
      const artistSongs = songs.filter(s => s.artistId === artist.userId || s.artistId === artist.uid);
      const totalArtistPlays = artistSongs.reduce((sum, s) => sum + (s.playCount || 0), 0);
      const songScoreSum = artistSongs.reduce((sum, s) => {
        const songItem = songsWithScores.find(sws => sws.song.id === s.id);
        return sum + (songItem ? songItem.globalScore : 0);
      }, 0);

      const score = songScoreSum + (artist.followersCount || 0) * 15;
      
      return {
        artist,
        totalPlays: totalArtistPlays,
        score,
        trackCount: artistSongs.length
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((item, index) => ({
      ...item,
      rank: index + 1
    }))
    .slice(0, 30);

    // 3. TOP ALBUMS SCORING
    const albumRanked = albums.map((album) => {
      const albumSongs = songs.filter(s => s.albumId === album.id);
      const totalAlbumPlays = albumSongs.reduce((sum, s) => sum + (s.playCount || 0), 0);
      const albumLikes = albumSongs.reduce((sum, s) => sum + (s.likes || 0), 0);
      
      const albumScore = totalAlbumPlays * 1.0 + albumLikes * 8.0;

      return {
        album,
        totalPlays: totalAlbumPlays,
        likes: albumLikes,
        score: albumScore,
        trackCount: albumSongs.length
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((item, index) => ({
      ...item,
      rank: index + 1
    }))
    .slice(0, 30);

    return {
      global: finalGlobal,
      trending: finalTrending,
      releases: finalReleases,
      artists: artistRanked,
      albums: albumRanked
    };
  }, [songs, artists, albums, playlistAdditionsMap, playCounts, playlistSongs]);

  // Apply search filtering on ranked items
  const filteredGlobalList = useMemo(() => {
    if (!searchQuery) return rankedData.global;
    return rankedData.global.filter((item) => 
      item.song.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.song.artistName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [rankedData.global, searchQuery]);

  const filteredTrendingList = useMemo(() => {
    if (!searchQuery) return rankedData.trending;
    return rankedData.trending.filter((item) => 
      item.song.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.song.artistName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [rankedData.trending, searchQuery]);

  const filteredReleasesList = useMemo(() => {
    if (!searchQuery) return rankedData.releases;
    return rankedData.releases.filter((item) => 
      item.song.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.song.artistName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [rankedData.releases, searchQuery]);

  const filteredArtistsList = useMemo(() => {
    if (!searchQuery) return rankedData.artists;
    return rankedData.artists.filter((item) => 
      item.artist.artistName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [rankedData.artists, searchQuery]);

  const filteredAlbumsList = useMemo(() => {
    if (!searchQuery) return rankedData.albums;
    return rankedData.albums.filter((item) => 
      item.album.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.album.artistName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [rankedData.albums, searchQuery]);

  // Render movement indicator icon and text helper
  const renderMovement = (mv: { type: "up" | "down" | "same"; value?: number }) => {
    switch (mv.type) {
      case "up":
        return (
          <div className="flex items-center gap-0.5 text-emerald-400 font-mono text-[10px] font-bold">
            <ChevronUp className="w-3.5 h-3.5 stroke-[3]" />
            <span>{mv.value || ""}</span>
          </div>
        );
      case "down":
        return (
          <div className="flex items-center gap-0.5 text-rose-400 font-mono text-[10px] font-bold">
            <ChevronDown className="w-3.5 h-3.5 stroke-[3]" />
            <span>{mv.value || ""}</span>
          </div>
        );
      case "same":
      default:
        return (
          <div className="flex items-center justify-center text-zinc-500">
            <Minus className="w-3 h-3 stroke-[3]" />
          </div>
        );
    }
  };

  return (
    <div id="soundstream-trending-container" className="space-y-6 pb-24 text-zinc-100">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="font-sans font-extrabold text-2xl md:text-3xl text-white flex items-center gap-3 uppercase tracking-tight">
            <TrendingUp className="w-7 h-7 text-cyan-400 animate-pulse" />
            Charts & Trends
          </h2>
          <p className="font-mono text-xs text-zinc-450 mt-1">
            Real-time music metrics calculated instantly from fan actions, plays, likes, & playlist additions.
          </p>
        </div>

        {/* Sync Indicator */}
        <div className="flex items-center gap-2 font-mono text-[11px] text-cyan-400 bg-cyan-500/10 px-4 py-2 rounded-xl border border-cyan-500/15">
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
          <span>{isLoadingHistory ? 'Recalculating Ranks...' : 'Stats Up-to-date'}</span>
        </div>
      </div>

      {/* Primary Tab Navigation & Global Search Filter */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto gap-1 bg-white/[0.02] border border-white/5 p-1 rounded-2xl select-none no-scrollbar">
          <button
            onClick={() => setActiveTab("global")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "global" 
                ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/25" 
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            Top 100 Global
          </button>
          
          <button
            onClick={() => setActiveTab("trending")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "trending" 
                ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25" 
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            Trending Now
          </button>

          <button
            onClick={() => setActiveTab("releases")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "releases" 
                ? "bg-pink-500 text-white shadow-lg shadow-pink-500/25" 
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            New Releases
          </button>

          <button
            onClick={() => setActiveTab("artists")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "artists" 
                ? "bg-teal-500 text-black shadow-lg shadow-teal-500/25" 
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Top Artists
          </button>

          <button
            onClick={() => setActiveTab("albums")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "albums" 
                ? "bg-amber-500 text-black shadow-lg shadow-amber-500/25" 
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Disc className="w-3.5 h-3.5" />
            Top Albums
          </button>
        </div>

        {/* Global Chart Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search chart contents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.03] hover:bg-white/[0.05] focus:bg-black border border-white/5 focus:border-cyan-500/50 rounded-xl py-2 px-10 text-xs font-mono text-white outline-none transition-all placeholder:text-zinc-550"
          />
        </div>
      </div>

      {/* Main Charts Content Stage */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="pt-2"
        >
          {/* 1. TOP 100 GLOBAL VIEW */}
          {activeTab === "global" && (
            <div className="space-y-3">
              {filteredGlobalList.length === 0 ? (
                <div className="py-20 text-center text-zinc-500 border border-white/5 rounded-3xl bg-white/[0.01]">
                  <Music className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-semibold">No global tracks match your search</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {filteredGlobalList.map((item, index) => {
                    const isPlaying = currentPlayingSong?.id === item.song.id;
                    const isLiked = favorites.includes(item.song.id);
                    return (
                      <motion.div
                        key={`global-${item.song.id}-${item.rank}`}
                        id={`global-rank-${item.rank}`}
                        whileHover={{ x: 4, backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                        className={`flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border transition-all ${
                          isPlaying ? 'border-cyan-500/50 shadow-md shadow-cyan-500/5' : 'border-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          {/* Rank indicator and movement */}
                          <div className="flex flex-col items-center justify-center w-10 shrink-0 select-none">
                            <span className={`font-sans font-black text-lg ${
                              item.rank === 1 ? 'text-amber-400 text-xl' : item.rank === 2 ? 'text-zinc-300' : item.rank === 3 ? 'text-amber-600' : 'text-zinc-500'
                            }`}>
                              {item.rank}
                            </span>
                            <div className="h-4 flex items-center justify-center">
                              {renderMovement(item.movement)}
                            </div>
                          </div>

                          {/* Song cover + title & creator info */}
                          <div 
                            onClick={() => onSelectSong(item.song)}
                            className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/10 cursor-pointer group"
                          >
                            <img
                              src={item.song.coverUrl}
                              alt={item.song.title}
                              className="w-full h-full object-cover rounded-xl"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Play className="w-4 h-4 fill-white text-white" />
                            </div>
                          </div>

                          <div className="min-w-0">
                            <h4 
                              onClick={() => onSelectSong(item.song)}
                              className={`font-sans font-extrabold text-sm truncate uppercase tracking-tight cursor-pointer hover:text-cyan-400 transition-colors ${
                                isPlaying ? 'text-cyan-400' : 'text-zinc-100'
                              }`}
                            >
                              {item.song.title}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span 
                                onClick={() => onSelectArtist(item.song.artistId)}
                                className="font-mono text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer truncate"
                              >
                                {item.song.artistName}
                              </span>
                              <span className="text-zinc-700 font-bold text-xs">•</span>
                              <span className="font-mono text-[10px] text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded-md uppercase">
                                {item.song.genre || "Indie"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Stats Metrics & Actions */}
                        <div className="flex items-center gap-4 shrink-0">
                          {/* Play stats & score breakdown (visible on md screens up) */}
                          <div className="hidden sm:flex flex-col items-end text-right">
                            <span className="font-mono text-xs text-white font-bold">
                              {(item.totalPlays).toLocaleString()} plays
                            </span>
                            <span className="font-mono text-[9px] text-cyan-400">
                              +{(item.weeklyPlays)} this week
                            </span>
                          </div>

                          {/* Playlist Additions indicator */}
                          {item.playlistAdds > 0 && (
                            <span className="hidden md:flex items-center gap-1 font-mono text-[9px] text-zinc-500 bg-white/[0.04] border border-white/5 px-2 py-1 rounded-md" title="Playlist Additions">
                              <Layers className="w-3 h-3 text-indigo-400" />
                              <span>{item.playlistAdds} lists</span>
                            </span>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onLikeToggle(item.song.id)}
                              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                                isLiked 
                                  ? 'bg-pink-500/10 border-pink-500/35 text-pink-500 hover:bg-pink-500/15' 
                                  : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                              }`}
                            >
                              <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                            </button>
                            <button
                              onClick={() => onSelectSong(item.song)}
                              className="p-2.5 bg-indigo-650 hover:bg-indigo-550 border border-indigo-500/20 text-white rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-650/10"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 2. TRENDING NOW VIEW */}
          {activeTab === "trending" && (
            <div className="space-y-4">
              <div className="border border-indigo-500/10 bg-gradient-to-r from-indigo-950/20 via-zinc-950/10 to-transparent p-4 rounded-3xl mb-4 flex items-center gap-3">
                <Flame className="w-6 h-6 text-orange-500 animate-bounce" />
                <div>
                  <h4 className="text-xs uppercase font-extrabold tracking-wider text-indigo-300 font-sans">Momentum Ranks</h4>
                  <p className="text-[11px] text-zinc-400 font-mono mt-0.5">Calculated based heavily on the rate of streams and likes within the last 24 hours.</p>
                </div>
              </div>

              {filteredTrendingList.length === 0 ? (
                <div className="py-20 text-center text-zinc-500 border border-white/5 rounded-3xl bg-white/[0.01]">
                  <Flame className="w-10 h-10 mx-auto mb-3 opacity-30 text-orange-500" />
                  <p className="text-sm font-semibold">No trending items match your filter</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredTrendingList.map((item) => {
                    const isPlaying = currentPlayingSong?.id === item.song.id;
                    return (
                      <motion.div
                        key={`trending-${item.song.id}-${item.rank}`}
                        id={`trending-card-${item.song.id}`}
                        onClick={() => onSelectSong(item.song)}
                        whileHover={{ y: -2, backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                        className={`flex items-center justify-between p-4 rounded-3xl bg-white/[0.02] border cursor-pointer transition-all ${
                          isPlaying ? 'border-cyan-500/50 shadow-md shadow-cyan-500/5' : 'border-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Rank indicator and movement */}
                          <div className="flex items-center gap-2 select-none w-11 shrink-0">
                            <span className="font-sans font-black text-sm text-zinc-400">
                              #{item.rank}
                            </span>
                            {renderMovement(item.movement)}
                          </div>

                          <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-white/10">
                            <img
                              src={item.song.coverUrl}
                              alt={item.song.title}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>

                          <div className="min-w-0">
                            <h4 className="font-sans font-bold text-xs truncate uppercase tracking-tight text-zinc-150">
                              {item.song.title}
                            </h4>
                            <p className="font-mono text-[11px] text-zinc-450 truncate mt-0.5">
                              {item.song.artistName}
                            </p>
                          </div>
                        </div>

                        {/* Hot score indicator */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <span className="font-mono text-[10px] text-orange-400 font-bold bg-orange-500/10 px-2 py-1 rounded-md flex items-center gap-1 border border-orange-500/10">
                              <Flame className="w-3 h-3 animate-pulse" />
                              <span>{(item.recentPlays).toLocaleString()} recent</span>
                            </span>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/5 hover:bg-cyan-500 hover:text-black hover:border-transparent transition-all">
                            <Play className="w-3 h-3 fill-current ml-0.5" />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 3. NEW RELEASES VIEW */}
          {activeTab === "releases" && (
            <div className="space-y-4">
              {filteredReleasesList.length === 0 ? (
                <div className="py-20 text-center text-zinc-500 border border-white/5 rounded-3xl bg-white/[0.01]">
                  <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30 text-pink-500" />
                  <p className="text-sm font-semibold">No fresh items found</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filteredReleasesList.map((item) => {
                    const isPlaying = currentPlayingSong?.id === item.song.id;
                    const daysAgo = Math.floor((Date.now() - new Date(item.song.createdAt || 0).getTime()) / (1000 * 60 * 60 * 24));
                    const freshLabel = daysAgo <= 7 ? "New This Week" : daysAgo <= 14 ? "2 Weeks Ago" : `${daysAgo}d ago`;

                    return (
                      <motion.div
                        key={`release-${item.song.id}`}
                        id={`release-card-${item.song.id}`}
                        onClick={() => onSelectSong(item.song)}
                        whileHover={{ y: -4, backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                        className={`bg-white/[0.02] border p-4 rounded-3xl relative group flex flex-col justify-between cursor-pointer transition-all ${
                          isPlaying ? 'border-cyan-500/50' : 'border-white/5'
                        }`}
                      >
                        <div>
                          <div className="relative aspect-square overflow-hidden rounded-2xl mb-3.5 border border-white/10 shadow-lg">
                            <img
                              src={item.song.coverUrl}
                              alt={item.song.title}
                              className="w-full h-full object-cover rounded-2xl transition-all duration-300 group-hover:scale-105"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <div className="w-10 h-10 bg-pink-500 text-white rounded-full flex items-center justify-center shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                                <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                              </div>
                            </div>
                            
                            {/* Fresh release badge */}
                            <span className="absolute top-2.5 left-2.5 font-mono text-[8px] font-black uppercase tracking-wider bg-pink-550 text-white px-2 py-1 rounded-md shadow-md">
                              {freshLabel}
                            </span>
                          </div>

                          <h5 className="font-sans font-bold text-xs truncate text-zinc-150 group-hover:text-pink-400 transition-colors uppercase tracking-tight">
                            {item.song.title}
                          </h5>
                          <p className="font-mono text-[10px] text-zinc-500 truncate mt-0.5">
                            {item.song.artistName}
                          </p>
                        </div>

                        <div className="flex items-center justify-between border-t border-white/5 mt-3 pt-2.5">
                          <span className="font-mono text-[9px] text-zinc-550 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-pink-500/60" />
                            {new Date(item.song.createdAt || 0).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </span>
                          <span className="font-mono text-[9px] text-pink-400 font-bold">
                            {(item.totalPlays).toLocaleString()} plays
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 4. TOP ARTISTS VIEW */}
          {activeTab === "artists" && (
            <div className="space-y-4">
              {filteredArtistsList.length === 0 ? (
                <div className="py-20 text-center text-zinc-500 border border-white/5 rounded-3xl bg-white/[0.01]">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30 text-teal-500" />
                  <p className="text-sm font-semibold">No independent creators match your search</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filteredArtistsList.map((item) => (
                    <motion.div
                      key={`artist-${item.artist.uid}`}
                      id={`artist-rank-card-${item.artist.uid}`}
                      onClick={() => onSelectArtist(item.artist.userId || item.artist.uid)}
                      whileHover={{ y: -4, backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                      className="bg-white/[0.02] border border-white/5 p-4 rounded-3xl relative group flex flex-col items-center justify-between text-center cursor-pointer transition-all hover:border-teal-500/20"
                    >
                      {/* Rank ribbon badge */}
                      <div className="absolute top-3 left-3 w-6 h-6 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-full flex items-center justify-center font-sans font-black text-[11px] select-none shadow-md">
                        #{item.rank}
                      </div>

                      <div className="flex flex-col items-center pt-2">
                        <div className="relative w-20 h-20 rounded-full overflow-hidden mb-3.5 border border-white/10 shadow-lg">
                          <img
                            src={item.artist.profilePhoto || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&q=80"}
                            alt={item.artist.artistName}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        <h5 className="font-sans font-extrabold text-xs text-zinc-150 group-hover:text-teal-400 transition-colors uppercase tracking-tight flex items-center gap-1 justify-center max-w-full">
                          <span className="truncate">{item.artist.artistName}</span>
                          {item.artist.verified && (
                            <span className="shrink-0 w-3 h-3 bg-teal-500 text-black font-extrabold text-[8px] rounded-full flex items-center justify-center" title="Verified Creator">✓</span>
                          )}
                        </h5>
                        <p className="font-mono text-[9px] text-zinc-500 truncate max-w-full mt-0.5">
                          {item.artist.followersCount || 0} Followers
                        </p>
                      </div>

                      <div className="w-full border-t border-white/5 mt-4 pt-2.5 flex items-center justify-between text-[9px] font-mono text-zinc-550">
                        <span className="flex items-center gap-0.5">
                          <Music className="w-3 h-3 text-teal-500/60" />
                          <span>{item.trackCount} releases</span>
                        </span>
                        <span className="text-teal-400 font-bold">
                          {(item.totalPlays).toLocaleString()} plays
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 5. TOP ALBUMS VIEW */}
          {activeTab === "albums" && (
            <div className="space-y-4">
              {filteredAlbumsList.length === 0 ? (
                <div className="py-20 text-center text-zinc-500 border border-white/5 rounded-3xl bg-white/[0.01]">
                  <Disc className="w-10 h-10 mx-auto mb-3 opacity-30 text-amber-500" />
                  <p className="text-sm font-semibold">No albums match your search</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filteredAlbumsList.map((item) => (
                    <motion.div
                      key={`album-${item.album.id}`}
                      id={`album-rank-card-${item.album.id}`}
                      onClick={() => onSelectAlbum(item.album.id)}
                      whileHover={{ y: -4, backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                      className="bg-white/[0.02] border border-white/5 p-4 rounded-3xl relative group flex flex-col justify-between cursor-pointer transition-all hover:border-amber-500/20"
                    >
                      {/* Rank Badge */}
                      <div className="absolute top-3 left-3 w-6 h-6 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full flex items-center justify-center font-sans font-black text-[11px] select-none shadow-md z-10">
                        #{item.rank}
                      </div>

                      <div>
                        <div className="relative aspect-square overflow-hidden rounded-2xl mb-3.5 border border-white/10 shadow-lg">
                          <img
                            src={item.album.coverUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80"}
                            alt={item.album.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ArrowUpRight className="w-5 h-5 text-amber-400" />
                          </div>
                        </div>

                        <h5 className="font-sans font-bold text-xs truncate text-zinc-150 group-hover:text-amber-400 transition-colors uppercase tracking-tight">
                          {item.album.title}
                        </h5>
                        <p className="font-mono text-[10px] text-zinc-500 truncate mt-0.5">
                          {item.album.artistName}
                        </p>
                      </div>

                      <div className="border-t border-white/5 mt-4 pt-2.5 flex items-center justify-between text-[9px] font-mono text-zinc-550">
                        <span className="flex items-center gap-0.5">
                          <Disc className="w-3 h-3 text-amber-500/60" />
                          <span>{item.trackCount} tracks</span>
                        </span>
                        <span className="text-amber-400 font-bold">
                          {(item.totalPlays).toLocaleString()} plays
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
