export interface Wallet {
  userId: string;
  balance: number;
  totalPurchased: number;
  totalSpent: number;
  totalReceived: number;
  updatedAt: string;
}

export interface CoinTransaction {
  id: string;
  userId: string;
  type: "purchase" | "spend" | "refund";
  amount: number;
  stripeSessionId?: string;
  packageName?: string;
  status: "pending" | "completed" | "failed";
  createdAt: string;
}

export interface Gift {
  id: string;
  name: string;
  cost: number;
  icon: string; // Lucide icon name or emoji
  animationType: "pulse" | "float" | "burst" | "fire" | "spin" | "rocket" | "galaxy" | "star_shower" | "confetti" | "particles" | "music_wave" | "laser_beam";
  category: "Popular" | "African Vibe" | "Music" | "Hype" | "Elite";
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
}

export interface GiftTransaction {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  receiverId: string;
  receiverName: string;
  streamId: string;
  giftId: string;
  giftName: string;
  giftCost: number;
  diamondsEarned: number;
  createdAt: string;
}

export interface DiamondWallet {
  creatorId: string;
  totalDiamonds: number;
  estimatedEarnings: number; // in USD (1 Diamond = $0.01 USD)
  withdrawableBalance: number; // in USD
  totalWithdrawn: number; // in USD
  updatedAt: string;
}

export interface Withdrawal {
  id: string;
  creatorId: string;
  amount: number; // USD
  diamondsExchanged: number;
  paymentMethod: "PayPal" | "Stripe" | "Bank Transfer";
  paymentDetails: string;
  status: "pending" | "completed" | "failed";
  requestedAt: string;
  processedAt?: string;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  photoURL?: string;
  value: number; // Coins spent or Diamonds earned
}

export interface LeaderboardRecord {
  id: string; // "gifters_today", "creators_alltime", etc.
  period: "today" | "week" | "month" | "all";
  type: "gifters" | "creators" | "fans";
  rankings: LeaderboardEntry[];
  updatedAt: string;
}

export interface CoinPackage {
  id: string;
  coins: number;
  price: number; // in USD
  badge?: string;
  popular?: boolean;
}

export const COIN_PACKAGES: CoinPackage[] = [
  { id: "pkg_100", coins: 100, price: 0.99, badge: "Starter" },
  { id: "pkg_500", coins: 500, price: 4.99, badge: "Value" },
  { id: "pkg_1000", coins: 1000, price: 9.99, badge: "Popular", popular: true },
  { id: "pkg_2500", coins: 2500, price: 24.99, badge: "Bronze" },
  { id: "pkg_5000", coins: 5000, price: 49.99, badge: "Silver" },
  { id: "pkg_10000", coins: 10000, price: 99.99, badge: "Gold Champion" }
];

export const DEFAULT_GIFTS: Gift[] = [
  // Popular
  { id: "gift_music_note", name: "Music Note", cost: 1, icon: "🎵", animationType: "pulse", category: "Popular", rarity: "common" },
  { id: "gift_thumb_up", name: "Thumb Up", cost: 5, icon: "👍", animationType: "pulse", category: "Popular", rarity: "common" },
  { id: "gift_heart", name: "Heart", cost: 10, icon: "💖", animationType: "burst", category: "Popular", rarity: "common" },
  { id: "gift_rose", name: "Rose", cost: 20, icon: "🌹", animationType: "float", category: "Popular", rarity: "common" },
  { id: "gift_fire", name: "Fire Flame", cost: 50, icon: "🔥", animationType: "fire", category: "Popular", rarity: "common" },

  // African Vibe
  { id: "gift_palm_wine", name: "Palm Wine", cost: 100, icon: "🍶", animationType: "particles", category: "African Vibe", rarity: "uncommon" },
  { id: "gift_suya", name: "Naija Suya", cost: 250, icon: "🍢", animationType: "float", category: "African Vibe", rarity: "uncommon" },
  { id: "gift_talking_drum", name: "Talking Drum", cost: 500, icon: "🪘", animationType: "music_wave", category: "African Vibe", rarity: "rare" },
  { id: "gift_kings_beads", name: "King's Beads", cost: 1000, icon: "📿", animationType: "pulse", category: "African Vibe", rarity: "epic" },
  { id: "gift_african_lion", name: "African Lion", cost: 5000, icon: "🦁", animationType: "laser_beam", category: "African Vibe", rarity: "legendary" },

  // Music
  { id: "gift_mic", name: "Microphone", cost: 150, icon: "🎤", animationType: "music_wave", category: "Music", rarity: "uncommon" },
  { id: "gift_headphones", name: "Headphones", cost: 300, icon: "🎧", animationType: "spin", category: "Music", rarity: "uncommon" },
  { id: "gift_turntable", name: "DJ Turntable", cost: 800, icon: "🎛️", animationType: "spin", category: "Music", rarity: "rare" },
  { id: "gift_guitar", name: "Electric Guitar", cost: 1500, icon: "🎸", animationType: "music_wave", category: "Music", rarity: "epic" },
  { id: "gift_golden_record", name: "Golden Record", cost: 3000, icon: "💿", animationType: "spin", category: "Music", rarity: "epic" },
  { id: "gift_concert_arena", name: "Concert Arena", cost: 15000, icon: "🏟️", animationType: "confetti", category: "Music", rarity: "legendary" },

  // Hype
  { id: "gift_love_letter", name: "Love Letter", cost: 120, icon: "✉️", animationType: "float", category: "Hype", rarity: "uncommon" },
  { id: "gift_champagne", name: "Champagne Toast", cost: 600, icon: "🥂", animationType: "burst", category: "Hype", rarity: "rare" },
  { id: "gift_supercar", name: "Luxury Sports Car", cost: 8000, icon: "🏎️", animationType: "rocket", category: "Hype", rarity: "legendary" },
  { id: "gift_private_jet", name: "Private Jet", cost: 20000, icon: "🛩️", animationType: "rocket", category: "Hype", rarity: "legendary" },

  // Elite
  { id: "gift_crown", name: "Golden Crown", cost: 10000, icon: "👑", animationType: "star_shower", category: "Elite", rarity: "epic" },
  { id: "gift_diamond_ring", name: "Diamond Ring", cost: 12000, icon: "💍", animationType: "particles", category: "Elite", rarity: "epic" },
  { id: "gift_golden_mic", name: "Golden Mic", cost: 18000, icon: "🎙️", animationType: "laser_beam", category: "Elite", rarity: "legendary" },
  { id: "gift_soundstream_star", name: "SoundStream Star", cost: 30000, icon: "⭐", animationType: "galaxy", category: "Elite", rarity: "legendary" }
];
