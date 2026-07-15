import React, { useState, useEffect, useRef } from "react";
import { 
  Send, 
  Users, 
  Sparkles, 
  Flame, 
  MessageCircle, 
  ShieldAlert,
  ShieldCheck,
  Check,
  Smartphone
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User } from "../types";
import { collection, query, where, orderBy, onSnapshot, addDoc, limit } from "firebase/firestore";
import { db } from "../lib/firebase";

interface HighTechGroupChatProps {
  chatId: string;
  title: string;
  category?: string;
  currentUser: User | null;
}

interface ChatMessage {
  id: string;
  chatId: string;
  user: string;
  avatar: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
  isAdmin?: boolean;
  isArtist?: boolean;
  role?: string;
  createdAt?: any;
}

// Highly stylized premium avatar placeholders for seeded chat members
const MUSIC_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=150&q=80",
];

export function HighTechGroupChat({ chatId, title, category = "General Discussion", currentUser }: HighTechGroupChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [onlineCount, setOnlineCount] = useState(42);
  const [isTypingUser, setIsTypingUser] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  // Auto-scrolling logic
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Seed messages generator based on Chat ID context to make chat highly tailored
  const getSeedMessages = (): ChatMessage[] => {
    const baseSeeds = [
      {
        id: "seed-1",
        chatId,
        user: "hifi_curator",
        avatar: MUSIC_AVATARS[0],
        text: `Welcome to the official ${title} channel! Drop your thoughts, comments, and reviews below! 🎧🔥`,
        timestamp: "Just now",
        isSystem: false,
        isAdmin: true,
        role: "Moderator"
      },
      {
        id: "seed-2",
        chatId,
        user: "beatsByNico",
        avatar: MUSIC_AVATARS[1],
        text: "The audio compression on this platform is unmatched. SoundStreamy is seriously changing the game for independent audiophiles.",
        timestamp: "2m ago",
        isArtist: true,
        role: "Producer"
      },
      {
        id: "seed-3",
        chatId,
        user: "symphony_gurl",
        avatar: MUSIC_AVATARS[2],
        text: "Absolutely! I can hear details in the backing tracks that other apps completely muffle. Loving the vibe here. ❤️💥",
        timestamp: "1m ago",
        role: "VIP Listener"
      }
    ];

    // Customize seeds for specific contexts
    if (chatId.includes("news")) {
      return [
        ...baseSeeds,
        {
          id: "seed-news-1",
          chatId,
          user: "headline_hound",
          avatar: MUSIC_AVATARS[3],
          text: "This news is wild. I was waiting for this release all month. Can't believe it's finally streaming live on SoundStreamy!",
          timestamp: "30s ago",
          role: "Music Journalist"
        }
      ];
    } else if (chatId.includes("chart")) {
      return [
        ...baseSeeds,
        {
          id: "seed-chart-1",
          chatId,
          user: "chart_watcher",
          avatar: MUSIC_AVATARS[4],
          text: "No way this track sits at #1 for another week. The competition is insane right now! Who are you guys voting for?",
          timestamp: "15s ago",
          role: "Chart Analyst"
        }
      ];
    }

    return baseSeeds;
  };

  // 1. Fetch live messages from Firestore and fallback to Seeds
  useEffect(() => {
    let unsubscribe = () => {};

    try {
      const messagesRef = collection(db, "group_chats");
      const q = query(
        messagesRef,
        where("chatId", "==", chatId),
        orderBy("createdAt", "asc"),
        limit(50)
      );

      unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedMsgs: ChatMessage[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          fetchedMsgs.push({
            id: doc.id,
            chatId: data.chatId,
            user: data.user,
            avatar: data.avatar,
            text: data.text,
            timestamp: data.timestamp || "Live",
            isSystem: data.isSystem || false,
            isAdmin: data.isAdmin || false,
            isArtist: data.isArtist || false,
            role: data.role || "Listener",
            createdAt: data.createdAt
          });
        });

        if (fetchedMsgs.length === 0) {
          // If no messages in cloud yet, seed the chat locally for instant action
          setMessages(getSeedMessages());
        } else {
          setMessages(fetchedMsgs);
        }

        setTimeout(scrollToBottom, 100);
      }, (error) => {
        console.warn("Firestore listener failed or rules restricted access. Falling back to secure local state.", error);
        setMessages(getSeedMessages());
      });
    } catch (e) {
      console.warn("Firebase collection retrieval error. Using local simulation.", e);
      setMessages(getSeedMessages());
    }

    // Dynamic audience counter simulation (fluctuates beautifully)
    setOnlineCount(Math.floor(Math.random() * 20) + 35);
    const interval = setInterval(() => {
      setOnlineCount(prev => {
        const diff = Math.random() > 0.5 ? 1 : -1;
        const next = prev + diff;
        return next > 10 ? next : 12;
      });
    }, 12000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [chatId]);

  // Trigger scroll on new message arrival
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 2. Simulated responsive replies to user interactions (Make the chat feel ALIVE)
  const simulateResponse = (userText: string) => {
    const BOT_NAMES = ["dj_matrix", "vibe_mechanic", "sound_engineer_sam", "gold_certified_fan", "lyric_genius"];
    const BOT_ROLES = ["Resident DJ", "Sound Tech", "Admin Host", "Super Fan", "Lyrics Team"];
    
    const botIndex = Math.floor(Math.random() * BOT_NAMES.length);
    const botUser = BOT_NAMES[botIndex];
    const botRole = BOT_ROLES[botIndex];
    const botAvatar = MUSIC_AVATARS[Math.floor(Math.random() * MUSIC_AVATARS.length)];

    // Typing status simulation
    setTimeout(() => {
      setIsTypingUser(botUser);
      scrollToBottom();
    }, 1500);

    setTimeout(() => {
      setIsTypingUser(null);

      const responseTemplates = [
        `Whoa, totally agree on that. "${userText.slice(0, 20)}..." makes a lot of sense!`,
        `That's a hot take! Let's see if other listeners agree. 🔥`,
        `I am streaming this on my high-fidelity monitors right now and the bass response is unreal!`,
        `SoundStreamy keeps feeding us with premium independent hits daily. Highly recommend!`,
        `Count me in on this discussion. Solid vibe all around here.`
      ];

      const responseText = responseTemplates[Math.floor(Math.random() * responseTemplates.length)];

      const newBotMsg: ChatMessage = {
        id: `bot-reply-${Date.now()}`,
        chatId,
        user: botUser,
        avatar: botAvatar,
        text: responseText,
        timestamp: "Just now",
        role: botRole
      };

      setMessages(prev => [...prev, newBotMsg]);
      scrollToBottom();
    }, 4500);
  };

  // 3. Post Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const senderName = currentUser ? (currentUser.username || currentUser.displayName || currentUser.email.split("@")[0]) : "Guest Listener";
    const senderAvatar = currentUser?.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80";
    const senderRole = currentUser?.role === "admin" ? "Admin" : currentUser?.role === "artist" ? "Creator" : "Premium Fan";

    const chatText = newMessage.trim();
    setNewMessage("");

    const timestampStr = new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

    // Instantly append to local messages for latency-free feel
    const localMsgId = `local-msg-${Date.now()}`;
    const newLocalMsg: ChatMessage = {
      id: localMsgId,
      chatId,
      user: senderName,
      avatar: senderAvatar,
      text: chatText,
      timestamp: timestampStr,
      isAdmin: currentUser?.role === "admin",
      isArtist: currentUser?.role === "artist",
      role: senderRole
    };

    setMessages(prev => [...prev.filter(m => m.id !== localMsgId), newLocalMsg]);
    scrollToBottom();

    // Persist to Firestore
    try {
      await addDoc(collection(db, "group_chats"), {
        chatId,
        user: senderName,
        avatar: senderAvatar,
        text: chatText,
        timestamp: timestampStr,
        isSystem: false,
        isAdmin: currentUser?.role === "admin",
        isArtist: currentUser?.role === "artist",
        role: senderRole,
        createdAt: new Date()
      });
    } catch (err) {
      console.warn("Failed to write to cloud database. Operating in live simulation mode.", err);
    }

    // Trigger simulated responsive conversation
    simulateResponse(chatText);
  };

  return (
    <div className="bg-[#151518] border border-white/5 rounded-3xl overflow-hidden flex flex-col h-[480px] shadow-2xl relative">
      
      {/* Dynamic Glow Accents */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />

      {/* Chatroom Header Banner */}
      <div className="bg-zinc-950/60 backdrop-blur-md px-5 py-4 border-b border-white/5 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-xl flex items-center justify-center">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white uppercase tracking-wider">{title}</span>
              <span className="px-1.5 py-0.5 bg-violet-500/10 border border-violet-500/15 rounded text-[8px] text-violet-400 font-bold uppercase tracking-widest">
                LIVE CHAT
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 font-medium">{category}</span>
          </div>
        </div>

        {/* Pulsing Listener Counter */}
        <div className="flex items-center gap-2 bg-black/40 border border-white/5 px-2.5 py-1 rounded-full">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-mono font-bold text-zinc-300 flex items-center gap-1">
            <Users className="w-3 h-3 text-zinc-500" />
            {onlineCount} active
          </span>
        </div>
      </div>

      {/* Messages Scrolling Container */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 select-text">
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMe = currentUser && (msg.user === currentUser.username || msg.user === currentUser.displayName || msg.user === currentUser.email.split("@")[0]);
            
            return (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex gap-3 max-w-[85%] text-left ${isMe ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                {/* User Avatar */}
                <img 
                  src={msg.avatar} 
                  alt={msg.user} 
                  className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0 shadow-md"
                />

                <div className="space-y-1">
                  {/* Name and Role Badges */}
                  <div className={`flex items-center gap-1.5 text-[10px] ${isMe ? "justify-end" : "justify-start"}`}>
                    <span className="font-extrabold text-zinc-300 tracking-wide">{msg.user}</span>
                    
                    {msg.isAdmin ? (
                      <span className="flex items-center gap-0.5 px-1 py-0.5 bg-red-500/10 border border-red-500/15 rounded text-[8px] text-red-400 font-extrabold tracking-wide uppercase">
                        <ShieldAlert className="w-2.5 h-2.5" />
                        Staff
                      </span>
                    ) : msg.isArtist ? (
                      <span className="flex items-center gap-0.5 px-1 py-0.5 bg-violet-500/15 border border-violet-500/20 rounded text-[8px] text-violet-400 font-extrabold tracking-wide uppercase">
                        <Sparkles className="w-2.5 h-2.5" />
                        Creator
                      </span>
                    ) : (
                      <span className="px-1 py-0.5 bg-zinc-800 text-zinc-400 rounded text-[7px] font-mono tracking-wider uppercase">
                        {msg.role}
                      </span>
                    )}
                    
                    <span className="text-[9px] text-zinc-600 font-mono">{msg.timestamp}</span>
                  </div>

                  {/* Message Bubble Card with subtle modern borders */}
                  <div className={`p-3 rounded-2xl text-xs leading-relaxed shadow-lg ${
                    isMe 
                      ? "bg-gradient-to-br from-violet-600 to-indigo-700 text-white rounded-tr-none" 
                      : "bg-[#1d1d22] text-zinc-300 border border-white/[0.03] rounded-tl-none"
                  }`}>
                    <p className="break-words font-sans">{msg.text}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Bot Typing Indicator Simulation */}
        {isTypingUser && (
          <div className="flex gap-3 items-center mr-auto">
            <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse shrink-0" />
            <div className="bg-[#1d1d22] border border-white/[0.03] px-4 py-2 rounded-2xl rounded-tl-none flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase">{isTypingUser} is composing</span>
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce delay-100" />
                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce delay-200" />
                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce delay-300" />
              </span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Form Footer */}
      <form onSubmit={handleSendMessage} className="bg-zinc-950/40 p-4 border-t border-white/5 flex gap-2">
        <input 
          type="text" 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={currentUser ? "Join the high-tech live conversation..." : "Log in to post a message..."}
          disabled={!currentUser}
          maxLength={150}
          className="flex-1 bg-black/40 border border-white/5 hover:border-white/10 focus:border-violet-500/50 rounded-xl px-4 py-3 text-xs text-white focus:outline-none placeholder-zinc-500 transition-all font-sans"
        />
        <button 
          type="submit"
          disabled={!currentUser || !newMessage.trim()}
          className="bg-violet-600 hover:bg-violet-500 text-white p-3 rounded-xl transition-all flex items-center justify-center disabled:opacity-30 disabled:hover:bg-violet-600 cursor-pointer border-none"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
}
