import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Coins, HelpCircle, RefreshCw, Trophy, AlertCircle, Sparkles, Music, Disc, Radio, DiscAlbum, Volume2, Mic2, Star, Zap } from "lucide-react";
import { deductCoinsForGame, creditCoinsFromGame, saveGameResult } from "../../lib/gamesService";

interface CardMatchMemoryProps {
  userId: string;
  onCoinsUpdated: (newCoins: number) => void;
}

const CARD_ICONS = [
  { icon: Music, label: "Note" },
  { icon: Disc, label: "Record" },
  { icon: Radio, label: "Radio" },
  { icon: Volume2, label: "Wave" },
  { icon: Mic2, label: "Mic" },
  { icon: Star, label: "Artist" },
  { icon: Zap, label: "Beat" },
  { icon: DiscAlbum, label: "Album" },
];

interface CardState {
  id: number;
  pairId: number;
  label: string;
  IconComponent: React.ComponentType<any>;
  isFlipped: boolean;
  isMatched: boolean;
}

export default function CardMatchMemory({ userId, onCoinsUpdated }: CardMatchMemoryProps) {
  const [cards, setCards] = useState<CardState[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcomeMessage, setOutcomeMessage] = useState<string | null>(null);
  const [coinsWon, setCoinsWon] = useState<number | null>(null);

  const entryCost = 10;
  const gameId = "card_match";
  const gameName = "Memory Card Match";

  const initializeGame = () => {
    // Generate double pairs (8 * 2 = 16 cards)
    const cardList: CardState[] = [];
    CARD_ICONS.forEach((item, index) => {
      // Add first
      cardList.push({
        id: index * 2,
        pairId: index,
        label: item.label,
        IconComponent: item.icon,
        isFlipped: false,
        isMatched: false,
      });
      // Add second copy
      cardList.push({
        id: index * 2 + 1,
        pairId: index,
        label: item.label,
        IconComponent: item.icon,
        isFlipped: false,
        isMatched: false,
      });
    });

    // Shuffle
    const shuffled = cardList.sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setFlippedIndices([]);
    setMoves(0);
    setOutcomeMessage(null);
    setCoinsWon(null);
  };

  const handleStartGame = async () => {
    if (playing) return;
    setError(null);
    setOutcomeMessage(null);
    setCoinsWon(null);

    try {
      // 1. Deduct Entry Fee
      const decRes = await deductCoinsForGame(userId, entryCost, `Wager on ${gameName}`, gameId);
      onCoinsUpdated(decRes.newBalance);

      initializeGame();
      setGameStarted(true);
      setPlaying(true);
    } catch (err: any) {
      setError(err?.message || "Failed to initialize game state.");
    }
  };

  const handleCardClick = (index: number) => {
    if (!playing || cards[index].isFlipped || cards[index].isMatched || flippedIndices.length >= 2) {
      return;
    }

    // Flip card
    const updated = [...cards];
    updated[index].isFlipped = true;
    setCards(updated);

    const nextFlipped = [...flippedIndices, index];
    setFlippedIndices(nextFlipped);

    if (nextFlipped.length === 2) {
      setMoves((prev) => prev + 1);
      checkMatch(nextFlipped);
    }
  };

  const checkMatch = (flipped: number[]) => {
    const [firstIdx, secondIdx] = flipped;
    
    if (cards[firstIdx].pairId === cards[secondIdx].pairId) {
      // It's a match!
      setTimeout(() => {
        const updated = [...cards];
        updated[firstIdx].isMatched = true;
        updated[secondIdx].isMatched = true;
        setCards(updated);
        setFlippedIndices([]);

        // Check if all cards are matched (Win/End Game condition)
        if (updated.every((c) => c.isMatched)) {
          resolveGame();
        }
      }, 500);
    } else {
      // Flip back over
      setTimeout(() => {
        const updated = [...cards];
        updated[firstIdx].isFlipped = false;
        updated[secondIdx].isFlipped = false;
        setCards(updated);
        setFlippedIndices([]);
      }, 1000);
    }
  };

  const resolveGame = async () => {
    setPlaying(false);
    
    // Skill-based Payout thresholds:
    // Moves < 15: 35 Coins (3.5x payout)
    // Moves < 22: 20 Coins (2x payout)
    // Moves < 30: 12 Coins (1.2x payout)
    // Moves >= 30: 2 Coins refund
    let prize = 2;
    let tier = "Casual";
    
    if (moves < 15) {
      prize = 35;
      tier = "Acoustic Legend (3.5x)";
    } else if (moves < 22) {
      prize = 20;
      tier = "Pro Composer (2x)";
    } else if (moves < 30) {
      prize = 12;
      tier = "Regular Listener (1.2x)";
    }

    try {
      if (prize > 0) {
        const credRes = await creditCoinsFromGame(userId, prize, `Memory Card Match: ${tier}`, gameId);
        onCoinsUpdated(credRes.newBalance);
      }

      setCoinsWon(prize);
      setOutcomeMessage(`COMPLETED! You matched all pairs in ${moves} moves. Tier: ${tier}. Prize: +${prize} Coins!`);

      // Save History & XP
      await saveGameResult(
        userId,
        gameId,
        gameName,
        entryCost,
        prize,
        prize > entryCost ? "won" : "lost",
        100 - moves // Skill Score based on moves
      );

    } catch (err: any) {
      setError("Success! However, crediting coins encountered a transaction error.");
    }
  };

  return (
    <div className="bg-[#121214] border border-white/5 rounded-3xl p-6 md:p-8 max-w-xl mx-auto text-center relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="mb-6">
        <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-500" />
          Memory Card Match
        </h2>
        <p className="text-xs text-zinc-400 mt-1 uppercase tracking-widest font-mono">
          Pair the music symbols in minimum moves. Double your coins or more!
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs py-2 px-4 rounded-xl flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Main Stats bar when playing */}
      {gameStarted && (
        <div className="flex justify-between items-center bg-zinc-900/60 border border-white/5 px-4 py-2.5 rounded-2xl mb-6 font-mono text-xs">
          <span className="text-zinc-500">Moves: <strong className="text-white">{moves}</strong></span>
          <span className="text-zinc-500">Pairs Left: <strong className="text-emerald-400">{cards.filter(c => !c.isMatched).length / 2}</strong></span>
        </div>
      )}

      {/* Card Grid Layout */}
      {!gameStarted ? (
        <div className="my-12 py-6 border border-dashed border-white/10 rounded-3xl bg-zinc-900/10">
          <Music className="w-16 h-16 text-zinc-600 mx-auto mb-4 animate-bounce" />
          <h3 className="text-sm font-bold text-zinc-300">Test Your Memory Speed</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-2 mb-6">
            Entry Fee: 10 Coins. Uncover 8 music symbol pairs. Match in fewer moves for higher multiplier payouts!
          </p>
          <button
            onClick={handleStartGame}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider py-3.5 px-8 rounded-2xl transition-all cursor-pointer border-none"
          >
            START GAME (10 COINS)
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3 my-6">
          {cards.map((card, idx) => {
            const Icon = card.IconComponent;
            const flipped = card.isFlipped || card.isMatched;
            
            return (
              <div
                key={card.id}
                onClick={() => handleCardClick(idx)}
                className="aspect-square relative cursor-pointer select-none rounded-2xl overflow-hidden shadow-lg border border-white/5 transition-all duration-300 hover:scale-105"
              >
                <div
                  className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                    flipped 
                      ? "bg-zinc-800 text-emerald-400" 
                      : "bg-zinc-900 text-zinc-600 hover:bg-zinc-800"
                  }`}
                >
                  {flipped ? (
                    <Icon className="w-6 h-6 md:w-8 md:h-8" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-950/20 to-emerald-950/20 flex items-center justify-center font-mono font-bold text-lg text-emerald-500/40">
                      ?
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completion Outcome */}
      <AnimatePresence>
        {outcomeMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="my-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono"
          >
            {outcomeMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {gameStarted && !playing && (
        <button
          onClick={handleStartGame}
          className="w-full mt-4 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider py-4 rounded-2xl transition-all cursor-pointer border-none"
        >
          PLAY AGAIN (10 COINS)
        </button>
      )}
    </div>
  );
}
