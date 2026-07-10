import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  limit
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Gift, GiftTransaction } from "../types/coins";
import { 
  Music, 
  Flame, 
  Gem, 
  Volume2, 
  Crown, 
  Rocket, 
  Orbit, 
  Sparkles,
  Heart,
  Headphones,
  Mic
} from "lucide-react";

interface GiftingOverlayProps {
  streamId: string;
}

interface VisualEffect {
  id: string;
  senderName: string;
  giftName: string;
  animationType: string;
  icon: string;
  cost: number;
}

export default function GiftingOverlay({ streamId }: GiftingOverlayProps) {
  const [activeEffects, setActiveEffects] = useState<VisualEffect[]>([]);
  const [tickerMessages, setTickerMessages] = useState<GiftTransaction[]>([]);

  // Sound effects or visual properties
  useEffect(() => {
    if (!streamId) return;

    // Listen to real-time gift transactions in the last 1 minute
    const q = query(
      collection(db, "gift_transactions"),
      where("streamId", "==", streamId),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data() as GiftTransaction;
          
          // Deduplicate based on time to prevent old loads triggering on-screen firework spasms
          const txnTime = new Date(data.createdAt).getTime();
          const nowTime = Date.now();
          // Relax threshold and use Math.abs to robustly support clock drift across client devices (up to 2 minutes)
          if (Math.abs(nowTime - txnTime) < 120000) {
            
            // 1. Add to visual effects queue
            const effectId = `eff_${data.id || Math.random().toString()}`;
            const giftCatalogItem = getGiftIcon(data.giftId);
            
            setActiveEffects((prev) => [
              ...prev,
              {
                id: effectId,
                senderName: data.senderName,
                giftName: data.giftName,
                animationType: giftCatalogItem.animationType,
                icon: giftCatalogItem.icon,
                cost: data.giftCost
              }
            ]);

            // Automatically clean up effect after 5 seconds
            setTimeout(() => {
              setActiveEffects((prev) => prev.filter((eff) => eff.id !== effectId));
            }, 6000);
          }
        }
      });

      // Keep last 4 messages in scroll ticker list
      const allTxns = snapshot.docs.map(doc => doc.data() as GiftTransaction);
      setTickerMessages(allTxns.slice(0, 4));
    }, (error) => {
      console.warn("Realtime gifting listener error:", error);
    });

    return () => unsubscribe();
  }, [streamId]);

  const getGiftIcon = (giftId: string) => {
    switch (giftId) {
      case "gift_music_note": return { icon: "Music", animationType: "pulse" };
      case "gift_rose": return { icon: "Rose", animationType: "float" };
      case "gift_heart": return { icon: "Heart", animationType: "burst" };
      case "gift_mic": return { icon: "Mic", animationType: "music_wave" };
      case "gift_headphones": return { icon: "Headphones", animationType: "spin" };
      case "gift_fire": return { icon: "Flame", animationType: "fire" };
      case "gift_diamond": return { icon: "Gem", animationType: "particles" };
      case "gift_golden_speaker": return { icon: "Volume2", animationType: "laser_beam" };
      case "gift_crown": return { icon: "Crown", animationType: "star_shower" };
      case "gift_rocket": return { icon: "Rocket", animationType: "rocket" };
      case "gift_galaxy": return { icon: "Orbit", animationType: "galaxy" };
      case "gift_soundstream_star": return { icon: "Sparkles", animationType: "confetti" };
      default: return { icon: "Sparkles", animationType: "pulse" };
    }
  };

  const renderIcon = (name: string, sizeClass = "w-6 h-6") => {
    switch (name) {
      case "Music": return <Music className={`${sizeClass}`} />;
      case "Rose": return <span className="text-xl">🌹</span>;
      case "Heart": return <Heart className={`${sizeClass} fill-rose-500 text-rose-500`} />;
      case "Mic": return <Mic className={`${sizeClass} text-purple-400`} />;
      case "Headphones": return <Headphones className={`${sizeClass} text-cyan-400`} />;
      case "Flame": return <Flame className={`${sizeClass} text-orange-500 fill-orange-500`} />;
      case "Gem": return <Gem className={`${sizeClass} text-indigo-400 fill-indigo-400`} />;
      case "Volume2": return <Volume2 className={`${sizeClass} text-amber-500`} />;
      case "Crown": return <Crown className={`${sizeClass} text-yellow-400 fill-yellow-400`} />;
      case "Rocket": return <Rocket className={`${sizeClass} text-sky-400 fill-sky-400`} />;
      case "Orbit": return <Orbit className={`${sizeClass} text-indigo-500`} />;
      case "Sparkles": return <Sparkles className={`${sizeClass} text-amber-400 fill-amber-400`} />;
      default: return <Sparkles className={`${sizeClass}`} />;
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-[45] overflow-hidden flex flex-col justify-between p-4">
      
      {/* 1. SCROLLING TICKER BANNER (John sent a Rose) */}
      <div className="space-y-1.5 w-full max-w-xs mt-28">
        <AnimatePresence>
          {tickerMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: -60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.8 }}
              className="flex items-center gap-2.5 bg-gradient-to-r from-black/85 via-[#12121a]/80 to-transparent backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5"
            >
              {msg.senderPhoto ? (
                <img 
                  src={msg.senderPhoto} 
                  alt="" 
                  className="w-7 h-7 rounded-full object-cover border border-white/10"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-extrabold text-white uppercase font-mono">
                  {msg.senderName.slice(0, 2)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-extrabold text-white truncate leading-none">
                  {msg.senderName}
                </p>
                <p className="text-[9px] text-zinc-400 leading-none mt-0.5">
                  sent <span className="text-amber-400 font-bold">{msg.giftName}</span>
                </p>
              </div>
              <div className="bg-[#1b1b2a] px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 border border-amber-500/10">
                <span className="text-[11px] leading-none">⚡</span>
                <span className="font-mono text-[9px] font-extrabold text-amber-500">
                  {msg.giftCost}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 2. CORE REALTIME ANIMATION CANVAS */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <AnimatePresence>
          {activeEffects.map((eff) => {
            // Check if it is a Premium Cinematic Gift (Rocket, Galaxy, Crown, Star, Golden Speaker, Diamond, Fire)
            const isPremium = eff.cost >= 299;

            if (eff.animationType === "rocket" || eff.giftName.toLowerCase().includes("jet")) {
              return (
                <motion.div
                  key={eff.id}
                  className="absolute inset-0 flex items-center justify-center z-50"
                >
                  {/* Rocket Launch Effect */}
                  <motion.div
                    initial={{ y: 500, x: 0, rotate: 0, scale: 0.3, opacity: 1 }}
                    animate={{ 
                      y: [-100, -200, -600],
                      x: [0, 50, -30, 0],
                      rotate: [0, 15, -15, 0],
                      scale: [0.3, 1.2, 1.5, 0.5]
                    }}
                    transition={{ duration: 4.5, ease: "easeInOut" }}
                    className="flex flex-col items-center relative"
                  >
                    {/* Launch fire/smoke particles */}
                    <div className="absolute top-20 w-8 h-24 bg-gradient-to-b from-orange-500 via-yellow-400 to-transparent blur-md rounded-full animate-pulse" />
                    
                    <div className="bg-gradient-to-b from-sky-400 to-indigo-600 p-8 rounded-full shadow-[0_0_50px_rgba(56,189,248,0.6)] border border-white/20">
                      <Rocket className="w-20 h-20 text-white animate-bounce" />
                    </div>
                    <span className="font-mono text-zinc-100 text-[10px] mt-4 tracking-widest bg-black/60 px-4 py-1.5 rounded-full uppercase border border-white/5 shadow-lg">
                      🚀 {eff.giftName} Launch by {eff.senderName}
                    </span>
                  </motion.div>
                </motion.div>
              );
            }

            // 3D Supercar / Sports Car Drift animation
            if (eff.giftName.toLowerCase().includes("car") || eff.giftName.toLowerCase().includes("supercar")) {
              return (
                <motion.div
                  key={eff.id}
                  className="absolute inset-x-0 bottom-36 flex items-center justify-center z-50 pointer-events-none"
                >
                  <motion.div
                    initial={{ x: -400, opacity: 0, scale: 0.6, rotate: -5 }}
                    animate={{
                      x: [-400, -100, 0, 100, 400],
                      opacity: [0, 1, 1, 1, 0],
                      scale: [0.6, 1.1, 1.2, 1.1, 0.6],
                      rotate: [-5, 3, -3, 5, 0]
                    }}
                    transition={{ duration: 4.2, ease: "easeInOut" }}
                    className="flex flex-col items-center"
                  >
                    <div className="relative p-6 bg-gradient-to-r from-amber-500 via-orange-600 to-red-600 rounded-3xl shadow-[0_0_40px_rgba(245,158,11,0.6)] border border-white/20 flex items-center gap-4">
                      {/* Neon wheels glow */}
                      <div className="absolute -bottom-2 left-6 w-8 h-8 rounded-full bg-cyan-400 blur-md animate-pulse" />
                      <div className="absolute -bottom-2 right-6 w-8 h-8 rounded-full bg-cyan-400 blur-md animate-pulse" />
                      
                      <span className="text-5xl filter drop-shadow">🏎️</span>
                      <div className="text-left">
                        <h4 className="text-white font-black text-xs uppercase tracking-widest leading-none">Luxury Sports Car</h4>
                        <p className="text-[9px] text-amber-200 mt-0.5 leading-none font-mono">Gifted by {eff.senderName}</p>
                      </div>
                    </div>
                    <span className="font-mono text-cyan-300 text-[9px] mt-2 tracking-wider bg-black/70 px-3 py-1 rounded-full uppercase border border-cyan-500/20 shadow-lg">
                      💨 VROOOOM!
                    </span>
                  </motion.div>
                </motion.div>
              );
            }

            // 3D Flying Roses Shower
            if (eff.giftName.toLowerCase().includes("rose") || eff.animationType === "float") {
              return (
                <div key={eff.id} className="absolute inset-0 z-40 pointer-events-none overflow-hidden">
                  {/* Scatter multiple drifting roses */}
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const startX = Math.random() * 80 + 10; // 10% to 90%
                    const duration = Math.random() * 3 + 2.5;
                    const delay = idx * 0.15;
                    const rotateDir = Math.random() > 0.5 ? 360 : -360;
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: `${startX}%`, y: "90%", scale: 0.3 }}
                        animate={{
                          opacity: [0, 1, 1, 0],
                          y: ["90%", "40%", "-10%"],
                          x: [`${startX}%`, `${startX + (Math.random() * 20 - 10)}%`],
                          scale: [0.3, 1.2, 0.5],
                          rotate: [0, rotateDir]
                        }}
                        transition={{ duration, delay, ease: "easeOut" }}
                        className="absolute text-3xl filter drop-shadow-[0_5px_15px_rgba(239,68,68,0.4)]"
                      >
                        🌹
                      </motion.div>
                    );
                  })}
                  {/* Center beautiful caption */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center bg-black/60 backdrop-blur px-4 py-2 rounded-2xl border border-rose-500/20 shadow-lg animate-pulse">
                    <p className="text-xs font-black text-rose-300 tracking-wider">🌹 ROSE SHOWER 🌹</p>
                    <p className="text-[9px] text-zinc-300">from {eff.senderName}</p>
                  </div>
                </div>
              );
            }

            // 3D Giant Heart Burst
            if (eff.giftName.toLowerCase().includes("heart") || eff.animationType === "burst") {
              return (
                <div key={eff.id} className="absolute inset-0 z-40 pointer-events-none overflow-hidden flex items-center justify-center">
                  <motion.div
                    initial={{ scale: 0.1, opacity: 0 }}
                    animate={{
                      scale: [0.1, 1.8, 1],
                      opacity: [0, 1, 1, 0]
                    }}
                    transition={{ duration: 4 }}
                    className="relative text-center flex flex-col items-center justify-center"
                  >
                    <Heart className="w-28 h-28 text-rose-500 fill-rose-500 filter drop-shadow-[0_0_25px_rgba(244,63,94,0.6)] animate-pulse" />
                    <h3 className="text-rose-400 font-extrabold text-sm uppercase tracking-widest mt-3">HEART BURST</h3>
                    <p className="text-[10px] text-white">Gifted by {eff.senderName}</p>
                  </motion.div>

                  {/* Explosive mini hearts */}
                  {Array.from({ length: 15 }).map((_, idx) => {
                    const angle = (idx / 15) * 2 * Math.PI;
                    const radius = Math.random() * 150 + 100;
                    const targetX = Math.cos(angle) * radius;
                    const targetY = Math.sin(angle) * radius;
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: 0, y: 0, scale: 0.2 }}
                        animate={{
                          opacity: [0, 1, 0],
                          x: targetX,
                          y: targetY,
                          scale: [0.2, 1.3, 0.4]
                        }}
                        transition={{ duration: 2.2, delay: 0.3 }}
                        className="absolute text-xl"
                      >
                        ❤️
                      </motion.div>
                    );
                  })}
                </div>
              );
            }

            // 3D Coin Burst
            if (eff.giftName.toLowerCase().includes("coin") || eff.giftName.toLowerCase().includes("gold") || eff.animationType === "confetti") {
              return (
                <div key={eff.id} className="absolute inset-0 z-40 pointer-events-none overflow-hidden flex items-center justify-center">
                  {/* Explosion of glittering golden coins */}
                  {Array.from({ length: 18 }).map((_, idx) => {
                    const angle = (idx / 18) * 2 * Math.PI;
                    const distance = Math.random() * 180 + 120;
                    const targetX = Math.cos(angle) * distance;
                    const targetY = Math.sin(angle) * distance;
                    const rotationSpeed = Math.random() * 720 - 360;
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: 0, y: 0, scale: 0.2, rotateY: 0 }}
                        animate={{
                          opacity: [0, 1, 1, 0],
                          x: targetX,
                          y: [0, targetY - 60, targetY],
                          scale: [0.2, 1.4, 0.5],
                          rotateY: [0, rotationSpeed]
                        }}
                        transition={{ duration: 3, ease: "easeOut" }}
                        className="absolute text-2xl filter drop-shadow-[0_4px_8px_rgba(245,158,11,0.5)]"
                      >
                        🪙
                      </motion.div>
                    );
                  })}
                  <div className="absolute bg-gradient-to-r from-amber-500/80 to-yellow-500/80 backdrop-blur px-4 py-1.5 rounded-full border border-yellow-400/30 text-center shadow-2xl">
                    <p className="text-[10px] font-black text-zinc-950 tracking-widest uppercase">🪙 COIN BURST! 🪙</p>
                    <p className="text-[8px] text-zinc-900 font-bold">from {eff.senderName}</p>
                  </div>
                </div>
              );
            }

            // 3D Diamond Sparkle Shower
            if (eff.giftName.toLowerCase().includes("diamond") || eff.animationType === "particles") {
              return (
                <div key={eff.id} className="absolute inset-0 z-40 pointer-events-none overflow-hidden flex items-center justify-center">
                  {/* Scattered glittering gems */}
                  {Array.from({ length: 14 }).map((_, idx) => {
                    const angle = (idx / 14) * 2 * Math.PI;
                    const distance = Math.random() * 160 + 100;
                    const targetX = Math.cos(angle) * distance;
                    const targetY = Math.sin(angle) * distance;
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: 0, y: 0, scale: 0.1 }}
                        animate={{
                          opacity: [0, 1, 1, 0],
                          x: targetX,
                          y: [0, targetY - 30, targetY],
                          scale: [0.1, 1.3, 0.2],
                          rotate: [0, Math.random() * 360]
                        }}
                        transition={{ duration: 2.8 }}
                        className="absolute text-2xl filter drop-shadow-[0_0_12px_rgba(56,189,248,0.6)]"
                      >
                        💎
                      </motion.div>
                    );
                  })}
                  <div className="absolute bg-[#0a0f1d]/90 backdrop-blur px-4 py-2 rounded-2xl border border-cyan-500/30 text-center shadow-lg animate-pulse">
                    <p className="text-xs font-black text-cyan-300 tracking-wider">💎 DIAMOND SPARKLE 💎</p>
                    <p className="text-[9px] text-zinc-400">showered by {eff.senderName}</p>
                  </div>
                </div>
              );
            }

            if (eff.animationType === "galaxy") {
              return (
                <motion.div
                  key={eff.id}
                  initial={{ opacity: 0, scale: 0.1, rotate: 0 }}
                  animate={{ 
                    opacity: [0, 1, 1, 0],
                    scale: [0.1, 1, 1.2, 0.1],
                    rotate: [0, 360, 720, 1080]
                  }}
                  transition={{ duration: 5, ease: "linear" }}
                  className="absolute flex flex-col items-center justify-center z-40"
                >
                  {/* Cosmic portal design */}
                  <div className="w-72 h-72 rounded-full bg-gradient-to-tr from-purple-900 via-indigo-900 to-pink-600 blur-2xl opacity-40 absolute" />
                  <div className="border border-indigo-500/30 p-12 rounded-full animate-pulse relative">
                    <div className="absolute inset-0 border-t-2 border-pink-500 rounded-full animate-spin" />
                    <Orbit className="w-32 h-32 text-indigo-400" />
                  </div>
                  <h4 className="font-sans font-black text-white text-base tracking-widest uppercase mt-4 text-center">
                    🌌 Cosmic Galaxy Warp
                  </h4>
                  <p className="font-mono text-pink-400 text-[9px] uppercase tracking-widest text-center">
                    summoned by {eff.senderName}
                  </p>
                </motion.div>
              );
            }

            if (eff.animationType === "star_shower") {
              return (
                <motion.div
                  key={eff.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 4.5 }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-yellow-500/5 z-40"
                >
                  <div className="text-center space-y-2 relative">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                      className="inline-block"
                    >
                      <Crown className="w-24 h-24 text-yellow-400 fill-yellow-400 filter drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                    </motion.div>
                    <h3 className="font-sans font-black text-yellow-400 text-lg uppercase tracking-wider leading-none">
                      👑 Royal Crown Gifted
                    </h3>
                    <p className="text-xs text-white/95 font-medium">
                      All hail Gifter <span className="text-yellow-400 font-black">{eff.senderName}</span>
                    </p>
                    
                    {/* Simulated sparkles falling */}
                    <div className="absolute inset-0 -top-10 flex justify-between pointer-events-none">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <motion.span
                          key={i}
                          initial={{ y: -50, opacity: 0 }}
                          animate={{ y: 150, opacity: [0, 1, 0], x: (i - 4) * 20 }}
                          transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                          className="text-yellow-300 text-xs"
                        >
                          ✦
                        </motion.span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            }

            if (eff.animationType === "fire") {
              return (
                <motion.div
                  key={eff.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 4 }}
                  className="absolute inset-0 flex items-center justify-center z-40"
                >
                  <div className="relative text-center">
                    {/* Pulsing red-orange glow */}
                    <div className="absolute -inset-8 bg-red-600/30 blur-2xl rounded-full animate-pulse" />
                    <motion.div
                      animate={{ scale: [1, 1.15, 0.95, 1.1, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <Flame className="w-28 h-28 text-orange-500 fill-orange-500 filter drop-shadow-[0_0_20px_rgba(249,115,22,0.6)] mx-auto" />
                    </motion.div>
                    <h3 className="text-orange-500 font-extrabold text-xl uppercase tracking-widest mt-2">
                      🔥 Super Hype Fire!
                    </h3>
                    <p className="text-zinc-300 text-xs">
                      {eff.senderName} is warming up the stream!
                    </p>
                  </div>
                </motion.div>
              );
            }

            // Normal or standard floating animations (float, pulse, burst, spin, etc.)
            return (
              <motion.div
                key={eff.id}
                initial={{ 
                  opacity: 0, 
                  y: 100, 
                  x: Math.random() * 160 - 80, 
                  scale: 0.5 
                }}
                animate={{ 
                  opacity: [0, 1, 1, 0], 
                  y: [-50, -150, -250],
                  scale: [0.5, 1.2, 1],
                  rotate: Math.random() * 90 - 45
                }}
                transition={{ duration: 3.5, ease: "easeOut" }}
                className="absolute flex items-center gap-2 bg-[#1b1b2a]/90 px-3 py-1.5 rounded-full border border-white/10 shadow-lg pointer-events-none z-30"
              >
                <div className="p-1.5 bg-[#252538] rounded-full shrink-0">
                  {renderIcon(eff.icon, "w-4 h-4")}
                </div>
                <div className="text-left shrink-0">
                  <p className="text-[10px] text-zinc-400 font-medium">
                    {eff.senderName} sent
                  </p>
                  <p className="text-xs font-bold text-white leading-none">
                    {eff.giftName}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

    </div>
  );
}
