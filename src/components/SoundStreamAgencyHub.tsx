import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Building, 
  Users, 
  TrendingUp, 
  Play, 
  DollarSign, 
  Briefcase, 
  FileText, 
  CheckCircle, 
  Plus, 
  Trash2, 
  UserPlus, 
  BarChart3, 
  MapPin, 
  Clock, 
  ChevronRight, 
  Globe, 
  Shield, 
  Award, 
  Bell, 
  User, 
  Sparkles, 
  PieChart as PieIcon, 
  Percent, 
  CreditCard, 
  UploadCloud, 
  AlertCircle,
  Video,
  Radio,
  FileCheck2,
  Lock,
  Compass,
  Check,
  X,
  UserCheck
} from "lucide-react";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  getDocs
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { agencyService } from "../lib/agencyService";
import { 
  Agency, 
  AgencyMember, 
  AgencyArtist, 
  AgencyContract, 
  AgencyRevenue, 
  AgencyNotification, 
  AgencyVerification 
} from "../types";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip as ChartTooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";

// Mock user list for artist search fallback
const SYSTEM_ARTISTS_FALLBACK = [
  { uid: "art-1", username: "DJ Horizon", artistName: "DJ Horizon", photoURL: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=150" },
  { uid: "art-2", username: "Luna_Vibe", artistName: "Luna Vibe", photoURL: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=150" },
  { uid: "art-3", username: "The_Acoustics", artistName: "The Acoustics", photoURL: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=150" },
  { uid: "art-4", username: "BeatArchitect", artistName: "Beat Architect", photoURL: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=150" },
];

const ANALYTICS_COLORS = ["#ff007f", "#00f0ff", "#39ff14", "#ffb300", "#9d00ff"];

interface SoundStreamAgencyHubProps {
  userId: string;
  userEmail: string;
  isArtist: boolean;
  isAdmin: boolean;
}

export default function SoundStreamAgencyHub({
  userId,
  userEmail,
  isArtist,
  isAdmin
}: SoundStreamAgencyHubProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "artists" | "revenue" | "team" | "contracts" | "verification" | "analytics">("overview");
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(true);

  // Synced lists
  const [members, setMembers] = useState<AgencyMember[]>([]);
  const [artists, setArtists] = useState<AgencyArtist[]>([]);
  const [contracts, setContracts] = useState<AgencyContract[]>([]);
  const [revenues, setRevenues] = useState<AgencyRevenue[]>([]);
  const [notifications, setNotifications] = useState<AgencyNotification[]>([]);
  const [verifications, setVerifications] = useState<AgencyVerification[]>([]);
  const [incomingContracts, setIncomingContracts] = useState<AgencyContract[]>([]);

  // Modals & form fields
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [regName, setRegName] = useState("");
  const [regType, setRegType] = useState<Agency["type"]>("record_label");
  const [regDesc, setRegDesc] = useState("");
  const [regWeb, setRegWeb] = useState("");
  const [regLogo, setRegLogo] = useState("");

  const [inviteArtistEmail, setInviteArtistEmail] = useState("");
  const [inviteArtistId, setInviteArtistId] = useState("");
  const [inviteSplits, setInviteSplits] = useState({ artist: 70, agency: 20, manager: 5, producer: 5 });
  const [inviteTerms, setInviteTerms] = useState("This contract outlines full representation rights, sound master release options, and a configured 70/20 split structure.");

  const [inviteStaffEmail, setInviteStaffEmail] = useState("");
  const [inviteStaffRole, setInviteStaffRole] = useState<AgencyMember["role"]>("manager");
  const [inviteStaffPermissions, setInviteStaffPermissions] = useState<string[]>(["manage_artists", "view_analytics"]);

  const [verifyType, setVerifyType] = useState<AgencyVerification["type"]>("agency");
  const [verifyDocs, setVerifyDocs] = useState("https://soundstream.com/documents/licensing_proof.pdf");

  // Split revenue simulator states
  const [simArtistId, setSimArtistId] = useState("");
  const [simAmount, setSimAmount] = useState<number>(150);
  const [simCategory, setSimCategory] = useState<AgencyRevenue["category"]>("music");
  const [simDesc, setSimDesc] = useState("Standard royalty split for digital master streaming plays");

  // Cashout states
  const [cashoutAmount, setCashoutAmount] = useState<number>(100);
  const [cashoutMethod, setCashoutMethod] = useState("PayPal");
  const [cashoutDetails, setCashoutDetails] = useState("agency_treasury_payout@soundstream.com");

  // Load and sync real-time database state
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    // Find all agencies the user owns or belongs to
    const q = query(collection(db, "agencies"));
    const unsub = onSnapshot(q, async (snap) => {
      const allAgencies = snap.docs.map(doc => doc.data() as Agency);
      const userJoinedAgencies: Agency[] = [];

      // Check membership
      try {
        const memQ = query(collection(db, "agency_members"), where("userId", "==", userId), where("status", "==", "active"));
        const memSnap = await getDocs(memQ);
        const joinedAgencyIds = memSnap.docs.map(d => (d.data() as AgencyMember).agencyId);

        allAgencies.forEach(ag => {
          if (ag.ownerId === userId || joinedAgencyIds.includes(ag.id)) {
            userJoinedAgencies.push(ag);
          }
        });
      } catch (err) {
        console.error("Failed to fetch member agencies, falling back to owner filter:", err);
        allAgencies.forEach(ag => {
          if (ag.ownerId === userId) {
            userJoinedAgencies.push(ag);
          }
        });
      }

      setAgencies(userJoinedAgencies);
      if (userJoinedAgencies.length > 0) {
        // Retain selection if available, else select first
        const currentSelected = selectedAgency 
          ? userJoinedAgencies.find(a => a.id === selectedAgency.id) 
          : null;
        setSelectedAgency(currentSelected || userJoinedAgencies[0]);
      } else {
        setSelectedAgency(null);
      }
      setLoading(false);
    });

    // Check incoming contracts for this user if they are an artist
    const contractQ = query(collection(db, "agency_contracts"), where("artistId", "==", userId), where("status", "==", "pending"));
    const unsubContracts = onSnapshot(contractQ, (snap) => {
      setIncomingContracts(snap.docs.map(doc => doc.data() as AgencyContract));
    });

    return () => {
      unsub();
      unsubContracts();
    };
  }, [userId]);

  // Sync related agency data when selected agency changes
  useEffect(() => {
    if (!selectedAgency) return;

    const agencyId = selectedAgency.id;

    // 1. Members
    const memUnsub = onSnapshot(query(collection(db, "agency_members"), where("agencyId", "==", agencyId)), (snap) => {
      setMembers(snap.docs.map(doc => doc.data() as AgencyMember));
    });

    // 2. Artists
    const artUnsub = onSnapshot(query(collection(db, "agency_artists"), where("agencyId", "==", agencyId)), (snap) => {
      setArtists(snap.docs.map(doc => doc.data() as AgencyArtist));
    });

    // 3. Contracts
    const conUnsub = onSnapshot(query(collection(db, "agency_contracts"), where("agencyId", "==", agencyId)), (snap) => {
      setContracts(snap.docs.map(doc => doc.data() as AgencyContract));
    });

    // 4. Revenue
    const revUnsub = onSnapshot(query(collection(db, "agency_revenue"), where("agencyId", "==", agencyId)), (snap) => {
      setRevenues(snap.docs.map(doc => doc.data() as AgencyRevenue));
    });

    // 5. Notifications
    const notUnsub = onSnapshot(query(collection(db, "agency_notifications"), where("agencyId", "==", agencyId)), (snap) => {
      setNotifications(snap.docs.map(doc => doc.data() as AgencyNotification).sort((a,b) => b.createdAt.localeCompare(a.createdAt)));
    });

    // 6. Verifications
    const verUnsub = onSnapshot(query(collection(db, "agency_verification"), where("agencyId", "==", agencyId)), (snap) => {
      setVerifications(snap.docs.map(doc => doc.data() as AgencyVerification));
    });

    return () => {
      memUnsub();
      artUnsub();
      conUnsub();
      revUnsub();
      notUnsub();
      verUnsub();
    };
  }, [selectedAgency]);

  // Handle forms
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName) return;

    try {
      const newAgency = await agencyService.registerAgency({
        ownerId: userId,
        name: regName,
        type: regType,
        description: regDesc || "No description provided.",
        website: regWeb || "https://soundstream.com",
        logoUrl: regLogo || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200"
      });
      setSelectedAgency(newAgency);
      setShowRegisterForm(false);
      setRegName("");
      setRegDesc("");
      setRegWeb("");
      setRegLogo("");
    } catch (err) {
      alert("Registration failed. Please try again.");
    }
  };

  const handleInviteArtist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgency || !inviteArtistId) return;

    try {
      await agencyService.inviteArtist(selectedAgency.id, inviteArtistId, inviteSplits);
      setInviteArtistId("");
      alert("Artist invitation and Digital Contract sent successfully!");
    } catch (err) {
      alert("Failed to send invitation.");
    }
  };

  const handleInviteStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgency || !inviteStaffEmail) return;

    try {
      await agencyService.inviteTeamMember(selectedAgency.id, inviteStaffEmail, inviteStaffRole, inviteStaffPermissions);
      setInviteStaffEmail("");
      alert(`Staff invitation sent to ${inviteStaffEmail}!`);
    } catch (err) {
      alert("Failed to invite staff member.");
    }
  };

  const handleRequestVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgency) return;

    try {
      await agencyService.requestVerification(selectedAgency.id, verifyType, [verifyDocs]);
      alert("Verification request submitted successfully. Our compliance team will review your files.");
    } catch (err) {
      alert("Failed to submit verification request.");
    }
  };

  const handleSimulateRevenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgency || !simArtistId) return;

    try {
      await agencyService.recordRevenue(selectedAgency.id, simArtistId, simAmount, simCategory, simDesc);
      alert(`Successfully processed $${simAmount.toFixed(2)} split! Treasury and artist balances updated.`);
    } catch (err) {
      alert("Failed to process split payout.");
    }
  };

  const handleCashout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgency) return;

    try {
      await agencyService.withdrawAgencyBalance(selectedAgency.id, cashoutAmount, cashoutMethod, cashoutDetails);
      alert(`Withdrawal request of $${cashoutAmount.toFixed(2)} submitted successfully!`);
    } catch (err: any) {
      alert(err.message || "Failed to process withdrawal.");
    }
  };

  const handleSignContract = async (contractId: string, signature: string) => {
    try {
      await agencyService.signContract(contractId, userId, signature);
      alert("Contract signed and executed electronically! You are now represented by this agency.");
    } catch (err) {
      alert("Failed to sign contract.");
    }
  };

  const handleRejectContract = async (contractId: string) => {
    try {
      await agencyService.rejectContract(contractId, userId, "Declined representation offer.");
      alert("Contract rejected.");
    } catch (err) {
      alert("Failed to reject contract.");
    }
  };

  const getRoleLabel = (role: string) => {
    return role.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  const getTypeLabel = (type: string) => {
    return type.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  // Preloaded growth data for charts
  const revenueChartData = [
    { month: "Jan", revenue: 1400, releases: 2, streams: 12400 },
    { month: "Feb", revenue: 2100, releases: 3, streams: 18200 },
    { month: "Mar", revenue: 3800, releases: 5, streams: 29800 },
    { month: "Apr", revenue: 4200, releases: 7, streams: 35100 },
    { month: "May", revenue: 6900, releases: 9, streams: 51000 },
    { month: "Jun", revenue: revenues.reduce((acc, r) => acc + r.amount, 0) || 8200, releases: artists.length + 3, streams: 74500 },
  ];

  const audienceCountries = [
    { name: "United States", value: 45 },
    { name: "United Kingdom", value: 20 },
    { name: "Germany", value: 15 },
    { name: "Japan", value: 12 },
    { name: "Brazil", value: 8 },
  ];

  const audienceAges = [
    { name: "18-24", value: 50 },
    { name: "25-34", value: 30 },
    { name: "35-44", value: 12 },
    { name: "Other", value: 8 },
  ];

  return (
    <div className="bg-[#0c0c0e] min-h-screen text-white font-sans relative overflow-x-hidden w-full p-4 md:p-8" id="agency-portal-root">
      {/* Absolute Decorative Ambient Lights */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        
        {/* TOP STATUS BAR & HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1b1b1f] pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-pink-500 font-mono tracking-widest uppercase mb-1">
              <Building className="w-3.5 h-3.5" />
              SoundStream B2B Portal
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Agency & Record Label <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-cyan-400">HQ</span>
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {agencies.length > 0 && (
              <div className="flex items-center gap-2 bg-[#121214] border border-[#222226] p-1.5 rounded-2xl">
                <span className="text-xs text-gray-400 px-2 font-medium">Switch Entity:</span>
                <select
                  value={selectedAgency?.id || ""}
                  onChange={(e) => setSelectedAgency(agencies.find(a => a.id === e.target.value) || null)}
                  className="bg-[#18181c] border border-[#2a2a30] text-sm text-white rounded-xl py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-pink-500 font-medium cursor-pointer"
                >
                  {agencies.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.name} ({getTypeLabel(ag.type)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => setShowRegisterForm(!showRegisterForm)}
              className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-medium text-sm py-2 px-4 rounded-2xl shadow-lg transition duration-200 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Register New Agency
            </button>
          </div>
        </div>

        {/* INCOMING ARTIST REPRESENTATION REQUESTS (Zero-Trust Notification Bar) */}
        {incomingContracts.length > 0 && (
          <div className="bg-gradient-to-r from-cyan-950/40 to-[#0e171c]/50 border border-cyan-500/20 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
            <div className="flex gap-3 items-start">
              <div className="p-3 bg-cyan-500/10 rounded-2xl text-cyan-400">
                <Award className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Pending Representation Offer</h3>
                <p className="text-sm text-gray-400 mt-0.5">An agency wants to represent you! Sign the contract to synchronize your stream splits.</p>
              </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <button
                onClick={() => {
                  const signature = prompt("Please enter your legal name as electronic signature to execute contract:");
                  if (signature) {
                    handleSignContract(incomingContracts[0].id, signature);
                  }
                }}
                className="flex-1 md:flex-none bg-cyan-500 hover:bg-cyan-600 text-[#0c0c0e] font-bold text-sm py-2 px-5 rounded-2xl transition"
              >
                Accept & Sign Electronic Contract
              </button>
              <button
                onClick={() => handleRejectContract(incomingContracts[0].id)}
                className="flex-1 md:flex-none bg-[#18181c] hover:bg-red-950/20 border border-red-500/20 hover:border-red-500/30 text-gray-300 hover:text-red-400 font-medium text-sm py-2 px-5 rounded-2xl transition"
              >
                Reject
              </button>
            </div>
          </div>
        )}

        {/* REGISTRATION FORM COMPONENT (MODAL/TOGGLE) */}
        <AnimatePresence>
          {showRegisterForm && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-[#121214] border border-[#1f1f23] rounded-3xl p-6 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowRegisterForm(false)} 
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Building className="text-pink-500 w-5 h-5" />
                Register New Agency / Record Label
              </h2>
              <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-mono">Agency/Label Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter official brand name"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full bg-[#18181c] border border-[#26262b] rounded-xl py-2 px-3 focus:outline-none focus:border-pink-500 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-mono">Organization Type *</label>
                  <select
                    value={regType}
                    onChange={(e) => setRegType(e.target.value as any)}
                    className="w-full bg-[#18181c] border border-[#26262b] rounded-xl py-2 px-3 focus:outline-none focus:border-pink-500 text-sm cursor-pointer"
                  >
                    <option value="record_label">Record Label</option>
                    <option value="talent_agency">Talent Agency</option>
                    <option value="music_publisher">Music Publisher</option>
                    <option value="management_company">Management Company</option>
                  </select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs text-gray-400 font-mono">Description</label>
                  <textarea
                    placeholder="Short summary of what your label/agency specializes in..."
                    value={regDesc}
                    onChange={(e) => setRegDesc(e.target.value)}
                    rows={2}
                    className="w-full bg-[#18181c] border border-[#26262b] rounded-xl py-2 px-3 focus:outline-none focus:border-pink-500 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-mono">Official Website URL</label>
                  <input
                    type="url"
                    placeholder="https://example.com"
                    value={regWeb}
                    onChange={(e) => setRegWeb(e.target.value)}
                    className="w-full bg-[#18181c] border border-[#26262b] rounded-xl py-2 px-3 focus:outline-none focus:border-pink-500 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-mono">Logo Image URL</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={regLogo}
                    onChange={(e) => setRegLogo(e.target.value)}
                    className="w-full bg-[#18181c] border border-[#26262b] rounded-xl py-2 px-3 focus:outline-none focus:border-pink-500 text-sm"
                  />
                </div>
                <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowRegisterForm(false)}
                    className="bg-transparent hover:bg-[#1c1c22] text-gray-300 text-sm py-2 px-4 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-pink-500 hover:bg-pink-600 text-white font-semibold text-sm py-2 px-6 rounded-xl transition shadow-lg"
                  >
                    Submit Registration Request
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* LOADING HANDLER */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 font-mono text-xs">Synchronizing Agency Core...</p>
          </div>
        ) : !selectedAgency ? (
          /* EMPTY PORTAL PLACEHOLDER */
          <div className="bg-[#121214] border border-[#1b1b1f] rounded-3xl p-12 text-center max-w-xl mx-auto space-y-6">
            <div className="w-20 h-20 bg-gradient-to-tr from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto text-white shadow-xl">
              <Building className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Launch Your Music Agency</h2>
              <p className="text-sm text-gray-400 leading-relaxed">
                Connect and manage multiple creators, coordinate sound contracts, split streaming & video revenues, and organize your team using SoundStream's unified Label Management framework.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => setShowRegisterForm(true)}
                className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-bold py-3 px-8 rounded-2xl shadow-xl transition"
              >
                Register Your Account
              </button>
            </div>
          </div>
        ) : (
          /* AGENCY ACTIVE WORKSPACE */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            
            {/* SIDEBAR TABS SELECTION */}
            <div className="lg:col-span-1 bg-[#121214] border border-[#1b1b1f] rounded-3xl p-4 space-y-1.5 shadow-xl">
              <div className="p-4 border-b border-[#1b1b1f] mb-2 text-center">
                <img
                  src={selectedAgency.logoUrl}
                  alt={selectedAgency.name}
                  className="w-16 h-16 rounded-2xl object-cover mx-auto border border-[#25252a] shadow-lg mb-2"
                />
                <h3 className="font-bold text-lg leading-tight truncate">{selectedAgency.name}</h3>
                <span className="text-xs text-pink-500 font-mono tracking-wider bg-pink-500/10 py-0.5 px-2 rounded-full mt-1 inline-block">
                  {getTypeLabel(selectedAgency.type)}
                </span>
                
                {/* STATUS BAR */}
                <div className="mt-3 flex items-center justify-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <span className={`w-2.5 h-2.5 rounded-full ${selectedAgency.status === "approved" ? "bg-green-500" : selectedAgency.status === "pending" ? "bg-yellow-500 animate-pulse" : "bg-red-500"}`} />
                    {selectedAgency.status === "approved" ? "Active Label" : selectedAgency.status === "pending" ? "Pending Admin" : "Suspended"}
                  </div>
                  <span className="text-gray-600">•</span>
                  <div className="flex items-center gap-1 text-xs text-cyan-400">
                    <Shield className="w-3.5 h-3.5" />
                    {selectedAgency.verificationStatus === "verified" ? "Verified" : "Unverified"}
                  </div>
                </div>
              </div>

              {[
                { id: "overview", label: "Dashboard HQ", icon: Building },
                { id: "artists", label: "Artists Management", icon: Users },
                { id: "revenue", label: "Finances & Splits", icon: DollarSign },
                { id: "team", label: "Team & Staff", icon: Shield },
                { id: "contracts", label: "Digital Contracts", icon: FileText },
                { id: "verification", label: "Get Verified badge", icon: Award },
                { id: "analytics", label: "Label Analytics", icon: BarChart3 },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl text-sm font-medium transition duration-150 ${isActive ? "bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md font-bold" : "text-gray-400 hover:bg-[#1a1a1f] hover:text-white"}`}
                  >
                    <Icon className="w-4.5 h-4.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* TAB CONTENTS PANEL */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* STATUS PENDING WARNING */}
              {selectedAgency.status === "pending" && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-2xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm">Awaiting Administrator Authorization</h4>
                    <p className="text-xs text-yellow-500/80 mt-0.5">Your agency is registered successfully but remains in review. Some platform endpoints and distribution splits will only execute once verified by system admins.</p>
                  </div>
                </div>
              )}

              {/* TABS RESOLUTIONS */}

              {/* OVERVIEW TAB */}
              {activeTab === "overview" && (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* BENTO STAT CARDS */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "Managed Artists", value: artists.filter(a => a.status === "active").length, icon: Users, color: "text-pink-500 bg-pink-500/10" },
                      { label: "Total Releases", value: artists.length * 2 + 1, icon: Play, color: "text-cyan-400 bg-cyan-400/10" },
                      { label: "Treasury Revenue", value: `$${revenues.reduce((acc, r) => acc + r.amount, 0).toFixed(2)}`, icon: DollarSign, color: "text-green-500 bg-green-500/10" },
                      { label: "Withdrawable", value: `$${selectedAgency.withdrawableBalance.toFixed(2)}`, icon: CreditCard, color: "text-purple-500 bg-purple-500/10" },
                    ].map((stat, idx) => {
                      const Icon = stat.icon;
                      return (
                        <div key={idx} className="bg-[#121214] border border-[#1b1b1f] p-5 rounded-3xl space-y-3 shadow-md relative overflow-hidden">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${stat.color}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                            <p className="text-xl md:text-2xl font-black mt-1">{stat.value}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* DOUBLE COLUMN LAYOUT: CHART & LIVE ALERTS */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* CHART */}
                    <div className="md:col-span-2 bg-[#121214] border border-[#1b1b1f] p-6 rounded-3xl space-y-4 shadow-xl">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-base flex items-center gap-2">
                          <TrendingUp className="text-pink-500 w-4 h-4" />
                          Monthly Revenue & Stream Performance
                        </h4>
                        <span className="text-xs font-mono text-gray-500 bg-[#18181c] py-1 px-3 rounded-xl border border-[#222226]">Last 6 Months</span>
                      </div>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={revenueChartData}>
                            <defs>
                              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ff007f" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#ff007f" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="month" stroke="#4b5563" fontSize={11} tickLine={false} />
                            <YAxis stroke="#4b5563" fontSize={11} tickLine={false} />
                            <ChartTooltip contentStyle={{ backgroundColor: "#121214", borderColor: "#222226", borderRadius: "1rem" }} />
                            <Area type="monotone" dataKey="revenue" stroke="#ff007f" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" name="Revenue ($)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* LIVE AUDIT LOGS / AGENCY NOTIFICATIONS */}
                    <div className="bg-[#121214] border border-[#1b1b1f] p-6 rounded-3xl space-y-4 shadow-xl flex flex-col">
                      <h4 className="font-bold text-base flex items-center gap-2">
                        <Bell className="text-cyan-400 w-4 h-4 animate-bounce" />
                        Label Alerts & Logs
                      </h4>
                      <div className="flex-1 overflow-y-auto space-y-3 max-h-60 pr-1">
                        {notifications.length === 0 ? (
                          <div className="text-center py-10 text-gray-500 text-xs font-mono">No recent logs recorded.</div>
                        ) : (
                          notifications.map((not) => (
                            <div key={not.id} className="bg-[#18181c] border border-[#222226] p-3 rounded-2xl space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-pink-500 uppercase tracking-wider">{not.type.replace("_", " ")}</span>
                                <span className="text-[9px] text-gray-500 font-mono">{new Date(not.createdAt).toLocaleDateString()}</span>
                              </div>
                              <p className="text-xs font-bold text-white">{not.title}</p>
                              <p className="text-[11px] text-gray-400 leading-normal">{not.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* ARTISTS MANAGEMENT TAB */}
              {activeTab === "artists" && (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* INVITE FORM & ACTIVE ARTISTS GRID */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* INVITE FORM */}
                    <div className="md:col-span-1 bg-[#121214] border border-[#1b1b1f] p-6 rounded-3xl space-y-4 shadow-xl">
                      <h4 className="font-bold text-base flex items-center gap-2 border-b border-[#1b1b1f] pb-3">
                        <UserPlus className="text-pink-500 w-4.5 h-4.5" />
                        Invite & Contract Artist
                      </h4>
                      <form onSubmit={handleInviteArtist} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs text-gray-400 font-mono">Select Artist from System *</label>
                          <select
                            required
                            value={inviteArtistId}
                            onChange={(e) => setInviteArtistId(e.target.value)}
                            className="w-full bg-[#18181c] border border-[#26262b] rounded-xl py-2.5 px-3 focus:outline-none focus:border-pink-500 text-sm cursor-pointer"
                          >
                            <option value="">-- Choose Artist Profile --</option>
                            {SYSTEM_ARTISTS_FALLBACK.map((art) => (
                              <option key={art.uid} value={art.uid}>
                                {art.artistName} ({art.username})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* SPLIT SETTINGS */}
                        <div className="space-y-2">
                          <label className="text-xs text-gray-400 font-mono flex items-center gap-1">
                            <Percent className="w-3 h-3 text-pink-500" />
                            Default Splits (%)
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-[#18181c] p-2 rounded-xl border border-[#232328] text-center">
                              <span className="text-[10px] text-gray-400 block font-medium">Artist %</span>
                              <input 
                                type="number" 
                                value={inviteSplits.artist} 
                                onChange={(e) => setInviteSplits({...inviteSplits, artist: Number(e.target.value)})}
                                className="w-full bg-transparent text-center text-sm font-bold mt-1 focus:outline-none"
                              />
                            </div>
                            <div className="bg-[#18181c] p-2 rounded-xl border border-[#232328] text-center">
                              <span className="text-[10px] text-gray-400 block font-medium">Agency %</span>
                              <input 
                                type="number" 
                                value={inviteSplits.agency} 
                                onChange={(e) => setInviteSplits({...inviteSplits, agency: Number(e.target.value)})}
                                className="w-full bg-transparent text-center text-sm font-bold mt-1 focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs text-gray-400 font-mono">Contract Term Notes</label>
                          <textarea
                            value={inviteTerms}
                            onChange={(e) => setInviteTerms(e.target.value)}
                            rows={3}
                            className="w-full bg-[#18181c] border border-[#26262b] rounded-xl py-2 px-3 focus:outline-none focus:border-pink-500 text-xs"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold text-sm py-2.5 rounded-xl transition shadow-lg"
                        >
                          Send representation offer
                        </button>
                      </form>
                    </div>

                    {/* ACTIVE ARTISTS LIST */}
                    <div className="md:col-span-2 bg-[#121214] border border-[#1b1b1f] p-6 rounded-3xl space-y-4 shadow-xl">
                      <h4 className="font-bold text-base flex items-center gap-2 border-b border-[#1b1b1f] pb-3">
                        <Users className="text-cyan-400 w-4.5 h-4.5" />
                        Managed Roster ({artists.length})
                      </h4>
                      {artists.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">
                          <Users className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                          <p className="font-bold">No artists currently managed.</p>
                          <p className="text-xs text-gray-500">Invite system artists to start managing splits.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {artists.map((art) => (
                            <div key={art.id} className="bg-[#18181c] border border-[#222226] p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={art.artistPhoto || "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=100"}
                                  alt={art.artistName}
                                  className="w-11 h-11 rounded-xl object-cover border border-[#2c2c32]"
                                />
                                <div>
                                  <h5 className="font-bold text-sm flex items-center gap-1.5">
                                    {art.artistName}
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${art.status === "active" ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-500"}`}>
                                      {art.status}
                                    </span>
                                  </h5>
                                  <p className="text-xs text-gray-500 mt-0.5 font-mono">Affiliation: {new Date(art.joinedAt).toLocaleDateString()}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 flex-wrap">
                                <div className="text-right">
                                  <span className="text-[10px] text-gray-500 block font-medium uppercase">Revenue Splits</span>
                                  <span className="text-xs text-cyan-400 font-bold">{art.splits?.artist || 70}% / {art.splits?.agency || 20}%</span>
                                </div>
                                <button
                                  onClick={() => agencyService.removeArtist(art.id)}
                                  className="text-gray-500 hover:text-red-500 p-2 hover:bg-[#2c1a1e] rounded-xl transition"
                                  title="Release Artist"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>

                </div>
              )}

              {/* REVENUE SPLITS TAB */}
              {activeTab === "revenue" && (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* SPLITS SIMULATOR & TREASURY CASH-OUT */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* SIMULATOR */}
                    <div className="bg-[#121214] border border-[#1b1b1f] p-6 rounded-3xl space-y-4 shadow-xl">
                      <h4 className="font-bold text-base flex items-center gap-2 border-b border-[#1b1b1f] pb-3">
                        <Sparkles className="text-pink-500 w-4.5 h-4.5 animate-pulse" />
                        Split Revenue Ledger Simulator
                      </h4>
                      <p className="text-xs text-gray-400 leading-normal">
                        Simulate the automated distribution splits of streaming revenue. Input an amount, pick a registered artist, and trigger splits to instantly record financial entries.
                      </p>
                      <form onSubmit={handleSimulateRevenue} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs text-gray-400 font-mono">Gross Revenue Amount ($) *</label>
                            <input
                              type="number"
                              required
                              value={simAmount}
                              onChange={(e) => setSimAmount(Number(e.target.value))}
                              className="w-full bg-[#18181c] border border-[#26262b] rounded-xl py-2 px-3 focus:outline-none focus:border-pink-500 text-sm font-bold"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs text-gray-400 font-mono">Revenue Category *</label>
                            <select
                              value={simCategory}
                              onChange={(e) => setSimCategory(e.target.value as any)}
                              className="w-full bg-[#18181c] border border-[#26262b] rounded-xl py-2 px-3 focus:outline-none focus:border-pink-500 text-sm cursor-pointer"
                            >
                              <option value="music">Music Revenue</option>
                              <option value="video">Video Revenue</option>
                              <option value="live">Live Stream Revenue</option>
                              <option value="gift">Virtual Gifts Split</option>
                              <option value="marketplace">Marketplace Split</option>
                              <option value="subscription">Subscription Revenue</option>
                              <option value="advertising">Advertising Revenue</option>
                              <option value="creator">Creator Revenue</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs text-gray-400 font-mono">Distribute to Managed Artist *</label>
                          <select
                            required
                            value={simArtistId}
                            onChange={(e) => setSimArtistId(e.target.value)}
                            className="w-full bg-[#18181c] border border-[#26262b] rounded-xl py-2 px-3 focus:outline-none focus:border-pink-500 text-sm cursor-pointer"
                          >
                            <option value="">-- Choose Artist --</option>
                            {artists.filter(a => a.status === "active").map((art) => (
                              <option key={art.artistId} value={art.artistId}>
                                {art.artistName}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs text-gray-400 font-mono">Transaction Description</label>
                          <input
                            type="text"
                            value={simDesc}
                            onChange={(e) => setSimDesc(e.target.value)}
                            className="w-full bg-[#18181c] border border-[#26262b] rounded-xl py-2 px-3 focus:outline-none focus:border-pink-500 text-xs"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold text-sm py-2.5 rounded-xl transition shadow-lg flex items-center justify-center gap-1.5"
                        >
                          <Percent className="w-4 h-4" />
                          Execute Splits & Update Ledgers
                        </button>
                      </form>
                    </div>

                    {/* TREASURY CASH-OUT */}
                    <div className="bg-[#121214] border border-[#1b1b1f] p-6 rounded-3xl space-y-4 shadow-xl">
                      <h4 className="font-bold text-base flex items-center gap-2 border-b border-[#1b1b1f] pb-3">
                        <CreditCard className="text-cyan-400 w-4.5 h-4.5" />
                        Treasury Cash-out Portal
                      </h4>
                      <div className="bg-[#18181c] border border-[#222226] p-4 rounded-2xl flex items-center justify-between">
                        <div>
                          <span className="text-xs text-gray-400 font-mono block uppercase">Withdrawable Treasury Balance</span>
                          <span className="text-2xl font-black text-green-400 mt-1 inline-block">${selectedAgency.withdrawableBalance.toFixed(2)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-gray-500 font-medium block">Total revenue split ledgered:</span>
                          <span className="text-sm font-bold text-white mt-0.5 inline-block">${revenues.reduce((acc, r) => acc + r.amount, 0).toFixed(2)}</span>
                        </div>
                      </div>

                      <form onSubmit={handleCashout} className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                          <label className="text-xs text-gray-400 font-mono">Withdrawal Amount ($) *</label>
                          <input
                            type="number"
                            required
                            value={cashoutAmount}
                            onChange={(e) => setCashoutAmount(Number(e.target.value))}
                            className="w-full bg-[#18181c] border border-[#26262b] rounded-xl py-2 px-3 focus:outline-none focus:border-pink-500 text-sm font-bold"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs text-gray-400 font-mono">Payment Provider *</label>
                            <select
                              value={cashoutMethod}
                              onChange={(e) => setCashoutMethod(e.target.value)}
                              className="w-full bg-[#18181c] border border-[#26262b] rounded-xl py-2 px-3 focus:outline-none focus:border-pink-500 text-sm cursor-pointer"
                            >
                              <option value="PayPal">PayPal</option>
                              <option value="Stripe">Stripe Connect</option>
                              <option value="Wire">Direct Wire Transfer</option>
                              <option value="Coinbase">Crypto Coinbase</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs text-gray-400 font-mono">Payment Details *</label>
                            <input
                              type="text"
                              required
                              value={cashoutDetails}
                              onChange={(e) => setCashoutDetails(e.target.value)}
                              className="w-full bg-[#18181c] border border-[#26262b] rounded-xl py-2 px-3 focus:outline-none focus:border-pink-500 text-sm"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-cyan-500 hover:bg-cyan-600 text-[#0c0c0e] font-extrabold text-sm py-2.5 rounded-xl transition shadow-lg"
                        >
                          Submit Withdrawal Request
                        </button>
                      </form>
                    </div>

                  </div>

                  {/* FINANCIAL SPLIT LEDGER TABLE */}
                  <div className="bg-[#121214] border border-[#1b1b1f] p-6 rounded-3xl space-y-4 shadow-xl">
                    <h4 className="font-bold text-base flex items-center gap-2 border-b border-[#1b1b1f] pb-3">
                      <DollarSign className="text-green-500 w-4.5 h-4.5" />
                      Splits Revenue Ledger List
                    </h4>
                    {revenues.length === 0 ? (
                      <div className="text-center py-10 text-gray-500 text-xs font-mono">No financial transactions recorded. Use the split simulator above to record entry.</div>
                    ) : (
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-[#222226] text-gray-500 uppercase tracking-wider">
                              <th className="py-3 px-4 font-bold">Category</th>
                              <th className="py-3 px-4 font-bold">Gross Amount</th>
                              <th className="py-3 px-4 font-bold">Artist Share</th>
                              <th className="py-3 px-4 font-bold">Agency Treasury</th>
                              <th className="py-3 px-4 font-bold">Description</th>
                              <th className="py-3 px-4 font-bold">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {revenues.map((rev) => (
                              <tr key={rev.id} className="border-b border-[#1b1b1f] hover:bg-[#18181c]/50 transition duration-150">
                                <td className="py-3 px-4 font-bold text-pink-500 uppercase">{rev.category}</td>
                                <td className="py-3 px-4 font-black">${rev.amount.toFixed(2)}</td>
                                <td className="py-3 px-4 text-cyan-400 font-bold">${rev.splitAmounts?.artist?.toFixed(2) || "0.00"} ({rev.splits?.artist || 70}%)</td>
                                <td className="py-3 px-4 text-green-400 font-bold">${rev.splitAmounts?.agency?.toFixed(2) || "0.00"} ({rev.splits?.agency || 20}%)</td>
                                <td className="py-3 px-4 text-gray-400 italic">{rev.description}</td>
                                <td className="py-3 px-4 text-gray-500 font-mono">{new Date(rev.createdAt).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* TEAM MANAGEMENT TAB */}
              {activeTab === "team" && (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* ADD MEMBER FORM & STAFF GRID */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* INVITE STAFF FORM */}
                    <div className="md:col-span-1 bg-[#121214] border border-[#1b1b1f] p-6 rounded-3xl space-y-4 shadow-xl">
                      <h4 className="font-bold text-base flex items-center gap-2 border-b border-[#1b1b1f] pb-3">
                        <UserPlus className="text-pink-500 w-4.5 h-4.5" />
                        Invite Label/Agency Staff
                      </h4>
                      <form onSubmit={handleInviteStaff} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs text-gray-400 font-mono">User/Staff Email Address *</label>
                          <input
                            type="email"
                            required
                            placeholder="staff_member@gmail.com"
                            value={inviteStaffEmail}
                            onChange={(e) => setInviteStaffEmail(e.target.value)}
                            className="w-full bg-[#18181c] border border-[#26262b] rounded-xl py-2 px-3 focus:outline-none focus:border-pink-500 text-sm"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs text-gray-400 font-mono">Select Staff Role *</label>
                          <select
                            value={inviteStaffRole}
                            onChange={(e) => setInviteStaffRole(e.target.value as any)}
                            className="w-full bg-[#18181c] border border-[#26262b] rounded-xl py-2 px-3 focus:outline-none focus:border-pink-500 text-sm cursor-pointer"
                          >
                            <option value="manager">Manager</option>
                            <option value="editor">Editor</option>
                            <option value="moderator">Moderator</option>
                            <option value="accountant">Accountant</option>
                            <option value="marketing_staff">Marketing Staff</option>
                            <option value="support_staff">Support Staff</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs text-gray-400 font-mono block mb-1">Custom Permissions</label>
                          {[
                            { id: "manage_artists", label: "Manage Artists" },
                            { id: "view_analytics", label: "View Analytics" },
                            { id: "manage_releases", label: "Manage Releases" },
                            { id: "manage_contracts", label: "Manage Contracts" },
                            { id: "manage_finances", label: "Manage Finances" },
                            { id: "manage_team", label: "Manage Team" },
                          ].map((perm) => (
                            <label key={perm.id} className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={inviteStaffPermissions.includes(perm.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setInviteStaffPermissions([...inviteStaffPermissions, perm.id]);
                                  } else {
                                    setInviteStaffPermissions(inviteStaffPermissions.filter(p => p !== perm.id));
                                  }
                                }}
                                className="rounded border-gray-700 bg-[#18181c] text-pink-500 focus:ring-pink-500"
                              />
                              {perm.label}
                            </label>
                          ))}
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold text-sm py-2.5 rounded-xl transition shadow-lg"
                        >
                          Send Invitation
                        </button>
                      </form>
                    </div>

                    {/* CURRENT STAFF LIST */}
                    <div className="md:col-span-2 bg-[#121214] border border-[#1b1b1f] p-6 rounded-3xl space-y-4 shadow-xl">
                      <h4 className="font-bold text-base flex items-center gap-2 border-b border-[#1b1b1f] pb-3">
                        <Shield className="text-cyan-400 w-4.5 h-4.5" />
                        Label Personnel & Team Roster ({members.length})
                      </h4>
                      <div className="space-y-3">
                        {members.map((member) => (
                          <div key={member.id} className="bg-[#18181c] border border-[#222226] p-4 rounded-2xl flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold font-mono">
                                {member.role.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h5 className="font-bold text-sm flex items-center gap-2">
                                  {member.email || "Primary Owner"}
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${member.role === "owner" ? "bg-pink-500/10 text-pink-400" : "bg-cyan-500/10 text-cyan-400"}`}>
                                    {getRoleLabel(member.role)}
                                  </span>
                                </h5>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {member.permissions?.map((perm) => (
                                    <span key={perm} className="text-[9px] bg-[#222226] text-gray-400 px-1.5 py-0.5 rounded">
                                      {perm.replace("_", " ")}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {member.role !== "owner" && (
                              <button
                                onClick={() => agencyService.removeTeamMember(member.id)}
                                className="text-gray-500 hover:text-red-500 p-2 hover:bg-[#2c1a1e] rounded-xl transition"
                                title="Revoke access"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* DIGITAL CONTRACTS TAB */}
              {activeTab === "contracts" && (
                <div className="space-y-6 animate-fadeIn">
                  
                  <div className="bg-[#121214] border border-[#1b1b1f] p-6 rounded-3xl space-y-4 shadow-xl">
                    <h4 className="font-bold text-base flex items-center gap-2 border-b border-[#1b1b1f] pb-3">
                      <FileText className="text-pink-500 w-4.5 h-4.5" />
                      Digital representation & stream splits contracts
                    </h4>
                    {contracts.length === 0 ? (
                      <div className="text-center py-20 text-gray-500 font-mono text-sm">
                        <FileText className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                        <p className="font-bold">No representation contracts created yet.</p>
                        <p className="text-xs text-gray-500">Invite system artists to spawn split contract agreements automatically.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {contracts.map((contract) => (
                          <div key={contract.id} className="bg-[#18181c] border border-[#222226] p-5 rounded-2xl space-y-4">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div>
                                <h5 className="font-bold text-sm">Artist Representation Agreement: {contract.artistName}</h5>
                                <span className="text-xs text-gray-500 font-mono block mt-0.5">Contract ID: {contract.id}</span>
                              </div>
                              <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${contract.status === "signed" ? "bg-green-500/10 text-green-400" : contract.status === "pending" ? "bg-yellow-500/10 text-yellow-500" : "bg-red-500/10 text-red-500"}`}>
                                {contract.status}
                              </span>
                            </div>

                            <div className="bg-[#121214] border border-[#1f1f23] p-4 rounded-xl text-xs font-mono text-gray-400 leading-normal whitespace-pre-wrap">
                              {contract.terms}
                            </div>

                            {/* AUDIT LOG EVENTS */}
                            <div className="space-y-2">
                              <span className="text-[10px] text-gray-500 font-mono block uppercase">Contract History Audit Trail</span>
                              <div className="space-y-1.5">
                                {contract.history?.map((evt, idx) => (
                                  <div key={idx} className="flex gap-2 items-start text-xs">
                                    <Clock className="w-3.5 h-3.5 text-pink-500 mt-0.5" />
                                    <div>
                                      <span className="font-bold text-white capitalize">{evt.action}</span> - <span className="text-gray-400">{evt.notes}</span>
                                      <span className="text-[10px] text-gray-500 font-mono block">{new Date(evt.timestamp).toLocaleString()}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* GET VERIFIED BADGE TAB */}
              {activeTab === "verification" && (
                <div className="space-y-6 animate-fadeIn">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* SUBMIT REQUEST */}
                    <div className="bg-[#121214] border border-[#1b1b1f] p-6 rounded-3xl space-y-4 shadow-xl">
                      <h4 className="font-bold text-base flex items-center gap-2 border-b border-[#1b1b1f] pb-3">
                        <Award className="text-pink-500 w-4.5 h-4.5 animate-bounce" />
                        Apply for Official Label Verification
                      </h4>
                      <p className="text-xs text-gray-400 leading-normal">
                        Submit legal licensing proof or business registry papers to acquire the **Official Partner Badge**. Verified entities gain search indexing boost and bypass standard withdrawal hold times.
                      </p>

                      <form onSubmit={handleRequestVerification} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs text-gray-400 font-mono">Verification Target Badge *</label>
                          <select
                            value={verifyType}
                            onChange={(e) => setVerifyType(e.target.value as any)}
                            className="w-full bg-[#18181c] border border-[#26262b] rounded-xl py-2 px-3 focus:outline-none focus:border-pink-500 text-sm cursor-pointer"
                          >
                            <option value="agency">Agency Verification badge</option>
                            <option value="label">Official Record Label badge</option>
                            <option value="partner_badge">Premier Platform Partner badge</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs text-gray-400 font-mono">Registry PDF / Licensing proof URL *</label>
                          <input
                            type="text"
                            required
                            value={verifyDocs}
                            onChange={(e) => setVerifyDocs(e.target.value)}
                            className="w-full bg-[#18181c] border border-[#26262b] rounded-xl py-2 px-3 focus:outline-none focus:border-pink-500 text-xs"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold text-sm py-2.5 rounded-xl transition shadow-lg"
                        >
                          Submit Verification Package
                        </button>
                      </form>
                    </div>

                    {/* SUBMISSION HISTORY */}
                    <div className="bg-[#121214] border border-[#1b1b1f] p-6 rounded-3xl space-y-4 shadow-xl">
                      <h4 className="font-bold text-base flex items-center gap-2 border-b border-[#1b1b1f] pb-3">
                        <Clock className="text-cyan-400 w-4.5 h-4.5" />
                        Verification Status History
                      </h4>
                      {verifications.length === 0 ? (
                        <div className="text-center py-10 text-gray-500 text-xs font-mono">No verification filings recorded. Submit request form to launch review.</div>
                      ) : (
                        <div className="space-y-3">
                          {verifications.map((ver) => (
                            <div key={ver.id} className="bg-[#18181c] border border-[#222226] p-4 rounded-2xl space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">{getTypeLabel(ver.type)} Application</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${ver.status === "approved" ? "bg-green-500/10 text-green-400" : ver.status === "pending" ? "bg-yellow-500/10 text-yellow-500 animate-pulse" : "bg-red-500/10 text-red-500"}`}>
                                  {ver.status}
                                </span>
                              </div>
                              <p className="text-xs text-gray-400 font-mono break-all">File: {ver.documents[0]}</p>
                              <p className="text-[11px] text-gray-500 font-mono">Filed: {new Date(ver.submittedAt).toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>

                </div>
              )}

              {/* LABEL ANALYTICS TAB */}
              {activeTab === "analytics" && (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* RECHARTS PIE CHARTS FOR AUDIENCE DEMOGRAPHICS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* COUNTRY DEMOGRAPHICS */}
                    <div className="bg-[#121214] border border-[#1b1b1f] p-6 rounded-3xl space-y-4 shadow-xl">
                      <h4 className="font-bold text-base flex items-center gap-2">
                        <Globe className="text-pink-500 w-4.5 h-4.5" />
                        Audience Traffic by Country (%)
                      </h4>
                      <div className="h-56 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={audienceCountries}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {audienceCountries.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={ANALYTICS_COLORS[index % ANALYTICS_COLORS.length]} />
                              ))}
                            </Pie>
                            <ChartTooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* AGE DEMOGRAPHICS */}
                    <div className="bg-[#121214] border border-[#1b1b1f] p-6 rounded-3xl space-y-4 shadow-xl">
                      <h4 className="font-bold text-base flex items-center gap-2">
                        <Users className="text-cyan-400 w-4.5 h-4.5" />
                        Age Group Demographics (%)
                      </h4>
                      <div className="h-56 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={audienceAges}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {audienceAges.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={ANALYTICS_COLORS[index % ANALYTICS_COLORS.length]} />
                              ))}
                            </Pie>
                            <ChartTooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                  </div>

                </div>
              )}

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
