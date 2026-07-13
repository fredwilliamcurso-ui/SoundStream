import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Trophy, 
  Flame, 
  Hourglass, 
  Zap, 
  Sparkles, 
  Crown, 
  Eye, 
  User, 
  AlertTriangle,
  Gift,
  Shield,
  Trash2,
  Lock
} from "lucide-react";
import { doc, onSnapshot, updateDoc, increment } from "firebase/firestore";
import { db } from "../lib/firebase";
import { LiveBattle } from "../types/battle";
import { endBattle, sendBattleGift } from "../lib/battleService";
import { DEFAULT_GIFTS, Gift as GiftType } from "../types/coins";
import GiftStoreModal from "./GiftStoreModal";

interface PKBattleArenaProps {
  battleId: string;
  currentUser: any;
  isHost: boolean;
  onExit?: () => void;
  onOpenStoreShortcut?: () => void;
}

export default function PKBattleArena({
  battleId,
  currentUser,
  isHost,
  onExit,
  onOpenStoreShortcut
}: PKBattleArenaProps) {
  const [battle, setBattle] = useState<LiveBattle | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(300);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [giftingReceiver, setGiftingReceiver] = useState<{ id: string; name: string } | null>(null);
  const [isEndingBattle, setIsEndingBattle] = useState(false);
  const [viewerCount1, setViewerCount1] = useState(128);
  const [viewerCount2, setViewerCount2] = useState(85);

  // 1. Listen to real-time PK battle updates
  useEffect(() => {
    if (!battleId) return;

    const unsubscribe = onSnapshot(doc(db, "live_battles", battleId), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as LiveBattle;
        setBattle(data);

        // Periodically adjust viewer counts randomly to simulate dynamic activity
        setViewerCount1(Math.max(10, Math.floor(100 + Math.sin(Date.now() / 50000) * 30 + Math.random() * 5)));
        setViewerCount2(Math.max(10, Math.floor(70 + Math.cos(Date.now() / 40000) * 20 + Math.random() * 5)));
      }
    }, (error) => {
      console.warn("Failed to subscribe to live battle updates:", error);
    });

    return () => unsubscribe();
  }, [battleId]);

  // 2. Handle synchronized countdown timer
  useEffect(() => {
    if (!battle || battle.status !== "active") return;

    const interval = setInterval(() => {
      const endsAtTime = new Date(battle.endsAt).getTime();
      const remaining = Math.max(0, Math.ceil((endsAtTime - Date.now()) / 1000));
      setTimeLeft(remaining);

      // Host triggers battle completion on timer expiry
      if (remaining === 0 && isHost && !isEndingBattle) {
        setIsEndingBattle(true);
        endBattle(battle.id).catch((err) => {
          console.error("Failed to automatically end battle on timer expiry:", err);
        }).finally(() => {
          setIsEndingBattle(false);
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [battle, isHost, isEndingBattle]);

  if (!battle) {
    return (
      <div className="w-full h-full bg-[#050508] flex items-center justify-center p-6 text-center">
        <div className="space-y-3 animate-pulse">
          <Hourglass className="w-10 h-10 text-indigo-500 mx-auto animate-spin" />
          <h4 className="font-extrabold uppercase text-xs tracking-widest text-zinc-400">Loading PK Battle Arena...</h4>
        </div>
      </div>
    );
  }

  // Points breakdown calculation
  const totalPoints = battle.creator1Score + battle.creator2Score;
  const c1Percentage = totalPoints === 0 ? 50 : Math.round((battle.creator1Score / totalPoints) * 100);
  const c2Percentage = totalPoints === 0 ? 50 : 100 - c1Percentage;

  // Determine leading creator
  const leadCreator = battle.creator1Score > battle.creator2Score 
    ? 1 
    : battle.creator2Score > battle.creator1Score 
      ? 2 
      : 0;

  // Trigger gifting modal
  const openGifting = (receiverId: string, receiverName: string) => {
    if (!currentUser) {
      alert("Please log in to send virtual gifts and boost scores.");
      return;
    }
    setGiftingReceiver({ id: receiverId, name: receiverName });
    setShowGiftModal(true);
  };

  // Admin ending override
  const handleAdminForceEnd = async () => {
    if (confirm("Are you sure you want to end this PK battle early as administrator?")) {
      try {
        await endBattle(battle.id, true);
        alert("Battle has been force ended.");
      } catch (e: any) {
        alert(e.message || "Failed to end battle.");
      }
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

  return (
    <div className="w-full h-full flex flex-col justify-between relative bg-black select-none">
      
      {/* Dynamic Battle Status Panel (Leader indicators, Timer) */}
      <div className="bg-[#0b0b0f]/90 border-b border-white/5 px-4 py-3 z-10 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Flame className="w-5 h-5 text-red-500 animate-pulse" />
          <span className="font-sans font-black italic uppercase tracking-tighter text-sm text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-indigo-400">
            SOUNDSTREAM PK LIVE BATTLE
          </span>
        </div>

        {/* Real-time sync timer */}
        <div className="flex items-center gap-1.5 bg-red-950/40 border border-red-500/20 px-3 py-1 rounded-full text-red-400 animate-pulse font-mono text-xs font-black">
          <Hourglass className="w-3.5 h-3.5" />
          <span>{battle.status === "active" ? formattedTime : "BATTLE ENDED"}</span>
        </div>

        {/* Administration override */}
        {currentUser?.role === "admin" && battle.status === "active" && (
          <button
            onClick={handleAdminForceEnd}
            className="bg-red-600/20 hover:bg-red-600 border border-red-500/30 text-red-400 hover:text-white px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition"
          >
            Force End (Admin)
          </button>
        )}
      </div>

      {/* Side-by-Side Dual Livestream Showcase */}
      <div className="flex-1 w-full grid grid-cols-2 bg-[#050508] relative overflow-hidden">
        {/* Creator 1 Live View (Left) */}
        <div className="relative border-r border-white/5 flex flex-col justify-between overflow-hidden">
          {/* Fallback custom visualizer or broadcast mock */}
          <div className="absolute inset-0 bg-[#07070c] flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="text-center p-4 space-y-3 z-10">
              <div className="relative inline-block mx-auto">
                <img 
                  src={battle.creator1Photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80"} 
                  alt={battle.creator1Name} 
                  className="w-16 h-16 rounded-full object-cover border-2 border-pink-500 shadow-xl"
                />
                {leadCreator === 1 && (
                  <span className="absolute -top-2.5 -right-2.5 bg-amber-500 p-1 rounded-full text-black shadow-lg border border-white/20">
                    <Crown className="w-4 h-4 fill-amber-400 text-amber-500 animate-bounce" />
                  </span>
                )}
              </div>
              <h5 className="font-extrabold text-sm uppercase tracking-tight text-white">{battle.creator1Name}</h5>
              <div className="flex items-center justify-center gap-1 text-[10px] text-pink-400 bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded-full w-max mx-auto">
                <Eye className="w-3 h-3" />
                <span>{viewerCount1.toLocaleString()} viewers</span>
              </div>
            </div>
          </div>
          
          {/* Top Score tag */}
          <div className="p-3 z-10 flex justify-between items-start">
            <span className="text-[10px] font-bold uppercase tracking-widest bg-pink-500 text-white px-2 py-0.5 rounded">
              PLAYER 1
            </span>
          </div>

          {/* Bottom quick support */}
          {battle.status === "active" && (
            <div className="p-4 z-10 flex justify-center">
              <button
                onClick={() => openGifting(battle.creator1Id, battle.creator1Name)}
                className="bg-pink-600 hover:bg-pink-500 text-white font-extrabold text-[11px] uppercase tracking-widest px-4 py-2.5 rounded-full flex items-center gap-1.5 shadow-lg shadow-pink-600/20 hover:scale-105 transition duration-300"
              >
                <Gift className="w-3.5 h-3.5 animate-bounce" />
                <span>Support {battle.creator1Name.split(" ")[0]}</span>
              </button>
            </div>
          )}
        </div>

        {/* Creator 2 Live View (Right) */}
        <div className="relative flex flex-col justify-between overflow-hidden">
          {/* Fallback custom visualizer or broadcast mock */}
          <div className="absolute inset-0 bg-[#0c070c] flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="text-center p-4 space-y-3 z-10">
              <div className="relative inline-block mx-auto">
                <img 
                  src={battle.creator2Photo || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80"} 
                  alt={battle.creator2Name} 
                  className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500 shadow-xl"
                />
                {leadCreator === 2 && (
                  <span className="absolute -top-2.5 -right-2.5 bg-amber-500 p-1 rounded-full text-black shadow-lg border border-white/20">
                    <Crown className="w-4 h-4 fill-amber-400 text-amber-500 animate-bounce" />
                  </span>
                )}
              </div>
              <h5 className="font-extrabold text-sm uppercase tracking-tight text-white">{battle.creator2Name}</h5>
              <div className="flex items-center justify-center gap-1 text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full w-max mx-auto">
                <Eye className="w-3 h-3" />
                <span>{viewerCount2.toLocaleString()} viewers</span>
              </div>
            </div>
          </div>

          {/* Top Score tag */}
          <div className="p-3 z-10 flex justify-between items-start">
            <span className="text-[10px] font-bold uppercase tracking-widest bg-indigo-500 text-white px-2 py-0.5 rounded">
              PLAYER 2
            </span>
          </div>

          {/* Bottom quick support */}
          {battle.status === "active" && (
            <div className="p-4 z-10 flex justify-center">
              <button
                onClick={() => openGifting(battle.creator2Id, battle.creator2Name)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[11px] uppercase tracking-widest px-4 py-2.5 rounded-full flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 hover:scale-105 transition duration-300"
              >
                <Gift className="w-3.5 h-3.5 animate-bounce" />
                <span>Support {battle.creator2Name.split(" ")[0]}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Real-time PK Points Battle Comparison Bar */}
      <div className="bg-[#0b0b0f] px-5 py-4 border-t border-white/5 space-y-2 z-10 shrink-0">
        <div className="flex items-center justify-between text-xs font-black uppercase font-mono">
          <div className="flex items-center gap-1.5 text-pink-500">
            <Zap className="w-4 h-4 animate-bounce" />
            <span>{battle.creator1Score.toLocaleString()} pts</span>
          </div>
          
          <div className="text-[10px] text-zinc-500 font-bold tracking-wider">
            VS
          </div>

          <div className="flex items-center gap-1.5 text-indigo-400">
            <span>{battle.creator2Score.toLocaleString()} pts</span>
            <Zap className="w-4 h-4 animate-bounce" />
          </div>
        </div>

        {/* Point Progress Bar */}
        <div className="w-full h-4 bg-zinc-900 rounded-full overflow-hidden flex border border-white/5 relative">
          <motion.div 
            className="h-full bg-gradient-to-r from-pink-600 to-pink-500 rounded-l-full relative"
            animate={{ width: `${c1Percentage}%` }}
            transition={{ type: "spring", stiffness: 60 }}
          />
          <motion.div 
            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-r-full"
            animate={{ width: `${c2Percentage}%` }}
            transition={{ type: "spring", stiffness: 60 }}
          />

          {/* Sparkle separation beam */}
          <div 
            className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_#fff] z-20"
            style={{ left: `${c1Percentage}%`, transform: "translateX(-50%)" }}
          />
        </div>
      </div>

      {/* Victory / Defeat Overlay Screens */}
      <AnimatePresence>
        {battle.status !== "active" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-md z-40 flex flex-col items-center justify-center p-6 text-center"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#0f0f16] border border-white/10 p-8 rounded-3xl max-w-sm w-full space-y-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-pink-500/10 pointer-events-none" />
              
              <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500">
                <Trophy className="w-10 h-10 animate-bounce" />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-500 font-extrabold">
                  BATTLE RESULTS
                </span>
                <h3 className="text-2xl font-black italic tracking-tight text-white uppercase leading-none">
                  {battle.winnerId === "draw" 
                    ? "IT'S A DRAW!" 
                    : battle.winnerId === battle.creator1Id 
                      ? `${battle.creator1Name} WINS!` 
                      : `${battle.creator2Name} WINS!`}
                </h3>
              </div>

              {/* Point Recap Box */}
              <div className="bg-zinc-950/60 rounded-2xl p-4 border border-white/5 divide-y divide-white/5 text-xs font-mono">
                <div className="flex justify-between py-2 text-zinc-350">
                  <span>{battle.creator1Name}</span>
                  <span className="font-bold text-pink-500">{battle.creator1Score.toLocaleString()} pts</span>
                </div>
                <div className="flex justify-between py-2 text-zinc-350">
                  <span>{battle.creator2Name}</span>
                  <span className="font-bold text-indigo-400">{battle.creator2Score.toLocaleString()} pts</span>
                </div>
              </div>

              {/* Exit CTA */}
              <button
                onClick={onExit}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-2xl text-xs uppercase font-extrabold tracking-widest transition shadow-lg shadow-indigo-600/20"
              >
                Return to Stream
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Embedded Gifting Store Modal */}
      <AnimatePresence>
        {giftingReceiver && (
          <GiftStoreModal
            isOpen={showGiftModal}
            onClose={() => {
              setShowGiftModal(false);
              setGiftingReceiver(null);
            }}
            senderId={currentUser?.uid || ""}
            senderName={currentUser?.displayName || currentUser?.email?.split("@")[0] || "Viewer"}
            senderPhoto={currentUser?.photoURL || ""}
            receiverId={giftingReceiver.id}
            receiverName={giftingReceiver.name}
            streamId={battleId}
            onOpenStoreShortcut={() => {
              setShowGiftModal(false);
              if (onOpenStoreShortcut) onOpenStoreShortcut();
            }}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
