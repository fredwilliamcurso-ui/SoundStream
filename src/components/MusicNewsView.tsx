import React, { useState, useEffect, useMemo } from "react";
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Image as ImageIcon, 
  Calendar, 
  User as UserIcon, 
  Tag, 
  Share2, 
  ChevronLeft, 
  BookOpen, 
  Sparkles, 
  Clock, 
  ArrowLeft, 
  Copy, 
  Twitter, 
  Facebook, 
  Check,
  AlertCircle,
  Upload,
  Globe,
  Settings,
  Eye
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MusicNewsArticle, User } from "../types";
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy, getDoc } from "firebase/firestore";
import { db, auth, uploadToFirebaseStorage } from "../lib/firebase";
import Markdown from "react-markdown";
import { HighTechGroupChat } from "./HighTechGroupChat";

interface MusicNewsViewProps {
  currentUser: User | null;
  isAdmin?: boolean;
}

// Default pre-set high-quality Unsplash image templates
const COVER_TEMPLATES = [
  { name: "Concert Lights", url: "https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=800&auto=format&fit=crop" },
  { name: "Neon Studio", url: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=800&auto=format&fit=crop" },
  { name: "Vinyl Spin", url: "https://images.unsplash.com/photo-1487180142328-054b783fc471?q=80&w=800&auto=format&fit=crop" },
  { name: "Festival Crowd", url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop" },
  { name: "Retro DJ", url: "https://images.unsplash.com/photo-1516873240891-4bf014598ab4?q=80&w=800&auto=format&fit=crop" },
];

const NEWS_CATEGORIES = [
  "New Releases",
  "Artist Updates",
  "Rising Artists",
  "Music Trends",
  "Concerts & Events",
  "Music Industry News"
] as const;

// Preset seeded articles to ensure a gorgeous initialized feed
const PRESET_ARTICLES: Omit<MusicNewsArticle, "id">[] = [
  {
    title: "The SoundStream Evolution: The Rise of High-Fidelity Independent Music Streaming",
    category: "Music Industry News",
    coverUrl: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=800&auto=format&fit=crop",
    description: "How lossless streaming quality, zero-latency live streaming, and direct Web3 creator monetization models are transforming the independent music industry landscape.",
    content: `## The Next Wave of Independent Music Distribution

In 2026, the power balance in the music industry continues to shift dramatically towards independent creators. Platforms like **SoundStream** are at the absolute forefront of this movement, pioneering tools that grant artists unprecedented ownership over their craft and distribution channels.

### 1. High-Fidelity Audio as a Standard
For years, major streaming conglomerates treated high-fidelity and lossless audio as a premium tier add-on. Today, audiophiles and regular music listeners alike demand studio-quality output. SoundStream's built-in support for **uncompressed 320kbps & FLAC master delivery** has proved that listeners can hear the difference when artists have complete sonic freedom.

### 2. Direct-to-Fan Interaction
The traditional "middleman" structure is fading. Modern artists build entire communities around their live streams, virtual backstage lounges, and real-time PK battle arenas. By exchanging virtual gifts, fans aren't just passive listeners—they are active financial sponsors of their favorite indie acts.

### 3. Transparent Licensing & Automated Splits
Perhaps the most crucial technical evolution is the introduction of automated revenue splits. SoundStream's *Agency & Record Label Hub* allows groups, labels, and bands to automatically split streaming and gifting revenue at the database level, avoiding months of royalty litigation.

> "The future of music isn't about getting signed by the Big Three. It's about cultivating a passionate community of 1,000 true fans who support you directly." — *Elena Rostova, Lead Music Analyst*

What does this mean for the next generation? The barrier to entry has officially crumbled. All you need is a home studio, a laptop, and a story to tell.`,
    author: "Elena Rostova",
    publishedAt: new Date().toISOString(),
    tags: ["Streaming", "Indie Music", "HiFi Audio", "Monetization"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    title: "Afrobeats Global Domination: How West African Rhythms Captivated the Mainstream Charts",
    category: "Music Trends",
    coverUrl: "https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=800&auto=format&fit=crop",
    description: "An in-depth look at the syncopated percussion, infectious vocal melodies, and legendary cross-border collaborations fueling Afrobeats' climb to the top of Billboard.",
    content: `## The Syncopated Percussion of a New Era

From Lagos to London, New York to Tokyo, the undeniable groove of **Afrobeats** has successfully transcended cultural boundaries to become the dominant global sound of the mid-2020s. 

### The Formula Behind the Sound
At its heart, Afrobeats is an evolution of traditional Highlife, Fuji, and Jazz, fused with contemporary Hip Hop, Dancehall, and electronic production.
- **The Rhythm**: Built on complex polyrhythms, using talking drums and clave patterns.
- **The Melody**: Highly syncopated, utilizing pentatonic scales that are instantly memorable.
- **The Atmosphere**: Bright brass arrangements, acoustic guitars, and sub-basses designed for premium stadium sound systems.

### Major Milestones
With sold-out stadium runs at Wembley and Madison Square Garden, West African pioneers have paved the way for a massive influx of regional talent. This musical expansion is bolstered by platforms like SoundStream, which specialize in regional curation and direct distribution to global audiences.

### Amapiano's Parallel Surge
Alongside Afrobeats, South Africa’s **Amapiano** (a beautiful sub-genre of house music characterized by log drums, ambient synths, and soulful vocals) has experienced a spectacular chart presence. The synergy between these two African giants is creating a brand-new ecosystem of modern popular music.

Stay tuned as we continue to track the hottest cross-continental collaborations coming out this season!`,
    author: "Chidi Okafor",
    publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    tags: ["Afrobeats", "Amapiano", "Global Music", "Percussion"],
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  },
  {
    title: "Rising Star Spotlight: Inside Luna Gray's Bedroom Pop Masterpieces",
    category: "Rising Artists",
    coverUrl: "https://images.unsplash.com/photo-1487180142328-054b783fc471?q=80&w=800&auto=format&fit=crop",
    description: "We sat down with multi-instrumentalist and SoundStream breakout artist Luna Gray to talk home-recording hacks, analog synths, and songwriting vulnerability.",
    content: `## Vulnerability in the Age of Bedroom Production

Nineteen-year-old **Luna Gray** is the definition of a self-made musician. Recording entirely on a mid-tier dynamic microphone inside her college dorm room, Luna has managed to capture the hearts of millions of active listeners worldwide.

### Minimal Setup, Maximum Vibe
When we asked Luna about her studio gear, she laughed. "I literally have a basic laptop, a 2-key MIDI controller, and a vintage tape deck I bought for twenty dollars." 

Her signature style relies heavily on:
1. **Lo-Fi Saturation**: Routing her vocals through old cassette decks to achieve a warm, retro crackle.
2. **Layered Harmonies**: Stacking up to 16 vocal layers to create a dream-like, orchestral backdrop.
3. **Imperfect Timing**: Intentionally avoiding strict grid-quantization on her drum beats to give them a organic, human heartbeat.

### Crafting Her Upcoming Debut EP
Her new single *'Midnight Echoes'* is currently skyrocketing up the SoundStream Indie charts. Luna describes the writing process as "deeply therapeutic" and "highly embarrassing."

> "If you aren't slightly terrified of what people will think when they hear your lyrics, you probably didn't write an honest song." — *Luna Gray*

Luna's rise is proof that in 2026, authentic storytelling and raw emotional delivery are far more valuable than million-dollar recording studios. Check out her artist profile and stream *'Midnight Echoes'* today!`,
    author: "Marcus Vance",
    publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    tags: ["Luna Gray", "Bedroom Pop", "DIY Indie", "LoFi"],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  }
];

// Error handling helper in line with firebase-integration specifications
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function MusicNewsView({ currentUser, isAdmin: propIsAdmin }: MusicNewsViewProps) {
  // Determine if user has admin rights
  const userIsAdmin = useMemo(() => {
    if (propIsAdmin) return true;
    if (!currentUser) return false;
    return currentUser.role === "admin" || currentUser.email === "fredwilliamcurso@gmail.com";
  }, [currentUser, propIsAdmin]);

  // View States
  const [activeView, setActiveView] = useState<"feed" | "article" | "admin">("feed");
  const [selectedArticle, setSelectedArticle] = useState<MusicNewsArticle | null>(null);

  // Articles & Firestore State
  const [articles, setArticles] = useState<MusicNewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<typeof NEWS_CATEGORIES[number] | "All">("All");

  // Admin Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<typeof NEWS_CATEGORIES[number]>("New Releases");
  const [formCoverUrl, setFormCoverUrl] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formAuthor, setFormAuthor] = useState("");
  const [formScheduledAt, setFormScheduledAt] = useState("");
  const [formTagsString, setFormTagsString] = useState("");
  
  // Image Upload / Generation States
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageTab, setImageTab] = useState<"preset" | "url" | "upload">("preset");

  // Share system feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load articles on mount
  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    const path = "music_news";
    try {
      const q = query(collection(db, path));
      const querySnapshot = await getDocs(q);
      const loadedArticles: MusicNewsArticle[] = [];
      
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        loadedArticles.push({
          id: docSnap.id,
          ...data
        } as MusicNewsArticle);
      });

      // Sort by publication date descending
      loadedArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

      // Seed preset articles if DB is currently empty (for high-fidelity initial experience)
      if (loadedArticles.length === 0) {
        setIsLoading(true);
        const seeded: MusicNewsArticle[] = [];
        for (const preset of PRESET_ARTICLES) {
          const docRef = await addDoc(collection(db, path), preset);
          seeded.push({
            id: docRef.id,
            ...preset
          } as MusicNewsArticle);
        }
        seeded.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
        setArticles(seeded);
      } else {
        setArticles(loadedArticles);
      }
    } catch (err) {
      setErrorMsg("Failed to retrieve latest music news articles. Please try again.");
      handleFirestoreError(err, OperationType.LIST, path);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and Search logic (Non-admins don't see future-scheduled posts)
  const filteredArticles = useMemo(() => {
    const now = new Date();
    return articles.filter(art => {
      // 1. Scheduled posts visibility constraint
      if (!userIsAdmin) {
        const pubDate = new Date(art.publishedAt);
        if (pubDate > now) return false;
      }

      // 2. Category filter
      if (selectedCategory !== "All" && art.category !== selectedCategory) {
        return false;
      }

      // 3. Search text query filter
      if (searchQuery.trim() !== "") {
        const queryLower = searchQuery.toLowerCase();
        const matchesTitle = art.title.toLowerCase().includes(queryLower);
        const matchesDesc = art.description.toLowerCase().includes(queryLower);
        const matchesAuthor = art.author.toLowerCase().includes(queryLower);
        const matchesContent = art.content.toLowerCase().includes(queryLower);
        const matchesTags = art.tags.some(tag => tag.toLowerCase().includes(queryLower));
        return matchesTitle || matchesDesc || matchesAuthor || matchesContent || matchesTags;
      }

      return true;
    });
  }, [articles, selectedCategory, searchQuery, userIsAdmin]);

  // Related articles recommendation algorithm (same category first, excluding currently open)
  const relatedArticles = useMemo(() => {
    if (!selectedArticle) return [];
    return articles
      .filter(art => art.id !== selectedArticle.id)
      .filter(art => {
        // Hide future posts for users
        if (!userIsAdmin && new Date(art.publishedAt) > new Date()) return false;
        return true;
      })
      .map(art => {
        // Calculate score based on category or tag overlap
        let score = 0;
        if (art.category === selectedArticle.category) score += 3;
        const tagIntersection = art.tags.filter(t => selectedArticle.tags.includes(t));
        score += tagIntersection.length;
        return { art, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.art);
  }, [articles, selectedArticle, userIsAdmin]);

  // Featured Top Article (the latest published non-scheduled article)
  const featuredArticle = useMemo(() => {
    const now = new Date();
    return articles.find(art => {
      if (!userIsAdmin && new Date(art.publishedAt) > now) return false;
      return true;
    }) || null;
  }, [articles, userIsAdmin]);

  // Handle SEO Document Meta tags injection dynamically
  useEffect(() => {
    if (activeView === "article" && selectedArticle) {
      document.title = `${selectedArticle.title} - SoundStream Music News`;
      
      const updateMeta = (name: string, content: string, isProperty = false) => {
        const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
        let element = document.querySelector(selector);
        if (!element) {
          element = document.createElement("meta");
          if (isProperty) {
            element.setAttribute("property", name);
          } else {
            element.setAttribute("name", name);
          }
          document.head.appendChild(element);
        }
        element.setAttribute("content", content);
      };

      updateMeta("description", selectedArticle.description);
      updateMeta("og:title", `${selectedArticle.title} - SoundStream Music News`, true);
      updateMeta("og:description", selectedArticle.description, true);
      updateMeta("og:image", selectedArticle.coverUrl, true);
      updateMeta("twitter:title", `${selectedArticle.title} - SoundStream Music News`);
      updateMeta("twitter:description", selectedArticle.description);
      updateMeta("twitter:image", selectedArticle.coverUrl);
    } else {
      document.title = "Music News - SoundStream";
    }
  }, [activeView, selectedArticle]);

  // Handle Social Share clicks
  const handleCopyLink = (id: string) => {
    const shareUrl = `${window.location.origin}?tab=music-news&articleId=${id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  const handleShareTwitter = (art: MusicNewsArticle) => {
    const shareUrl = `${window.location.origin}?tab=music-news&articleId=${art.id}`;
    const text = encodeURIComponent(`Check out "${art.title}" on SoundStream Music News! 🎶`);
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${text}`, "_blank");
  };

  const handleShareFacebook = (art: MusicNewsArticle) => {
    const shareUrl = `${window.location.origin}?tab=music-news&articleId=${art.id}`;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, "_blank");
  };

  // Upload Cover Image handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadFile(file);
    setIsUploading(true);
    try {
      const downloadUrl = await uploadToFirebaseStorage(file, "music_news");
      setFormCoverUrl(downloadUrl);
    } catch (err) {
      console.error("Storage upload failed, fallback to visual placeholder URL", err);
      // Fallback placeholder if storage is unconfigured
      setFormCoverUrl(COVER_TEMPLATES[0].url);
    } finally {
      setIsUploading(false);
    }
  };

  // Reset Admin form
  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormTitle("");
    setFormCategory("New Releases");
    setFormCoverUrl(COVER_TEMPLATES[0].url);
    setFormDescription("");
    setFormContent("");
    setFormAuthor(currentUser?.username || "SoundStream Editorial");
    setFormScheduledAt("");
    setFormTagsString("");
    setUploadFile(null);
  };

  // Submit action (Add or Edit)
  const handleSubmitArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formDescription || !formContent) {
      alert("Please fill in all required fields (Title, Description, and Content).");
      return;
    }

    const path = "music_news";
    setIsLoading(true);

    // Process publishedAt date based on scheduling
    let publishedAt = new Date().toISOString();
    let scheduledAt = null;

    if (formScheduledAt) {
      const scheduledDate = new Date(formScheduledAt);
      if (scheduledDate > new Date()) {
        publishedAt = scheduledDate.toISOString();
        scheduledAt = scheduledDate.toISOString();
      }
    }

    const tags = formTagsString
      .split(",")
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    const articlePayload: Omit<MusicNewsArticle, "id"> = {
      title: formTitle,
      category: formCategory,
      coverUrl: formCoverUrl || COVER_TEMPLATES[0].url,
      description: formDescription,
      content: formContent,
      author: formAuthor || currentUser?.username || "SoundStream Editorial",
      publishedAt,
      scheduledAt,
      tags,
      createdAt: isEditing ? articles.find(a => a.id === editingId)?.createdAt || new Date().toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      if (isEditing && editingId) {
        const articleRef = doc(db, path, editingId);
        await updateDoc(articleRef, articlePayload);
      } else {
        await addDoc(collection(db, path), articlePayload);
      }
      resetForm();
      await fetchArticles();
      setActiveView("feed");
    } catch (err) {
      alert("Failed to commit article to database. Check console logs.");
      handleFirestoreError(err, isEditing ? OperationType.UPDATE : OperationType.CREATE, path);
    } finally {
      setIsLoading(false);
    }
  };

  // Edit action
  const startEdit = (art: MusicNewsArticle) => {
    setIsEditing(true);
    setEditingId(art.id);
    setFormTitle(art.title);
    setFormCategory(art.category);
    setFormCoverUrl(art.coverUrl);
    setFormDescription(art.description);
    setFormContent(art.content);
    setFormAuthor(art.author);
    if (art.scheduledAt) {
      // Format ISO string to local datetime-local format
      const localDate = new Date(art.scheduledAt);
      const year = localDate.getFullYear();
      const month = String(localDate.getMonth() + 1).padStart(2, "0");
      const day = String(localDate.getDate()).padStart(2, "0");
      const hours = String(localDate.getHours()).padStart(2, "0");
      const minutes = String(localDate.getMinutes()).padStart(2, "0");
      setFormScheduledAt(`${year}-${month}-${day}T${hours}:${minutes}`);
    } else {
      setFormScheduledAt("");
    }
    setFormTagsString(art.tags.join(", "));
    setActiveView("admin");
  };

  // Delete article action
  const handleDeleteArticle = async (id: string) => {
    if (!window.confirm("Are you absolutely sure you want to delete this news article? This action cannot be undone.")) return;
    const path = "music_news";
    setIsLoading(true);
    try {
      await deleteDoc(doc(db, path, id));
      await fetchArticles();
      if (selectedArticle?.id === id) {
        setSelectedArticle(null);
        setActiveView("feed");
      }
    } catch (err) {
      alert("Failed to delete article.");
      handleFirestoreError(err, OperationType.DELETE, path);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="soundstream-music-news" className="text-zinc-100 min-h-screen">
      {/* Upper Navigation & Section Toggle */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
        <div className="flex items-center gap-3">
          {activeView !== "feed" && (
            <button 
              id="back-to-feed-btn"
              onClick={() => {
                setActiveView("feed");
                setSelectedArticle(null);
              }}
              className="p-2 bg-zinc-900/60 border border-white/5 hover:border-indigo-500/50 rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              Music News Portal
            </h2>
            <p className="text-xs text-zinc-500">
              {activeView === "feed" && "Daily releases, artist spotlights, and industry scoops"}
              {activeView === "article" && `Reading: ${selectedArticle?.title.slice(0, 30)}...`}
              {activeView === "admin" && (isEditing ? "Modify Published Article" : "Compose Fresh Article")}
            </p>
          </div>
        </div>

        {/* Admin and Author Control Center Toggle */}
        {userIsAdmin && (
          <div className="flex items-center gap-2">
            {activeView !== "admin" ? (
              <button
                id="toggle-admin-pane"
                onClick={() => {
                  resetForm();
                  setActiveView("admin");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/10 border border-indigo-500/20 hover:border-indigo-500 text-indigo-400 hover:text-white font-medium text-xs rounded-xl transition-all cursor-pointer shadow-inner shadow-indigo-500/5"
              >
                <Plus className="w-3.5 h-3.5" />
                Publish News
              </button>
            ) : (
              <button
                id="cancel-admin-pane"
                onClick={() => {
                  resetForm();
                  setActiveView("feed");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/80 border border-white/5 hover:border-zinc-500/30 text-zinc-400 hover:text-white font-medium text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel Compose
              </button>
            )}
          </div>
        )}
      </div>

      {/* FEED VIEW (Default Reader view) */}
      {activeView === "feed" && (
        <div className="space-y-8">
          {/* Header Controls: Filters & Search */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-zinc-950/25 border border-white/[0.03] p-4 rounded-2xl shadow-inner">
            {/* Category Filter Scroll */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 lg:pb-0 scrollbar-none max-w-full">
              <button
                onClick={() => setSelectedCategory("All")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer uppercase tracking-wider ${
                  selectedCategory === "All"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/15"
                    : "bg-zinc-900/40 border border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800/40"
                }`}
              >
                All
              </button>
              {NEWS_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer uppercase tracking-wider ${
                    selectedCategory === cat
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/15"
                      : "bg-zinc-900/40 border border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800/40"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Live Search Bar */}
            <div className="relative min-w-[280px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search music news, tags, authors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900/50 hover:bg-zinc-900/80 focus:bg-zinc-950 border border-white/5 hover:border-white/10 focus:border-indigo-500/50 pl-10 pr-4 py-2 rounded-xl text-xs text-white placeholder-zinc-500 outline-none transition-all shadow-inner"
              />
            </div>
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
              <p className="text-xs text-zinc-500 font-mono tracking-widest uppercase">Fetching Daily Music Scoop...</p>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-center gap-3 bg-red-950/20 border border-red-500/20 p-4 rounded-xl text-red-400 text-xs shadow-inner">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Seeded Featured News banner */}
          {!isLoading && !errorMsg && featuredArticle && selectedCategory === "All" && searchQuery === "" && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="group relative h-[380px] rounded-3xl overflow-hidden border border-white/5 shadow-2xl flex items-end cursor-pointer"
              onClick={() => {
                setSelectedArticle(featuredArticle);
                setActiveView("article");
              }}
            >
              {/* Back Cover Artwork */}
              <div 
                className="absolute inset-0 bg-cover bg-center group-hover:scale-102 transition-transform duration-700 ease-out"
                style={{ backgroundImage: `url(${featuredArticle.coverUrl})` }}
              />
              {/* Premium Cinematic Dark Vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-black/20" />
              
              {/* Content Panel */}
              <div className="relative p-6 md:p-10 space-y-3 z-10 w-full">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 bg-indigo-600 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg shadow">
                    {featuredArticle.category}
                  </span>
                  {new Date(featuredArticle.publishedAt) > new Date() && (
                    <span className="px-2.5 py-1 bg-amber-600/20 border border-amber-500/30 text-amber-400 font-mono text-[9px] uppercase tracking-wider rounded-lg">
                      Scheduled Release
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(featuredArticle.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                <h3 className="text-xl md:text-3xl font-extrabold text-white tracking-tight leading-tight group-hover:text-indigo-300 transition-colors">
                  {featuredArticle.title}
                </h3>

                <p className="text-xs md:text-sm text-zinc-400 max-w-2xl line-clamp-2 leading-relaxed">
                  {featuredArticle.description}
                </p>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                      <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                    <span className="text-xs font-semibold text-zinc-300">{featuredArticle.author}</span>
                  </div>

                  <span className="text-xs text-indigo-400 group-hover:text-indigo-300 font-bold flex items-center gap-1 tracking-wider uppercase">
                    Read Spotlight
                    <Sparkles className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Grid Layout of News Cards */}
          {!isLoading && !errorMsg && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-zinc-500 tracking-widest uppercase font-mono">
                {selectedCategory !== "All" || searchQuery !== "" ? "Search results" : "Latest Editorial Columns"}
              </h3>

              {filteredArticles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-zinc-950/10 border border-white/[0.02] rounded-2xl text-center">
                  <Search className="w-8 h-8 text-zinc-600 mb-2" />
                  <p className="text-sm font-semibold text-zinc-400">No matching news articles found</p>
                  <p className="text-xs text-zinc-500 max-w-xs mt-1">Try adjusting your filters, categories, or searching for other music keywords.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredArticles.map((art) => (
                    <motion.div
                      layout
                      key={art.id}
                      className="group bg-zinc-900/30 hover:bg-zinc-900/60 border border-white/[0.03] hover:border-white/10 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col h-full shadow-lg relative"
                    >
                      {/* Image Thumbnail Container */}
                      <div 
                        onClick={() => {
                          setSelectedArticle(art);
                          setActiveView("article");
                        }}
                        className="h-48 overflow-hidden relative cursor-pointer"
                      >
                        <img 
                          src={art.coverUrl} 
                          alt={art.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500 ease-out"
                        />
                        {/* Shading overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent opacity-80" />
                        
                        {/* Category Badge over image */}
                        <span className="absolute top-3 left-3 px-2 py-0.5 bg-zinc-950/80 backdrop-blur-md border border-white/10 text-indigo-400 font-extrabold text-[9px] uppercase tracking-wider rounded-md shadow-md">
                          {art.category}
                        </span>

                        {/* Scheduled Indicator */}
                        {new Date(art.publishedAt) > new Date() && (
                          <span className="absolute top-3 right-3 px-2 py-0.5 bg-amber-600 text-white font-mono text-[8px] uppercase tracking-wider rounded-md shadow-md">
                            Scheduled
                          </span>
                        )}
                      </div>

                      {/* Card Content Panel */}
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div className="space-y-2">
                          {/* Date and author */}
                          <div className="flex items-center justify-between text-[10px] text-zinc-500 font-medium">
                            <span className="flex items-center gap-1">
                              <UserIcon className="w-3 h-3 text-zinc-500" />
                              {art.author}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-zinc-500" />
                              {new Date(art.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>

                          {/* Title */}
                          <h4 
                            onClick={() => {
                              setSelectedArticle(art);
                              setActiveView("article");
                            }}
                            className="font-bold text-white tracking-tight leading-snug text-sm group-hover:text-indigo-400 transition-colors line-clamp-2 cursor-pointer"
                          >
                            {art.title}
                          </h4>

                          {/* Description */}
                          <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                            {art.description}
                          </p>
                        </div>

                        {/* Footer details */}
                        <div className="pt-4 border-t border-white/[0.03] mt-4 flex items-center justify-between">
                          {/* Tags Preview */}
                          <div className="flex items-center gap-1 overflow-hidden max-w-[120px]">
                            {art.tags.slice(0, 2).map((tag, i) => (
                              <span key={i} className="text-[9px] font-mono bg-zinc-950 text-zinc-400 px-1.5 py-0.5 rounded border border-white/5 max-w-[50px] truncate">
                                #{tag}
                              </span>
                            ))}
                          </div>

                          {/* Action elements */}
                          <div className="flex items-center gap-1.5">
                            {/* Copy button */}
                            <button
                              onClick={() => handleCopyLink(art.id)}
                              className="p-1.5 bg-zinc-950/60 hover:bg-zinc-950 border border-white/5 hover:border-white/10 rounded-lg text-zinc-500 hover:text-white transition-all cursor-pointer"
                              title="Copy Article Link"
                            >
                              {copiedId === art.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>

                            {/* Read More link */}
                            <button
                              onClick={() => {
                                setSelectedArticle(art);
                                setActiveView("article");
                              }}
                              className="px-3 py-1.5 bg-zinc-950/40 hover:bg-indigo-600 border border-white/5 hover:border-indigo-500 text-zinc-300 hover:text-white font-extrabold text-[9px] uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                            >
                              Read More
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Admin overlay edit/delete controls */}
                      {userIsAdmin && (
                        <div className="absolute top-3 right-3 hidden group-hover:flex items-center gap-1.5 bg-zinc-950/80 backdrop-blur-md p-1 rounded-lg border border-white/10 shadow-lg">
                          <button
                            onClick={() => startEdit(art)}
                            className="p-1 hover:bg-zinc-800 rounded text-amber-400 hover:text-amber-300 transition-all cursor-pointer"
                            title="Edit Article"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteArticle(art.id)}
                            className="p-1 hover:bg-zinc-800 rounded text-red-400 hover:text-red-300 transition-all cursor-pointer"
                            title="Delete Article"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ARTICLE DETAILS VIEW (Reader View) */}
      {activeView === "article" && selectedArticle && (
        <div className="space-y-8">
          {/* Main Article Banner layout */}
          <div className="relative h-[280px] md:h-[360px] rounded-3xl overflow-hidden border border-white/5 shadow-2xl flex items-end">
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${selectedArticle.coverUrl})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-black/30" />
            
            <div className="relative p-6 md:p-10 space-y-3 z-10 w-full">
              {/* Category, Date & Author Panel */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-2.5 py-1 bg-indigo-600 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg shadow">
                  {selectedArticle.category}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-zinc-300 font-semibold bg-zinc-950/50 px-2 py-1 rounded-md backdrop-blur-md">
                  <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
                  By {selectedArticle.author}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-zinc-300 font-semibold bg-zinc-950/50 px-2 py-1 rounded-md backdrop-blur-md">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  {new Date(selectedArticle.publishedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>

              {/* Document Title */}
              <h3 className="text-xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
                {selectedArticle.title}
              </h3>

              {/* Tags panel */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {selectedArticle.tags.map((tag, i) => (
                  <span key={i} className="text-[10px] font-mono bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 px-2.5 py-0.5 rounded-md">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Grid Layout of Content Panel & Related Items Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Primary Article Content */}
            <div className="lg:col-span-2 bg-zinc-900/20 border border-white/[0.03] p-6 md:p-8 rounded-3xl space-y-6 shadow-xl">
              {/* Short Description Quote block */}
              <div className="border-l-4 border-indigo-500 pl-4 py-1.5 italic text-zinc-400 text-xs md:text-sm leading-relaxed bg-zinc-950/30 rounded-r-xl pr-4 shadow-inner">
                {selectedArticle.description}
              </div>

              {/* Markdown Body Parser */}
              <div className="markdown-body prose prose-invert text-zinc-300 text-xs md:text-sm leading-relaxed space-y-4">
                <Markdown>{selectedArticle.content}</Markdown>
              </div>

              {/* Social sharing widget */}
              <div className="pt-6 border-t border-white/5 mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase block">Spread the Sound</span>
                  <p className="text-xs text-zinc-400">Loved this article? Share it directly with your circle!</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyLink(selectedArticle.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 hover:bg-zinc-900 border border-white/5 hover:border-white/10 rounded-xl text-zinc-300 hover:text-white text-xs transition-all cursor-pointer font-bold shadow-md"
                  >
                    {copiedId === selectedArticle.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-400" />
                        Copied Link
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Link
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleShareTwitter(selectedArticle)}
                    className="flex items-center justify-center p-2 bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 border border-[#1DA1F2]/20 rounded-xl text-[#1DA1F2] hover:text-[#1DA1F2]/90 transition-all cursor-pointer"
                    title="Share on Twitter"
                  >
                    <Twitter className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleShareFacebook(selectedArticle)}
                    className="flex items-center justify-center p-2 bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-[#1877F2]/20 rounded-xl text-[#1877F2] hover:text-[#1877F2]/90 transition-all cursor-pointer"
                    title="Share on Facebook"
                  >
                    <Facebook className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* High-Tech Group Chat Integration */}
              <div className="pt-8 border-t border-white/5 mt-8 space-y-4">
                <div className="text-left flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-violet-400 tracking-widest uppercase block">Live Discussion Arena</span>
                    <h4 className="text-sm font-black text-white uppercase mt-0.5">Article Lounge Chat</h4>
                  </div>
                  <div className="text-[10px] text-zinc-500 font-semibold bg-violet-500/5 px-2.5 py-1 rounded-xl border border-violet-500/10">
                    Realtime Synced
                  </div>
                </div>
                <HighTechGroupChat 
                  chatId={`news_article_${selectedArticle.id}`} 
                  title={selectedArticle.title.slice(0, 30)} 
                  category="Music News Debate" 
                  currentUser={currentUser} 
                />
              </div>

            </div>

            {/* Sidebar Column: Related Articles Recommendations */}
            <div className="space-y-5 lg:sticky lg:top-6">
              <h3 className="text-xs font-bold text-zinc-500 tracking-widest uppercase font-mono border-b border-white/5 pb-2">
                Recommended Stories
              </h3>

              {relatedArticles.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">No related articles found matching this column.</p>
              ) : (
                <div className="space-y-4">
                  {relatedArticles.map(art => (
                    <div 
                      key={art.id}
                      onClick={() => {
                        setSelectedArticle(art);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="group flex gap-3.5 bg-zinc-900/20 hover:bg-zinc-900/50 border border-white/[0.03] hover:border-white/10 p-3 rounded-2xl cursor-pointer transition-all shadow"
                    >
                      {/* Image Preview */}
                      <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 relative">
                        <img 
                          src={art.coverUrl} 
                          alt={art.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>

                      {/* Info Panel */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <span className="text-[8px] font-extrabold text-indigo-400 uppercase tracking-widest block">
                            {art.category}
                          </span>
                          <h4 className="font-bold text-white text-xs leading-snug tracking-tight group-hover:text-indigo-400 transition-colors line-clamp-2 mt-0.5">
                            {art.title}
                          </h4>
                        </div>
                        <span className="text-[9px] text-zinc-500 mt-1">
                          By {art.author}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Mini promotion banner to round up visual rhythm */}
              <div className="bg-gradient-to-br from-indigo-950/40 to-purple-950/40 border border-indigo-500/10 p-5 rounded-2xl space-y-3 shadow-inner">
                <span className="px-2 py-0.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-[8px] uppercase tracking-widest font-mono rounded">
                  SoundStream HQ
                </span>
                <p className="text-xs font-extrabold text-white leading-tight">Want to distribute your own music on SoundStream?</p>
                <p className="text-[10px] text-zinc-400 leading-relaxed">Join our creator alliance, host live rooms, and earn Diamonds directly from your listeners.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN COMPOSE / EDIT VIEW */}
      {activeView === "admin" && userIsAdmin && (
        <div className="bg-zinc-900/20 border border-white/[0.03] p-6 md:p-8 rounded-3xl shadow-xl">
          <form onSubmit={handleSubmitArticle} className="space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest font-mono border-b border-white/5 pb-2">
              {isEditing ? "Edit Article Credentials" : "Publish Daily Editorial"}
            </h3>

            {/* Error notifications */}
            {errorMsg && (
              <div className="flex items-center gap-3 bg-red-950/20 border border-red-500/20 p-4 rounded-xl text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Title block */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                Article Title <span className="text-indigo-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Breakout Synth Wave Star releases brand new album 'Sunset Boulevard'"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full bg-zinc-950/60 border border-white/5 focus:border-indigo-500/50 px-4 py-2.5 rounded-xl text-xs text-white placeholder-zinc-600 outline-none transition-all shadow-inner"
              />
            </div>

            {/* Category selection and Author */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                  Category <span className="text-indigo-400">*</span>
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as typeof NEWS_CATEGORIES[number])}
                  className="w-full bg-zinc-950/60 border border-white/5 focus:border-indigo-500/50 px-4 py-2.5 rounded-xl text-xs text-white outline-none transition-all"
                >
                  {NEWS_CATEGORIES.map(cat => (
                    <option key={cat} value={cat} className="bg-zinc-950 text-white">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                  Author Name <span className="text-indigo-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SoundStream Editorial / Elena Rostova"
                  value={formAuthor}
                  onChange={(e) => setFormAuthor(e.target.value)}
                  className="w-full bg-zinc-950/60 border border-white/5 focus:border-indigo-500/50 px-4 py-2.5 rounded-xl text-xs text-white placeholder-zinc-600 outline-none transition-all shadow-inner"
                />
              </div>
            </div>

            {/* Thumbnail Image section */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                Cover Image Setup
              </label>

              {/* Segmented Image Type Toggle */}
              <div className="flex gap-1 bg-zinc-950/40 p-1 border border-white/5 rounded-xl self-start w-fit">
                <button
                  type="button"
                  onClick={() => setImageTab("preset")}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    imageTab === "preset" ? "bg-indigo-600 text-white shadow" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Preset Templates
                </button>
                <button
                  type="button"
                  onClick={() => setImageTab("url")}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    imageTab === "url" ? "bg-indigo-600 text-white shadow" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Custom URL
                </button>
                <button
                  type="button"
                  onClick={() => setImageTab("upload")}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    imageTab === "upload" ? "bg-indigo-600 text-white shadow" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Local Upload
                </button>
              </div>

              {/* Tab: Presets */}
              {imageTab === "preset" && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                  {COVER_TEMPLATES.map((tpl, i) => (
                    <div
                      key={i}
                      onClick={() => setFormCoverUrl(tpl.url)}
                      className={`relative h-20 rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                        formCoverUrl === tpl.url ? "border-indigo-500 scale-98 shadow-lg shadow-indigo-500/20" : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={tpl.url} alt={tpl.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40" />
                      <span className="absolute bottom-1.5 left-1.5 text-[9px] font-bold text-white">{tpl.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab: Custom URL */}
              {imageTab === "url" && (
                <input
                  type="url"
                  placeholder="Paste secure image URL (HTTPS)"
                  value={formCoverUrl}
                  onChange={(e) => setFormCoverUrl(e.target.value)}
                  className="w-full bg-zinc-950/60 border border-white/5 focus:border-indigo-500/50 px-4 py-2.5 rounded-xl text-xs text-white placeholder-zinc-600 outline-none transition-all shadow-inner"
                />
              )}

              {/* Tab: Upload */}
              {imageTab === "upload" && (
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 px-4 py-2.5 bg-zinc-950 border border-white/5 hover:border-indigo-500/50 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-inner">
                    <Upload className="w-4 h-4 text-indigo-400" />
                    Choose File
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                  {isUploading ? (
                    <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
                      <div className="w-3.5 h-3.5 border border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                      Uploading file...
                    </div>
                  ) : uploadFile ? (
                    <span className="text-xs text-zinc-400 font-mono truncate max-w-xs">{uploadFile.name} (uploaded!)</span>
                  ) : (
                    <span className="text-[10px] text-zinc-500 italic">Supports JPG, PNG, WEBP</span>
                  )}
                </div>
              )}

              {/* Selected Image Preview pane */}
              {formCoverUrl && (
                <div className="flex items-center gap-3 bg-zinc-950/20 border border-white/[0.02] p-3 rounded-xl mt-2 w-fit">
                  <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                    <img src={formCoverUrl} alt="Cover Preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block">Selected Artwork</span>
                    <span className="text-xs text-zinc-300 truncate max-w-[240px] block font-mono">{formCoverUrl}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Short Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                Short Description / Abstract <span className="text-indigo-400">*</span>
              </label>
              <textarea
                required
                rows={2}
                maxLength={250}
                placeholder="Compose a concise abstract (up to 250 characters) introducing the core news item. Shown in news cards and sharing widgets."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full bg-zinc-950/60 border border-white/5 focus:border-indigo-500/50 px-4 py-2.5 rounded-xl text-xs text-white placeholder-zinc-600 outline-none transition-all shadow-inner resize-none"
              />
              <span className="text-[10px] text-zinc-500 block text-right font-mono">{formDescription.length}/250 characters</span>
            </div>

            {/* Full Content Body (Supports MD) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                Article Body Content (Supports Markdown styling) <span className="text-indigo-400">*</span>
              </label>
              <textarea
                required
                rows={10}
                placeholder="Write your beautiful article content here! Use ## for subheadings, ** for bold, - for lists, and > for blockquotes."
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                className="w-full bg-zinc-950/60 border border-white/5 focus:border-indigo-500/50 px-4 py-3 rounded-xl text-xs text-white placeholder-zinc-600 outline-none transition-all shadow-inner font-sans resize-y"
              />
            </div>

            {/* Scheduled Release & Tags */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                  Future Scheduling (Leave blank for instant publishing)
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="datetime-local"
                    value={formScheduledAt}
                    onChange={(e) => setFormScheduledAt(e.target.value)}
                    className="w-full bg-zinc-950/60 border border-white/5 focus:border-indigo-500/50 pl-10 pr-4 py-2.5 rounded-xl text-xs text-white outline-none transition-all shadow-inner"
                  />
                </div>
                <p className="text-[10px] text-zinc-500 leading-normal">
                  Articles scheduled in the future are invisible to public readers until the set release date/time has passed.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                  Tags (Separated by commas)
                </label>
                <div className="relative">
                  <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="e.g. Pop, Album Release, Luna Gray, Tour"
                    value={formTagsString}
                    onChange={(e) => setFormTagsString(e.target.value)}
                    className="w-full bg-zinc-950/60 border border-white/5 focus:border-indigo-500/50 pl-10 pr-4 py-2.5 rounded-xl text-xs text-white placeholder-zinc-600 outline-none transition-all shadow-inner"
                  />
                </div>
                <p className="text-[10px] text-zinc-500 leading-normal">
                  Tags help recommendations connect and make search results highly accurate.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-white/5 flex justify-end gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-zinc-900 border border-white/5 hover:border-zinc-500/30 text-zinc-400 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Discard Draft
              </button>
              <button
                type="submit"
                disabled={isLoading || isUploading}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-500/10 flex items-center gap-1.5 disabled:opacity-50"
              >
                {isLoading ? "Publishing..." : isEditing ? "Save Adjustments" : "Publish to SoundStream"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
