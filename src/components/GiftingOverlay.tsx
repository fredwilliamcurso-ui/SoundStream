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
          if (nowTime - txnTime < 15000) { // last 15 seconds
            
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
      <div className="space-y-1.5 w-full max-w-xs mt-16">
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

            if (eff.animationType === "rocket") {
              return (
                <motion.div
                  key={eff.id}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  {/* Rocket Launch Effect */}
                  <motion.div
                    initial={{ y: 500, x: 0, rotate: 0, scale: 0.3, opacity: 1 }}
                    animate={{ 
                      y: [-100, -200, -500],
                      x: [0, 50, -30, 0],
                      rotate: [0, 15, -15, 0],
                      scale: [0.3, 1.2, 1.5, 0.5]
                    }}
                    transition={{ duration: 4.5, ease: "easeInOut" }}
                    className="flex flex-col items-center relative"
                  >
                    {/* Launch fire/smoke particles */}
                    <div className="absolute top-20 w-8 h-24 bg-gradient-to-b from-orange-500 via-amber-400 to-transparent blur-md rounded-full animate-pulse" />
                    
                    <div className="bg-gradient-to-b from-sky-400 to-indigo-600 p-8 rounded-full shadow-2xl shadow-sky-500/30 border border-white/20">
                      <Rocket className="w-20 h-20 text-white animate-bounce" />
                    </div>
                    <span className="font-mono text-zinc-500 text-[10px] mt-4 tracking-widest bg-black/50 px-3 py-1 rounded-full uppercase">
                      🚀 Rocket Powered Launch by {eff.senderName}
                    </span>
                  </motion.div>
                </motion.div>
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
                  className="absolute flex flex-col items-center justify-center"
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
                  <p className="font-mono text-pink-400 text-[9px] uppercase tracking-widest">
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
                  className="absolute inset-0 flex flex-col items-center justify-center bg-yellow-500/5"
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
                  className="absolute inset-0 flex items-center justify-center"
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
                className="absolute flex items-center gap-2 bg-[#1b1b2a]/90 px-3 py-1.5 rounded-full border border-white/10 shadow-lg pointer-events-none"
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
