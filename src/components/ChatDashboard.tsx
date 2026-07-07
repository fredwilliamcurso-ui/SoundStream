import React, { useState, useEffect, useRef } from "react";
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  getDocs,
  writeBatch,
  getDoc,
  limit
} from "firebase/firestore";
import { db, auth, uploadToStorage, handleFirestoreError, OperationType } from "../lib/firebase";
import { ChatMessage, Conversation, User, Song, Playlist, Artist } from "../types";
import { 
  MessageSquare, 
  Send, 
  Image as ImageIcon, 
  Mic, 
  Smile, 
  Trash2, 
  Undo2, 
  MoreVertical, 
  Plus, 
  Search, 
  UserPlus, 
  ArrowLeft, 
  Play, 
  Pause, 
  Check, 
  CheckCheck, 
  X, 
  Music, 
  Disc, 
  User as UserIcon, 
  Users, 
  Shield, 
  LogOut, 
  Edit3, 
  UserX, 
  Sparkles,
  Volume2,
  AlertCircle,
  HelpCircle,
  Clock,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ChatDashboardProps {
  currentUser: User | null;
  songs: Song[];
  playlists: Playlist[];
  artists: Artist[];
  onSelectSong: (song: Song) => void;
  setCurrentTab: (tab: string) => void;
  setSelectedPlaylistId: (id: string | null) => void;
  setSelectedArtistId: (id: string | null) => void;
}

export default function ChatDashboard({
  currentUser,
  songs,
  playlists,
  artists,
  onSelectSong,
  setCurrentTab,
  setSelectedPlaylistId,
  setSelectedArtistId
}: ChatDashboardProps) {
  // Navigation states
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [activeSpeechId, setActiveSpeechId] = useState<string | null>(null);
  
  // UI States
  const [inputText, setInputText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [msgSearchTerm, setMsgSearchTerm] = useState("");
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  
  // Share selection helper modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareType, setShareType] = useState<"song" | "playlist" | "artist" | null>(null);

  // Group creation state
  const [groupName, setGroupName] = useState("");
  const [groupPhoto, setGroupPhoto] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Editing / replying state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const [unsendLimitMinutes, setUnsendLimitMinutes] = useState(15); // Default 15 mins configurable

  // Typing states
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Voice recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Refs for scrolling
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Users online statuses
  const [userStatuses, setUserStatuses] = useState<{ [userId: string]: { online: boolean; lastSeen: any } }>({});

  // Push notification/Alert system logs
  const [notificationsLog, setNotificationsLog] = useState<any[]>([]);
  const [showNotificationsToast, setShowNotificationsToast] = useState<string | null>(null);

  const activeConv = conversations.find((c) => c.id === activeConvId);

  // Track online status
  useEffect(() => {
    if (!currentUser?.uid) return;

    // Set online on load
    const userStatusRef = doc(db, "users", currentUser.uid);
    updateDoc(userStatusRef, {
      online: true,
      lastSeen: new Date().toISOString()
    }).catch(() => {
      // ignore
    });

    const handleOffline = () => {
      updateDoc(userStatusRef, {
        online: false,
        lastSeen: new Date().toISOString()
      }).catch(() => {});
    };

    window.addEventListener("beforeunload", handleOffline);
    return () => {
      window.removeEventListener("beforeunload", handleOffline);
      handleOffline();
    };
  }, [currentUser?.uid]);

  // Real-time listener for user profiles to show online status & search catalog
  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersList: User[] = [];
      const statuses: { [userId: string]: { online: boolean; lastSeen: any } } = {};
      
      snapshot.forEach((docSnap) => {
        const u = docSnap.data() as User;
        u.uid = docSnap.id;
        if (u.uid !== currentUser?.uid) {
          usersList.push(u);
        }
        statuses[u.uid] = {
          online: (u as any).online || false,
          lastSeen: (u as any).lastSeen || null
        };
      });
      setAllUsers(usersList);
      setUserStatuses(statuses);
    }, (error) => {
      console.error("Error fetching users status:", error);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Real-time listener for my conversations
  useEffect(() => {
    if (!currentUser?.uid) return;

    // Fetch conversations where I am a member
    const q = query(
      collection(db, "conversations"),
      where("members", "array-contains", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convList: Conversation[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        convList.push({
          id: docSnap.id,
          ...data
        } as Conversation);
      });
      
      // Sort conversations by updated date or creation date
      convList.sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.createdAt).getTime();
        const timeB = new Date(b.updatedAt || b.createdAt).getTime();
        return timeB - timeA;
      });

      setConversations(convList);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "conversations");
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Real-time listener for messages in active conversation
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }

    const mQuery = query(
      collection(db, "conversations", activeConvId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(mQuery, (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach((docSnap) => {
        msgs.push({
          messageId: docSnap.id,
          ...docSnap.data()
        } as ChatMessage);
      });
      
      // Filter out messages deleted by the current user for themselves
      const visibleMsgs = msgs.filter(m => !m.deletedFor?.includes(currentUser?.uid || ""));
      setMessages(visibleMsgs);

      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);

      // Trigger Read Receipts update (add currentUser to readBy if not already there)
      const unreadMsgIds = msgs
        .filter(m => !m.readBy?.includes(currentUser?.uid || ""))
        .map(m => m.messageId);

      if (unreadMsgIds.length > 0) {
        unreadMsgIds.forEach((mId) => {
          updateDoc(doc(db, "conversations", activeConvId, "messages", mId), {
            readBy: [...(msgs.find(m => m.messageId === mId)?.readBy || []), currentUser?.uid]
          }).catch(err => console.error("Error updating read status:", err));
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `conversations/${activeConvId}/messages`);
    });

    return () => unsubscribe();
  }, [activeConvId, currentUser?.uid]);

  // Clean up any speaking voice output if component unmounts
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Text-to-speech toggler for AI responses (future-ready voice features)
  const toggleSpeech = (msgId: string, text: string) => {
    if (!window.speechSynthesis) {
      alert("Speech synthesis is not supported on this browser.");
      return;
    }
    if (activeSpeechId === msgId) {
      window.speechSynthesis.cancel();
      setActiveSpeechId(null);
    } else {
      window.speechSynthesis.cancel();
      const cleanText = text
        .replace(/[*_`#\-]/g, "")
        .replace(/\[ACTION:.*\]/g, "")
        .trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.onend = () => setActiveSpeechId(null);
      utterance.onerror = () => setActiveSpeechId(null);
      window.speechSynthesis.speak(utterance);
      setActiveSpeechId(msgId);
    }
  };

  // Ensure personal SoundStream AI conversation thread is seeded in Firestore
  useEffect(() => {
    if (!currentUser?.uid) return;

    const checkAndCreateAIConv = async () => {
      try {
        const aiConvId = `ai_${currentUser.uid}`;
        const aiConvRef = doc(db, "conversations", aiConvId);
        const aiConvSnap = await getDoc(aiConvRef);

        if (!aiConvSnap.exists()) {
          // Create the AI conversation doc
          await setDoc(aiConvRef, {
            id: aiConvId,
            name: "SoundStream AI",
            isGroup: false,
            members: [currentUser.uid, "soundstream-ai"],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastMessage: {
              text: "Ask me anything about music, artists, descriptions, or platform support!",
              senderName: "SoundStream AI",
              createdAt: new Date().toISOString()
            }
          });

          // Create the initial welcome message
          const msgRef = doc(db, "conversations", aiConvId, "messages", "init");
          await setDoc(msgRef, {
            messageId: "init",
            conversationId: aiConvId,
            senderId: "soundstream-ai",
            senderName: "SoundStream AI",
            senderPhoto: "ai_bot",
            messageType: "text",
            text: `Hi **${currentUser.username || "there"}**! I am your SoundStream AI Assistant. 🚀\n\nI can help you with:\n🎵 **Smart Recommendations**: Ask for genres, moods, or specific vibes.\n🎧 **Instantly Play Tracks**: Try saying 'Play some relaxing music'.\n📝 **Generate Playlists**: Prompt me to create playlists for any occasion!\n🎙️ **Creator Assistance**: Get help writing descriptions for your songs.\n🛡️ **Admin Tools**: Scan text or comments for potential spam.\n\nWhat can I do for you today?`,
            createdAt: new Date().toISOString(),
            readBy: [currentUser.uid],
            reactions: {}
          });
        }
      } catch (err) {
        console.error("Error creating AI conversation:", err);
      }
    };

    checkAndCreateAIConv();
  }, [currentUser?.uid]);

  // Client side action handler triggered by the server's AI agent decision tags
  const handleAIAction = async (action: any) => {
    if (!action || !action.type) return;

    switch (action.type.toUpperCase()) {
      case "PLAY_SONG": {
        const targetId = action.id;
        const targetTitle = action.title;
        let matchedSong = songs.find(s => s.id === targetId);
        if (!matchedSong && targetTitle) {
          matchedSong = songs.find(s => s.title?.toLowerCase() === targetTitle.toLowerCase());
        }
        if (matchedSong) {
          onSelectSong(matchedSong);
          triggerFCMNotification("New messages", `Now playing: ${matchedSong.title} by ${matchedSong.artistName}`, "SoundStream AI");
        }
        break;
      }

      case "VIEW_ARTIST": {
        const targetId = action.id;
        if (targetId) {
          setSelectedArtistId(targetId);
          setCurrentTab("artist-profile");
        }
        break;
      }

      case "VIEW_PLAYLIST": {
        const targetId = action.id;
        if (targetId) {
          setSelectedPlaylistId(targetId);
          setCurrentTab("playlist");
        }
        break;
      }

      case "PLAYLIST_GEN": {
        if (!currentUser?.uid || !activeConvId) return;
        const playlistTitle = action.title || "AI Curated Vibelist";
        const playlistDesc = action.description || "Generated by SoundStream AI.";
        const playlistSongIds = action.songIds || [];

        // Validate recommended track IDs actually exist in catalog
        const validSongIds = playlistSongIds.filter((id: string) => songs.some(s => s.id === id));
        if (validSongIds.length === 0) {
          // Seed with some popular defaults if database is small
          songs.slice(0, 4).forEach(s => validSongIds.push(s.id));
        }

        try {
          const playlistId = `pl_ai_${Date.now()}`;
          const playlistDoc = {
            id: playlistId,
            title: playlistTitle,
            description: playlistDesc,
            coverUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=150&q=80",
            createdBy: currentUser.uid,
            ownerId: currentUser.uid,
            userId: currentUser.uid,
            songIds: validSongIds,
            isPublic: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            songCount: validSongIds.length
          };

          await setDoc(doc(db, "playlists", playlistId), playlistDoc);
          
          triggerFCMNotification("New messages", `🎉 AI generated the playlist "${playlistTitle}"!`, "SoundStream AI");
          
          const confirmationMsg: Partial<ChatMessage> = {
            conversationId: activeConvId,
            senderId: "soundstream-ai",
            senderName: "SoundStream AI",
            senderPhoto: "ai_bot",
            messageType: "playlist",
            text: `I've successfully created the playlist **"${playlistTitle}"** with **${validSongIds.length}** songs! Check it out in your Playlists section!`,
            mediaUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=150&q=80",
            createdAt: new Date().toISOString(),
            readBy: [currentUser.uid],
            reactions: {}
          };
          await addDoc(collection(db, "conversations", activeConvId, "messages"), confirmationMsg);

        } catch (err) {
          console.error("Error creating AI playlist:", err);
        }
        break;
      }

      case "DETECT_SPAM": {
        if (!activeConvId) return;
        const textStr = action.text || "";
        const isSpamFlag = !!action.isSpam;
        const confidenceVal = action.confidence || 0.9;
        const reasonStr = action.reason || "Suspicious comment text patterns detected.";
        
        triggerFCMNotification("Mentions", `🛡️ Spam scan result: ${isSpamFlag ? 'FLAGGED AS SPAM' : 'SAFE'}`, "AI Moderator");
        
        const modMsg: Partial<ChatMessage> = {
          conversationId: activeConvId,
          senderId: "soundstream-ai",
          senderName: "SoundStream AI",
          senderPhoto: "ai_bot",
          messageType: "text",
          text: `🛡️ **SoundStream Security & Moderation Shield:**\n- **Target Text:** "${textStr}"\n- **Verdict:** ${isSpamFlag ? "⚠️ **SPAM FLAGGED**" : "✅ **SAFE & COMPLIANT**"}\n- **Confidence:** ${Math.round(confidenceVal * 100)}%\n- **AI Analysis:** ${reasonStr}`,
          createdAt: new Date().toISOString(),
          readBy: [currentUser.uid],
          reactions: {}
        };
        await addDoc(collection(db, "conversations", activeConvId, "messages"), modMsg);
        break;
      }

      default:
        break;
    }
  };

  // Triggers the server side AI chat completion and handles typing states
  const triggerAIResponse = async (userText: string) => {
    if (!activeConvId || !currentUser?.uid) return;

    try {
      // 1. Show AI typing indicator
      await updateDoc(doc(db, "conversations", activeConvId), {
        ["typing.soundstream-ai"]: "typing"
      });

      // 2. Prepare chat history (exclude system cards or blank lines)
      const filteredHistory = messages.slice(-12).map(m => ({
        senderId: m.senderId,
        text: m.text
      }));

      // 3. Post request to the Gemini Server-Side route
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          chatHistory: filteredHistory,
          userProfile: currentUser,
          songs,
          artists,
          playlists
        })
      });

      // 4. Clear the AI typing status
      await updateDoc(doc(db, "conversations", activeConvId), {
        ["typing.soundstream-ai"]: ""
      });

      if (!response.ok) {
        throw new Error("Failed to reach SoundStream AI Server");
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const aiMessageText = data.text;
      const aiAction = data.action;

      // 5. Save the AI's reply to Firestore messages
      const messageDoc: Partial<ChatMessage> = {
        conversationId: activeConvId,
        senderId: "soundstream-ai",
        senderName: "SoundStream AI",
        senderPhoto: "ai_bot",
        messageType: "text",
        text: aiMessageText,
        createdAt: new Date().toISOString(),
        readBy: [currentUser.uid, "soundstream-ai"],
        isDeleted: false,
        deletedFor: [],
        reactions: {}
      };

      const docRef = await addDoc(collection(db, "conversations", activeConvId, "messages"), messageDoc);
      await updateDoc(doc(db, "conversations", activeConvId, "messages", docRef.id), {
        messageId: docRef.id
      });

      // 6. Update conversation last message preview
      await updateDoc(doc(db, "conversations", activeConvId), {
        updatedAt: new Date().toISOString(),
        lastMessage: {
          text: aiMessageText,
          senderName: "SoundStream AI",
          createdAt: new Date().toISOString()
        }
      });

      // 7. Execute action if returned
      if (aiAction) {
        await handleAIAction(aiAction);
      }

    } catch (err: any) {
      console.error("AI Response creation error:", err);
      // Ensure typing status is cleared
      await updateDoc(doc(db, "conversations", activeConvId), {
        ["typing.soundstream-ai"]: ""
      }).catch(() => {});

      // Append fallback failure response
      const fallbackDoc: Partial<ChatMessage> = {
        conversationId: activeConvId,
        senderId: "soundstream-ai",
        senderName: "SoundStream AI",
        senderPhoto: "ai_bot",
        messageType: "text",
        text: "I apologize, but I encountered an error communicating with our streaming metadata services. Please try sending your message again in a moment!",
        createdAt: new Date().toISOString(),
        readBy: [currentUser.uid, "soundstream-ai"],
        isDeleted: false,
        deletedFor: [],
        reactions: {}
      };
      await addDoc(collection(db, "conversations", activeConvId, "messages"), fallbackDoc);
    }
  };

  // Setup typing state timeout clearing
  const handleTypingState = (status: "typing" | "recording" | "") => {
    if (!activeConvId || !currentUser?.uid) return;

    const convRef = doc(db, "conversations", activeConvId);
    updateDoc(convRef, {
      [`typing.${currentUser.uid}`]: status
    }).catch(() => {});
  };

  const onInputChange = (val: string) => {
    setInputText(val);
    
    if (!isTyping && val.trim() !== "") {
      setIsTyping(true);
      handleTypingState("typing");
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      handleTypingState("");
    }, 2000);
  };

  // Create a Direct Message Private Conversation
  const startPrivateChat = async (recipient: User) => {
    if (!currentUser?.uid) return;

    // Check if conversation already exists between these 2 exact users
    const existing = conversations.find(
      (c) => !c.isGroup && c.members.includes(currentUser.uid) && c.members.includes(recipient.uid)
    );

    if (existing) {
      setActiveConvId(existing.id);
      setShowNewChatModal(false);
      return;
    }

    const conversationId = `dm_${[currentUser.uid, recipient.uid].sort().join("_")}`;
    const newConv: Conversation = {
      id: conversationId,
      isGroup: false,
      members: [currentUser.uid, recipient.uid],
      admins: [currentUser.uid, recipient.uid],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      typing: {}
    };

    try {
      await setDoc(doc(db, "conversations", conversationId), newConv);
      
      // Send a system message to introduce
      const welcomeMsg = {
        messageId: "sys_init",
        conversationId,
        senderId: "system",
        senderName: "SoundStream",
        messageType: "system",
        text: `🔒 Direct messaging opened with ${recipient.username}. All messages are synchronized in real-time.`,
        createdAt: new Date().toISOString(),
        readBy: [currentUser.uid]
      };
      await setDoc(doc(db, "conversations", conversationId, "messages", "sys_init"), welcomeMsg);

      setActiveConvId(conversationId);
      setShowNewChatModal(false);
      triggerFCMNotification("Group invitations", `You started a new direct chat with ${recipient.username}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `conversations/${conversationId}`);
    }
  };

  // Create Group Chat
  const createGroupChat = async () => {
    if (!currentUser?.uid || !groupName.trim()) return;

    const conversationId = `group_${Date.now()}`;
    const membersList = [currentUser.uid, ...selectedMembers];
    const newConv: Conversation = {
      id: conversationId,
      name: groupName,
      photoUrl: groupPhoto || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&q=80",
      isGroup: true,
      members: membersList,
      admins: [currentUser.uid],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      typing: {}
    };

    try {
      await setDoc(doc(db, "conversations", conversationId), newConv);

      // Send initial group system message
      const systemMsgRef = await addDoc(collection(db, "conversations", conversationId, "messages"), {
        conversationId,
        senderId: "system",
        senderName: "SoundStream",
        messageType: "system",
        text: `🎉 Group "${groupName}" was created by ${currentUser.username}.`,
        createdAt: new Date().toISOString(),
        readBy: [currentUser.uid]
      });

      // Update document with its generated messageId
      await updateDoc(doc(db, "conversations", conversationId, "messages", systemMsgRef.id), {
        messageId: systemMsgRef.id
      });

      setActiveConvId(conversationId);
      setGroupName("");
      setGroupPhoto("");
      setSelectedMembers([]);
      setShowGroupModal(false);
      triggerFCMNotification("Group invitations", `You created group "${groupName}" with ${membersList.length - 1} members.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `conversations/${conversationId}`);
    }
  };

  // Group settings actions
  const renameGroup = async (newName: string) => {
    if (!activeConvId || !newName.trim()) return;
    try {
      await updateDoc(doc(db, "conversations", activeConvId), {
        name: newName,
        updatedAt: new Date().toISOString()
      });
      await addSystemMessage(`✏️ Group was renamed to "${newName}".`);
    } catch (err) {
      console.error(err);
    }
  };

  const changeGroupPhoto = async (photoUrl: string) => {
    if (!activeConvId || !photoUrl.trim()) return;
    try {
      await updateDoc(doc(db, "conversations", activeConvId), {
        photoUrl: photoUrl,
        updatedAt: new Date().toISOString()
      });
      await addSystemMessage(`🖼️ Group cover photo was updated.`);
    } catch (err) {
      console.error(err);
    }
  };

  const addGroupMember = async (userId: string) => {
    if (!activeConvId || !activeConv) return;
    if (activeConv.members.includes(userId)) return;

    const updatedMembers = [...activeConv.members, userId];
    const userObj = allUsers.find(u => u.uid === userId);
    const uName = userObj ? userObj.username : "New User";

    try {
      await updateDoc(doc(db, "conversations", activeConvId), {
        members: updatedMembers,
        updatedAt: new Date().toISOString()
      });
      await addSystemMessage(`➕ ${uName} was added to the group.`);
      triggerFCMNotification("Group invitations", `You were added to the group "${activeConv.name || "SoundStream Chat"}"`);
    } catch (err) {
      console.error(err);
    }
  };

  const removeGroupMember = async (userId: string) => {
    if (!activeConvId || !activeConv) return;
    
    // Admins only
    if (!activeConv.admins.includes(currentUser?.uid || "")) {
      alert("Only group administrators can remove members.");
      return;
    }

    const updatedMembers = activeConv.members.filter(id => id !== userId);
    const updatedAdmins = activeConv.admins.filter(id => id !== userId);
    const userObj = allUsers.find(u => u.uid === userId);
    const uName = userObj ? userObj.username : "User";

    try {
      await updateDoc(doc(db, "conversations", activeConvId), {
        members: updatedMembers,
        admins: updatedAdmins,
        updatedAt: new Date().toISOString()
      });
      await addSystemMessage(`❌ ${uName} was removed from the group.`);
    } catch (err) {
      console.error(err);
    }
  };

  const assignAdmin = async (userId: string) => {
    if (!activeConvId || !activeConv) return;
    if (activeConv.admins.includes(userId)) return;

    const updatedAdmins = [...activeConv.admins, userId];
    const userObj = allUsers.find(u => u.uid === userId);
    const uName = userObj ? userObj.username : "User";

    try {
      await updateDoc(doc(db, "conversations", activeConvId), {
        admins: updatedAdmins,
        updatedAt: new Date().toISOString()
      });
      await addSystemMessage(`🛡️ ${uName} was assigned as a group administrator.`);
    } catch (err) {
      console.error(err);
    }
  };

  const leaveGroup = async () => {
    if (!activeConvId || !activeConv || !currentUser?.uid) return;

    const updatedMembers = activeConv.members.filter(id => id !== currentUser.uid);
    let updatedAdmins = activeConv.admins.filter(id => id !== currentUser.uid);

    // If no admins left but members remain, make the first member the admin
    if (updatedAdmins.length === 0 && updatedMembers.length > 0) {
      updatedAdmins = [updatedMembers[0]];
    }

    try {
      await updateDoc(doc(db, "conversations", activeConvId), {
        members: updatedMembers,
        admins: updatedAdmins,
        updatedAt: new Date().toISOString()
      });
      await addSystemMessage(`🚪 ${currentUser.username} has left the group.`);
      setActiveConvId(null);
      setShowGroupSettings(false);
    } catch (err) {
      console.error(err);
    }
  };

  const addSystemMessage = async (text: string) => {
    if (!activeConvId) return;
    try {
      const docRef = await addDoc(collection(db, "conversations", activeConvId, "messages"), {
        conversationId: activeConvId,
        senderId: "system",
        senderName: "SoundStream",
        messageType: "system",
        text,
        createdAt: new Date().toISOString(),
        readBy: [currentUser?.uid || ""]
      });
      await updateDoc(doc(db, "conversations", activeConvId, "messages", docRef.id), {
        messageId: docRef.id
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Send Message
  const sendMessage = async (
    type: "text" | "image" | "voice" | "song" | "playlist" | "artist" = "text",
    contentUrl?: string,
    extraText?: string,
    extraDuration?: number
  ) => {
    if (!activeConvId || !currentUser?.uid) return;
    if (type === "text" && !inputText.trim() && !editingMessageId) return;

    const chatInput = type === "text" ? inputText.trim() : (extraText || "");

    // Handle editing
    if (editingMessageId) {
      try {
        await updateDoc(doc(db, "conversations", activeConvId, "messages", editingMessageId), {
          text: chatInput,
          isEdited: true,
          updatedAt: new Date().toISOString()
        });
        setEditingMessageId(null);
        setInputText("");
        return;
      } catch (error) {
        console.error("Error editing message:", error);
        return;
      }
    }

    try {
      const messageDoc: Partial<ChatMessage> = {
        conversationId: activeConvId,
        senderId: currentUser.uid,
        senderName: currentUser.username,
        senderPhoto: currentUser.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80",
        messageType: type,
        text: chatInput,
        createdAt: new Date().toISOString(),
        readBy: [currentUser.uid],
        isDeleted: false,
        deletedFor: [],
        reactions: {}
      };

      if (contentUrl) {
        messageDoc.mediaUrl = contentUrl;
      }

      if (extraDuration) {
        messageDoc.duration = extraDuration;
      }

      if (replyToMessage) {
        messageDoc.replyTo = {
          messageId: replyToMessage.messageId,
          senderName: replyToMessage.senderName,
          text: replyToMessage.text,
          messageType: replyToMessage.messageType
        };
        setReplyToMessage(null);
      }

      const docRef = await addDoc(collection(db, "conversations", activeConvId, "messages"), messageDoc);
      await updateDoc(doc(db, "conversations", activeConvId, "messages", docRef.id), {
        messageId: docRef.id
      });

      // Update conversation lastMessage & updatedAt
      await updateDoc(doc(db, "conversations", activeConvId), {
        updatedAt: new Date().toISOString(),
        lastMessage: {
          text: type === "text" ? chatInput : `[Shared ${type}]`,
          senderName: currentUser.username,
          createdAt: new Date().toISOString()
        }
      });

      if (type === "text") setInputText("");

      // If this conversation thread is with SoundStream AI, trigger the background AI agent response
      if (activeConv && activeConv.members.includes("soundstream-ai")) {
        triggerAIResponse(chatInput);
      }

      // Trigger standard in-app simulated FCM push notification for mentions / replies or simply other members
      if (activeConv) {
        const otherMembers = activeConv.members.filter(m => m !== currentUser.uid);
        otherMembers.forEach(mId => {
          const mUser = allUsers.find(u => u.uid === mId);
          if (mUser) {
            triggerFCMNotification(
              replyToMessage ? "Replies" : "New messages",
              `${currentUser.username}: ${type === "text" ? chatInput : `sent a ${type}`}`,
              mUser.username
            );
          }
        });
      }

    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `conversations/${activeConvId}/messages`);
    }
  };

  // Simulated Push Notification triggers
  const triggerFCMNotification = (
    type: "New messages" | "Group invitations" | "Mentions" | "Replies",
    content: string,
    recipientName?: string
  ) => {
    const notifyId = `notify_${Date.now()}`;
    const newNotification = {
      id: notifyId,
      type,
      content,
      recipient: recipientName || "everyone",
      timestamp: new Date().toLocaleTimeString()
    };
    
    setNotificationsLog(prev => [newNotification, ...prev]);
    
    // Show top banner/toast
    setShowNotificationsToast(`${type.toUpperCase()}: ${content}`);
    setTimeout(() => {
      setShowNotificationsToast(null);
    }, 4500);
  };

  // Share specific items inside active chat
  const handleShareItem = (item: Song | Playlist | Artist) => {
    if (!shareType || !activeConvId) return;
    
    let label = "";
    let mediaUrl = "";
    
    if (shareType === "song") {
      const song = item as Song;
      label = `🎵 Song: ${song.title} - ${song.artistName}`;
      mediaUrl = song.coverUrl;
    } else if (shareType === "playlist") {
      const pl = item as Playlist;
      label = `💿 Playlist: ${pl.title}`;
      mediaUrl = pl.coverUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=150&q=80";
    } else if (shareType === "artist") {
      const art = item as Artist;
      label = `🎤 Artist Profile: ${art.artistName}`;
      mediaUrl = art.profilePhoto;
    }

    sendMessage(shareType, mediaUrl, label);
    setShowShareModal(false);
    setShareType(null);
  };

  // Delete message for self (local client hide)
  const deleteForMe = async (msg: ChatMessage) => {
    if (!activeConvId || !currentUser?.uid) return;
    const updatedDeletedFor = [...(msg.deletedFor || []), currentUser.uid];
    try {
      await updateDoc(doc(db, "conversations", activeConvId, "messages", msg.messageId), {
        deletedFor: updatedDeletedFor
      });
    } catch (error) {
      console.error("Error deleting message for self:", error);
    }
  };

  // Unsend message for everyone (within a limit)
  const unsendForEveryone = async (msg: ChatMessage) => {
    if (!activeConvId) return;

    // Check limit
    const createdTime = new Date(msg.createdAt).getTime();
    const nowTime = Date.now();
    const diffMinutes = (nowTime - createdTime) / 60000;

    if (diffMinutes > unsendLimitMinutes) {
      alert(`Unable to unsend. Messages can only be unsent within ${unsendLimitMinutes} minutes.`);
      return;
    }

    try {
      await updateDoc(doc(db, "conversations", activeConvId, "messages", msg.messageId), {
        isDeleted: true,
        text: "🚫 This message was unsent.",
        mediaUrl: "",
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error unsending message:", error);
    }
  };

  // Add Emoji reaction
  const reactToMessage = async (msg: ChatMessage, emoji: string) => {
    if (!activeConvId || !currentUser?.uid) return;
    
    const existingReactions = msg.reactions || {};
    // Toggle emoji
    if (existingReactions[currentUser.uid] === emoji) {
      delete existingReactions[currentUser.uid];
    } else {
      existingReactions[currentUser.uid] = emoji;
    }

    try {
      await updateDoc(doc(db, "conversations", activeConvId, "messages", msg.messageId), {
        reactions: existingReactions
      });
    } catch (error) {
      console.error("Error reacting to message:", error);
    }
  };

  // Voice recording controls
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000,
          sampleSize: 16
        } 
      });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], `voice_note_${Date.now()}.webm`, { type: "audio/webm" });
        
        // Mark status as idle
        handleTypingState("");
        
        try {
          // Upload Voice Note
          const url = await uploadToStorage(audioFile, "audio");
          sendMessage("voice", url, "🎤 Voice Note", recordingDuration);
        } catch (err) {
          console.error("Voice upload error:", err);
          alert("Failed to upload voice note.");
        }
        setRecordingDuration(0);
      };

      mediaRecorder.start();
      setIsRecording(true);
      handleTypingState("recording");

      // Timer
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Failed to start recording:", err);
      alert("Microphone permission denied or not supported.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  // Image Upload helper
  const handleImageSend = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image file size must be less than 5MB.");
      return;
    }

    try {
      // Upload using covers bucket
      const url = await uploadToStorage(file, "covers");
      sendMessage("image", url, "📷 Shared an image");
    } catch (err) {
      console.error("Image upload failed:", err);
      alert("Failed to upload image.");
    }
  };

  // Formatting timestamp helper
  const formatTime = (isoString?: string) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatFullDate = (isoString?: string) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Filter conversations & search
  const filteredConversations = conversations.filter((c) => {
    const isMatched = c.isGroup 
      ? (c.name || "Group Chat").toLowerCase().includes(searchTerm.toLowerCase())
      : allUsers.some(u => c.members.includes(u.uid) && u.username.toLowerCase().includes(searchTerm.toLowerCase()));
    return isMatched;
  });

  // Filter message list inside active chat
  const filteredMessages = messages.filter((m) => {
    if (!msgSearchTerm.trim()) return true;
    return m.text.toLowerCase().includes(msgSearchTerm.toLowerCase());
  });

  return (
    <div id="soundstream-chat-dashboard" className="text-white font-sans flex flex-col h-[calc(100vh-140px)] max-w-7xl mx-auto bg-black/40 backdrop-blur-md rounded-3xl border border-white/5 overflow-hidden">
      
      {/* 1. Real-Time Toast Alerts for Simulated Notifications */}
      <AnimatePresence>
        {showNotificationsToast && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white text-xs font-bold px-5 py-3 rounded-full shadow-2xl border border-indigo-500 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 animate-bounce text-yellow-300" />
            <span>{showNotificationsToast}</span>
            <button onClick={() => setShowNotificationsToast(null)} className="ml-2 hover:text-white/80">
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 h-full relative">
        
        {/* LEFT COLUMN: CONVERSATION LIST */}
        <div className={`w-full md:w-80 flex flex-col border-r border-white/5 bg-[#050508]/90 ${activeConvId ? 'hidden md:flex' : 'flex'}`}>
          
          {/* Header */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-400" />
              <h2 className="text-sm font-bold tracking-wider uppercase text-zinc-300">My Inbox</h2>
            </div>
            <div className="flex gap-1">
              {/* Direct Message Start Button */}
              <button 
                onClick={() => setShowNewChatModal(true)} 
                title="New DM"
                className="p-1.5 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <UserIcon className="w-4 h-4" />
              </button>
              {/* Group Chat Create Button */}
              <button 
                onClick={() => setShowGroupModal(true)} 
                title="Create Group"
                className="p-1.5 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Search chats or members..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0a0a0f] border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-indigo-500 text-zinc-200"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto space-y-1 p-2">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-xs">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-zinc-600 opacity-50" />
                <p>No active conversations found</p>
                <p className="text-[10px] text-zinc-650 mt-1">Start a new private or group chat above.</p>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isAIThread = c.members.includes("soundstream-ai");
                const otherMemberId = c.members.find(id => id !== currentUser?.uid);
                const otherUserObj = allUsers.find(u => u.uid === otherMemberId);
                
                const convTitle = isAIThread
                  ? "SoundStream AI"
                  : (c.isGroup 
                    ? (c.name || "Group Chat") 
                    : (otherUserObj?.username || "Direct Chat"));
                
                const convPhoto = c.isGroup 
                  ? (c.photoUrl || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&q=80") 
                  : (otherUserObj?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80");
                
                const isOnline = isAIThread ? true : (!c.isGroup && otherMemberId && userStatuses[otherMemberId]?.online);
                const typingStatuses = c.typing || {};
                const activelyTyping = Object.entries(typingStatuses)
                  .filter(([uid, stat]) => uid !== currentUser?.uid && stat !== "")
                  .map(([uid, stat]) => stat);

                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveConvId(c.id)}
                    className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all cursor-pointer ${
                      activeConvId === c.id 
                        ? 'bg-gradient-to-r from-indigo-950/40 to-indigo-900/10 border-l-2 border-indigo-500' 
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      {isAIThread ? (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center text-white border border-indigo-400/20 shadow-md shadow-indigo-500/15">
                          <Sparkles className="w-5 h-5 text-white animate-pulse" />
                        </div>
                      ) : (
                        <img 
                          src={convPhoto} 
                          alt={convTitle} 
                          className="w-10 h-10 rounded-full object-cover border border-white/5" 
                        />
                      )}
                      {isOnline && (
                        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 ${isAIThread ? 'bg-indigo-400' : 'bg-green-500'} border-2 border-[#050508] rounded-full`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <span className="text-xs font-bold text-zinc-200 truncate pr-2">{convTitle}</span>
                        {c.lastMessage && (
                          <span className="text-[10px] text-zinc-500 flex-shrink-0">{formatTime(c.lastMessage.createdAt)}</span>
                        )}
                      </div>
                      
                      {activelyTyping.length > 0 ? (
                        <span className="text-[10px] text-indigo-400 font-medium animate-pulse">
                          {activelyTyping[0] === "recording" ? "🎙️ Recording voice..." : "✍️ Typing..."}
                        </span>
                      ) : (
                        <p className="text-[11px] text-zinc-500 truncate">
                          {c.lastMessage 
                            ? `${c.lastMessage.senderName === currentUser?.username ? 'You' : c.lastMessage.senderName}: ${c.lastMessage.text}`
                            : "No messages yet."
                          }
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Simulated notification controls panel */}
          <div className="p-3 border-t border-white/5 bg-black/20 text-[10px] text-zinc-500">
            <div className="flex justify-between items-center mb-1">
              <span>Unsend time limit:</span>
              <span className="text-zinc-300 font-bold">{unsendLimitMinutes} min</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="60" 
              value={unsendLimitMinutes} 
              onChange={(e) => setUnsendLimitMinutes(Number(e.target.value))}
              className="w-full accent-indigo-500 opacity-60 hover:opacity-100 transition-opacity"
            />
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE CHAT PANEL */}
        <div className={`flex-1 flex flex-col bg-[#050508]/30 ${!activeConvId ? 'hidden md:flex' : 'flex'}`}>
          {activeConv ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#050508]/70">
                <div className="flex items-center gap-3 min-w-0">
                  <button 
                    onClick={() => setActiveConvId(null)} 
                    className="md:hidden p-1.5 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer mr-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  
                  {/* Avatar & Info */}
                  {activeConv.members.includes("soundstream-ai") ? (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center text-white border border-indigo-400/20 shadow-md shadow-indigo-500/10 flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-white animate-pulse" />
                    </div>
                  ) : (
                    <img 
                      src={activeConv.isGroup 
                        ? (activeConv.photoUrl || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&q=80")
                        : (allUsers.find(u => activeConv.members.includes(u.uid))?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80")
                      } 
                      alt="Active Chat" 
                      className="w-10 h-10 rounded-full object-cover border border-white/5 flex-shrink-0"
                    />
                  )}
                  
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-zinc-200 truncate">
                      {activeConv.members.includes("soundstream-ai") ? (
                        "SoundStream AI"
                      ) : activeConv.isGroup ? (
                        (activeConv.name || "Group Chat") 
                      ) : (
                        (allUsers.find(u => activeConv.members.includes(u.uid))?.username || "Chat Member")
                      )}
                    </h3>
                    
                    {/* Online status / participants preview */}
                    <span className="text-[10px] text-zinc-500 truncate block">
                      {activeConv.members.includes("soundstream-ai") ? (
                        <span className="text-indigo-400 font-bold flex items-center gap-1 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> Always Active AI
                        </span>
                      ) : activeConv.isGroup ? (
                        `${activeConv.members.length} members`
                      ) : (
                        (() => {
                          const recipientId = activeConv.members.find(id => id !== currentUser?.uid);
                          const isOnline = recipientId && userStatuses[recipientId]?.online;
                          const lastSeen = recipientId && userStatuses[recipientId]?.lastSeen;
                          if (isOnline) return <span className="text-green-500 font-semibold">● Online</span>;
                          return lastSeen ? `Last seen ${new Date(lastSeen).toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${new Date(lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "Offline";
                        })()
                      )}
                    </span>
                  </div>
                </div>

                {/* Right side controls (search messages, group settings modal trigger) */}
                <div className="flex items-center gap-1.5">
                  <div className="relative hidden sm:block">
                    <Search className="absolute left-2.5 top-1.5 w-3.5 h-3.5 text-zinc-500" />
                    <input 
                      type="text" 
                      placeholder="Search messages..." 
                      value={msgSearchTerm}
                      onChange={(e) => setMsgSearchTerm(e.target.value)}
                      className="bg-black/40 border border-white/5 rounded-lg pl-8 pr-3 py-1 text-[11px] focus:outline-none focus:border-indigo-500 text-zinc-300 w-36"
                    />
                  </div>

                  {activeConv.isGroup && (
                    <button 
                      onClick={() => setShowGroupSettings(!showGroupSettings)}
                      className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Message Feed Canvas */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-transparent to-black/20">
                {filteredMessages.map((msg, idx) => {
                  const isOwn = msg.senderId === currentUser?.uid;
                  const isSys = msg.messageType === "system";
                  
                  if (isSys) {
                    return (
                      <div key={msg.messageId || idx} className="flex justify-center my-3">
                        <span className="bg-[#0f0f15]/80 border border-white/5 rounded-full px-4 py-1.5 text-[10px] text-zinc-400 max-w-sm text-center">
                          {msg.text}
                        </span>
                      </div>
                    );
                  }

                  // Determine read status visualizer
                  const hasReadList = msg.readBy || [];
                  const totalExpectedReaders = activeConv.members.filter(id => id !== msg.senderId).length;
                  const actualOtherReadersCount = hasReadList.filter(id => id !== msg.senderId).length;
                  const isFullyRead = actualOtherReadersCount >= totalExpectedReaders && totalExpectedReaders > 0;

                  return (
                    <div 
                      key={msg.messageId || idx} 
                      className={`flex gap-2.5 max-w-[85%] sm:max-w-[70%] ${isOwn ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                    >
                      {/* Avatar */}
                      {!isOwn && (
                        msg.senderId === "soundstream-ai" ? (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white border border-indigo-400/20 shadow-md flex-shrink-0 mt-0.5">
                            <Sparkles className="w-4 h-4 text-white" />
                          </div>
                        ) : (
                          <img 
                            src={msg.senderPhoto || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80"} 
                            alt={msg.senderName} 
                            className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-white/5 mt-0.5"
                          />
                        )
                      )}

                      <div className="space-y-1 group">
                        {/* Sender info */}
                        {!isOwn && activeConv.isGroup && (
                          <span className="text-[10px] text-zinc-500 font-bold block ml-1">{msg.senderName}</span>
                        )}

                        {/* Reply To banner if exists */}
                        {msg.replyTo && (
                          <div className={`text-[10px] p-2 bg-black/40 border-l-2 border-indigo-500/80 text-zinc-400 flex flex-col rounded-t-lg ${isOwn ? 'items-end' : 'items-start'}`}>
                            <span className="font-bold text-[9px] text-indigo-400">Replying to {msg.replyTo.senderName}</span>
                            <span className="truncate max-w-[180px]">{msg.replyTo.text}</span>
                          </div>
                        )}

                        {/* Speech Bubble / Message Content card */}
                        <div className={`p-3 rounded-2xl relative shadow-xl ${
                          isOwn 
                            ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-none' 
                            : 'bg-[#12121c]/90 text-zinc-200 rounded-tl-none border border-white/5'
                        }`}>
                          {/* Rich message types */}
                          {msg.messageType === "image" && msg.mediaUrl && (
                            <div className="mb-2 max-w-[240px] overflow-hidden rounded-lg border border-white/5">
                              <img src={msg.mediaUrl} alt="Shared attachment" className="w-full h-auto object-cover hover:scale-105 transition-transform duration-300" />
                            </div>
                          )}

                          {msg.messageType === "voice" && msg.mediaUrl && (
                            <div className="mb-2 p-2.5 rounded-xl bg-black/30 border border-white/5 flex items-center gap-2.5 min-w-[200px]">
                              <button 
                                onClick={() => {
                                  const audio = new Audio(msg.mediaUrl);
                                  audio.play();
                                }}
                                className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center hover:bg-indigo-400 transition-colors cursor-pointer"
                              >
                                <Play className="w-3.5 h-3.5 fill-white" />
                              </button>
                              <div className="flex-1">
                                <span className="text-[10px] text-zinc-300 font-bold block">Voice Note</span>
                                <div className="h-1 bg-white/15 rounded-full overflow-hidden mt-1">
                                  <div className="h-full bg-indigo-400 w-1/3" />
                                </div>
                              </div>
                              <span className="text-[10px] font-mono text-zinc-400">
                                {msg.duration ? `${Math.floor(msg.duration / 60)}:${String(msg.duration % 60).padStart(2, '0')}` : "0:05"}
                              </span>
                            </div>
                          )}

                          {/* Shared soundstream specific items */}
                          {["song", "playlist", "artist"].includes(msg.messageType) && (
                            <div className="mb-2 p-2 rounded-xl bg-black/40 border border-white/5 flex items-center gap-2.5 hover:bg-black/60 transition-colors">
                              <div className="relative w-9 h-9 flex-shrink-0 bg-[#0d0d12] rounded-lg border border-white/5 overflow-hidden flex items-center justify-center text-zinc-500">
                                {msg.mediaUrl ? (
                                  <img src={msg.mediaUrl} alt="Cover" className="w-full h-full object-cover" />
                                ) : (
                                  msg.messageType === "song" ? <Music className="w-5 h-5" /> : <Disc className="w-5 h-5" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-[10px] text-indigo-400 font-bold block uppercase tracking-wider">{msg.messageType} sharing</span>
                                <span className="text-[11px] text-zinc-200 font-medium truncate block leading-tight">{msg.text}</span>
                              </div>
                              <button
                                onClick={() => {
                                  if (msg.messageType === "song") {
                                    const sharedSong = songs.find(s => s.title && msg.text.includes(s.title));
                                    if (sharedSong) onSelectSong(sharedSong);
                                  } else if (msg.messageType === "playlist") {
                                    const sharedPl = playlists.find(p => p.title && msg.text.includes(p.title));
                                    if (sharedPl) {
                                      setSelectedPlaylistId(sharedPl.id);
                                      setCurrentTab("playlist");
                                    }
                                  } else if (msg.messageType === "artist") {
                                    const sharedArt = artists.find(a => a.artistName && msg.text.includes(a.artistName));
                                    if (sharedArt) {
                                      setSelectedArtistId(sharedArt.uid);
                                      setCurrentTab("artist-profile");
                                    }
                                  }
                                }}
                                className="p-1.5 hover:bg-white/10 rounded-lg text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                                title="Open Link"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Standard message text */}
                          {!["song", "playlist", "artist"].includes(msg.messageType) && (
                            <p className="text-xs break-words leading-relaxed">{msg.text}</p>
                          )}

                          {/* Reactions Row */}
                          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {Object.entries(msg.reactions).map(([uId, emoji]) => {
                                const emojiStr = emoji as string;
                                return (
                                  <span 
                                    key={uId} 
                                    onClick={() => reactToMessage(msg, emojiStr)}
                                    className="text-[9px] bg-black/40 border border-white/5 rounded-full px-1.5 py-0.5 cursor-pointer hover:bg-black/60 transition-colors"
                                    title={allUsers.find(u => u.uid === uId)?.username || "User"}
                                  >
                                    {emojiStr}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Footer details: time, edited mark, unsend actions, read receipts */}
                        <div className={`flex items-center gap-1.5 text-[9px] text-zinc-500 ${isOwn ? 'justify-end mr-1' : 'justify-start ml-1'}`}>
                          <span>{formatTime(msg.createdAt)}</span>
                          {msg.isEdited && <span className="text-zinc-650 italic">(edited)</span>}
                          
                          {msg.senderId === "soundstream-ai" && msg.messageType === "text" && (
                            <button
                              onClick={() => toggleSpeech(msg.messageId || idx.toString(), msg.text)}
                              className={`p-1 rounded transition-colors cursor-pointer hover:bg-white/10 ${
                                activeSpeechId === (msg.messageId || idx.toString()) ? 'text-indigo-400 font-bold animate-pulse' : 'text-zinc-500 hover:text-zinc-300'
                              }`}
                              title={activeSpeechId === (msg.messageId || idx.toString()) ? "Stop Reading" : "Read Response Out Loud"}
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          
                          {/* Read Receipts */}
                          {isOwn && (
                            <span className="flex items-center">
                              {isFullyRead ? (
                                <CheckCheck className="w-3 h-3 text-indigo-400" title="Read" />
                              ) : (
                                <Check className="w-3 h-3 text-zinc-500" title="Sent" />
                              )}
                            </span>
                          )}

                          {/* Quick Reactions Palette */}
                          {!msg.isDeleted && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-[#0f0f15]/85 border border-white/5 rounded-full px-2 py-0.5 ml-1 select-none">
                              {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => reactToMessage(msg, emoji)}
                                  className="hover:scale-125 transition-transform text-[10px]"
                                >
                                  {emoji}
                                </button>
                              ))}
                              
                              <span className="text-zinc-700 mx-0.5">|</span>
                              
                              {/* Reply trigger */}
                              <button 
                                onClick={() => setReplyToMessage(msg)}
                                className="p-0.5 hover:text-white transition-colors"
                                title="Reply"
                              >
                                <Undo2 className="w-2.5 h-2.5" />
                              </button>

                              {/* Edit triggers */}
                              {isOwn && msg.messageType === "text" && (
                                <button 
                                  onClick={() => {
                                    setEditingMessageId(msg.messageId);
                                    setInputText(msg.text);
                                  }}
                                  className="p-0.5 hover:text-white transition-colors"
                                  title="Edit"
                                >
                                  <Edit3 className="w-2.5 h-2.5" />
                                </button>
                              )}

                              {/* Delete for self vs unsend */}
                              <button 
                                onClick={() => deleteForMe(msg)}
                                className="p-0.5 hover:text-white transition-colors"
                                title="Delete for me"
                              >
                                <Trash2 className="w-2.5 h-2.5 text-rose-400/80 hover:text-rose-400" />
                              </button>

                              {isOwn && (
                                <button 
                                  onClick={() => unsendForEveryone(msg)}
                                  className="p-0.5 hover:text-white transition-colors"
                                  title="Unsend for everyone"
                                >
                                  <X className="w-2.5 h-2.5 text-zinc-400 hover:text-zinc-200" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Group Settings / Members drawer sidebar if toggled */}
              {showGroupSettings && activeConv.isGroup && (
                <div className="absolute top-16 right-0 w-80 h-[calc(100%-64px)] z-40 bg-[#06060c] border-l border-white/5 flex flex-col shadow-2xl">
                  <div className="p-4 border-b border-white/5 flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Group Management</h3>
                    <button onClick={() => setShowGroupSettings(false)} className="text-zinc-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Rename Group Form */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase">Rename Group</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="New group name..." 
                          id="rename-group-input"
                          className="flex-1 bg-black/40 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none"
                        />
                        <button 
                          onClick={() => {
                            const val = (document.getElementById("rename-group-input") as HTMLInputElement)?.value;
                            if (val) renameGroup(val);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    </div>

                    {/* Change cover photo */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase">Change Group Photo URL</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Image HTTP url..." 
                          id="group-photo-input"
                          className="flex-1 bg-black/40 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none"
                        />
                        <button 
                          onClick={() => {
                            const val = (document.getElementById("group-photo-input") as HTMLInputElement)?.value;
                            if (val) changeGroupPhoto(val);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer"
                        >
                          Update
                        </button>
                      </div>
                    </div>

                    {/* Assign new members */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase">Invite Members</label>
                      <div className="space-y-1 max-h-36 overflow-y-auto border border-white/5 rounded-xl p-1 bg-black/20">
                        {allUsers.filter(u => !activeConv.members.includes(u.uid)).map(u => (
                          <div key={u.uid} className="flex justify-between items-center p-1.5 rounded-lg hover:bg-white/5">
                            <span className="text-xs text-zinc-300 truncate">{u.username}</span>
                            <button 
                              onClick={() => addGroupMember(u.uid)}
                              className="p-1 hover:bg-indigo-500 rounded text-indigo-400 hover:text-white transition-colors cursor-pointer"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Member Directory */}
                    <div className="space-y-2">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase">Members ({activeConv.members.length})</label>
                      <div className="space-y-2">
                        {activeConv.members.map((mId) => {
                          const userObj = allUsers.find(u => u.uid === mId) || (mId === currentUser?.uid ? currentUser : null);
                          const isAdminMember = activeConv.admins.includes(mId);
                          const isMe = mId === currentUser?.uid;

                          return (
                            <div key={mId} className="flex justify-between items-center p-2 rounded-xl bg-black/20 border border-white/5">
                              <div className="flex items-center gap-2">
                                <img 
                                  src={userObj?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80"} 
                                  alt="Member" 
                                  className="w-7 h-7 rounded-full object-cover" 
                                />
                                <div>
                                  <span className="text-xs text-zinc-300 font-medium truncate block leading-tight">{userObj?.username} {isMe && "(You)"}</span>
                                  {isAdminMember && (
                                    <span className="text-[8px] text-indigo-400 font-semibold uppercase tracking-wider flex items-center gap-0.5">
                                      <Shield className="w-2 h-2" /> Admin
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex gap-1">
                                {activeConv.admins.includes(currentUser?.uid || "") && !isAdminMember && !isMe && (
                                  <button 
                                    onClick={() => assignAdmin(mId)}
                                    className="p-1 hover:bg-white/5 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                    title="Assign Admin"
                                  >
                                    <Shield className="w-3.5 h-3.5 text-indigo-400" />
                                  </button>
                                )}
                                {activeConv.admins.includes(currentUser?.uid || "") && !isMe && (
                                  <button 
                                    onClick={() => removeGroupMember(mId)}
                                    className="p-1 hover:bg-white/5 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                    title="Remove from group"
                                  >
                                    <UserX className="w-3.5 h-3.5 text-rose-400" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Leave Group Action */}
                    <button 
                      onClick={leaveGroup}
                      className="w-full bg-rose-600/20 hover:bg-rose-600 border border-rose-500/20 hover:border-rose-500 text-rose-300 hover:text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer mt-4"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Leave Group Chat</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Chat Input Dock Area */}
              <div className="p-4 border-t border-white/5 bg-[#050508]/80 flex flex-col gap-2">
                
                {/* Reply state banner if active */}
                {replyToMessage && (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-black/40 border-l-2 border-indigo-500 text-xs text-zinc-400">
                    <span className="truncate">Replying to <strong>{replyToMessage.senderName}</strong>: {replyToMessage.text}</span>
                    <button onClick={() => setReplyToMessage(null)} className="p-1 hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2.5">
                  {/* Share Menu trigger */}
                  <div className="relative">
                    <button 
                      onClick={() => setShowShareModal(!showShareModal)}
                      className="p-2.5 hover:bg-white/5 rounded-xl text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                      title="Share SoundStream Item"
                    >
                      <Sparkles className="w-5 h-5" />
                    </button>
                    
                    {/* Share Modal popup */}
                    <AnimatePresence>
                      {showShareModal && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-12 left-0 w-56 z-50 bg-[#0a0a0f] border border-white/10 rounded-2xl shadow-2xl p-2.5 space-y-1.5"
                        >
                          <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider px-2">Share SoundStream item</span>
                          <button 
                            onClick={() => { setShareType("song"); setShowShareModal(false); }}
                            className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 rounded-xl transition-all flex items-center gap-2"
                          >
                            <Music className="w-4 h-4 text-indigo-400" />
                            <span>Share Track / Song</span>
                          </button>
                          <button 
                            onClick={() => { setShareType("playlist"); setShowShareModal(false); }}
                            className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 rounded-xl transition-all flex items-center gap-2"
                          >
                            <Disc className="w-4 h-4 text-pink-400" />
                            <span>Share Playlist compilation</span>
                          </button>
                          <button 
                            onClick={() => { setShareType("artist"); setShowShareModal(false); }}
                            className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 rounded-xl transition-all flex items-center gap-2"
                          >
                            <UserIcon className="w-4 h-4 text-teal-400" />
                            <span>Share Creator Profile</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Attachment input (Images) */}
                  <label className="p-2.5 hover:bg-white/5 rounded-xl text-zinc-400 hover:text-white transition-colors cursor-pointer flex-shrink-0">
                    <ImageIcon className="w-5 h-5" />
                    <input type="file" accept="image/*" onChange={handleImageSend} className="hidden" />
                  </label>

                  {/* Microphone (Voice notes) */}
                  <button 
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecording}
                    className={`p-2.5 rounded-xl transition-colors cursor-pointer flex-shrink-0 relative ${
                      isRecording ? 'bg-rose-600/30 text-rose-400 animate-pulse' : 'hover:bg-white/5 text-zinc-400 hover:text-white'
                    }`}
                    title="Hold to Record Voice Note"
                  >
                    <Mic className="w-5 h-5" />
                    {isRecording && (
                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                      </span>
                    )}
                  </button>

                  {/* Text Input area */}
                  <input 
                    type="text" 
                    placeholder={isRecording ? `Recording... (${recordingDuration}s)` : editingMessageId ? "Edit your message..." : "Type a message..."}
                    value={inputText}
                    onChange={(e) => onInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        sendMessage();
                      }
                    }}
                    disabled={isRecording}
                    className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                  />

                  {/* Submit buttons */}
                  <button 
                    onClick={() => sendMessage()}
                    className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#050508]/10">
              <MessageSquare className="w-16 h-16 text-zinc-650 mb-4 animate-bounce" />
              <h3 className="text-base font-bold text-zinc-300">SoundStream Connect</h3>
              <p className="text-xs text-zinc-500 mt-1 mb-6 max-w-sm">
                Select an active conversation on the left, or open a new Direct Message / Group Chat to message creators and friends instantly.
              </p>
              <div className="flex gap-2.5">
                <button 
                  onClick={() => setShowNewChatModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  Start Private Chat
                </button>
                <button 
                  onClick={() => setShowGroupModal(true)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  Create Group
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* SHARE SELECTOR SUB-MODAL */}
      <AnimatePresence>
        {shareType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0b0b12] border border-white/10 rounded-3xl max-w-md w-full p-5 space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Select {shareType} to share</h3>
                <button onClick={() => setShareType(null)} className="text-zinc-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {shareType === "song" && songs.map(s => (
                  <button 
                    key={s.id} 
                    onClick={() => handleShareItem(s)}
                    className="w-full text-left p-2 hover:bg-white/5 rounded-xl flex items-center gap-3 transition-colors text-xs text-zinc-300"
                  >
                    <img src={s.coverUrl} className="w-9 h-9 rounded object-cover" />
                    <div>
                      <span className="font-bold block text-zinc-200">{s.title}</span>
                      <span className="text-[10px] text-zinc-500">{s.artistName}</span>
                    </div>
                  </button>
                ))}

                {shareType === "playlist" && playlists.map(p => (
                  <button 
                    key={p.id} 
                    onClick={() => handleShareItem(p)}
                    className="w-full text-left p-2 hover:bg-white/5 rounded-xl flex items-center gap-3 transition-colors text-xs text-zinc-300"
                  >
                    <img src={p.coverUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=150&q=80"} className="w-9 h-9 rounded object-cover" />
                    <div>
                      <span className="font-bold block text-zinc-200">{p.title}</span>
                      <span className="text-[10px] text-zinc-500">{p.songIds.length} tracks</span>
                    </div>
                  </button>
                ))}

                {shareType === "artist" && artists.map(a => (
                  <button 
                    key={a.uid} 
                    onClick={() => handleShareItem(a)}
                    className="w-full text-left p-2 hover:bg-white/5 rounded-xl flex items-center gap-3 transition-colors text-xs text-zinc-300"
                  >
                    <img src={a.profilePhoto} className="w-9 h-9 rounded-full object-cover" />
                    <div>
                      <span className="font-bold block text-zinc-200">{a.artistName}</span>
                      <span className="text-[10px] text-zinc-500">{a.followersCount} followers</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NEW DIRECT MESSAGE MODAL */}
      <AnimatePresence>
        {showNewChatModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0b0b12] border border-white/10 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Start a Direct Chat</h3>
                <button onClick={() => setShowNewChatModal(false)} className="text-zinc-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {allUsers.length === 0 ? (
                  <p className="text-center py-6 text-zinc-500 text-xs">No other registered users found.</p>
                ) : (
                  allUsers.map((u) => (
                    <button 
                      key={u.uid} 
                      onClick={() => startPrivateChat(u)}
                      className="w-full text-left p-2.5 hover:bg-white/5 rounded-2xl flex items-center gap-3 transition-all text-xs text-zinc-300"
                    >
                      <img src={u.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80"} className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <span className="font-bold block text-zinc-250">{u.username}</span>
                        <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                          {userStatuses[u.uid]?.online ? <span className="text-green-500 font-bold">● Online</span> : "Offline"}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NEW GROUP CHAT MODAL */}
      <AnimatePresence>
        {showGroupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0b0b12] border border-white/10 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Create Group Chat</h3>
                <button onClick={() => setShowGroupModal(false)} className="text-zinc-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase">Group Name</label>
                  <input 
                    type="text" 
                    placeholder="Enter group name..." 
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase">Group Photo URL (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="Image link..." 
                    value={groupPhoto}
                    onChange={(e) => setGroupPhoto(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase">Select Members</label>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto border border-white/5 rounded-xl p-1.5 bg-black/20">
                    {allUsers.map((u) => (
                      <label key={u.uid} className="flex items-center gap-2.5 p-1 rounded hover:bg-white/5 cursor-pointer text-xs text-zinc-300">
                        <input 
                          type="checkbox" 
                          checked={selectedMembers.includes(u.uid)}
                          onChange={() => {
                            if (selectedMembers.includes(u.uid)) {
                              setSelectedMembers(prev => prev.filter(id => id !== u.uid));
                            } else {
                              setSelectedMembers(prev => [...prev, u.uid]);
                            }
                          }}
                          className="rounded border-white/10 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{u.username}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={createGroupChat}
                  disabled={!groupName.trim() || selectedMembers.length === 0}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 text-white text-xs font-bold py-2.5 rounded-xl transition-all uppercase tracking-wide cursor-pointer mt-4"
                >
                  Build Group Chat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
