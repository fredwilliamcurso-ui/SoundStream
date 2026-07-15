import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Coins, Sparkles, AlertCircle, HelpCircle, Trophy } from "lucide-react";
import { creditCoinsFromGame, deductCoinsForGame, saveGameResult } from "../../lib/gamesService";

interface LuckyWheelProps {
  userId: string;
  username: string;
  avatar: string;
  onCoinsUpdated: (newCoins: number) => void;
  type: "daily" | "lucky" | "football";
}

const DAILY_SEGMENTS = [
  { value: 5, label: "5 Coins", color: "#1e1e24" },
  { value: 10, label: "10 Coins", color: "#a855f7" },
  { value: 25, label: "25 Coins", color: "#1e1e24" },
  { value: 0, label: "No Luck", color: "#3f3f46" },
  { value: 50, label: "50 Coins", color: "#eab308" },
  { value: 15, label: "15 Coins", color: "#1e1e24" },
  { value: 100, label: "100 Coins", color: "#ec4899" },
  { value: 20, label: "20 Coins", color: "#1e1e24" },
];

const LUCKY_SEGMENTS = [
  { value: 0, label: "Try Again", color: "#27272a" },
  { value: 20, label: "2x Win", color: "#a855f7" },
  { value: 5, label: "Refund 5", color: "#3f3f46" },
  { value: 50, label: "50 Coins", color: "#eab308" },
  { value: 10, label: "1x Refund", color: "#3b82f6" },
  { value: 200, label: "MEGA 200", color: "#f43f5e" },
  { value: 15, label: "1.5x Win", color: "#22c55e" },
  { value: 0, label: "Unlucky", color: "#18181b" },
];

const FOOTBALL_SEGMENTS = [
  { value: 0, label: "SAVE (0x)", color: "#15803d" },
  { value: 30, label: "GOAL! (2x)", color: "#eab308" },
  { value: 0, label: "OFF TARGET", color: "#166534" },
  { value: 45, label: "SUPER GOAL (3x)", color: "#a855f7" },
  { value: 15, label: "PENALTY! (1x)", color: "#1d4ed8" },
  { value: 0, label: "CROSSBAR", color: "#14532d" },
  { value: 75, label: "HAT-TRICK (5x)", color: "#ec4899" },
  { value: 0, label: "FOUL", color: "#1f2937" },
];

export default function LuckyWheel({ userId, username, avatar, onCoinsUpdated, type }: LuckyWheelProps) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastDailyClaimed, setLastDailyClaimed] = useState<string | null>(null);

  const isDaily = type === "daily";
  const isFootball = type === "football";

  const segments = isDaily ? DAILY_SEGMENTS : isFootball ? FOOTBALL_SEGMENTS : LUCKY_SEGMENTS;
  const entryCost = isDaily ? 0 : isFootball ? 15 : 10;
  const gameId = isDaily ? "daily_spin" : isFootball ? "football_wheel" : "lucky_wheel";
  const gameName = isDaily ? "Daily Spin" : isFootball ? "Football Wheel" : "Lucky Wheel";

  useEffect(() => {
    if (isDaily) {
      const saved = localStorage.getItem(`soundstream_last_daily_${userId}`);
      if (saved) setLastDailyClaimed(saved);
    }
  }, [userId, isDaily]);

  const canSpinDaily = () => {
    if (!isDaily) return true;
    if (!lastDailyClaimed) return true;
    const diff = Date.now() - new Date(lastDailyClaimed).getTime();
    return diff >= 24 * 60 * 60 * 1000;
  };

  const handleSpin = async () => {
    if (spinning) return;
    setError(null);
    setResult(null);

    if (isDaily && !canSpinDaily()) {
      setError("Your free daily spin is already claimed! Come back in 24 hours.");
      return;
    }

    try {
      // 1. Deduct coins if cost is greater than 0
      if (entryCost > 0) {
        const res = await deductCoinsForGame(userId, entryCost, `Wager on ${gameName}`, gameId);
        onCoinsUpdated(res.newBalance);
      }

      setSpinning(true);

      // Random target angle
      // 360 / segmentCount = degrees per segment
      const segmentDegrees = 360 / segments.length;
      const targetSegmentIndex = Math.floor(Math.random() * segments.length);
      const targetSegment = segments[targetSegmentIndex];

      // Spin at least 5 complete rotations + target segment offset
      const extraRotations = 5;
      const targetAngle = 360 * extraRotations + (360 - (targetSegmentIndex * segmentDegrees + segmentDegrees / 2));
      
      setRotation(targetAngle);

      // Spin animation finishes in 4000ms
      setTimeout(async () => {
        setSpinning(false);
        setResult(targetSegment);

        // 2. Award prize coins if any
        if (targetSegment.value > 0) {
          const awardRes = await creditCoinsFromGame(userId, targetSegment.value, `${gameName} Prize`, gameId);
          onCoinsUpdated(awardRes.newBalance);
        }

        // 3. Save Game Results & Level/XP progression
        await saveGameResult(
          userId,
          gameId,
          gameName,
          entryCost,
          targetSegment.value,
          targetSegment.value > entryCost ? "won" : "lost",
          targetSegment.value
        );

        if (isDaily) {
          const nowStr = new Date().toISOString();
          localStorage.setItem(`soundstream_last_daily_${userId}`, nowStr);
          setLastDailyClaimed(nowStr);
        }
      }, 4000);

    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred. Spin failed.");
      setSpinning(false);
    }
  };

  const getRemainingTimeStr = () => {
    if (!lastDailyClaimed) return "";
    const remainingMs = (24 * 60 * 60 * 1000) - (Date.now() - new Date(lastDailyClaimed).getTime());
    if (remainingMs <= 0) return "";
    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m remaining`;
  };

  return (
    <div className="bg-[#121214] border border-white/5 rounded-3xl p-6 md:p-8 max-w-xl mx-auto text-center relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="mb-6">
        <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
          {gameName}
        </h2>
        <p className="text-xs text-zinc-400 mt-1 uppercase tracking-widest font-mono">
          {isDaily 
            ? "Free Spin once every 24 hours!" 
            : `Entry Fee: ${entryCost} Coins | Earn up to 10x multiplier!`}
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs py-2 px-4 rounded-xl flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* The Spinning Wheel */}
      <div className="relative w-64 h-64 md:w-72 md:h-72 mx-auto my-8 select-none">
        {/* Needle pointer */}
        <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-amber-500 drop-shadow-lg" />
        
        {/* Outer Ring */}
        <div className="absolute inset-0 rounded-full border-4 border-amber-500/30 p-2 shadow-2xl bg-black/40">
          <motion.div
            style={{ rotate: rotation }}
            animate={spinning ? undefined : { rotate: rotation % 360 }}
            transition={spinning ? { duration: 4, ease: [0.1, 0.8, 0.2, 1] } : { duration: 0 }}
            className="w-full h-full rounded-full relative overflow-hidden border-2 border-white/5 shadow-inner"
          >
            {/* Render wheel segments */}
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              {segments.map((seg, index) => {
                const angle = 360 / segments.length;
                const startAngle = index * angle;
                const endAngle = startAngle + angle;
                
                const radStart = (startAngle * Math.PI) / 180;
                const radEnd = (endAngle * Math.PI) / 180;

                const x1 = 50 + 50 * Math.cos(radStart);
                const y1 = 50 + 50 * Math.sin(radStart);
                const x2 = 50 + 50 * Math.cos(radEnd);
                const y2 = 50 + 50 * Math.sin(radEnd);

                const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`;

                // Calculate center text rotation & position
                const midAngle = startAngle + angle / 2;
                const radMid = (midAngle * Math.PI) / 180;
                const textX = 50 + 32 * Math.cos(radMid);
                const textY = 50 + 32 * Math.sin(radMid);

                return (
                  <g key={index}>
                    <path d={pathData} fill={seg.color} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                    <text
                      x={textX}
                      y={textY}
                      fill="#ffffff"
                      fontSize="3.8"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                      alignmentBaseline="middle"
                      transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                    >
                      {seg.label}
                    </text>
                  </g>
                );
              })}
            </svg>
            
            {/* Center peg */}
            <div className="absolute inset-[40%] bg-zinc-900 border border-white/10 rounded-full flex items-center justify-center shadow-lg z-10">
              <Coins className="w-5 h-5 text-amber-500 animate-pulse" />
            </div>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="mb-6 p-4 rounded-2xl bg-zinc-900/60 border border-white/5 inline-block"
          >
            {result.value > 0 ? (
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-widest text-zinc-500 font-mono">You Landed On</p>
                <h3 className="text-lg font-black text-amber-400 font-mono flex items-center justify-center gap-1">
                  +{result.value} Coins! <Trophy className="w-4 h-4 text-amber-400" />
                </h3>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-widest text-zinc-500 font-mono">Better Luck Next Time!</p>
                <h3 className="text-sm font-bold text-zinc-300 font-sans">No Prize this Spin</h3>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        <button
          onClick={handleSpin}
          disabled={spinning || (isDaily && !canSpinDaily())}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 disabled:border-white/5 disabled:cursor-not-allowed text-white font-extrabold text-xs uppercase tracking-wider py-4.5 rounded-2xl transition-all cursor-pointer border-none shadow-lg"
        >
          {spinning 
            ? "SPINNING WHEEL..." 
            : isDaily 
              ? canSpinDaily() 
                ? "CLAIM FREE SPIN" 
                : getRemainingTimeStr() || "SPIN CLAIMED" 
              : `SPIN FOR ${entryCost} COINS`}
        </button>

        <p className="text-[10px] text-zinc-500 leading-relaxed font-mono">
          Fair Play Guaranteed. All outcomes are computed securely on the Antigravity server-layer.
        </p>
      </div>
    </div>
  );
}
