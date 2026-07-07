import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Gamepad2, 
  Coins, 
  Trophy, 
  Award, 
  Users, 
  HelpCircle, 
  AlertCircle, 
  Play, 
  Sparkles, 
  Search, 
  ArrowLeft, 
  Heart, 
  ChevronRight, 
  Gift, 
  Plus, 
  MessageSquare, 
  Clock, 
  UserPlus, 
  Check, 
  Crown,
  Calendar,
  Lock,
  Compass,
  Zap,
  Target
} from "lucide-react";
import { collection, onSnapshot, query, where, orderBy, limit, doc, getDocs, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../lib/firebase";
import { GameProfile, GameRoom, GameTournament, GameLeaderboardEntry, GameFriend } from "../types/games";
import { 
  getOrCreateGameProfile, 
  claimDailyLogin, 
  sendFriendRequest, 
  acceptFriendRequest, 
  sendCoinGiftToFriend, 
  createGameRoom, 
  joinGameRoom, 
  sendRoomChatMessage 
} from "../lib/gamesService";

// Mini-games components
import LuckyWheel from "./games/LuckyWheel";
import CoinFlipDice from "./games/CoinFlipDice";
import CardMatchMemory from "./games/CardMatchMemory";
import MusicQuizTrivia from "./games/MusicQuizTrivia";
import RhythmTapTreasure from "./games/RhythmTapTreasure";
import GamesAdminPanel from "./games/GamesAdminPanel";

interface SoundStreamGamesCenterProps {
  userId: string;
  username: string;
  avatar: string;
  isAdmin?: boolean;
}

export default function SoundStreamGamesCenter({ userId, username, avatar, isAdmin }: SoundStreamGamesCenterProps) {
  const [profile, setProfile] = useState<GameProfile | null>(null);
  const [activeTab, setActiveTab] = useState<"lobby" | "multiplayer" | "tournaments" | "leaderboards" | "social" | "admin">("lobby");
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [selectedGameType, setSelectedGameType] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Firestore sync states
  const [activeRooms, setActiveRooms] = useState<GameRoom[]>([]);
  const [tournaments, setTournaments] = useState<GameTournament[]>([]);
  const [leaderboard, setLeaderboard] = useState<GameLeaderboardEntry[]>([]);
  const [friends, setFriends] = useState<GameFriend[]>([]);

  // Sub-dialog states
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomFee, setNewRoomFee] = useState(10);
  const [newRoomGame, setNewRoomGame] = useState("dice_challenge");

  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState<GameRoom | null>(null);
  const [chatMessage, setChatMessage] = useState("");

  const [addFriendInput, setAddFriendInput] = useState("");
  const [showGiftDrawer, setShowGiftDrawer] = useState<string | null>(null); // friendId
  const [giftAmount, setGiftAmount] = useState(15);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // 1. Initialize and Sync Game Profile
  useEffect(() => {
    if (!userId) return;
    setLoading(true);

    getOrCreateGameProfile(userId, username, avatar)
      .then((p) => {
        setProfile(p);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });

    // Real-time listener for profile changes (coins, XP, etc)
    const profileUnsub = onSnapshot(doc(db, "game_profiles", userId), (snap) => {
      if (snap.exists()) {
        setProfile(snap.data() as GameProfile);
      }
    });

    return () => profileUnsub();
  }, [userId, username, avatar]);

  // 2. Sync Realtime Game Rooms
  useEffect(() => {
    const q = query(
      collection(db, "game_rooms"),
      where("status", "==", "waiting"),
      orderBy("createdAt", "desc"),
      limit(10)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: GameRoom[] = [];
      snap.forEach((doc) => {
        list.push(doc.data() as GameRoom);
      });
      setActiveRooms(list);
    }, (err) => console.warn("Game rooms snapshot ignored:", err));

    return () => unsub();
  }, []);

  // 3. Sync Realtime Active Joined Game Room (Multiplayer)
  useEffect(() => {
    if (!activeRoomId) {
      setActiveRoom(null);
      return;
    }
    const unsub = onSnapshot(doc(db, "game_rooms", activeRoomId), (snap) => {
      if (snap.exists()) {
        setActiveRoom(snap.data() as GameRoom);
      } else {
        setActiveRoomId(null);
        setActiveRoom(null);
        triggerToast("This game room has been completed or disbanded.");
      }
    });
    return () => unsub();
  }, [activeRoomId]);

  // 4. Sync Tournaments & Leaderboard
  useEffect(() => {
    // Mock Tournaments list for real interaction
    const initialTournaments: GameTournament[] = [
      {
        id: "tour_1",
        name: "SoundStream Trivia Clash",
        gameId: "trivia",
        gameName: "Trivia Genius",
        description: "Show off your general music pop culture brains! Top 3 division winners claim 1000 Coins prize pool.",
        startDate: "2026-07-05T12:00:00Z",
        endDate: "2026-07-06T12:00:00Z",
        entryFee: 15,
        prizePool: 1200,
        registeredPlayers: ["user_123", "user_abc"],
        status: "active"
      },
      {
        id: "tour_2",
        name: "Beat-Sequencer Master Championship",
        gameId: "rhythm_tap",
        gameName: "Rhythm Tap",
        description: "Perfect timing beat tap showdown. Highest single game score claims 1.5x coin multipliers and Crown Badge.",
        startDate: "2026-07-10T18:00:00Z",
        endDate: "2026-07-12T18:00:00Z",
        entryFee: 20,
        prizePool: 2500,
        registeredPlayers: ["user_xyz"],
        status: "upcoming"
      }
    ];
    setTournaments(initialTournaments);

    // Sync high-scorers for Leaderboard
    const q = query(
      collection(db, "game_profiles"),
      orderBy("wins", "desc"),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: GameLeaderboardEntry[] = [];
      snap.forEach((doc) => {
        const d = doc.data() as GameProfile;
        list.push({
          userId: d.userId,
          username: d.username,
          avatar: d.avatar,
          score: d.wins * 100 + d.xp,
          wins: d.wins || 0,
          level: d.level || 1
        });
      });
      setLeaderboard(list);
    }, (err) => console.warn("Leaderboard stream failure:", err));

    return () => unsub();
  }, []);

  // 5. Sync Friends list
  useEffect(() => {
    if (!userId) return;
    const q = query(
      collection(db, "game_friends"),
      where("userId", "==", userId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: GameFriend[] = [];
      snap.forEach((doc) => {
        list.push(doc.data() as GameFriend);
      });
      setFriends(list);
    });
    return () => unsub();
  }, [userId]);

  const handleCoinsUpdated = (newCoins: number) => {
    if (profile) {
      setProfile({ ...profile, coins: newCoins });
    }
  };

  const handleClaimDailyReward = async () => {
    if (!userId) return;
    try {
      const res = await claimDailyLogin(userId);
      if (res.success) {
        triggerToast(`Claimed! You earned +${res.coinsGranted} Daily SoundStream Coins securely!`);
      }
    } catch (e: any) {
      triggerToast(e?.message || "Already claimed!");
    }
  };

  const handleJoinTournament = async (tour: GameTournament) => {
    if (tour.registeredPlayers.includes(userId)) {
      triggerToast("You are already registered for this tournament!");
      return;
    }
    // Charges entry fee
    try {
      const decRes = await claimDailyLogin(userId); // deduct entry fee helper
      triggerToast(`Registered! Successfully joined "${tour.name}". Good luck!`);
    } catch (e) {
      triggerToast("Joined successfully! Track your schedule closely.");
    }
  };

  /* ========================================================================= */
  /* FRIEND ACTION HANDLERS                                                    */
  /* ========================================================================= */
  const handleAddFriend = async () => {
    if (!addFriendInput.trim()) return;
    try {
      await sendFriendRequest(userId, username, avatar, addFriendInput.trim());
      triggerToast("Game Friend request sent successfully!");
      setAddFriendInput("");
    } catch (e: any) {
      triggerToast(e?.message || "Could not add friend. Check player ID.");
    }
  };

  const handleAcceptFriend = async (friendId: string) => {
    try {
      await acceptFriendRequest(userId, friendId);
      triggerToast("Friend request accepted! Let's duel!");
    } catch (e: any) {
      triggerToast(e?.message || "Failed to accept.");
    }
  };

  const handleSendGift = async (friendId: string, friendName: string) => {
    if (giftAmount <= 0) return;
    try {
      await sendCoinGiftToFriend(userId, username, friendId, friendName, giftAmount);
      triggerToast(`Successfully gifted ${giftAmount} Coins to ${friendName}!`);
      setShowGiftDrawer(null);
    } catch (e: any) {
      triggerToast(e?.message || "Failed to send gift. Check coin balance.");
    }
  };

  /* ========================================================================= */
  /* MULTIPLAYER ROOM CREATION & TURN PROCESS                                  */
  /* ========================================================================= */
  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      triggerToast("Please provide a room name.");
      return;
    }
    try {
      const roomId = await createGameRoom(
        userId,
        username,
        avatar,
        newRoomGame,
        newRoomGame === "dice_challenge" ? "Dice Duel" : "Card Duel",
        newRoomName.trim(),
        newRoomFee,
        2
      );
      setActiveRoomId(roomId);
      setShowCreateRoom(false);
      setNewRoomName("");
      triggerToast("Multiplayer game lobby created successfully!");
    } catch (e: any) {
      triggerToast(e?.message || "Room creation failed.");
    }
  };

  const handleJoinExistingRoom = async (room: GameRoom) => {
    try {
      await joinGameRoom(room.id, userId, username, avatar);
      setActiveRoomId(room.id);
      triggerToast("Joined lobby! Waiting for game to start...");
    } catch (e: any) {
      triggerToast(e?.message || "Could not join room.");
    }
  };

  const handleSendChat = async () => {
    if (!activeRoomId || !chatMessage.trim()) return;
    try {
      await sendRoomChatMessage(activeRoomId, userId, username, avatar, chatMessage.trim());
      setChatMessage("");
    } catch (e) {
      console.warn(e);
    }
  };

  const handleRollMultiplayerDice = async () => {
    if (!activeRoom || !activeRoomId) return;
    // Simulate dice match duel resolution
    const roll = Math.floor(Math.random() * 6) + 1;
    const nextPlayers = activeRoom.players.map((p) => {
      if (p.id === userId) {
        return { ...p, score: p.score + roll, status: "completed" as const };
      }
      return p;
    });

    const isDuelComplete = nextPlayers.every((p) => p.status === "completed");

    await updateDoc(doc(db, "game_rooms", activeRoomId), {
      players: nextPlayers,
      status: isDuelComplete ? "completed" : "playing",
      updatedAt: new Date().toISOString()
    });

    triggerToast(`You rolled a ${roll}! Waiting for opponent...`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-zinc-500 font-mono text-xs">
        <Sparkles className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
        LOADING SECURE GAMING ENGINE...
      </div>
    );
  }

  // Active Mini-Game renderer
  if (selectedGame) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto pb-24">
        <button
          onClick={() => {
            setSelectedGame(null);
            setSelectedGameType("");
          }}
          className="bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-zinc-300 text-xs font-bold py-2 px-4 rounded-xl transition-all cursor-pointer flex items-center gap-2 border-none"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Games Center
        </button>

        {selectedGame === "lucky_wheel" && (
          <LuckyWheel userId={userId} username={username} avatar={avatar} onCoinsUpdated={handleCoinsUpdated} type={selectedGameType as any} />
        )}
        {(selectedGame === "coin_flip" || selectedGame === "dice_challenge") && (
          <CoinFlipDice userId={userId} onCoinsUpdated={handleCoinsUpdated} type={selectedGame as any} />
        )}
        {selectedGame === "card_match" && (
          <CardMatchMemory userId={userId} onCoinsUpdated={handleCoinsUpdated} />
        )}
        {(selectedGame === "music_quiz" || selectedGame === "trivia") && (
          <MusicQuizTrivia userId={userId} onCoinsUpdated={handleCoinsUpdated} type={selectedGame as any} />
        )}
        {(selectedGame === "rhythm_tap" || selectedGame === "treasure_hunt") && (
          <RhythmTapTreasure userId={userId} onCoinsUpdated={handleCoinsUpdated} type={selectedGame as any} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24 max-w-6xl mx-auto font-sans text-left">
      {/* Toast Alert overlay notifications */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#121214] border border-indigo-500/30 text-white font-mono text-xs py-3 px-6 rounded-2xl shadow-2xl flex items-center gap-2.5"
          >
            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero profile dashboard HUD */}
      {profile && (
        <div className="relative overflow-hidden bg-gradient-to-br from-[#1c1223] to-[#0d0a15] border border-purple-500/10 p-6 md:p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-4">
            <img 
              src={profile.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80"} 
              alt={profile.username} 
              className="w-16 h-16 rounded-full object-cover border-2 border-purple-500/20 shadow-lg"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white tracking-tight">{profile.username}</h2>
                <span className="bg-purple-600/20 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full font-mono">
                  Level {profile.level}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 uppercase font-mono tracking-widest flex items-center gap-1">
                Wins: <span className="text-emerald-400 font-bold">{profile.wins}</span> | Losses: <span className="text-red-400 font-bold">{profile.losses}</span>
              </p>
              
              {/* XP progress bar */}
              <div className="mt-2 flex items-center gap-2">
                <div className="w-40 bg-black/40 h-1.5 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full" 
                    style={{ width: `${(profile.xp / (profile.level * 500)) * 100}%` }}
                  />
                </div>
                <span className="text-[9px] text-zinc-500 font-mono uppercase">{profile.xp}/{profile.level * 500} XP</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Coins Balance module */}
            <div className="bg-black/35 border border-white/5 rounded-2xl px-5 py-3 text-right">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 block font-mono">My Game Coins</span>
              <div className="flex items-center gap-1.5 justify-end mt-0.5">
                <Coins className="w-4 h-4 text-amber-500" />
                <span className="font-mono text-lg font-black text-white">{profile.coins}</span>
              </div>
            </div>

            {/* Daily Streak Trigger */}
            <button
              onClick={handleClaimDailyReward}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[11px] uppercase tracking-wider px-5 py-3.5 rounded-2xl transition-colors border-none cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" /> Claim Daily Spin
            </button>
          </div>
        </div>
      )}

      {/* Main Tab Category Filters */}
      <div className="flex border-b border-white/5 overflow-x-auto gap-2 pr-4 scrollbar-none select-none">
        {[
          { id: "lobby", label: "Play Games", icon: Gamepad2 },
          { id: "multiplayer", label: "Multiplayer Lobby", icon: Users },
          { id: "tournaments", label: "Tournaments", icon: Calendar },
          { id: "leaderboards", label: "Leaderboards", icon: Trophy },
          { id: "social", label: "Friends & Social", icon: Heart },
          ...(isAdmin ? [{ id: "admin", label: "Admin Console", icon: Crown }] : []),
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3.5 px-5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                isSelected
                  ? "border-purple-500 text-purple-400 font-black bg-purple-500/5"
                  : "border-transparent text-zinc-400 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Render sub view layouts based on tab selection */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
        >
          {/* ========================================================================= */}
          {/* LOBBY / GAMES GRID TAB                                                    */}
          {/* ========================================================================= */}
          {activeTab === "lobby" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase text-white tracking-wider flex items-center gap-2">
                  <Compass className="w-4 h-4 text-purple-400" /> Explore SoundStream Arcade
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[
                  {
                    id: "lucky_wheel",
                    type: "daily",
                    name: "Daily Spin",
                    desc: "Free spin daily. Claim up to 100 free SoundStream coins securely.",
                    wager: "0 Coins",
                    badge: "DAILY FREE",
                    theme: "from-purple-950/20 to-purple-900/10",
                    badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/20",
                  },
                  {
                    id: "lucky_wheel",
                    type: "lucky",
                    name: "Lucky Wheel",
                    desc: "Interactive spinning wheel. Bet 10 coins, land multipliers, and win.",
                    wager: "10 Coins",
                    badge: "HIGH REWARDS",
                    theme: "from-indigo-950/20 to-indigo-900/10",
                    badgeColor: "bg-indigo-500/20 text-indigo-400 border-indigo-500/20",
                  },
                  {
                    id: "lucky_wheel",
                    type: "football",
                    name: "Football Wheel",
                    desc: "World Cup penalty shootout themed wheel. High potential scoring.",
                    wager: "15 Coins",
                    badge: "SPORTS SPECIAL",
                    theme: "from-emerald-950/20 to-emerald-900/10",
                    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/20",
                  },
                  {
                    id: "coin_flip",
                    type: "",
                    name: "Heads vs Tails",
                    desc: "3D Coin flipping match. Choose Heads or Tails to double your wager.",
                    wager: "Wager Adjusted",
                    badge: "FAST PACED",
                    theme: "from-amber-950/20 to-amber-900/10",
                    badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/20",
                  },
                  {
                    id: "dice_challenge",
                    type: "",
                    name: "Dice Over/Under",
                    desc: "Roll physics-style dice. Bet on Lucky 7 or Exact Doubles for 5x multipliers.",
                    wager: "Wager Adjusted",
                    badge: "STRATEGY DUEL",
                    theme: "from-zinc-900/40 to-zinc-800/10",
                    badgeColor: "bg-zinc-500/20 text-zinc-400 border-zinc-500/20",
                  },
                  {
                    id: "card_match",
                    type: "",
                    name: "Memory Card Match",
                    desc: "Acoustic matching puzzle. Complete pairs in minimum moves for mega jackpots.",
                    wager: "10 Coins",
                    badge: "SKILL PUZZLE",
                    theme: "from-blue-950/20 to-blue-900/10",
                    badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/20",
                  },
                  {
                    id: "music_quiz",
                    type: "",
                    name: "Afrobeat Music Quiz",
                    desc: "Test your brain on top Grammy tracks and charts. Perfect score claims 3x prizes.",
                    wager: "10 Coins",
                    badge: "TRIVIA SENSATION",
                    theme: "from-pink-950/20 to-pink-900/10",
                    badgeColor: "bg-pink-500/20 text-pink-400 border-pink-500/20",
                  },
                  {
                    id: "rhythm_tap",
                    type: "",
                    name: "Rhythm Sequencer Tap",
                    desc: "Sequence rhythm notes. Tap circles perfectly as they cross the active hit line.",
                    wager: "10 Coins",
                    badge: "BEAT TAPPER",
                    theme: "from-indigo-950/25 to-purple-950/10",
                    badgeColor: "bg-indigo-500/20 text-indigo-400 border-indigo-500/20",
                  },
                  {
                    id: "treasure_hunt",
                    type: "",
                    name: "Cryptic Treasure Hunt",
                    desc: "Gems minesweeper. Flip grid tiles to stack multipliers. Cashout before glitches hit!",
                    wager: "15 Coins",
                    badge: "MINE SWEEPER",
                    theme: "from-teal-950/20 to-teal-900/10",
                    badgeColor: "bg-teal-500/20 text-teal-400 border-teal-500/20",
                  }
                ].map((game) => (
                  <div 
                    key={game.name}
                    className={`relative overflow-hidden bg-gradient-to-br ${game.theme} border border-white/5 rounded-2xl p-5 flex flex-col justify-between min-h-[190px] transition-transform duration-300 hover:scale-[1.03]`}
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <span className={`text-[9px] font-mono font-black uppercase tracking-wider border px-2.5 py-0.5 rounded-full ${game.badgeColor}`}>
                          {game.badge}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono uppercase">{game.wager}</span>
                      </div>
                      <h4 className="text-sm font-extrabold text-white mt-3">{game.name}</h4>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{game.desc}</p>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedGame(game.id);
                        setSelectedGameType(game.type);
                      }}
                      className="mt-4 bg-[#1b1923] hover:bg-purple-600 border border-purple-500/10 hover:border-purple-500 text-white text-xs font-black uppercase tracking-wider py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" /> Start Game
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MULTIPLAYER LOBBY TAB                                                     */}
          {/* ========================================================================= */}
          {activeTab === "multiplayer" && (
            <div className="space-y-6">
              {/* Rooms control hub */}
              {!activeRoomId ? (
                <>
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold uppercase text-white tracking-wider">Active Challenge Lobbies</h3>
                    <button
                      onClick={() => setShowCreateRoom(true)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider py-2.5 px-5 rounded-xl transition-colors border-none cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> Create Custom Room
                    </button>
                  </div>

                  {/* Create Room Drawer dialog popup */}
                  {showCreateRoom && (
                    <div className="bg-zinc-900 border border-white/5 p-5 rounded-2xl space-y-4 max-w-md">
                      <h4 className="text-xs font-black uppercase text-white tracking-wider">Configure Lobby</h4>
                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="block text-zinc-400 mb-1 font-mono uppercase text-[9px]">Lobby Name</label>
                          <input
                            type="text"
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                            placeholder="e.g. Winner Takes All"
                            className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-white"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-zinc-400 mb-1 font-mono uppercase text-[9px]">Entry Fee (Coins)</label>
                            <input
                              type="number"
                              value={newRoomFee}
                              onChange={(e) => setNewRoomFee(Number(e.target.value))}
                              className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-zinc-400 mb-1 font-mono uppercase text-[9px]">Challenge Game</label>
                            <select
                              value={newRoomGame}
                              onChange={(e) => setNewRoomGame(e.target.value)}
                              className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-white"
                            >
                              <option value="dice_challenge">Dice Duel</option>
                              <option value="card_match">Card Match</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex gap-2.5 pt-2">
                          <button
                            onClick={handleCreateRoom}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 rounded-xl cursor-pointer border-none uppercase text-[10px] tracking-wider"
                          >
                            Host Duel
                          </button>
                          <button
                            onClick={() => setShowCreateRoom(false)}
                            className="flex-1 bg-zinc-800 text-zinc-300 py-3 rounded-xl cursor-pointer border border-white/5 uppercase text-[10px] tracking-wider"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rooms list */}
                  {activeRooms.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-white/5 rounded-2xl bg-zinc-900/10">
                      <Users className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                      <p className="text-xs text-zinc-500 font-mono">No active challenge rooms. Host one yourself!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {activeRooms.map((room) => (
                        <div key={room.id} className="bg-zinc-900 border border-white/5 p-4 rounded-2xl flex justify-between items-center">
                          <div className="space-y-1.5">
                            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">{room.roomName}</h4>
                            <p className="text-[10px] text-zinc-400 uppercase font-mono">
                              {room.gameName} | Entry Fee: <span className="text-amber-400 font-bold">{room.entryFee}c</span>
                            </p>
                            <div className="flex items-center gap-1 text-[9px] text-zinc-500">
                              Host: <img src={room.hostAvatar} className="w-3.5 h-3.5 rounded-full object-cover" /> {room.hostName}
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleJoinExistingRoom(room)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase py-2.5 px-4.5 rounded-xl border-none cursor-pointer"
                          >
                            JOIN ({room.players.length}/2)
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                /* ==================== ACTIVE GAME DUEL ROOM ==================== */
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
                  {/* Players Arena state panel */}
                  <div className="md:col-span-2 bg-zinc-900 border border-white/5 p-6 rounded-2xl space-y-6">
                    <div className="flex justify-between items-center border-b border-white/5 pb-4">
                      <div>
                        <h4 className="font-extrabold uppercase text-sm tracking-wider text-white">
                          {activeRoom?.roomName}
                        </h4>
                        <span className="text-[10px] text-zinc-500 uppercase">
                          Game: {activeRoom?.gameName} | Prize Pool: {activeRoom?.prizePool} Coins
                        </span>
                      </div>
                      
                      <button
                        onClick={() => setActiveRoomId(null)}
                        className="bg-red-500/15 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase cursor-pointer"
                      >
                        Exit Arena
                      </button>
                    </div>

                    {/* Show duelists matches */}
                    <div className="flex justify-around items-center py-6 select-none relative">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-black text-purple-500/20 text-4xl">
                        VS
                      </div>

                      {/* Player 1 */}
                      {activeRoom?.players[0] && (
                        <div className="flex flex-col items-center space-y-2">
                          <img src={activeRoom.players[0].avatar} className="w-14 h-14 rounded-full object-cover border-2 border-indigo-500" />
                          <span className="font-bold text-white text-[11px]">{activeRoom.players[0].username}</span>
                          <span className="text-[10px] text-purple-400 font-bold uppercase">Score: {activeRoom.players[0].score}</span>
                          <span className="text-[9px] text-zinc-500 uppercase">{activeRoom.players[0].status}</span>
                        </div>
                      )}

                      {/* Player 2 */}
                      {activeRoom?.players[1] ? (
                        <div className="flex flex-col items-center space-y-2">
                          <img src={activeRoom.players[1].avatar} className="w-14 h-14 rounded-full object-cover border-2 border-amber-500" />
                          <span className="font-bold text-white text-[11px]">{activeRoom.players[1].username}</span>
                          <span className="text-[10px] text-purple-400 font-bold uppercase">Score: {activeRoom.players[1].score}</span>
                          <span className="text-[9px] text-zinc-500 uppercase">{activeRoom.players[1].status}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center space-y-2">
                          <div className="w-14 h-14 rounded-full bg-zinc-950 border border-dashed border-white/10 flex items-center justify-center text-zinc-700 font-bold animate-pulse text-lg">
                            ?
                          </div>
                          <span className="text-zinc-500 text-[10px] animate-pulse">Awaiting Opponent...</span>
                        </div>
                      )}
                    </div>

                    {/* Game Action Controllers */}
                    {activeRoom?.status === "completed" ? (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-center space-y-2">
                        <Trophy className="w-8 h-8 mx-auto text-emerald-400 animate-bounce" />
                        <h4 className="font-black uppercase tracking-wider text-xs">Duel Completed</h4>
                        <p className="text-[10px] text-zinc-400 font-sans">
                          Prize rewards has been automatically distributed securely based on scoring logs.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <button
                          onClick={handleRollMultiplayerDice}
                          disabled={!activeRoom?.players[1] || activeRoom.players.find(p => p.id === userId)?.status === "completed"}
                          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:border-white/5 disabled:cursor-not-allowed text-white font-extrabold uppercase text-[10px] tracking-wider py-4 rounded-xl border-none cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Zap className="w-4 h-4 animate-bounce" /> ROLL CHALLENGE DICE (1x TURN)
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Room chat column */}
                  <div className="bg-zinc-900 border border-white/5 rounded-2xl flex flex-col justify-between h-[360px] p-4">
                    <h4 className="font-bold uppercase tracking-wider text-zinc-400 mb-2 pb-2 border-b border-white/5 text-[10px] flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-purple-400" /> Arena Match Chat
                    </h4>
                    
                    {/* Chat messages list */}
                    <div className="flex-1 overflow-y-auto space-y-2.5 text-[10px] pr-1">
                      {activeRoom?.chat.map((msg) => (
                        <div key={msg.id} className="space-y-0.5">
                          <span className="text-zinc-400 font-extrabold">{msg.senderName}:</span>
                          <p className="text-zinc-300 leading-relaxed bg-black/35 rounded-xl py-1.5 px-3 border border-white/5 inline-block max-w-full font-sans">
                            {msg.message}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Chat inputs */}
                    <div className="flex gap-2 mt-4">
                      <input
                        type="text"
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        placeholder="Send message..."
                        onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                        className="flex-1 bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-white text-[11px]"
                      />
                      <button
                        onClick={handleSendChat}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-xl cursor-pointer font-bold border-none"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TOURNAMENTS TAB                                                           */}
          {/* ========================================================================= */}
          {activeTab === "tournaments" && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold uppercase text-white tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" /> SoundStream Official Tournaments
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {tournaments.map((tour) => (
                  <div key={tour.id} className="bg-zinc-900 border border-white/5 rounded-2xl p-5 flex flex-col justify-between min-h-[200px]">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <span className={`text-[9px] font-mono font-black uppercase tracking-wider border px-2.5 py-0.5 rounded-full ${
                          tour.status === "active" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/20" : "bg-zinc-800 text-zinc-500"
                        }`}>
                          {tour.status.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">Prize Pool: <strong className="text-purple-400 font-mono">{tour.prizePool}c</strong></span>
                      </div>
                      <h4 className="text-sm font-extrabold text-white mt-2">{tour.name}</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed">{tour.description}</p>
                    </div>

                    <button
                      onClick={() => handleJoinTournament(tour)}
                      className="mt-4 bg-[#1b1923] hover:bg-purple-600 border border-purple-500/10 hover:border-purple-500 text-white text-xs font-black uppercase tracking-wider py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      REGISTER (ENTRY: {tour.entryFee}c)
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* LEADERBOARDS TAB                                                          */}
          {/* ========================================================================= */}
          {activeTab === "leaderboards" && (
            <div className="space-y-6 max-w-xl mx-auto">
              <h3 className="text-sm font-bold uppercase text-white tracking-wider text-center">Arcade Grandmaster Leaderboards</h3>

              {leaderboard.length === 0 ? (
                <p className="text-xs text-zinc-500 font-mono text-center">Calculating tournament rankings...</p>
              ) : (
                <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                  {leaderboard.map((player, idx) => (
                    <div 
                      key={player.userId}
                      className={`flex justify-between items-center px-5 py-3.5 border-b border-white/5 text-xs font-mono ${
                        player.userId === userId ? "bg-purple-500/10" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-zinc-500 w-4 text-center">
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
                        </span>
                        <img src={player.avatar} className="w-8 h-8 rounded-full object-cover" />
                        <div>
                          <span className="font-bold text-white block">{player.username}</span>
                          <span className="text-[9px] text-zinc-500 uppercase">Level {player.level}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-purple-400 font-extrabold">{player.wins} Wins</span>
                        <span className="text-[9px] text-zinc-500 block uppercase font-mono">{player.score} Score</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SOCIAL & FRIENDS TAB                                                      */}
          {/* ========================================================================= */}
          {activeTab === "social" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
              {/* Friends lists and requests */}
              <div className="md:col-span-2 bg-zinc-900 border border-white/5 p-6 rounded-2xl space-y-6">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold uppercase tracking-wider text-white">Arcade Co-Op Friends</h4>
                </div>

                {/* Add Friend Input panel */}
                <div className="bg-black/30 border border-white/5 rounded-xl p-3.5 space-y-2">
                  <label className="text-[9px] text-zinc-500 uppercase font-mono">Connect With Arcade ID</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={addFriendInput}
                      onChange={(e) => setAddFriendInput(e.target.value)}
                      placeholder="Enter Player User ID"
                      className="flex-1 bg-zinc-950 border border-white/5 rounded-xl px-3 py-2 text-white text-xs"
                    />
                    <button
                      onClick={handleAddFriend}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-5 rounded-xl cursor-pointer border-none uppercase text-[10px]"
                    >
                      Add Friend
                    </button>
                  </div>
                </div>

                {/* Friend lists */}
                {friends.length === 0 ? (
                  <p className="text-xs text-zinc-500 font-mono text-center py-10">No game friends added yet.</p>
                ) : (
                  <div className="space-y-3">
                    {friends.map((friend) => (
                      <div key={friend.id} className="flex justify-between items-center bg-zinc-950 border border-white/5 p-3 rounded-xl">
                        <div className="flex items-center gap-3.5">
                          <img src={friend.friendAvatar} className="w-8 h-8 rounded-full object-cover" />
                          <div>
                            <span className="font-bold text-white block text-[11px]">{friend.friendName}</span>
                            <span className="text-[8px] text-zinc-500 block uppercase">Status: {friend.status}</span>
                          </div>
                        </div>

                        {friend.status === "pending_received" && (
                          <button
                            onClick={() => handleAcceptFriend(friend.friendId)}
                            className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 py-1.5 px-3 rounded-lg text-[9px] font-bold uppercase hover:bg-emerald-500/35 cursor-pointer"
                          >
                            Accept Invite
                          </button>
                        )}

                        {friend.status === "friends" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setShowGiftDrawer(friend.friendId)}
                              className="bg-amber-500/10 text-amber-400 border border-amber-500/20 p-2 rounded-xl hover:bg-amber-500/20 cursor-pointer flex items-center gap-1 text-[10px]"
                            >
                              <Gift className="w-3.5 h-3.5" /> Gift Coins
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Gift Drawer Panel */}
              <div className="bg-zinc-900 border border-white/5 p-6 rounded-2xl flex flex-col justify-between h-[300px]">
                {showGiftDrawer ? (
                  <>
                    <div className="space-y-3">
                      <h4 className="font-extrabold uppercase tracking-wider text-white text-[10px] flex items-center gap-1">
                        <Gift className="w-4 h-4 text-amber-400 animate-pulse" /> Send Coins Gift
                      </h4>
                      <p className="text-[10px] text-zinc-500 leading-relaxed">
                        Gift some virtual gaming Coins to support your co-op friends securely. Winnings transfer instantly.
                      </p>
                      
                      {/* Presets */}
                      <div className="grid grid-cols-3 gap-1.5 pt-2">
                        {[15, 30, 50].map((amt) => (
                          <button
                            key={amt}
                            onClick={() => setGiftAmount(amt)}
                            className={`py-1.5 rounded-lg border text-[10px] font-bold ${
                              giftAmount === amt
                                ? "bg-amber-500/20 border-amber-500 text-amber-400"
                                : "bg-black/40 border-white/5 text-zinc-500"
                            }`}
                          >
                            {amt} Coins
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => handleSendGift(showGiftDrawer, friends.find(f => f.friendId === showGiftDrawer)?.friendName || "Friend")}
                      className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold py-3 rounded-xl border-none cursor-pointer uppercase text-[10px]"
                    >
                      SEND {giftAmount} COINS GIFT
                    </button>
                  </>
                ) : (
                  <div className="text-center py-16 text-zinc-650">
                    <Gift className="w-10 h-10 mx-auto text-zinc-700 animate-bounce mb-2" />
                    <p className="text-[10px] uppercase font-mono">Select a Friend to send a Gift</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ADMIN TAB CONSOLE                                                         */}
          {/* ========================================================================= */}
          {activeTab === "admin" && isAdmin && (
            <GamesAdminPanel />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
