import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Coins, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  Sparkles, 
  Check, 
  ShieldCheck, 
  CreditCard, 
  TrendingUp, 
  ChevronRight, 
  RefreshCw,
  Loader2,
  Copy,
  Plus,
  X
} from "lucide-react";
import { collection, query, where, orderBy, onSnapshot, getDocs, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getOrCreateWallet } from "../lib/coinsService";
import { Wallet, CoinTransaction, COIN_PACKAGES, CoinPackage } from "../types/coins";

interface SoundStreamWalletProps {
  userId: string;
  currentUser?: any;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, userId?: string) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: userId || null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function SoundStreamWallet({ userId, currentUser }: SoundStreamWalletProps) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePackage, setActivePackage] = useState<CoinPackage | null>(null);
  
  // Checkout & URL states
  const [showVerification, setShowVerification] = useState(false);
  const [initiatingStripe, setInitiatingStripe] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState<string | null>(null);
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);
  const [verifyingSession, setVerifyingSession] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Check URL parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const sessionId = params.get("session_id");
    if (status) {
      setCheckoutStatus(status);
      if (sessionId) {
        setCheckoutSessionId(sessionId);
      }
      // Clean up search parameters from address bar to keep it clean
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Securely verify Stripe checkout session with backend fallback and client-side retries
  useEffect(() => {
    if (checkoutStatus === "success" && checkoutSessionId) {
      let isMounted = true;
      const verifySession = async () => {
        setVerifyingSession(true);
        setVerificationError(null);
        
        let attempts = 0;
        const maxAttempts = 5;
        let lastErrorMsg = "";
        
        while (attempts < maxAttempts && isMounted) {
          attempts++;
          console.log(`[Stripe Verification] Client-side attempt ${attempts}/${maxAttempts} for session ${checkoutSessionId}...`);
          
          try {
            // First check if already in local transactions to avoid redundant server roundtrip
            const alreadyCredited = transactions.some(
              (tx) => (tx.id === checkoutSessionId || tx.stripeSessionId === checkoutSessionId) && tx.status === "completed"
            );
            if (alreadyCredited) {
              console.log("🎯 Session found in real-time transactions snapshot! Verification successful.");
              if (isMounted) {
                setVerificationError(null);
                setVerifyingSession(false);
              }
              return;
            }
            
            const res = await fetch("/api/stripe/verify-session", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ 
                sessionId: checkoutSessionId,
                userId: userId,
                email: currentUser?.email || ""
              }),
            });
            
            if (!res.ok) {
              throw new Error("Failed to verify payment with SoundStream billing server.");
            }
            
            const data = await res.json();
            if (data.success) {
              console.log("💰 Secure Stripe Coins loaded and verified:", data);
              if (isMounted) {
                setVerificationError(null);
                setVerifyingSession(false);
              }
              return;
            } else {
              lastErrorMsg = data.message || "Payment verification declined by gateway.";
              throw new Error(lastErrorMsg);
            }
          } catch (err: any) {
            console.error(`❌ Verification attempt ${attempts} failed:`, err);
            lastErrorMsg = err.message || "Network error verifying secure payment session.";
            
            // Re-check real-time state in case snapshot was processed concurrently
            const alreadyCredited = transactions.some(
              (tx) => (tx.id === checkoutSessionId || tx.stripeSessionId === checkoutSessionId) && tx.status === "completed"
            );
            if (alreadyCredited) {
              console.log("🎯 Session found in real-time transactions snapshot after retry error! Bypassing error.");
              if (isMounted) {
                setVerificationError(null);
                setVerifyingSession(false);
              }
              return;
            }
            
            if (attempts < maxAttempts && isMounted) {
              // Wait 2 seconds before retrying
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }
        
        // If we reached here, all attempts failed and no real-time transaction came through
        if (isMounted) {
          setVerificationError(lastErrorMsg || "Failed to verify secure payment with billing server.");
          setVerifyingSession(false);
        }
      };
      
      verifySession();
      return () => {
        isMounted = false;
      };
    }
  }, [checkoutStatus, checkoutSessionId, transactions]);

  // Real-time automatic verification: if the coin transaction is completed in our local Firestore transactions list,
  // we immediately clear any verification errors and mark session as successfully completed.
  useEffect(() => {
    if (checkoutSessionId && transactions.length > 0) {
      const match = transactions.find(
        (tx) => (tx.id === checkoutSessionId || tx.stripeSessionId === checkoutSessionId) && tx.status === "completed"
      );
      if (match) {
        console.log("🎯 Found matching completed transaction in real-time snapshot! Bypassing verification errors.");
        setVerificationError(null);
        setVerifyingSession(false);
      }
    }
  }, [checkoutSessionId, transactions]);

  // Initialize and subscribe to Wallet and Transactions in Real-Time!
  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    // Helper to fetch wallet and transactions from the new Billing REST API
    const fetchFromBillingServer = async () => {
      try {
        console.log("[Billing Client] Loading wallet and transactions from REST APIs...");
        const [walletRes, txsRes] = await Promise.all([
          fetch(`/api/wallet/${userId}`),
          fetch(`/api/transactions/${userId}`)
        ]);

        if (walletRes.ok && isMounted) {
          const wData = await walletRes.json();
          setWallet(wData);
        }
        if (txsRes.ok && isMounted) {
          const txsData = await txsRes.json();
          setTransactions(txsData);
          setLoading(false);
        }
      } catch (err) {
        console.warn("[Billing Client Warning] Standalone REST API fetch failed:", err);
      }
    };

    // First load from Billing Server API (Instant response independent of Firebase!)
    fetchFromBillingServer();

    // Ensure wallet exists in Firebase as well on best-effort basis
    getOrCreateWallet(userId).catch((err) => {
      console.warn("[Billing Client Warning] Best-effort Firebase wallet init failed:", err);
    });

    // Wallet listener (real-time sync)
    const walletUnsub = onSnapshot(doc(db, "wallets", userId), (snap) => {
      if (snap.exists() && isMounted) {
        setWallet(snap.data() as Wallet);
      }
    }, (error) => {
      console.warn("⚠️ Firestore Wallet listener failed or was blocked. Using Billing Server cache.", error);
      fetchFromBillingServer();
    });

    // Transactions listener (real-time sync)
    const q = query(
      collection(db, "coin_transactions"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const txUnsub = onSnapshot(q, (snap) => {
      const list: CoinTransaction[] = [];
      snap.forEach((doc) => {
        list.push(doc.data() as CoinTransaction);
      });
      if (isMounted) {
        setTransactions(list);
        setLoading(false);
      }
    }, (error) => {
      console.warn("⚠️ Firestore Transactions listener failed or was blocked. Using Billing Server cache.", error);
      fetchFromBillingServer();
    });

    // Set up a polling interval fallback as a solid backup in case Firestore is down/blocked
    const fallbackInterval = setInterval(() => {
      fetchFromBillingServer();
    }, 5000);

    return () => {
      isMounted = false;
      walletUnsub();
      txUnsub();
      clearInterval(fallbackInterval);
    };
  }, [userId]);

  const handleSelectPackage = (pkg: CoinPackage) => {
    setActivePackage(pkg);
    setCheckoutStatus(null);
    setShowVerification(true);
  };

  const handleInitiateStripeCheckout = async () => {
    if (!activePackage || !userId) return;

    setInitiatingStripe(true);
    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
          email: currentUser?.email || "",
          packageId: activePackage.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create Stripe Checkout session");
      }

      const data = await response.json();
      if (data.url) {
        // Redirect directly to off-site Stripe checkout page
        window.location.href = data.url;
      } else {
        throw new Error("No checkout url returned from backend server");
      }
    } catch (error: any) {
      console.error("❌ Stripe Checkout error:", error);
      alert("Unable to reach secure payment server. Please verify your internet connection and try again.");
    } finally {
      setInitiatingStripe(false);
    }
  };

  return (
    <div className="space-y-8 p-6 max-w-6xl mx-auto pb-24">
      
      {/* Page Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            <Coins className="w-7 h-7 text-amber-500 animate-pulse" /> My SoundStream Wallet
          </h1>
          <p className="text-xs text-zinc-400 uppercase tracking-widest mt-0.5">
            Manage your virtual Coins, purchase packages, and view transaction records.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-500 uppercase">
          <ShieldCheck className="w-4 h-4 text-indigo-500" /> Secure Wallet Layer v1.0
        </div>
      </div>

      {/* Checkout Return Banners */}
      <AnimatePresence>
        {checkoutStatus === "success" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            {verifyingSession ? (
              <div className="bg-indigo-500/10 border border-indigo-500/20 p-5 rounded-3xl flex items-start gap-4">
                <div className="bg-indigo-500/20 p-3 rounded-2xl border border-indigo-500/30">
                  <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-indigo-400">⚡ Verifying Secure Payment Session...</h4>
                  <p className="text-xs text-indigo-500/90 leading-relaxed mt-1">
                    Please wait while our secure ledger confirms your Stripe transaction with the banking gateway and credits your virtual wallet...
                  </p>
                </div>
              </div>
            ) : verificationError ? (
              <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-3xl flex items-start gap-4 relative">
                <div className="bg-red-500/20 p-3 rounded-2xl border border-red-500/30">
                  <X className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex-1 pr-8">
                  <h4 className="text-sm font-bold text-red-400">⚠️ Secure Payment Verification Failed</h4>
                  <p className="text-xs text-red-500/90 leading-relaxed mt-1">
                    {verificationError}. If your card was charged, do not worry; our systems will reconcile this within minutes. You can also contact support for manual credit.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setCheckoutStatus(null);
                    setVerificationError(null);
                  }}
                  className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1 rounded-full hover:bg-zinc-800/50 transition-colors"
                  aria-label="Dismiss message"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-3xl flex items-start gap-4 relative">
                <div className="bg-emerald-500/20 p-3 rounded-2xl border border-emerald-500/30">
                  <ShieldCheck className="w-6 h-6 text-emerald-400 animate-pulse" />
                </div>
                <div className="flex-1 pr-8">
                  <h4 className="text-sm font-bold text-emerald-400">⚡ Coins Credited Successfully!</h4>
                  <p className="text-xs text-emerald-500/90 leading-relaxed mt-1">
                    Your secure Stripe payment completed successfully and your virtual coins have been added to your wallet. You should receive a confirmation receipt email shortly. Enjoy streaming!
                  </p>
                  {checkoutSessionId && (
                    <div className="mt-2.5 flex items-center gap-1.5 font-mono text-[9px] text-emerald-600 uppercase tracking-widest">
                      <span>Receipt Reference:</span>
                      <span className="font-bold select-all bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10">{checkoutSessionId}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setCheckoutStatus(null)}
                  className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1 rounded-full hover:bg-zinc-800/50 transition-colors"
                  aria-label="Dismiss message"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        )}

        {checkoutStatus === "cancel" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-3xl flex items-start gap-4 relative">
              <div className="bg-amber-500/20 p-3 rounded-2xl border border-amber-500/30">
                <Clock className="w-6 h-6 text-amber-400" />
              </div>
              <div className="flex-1 pr-8">
                <h4 className="text-sm font-bold text-amber-400">⚠️ Checkout Cancelled</h4>
                <p className="text-xs text-amber-500/95 leading-relaxed mt-1">
                  The payment flow was cancelled or interrupted. No charges were made to your card, and no coins were debited. You can resume and retry loading your wallet at any time!
                </p>
              </div>
              <button
                onClick={() => setCheckoutStatus(null)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1 rounded-full hover:bg-zinc-800/50 transition-colors"
                aria-label="Dismiss message"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid: Balances & Stats overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Core Coin Balance Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#1c121e] to-[#0c0a15] border border-indigo-500/10 p-6 rounded-3xl flex flex-col justify-between min-h-[160px]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-black text-amber-500 tracking-wider">Coin Balance</span>
            <div className="bg-amber-500/10 p-2 rounded-2xl border border-amber-500/15">
              <Coins className="w-5 h-5 text-amber-500 animate-bounce" />
            </div>
          </div>
          <div>
            <h2 className="font-mono text-3xl font-black text-white">
              {wallet ? wallet.balance : "..."}
            </h2>
            <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-semibold mt-1">
              SoundStream virtual currency
            </p>
          </div>
        </div>

        {/* Total Coins Purchased */}
        <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-3xl flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Total Purchased</span>
            <div className="bg-indigo-600/10 p-2 rounded-2xl">
              <ArrowDownLeft className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <h2 className="font-mono text-2xl font-black text-white">
              {wallet ? wallet.totalPurchased : "0"}
            </h2>
            <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-semibold mt-1">
              Coins loaded via Stripe
            </p>
          </div>
        </div>

        {/* Total Spent */}
        <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-3xl flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Total Spent</span>
            <div className="bg-rose-500/10 p-2 rounded-2xl">
              <ArrowUpRight className="w-5 h-5 text-rose-400" />
            </div>
          </div>
          <div>
            <h2 className="font-mono text-2xl font-black text-white">
              {wallet ? wallet.totalSpent : "0"}
            </h2>
            <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-semibold mt-1">
              Sent to creators as gifts
            </p>
          </div>
        </div>

        {/* Security Shield status */}
        <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-3xl flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Wallet Health</span>
            <div className="bg-emerald-500/10 p-2 rounded-2xl">
              <ShieldCheck className="w-5 h-5 text-emerald-400 animate-pulse" />
            </div>
          </div>
          <div>
            <h2 className="font-sans text-lg font-black text-emerald-400 uppercase tracking-tight">
              Verified Sec-V1
            </h2>
            <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-semibold mt-1">
              Anti-fraud replay protection active
            </p>
          </div>
        </div>

      </div>

      {/* Grid: Store Packages vs Transaction Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Coins Packages Shop */}
        <div className="lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-white">
              SoundStream Coins Store
            </h3>
            <span className="text-[10px] text-zinc-500 uppercase font-mono">Select a bundle to purchase</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {COIN_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                onClick={() => handleSelectPackage(pkg)}
                className={`group cursor-pointer relative overflow-hidden p-5 rounded-3xl border transition-all duration-300 ${
                  pkg.popular 
                    ? "bg-[#100c1e] border-indigo-500/50 hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-550/5" 
                    : "bg-zinc-900/30 border-white/5 hover:border-white/10 hover:bg-zinc-900/50"
                }`}
              >
                {/* Popular / Badge Flag */}
                {pkg.badge && (
                  <span className={`absolute top-4 right-4 px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-widest ${
                    pkg.popular ? "bg-indigo-600 text-white" : "bg-white/10 text-zinc-300"
                  }`}>
                    {pkg.badge}
                  </span>
                )}

                {/* Coin Icon */}
                <div className="flex items-center gap-3.5">
                  <div className={`p-3 rounded-2xl ${
                    pkg.popular ? "bg-indigo-600/20" : "bg-white/5"
                  }`}>
                    <Coins className={`w-6 h-6 ${pkg.popular ? "text-indigo-400" : "text-amber-500"}`} />
                  </div>
                  <div>
                    <h4 className="font-mono text-xl font-black text-white leading-none">
                      {pkg.coins}
                    </h4>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest leading-none mt-1 font-semibold">
                      SoundStream Coins
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-6 pt-3 border-t border-white/5">
                  <span className="font-mono text-sm font-black text-indigo-400">
                    ${pkg.price}
                  </span>
                  <button className="flex items-center gap-1 text-[9px] font-black text-white bg-indigo-600 group-hover:bg-indigo-500 px-3.5 py-1.5 rounded-xl uppercase tracking-widest transition shadow-md shadow-indigo-600/10">
                    Buy <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Column: Transaction Logs */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-white">
              Wallet Logs
            </h3>
            <button className="text-zinc-500 hover:text-white p-1 rounded transition">
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          <div className="bg-zinc-950/40 border border-white/5 rounded-3xl p-5 min-h-[300px] max-h-[480px] overflow-y-auto flex flex-col">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Syncing Ledger...</span>
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-2">
                <Clock className="w-8 h-8 text-zinc-600" />
                <h4 className="text-zinc-400 text-xs font-bold uppercase tracking-wide">No Transactions Yet</h4>
                <p className="text-[10px] text-zinc-500">Buy some coins or support creators with virtual gifts to initialize logs.</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {transactions.map((txn) => {
                  const isPurchase = txn.type === "purchase";
                  return (
                    <div 
                      key={txn.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl shrink-0 ${
                          isPurchase ? "bg-indigo-600/10" : "bg-rose-500/10"
                        }`}>
                          {isPurchase ? (
                            <ArrowDownLeft className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 text-rose-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-white truncate leading-none">
                            {isPurchase ? "Stripe Load" : "Gift Send"}
                          </p>
                          <p className="text-[8px] text-zinc-500 font-mono leading-none mt-1">
                            {new Date(txn.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-mono text-xs font-bold ${
                          isPurchase ? "text-indigo-400" : "text-rose-400"
                        }`}>
                          {isPurchase ? "+" : "-"}{txn.amount}
                        </p>
                        <p className="text-[7px] text-zinc-500 uppercase tracking-wider">
                          {txn.status}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* STRIPE SECURE CHECKOUT MODAL */}
      <AnimatePresence>
        {showVerification && activePackage && (
          <div className="fixed inset-0 bg-black/85 z-55 flex items-center justify-center p-4 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0b0b0f] border border-white/10 rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl relative overflow-hidden"
            >
              {/* Background gradient */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-600/20 rounded-full blur-2xl pointer-events-none" />

              <div className="text-center space-y-1">
                <CreditCard className="w-8 h-8 text-indigo-400 mx-auto animate-bounce" />
                <h3 className="font-extrabold text-base uppercase tracking-tight text-white font-sans">
                  Stripe Payment Portal
                </h3>
                <p className="text-xs text-zinc-400">
                  Secure automated coin checkout service
                </p>
              </div>

              {initiatingStripe ? (
                <div className="text-center py-10 space-y-4">
                  <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto" />
                  <h4 className="font-extrabold text-sm uppercase text-zinc-200">Connecting Secure Gateway</h4>
                  <p className="text-[10px] text-zinc-400 max-w-xs mx-auto leading-normal">
                    Please wait while we establish a secure, encrypted Stripe Checkout session for your payment of ${activePackage.price}.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-5 bg-zinc-900/50 border border-white/5 rounded-2xl text-center space-y-4">
                    <div className="bg-amber-500/10 border border-amber-500/20 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto">
                      <Coins className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-white uppercase">{activePackage.coins} Coins Package</h4>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono mt-0.5">Price: ${activePackage.price} USD</p>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-relaxed max-w-xs mx-auto">
                      When you proceed, you will be redirected to Stripe's official secured gateway. Upon successful payment, your coins will be automatically credited to your wallet in real-time, and a confirmation email will be sent to your account.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-3.5 pt-2">
                    <div className="flex items-center justify-between gap-3">
                      <button
                        onClick={() => setShowVerification(false)}
                        className="text-[10px] text-zinc-500 hover:text-white uppercase font-bold tracking-wider"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleInitiateStripeCheckout}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-extrabold uppercase tracking-widest text-[10px] transition shadow-md flex items-center gap-1.5"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Proceed to Stripe</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
