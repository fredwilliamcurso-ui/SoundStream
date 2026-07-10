import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Award, 
  Coins, 
  Sparkles, 
  TrendingUp, 
  Users, 
  Clock, 
  ChevronRight, 
  Crown,
  Loader2,
  Trophy,
  Flame
} from "lucide-react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { LeaderboardRecord, LeaderboardEntry } from "../types/coins";

// High-quality mock rankings as fallback for fresh installations
const MOCK_GIFTERS_RANKINGS: LeaderboardEntry[] = [
  { userId: "g1", username: "Alex_Vibe Master", value: 45200 },
  { userId: "g2", username: "BassDrop_King", value: 38100 },
  { userId: "g3", username: "MelodyQueen", value: 29500 },
  { userId: "g4", username: "SoundExplorer", value: 18400 },
  { userId: "g5", username: "LofiDreams", value: 12100 },
  { userId: "g6", username: "BeatJunkie", value: 9500 },
  { userId: "g7", username: "SynthwaveGlow", value: 7800 },
  { userId: "g8", username: "AcousticSoul", value: 5400 },
  { userId: "g9", username: "TempoWarp", value: 3200 },
  { userId: "g10", username: "GigaBass", value: 1500 }
];

const MOCK_CREATORS_RANKINGS: LeaderboardEntry[] = [
  { userId: "c1", username: "DJ Horizon", value: 32500 },
  { userId: "c2", username: "The Acoustic Trio", value: 26800 },
  { userId: "c3", username: "Cyberpunk Echoes", value: 21100 },
  { userId: "c4", username: "Chillhop Station", value: 15900 },
  { userId: "c5", username: "Neon Samurai", value: 9400 },
  { userId: "c6", username: "Vocalist Luna", value: 8100 },
  { userId: "c7", username: "Symphony Orchestrator", value: 6400 },
  { userId: "c8", username: "Rhythm Architect", value: 4900 },
  { userId: "c9", username: "Acoustic Vibe", value: 3500 },
  { userId: "c10", username: "Ambient Explorer", value: 1900 }
];

const MOCK_PK_WINNERS: LeaderboardEntry[] = [
  { userId: "pk1", username: "DJ BattleForce", value: 45 },
  { userId: "pk2", username: "VibeCrusher_Official", value: 38 },
  { userId: "pk3", username: "SirenLyrical", value: 31 },
  { userId: "pk4", username: "MC RhythmRider", value: 24 },
  { userId: "pk5", username: "SynthQueen", value: 19 },
  { userId: "pk6", username: "BeatConqueror", value: 15 },
  { userId: "pk7", username: "Melodic_Swordsman", value: 11 },
  { userId: "pk8", username: "VocalGladiator", value: 8 }
];

const MOCK_PK_GIFTERS: LeaderboardEntry[] = [
  { userId: "pkg1", username: "PK_VIP_Supporter", value: 125000 },
  { userId: "pkg2", username: "GoldenGifter_Live", value: 98000 },
  { userId: "pkg3", username: "DiamondBeats", value: 75000 },
  { userId: "pkg4", username: "LiveArena_Boss", value: 54000 },
  { userId: "pkg5", username: "PK_Funder", value: 32000 },
  { userId: "pkg6", username: "ArenaRuler_99", value: 21000 },
  { userId: "pkg7", username: "TempoGlider", value: 14500 }
];

const MOCK_PK_CREATORS: LeaderboardEntry[] = [
  { userId: "pkc1", username: "Beat_Destroyer", value: 250000 },
  { userId: "pkc2", username: "SoundStream_Star", value: 184000 },
  { userId: "pkc3", username: "Stage_Conqueror", value: 145000 },
  { userId: "pkc4", username: "Acoustic_Diva", value: 92000 },
  { userId: "pkc5", username: "RetroWave_Host", value: 64000 },
  { userId: "pkc6", username: "LoopMaster_Jack", value: 41000 },
  { userId: "pkc7", username: "LyricalFist", value: 25000 }
];

export default function SoundStreamLeaderboards() {
  const [period, setPeriod] = useState<"today" | "week" | "month" | "all">("today");
  const [boardType, setBoardType] = useState<"gifters" | "creators" | "pk-winners" | "pk-gifters" | "pk-creators">("gifters");
  const [rankings, setRankings] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const isPK = boardType.startsWith("pk-");
    const collectionName = isPK ? "battle_leaderboards" : "leaderboards";
    
    let docId: string = boardType;
    if (boardType === "pk-winners") {
      docId = `winners_${period}`;
    } else if (boardType === "pk-gifters") {
      docId = `gifters_${period}`;
    } else if (boardType === "pk-creators") {
      docId = `creators_${period}`;
    } else {
      docId = `${boardType}_${period}`;
    }

    const boardRef = doc(db, collectionName, docId);

    const unsubscribe = onSnapshot(boardRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setRankings(data.rankings || []);
      } else {
        // Fallback to high-quality mockup data
        let mockData: LeaderboardEntry[] = [];
        if (boardType === "gifters") {
          mockData = MOCK_GIFTERS_RANKINGS;
        } else if (boardType === "creators") {
          mockData = MOCK_CREATORS_RANKINGS;
        } else if (boardType === "pk-winners") {
          mockData = MOCK_PK_WINNERS;
        } else if (boardType === "pk-gifters") {
          mockData = MOCK_PK_GIFTERS;
        } else if (boardType === "pk-creators") {
          mockData = MOCK_PK_CREATORS;
        }

        const adjusted = mockData.map(r => ({ 
          ...r, 
          value: Math.round(r.value / (period === "today" ? 12 : period === "week" ? 4 : period === "month" ? 1.5 : 1)) 
        }));
        setRankings(adjusted);
      }
      setLoading(false);
    }, (error) => {
      console.warn("Leaderboards snap error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [period, boardType]);

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-6 h-6 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500 text-xs font-black relative filter drop-shadow-[0_0_5px_rgba(234,179,8,0.3)]">
            <Crown className="w-3.5 h-3.5 absolute -top-2.5 text-yellow-500 animate-bounce" />
            1
          </div>
        );
      case 2:
        return (
          <div className="w-6 h-6 rounded-full bg-zinc-300/10 border border-zinc-300/20 flex items-center justify-center text-zinc-300 text-xs font-black">
            2
          </div>
        );
      case 3:
        return (
          <div className="w-6 h-6 rounded-full bg-amber-700/10 border border-amber-700/20 flex items-center justify-center text-amber-600 text-xs font-black">
            3
          </div>
        );
      default:
        return (
          <span className="font-mono text-zinc-500 text-xs font-bold w-6 text-center">
            {rank}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 p-6 max-w-4xl mx-auto pb-24">
      
      {/* Header section */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <div className="inline-flex p-3 bg-indigo-500/10 rounded-3xl border border-indigo-500/15">
          <Trophy className="w-8 h-8 text-indigo-500 animate-bounce" />
        </div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tight">
          SoundStream Hall of Fame
        </h1>
        <p className="text-[10px] text-zinc-400 uppercase tracking-widest leading-relaxed">
          Celebrating our top supporting listeners and most gifted original audio creators.
        </p>
      </div>

      {/* Core Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-zinc-950/40 p-4 rounded-3xl border border-white/5">
        
        {/* Toggle between Leaderboard Categories */}
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={() => setBoardType("gifters")}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition flex items-center gap-1.5 border ${
              boardType === "gifters"
                ? "bg-indigo-650 text-white border-indigo-500 shadow-md shadow-indigo-600/10"
                : "bg-white/5 text-zinc-400 hover:bg-white/10 border-transparent"
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-amber-500" /> Top Gifters
          </button>
          
          <button
            onClick={() => setBoardType("creators")}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition flex items-center gap-1.5 border ${
              boardType === "creators"
                ? "bg-indigo-650 text-white border-indigo-500 shadow-md shadow-indigo-600/10"
                : "bg-white/5 text-zinc-400 hover:bg-white/10 border-transparent"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Top Creators
          </button>

          <button
            onClick={() => setBoardType("pk-winners")}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition flex items-center gap-1.5 border ${
              boardType === "pk-winners"
                ? "bg-gradient-to-r from-pink-650 to-indigo-650 text-white border-pink-500 shadow-md shadow-pink-600/10"
                : "bg-white/5 text-zinc-400 hover:bg-white/10 border-transparent"
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-yellow-400 animate-pulse" /> PK Wins
          </button>

          <button
            onClick={() => setBoardType("pk-gifters")}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition flex items-center gap-1.5 border ${
              boardType === "pk-gifters"
                ? "bg-gradient-to-r from-pink-650 to-indigo-650 text-white border-pink-500 shadow-md shadow-pink-600/10"
                : "bg-white/5 text-zinc-400 hover:bg-white/10 border-transparent"
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-orange-400 animate-pulse" /> PK Gifters
          </button>

          <button
            onClick={() => setBoardType("pk-creators")}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition flex items-center gap-1.5 border ${
              boardType === "pk-creators"
                ? "bg-gradient-to-r from-pink-650 to-indigo-650 text-white border-pink-500 shadow-md shadow-pink-600/10"
                : "bg-white/5 text-zinc-400 hover:bg-white/10 border-transparent"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-400 animate-pulse" /> PK Creators
          </button>
        </div>

        {/* Toggle Periods */}
        <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5">
          {(["today", "week", "month", "all"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition ${
                period === p 
                  ? "bg-zinc-800 text-white" 
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

      </div>

      {/* Rankings List Board */}
      <div className="bg-zinc-900/10 border border-white/5 rounded-3xl p-5 min-h-[300px]">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Syncing Leaderboard...</p>
          </div>
        ) : rankings.length === 0 ? (
          <div className="py-24 text-center space-y-2">
            <Award className="w-10 h-10 text-zinc-600 mx-auto" />
            <h4 className="text-zinc-400 text-sm font-bold uppercase">No rankings logged yet</h4>
            <p className="text-xs text-zinc-500">Be the first to send a virtual gift to claim rank 1!</p>
          </div>
        ) : (
          <div className="space-y-2 max-w-2xl mx-auto">
            {rankings.map((entry, index) => {
              const rank = index + 1;
              return (
                <motion.div
                  key={entry.userId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition duration-300 ${
                    rank === 1 
                      ? "bg-yellow-500/[0.02] border-yellow-500/10 hover:bg-yellow-500/[0.04]" 
                      : rank === 2 
                      ? "bg-zinc-300/[0.01] border-zinc-300/10 hover:bg-zinc-300/[0.03]" 
                      : "bg-white/[0.01] border-white/5 hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Rank Badge */}
                    <div className="shrink-0 w-8 flex justify-center">
                      {getRankBadge(rank)}
                    </div>

                    {/* Avatar */}
                    {entry.photoURL ? (
                      <img 
                        src={entry.photoURL} 
                        alt="" 
                        className="w-8 h-8 rounded-full object-cover border border-white/10"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#1e1b29] flex items-center justify-center text-[10px] font-black text-indigo-400 border border-white/5 shrink-0 uppercase">
                        {entry.username.slice(0, 2)}
                      </div>
                    )}

                    {/* Username */}
                    <p className="text-xs font-extrabold text-white truncate">
                      {entry.username}
                    </p>
                  </div>

                  {/* Stat value */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-sm font-black text-white">
                      {entry.value.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                      {boardType === "gifters" 
                        ? "⚡Coins" 
                        : boardType === "creators" 
                          ? "💎Diamonds" 
                          : boardType === "pk-winners" 
                            ? "🏆Wins" 
                            : boardType === "pk-gifters" 
                              ? "⚡Coins" 
                              : "⚔️Points"}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
