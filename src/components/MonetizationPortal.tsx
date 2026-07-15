import React, { useState, useEffect } from "react";
import { User, Subscription, PaymentProviderType, SubscriptionPlanType } from "../types";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { 
  Award, Sparkles, Check, Star, ShieldCheck, Zap, 
  Settings, Database, Volume2, CloudOff, RefreshCw, Smartphone,
  CreditCard, Lock, ShieldAlert, Laptop, CheckCircle2, XCircle, Info, X, 
  ChevronRight, Calendar, Users, GraduationCap, ArrowRight, Play, AlertCircle
} from "lucide-react";
import { analytics } from "../lib/analytics";
import { admob } from "../lib/admob";
import { monetizationService, PLAN_PRICES } from "../lib/monetizationService";

interface MonetizationPortalProps {
  currentUser: User | null;
  onSubscriptionUpdated: (updatedUser: User) => void;
}

export default function MonetizationPortal({ currentUser, onSubscriptionUpdated }: MonetizationPortalProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<"plans" | "benefits" | "testing">("plans");
  
  // Checkout Modal States
  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlanType | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProviderType>("stripe");
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  
  // Feedback states
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState<Subscription | null>(null);
  const [testNotification, setTestNotification] = useState<string | null>(null);
  
  // Premium audio quality and offline sync controls (high-fidelity local state matching)
  const [audioQuality, setAudioQuality] = useState<"standard" | "high" | "extreme" | "flac">("extreme");
  const [offlineSync, setOfflineSync] = useState(true);
  const [cacheSize, setCacheSize] = useState("124.5 MB");
  const [clearingCache, setClearingCache] = useState(false);

  // Active user subscription info
  const userSub: Subscription | undefined = (currentUser as any)?.subscription?.fullSubscription;
  const currentPlanName: SubscriptionPlanType = userSub?.plan || "Free Plan";
  const isPremium = currentUser ? admob.isPremiumUser(currentUser) : false;

  // Sync to local storage
  useEffect(() => {
    if (!isPremium) {
      setAudioQuality("standard");
      setOfflineSync(false);
    } else {
      setAudioQuality("extreme");
      setOfflineSync(true);
    }
  }, [isPremium]);

  // Handle standard plan checkout
  const handleOpenCheckout = (plan: SubscriptionPlanType) => {
    if (plan === "Free Plan") {
      handleDowngradeToFree();
      return;
    }
    setCheckoutPlan(plan);
    setCardNumber("");
    setCardHolder("");
    setCardExpiry("");
    setCardCvv("");
    setPaypalEmail("");
    setCheckoutError(null);
    setCheckoutSuccess(null);
  };

  const handleProcessCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !checkoutPlan) return;

    setIsProcessing(true);
    setCheckoutError(null);

    // Simulate network delay representing secure API roundtrip
    await new Promise((resolve) => setTimeout(resolve, 1500));

    try {
      // Execute subscription creation in monetizationService
      // Passing card number to simulate declining card fail conditions if "fail" or specific card number entered
      const sub = await monetizationService.createSubscription(
        currentUser.uid,
        checkoutPlan,
        billingCycle,
        selectedProvider,
        selectedProvider === "stripe" ? cardNumber || "success" : paypalEmail || "success"
      );

      if (sub) {
        // Success
        setCheckoutSuccess(sub);
        
        // Track analytics conversions
        await analytics.trackEvent("subscription_conversion", currentUser.uid, currentUser.email, {
          plan: checkoutPlan,
          price: sub.price,
          provider: selectedProvider,
          billingCycle
        });

        // Trigger parent state update
        const updatedUserRef = doc(db, "users", currentUser.uid);
        const updatedUserSnap = await getDoc(updatedUserRef);
        if (updatedUserSnap.exists()) {
          onSubscriptionUpdated(updatedUserSnap.data() as User);
        }
      } else {
        // Failed / Declined
        setCheckoutError("The payment transaction was declined by the selected payment gateway. Check your sandbox details or use a valid simulated detail.");
      }
    } catch (err: any) {
      setCheckoutError(err?.message || "Secure checkout gateway failure. Try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDowngradeToFree = async () => {
    if (!currentUser) return;
    setIsProcessing(true);
    try {
      const sub = await monetizationService.createSubscription(
        currentUser.uid,
        "Free Plan",
        "monthly",
        "free"
      );
      if (sub) {
        // Force refresh parent
        const updatedUserRef = doc(db, "users", currentUser.uid);
        const updatedUserSnap = await getDoc(updatedUserRef);
        if (updatedUserSnap.exists()) {
          onSubscriptionUpdated(updatedUserSnap.data() as User);
        }
        alert("Your subscription has been successfully canceled and returned to Free Plan.");
      }
    } catch (err) {
      console.error("Cancellation error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Run Test Simulations
  const simulateRenewal = async () => {
    if (!currentUser || currentPlanName === "Free Plan") {
      alert("Please activate a premium subscription plan first before simulating renewals.");
      return;
    }
    setIsProcessing(true);
    try {
      const renewed = await monetizationService.renewSubscription(currentUser.uid);
      if (renewed) {
        setTestNotification("Successfully processed subscription renewal simulation! Log written securely to 'monetization_logs' and user notified.");
        // Refresh parent
        const updatedUserRef = doc(db, "users", currentUser.uid);
        const updatedUserSnap = await getDoc(updatedUserRef);
        if (updatedUserSnap.exists()) {
          onSubscriptionUpdated(updatedUserSnap.data() as User);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const simulateExpiry = async () => {
    if (!currentUser || currentPlanName === "Free Plan") {
      alert("Please activate a premium subscription plan first before simulating expiration.");
      return;
    }
    setIsProcessing(true);
    try {
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        "subscription.expiresAt": new Date(Date.now() - 3600000).toISOString(), // set in past
        "subscription.status": "free",
        "subscription.fullSubscription.status": "expired"
      });

      await monetizationService.sendNotification(
        currentUser.uid,
        "Premium Access Expired",
        `Your SoundStream premium session for ${currentPlanName} has expired. Reactivate anytime to regain lossless FLAC features.`,
        "subscription_expire"
      );

      // Refresh parent
      const updatedUserSnap = await getDoc(userRef);
      if (updatedUserSnap.exists()) {
        onSubscriptionUpdated(updatedUserSnap.data() as User);
      }
      setTestNotification("Successfully simulated premium expiry and sent immediate system notification!");
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearOfflineCache = () => {
    setClearingCache(true);
    setTimeout(() => {
      setCacheSize("0.0 KB");
      setClearingCache(false);
    }, 1200);
  };

  // Helper arrays for comparison list
  const PLANS_LIST: Array<{
    name: SubscriptionPlanType;
    price_mo: number;
    price_yr: number;
    desc: string;
    icon: any;
    color: string;
    features: string[];
  }> = [
    {
      name: "Free Plan",
      price_mo: 0,
      price_yr: 0,
      desc: "Standard tier with ad-sponsored playback.",
      icon: Laptop,
      color: "border-white/5 bg-zinc-950/20",
      features: ["Standard 128kbps quality", "Ad-supported playback", "Basic online streams"]
    },
    {
      name: "Premium Student",
      price_mo: 4.99,
      price_yr: 49.99,
      desc: "Extreme audio specs for authenticated learners.",
      icon: GraduationCap,
      color: "border-indigo-500/10 bg-indigo-950/10",
      features: ["320kbps Lossless audio", "100% Ad-Free experience", "Offline download support", "Unlimited track skips", "Student community validation"]
    },
    {
      name: "Premium Individual",
      price_mo: 9.99,
      price_yr: 99.99,
      desc: "Unrestricted master sound on any player.",
      icon: Star,
      color: "border-amber-500/20 bg-amber-950/10",
      features: ["FLAC Lossless Studio masters", "100% Ad-Free experience", "Offline direct caching", "Unlimited track skips", "Priority 24/7 Support"]
    },
    {
      name: "Premium Family",
      price_mo: 14.99,
      price_yr: 149.99,
      desc: "Premium credentials for up to 6 members.",
      icon: Users,
      color: "border-pink-500/20 bg-pink-950/10",
      features: ["6 Individual accounts", "FLAC Lossless Studio masters", "100% Ad-Free experience", "Offline direct caching", "Family safe filters"]
    },
    {
      name: "Creator Pro",
      price_mo: 19.99,
      price_yr: 199.99,
      desc: "Unlock custom release models, verification check and higher payouts.",
      icon: Award,
      color: "border-emerald-500/20 bg-emerald-950/10",
      features: ["All Premium Features", "Creator analytic modules", "Direct tip links", "Exclusive content locks", "Blue verified crest option"]
    }
  ];

  return (
    <div className="max-w-6xl mx-auto py-4 font-sans text-zinc-300">
      
      {/* Upper Navigation Tabs */}
      <div className="flex border-b border-white/5 mb-8 overflow-x-auto pb-1 gap-1">
        <button
          onClick={() => setActiveTab("plans")}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
            activeTab === "plans" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          Subscription Plans
        </button>
        <button
          onClick={() => setActiveTab("benefits")}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
            activeTab === "benefits" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          Premium Benefits
        </button>
        <button
          onClick={() => setActiveTab("testing")}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
            activeTab === "testing" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          System Testing Panel
        </button>
      </div>

      {activeTab === "plans" && (
        <div className="space-y-8">
          {/* Header section */}
          <div className="text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white mb-2 flex items-center justify-center md:justify-start gap-2.5">
                <Award className="w-8 h-8 text-indigo-400 animate-pulse" />
                <span>SoundStream Premium Plans</span>
              </h1>
              <p className="text-zinc-400 text-sm max-w-xl">
                Unlock ad-free streaming, ultimate FLAC audio quality, offline downloads, unlimited skips, and premium event options.
              </p>
            </div>

            {/* Current Entitlement Banner */}
            <div className={`p-4 rounded-2xl border text-center min-w-[240px] ${
              isPremium 
                ? "bg-indigo-950/25 border-indigo-500/30 text-indigo-100" 
                : "bg-zinc-900 border-white/5 text-zinc-400"
            }`}>
              <p className="text-[10px] font-mono uppercase tracking-wider mb-1">Your Account Status</p>
              <p className="text-lg font-black tracking-tight">{currentPlanName.toUpperCase()}</p>
              <p className="text-[10px] text-zinc-500 mt-1">
                {isPremium ? `Expires/Renews: ${userSub?.renewalDate ? new Date(userSub.renewalDate).toLocaleDateString() : "Never"}` : "Unrestricted base ad tier"}
              </p>
            </div>
          </div>

          {/* Pricing Switcher */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-zinc-900/35 border border-white/5 rounded-2xl">
            <div>
              <h3 className="text-white font-extrabold text-sm">Select Billing Frequency</h3>
              <p className="text-[11px] text-zinc-500">Save up to 20% on sound assets by choosing yearly subscription options.</p>
            </div>
            
            <div className="bg-zinc-950 p-1.5 rounded-xl border border-white/5 flex gap-1 select-none">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                  billingCycle === "monthly" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                Monthly Rates
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("yearly")}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1 ${
                  billingCycle === "yearly" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                Yearly (-20%)
              </button>
            </div>
          </div>

          {/* Plans Grid layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {PLANS_LIST.map((plan) => {
              const isCurrent = currentPlanName === plan.name;
              const priceVal = billingCycle === "monthly" ? plan.price_mo : plan.price_yr;
              const priceStr = plan.name === "Free Plan" ? "Free" : `$${priceVal.toFixed(2)}`;
              const cycleStr = billingCycle === "monthly" ? "/mo" : "/yr";
              const IconComp = plan.icon;

              return (
                <div 
                  key={plan.name}
                  className={`border rounded-2xl p-5 flex flex-col justify-between transition-all relative ${plan.color} ${
                    isCurrent ? "ring-2 ring-indigo-500 border-indigo-500" : "hover:border-white/10"
                  }`}
                >
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-[9px] font-black uppercase text-white px-3 py-1 rounded-full tracking-wider shadow">
                      ACTIVE TIER
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2 mb-3 text-white">
                      <div className="p-1.5 bg-white/5 rounded-lg">
                        <IconComp className="w-4 h-4 text-indigo-400" />
                      </div>
                      <h4 className="font-extrabold text-xs tracking-tight uppercase truncate">{plan.name}</h4>
                    </div>

                    <p className="text-[11px] text-zinc-400 leading-normal mb-4 min-h-[32px]">{plan.desc}</p>
                    
                    <div className="mb-4">
                      <span className="text-2xl font-black text-white">{priceStr}</span>
                      {plan.name !== "Free Plan" && <span className="text-[10px] text-zinc-500">{cycleStr}</span>}
                    </div>

                    <ul className="text-[10px] space-y-2 border-t border-white/5 pt-4">
                      {plan.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-zinc-400 leading-normal">
                          <Check className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 pt-2">
                    {isCurrent ? (
                      <span className="block w-full text-center text-[10px] bg-zinc-800 text-zinc-500 py-2.5 rounded-xl font-bold uppercase select-none">
                        Current Active Plan
                      </span>
                    ) : (
                      <button
                        onClick={() => handleOpenCheckout(plan.name)}
                        disabled={isProcessing}
                        className="w-full text-center text-[10px] bg-indigo-600 hover:bg-indigo-550 text-white py-2.5 rounded-xl font-bold uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        {plan.name === "Free Plan" ? "Downgrade / Downgrade Plan" : "Select & Upgrade"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Secure trust footnote */}
          <div className="p-4 bg-zinc-900/35 border border-white/5 rounded-2xl flex items-center gap-3">
            <Lock className="w-5 h-5 text-indigo-400 shrink-0" />
            <p className="text-xs text-zinc-400 leading-relaxed">
              <strong>Enterprise Level Security</strong>: SoundStream handles no primary card details or database storage files. All billing sequences run with full 256-bit encryption through <strong>Stripe</strong>, <strong>Google Play Billing</strong>, <strong>Apple In-App Purchases</strong>, or <strong>PayPal Secure sandbox API integrations</strong>.
            </p>
          </div>
        </div>
      )}

      {activeTab === "benefits" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          {/* Left panel: Premium Feature Dashboard Controls */}
          <div className="lg:col-span-3 bg-zinc-900/50 border border-white/5 p-6 rounded-3xl space-y-6">
            <div className="border-b border-white/5 pb-4">
              <h3 className="text-white font-extrabold text-base flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-400" />
                Active Premium Controls
              </h3>
              <p className="text-[11px] text-zinc-500 mt-1">Configure your Lossless, downloads, and background sync profiles.</p>
            </div>

            {/* Audio quality settings */}
            <div className="space-y-3">
              <label className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-bold flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-indigo-400" />
                Audio Bitrate Precision
              </label>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setAudioQuality("standard")}
                  className={`p-3 rounded-xl text-left border cursor-pointer transition-all ${
                    audioQuality === "standard"
                      ? "bg-indigo-950/25 border-indigo-500 text-white"
                      : "bg-zinc-950/40 border-white/5 text-zinc-500 hover:border-white/10"
                  }`}
                >
                  <span className="block font-bold text-xs">128 kbps AAC</span>
                  <span className="text-[9px] text-zinc-500">Standard Data Saver</span>
                </button>

                <button
                  onClick={() => setAudioQuality("high")}
                  className={`p-3 rounded-xl text-left border cursor-pointer transition-all ${
                    audioQuality === "high"
                      ? "bg-indigo-950/25 border-indigo-500 text-white"
                      : "bg-zinc-950/40 border-white/5 text-zinc-500 hover:border-white/10"
                  }`}
                >
                  <span className="block font-bold text-xs">256 kbps AAC</span>
                  <span className="text-[9px] text-zinc-500">High Fidelity Sound</span>
                </button>

                <button
                  onClick={() => {
                    if (!isPremium) {
                      alert("Upgrade to a SoundStream Premium Plan to unlock 320kbps Extreme High-Fidelity quality!");
                      return;
                    }
                    setAudioQuality("extreme");
                  }}
                  className={`p-3 rounded-xl text-left border cursor-pointer transition-all ${
                    !isPremium ? "opacity-50" : ""
                  } ${
                    audioQuality === "extreme"
                      ? "bg-indigo-950/25 border-indigo-500 text-white"
                      : "bg-zinc-950/40 border-white/5 text-zinc-500 hover:border-white/10"
                  }`}
                >
                  <span className="block font-bold text-xs flex items-center gap-1">
                    320 kbps MP3 <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                  </span>
                  <span className="text-[9px] text-zinc-500">Extreme Premium MP3</span>
                </button>

                <button
                  onClick={() => {
                    if (!isPremium) {
                      alert("Upgrade to a SoundStream Premium Plan to unlock Lossless Studio Master FLAC!");
                      return;
                    }
                    setAudioQuality("flac");
                  }}
                  className={`p-3 rounded-xl text-left border cursor-pointer transition-all ${
                    !isPremium ? "opacity-50" : ""
                  } ${
                    audioQuality === "flac"
                      ? "bg-indigo-950/25 border-indigo-500 text-white"
                      : "bg-zinc-950/40 border-white/5 text-zinc-500 hover:border-white/10"
                  }`}
                >
                  <span className="block font-bold text-xs flex items-center gap-1">
                    FLAC Losless <Sparkles className="w-3 h-3 text-indigo-400 shrink-0 animate-pulse" />
                  </span>
                  <span className="text-[9px] text-zinc-500"> Lossless Studio Masters</span>
                </button>
              </div>
            </div>

            {/* Offline sync status */}
            <div className="space-y-3 border-t border-white/5 pt-5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-bold flex items-center gap-2">
                  <CloudOff className="w-4 h-4 text-indigo-400" />
                  Offline Downloads Sync
                </label>
                <button
                  onClick={() => {
                    if (!isPremium) {
                      alert("Offline Sync is a premium-only feature. Please choose a premium plan!");
                      return;
                    }
                    setOfflineSync(!offlineSync);
                  }}
                  className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors cursor-pointer ${
                    offlineSync && isPremium ? "bg-indigo-600" : "bg-zinc-800"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      offlineSync && isPremium ? "translate-x-5.5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {isPremium && offlineSync ? (
                <div className="p-3.5 bg-zinc-950/50 border border-white/5 rounded-xl flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1">
                      <Database className="w-4 h-4 text-zinc-500" />
                      Cache Space Used: <strong className="text-white font-mono ml-1">{cacheSize}</strong>
                    </span>
                    <p className="text-[9px] text-zinc-500 mt-1">Temporary local audio storage blocks</p>
                  </div>
                  <button
                    onClick={clearOfflineCache}
                    disabled={clearingCache}
                    className="px-3 py-1.5 text-[9px] uppercase font-extrabold tracking-wider bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-lg flex items-center gap-1.5 cursor-pointer border-none"
                  >
                    {clearingCache ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Purge Cache"}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 bg-zinc-950/20 p-3 rounded-xl border border-white/5 text-center leading-relaxed">
                  {!isPremium 
                    ? "Upgrade to premium to securely cache high quality tracks for seamless offline listen." 
                    : "Flip sync on to cache audio buffers automatically as they stream."}
                </p>
              )}
            </div>

            {/* Device Background sessions */}
            <div className="space-y-3 border-t border-white/5 pt-5">
              <label className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-bold flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-indigo-400" />
                Background Playback integrations
              </label>
              <div className="p-3 bg-zinc-950/10 border border-white/5 rounded-xl space-y-2 text-xs text-zinc-400 leading-relaxed">
                <p>SoundStream fully handles platform background streaming loops:</p>
                <ul className="list-disc pl-5 space-y-1 text-[11px] text-zinc-500">
                  <li><strong>Web API Layer</strong>: Incorporates <code>navigator.mediaSession</code>, mapping lockscreen controls for audio tracks.</li>
                  <li><strong>Android Native Support</strong>: Keeps player service bindings active behind native shells.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Right panel: Feature Comparison lists */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-zinc-900/35 border border-white/5 p-6 rounded-3xl">
              <h4 className="text-xs font-mono uppercase tracking-widest text-indigo-400 font-extrabold mb-4">Core Premium Benefits</h4>
              <ul className="space-y-4 text-xs text-zinc-350 leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <div className="p-1 bg-indigo-500/10 text-indigo-400 rounded-lg shrink-0 mt-0.5">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-bold text-white">100% Ad-Free Experience</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Zero banner ads, interstitial cards, or rewarded blockers.</p>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <div className="p-1 bg-amber-500/10 text-amber-400 rounded-lg shrink-0 mt-0.5">
                    <Volume2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-bold text-white">Extreme Audio Quality</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Stream at uncompressed studio FLAC quality for extreme depth.</p>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <div className="p-1 bg-pink-500/10 text-pink-400 rounded-lg shrink-0 mt-0.5">
                    <CloudOff className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-bold text-white">Offline Downloads</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Download full high-fidelity playlists and listen without data limits.</p>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <div className="p-1 bg-emerald-500/10 text-emerald-400 rounded-lg shrink-0 mt-0.5">
                    <Star className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-bold text-white">Unlimited skips</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">No daily constraints or skip blocks. Cycle tracks uninhibited.</p>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <div className="p-1 bg-violet-500/10 text-violet-400 rounded-lg shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-bold text-white">Exclusive releases</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">First-access to master album records, live feeds, and special shorts.</p>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <div className="p-1 bg-cyan-500/10 text-cyan-400 rounded-lg shrink-0 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-bold text-white">Priority Direct Support</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Fast-lane response tags on all inquiries and technical tickets.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

        </div>
      )}

      {activeTab === "testing" && (
        <div className="bg-zinc-900/35 border border-white/5 p-6 rounded-3xl max-w-2xl mx-auto space-y-6">
          <div>
            <h3 className="text-white font-extrabold text-sm flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-400" />
              SoundStream Monetization Testing Panel
            </h3>
            <p className="text-xs text-zinc-500 mt-1">Verify real-time Firestore synchronization, trigger automated notifications, and simulate subscription lifecycles.</p>
          </div>

          {testNotification && (
            <div className="p-4.5 bg-indigo-950/20 border border-indigo-500/10 rounded-2xl text-indigo-300 text-xs">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4.5 h-4.5 text-indigo-400 shrink-0 mt-0.5" />
                <p>{testNotification}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-zinc-950/40 border border-white/5 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-400" />
                Subscription Lifecycle
              </h4>
              <p className="text-[10px] text-zinc-500 leading-normal">Test automated cron renewal cycles or temporary session expiration triggers.</p>
              
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={simulateRenewal}
                  disabled={isProcessing}
                  className="w-full text-center text-[10px] bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/15 py-2.5 rounded-xl font-bold uppercase transition-colors cursor-pointer"
                >
                  Simulate Renewal Sync
                </button>
                <button
                  onClick={simulateExpiry}
                  disabled={isProcessing}
                  className="w-full text-center text-[10px] bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/15 py-2.5 rounded-xl font-bold uppercase transition-colors cursor-pointer"
                >
                  Simulate Expiration Sync
                </button>
              </div>
            </div>

            <div className="p-4 bg-zinc-950/40 border border-white/5 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-indigo-400" />
                Sandbox Payment Gateway
              </h4>
              <p className="text-[10px] text-zinc-500 leading-normal">Simulate payment validation checks and duplicate charge blockades.</p>
              
              <div className="space-y-2 text-[10px] text-zinc-400 leading-normal bg-zinc-900/30 p-2.5 rounded-lg">
                <p>💡 <strong>Validation Test Code</strong>:</p>
                <ul className="list-disc pl-4 space-y-1 text-[9px] text-zinc-500">
                  <li>Enter card number <strong>`fail`</strong> or <strong>`4111111111111111`</strong> on stripe payment to trigger bank decline simulation.</li>
                  <li>Success card uses automatic unique transactional checks.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          CHECKOUT MODAL POPUP
         ========================================== */}
      {checkoutPlan && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-[#121214] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden">
            {/* Decorative flow blur */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full filter blur-3xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Secure SoundStream Checkout</h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Plan: {checkoutPlan}</p>
                </div>
              </div>
              <button 
                onClick={() => setCheckoutPlan(null)}
                className="p-1.5 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {checkoutSuccess ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-white font-extrabold text-lg">Payment Complete!</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Thank you! Your transaction is secured. Subscription <strong>{checkoutSuccess.subscriptionId}</strong> for <strong>{checkoutSuccess.plan}</strong> has been created and synced with Firestore.
                  </p>
                </div>
                
                <div className="bg-zinc-950/50 p-3.5 rounded-xl border border-white/5 max-w-sm mx-auto text-left space-y-1.5">
                  <div className="flex justify-between text-[11px] text-zinc-500">
                    <span>Transaction status:</span>
                    <span className="font-mono text-emerald-400 uppercase font-bold">APPROVED</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-zinc-500">
                    <span>Price paid:</span>
                    <span className="text-white font-bold">${checkoutSuccess.price.toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-zinc-500">
                    <span>Payment provider:</span>
                    <span className="text-zinc-350 font-mono">{checkoutSuccess.paymentProvider.toUpperCase()}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setCheckoutPlan(null)}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-550 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Regain sound streams
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleProcessCheckout} className="space-y-5">
                
                {checkoutError && (
                  <div className="p-3 bg-rose-950/20 border border-rose-500/15 text-rose-400 text-xs rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>{checkoutError}</p>
                  </div>
                )}

                {/* Amount detail overview */}
                <div className="bg-zinc-950/60 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Billed total:</span>
                    <h5 className="text-white text-lg font-black mt-0.5">
                      ${(billingCycle === "monthly" ? PLAN_PRICES[checkoutPlan]["monthly"] : PLAN_PRICES[checkoutPlan]["yearly"]).toFixed(2)} USD
                    </h5>
                  </div>
                  <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">
                    {billingCycle.toUpperCase()} REBILLING
                  </span>
                </div>

                {/* Payment method select */}
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-bold">Select Secured Provider</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(["stripe", "paypal", "google_play", "apple_iap"] as PaymentProviderType[]).map((prov) => {
                      const isSel = selectedProvider === prov;
                      return (
                        <button
                          key={prov}
                          type="button"
                          onClick={() => {
                            setSelectedProvider(prov);
                            setCheckoutError(null);
                          }}
                          className={`py-2 text-[10px] font-bold uppercase rounded-lg border text-center transition-all cursor-pointer ${
                            isSel 
                              ? "bg-indigo-950/20 border-indigo-500 text-white shadow" 
                              : "bg-zinc-950/40 border-white/5 text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          {prov === "stripe" && "Stripe"}
                          {prov === "paypal" && "PayPal"}
                          {prov === "google_play" && "G-Play"}
                          {prov === "apple_iap" && "App Store"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Conditional details inputs */}
                {selectedProvider === "stripe" && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5 font-bold">Cardholder Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Burna Damini"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-zinc-950 border border-white/5 focus:border-indigo-500/30 text-xs focus:outline-none transition-all placeholder-zinc-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5 font-bold">Secure Card Number</label>
                      <input
                        type="text"
                        required
                        maxLength={16}
                        placeholder="4111 2222 3333 4444 (or 'fail' to test declination)"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-zinc-950 border border-white/5 focus:border-indigo-500/30 text-xs focus:outline-none transition-all placeholder-zinc-700 font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5 font-bold">Expiration Date</label>
                        <input
                          type="text"
                          required
                          maxLength={5}
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="w-full p-2.5 rounded-xl bg-zinc-950 border border-white/5 focus:border-indigo-500/30 text-xs focus:outline-none transition-all placeholder-zinc-700 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5 font-bold">CVV Block</label>
                        <input
                          type="password"
                          required
                          maxLength={3}
                          placeholder="***"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          className="w-full p-2.5 rounded-xl bg-zinc-950 border border-white/5 focus:border-indigo-500/30 text-xs focus:outline-none transition-all placeholder-zinc-700 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedProvider === "paypal" && (
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5 font-bold">PayPal Sandbox Email</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. buyer@example.com (or 'fail' to test decline)"
                      value={paypalEmail}
                      onChange={(e) => setPaypalEmail(e.target.value)}
                      className="w-full p-3 rounded-xl bg-zinc-950 border border-white/5 focus:border-indigo-500/30 text-xs focus:outline-none transition-all placeholder-zinc-700"
                    />
                  </div>
                )}

                {selectedProvider === "google_play" && (
                  <div className="bg-zinc-950/40 p-3.5 rounded-xl border border-white/5 text-xs text-zinc-550 leading-relaxed text-center">
                    🤖 Android Native Google Play In-App purchase synchronization active. Proceeding below simulates standard token settlement.
                  </div>
                )}

                {selectedProvider === "apple_iap" && (
                  <div className="bg-zinc-950/40 p-3.5 rounded-xl border border-white/5 text-xs text-zinc-550 leading-relaxed text-center">
                    🍎 iOS App Store In-App purchase synchronization active. Proceeding below simulates standard receipt settlement.
                  </div>
                )}

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-550 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg cursor-pointer"
                  >
                    {isProcessing ? "Validating & Settling transaction..." : "Authorize Sandbox Payment"}
                  </button>
                  <p className="text-[9px] text-zinc-650 text-center mt-2 leading-relaxed">
                    By authorizing, you agree to allow simulated re-billing cycles. This is an evaluation sandbox page. Card values are processed locally. No credit card metrics are stored.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
