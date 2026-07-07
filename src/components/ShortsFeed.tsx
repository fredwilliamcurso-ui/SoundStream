import React, { useState, useEffect, useRef } from "react";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  increment, 
  arrayUnion, 
  arrayRemove 
} from "firebase/firestore";
import { 
  Video, 
  Heart, 
  MessageSquare, 
  Share2, 
  Bookmark, 
  AlertTriangle, 
  Search, 
  Plus, 
  Check, 
  Volume2, 
  VolumeX, 
  ChevronRight, 
  X, 
  Send,
  Loader2,
  Compass,
  TrendingUp,
  Clock,
  Music,
  UserCheck
} from "lucide-react";
import { db, auth } from "../lib/firebase";
import { ShortVideo, ShortComment, ShortReply, Song, Artist } from "../types";

interface ShortsFeedProps {
  currentUser: any;
  followingArtists: string[];
  onFollowToggle: (artistId: string) => Promise<void>;
  songs: Song[];
  artists: Artist[];
  onSelectSong: (song: Song) => void;
  setCurrentTab: (tab: string) => void;
}

export default function ShortsFeed({
  currentUser,
  followingArtists,
  onFollowToggle,
  songs,
  artists,
  onSelectSong,
  setCurrentTab
}: ShortsFeedProps) {
  // Tabs for Discovery
  const [activeTab, setActiveTab] = useState<"recommended" | "following" | "trending" | "new" | "music">("recommended");
  const [searchQuery, setSearchQuery] = useState("");
  const [shorts, setShorts] = useState<ShortVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  
  // Realtime active video index
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);

  // Modal / Drawer states
  const [commentDrawerOpen, setCommentDrawerOpen] = useState(false);
  const [activeShortForComments, setActiveShortForComments] = useState<ShortVideo | null>(null);
  const [comments, setComments] = useState<ShortComment[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<ShortComment | null>(null);
  const [replyText, setReplyText] = useState("");

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [activeShortForReport, setActiveShortForReport] = useState<ShortVideo | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);

  // Watch History states for Recommendations
  const [watchHistory, setWatchHistory] = useState<string[]>([]);

  // Real-time listener for all public shorts
  useEffect(() => {
    setLoading(true);
    const shortsQuery = query(
      collection(db, "shorts"),
      where("visibility", "==", "public")
    );

    const unsubscribe = onSnapshot(shortsQuery, (snapshot) => {
      const docsList: ShortVideo[] = [];
      snapshot.forEach((doc) => {
        docsList.push({ id: doc.id, ...doc.data() } as ShortVideo);
      });
      setShorts(docsList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching shorts feed:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch watch history for recommendations scoring
  useEffect(() => {
    if (!currentUser) return;
    const fetchWatchHistory = async () => {
      try {
        const historyQuery = query(
          collection(db, "shorts_analytics"),
          where("userId", "==", currentUser.uid),
          where("completionRate", ">=", 0.8)
        );
        const snap = await getDocs(historyQuery);
        const watchedIds: string[] = [];
        snap.forEach((doc) => {
          watchedIds.push(doc.data().videoId);
        });
        setWatchHistory(watchedIds);
      } catch (err) {
        console.warn("Could not load shorts watch history", err);
      }
    };
    fetchWatchHistory();
  }, [currentUser]);

  // Real-time comments listener
  useEffect(() => {
    if (!activeShortForComments) {
      setComments([]);
      return;
    }

    const commentsQuery = query(
      collection(db, "shorts", activeShortForComments.id, "comments"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const commentsList: ShortComment[] = [];
      snapshot.forEach((doc) => {
        commentsList.push({ commentId: doc.id, ...doc.data() } as ShortComment);
      });
      setComments(commentsList);
    }, (error) => {
      console.error("Error fetching comments:", error);
    });

    return () => unsubscribe();
  }, [activeShortForComments]);

  // Filter & Recommendations Algorithm
  const getProcessedShorts = () => {
    let list = [...shorts];

    // Search filter
    if (searchQuery.trim().length > 0) {
      const queryLower = searchQuery.toLowerCase().trim();
      list = list.filter((v) => {
        const titleMatch = v.title?.toLowerCase().includes(queryLower);
        const creatorMatch = v.creatorName?.toLowerCase().includes(queryLower);
        const hashtagMatch = v.hashtags?.some((tag) => tag.toLowerCase().includes(queryLower));
        return titleMatch || creatorMatch || hashtagMatch;
      });
    }

    // Discovery Category Switch
    if (activeTab === "following") {
      // Show only shorts from creators the user follows
      list = list.filter((v) => followingArtists.includes(v.creatorId));
    } else if (activeTab === "trending") {
      // Sort by views & likes
      list.sort((a, b) => ((b.views || 0) + (b.likes || 0) * 4) - ((a.views || 0) + (a.likes || 0) * 4));
    } else if (activeTab === "new") {
      // Sort by release date
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (activeTab === "music") {
      // Shorts linked to a song
      list = list.filter((v) => !!v.musicId);
    } else if (activeTab === "recommended") {
      // Recommendation engine scoring
      list = list.map((v) => {
        let score = 0;
        
        // 1. Followed creator preference (+100)
        if (followingArtists.includes(v.creatorId)) {
          score += 100;
        }

        // 2. Music preference matching (+50 if the song linked matches user's preferred artist or genre)
        if (v.musicId) {
          const songObj = songs.find((s) => s.id === v.musicId);
          if (songObj) {
            // Check if user has liked this track or listens to this artist
            if (currentUser?.likedSongs?.includes(songObj.id)) {
              score += 50;
            }
          }
        }

        // 3. User watch history penalty (-30 to favor fresh content)
        if (watchHistory.includes(v.id)) {
          score -= 30;
        }

        // Add some weight based on current engagement ratios
        score += (v.likes || 0) * 2 + (v.comments || 0) * 3 + (v.views || 0) * 0.1;

        return { ...v, recommendationScore: score };
      }).sort((a: any, b: any) => (b.recommendationScore || 0) - (a.recommendationScore || 0));
    }

    return list;
  };

  const processedShorts = getProcessedShorts();

  // Watch time and analytical telemetry handlers
  const handleVideoAnalytics = async (short: ShortVideo, watchedTime: number, totalDuration: number) => {
    if (!currentUser) return;
    const completionRate = totalDuration > 0 ? parseFloat((watchedTime / totalDuration).toFixed(2)) : 0;
    const analyticsId = `${currentUser.uid}_${short.id}`;
    
    try {
      // Record telemetry record
      await setDoc(doc(db, "shorts_analytics", analyticsId), {
        userId: currentUser.uid,
        username: currentUser.username || "Listener",
        videoId: short.id,
        watchTime: Math.round(watchedTime),
        completionRate: Math.min(1.0, completionRate),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // If user watched at least 3 seconds, increment view count
      if (watchedTime >= 3) {
        await updateDoc(doc(db, "shorts", short.id), {
          views: increment(1)
        });
      }
    } catch (err) {
      console.warn("Analytics write skipped due to permission or connection state:", err);
    }
  };

  const toggleLikeShort = async (short: ShortVideo) => {
    if (!currentUser) {
      setCurrentTab("login");
      return;
    }

    const shortRef = doc(db, "shorts", short.id);
    const userId = currentUser.uid;
    const isLiked = short.likedBy?.includes(userId);

    try {
      if (isLiked) {
        await updateDoc(shortRef, {
          likes: increment(-1),
          likedBy: arrayRemove(userId)
        });
      } else {
        await updateDoc(shortRef, {
          likes: increment(1),
          likedBy: arrayUnion(userId)
        });
      }
    } catch (error) {
      console.error("Like toggle failed:", error);
    }
  };

  const toggleBookmarkShort = async (short: ShortVideo) => {
    if (!currentUser) {
      setCurrentTab("login");
      return;
    }

    const shortRef = doc(db, "shorts", short.id);
    const userId = currentUser.uid;
    const isBookmarked = short.bookmarkedBy?.includes(userId);

    try {
      if (isBookmarked) {
        await updateDoc(shortRef, {
          bookmarks: increment(-1),
          bookmarkedBy: arrayRemove(userId)
        });
      } else {
        await updateDoc(shortRef, {
          bookmarks: increment(1),
          bookmarkedBy: arrayUnion(userId)
        });
      }
    } catch (error) {
      console.error("Bookmark toggle failed:", error);
    }
  };

  const handleShareShort = async (short: ShortVideo) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: short.title,
          text: `Check out ${short.creatorName}'s vertical short on SoundStream!`,
          url: window.location.origin
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("Short video link copied to clipboard!");
      }
      
      // Increment shares
      await updateDoc(doc(db, "shorts", short.id), {
        shares: increment(1)
      });
    } catch (error) {
      console.error("Sharing failed:", error);
    }
  };

  // Comments Actions
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !activeShortForComments || !newCommentText.trim()) return;

    try {
      const commentRef = doc(collection(db, "shorts", activeShortForComments.id, "comments"));
      const commentId = commentRef.id;

      const commentObj: ShortComment = {
        commentId,
        userId: currentUser.uid,
        username: currentUser.username || currentUser.displayName || "Fan",
        photoURL: currentUser.photoURL || "",
        text: newCommentText.trim(),
        likes: 0,
        likedBy: [],
        replies: [],
        createdAt: new Date().toISOString()
      };

      await setDoc(commentRef, commentObj);
      await updateDoc(doc(db, "shorts", activeShortForComments.id), {
        comments: increment(1)
      });

      setNewCommentText("");
    } catch (err) {
      console.error("Error writing comment:", err);
    }
  };

  const handleLikeComment = async (comment: ShortComment) => {
    if (!currentUser || !activeShortForComments) return;
    const commentRef = doc(db, "shorts", activeShortForComments.id, "comments", comment.commentId);
    const isLiked = comment.likedBy?.includes(currentUser.uid);

    try {
      if (isLiked) {
        await updateDoc(commentRef, {
          likes: increment(-1),
          likedBy: arrayRemove(currentUser.uid)
        });
      } else {
        await updateDoc(commentRef, {
          likes: increment(1),
          likedBy: arrayUnion(currentUser.uid)
        });
      }
    } catch (err) {
      console.error("Error liking comment:", err);
    }
  };

  const handleAddReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !activeShortForComments || !replyingTo || !replyText.trim()) return;

    try {
      const commentRef = doc(db, "shorts", activeShortForComments.id, "comments", replyingTo.commentId);
      
      const replyObj: ShortReply = {
        replyId: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId: currentUser.uid,
        username: currentUser.username || currentUser.displayName || "Fan",
        photoURL: currentUser.photoURL || "",
        text: replyText.trim(),
        likes: 0,
        likedBy: [],
        createdAt: new Date().toISOString()
      };

      await updateDoc(commentRef, {
        replies: arrayUnion(replyObj)
      });

      setReplyText("");
      setReplyingTo(null);
    } catch (err) {
      console.error("Error submitting reply:", err);
    }
  };

  // Report Content
  const handleReportShort = async () => {
    if (!currentUser || !activeShortForReport || !reportReason) return;

    try {
      const reportRef = doc(collection(db, "reports"));
      await setDoc(reportRef, {
        id: reportRef.id,
        videoId: activeShortForReport.id,
        videoTitle: activeShortForReport.title,
        creatorId: activeShortForReport.creatorId,
        creatorName: activeShortForReport.creatorName,
        reporterId: currentUser.uid,
        reason: reportReason,
        createdAt: new Date().toISOString()
      });

      setReportSuccess(true);
      setTimeout(() => {
        setReportModalOpen(false);
        setActiveShortForReport(null);
        setReportReason("");
        setReportSuccess(false);
      }, 1500);
    } catch (err) {
      console.error("Reporting failed:", err);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#0a0a0b] text-white">
      {/* Search and Category header */}
      <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0f0f11]/80 backdrop-blur-md z-10 gap-3">
        {/* Discovery sub-tabs */}
        <div className="flex items-center bg-[#151518] p-1 rounded-xl border border-white/5 gap-1 overflow-x-auto w-full sm:w-auto shrink-0 scrollbar-none">
          <button
            onClick={() => setActiveTab("recommended")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "recommended" ? "bg-indigo-600 text-white shadow-md shadow-indigo-650/15" : "text-zinc-400 hover:text-zinc-250"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Recommended
          </button>
          <button
            onClick={() => setActiveTab("following")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "following" ? "bg-indigo-600 text-white shadow-md shadow-indigo-650/15" : "text-zinc-400 hover:text-zinc-250"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Following
          </button>
          <button
            onClick={() => setActiveTab("trending")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "trending" ? "bg-indigo-600 text-white shadow-md shadow-indigo-650/15" : "text-zinc-400 hover:text-zinc-250"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Trending
          </button>
          <button
            onClick={() => setActiveTab("new")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "new" ? "bg-indigo-600 text-white shadow-md shadow-indigo-650/15" : "text-zinc-400 hover:text-zinc-250"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            New Videos
          </button>
          <button
            onClick={() => setActiveTab("music")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "music" ? "bg-indigo-600 text-white shadow-md shadow-indigo-650/15" : "text-zinc-400 hover:text-zinc-250"
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            Music Clips
          </button>
        </div>

        {/* Search Input bar */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search title, artist, hashtag..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-[#151518] border border-white/5 focus:border-indigo-500/30 text-zinc-200 focus:outline-none transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Main vertical Feed scrolling content */}
      <div className="flex-1 flex justify-center items-center relative overflow-hidden bg-black py-4">
        {loading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-xs text-zinc-500">Curating vertical shorts stream...</p>
          </div>
        ) : processedShorts.length === 0 ? (
          <div className="text-center max-w-sm px-6">
            <Video className="w-12 h-12 text-zinc-650 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-zinc-300">No Shorts Found</h3>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              No public short videos are available under this selection. Tap "Upload Short" inside the creator panel to start!
            </p>
          </div>
        ) : (
          /* Scroll Container with scroll-snapping and height cap to keep it sleek */
          <div 
            className="w-full max-w-sm aspect-[9/16] h-[92%] sm:h-[95%] bg-[#0a0a0b] rounded-3xl overflow-y-scroll snap-y snap-mandatory relative border border-white/5 shadow-2xl flex flex-col scrollbar-none"
            onScroll={(e) => {
              const el = e.currentTarget;
              const idx = Math.round(el.scrollTop / el.clientHeight);
              if (idx !== activeVideoIndex && idx >= 0 && idx < processedShorts.length) {
                setActiveVideoIndex(idx);
              }
            }}
          >
            {processedShorts.map((short, idx) => (
              <ShortVideoCard
                key={short.id}
                short={short}
                isActive={idx === activeVideoIndex}
                isPreload={idx === activeVideoIndex + 1}
                isMuted={isMuted}
                setIsMuted={setIsMuted}
                currentUser={currentUser}
                followingArtists={followingArtists}
                onFollowToggle={onFollowToggle}
                onLikeToggle={() => toggleLikeShort(short)}
                onBookmarkToggle={() => toggleBookmarkShort(short)}
                onShareClick={() => handleShareShort(short)}
                onCommentsOpen={() => {
                  setActiveShortForComments(short);
                  setCommentDrawerOpen(true);
                }}
                onReportOpen={() => {
                  setActiveShortForReport(short);
                  setReportModalOpen(true);
                }}
                onSelectSong={onSelectSong}
                songs={songs}
                onAnalyticsUpdate={handleVideoAnalytics}
              />
            ))}
          </div>
        )}
      </div>

      {/* Comments Drawer Slider Sheet Overlay */}
      {commentDrawerOpen && activeShortForComments && (
        <div className="absolute inset-0 bg-black/60 z-30 flex items-end justify-center transition-all">
          <div className="w-full max-w-md bg-[#0f0f11] rounded-t-3xl h-[65%] border-t border-white/5 flex flex-col overflow-hidden relative shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-wide">Comments ({comments.length})</span>
              </div>
              <button 
                onClick={() => {
                  setCommentDrawerOpen(false);
                  setActiveShortForComments(null);
                  setReplyingTo(null);
                }}
                className="p-1 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of comments */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {comments.length === 0 ? (
                <div className="py-12 text-center text-zinc-550 text-xs">
                  No comments published yet. Spark the discussion!
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.commentId} className="space-y-2.5">
                    {/* Parent Comment */}
                    <div className="flex items-start gap-3 bg-zinc-950/20 p-2.5 rounded-xl border border-white/5">
                      <img 
                        src={comment.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80"} 
                        alt="" 
                        className="w-8 h-8 rounded-full border border-white/5 shrink-0 object-cover" 
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[11px] font-bold text-zinc-300">{comment.username}</span>
                          <span className="text-[9px] text-zinc-550 font-mono">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 mt-1 pr-4 whitespace-pre-wrap">{comment.text}</p>
                        
                        {/* Action buttons */}
                        <div className="flex items-center gap-4 mt-2">
                          <button 
                            onClick={() => handleLikeComment(comment)}
                            className={`flex items-center gap-1 text-[10px] font-mono transition-colors cursor-pointer ${
                              comment.likedBy?.includes(currentUser?.uid) ? "text-rose-400" : "text-zinc-500 hover:text-zinc-300"
                            }`}
                          >
                            <Heart className={`w-3 h-3 ${comment.likedBy?.includes(currentUser?.uid) ? "fill-current" : ""}`} />
                            {comment.likes || 0}
                          </button>
                          <button 
                            onClick={() => setReplyingTo(comment)}
                            className="text-[10px] text-zinc-500 hover:text-indigo-400 font-semibold cursor-pointer"
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="pl-10 space-y-2">
                        {comment.replies.map((reply) => (
                          <div key={reply.replyId} className="flex items-start gap-2.5 bg-[#151518]/30 p-2 rounded-lg border border-white/5">
                            <img 
                              src={reply.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80"} 
                              alt="" 
                              className="w-6 h-6 rounded-full border border-white/5 shrink-0 object-cover" 
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline justify-between gap-1.5">
                                <span className="text-[10px] font-bold text-zinc-300">{reply.username}</span>
                                <span className="text-[8px] text-zinc-550 font-mono">
                                  {new Date(reply.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-300 mt-0.5">{reply.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Input field wrapper */}
            <div className="p-4 border-t border-white/5 bg-[#121214] shrink-0">
              {replyingTo && (
                <div className="flex items-center justify-between px-3 py-1.5 bg-indigo-500/5 border border-indigo-500/10 rounded-lg mb-3">
                  <span className="text-[10px] text-indigo-400 font-semibold">
                    Replying to @{replyingTo.username}
                  </span>
                  <button 
                    onClick={() => setReplyingTo(null)}
                    className="text-zinc-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {replyingTo ? (
                <form onSubmit={handleAddReply} className="flex gap-2.5 items-center">
                  <input
                    type="text"
                    placeholder="Write a public reply..."
                    className="flex-1 bg-zinc-950/60 border border-white/5 focus:border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 focus:outline-none placeholder-zinc-550"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                  <button 
                    type="submit"
                    className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-650/10"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleAddComment} className="flex gap-2.5 items-center">
                  <input
                    type="text"
                    placeholder="Share your thoughts on this Short..."
                    className="flex-1 bg-zinc-950/60 border border-white/5 focus:border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 focus:outline-none placeholder-zinc-550"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                  />
                  <button 
                    type="submit"
                    className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-650/10"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Moderation Report Modal Popup */}
      {reportModalOpen && activeShortForReport && (
        <div className="absolute inset-0 bg-black/70 z-30 flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-white/5 p-6 rounded-2xl w-full max-w-sm relative shadow-2xl animate-fade-in text-zinc-200">
            <button 
              onClick={() => {
                setReportModalOpen(false);
                setReportReason("");
              }}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-rose-400 mb-4">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-sm uppercase font-mono tracking-wider">Report Video</h3>
            </div>

            {reportSuccess ? (
              <div className="py-8 text-center text-emerald-400 text-xs">
                Report submitted successfully! Content moderation will audit this short.
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[11px] text-zinc-450 leading-relaxed">
                  Help keep SoundStream safe and professional. Please specify why you are reporting this content:
                </p>

                <div className="space-y-2">
                  {[
                    "Inappropriate or mature content",
                    "Intellectual property & copyright breach",
                    "Spam, bot-activity or misleading details",
                    "Harassment, hate speech or violence",
                    "Other policy violations"
                  ].map((reason) => (
                    <label 
                      key={reason} 
                      className="flex items-center gap-3 p-3 rounded-xl border border-white/5 hover:bg-white/5 transition-colors cursor-pointer text-xs text-zinc-300"
                    >
                      <input
                        type="radio"
                        name="report-reason"
                        value={reason}
                        checked={reportReason === reason}
                        onChange={(e) => setReportReason(e.target.value)}
                        className="text-indigo-600 focus:ring-0"
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>

                <button
                  onClick={handleReportShort}
                  disabled={!reportReason}
                  className="w-full py-2.5 bg-rose-650 hover:bg-rose-600 disabled:bg-zinc-800 disabled:text-zinc-650 text-white rounded-xl text-xs font-bold uppercase transition-all tracking-wide cursor-pointer"
                >
                  Submit Abuse Report
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* Individual Vertical Short Video Player Card Container */
interface ShortVideoCardProps {
  key?: any;
  short: ShortVideo;
  isActive: boolean;
  isPreload: boolean;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  currentUser: any;
  followingArtists: string[];
  onFollowToggle: (artistId: string) => Promise<void>;
  onLikeToggle: () => void;
  onBookmarkToggle: () => void;
  onShareClick: () => void;
  onCommentsOpen: () => void;
  onReportOpen: () => void;
  onSelectSong: (song: Song) => void;
  songs: Song[];
  onAnalyticsUpdate: (short: ShortVideo, watched: number, total: number) => void;
}

function ShortVideoCard({
  short,
  isActive,
  isPreload,
  isMuted,
  setIsMuted,
  currentUser,
  followingArtists,
  onFollowToggle,
  onLikeToggle,
  onBookmarkToggle,
  onShareClick,
  onCommentsOpen,
  onReportOpen,
  onSelectSong,
  songs,
  onAnalyticsUpdate
}: ShortVideoCardProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playStartTimeRef = useRef<number>(0);
  const playedDurationRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);

  // Auto-play / pause based on intersection state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.play()
        .then(() => {
          setIsPlaying(true);
          playStartTimeRef.current = Date.now();
        })
        .catch((err) => {
          console.log("Autoplay blocked or aborted:", err);
          setIsPlaying(false);
        });
    } else {
      if (isPlaying) {
        video.pause();
        setIsPlaying(false);
        
        // Accumulate watched time
        if (playStartTimeRef.current > 0) {
          playedDurationRef.current += (Date.now() - playStartTimeRef.current) / 1000;
          playStartTimeRef.current = 0;
        }

        // Trigger analytics report
        if (playedDurationRef.current > 0) {
          onAnalyticsUpdate(short, playedDurationRef.current, video.duration || 15);
          playedDurationRef.current = 0; // reset
        }
      }
    }
  }, [isActive]);

  // Handle unmounting of active card to guarantee final telemetry write
  useEffect(() => {
    return () => {
      const video = videoRef.current;
      if (video && playStartTimeRef.current > 0) {
        const watched = playedDurationRef.current + (Date.now() - playStartTimeRef.current) / 1000;
        onAnalyticsUpdate(short, watched, video.duration || 15);
      }
    };
  }, []);

  const handleMuteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
  };

  const handlePlayToggle = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      if (playStartTimeRef.current > 0) {
        playedDurationRef.current += (Date.now() - playStartTimeRef.current) / 1000;
        playStartTimeRef.current = 0;
      }
    } else {
      video.play();
      setIsPlaying(true);
      playStartTimeRef.current = Date.now();
    }
  };

  const isLiked = short.likedBy?.includes(currentUser?.uid);
  const isBookmarked = short.bookmarkedBy?.includes(currentUser?.uid);
  const isFollowing = followingArtists.includes(short.creatorId);

  // Find linked song if any
  const linkedSong = short.musicId ? songs.find((s) => s.id === short.musicId) : null;

  return (
    <div className="w-full h-full snap-start relative flex-shrink-0 flex flex-col justify-end overflow-hidden select-none bg-black">
      {/* Video Stream Element */}
      <video
        ref={videoRef}
        src={short.videoUrl}
        poster={short.thumbnailUrl}
        preload={isPreload || isActive ? "auto" : "none"}
        loop
        playsInline
        muted={isMuted}
        onClick={handlePlayToggle}
        onLoadStart={() => setLoading(true)}
        onLoadedData={() => setLoading(false)}
        className="w-full h-full object-cover absolute inset-0 cursor-pointer"
      />

      {/* Loading Spinner overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      )}

      {/* Visual audio visualizer bar or sound mute button */}
      <button
        onClick={handleMuteToggle}
        className="absolute top-4 right-4 p-2 rounded-full bg-black/40 border border-white/5 text-white backdrop-blur-sm z-10 hover:bg-black/60 transition-colors cursor-pointer"
      >
        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
      </button>

      {/* Dark Ambient overlay for text clarity */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent pt-32 pb-6 px-5 flex items-end justify-between gap-4 pointer-events-none">
        {/* Creator and Metadata overlay */}
        <div className="flex-1 text-left select-text max-w-[80%] pointer-events-auto">
          {/* Creator Profile row */}
          <div className="flex items-center gap-2 mb-3">
            <img 
              src={short.creatorPhoto || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80"} 
              alt="" 
              className="w-8 h-8 rounded-full border border-white/10 object-cover shrink-0" 
            />
            <div className="min-w-0">
              <span className="text-[11px] font-extrabold text-white tracking-wide truncate block">{short.creatorName}</span>
              <span className="text-[9px] text-zinc-400 tracking-wider font-mono block">Artist Creator</span>
            </div>

            {/* Follow/Unfollow CTA */}
            {currentUser?.uid !== short.creatorId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFollowToggle(short.creatorId);
                }}
                className={`ml-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide transition-all border shrink-0 cursor-pointer ${
                  isFollowing 
                    ? "bg-transparent text-indigo-400 border-indigo-500/30" 
                    : "bg-indigo-600 hover:bg-indigo-500 text-white border-transparent"
                }`}
              >
                {isFollowing ? "Followed" : "Follow"}
              </button>
            )}
          </div>

          {/* Title & Description */}
          <h3 className="font-extrabold text-xs uppercase tracking-wide text-zinc-150 mb-1">{short.title}</h3>
          <p className="text-[10px] text-zinc-300 leading-relaxed font-sans font-medium line-clamp-2">{short.description}</p>

          {/* Hashtags list */}
          {short.hashtags && short.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {short.hashtags.map((tag) => (
                <span key={tag} className="text-[9px] font-bold text-indigo-400 font-mono">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Linked song row */}
          {linkedSong && (
            <div 
              onClick={() => onSelectSong(linkedSong)}
              className="mt-3.5 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-550/15 max-w-max cursor-pointer text-xs pointer-events-auto"
            >
              <Music className="w-3 h-3 text-indigo-400 animate-pulse" />
              <div className="min-w-0">
                <span className="text-[9px] font-extrabold text-indigo-300 tracking-wide truncate max-w-[120px] block uppercase leading-none">
                  {linkedSong.title}
                </span>
              </div>
              <ChevronRight className="w-3 h-3 text-indigo-400" />
            </div>
          )}
        </div>

        {/* Floating Interactions panel (Right sidebar) */}
        <div className="flex flex-col items-center gap-4.5 shrink-0 pointer-events-auto select-none z-10">
          {/* Like */}
          <button 
            onClick={onLikeToggle}
            className="group flex flex-col items-center gap-1.5 text-zinc-300 transition-transform active:scale-95 cursor-pointer"
          >
            <div className={`p-2.5 rounded-full backdrop-blur-md transition-all ${
              isLiked 
                ? "bg-rose-500/15 text-rose-500 border border-rose-500/20 shadow-md shadow-rose-500/5" 
                : "bg-black/45 border border-white/5 hover:bg-black/60 hover:text-white"
            }`}>
              <Heart className={`w-4 h-4 ${isLiked ? "fill-current animate-heart-pop" : ""}`} />
            </div>
            <span className="text-[10px] font-bold font-mono tracking-wide">{short.likes || 0}</span>
          </button>

          {/* Comments */}
          <button 
            onClick={onCommentsOpen}
            className="group flex flex-col items-center gap-1.5 text-zinc-300 transition-transform active:scale-95 cursor-pointer"
          >
            <div className="p-2.5 rounded-full bg-black/45 border border-white/5 hover:bg-black/60 hover:text-white backdrop-blur-md transition-all">
              <MessageSquare className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold font-mono tracking-wide">{short.comments || 0}</span>
          </button>

          {/* Bookmarks */}
          <button 
            onClick={onBookmarkToggle}
            className="group flex flex-col items-center gap-1.5 text-zinc-300 transition-transform active:scale-95 cursor-pointer"
          >
            <div className={`p-2.5 rounded-full backdrop-blur-md transition-all ${
              isBookmarked 
                ? "bg-amber-500/15 text-amber-500 border border-amber-500/20 shadow-md shadow-amber-500/5" 
                : "bg-black/45 border border-white/5 hover:bg-black/60 hover:text-white"
            }`}>
              <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-current" : ""}`} />
            </div>
            <span className="text-[10px] font-bold font-mono tracking-wide">{short.bookmarks || 0}</span>
          </button>

          {/* Share */}
          <button 
            onClick={onShareClick}
            className="group flex flex-col items-center gap-1.5 text-zinc-300 transition-transform active:scale-95 cursor-pointer"
            title="Share Short Link"
          >
            <div className="p-2.5 rounded-full bg-black/45 border border-white/5 hover:bg-black/60 hover:text-white backdrop-blur-md transition-all">
              <Share2 className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold font-mono tracking-wide">{short.shares || 0}</span>
          </button>

          {/* Moderation - Report */}
          <button 
            onClick={onReportOpen}
            className="group flex flex-col items-center gap-1.5 text-zinc-500 hover:text-rose-400 transition-transform active:scale-95 cursor-pointer"
            title="Report inappropriate content"
          >
            <div className="p-2.5 rounded-full bg-black/45 border border-white/5 hover:bg-rose-950/15 backdrop-blur-md transition-all">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
