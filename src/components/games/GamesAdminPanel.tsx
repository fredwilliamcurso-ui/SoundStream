import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ShieldCheck, BarChart3, Radio, Plus, Power, Users, HelpCircle, AlertCircle, Coins, Award, Sparkles, Volume2 } from "lucide-react";
import { collection, getDocs, doc, setDoc, updateDoc, addDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

interface PlayerSession {
  id?: string;
  userId: string;
  gameId: string;
  gameName: string;
  coinsSpent: number;
  coinsEarned: number;
  createdAt: string;
  status: string;
}

export default function GamesAdminPanel() {
  const [games, setGames] = useState<any[]>([
    { id: "daily_spin", name: "Daily Spin", enabled: true, entryCost: 0, category: "Daily" },
    { id: "football_wheel", name: "Football Wheel", enabled: true, entryCost: 15, category: "Casual" },
    { id: "lucky_wheel", name: "Lucky Wheel", enabled: true, entryCost: 10, category: "Casual" },
    { id: "coin_flip", name: "Coin Flip", enabled: true, entryCost: 10, category: "Casual" },
    { id: "dice_challenge", name: "Dice Challenge", enabled: true, entryCost: 10, category: "Strategy" },
    { id: "card_match", name: "Memory Card Match", enabled: true, entryCost: 10, category: "Puzzle" },
    { id: "music_quiz", name: "Music Quiz", enabled: true, entryCost: 10, category: "Puzzle" },
    { id: "rhythm_tap", name: "Rhythm Tap", enabled: true, entryCost: 10, category: "Casual" },
    { id: "treasure_hunt", name: "Treasure Hunt", enabled: true, entryCost: 15, category: "Strategy" },
  ]);

  const [sessions, setSessions] = useState<PlayerSession[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [newGameName, setNewGameName] = useState("");
  const [newGameCategory, setNewGameCategory] = useState("Casual");
  const [newGameCost, setNewGameCost] = useState(10);
  const [announcementText, setAnnouncementText] = useState("");
  const [announceSuccess, setAnnounceSuccess] = useState(false);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const snap = await getDocs(collection(db, "game_history"));
        const list: PlayerSession[] = [];
        let spent = 0;
        let earned = 0;
        
        snap.forEach((doc) => {
          const d = { id: doc.id, ...doc.data() } as PlayerSession;
          list.push(d);
          spent += d.coinsSpent || 0;
          earned += d.coinsEarned || 0;
        });

        // Sort newest first
        const sorted = list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setSessions(sorted);
        setTotalSpent(spent);
        setTotalEarned(earned);
        setLoading(false);
      } catch (e) {
        console.warn("Could not load full admin history logs:", e);
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const handleToggleGame = (gameId: string) => {
    setGames((prev) =>
      prev.map((g) => (g.id === gameId ? { ...g, enabled: !g.enabled } : g))
    );
  };

  const handleAddNewGame = () => {
    if (!newGameName.trim()) return;
    const newId = `custom_${Date.now()}`;
    const newG = {
      id: newId,
      name: newGameName.trim(),
      enabled: true,
      entryCost: newGameCost,
      category: newGameCategory
    };
    setGames((prev) => [...prev, newG]);
    setNewGameName("");
  };

  const handleSendAnnouncement = async () => {
    if (!announcementText.trim()) return;
    try {
      await addDoc(collection(db, "notifications"), {
        userId: "all", // platform wide broadcast
        receiverId: "all",
        title: "📣 SoundStream Games HQ",
        message: announcementText.trim(),
        type: "game_announcement",
        createdAt: new Date().toISOString(),
        read: false
      });
      setAnnouncementText("");
      setAnnounceSuccess(true);
      setTimeout(() => setAnnounceSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8 bg-[#0c0c0e] border border-white/5 rounded-3xl p-6 md:p-8 max-w-5xl mx-auto font-sans text-left">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-500" /> Games HQ Administration Portal
          </h2>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mt-0.5">
            Monitor real-time gaming logs, manage payouts, and control active titles.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-500">
          SECURE SHIELD LAYER ACTIVE
        </div>
      </div>

      {/* Analytics widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-white/5 p-5 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono">Total Gaming Sessions</span>
          <h3 className="text-2xl font-black text-white mt-1 font-mono">
            {loading ? "..." : sessions.length}
          </h3>
        </div>

        <div className="bg-zinc-900 border border-white/5 p-5 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-emerald-500 font-mono">Coins Wagered (In)</span>
          <h3 className="text-2xl font-black text-emerald-400 mt-1 font-mono flex items-center gap-1.5">
            <Coins className="w-5 h-5 text-emerald-500" /> {totalSpent}
          </h3>
        </div>

        <div className="bg-zinc-900 border border-white/5 p-5 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-purple-400 font-mono">Coins Claimed (Out)</span>
          <h3 className="text-2xl font-black text-purple-400 mt-1 font-mono flex items-center gap-1.5">
            <Award className="w-5 h-5 text-purple-400" /> {totalEarned}
          </h3>
        </div>
      </div>

      {/* Grid: Games management vs broadcast announcement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Games Config */}
        <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold uppercase text-white tracking-wider flex items-center gap-2">
            <Radio className="w-4 h-4 text-indigo-400" /> Active Platform Titles
          </h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {games.map((g) => (
              <div key={g.id} className="flex items-center justify-between bg-zinc-900 border border-white/5 px-4 py-3 rounded-xl text-xs font-mono">
                <div className="flex flex-col">
                  <span className="font-bold text-white">{g.name}</span>
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest">{g.category} • Cost: {g.entryCost}c</span>
                </div>
                <button
                  onClick={() => handleToggleGame(g.id)}
                  className={`p-2 rounded-lg cursor-pointer ${
                    g.enabled 
                      ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" 
                      : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                  }`}
                >
                  <Power className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Game simulated */}
          <div className="bg-black/30 border border-white/5 rounded-xl p-3 space-y-2 text-xs">
            <p className="font-bold text-zinc-400">Add Simulated Custom Game</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newGameName}
                onChange={(e) => setNewGameName(e.target.value)}
                placeholder="Game Name"
                className="flex-1 bg-zinc-950 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
              <button
                onClick={handleAddNewGame}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded-lg cursor-pointer border-none font-bold"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Broadcast console */}
        <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase text-white tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" /> Platform-wide Broadcast
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Broadcast official games-related announcements or special promotions directly to all online user notifications instantly.
            </p>
            <textarea
              rows={4}
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="e.g. Wager multipliers are now active! Play Dice Challenge and claim up to 10x prizes tonight!"
              className="w-full bg-zinc-950 border border-white/5 rounded-xl p-3 text-xs text-white resize-none"
            />
          </div>

          <div className="space-y-2">
            {announceSuccess && (
              <p className="text-green-400 text-xs font-mono">Announcement broadcasted successfully to Firestore channels!</p>
            )}
            <button
              onClick={handleSendAnnouncement}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs uppercase py-3 rounded-xl transition-all border-none cursor-pointer"
            >
              BROADCAST TO GAMES FEED
            </button>
          </div>
        </div>
      </div>

      {/* Session Logs list */}
      <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold uppercase text-white tracking-wider flex items-center gap-2">
          <Users className="w-4 h-4 text-zinc-400" /> Live Game Session Audit Trails
        </h3>
        {loading ? (
          <p className="text-xs text-zinc-500 font-mono">Loading telemetry audit logs...</p>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-zinc-500 font-mono">No game sessions registered yet.</p>
        ) : (
          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
            {sessions.map((s) => (
              <div key={s.id} className="flex justify-between items-center bg-zinc-950 border border-white/5 p-3 rounded-xl text-xs font-mono">
                <div className="flex flex-col">
                  <span className="text-white font-bold">{s.gameName}</span>
                  <span className="text-[9px] text-zinc-500">Player ID: {s.userId.slice(0, 10)}...</span>
                </div>
                <div className="text-right">
                  <div className="flex gap-2 text-[10px]">
                    <span className="text-red-400">-{s.coinsSpent}c</span>
                    <span className="text-green-400">+{s.coinsEarned}c</span>
                  </div>
                  <span className="text-[8px] text-zinc-600 block uppercase font-mono">{new Date(s.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
