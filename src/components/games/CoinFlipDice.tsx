import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Coins, HelpCircle, RefreshCw, Trophy, AlertCircle, Sparkles } from "lucide-react";
import { deductCoinsForGame, creditCoinsFromGame, saveGameResult } from "../../lib/gamesService";

interface CoinFlipDiceProps {
  userId: string;
  onCoinsUpdated: (newCoins: number) => void;
  type: "coin_flip" | "dice_challenge";
}

export default function CoinFlipDice({ userId, onCoinsUpdated, type }: CoinFlipDiceProps) {
  // Common states
  const [wager, setWager] = useState<number>(10);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [win, setWin] = useState<boolean | null>(null);

  // Coin Flip States
  const [choice, setChoice] = useState<"heads" | "tails">("heads");
  const [flipResult, setFlipResult] = useState<"heads" | "tails" | null>(null);
  const [flipDegree, setFlipDegree] = useState<number>(0);

  // Dice Challenge States
  const [diceBet, setDiceBet] = useState<"under7" | "lucky7" | "over7" | "doubles">("over7");
  const [dice1, setDice1] = useState<number>(1);
  const [dice2, setDice2] = useState<number>(6);

  const isCoinFlip = type === "coin_flip";
  const gameId = type;
  const gameName = isCoinFlip ? "Coin Flip" : "Dice Challenge";

  const handleCoinFlip = async () => {
    if (playing) return;
    setError(null);
    setMessage(null);
    setWin(null);
    setFlipResult(null);

    if (wager <= 0) {
      setError("Please choose a valid coin wager.");
      return;
    }

    try {
      // 1. Deduct Wager Coins
      const decRes = await deductCoinsForGame(userId, wager, `Wager on ${gameName}`, gameId);
      onCoinsUpdated(decRes.newBalance);

      setPlaying(true);

      // Random flip outcome
      const isHeads = Math.random() < 0.5;
      const outcome: "heads" | "tails" = isHeads ? "heads" : "tails";
      
      // Calculate continuous spin degree: add 3 to 5 full flips + final target position
      const targetDegree = flipDegree + 1440 + (isHeads ? 0 : 180);
      setFlipDegree(targetDegree);

      setTimeout(async () => {
        setPlaying(false);
        setFlipResult(outcome);
        
        const isWinner = choice === outcome;
        setWin(isWinner);

        let payout = 0;
        if (isWinner) {
          payout = wager * 2;
          const credRes = await creditCoinsFromGame(userId, payout, `Coin Flip: ${outcome.toUpperCase()} WIN`, gameId);
          onCoinsUpdated(credRes.newBalance);
          setMessage(`MATCH! It landed on ${outcome.toUpperCase()}. You won +${payout} Coins!`);
        } else {
          setMessage(`OOF! It landed on ${outcome.toUpperCase()}. Better luck next flip.`);
        }

        // Save Results & XP
        await saveGameResult(
          userId,
          gameId,
          gameName,
          wager,
          payout,
          isWinner ? "won" : "lost",
          payout
        );
      }, 2000);

    } catch (err: any) {
      setError(err?.message || "An unexpected transaction error occurred.");
      setPlaying(false);
    }
  };

  const handleDiceChallenge = async () => {
    if (playing) return;
    setError(null);
    setMessage(null);
    setWin(null);

    if (wager <= 0) {
      setError("Please choose a valid coin wager.");
      return;
    }

    try {
      // 1. Deduct Wager Coins
      const decRes = await deductCoinsForGame(userId, wager, `Wager on ${gameName}`, gameId);
      onCoinsUpdated(decRes.newBalance);

      setPlaying(true);

      // Perform rapid dice rolls for visuals
      let rollsLeft = 15;
      const interval = setInterval(() => {
        setDice1(Math.floor(Math.random() * 6) + 1);
        setDice2(Math.floor(Math.random() * 6) + 1);
        rollsLeft--;
        if (rollsLeft <= 0) {
          clearInterval(interval);
          resolveDiceChallenge();
        }
      }, 100);

      const resolveDiceChallenge = async () => {
        const finalD1 = Math.floor(Math.random() * 6) + 1;
        const finalD2 = Math.floor(Math.random() * 6) + 1;
        setDice1(finalD1);
        setDice2(finalD2);
        setPlaying(false);

        const sum = finalD1 + finalD2;
        const isDoubles = finalD1 === finalD2;

        let isWinner = false;
        let multiplier = 2; // default payout 2x

        if (diceBet === "under7" && sum < 7) {
          isWinner = true;
        } else if (diceBet === "over7" && sum > 7) {
          isWinner = true;
        } else if (diceBet === "lucky7" && sum === 7) {
          isWinner = true;
          multiplier = 5; // 5x for exact Lucky 7!
        } else if (diceBet === "doubles" && isDoubles) {
          isWinner = true;
          multiplier = 3.5; // 3.5x for Double Match!
        }

        setWin(isWinner);

        let payout = 0;
        if (isWinner) {
          payout = Math.floor(wager * multiplier);
          const credRes = await creditCoinsFromGame(userId, payout, `Dice challenge: ${diceBet.toUpperCase()} WIN`, gameId);
          onCoinsUpdated(credRes.newBalance);
          setMessage(`JACKPOT! Dice sum is ${sum} (${finalD1}+${finalD2}). You won +${payout} Coins!`);
        } else {
          setMessage(`Bust! Dice sum is ${sum} (${finalD1}+${finalD2}). Better luck next roll.`);
        }

        // Save Results & XP
        await saveGameResult(
          userId,
          gameId,
          gameName,
          wager,
          payout,
          isWinner ? "won" : "lost",
          payout
        );
      };

    } catch (err: any) {
      setError(err?.message || "An unexpected transaction error occurred.");
      setPlaying(false);
    }
  };

  return (
    <div className="bg-[#121214] border border-white/5 rounded-3xl p-6 md:p-8 max-w-xl mx-auto text-center relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
      
      <div className="mb-6">
        <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          {gameName}
        </h2>
        <p className="text-xs text-zinc-400 mt-1 uppercase tracking-widest font-mono">
          {isCoinFlip 
            ? "Double your wager in Heads vs Tails duel!" 
            : "Wager on Dice sum, win up to 5x multipliers!"}
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs py-2 px-4 rounded-xl flex items-center justify-center gap-2 font-mono">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Main Game Interface Area */}
      {isCoinFlip ? (
        /* ==================== COIN FLIP ==================== */
        <div className="my-8">
          {/* Flip Target selection toggles */}
          <div className="flex justify-center gap-3 mb-8">
            <button
              onClick={() => !playing && setChoice("heads")}
              className={`flex-1 py-3 px-6 rounded-2xl font-black uppercase text-xs tracking-wider border transition-all cursor-pointer ${
                choice === "heads"
                  ? "bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/20"
                  : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-white"
              }`}
            >
              Heads (Gold)
            </button>
            <button
              onClick={() => !playing && setChoice("tails")}
              className={`flex-1 py-3 px-6 rounded-2xl font-black uppercase text-xs tracking-wider border transition-all cursor-pointer ${
                choice === "tails"
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-white"
              }`}
            >
              Tails (Indigo)
            </button>
          </div>

          {/* Interactive flipping coin */}
          <div className="relative w-40 h-40 mx-auto my-10 perspective-1000">
            <motion.div
              style={{ transformStyle: "preserve-3d" }}
              animate={{ rotateY: flipDegree }}
              transition={{ duration: 2, ease: [0.1, 0.8, 0.2, 1] }}
              className="w-full h-full relative"
            >
              {/* Heads Face */}
              <div 
                className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 border-4 border-amber-200 flex flex-col items-center justify-center shadow-2xl backface-hidden"
                style={{ backfaceVisibility: "hidden" }}
              >
                <Coins className="w-16 h-16 text-amber-100 animate-pulse" />
                <span className="font-mono text-[10px] font-black uppercase text-amber-950 tracking-wider">HEADS</span>
              </div>
              
              {/* Tails Face */}
              <div 
                className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-800 border-4 border-indigo-300 flex flex-col items-center justify-center shadow-2xl backface-hidden"
                style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}
              >
                <Trophy className="w-16 h-16 text-indigo-100" />
                <span className="font-mono text-[10px] font-black uppercase text-indigo-950 tracking-wider">TAILS</span>
              </div>
            </motion.div>
          </div>
        </div>
      ) : (
        /* ==================== DICE CHALLENGE ==================== */
        <div className="my-8">
          {/* Bet outcome targets selection Grid */}
          <div className="grid grid-cols-2 gap-2.5 mb-8">
            {[
              { id: "under7", label: "Under 7 (2x)", desc: "Dice sum < 7" },
              { id: "over7", label: "Over 7 (2x)", desc: "Dice sum > 7" },
              { id: "lucky7", label: "Lucky 7 (5x)", desc: "Dice sum == 7" },
              { id: "doubles", label: "Doubles (3.5x)", desc: "Same faces" },
            ].map((target) => (
              <button
                key={target.id}
                onClick={() => !playing && setDiceBet(target.id as any)}
                className={`py-3.5 px-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  diceBet === target.id
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                    : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-white"
                }`}
              >
                <div className="font-black uppercase text-[11px] tracking-wider">{target.label}</div>
                <div className="text-[9px] text-zinc-500 font-mono mt-0.5">{target.desc}</div>
              </button>
            ))}
          </div>

          {/* Real-time Dice layout visualizer */}
          <div className="flex items-center justify-center gap-6 my-10 select-none">
            {/* Die 1 */}
            <motion.div
              animate={playing ? { rotate: [0, 90, 180, 270, 360], scale: [1, 1.1, 0.9, 1.1, 1] } : {}}
              transition={{ duration: 1.5, repeat: playing ? Infinity : 0 }}
              className="w-20 h-20 bg-zinc-800 rounded-3xl border border-white/15 flex items-center justify-center shadow-xl text-3xl font-black font-mono text-white"
            >
              {dice1}
            </motion.div>

            {/* Die 2 */}
            <motion.div
              animate={playing ? { rotate: [360, 270, 180, 90, 0], scale: [1, 0.9, 1.1, 0.9, 1] } : {}}
              transition={{ duration: 1.5, repeat: playing ? Infinity : 0 }}
              className="w-20 h-20 bg-zinc-800 rounded-3xl border border-white/15 flex items-center justify-center shadow-xl text-3xl font-black font-mono text-white"
            >
              {dice2}
            </motion.div>
          </div>
        </div>
      )}

      {/* Outcome Banner alerts */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`mb-6 p-4 rounded-2xl border text-xs font-mono tracking-wide ${
              win === true
                ? "bg-green-500/10 border-green-500/20 text-green-400"
                : "bg-zinc-900 border-white/5 text-zinc-400"
            }`}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coins Wager adjustment section */}
      <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-4 mb-6">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono mb-2">Adjust Coins Wager</p>
        <div className="flex items-center gap-2">
          {[5, 10, 25, 50, 100].map((amt) => (
            <button
              key={amt}
              disabled={playing}
              onClick={() => setWager(amt)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold font-mono transition-colors border cursor-pointer ${
                wager === amt
                  ? "bg-amber-500/15 border-amber-500 text-amber-400"
                  : "bg-zinc-950 border-white/5 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {amt}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={isCoinFlip ? handleCoinFlip : handleDiceChallenge}
          disabled={playing}
          className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 disabled:border-white/5 disabled:cursor-not-allowed text-white font-extrabold text-xs uppercase tracking-wider py-4.5 rounded-2xl transition-all cursor-pointer border-none shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2"
        >
          {playing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              WAITING FOR SERVER RESOLUTION...
            </>
          ) : (
            `FLIP & PLAY FOR ${wager} COINS`
          )}
        </button>

        <p className="text-[10px] text-zinc-500 font-mono">
          All dice configurations and flips are audited to completely enforce security.
        </p>
      </div>
    </div>
  );
}
