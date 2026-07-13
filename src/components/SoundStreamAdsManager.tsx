import React, { useState, useEffect } from "react";
import {
  Megaphone,
  TrendingUp,
  Coins,
  Target,
  CreditCard,
  Plus,
  FileText,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  DollarSign,
  Eye,
  MousePointerClick,
  ArrowUpRight,
  BarChart2,
  Settings,
  RefreshCw,
  Play,
  Pause,
  Copy,
  Shield,
  Sliders,
  LayoutGrid,
  AlertCircle,
  Calendar,
  MapPin,
  Users as UsersIcon,
  Music,
  Monitor,
  CheckCircle2,
  XCircle,
  MessageSquare,
  HelpCircle,
  Info,
  Bell,
  Download,
  ExternalLink,
  Lock,
  Building,
  Sparkles
} from "lucide-react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  getDoc,
  Timestamp
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { User, AdCampaign, AdCreative, AdPayment, AdBilling, AdReport, AdNotification, AdReview, AdTargeting } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";

// Lists for Targeting configuration selection
const COUNTRIES = ["United States", "Nigeria", "United Kingdom", "Canada", "Germany", "South Africa", "Kenya", "Ghana", "France", "Japan"];
const CITIES = ["Lagos", "New York", "London", "Toronto", "Berlin", "Johannesburg", "Nairobi", "Accra", "Paris", "Tokyo"];
const LANGUAGES = ["English", "Yoruba", "Igbo", "Hausa", "Spanish", "French", "German", "Japanese"];
const AGE_GROUPS = ["13-17", "18-24", "25-34", "35-44", "45-54", "55+"];
const GENDERS = ["All Genders", "Male", "Female", "Non-binary"];
const DEVICES = ["All Devices", "Mobile", "Desktop", "Tablet", "Smart TV", "Wearables"];
const OPERATING_SYSTEMS = ["All OS", "iOS", "Android", "macOS", "Windows", "Linux"];
const MUSIC_GENRES = ["Afrobeats", "Amapiano", "Gospel", "Hip Hop", "Fuji", "Highlife", "Afro-Fusion", "Pop", "R&B", "Jazz"];
const INTERESTS = ["Live Concerts", "Music Production", "Vinyl Collecting", "Gaming", "Fashion", "Tech & Gadgets", "Fitness", "Crypto/Finance"];

interface SoundStreamAdsManagerProps {
  userId: string;
  userEmail: string;
  isAdmin: boolean;
  onSelectSong?: (song: any) => void;
  setCurrentTab?: (tab: string) => void;
}

export default function SoundStreamAdsManager({
  userId,
  userEmail,
  isAdmin,
  onSelectSong,
  setCurrentTab
}: SoundStreamAdsManagerProps) {
  // Navigation tabs inside Ads Manager: "dashboard", "campaigns", "billing", "notifications", "admin"
  const [activeTab, setActiveTab] = useState<"dashboard" | "campaigns" | "billing" | "notifications" | "admin">("dashboard");

  // State
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [billing, setBilling] = useState<AdBilling | null>(null);
  const [payments, setPayments] = useState<AdPayment[]>([]);
  const [notifications, setNotifications] = useState<AdNotification[]>([]);
  const [reports, setReports] = useState<Record<string, AdReport[]>>({}); // campaignId -> reports
  const [loading, setLoading] = useState(true);

  // Modals / Wizard
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<AdCampaign | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<any | null>(null);

  // Admin states
  const [adminCampaigns, setAdminCampaigns] = useState<AdCampaign[]>([]);
  const [adminReviews, setAdminReviews] = useState<AdReview[]>([]);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewModalOpen, setReviewModalOpen] = useState<AdCampaign | null>(null);

  // Billing card entry state (Simulated Stripe)
  const [stripeAmount, setStripeAmount] = useState("50");
  const [cardNumber, setCardNumber] = useState("4242 •••• •••• 4242");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvc, setCardCvc] = useState("123");
  const [cardName, setCardName] = useState("SoundStream Advertiser");
  const [depositing, setDepositing] = useState(false);

  // Wizard state for creating/editing campaign
  const [wizardStep, setWizardStep] = useState(1);
  const [formData, setFormData] = useState<{
    name: string;
    objective: AdCampaign["objective"];
    dailyBudget: number;
    lifetimeBudget: number;
    startDate: string;
    endDate: string;
    countries: string[];
    cities: string[];
    languages: string[];
    ageGroups: string[];
    genders: string[];
    genres: string[];
    interests: string[];
    creatorFollowers: string[];
    devices: string[];
    os: string[];
    format: AdCreative["format"];
    title: string;
    description: string;
    mediaUrl: string;
    destinationUrl: string;
    carouselAssets: string[];
  }>({
    name: "",
    objective: "promote_song",
    dailyBudget: 15,
    lifetimeBudget: 150,
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    countries: ["Nigeria"],
    cities: ["Lagos"],
    languages: ["English"],
    ageGroups: ["18-24", "25-34"],
    genders: ["All Genders"],
    genres: ["Afrobeats", "Amapiano"],
    interests: ["Live Concerts"],
    creatorFollowers: [],
    devices: ["All Devices"],
    os: ["All OS"],
    format: "banner",
    title: "",
    description: "",
    mediaUrl: "",
    destinationUrl: "",
    carouselAssets: ["", ""]
  });

  // 1. Fetch data with Real-time listeners
  useEffect(() => {
    if (!userId || userId === "guest" || userId === "") return;

    // Load or create billing balance
    const billingRef = doc(db, "ads_billing", userId);
    const unsubBilling = onSnapshot(billingRef, async (snap) => {
      if (snap.exists()) {
        setBilling(snap.data() as AdBilling);
      } else {
        const initialBilling: AdBilling = {
          id: userId,
          advertiserId: userId,
          balance: 200, // Welcome free credits to kickstart!
          paymentMethod: {
            brand: "Visa",
            last4: "4242",
            expMonth: 12,
            expYear: 2028
          }
        };
        await setDoc(billingRef, initialBilling);
        setBilling(initialBilling);
      }
    });

    // Load campaigns
    const campaignsQuery = query(collection(db, "ads_campaigns"), where("advertiserId", "==", userId));
    const unsubCampaigns = onSnapshot(campaignsQuery, (snap) => {
      const items: AdCampaign[] = [];
      snap.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as AdCampaign);
      });
      setCampaigns(items);
      setLoading(false);
    });

    // Load payment history
    const paymentsQuery = query(collection(db, "ads_payments"), where("advertiserId", "==", userId));
    const unsubPayments = onSnapshot(paymentsQuery, (snap) => {
      const items: AdPayment[] = [];
      snap.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as AdPayment);
      });
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setPayments(items);
    });

    // Load notifications
    const notificationsQuery = query(collection(db, "ads_notifications"), where("advertiserId", "==", userId));
    const unsubNotifications = onSnapshot(notificationsQuery, (snap) => {
      const items: AdNotification[] = [];
      snap.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as AdNotification);
      });
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setNotifications(items);
    });

    // Load report analytics logs
    const unsubReports = onSnapshot(collection(db, "ads_reports"), (snap) => {
      const grouped: Record<string, AdReport[]> = {};
      snap.forEach((d) => {
        const rep = { id: d.id, ...d.data() } as AdReport;
        if (!grouped[rep.campaignId]) grouped[rep.campaignId] = [];
        grouped[rep.campaignId].push(rep);
      });
      setReports(grouped);
    });

    // Load Admin Campaigns (if admin)
    let unsubAdminCampaigns = () => {};
    if (isAdmin) {
      unsubAdminCampaigns = onSnapshot(collection(db, "ads_campaigns"), (snap) => {
        const items: AdCampaign[] = [];
        snap.forEach((d) => {
          items.push({ id: d.id, ...d.data() } as AdCampaign);
        });
        items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setAdminCampaigns(items);
      });
    }

    return () => {
      unsubBilling();
      unsubCampaigns();
      unsubPayments();
      unsubNotifications();
      unsubReports();
      unsubAdminCampaigns();
    };
  }, [userId, isAdmin]);

  // Create notifications helper
  const addNotification = async (type: AdNotification["type"], title: string, message: string, targetUserId: string = userId) => {
    try {
      await addDoc(collection(db, "ads_notifications"), {
        advertiserId: targetUserId,
        type,
        title,
        message,
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      console.error("Error creating notification:", e);
    }
  };

  // 2. Stripe Payment Deposit Flow
  const handleStripeDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(stripeAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid positive dollar amount.");
      return;
    }

    setDepositing(true);
    // Simulate real server side authorization delay
    setTimeout(async () => {
      try {
        const paymentId = "pm_" + Math.random().toString(36).substring(2, 11);
        const newPayment: AdPayment = {
          id: paymentId,
          advertiserId: userId,
          amount: amountNum,
          currency: "USD",
          status: "succeeded",
          stripePaymentIntentId: "pi_" + Math.random().toString(36).substring(2, 11),
          createdAt: new Date().toISOString(),
          method: "Card",
          cardLast4: cardNumber.substring(cardNumber.length - 4) || "4242"
        };

        // Add payment ledger entry
        await setDoc(doc(db, "ads_payments", paymentId), newPayment);

        // Update Advertiser billing balance in Firestore
        const currentBalance = billing?.balance || 0;
        await updateDoc(doc(db, "ads_billing", userId), {
          balance: currentBalance + amountNum,
          paymentMethod: {
            brand: "Visa",
            last4: newPayment.cardLast4,
            expMonth: 12,
            expYear: 2028
          }
        });

        // Trigger notification
        await addNotification(
          "payment_success",
          "Funds Added Successfully",
          `$${amountNum.toFixed(2)} USD has been successfully added to your Ads wallet via secure Stripe payment.`
        );

        setDepositing(false);
        setIsDepositOpen(false);
        setStripeAmount("50");
      } catch (err) {
        console.error("Deposit error:", err);
        setDepositing(false);
      }
    }, 1500);
  };

  // 3. Campaign management actions
  const toggleCampaignStatus = async (campaign: AdCampaign) => {
    const nextStatus = campaign.status === "active" ? "paused" : "active";
    try {
      await updateDoc(doc(db, "ads_campaigns", campaign.id), {
        status: nextStatus
      });
      await addNotification(
        nextStatus === "active" ? "campaign_started" : "campaign_ended",
        `Campaign ${nextStatus === "active" ? "Resumed" : "Paused"}`,
        `Your campaign "${campaign.name}" status was updated to ${nextStatus.toUpperCase()}.`
      );
    } catch (e) {
      console.error(e);
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    if (confirm("Are you sure you want to delete this campaign? This action is irreversible.")) {
      try {
        await deleteDoc(doc(db, "ads_campaigns", campaignId));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const duplicateCampaign = async (campaign: AdCampaign) => {
    try {
      const duplicatedId = "cmp_" + Math.random().toString(36).substring(2, 11);
      const duplicated: AdCampaign = {
        ...campaign,
        id: duplicatedId,
        name: `${campaign.name} (Copy)`,
        status: "pending", // Reset duplicate to review queue
        spent: 0,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, "ads_campaigns", duplicatedId), duplicated);

      // Seed mock stats immediately for presentation
      await generateMockStats(duplicatedId);

      alert("Campaign successfully duplicated and submitted for review!");
    } catch (e) {
      console.error(e);
    }
  };

  // Helper to generate elegant realistic metrics for analytics presentation
  const generateMockStats = async (campaignId: string) => {
    const days = 7;
    for (let i = 0; i < days; i++) {
      const dateStr = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const impressions = Math.floor(Math.random() * 8000) + 4000;
      const clicks = Math.floor(impressions * (Math.random() * 0.04 + 0.015));
      const conversions = Math.floor(clicks * (Math.random() * 0.15 + 0.05));
      const cost = clicks * (Math.random() * 0.4 + 0.1);

      const reportId = `${campaignId}_${dateStr}`;
      const report: AdReport = {
        id: reportId,
        campaignId,
        impressions,
        reach: Math.floor(impressions * 0.85),
        clicks,
        ctr: parseFloat(((clicks / impressions) * 100).toFixed(2)),
        conversions,
        downloads: Math.floor(conversions * 0.6),
        followersGained: Math.floor(conversions * 0.4),
        videoViews: Math.floor(impressions * 0.3),
        songPlays: Math.floor(conversions * 0.8),
        livestreamViews: Math.floor(impressions * 0.1),
        cost: parseFloat(cost.toFixed(2)),
        cpc: parseFloat((cost / clicks).toFixed(2)),
        cpm: parseFloat(((cost / impressions) * 1000).toFixed(2)),
        cpa: parseFloat((cost / conversions).toFixed(2)),
        date: dateStr
      };

      await setDoc(doc(db, "ads_reports", reportId), report);
    }
  };

  // 4. Campaign Wizard Submit
  const handleWizardSubmit = async () => {
    // Basic verification
    if (!formData.name.trim()) {
      alert("Please provide a name for the campaign.");
      return;
    }
    if (!formData.title.trim()) {
      alert("Please specify the ad creative title.");
      return;
    }

    const campaignId = selectedCampaign?.id || "cmp_" + Math.random().toString(36).substring(2, 11);

    // Prepare structure
    const campaignData: AdCampaign = {
      id: campaignId,
      advertiserId: userId,
      name: formData.name,
      objective: formData.objective,
      status: "pending", // Sent for review
      budget: formData.lifetimeBudget,
      dailyBudget: formData.dailyBudget,
      lifetimeBudget: formData.lifetimeBudget,
      spent: selectedCampaign ? selectedCampaign.spent : 0,
      startDate: formData.startDate,
      endDate: formData.endDate,
      targeting: {
        countries: formData.countries,
        cities: formData.cities,
        languages: formData.languages,
        ageGroups: formData.ageGroups,
        genders: formData.genders,
        genres: formData.genres,
        interests: formData.interests,
        creatorFollowers: formData.creatorFollowers,
        devices: formData.devices,
        os: formData.os
      },
      creative: {
        id: "crt_" + Math.random().toString(36).substring(2, 11),
        campaignId,
        format: formData.format,
        title: formData.title,
        description: formData.description,
        mediaUrl: formData.mediaUrl || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&q=80",
        destinationUrl: formData.destinationUrl,
        assets: formData.format === "carousel" ? formData.carouselAssets.filter(Boolean) : []
      },
      createdAt: selectedCampaign ? selectedCampaign.createdAt : new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "ads_campaigns", campaignId), campaignData);

      if (!selectedCampaign) {
        // Seed some mock demo analytics for instant beautiful charts on submission!
        await generateMockStats(campaignId);
      }

      await addNotification(
        "ad_approved",
        selectedCampaign ? "Campaign Updated" : "Campaign Created & Pending Review",
        `Your campaign "${formData.name}" has been submitted for visual and legal copyright check. It will start running as soon as our moderators approve it.`
      );

      // Reset
      setIsWizardOpen(false);
      setSelectedCampaign(null);
      setWizardStep(1);
    } catch (e) {
      console.error("Error creating campaign:", e);
    }
  };

  // Load selected campaign into edit form
  const handleEditCampaign = (campaign: AdCampaign) => {
    setSelectedCampaign(campaign);
    setFormData({
      name: campaign.name,
      objective: campaign.objective,
      dailyBudget: campaign.dailyBudget,
      lifetimeBudget: campaign.lifetimeBudget,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      countries: campaign.targeting.countries || [],
      cities: campaign.targeting.cities || [],
      languages: campaign.targeting.languages || [],
      ageGroups: campaign.targeting.ageGroups || [],
      genders: campaign.targeting.genders || [],
      genres: campaign.targeting.genres || [],
      interests: campaign.targeting.interests || [],
      creatorFollowers: campaign.targeting.creatorFollowers || [],
      devices: campaign.targeting.devices || [],
      os: campaign.targeting.os || [],
      format: campaign.creative.format,
      title: campaign.creative.title,
      description: campaign.creative.description,
      mediaUrl: campaign.creative.mediaUrl,
      destinationUrl: campaign.creative.destinationUrl,
      carouselAssets: campaign.creative.assets && campaign.creative.assets.length > 0
        ? [...campaign.creative.assets, "", ""].slice(0, 3)
        : ["", "", ""]
    });
    setWizardStep(1);
    setIsWizardOpen(true);
  };

  const handleOpenNewWizard = () => {
    setSelectedCampaign(null);
    setFormData({
      name: "SoundStream Summer Hit Promo",
      objective: "promote_song",
      dailyBudget: 25,
      lifetimeBudget: 250,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      countries: ["Nigeria", "United Kingdom"],
      cities: ["Lagos", "London"],
      languages: ["English"],
      ageGroups: ["18-24", "25-34"],
      genders: ["All Genders"],
      genres: ["Afrobeats", "Amapiano"],
      interests: ["Live Concerts", "Fashion"],
      creatorFollowers: [],
      devices: ["All Devices"],
      os: ["All OS"],
      format: "feed",
      title: "Stream My New Single 'Antigravity Flow'!",
      description: "Lossless immersive audio only on SoundStream. Catch the vibe now!",
      mediaUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80",
      destinationUrl: "https://soundstream.io/track/antigravity",
      carouselAssets: ["", "", ""]
    });
    setWizardStep(1);
    setIsWizardOpen(true);
  };

  // 5. Admin Actions
  const handleReviewDecision = async (campaign: AdCampaign, decision: "approved" | "rejected" | "changes_requested") => {
    try {
      const statusMap = {
        approved: "active",
        rejected: "rejected",
        changes_requested: "pending"
      };

      const updatePayload: any = {
        status: statusMap[decision]
      };

      if (decision === "changes_requested") {
        updatePayload.changeRequests = reviewNotes;
      }

      await updateDoc(doc(db, "ads_campaigns", campaign.id), updatePayload);

      // Create a Review Log
      const reviewId = "rev_" + Math.random().toString(36).substring(2, 11);
      const newReview: AdReview = {
        id: reviewId,
        campaignId: campaign.id,
        status: decision,
        reviewerId: userId,
        notes: reviewNotes,
        reviewedAt: new Date().toISOString()
      };
      await setDoc(doc(db, "ads_reviews", reviewId), newReview);

      // Notify Advertiser
      let notifType: AdNotification["type"] = "ad_approved";
      let title = "Ad Approved";
      let msg = `Your campaign "${campaign.name}" has been approved and is now live!`;

      if (decision === "rejected") {
        notifType = "ad_rejected";
        title = "Campaign Rejected";
        msg = `Your campaign "${campaign.name}" was rejected. Review notes: ${reviewNotes}`;
      } else if (decision === "changes_requested") {
        notifType = "ad_rejected";
        title = "Changes Requested";
        msg = `Revision requested for campaign "${campaign.name}". Notes: ${reviewNotes}`;
      }

      await addNotification(notifType, title, msg, campaign.advertiserId);

      setReviewModalOpen(null);
      setReviewNotes("");
      alert(`Campaign review processed as: ${decision.toUpperCase()}`);
    } catch (e) {
      console.error(e);
    }
  };

  // Helper arrays for formatting label names
  const OBJECTIVE_LABELS: Record<string, string> = {
    promote_song: "Promote Songs",
    promote_album: "Promote Albums",
    promote_video: "Promote Videos",
    promote_live: "Promote Livestreams",
    promote_creator: "Promote Creator Profiles",
    promote_marketplace: "Promote Marketplace Products",
    promote_event: "Promote Events",
    promote_business: "Promote Businesses",
    promote_app: "Promote Mobile Apps",
    promote_website: "Promote Websites"
  };

  const FORMAT_LABELS: Record<string, string> = {
    banner: "Banner Ad",
    native: "Native Ad",
    feed: "Feed Ad",
    song: "Sponsored Song",
    video: "Sponsored Video",
    live: "Sponsored Livestream",
    carousel: "Carousel Slider",
    fullscreen: "Fullscreen Interstitial",
    search: "Search Recommendation",
    marketplace: "Marketplace Listing"
  };

  // Group stats calculations for active advertiser
  const activeCampaigns = campaigns.filter((c) => c.status === "active");
  const advertiserTotalSpent = campaigns.reduce((acc, c) => acc + c.spent, 0);

  // Sum up metrics over all campaigns
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalConversions = 0;
  let totalPlays = 0;
  let totalVideoViews = 0;
  let totalGiftsReceived = 0; // Simulated affiliate revenue

  (Object.values(reports) as AdReport[][]).forEach((reps) => {
    reps.forEach((r) => {
      totalImpressions += r.impressions || 0;
      totalClicks += r.clicks || 0;
      totalConversions += r.conversions || 0;
      totalPlays += r.songPlays || 0;
      totalVideoViews += r.videoViews || 0;
    });
  });

  const overallCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";
  const overallCPC = totalClicks > 0 ? (advertiserTotalSpent / totalClicks).toFixed(2) : "0.00";
  const overallCPM = totalImpressions > 0 ? ((advertiserTotalSpent / totalImpressions) * 1000).toFixed(2) : "0.00";

  // Build chart data of aggregate daily performances
  const dailyChartData: Record<string, { date: string; impressions: number; clicks: number; cost: number }> = {};
  (Object.values(reports) as AdReport[][]).forEach((reps) => {
    reps.forEach((r) => {
      const d = r.date;
      if (!dailyChartData[d]) {
        dailyChartData[d] = { date: d, impressions: 0, clicks: 0, cost: 0 };
      }
      dailyChartData[d].impressions += r.impressions || 0;
      dailyChartData[d].clicks += r.clicks || 0;
      dailyChartData[d].cost += r.cost || 0;
    });
  });

  const sortedDailyData = Object.values(dailyChartData).sort((a, b) => a.date.localeCompare(b.date));

  if (!userId || userId === "guest" || userId === "") {
    return (
      <div className="min-h-screen bg-[#020204] text-white p-4 md:p-8 font-sans pb-32 flex items-center justify-center">
        <div className="max-w-md w-full bg-[#09090b] border border-white/5 rounded-2xl p-6 text-center shadow-2xl">
          <div className="w-16 h-16 bg-indigo-600/15 border border-indigo-500/25 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-indigo-400" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-white">Sign In Required</h2>
          <p className="text-sm text-zinc-400 mb-6">
            You must be logged in to access the Ads Manager. Promote your music, set budgets, and track campaign analytics.
          </p>
          <button 
            onClick={() => setCurrentTab && setCurrentTab("home")}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-2.5 px-4 rounded-xl transition-all cursor-pointer border-none"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020204] text-white p-4 md:p-8 font-sans pb-32">
      {/* Platform header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600/10 p-2.5 rounded-xl border border-indigo-500/20">
              <Megaphone className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
                SoundStream Ads Manager
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Target listeners, promote your independent releases, and track ROI in real-time
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-zinc-900 border border-white/5 px-4 py-2 rounded-xl flex items-center gap-2">
            <Coins className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-zinc-400">Balance:</span>
            <span className="text-sm font-bold text-emerald-400">
              ${billing?.balance?.toFixed(2) || "0.00"} USD
            </span>
          </div>

          <button
            onClick={() => setIsDepositOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-950/20 active:scale-95"
          >
            <CreditCard className="w-4 h-4" />
            Add Funds (Stripe)
          </button>

          <button
            onClick={handleOpenNewWizard}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-950/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Create Campaign
          </button>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-white/5 mb-8 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex items-center gap-2 text-xs font-medium px-4 py-3 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "dashboard"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          Advertiser Dashboard
        </button>

        <button
          onClick={() => setActiveTab("campaigns")}
          className={`flex items-center gap-2 text-xs font-medium px-4 py-3 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "campaigns"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          <Sliders className="w-4 h-4" />
          Campaigns ({campaigns.length})
        </button>

        <button
          onClick={() => setActiveTab("billing")}
          className={`flex items-center gap-2 text-xs font-medium px-4 py-3 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "billing"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Billing & Payments
        </button>

        <button
          onClick={() => setActiveTab("notifications")}
          className={`flex items-center gap-2 text-xs font-medium px-4 py-3 border-b-2 transition-all relative whitespace-nowrap ${
            activeTab === "notifications"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          <Bell className="w-4 h-4" />
          Notifications
          {notifications.filter((n) => !n.read).length > 0 && (
            <span className="absolute top-2 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full" />
          )}
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab("admin")}
            className={`flex items-center gap-2 text-xs font-medium px-4 py-3 border-b-2 transition-all whitespace-nowrap ${
              activeTab === "admin"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            <Shield className="w-4 h-4" />
            Admin Approval HQ
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
          <p className="text-zinc-500 text-xs">Synchronizing Ad metrics and active delivery nodes...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* -------------------------------------------------------- */}
          {/* TAB 1: advertiser dashboard */}
          {/* -------------------------------------------------------- */}
          {activeTab === "dashboard" && (
            <div className="space-y-8">
              {/* Top Row: Mini Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#0b0c10] border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Total Impressions</span>
                    <h3 className="text-xl font-black mt-1 text-white">{totalImpressions.toLocaleString()}</h3>
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1 mt-1">
                      <Eye className="w-3 h-3 text-indigo-400" /> Real-time reach
                    </span>
                  </div>
                  <div className="bg-indigo-950/40 p-3 rounded-xl border border-indigo-900/30">
                    <Eye className="w-5 h-5 text-indigo-400" />
                  </div>
                </div>

                <div className="bg-[#0b0c10] border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Total Clicks</span>
                    <h3 className="text-xl font-black mt-1 text-white">{totalClicks.toLocaleString()}</h3>
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1 mt-1">
                      <MousePointerClick className="w-3 h-3 text-cyan-400" /> CTR: {overallCTR}%
                    </span>
                  </div>
                  <div className="bg-cyan-950/40 p-3 rounded-xl border border-cyan-900/30">
                    <MousePointerClick className="w-5 h-5 text-cyan-400" />
                  </div>
                </div>

                <div className="bg-[#0b0c10] border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Ad Spent</span>
                    <h3 className="text-xl font-black mt-1 text-emerald-400">${advertiserTotalSpent.toFixed(2)}</h3>
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1 mt-1">
                      <DollarSign className="w-3 h-3 text-emerald-400" /> CPC: ${overallCPC}
                    </span>
                  </div>
                  <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-900/30">
                    <DollarSign className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>

                <div className="bg-[#0b0c10] border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Total Conversions</span>
                    <h3 className="text-xl font-black mt-1 text-purple-400">{totalConversions.toLocaleString()}</h3>
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1 mt-1">
                      <ArrowUpRight className="w-3 h-3 text-purple-400" /> Plays, actions, follows
                    </span>
                  </div>
                  <div className="bg-purple-950/40 p-3 rounded-xl border border-purple-900/30">
                    <ArrowUpRight className="w-5 h-5 text-purple-400" />
                  </div>
                </div>
              </div>

              {/* Chart section */}
              {sortedDailyData.length > 0 ? (
                <div className="bg-[#07080b] border border-white/5 p-6 rounded-2xl">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-indigo-400" />
                        Campaign Delivery & Performance Logs
                      </h3>
                      <p className="text-xs text-zinc-500">Impressions, clicks, and daily cost breakdown across your promotions</p>
                    </div>
                  </div>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sortedDailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                        <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={10} />
                        <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#0b0c10", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px" }}
                          itemStyle={{ fontSize: "12px" }}
                        />
                        <Area type="monotone" dataKey="impressions" stroke="#6366f1" fillOpacity={1} fill="url(#colorImpressions)" name="Impressions" />
                        <Area type="monotone" dataKey="clicks" stroke="#06b6d4" fillOpacity={1} fill="url(#colorClicks)" name="Clicks" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="bg-[#0b0c10] border border-white/5 py-12 px-6 rounded-2xl text-center">
                  <BarChart2 className="w-12 h-12 text-zinc-750 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-zinc-400">No promotion delivery logs found yet</p>
                  <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">Create a campaign or wait for active approvals to see real-time graph reports</p>
                </div>
              )}

              {/* Conversion Actions breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Secondary metric details */}
                <div className="bg-[#07080b] border border-white/5 p-6 rounded-2xl">
                  <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-400" />
                    Advertiser Conversion Breakdown
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-xs text-zinc-400">Sponsored Track Plays</span>
                      <span className="text-sm font-bold text-white">{totalPlays.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-xs text-zinc-400">Sponsored Video Views</span>
                      <span className="text-sm font-bold text-white">{totalVideoViews.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-xs text-zinc-400">New Followers Gained</span>
                      <span className="text-sm font-bold text-emerald-400">+{totalConversions.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">Marketplace Leads / Clicks</span>
                      <span className="text-sm font-bold text-indigo-400">{(totalClicks * 0.15).toFixed(0)}</span>
                    </div>
                  </div>
                </div>

                {/* Info block regarding future Optimization */}
                <div className="bg-[#07080b] border border-[#6366f1]/10 p-6 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-[#6366f1] mb-3">
                      <Sparkles className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-wider">AI Optimizer Beta</span>
                    </div>
                    <h4 className="text-sm font-semibold text-zinc-200">Automated Smart Audience Allocation</h4>
                    <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                      Our platform is pre-architected to support advanced automated bidding and predictive CTR models. Soon, our system will automatically redistribute daily budget limits towards high-converting countries and interests matching the specific genre of your promoted lossless tracks!
                    </p>
                  </div>
                  <div className="border-t border-white/5 pt-4 mt-4 flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500">Scheduled for Q4 release</span>
                    <button className="text-[11px] text-indigo-400 font-semibold flex items-center gap-1 hover:underline">
                      Learn more <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* TAB 2: campaign management list */}
          {/* -------------------------------------------------------- */}
          {activeTab === "campaigns" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Your Advertising Campaigns</h2>
                  <p className="text-xs text-zinc-400">Pause, resume, duplicate or create new promotions</p>
                </div>
                <button
                  onClick={handleOpenNewWizard}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Create Campaign
                </button>
              </div>

              {campaigns.length === 0 ? (
                <div className="bg-[#0b0c10] border border-white/5 py-20 text-center rounded-2xl">
                  <Megaphone className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                  <h3 className="text-base font-bold text-zinc-300">No campaigns launched yet</h3>
                  <p className="text-xs text-zinc-500 mt-1 mb-6 max-w-sm mx-auto">Get your music, profile or videos heard by thousands of SoundStream users today!</p>
                  <button
                    onClick={handleOpenNewWizard}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-6 py-2.5 rounded-xl transition-all"
                  >
                    Launch First Campaign
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/5">
                  <table className="w-full text-left border-collapse bg-[#07080b]">
                    <thead>
                      <tr className="border-b border-white/5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider bg-zinc-950/40">
                        <th className="p-4">Campaign Name</th>
                        <th className="p-4">Objective</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Budget info</th>
                        <th className="p-4">Spent</th>
                        <th className="p-4">Impressions / Clicks</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {campaigns.map((c) => {
                        const reps = reports[c.id] || [];
                        const cImpressions = reps.reduce((acc, r) => acc + r.impressions, 0);
                        const cClicks = reps.reduce((acc, r) => acc + r.clicks, 0);
                        const cCtr = cImpressions > 0 ? ((cClicks / cImpressions) * 100).toFixed(2) : "0.00";

                        return (
                          <tr key={c.id} className="hover:bg-zinc-900/30 transition-colors">
                            <td className="p-4">
                              <div className="font-semibold text-white">{c.name}</div>
                              <div className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> {c.startDate} to {c.endDate}
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="bg-zinc-900 border border-white/5 text-zinc-300 px-2 py-1 rounded text-[10px] font-medium">
                                {OBJECTIVE_LABELS[c.objective] || c.objective}
                              </span>
                            </td>
                            <td className="p-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider inline-block ${
                                  c.status === "active"
                                    ? "bg-emerald-950/50 text-emerald-400 border border-emerald-900/30"
                                    : c.status === "paused"
                                    ? "bg-amber-950/50 text-amber-400 border border-amber-900/30"
                                    : c.status === "pending"
                                    ? "bg-sky-950/50 text-sky-400 border border-sky-900/30"
                                    : "bg-rose-950/50 text-rose-400 border border-rose-900/30"
                                }`}
                              >
                                {c.status}
                              </span>
                              {c.changeRequests && c.status === "pending" && (
                                <div className="text-[9px] text-amber-400 mt-1 max-w-xs flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 shrink-0" />
                                  Changes Requested: {c.changeRequests}
                                </div>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="text-white font-medium">${c.lifetimeBudget} (Total)</div>
                              <div className="text-[10px] text-zinc-500 mt-0.5">${c.dailyBudget}/day</div>
                            </td>
                            <td className="p-4 font-semibold text-zinc-300">
                              ${c.spent.toFixed(2)}
                            </td>
                            <td className="p-4">
                              <div className="text-white font-medium">{cImpressions.toLocaleString()} views</div>
                              <div className="text-[10px] text-zinc-500 mt-0.5">{cClicks.toLocaleString()} clicks ({cCtr}%)</div>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {(c.status === "active" || c.status === "paused") && (
                                  <button
                                    onClick={() => toggleCampaignStatus(c)}
                                    title={c.status === "active" ? "Pause Campaign" : "Resume Campaign"}
                                    className="p-1.5 rounded-lg bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                                  >
                                    {c.status === "active" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                                  </button>
                                )}

                                <button
                                  onClick={() => handleEditCampaign(c)}
                                  title="Edit Campaign"
                                  className="p-1.5 rounded-lg bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                                >
                                  <Settings className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => duplicateCampaign(c)}
                                  title="Duplicate Campaign"
                                  className="p-1.5 rounded-lg bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => deleteCampaign(c.id)}
                                  title="Delete Campaign"
                                  className="p-1.5 rounded-lg bg-zinc-900 border border-white/5 text-rose-450 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* TAB 3: billing & invoices */}
          {/* -------------------------------------------------------- */}
          {activeTab === "billing" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Balance & Payment card */}
                <div className="bg-[#07080b] border border-white/5 p-6 rounded-2xl flex flex-col justify-between h-48">
                  <div>
                    <h3 className="text-xs uppercase font-bold text-zinc-500 tracking-wider">Account Ad Balance</h3>
                    <h2 className="text-3xl font-black text-emerald-400 mt-2">
                      ${billing?.balance?.toFixed(2) || "0.00"} USD
                    </h2>
                    <p className="text-[10px] text-zinc-500 mt-1">Prepaid balance spent dynamically per click/impression</p>
                  </div>
                  <button
                    onClick={() => setIsDepositOpen(true)}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <CreditCard className="w-4 h-4" />
                    Deposit Funds (Stripe Proxy)
                  </button>
                </div>

                {/* Simulated Payment card card */}
                <div className="bg-[#07080b] border border-white/5 p-6 rounded-2xl flex flex-col justify-between h-48">
                  <div>
                    <h3 className="text-xs uppercase font-bold text-zinc-500 tracking-wider">Payment Method</h3>
                    {billing?.paymentMethod ? (
                      <div className="mt-4 flex items-center gap-3">
                        <div className="bg-indigo-650/10 border border-indigo-500/20 px-3 py-1.5 rounded text-indigo-400 text-xs font-black">
                          {billing.paymentMethod.brand.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">•••• •••• •••• {billing.paymentMethod.last4}</p>
                          <p className="text-[10px] text-zinc-500">Expires {billing.paymentMethod.expMonth}/{billing.paymentMethod.expYear}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500 mt-4">No active payment card configured.</p>
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-indigo-400" />
                    Stripe billing protection active
                  </div>
                </div>

                {/* Platform Policy / Info card */}
                <div className="bg-[#07080b] border border-white/5 p-6 rounded-2xl flex flex-col justify-between h-48">
                  <div>
                    <h3 className="text-xs uppercase font-bold text-zinc-500 tracking-wider">Billing Guide</h3>
                    <p className="text-[11px] text-zinc-400 mt-2.5 leading-relaxed">
                      SoundStream advertising operates under a dynamic bidding architecture. We only deduct balance upon positive delivery (impressions/clicks). Invoices are generated automatically on payment completion.
                    </p>
                  </div>
                  <a
                    href="#terms"
                    className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    View advertiser legal agreement <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Invoices and ledger listing */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  Payment Ledgers & Receipts
                </h3>

                {payments.length === 0 ? (
                  <div className="bg-[#0b0c10] border border-white/5 py-12 text-center rounded-2xl text-zinc-500 text-xs">
                    No payment history logs present on this account.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-white/5">
                    <table className="w-full text-left border-collapse bg-[#07080b]">
                      <thead>
                        <tr className="border-b border-white/5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider bg-zinc-950/40">
                          <th className="p-4">Transaction ID</th>
                          <th className="p-4">Date</th>
                          <th className="p-4">Funding Source</th>
                          <th className="p-4">Amount</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-right">Invoices</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs">
                        {payments.map((p) => (
                          <tr key={p.id} className="hover:bg-zinc-900/30 transition-colors">
                            <td className="p-4 font-mono text-indigo-400">{p.id}</td>
                            <td className="p-4 text-zinc-400">
                              {new Date(p.createdAt).toLocaleString()}
                            </td>
                            <td className="p-4 text-zinc-300">
                              Stripe Card (•••• {p.cardLast4 || "4242"})
                            </td>
                            <td className="p-4 font-bold text-white">
                              ${p.amount.toFixed(2)} USD
                            </td>
                            <td className="p-4">
                              <span className="bg-emerald-950/50 text-emerald-400 border border-emerald-900/30 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase">
                                {p.status}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => setViewingInvoice(p)}
                                className="text-[11px] text-indigo-400 font-semibold hover:underline flex items-center justify-end gap-1 ml-auto"
                              >
                                <Download className="w-3.5 h-3.5" />
                                View Receipt
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* TAB 4: notifications */}
          {/* -------------------------------------------------------- */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Advertiser Notifications</h2>
                  <p className="text-xs text-zinc-400">Campaign approvals, budgets, and card billing history events</p>
                </div>
                {notifications.length > 0 && (
                  <button
                    onClick={async () => {
                      for (const n of notifications) {
                        if (!n.read) await updateDoc(doc(db, "ads_notifications", n.id), { read: true });
                      }
                    }}
                    className="text-xs text-indigo-400 hover:underline font-semibold"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="bg-[#0b0c10] border border-white/5 py-16 text-center rounded-2xl text-zinc-550 text-xs">
                  <Bell className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                  Your advertiser notification log is empty.
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={async () => {
                        if (!n.read) await updateDoc(doc(db, "ads_notifications", n.id), { read: true });
                      }}
                      className={`p-4 rounded-xl border transition-all flex gap-3 cursor-pointer ${
                        n.read
                          ? "bg-[#07080b] border-white/5 opacity-70"
                          : "bg-indigo-950/20 border-indigo-500/20 hover:border-indigo-500/40"
                      }`}
                    >
                      <div className="mt-0.5">
                        {n.type === "ad_approved" ? (
                          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />
                        ) : n.type === "ad_rejected" || n.type === "budget_exhausted" ? (
                          <XCircle className="w-4.5 h-4.5 text-rose-450" />
                        ) : n.type === "payment_success" ? (
                          <CreditCard className="w-4.5 h-4.5 text-emerald-450" />
                        ) : (
                          <Megaphone className="w-4.5 h-4.5 text-indigo-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-4">
                          <h4 className="text-xs font-bold text-white">{n.title}</h4>
                          <span className="text-[10px] text-zinc-500">{new Date(n.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{n.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* TAB 5: admin hq approvals queue */}
          {/* -------------------------------------------------------- */}
          {activeTab === "admin" && isAdmin && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  Admin Advertising Quality & Copyright HQ
                </h2>
                <p className="text-xs text-zinc-400">Review pending advertisers campaigns, audit copy descriptions, and check creative media compliance</p>
              </div>

              {/* Admin stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#07080b] border border-white/5 p-4 rounded-2xl">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Total Active Ads</span>
                  <h3 className="text-xl font-black mt-1 text-white">
                    {adminCampaigns.filter((c) => c.status === "active").length}
                  </h3>
                </div>
                <div className="bg-[#07080b] border border-white/5 p-4 rounded-2xl">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Total Pending Review</span>
                  <h3 className="text-xl font-black mt-1 text-sky-400">
                    {adminCampaigns.filter((c) => c.status === "pending").length}
                  </h3>
                </div>
                <div className="bg-[#07080b] border border-white/5 p-4 rounded-2xl">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Advertising Revenue</span>
                  <h3 className="text-xl font-black mt-1 text-emerald-400">
                    ${adminCampaigns.reduce((acc, c) => acc + c.spent, 0).toFixed(2)} USD
                  </h3>
                </div>
              </div>

              {/* Admin Approval Queue List */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider">Approvals Queue</h3>

                {adminCampaigns.filter((c) => c.status === "pending").length === 0 ? (
                  <div className="bg-[#0b0c10] border border-white/5 py-12 text-center rounded-2xl text-zinc-500 text-xs">
                    All submitted campaigns are currently audited and resolved! No pending review items.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {adminCampaigns
                      .filter((c) => c.status === "pending")
                      .map((c) => (
                        <div key={c.id} className="bg-[#07080b] border border-white/5 p-6 rounded-2xl space-y-4">
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-white">{c.name}</h4>
                                <span className="bg-zinc-900 border border-white/5 text-zinc-300 px-2 py-0.5 rounded text-[10px] font-medium">
                                  {OBJECTIVE_LABELS[c.objective] || c.objective}
                                </span>
                              </div>
                              <p className="text-[10px] text-zinc-500 mt-1">Advertiser ID: {c.advertiserId} | Created: {new Date(c.createdAt).toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setReviewModalOpen(c);
                                  setReviewNotes("Looks compliant. Keep optimization rules active.");
                                }}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-xl"
                              >
                                Review Campaign
                              </button>
                            </div>
                          </div>

                          {/* Detail summary for admin audit */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-white/5 pt-4 text-xs">
                            <div>
                              <span className="text-zinc-500 block font-bold uppercase text-[9px] tracking-wider mb-1">Targeting Scope</span>
                              <div className="text-zinc-300 space-y-1">
                                <div><span className="text-zinc-500">Countries:</span> {c.targeting.countries?.join(", ")}</div>
                                <div><span className="text-zinc-500">Age / Gender:</span> {c.targeting.ageGroups?.join(", ")} | {c.targeting.genders?.join(", ")}</div>
                                <div><span className="text-zinc-500">Genres:</span> {c.targeting.genres?.join(", ")}</div>
                              </div>
                            </div>

                            <div>
                              <span className="text-zinc-500 block font-bold uppercase text-[9px] tracking-wider mb-1">Ad Format & Creative</span>
                              <div className="text-zinc-300">
                                <div><span className="text-zinc-500">Format:</span> {FORMAT_LABELS[c.creative.format] || c.creative.format}</div>
                                <div><span className="text-zinc-500">Title:</span> "{c.creative.title}"</div>
                                <div><span className="text-zinc-500">Destination:</span> {c.creative.destinationUrl}</div>
                              </div>
                            </div>

                            <div>
                              <span className="text-zinc-500 block font-bold uppercase text-[9px] tracking-wider mb-1">Visual Media Asset</span>
                              {c.creative.mediaUrl ? (
                                <img
                                  src={c.creative.mediaUrl}
                                  alt="Campaign asset preview"
                                  className="w-full h-24 object-cover rounded-xl border border-white/10"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="bg-zinc-900 border border-white/5 h-24 rounded-xl flex items-center justify-center text-zinc-550">
                                  No media provided
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------- */}
      {/* DIALOG 1: CAMPAIGN setup wizard */}
      {/* -------------------------------------------------------- */}
      <AnimatePresence>
        {isWizardOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#07080b] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Wizard Title Bar */}
              <div className="flex items-center justify-between p-6 border-b border-white/5">
                <div>
                  <h3 className="text-base font-bold text-white">
                    {selectedCampaign ? "Edit Campaign Promotion" : "Create Advertising Campaign"}
                  </h3>
                  <p className="text-xs text-zinc-500">Follow the wizard steps to deploy your visual promotion</p>
                </div>
                <button
                  onClick={() => setIsWizardOpen(false)}
                  className="p-1.5 rounded-lg bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Wizard Content layout */}
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Steps left side (Col 8) */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Step indicators */}
                  <div className="flex items-center gap-4">
                    {[1, 2, 3, 4].map((step) => (
                      <div key={step} className="flex-1 flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            step === wizardStep
                              ? "bg-indigo-600 text-white"
                              : step < wizardStep
                              ? "bg-indigo-950 text-indigo-400"
                              : "bg-zinc-900 text-zinc-500"
                          }`}
                        >
                          {step}
                        </div>
                        <span
                          className={`text-[10px] uppercase font-bold tracking-wider hidden sm:inline ${
                            step === wizardStep ? "text-white" : "text-zinc-500"
                          }`}
                        >
                          {step === 1 ? "Details" : step === 2 ? "Budget" : step === 3 ? "Targeting" : "Creative"}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* STEP 1: details & objective */}
                  {wizardStep === 1 && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-zinc-400 font-bold block mb-1.5">Campaign Name</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full bg-[#0b0c10] border border-white/5 rounded-xl px-4 py-2.5 text-xs focus:border-indigo-500 focus:outline-none"
                          placeholder="e.g. SoundStream Summer Afrobeats Blast"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-zinc-400 font-bold block mb-1.5">Campaign Objective</label>
                        <select
                          value={formData.objective}
                          onChange={(e) => setFormData({ ...formData, objective: e.target.value as any })}
                          className="w-full bg-[#0b0c10] border border-white/5 rounded-xl px-4 py-2.5 text-xs focus:border-indigo-500 focus:outline-none"
                        >
                          {Object.entries(OBJECTIVE_LABELS).map(([val, label]) => (
                            <option key={val} value={val} className="bg-zinc-950">
                              {label}
                            </option>
                          ))}
                        </select>
                        <span className="text-[10px] text-zinc-500 mt-1 block">Your objectives configure optimization algorithms to yield premium CTR.</span>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: budget & dates */}
                  {wizardStep === 2 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-zinc-400 font-bold block mb-1.5">Daily Budget ($)</label>
                          <input
                            type="number"
                            value={formData.dailyBudget}
                            onChange={(e) => setFormData({ ...formData, dailyBudget: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-[#0b0c10] border border-white/5 rounded-xl px-4 py-2.5 text-xs focus:border-indigo-500 focus:outline-none"
                            min="5"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-400 font-bold block mb-1.5">Lifetime Budget ($)</label>
                          <input
                            type="number"
                            value={formData.lifetimeBudget}
                            onChange={(e) => setFormData({ ...formData, lifetimeBudget: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-[#0b0c10] border border-white/5 rounded-xl px-4 py-2.5 text-xs focus:border-indigo-500 focus:outline-none"
                            min="20"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-zinc-400 font-bold block mb-1.5">Start Date</label>
                          <input
                            type="date"
                            value={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            className="w-full bg-[#0b0c10] border border-white/5 rounded-xl px-4 py-2.5 text-xs focus:border-indigo-500 focus:outline-none text-zinc-300"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-400 font-bold block mb-1.5">End Date</label>
                          <input
                            type="date"
                            value={formData.endDate}
                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                            className="w-full bg-[#0b0c10] border border-white/5 rounded-xl px-4 py-2.5 text-xs focus:border-indigo-500 focus:outline-none text-zinc-300"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: audience targeting selection */}
                  {wizardStep === 3 && (
                    <div className="space-y-4">
                      {/* Countries */}
                      <div>
                        <label className="text-xs text-zinc-400 font-bold block mb-1.5">Countries Targeting (Multi-select)</label>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto border border-white/5 p-2 rounded-xl bg-[#0b0c10]">
                          {COUNTRIES.map((country) => {
                            const isSel = formData.countries.includes(country);
                            return (
                              <button
                                key={country}
                                onClick={() => {
                                  const updated = isSel
                                    ? formData.countries.filter((c) => c !== country)
                                    : [...formData.countries, country];
                                  setFormData({ ...formData, countries: updated });
                                }}
                                className={`text-[10px] px-2 py-1 rounded transition-colors ${
                                  isSel ? "bg-indigo-600 text-white" : "bg-zinc-900 text-zinc-400 hover:text-white"
                                }`}
                              >
                                {country}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Genres */}
                      <div>
                        <label className="text-xs text-zinc-400 font-bold block mb-1.5">Music Genres (Optional)</label>
                        <div className="flex flex-wrap gap-1.5 border border-white/5 p-2 rounded-xl bg-[#0b0c10]">
                          {MUSIC_GENRES.map((genre) => {
                            const isSel = formData.genres.includes(genre);
                            return (
                              <button
                                key={genre}
                                onClick={() => {
                                  const updated = isSel
                                    ? formData.genres.filter((g) => g !== genre)
                                    : [...formData.genres, genre];
                                  setFormData({ ...formData, genres: updated });
                                }}
                                className={`text-[10px] px-2.5 py-1 rounded transition-colors ${
                                  isSel ? "bg-indigo-600 text-white" : "bg-zinc-900 text-zinc-400 hover:text-white"
                                }`}
                              >
                                {genre}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Age groups and gender */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-zinc-400 font-bold block mb-1.5">Age Groups</label>
                          <div className="flex flex-wrap gap-1 border border-white/5 p-2 rounded-xl bg-[#0b0c10]">
                            {AGE_GROUPS.map((age) => {
                              const isSel = formData.ageGroups.includes(age);
                              return (
                                <button
                                  key={age}
                                  onClick={() => {
                                    const updated = isSel
                                      ? formData.ageGroups.filter((a) => a !== age)
                                      : [...formData.ageGroups, age];
                                    setFormData({ ...formData, ageGroups: updated });
                                  }}
                                  className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${
                                    isSel ? "bg-indigo-600 text-white" : "bg-zinc-900 text-zinc-500 hover:text-white"
                                  }`}
                                >
                                  {age}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <label className="text-xs text-zinc-400 font-bold block mb-1.5">Gender Selection</label>
                          <select
                            value={formData.genders[0] || "All Genders"}
                            onChange={(e) => setFormData({ ...formData, genders: [e.target.value] })}
                            className="w-full bg-[#0b0c10] border border-white/5 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                          >
                            {GENDERS.map((g) => (
                              <option key={g} value={g} className="bg-zinc-950">
                                {g}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 4: creative template & fields */}
                  {wizardStep === 4 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-zinc-400 font-bold block mb-1.5">Ad Format Style</label>
                          <select
                            value={formData.format}
                            onChange={(e) => setFormData({ ...formData, format: e.target.value as any })}
                            className="w-full bg-[#0b0c10] border border-white/5 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                          >
                            {Object.entries(FORMAT_LABELS).map(([val, label]) => (
                              <option key={val} value={val} className="bg-zinc-950">
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-xs text-zinc-400 font-bold block mb-1.5">Destination Link</label>
                          <input
                            type="text"
                            value={formData.destinationUrl}
                            onChange={(e) => setFormData({ ...formData, destinationUrl: e.target.value })}
                            placeholder="e.g. https://soundstream.io/track/summersound"
                            className="w-full bg-[#0b0c10] border border-white/5 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-zinc-400 font-bold block mb-1.5">Ad Title (Headliner)</label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="e.g. Antigravity flow - out now!"
                          className="w-full bg-[#0b0c10] border border-white/5 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-zinc-400 font-bold block mb-1.5">Primary Copy Description</label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Introduce your track, event, profile or business beautifully..."
                          className="w-full bg-[#0b0c10] border border-white/5 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 h-20 resize-none"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-zinc-400 font-bold block mb-1.5">Ad Banner / Media URL Link</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={formData.mediaUrl}
                            onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
                            placeholder="e.g. https://images.unsplash.com/... or upload"
                            className="flex-1 bg-[#0b0c10] border border-white/5 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              // Simulate immediate local mock asset load
                              const sampleAssets = [
                                "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80",
                                "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80",
                                "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80",
                                "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=800&q=80"
                              ];
                              const randomUrl = sampleAssets[Math.floor(Math.random() * sampleAssets.length)];
                              setFormData({ ...formData, mediaUrl: randomUrl });
                            }}
                            className="bg-zinc-900 border border-white/5 text-zinc-300 px-3 py-2 rounded-xl text-xs hover:bg-zinc-800"
                          >
                            Suggest Photo
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Wizard Footer Actions */}
                  <div className="border-t border-white/5 pt-6 flex items-center justify-between">
                    <button
                      type="button"
                      disabled={wizardStep === 1}
                      onClick={() => setWizardStep(wizardStep - 1)}
                      className="bg-zinc-900 border border-white/5 text-zinc-300 hover:text-white px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </button>

                    {wizardStep < 4 ? (
                      <button
                        type="button"
                        onClick={() => setWizardStep(wizardStep + 1)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleWizardSubmit}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        Submit for Moderation
                      </button>
                    )}
                  </div>
                </div>

                {/* Live Real-time Preview Pane right side (Col 5) */}
                <div className="lg:col-span-5 bg-zinc-950 border border-white/5 p-4 rounded-xl flex flex-col h-full self-start">
                  <h4 className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-3">Live Ad Delivery Preview</h4>

                  {/* Format container */}
                  <div className="flex-1 bg-[#050508] border border-dashed border-white/10 rounded-xl p-4 flex flex-col justify-center min-h-[250px]">
                    {formData.format === "banner" && (
                      <div className="w-full bg-[#0a0a0f] border border-indigo-500/10 p-2.5 rounded-xl space-y-2">
                        <div className="flex items-center gap-1">
                          <span className="bg-indigo-950 text-indigo-400 text-[8px] font-bold px-1.5 py-px rounded uppercase tracking-wider scale-90 origin-left">SPONSORED BANNED</span>
                        </div>
                        <div className="flex gap-3">
                          <img
                            src={formData.mediaUrl || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80"}
                            alt="preview"
                            className="w-16 h-16 object-cover rounded-lg border border-white/5"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1 min-w-0">
                            <h5 className="text-[11px] font-bold text-white truncate">{formData.title || "Ad Header Headline"}</h5>
                            <p className="text-[10px] text-zinc-400 line-clamp-2 mt-0.5">{formData.description || "Ad promo description copy text"}</p>
                            <span className="text-[9px] text-indigo-400 hover:underline mt-1 block truncate font-medium">{formData.destinationUrl || "soundstream.io"}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {formData.format === "feed" && (
                      <div className="w-full bg-[#0b0c10] border border-white/5 rounded-xl overflow-hidden">
                        <div className="p-3 flex items-center justify-between border-b border-white/5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-indigo-650 rounded-full flex items-center justify-center text-[10px] font-black">S</div>
                            <div>
                              <h5 className="text-[10px] font-bold text-white">SoundStream Advertiser</h5>
                              <span className="text-[8px] text-[#6366f1] font-bold uppercase tracking-wider block">Sponsored Feed Ad</span>
                            </div>
                          </div>
                        </div>
                        <img
                          src={formData.mediaUrl || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&q=80"}
                          alt="preview"
                          className="w-full h-32 object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="p-3 space-y-1.5">
                          <h5 className="text-[11px] font-bold text-white">{formData.title || "Your Campaign Headline"}</h5>
                          <p className="text-[10px] text-zinc-400 line-clamp-3 leading-relaxed">{formData.description || "The message that details why listeners should engage with this product, song, profile or livestream."}</p>
                          <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                            <span className="text-[9px] text-zinc-500 font-mono">soundstream.io</span>
                            <button className="bg-indigo-600 hover:bg-indigo-500 text-[10px] px-3 py-1 rounded text-white font-bold">
                              Learn More
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {formData.format === "native" && (
                      <div className="w-full bg-[#0a0a0f] p-3 rounded-xl border border-white/5 flex gap-3">
                        <img
                          src={formData.mediaUrl || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80"}
                          alt="preview"
                          className="w-12 h-12 object-cover rounded-lg border border-white/5"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h5 className="text-[10px] font-bold text-white truncate">{formData.title || "Your Headliner"}</h5>
                            <span className="text-[8px] text-indigo-400 font-black tracking-wider uppercase shrink-0 bg-indigo-950 px-1 py-px rounded">AD</span>
                          </div>
                          <p className="text-[9px] text-zinc-400 line-clamp-2 mt-0.5">{formData.description || "Perfect contextual native placement in listener streams."}</p>
                        </div>
                      </div>
                    )}

                    {formData.format === "song" && (
                      <div className="w-full bg-[#0a0a0f] p-3 rounded-xl border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={formData.mediaUrl || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80"}
                            alt="preview"
                            className="w-10 h-10 object-cover rounded-lg"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <h5 className="text-[11px] font-bold text-white flex items-center gap-1.5">
                              {formData.title || "Lossless Track Title"}
                              <span className="text-[8px] text-amber-400 font-black shrink-0 bg-amber-950 px-1.5 py-px rounded uppercase scale-90 tracking-wider">Promoted</span>
                            </h5>
                            <p className="text-[10px] text-zinc-500 truncate">{formData.description || "Independent Producer | Lossless"}</p>
                          </div>
                        </div>
                        <Play className="w-4 h-4 text-indigo-400" />
                      </div>
                    )}

                    {!["banner", "feed", "native", "song"].includes(formData.format) && (
                      <div className="w-full bg-zinc-900/40 border border-white/5 p-4 rounded-xl text-center space-y-3">
                        <div className="bg-indigo-950/40 p-2 rounded-full w-8 h-8 flex items-center justify-center mx-auto text-indigo-400">
                          <Megaphone className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-white capitalize">{formData.format} Promotion</h5>
                          <p className="text-[10px] text-zinc-400 mt-1">
                            This immersive placement layout renders directly in target channels.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
          )}
        </AnimatePresence>

        {/* -------------------------------------------------------- */}
        {/* DIALOG 2: DEPOSIT Stripe simulated gateway */}
        {/* -------------------------------------------------------- */}
        <AnimatePresence>
          {isDepositOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#07080b] border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-6"
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-indigo-600/10 p-2 rounded-lg text-indigo-400 border border-indigo-500/20">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Stripe Payment Gateway</h3>
                      <p className="text-[10px] text-zinc-500">Secure simulated sandboxed wallet funding</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsDepositOpen(false)}
                    className="p-1 rounded bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <form onSubmit={handleStripeDeposit} className="space-y-4 text-xs">
                  <div>
                    <label className="text-[11px] text-zinc-400 font-bold block mb-1.5">Amount to Add ($ USD)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                      <input
                        type="number"
                        value={stripeAmount}
                        onChange={(e) => setStripeAmount(e.target.value)}
                        className="w-full bg-[#0b0c10] border border-white/5 rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
                        placeholder="50.00"
                        min="10"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-zinc-400 font-bold block mb-1.5">Cardholder Name</label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className="w-full bg-[#0b0c10] border border-white/5 rounded-xl px-4 py-2 text-zinc-300 focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-zinc-400 font-bold block mb-1.5">Card Number</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full bg-[#0b0c10] border border-white/5 rounded-xl px-4 py-2 text-zinc-300 focus:outline-none focus:border-indigo-500 font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] text-zinc-400 font-bold block mb-1.5">Expiration Date</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM/YY"
                        className="w-full bg-[#0b0c10] border border-white/5 rounded-xl px-4 py-2 text-zinc-300 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-400 font-bold block mb-1.5">CVC Code</label>
                      <input
                        type="password"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value)}
                        placeholder="123"
                        maxLength={3}
                        className="w-full bg-[#0b0c10] border border-white/5 rounded-xl px-4 py-2 text-zinc-300 focus:outline-none font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="bg-zinc-950 border border-white/5 p-3 rounded-xl flex items-center gap-2 text-[10px] text-zinc-500">
                    <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                    Secure PCI-DSS compliant Stripe ledger transaction. No actual financial cards are billed during simulated development sandboxing.
                  </div>

                  <button
                    type="submit"
                    disabled={depositing}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-xs"
                  >
                    {depositing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Authorizing Stripe Gateway...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        Pay ${stripeAmount} USD Now
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* -------------------------------------------------------- */}
        {/* DIALOG 3: VIEW RECEIPT MODAL */}
        {/* -------------------------------------------------------- */}
        <AnimatePresence>
          {viewingInvoice && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white text-zinc-900 p-8 rounded-2xl w-full max-w-lg shadow-2xl relative"
              >
                {/* Invoice print look */}
                <div className="space-y-6">
                  {/* Close button */}
                  <button
                    onClick={() => setViewingInvoice(null)}
                    className="absolute top-4 right-4 p-1 rounded-full hover:bg-zinc-100 text-zinc-500"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="flex justify-between items-start border-b pb-4">
                    <div>
                      <h1 className="text-lg font-black tracking-tight text-indigo-650">SOUNDSTREAM, INC.</h1>
                      <p className="text-[10px] text-zinc-500">Immersive Audio and Promotion Platform</p>
                    </div>
                    <div className="text-right">
                      <h2 className="text-xs font-black uppercase text-zinc-500">Transaction Receipt</h2>
                      <p className="text-[10px] text-zinc-400 mt-1">Receipt ID: {viewingInvoice.id}</p>
                    </div>
                  </div>

                  {/* Billing Details */}
                  <div className="grid grid-cols-2 gap-4 text-[10px]">
                    <div>
                      <span className="text-zinc-500 block font-bold uppercase tracking-wider">Billed To</span>
                      <p className="font-semibold text-zinc-800 mt-1">{userEmail}</p>
                      <p className="text-zinc-500 mt-0.5">Advertiser ID: {userId}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-zinc-500 block font-bold uppercase tracking-wider">Date & Time</span>
                      <p className="font-semibold text-zinc-800 mt-1">{new Date(viewingInvoice.createdAt).toLocaleString()}</p>
                      <p className="text-zinc-500 mt-0.5">Payment Method: Card (•••• {viewingInvoice.cardLast4})</p>
                    </div>
                  </div>

                  {/* Summary Ledger */}
                  <div className="border-t border-b py-4">
                    <div className="flex justify-between font-bold text-xs">
                      <span>Description</span>
                      <span>Total</span>
                    </div>
                    <div className="flex justify-between text-xs text-zinc-650 mt-2">
                      <span>Prepaid Advertising Credits (Balance Top-up)</span>
                      <span>${viewingInvoice.amount.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Grand total */}
                  <div className="flex justify-between items-center text-zinc-800 font-black">
                    <span className="text-xs">Amount Paid (USD)</span>
                    <span className="text-base">${viewingInvoice.amount.toFixed(2)}</span>
                  </div>

                  <div className="bg-emerald-50 text-emerald-800 text-[9px] p-2.5 rounded-lg border border-emerald-100 flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Transaction Approved successfully via secure Stripe gateway.
                  </div>

                  {/* PDF download simulated */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        window.print();
                      }}
                      className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5"
                    >
                      <FileText className="w-4 h-4" />
                      Print Receipt
                    </button>
                    <button
                      onClick={() => {
                        alert("Simulated receipt PDF download complete!");
                        setViewingInvoice(null);
                      }}
                      className="flex-1 bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-4 h-4" />
                      Download PDF
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* -------------------------------------------------------- */}
        {/* DIALOG 4: ADMIN CAMPAIGN REVIEW DECISION MODAL */}
        {/* -------------------------------------------------------- */}
        <AnimatePresence>
          {reviewModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#07080b] border border-white/10 p-6 rounded-2xl w-full max-w-lg shadow-2xl space-y-6 text-xs"
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <h3 className="text-sm font-bold text-white">Review Campaign Proposal</h3>
                  <button
                    onClick={() => setReviewModalOpen(null)}
                    className="p-1 rounded bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-zinc-500 uppercase font-bold text-[9px] tracking-wider block mb-1">Campaign Info</span>
                    <p className="text-sm font-bold text-white">{reviewModalOpen.name}</p>
                    <p className="text-zinc-400 mt-1">Objective: {OBJECTIVE_LABELS[reviewModalOpen.objective] || reviewModalOpen.objective}</p>
                  </div>

                  <div>
                    <span className="text-zinc-500 uppercase font-bold text-[9px] tracking-wider block mb-1">Creative Ad Draft</span>
                    <div className="bg-zinc-950 p-3 rounded-xl border border-white/5 space-y-1.5">
                      <p className="font-bold text-white">"{reviewModalOpen.creative.title}"</p>
                      <p className="text-zinc-400 text-[11px] leading-relaxed">{reviewModalOpen.creative.description}</p>
                      {reviewModalOpen.creative.mediaUrl && (
                        <img
                          src={reviewModalOpen.creative.mediaUrl}
                          alt="review asset"
                          className="w-full h-32 object-cover rounded-lg border border-white/10 mt-2"
                          referrerPolicy="no-referrer"
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-400 font-bold block mb-1.5">Audit Evaluation Notes</label>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="e.g. Approved. Creative looks crisp and copyright checks out..."
                      className="w-full bg-[#0b0c10] border border-white/5 rounded-xl px-3 py-2 text-zinc-300 focus:outline-none focus:border-indigo-500 h-20 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <button
                      onClick={() => handleReviewDecision(reviewModalOpen, "changes_requested")}
                      className="bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-amber-400 font-bold py-2.5 rounded-xl text-[10px]"
                    >
                      Request Revision
                    </button>
                    <button
                      onClick={() => handleReviewDecision(reviewModalOpen, "rejected")}
                      className="bg-rose-950/40 hover:bg-rose-900 border border-rose-900/30 text-rose-400 font-bold py-2.5 rounded-xl text-[10px]"
                    >
                      Reject Ad
                    </button>
                    <button
                      onClick={() => handleReviewDecision(reviewModalOpen, "approved")}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-[10px]"
                    >
                      Approve & Launch
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }
