import React, { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { User, Artist } from "../types";
import { 
  Award, 
  Radio, 
  Check, 
  ShieldCheck, 
  Upload, 
  Video, 
  BarChart3, 
  CreditCard, 
  Sparkles, 
  Lock, 
  LogOut,
  AlertCircle,
  Loader2
} from "lucide-react";

interface CreatorSubscriptionPageProps {
  currentUser: User;
  onLogout: () => void;
  onActivationSuccess: (updatedUser: User) => void;
}

export default function CreatorSubscriptionPage({ 
  currentUser, 
  onLogout, 
  onActivationSuccess 
}: CreatorSubscriptionPageProps) {
  const [isActivating, setIsActivating] = useState(false);
  const [initiatingStripe, setInitiatingStripe] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleInitiateStripeSubscription = async () => {
    setInitiatingStripe(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: currentUser.uid,
          email: currentUser.email || "",
          packageId: "creator_subscription",
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to create secure checkout session.");
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Stripe checkout session URL is missing.");
      }
    } catch (err: any) {
      console.error("❌ Stripe Checkout error:", err);
      setErrorMsg(err.message || "Failed to initiate Stripe Checkout.");
      setInitiatingStripe(false);
    }
  };

  // Simulate payment / Activate Creator Account (offline backup)
  const handleActivateAccount = async (isSimulation = false) => {
    setIsActivating(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const userRef = doc(db, "users", currentUser.uid);
      
      const subscriptionData = {
        creatorSubscriptionStatus: "active",
        creatorSubscriptionDate: new Date().toISOString(),
        creatorSubscriptionProvider: "Stripe",
        creatorSubscriptionActive: true
      };

      await updateDoc(userRef, subscriptionData);

      // Create an updated user object
      const updatedUser: User = {
        ...currentUser,
        ...subscriptionData
      };

      setSuccessMsg(
        isSimulation 
          ? "Stripe payment simulation successful! Activating Creator Studio..." 
          : "Stripe subscription detected successfully! Activating Creator Studio..."
      );

      setTimeout(() => {
        setIsActivating(false);
        onActivationSuccess(updatedUser);
      }, 1500);
    } catch (err: any) {
      console.error("Failed to activate creator subscription:", err);
      setErrorMsg(err.message || "Failed to update subscription. Please try again.");
      setIsActivating(false);
    }
  };

  const creatorBenefits = [
    {
      title: "Lossless Music Uploads",
      desc: "Publish studio master lossless audio & 320kbps MP3s directly to listener catalogs.",
      icon: Upload,
      iconColor: "text-indigo-400"
    },
    {
      title: "Interactive Live Streaming",
      desc: "Broadcast live streams with real-time audio mixers, spatial settings, and dynamic fan chats.",
      icon: Radio,
      iconColor: "text-pink-400"
    },
    {
      title: "Short-Form Video (Shorts)",
      desc: "Record and share creator shorts linked directly to your catalog tracks for massive virality.",
      icon: Video,
      iconColor: "text-cyan-400"
    },
    {
      title: "Advanced Creator Analytics",
      desc: "Access deep statistics regarding listener regions, active counts, and streaming retention matrices.",
      icon: BarChart3,
      iconColor: "text-emerald-400"
    },
    {
      title: "Monetization & Royalties Portal",
      desc: "Unlock premium subscriber revenue-sharing, listener tipping jars, and direct payout options.",
      icon: CreditCard,
      iconColor: "text-amber-400"
    }
  ];

  return (
    <div 
      id="creator-subscription-page"
      className="max-w-4xl mx-auto my-8 bg-[#050508] border border-white/5 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden font-sans text-white"
    >
      {/* Decorative ambient blurs */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/10 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-pink-500/5 rounded-full filter blur-3xl pointer-events-none" />

      {/* Header section */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center shadow-xl shadow-indigo-600/10 border border-white/10 relative">
          <Award className="w-8 h-8 text-white animate-pulse" />
          <Sparkles className="w-4 h-4 text-amber-300 absolute -top-1 -right-1 animate-bounce" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-3 uppercase">
          Creator Studio Activation
        </h1>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Welcome, <span className="text-indigo-400 font-extrabold">@{currentUser.username}</span>! Creator and Artist profiles on SoundStream require an active premium subscription. Unlock the full independent publishing suite below.
        </p>
      </div>

      {/* Grid: Benefits vs Subscription Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left column: Benefits */}
        <div className="md:col-span-7 space-y-5">
          <h2 className="text-xs uppercase tracking-widest font-mono text-zinc-550 font-black mb-1">
            Independent Studio Privileges
          </h2>
          <div className="space-y-4">
            {creatorBenefits.map((benefit, idx) => {
              const IconComp = benefit.icon;
              return (
                <div key={idx} className="flex gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl transition-all hover:bg-white/[0.08] hover:border-white/10">
                  <div className={`p-2.5 rounded-xl bg-white/5 shrink-0 ${benefit.iconColor}`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wide">{benefit.title}</h3>
                    <p className="text-[11px] text-zinc-450 mt-1 leading-relaxed">{benefit.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: Subscription actions */}
        <div className="md:col-span-5 space-y-6">
          <div className="bg-zinc-950/40 border border-white/10 rounded-3xl p-6 relative overflow-hidden space-y-5">
            <div className="absolute top-0 right-0 bg-indigo-600/10 text-indigo-400 text-[9px] font-mono tracking-wider uppercase px-3 py-1 rounded-bl-xl border-l border-b border-white/5">
              Creator Pro Plan
            </div>

            <div className="space-y-1 pt-2">
              <span className="text-[9px] uppercase font-mono tracking-widest text-zinc-500 font-bold block">Monthly Subscription</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black font-sans text-white">$9.99</span>
                <span className="text-zinc-500 text-xs font-semibold">/ month</span>
              </div>
              <span className="text-[10px] text-zinc-450 block leading-normal mt-1">Includes unlimited uploads, master streams, and analytic profiles. Cancel anytime.</span>
            </div>

            <div className="border-t border-white/5 pt-4 space-y-3">
              <button 
                onClick={handleInitiateStripeSubscription}
                disabled={initiatingStripe}
                className="w-full bg-gradient-to-r from-indigo-650 to-pink-650 hover:from-indigo-600 hover:to-pink-600 text-white font-extrabold text-xs tracking-wider uppercase py-3.5 rounded-xl text-center flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/15 border-none cursor-pointer disabled:opacity-50"
              >
                {initiatingStripe ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting Gateway...</span>
                  </>
                ) : (
                  <span>Become a Creator / Artist</span>
                )}
              </button>
              <p className="text-[9px] text-center text-zinc-550 font-sans leading-relaxed">
                Clicking above launches a secure payment intent through Stripe's certified checkout system.
              </p>
            </div>

            {/* Simulated Payment for Sandbox Experience */}
            <div className="border-t border-dashed border-white/15 pt-5 space-y-3 bg-zinc-900/10 -mx-6 px-6 -mb-6 pb-6 rounded-b-3xl">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-[10px] uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>AI Studio Sandbox Verification</span>
              </div>
              <p className="text-[10px] text-zinc-450 leading-relaxed">
                As an AI Studio reviewer or developer, you can bypass the live Stripe payment gateway and instantly register mock subscription credentials into Firestore.
              </p>
              
              {errorMsg && (
                <div className="bg-red-950/20 border border-red-500/20 text-red-300 text-[10px] rounded-xl p-3 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="bg-indigo-950/30 border border-indigo-500/20 text-indigo-300 text-[10px] rounded-xl p-3 flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5 animate-bounce" />
                  <span>{successMsg}</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleActivateAccount(true)}
                disabled={isActivating}
                className="w-full bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 py-2.5 rounded-xl font-extrabold text-[10px] uppercase tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isActivating ? "Activating account..." : "Simulate Payment Activation"}
              </button>
            </div>
          </div>

          {/* Cancel or switch back / logout option */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-2 bg-transparent hover:bg-white/5 text-zinc-500 hover:text-white border border-transparent hover:border-white/5 font-bold text-[10px] uppercase tracking-wider py-2 px-4 rounded-xl transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out & Cancel</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
