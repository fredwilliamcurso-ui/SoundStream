export interface LiveBattle {
  id: string;
  creator1Id: string;
  creator1Name: string;
  creator1Photo?: string;
  creator1StreamId: string;
  creator2Id: string;
  creator2Name: string;
  creator2Photo?: string;
  creator2StreamId: string;
  creator1Score: number;
  creator2Score: number;
  status: "active" | "finished" | "ended_by_admin";
  duration: number; // in seconds, default is 300 (5 minutes)
  startedAt: string; // ISO date string
  endsAt: string; // ISO date string
  winnerId: string | null; // null if active, "draw" if tied, or creator ID
  endedAt?: string;
}

export interface BattleInvite {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  senderStreamId: string;
  receiverId: string;
  receiverName: string;
  receiverPhoto?: string;
  receiverStreamId: string;
  status: "pending" | "accepted" | "declined" | "expired";
  duration: number; // in seconds
  createdAt: string;
  acceptedBattleId?: string | null;
}

export interface BattleScore {
  id: string;
  battleId: string;
  creatorId: string;
  totalScore: number;
  giftCount: number;
  updatedAt: string;
}

export interface BattleResult {
  id: string; // matches battleId
  battleId: string;
  creator1Id: string;
  creator1Score: number;
  creator2Id: string;
  creator2Score: number;
  winnerId: string | "draw";
  endedAt: string;
}

export interface BattleHistoryEntry {
  id: string;
  creatorId: string;
  battleId: string;
  opponentId: string;
  opponentName: string;
  opponentPhoto?: string;
  score: number;
  opponentScore: number;
  outcome: "win" | "loss" | "draw";
  earnings: number; // in Diamonds
  timestamp: string;
}

export interface BattleLeaderboardEntry {
  userId: string;
  username: string;
  photoURL?: string;
  value: number; // wins, coins gifted, points scored, etc.
}

export interface BattleLeaderboardRecord {
  id: string; // e.g., "winners_all", "gifters_all", etc.
  type: "winners" | "gifters" | "fans" | "creators";
  period: "today" | "week" | "month" | "all";
  rankings: BattleLeaderboardEntry[];
  updatedAt: string;
}
