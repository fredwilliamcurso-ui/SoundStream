import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  CreditCard, 
  Crown, 
  TrendingUp, 
  Award, 
  BarChart3, 
  Building, 
  Heart, 
  Briefcase, 
  Inbox, 
  MessageSquare, 
  Gift, 
  ChevronRight, 
  ArrowLeft, 
  Settings, 
  Coins, 
  Copy, 
  Check, 
  X, 
  ArrowUpRight, 
  Compass, 
  Plus, 
  Clock, 
  User, 
  Users, 
  Car, 
  Sparkles, 
  Play, 
  AlertCircle,
  HelpCircle,
  Image,
  Send,
  Share2,
  Bookmark
} from "lucide-react";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

interface SoundStreamLiveCenterProps {
  userId: string;
  currentUser?: any;
  onBack?: () => void;
}

// Sub-screens for Live Center navigation
type LiveCenterTab = 
  | "menu" 
  | "wallet" 
  | "withdraw" 
  | "noble" 
  | "user-level" 
  | "host-level" 
  | "host-stats" 
  | "agency" 
  | "fanclub" 
  | "backpack" 
  | "treasure" 
  | "feedback" 
  | "vip" 
  | "invitation";

export default function SoundStreamLiveCenter({ userId, currentUser, onBack }: SoundStreamLiveCenterProps) {
  const [activeTab, setActiveTab] = useState<LiveCenterTab>("menu");
  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Core functional state values matching the screenshots or local memory
  const [bcoins, setBcoins] = useState<number>(560);
  const [bstars, setBstars] = useState<number>(2241750);
  const [userLevel, setUserLevel] = useState<number>(15);
  const [userExp, setUserExp] = useState<number>(3026);
  const [hostLevel, setHostLevel] = useState<number>(14);
  const [hostExp, setHostExp] = useState<number>(12683);
  const [vipLevel, setVipLevel] = useState<number>(1);
  const [vipExp, setVipExp] = useState<number>(88990);
  const [isAgencyMember, setIsAgencyMember] = useState<boolean>(true);
  
  // Backpack Equipped States
  const [equippedVehicle, setEquippedVehicle] = useState<string>("VIP 1");
  const [equippedEffect, setEquippedEffect] = useState<string>("VIP 1");
  const [equippedFrame, setEquippedFrame] = useState<string>("User Lv.11-20");

  // Wallet Active Tabs
  const [walletSubTab, setWalletSubTab] = useState<"bcoins" | "bstars">("bcoins");
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [selectedExchangeOption, setSelectedExchangeOption] = useState<number>(9500);
  const [customExchangeAmount, setCustomExchangeAmount] = useState<string>("");

  // Bstar Withdraw state
  const [withdrawCurrency, setWithdrawCurrency] = useState<string>("NGN");
  const [withdrawChannel, setWithdrawChannel] = useState<string>("Palmpay");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("10");
  const [withdrawHistory, setWithdrawHistory] = useState<any[]>([]);

  // Fanclub State
  const [fanclubs, setFanclubs] = useState<any[]>([
    { id: "fc1", creator: "fredmusic02", level: 3, badge: "FREDMU" },
    { id: "fc2", creator: "Mrs loveth eke", level: 2, badge: "LO" }
  ]);

  // Treasure Chest Animation State
  const [isOpeningChest, setIsOpeningChest] = useState(false);
  const [chestReward, setChestReward] = useState<string | null>(null);

  // Feedback Tickets State
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackCategory, setFeedbackCategory] = useState("Bug Report");
  const [submittedTickets, setSubmittedTickets] = useState<any[]>([]);

  // Host stats interactive filter
  const [statsPeriod, setStatsPeriod] = useState<"Today" | "Yesterday" | "Last 7 Days" | "This Month">("Today");

  // Fetch or initialize live center values from Firestore
  useEffect(() => {
    if (!userId) return;
    const fetchLiveCenterData = async () => {
      try {
        const docRef = doc(db, "live_center_profiles", userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.bcoins !== undefined) setBcoins(data.bcoins);
          if (data.bstars !== undefined) setBstars(data.bstars);
          if (data.userLevel !== undefined) setUserLevel(data.userLevel);
          if (data.userExp !== undefined) setUserExp(data.userExp);
          if (data.hostLevel !== undefined) setHostLevel(data.hostLevel);
          if (data.hostExp !== undefined) setHostExp(data.hostExp);
          if (data.vipLevel !== undefined) setVipLevel(data.vipLevel);
          if (data.vipExp !== undefined) setVipExp(data.vipExp);
          if (data.equippedVehicle !== undefined) setEquippedVehicle(data.equippedVehicle);
          if (data.equippedEffect !== undefined) setEquippedEffect(data.equippedEffect);
          if (data.equippedFrame !== undefined) setEquippedFrame(data.equippedFrame);
          if (data.isAgencyMember !== undefined) setIsAgencyMember(data.isAgencyMember);
          if (data.withdrawHistory !== undefined) setWithdrawHistory(data.withdrawHistory);
          if (data.fanclubs !== undefined) setFanclubs(data.fanclubs);
          if (data.submittedTickets !== undefined) setSubmittedTickets(data.submittedTickets);
        } else {
          // Initialize in Firestore
          const initialData = {
            userId,
            bcoins: 560,
            bstars: 2241750,
            userLevel: 15,
            userExp: 3026,
            hostLevel: 14,
            hostExp: 12683,
            vipLevel: 1,
            vipExp: 88990,
            equippedVehicle: "VIP 1",
            equippedEffect: "VIP 1",
            equippedFrame: "User Lv.11-20",
            isAgencyMember: true,
            withdrawHistory: [],
            fanclubs: [
              { id: "fc1", creator: "fredmusic02", level: 3, badge: "FREDMU" },
              { id: "fc2", creator: "Mrs loveth eke", level: 2, badge: "LO" }
            ],
            submittedTickets: [],
            updatedAt: new Date().toISOString()
          };
          await setDoc(docRef, initialData);
        }
      } catch (err) {
        console.warn("Error reading live center from firestore: ", err);
      }
    };
    fetchLiveCenterData();
  }, [userId]);

  // Sync state changes with Firestore
  const saveStateToFirestore = async (updates: any) => {
    try {
      const docRef = doc(db, "live_center_profiles", userId);
      await updateDoc(docRef, updates);
    } catch (err) {
      console.warn("Could not sync live center updates to Firestore: ", err);
    }
  };

  const copyIdToClipboard = () => {
    navigator.clipboard.writeText("183847002");
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleRechargePackage = (pkgAmount: number, coinsGranted: number) => {
    const newBcoins = bcoins + coinsGranted;
    setBcoins(newBcoins);
    saveStateToFirestore({ bcoins: newBcoins });
    alert(`Success! Successfully recharged $${pkgAmount}. Credited ${coinsGranted.toLocaleString()} Bcoins!`);
    setSelectedPackage(null);
  };

  const handleExchangeBstars = (starsCost: number, coinsToReceive: number) => {
    if (bstars < starsCost) {
      alert("Insufficient Bstars for this exchange!");
      return;
    }
    const newBstars = bstars - starsCost;
    const newBcoins = bcoins + coinsToReceive;
    setBstars(newBstars);
    setBcoins(newBcoins);
    saveStateToFirestore({ bstars: newBstars, bcoins: newBcoins });
    alert(`Exchange Success! Converted ${starsCost.toLocaleString()} Bstars into ${coinsToReceive.toLocaleString()} Bcoins!`);
  };

  const handleCustomExchange = () => {
    const customAmt = parseInt(customExchangeAmount);
    if (!customAmt || customAmt <= 0) {
      alert("Please enter a valid exchange amount of Bcoins.");
      return;
    }
    // Rate: 250,000 Bstars = 9,500 Bcoins. So 1 Bcoin = 26.315 Bstars
    const starsCost = Math.ceil(customAmt * (250000 / 9500));
    if (bstars < starsCost) {
      alert(`Insufficient Bstars! This requires ${starsCost.toLocaleString()} Bstars.`);
      return;
    }
    const newBstars = bstars - starsCost;
    const newBcoins = bcoins + customAmt;
    setBstars(newBstars);
    setBcoins(newBcoins);
    setCustomExchangeAmount("");
    saveStateToFirestore({ bstars: newBstars, bcoins: newBcoins });
    alert(`Success! Exchanged ${starsCost.toLocaleString()} Bstars for ${customAmt.toLocaleString()} Bcoins.`);
  };

  const handleWithdrawSubmit = () => {
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0) {
      alert("Please enter a valid withdrawal amount.");
      return;
    }
    // Conversion rate: 250,000 Bstars = 1 USD
    const starsCost = amt * 250000;
    if (bstars < starsCost) {
      alert(`Insufficient Bstars for this withdrawal! Required: ${starsCost.toLocaleString()} Bstars.`);
      return;
    }

    const newBstars = bstars - starsCost;
    const newRecord = {
      id: `wd_${Date.now()}`,
      amount: amt,
      currency: withdrawCurrency,
      channel: withdrawChannel,
      status: "pending",
      date: new Date().toLocaleDateString()
    };
    const newHistory = [newRecord, ...withdrawHistory];

    setBstars(newBstars);
    setWithdrawHistory(newHistory);
    saveStateToFirestore({ bstars: newBstars, withdrawHistory: newHistory });
    alert(`Withdrawal request submitted! $${amt} is pending review. Transfer will complete inside 24 hours via ${withdrawChannel}.`);
  };

  const quitFanclub = (id: string, creator: string) => {
    const confirmQuit = window.confirm(`Are you sure you want to quit ${creator}'s fanclub?`);
    if (confirmQuit) {
      const updated = fanclubs.filter(f => f.id !== id);
      setFanclubs(updated);
      saveStateToFirestore({ fanclubs: updated });
    }
  };

  const handleOpenChest = () => {
    if (isOpeningChest) return;
    setIsOpeningChest(true);
    setChestReward(null);

    // Random reward
    setTimeout(() => {
      const isStars = Math.random() > 0.4;
      const amount = isStars ? Math.floor(Math.random() * 5000) + 500 : Math.floor(Math.random() * 200) + 20;
      const type = isStars ? "Bstars" : "Bcoins";
      
      if (isStars) {
        setBstars(prev => {
          const next = prev + amount;
          saveStateToFirestore({ bstars: next });
          return next;
        });
      } else {
        setBcoins(prev => {
          const next = prev + amount;
          saveStateToFirestore({ bcoins: next });
          return next;
        });
      }

      setChestReward(`+${amount.toLocaleString()} ${type}`);
      setIsOpeningChest(false);
    }, 1500);
  };

  const handleSubmitFeedback = () => {
    if (!feedbackText.trim()) {
      alert("Please write something before submitting.");
      return;
    }
    const ticket = {
      id: `tkt_${Date.now()}`,
      category: feedbackCategory,
      text: feedbackText,
      status: "open",
      date: new Date().toLocaleDateString()
    };
    const updated = [ticket, ...submittedTickets];
    setSubmittedTickets(updated);
    setFeedbackText("");
    saveStateToFirestore({ submittedTickets: updated });
    alert("Thank you! Your feedback ticket has been sent to our system queue.");
  };

  // SoundStream original VIP packages
  const vipPackages = [
    { level: 1, reqExp: 100000, current: vipExp, name: "Bronze Banner" },
    { level: 2, reqExp: 250000, current: vipExp, name: "Silver Chariot" },
    { level: 3, reqExp: 500000, current: vipExp, name: "Gold Emperor" }
  ];

  return (
    <div className="w-full max-w-md mx-auto h-[780px] bg-[#0c0f17] text-white flex flex-col relative overflow-hidden rounded-3xl shadow-2xl border border-zinc-800 font-sans">
      
      {/* ----------------- SUB-TABS ROUTING ----------------- */}
      <AnimatePresence mode="wait">
        
        {/* TAB 1: MAIN LIVE CENTER MENU */}
        {activeTab === "menu" && (
          <motion.div 
            key="menu"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col overflow-y-auto"
          >
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-zinc-800/80 bg-[#121624]">
              <button 
                onClick={onBack}
                className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 transition"
              >
                <ArrowLeft className="w-6 h-6 text-white" />
              </button>
              <h2 className="font-bold text-lg tracking-wide">Live Center</h2>
              <button 
                onClick={() => alert("Settings toggled! Admin portal initialized.")}
                className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 transition"
              >
                <Settings className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {/* Profile Summary Card */}
            <div className="p-4 bg-gradient-to-b from-[#121624] to-[#0c0f17] flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-2 border-cyan-400 p-0.5 overflow-hidden">
                  <img 
                    src={currentUser?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"} 
                    alt="avatar" 
                    className="w-full h-full object-cover rounded-full"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-cyan-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full uppercase scale-90">
                  Lv.15
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg">{currentUser?.displayName || "FR02 Onecool"}</h3>
                  <span className="bg-gradient-to-r from-amber-400 to-amber-600 text-black text-[9px] font-black px-1.5 py-0.5 rounded">VIP 1</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-zinc-400 font-mono">BoomID: 183847002</span>
                  <button 
                    onClick={copyIdToClipboard}
                    className="p-1 text-zinc-500 hover:text-zinc-300 transition"
                    title="Copy ID"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Wallet Quick Balance Strip */}
            <div className="mx-4 p-4 bg-zinc-900/60 rounded-2xl border border-zinc-800/60 flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400 animate-bounce" />
                <span className="text-zinc-400 text-xs">Wallet Coins</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-300 font-mono text-lg">{bcoins.toLocaleString()}</span>
                <button 
                  onClick={() => { setWalletSubTab("bcoins"); setActiveTab("wallet"); }}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold px-3 py-1 rounded-full transition"
                >
                  Recharge
                </button>
              </div>
            </div>

            {/* Sidebar List Menu */}
            <div className="flex-1 px-4 pb-8 space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold px-1">Menu Navigation</p>
              
              <div className="space-y-1">
                {[
                  { id: "wallet", label: "My Wallet", desc: `Bcoins ${bcoins.toLocaleString()}`, icon: CreditCard, color: "text-amber-400 bg-amber-400/10" },
                  { id: "noble", label: "Noble status", desc: "Tiers & Badges", icon: Crown, color: "text-purple-400 bg-purple-400/10" },
                  { id: "user-level", label: "User Level", desc: `Lv.${userLevel}`, icon: TrendingUp, color: "text-cyan-400 bg-cyan-400/10" },
                  { id: "host-level", label: "Host Level", desc: `Lv.${hostLevel} Trainee`, icon: Award, color: "text-pink-400 bg-pink-400/10" },
                  { id: "host-stats", label: "Host Stats", desc: "Performance stats", icon: BarChart3, color: "text-indigo-400 bg-indigo-400/10" },
                  { id: "agency", label: "My Agency", desc: isAgencyMember ? "Fredmusic" : "Unlinked", icon: Building, color: "text-blue-400 bg-blue-400/10" },
                  { id: "fanclub", label: "Fanclub", desc: `${fanclubs.length} Clubs Joined`, icon: Heart, color: "text-rose-500 bg-rose-500/10" },
                  { id: "backpack", label: "My Backpack", desc: "Vehicle, Frame, Effects", icon: Briefcase, color: "text-emerald-400 bg-emerald-400/10" },
                  { id: "treasure", label: "My Treasure Chest", desc: "Lucky draws", icon: Inbox, color: "text-orange-400 bg-orange-400/10" },
                  { id: "feedback", label: "Feedback", desc: "Report issues", icon: MessageSquare, color: "text-teal-400 bg-teal-400/10" },
                  { id: "vip", label: "VIP Privileges", desc: "VIP1 Progress", icon: Crown, color: "text-yellow-400 bg-yellow-400/10" },
                  { id: "invitation", label: "Invitation Rewards", desc: "Refer friends", icon: Gift, color: "text-violet-400 bg-violet-400/10" }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as LiveCenterTab)}
                    className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-zinc-800/40 border border-transparent hover:border-zinc-800 text-left transition duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${item.color}`}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-zinc-100">{item.label}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: MY WALLET */}
        {activeTab === "wallet" && (
          <motion.div 
            key="wallet"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col overflow-y-auto"
          >
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-zinc-800 bg-[#121624]">
              <button onClick={() => setActiveTab("menu")} className="p-1 rounded-full hover:bg-zinc-800">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="font-bold text-lg">My Wallet</h2>
              <div className="w-6 h-6" /> {/* Spacer */}
            </div>

            {/* Custom Tab Switchers */}
            <div className="flex p-1 bg-zinc-900 mx-4 mt-4 rounded-xl border border-zinc-800">
              <button 
                onClick={() => setWalletSubTab("bcoins")}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${walletSubTab === "bcoins" ? "bg-cyan-500 text-black shadow" : "text-zinc-400 hover:text-white"}`}
              >
                Bcoins
              </button>
              <button 
                onClick={() => setWalletSubTab("bstars")}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${walletSubTab === "bstars" ? "bg-cyan-500 text-black shadow" : "text-zinc-400 hover:text-white"}`}
              >
                Bstars
              </button>
            </div>

            {/* BCOINS CONTENT */}
            {walletSubTab === "bcoins" && (
              <div className="p-4 space-y-4">
                <div className="p-6 rounded-2xl bg-gradient-to-r from-zinc-900 to-[#121624] border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-zinc-400 text-xs block font-bold uppercase tracking-wider">Bcoins balance:</span>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-3xl text-yellow-400 font-mono">🪙</span>
                      <span className="text-3xl font-black text-amber-300 font-mono">{bcoins.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3 py-1.5 rounded-lg border border-zinc-700 font-bold">Recharge</button>
                    <button className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] px-3 py-1.5 rounded-lg font-black relative overflow-hidden">
                      CoinSeller
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[6px] px-1 rounded-full scale-75 animate-pulse uppercase">Best offer</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-zinc-400 font-bold px-1 uppercase tracking-wider">Virtual Coin Packages</p>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { coins: 3500, price: 0.49, bonus: 100 },
                    { coins: 7000, price: 0.99, bonus: 100 },
                    { coins: 32500, price: 4.99, bonus: 2000 },
                    { coins: 73200, price: 9.99, bonus: 3000 },
                    { coins: 144000, price: 19.99, bonus: 5000 },
                    { coins: 365500, price: 49.99, bonus: 5500 }
                  ].map((pkg) => (
                    <button
                      key={pkg.price}
                      onClick={() => setSelectedPackage(pkg.price)}
                      className={`relative p-3 rounded-2xl border text-center flex flex-col justify-between transition ${selectedPackage === pkg.price ? "border-cyan-400 bg-cyan-400/5 shadow" : "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/80"}`}
                    >
                      <div className="absolute top-0 right-0 bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-bl-lg rounded-tr-lg font-black uppercase tracking-wider leading-none scale-90">
                        +{pkg.bonus}
                      </div>
                      <div className="mt-3">
                        <p className="font-mono text-xs font-bold text-zinc-400">🪙 {pkg.coins.toLocaleString()}</p>
                      </div>
                      <p className="text-cyan-400 font-mono font-black text-sm mt-2">${pkg.price}</p>
                    </button>
                  ))}
                </div>

                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-900/60 flex items-center justify-between text-xs text-zinc-400">
                  <span>Your special-offer recharge channel</span>
                  <button className="text-cyan-400 underline font-semibold" onClick={() => alert("Connecting special-offer API channel...")}>Please click here 👉</button>
                </div>

                {selectedPackage !== null && (
                  <button 
                    onClick={() => {
                      const found = [
                        { coins: 3500, price: 0.49, bonus: 100 },
                        { coins: 7000, price: 0.99, bonus: 100 },
                        { coins: 32500, price: 4.99, bonus: 2000 },
                        { coins: 73200, price: 9.99, bonus: 3000 },
                        { coins: 144000, price: 19.99, bonus: 5000 },
                        { coins: 365500, price: 49.99, bonus: 5500 }
                      ].find(p => p.price === selectedPackage);
                      if (found) handleRechargePackage(found.price, found.coins + found.bonus);
                    }}
                    className="w-full bg-cyan-400 hover:bg-cyan-300 text-black py-3 rounded-xl font-bold text-sm tracking-wide mt-4 flex items-center justify-center gap-2 shadow-lg"
                  >
                    <span>Recharge $ {selectedPackage}</span>
                  </button>
                )}
              </div>
            )}

            {/* BSTARS CONTENT */}
            {walletSubTab === "bstars" && (
              <div className="p-4 space-y-4">
                <div className="p-6 rounded-2xl bg-gradient-to-r from-zinc-900 to-[#121624] border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-zinc-400 text-xs block font-bold uppercase tracking-wider">Bstars balance:</span>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-3xl text-cyan-400">⭐</span>
                      <span className="text-3xl font-black text-cyan-300 font-mono">{bstars.toLocaleString()}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveTab("withdraw")}
                    className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs px-4 py-2 rounded-xl transition shadow"
                  >
                    Withdraw
                  </button>
                </div>

                <p className="text-xs text-zinc-400 font-bold px-1 uppercase tracking-wider">Exchange Stars to Coins</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { coins: 9500, cost: 250000 },
                    { coins: 95000, cost: 2500000 },
                    { coins: 950000, cost: 25000000 },
                    { coins: 4750000, cost: 125000000 },
                    { coins: 10500000, cost: 250000000 }
                  ].map((opt) => (
                    <button
                      key={opt.coins}
                      onClick={() => setSelectedExchangeOption(opt.coins)}
                      className={`p-4 rounded-xl border text-left transition flex justify-between items-center ${selectedExchangeOption === opt.coins ? "border-cyan-400 bg-cyan-400/5" : "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60"}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400">🪙</span>
                        <span className="font-mono text-sm font-semibold text-zinc-200">{opt.coins.toLocaleString()}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-500" />
                    </button>
                  ))}

                  <div className="col-span-2 p-3 bg-zinc-900/30 rounded-xl border border-zinc-800 flex items-center gap-2">
                    <input 
                      type="number" 
                      placeholder="Custom Amount"
                      value={customExchangeAmount}
                      onChange={(e) => setCustomExchangeAmount(e.target.value)}
                      className="bg-transparent border-0 flex-1 outline-none text-sm font-mono"
                    />
                    <button 
                      onClick={handleCustomExchange}
                      className="bg-zinc-800 text-xs px-3 py-1.5 rounded-lg border border-zinc-700 hover:bg-zinc-700 font-bold"
                    >
                      Exchange
                    </button>
                  </div>
                </div>

                {/* Conversion Table & Rates */}
                <div className="p-4 bg-zinc-950/80 rounded-2xl border border-zinc-900 space-y-2">
                  <div className="flex justify-between border-b border-zinc-800 pb-2 text-xs font-bold text-zinc-400 uppercase">
                    <span>Exchange Tier</span>
                    <span>Rate Details</span>
                  </div>
                  <div className="flex justify-between text-xs py-1 text-zinc-300">
                    <span>0 - 500 $</span>
                    <span className="font-mono text-right text-cyan-400">250,000 Bstars = 1$ = 9,500 Bcoins</span>
                  </div>
                  <div className="flex justify-between text-xs py-1 text-zinc-300">
                    <span>&gt; 500 $</span>
                    <span className="font-mono text-right text-cyan-400">250,000 Bstars = 1$ = 10,500 Bcoins</span>
                  </div>
                </div>

                <p className="text-[10px] text-zinc-500 italic px-1">Note: For agents, coins will be exchanged to your transaction account by default.</p>

                {selectedExchangeOption !== null && (
                  <button
                    onClick={() => {
                      const cost = [
                        { coins: 9500, cost: 250000 },
                        { coins: 95000, cost: 2500000 },
                        { coins: 950000, cost: 25000000 },
                        { coins: 4750000, cost: 125000000 },
                        { coins: 10500000, cost: 250000000 }
                      ].find(o => o.coins === selectedExchangeOption)?.cost || 250000;
                      handleExchangeBstars(cost, selectedExchangeOption);
                    }}
                    className="w-full bg-cyan-400 hover:bg-cyan-300 text-black py-3 rounded-xl font-bold text-sm tracking-wide shadow-lg"
                  >
                    Confirm Exchange
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 3: BSTAR WITHDRAW */}
        {activeTab === "withdraw" && (
          <motion.div 
            key="withdraw"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col overflow-y-auto p-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
              <button onClick={() => setActiveTab("wallet")} className="p-1 rounded-full hover:bg-zinc-800">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="font-bold text-lg">Bstar Withdraw</h2>
              <div className="w-6 h-6" />
            </div>

            {/* Withdraw Config Panel */}
            <div className="space-y-4">
              {/* Payee Currency */}
              <div>
                <label className="text-xs text-zinc-400 block font-semibold mb-1">Payee Currency</label>
                <select 
                  value={withdrawCurrency} 
                  onChange={(e) => {
                    const c = e.target.value;
                    setWithdrawCurrency(c);
                    setWithdrawChannel(c === "NGN" ? "Palmpay" : "Payoneer");
                  }}
                  className="w-full p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-semibold outline-none text-white"
                >
                  <option value="NGN">NGN</option>
                  <option value="USD">USD</option>
                  <option value="PHP">PHP</option>
                  <option value="INR">INR</option>
                </select>
              </div>

              {/* Channels list based on currency */}
              <div>
                <label className="text-xs text-zinc-400 block font-semibold mb-2">Payee Channel</label>
                <div className="space-y-2">
                  {withdrawCurrency === "NGN" ? (
                    [
                      { id: "Palmpay", fee: "2%", arrival: "24h" },
                      { id: "Bank Transfer", fee: "2%", arrival: "24h" },
                      { id: "OPay", fee: "2%", arrival: "24h" }
                    ].map((ch) => (
                      <button
                        key={ch.id}
                        onClick={() => setWithdrawChannel(ch.id)}
                        className={`w-full p-3 rounded-xl border flex items-center justify-between transition ${withdrawChannel === ch.id ? "border-cyan-400 bg-cyan-400/5" : "border-zinc-800 bg-zinc-900/40"}`}
                      >
                        <div>
                          <p className="font-bold text-sm">{ch.id}</p>
                          <p className="text-[10px] text-zinc-400 mt-0.5">Fee: {ch.fee} | Arrival: {ch.arrival}</p>
                        </div>
                        <span className="text-xs bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full font-bold">Bind</span>
                      </button>
                    ))
                  ) : (
                    [
                      { id: "Payoneer", fee: "2%", arrival: "168h" },
                      { id: "Paypal", fee: "2%", arrival: "72h" }
                    ].map((ch) => (
                      <button
                        key={ch.id}
                        onClick={() => setWithdrawChannel(ch.id)}
                        className={`w-full p-3 rounded-xl border flex items-center justify-between transition ${withdrawChannel === ch.id ? "border-cyan-400 bg-cyan-400/5" : "border-zinc-800 bg-zinc-900/40"}`}
                      >
                        <div>
                          <p className="font-bold text-sm">{ch.id}</p>
                          <p className="text-[10px] text-zinc-400 mt-0.5">Fee: {ch.fee} | Arrival: {ch.arrival}</p>
                        </div>
                        <span className="text-xs bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full font-bold">Bind</span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Amount Inputs */}
              <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
                <label className="text-xs text-zinc-400 block font-semibold mb-1">Withdrawal (USD)</label>
                <div className="flex items-center gap-1.5 border-b border-zinc-700 pb-2">
                  <span className="text-2xl text-cyan-400 font-bold">$</span>
                  <input 
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="bg-transparent border-0 flex-1 outline-none text-2xl font-mono text-white"
                  />
                </div>
                <div className="flex justify-between items-center mt-3 text-xs text-zinc-400">
                  <span>Available Withdrawal Amount: ${(bstars / 250000).toFixed(2)}</span>
                  <button className="text-cyan-400 font-bold" onClick={() => setWithdrawAmount(String(bstars / 250000))}>Withdraw All</button>
                </div>
              </div>

              <button 
                onClick={handleWithdrawSubmit}
                className="w-full bg-cyan-400 hover:bg-cyan-300 text-black py-3.5 rounded-xl font-bold tracking-wide transition shadow-lg text-sm"
              >
                Submit
              </button>

              {/* Rules List */}
              <div className="space-y-1.5 text-xs text-zinc-400 pt-2 border-t border-zinc-900">
                <p className="font-bold text-zinc-300">Withdrawal Rules</p>
                <p>1. Exchange Rate: ⭐ 250000 = 1 USD/USDT.</p>
                <p>2. Minimum withdrawal amount per transaction: 50 USDT/USD.</p>
                <p>3. Bcoins can not be used for withdrawal.</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 4: USER LEVEL */}
        {activeTab === "user-level" && (
          <motion.div 
            key="user-level"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col overflow-y-auto"
          >
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-zinc-800 bg-[#121624]">
              <button onClick={() => setActiveTab("menu")} className="p-1 rounded-full hover:bg-zinc-800">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="font-bold text-lg">User Level</h2>
              <button className="p-1 text-zinc-400 hover:text-white" onClick={() => alert("User Level Rules:\n1. Send 100 Bcoins = +1 Exp\n2. Log in daily = +10 Exp")}>
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Profile circular avatar section */}
            <div className="p-6 flex flex-col items-center text-center">
              <div className="relative mb-3">
                <div className="w-24 h-24 rounded-full p-1 border-4 border-cyan-400 overflow-hidden shadow-xl">
                  <img 
                    src={currentUser?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"} 
                    alt="user avatar" 
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
              </div>
              <h3 className="font-black text-2xl tracking-wide italic">Lv.15</h3>
              
              {/* Progress Slider */}
              <div className="w-full mt-6 space-y-1">
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden relative border border-zinc-700">
                  <div 
                    className="bg-gradient-to-r from-cyan-400 to-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(userExp / 3300) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-zinc-400 font-mono">
                  <span>{userExp} / 3300Exp</span>
                  <span>Lv.16</span>
                </div>
              </div>
            </div>

            {/* User Level Privileges Section */}
            <div className="p-4 space-y-4">
              <h4 className="font-black text-base text-cyan-400 italic text-center uppercase tracking-wider">User Level Privileges</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-center space-y-2 flex flex-col items-center">
                  <Award className="w-8 h-8 text-amber-400" />
                  <p className="font-bold text-sm text-zinc-200">Medal</p>
                  <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full font-bold">Forever</span>
                </div>
                <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-center space-y-2 flex flex-col items-center">
                  <Bookmark className="w-8 h-8 text-cyan-400 animate-pulse" />
                  <p className="font-bold text-sm text-zinc-200">Avatar Frame</p>
                  <span className="text-[10px] text-cyan-400 bg-cyan-400/10 px-2.5 py-0.5 rounded-full font-bold">Forever</span>
                </div>
              </div>

              {/* Regular Task */}
              <h4 className="font-black text-base text-pink-400 italic text-center uppercase tracking-wider mt-4">Regular Task</h4>
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#121624] to-zinc-900 border border-zinc-800 flex justify-between items-center">
                <div>
                  <p className="font-black text-lg text-pink-400">+1 Exp</p>
                  <p className="text-xs text-zinc-300 mt-1">Send 100 bcoin gift / 1 exp</p>
                </div>
                <button 
                  onClick={() => alert("Go to streams to send gifts and earn EXP!")}
                  className="bg-pink-500 hover:bg-pink-400 text-white text-xs font-bold px-4 py-2 rounded-full transition"
                >
                  Send Gift
                </button>
              </div>

              <p className="text-[10px] text-zinc-500 italic text-center mt-4">EXP is earned only for gifts of 100+ Bcoin per send, rounded down. No cumulative EXP from multiple sends.</p>
            </div>
          </motion.div>
        )}

        {/* TAB 5: HOST LEVEL */}
        {activeTab === "host-level" && (
          <motion.div 
            key="host-level"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col overflow-y-auto"
          >
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-zinc-800 bg-[#121624]">
              <button onClick={() => setActiveTab("menu")} className="p-1 rounded-full hover:bg-zinc-800">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="font-bold text-lg">Host Level</h2>
              <button className="p-1 text-zinc-400 hover:text-white" onClick={() => alert("Go Live, add music, and host rooms to get Host EXP!")}>
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Profile summary */}
            <div className="p-6 flex flex-col items-center text-center">
              <div className="relative mb-3">
                <div className="w-24 h-24 rounded-full p-1 border-4 border-pink-500 overflow-hidden shadow-xl">
                  <img 
                    src={currentUser?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"} 
                    alt="user avatar" 
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
              </div>
              <h3 className="font-black text-2xl tracking-wide italic">Lv.14 Trainee</h3>
              
              {/* Progress */}
              <div className="w-full mt-6 space-y-1">
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden relative border border-zinc-700">
                  <div 
                    className="bg-gradient-to-r from-pink-500 to-rose-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(hostExp / 14000) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-zinc-400 font-mono">
                  <span>{hostExp} / 14000Exp</span>
                  <span>Lv.15</span>
                </div>
              </div>
            </div>

            {/* Timeline Track: Novice, Trainee, Upcoming, MVP */}
            <div className="p-4">
              <div className="relative flex justify-between items-center px-4 py-2 bg-zinc-900 rounded-xl border border-zinc-800/80">
                <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-zinc-800 z-0">
                  <div className="w-1/2 h-full bg-pink-500 rounded" />
                </div>
                {[
                  { name: "Novice", active: true },
                  { name: "Trainee", active: true, highlighted: true },
                  { name: "Upcoming", active: false },
                  { name: "MVP", active: false }
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center z-10">
                    <div className={`w-3 h-3 rounded-full border-2 ${item.active ? "bg-pink-500 border-white" : "bg-zinc-900 border-zinc-700"} ${item.highlighted ? "scale-125 ring-2 ring-pink-500" : ""}`} />
                    <span className={`text-[9px] font-bold mt-1.5 ${item.active ? "text-pink-400" : "text-zinc-500"}`}>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Host Privileges */}
            <div className="p-4 space-y-4">
              <h4 className="font-black text-sm text-cyan-400 uppercase tracking-wider text-center">Host Level Privileges</h4>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Medal", desc: "Forever", icon: Award, color: "text-amber-400 bg-amber-400/5" },
                  { label: "Background", desc: "7 Days", icon: Image, color: "text-cyan-400 bg-cyan-400/5" },
                  { label: "Room Tag", desc: "7 Days", icon: Bookmark, color: "text-pink-400 bg-pink-400/5" },
                  { label: "Room admins", desc: "3 people", icon: Users, color: "text-purple-400 bg-purple-400/5" }
                ].map((p, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl border border-zinc-800/80 bg-zinc-900/60 text-center flex flex-col items-center space-y-1">
                    <p.icon className={`w-5 h-5 ${p.color}`} />
                    <p className="font-bold text-[9px] text-zinc-100 truncate w-full">{p.label}</p>
                    <span className="text-[8px] text-zinc-400">{p.desc}</span>
                  </div>
                ))}
              </div>

              {/* Comer Task list */}
              <h4 className="font-black text-sm text-pink-400 uppercase tracking-wider text-center pt-2">New Comer <span className="text-zinc-400 font-mono">(5/8)</span></h4>
              <div className="space-y-2">
                {[
                  { task: "First time going live", exp: "+20 exp", finished: true },
                  { task: "First time adding music", exp: "+20 exp", finished: true },
                  { task: "First time editing the announcement board", exp: "+20 exp", finished: false },
                  { task: "First time sharing your own livestream", exp: "+20 exp", finished: true }
                ].map((tk, idx) => (
                  <div key={idx} className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <p className="font-semibold text-zinc-100">{tk.task}</p>
                      <p className="text-[10px] text-cyan-400 font-mono mt-0.5">{tk.exp}</p>
                    </div>
                    {tk.finished ? (
                      <span className="bg-zinc-800 text-zinc-500 font-bold px-3 py-1 rounded-full text-[10px]">Finished</span>
                    ) : (
                      <button 
                        onClick={() => {
                          alert("Navigating announcement dashboard...");
                          setHostExp(prev => {
                            const next = prev + 20;
                            saveStateToFirestore({ hostExp: next });
                            return next;
                          });
                          tk.finished = true;
                        }} 
                        className="bg-cyan-500 text-black font-black px-4 py-1.5 rounded-full text-[10px] hover:bg-cyan-400 transition"
                      >
                        Go
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 6: HOST STATS */}
        {activeTab === "host-stats" && (
          <motion.div 
            key="host-stats"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col overflow-y-auto p-4"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <button onClick={() => setActiveTab("menu")} className="p-1 rounded-full hover:bg-zinc-800">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="font-bold text-lg">Host Stats</h2>
              <div className="w-6 h-6" />
            </div>

            {/* Filter */}
            <div className="flex justify-between items-center mb-4">
              <span className="text-zinc-200 font-black text-base italic uppercase tracking-wider">Overview Stats</span>
              <select 
                value={statsPeriod} 
                onChange={(e: any) => setStatsPeriod(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-xs px-3 py-1.5 rounded-lg outline-none font-bold"
              >
                <option value="Today">Today</option>
                <option value="Yesterday">Yesterday</option>
                <option value="Last 7 Days">Last 7 Days</option>
                <option value="This Month">This Month</option>
              </select>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { title: "Live Time", val: "0h", sub: "Hours Streamed" },
                { title: "Followers", val: "+0", sub: "New fans linked" },
                { title: "Valid Days", val: "0", sub: "Active broadcast days" },
                { title: "Bstar Income", val: "+0", sub: "Estimated stars generated" }
              ].map((st, idx) => (
                <div key={idx} className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
                  <p className="text-zinc-400 text-xs font-semibold">{st.title}</p>
                  <p className="text-2xl font-black font-mono text-zinc-100 mt-1">{st.val}</p>
                  <p className="text-[9px] text-zinc-500 mt-1">{st.sub}</p>
                </div>
              ))}
            </div>

            {/* Sections for Video and Voice stats */}
            <div className="space-y-4">
              <div>
                <p className="font-bold text-xs text-zinc-400 uppercase tracking-wide mb-2">Video Recent Stats</p>
                <div className="grid grid-cols-4 gap-2 bg-zinc-900/60 p-3 rounded-xl border border-zinc-850">
                  {[
                    { label: "Live Time", value: "0h 0min" },
                    { label: "Followers", value: "+0" },
                    { label: "Audience", value: "0" },
                    { label: "Bstar Income", value: "+0" }
                  ].map((x, idx) => (
                    <div key={idx} className="text-center">
                      <p className="text-[10px] font-black text-zinc-100">{x.value}</p>
                      <p className="text-[8px] text-zinc-500 mt-0.5 whitespace-nowrap">{x.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-bold text-xs text-zinc-400 uppercase tracking-wide mb-2">Voice Recent Stats</p>
                <div className="grid grid-cols-4 gap-2 bg-zinc-900/60 p-3 rounded-xl border border-zinc-850">
                  {[
                    { label: "Live Time", value: "0h 0min" },
                    { label: "Valid Time", value: "0h 0min" },
                    { label: "Followers", value: "+0" },
                    { label: "Bstar Income", value: "+0" }
                  ].map((x, idx) => (
                    <div key={idx} className="text-center">
                      <p className="text-[10px] font-black text-zinc-100">{x.value}</p>
                      <p className="text-[8px] text-zinc-500 mt-0.5 whitespace-nowrap">{x.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Records redirect button */}
              <button 
                onClick={() => alert("Loading streaming logs history...")}
                className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex justify-between items-center text-sm font-bold text-zinc-200"
              >
                <span>Live Records <span className="text-xs text-zinc-500 font-normal">Last 3 rooms</span></span>
                <span className="text-cyan-400">View ↗</span>
              </button>

              {/* BoomLive School */}
              <div>
                <p className="font-bold text-xs text-zinc-400 uppercase tracking-wide mb-2">BoomLive School</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-[#e11d48]/10 border border-[#e11d48]/20 rounded-xl space-y-1.5">
                    <div className="text-2xl">📹</div>
                    <p className="font-bold text-xs text-zinc-200">Video Host Portal</p>
                    <p className="text-[9px] text-zinc-400">Pro tip on cameras, visual layout, and PK battles.</p>
                  </div>
                  <div className="p-3 bg-[#0284c7]/10 border border-[#0284c7]/20 rounded-xl space-y-1.5">
                    <div className="text-2xl">🎙️</div>
                    <p className="font-bold text-xs text-zinc-200">Audio Host Portal</p>
                    <p className="text-[9px] text-zinc-400">Vocal training, audio cards, soundboards config.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 7: MY AGENCY */}
        {activeTab === "agency" && (
          <motion.div 
            key="agency"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col overflow-y-auto p-4"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <button onClick={() => setActiveTab("menu")} className="p-1 rounded-full hover:bg-zinc-800">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="font-bold text-lg">My Agency</h2>
              <div className="w-6 h-6" />
            </div>

            {isAgencyMember ? (
              <div className="space-y-6">
                <div className="p-6 bg-gradient-to-br from-[#121624] to-zinc-950 rounded-2xl border border-zinc-800 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-black text-2xl border border-cyan-400/30">
                      FM
                    </div>
                    <div>
                      <h3 className="font-black text-xl">Fredmusic</h3>
                      <span className="text-xs bg-cyan-400/20 text-cyan-400 px-2.5 py-0.5 rounded-full font-bold">Linked Agency</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm pt-2 border-t border-zinc-800">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Agency ID:</span>
                      <span className="font-mono text-zinc-200">10003129</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Agency Name:</span>
                      <span className="text-zinc-200">Fredmusic</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Agent Name:</span>
                      <span className="text-zinc-200">fredmusic02</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Members count:</span>
                      <span className="font-mono text-zinc-200">51 Members</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Notice Board:</span>
                      <span className="text-zinc-200 italic">"We are one big family."</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    const leave = window.confirm("Are you sure you want to request to leave this agency? This requires agent or admin approval.");
                    if (leave) {
                      setIsAgencyMember(false);
                      saveStateToFirestore({ isAgencyMember: false });
                    }
                  }}
                  className="w-full text-red-400 hover:text-red-300 font-bold py-3 text-sm text-center border border-red-500/30 hover:border-red-500 rounded-xl transition bg-red-500/5 mt-6"
                >
                  Leave this agency
                </button>
              </div>
            ) : (
              <div className="text-center p-8 space-y-4">
                <Building className="w-16 h-16 text-zinc-600 mx-auto" />
                <h3 className="font-bold text-lg text-zinc-200">You are not in any agency</h3>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto">Link up with Fredmusic or another record agency to earn income splits, custom badges, and host promotion!</p>
                <button 
                  onClick={() => {
                    setIsAgencyMember(true);
                    saveStateToFirestore({ isAgencyMember: true });
                    alert("Successfully rejoined Fredmusic Agency!");
                  }}
                  className="bg-cyan-500 text-black font-bold text-xs px-6 py-2.5 rounded-full hover:bg-cyan-400 transition"
                >
                  Join Fredmusic Agency
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 8: FANCLUB */}
        {activeTab === "fanclub" && (
          <motion.div 
            key="fanclub"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col overflow-y-auto p-4"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <button onClick={() => setActiveTab("menu")} className="p-1 rounded-full hover:bg-zinc-800">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="font-bold text-lg">Fanclub</h2>
              <div className="w-6 h-6" />
            </div>

            {fanclubs.length === 0 ? (
              <div className="text-center p-8 space-y-2">
                <Heart className="w-12 h-12 text-zinc-600 mx-auto" />
                <p className="text-sm text-zinc-400">You haven't joined any fanclubs yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {fanclubs.map((fc) => (
                  <div key={fc.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center font-black text-rose-500 border border-rose-500/20">
                        ❤️
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-zinc-200">{fc.creator}'s fanclub</h4>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black">Lv.{fc.level}</span>
                          <span className="bg-pink-500/20 text-pink-400 border border-pink-500/20 text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">{fc.badge}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => quitFanclub(fc.id, fc.creator)}
                      className="text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-1.5 rounded-full border border-zinc-700 transition"
                    >
                      Quit
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 9: MY BACKPACK */}
        {activeTab === "backpack" && (
          <motion.div 
            key="backpack"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col overflow-y-auto p-4"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <button onClick={() => setActiveTab("menu")} className="p-1 rounded-full hover:bg-zinc-800">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="font-bold text-lg">My Backpack</h2>
              <div className="w-6 h-6" />
            </div>

            <div className="space-y-6">
              {/* Gifts & Package */}
              <div>
                <p className="font-bold text-xs text-zinc-400 uppercase tracking-wider mb-2">Gifts & Package</p>
                <div className="p-6 bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl text-center space-y-1">
                  <Inbox className="w-8 h-8 text-zinc-600 mx-auto" />
                  <p className="text-xs text-zinc-500 font-semibold">It's empty</p>
                </div>
              </div>

              {/* Vehicle */}
              <div>
                <p className="font-bold text-xs text-zinc-400 uppercase tracking-wider mb-2">Vehicle</p>
                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-cyan-400/10 text-cyan-400 rounded-xl">
                      <Car className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-zinc-200">VIP 1 Sports Car</h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Launches luxury entry effects in audio streams</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      const mode = equippedVehicle === "VIP 1" ? "Unequipped" : "VIP 1";
                      setEquippedVehicle(mode);
                      saveStateToFirestore({ equippedVehicle: mode });
                    }}
                    className={`text-xs font-bold px-4 py-1.5 rounded-full transition ${equippedVehicle === "VIP 1" ? "bg-cyan-500 text-black" : "bg-zinc-800 text-zinc-300 border border-zinc-700"}`}
                  >
                    {equippedVehicle === "VIP 1" ? "Equipped" : "Equip"}
                  </button>
                </div>
              </div>

              {/* Entrance Effect */}
              <div>
                <p className="font-bold text-xs text-zinc-400 uppercase tracking-wider mb-2">Entrance Effect</p>
                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-pink-500/10 text-pink-500 rounded-xl">
                      <Sparkles className="w-6 h-6 animate-spin" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-zinc-200">VIP 1 Banner</h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Golden flare welcome overlay</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      const mode = equippedEffect === "VIP 1" ? "Unequipped" : "VIP 1";
                      setEquippedEffect(mode);
                      saveStateToFirestore({ equippedEffect: mode });
                    }}
                    className={`text-xs font-bold px-4 py-1.5 rounded-full transition ${equippedEffect === "VIP 1" ? "bg-cyan-500 text-black" : "bg-zinc-800 text-zinc-300 border border-zinc-700"}`}
                  >
                    {equippedEffect === "VIP 1" ? "Equipped" : "Equip"}
                  </button>
                </div>
              </div>

              {/* Avatar Frame */}
              <div>
                <p className="font-bold text-xs text-zinc-400 uppercase tracking-wider mb-2">Avatar Frame</p>
                <div className="space-y-2">
                  {[
                    { id: "User Lv.11-20", title: "User Lv.11-20 Frame", color: "text-amber-400" },
                    { id: "VIP 1", title: "VIP 1 Neon Emerald Frame", color: "text-emerald-400" }
                  ].map((fr) => (
                    <div key={fr.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full border-2 border-zinc-700 flex items-center justify-center bg-zinc-950 font-black">
                          🖼️
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-zinc-200">{fr.title}</h4>
                          <p className="text-[10px] text-zinc-500 mt-0.5">Visual frame highlight around avatar</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          const next = equippedFrame === fr.id ? "None" : fr.id;
                          setEquippedFrame(next);
                          saveStateToFirestore({ equippedFrame: next });
                        }}
                        className={`text-xs font-bold px-4 py-1.5 rounded-full transition ${equippedFrame === fr.id ? "bg-cyan-500 text-black" : "bg-zinc-800 text-zinc-300 border border-zinc-700"}`}
                      >
                        {equippedFrame === fr.id ? "Equipped" : "Equip"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 10: MY TREASURE CHEST */}
        {activeTab === "treasure" && (
          <motion.div 
            key="treasure"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex-1 flex flex-col overflow-y-auto p-4 items-center justify-center text-center"
          >
            {/* Back header */}
            <div className="w-full flex justify-start border-b border-zinc-800 pb-3 mb-6">
              <button onClick={() => setActiveTab("menu")} className="p-1 rounded-full hover:bg-zinc-800">
                <ArrowLeft className="w-6 h-6 text-white" />
              </button>
              <h2 className="font-bold text-lg ml-2">My Treasure Chest</h2>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <motion.div 
                  animate={isOpeningChest ? { rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 1.2, repeat: isOpeningChest ? Infinity : 0 }}
                  className="text-8xl p-6 bg-zinc-900 border-2 border-amber-500/20 rounded-full shadow-2xl relative cursor-pointer hover:border-amber-500/60 transition"
                  onClick={handleOpenChest}
                >
                  📦
                </motion.div>
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase scale-90 animate-bounce">
                  Lucky Draw
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-black text-xl text-zinc-100">Lucky Coin Chest</h3>
                <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">Spend some luck to crack open the lucky chest! Win anywhere from 500 Bstars up to 10,000 Bstars, or direct bonus coins!</p>
              </div>

              {chestReward && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold font-mono rounded-2xl flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                  <span>Reward: {chestReward}!</span>
                </motion.div>
              )}

              <button 
                onClick={handleOpenChest}
                disabled={isOpeningChest}
                className="bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-black text-sm px-8 py-3 rounded-xl transition shadow-lg w-52"
              >
                {isOpeningChest ? "Opening..." : "Crack Chest"}
              </button>
            </div>
          </motion.div>
        )}

        {/* TAB 11: FEEDBACK */}
        {activeTab === "feedback" && (
          <motion.div 
            key="feedback"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col overflow-y-auto p-4"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <button onClick={() => setActiveTab("menu")} className="p-1 rounded-full hover:bg-zinc-800">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="font-bold text-lg">Feedback & Help</h2>
              <div className="w-6 h-6" />
            </div>

            <div className="space-y-4">
              {/* Category */}
              <div>
                <label className="text-xs text-zinc-400 font-semibold block mb-1">Issue Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Bug Report", "Coin Issue", "Host Inquiry"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFeedbackCategory(cat)}
                      className={`py-2 text-xs font-bold rounded-xl border transition ${feedbackCategory === cat ? "border-cyan-400 bg-cyan-400/5 text-cyan-400" : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Input */}
              <div>
                <label className="text-xs text-zinc-400 font-semibold block mb-1">Write Details</label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Describe your issue with exact details, transaction IDs or coin amounts so we can investigate swiftly."
                  className="w-full h-32 p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 outline-none resize-none focus:border-zinc-700 transition"
                />
              </div>

              <button 
                onClick={handleSubmitFeedback}
                className="w-full bg-cyan-400 hover:bg-cyan-300 text-black py-3 rounded-xl font-bold text-sm tracking-wide shadow-lg"
              >
                Submit Ticket
              </button>

              {/* Submitted Tickets History */}
              {submittedTickets.length > 0 && (
                <div className="space-y-2 pt-4 border-t border-zinc-900">
                  <p className="font-bold text-xs text-zinc-400 uppercase tracking-wide">Ticket History</p>
                  {submittedTickets.map((tk) => (
                    <div key={tk.id} className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-cyan-400 uppercase tracking-wider">{tk.category}</span>
                        <span className="bg-cyan-500/15 text-cyan-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Open</span>
                      </div>
                      <p className="text-zinc-300 leading-relaxed">{tk.text}</p>
                      <p className="text-[10px] text-zinc-500 font-mono">{tk.date}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* TAB 12: VIP PRIVILEGES */}
        {activeTab === "vip" && (
          <motion.div 
            key="vip"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col overflow-y-auto"
          >
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-zinc-800 bg-[#121624]">
              <button onClick={() => setActiveTab("menu")} className="p-1 rounded-full hover:bg-zinc-800">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="font-bold text-lg">VIP Privileges</h2>
              <button className="p-1 text-zinc-400 hover:text-white" onClick={() => alert("Recharge coins and spend in live rooms to level up your VIP tier!")}>
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>

            {/* VIP TIER CARD SLIDER */}
            <div className="p-4">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-600/90 to-teal-800/90 border border-emerald-500/20 text-white relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-3xl" />
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-black text-2xl tracking-wide italic">VIP {vipLevel}</h3>
                    <p className="text-xs text-emerald-100 mt-1">Current Level</p>
                  </div>
                  <span className="bg-black/20 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Setting</span>
                </div>

                <div className="mt-8 space-y-1.5">
                  <div className="flex justify-between text-xs font-mono text-emerald-100">
                    <span>VIP{vipLevel} EXP {vipExp.toLocaleString()} / 100,000</span>
                    <span>VIP{vipLevel + 1}</span>
                  </div>
                  <div className="w-full bg-black/20 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-white h-full rounded-full" style={{ width: `${(vipExp / 100000) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Privileges Grid */}
            <div className="px-4 pb-8 space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-black text-base italic text-zinc-200">Privileges <span className="text-cyan-400 font-mono">8/22</span></span>
                <span className="text-xs text-zinc-400 font-mono">Need {(100000 - vipExp).toLocaleString()} EXP to VIP2</span>
              </div>

              <div className="grid grid-cols-4 gap-2.5">
                {[
                  { label: "VIP Badge", desc: "Permanent", icon: Award, unlocked: true },
                  { label: "VIP Entry", desc: "Chariot FX", icon: Sparkles, unlocked: true },
                  { label: "VIP Frame", desc: "Emerald Frame", icon: Bookmark, unlocked: true },
                  { label: "VIP Chat", desc: "Custom Bubble", icon: MessageSquare, unlocked: true },
                  { label: "VIP Vehicle", desc: "Sports Car", icon: Car, unlocked: true },
                  { label: "VIP Gift", desc: "Special Store", icon: Gift, unlocked: true },
                  { label: "Level up FX", desc: "Room Broadcast", icon: Crown, unlocked: true },
                  { label: "Room Seats", desc: "Hold Priority", icon: Users, unlocked: true },
                  { label: "Customer Svc", desc: "Private Desk", icon: HelpCircle, unlocked: false },
                  { label: "VIP Mini Bio", desc: "Custom Profile", icon: User, unlocked: false }
                ].map((pr, idx) => (
                  <div 
                    key={idx} 
                    className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-between space-y-1 relative ${pr.unlocked ? "bg-zinc-900/60 border-zinc-800" : "bg-zinc-950/40 border-zinc-900 opacity-40"}`}
                  >
                    <pr.icon className={`w-5 h-5 ${pr.unlocked ? "text-cyan-400" : "text-zinc-600"}`} />
                    <p className="font-bold text-[9px] text-zinc-200 truncate w-full leading-tight">{pr.label}</p>
                    <span className="text-[7px] text-zinc-500 truncate w-full">{pr.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 13: INVITATION REWARDS */}
        {activeTab === "invitation" && (
          <motion.div 
            key="invitation"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col overflow-y-auto p-4"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <button onClick={() => setActiveTab("menu")} className="p-1 rounded-full hover:bg-zinc-800">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="font-bold text-lg">Invitation Rewards</h2>
              <div className="w-6 h-6" />
            </div>

            <div className="space-y-5">
              {/* Rewards Summary */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-900/40 to-zinc-900 border border-indigo-500/20 space-y-3">
                <p className="font-bold text-xs text-indigo-400 uppercase tracking-wider">My Rewards</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-900 text-center">
                    <p className="text-xs text-zinc-400">Claimed Rewards</p>
                    <p className="text-lg font-black font-mono text-cyan-400 mt-1">⭐ 0</p>
                  </div>
                  <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-900 text-center">
                    <p className="text-xs text-zinc-400">Total Invitees</p>
                    <p className="text-lg font-black font-mono text-indigo-400 mt-1">0</p>
                  </div>
                </div>
              </div>

              {/* claimable stars */}
              <div className="p-4 bg-zinc-900 border border-zinc-850 rounded-2xl flex justify-between items-center">
                <div>
                  <p className="text-xs text-zinc-400">Bstars to be claimed</p>
                  <p className="text-xl font-black font-mono text-cyan-300 mt-1">⭐ 0</p>
                </div>
                <button 
                  disabled
                  className="bg-zinc-800 text-zinc-500 font-bold text-xs px-4 py-2 rounded-xl border border-zinc-750 cursor-not-allowed"
                >
                  Claim
                </button>
              </div>

              {/* invitees count today */}
              <div>
                <p className="font-bold text-xs text-zinc-400 uppercase tracking-wider mb-2">Number of Invitees</p>
                <div className="p-6 bg-zinc-950/40 border border-zinc-900 rounded-2xl text-center space-y-2">
                  <Users className="w-8 h-8 text-zinc-700 mx-auto" />
                  <p className="text-xs text-zinc-500 font-bold">No data available</p>
                </div>
              </div>

              {/* invite button */}
              <button 
                onClick={() => {
                  navigator.clipboard.writeText("https://soundstreamy.com/invite?ref=183847002");
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                  alert("Referral link copied! Share with friends to earn Bstar bonuses!");
                }}
                className="w-full bg-cyan-400 hover:bg-cyan-300 text-black py-3 rounded-xl font-bold tracking-wide shadow-lg text-sm flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                <span>{copiedLink ? "Link Copied!" : "Invite Friends Now 👌"}</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* TAB 14: NOBLE STATUS */}
        {activeTab === "noble" && (
          <motion.div 
            key="noble"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col overflow-y-auto p-4"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <button onClick={() => setActiveTab("menu")} className="p-1 rounded-full hover:bg-zinc-800">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="font-bold text-lg">Noble Tiers</h2>
              <div className="w-6 h-6" />
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/60 to-indigo-900/40 border border-purple-500/20 text-center">
                <Crown className="w-12 h-12 text-yellow-400 mx-auto animate-pulse" />
                <h3 className="font-black text-xl text-zinc-100 mt-2">SoundStream Nobility</h3>
                <p className="text-xs text-zinc-300 max-w-xs mx-auto mt-1">Ascend to nobility and enjoy royal entrance effects, chat badges, kick protection, and custom name coloring!</p>
              </div>

              <div className="space-y-2">
                {[
                  { title: "King", price: "$1,200/mo", perk: "Royal Crown badge + custom welcome banner" },
                  { title: "Duke", price: "$600/mo", perk: "Duke shield + anti-mute privilege" },
                  { title: "Marquis", price: "$300/mo", perk: "Marquis insignia + VIP room seating" },
                  { title: "Count", price: "$150/mo", perk: "Count ribbon + special font colors" },
                  { title: "Viscount", price: "$75/mo", perk: "Viscount pin + lobby alert" },
                  { title: "Knight", price: "$25/mo", perk: "Knight sword badge" }
                ].map((tier, idx) => (
                  <div key={idx} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="font-bold text-sm text-zinc-100">{tier.title}</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">{tier.perk}</p>
                    </div>
                    <button 
                      onClick={() => alert(`Subscribing to ${tier.title} tier... Connecting Stripe portal.`)}
                      className="bg-purple-500 hover:bg-purple-400 text-white font-black text-xs px-4 py-1.5 rounded-full shadow"
                    >
                      {tier.price}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
}
