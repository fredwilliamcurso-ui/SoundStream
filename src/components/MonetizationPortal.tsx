import React, { useState, useEffect } from "react";
import { User } from "../types";
import { admob } from "../lib/admob";
import { db } from "../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { 
  Award, Sparkles, Check, Star, ShieldCheck, Zap, 
  Settings, Database, Play, Volume2, CloudOff, RefreshCw, Smartphone
} from "lucide-react";
import { analytics } from "../lib/analytics";

interface MonetizationPortalProps {
  currentUser: User | null;
  onSubscriptionUpdated: (updatedUser: User) => void;
}

export default function MonetizationPortal({ currentUser, onSubscriptionUpdated }: MonetizationPortalProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);
  const [selectedPlanPrice, setSelectedPlanPrice] = useState("");
  
  // High fidelity & local storage simulation state
  const [audioQuality, setAudioQuality] = useState<"standard" | "high" | "extreme" | "flac">("extreme");
  const [offlineSync, setOfflineSync] = useState(true);
  const [cacheSize, setCacheSize] = useState("124.5 MB");
  const [clearingCache, setClearingCache] = useState(false);

  // Auto-fill active tier based on db state
  const isPremium = currentUser ? admob.isPremiumUser(currentUser) : false;

  const handleUpgrade = async () => {
    if (!currentUser) return;
    setIsUpgrading(true);
    setUpgradeSuccess(false);

    // Simulate safe Stripe / Play Billing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    try {
      const isYearly = billingCycle === "yearly";
      const durationHours = isYearly ? 24 * 365 : 24 * 30; // 30 days vs 365 days
      const priceStr = isYearly ? "$49.99/yr" : "$4.99/mo";
      setSelectedPlanPrice(priceStr);

      const expiresAt = admob.grantTemporaryPremium(durationHours);

      // Save to Firebase
      const userRef = doc(db, "users", currentUser.uid);
      const subUpdate = {
        status: "premium" as const,
        expiresAt: new Date(expiresAt).toISOString(),
        updatedAt: new Date().toISOString()
      };

      await updateDoc(userRef, {
        subscription: subUpdate
      });

      // Track monetization analytics
      await analytics.trackEvent("subscription_conversion", currentUser.uid, currentUser.email, {
        plan: billingCycle,
        price: isYearly ? 49.99 : 4.99,
        durationDays: isYearly ? 365 : 30
      });
      await analytics.trackEvent("subscription_purchase", currentUser.uid, currentUser.email, {
        plan: billingCycle,
        price: isYearly ? 49.99 : 4.99
      });
      await analytics.trackEvent("premium_conversion", currentUser.uid, currentUser.email, {
        plan: billingCycle,
        price: isYearly ? 49.99 : 4.99
      });

      // Propagate locally
      const updatedUser: User = {
        ...currentUser,
        subscription: subUpdate
      };
      onSubscriptionUpdated(updatedUser);
      setUpgradeSuccess(true);
    } catch (err) {
      console.error("Failed to process payment upgrade simulation:", err);
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleDowngrade = async () => {
    if (!currentUser) return;
    setIsUpgrading(true);
    try {
      const userRef = doc(db, "users", currentUser.uid);
      const subUpdate = {
        status: "free" as const,
        updatedAt: new Date().toISOString()
      };
      await updateDoc(userRef, {
        subscription: subUpdate
      });

      // Track downgrade/cancellation
      await analytics.trackEvent("retention_ping", currentUser.uid, currentUser.email, {
        action: "cancel_premium_subscription"
      });
      await analytics.trackEvent("subscription_cancellation", currentUser.uid, currentUser.email, {
        plan: "premium"
      });

      const updatedUser: User = {
        ...currentUser,
        subscription: subUpdate
      };
      onSubscriptionUpdated(updatedUser);
      setUpgradeSuccess(false);
    } catch (err) {
      console.error("Failed to cancel subscription:", err);
    } finally {
      setIsUpgrading(false);
    }
  };

  const clearOfflineCache = () => {
    setClearingCache(true);
    setTimeout(() => {
      setCacheSize("0.0 KB");
      setClearingCache(false);
    }, 1200);
  };

  return (
    <div className="max-w-4xl mx-auto py-4 font-sans text-zinc-300">
      
      {/* Header section */}
      <div className="mb-8 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-2 flex items-center justify-center md:justify-start gap-2.5">
            <Award className="w-8 h-8 text-indigo-400 animate-pulse" />
            <span>SoundStream Premium Tier</span>
          </h1>
          <p className="text-zinc-400 text-sm max-w-xl">
            Upgrade your account to access ad-free High-Fidelity Lossless streaming, local offline caching, and background playback integration.
          </p>
        </div>

        {/* Current Entitlement Banner */}
        <div className={`p-4 rounded-2xl border text-center min-w-[200px] ${
          isPremium 
            ? "bg-indigo-950/20 border-indigo-500/20 text-indigo-100" 
            : "bg-zinc-900 border-white/5 text-zinc-400"
        }`}>
          <p className="text-[10px] font-mono uppercase tracking-wider mb-1">Your Account Status</p>
          <p className="text-lg font-black">{isPremium ? "PREMIUM ACTIVE" : "STANDARD FREE"}</p>
          {isPremium && (
            <p className="text-[10px] text-indigo-300 mt-1">Full entitlements enabled</p>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* Right side options: Subscription Plans (Span 3) */}
        <div className="lg:col-span-3 space-y-6">
          
          {upgradeSuccess && (
            <div className="p-5 bg-emerald-950/20 border border-emerald-500/20 text-emerald-300 rounded-2xl">
              <div className="flex items-start gap-3">
                <Sparkles className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5 animate-bounce" />
                <div>
                  <p className="font-extrabold text-white text-base">Payment Simulation Approved!</p>
                  <p className="text-xs text-zinc-400 mt-1 leading-normal">
                    SoundStream premium entitlement is now active on your secure profile. Your plan ({selectedPlanPrice}) has been securely recorded in the cloud database.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Pricing Toggles & Plans */}
          <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 md:p-8 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full filter blur-3xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 pb-6 border-b border-white/5">
              <div>
                <h3 className="text-white font-extrabold text-lg">Pick Your Level</h3>
                <p className="text-xs text-zinc-400">Save 20% by locking in yearly subscription renewals.</p>
              </div>

              {/* Monthly/Yearly toggle */}
              <div className="bg-zinc-950 p-1.5 rounded-xl border border-white/5 flex gap-1">
                <button
                  onClick={() => setBillingCycle("monthly")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                    billingCycle === "monthly" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle("yearly")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                    billingCycle === "yearly" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Yearly (-20%)
                </button>
              </div>
            </div>

            {/* Plan Display Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Free Tier Details */}
              <div className="border border-white/5 bg-zinc-950/20 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-mono uppercase tracking-wider text-zinc-400">SoundStream Free</p>
                  <p className="text-2xl font-black text-white mt-1 mb-3">$0.00</p>
                  <ul className="text-xs space-y-2 text-zinc-400">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>Standard 128kbps audio</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>Ad-supported music streaming</span>
                    </li>
                    <li className="flex items-center gap-2 text-zinc-600 line-through">
                      <span>Offline local caching</span>
                    </li>
                    <li className="flex items-center gap-2 text-zinc-600 line-through">
                      <span>Lossless FLAC studio masters</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-6">
                  <span className="block w-full text-center text-xs bg-zinc-800 text-zinc-400 py-2.5 rounded-xl font-bold uppercase select-none">
                    Current Base
                  </span>
                </div>
              </div>

              {/* Premium Plan Details */}
              <div className="border-2 border-indigo-500/30 bg-indigo-950/5 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-indigo-500 text-[8px] font-black uppercase text-indigo-950 px-3 py-1 rounded-bl-xl tracking-wider animate-pulse">
                  POPULAR
                </div>
                <div>
                  <p className="text-xs font-mono uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-indigo-400 text-indigo-400" />
                    <span>SoundStream Pro</span>
                  </p>
                  <p className="text-2xl font-black text-white mt-1 mb-1">
                    {billingCycle === "monthly" ? "$4.99" : "$49.99"}
                  </p>
                  <p className="text-[10px] text-zinc-400 mb-3">
                    {billingCycle === "monthly" ? "billed every 30 days" : "billed every 365 days"}
                  </p>
                  
                  <ul className="text-xs space-y-2">
                    <li className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-white font-semibold">100% Ad-Free Experience</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>320kbps extreme MP3 & FLAC</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>Offline direct caching</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>Background media session loop</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-6">
                  {isPremium ? (
                    <button
                      onClick={handleDowngrade}
                      disabled={isUpgrading}
                      className="w-full text-center text-xs bg-red-950/20 text-red-400 border border-red-500/10 hover:bg-red-900/10 py-2.5 rounded-xl font-bold uppercase transition-colors cursor-pointer"
                    >
                      {isUpgrading ? "Processing..." : "Cancel Subscription"}
                    </button>
                  ) : (
                    <button
                      onClick={handleUpgrade}
                      disabled={isUpgrading}
                      className="w-full text-center text-xs bg-indigo-600 hover:bg-indigo-550 text-white py-2.5 rounded-xl font-black uppercase shadow-lg shadow-indigo-600/15 cursor-pointer transition-colors"
                    >
                      {isUpgrading ? "Processing secure payment..." : "Simulate Premium Upgrade"}
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Secure gateway trust footer */}
          <div className="flex items-center gap-3 p-4 bg-zinc-900/30 border border-white/5 rounded-2xl text-xs text-zinc-400">
            <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0" />
            <p>
              Your billing security is our primary focus. We leverage <strong>Stripe Secure Tokenization</strong> for Web clients and <strong>Google Play Billing</strong> APIs on Android platforms. No credential files or primary card metrics are stored on SoundStream servers.
            </p>
          </div>
        </div>

        {/* Left side options: Quality & Caching Controls (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 backdrop-blur-sm space-y-6">
            <h3 className="text-white font-extrabold text-sm flex items-center gap-2 border-b border-white/5 pb-3">
              <Settings className="w-4 h-4 text-indigo-400" />
              <span>Premium Controls</span>
            </h3>

            {/* Audio quality controls */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Audio Stream Quality</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setAudioQuality("standard")}
                  className={`px-2 py-2 text-xs font-bold rounded-xl text-center border cursor-pointer transition-all ${
                    audioQuality === "standard"
                      ? "bg-indigo-950/20 border-indigo-500 text-white"
                      : "bg-zinc-950/40 border-white/5 text-zinc-400 hover:border-white/10"
                  }`}
                >
                  <span className="block">128 kbps</span>
                  <span className="text-[9px] text-zinc-500 font-normal">Standard Data-Saver</span>
                </button>
                
                <button
                  onClick={() => setAudioQuality("high")}
                  className={`px-2 py-2 text-xs font-bold rounded-xl text-center border cursor-pointer transition-all ${
                    audioQuality === "high"
                      ? "bg-indigo-950/20 border-indigo-500 text-white"
                      : "bg-zinc-950/40 border-white/5 text-zinc-400 hover:border-white/10"
                  }`}
                >
                  <span className="block">256 kbps</span>
                  <span className="text-[9px] text-zinc-500 font-normal">Balanced High</span>
                </button>

                <button
                  onClick={() => {
                    if (!isPremium) {
                      alert("Please upgrade to SoundStream Premium to unlock extreme 320kbps streaming quality!");
                      return;
                    }
                    setAudioQuality("extreme");
                  }}
                  className={`px-2 py-2 text-xs font-bold rounded-xl text-center border cursor-pointer transition-all ${
                    !isPremium ? "opacity-50" : ""
                  } ${
                    audioQuality === "extreme"
                      ? "bg-indigo-950/20 border-indigo-500 text-white"
                      : "bg-zinc-950/40 border-white/5 text-zinc-400 hover:border-white/10"
                  }`}
                >
                  <span className="block flex items-center justify-center gap-0.5">
                    <span>320 kbps</span>
                    <Award className="w-2.5 h-2.5 text-amber-400" />
                  </span>
                  <span className="text-[9px] text-zinc-500 font-normal">Premium Extreme</span>
                </button>

                <button
                  onClick={() => {
                    if (!isPremium) {
                      alert("Please upgrade to SoundStream Premium to unlock ultra-high fidelity lossless studio FLAC!");
                      return;
                    }
                    setAudioQuality("flac");
                  }}
                  className={`px-2 py-2 text-xs font-bold rounded-xl text-center border cursor-pointer transition-all ${
                    !isPremium ? "opacity-50" : ""
                  } ${
                    audioQuality === "flac"
                      ? "bg-indigo-950/20 border-indigo-500 text-white"
                      : "bg-zinc-950/40 border-white/5 text-zinc-400 hover:border-white/10"
                  }`}
                >
                  <span className="block flex items-center justify-center gap-0.5">
                    <span>FLAC</span>
                    <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                  </span>
                  <span className="text-[9px] text-zinc-500 font-normal">Lossless Studio Master</span>
                </button>
              </div>
            </div>

            {/* Offline direct caching controls */}
            <div className="space-y-4 border-t border-white/5 pt-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CloudOff className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Offline Sync Status</span>
                </label>

                <button
                  onClick={() => {
                    if (!isPremium) {
                      alert("Please upgrade to SoundStream Premium to unlock offline caching!");
                      return;
                    }
                    setOfflineSync(!offlineSync);
                  }}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                    offlineSync && isPremium ? "bg-indigo-600" : "bg-zinc-800"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      offlineSync && isPremium ? "translate-x-4.5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {isPremium && offlineSync ? (
                <div className="p-3 bg-zinc-950/40 border border-white/5 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 flex items-center gap-1">
                      <Database className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Cached Storage Size:</span>
                    </span>
                    <span className="font-mono font-bold text-white">{cacheSize}</span>
                  </div>

                  <button
                    onClick={clearOfflineCache}
                    disabled={clearingCache}
                    className="w-full text-[10px] uppercase font-extrabold tracking-wider bg-zinc-900 hover:bg-zinc-800 text-zinc-400 py-1.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer border-none"
                  >
                    {clearingCache ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <span>Purge Local Audio Cache</span>
                    )}
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-zinc-500 leading-normal bg-zinc-950/20 p-2.5 rounded-xl border border-white/5 text-center">
                  {!isPremium 
                    ? "Upgrade to premium to securely cache your songs on Web IndexedDB and Android SQLite partitions." 
                    : "Turn on Offline Sync to download audio buffers automatically as you stream."}
                </p>
              )}
            </div>

            {/* Background media notification API guide */}
            <div className="space-y-3 border-t border-white/5 pt-4">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                <span>Background playback integration</span>
              </label>

              <div className="text-[11px] text-zinc-500 leading-relaxed bg-zinc-950/10 p-3 rounded-xl border border-white/5 space-y-2">
                <p>
                  SoundStream implements standard web and native background listening architectures:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-zinc-400">
                  <li><strong>Web API</strong>: Leverages the global <code>navigator.mediaSession</code> to enable play/pause/skip and artist artwork display on your locked screen overlay.</li>
                  <li><strong>Android Native</strong>: Bridges directly into background services with service lifecycle managers to prevent battery optimization thread limits.</li>
                </ul>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
