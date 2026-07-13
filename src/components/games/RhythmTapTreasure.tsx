import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Coins, HelpCircle, RefreshCw, Trophy, AlertCircle, Sparkles, Check, X, ShieldAlert, Sparkle, Gem, Play, Pause } from "lucide-react";
import { deductCoinsForGame, creditCoinsFromGame, saveGameResult } from "../../lib/gamesService";

interface RhythmTapTreasureProps {
  userId: string;
  onCoinsUpdated: (newCoins: number) => void;
  type: "rhythm_tap" | "treasure_hunt";
}

// Treasure Hunt Grid Tile Model
interface TreasureTile {
  id: number;
  isFlipped: boolean;
  type: "coin" | "multiplier" | "glitch"; // glitch = mine!
  value: number;
}

export default function RhythmTapTreasure({ userId, onCoinsUpdated, type }: RhythmTapTreasureProps) {
  // Common states
  const [playing, setPlaying] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcomeMessage, setOutcomeMessage] = useState<string | null>(null);

  const isRhythm = type === "rhythm_tap";
  const gameId = type;
  const gameName = isRhythm ? "SoundStream Rhythm Tap" : "Cryptic Treasure Hunt";
  const entryCost = isRhythm ? 10 : 15;

  /* ========================================================================= */
  /* TREASURE HUNT STATES                                                      */
  /* ========================================================================= */
  const [grid, setGrid] = useState<TreasureTile[]>([]);
  const [accumulatedCoins, setAccumulatedCoins] = useState(0);
  const [multipliersCount, setMultipliersCount] = useState(1.0);
  const [uncoveredCount, setUncoveredCount] = useState(0);

  const initTreasureHunt = () => {
    // 25 Tiles (5x5 grid)
    // 4 Glitches (mines), 3 Multipliers, 18 Coins
    const tiles: TreasureTile[] = [];
    const positions = Array.from({ length: 25 }, (_, i) => i);
    
    // Shuffle positions to place types randomly
    const shuffledPos = [...positions].sort(() => Math.random() - 0.5);
    const glitchPos = shuffledPos.slice(0, 4);
    const multPos = shuffledPos.slice(4, 7);

    for (let i = 0; i < 25; i++) {
      if (glitchPos.includes(i)) {
        tiles.push({ id: i, isFlipped: false, type: "glitch", value: 0 });
      } else if (multPos.includes(i)) {
        tiles.push({ id: i, isFlipped: false, type: "multiplier", value: 1.5 });
      } else {
        const coinVal = Math.floor(Math.random() * 6) + 3; // 3 to 8 coins base
        tiles.push({ id: i, isFlipped: false, type: "coin", value: coinVal });
      }
    }
    setGrid(tiles);
    setAccumulatedCoins(0);
    setMultipliersCount(1.0);
    setUncoveredCount(0);
    setOutcomeMessage(null);
  };

  const handleTileClick = async (tileId: number) => {
    if (!playing || grid[tileId].isFlipped) return;

    const clicked = { ...grid[tileId], isFlipped: true };
    const nextGrid = [...grid];
    nextGrid[tileId] = clicked;
    setGrid(nextGrid);

    if (clicked.type === "glitch") {
      // Ouch! Glitch triggered. Game over, lose accumulated coins
      setPlaying(false);
      setOutcomeMessage("Bust! You triggered a glitch. Accumulated treasure is lost.");
      
      // Save game history with 0 payout
      await saveGameResult(
        userId,
        gameId,
        gameName,
        entryCost,
        0,
        "lost",
        uncoveredCount * 5
      );
    } else if (clicked.type === "multiplier") {
      setMultipliersCount((prev) => Number((prev * clicked.value).toFixed(2)));
      setUncoveredCount((prev) => prev + 1);
    } else {
      // Coin
      setAccumulatedCoins((prev) => prev + clicked.value);
      setUncoveredCount((prev) => prev + 1);
    }
  };

  const handleCashout = async () => {
    if (!playing) return;
    setPlaying(false);

    const finalPayout = Math.floor(accumulatedCoins * multipliersCount);

    try {
      if (finalPayout > 0) {
        const credRes = await creditCoinsFromGame(userId, finalPayout, "Cryptic Treasure Cashout", gameId);
        onCoinsUpdated(credRes.newBalance);
      }

      setOutcomeMessage(`CASHOUT SUCCESS! You claimed your accrued treasure of ${finalPayout} Coins securely.`);

      // Save game history
      await saveGameResult(
        userId,
        gameId,
        gameName,
        entryCost,
        finalPayout,
        finalPayout > entryCost ? "won" : "lost",
        uncoveredCount * 10
      );
    } catch (e) {
      setError("Payment transfer failed.");
    }
  };


  /* ========================================================================= */
  /* RHYTHM TAP STATES                                                         */
  /* ========================================================================= */
  const [tapScore, setTapScore] = useState(0);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(-1);
  const [activeLane, setActiveLane] = useState<number | null>(null);
  const [rhythmCombo, setRhythmCombo] = useState(0);
  const gameTimerRef = useRef<any>(null);

  // Lanes: 0 (Left), 1 (Middle), 2 (Right)
  const runRhythmTapLoop = () => {
    let index = 0;
    const maxNotes = 15;
    setTapScore(0);
    setRhythmCombo(0);

    const triggerNote = () => {
      if (index >= maxNotes) {
        resolveRhythmGame();
        return;
      }
      const randomLane = Math.floor(Math.random() * 3);
      setActiveLane(randomLane);
      setCurrentNoteIndex(index);
      index++;

      // Perfect timing window of 1300ms
      gameTimerRef.current = setTimeout(() => {
        // missed circle
        setActiveLane(null);
        setRhythmCombo(0);
        triggerNote();
      }, 1400);
    };

    triggerNote();
  };

  const handleTapLane = (laneIndex: number) => {
    if (!playing || activeLane === null) return;

    if (laneIndex === activeLane) {
      // HIT!
      clearTimeout(gameTimerRef.current);
      setTapScore((prev) => prev + 10 + rhythmCombo * 2);
      setRhythmCombo((prev) => prev + 1);
      setActiveLane(null);
    } else {
      // Missed lane tap
      setRhythmCombo(0);
    }
  };

  const resolveRhythmGame = async () => {
    setPlaying(false);
    
    // Rhythm Payouts based on final score:
    // Score > 150: 30 Coins (3x payout!)
    // Score > 100: 18 Coins (1.8x payout)
    // Score > 60: 10 Coins (Refund/1x)
    // Score <= 60: 0
    let prize = 0;
    let tier = "Trainee";

    if (tapScore >= 140) {
      prize = 30;
      tier = "Perfect BeatMaster (3x)";
    } else if (tapScore >= 100) {
      prize = 18;
      tier = "Acoustic Sensation (1.8x)";
    } else if (tapScore >= 50) {
      prize = 10;
      tier = "Regular Drummer (1x)";
    }

    try {
      if (prize > 0) {
        const credRes = await creditCoinsFromGame(userId, prize, `Rhythm Tap: ${tier}`, gameId);
        onCoinsUpdated(credRes.newBalance);
      }

      setOutcomeMessage(`COMPLETED! Final Rhythm Score: ${tapScore} Points. Tier: ${tier}. Prize: +${prize} Coins!`);

      // Save History & XP
      await saveGameResult(
        userId,
        gameId,
        gameName,
        entryCost,
        prize,
        prize > entryCost ? "won" : "lost",
        Math.min(100, tapScore)
      );
    } catch (e) {
      setError("Failed to transfer winnings.");
    }
  };

  // Helper trigger
  const handleStartRhythm = async () => {
    if (playing) return;
    setError(null);
    setOutcomeMessage(null);
    setTapScore(0);

    try {
      const decRes = await deductCoinsForGame(userId, entryCost, `Wager on ${gameName}`, gameId);
      onCoinsUpdated(decRes.newBalance);

      setGameStarted(true);
      setPlaying(true);
      
      // Delay slightly for visual pacing before notes start scrolling
      setTimeout(() => {
        runRhythmTapLoop();
      }, 1000);

    } catch (err: any) {
      setError(err?.message || "Failed to initiate rhythm transaction.");
    }
  };

  const handleStartTreasure = async () => {
    if (playing) return;
    setError(null);
    setOutcomeMessage(null);

    try {
      const decRes = await deductCoinsForGame(userId, entryCost, `Wager on ${gameName}`, gameId);
      onCoinsUpdated(decRes.newBalance);

      initTreasureHunt();
      setGameStarted(true);
      setPlaying(true);
    } catch (err: any) {
      setError(err?.message || "Failed to initiate treasure transaction.");
    }
  };

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (gameTimerRef.current) {
        clearTimeout(gameTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-[#121214] border border-white/5 rounded-3xl p-6 md:p-8 max-w-xl mx-auto text-center relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="mb-6">
        <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          {gameName}
        </h2>
        <p className="text-xs text-zinc-400 mt-1 uppercase tracking-widest font-mono">
          {isRhythm 
            ? "Tap the soundwave beats in sync! Earn up to 3x coins!"
            : "Flip tiles to collect multipliers. Cashout before hit glitches!"}
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs py-2 px-4 rounded-xl flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* RHYTHM TAP COMPONENT LAYOUT */}
      {isRhythm && (
        <div className="my-4">
          {!gameStarted ? (
            <div className="my-12 py-6 border border-dashed border-white/10 rounded-3xl bg-zinc-900/10">
              <Sparkle className="w-16 h-16 text-zinc-650 mx-auto mb-4 animate-bounce" />
              <h3 className="text-sm font-bold text-zinc-300">Tap to the Rhythm Beats</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-2 mb-6 font-sans">
                Entry Fee: 10 Coins. Wait for the glow circle to align perfectly in the lane lanes, then click or tap it!
              </p>
              <button
                onClick={handleStartRhythm}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider py-3.5 px-8 rounded-2xl transition-all cursor-pointer border-none"
              >
                START BEAT GAME (10 COINS)
              </button>
            </div>
          ) : (
            <div>
              {/* Stats panel */}
              <div className="flex justify-between items-center bg-zinc-900/60 border border-white/5 px-4 py-3 rounded-2xl mb-8 font-mono text-xs">
                <span className="text-zinc-500">Combo Streak: <strong className="text-amber-400">{rhythmCombo}x</strong></span>
                <span className="text-zinc-500 font-bold">Score: <strong className="text-indigo-400">{tapScore} pts</strong></span>
              </div>

              {/* The 3 Rhythm lanes falling down */}
              <div className="grid grid-cols-3 gap-4 h-64 bg-zinc-950/60 rounded-3xl border border-white/5 p-4 relative overflow-hidden mb-6">
                {[0, 1, 2].map((lane) => {
                  const isActive = activeLane === lane;
                  return (
                    <div 
                      key={lane}
                      onClick={() => handleTapLane(lane)}
                      className="h-full relative border-r border-l border-white/5 flex flex-col justify-end pb-4 items-center cursor-pointer select-none group"
                    >
                      {/* Lane line indicator */}
                      <div className="absolute inset-y-0 w-0.5 bg-indigo-500/10 group-hover:bg-indigo-500/20" />

                      {/* Moving Note circle */}
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            initial={{ y: -200, opacity: 0, scale: 0.6 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ scale: 1.4, opacity: 0 }}
                            className="absolute bottom-16 w-14 h-14 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center border-2 border-white/20 shadow-xl shadow-indigo-600/30"
                          >
                            <div className="w-6 h-6 rounded-full bg-white/40 animate-ping" />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* The Hit Zone Plate at bottom */}
                      <div className="w-16 h-8 rounded-xl border border-dashed border-indigo-500/35 bg-indigo-500/5 flex items-center justify-center text-[9px] font-mono font-bold text-indigo-400/60">
                        TAP
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TREASURE HUNT LAYOUT */}
      {!isRhythm && (
        <div className="my-4">
          {!gameStarted ? (
            <div className="my-12 py-6 border border-dashed border-white/10 rounded-3xl bg-zinc-900/10">
              <Gem className="w-16 h-16 text-emerald-500 mx-auto mb-4 animate-bounce" />
              <h3 className="text-sm font-bold text-zinc-300">Minefield Treasure Sweeper</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-2 mb-6 font-sans">
                Entry Fee: 15 Coins. Flip cards in the 5x5 grid to find gems and multipliers. Cashout early before you hit a system glitch!
              </p>
              <button
                onClick={handleStartTreasure}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider py-3.5 px-8 rounded-2xl transition-all cursor-pointer border-none"
              >
                START TREASURE HUNT (15 COINS)
              </button>
            </div>
          ) : (
            <div>
              {/* Stats and Cashout layout bar */}
              <div className="flex justify-between items-center bg-zinc-900/60 border border-white/5 px-4 py-3 rounded-2xl mb-6 font-mono text-xs">
                <span className="text-zinc-500">Accrued: <strong className="text-amber-400">{accumulatedCoins} Coins</strong></span>
                <span className="text-zinc-500">Multiplier: <strong className="text-indigo-400">{multipliersCount}x</strong></span>
                <button
                  disabled={!playing || accumulatedCoins === 0}
                  onClick={handleCashout}
                  className="bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-black px-4 py-1.5 rounded-xl text-xs font-extrabold uppercase transition-all border-none cursor-pointer"
                >
                  CASHOUT ({Math.floor(accumulatedCoins * multipliersCount)})
                </button>
              </div>

              {/* Grid 5x5 */}
              <div className="grid grid-cols-5 gap-2 max-w-sm mx-auto my-4">
                {grid.map((tile) => {
                  const flipped = tile.isFlipped;
                  const isCoin = tile.type === "coin";
                  const isMult = tile.type === "multiplier";
                  const isGlitch = tile.type === "glitch";

                  let innerStyle = "bg-zinc-900 text-zinc-600 hover:bg-zinc-800";
                  if (flipped) {
                    if (isGlitch) innerStyle = "bg-red-500/25 text-red-400 border-red-500/30";
                    else if (isMult) innerStyle = "bg-purple-500/20 text-purple-400 border-purple-500/30";
                    else innerStyle = "bg-amber-500/15 text-amber-400 border-amber-500/20";
                  }

                  return (
                    <div
                      key={tile.id}
                      onClick={() => handleTileClick(tile.id)}
                      className={`aspect-square border border-white/5 rounded-xl cursor-pointer flex items-center justify-center transition-all ${innerStyle}`}
                    >
                      {flipped ? (
                        isGlitch ? (
                          <ShieldAlert className="w-5 h-5" />
                        ) : isMult ? (
                          <span className="text-[10px] font-black font-mono">+{tile.value}x</span>
                        ) : (
                          <Coins className="w-4 h-4" />
                        )
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Outcomes message */}
      <AnimatePresence>
        {outcomeMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`my-6 p-4 rounded-2xl border text-xs font-mono ${
              outcomeMessage.includes("Bust") 
                ? "bg-red-500/10 border-red-500/20 text-red-400" 
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            }`}
          >
            {outcomeMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {gameStarted && !playing && (
        <button
          onClick={isRhythm ? handleStartRhythm : handleStartTreasure}
          className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold text-xs uppercase tracking-wider py-4 rounded-2xl transition-all cursor-pointer border-none"
        >
          PLAY AGAIN
        </button>
      )}
    </div>
  );
}
