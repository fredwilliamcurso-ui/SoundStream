export interface User {
  uid: string;
  username: string;
  email: string;
  photoURL?: string;
  createdAt: string;
  role: "listener" | "artist" | "admin";
  isSuspended?: boolean;
  subscription?: {
    status: "free" | "premium";
    expiresAt?: string | null;
    updatedAt?: string;
  };
  soundstreamId?: string;
  soundstreamUsername?: string;
  soundstreamAccessToken?: string;

  // SoundStream Profile system requirements
  displayName?: string;
  bio?: string;
  country?: string;
  website?: string;
  googleLinked?: boolean;
  soundstreamLinked?: boolean;
  followersCount?: number;
  followingCount?: number;
  playlistsCount?: number;
  likedSongs?: string[];
  recentlyPlayed?: string[];
  isVerified?: boolean;
  isPrivate?: boolean;
  updatedAt?: string;

  // Backwards compatibility properties
  id?: string;
  isAdmin?: boolean;

  // Creator subscription fields for new Creator/Artist registrations
  creatorSubscriptionStatus?: string;
  creatorSubscriptionDate?: string;
  creatorSubscriptionProvider?: string;
  creatorSubscriptionActive?: boolean;
}

export interface Artist {
  uid: string;
  artistName: string;
  bio: string;
  verified: boolean;
  profilePhoto: string;
  followersCount: number;
  createdAt: string;
  isSuspended?: boolean;
  isFeatured?: boolean;
  soundstreamId?: string;
  soundstreamUsername?: string;

  // Backwards compatibility properties
  userId: string;
}

export interface Song {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  genre: string;
  coverUrl: string;
  audioUrl: string;
  videoUrl?: string;
  lyrics?: string;
  playCount: number;
  likes: number;
  createdAt: string;
  type: "song";
  isFeatured?: boolean;
  isModerated?: boolean;

  // Album support
  albumId?: string;
  albumTitle?: string;
  trackNumber?: number;
  discNumber?: number;
}

export interface Album {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  description: string;
  genre: string;
  coverUrl: string;
  releaseDate: string;
  createdAt: string;
  trackCount: number;
  totalDuration: number; // in seconds
  isEP?: boolean;
}

export interface Playlist {
  id: string;
  title: string;
  description?: string;
  coverUrl: string;
  createdBy: string; // for backwards compatibility
  userId?: string; // for backwards compatibility and security rules matching
  ownerId: string;
  songIds: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  songCount: number;
}

export interface PlaylistSong {
  id?: string;
  playlistId: string;
  songId: string;
  trackOrder: number;
  addedAt: string;
}

export interface UploadProgress {
  progress: number;
  status:
    | "idle"
    | "uploading"
    | "processing"
    | "completed"
    | "failed";
  error?: string;
}

export interface ShortVideo {
  id: string; // Firestore document ID
  videoId: string;
  creatorId: string;
  creatorName: string;
  creatorPhoto?: string;
  title: string;
  description: string;
  hashtags: string[];
  videoUrl: string;
  thumbnailUrl: string;
  duration: number; // in seconds
  views: number;
  likes: number;
  comments: number; // comments count
  shares: number;
  bookmarks: number;
  musicId?: string; // optional linked song ID
  visibility: "public" | "private";
  createdAt: string;
  updatedAt: string;
  likedBy?: string[]; // track user IDs who liked
  bookmarkedBy?: string[]; // track user IDs who bookmarked
}

export interface ShortComment {
  commentId: string;
  userId: string;
  username: string;
  photoURL?: string;
  text: string;
  likes: number;
  likedBy?: string[]; // user IDs who liked
  replies: ShortReply[];
  createdAt: string;
}

export interface ShortReply {
  replyId: string;
  userId: string;
  username: string;
  photoURL?: string;
  text: string;
  likes: number;
  likedBy?: string[]; // user IDs who liked
  createdAt: string;
}

export interface ChatMessage {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  messageType: "text" | "image" | "voice" | "song" | "playlist" | "artist" | "system";
  text: string;
  mediaUrl?: string;
  duration?: number;
  replyTo?: {
    messageId: string;
    senderName: string;
    text: string;
    messageType: string;
  } | null;
  reactions?: { [userId: string]: string };
  isEdited?: boolean;
  isDeleted?: boolean;
  deletedFor?: string[];
  createdAt: string;
  updatedAt?: string;
  readBy: string[];
}

export interface Conversation {
  id: string;
  name?: string;
  photoUrl?: string;
  isGroup: boolean;
  members: string[];
  admins: string[];
  typing?: { [userId: string]: "typing" | "recording" | "" };
  createdAt: string;
  updatedAt: string;
  lastMessage?: {
    text: string;
    senderName: string;
    createdAt: string;
  };
}

export interface LiveStream {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorPhoto?: string;
  title: string;
  description: string;
  category: string; // "Music" | "Podcast" | "Talk Show" | "Gaming" | "Education" | etc.
  type: "audio" | "video";
  status: "live" | "upcoming" | "ended";
  scheduledStartTime?: string;
  thumbnailUrl?: string;
  viewerCount: number;
  totalViewers: number;
  peakViewers: number;
  likes: number;
  shares: number;
  followersGained: number;
  chatMessagesCount: number;
  quality: string;
  duration: number; // in seconds
  createdAt: string;
  endedAt?: string;
  enableReplay: boolean;
  replayUrl?: string;
  virtualGiftsCount: number;
  tipsAmount: number;
  superChatsAmount: number;
  streamKey?: string;
  viewerUrl?: string;
  chatRoomId?: string;
  endedReason?: string;
  recordingUrl?: string;
  tags?: string[];
  isPrivate?: boolean;
  seatCount?: number;
  activeBattleId?: string | null;
  likesCount?: number;
}

export interface LiveChatMessage {
  id: string;
  streamId: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  text: string;
  replyToId?: string;
  replyToName?: string;
  replyToText?: string;
  mentions?: string[]; // list of userNames or IDs
  isPinned?: boolean;
  isAbusive?: boolean;
  createdAt: string;
}

export interface LiveStreamReaction {
  id: string;
  streamId: string;
  senderId: string;
  emoji: string;
  createdAt: string;
}

export type SubscriptionPlanType = "Free Plan" | "Premium Individual" | "Premium Family" | "Premium Student" | "Creator Pro";
export type SubscriptionStatusType = "active" | "expired" | "canceled" | "trialing";
export type PaymentProviderType = "stripe" | "google_play" | "apple_iap" | "paypal" | "free";

export interface Subscription {
  subscriptionId: string;
  userId: string;
  plan: SubscriptionPlanType;
  status: SubscriptionStatusType;
  price: number;
  currency: string;
  billingCycle: "monthly" | "yearly";
  startedAt: string;
  expiresAt: string | null;
  renewalDate: string | null;
  paymentProvider: PaymentProviderType;
}

export interface CreatorWallet {
  walletId: string;
  creatorId: string;
  availableBalance: number;
  pendingBalance: number;
  totalEarnings: number;
  totalWithdrawn: number;
  currency: string;
  updatedAt: string;
}

export type PayoutProviderType = "bank_transfer" | "paypal" | "stripe_connect";
export type PayoutStatusType = "pending" | "completed" | "failed";

export interface Payout {
  payoutId: string;
  creatorId: string;
  amount: number;
  currency: string;
  status: PayoutStatusType;
  provider: PayoutProviderType;
  requestedAt: string;
  processedAt?: string | null;
  errorMessage?: string | null;
}

export interface MonetizationNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "payment_success" | "payment_fail" | "subscription_renew" | "subscription_expire" | "payout_complete" | "tip_received" | "gift_received";
  createdAt: string;
  read: boolean;
}

export * from "./types/agency";
export * from "./types/ads";




