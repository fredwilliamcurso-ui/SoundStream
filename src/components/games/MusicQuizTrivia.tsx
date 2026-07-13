import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Coins, HelpCircle, RefreshCw, Trophy, AlertCircle, Sparkles, Check, X, Clock } from "lucide-react";
import { deductCoinsForGame, creditCoinsFromGame, saveGameResult } from "../../lib/gamesService";

interface MusicQuizTriviaProps {
  userId: string;
  onCoinsUpdated: (newCoins: number) => void;
  type: "music_quiz" | "trivia";
}

interface TriviaQuestion {
  id: number;
  question: string;
  options: string[];
  answerIndex: number;
}

const MUSIC_QUESTIONS: TriviaQuestion[] = [
  {
    id: 1,
    question: "Which Afrobeat artist won a Grammy Award for his album 'Twice as Tall'?",
    options: ["Wizkid", "Davido", "Burna Boy", "Rema"],
    answerIndex: 2,
  },
  {
    id: 2,
    question: "What is the debut hit single that launched Wizkid into global fame?",
    options: ["Essence", "Holla at Your Boy", "Ojuelegba", "Come Closer"],
    answerIndex: 1,
  },
  {
    id: 3,
    question: "Which of these tracks is sung by Davido?",
    options: ["Ye", "Last Last", "Fall", "Soso"],
    answerIndex: 2,
  },
  {
    id: 4,
    question: "Who holds the record for the most-watched Afrobeat music video on YouTube for 'Calm Down'?",
    options: ["Wema", "Rema", "Asake", "Omah Lay"],
    answerIndex: 1,
  },
  {
    id: 5,
    question: "Which female artist collaborated with Wizkid on the global smash hit 'Essence'?",
    options: ["Tiwa Savage", "Tems", "Simi", "Ayra Starr"],
    answerIndex: 1,
  }
];

const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  {
    id: 1,
    question: "Which music instrument has 88 keys?",
    options: ["Guitar", "Piano", "Violin", "Synthesizer"],
    answerIndex: 1,
  },
  {
    id: 2,
    question: "Who is widely recognized as the 'King of Pop'?",
    options: ["Michael Jackson", "Prince", "Elvis Presley", "Stevie Wonder"],
    answerIndex: 0,
  },
  {
    id: 3,
    question: "In what decade did hip-hop originate in the Bronx, New York?",
    options: ["1960s", "1970s", "1980s", "1990s"],
    answerIndex: 1,
  },
  {
    id: 4,
    question: "Which legendary reggae artist sang 'Three Little Birds'?",
    options: ["Bob Marley", "Peter Tosh", "Jimmy Cliff", "Lucky Dube"],
    answerIndex: 0,
  },
  {
    id: 5,
    question: "How many members are there in the famous K-Pop group BTS?",
    options: ["5", "6", "7", "9"],
    answerIndex: 2,
  }
];

export default function MusicQuizTrivia({ userId, onCoinsUpdated, type }: MusicQuizTriviaProps) {
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(12);
  const [playing, setPlaying] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcomeMessage, setOutcomeMessage] = useState<string | null>(null);

  const entryCost = 10;
  const gameId = type;
  const gameName = type === "music_quiz" ? "Music Quiz Challenge" : "Trivia Genius";

  useEffect(() => {
    setQuestions(type === "music_quiz" ? MUSIC_QUESTIONS : TRIVIA_QUESTIONS);
  }, [type]);

  // Timer loop when active
  useEffect(() => {
    if (!playing || selectedOptionIndex !== null) return;

    if (timeLeft <= 0) {
      handleNextQuestion(true); // timeout handles as incorrect
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [playing, timeLeft, selectedOptionIndex]);

  const handleStartGame = async () => {
    if (playing) return;
    setError(null);
    setOutcomeMessage(null);
    setCorrectCount(0);
    setCurrentQuestionIndex(0);
    setSelectedOptionIndex(null);
    setTimeLeft(12);

    try {
      // 1. Deduct entry coins
      const decRes = await deductCoinsForGame(userId, entryCost, `Wager on ${gameName}`, gameId);
      onCoinsUpdated(decRes.newBalance);

      setGameStarted(true);
      setPlaying(true);
    } catch (err: any) {
      setError(err?.message || "An unexpected transaction error occurred.");
    }
  };

  const handleOptionClick = (optionIndex: number) => {
    if (selectedOptionIndex !== null) return; // already answered
    setSelectedOptionIndex(optionIndex);

    const isCorrect = optionIndex === questions[currentQuestionIndex].answerIndex;
    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
    }

    // Move to next after a brief delay so they see feedback
    setTimeout(() => {
      handleNextQuestion(false);
    }, 1500);
  };

  const handleNextQuestion = (isTimeout: boolean) => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < questions.length) {
      setCurrentQuestionIndex(nextIndex);
      setSelectedOptionIndex(null);
      setTimeLeft(12);
    } else {
      resolveQuizGame(isTimeout);
    }
  };

  const resolveQuizGame = async (isTimeout: boolean) => {
    setPlaying(false);
    
    // final count adjusting for last answer
    const finalCorrect = correctCount + (isTimeout ? 0 : 0); // already updated in click

    // Payout criteria:
    // 5 correct: 30 Coins (3x payout)
    // 4 correct: 18 Coins (1.8x payout)
    // 3 correct: 10 Coins (Refund/1x)
    // <= 2 correct: 0
    let prize = 0;
    let tier = "Trainee";

    if (finalCorrect === 5) {
      prize = 30;
      tier = "Acoustic Grandmaster (3x)";
    } else if (finalCorrect === 4) {
      prize = 18;
      tier = "Concert Maestro (1.8x)";
    } else if (finalCorrect === 3) {
      prize = 10;
      tier = "Skilled Listener (1x)";
    }

    try {
      if (prize > 0) {
        const credRes = await creditCoinsFromGame(userId, prize, `${gameName}: ${tier}`, gameId);
        onCoinsUpdated(credRes.newBalance);
      }

      setOutcomeMessage(`COMPLETED! You answered ${finalCorrect}/${questions.length} questions correctly. Tier: ${tier}. Reward: +${prize} Coins!`);

      // Save History & XP
      await saveGameResult(
        userId,
        gameId,
        gameName,
        entryCost,
        prize,
        prize > entryCost ? "won" : "lost",
        finalCorrect * 20 // Score out of 100
      );

    } catch (err: any) {
      setError("Success! However, updating your wallet balance failed.");
    }
  };

  return (
    <div className="bg-[#121214] border border-white/5 rounded-3xl p-6 md:p-8 max-w-xl mx-auto text-center relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="mb-6">
        <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          {gameName}
        </h2>
        <p className="text-xs text-zinc-400 mt-1 uppercase tracking-widest font-mono">
          5 Questions, 12s per question. Score perfectly for 3x Payouts!
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs py-2 px-4 rounded-xl flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {!gameStarted ? (
        <div className="my-12 py-6 border border-dashed border-white/10 rounded-3xl bg-zinc-900/10">
          <HelpCircle className="w-16 h-16 text-zinc-600 mx-auto mb-4 animate-bounce" />
          <h3 className="text-sm font-bold text-zinc-300">Unleash Your Trivia Knowledge</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-2 mb-6">
            Entry Fee: 10 Coins. Test your brain against 5 randomized pop-culture and music questions. No Google-ing allowed!
          </p>
          <button
            onClick={handleStartGame}
            className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase tracking-wider py-3.5 px-8 rounded-2xl transition-all cursor-pointer border-none"
          >
            START CHALLENGE (10 COINS)
          </button>
        </div>
      ) : (
        /* Question panel */
        <div className="my-4 text-left">
          {/* Header row with progress and timer */}
          <div className="flex justify-between items-center bg-zinc-900/60 border border-white/5 px-4 py-3 rounded-2xl mb-6 font-mono text-xs">
            <span className="text-zinc-500">
              Question <strong className="text-white">{currentQuestionIndex + 1}/{questions.length}</strong>
            </span>
            <span className="text-zinc-500">
              Score: <strong className="text-purple-400">{correctCount} Correct</strong>
            </span>
            <span className={`flex items-center gap-1.5 font-bold ${timeLeft <= 4 ? "text-red-400" : "text-zinc-400"}`}>
              <Clock className={`w-4 h-4 ${timeLeft <= 4 ? "animate-pulse" : ""}`} />
              {timeLeft}s
            </span>
          </div>

          {/* Time Limit Progress bar */}
          <div className="w-full bg-zinc-950 h-1.5 rounded-full mb-6 overflow-hidden">
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: `${(timeLeft / 12) * 100}%` }}
              transition={{ duration: 1, ease: "linear" }}
              className={`h-full ${timeLeft <= 4 ? "bg-red-500" : "bg-purple-500"}`}
            />
          </div>

          {/* Actual Question */}
          <h3 className="text-sm md:text-base font-bold text-white mb-6 leading-relaxed">
            {questions[currentQuestionIndex]?.question}
          </h3>

          {/* Multiple choice Options list */}
          <div className="space-y-2.5">
            {questions[currentQuestionIndex]?.options.map((opt, idx) => {
              const isAnswered = selectedOptionIndex !== null;
              const isSelected = selectedOptionIndex === idx;
              const isCorrectAnswer = idx === questions[currentQuestionIndex].answerIndex;

              let buttonStyle = "bg-zinc-900/60 border-white/5 text-zinc-300 hover:bg-zinc-800/80 hover:text-white";
              if (isAnswered) {
                if (isCorrectAnswer) {
                  buttonStyle = "bg-green-500/10 border-green-500/30 text-green-400";
                } else if (isSelected) {
                  buttonStyle = "bg-red-500/10 border-red-500/30 text-red-400";
                } else {
                  buttonStyle = "bg-zinc-900/20 border-transparent text-zinc-600 pointer-events-none";
                }
              }

              return (
                <button
                  key={idx}
                  disabled={isAnswered}
                  onClick={() => handleOptionClick(idx)}
                  className={`w-full p-4 rounded-xl text-xs font-semibold text-left border transition-all cursor-pointer flex items-center justify-between ${buttonStyle}`}
                >
                  <span>{opt}</span>
                  {isAnswered && isCorrectAnswer && <Check className="w-4 h-4 text-green-400" />}
                  {isAnswered && isSelected && !isCorrectAnswer && <X className="w-4 h-4 text-red-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Completion Outcome alerts */}
      <AnimatePresence>
        {outcomeMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="my-6 p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-mono"
          >
            {outcomeMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {gameStarted && !playing && (
        <button
          onClick={handleStartGame}
          className="w-full mt-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider py-4 rounded-2xl transition-all cursor-pointer border-none"
        >
          PLAY AGAIN (10 COINS)
        </button>
      )}
    </div>
  );
}
