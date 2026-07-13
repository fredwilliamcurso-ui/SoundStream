import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Coins, 
  Sparkles, 
  TrendingUp,
  Music,
  Heart,
  Mic,
  Headphones,
  Flame,
  Gem,
  Volume2,
  Crown,
  Rocket,
  Orbit,
  ArrowRight
} from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getOrCreateWallet, sendGift } from "../lib/coinsService";
import { DEFAULT_GIFTS, Gift, Wallet, COIN_PACKAGES } from "../types/coins";

interface GiftStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  receiverId: string;
  receiverName: string;
  streamId: string;
  onOpenStoreShortcut: () => void; // Opens Coin Store directly
  onGiftSent?: (giftName: string) => void;
}

export default function GiftStoreModal({
  isOpen,
  onClose,
  senderId,
  senderName,
  senderPhoto,
  receiverId,
  receiverName,
  streamId,
  onOpenStoreShortcut,
  onGiftSent
}: GiftStoreModalProps) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [sendingGiftId, setSendingGiftId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCoinStore, setShowCoinStore] = useState(false);
  const [purchasingPackId, setPurchasingPackId] = useState<string | null>(null);

  // Categories list
  const categories = ["All", "Popular", "African Vibe", "Music", "Hype", "Elite"];

  // Subscribe to sender's wallet to keep balance refreshed instantly
  useEffect(() => {
    if (!senderId || !isOpen) return;

    let isMounted = true;

    // Load from Billing Server REST API
    const fetchWallet = async () => {
      try {
        const response = await fetch(`/api/wallet/${senderId}`);
        if (response.ok && isMounted) {
          const data = await response.json();
          setWallet(data);
        }
      } catch (err) {
        console.warn("[GiftStore Client Warning] Standalone wallet fetch failed:", err);
      }
    };

    fetchWallet();

    // Load / initialize first on best-effort basis
    getOrCreateWallet(senderId).catch(console.error);

    const unsubscribe = onSnapshot(doc(db, "wallets", senderId), (snap) => {
      if (snap.exists() && isMounted) {
        setWallet(snap.data() as Wallet);
      }
    }, (error) => {
      console.warn("⚠️ Failed to subscribe to wallets. Using Billing Server cache:", error);
      fetchWallet();
    });

    const interval = setInterval(() => {
      fetchWallet();
    }, 5000);

    return () => {
      isMounted = false;
      unsubscribe();
      clearInterval(interval);
    };
  }, [senderId, isOpen]);

  if (!isOpen) return null;

  const filteredGifts = activeCategory === "All" 
    ? DEFAULT_GIFTS 
    : DEFAULT_GIFTS.filter(g => g.category === activeCategory);

  const getRarityBadgeColor = (rarity: string) => {
    switch (rarity) {
      case "common": return "bg-zinc-800 text-zinc-400 border-zinc-700";
      case "uncommon": return "bg-green-950/40 text-green-400 border-green-800/50";
      case "rare": return "bg-sky-950/40 text-sky-400 border-sky-800/50";
      case "epic": return "bg-purple-950/40 text-purple-400 border-purple-800/50";
      case "legendary": return "bg-amber-950/40 text-amber-400 border-amber-800/50 animate-pulse";
      default: return "bg-zinc-800 text-zinc-400 border-zinc-700";
    }
  };

  const renderIcon = (iconName: string, active: boolean) => {
    const size = "w-5 h-5";
    const color = active ? "text-indigo-400" : "text-zinc-400 group-hover:text-white";
    
    // Support colorful emojis with beautiful presentation shadows
    if (!/^[a-zA-Z0-9]+$/.test(iconName)) {
      return <span className="text-xl select-none filter drop-shadow-md leading-none">{iconName}</span>;
    }
    
    switch (iconName) {
      case "Music": return <Music className={`${size} ${color}`} />;
      case "Rose": return <span className="text-lg">🌹</span>;
      case "Heart": return <Heart className={`${size} fill-rose-500 text-rose-500`} />;
      case "Mic": return <Mic className={`${size} ${color}`} />;
      case "Headphones": return <Headphones className={`${size} ${color}`} />;
      case "Flame": return <Flame className={`${size} fill-orange-500 text-orange-500`} />;
      case "Gem": return <Gem className={`${size} fill-cyan-400 text-cyan-400`} />;
      case "Volume2": return <Volume2 className={`${size} ${color}`} />;
      case "Crown": return <Crown className={`${size} fill-yellow-500 text-yellow-500`} />;
      case "Rocket": return <Rocket className={`${size} fill-sky-400 text-sky-400`} />;
      case "Orbit": return <Orbit className={`${size} ${color}`} />;
      case "Sparkles": return <Sparkles className={`${size} fill-amber-400 text-amber-400`} />;
      default: return <Sparkles className={`${size} ${color}`} />;
    }
  };

  const handleSend = async () => {
    if (!selectedGift) return;
    if (!wallet) return;

    if (wallet.balance < selectedGift.cost) {
      setErrorMessage(`Insufficient balance. ${selectedGift.name} costs ${selectedGift.cost} Coins.`);
      return;
    }

    setLoading(true);
    setSendingGiftId(selectedGift.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await sendGift(
        senderId,
        senderName,
        senderPhoto,
        receiverId,
        receiverName,
        streamId,
        selectedGift
      );

      if (res.success) {
        setSuccessMessage(`Successfully sent ${selectedGift.name}!`);
        if (onGiftSent) {
          onGiftSent(selectedGift.name);
        }
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      }
    } catch (e: any) {
      setErrorMessage(e?.message || "Failed to deliver virtual gift. Please try again.");
    } finally {
      setLoading(false);
      setSendingGiftId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-55 flex items-end justify-center pointer-events-none">
      {/* Semi-transparent non-blocking backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px] pointer-events-auto cursor-pointer"
      />

      {/* Elegant sliding bottom sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative w-full max-w-lg bg-[#0e091b]/95 backdrop-blur-xl border-t border-white/10 rounded-t-[2rem] overflow-hidden flex flex-col h-[52vh] max-h-[440px] shadow-[0_-12px_40px_rgba(0,0,0,0.6)] z-10 text-white pointer-events-auto"
      >
        {/* Top Drag Handle Bar */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5 shrink-0" />

        {/* Top Header */}
        <div className="p-3.5 pt-2 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            <div>
              <h3 className="font-black text-xs text-white tracking-tight uppercase font-sans">
                SoundStream Gift Store
              </h3>
              <p className="text-[9px] text-zinc-400 uppercase tracking-widest leading-none mt-0.5">
                Supporting <span className="text-indigo-400 font-bold">{receiverName}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-full bg-white/5 hover:bg-white/10 transition text-zinc-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {showCoinStore ? (
          /* COIN PURCHASE STORE INTEGRATED IN LIVE STREAM */
          <div className="flex-1 overflow-y-auto p-3.5 bg-[#0c0c11] flex flex-col gap-3 min-h-[180px]">
            <div className="flex items-center justify-between shrink-0">
              <h4 className="text-[9px] font-black uppercase tracking-wider text-zinc-400">
                ⚡ SoundStream Coin Store
              </h4>
              <button
                onClick={() => {
                  setShowCoinStore(false);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="text-[8px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                ← Back to Gifts
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {COIN_PACKAGES.map((pkg) => {
                const isPurchasing = purchasingPackId === pkg.id;
                return (
                  <button
                    key={pkg.id}
                    disabled={purchasingPackId !== null}
                    onClick={async () => {
                      setPurchasingPackId(pkg.id);
                      setErrorMessage(null);
                      setSuccessMessage(null);
                      try {
                        // Secure Stripe Checkout Integration
                        const response = await fetch("/api/stripe/create-checkout-session", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            userId: senderId,
                            packageId: pkg.id,
                          }),
                        });
                        if (!response.ok) {
                          throw new Error("Failed to create Stripe Checkout session");
                        }
                        const data = await response.json();
                        if (data.url) {
                          window.location.href = data.url;
                        } else {
                          throw new Error("Invalid response from billing server");
                        }
                      } catch (err: any) {
                        setErrorMessage(err?.message || "Failed to initiate secure checkout.");
                      } finally {
                        setPurchasingPackId(null);
                      }
                    }}
                    className={`group relative p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/50 hover:bg-white/[0.04] transition duration-300 flex flex-col justify-between text-left min-h-[85px] ${
                      isPurchasing ? "border-indigo-500 animate-pulse" : ""
                    }`}
                  >
                    {pkg.badge && (
                      <span className="absolute top-1.5 right-1.5 px-1 py-0.5 rounded-full text-[6px] font-black uppercase tracking-widest bg-indigo-600/20 text-indigo-400 border border-indigo-500/10">
                        {pkg.badge}
                      </span>
                    )}

                    <div className="flex items-center gap-1.5">
                      <div className="p-1 rounded-lg bg-amber-500/10 border border-amber-500/15">
                        <Coins className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <div>
                        <p className="font-mono text-xs font-black text-white leading-none">
                          {pkg.coins}
                        </p>
                        <p className="text-[7px] text-zinc-500 uppercase font-semibold mt-0.5 tracking-wider">
                          Coins
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5 w-full">
                      <span className="font-mono text-[9px] font-black text-indigo-400">${pkg.price}</span>
                      <span className="text-[8px] font-black uppercase tracking-widest text-white bg-indigo-600 group-hover:bg-indigo-500 px-1.5 py-0.5 rounded transition-all">
                        {isPurchasing ? "Buying..." : "Buy"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* ORIGINAL GIFT GRID VIEW */
          <>
            {/* Categories Scroller */}
            <div className="flex items-center gap-1 px-3 py-1.5 bg-[#121216] overflow-x-auto border-b border-white/5 no-scrollbar shrink-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest transition shrink-0 border ${
                    activeCategory === cat 
                      ? "bg-indigo-600 text-white border-indigo-500" 
                      : "bg-white/5 text-zinc-400 hover:bg-white/10 border-transparent"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Content Panel / Grid */}
            <div className="p-3 bg-[#0c0c11] flex-1 overflow-y-auto grid grid-cols-4 gap-2">
              {filteredGifts.map((gift) => {
                const isSelected = selectedGift?.id === gift.id;
                return (
                  <button
                    key={gift.id}
                    onClick={() => {
                      setSelectedGift(gift);
                      setErrorMessage(null);
                    }}
                    className={`group relative p-2 rounded-xl flex flex-col items-center justify-center text-center transition-all duration-300 border ${
                      isSelected 
                        ? "bg-indigo-600/10 border-indigo-500/80 shadow-lg shadow-indigo-550/10 scale-[1.03]" 
                        : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10"
                    }`}
                  >
                    {/* Rarity Tag */}
                    <span className={`absolute top-1 right-1 px-1 py-0.1 rounded text-[6px] uppercase font-bold tracking-wider border ${getRarityBadgeColor(gift.rarity)}`}>
                      {gift.rarity}
                    </span>

                    {/* Gift Visual Icon */}
                    <div className={`p-2 rounded-full mb-1 transition-transform duration-300 ${
                      isSelected ? "bg-indigo-600/30 scale-110" : "bg-white/5 group-hover:scale-105"
                    }`}>
                      {renderIcon(gift.icon, isSelected)}
                    </div>

                    <span className="font-extrabold text-[10px] text-zinc-100 leading-none tracking-tight truncate w-full">
                      {gift.name}
                    </span>
                    
                    <div className="flex items-center gap-0.5 mt-1 bg-black/40 px-1.5 py-0.5 rounded-full border border-white/5">
                      <span className="text-[8px]">⚡</span>
                      <span className="font-mono text-[8px] font-extrabold text-amber-500">
                        {gift.cost}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Wallet Balance & Action Section */}
        <div className="p-3 bg-[#0e0e14] border-t border-white/5 flex flex-col gap-2 shrink-0">
          
          {/* Messages Alert overlay */}
          <AnimatePresence mode="wait">
            {errorMessage && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0 }}
                className="flex flex-col gap-1.5 p-2 bg-rose-950/20 rounded-xl border border-rose-900/30 text-center w-full"
              >
                <p className="text-[10px] text-rose-500 font-semibold leading-tight">
                  ⚠️ {errorMessage}
                </p>
                {errorMessage.includes("Insufficient") && (
                  <button
                    onClick={() => {
                      setShowCoinStore(true);
                      setErrorMessage(null);
                    }}
                    className="mx-auto bg-amber-500 hover:bg-amber-400 text-black text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-widest transition"
                  >
                    Buy More Coins
                  </button>
                )}
              </motion.div>
            )}
            {successMessage && (
              <motion.p 
                initial={{ opacity: 0, y: 5 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0 }}
                className="text-[10px] text-emerald-400 bg-emerald-950/20 px-3 py-1 rounded-lg border border-emerald-900/30 text-center font-semibold leading-tight animate-pulse"
              >
                ✨ {successMessage}
              </motion.p>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between">
            {/* Coin Balance Info */}
            <div className="flex items-center gap-2">
              <div className="bg-[#1b1b24] p-1.5 rounded-xl border border-white/5">
                <Coins className="w-4 h-4 text-amber-500 animate-bounce" />
              </div>
              <div>
                <p className="text-[8px] text-zinc-400 uppercase tracking-widest font-bold">
                  My Balance
                </p>
                <p className="font-mono text-xs font-black text-white flex items-center gap-1 leading-none">
                  {wallet ? wallet.balance : "..."}
                  <span className="text-zinc-500 text-[9px]">Coins</span>
                </p>
              </div>
            </div>

            {/* Quick Purchase Trigger - toggles store inside modal */}
            <button
              onClick={() => {
                setShowCoinStore(!showCoinStore);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="flex items-center gap-1 text-[8px] font-extrabold text-indigo-400 hover:text-indigo-300 uppercase tracking-wider font-mono bg-indigo-500/5 px-2.5 py-1.5 rounded-lg border border-indigo-500/20 hover:bg-indigo-500/10 transition"
            >
              {showCoinStore ? "View Gifts" : "Buy Coins"} <ArrowRight className="w-2.5 h-2.5" />
            </button>
          </div>

          {/* Core Action Send Button */}
          {!showCoinStore && (
            <button
              onClick={handleSend}
              disabled={loading || !selectedGift}
              className={`w-full py-2.5 rounded-xl font-extrabold uppercase tracking-widest text-[10px] transition duration-300 flex items-center justify-center gap-2 border ${
                !selectedGift 
                  ? "bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-600/20 hover:scale-[1.01]"
              }`}
            >
              {loading ? (
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sending...</span>
                </div>
              ) : selectedGift ? (
                <span>Send {selectedGift.name} (⚡{selectedGift.cost})</span>
              ) : (
                <span>Select a Gift</span>
              )}
            </button>
          )}
        </div>

      </motion.div>
    </div>
  );
}
