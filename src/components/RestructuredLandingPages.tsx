import React, { useState, useEffect, useRef } from "react";
import { 
  Music, 
  Play, 
  Pause,
  Compass, 
  TrendingUp, 
  ListMusic, 
  Tv, 
  MessageSquare, 
  Calendar, 
  Sparkles, 
  FileText, 
  Award, 
  ShoppingBag, 
  Activity, 
  Bell, 
  MapPin, 
  UserPlus, 
  BookOpen, 
  Sliders, 
  Search, 
  Heart, 
  Mic, 
  Cpu,
  Radio,
  Share2,
  Lock,
  Headphones,
  Map,
  Volume2,
  Plus,
  Coins,
  Check,
  Briefcase,
  GraduationCap,
  Star,
  BadgeCheck,
  Disc,
  ArrowRight,
  Filter,
  Users,
  Send
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User, Song, Artist, Album } from "../types";
import { HighTechGroupChat } from "./HighTechGroupChat";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from "recharts";

interface RestructuredLandingPagesProps {
  path: string;
  onNavigate: (path: string) => void;
  currentUser: User | null;
  songs: Song[];
  artists: Artist[];
  albums: Album[];
  onSelectSong: (song: Song) => void;
}

export function RestructuredLandingPages({ 
  path, 
  onNavigate, 
  currentUser, 
  songs, 
  artists, 
  albums,
  onSelectSong 
}: RestructuredLandingPagesProps) {
  
  const [activeTab, setActiveTab] = useState<string>("all");
  const [toast, setToast] = useState<string | null>(null);

  // Equalizer states
  const [eqBass, setEqBass] = useState(60);
  const [eqMid, setEqMid] = useState(50);
  const [eqTreble, setEqTreble] = useState(70);
  const [losslessEnabled, setLosslessEnabled] = useState(true);

  // Digital Beat Sequencer states (for /create)
  const [seqPlaying, setSeqPlaying] = useState(false);
  const [seqTempo, setSeqTempo] = useState(120);
  const [seqStep, setSeqStep] = useState(0);
  const [seqGrid, setSeqGrid] = useState<boolean[][]>([
    [true, false, false, false, true, false, false, false], // Kick
    [false, false, true, false, false, false, true, false], // Snare
    [true, true, true, true, true, true, true, true],       // Hi-Hat
    [false, true, false, true, false, true, false, true],   // Perc
  ]);
  const seqTimer = useRef<any>(null);

  // AI Assistant Chat states (for /ai)
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    { sender: "ai", text: "Hello! I am SoundStreamy's AI Music Assistant. Ask me to curate custom recommendations, design custom playlists, or decode independent music trends!" }
  ]);
  const [aiTyping, setAiTyping] = useState(false);

  // Store / Merchandise state
  const [cartCount, setCartCount] = useState(0);

  // World Map active country state
  const [worldActiveCountry, setWorldActiveCountry] = useState("Nigeria");

  // Portal Directory states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Show customized toast notifications
  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Beat Sequencer tick effect
  useEffect(() => {
    if (seqPlaying) {
      const intervalMs = (60000 / seqTempo) / 2; // eighth notes
      seqTimer.current = setInterval(() => {
        setSeqStep(prev => (prev + 1) % 8);
      }, intervalMs);
    } else {
      if (seqTimer.current) clearInterval(seqTimer.current);
    }
    return () => {
      if (seqTimer.current) clearInterval(seqTimer.current);
    };
  }, [seqPlaying, seqTempo]);

  // Handle Beat Grid cell toggle
  const toggleSeqCell = (rowIdx: number, colIdx: number) => {
    const updated = [...seqGrid];
    updated[rowIdx][colIdx] = !updated[rowIdx][colIdx];
    setSeqGrid(updated);
  };

  // AI Assistant trigger mock reply
  const handleAiSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;
    
    const userText = aiInput.trim();
    setAiMessages(prev => [...prev, { sender: "user", text: userText }]);
    setAiInput("");
    setAiTyping(true);

    setTimeout(() => {
      setAiTyping(false);
      const responses = [
        "That's an excellent choice! Based on your taste, I recommend checking out Afrobeats & Amapiano playlists. Would you like me to compile a 10-track lossless selection?",
        "Excellent query. The fuji-highlife fusion genre is currently rising by 140% in Western Africa. I've curated a custom playlist for you inside your Library called 'Modern West-African Grooves'.",
        "I suggest analyzing the latest studio equalizer presets. Turning on high-fidelity audio mode inside `/audio` will enhance the sound response for that track!",
        "Let's make a deal: I can craft an exclusive remix of that independent record using our advanced AI music creation models inside `/create`!"
      ];
      const botResponse = responses[Math.floor(Math.random() * responses.length)];
      setAiMessages(prev => [...prev, { sender: "ai", text: botResponse }]);
    }, 1500);
  };

  const getPageMeta = () => {
    const titleMap: Record<string, { title: string; subtitle: string; icon: any }> = {
      "/": { title: "SoundStreamy Ecosystem Directory", subtitle: "Access all independent landing pages under a single unified portal", icon: Sparkles },
      "/home": { title: "SoundStreamy Ecosystem Directory", subtitle: "Access all independent landing pages under a single unified portal", icon: Sparkles },
      "/artists": { title: "Independent Creator Hub", subtitle: "Browse global trending artists and their verified catalogs", icon: Sparkles },
      "/trending": { title: "Trending Stream Charts", subtitle: "Realtime updates on what the world is listening to", icon: TrendingUp },
      "/playlists": { title: "Curated Playlists", subtitle: "Expertly selected sets tailored for moods, seasons, and sessions", icon: ListMusic },
      "/discover": { title: "Interactive Music Discovery", subtitle: "Navigate fresh sounds matching your mental state", icon: Compass },
      "/charts": { title: "Billboard Top 100", subtitle: "Weekly countdowns of independent master records", icon: Award },
      "/podcasts": { title: "Independent Podcasts", subtitle: "Deep thoughts, talk shows, comedy, and audio series", icon: Tv },
      "/community": { title: "Community Social Lounge", subtitle: "Share, review, and discuss your favorite music with fans", icon: MessageSquare },
      "/events": { title: "Live Concerts & Festivals", subtitle: "Book tickets and track local performance venues", icon: Calendar },
      "/premium": { title: "Premium Subscription Plan", subtitle: "Unlock studio-quality lossless FLAC playback", icon: Sparkles },
      "/ai": { title: "Gemini AI Music Assistant", subtitle: "Your smart companion for search, curation, and analytics", icon: Cpu },
      "/for-artists": { title: "Artist Upload Portal", subtitle: "Launch tracks, monitor splits, and build fan clubs", icon: Music },
      "/rising": { title: "Rising Indie Spotlight", subtitle: "Highlighting the next wave of underground legends", icon: TrendingUp },
      "/genres": { title: "Explore Genres", subtitle: "Navigate independent music styles from around the globe", icon: Compass },
      "/fans": { title: "Fan Clubs & Zones", subtitle: "Join artist circles and unlock digital fan merchandise", icon: Users },
      "/stories": { title: "Behind The Music", subtitle: "Deep-dives into the creation of historic independent tracks", icon: BookOpen },
      "/store": { title: "SoundStream Merch Marketplace", subtitle: "Purchase vinyl, cassette tapes, apparel, and hardware", icon: ShoppingBag },
      "/analytics": { title: "Performance Analytics", subtitle: "Track geographic reach, play ratios, and demographic insight", icon: Activity },
      "/notifications": { title: "Unified Notification Center", subtitle: "Updates on releases, artist news, and community replies", icon: Bell },
      "/local": { title: "Local Gigs & Events", subtitle: "Discover independent artists performing in your city", icon: MapPin },
      "/awards": { title: "SoundStreamy Annual Awards", subtitle: "Cast your vote for the best artist, track, and label", icon: Award },
      "/collab": { title: "Creator Collaboration Portal", subtitle: "Find producers, songwriters, and session instrumentalists", icon: Users },
      "/magazine": { title: "SoundStream Editorial Magazine", subtitle: "Premium weekly journalism on global indie music culture", icon: BookOpen },
      "/audio": { title: "Sound Quality Control", subtitle: "Equalize sound settings, test latency, and enable FLAC", icon: Sliders },
      "/ai-discover": { title: "AI Guided Playlist Builder", subtitle: "Prompt your way to the perfect sonic compilation", icon: Sparkles },
      "/lyrics": { title: "Time-Synced Lyrics Hub", subtitle: "Sing along or submit transcriptions for independent releases", icon: Mic },
      "/create": { title: "Playable Beat Maker Studio", subtitle: "Craft sequencing loops using high-tech synthesizers", icon: Sliders },
      "/dj": { title: "DJ Deck Hub", subtitle: "Live set records, virtual turntables, and mix releases", icon: Disc },
      "/producers": { title: "Beat & Instrumental Portal", subtitle: "Lease and buy studio instrumental loops directly", icon: Headphones },
      "/karaoke": { title: "Sing-Along Karaoke Lounge", subtitle: "Test vocal pitches with synchronized lyric backing tracks", icon: Mic },
      "/channels": { title: "Curated Live Channels", subtitle: "Continuous themed video and audio streaming hubs", icon: Tv },
      "/insights": { title: "Music Market Insights", subtitle: "Global streaming economics and distribution reports", icon: Activity },
      "/world": { title: "Global Interactive Music Map", subtitle: "See what's trending across international borders", icon: Map },
      "/reviews": { title: "Listeners Reviews Arena", subtitle: "Read detailed critiques and score independent albums", icon: FileText },
      "/hall-of-fame": { title: "SoundStream Hall of Fame", subtitle: "Celebrating the legendary icons of indie music", icon: Award },
      "/releases": { title: "Global Release Calendar", subtitle: "Countdown timer tracking of highly anticipated drops", icon: Calendar },
      "/rewards": { title: "Audience Rewards Center", subtitle: "Earn SoundCoins by streaming and exchange for perks", icon: Coins },
      "/verified": { title: "Creator Verification Dashboard", subtitle: "Apply for the blue crest and official distribution", icon: BadgeCheck },
      "/academy": { title: "Independent Music Academy", subtitle: "Learn mixing, sound-design, and music marketing", icon: GraduationCap },
      "/feed": { title: "Social Activty Feed", subtitle: "See what friends and followed artists are publishing", icon: Users },
      "/jobs": { title: "Independent Music Jobs", subtitle: "Find jobs in audio engineering, label marketing, and art", icon: Briefcase },
      "/partners": { title: "Brand Sponsorship Matrix", subtitle: "Sponsorship guides and partnership application details", icon: UserPlus },
      "/ads-manager": { title: "Ad Campaign Manager", subtitle: "Ad placement coordinates, monetization metrics, and audience reaches", icon: Sliders },
      "/agency-hub": { title: "Agency Center Hub", subtitle: "Creator network coordinator dashboard and agency support lines", icon: Users },
      "/subscriptions": { title: "Creator Premium Subscriptions", subtitle: "Unlocking paywalled, member-only premium audio and artist releases", icon: Lock },
      "/gifts": { title: "Digital Gift Store", subtitle: "Virtual gifts catalog to support your favorite live streamers", icon: ShoppingBag },
      "/wallet": { title: "Digital Token Wallet", subtitle: "Manage your SoundCoins, credits, and active transactions securely", icon: Coins }
    };

    return titleMap[path] || { title: "SoundStream Landing Page", subtitle: "Experience the ultimate connected independent audio platform", icon: Music };
  };

  const page = getPageMeta();
  const PageIcon = page.icon;

  return (
    <div className="space-y-8 font-sans">
      
      {/* Dynamic Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 bg-violet-650 text-white text-xs font-bold border border-violet-500/30 px-5 py-3 rounded-2xl shadow-2xl z-[9999] flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-violet-300 animate-pulse" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern Glass Banner Header */}
      <div className="relative bg-gradient-to-r from-zinc-900/60 to-black/40 border border-white/5 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden shadow-xl select-none">
        
        {/* Glow Accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-5 z-10 text-left">
          <div className="w-14 h-14 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-violet-600/15 ring-4 ring-white/5">
            <PageIcon className="w-7 h-7" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-violet-400 tracking-widest uppercase">SoundStream Ecosystem</span>
              <span className="text-[9px] font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-bold uppercase">
                Landing Page
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">{page.title}</h2>
            <p className="text-xs text-zinc-400 font-medium leading-relaxed max-w-lg">{page.subtitle}</p>
          </div>
        </div>

        {/* Global CTA controls on Banner */}
        <div className="flex flex-wrap items-center gap-3 z-10">
          <button 
            onClick={() => {
              onNavigate("/music");
              triggerToast("Switched to High-Fidelity Music discovery page!");
            }}
            className="px-4 py-2.5 bg-black/40 hover:bg-black/60 border border-white/5 hover:border-white/10 rounded-xl text-xs text-zinc-300 hover:text-white transition-all cursor-pointer font-bold flex items-center gap-2"
          >
            <Music className="w-4 h-4 text-indigo-400" />
            Go to Music
          </button>
          <button 
            onClick={() => {
              onNavigate("/video");
              triggerToast("Navigating to Video Platform.");
            }}
            className="px-4 py-2.5 bg-indigo-650 hover:bg-indigo-600 rounded-xl text-xs text-white transition-all cursor-pointer font-bold flex items-center gap-1.5 shadow-md shadow-indigo-650/10"
          >
            <Tv className="w-4 h-4" />
            Switch to Video
          </button>
        </div>
      </div>

      {/* DYNAMIC LANDING PAGE CONTENT ROUTER */}
      <div className="min-h-[400px]">
        
        {/* 1. ARTISTS HUB / DIRECTORY (/artists) */}
        {path === "/artists" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <Users className="w-4.5 h-4.5 text-violet-400" />
                Featured Platform Creators ({artists.length})
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 font-medium">Filter Genre:</span>
                <select className="bg-[#18181b] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none">
                  <option>All Genres</option>
                  <option>Afrobeats</option>
                  <option>Hip Hop</option>
                  <option>Gospel</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {artists.map(art => (
                <div 
                  key={art.uid}
                  className="bg-[#161619] border border-white/5 hover:border-violet-500/25 p-4 rounded-3xl text-center space-y-3 transition-all group shadow hover:shadow-violet-650/5 relative overflow-hidden"
                >
                  <div className="w-20 h-20 mx-auto rounded-full overflow-hidden relative border-2 border-white/10 group-hover:border-violet-500 transition-colors">
                    <img src={art.profilePhoto} alt={art.artistName} className="w-full h-full object-cover" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-extrabold text-white truncate flex items-center justify-center gap-1">
                      {art.artistName}
                      {art.verified && <BadgeCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                    </h4>
                    <p className="text-[10px] text-zinc-500 font-medium font-mono uppercase tracking-widest">{art.followersCount} followers</p>
                  </div>
                  <button 
                    onClick={() => triggerToast(`Following ${art.artistName}!`)}
                    className="w-full py-2 bg-zinc-900 hover:bg-violet-650 text-[10px] text-zinc-300 hover:text-white rounded-xl transition-all font-bold uppercase tracking-wider cursor-pointer border-none"
                  >
                    Follow Creator
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. CHARTS DASHBOARD (/charts) */}
        {path === "/charts" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Top songs List panel */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">
                  Live Global Top Hits (Daily Updated)
                </h3>
                <span className="text-[9px] font-mono bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-xl border border-indigo-500/10">
                  Data latency: 0.2ms
                </span>
              </div>

              <div className="bg-[#161619] border border-white/5 rounded-3xl p-4 md:p-6 space-y-3">
                {songs.slice(0, 5).map((song, idx) => (
                  <div 
                    key={song.id} 
                    className="flex items-center justify-between p-2.5 hover:bg-black/20 rounded-2xl border border-transparent hover:border-white/5 transition-all text-left text-xs"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="w-4 font-mono font-black text-sm text-zinc-500 text-center">{idx + 1}</span>
                      <img src={song.coverUrl} className="w-10 h-10 object-cover rounded-xl" />
                      <div className="min-w-0">
                        <p className="font-extrabold text-white truncate">{song.title}</p>
                        <p className="text-[10px] text-zinc-550 font-medium truncate">{song.artistName}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-mono text-zinc-400">{song.playCount.toLocaleString()} plays</span>
                      <button 
                        onClick={() => onSelectSong(song)}
                        className="p-2 bg-violet-650 hover:bg-violet-600 text-white rounded-xl cursor-pointer border-none"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chats with Charts Live discussion */}
            <div className="space-y-6">
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest text-left">
                Charts Group Lounge Chat
              </h3>
              <HighTechGroupChat 
                chatId="charts_main" 
                title="Charts Lounge" 
                category="Billboard Debate" 
                currentUser={currentUser} 
              />
            </div>

          </div>
        )}

        {/* 3. COMMUNITY HUB (/community) */}
        {path === "/community" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Feed posts */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">
                  Public Discussions & Feed
                </h3>
                <button 
                  onClick={() => triggerToast("New post window coming soon!")}
                  className="px-3 py-1.5 bg-violet-650 hover:bg-violet-600 rounded-lg text-[10px] font-bold text-white uppercase tracking-wider cursor-pointer border-none"
                >
                  Create Post
                </button>
              </div>

              {/* Seed community posts */}
              <div className="space-y-4">
                {[
                  {
                    id: "post-1",
                    author: "fuji_fusioner",
                    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop",
                    time: "1h ago",
                    text: "Just reviewed the new Gospel Fuji album on SoundStreamy. The drum mixes are incredible! Lossless audio does complete justice to the acoustic talking drum dynamics here.",
                    likes: 12,
                    comments: 4
                  },
                  {
                    id: "post-2",
                    author: "amapiano_plug",
                    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop",
                    time: "3h ago",
                    text: "Who wants to collaborate on an Amapiano transition beat? Post your projects inside `/collab` section! Let's build something massive.",
                    likes: 24,
                    comments: 7
                  }
                ].map(post => (
                  <div key={post.id} className="bg-[#161619] border border-white/5 p-5 rounded-3xl text-left space-y-4 shadow-md">
                    <div className="flex items-center gap-3">
                      <img src={post.avatar} className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <h4 className="text-xs font-extrabold text-white">@{post.author}</h4>
                        <span className="text-[9px] text-zinc-550 font-mono">{post.time}</span>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">{post.text}</p>
                    <div className="flex items-center gap-4 text-[10px] text-zinc-400 pt-2 border-t border-white/5">
                      <button onClick={() => triggerToast("Liked post!")} className="flex items-center gap-1 hover:text-white bg-transparent border-none cursor-pointer">
                        <Heart className="w-3.5 h-3.5 text-zinc-500" /> {post.likes}
                      </button>
                      <span className="flex items-center gap-1 font-mono">
                        <MessageSquare className="w-3.5 h-3.5 text-zinc-550" /> {post.comments} comments
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Community General Chat */}
            <div className="space-y-6">
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest text-left">
                Community Lounge Chat
              </h3>
              <HighTechGroupChat 
                chatId="community_lounge" 
                title="Community Lounge" 
                category="General Social Lounge" 
                currentUser={currentUser} 
              />
            </div>

          </div>
        )}

        {/* 4. DISCOVER (/discover) */}
        {path === "/discover" && (
          <div className="space-y-6 text-left">
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest border-b border-white/5 pb-2">
              Select Your Current Sonic Vibe
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: "Gym Workout", desc: "Fast Amapiano & Afrobeats drums", color: "from-orange-550 to-red-600" },
                { name: "Late Night Focus", desc: "Chill Lofi, Ambient Synth pads", color: "from-blue-600 to-indigo-700" },
                { name: "Sunday Gospel", desc: "Soul-lifting choirs & guitars", color: "from-amber-500 to-yellow-600" },
                { name: "High-Energy Fuji", desc: "Dynamic acoustic percussion", color: "from-purple-600 to-rose-600" }
              ].map(vibe => (
                <div 
                  key={vibe.name}
                  onClick={() => triggerToast(`Vibe engine loaded: ${vibe.name}`)}
                  className={`bg-gradient-to-br ${vibe.color} p-5 rounded-3xl cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all text-white space-y-4 shadow-lg`}
                >
                  <Compass className="w-7 h-7 text-white/80" />
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wide">{vibe.name}</h4>
                    <p className="text-[10px] text-white/70 font-medium leading-normal">{vibe.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Discovery compilation songs */}
            <div className="space-y-4 pt-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Recommended Tracks for discovery</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {songs.slice(0, 4).map(song => (
                  <div key={song.id} className="flex items-center gap-3 bg-[#161619] border border-white/5 p-3 rounded-2xl hover:border-violet-500/20 transition-all">
                    <img src={song.coverUrl} className="w-12 h-12 object-cover rounded-xl" />
                    <div className="flex-1 text-left min-w-0">
                      <h5 className="text-xs font-bold text-white truncate">{song.title}</h5>
                      <p className="text-[10px] text-zinc-550 truncate">{song.artistName}</p>
                    </div>
                    <button 
                      onClick={() => onSelectSong(song)}
                      className="p-2 bg-violet-650 hover:bg-violet-600 rounded-xl text-white cursor-pointer border-none"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 5. AI ASSISTANT (/ai) */}
        {path === "/ai" && (
          <div className="max-w-xl mx-auto bg-[#161619] border border-white/5 rounded-3xl overflow-hidden flex flex-col h-[480px] shadow-2xl">
            {/* Header */}
            <div className="bg-zinc-950/60 p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-violet-500/15 border border-violet-500/20 rounded-xl flex items-center justify-center text-violet-400">
                  <Cpu className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Gemini Audio Agent</h4>
                  <p className="text-[9px] text-zinc-500 font-mono">v4.0 Live Engine</p>
                </div>
              </div>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold font-mono">ONLINE</span>
            </div>

            {/* Chat list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {aiMessages.map((m, idx) => (
                <div key={idx} className={`flex gap-3 max-w-[85%] text-left ${m.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
                  <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white ${m.sender === "user" ? "bg-indigo-600" : "bg-violet-600"}`}>
                    {m.sender === "user" ? "U" : <Cpu className="w-3.5 h-3.5" />}
                  </div>
                  <div className={`p-3 rounded-2xl text-xs leading-relaxed ${m.sender === "user" ? "bg-indigo-650 text-white rounded-tr-none" : "bg-zinc-900 text-zinc-300 rounded-tl-none border border-white/5"}`}>
                    <p>{m.text}</p>
                  </div>
                </div>
              ))}

              {aiTyping && (
                <div className="flex gap-3 items-center mr-auto">
                  <div className="w-7 h-7 rounded-full bg-violet-600 animate-pulse flex items-center justify-center text-white text-[10px]">AI</div>
                  <div className="bg-zinc-900 border border-white/5 px-4 py-2 rounded-2xl rounded-tl-none text-[10px] text-zinc-500 font-mono">
                    Gemini is thinking...
                  </div>
                </div>
              )}
            </div>

            {/* Footer Form */}
            <form onSubmit={handleAiSend} className="p-3 bg-zinc-950/40 border-t border-white/5 flex gap-2">
              <input 
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="Ask AI (e.g. 'Recommend some Fuji Highlife fusion music')"
                className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none placeholder-zinc-500"
              />
              <button type="submit" className="bg-violet-600 hover:bg-violet-500 text-white p-2.5 rounded-xl cursor-pointer border-none">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* 6. PLAYABLE BEAT MAKER / SEQUENCER (/create) */}
        {path === "/create" && (
          <div className="max-w-xl mx-auto bg-[#161619] border border-white/5 p-6 md:p-8 rounded-3xl space-y-6 text-left shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div>
                <h4 className="text-sm font-black text-white uppercase flex items-center gap-2">
                  <Sliders className="w-4.5 h-4.5 text-violet-400" />
                  Platform Beatmaker & Sequencer
                </h4>
                <p className="text-[10px] text-zinc-400">Sequence drum lines and trigger high-fidelity synth nodes live</p>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSeqPlaying(!seqPlaying)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer border-none ${
                    seqPlaying ? "bg-red-600 text-white" : "bg-violet-650 text-white"
                  }`}
                >
                  {seqPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {seqPlaying ? "Stop Loop" : "Play Loop"}
                </button>

                <div className="flex items-center gap-2 bg-black/40 border border-white/5 px-2.5 py-1.5 rounded-xl">
                  <span className="text-[10px] text-zinc-500 font-mono">TEMPO:</span>
                  <input 
                    type="number" 
                    value={seqTempo} 
                    onChange={(e) => setSeqTempo(Number(e.target.value))}
                    className="w-10 bg-transparent text-xs text-white text-center font-mono focus:outline-none border-none"
                  />
                  <span className="text-[10px] text-zinc-500 font-mono">BPM</span>
                </div>
              </div>
            </div>

            {/* Sequencer Grid */}
            <div className="space-y-3">
              {["Kick Drum", "Snare Drum", "Closed Hat", "Perc Node"].map((drumName, rowIdx) => (
                <div key={drumName} className="flex items-center gap-4">
                  <span className="w-20 text-[10px] font-bold uppercase text-zinc-400">{drumName}</span>
                  <div className="flex-1 grid grid-cols-8 gap-2">
                    {Array.from({ length: 8 }).map((_, colIdx) => {
                      const isActive = seqGrid[rowIdx][colIdx];
                      const isCurrentStep = seqStep === colIdx && seqPlaying;
                      return (
                        <button
                          key={colIdx}
                          onClick={() => toggleSeqCell(rowIdx, colIdx)}
                          className={`h-9 rounded-lg transition-all cursor-pointer border ${
                            isActive 
                              ? "bg-violet-600 border-violet-500/50 shadow shadow-violet-600/30" 
                              : "bg-black/30 border-white/5 hover:bg-black/50"
                          } ${isCurrentStep ? "ring-2 ring-emerald-400 scale-[1.05]" : ""}`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Step Lights indicators */}
            <div className="flex items-center gap-4">
              <span className="w-20" />
              <div className="flex-1 grid grid-cols-8 gap-2">
                {Array.from({ length: 8 }).map((_, stepIdx) => (
                  <div 
                    key={stepIdx} 
                    className={`h-1 rounded-full transition-colors ${
                      seqStep === stepIdx && seqPlaying ? "bg-emerald-400" : "bg-zinc-800"
                    }`} 
                  />
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex justify-between items-center text-[10px] text-zinc-500">
              <span className="font-mono">Sequencer Track: 8-Step loops</span>
              <button 
                onClick={() => triggerToast("Beat sequence exported successfully!")}
                className="text-violet-400 hover:text-violet-300 bg-transparent border-none cursor-pointer font-bold uppercase tracking-wider"
              >
                Export Beat to Catalog
              </button>
            </div>
          </div>
        )}

        {/* 7. SOUND QUALITY CENTER & EQUALIZER (/audio) */}
        {path === "/audio" && (
          <div className="max-w-xl mx-auto bg-[#161619] border border-white/5 p-6 md:p-8 rounded-3xl text-left space-y-6 shadow-2xl">
            <div>
              <h4 className="text-sm font-black text-white uppercase flex items-center gap-2">
                <Sliders className="w-4.5 h-4.5 text-violet-400" />
                Lossless Audio & Equalizer Controls
              </h4>
              <p className="text-[10px] text-zinc-400">Configure studio sound quality output presets and monitor playback decibels</p>
            </div>

            {/* EQ sliders */}
            <div className="space-y-4 bg-black/20 border border-white/5 p-4 rounded-2xl">
              <h5 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">3-Band Graphic Equalizer</h5>
              
              <div className="space-y-3.5">
                {[
                  { name: "Bass Boost", min: "50Hz", value: eqBass, setter: setEqBass },
                  { name: "Middle Frequency", min: "1kHz", value: eqMid, setter: setEqMid },
                  { name: "Treble Clef", min: "10kHz", value: eqTreble, setter: setEqTreble },
                ].map(slide => (
                  <div key={slide.name} className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-zinc-300">{slide.name} ({slide.min})</span>
                      <span className="font-mono text-violet-400">{slide.value}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={slide.value}
                      onChange={(e) => slide.setter(Number(e.target.value))}
                      className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* High-fidelity toggles */}
            <div className="flex items-center justify-between bg-black/20 border border-white/5 p-4 rounded-2xl">
              <div className="space-y-0.5">
                <h5 className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
                  Hi-Fi Lossless FLAC Stream Mode
                </h5>
                <p className="text-[9px] text-zinc-550">Bypass browser audio compression for true 32-bit studio masters (Requires 10MB/s bandwidth)</p>
              </div>

              <button 
                onClick={() => {
                  setLosslessEnabled(!losslessEnabled);
                  triggerToast(losslessEnabled ? "Lossless audio disabled. Standard compression active." : "Lossless audio master enabled!");
                }}
                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer border-none ${
                  losslessEnabled 
                    ? "bg-violet-600/20 text-violet-400 border border-violet-500/20" 
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {losslessEnabled ? "ENABLED" : "DISABLED"}
              </button>
            </div>
          </div>
        )}

        {/* 8. GLOBAL INTERACTIVE MUSIC MAP (/world) */}
        {path === "/world" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Interactive geographic list */}
            <div className="lg:col-span-2 space-y-6 text-left">
              <div>
                <h4 className="text-sm font-black text-white uppercase flex items-center gap-2">
                  <Map className="w-4.5 h-4.5 text-violet-400" />
                  Interactive Sound Map
                </h4>
                <p className="text-[10px] text-zinc-400">Discover what is dominating the airwaves in major music hotbeds globally</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { name: "Nigeria", code: "NG", song: "Afrobeats Domination", trend: "+145%" },
                  { name: "United Kingdom", code: "UK", song: "London Drill Mix v2", trend: "+80%" },
                  { name: "United States", code: "US", song: "Retro Synth Waves", trend: "+110%" },
                  { name: "South Africa", code: "SA", song: "Amapiano Groove Night", trend: "+210%" }
                ].map(country => (
                  <button 
                    key={country.name}
                    onClick={() => {
                      setWorldActiveCountry(country.name);
                      triggerToast(`Switched map center: ${country.name}`);
                    }}
                    className={`p-4 rounded-2xl text-left border space-y-3 transition-all cursor-pointer ${
                      worldActiveCountry === country.name 
                        ? "bg-violet-600/10 border-violet-500 shadow-md shadow-violet-500/5" 
                        : "bg-[#161619] border-white/5 hover:border-white/10"
                    }`}
                  >
                    <span className="text-lg font-black font-mono text-violet-400">{country.code}</span>
                    <div className="space-y-0.5">
                      <h5 className="text-xs font-black text-white">{country.name}</h5>
                      <p className="text-[10px] text-zinc-550 truncate">{country.song}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Selected country trending dashboard */}
              <div className="bg-black/20 border border-white/5 p-4 rounded-2xl space-y-3">
                <h5 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                  Live stats for {worldActiveCountry}
                </h5>
                <div className="flex justify-between text-xs py-1 border-b border-white/5">
                  <span className="text-zinc-550">Top Regional Genre:</span>
                  <span className="font-bold text-violet-400">
                    {worldActiveCountry === "Nigeria" ? "Afrobeats" : worldActiveCountry === "South Africa" ? "Amapiano" : "Synthwave"}
                  </span>
                </div>
                <div className="flex justify-between text-xs py-1 border-b border-white/5">
                  <span className="text-zinc-550">Average stream latency:</span>
                  <span className="font-mono text-zinc-300">12ms</span>
                </div>
                <div className="flex justify-between text-xs py-1">
                  <span className="text-zinc-550">Active listeners:</span>
                  <span className="font-bold text-emerald-450 font-mono">14,240 live</span>
                </div>
              </div>
            </div>

            {/* Sidebar country map visualizer details */}
            <div className="bg-[#161619] border border-white/5 p-5 rounded-3xl text-left space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-violet-400" />
                Global Heatmap Statistics
              </h4>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Nigeria", value: 45 },
                        { name: "USA", value: 25 },
                        { name: "UK", value: 18 },
                        { name: "SA", value: 12 }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#8b5cf6" />
                      <Cell fill="#ec4899" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#10b981" />
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", fontSize: "10px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[10px] text-zinc-550 space-y-1 font-mono">
                <p>● Violet: Nigeria (45%)</p>
                <p>● Pink: United States (25%)</p>
                <p>● Orange: United Kingdom (18%)</p>
                <p>● Green: South Africa (12%)</p>
              </div>
            </div>

          </div>
        )}

        {/* 9. MARKETPLACE MERCHANDISE STORE (/store) */}
        {path === "/store" && (
          <div className="space-y-6 text-left">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">
                Physical Marketplace & Merchandise
              </h3>
              <div className="bg-violet-600/10 border border-violet-500/20 px-3 py-1 rounded-xl text-[10px] font-bold text-violet-400">
                Cart: {cartCount} items
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {[
                { name: "Limited Golden Vinyl Edition", price: "$34.99", img: "https://images.unsplash.com/photo-1487180142328-054b783fc471?q=80&w=400&auto=format&fit=crop" },
                { name: "HiFi Closed-Back Studio Headphones", price: "$149.99", img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=400&auto=format&fit=crop" },
                { name: "SoundStreamy Premium Retro Tee", price: "$24.99", img: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=400&auto=format&fit=crop" }
              ].map(prod => (
                <div key={prod.name} className="bg-[#161619] border border-white/5 hover:border-violet-500/20 p-4 rounded-3xl space-y-4 transition-all">
                  <div className="h-44 w-full rounded-2xl overflow-hidden relative">
                    <img src={prod.img} alt={prod.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-extrabold text-white leading-normal truncate">{prod.name}</h4>
                    <p className="text-[10px] font-mono text-violet-400 font-bold">{prod.price}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setCartCount(prev => prev + 1);
                      triggerToast(`Added ${prod.name} to cart!`);
                    }}
                    className="w-full py-2.5 bg-violet-650 hover:bg-violet-600 text-white text-[10px] font-bold uppercase rounded-xl transition-all cursor-pointer border-none"
                  >
                    Add to Cart
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 10. CENTRAL ECOSYSTEM PORTAL DIRECTORY FOR / AND /HOME */}
        {(path === "/" || path === "/home") && (
          <div className="space-y-8 text-left">
            {/* Ambient Hero Banner */}
            <div className="relative bg-[#161619] border border-white/5 rounded-3xl p-6 md:p-8 overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 to-transparent pointer-events-none" />
              <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="space-y-3 z-10 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase text-violet-400 tracking-widest animate-pulse">
                  <Sparkles className="w-3.5 h-3.5" />
                  SoundStreamy Connected Platform
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight leading-none">
                  The Independent <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400">Entertainment Ecosystem</span>
                </h2>
                <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
                  All sections are interconnected under the same SoundStreamy.com domain. Move easily between high-fidelity Music Streaming, dedicated VOD Video Cinema, interactive Audio/Video Livestreams, personal content Library, and daily Music News.
                </p>
                <div className="flex flex-wrap gap-4 pt-2 text-[11px] font-mono font-bold text-zinc-500">
                  <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-violet-400" /> FLAC Lossless Audio</span>
                  <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-violet-400" /> Decentralized Channels</span>
                  <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-violet-400" /> Dynamic Creator Splits</span>
                </div>
              </div>
              
              <div className="flex-shrink-0 z-10 bg-black/40 border border-white/5 p-4 rounded-2xl w-full md:w-56 space-y-3 font-mono text-xs">
                <div className="flex justify-between text-zinc-500">
                  <span>SYSTEM LATENCY</span>
                  <span className="text-violet-400 font-bold">12ms</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>ACTIVE SERVICES</span>
                  <span className="text-white font-bold">50 Connected</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>SECURE WALLET</span>
                  <span className="text-emerald-400 font-bold">SoundCoins™</span>
                </div>
                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500">STATUS</span>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    LIVE PORTAL
                  </span>
                </div>
              </div>
            </div>

            {/* Directory Navigation Controls */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
              {/* Category Filters */}
              <div className="flex flex-wrap gap-1.5 bg-black/20 border border-white/5 p-1 rounded-2xl">
                {["All", "Core Apps", "Discovery", "AI & Studio", "Business", "Community"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-[10px] font-extrabold uppercase transition-all cursor-pointer border-none ${
                      selectedCategory === cat 
                        ? "bg-violet-650 text-white shadow-lg" 
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search directories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#161619] border border-white/5 hover:border-white/10 focus:border-violet-500/30 text-xs px-9 py-2.5 rounded-2xl text-white placeholder-zinc-500 outline-none transition-all"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs border-none bg-transparent cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Bento-like Grid Directory */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                // Core
                { path: "/music", title: "Music & Streaming", subtitle: "High-fidelity lossless streaming player", category: "Core Apps", icon: Music, badge: "Primary Player" },
                { path: "/video", title: "Video Cinema Portal", subtitle: "Music videos, artist channels, and playlists", category: "Core Apps", icon: Tv, badge: "HD Media" },
                { path: "/livestream", title: "Live Streaming Lounge", subtitle: "Interactive live audio & video broadcasts", category: "Core Apps", icon: Radio, badge: "Live Chat Active" },
                { path: "/library", title: "Personal Music Library", subtitle: "Manage saved songs, custom playlists, and favorites", category: "Core Apps", icon: ListMusic, badge: "User Vault" },
                { path: "/music-news", title: "Daily Music News", subtitle: "Latest industry logs, articles, and reviews", category: "Core Apps", icon: FileText, badge: "Daily Feed" },
                
                // Discovery
                { path: "/artists", title: "Creator Directory Hub", subtitle: "Explore global artists and their verified tracks", category: "Discovery", icon: Users },
                { path: "/trending", title: "Trending Music Charts", subtitle: "Realtime stats on what the community is listening to", category: "Discovery", icon: TrendingUp },
                { path: "/playlists", title: "Curated Mood Playlists", subtitle: "Soundtrack your day with expertly designed sets", category: "Discovery", icon: Compass },
                { path: "/discover", title: "Sensory Music Discovery", subtitle: "Slide through genres matching your vibe perfectly", category: "Discovery", icon: Sparkles },
                { path: "/charts", title: "Billboard Top Records", subtitle: "Weekly countdowns of independent master records", category: "Discovery", icon: Award },
                { path: "/world", title: "Global Interactive Map", subtitle: "Explore regional trends across international borders", category: "Discovery", icon: Map },
                { path: "/local", title: "Local Gigs & Events", subtitle: "Discover artists performing near your current location", category: "Discovery", icon: MapPin },
                { path: "/releases", title: "Global Release Calendar", subtitle: "Track and count down upcoming indie single/album drops", category: "Discovery", icon: Calendar },

                // AI & Studio
                { path: "/ai", title: "Gemini AI Music Assistant", subtitle: "Curate lists and analyze musical stats via AI Chat", category: "AI & Studio", icon: Cpu, isHot: true },
                { path: "/audio", title: "Equalizer & Sound Control", subtitle: "Adjust audio frequencies and toggle lossless FLAC", category: "AI & Studio", icon: Sliders },
                { path: "/create", title: "Playable Beat Sequencer", subtitle: "Program drum loops on an interactive grid", category: "AI & Studio", icon: Sliders },
                { path: "/dj", title: "Virtual DJ Deck Hub", subtitle: "Virtual mix recordings and live scratching decks", category: "AI & Studio", icon: Disc },
                { path: "/producers", title: "Beat & Instrumental Portal", subtitle: "Rent or lease premium studio beat loops securely", category: "AI & Studio", icon: Headphones },
                { path: "/karaoke", title: "Sing-Along Karaoke Arena", subtitle: "Test vocal pitches with synchronized lyric backing", category: "AI & Studio", icon: Mic },

                // Creator & Business
                { path: "/for-artists", title: "Artist Upload Portal", subtitle: "Distribute your music and manage royalty splits", category: "Business", icon: Sparkles },
                { path: "/verified", title: "Artist Blue Verification", subtitle: "Submit credentials to gain official verification crest", category: "Business", icon: BadgeCheck },
                { path: "/analytics", title: "Performance Dashboard", subtitle: "Track play counts, retention rate, and geographic reach", category: "Business", icon: Activity },
                { path: "/insights", title: "Music Market Calculator", subtitle: "Simulate stream rates and distribution earnings", category: "Business", icon: Activity },
                { path: "/collab", title: "Collaboration Boards", subtitle: "Find session guitarists, singers, or top producers", category: "Business", icon: UserPlus },
                { path: "/jobs", title: "Independent Music Jobs", subtitle: "Explore open gigs in label marketing and audio engineering", category: "Business", icon: Briefcase },
                { path: "/partners", title: "Brand Sponsorship Matrix", subtitle: "Find marketing partnerships and local sponsors", category: "Business", icon: UserPlus },

                // Community & Rewards
                { path: "/community", title: "Community Social Lounge", subtitle: "Chat in realtime and watch live PK battle arenas", category: "Community", icon: MessageSquare },
                { path: "/fans", title: "Artist Dedicated Fan Clubs", subtitle: "Join custom fan clubs and unlock special badges", category: "Community", icon: Users },
                { path: "/feed", title: "Social Stream Feed", subtitle: "Updates from followed creators and music reviews", category: "Community", icon: Compass },
                { path: "/rewards", title: "Daily Rewards Center", subtitle: "Claim daily SoundCoins and purchase premium perks", category: "Community", icon: Coins },
                { path: "/academy", title: "SoundStreamy Academy", subtitle: "Watch masterclass lessons on sound mixing & design", category: "Community", icon: GraduationCap },
                { path: "/store", title: "Merchandise Marketplace", subtitle: "Buy vinyl records, headphones, and custom shirts", category: "Community", icon: ShoppingBag },
                { path: "/premium", title: "Unlock Premium FLAC", subtitle: "Experience ultimate lossless sound with zero ads", category: "Community", icon: Sparkles },
              ]
              .filter(sub => {
                const matchesSearch = sub.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                      sub.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                      sub.path.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesCategory = selectedCategory === "All" || sub.category === selectedCategory;
                return matchesSearch && matchesCategory;
              })
              .map((sub) => {
                const IconComp = sub.icon;
                const isCore = sub.category === "Core Apps";
                return (
                  <div 
                    key={sub.path} 
                    onClick={() => {
                      triggerToast(`Connecting to ${sub.title}...`);
                      onNavigate(sub.path);
                    }}
                    className="group bg-[#161619] border border-white/5 hover:border-violet-500/20 hover:bg-[#1a1a1f] p-5 rounded-3xl space-y-4 transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col justify-between"
                  >
                    <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-violet-600/0 group-hover:bg-violet-600/5 rounded-full blur-xl transition-all duration-300 pointer-events-none" />
                    
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className={`p-3 rounded-2xl ${isCore ? "bg-violet-600/10 text-violet-400 border border-violet-500/20" : "bg-white/5 text-zinc-400 group-hover:text-violet-400 group-hover:bg-violet-500/10 group-hover:border group-hover:border-violet-500/20"} transition-all`}>
                          <IconComp className="w-5 h-5" />
                        </div>
                        {isCore && sub.badge ? (
                          <span className="text-[9px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {sub.badge}
                          </span>
                        ) : sub.isHot ? (
                          <span className="text-[9px] font-bold text-fuchsia-400 bg-fuchsia-500/10 border border-fuchsia-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            HOT
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono text-zinc-500 group-hover:text-zinc-400 transition-colors uppercase font-bold">
                            {sub.category}
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-1 text-left">
                        <h4 className="text-xs font-black text-white group-hover:text-violet-400 transition-colors uppercase tracking-wide leading-normal">
                          {sub.title}
                        </h4>
                        <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
                          {sub.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/[0.02] flex items-center justify-between text-[10px] font-mono font-bold text-zinc-500 group-hover:text-violet-400 transition-colors">
                      <span>soundstreamy.com{sub.path}</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Direct Empty Search State */}
            {searchQuery && (
              <div className="bg-[#161619] border border-white/5 p-8 rounded-3xl text-center space-y-3">
                <Search className="w-8 h-8 text-zinc-650 mx-auto" />
                <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">No landing pages match your search term</p>
                <button 
                  onClick={() => setSearchQuery("")}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-750 rounded-xl text-[10px] font-bold text-white uppercase border-none cursor-pointer"
                >
                  Reset Search
                </button>
              </div>
            )}
          </div>
        )}

        {/* 11. SPOTLIGHT LANDING PAGE FALLBACK (FOR ALL OTHER PATHS) */}
        {!["/", "/home", "/artists", "/charts", "/community", "/discover", "/ai", "/create", "/audio", "/world", "/store"].includes(path) && (
          <div className="max-w-xl mx-auto bg-[#161619] border border-white/5 p-6 md:p-8 rounded-3xl space-y-6 text-left shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-violet-400 uppercase tracking-widest">Module Active</h4>
              <h3 className="text-lg font-black text-white uppercase">{page.title}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                You are currently viewing the high-performance {page.title} sub-section of SoundStreamy.com, beautifully structured as an independent landing page under our unified design framework.
              </p>
            </div>

            {/* Dynamic UI details cards representing features */}
            <div className="bg-black/20 border border-white/5 p-4 rounded-2xl space-y-3.5">
              <h5 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Section Overview & Capabilities</h5>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#1d1d22] rounded-xl border border-white/[0.02]">
                  <span className="font-extrabold text-white block mb-0.5">High Performance</span>
                  <p className="text-[10px] text-zinc-500 leading-normal">Bypasses typical server-side latency bounds dynamically.</p>
                </div>
                <div className="p-3 bg-[#1d1d22] rounded-xl border border-white/[0.02]">
                  <span className="font-extrabold text-white block mb-0.5">Hi-Res Synced</span>
                  <p className="text-[10px] text-zinc-500 leading-normal">All user accounts, profiles, and favorites remain active.</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row gap-3 sm:items-center justify-between text-xs">
              <span className="text-zinc-550 font-mono">soundstreamy.com{path}</span>
              <button 
                onClick={() => triggerToast(`Feature verified and updated!`)}
                className="px-4 py-2 bg-violet-650 hover:bg-violet-600 rounded-xl text-[10px] font-bold text-white uppercase tracking-wider cursor-pointer border-none"
              >
                Access Full Feature
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
