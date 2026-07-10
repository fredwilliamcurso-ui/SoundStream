import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShieldCheck, 
  X, 
  Sparkles, 
  Play, 
  Volume2, 
  VolumeX, 
  Award, 
  Info, 
  ExternalLink,
  ChevronRight,
  Tv,
  CheckCircle2,
  Clock
} from "lucide-react";
import { admob, GDPRConsent, ADMOB_TEST_IDS } from "../lib/admob";
import { User } from "../types";

// ==========================================
// 1. GDPR CONSENT DIALOG
// ==========================================
interface GDPRConsentDialogProps {
  user: User | null;
  onConsentComplete: (consent: GDPRConsent) => void;
}

export function GDPRConsentDialog({ user, onConsentComplete }: GDPRConsentDialogProps) {
  const [show, setShow] = useState(false);
  const [personalized, setPersonalized] = useState(true);

  useEffect(() => {
    // Show after 1.5 seconds if no consent exists
    const consent = admob.getConsent();
    if (!consent) {
      const timer = setTimeout(() => {
        setShow(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!show) return null;

  const handleAcceptAll = () => {
    const consent = admob.saveConsent(true, true);
    setShow(false);
    onConsentComplete(consent);
  };

  const handleAcceptCustom = () => {
    const consent = admob.saveConsent(true, personalized);
    setShow(false);
    onConsentComplete(consent);
  };

  const handleRejectAll = () => {
    const consent = admob.saveConsent(false, false);
    setShow(false);
    onConsentComplete(consent);
  };

  return (
    <AnimatePresence>
      <div id="gdpr-consent-backdrop" className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-md">
        <motion.div
          id="gdpr-consent-card"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-[#121214] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden"
        >
          {/* Decorative glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-500/10 rounded-full filter blur-3xl pointer-events-none" />

          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white leading-tight">Privacy & Consent Choices</h3>
              <p className="text-[10px] text-indigo-400 font-mono uppercase tracking-wider">GDPR & Google Publisher Policy</p>
            </div>
          </div>

          <div className="space-y-4 text-sm text-zinc-300 leading-relaxed mb-6 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar relative z-10">
            <p>
              SoundStream and our advertising partners (including Google AdMob) use device identifiers and personal information to serve relevant music recommendations and advertisements, measure performance, and deliver personalized experiences.
            </p>
            <p>
              To comply with the European Union User Consent Policy (GDPR), we ask for your choice on whether you consent to data collection and customized ads.
            </p>

            <div className="bg-black/40 border border-white/5 rounded-2xl p-4 space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <div className="pr-4">
                  <p className="font-bold text-zinc-200 text-xs">Personalized Advertisements</p>
                  <p className="text-[10px] text-zinc-500">Allow Google AdMob and its vendors to deliver ads matched to your demographic interests.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={personalized} 
                    onChange={(e) => setPersonalized(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-650 peer-checked:after:bg-white" />
                </label>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 italic mt-2">
              Free accounts are funded by advertising. You can withdraw your consent or manage choices at any time in the settings tab, or upgrade to SoundStream Premium for an ad-free premium streaming experience.
            </p>
          </div>

          <div className="flex flex-col gap-3 relative z-10">
            <button
              id="gdpr-accept-all"
              onClick={handleAcceptAll}
              className="w-full bg-indigo-650 hover:bg-indigo-600 text-white font-bold py-3.5 px-4 rounded-xl transition-all cursor-pointer shadow-lg hover:shadow-indigo-500/10 text-xs uppercase tracking-wider"
            >
              Consent & Accept All
            </button>
            <div className="flex gap-3">
              <button
                id="gdpr-accept-custom"
                onClick={handleAcceptCustom}
                className="flex-1 bg-[#1c1c1f] hover:bg-[#27272a] text-zinc-200 border border-white/5 font-bold py-3 px-4 rounded-xl transition-all text-xs uppercase"
              >
                Save Choice
              </button>
              <button
                id="gdpr-reject-all"
                onClick={handleRejectAll}
                className="flex-1 bg-transparent hover:bg-white/5 text-zinc-500 hover:text-zinc-400 font-bold py-3 px-4 rounded-xl transition-all text-xs uppercase"
              >
                Reject & Basic Ads
              </button>
            </div>
          </div>

          <div className="mt-5 text-center relative z-10">
            <a 
              href="#privacy" 
              className="inline-flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-indigo-400 underline transition-colors"
              onClick={(e) => {
                e.preventDefault();
                alert("SoundStream Privacy Policy:\n\nWe care about your privacy. All user profile and media metadata details are securely maintained inside Firebase Firestore. Your listening details are processed locally or used to deliver personalized music streams. Free tier accounts receive AdMob Test Ads according to user's personalized toggle status.");
              }}
            >
              Read our full Privacy Policy <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}


// ==========================================
// 2. ADMOB BANNER AD COMPONENT
// ==========================================
interface AdMobBannerProps {
  user: User | null;
  placementId: string;
}

export function AdMobBanner({ user, placementId }: AdMobBannerProps) {
  const [adLoaded, setAdLoaded] = useState(false);
  const [adFailed, setAdFailed] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    if (admob.isPremiumUser(user)) return;

    // Simulate async loading of AdMob Banner (takes 800ms)
    const loadTimer = setTimeout(() => {
      setAdLoaded(true);
      admob.logAdEvent(user?.uid, "banner_impression", ADMOB_TEST_IDS.BANNER);
    }, 800);

    return () => clearTimeout(loadTimer);
  }, [user, placementId]);

  // Don't render banner if user is Premium
  if (admob.isPremiumUser(user)) return null;
  if (adFailed) return null;

  return (
    <div 
      id={`admob-banner-container-${placementId}`}
      className="w-full bg-[#0d0d0f] border-t border-white/5 py-3 px-4 text-center select-none relative overflow-hidden"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10">
        
        {/* Left Side: Mock AdMob Indicator */}
        <div className="flex items-center gap-2.5">
          <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 font-mono text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded">
            Ad
          </span>
          <div className="text-left">
            <h4 className="text-xs font-bold text-zinc-200">AdMob Test Banner - Limited Promo</h4>
            <p className="text-[10px] text-zinc-500 font-mono">{ADMOB_TEST_IDS.BANNER}</p>
          </div>
        </div>

        {/* Center: Interactive Simulated Banner offer */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 text-zinc-400 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>Support SoundStream. Try Premium to permanently remove all banners.</span>
          </div>
          <button 
            onClick={() => {
              const customEvent = new CustomEvent("open-premium-upgrade");
              window.dispatchEvent(customEvent);
            }}
            className="bg-indigo-650 hover:bg-indigo-600 text-white font-extrabold text-[10px] uppercase tracking-wider py-1.5 px-3.5 rounded-lg transition-all"
          >
            Upgrade Free
          </button>
        </div>

        {/* Right Side: Quick Action info */}
        <div className="flex items-center gap-2">
          <button 
            title="Ad choices info"
            onClick={() => setShowInfo(!showInfo)}
            className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
          <button 
            title="Report or close Ad"
            onClick={() => setAdFailed(true)}
            className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showInfo && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="max-w-xl mx-auto mt-2 p-3 bg-black/60 border border-white/5 rounded-xl text-left text-[10px] text-zinc-400 leading-normal"
        >
          This is an official Google AdMob test ad unit placeholder ({ADMOB_TEST_IDS.BANNER}). In a production build, these spaces render real advertisement assets targeted natively. Your data remains secure, and choices can be revoked inside settings anytime.
        </motion.div>
      )}

      {/* Ambient decorative glow */}
      <div className="absolute -bottom-10 left-1/4 w-32 h-20 bg-indigo-500/5 rounded-full filter blur-2xl pointer-events-none" />
    </div>
  );
}


// ==========================================
// 3. ADMOB INTERSTITIAL AD COMPONENT
// ==========================================
interface AdMobInterstitialProps {
  user: User | null;
  onAdClosed: () => void;
}

export function AdMobInterstitial({ user, onAdClosed }: AdMobInterstitialProps) {
  const [countdown, setCountdown] = useState(6);
  const [canSkip, setCanSkip] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    // Save impression log
    admob.logAdEvent(user?.uid, "interstitial", ADMOB_TEST_IDS.INTERSTITIAL);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanSkip(true);
          return 0;
        }
        if (prev === 4) {
          setCanSkip(true); // Allow skip after 2 seconds for high satisfaction UI
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [user]);

  const handleClose = () => {
    onAdClosed();
  };

  return (
    <div id="admob-interstitial-backdrop" className="fixed inset-0 bg-[#09090b] z-[60] flex flex-col items-center justify-between p-6 select-none font-sans">
      {/* Top Bar Controls */}
      <div className="w-full max-w-4xl flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 font-mono text-[9px] font-extrabold uppercase px-2 py-0.5 rounded">
            Test Ad
          </span>
          <span className="text-zinc-500 text-xs font-mono">Interstitial Unit - {ADMOB_TEST_IDS.INTERSTITIAL}</span>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setMuted(!muted)}
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {canSkip ? (
            <button
              id="interstitial-close-btn"
              onClick={handleClose}
              className="flex items-center gap-1.5 bg-white text-black font-extrabold text-xs uppercase px-4 py-2 rounded-full hover:bg-zinc-200 transition-all shadow-lg"
            >
              <span>Close Ad</span>
              <X className="w-4 h-4" />
            </button>
          ) : (
            <div className="bg-white/10 border border-white/5 text-zinc-300 font-mono text-xs font-bold px-4 py-2 rounded-full">
              Close in {countdown}s
            </div>
          )}
        </div>
      </div>

      {/* Main Immersive Advertisement content body */}
      <div className="w-full max-w-xl text-center space-y-6 my-auto z-10 px-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-gradient-to-tr from-indigo-650 to-pink-650 rounded-3xl mx-auto flex items-center justify-center shadow-2xl relative overflow-hidden mb-4"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent" />
          <Tv className="w-10 h-10 text-white" />
        </motion.div>

        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Introducing SoundStream Premium
          </h2>
          <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
            Tired of sponsored breaks? Experience pristine studio sound, unlimited offline sync, and completely ad-free skips across all platforms.
          </p>
        </div>

        {/* Feature badges */}
        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto pt-2">
          <div className="bg-[#121214] border border-white/5 rounded-2xl p-3 flex items-center gap-2.5 text-left">
            <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-zinc-200">No Interruptions</p>
              <p className="text-[9px] text-zinc-500">100% ad-free streams</p>
            </div>
          </div>

          <div className="bg-[#121214] border border-white/5 rounded-2xl p-3 flex items-center gap-2.5 text-left">
            <div className="p-1.5 bg-pink-500/10 rounded-lg text-pink-400">
              <Award className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-zinc-200">Ultra-HQ Audio</p>
              <p className="text-[9px] text-zinc-500">Lossless Flac fidelity</p>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={() => {
              const customEvent = new CustomEvent("open-premium-upgrade");
              window.dispatchEvent(customEvent);
              handleClose();
            }}
            className="w-full bg-gradient-to-r from-indigo-600 to-pink-650 hover:from-indigo-500 hover:to-pink-600 text-white font-extrabold text-xs uppercase tracking-widest py-4 px-6 rounded-2xl transition-all shadow-xl shadow-indigo-950/20 cursor-pointer"
          >
            Upgrade Now (Get 3 Months Free)
          </button>
          <p className="text-[10px] text-zinc-500 mt-2">Ad unit template simulates full native SDK behavior.</p>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="w-full text-center text-[10px] text-zinc-600 font-mono z-10">
        SOUNDSTREAM HYBRID PLATFORM &bull; TEST ID AD-0382
      </div>

      {/* Decorative Blur Spheres */}
      <div className="absolute top-1/4 left-10 w-72 h-72 bg-indigo-950/20 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-10 w-72 h-72 bg-pink-950/20 rounded-full filter blur-3xl pointer-events-none" />
    </div>
  );
}


// ==========================================
// 4. ADMOB REWARDED AD COMPONENT
// ==========================================
interface AdMobRewardedProps {
  user: User | null;
  onRewardEarned: () => void;
  onAdClosed: () => void;
}

export function AdMobRewarded({ user, onRewardEarned, onAdClosed }: AdMobRewardedProps) {
  const [countdown, setCountdown] = useState(15);
  const [adFinished, setAdFinished] = useState(false);
  const [progress, setProgress] = useState(100);
  const TOTAL_TIME = 15;

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        const next = prev - 1;
        setProgress((next / TOTAL_TIME) * 100);
        if (next <= 0) {
          clearInterval(timer);
          setAdFinished(true);
          onRewardEarned();
          admob.logAdEvent(user?.uid, "reward_unlocked", ADMOB_TEST_IDS.REWARDED, 1);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [user, onRewardEarned]);

  return (
    <div id="admob-rewarded-backdrop" className="fixed inset-0 bg-[#08080a] z-[70] flex flex-col items-center justify-between p-6 select-none font-sans">
      {/* Top Navigation */}
      <div className="w-full max-w-4xl flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[9px] font-extrabold uppercase px-2 py-0.5 rounded">
            Rewarded Ad
          </span>
          <span className="text-zinc-500 text-xs font-mono">Test Unit - {ADMOB_TEST_IDS.REWARDED}</span>
        </div>

        {adFinished ? (
          <button
            id="reward-close-btn"
            onClick={onAdClosed}
            className="flex items-center gap-1.5 bg-emerald-500 text-black font-extrabold text-xs uppercase px-5 py-2.5 rounded-full hover:bg-emerald-400 transition-all shadow-lg"
          >
            <span>Finish & Claim</span>
            <X className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-white/5 border border-white/5 text-emerald-400 font-mono text-xs font-bold px-4 py-2 rounded-full">
            <Clock className="w-3.5 h-3.5 animate-spin" />
            <span>Reward unlocks in {countdown}s</span>
          </div>
        )}
      </div>

      {/* Progress bar tracking */}
      {!adFinished && (
        <div className="w-full max-w-4xl bg-zinc-900 h-1.5 rounded-full overflow-hidden mt-4 z-10">
          <div 
            className="bg-emerald-500 h-full transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Content Center */}
      <div className="w-full max-w-lg text-center space-y-6 my-auto z-10 px-4">
        {adFinished ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="space-y-4"
          >
            <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-2 shadow-2xl">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Reward Unlocked!</h2>
            <p className="text-sm text-zinc-400 max-w-sm mx-auto leading-relaxed">
              Fantastic! You have successfully completed the video sponsor ad and unlocked <span className="text-emerald-400 font-bold">1 Hour of Premium Access</span>. Enjoy pure ad-free playback and unthrottled downloads!
            </p>
            <div className="bg-emerald-950/20 border border-emerald-500/10 rounded-2xl p-4 max-w-sm mx-auto flex items-center gap-3 text-left">
              <Award className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-xs font-bold text-zinc-200">Ad-Free Session Granted</p>
                <p className="text-[10px] text-zinc-400 font-mono">1 hour remaining &bull; Enjoy unlimited skips</p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="space-y-6"
          >
            <div className="w-20 h-20 bg-zinc-900 border border-white/5 rounded-3xl flex items-center justify-center mx-auto mb-2 animate-bounce">
              <Tv className="w-9 h-9 text-indigo-400" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold">Sponsor Presentation</p>
              <h2 className="text-xl font-bold text-white sm:text-2xl">
                SoundStream Partner Spotlight
              </h2>
              <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                Stay tuned until the progress counter finishes to earn your pass. Do not close this panel to ensure proper Firestore credit sync.
              </p>
            </div>

            {/* Media Box Simulation */}
            <div className="bg-[#121214] border border-white/5 aspect-video rounded-3xl overflow-hidden relative flex items-center justify-center shadow-inner group">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-950/30 via-transparent to-pink-950/30" />
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 p-6 text-center">
                <Play className="w-12 h-12 text-zinc-500 animate-pulse" />
                <span className="font-mono text-[9px] text-zinc-600 uppercase tracking-widest">Buffering Sponsored Asset Stream...</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="w-full text-center text-[10px] text-zinc-700 font-mono z-10">
        GOOGLE ADMOB REWARDED AD REPLICA &bull; SECURE FIREBASE SESSION
      </div>

      <div className="absolute top-1/4 right-10 w-48 h-48 bg-emerald-950/10 rounded-full filter blur-3xl pointer-events-none" />
    </div>
  );
}
