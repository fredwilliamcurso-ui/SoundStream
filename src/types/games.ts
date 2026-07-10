export interface GameProfile {
  userId: string;
  username: string;
  avatar: string;
  level: number;
  xp: number;
  coins: number;
  badges: string[];
  ranking: string;
  wins: number;
  losses: number;
  updatedAt: string;
}

export interface GameHistoryEntry {
  id: string;
  userId: string;
  gameId: string;
  gameName: string;
  coinsSpent: number;
  coinsEarned: number;
  status: "won" | "lost" | "draw" | "completed";
  createdAt: string;
}

export interface PlayerState {
  id: string;
  username: string;
  avatar: string;
  score: number;
  status: "idle" | "ready" | "playing" | "completed";
  joinedAt: string;
}

export interface GameRoom {
  id: string;
  gameId: string;
  gameName: string;
  roomName: string;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  status: "waiting" | "playing" | "completed";
  players: PlayerState[];
  spectators: string[];
  maxPlayers: number;
  entryFee: number;
  prizePool: number;
  gameData?: any;
  chat: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  message: string;
  timestamp: string;
}

export interface GameScore {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  gameId: string;
  gameName: string;
  score: number;
  createdAt: string;
}

export interface GameReward {
  id: string;
  userId: string;
  type: "daily_login" | "weekly" | "achievement" | "tournament" | "referral";
  rewardName: string;
  coins: number;
  claimed: boolean;
  claimedAt: string | null;
  createdAt: string;
}

export interface GameTournament {
  id: string;
  name: string;
  gameId: string;
  gameName: string;
  description: string;
  startDate: string;
  endDate: string;
  entryFee: number;
  prizePool: number;
  registeredPlayers: string[];
  status: "upcoming" | "active" | "completed";
  winnerId?: string;
  winnerName?: string;
}

export interface GameLeaderboardEntry {
  userId: string;
  username: string;
  avatar: string;
  score: number;
  wins: number;
  level: number;
  rank?: number;
}

export interface GameFriend {
  id: string;
  userId: string;
  friendId: string;
  friendName: string;
  friendAvatar: string;
  status: "pending_sent" | "pending_received" | "friends";
  createdAt: string;
}

export interface PlatformGameConfig {
  id: string;
  name: string;
  description: string;
  category: string;
  image: string;
  enabled: boolean;
  minEntryFee: number;
  maxEntryFee: number;
  houseEdgePercent: number;
}
