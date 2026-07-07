import React, { useState, useEffect } from "react";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  addDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp 
} from "firebase/firestore";
import { db, auth, uploadSong, uploadCover } from "../lib/firebase";
import { 
  LayoutDashboard, 
  Music, 
  Video, 
  Radio, 
  BarChart3, 
  DollarSign, 
  CreditCard, 
  Bell, 
  Settings, 
  Plus, 
  Edit2, 
  Trash2, 
  Clock, 
  Flame, 
  ShieldCheck, 
  Check, 
  X, 
  ChevronRight, 
  ArrowRight, 
  Search, 
  Share2, 
  Heart, 
  MessageSquare, 
  PlusCircle, 
  Download, 
  RefreshCw, 
  Play, 
  Pause, 
  Calendar, 
  TrendingUp, 
  UserPlus, 
  Users, 
  Award, 
  AlertTriangle,
  Upload,
  Globe,
  Smartphone,
  ChevronDown,
  Lock,
  Sparkles
} from "lucide-react";
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
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";
import { motion, AnimatePresence } from "motion/react";

// For custom errors
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface CreatorStudioProps {
  creatorId: string;
}

export default function SoundStreamCreatorStudio({ creatorId }: CreatorStudioProps) {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [loading, setLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Real-time Firestore States for Creator Studio collections
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any>(null);
  const [withdrawalsList, setWithdrawalsList] = useState<any[]>([]);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [reportsList, setReportsList] = useState<any[]>([]);
  const [settingsData, setSettingsData] = useState<any>(null);

  // Content Management list
  const [contentList, setContentList] = useState<any[]>([]);
  const [draftsList, setDraftsList] = useState<any[]>([]);
  const [scheduledList, setScheduledList] = useState<any[]>([]);

  // Interactive Live Streams list & Battles
  const [liveStreams, setLiveStreams] = useState<any[]>([]);
  const [battleInvites, setBattleInvites] = useState<any[]>([]);
  const [creatorsList, setCreatorsList] = useState<any[]>([]);

  // Upload/Processing state
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStep, setUploadStep] = useState<string>(""); // "idle", "uploading", "processing", "scanning", "completed"
  const [uploadType, setUploadType] = useState<"song" | "video">("song");
  const [uploadTitle, setUploadTitle] = useState<string>("");
  const [uploadGenre, setUploadGenre] = useState<string>("Afrobeats");
  const [uploadIsDraft, setUploadIsDraft] = useState<boolean>(false);
  const [uploadScheduleDate, setUploadScheduleDate] = useState<string>("");

  // New Withdrawal state
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>("");
  const [withdrawalMethod, setWithdrawalMethod] = useState<"PayPal" | "Stripe" | "Bank Transfer">("PayPal");
  const [withdrawalDetails, setWithdrawalDetails] = useState<string>("");

  // Edit states
  const [editingContent, setEditingContent] = useState<any>(null);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editGenre, setEditGenre] = useState<string>("");

  // PK Battle states
  const [selectedCreatorForBattle, setSelectedCreatorForBattle] = useState<string>("");
  const [battleDuration, setBattleDuration] = useState<number>(5);

  // Settings form states
  const [profileArtistName, setProfileArtistName] = useState<string>("");
  const [profileBio, setProfileBio] = useState<string>("");
  const [profileInstagram, setProfileInstagram] = useState<string>("");
  const [profileTiktok, setProfileTiktok] = useState<string>("");
  const [profileYoutube, setProfileYoutube] = useState<string>("");
  const [profilePrivacy, setProfilePrivacy] = useState<boolean>(false);
  const [notifFollower, setNotifFollower] = useState<boolean>(true);
  const [notifGift, setNotifGift] = useState<boolean>(true);
  const [notifPayment, setNotifPayment] = useState<boolean>(true);
  const [paymentPaypalEmail, setPaymentPaypalEmail] = useState<string>("");
  const [paymentBankAccount, setPaymentBankAccount] = useState<string>("");

  // Analytics filter state
  const [analyticsPeriod, setAnalyticsPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("weekly");

  // Show Toast Feedback Helper
  const showFeedback = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  // 1. Initialize data on load
  useEffect(() => {
    if (!creatorId) return;

    setLoading(true);

    const initializeData = async () => {
      try {
        const docRef = doc(db, "creator_dashboard", creatorId);
        const docSnap = await getDoc(docRef);

        const currentTimestamp = new Date().toISOString();

        if (!docSnap.exists()) {
          // Initialize complete set of 7 collections for creator
          const initialDashboard = {
            creatorId,
            totalFollowers: 1420,
            totalFollowing: 184,
            totalSongs: 12,
            totalVideos: 4,
            totalLivestreams: 8,
            totalPlays: 24500,
            totalLikes: 4890,
            totalComments: 312,
            totalShares: 840,
            totalPlaylistSaves: 1100,
            totalGiftsReceived: 350,
            totalCoinsEarned: 17500,
            totalDiamondsEarned: 8750,
            estimatedRevenue: 437.50,
            withdrawableBalance: 250.00,
            updatedAt: currentTimestamp
          };
          await setDoc(docRef, initialDashboard);

          const initialAnalytics = {
            creatorId,
            avgListeningTime: 4.2,
            avgWatchDuration: 28,
            bestPostingTimes: { daily: "6 PM", weekly: "Friday 7 PM", monthly: "End of month", yearly: "December" },
            countries: [
              { country: "Nigeria", count: 45 },
              { country: "United States", count: 20 },
              { country: "United Kingdom", count: 15 },
              { country: "South Africa", count: 12 },
              { country: "Other", count: 8 }
            ],
            cities: [
              { city: "Lagos", count: 35 },
              { city: "New York", count: 12 },
              { city: "London", count: 10 },
              { city: "Johannesburg", count: 8 },
              { city: "Accra", count: 5 }
            ],
            deviceTypes: [
              { device: "Mobile App", count: 72 },
              { device: "Desktop Web", count: 18 },
              { device: "Mobile Web", count: 10 }
            ],
            trafficSources: [
              { source: "Trending Charts", count: 40 },
              { source: "Search", count: 25 },
              { source: "Short Video Link", count: 20 },
              { source: "Direct Link", count: 15 }
            ],
            followerGrowth: [
              { date: "06/27", count: 1390 },
              { date: "06/28", count: 1395 },
              { date: "06/29", count: 1402 },
              { date: "06/30", count: 1410 },
              { date: "07/01", count: 1415 },
              { date: "07/02", count: 1420 }
            ],
            views: [
              { date: "06/27", count: 180 },
              { date: "06/28", count: 220 },
              { date: "06/29", count: 310 },
              { date: "06/30", count: 290 },
              { date: "07/01", count: 450 },
              { date: "07/02", count: 510 }
            ],
            streams: [
              { date: "06/27", count: 1200 },
              { date: "06/28", count: 1400 },
              { date: "06/29", count: 1900 },
              { date: "06/30", count: 1700 },
              { date: "07/01", count: 2600 },
              { date: "07/02", count: 3100 }
            ],
            watchTime: [
              { date: "06/27", count: 420 },
              { date: "06/28", count: 490 },
              { date: "06/29", count: 650 },
              { date: "06/30", count: 580 },
              { date: "07/01", count: 810 },
              { date: "07/02", count: 950 }
            ],
            topSongs: [
              { id: "song_1", title: "Last Last (Afrobeats Remix)", playCount: 8900 },
              { id: "song_2", title: "Midnight Session Amapiano", playCount: 6200 },
              { id: "song_3", title: "Sunset Vibe Lossless", playCount: 4100 }
            ],
            topVideos: [
              { id: "vid_1", title: "Studio Recording Behind-The-Scenes", views: 2400 },
              { id: "vid_2", title: "Amapiano Live Pad Play", views: 1800 }
            ],
            topLivestreams: [
              { id: "live_1", title: "Acoustic Sunday Requests", viewers: 120 },
              { id: "live_2", title: "Live Beatmaking Session", viewers: 95 }
            ],
            updatedAt: currentTimestamp
          };
          await setDoc(doc(db, "creator_analytics", creatorId), initialAnalytics);

          const initialRevenue = {
            creatorId,
            coins: 17500,
            diamonds: 8750,
            estimatedRevenue: 437.50,
            completedWithdrawals: 187.50,
            pendingWithdrawals: 0.00,
            giftEarnings: 150.00,
            subscriptionEarnings: 120.00,
            liveEarnings: 87.50,
            musicEarnings: 50.00,
            videoEarnings: 30.00,
            updatedAt: currentTimestamp
          };
          await setDoc(doc(db, "creator_revenue", creatorId), initialRevenue);

          const initialSettings = {
            creatorId,
            username: auth.currentUser?.displayName?.toLowerCase().replace(/\s+/g, "_") || "soundstream_creator",
            artistName: auth.currentUser?.displayName || "SoundStream Artist",
            genres: ["Afrobeats", "Amapiano"],
            bio: "Welcome to my SoundStream Creator Studio! Creating and sharing modern Afro-fusion and high-fidelity lossless vibes.",
            socialLinks: { instagram: "artist_insta", tiktok: "artist_tiktok", youtube: "artist_yt" },
            verificationStatus: "verified",
            privacySettings: { isPrivateProfile: false },
            notificationSettings: { follower: true, gift: true, payment: true },
            paymentInfo: { paypalEmail: auth.currentUser?.email || "", bankAccount: "**** **** **** 4910" },
            updatedAt: currentTimestamp
          };
          await setDoc(doc(db, "creator_settings", creatorId), initialSettings);

          // Add some demo withdrawal documents
          await addDoc(collection(db, "creator_withdrawals"), {
            creatorId,
            amount: 100.00,
            diamondsExchanged: 2000,
            paymentMethod: "PayPal",
            paymentDetails: auth.currentUser?.email || "",
            status: "completed",
            requestedAt: new Date(Date.now() - 604800000).toISOString(),
            processedAt: new Date(Date.now() - 518400000).toISOString(),
            rejectionReason: null
          });

          await addDoc(collection(db, "creator_withdrawals"), {
            creatorId,
            amount: 87.50,
            diamondsExchanged: 1750,
            paymentMethod: "Bank Transfer",
            paymentDetails: "Naira Merchant Account - 3028****11",
            status: "completed",
            requestedAt: new Date(Date.now() - 1209600000).toISOString(),
            processedAt: new Date(Date.now() - 1123200000).toISOString(),
            rejectionReason: null
          });

          // Add initial notifications
          await addDoc(collection(db, "creator_notifications"), {
            creatorId,
            title: "Super Fan Gifting Alert",
            message: "alex_beats sent you a 'Cosmic Star' (worth 500 Coins) during your midnight stream!",
            type: "gift",
            read: false,
            createdAt: new Date().toISOString()
          });

          await addDoc(collection(db, "creator_notifications"), {
            creatorId,
            title: "Fan Follow Tracker",
            message: "sarah_jazz is now following your SoundStream profile!",
            type: "follower",
            read: false,
            createdAt: new Date(Date.now() - 3600000).toISOString()
          });

          await addDoc(collection(db, "creator_notifications"), {
            creatorId,
            title: "Withdrawal Successful",
            message: "Your withdrawal ticket of $100.00 was approved and processed via PayPal.",
            type: "payout_update",
            read: true,
            createdAt: new Date(Date.now() - 518400000).toISOString()
          });

          // Add demo reports
          await addDoc(collection(db, "creator_reports"), {
            creatorId,
            reporterName: "System Scan Block",
            reason: "Suspected repeat upload attempt (Automated warning cleared: Safe metadata verified)",
            status: "dismissed",
            createdAt: new Date(Date.now() - 172800000).toISOString()
          });
        }
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [creatorId]);

  // 2. Real-time Listeners (onSnapshot) to update state instantly on database changes
  useEffect(() => {
    if (!creatorId) return;

    // Sub 1: Dashboard
    const unsubDashboard = onSnapshot(doc(db, "creator_dashboard", creatorId), (snapshot) => {
      if (snapshot.exists()) {
        setDashboardData(snapshot.data());
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `creator_dashboard/${creatorId}`));

    // Sub 2: Analytics
    const unsubAnalytics = onSnapshot(doc(db, "creator_analytics", creatorId), (snapshot) => {
      if (snapshot.exists()) {
        setAnalyticsData(snapshot.data());
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `creator_analytics/${creatorId}`));

    // Sub 3: Revenue
    const unsubRevenue = onSnapshot(doc(db, "creator_revenue", creatorId), (snapshot) => {
      if (snapshot.exists()) {
        setRevenueData(snapshot.data());
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `creator_revenue/${creatorId}`));

    // Sub 4: Withdrawals
    const qWithdrawals = query(collection(db, "creator_withdrawals"), where("creatorId", "==", creatorId));
    const unsubWithdrawals = onSnapshot(qWithdrawals, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWithdrawalsList(list.sort((a: any, b: any) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()));
    }, (error) => handleFirestoreError(error, OperationType.GET, "creator_withdrawals"));

    // Sub 5: Notifications
    const qNotifs = query(collection(db, "creator_notifications"), where("creatorId", "==", creatorId));
    const unsubNotifs = onSnapshot(qNotifs, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotificationsList(list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }, (error) => handleFirestoreError(error, OperationType.GET, "creator_notifications"));

    // Sub 6: Reports
    const qReports = query(collection(db, "creator_reports"), where("creatorId", "==", creatorId));
    const unsubReports = onSnapshot(qReports, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReportsList(list);
    }, (error) => handleFirestoreError(error, OperationType.GET, "creator_reports"));

    // Sub 7: Settings
    const unsubSettings = onSnapshot(doc(db, "creator_settings", creatorId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setSettingsData(data);
        setProfileArtistName(data.artistName || "");
        setProfileBio(data.bio || "");
        setProfileInstagram(data.socialLinks?.instagram || "");
        setProfileTiktok(data.socialLinks?.tiktok || "");
        setProfileYoutube(data.socialLinks?.youtube || "");
        setProfilePrivacy(data.privacySettings?.isPrivateProfile || false);
        setNotifFollower(data.notificationSettings?.follower || false);
        setNotifGift(data.notificationSettings?.gift || false);
        setNotifPayment(data.notificationSettings?.payment || false);
        setPaymentPaypalEmail(data.paymentInfo?.paypalEmail || "");
        setPaymentBankAccount(data.paymentInfo?.bankAccount || "");
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `creator_settings/${creatorId}`));

    // Sync content lists (songs and videos)
    const qContent = query(collection(db, "songs"), where("artistId", "==", creatorId));
    const unsubContent = onSnapshot(qContent, (snapshot) => {
      const songs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setContentList(songs.filter((s: any) => !s.isDraft && !s.scheduledPublishTime));
      setDraftsList(songs.filter((s: any) => s.isDraft));
      setScheduledList(songs.filter((s: any) => s.scheduledPublishTime));
    }, (error) => handleFirestoreError(error, OperationType.GET, "songs"));

    // Sync active streams
    const unsubStreams = onSnapshot(collection(db, "liveStreams"), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLiveStreams(list.filter((s: any) => s.creatorId === creatorId || s.artistId === creatorId));
    }, (error) => handleFirestoreError(error, OperationType.GET, "liveStreams"));

    // Sync PK battle invites where this creator is either sender or receiver
    const unsubInvites = onSnapshot(collection(db, "battle_invites"), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBattleInvites(list.filter((item: any) => item.senderId === creatorId || item.receiverId === creatorId));
    }, (error) => handleFirestoreError(error, OperationType.GET, "battle_invites"));

    // Fetch all creators for PK Battles dropdown
    const unsubCreators = onSnapshot(collection(db, "artists"), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCreatorsList(list.filter((c: any) => c.uid !== creatorId && c.id !== creatorId));
    }, (error) => handleFirestoreError(error, OperationType.GET, "artists"));

    return () => {
      unsubDashboard();
      unsubAnalytics();
      unsubRevenue();
      unsubWithdrawals();
      unsubNotifs();
      unsubReports();
      unsubSettings();
      unsubContent();
      unsubStreams();
      unsubInvites();
      unsubCreators();
    };
  }, [creatorId]);

  // 3. Interactive simulation function to showcase real-time updates instantly
  const handleSimulateEngagement = async () => {
    if (!dashboardData) return;
    try {
      const additionalPlays = Math.floor(Math.random() * 240) + 60;
      const additionalLikes = Math.floor(Math.random() * 60) + 15;
      const additionalShares = Math.floor(Math.random() * 15) + 3;
      const additionalFollowers = Math.floor(Math.random() * 12) + 2;
      const additionalGifts = Math.floor(Math.random() * 4) + 1;
      const additionalCoins = additionalGifts * 50;
      const additionalDiamonds = additionalCoins / 2;
      const additionalRev = additionalDiamonds * 0.05;

      const updatedDashboard = {
        totalPlays: (dashboardData.totalPlays || 0) + additionalPlays,
        totalLikes: (dashboardData.totalLikes || 0) + additionalLikes,
        totalShares: (dashboardData.totalShares || 0) + additionalShares,
        totalFollowers: (dashboardData.totalFollowers || 0) + additionalFollowers,
        totalGiftsReceived: (dashboardData.totalGiftsReceived || 0) + additionalGifts,
        totalCoinsEarned: (dashboardData.totalCoinsEarned || 0) + additionalCoins,
        totalDiamondsEarned: (dashboardData.totalDiamondsEarned || 0) + additionalDiamonds,
        estimatedRevenue: parseFloat(((dashboardData.estimatedRevenue || 0) + additionalRev).toFixed(2)),
        withdrawableBalance: parseFloat(((dashboardData.withdrawableBalance || 0) + (additionalRev * 0.6)).toFixed(2)),
        updatedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, "creator_dashboard", creatorId), updatedDashboard);

      // Log a real-time notification
      await addDoc(collection(db, "creator_notifications"), {
        creatorId,
        title: "Simulation Burst Event Completed",
        message: `Engagement Simulation loaded: +${additionalPlays} Streams, +${additionalLikes} Likes, +${additionalFollowers} New Followers, +${additionalGifts} Virtual Gifts (+${additionalDiamonds} Diamonds)!`,
        type: "social",
        read: false,
        createdAt: new Date().toISOString()
      });

      // Update analytics arrays
      if (analyticsData) {
        const lastFollowerCount = analyticsData.followerGrowth?.[analyticsData.followerGrowth.length - 1]?.count || 1420;
        const lastStreamCount = analyticsData.streams?.[analyticsData.streams.length - 1]?.count || 3100;
        const lastViewCount = analyticsData.views?.[analyticsData.views.length - 1]?.count || 510;
        const lastWatchCount = analyticsData.watchTime?.[analyticsData.watchTime.length - 1]?.count || 950;

        const updatedFollowers = [...(analyticsData.followerGrowth || [])];
        const updatedStreams = [...(analyticsData.streams || [])];
        const updatedViews = [...(analyticsData.views || [])];
        const updatedWatch = [...(analyticsData.watchTime || [])];

        if (updatedFollowers.length > 0) updatedFollowers[updatedFollowers.length - 1].count = lastFollowerCount + additionalFollowers;
        if (updatedStreams.length > 0) updatedStreams[updatedStreams.length - 1].count = lastStreamCount + additionalPlays;
        if (updatedViews.length > 0) updatedViews[updatedViews.length - 1].count = lastViewCount + Math.floor(additionalPlays * 0.2);
        if (updatedWatch.length > 0) updatedWatch[updatedWatch.length - 1].count = lastWatchCount + Math.floor(additionalPlays * 0.3);

        await updateDoc(doc(db, "creator_analytics", creatorId), {
          followerGrowth: updatedFollowers,
          streams: updatedStreams,
          views: updatedViews,
          watchTime: updatedWatch,
          updatedAt: new Date().toISOString()
        });
      }

      // Update revenue totals
      if (revenueData) {
        await updateDoc(doc(db, "creator_revenue", creatorId), {
          coins: (revenueData.coins || 0) + additionalCoins,
          diamonds: (revenueData.diamonds || 0) + additionalDiamonds,
          estimatedRevenue: parseFloat(((revenueData.estimatedRevenue || 0) + additionalRev).toFixed(2)),
          giftEarnings: parseFloat(((revenueData.giftEarnings || 0) + additionalRev).toFixed(2)),
          updatedAt: new Date().toISOString()
        });
      }

      showFeedback("success", `Engagement simulation dispatched successfully! Plays: +${additionalPlays}, Followers: +${additionalFollowers}, Balance: +$${(additionalRev * 0.6).toFixed(2)}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `creator_dashboard/${creatorId}`);
    }
  };

  // 4. Simulated Content Upload with real processing status bar
  const handleSimulateUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) {
      showFeedback("error", "Please provide a track or video title.");
      return;
    }

    setUploadStep("uploading");
    setUploadProgress(10);

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        if (prev < 40) {
          setUploadStep("uploading");
          return prev + 15;
        } else if (prev < 75) {
          setUploadStep("processing");
          return prev + 10;
        } else {
          setUploadStep("scanning");
          return prev + 8;
        }
      });
    }, 450);

    // Wait for the simulated upload steps to complete
    setTimeout(async () => {
      setUploadStep("completed");
      setUploadProgress(100);

      try {
        const songId = "song_" + Math.random().toString(36).substr(2, 9);
        const metadata: any = {
          id: songId,
          title: uploadTitle,
          artistId: creatorId,
          artistName: settingsData?.artistName || auth.currentUser?.displayName || "SoundStream Artist",
          genre: uploadGenre,
          coverUrl: uploadType === "video" 
            ? "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80" 
            : "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80",
          audioUrl: uploadType === "video" ? "" : "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
          videoUrl: uploadType === "video" ? "https://www.youtube.com/watch?v=dQw4w9WgXcQ" : "",
          playCount: 0,
          likes: 0,
          type: "song",
          createdAt: new Date().toISOString()
        };

        if (uploadIsDraft) {
          metadata.isDraft = true;
        }

        if (uploadScheduleDate) {
          metadata.scheduledPublishTime = uploadScheduleDate;
        }

        await setDoc(doc(db, "songs", songId), metadata);

        // Record custom notification
        await addDoc(collection(db, "creator_notifications"), {
          creatorId,
          title: uploadIsDraft ? "Draft Saved" : (uploadScheduleDate ? "Release Scheduled" : "Content Published Live"),
          message: `Your track "${uploadTitle}" was successfully processed and ${uploadIsDraft ? "saved as a draft" : (uploadScheduleDate ? "scheduled for release" : "is now live on SoundStream!")}`,
          type: "social",
          read: false,
          createdAt: new Date().toISOString()
        });

        // Increment stats count on dashboard
        if (dashboardData) {
          const isVid = uploadType === "video";
          await updateDoc(doc(db, "creator_dashboard", creatorId), {
            totalSongs: (dashboardData.totalSongs || 0) + (isVid ? 0 : 1),
            totalVideos: (dashboardData.totalVideos || 0) + (isVid ? 1 : 0),
            updatedAt: new Date().toISOString()
          });
        }

        showFeedback("success", `"${uploadTitle}" fully processed, security validated and published successfully!`);
        
        // Reset state
        setUploadTitle("");
        setUploadIsDraft(false);
        setUploadScheduleDate("");
        setTimeout(() => setUploadStep(""), 2000);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `songs`);
      }
    }, 4500);
  };

  // 5. Delete track
  const handleDeleteContent = async (id: string, title: string, isVid: boolean) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${title}"?`)) return;
    try {
      await deleteDoc(doc(db, "songs", id));
      
      if (dashboardData) {
        await updateDoc(doc(db, "creator_dashboard", creatorId), {
          totalSongs: Math.max(0, (dashboardData.totalSongs || 0) - (isVid ? 0 : 1)),
          totalVideos: Math.max(0, (dashboardData.totalVideos || 0) - (isVid ? 1 : 0)),
          updatedAt: new Date().toISOString()
        });
      }

      showFeedback("success", `"${title}" has been deleted.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `songs/${id}`);
    }
  };

  // 6. Request Withdrawal with validation checks
  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawalAmount);
    const balance = dashboardData?.withdrawableBalance || 0;

    if (isNaN(amount) || amount <= 0) {
      showFeedback("error", "Please configure a valid withdrawal amount.");
      return;
    }

    if (amount > balance) {
      showFeedback("error", `Withdrawal limit exceeded. Maximum withdrawable balance is $${balance.toFixed(2)}.`);
      return;
    }

    if (!withdrawalDetails.trim()) {
      showFeedback("error", "Please provide your payout account details.");
      return;
    }

    try {
      const withdrawalId = "withdraw_" + Math.random().toString(36).substr(2, 9);
      const diamondsUsed = Math.floor(amount * 20); // Conversion: 20 Diamonds per $1 USD

      // Add to withdrawals log
      await setDoc(doc(db, "creator_withdrawals", withdrawalId), {
        id: withdrawalId,
        creatorId,
        amount,
        diamondsExchanged: diamondsUsed,
        paymentMethod: withdrawalMethod,
        paymentDetails: withdrawalDetails,
        status: "pending",
        requestedAt: new Date().toISOString(),
        processedAt: null,
        rejectionReason: null
      });

      // Deduct balance instantly
      await updateDoc(doc(db, "creator_dashboard", creatorId), {
        withdrawableBalance: parseFloat((balance - amount).toFixed(2)),
        updatedAt: new Date().toISOString()
      });

      // Add pending totals to revenue
      if (revenueData) {
        await updateDoc(doc(db, "creator_revenue", creatorId), {
          pendingWithdrawals: parseFloat(((revenueData.pendingWithdrawals || 0) + amount).toFixed(2)),
          updatedAt: new Date().toISOString()
        });
      }

      // Add payout notification
      await addDoc(collection(db, "creator_notifications"), {
        creatorId,
        title: "Withdrawal Ticket Registered",
        message: `Your cashout request of $${amount.toFixed(2)} (${diamondsUsed} Diamonds) was submitted for administrative approval.`,
        type: "payout_update",
        read: false,
        createdAt: new Date().toISOString()
      });

      showFeedback("success", "Withdrawal request logged successfully! Transmitting ticket to admin queue.");
      setWithdrawalAmount("");
      setWithdrawalDetails("");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "creator_withdrawals");
    }
  };

  // 7. PK Battle Invite dispatch & acceptor
  const handleSendBattleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCreatorForBattle) {
      showFeedback("error", "Please select an opponent creator first.");
      return;
    }

    try {
      const opponent = creatorsList.find(c => c.id === selectedCreatorForBattle || c.uid === selectedCreatorForBattle);
      const inviteId = "invite_" + Math.random().toString(36).substr(2, 9);

      await setDoc(doc(db, "battle_invites", inviteId), {
        id: inviteId,
        senderId: creatorId,
        senderName: settingsData?.artistName || auth.currentUser?.displayName || "SoundStream Artist",
        senderPhoto: auth.currentUser?.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80",
        senderStreamId: "stream_" + creatorId,
        receiverId: selectedCreatorForBattle,
        receiverName: opponent?.artistName || "Opponent Creator",
        receiverPhoto: opponent?.profilePhoto || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80",
        receiverStreamId: "stream_" + selectedCreatorForBattle,
        status: "pending",
        duration: battleDuration,
        createdAt: new Date().toISOString()
      });

      showFeedback("success", "PK Battle Invitation sent successfully!");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "battle_invites");
    }
  };

  const handleRespondToInvite = async (inviteId: string, accept: boolean) => {
    try {
      const inviteRef = doc(db, "battle_invites", inviteId);
      if (accept) {
        const battleId = "battle_" + Math.random().toString(36).substr(2, 9);
        await updateDoc(inviteRef, {
          status: "accepted",
          acceptedBattleId: battleId
        });

        const inviteSnap = await getDoc(inviteRef);
        const inviteData = inviteSnap.data();

        // Create the active PK battle document atomically in the database
        await setDoc(doc(db, "live_battles", battleId), {
          id: battleId,
          creator1Id: inviteData?.senderId,
          creator1Name: inviteData?.senderName,
          creator1Photo: inviteData?.senderPhoto,
          creator1StreamId: inviteData?.senderStreamId,
          creator2Id: inviteData?.receiverId,
          creator2Name: inviteData?.receiverName,
          creator2Photo: inviteData?.receiverPhoto,
          creator2StreamId: inviteData?.receiverStreamId,
          creator1Score: 0,
          creator2Score: 0,
          status: "active",
          duration: inviteData?.duration || 5,
          startedAt: new Date().toISOString(),
          endsAt: new Date(Date.now() + (inviteData?.duration || 5) * 60 * 1000).toISOString()
        });

        // Trigger notification
        await addDoc(collection(db, "creator_notifications"), {
          creatorId: inviteData?.senderId,
          title: "PK Battle Started!",
          message: `${inviteData?.receiverName} accepted your PK Battle challenge! Your livestream duel is active.`,
          type: "battle_invite",
          read: false,
          createdAt: new Date().toISOString()
        });

        showFeedback("success", "PK Battle challenge ACCEPTED! Streaming side-by-side battle window is now active.");
      } else {
        await updateDoc(inviteRef, { status: "declined" });
        showFeedback("success", "PK Battle challenge declined.");
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `battle_invites/${inviteId}`);
    }
  };

  // 8. Save Creator Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, "creator_settings", creatorId), {
        artistName: profileArtistName,
        bio: profileBio,
        socialLinks: {
          instagram: profileInstagram,
          tiktok: profileTiktok,
          youtube: profileYoutube
        },
        privacySettings: { isPrivateProfile: profilePrivacy },
        notificationSettings: {
          follower: notifFollower,
          gift: notifGift,
          payment: notifPayment
        },
        paymentInfo: {
          paypalEmail: paymentPaypalEmail,
          bankAccount: paymentBankAccount
        },
        updatedAt: new Date().toISOString()
      });

      // Synchronize back to the main Artist collection for this user
      const artistQuery = query(collection(db, "artists"), where("uid", "==", creatorId));
      const artistSnap = await getDocs(artistQuery);
      if (!artistSnap.empty) {
        await updateDoc(doc(db, "artists", artistSnap.docs[0].id), {
          artistName: profileArtistName,
          bio: profileBio,
          tiktokUsername: profileTiktok
        });
      }

      showFeedback("success", "Studio Profile & Settings updated successfully!");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `creator_settings/${creatorId}`);
    }
  };

  const handleRequestVerification = async () => {
    try {
      await updateDoc(doc(db, "creator_settings", creatorId), {
        verificationStatus: "pending",
        updatedAt: new Date().toISOString()
      });
      showFeedback("success", "Identity Verification ticket sent to admin moderation queue.");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `creator_settings/${creatorId}`);
    }
  };

  // 9. Clear/Mark Read Notifications
  const handleMarkNotificationsRead = async () => {
    try {
      const unreadNotifs = notificationsList.filter(n => !n.read);
      for (const n of unreadNotifs) {
        await updateDoc(doc(db, "creator_notifications", n.id), { read: true });
      }
      showFeedback("success", "All studio notifications marked as read.");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "creator_notifications");
    }
  };

  // 10. Edit Title & Genre handlers
  const handleSaveEditContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContent) return;
    try {
      await updateDoc(doc(db, "songs", editingContent.id), {
        title: editTitle,
        genre: editGenre
      });
      showFeedback("success", "Content details updated successfully.");
      setEditingContent(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `songs/${editingContent.id}`);
    }
  };

  // Filter analytics growth values based on selector
  const getAnalyticsData = () => {
    if (!analyticsData) return [];
    // Toggle period multipliers
    const factor = analyticsPeriod === "daily" ? 0.3 : (analyticsPeriod === "weekly" ? 1.0 : (analyticsPeriod === "monthly" ? 4.2 : 12.0));
    return (analyticsData.streams || []).map((item: any, idx: number) => {
      const followers = analyticsData.followerGrowth?.[idx]?.count || 1420;
      const views = analyticsData.views?.[idx]?.count || 510;
      const watchTime = analyticsData.watchTime?.[idx]?.count || 950;
      return {
        date: item.date,
        Streams: Math.floor(item.count * factor),
        Views: Math.floor(views * factor),
        "Watch Time (Hrs)": Math.floor(watchTime * factor / 60),
        Followers: followers
      };
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 lg:p-8 font-sans">
      
      {/* Toast Feedback Notification Overlay */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-xl ${
              feedback.type === "success" 
                ? "bg-emerald-950/85 text-emerald-300 border-emerald-500/30" 
                : "bg-rose-950/85 text-rose-300 border-rose-500/30"
            }`}
          >
            {feedback.type === "success" ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 animate-bounce" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 animate-pulse" />
            )}
            <p className="text-xs font-semibold tracking-wide font-mono leading-relaxed">{feedback.text}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Studio Container */}
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Branding Panel */}
        <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-tr from-indigo-500 via-purple-600 to-rose-500 rounded-2xl flex items-center justify-center shadow-lg relative overflow-hidden group">
              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
              <Sparkles className="w-8 h-8 text-white animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl lg:text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                  SoundStream Creator Studio
                </h1>
                {settingsData?.verificationStatus === "verified" && (
                  <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> VERIFIED
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Central dashboard to publish lossless sound, track analytics, host Battles, and manage earnings.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleSimulateEngagement}
              className="flex-1 md:flex-initial bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-mono text-[10px] font-bold uppercase tracking-wider px-4 py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10"
            >
              <RefreshCw className="w-4 h-4 animate-spin-slow" />
              Simulate Live Engagement
            </button>
          </div>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT Sidebar Navigation Panel */}
          <div className="lg:col-span-3 bg-zinc-900/20 border border-white/5 p-4 rounded-3xl space-y-3">
            <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold px-3 pb-2 border-b border-white/5">
              Creator Sections
            </p>
            <div className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-none">
              {[
                { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
                { id: "content", label: "Content Manager", icon: Music },
                { id: "live", label: "Livestream & Battles", icon: Radio },
                { id: "analytics", label: "Analytics", icon: BarChart3 },
                { id: "monetization", label: "Monetization", icon: DollarSign },
                { id: "withdrawals", label: "Withdrawals", icon: CreditCard },
                { id: "notifications", label: "Notifications", icon: Bell, badge: notificationsList.filter(n => !n.read).length },
                { id: "settings", label: "Studio Settings", icon: Settings }
              ].map(tab => {
                const TabIcon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-[10.5px] font-bold uppercase tracking-wider font-mono transition-all cursor-pointer whitespace-nowrap lg:w-full ${
                      isSelected 
                        ? "bg-white/10 text-white shadow-md border-l-2 border-indigo-500 pl-3.5" 
                        : "text-zinc-400 hover:bg-white/[0.03] hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <TabIcon className={`w-4 h-4 ${isSelected ? "text-indigo-400" : "text-zinc-500"}`} />
                      <span>{tab.label}</span>
                    </div>
                    {tab.badge && tab.badge > 0 ? (
                      <span className="bg-rose-600 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full ml-2">
                        {tab.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT Content Display Pane */}
          <div className="lg:col-span-9 space-y-6">
            
            {/* 1. OVERVIEW DASHBOARD */}
            {activeTab === "dashboard" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
                  {[
                    { label: "Followers", value: dashboardData?.totalFollowers || 0, change: "+14.2%" },
                    { label: "Following", value: dashboardData?.totalFollowing || 0, change: "Flat" },
                    { label: "Total Tracks", value: dashboardData?.totalSongs || 0, change: "+1" },
                    { label: "Total Videos", value: dashboardData?.totalVideos || 0, change: "New" },
                    { label: "Total Lives", value: dashboardData?.totalLivestreams || 0, change: "Active" },
                    { label: "Total Plays", value: dashboardData?.totalPlays || 0, change: "+1.2k" },
                    { label: "Total Likes", value: dashboardData?.totalLikes || 0, change: "+410" },
                    { label: "Total Comments", value: dashboardData?.totalComments || 0, change: "+45" },
                    { label: "Shares", value: dashboardData?.totalShares || 0, change: "+89" },
                    { label: "Playlist Saves", value: dashboardData?.totalPlaylistSaves || 0, change: "+120" },
                    { label: "Gifts Received", value: dashboardData?.totalGiftsReceived || 0, change: "+18" },
                    { label: "Coins Earned", value: dashboardData?.totalCoinsEarned || 0, change: "+2k" },
                    { label: "Diamonds Earned", value: dashboardData?.totalDiamondsEarned || 0, change: "+1k" },
                    { label: "Estimated Revenue", value: `$${(dashboardData?.estimatedRevenue || 0).toFixed(2)}`, change: "+$32.50" },
                    { label: "Withdrawable", value: `$${(dashboardData?.withdrawableBalance || 0).toFixed(2)}`, change: "Available", highlight: true }
                  ].map((stat, idx) => (
                    <div 
                      key={idx}
                      className={`p-4 border rounded-2xl relative overflow-hidden flex flex-col justify-between ${
                        stat.highlight 
                          ? "bg-gradient-to-b from-indigo-950/40 to-indigo-900/10 border-indigo-500/20 shadow-lg shadow-indigo-500/5" 
                          : "bg-zinc-900/20 border-white/5"
                      }`}
                    >
                      <div>
                        <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold">
                          {stat.label}
                        </p>
                        <p className={`font-sans font-bold text-lg xl:text-xl tracking-tight mt-1 ${stat.highlight ? "text-indigo-300" : "text-white"}`}>
                          {typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/[0.02]">
                        <span className="font-mono text-[8px] text-zinc-500">REALTIME</span>
                        <span className={`font-mono text-[8.5px] font-bold ${stat.change.startsWith("+") ? "text-emerald-400" : "text-zinc-400"}`}>
                          {stat.change}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Sub-grid with quick analytics & live stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Top Tracks Card */}
                  <div className="bg-zinc-900/20 border border-white/5 p-5 rounded-3xl space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-indigo-400" />
                        Top Performing Sounds
                      </h3>
                      <button onClick={() => setActiveTab("analytics")} className="text-[9px] font-mono text-zinc-500 hover:text-white uppercase tracking-wider font-bold">View Reports</button>
                    </div>
                    <div className="space-y-2">
                      {(analyticsData?.topSongs || []).map((song: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white/[0.01] border border-white/5 rounded-xl">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs text-zinc-500 font-bold">#{idx + 1}</span>
                            <div>
                              <p className="text-xs font-bold text-zinc-200">{song.title}</p>
                              <p className="font-mono text-[9px] text-zinc-500">Afrobeats • Lossless</p>
                            </div>
                          </div>
                          <span className="font-mono text-xs font-bold text-indigo-300">
                            {song.playCount.toLocaleString()} Plays
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Active Livestreams Indicator */}
                  <div className="bg-zinc-900/20 border border-white/5 p-5 rounded-3xl space-y-4 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                        <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
                        Live Streaming status
                      </h3>
                      {liveStreams.length > 0 ? (
                        <div className="mt-4 p-4 bg-rose-950/10 border border-rose-500/20 rounded-2xl space-y-2">
                          <div className="flex items-center gap-2 text-rose-400 text-[10px] font-mono font-bold">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                            LIVE NOW
                          </div>
                          <p className="text-sm font-bold text-zinc-100">{liveStreams[0].title}</p>
                          <p className="font-mono text-[10px] text-zinc-400">
                            Viewers: {liveStreams[0].viewerCount || 0} • Coins: {liveStreams[0].coinCount || 0}
                          </p>
                        </div>
                      ) : (
                        <div className="mt-4 py-8 text-center border border-dashed border-white/10 rounded-2xl space-y-2">
                          <p className="font-mono text-xs text-zinc-500">No active broadcasts currently running.</p>
                          <button
                            onClick={() => setActiveTab("live")}
                            className="bg-white/5 hover:bg-white/10 text-white font-mono text-[9px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border border-white/5 transition-colors cursor-pointer"
                          >
                            Go Live Session
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400">
                      <span>Total battle wins: <strong>4</strong></span>
                      <span>Losses: <strong>2</strong></span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. CONTENT MANAGEMENT */}
            {activeTab === "content" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Upload Section */}
                <div className="bg-zinc-900/20 border border-white/5 p-6 rounded-3xl space-y-4">
                  <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-indigo-400" />
                    Upload & Publish Content
                  </h3>

                  <form onSubmit={handleSimulateUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <label className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">Content Type</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setUploadType("song")}
                            className={`flex-1 font-mono text-[10px] font-bold uppercase tracking-wider py-2 rounded-xl border transition-colors cursor-pointer ${
                              uploadType === "song" 
                                ? "bg-white/10 text-white border-white/20" 
                                : "bg-transparent text-zinc-500 border-white/5 hover:bg-white/[0.02]"
                            }`}
                          >
                            Music Track
                          </button>
                          <button
                            type="button"
                            onClick={() => setUploadType("video")}
                            className={`flex-1 font-mono text-[10px] font-bold uppercase tracking-wider py-2 rounded-xl border transition-colors cursor-pointer ${
                              uploadType === "video" 
                                ? "bg-white/10 text-white border-white/20" 
                                : "bg-transparent text-zinc-500 border-white/5 hover:bg-white/[0.02]"
                            }`}
                          >
                            Video mix / Short
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">Title</label>
                        <input
                          type="text"
                          placeholder="My New Lossless Session"
                          value={uploadTitle}
                          onChange={(e) => setUploadTitle(e.target.value)}
                          className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">Primary Genre</label>
                        <select
                          value={uploadGenre}
                          onChange={(e) => setUploadGenre(e.target.value)}
                          className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 font-mono"
                        >
                          {["Afrobeats", "Amapiano", "Highlife", "Hip Hop", "Reggae", "Gospel", "Fuji"].map(genre => (
                            <option key={genre} value={genre}>{genre}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="upload_draft"
                            checked={uploadIsDraft}
                            onChange={(e) => setUploadIsDraft(e.target.checked)}
                            className="rounded border-white/10 bg-zinc-950 text-indigo-600 focus:ring-indigo-500"
                          />
                          <label htmlFor="upload_draft" className="font-mono text-xs text-zinc-400 cursor-pointer">
                            Save as Draft instead of publishing
                          </label>
                        </div>

                        <div>
                          <label className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">Schedule Future Publishing (Optional)</label>
                          <input
                            type="datetime-local"
                            value={uploadScheduleDate}
                            onChange={(e) => setUploadScheduleDate(e.target.value)}
                            className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-zinc-400 focus:outline-none focus:border-indigo-500 font-mono"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={uploadStep === "uploading" || uploadStep === "processing" || uploadStep === "scanning"}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-mono text-[10px] font-bold uppercase tracking-wider py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        {uploadIsDraft ? "Save Draft Record" : "Simulate Process & Publish"}
                      </button>
                    </div>
                  </form>

                  {/* Processing Status Bar */}
                  {uploadStep && (
                    <div className="bg-zinc-950/60 p-4 rounded-2xl border border-white/5 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-mono font-bold uppercase text-indigo-400 flex items-center gap-2">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          {uploadStep === "uploading" && "Transmitting Audio/Video Layers..."}
                          {uploadStep === "processing" && "Decoding FLAC/Lossless Quality..."}
                          {uploadStep === "scanning" && "Running Content ID & Copyright Guard Scan..."}
                          {uploadStep === "completed" && "Successfully Logged!"}
                        </span>
                        <span className="font-mono font-bold text-zinc-400">{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Subtabs for content lists */}
                <div className="space-y-4">
                  <div className="border-b border-white/5 pb-2">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">Your Catalog</h3>
                  </div>

                  <div className="space-y-2">
                    {/* Live Catalog */}
                    <div className="space-y-2">
                      <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Active Releases ({contentList.length})</p>
                      {contentList.length === 0 ? (
                        <div className="py-8 text-center border border-dashed border-white/5 rounded-2xl">
                          <p className="font-mono text-xs text-zinc-600">No active releases in your catalog yet.</p>
                        </div>
                      ) : (
                        contentList.map(item => (
                          <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-zinc-900/10 border border-white/5 rounded-2xl gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-zinc-900 rounded-lg overflow-hidden shrink-0">
                                <img src={item.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-zinc-200">{item.title}</p>
                                <p className="font-mono text-[9px] text-zinc-500">{item.genre} • {item.videoUrl ? "Video Mix" : "Lossless Sound"}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 justify-between sm:justify-end">
                              <div className="text-left sm:text-right font-mono text-[10px] text-zinc-400">
                                <p>Plays: <strong>{item.playCount || 0}</strong></p>
                                <p>Likes: <strong>{item.likes || 0}</strong></p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingContent(item);
                                    setEditTitle(item.title);
                                    setEditGenre(item.genre);
                                  }}
                                  className="p-2 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg border border-white/5 transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteContent(item.id, item.title, !!item.videoUrl)}
                                  className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/10 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Drafts */}
                    {draftsList.length > 0 && (
                      <div className="space-y-2 mt-4">
                        <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Drafts ({draftsList.length})</p>
                        {draftsList.map(item => (
                          <div key={item.id} className="flex items-center justify-between p-4 bg-zinc-900/10 border border-white/5 rounded-2xl">
                            <div className="flex items-center gap-3">
                              <span className="bg-zinc-800 text-zinc-400 font-mono text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">Draft</span>
                              <p className="text-xs font-bold text-zinc-300">{item.title}</p>
                            </div>
                            <button
                              onClick={() => handleDeleteContent(item.id, item.title, !!item.videoUrl)}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/10 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Scheduled Releases */}
                    {scheduledList.length > 0 && (
                      <div className="space-y-2 mt-4">
                        <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Scheduled Releases ({scheduledList.length})</p>
                        {scheduledList.map(item => (
                          <div key={item.id} className="flex items-center justify-between p-4 bg-zinc-900/10 border border-white/5 rounded-2xl">
                            <div className="flex items-center gap-3">
                              <Calendar className="w-4 h-4 text-amber-500" />
                              <div>
                                <p className="text-xs font-bold text-zinc-300">{item.title}</p>
                                <p className="font-mono text-[9px] text-zinc-500">Scheduled for {new Date(item.scheduledPublishTime).toLocaleString()}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteContent(item.id, item.title, !!item.videoUrl)}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/10 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Edit Dialog Modal */}
                <AnimatePresence>
                  {editingContent && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-md space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-300">Edit Track Details</h4>
                          <button onClick={() => setEditingContent(null)} className="text-zinc-500 hover:text-white transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <form onSubmit={handleSaveEditContent} className="space-y-3">
                          <div>
                            <label className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">Title</label>
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                            />
                          </div>

                          <div>
                            <label className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">Genre</label>
                            <select
                              value={editGenre}
                              onChange={(e) => setEditGenre(e.target.value)}
                              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                            >
                              {["Afrobeats", "Amapiano", "Highlife", "Hip Hop", "Reggae", "Gospel", "Fuji"].map(genre => (
                                <option key={genre} value={genre}>{genre}</option>
                              ))}
                            </select>
                          </div>

                          <div className="flex gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setEditingContent(null)}
                              className="flex-1 bg-white/5 hover:bg-white/10 text-white font-mono text-[10px] font-bold py-2 rounded-xl border border-white/5 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-[10px] font-bold py-2 rounded-xl cursor-pointer"
                            >
                              Save Details
                            </button>
                          </div>
                        </form>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* 3. LIVESTREAM & BATTLES */}
            {activeTab === "live" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* PK Battle Invitations Setup */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Sent Invite Panel */}
                  <div className="bg-zinc-900/20 border border-white/5 p-5 rounded-3xl space-y-4">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                      <Flame className="w-4 h-4 text-orange-500" />
                      Start a PK Battle Duel
                    </h3>

                    <form onSubmit={handleSendBattleInvite} className="space-y-3">
                      <div>
                        <label className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 block mb-1 font-bold">Select Active Creator</label>
                        <select
                          value={selectedCreatorForBattle}
                          onChange={(e) => setSelectedCreatorForBattle(e.target.value)}
                          className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 font-mono"
                        >
                          <option value="">-- Choose Competitor --</option>
                          {creatorsList.map(c => (
                            <option key={c.uid} value={c.uid}>{c.artistName} ({c.followersCount || 0} fans)</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 block mb-1 font-bold">Battle Duration</label>
                        <select
                          value={battleDuration}
                          onChange={(e) => setBattleDuration(parseInt(e.target.value, 10))}
                          className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 font-mono"
                        >
                          {[1, 2, 3, 5, 10, 15].map(m => (
                            <option key={m} value={m}>{m} Minutes</option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-orange-600 to-rose-600 hover:from-orange-700 hover:to-rose-700 text-white font-mono text-[10px] font-bold uppercase tracking-wider py-2.5 rounded-xl cursor-pointer shadow-lg shadow-rose-500/10"
                      >
                        Transmit PK Challenge Invite
                      </button>
                    </form>
                  </div>

                  {/* Invitations Inbox */}
                  <div className="bg-zinc-900/20 border border-white/5 p-5 rounded-3xl space-y-4">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-indigo-400" />
                      PK Battle Invitations Inbox
                    </h3>

                    <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                      {battleInvites.filter(item => item.receiverId === creatorId && item.status === "pending").length === 0 ? (
                        <div className="py-8 text-center border border-dashed border-white/5 rounded-2xl">
                          <p className="font-mono text-[10px] text-zinc-600">No pending challenge invites currently.</p>
                        </div>
                      ) : (
                        battleInvites.filter(item => item.receiverId === creatorId && item.status === "pending").map(invite => (
                          <div key={invite.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden shrink-0">
                                <img src={invite.senderPhoto} alt="Challenger" className="w-full h-full object-cover" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-zinc-200">{invite.senderName} challenges you!</p>
                                <p className="font-mono text-[9px] text-zinc-500">Duration: {invite.duration} mins</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleRespondToInvite(invite.id, false)}
                                className="flex-1 bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white font-mono text-[9px] font-bold uppercase py-1.5 rounded-lg border border-white/5 cursor-pointer"
                              >
                                Decline
                              </button>
                              <button
                                onClick={() => handleRespondToInvite(invite.id, true)}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-[9px] font-bold uppercase py-1.5 rounded-lg cursor-pointer"
                              >
                                Accept Battle
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Sent Invitations Tracker Status */}
                {battleInvites.filter(item => item.senderId === creatorId).length > 0 && (
                  <div className="bg-zinc-900/20 border border-white/5 p-5 rounded-3xl space-y-3">
                    <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">Sent Challenges Log</h4>
                    <div className="space-y-2">
                      {battleInvites.filter(item => item.senderId === creatorId).map(invite => (
                        <div key={invite.id} className="flex items-center justify-between p-3 bg-white/[0.01] border border-white/5 rounded-xl">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-zinc-600" />
                            <p className="text-xs text-zinc-300">Challenge sent to <strong>{invite.receiverName}</strong></p>
                          </div>
                          <span className={`font-mono text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                            invite.status === "pending" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                            invite.status === "accepted" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                            "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}>
                            {invite.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* 4. ANALYTICS */}
            {activeTab === "analytics" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Period controls */}
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">Audience Metrics</h3>
                  <div className="flex gap-1 bg-zinc-950 border border-white/5 rounded-xl p-1">
                    {["daily", "weekly", "monthly", "yearly"].map(period => (
                      <button
                        key={period}
                        onClick={() => setAnalyticsPeriod(period as any)}
                        className={`font-mono text-[9px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                          analyticsPeriod === period 
                            ? "bg-white/10 text-white" 
                            : "text-zinc-500 hover:text-white"
                        }`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Graph Visualization */}
                <div className="bg-zinc-900/20 border border-white/5 p-5 rounded-3xl space-y-4">
                  <p className="font-mono text-[10px] font-bold uppercase text-indigo-400">Streams & Fans Growth Over Time</p>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={getAnalyticsData()}>
                        <defs>
                          <linearGradient id="colorStreams" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ec4899" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" stroke="#4b5563" fontSize={9} fontClassName="font-mono" />
                        <YAxis stroke="#4b5563" fontSize={9} fontClassName="font-mono" />
                        <Tooltip contentStyle={{ backgroundColor: "#09090b", borderColor: "#1f2937", borderRadius: 12 }} labelClassName="font-mono text-zinc-400 text-xs" />
                        <Area type="monotone" dataKey="Streams" stroke="#6366f1" fillOpacity={1} fill="url(#colorStreams)" strokeWidth={2} />
                        <Area type="monotone" dataKey="Followers" stroke="#ec4899" fillOpacity={1} fill="url(#colorFollowers)" strokeWidth={2} />
                        <Legend wrapperStyle={{ fontSize: 9, fontFamily: "monospace" }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Distributions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Countries */}
                  <div className="bg-zinc-900/20 border border-white/5 p-5 rounded-3xl space-y-3">
                    <p className="font-mono text-[10px] font-bold uppercase text-zinc-400">Top Listener Countries</p>
                    <div className="space-y-2">
                      {(analyticsData?.countries || []).map((c: any, idx: number) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-zinc-300">{c.country}</span>
                            <span className="text-zinc-400">{c.count}%</span>
                          </div>
                          <div className="w-full h-1 bg-zinc-950 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500" style={{ width: `${c.count}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Devices & Sources */}
                  <div className="bg-zinc-900/20 border border-white/5 p-5 rounded-3xl space-y-3">
                    <p className="font-mono text-[10px] font-bold uppercase text-zinc-400">Traffic Sources</p>
                    <div className="space-y-2">
                      {(analyticsData?.trafficSources || []).map((s: any, idx: number) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-zinc-300">{s.source}</span>
                            <span className="text-zinc-400">{s.count}%</span>
                          </div>
                          <div className="w-full h-1 bg-zinc-950 rounded-full overflow-hidden">
                            <div className="h-full bg-rose-500" style={{ width: `${s.count}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 5. MONETIZATION */}
            {activeTab === "monetization" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="border-b border-white/5 pb-2">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">Earnings & Financial Statements</h3>
                </div>

                {/* Monetization overview cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-zinc-900/20 border border-white/5 p-5 rounded-3xl space-y-2">
                    <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Total Accumulated Revenue</p>
                    <p className="text-2xl font-bold tracking-tight text-white">${(revenueData?.estimatedRevenue || 0).toFixed(2)}</p>
                    <p className="font-mono text-[8.5px] text-zinc-500">Gross revenue before tax/fees</p>
                  </div>

                  <div className="bg-zinc-900/20 border border-white/5 p-5 rounded-3xl space-y-2">
                    <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Completed Payouts</p>
                    <p className="text-2xl font-bold tracking-tight text-emerald-400">${(revenueData?.completedWithdrawals || 0).toFixed(2)}</p>
                    <p className="font-mono text-[8.5px] text-zinc-500">Transferred safely to accounts</p>
                  </div>

                  <div className="bg-zinc-900/20 border border-white/5 p-5 rounded-3xl space-y-2">
                    <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Pending Approvals</p>
                    <p className="text-2xl font-bold tracking-tight text-amber-400">${(revenueData?.pendingWithdrawals || 0).toFixed(2)}</p>
                    <p className="font-mono text-[8.5px] text-zinc-500">In administrative audit queue</p>
                  </div>
                </div>

                {/* Earnings breakdown table */}
                <div className="bg-zinc-900/20 border border-white/5 p-5 rounded-3xl space-y-4">
                  <p className="font-mono text-[10px] font-bold uppercase text-indigo-400">Revenue Breakdown by Channel</p>
                  <div className="space-y-2">
                    {[
                      { channel: "Virtual Gifts (Live Streams)", amount: revenueData?.giftEarnings || 0, percent: "42%" },
                      { channel: "Fan Subscriptions", amount: revenueData?.subscriptionEarnings || 0, percent: "31%" },
                      { channel: "Livestream Streaming Incentives", amount: revenueData?.liveEarnings || 0, percent: "15%" },
                      { channel: "Music Streaming Royalties", amount: revenueData?.musicEarnings || 0, percent: "8%" },
                      { channel: "Video Ads Share", amount: revenueData?.videoEarnings || 0, percent: "4%" }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3.5 bg-white/[0.01] border border-white/5 rounded-xl text-xs font-mono">
                        <span className="text-zinc-300">{item.channel}</span>
                        <div className="text-right">
                          <span className="text-zinc-200 font-bold">${parseFloat(String(item.amount)).toFixed(2)}</span>
                          <span className="text-zinc-500 text-[10px] ml-2">({item.percent})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 6. WITHDRAWALS */}
            {activeTab === "withdrawals" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Withdrawal Request Form */}
                  <div className="bg-zinc-900/20 border border-white/5 p-6 rounded-3xl space-y-4">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300">File a Payout Request</h3>

                    <form onSubmit={handleRequestWithdrawal} className="space-y-3">
                      <div>
                        <label className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">
                          Amount (USD) - Max: ${(dashboardData?.withdrawableBalance || 0).toFixed(2)}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="50.00"
                          value={withdrawalAmount}
                          onChange={(e) => setWithdrawalAmount(e.target.value)}
                          className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">Payout Gateway</label>
                        <select
                          value={withdrawalMethod}
                          onChange={(e) => setWithdrawalMethod(e.target.value as any)}
                          className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                        >
                          <option value="PayPal">PayPal Account</option>
                          <option value="Stripe">Stripe Direct</option>
                          <option value="Bank Transfer">Bank Wire Transfer</option>
                        </select>
                      </div>

                      <div>
                        <label className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">Gateway Details</label>
                        <input
                          type="text"
                          placeholder={withdrawalMethod === "PayPal" ? "paypal_email@gmail.com" : "IBAN / Sort Code & Account No."}
                          value={withdrawalDetails}
                          onChange={(e) => setWithdrawalDetails(e.target.value)}
                          className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-mono text-[10px] font-bold uppercase tracking-wider py-2.5 rounded-xl cursor-pointer"
                      >
                        File Withdrawal Ticket
                      </button>
                    </form>
                  </div>

                  {/* History of withdrawals */}
                  <div className="bg-zinc-900/20 border border-white/5 p-6 rounded-3xl space-y-4">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300">Transaction Logs</h3>

                    <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                      {withdrawalsList.length === 0 ? (
                        <div className="py-8 text-center border border-dashed border-white/5 rounded-2xl">
                          <p className="font-mono text-[10px] text-zinc-600">No withdrawal records verified.</p>
                        </div>
                      ) : (
                        withdrawalsList.map(item => (
                          <div key={item.id} className="p-3 bg-white/[0.01] border border-white/5 rounded-xl flex items-center justify-between text-xs font-mono">
                            <div>
                              <p className="text-zinc-200 font-bold">${parseFloat(String(item.amount)).toFixed(2)}</p>
                              <p className="text-[10px] text-zinc-500">{item.paymentMethod} • {new Date(item.requestedAt).toLocaleDateString()}</p>
                            </div>
                            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                              item.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                              item.status === "pending" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                              "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}>
                              {item.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 7. NOTIFICATIONS */}
            {activeTab === "notifications" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">Activity & Earnings Notifications Inbox</h3>
                  {notificationsList.some(n => !n.read) && (
                    <button
                      onClick={handleMarkNotificationsRead}
                      className="text-[9px] font-mono font-bold uppercase tracking-wider text-indigo-400 hover:text-indigo-300 cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {notificationsList.length === 0 ? (
                    <div className="py-12 text-center border border-dashed border-white/5 rounded-3xl">
                      <p className="font-mono text-xs text-zinc-600">No new notifications in studio logs.</p>
                    </div>
                  ) : (
                    notificationsList.map(notif => (
                      <div 
                        key={notif.id} 
                        className={`p-4 border rounded-2xl flex items-start gap-3.5 transition-colors ${
                          notif.read 
                            ? "bg-zinc-900/10 border-white/5 opacity-70" 
                            : "bg-indigo-950/10 border-indigo-500/20 shadow-sm"
                        }`}
                      >
                        <span className={`p-2 rounded-xl border shrink-0 ${
                          notif.type === "gift" ? "bg-orange-500/10 border-orange-500/20 text-orange-400" :
                          notif.type === "follower" ? "bg-pink-500/10 border-pink-500/20 text-pink-400" :
                          notif.type === "payout_update" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                          "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                        }`}>
                          {notif.type === "gift" ? <Flame className="w-4 h-4" /> :
                           notif.type === "follower" ? <UserPlus className="w-4 h-4" /> :
                           notif.type === "payout_update" ? <CreditCard className="w-4 h-4" /> :
                           <MessageSquare className="w-4 h-4" />}
                        </span>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-zinc-200">{notif.title}</p>
                          <p className="text-xs text-zinc-400">{notif.message}</p>
                          <p className="font-mono text-[9px] text-zinc-500 pt-1">
                            {new Date(notif.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* 8. STUDIO SETTINGS */}
            {activeTab === "settings" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <form onSubmit={handleSaveSettings} className="space-y-6">
                  {/* Identity Verification Ticket */}
                  <div className="bg-zinc-900/20 border border-white/5 p-6 rounded-3xl space-y-4">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300">Creator Verification Badge</h3>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white/[0.01] border border-white/5 rounded-2xl">
                      <div>
                        <p className="text-xs font-bold text-zinc-200">Request blue verified artist badge</p>
                        <p className="text-[10px] text-zinc-500 leading-relaxed mt-1">Verification requires uploading government ID and verifies your exclusive ownership of published lossless audio sounds.</p>
                      </div>
                      {settingsData?.verificationStatus === "verified" ? (
                        <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-mono font-bold uppercase px-3 py-1 rounded-full flex items-center gap-1 shrink-0">
                          <ShieldCheck className="w-4 h-4 animate-pulse" /> Verified Artist
                        </span>
                      ) : settingsData?.verificationStatus === "pending" ? (
                        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono font-bold uppercase px-3 py-1 rounded-full shrink-0">
                          Pending Audit
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleRequestVerification}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-xl transition-colors cursor-pointer shrink-0"
                        >
                          Request Verification Badge
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Profile Edit */}
                  <div className="bg-zinc-900/20 border border-white/5 p-6 rounded-3xl space-y-4">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300">Studio Profile Details</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">Artist Name</label>
                        <input
                          type="text"
                          value={profileArtistName}
                          onChange={(e) => setProfileArtistName(e.target.value)}
                          className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">Linked TikTok Username</label>
                        <input
                          type="text"
                          value={profileTiktok}
                          onChange={(e) => setProfileTiktok(e.target.value)}
                          className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">Bio / Profile Tagline</label>
                        <textarea
                          rows={3}
                          value={profileBio}
                          onChange={(e) => setProfileBio(e.target.value)}
                          className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Gateways Settings */}
                  <div className="bg-zinc-900/20 border border-white/5 p-6 rounded-3xl space-y-4">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300">Payout Credentials</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">Default PayPal Account Email</label>
                        <input
                          type="email"
                          value={paymentPaypalEmail}
                          onChange={(e) => setPaymentPaypalEmail(e.target.value)}
                          className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">Default Bank Wire Account Details</label>
                        <input
                          type="text"
                          value={paymentBankAccount}
                          onChange={(e) => setPaymentBankAccount(e.target.value)}
                          className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-[10px] font-bold uppercase tracking-wider py-2.5 rounded-xl cursor-pointer"
                  >
                    Save All Studio Preferences
                  </button>
                </form>
              </motion.div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
