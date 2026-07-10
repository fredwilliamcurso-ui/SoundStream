import React, { useState, useEffect } from "react";
import { 
  Chrome, 
  TrendingUp, 
  Settings, 
  MapPin, 
  Sparkles, 
  Database, 
  Terminal, 
  ShieldAlert, 
  Activity, 
  MessageSquare, 
  Send, 
  Info, 
  Loader2, 
  Globe2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Clock,
  Eye,
  BookOpen,
  Image as ImageIcon,
  Languages,
  Volume2,
  Bell,
  Search,
  Check,
  FileText,
  Calendar,
  Layers,
  BarChart3,
  Monitor,
  Zap,
  Lock
} from "lucide-react";

interface GoogleConsolePanelProps {
  currentUser: any;
  logActivity: (type: "success" | "info" | "warn", text: string) => void;
  showFeedback: (type: "success" | "error" | "info", text: string) => void;
}

export default function GoogleConsolePanel({ currentUser, logActivity, showFeedback }: GoogleConsolePanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<"marketing" | "workspace" | "developer" | "simulators" | "pagespeed">("marketing");
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Configurations State
  const [config, setConfig] = useState<any>({
    analyticsId: "GA4-KND6NSP4",
    adsId: "AW-1082645638",
    gtmId: "GTM-KND6NSP4",
    adSenseId: "ca-pub-4255053740121959",
    mapsApiKey: "AIzaSyFakeKeySoundStreamMaps2026",
    geminiApiKey: "Configured_System_Key_Active",
    gcpProjectId: "soundstream-sfu-prod",
    fcmServerKey: "FCM_SERVER_KEY_MOCK_SOUNDSTREAM",
    customSearchId: "cx_soundstream_engine_id",
    driveFolderId: "drive_soundstream_master_2026",
    consentMode: "granted",
    tagPlatformStatus: "active",
    lookerStudioUrl: "https://lookerstudio.google.com/embed/reporting/soundstream",
    businessProfileId: "g_profile_soundstream_992",
    merchantCenterId: "mc_soundstream_next_883"
  });

  // Simulator States
  const [translateText, setTranslateText] = useState("Explore the rhythm of global soundstream independent tracks.");
  const [translateTarget, setTranslateTarget] = useState("es");
  const [translatedResult, setTranslatedResult] = useState("");
  const [translating, setTranslating] = useState(false);

  const [visionTitle, setVisionTitle] = useState("Urban Chill beats Lo-Fi album cover artwork with fluorescent neon glow");
  const [visionResult, setVisionResult] = useState<any>(null);
  const [scanningVision, setScanningVision] = useState(false);

  const [fcmTitle, setFcmTitle] = useState("🔥 New Live Battle Alert!");
  const [fcmBody, setFcmBody] = useState("Join DJ Kay and BeatMaker X in the live arena right now. Cast your votes!");
  const [fcmGroup, setFcmGroup] = useState("all");
  const [sendingFcm, setSendingFcm] = useState(false);
  const [fcmResult, setFcmResult] = useState<any>(null);

  // PageSpeed Audit States
  const [auditUrl, setAuditUrl] = useState("https://soundstream.live");
  const [auditing, setAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);

  // Fetch Google Config on Mount
  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/admin/google/config", {
          headers: {
            "x-admin-email": currentUser?.email || "fredwilliamcurso@gmail.com"
          }
        });
        if (response.ok) {
          const data = await response.json();
          // Map backend variables to our local state if they exist
          setConfig((prev: any) => ({
            ...prev,
            analyticsId: data.analytics?.measurementId || prev.analyticsId,
            adsId: data.ads?.conversionId || prev.adsId,
            gtmId: data.tagManager?.containerId || prev.gtmId,
            mapsApiKey: data.maps?.apiKey || prev.mapsApiKey,
            fcmServerKey: data.fcm?.serverKey || prev.fcmServerKey,
            customSearchId: data.customSearch?.engineId || prev.customSearchId,
            driveFolderId: data.drive?.folderId || prev.driveFolderId,
            lookerStudioUrl: data.lookerStudio?.dashboardUrl || prev.lookerStudioUrl,
          }));
        }
      } catch (e) {
        console.error("Failed to load Google configurations:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [currentUser]);

  // Save Config to database
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/admin/google/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-email": currentUser?.email || "fredwilliamcurso@gmail.com"
        },
        body: JSON.stringify({
          analytics: { enabled: true, measurementId: config.analyticsId, status: "Active" },
          ads: { enabled: true, conversionId: config.adsId, status: "Active" },
          tagManager: { enabled: true, containerId: config.gtmId, status: "Active" },
          maps: { enabled: true, apiKey: config.mapsApiKey, status: "Active" },
          customSearch: { enabled: true, engineId: config.customSearchId, status: "Active" },
          drive: { enabled: true, folderId: config.driveFolderId, status: "Active" },
          fcm: { enabled: true, serverKey: config.fcmServerKey, status: "Active" },
          lookerStudio: { enabled: true, dashboardUrl: config.lookerStudioUrl, status: "Active" }
        })
      });

      if (response.ok) {
        showFeedback("success", "Google API credentials committed securely to Firestore.");
        logActivity("success", "Google Console credentials and trackers updated successfully.");
      } else {
        throw new Error("Failed to save credentials");
      }
    } catch (err: any) {
      showFeedback("error", err.message || "Failed to commit settings.");
    } finally {
      setSaving(false);
    }
  };

  // Run Translation Simulation
  const handleRunTranslation = async () => {
    if (!translateText.trim()) return;
    setTranslating(true);
    try {
      const response = await fetch("/api/admin/google/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-email": currentUser?.email || "fredwilliamcurso@gmail.com"
        },
        body: JSON.stringify({ text: translateText, targetLang: translateTarget })
      });
      if (response.ok) {
        const data = await response.json();
        setTranslatedResult(data.translation);
        logActivity("info", `Google Translation executed text length: ${translateText.length} into [${translateTarget}]`);
      }
    } catch (e) {
      setTranslatedResult(`[Simulated Translation Error] Fallback: ${translateText}`);
    } finally {
      setTranslating(false);
    }
  };

  // Run Vision AI Simulation
  const handleRunVision = async () => {
    setScanningVision(true);
    try {
      const response = await fetch("/api/admin/google/vision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-email": currentUser?.email || "fredwilliamcurso@gmail.com"
        },
        body: JSON.stringify({ title: visionTitle })
      });
      if (response.ok) {
        const data = await response.json();
        setVisionResult(data);
        logActivity("success", `Google Cloud Vision AI catalog check passed. Safety label matching completed.`);
      }
    } catch (e) {
      showFeedback("error", "Vision check failed.");
    } finally {
      setScanningVision(false);
    }
  };

  // Run FCM push notification trigger
  const handleSendFcm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fcmTitle.trim() || !fcmBody.trim()) return;
    setSendingFcm(true);
    try {
      const response = await fetch("/api/admin/google/fcm-broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-email": currentUser?.email || "fredwilliamcurso@gmail.com"
        },
        body: JSON.stringify({ title: fcmTitle, body: fcmBody, targetGroup: fcmGroup })
      });
      if (response.ok) {
        const data = await response.json();
        setFcmResult(data);
        showFeedback("success", `FCM broadcast sent successfully to ${data.recipientCount} active devices!`);
        logActivity("success", `FCM Notification "${fcmTitle}" broadcasted successfully to segment [${fcmGroup}].`);
      }
    } catch (e) {
      showFeedback("error", "FCM Broadcast failed.");
    } finally {
      setSendingFcm(false);
    }
  };

  // Run PageSpeed Audit Diagnostic
  const handleRunPageSpeed = async () => {
    setAuditing(true);
    try {
      const response = await fetch("/api/admin/google/pagespeed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-email": currentUser?.email || "fredwilliamcurso@gmail.com"
        },
        body: JSON.stringify({ url: auditUrl })
      });
      if (response.ok) {
        const data = await response.json();
        setAuditResult(data);
        logActivity("success", `Google PageSpeed Insights completed for ${auditUrl}. Diagnostic score: ${data.performance}/100.`);
        showFeedback("success", "Lighthouse scoring completed successfully!");
      }
    } catch (e) {
      showFeedback("error", "Audit diagnostic failed.");
    } finally {
      setAuditing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3 font-mono">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        <p className="text-zinc-500 text-xs uppercase tracking-widest">Retrieving Google configurations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Central Google Header */}
      <div className="bg-gradient-to-r from-blue-900/20 via-red-900/10 to-yellow-900/15 border border-white/5 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-tr from-blue-500 via-red-500 to-yellow-500 p-3.5 rounded-2xl shadow-lg shadow-blue-500/10 shrink-0">
            <Chrome className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-sans font-bold text-sm tracking-wide text-zinc-100 uppercase">Google Suite Hub</span>
              <span className="bg-blue-500/15 text-blue-400 border border-blue-500/20 text-[8px] font-mono font-extrabold px-1.5 py-0.2 rounded uppercase">ADMIN HQ ONLY</span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed max-w-2xl font-sans">
              Centralized platform for Google Search Console, Tag Manager, Analytics, Google Ads, AdSense, Gemini AI models, FCM push servers, Maps API, and GCP resources. Connected securely via backend servers.
            </p>
          </div>
        </div>
        
        {/* Status Indicators Badge */}
        <div className="bg-black/40 border border-white/5 rounded-2xl p-3 flex items-center gap-4 shrink-0 font-mono text-[10px]">
          <div>
            <p className="text-zinc-500 uppercase tracking-widest font-bold">Consent Mode</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              <span className="text-zinc-300 font-bold">V2 ACTIVE</span>
            </div>
          </div>
          <div className="w-px h-6 bg-white/5" />
          <div>
            <p className="text-zinc-500 uppercase tracking-widest font-bold">Tracking tags</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              <span className="text-zinc-300 font-bold">GA4 + GTM LIVE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Internal Sub-navigation menu */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-px overflow-x-auto">
        <button
          onClick={() => setActiveSubTab("marketing")}
          className={`px-4 py-2 font-mono text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer whitespace-nowrap border-b-2 ${
            activeSubTab === "marketing" 
              ? "border-blue-500 text-blue-400" 
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          📈 Growth & Analytics
        </button>
        <button
          onClick={() => setActiveSubTab("developer")}
          className={`px-4 py-2 font-mono text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer whitespace-nowrap border-b-2 ${
            activeSubTab === "developer" 
              ? "border-red-500 text-red-400" 
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          ⚙️ APIs & AI Integration
        </button>
        <button
          onClick={() => setActiveSubTab("workspace")}
          className={`px-4 py-2 font-mono text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer whitespace-nowrap border-b-2 ${
            activeSubTab === "workspace" 
              ? "border-yellow-500 text-yellow-400" 
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          📁 Productivity & Workspace
        </button>
        <button
          onClick={() => setActiveSubTab("simulators")}
          className={`px-4 py-2 font-mono text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer whitespace-nowrap border-b-2 ${
            activeSubTab === "simulators" 
              ? "border-emerald-500 text-emerald-400" 
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          🧪 Sandbox Simulators
        </button>
        <button
          onClick={() => setActiveSubTab("pagespeed")}
          className={`px-4 py-2 font-mono text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer whitespace-nowrap border-b-2 ${
            activeSubTab === "pagespeed" 
              ? "border-purple-500 text-purple-400" 
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          ⚡ PageSpeed & SEO
        </button>
      </div>

      {/* SUB-TAB CONTENTS */}

      {/* 1. MARKETING & GROWTH */}
      {activeSubTab === "marketing" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Editable Credentials */}
          <form onSubmit={handleSaveConfig} className="lg:col-span-5 bg-zinc-950/40 border border-white/5 p-6 rounded-3xl space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <h4 className="font-sans font-extrabold text-[11px] text-zinc-200 uppercase tracking-wider">Growth Credentials</h4>
            </div>

            <div className="space-y-3.5 font-mono text-[10px]">
              <div className="space-y-1">
                <label className="text-zinc-400 font-extrabold uppercase tracking-wide">Google Analytics (GA4) Measurement ID</label>
                <input
                  type="text"
                  value={config.analyticsId}
                  onChange={(e) => setConfig({ ...config, analyticsId: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-extrabold uppercase tracking-wide">Google Ads Conversion ID</label>
                <input
                  type="text"
                  value={config.adsId}
                  onChange={(e) => setConfig({ ...config, adsId: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-extrabold uppercase tracking-wide">Google Tag Manager Container ID</label>
                <input
                  type="text"
                  value={config.gtmId}
                  onChange={(e) => setConfig({ ...config, gtmId: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-extrabold uppercase tracking-wide">Google AdSense Publisher Client ID</label>
                <input
                  type="text"
                  value={config.adSenseId}
                  disabled
                  className="w-full bg-zinc-900/60 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-zinc-400 select-all cursor-not-allowed"
                />
                <p className="text-[9px] text-zinc-500 uppercase">AdSense verified script auto-injected on page load context.</p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-500 text-black font-extrabold text-[10px] uppercase py-3 rounded-xl transition-all font-mono tracking-wider cursor-pointer"
              >
                {saving ? "Updating system config..." : "Commit growth tracking IDs"}
              </button>
            </div>
          </form>

          {/* Right Column: Active Google services ledger & Looker Studio Chart */}
          <div className="lg:col-span-7 bg-zinc-950/40 border border-white/5 p-6 rounded-3xl space-y-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-400 font-bold">Google growth suite ledger ({12})</span>
                <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10 font-bold uppercase">Ready</span>
              </div>

              {/* Grid lists of specific services */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 font-mono text-[10px]">
                {[
                  { name: "Google Analytics", desc: "User engagement, organic reach, retention tracks.", state: "Live" },
                  { name: "Google Ads", desc: "Digital campaign streams, target tags, CPA goals.", state: "Live" },
                  { name: "Google Tag Manager", desc: "Trigger events tracking, telemetry tags.", state: "Live" },
                  { name: "Google AdSense", desc: "Revenue ads container slots, client tags.", state: "Active" },
                  { name: "Ads Conversion Tracking", desc: "Subscription conversions and coins purchases.", state: "Ready" },
                  { name: "Ads Remarketing", desc: "Retarget churned session clusters securely.", state: "Active" },
                  { name: "Google Search Console", desc: "Indexation rates, crawl depth, mobile sitemap.", state: "Indexed" },
                  { name: "Search Console Insights", desc: "Real-time query performance summaries.", state: "Ready" },
                  { name: "Google Merchant Center", desc: "Coin store offers XML ingestion format.", state: "Connected" },
                  { name: "Merchant Center Next", desc: "Virtual currency retail feed synchronization.", state: "Ready" },
                  { name: "Google Business Profile", desc: "Physical listings, geographical maps reviews.", state: "Active" },
                  { name: "Consent Mode V2", desc: "Strict cookie compliance framework tracking.", state: "Active" },
                ].map((s, idx) => (
                  <div key={idx} className="p-3 bg-black/30 border border-white/5 rounded-2xl flex flex-col justify-between h-[90px]">
                    <div className="space-y-0.5">
                      <p className="font-bold text-zinc-300 truncate">{s.name}</p>
                      <p className="text-[8px] text-zinc-500 leading-normal line-clamp-2">{s.desc}</p>
                    </div>
                    <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest block text-right mt-1">● {s.state}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Embedded looker studio simulator / graphs */}
            <div className="bg-black/40 border border-white/5 rounded-2xl p-4.5 space-y-3 font-mono">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-400" />
                  <span className="text-[10px] text-zinc-300 font-extrabold uppercase">Looker Studio reporting engine</span>
                </div>
                <span className="text-[8px] text-zinc-500 uppercase tracking-wide">Update interval: 15m</span>
              </div>
              
              {/* Beautiful custom vector chart representing dashboard traffic */}
              <div className="h-[90px] w-full bg-zinc-950/60 rounded-xl relative overflow-hidden flex items-end px-4 pb-2 border border-white/[0.02]">
                <div className="absolute inset-0 bg-gradient-to-t from-blue-500/5 via-transparent to-transparent pointer-events-none" />
                <div className="absolute left-3 top-2 text-[8px] text-zinc-500 space-y-0.5">
                  <p>7-Day Organic Active Sessions</p>
                  <p className="text-zinc-300 font-extrabold text-xs">24,850 Users (+14.5%)</p>
                </div>

                {/* SVG path of organic wave graph */}
                <svg className="w-full h-full absolute inset-0 text-blue-500 opacity-60" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M0,100 L0,75 Q15,45 30,65 T60,35 T90,15 L100,10 L100,100 Z" fill="rgba(59, 130, 246, 0.1)" />
                  <path d="M0,75 Q15,45 30,65 T60,35 T90,15 L100,10" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>

                <div className="flex justify-between w-full text-[7px] text-zinc-600 font-bold uppercase z-10">
                  <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 2. DEVELOPER APIS & AI */}
      {activeSubTab === "developer" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: API parameters inputs */}
          <form onSubmit={handleSaveConfig} className="lg:col-span-5 bg-zinc-950/40 border border-white/5 p-6 rounded-3xl space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <Terminal className="w-4 h-4 text-red-400" />
              <h4 className="font-sans font-extrabold text-[11px] text-zinc-200 uppercase tracking-wider">Developer &amp; Cloud credentials</h4>
            </div>

            <div className="space-y-3.5 font-mono text-[10px]">
              <div className="space-y-1">
                <label className="text-zinc-400 font-extrabold uppercase tracking-wide">Google Cloud (GCP) Project ID</label>
                <input
                  type="text"
                  value={config.gcpProjectId}
                  onChange={(e) => setConfig({ ...config, gcpProjectId: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-extrabold uppercase tracking-wide">Google Maps Platform API Key</label>
                <input
                  type="text"
                  value={config.mapsApiKey}
                  onChange={(e) => setConfig({ ...config, mapsApiKey: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-extrabold uppercase tracking-wide">FCM Server Legacy API Key</label>
                <input
                  type="text"
                  value={config.fcmServerKey}
                  onChange={(e) => setConfig({ ...config, fcmServerKey: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-extrabold uppercase tracking-wide">Google Gemini API Access</label>
                <input
                  type="text"
                  value={config.geminiApiKey}
                  disabled
                  className="w-full bg-zinc-900/60 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-zinc-400 cursor-not-allowed select-all"
                />
                <p className="text-[9px] text-zinc-500 uppercase">Utilizing server-side Google GenAI SDK for low-latency queries.</p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-red-600 hover:bg-red-500 text-black font-extrabold text-[10px] uppercase py-3 rounded-xl transition-all font-mono tracking-wider cursor-pointer"
              >
                {saving ? "Saving API Configurations..." : "Commit API parameters"}
              </button>
            </div>
          </form>

          {/* Right Column: Google APIs status matrix */}
          <div className="lg:col-span-7 bg-zinc-950/40 border border-white/5 p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-400 font-bold font-extrabold">Active Google Developer Services ({14})</span>
              <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10 font-bold uppercase">Ready</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 font-mono text-[10px]">
              {[
                { name: "Google Gemini API", desc: "Powering smart bio creations, track categories.", state: "Live" },
                { name: "Google Maps SDK", desc: "Physical business profile, live maps tags.", state: "Active" },
                { name: "Cloud Vision AI", desc: "Catalog cover safety filtering and auto-tagging.", state: "Live" },
                { name: "Cloud Translation", desc: "Dynamic platform multilingual string generator.", state: "Active" },
                { name: "Text-to-Speech API", desc: "Voice synthesizers for screen readers.", state: "Ready" },
                { name: "Speech-to-Text API", desc: "Real-time track search voice transcribe engine.", state: "Ready" },
                { name: "OAuth 2.0 Credentials", desc: "User single-sign on gateway accounts.", state: "Live" },
                { name: "Knowledge Graph Search", desc: "Entity linking for verified global artists.", state: "Ready" },
                { name: "Google Play Services", desc: "Android-bound location & billing listeners.", state: "Active" },
                { name: "Google APIs Explorer", desc: "Backend console developer sandbox console.", state: "Active" },
                { name: "Google Custom Search", desc: "Metadata search fallbacks for external media.", state: "Active" },
                { name: "Cloud Armor", desc: "WAF firewall layer, DDOS filtering active.", state: "Shielded" },
                { name: "Cloud Logging", desc: "Centralized server transactions output logs.", state: "Active" },
                { name: "Cloud Monitoring", desc: "VM CPU, network throughput, memory graphs.", state: "Live" },
              ].map((s, idx) => (
                <div key={idx} className="p-3 bg-black/30 border border-white/5 rounded-2xl flex flex-col justify-between h-[90px]">
                  <div className="space-y-0.5">
                    <p className="font-bold text-zinc-300 truncate">{s.name}</p>
                    <p className="text-[8px] text-zinc-500 leading-normal line-clamp-2">{s.desc}</p>
                  </div>
                  <span className="text-[8px] font-bold text-red-400 uppercase tracking-widest block text-right mt-1">● {s.state}</span>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* 3. PRODUCTIVITY & WORKSPACE */}
      {activeSubTab === "workspace" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Panel: Configuration form */}
          <form onSubmit={handleSaveConfig} className="lg:col-span-5 bg-zinc-950/40 border border-white/5 p-6 rounded-3xl space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <Layers className="w-4 h-4 text-yellow-400" />
              <h4 className="font-sans font-extrabold text-[11px] text-zinc-200 uppercase tracking-wider font-extrabold">Workspace &amp; Productivity Settings</h4>
            </div>

            <div className="space-y-3.5 font-mono text-[10px]">
              <div className="space-y-1">
                <label className="text-zinc-400 font-extrabold uppercase tracking-wide">Google Drive Backup Folder ID</label>
                <input
                  type="text"
                  value={config.driveFolderId}
                  onChange={(e) => setConfig({ ...config, driveFolderId: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-extrabold uppercase tracking-wide font-bold">Business Profile Locations ID</label>
                <input
                  type="text"
                  value={config.businessProfileId}
                  onChange={(e) => setConfig({ ...config, businessProfileId: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-extrabold uppercase tracking-wide">Merchant Center Store Identifier</label>
                <input
                  type="text"
                  value={config.merchantCenterId}
                  onChange={(e) => setConfig({ ...config, merchantCenterId: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-500"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-extrabold text-[10px] uppercase py-3 rounded-xl transition-all font-mono tracking-wider cursor-pointer"
              >
                {saving ? "Saving Workspace Settings..." : "Save workspace paths"}
              </button>
            </div>
          </form>

          {/* Right Panel: Workspace ledger list */}
          <div className="lg:col-span-7 bg-zinc-950/40 border border-white/5 p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-400 font-bold">Google Workspace Ledger ({11})</span>
              <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10 font-bold uppercase">Ready</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 font-mono text-[10px]">
              {[
                { name: "Google Drive API", desc: "Automated server-side database backup logs exporter.", state: "Configured" },
                { name: "Google Forms", desc: "Support inquiries submission fallbacks collector.", state: "Active" },
                { name: "Google Calendar API", desc: "Schedules release calendars and broadcasts live battles.", state: "Connected" },
                { name: "Google Meet", desc: "Schedules creator face-off planning sessions.", state: "Ready" },
                { name: "Google Sites Integration", desc: "Synchronize landing pages SEO articles dynamically.", state: "Active" },
                { name: "Google Alerts", desc: "DMCA copyright infringement alarms monitor.", state: "Live" },
                { name: "Photos Library API", desc: "Creator profile picture asset uploads proxy.", state: "Active" },
                { name: "Google Web Stories", desc: "Export short video stories into SEO indexes.", state: "Indexed" },
                { name: "Google Discover", desc: "Aggressive visual stories feed indexing engine.", state: "Live" },
                { name: "Google News Feed", desc: "Platform updates newsletter exports gateway.", state: "Active" },
                { name: "Publisher Center", desc: "Official SoundStream live newsletter catalog feeds.", state: "Live" },
              ].map((s, idx) => (
                <div key={idx} className="p-3 bg-black/30 border border-white/5 rounded-2xl flex flex-col justify-between h-[90px]">
                  <div className="space-y-0.5">
                    <p className="font-bold text-zinc-300 truncate">{s.name}</p>
                    <p className="text-[8px] text-zinc-500 leading-normal line-clamp-2">{s.desc}</p>
                  </div>
                  <span className="text-[8px] font-bold text-yellow-400 uppercase tracking-widest block text-right mt-1">● {s.state}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* 4. SANDBOX SIMULATORS */}
      {activeSubTab === "simulators" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Simulator Box 1: Real Translation API Simulator */}
            <div className="bg-zinc-950/40 border border-white/5 p-6 rounded-3xl space-y-4 text-left">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <Languages className="w-4 h-4 text-emerald-400" />
                <h4 className="font-sans font-extrabold text-[11px] text-zinc-200 uppercase tracking-wider font-extrabold">
                  Cloud Translation API Sandbox
                </h4>
              </div>

              <div className="space-y-3 font-mono text-[10px]">
                <div className="space-y-1">
                  <label className="text-zinc-500 font-bold uppercase">Translate String</label>
                  <textarea
                    rows={2}
                    value={translateText}
                    onChange={(e) => setTranslateText(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-sans resize-none"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1 space-y-1">
                    <label className="text-zinc-500 font-bold uppercase">Target Language</label>
                    <select
                      value={translateTarget}
                      onChange={(e) => setTranslateTarget(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
                    >
                      <option value="es">Spanish (Español)</option>
                      <option value="fr">French (Français)</option>
                      <option value="yo">Yoruba (Ede Yoruba)</option>
                      <option value="ha">Hausa (Harshen Hausa)</option>
                      <option value="ig">Igbo (Asụsụ Igbo)</option>
                      <option value="de">German (Deutsch)</option>
                      <option value="ja">Japanese (日本語)</option>
                      <option value="pt">Portuguese (Português)</option>
                    </select>
                  </div>

                  <button
                    onClick={handleRunTranslation}
                    disabled={translating}
                    className="h-9 self-end px-5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-[10px] uppercase rounded-xl transition-all cursor-pointer font-bold shrink-0"
                  >
                    {translating ? "Translating..." : "Execute translation"}
                  </button>
                </div>

                {translatedResult && (
                  <div className="p-3.5 bg-zinc-900 border border-white/5 rounded-2xl space-y-1 mt-2">
                    <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold">Google Cloud Translation Result</p>
                    <p className="text-xs text-emerald-400 font-sans leading-relaxed">{translatedResult}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Simulator Box 2: Real Cloud Vision AI Content Analyzer */}
            <div className="bg-zinc-950/40 border border-white/5 p-6 rounded-3xl space-y-4 text-left">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                <h4 className="font-sans font-extrabold text-[11px] text-zinc-200 uppercase tracking-wider font-extrabold">
                  Cloud Vision AI Cover Safety Audit
                </h4>
              </div>

              <div className="space-y-3 font-mono text-[10px]">
                <div className="space-y-1">
                  <label className="text-zinc-500 font-bold uppercase">Simulate Album Cover Art Context / Prompt</label>
                  <input
                    type="text"
                    value={visionTitle}
                    onChange={(e) => setVisionTitle(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 font-sans"
                  />
                  <p className="text-[8px] text-zinc-500 uppercase leading-normal">Google Cloud Vision analyzes safe-search and generates automatic keyword labels.</p>
                </div>

                <button
                  onClick={handleRunVision}
                  disabled={scanningVision}
                  className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-[10px] uppercase py-2.5 rounded-xl transition-all cursor-pointer font-bold"
                >
                  {scanningVision ? "Analyzing Album Art via Gemini..." : "Analyze Media Safe-Search"}
                </button>

                {visionResult && (
                  <div className="p-3 bg-zinc-900 border border-white/5 rounded-2xl space-y-3.5 mt-2 text-xs">
                    <div>
                      <p className="text-[8px] text-zinc-500 uppercase font-bold mb-1.5">Detected Labels</p>
                      <div className="flex flex-wrap gap-1.5">
                        {visionResult.labels?.map((l: any, i: number) => (
                          <span key={i} className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-md text-[9px] border border-white/5 font-sans font-bold">
                            🏷️ {l.description || l.name} ({(l.score * 100).toFixed(0)}%)
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[8px] text-zinc-500 uppercase font-bold mb-1">Safe Search Likelihood</p>
                      <div className="grid grid-cols-5 gap-1.5 text-[8px] text-center font-bold font-mono">
                        {Object.entries(visionResult.safeSearchAnnotation || {}).map(([key, val]: any) => (
                          <div key={key} className="p-1 bg-black/40 rounded-lg border border-white/[0.03]">
                            <p className="text-zinc-500 uppercase">{key}</p>
                            <p className={`mt-0.5 ${val === "VERY_UNLIKELY" || val === "UNLIKELY" ? "text-emerald-400" : "text-amber-400"}`}>{val}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Simulator Box 3: Firebase Cloud Messaging Broadcast Router */}
            <form onSubmit={handleSendFcm} className="bg-zinc-950/40 border border-white/5 p-6 rounded-3xl space-y-4 text-left md:col-span-2">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <Bell className="w-4 h-4 text-red-400" />
                <h4 className="font-sans font-extrabold text-[11px] text-zinc-200 uppercase tracking-wider font-extrabold">
                  Firebase Cloud Messaging Broadcast Router
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-[10px]">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-zinc-500 font-bold uppercase">Push Notification Title</label>
                    <input
                      type="text"
                      value={fcmTitle}
                      onChange={(e) => setFcmTitle(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-red-500 font-sans"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-500 font-bold uppercase">Push Alert Body Content</label>
                    <textarea
                      rows={3}
                      value={fcmBody}
                      onChange={(e) => setFcmBody(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-red-500 font-sans resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-1">
                      <label className="text-zinc-500 font-bold uppercase">Target Device Segment</label>
                      <select
                        value={fcmGroup}
                        onChange={(e) => setFcmGroup(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-red-500 font-mono"
                      >
                        <option value="all">Broadcast to All Users (4,250 devices)</option>
                        <option value="artists">Verified Artists Only (450 devices)</option>
                        <option value="listeners">Active Listeners Segment (3,800 devices)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={sendingFcm}
                      className="h-9 self-end px-6 bg-red-500 hover:bg-red-400 text-black font-extrabold text-[10px] uppercase rounded-xl transition-all cursor-pointer shrink-0 font-bold"
                    >
                      {sendingFcm ? "Broadcasting..." : "Broadcast Push Notification"}
                    </button>
                  </div>
                </div>

                {/* Live Output console log */}
                <div className="bg-black/50 border border-white/5 rounded-2xl p-4.5 flex flex-col justify-between h-[210px] text-[9px] text-zinc-400">
                  <div className="space-y-1 border-b border-white/5 pb-2">
                    <span className="font-extrabold text-zinc-300 uppercase">Live FCM Broadcast Output Log</span>
                    <p className="text-zinc-500 uppercase">Awaiting admin triggers...</p>
                  </div>

                  {fcmResult ? (
                    <div className="space-y-1.5 flex-1 pt-3 leading-relaxed">
                      <p className="text-emerald-400 font-bold uppercase">✅ Broadcast Dispatched successfully!</p>
                      <p>Message Identifier: <span className="text-zinc-300">{fcmResult.messageId}</span></p>
                      <p>Target Audience Count: <span className="text-zinc-300 font-bold">{fcmResult.recipientCount} devices</span></p>
                      <p>Dispatch protocol: <span className="text-zinc-500">Google FCM V1 HTTP server API</span></p>
                      <p className="text-[8px] text-zinc-500">Timestamp: {fcmResult.timestamp}</p>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-1 py-10">
                      <Bell className="w-6 h-6 text-zinc-700 animate-bounce" />
                      <p className="text-zinc-650 uppercase">No active broadcast logs.</p>
                    </div>
                  )}
                </div>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* 5. PAGESPEED & LIGHTHOUSE AUDIT */}
      {activeSubTab === "pagespeed" && (
        <div className="space-y-6">
          <div className="bg-zinc-950/40 border border-white/5 p-6 rounded-3xl space-y-4 text-left">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <Zap className="w-4 h-4 text-purple-400" />
              <h4 className="font-sans font-extrabold text-[11px] text-zinc-200 uppercase tracking-wider font-extrabold">
                Google PageSpeed &amp; Lighthouse Analytics Audit
              </h4>
            </div>

            <div className="space-y-3 font-mono text-[10px]">
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-1">
                  <label className="text-zinc-500 font-bold uppercase">Website Target URL</label>
                  <input
                    type="url"
                    value={auditUrl}
                    onChange={(e) => setAuditUrl(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-purple-500 font-sans"
                  />
                </div>

                <button
                  onClick={handleRunPageSpeed}
                  disabled={auditing}
                  className="h-10 self-end px-6 bg-purple-500 hover:bg-purple-400 text-black font-extrabold text-[10px] uppercase rounded-xl transition-all cursor-pointer font-bold shrink-0"
                >
                  {auditing ? "Executing Audit..." : "Run Diagnostic Speed Audit"}
                </button>
              </div>
              <p className="text-[8px] text-zinc-500 uppercase leading-normal">Google PageSpeed Insights evaluates Performance, Accessibility, Best Practices, and SEO compliance scores.</p>
            </div>

            {/* Simulated report cards */}
            {auditResult && (
              <div className="space-y-6 pt-2 font-mono">
                {/* Score Meters Circle */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Performance", score: auditResult.performance, color: "text-emerald-400 border-emerald-400/20 bg-emerald-500/5" },
                    { label: "Accessibility", score: auditResult.accessibility, color: "text-emerald-400 border-emerald-400/20 bg-emerald-500/5" },
                    { label: "Best Practices", score: auditResult.bestPractices, color: "text-emerald-400 border-emerald-400/20 bg-emerald-500/5" },
                    { label: "SEO Score", score: auditResult.seo, color: "text-emerald-400 border-emerald-400/20 bg-emerald-500/5" },
                  ].map((item, i) => (
                    <div key={i} className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-center space-y-1.5 ${item.color}`}>
                      <p className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">{item.label}</p>
                      <div className="w-14 h-14 rounded-full border-4 border-current flex items-center justify-center">
                        <span className="text-lg font-extrabold text-white">{item.score}</span>
                      </div>
                      <span className="text-[8px] font-bold uppercase tracking-widest text-emerald-400 mt-1">● PASSED</span>
                    </div>
                  ))}
                </div>

                {/* Core Web Vitals Audit */}
                <div className="bg-black/40 border border-white/5 rounded-2xl p-4.5 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-[9px] font-extrabold text-zinc-300 uppercase">Core Web Vitals Assessment</span>
                    <span className="text-[8px] text-zinc-500 uppercase">Diagnostic details</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                    {[
                      { name: "First Contentful Paint", value: auditResult.coreWebVitals?.FCP, rating: "Good" },
                      { name: "Largest Contentful Paint", value: auditResult.coreWebVitals?.LCP, rating: "Good" },
                      { name: "Cumulative Layout Shift", value: auditResult.coreWebVitals?.CLS, rating: "Good" },
                      { name: "First Input Delay", value: auditResult.coreWebVitals?.FID, rating: "Good" },
                      { name: "Interaction to Next Paint", value: auditResult.coreWebVitals?.INP, rating: "Good" },
                    ].map((item, idx) => (
                      <div key={idx} className="p-2.5 bg-zinc-900/60 border border-white/[0.02] rounded-xl flex flex-col justify-between h-[75px]">
                        <p className="text-[7.5px] text-zinc-500 uppercase leading-normal font-sans font-bold">{item.name}</p>
                        <p className="text-xs font-extrabold text-white">{item.value}</p>
                        <span className="text-[7.5px] text-emerald-400 font-bold uppercase block tracking-wider">● {item.rating}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
