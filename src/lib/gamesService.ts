import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  runTransaction,
  increment,
  arrayUnion,
  arrayRemove,
  deleteDoc
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { 
  GameProfile, 
  GameHistoryEntry, 
  GameRoom, 
  GameScore, 
  GameReward, 
  GameTournament, 
  GameLeaderboardEntry, 
  GameFriend,
  PlatformGameConfig,
  PlayerState,
  ChatMessage
} from "../types/games";
import { Wallet, CoinTransaction } from "../types/coins";
import { getOrCreateWallet } from "./coinsService";

/**
 * 1. Fetch or initialize user's Game Profile
 */
export async function getOrCreateGameProfile(userId: string, username: string, avatar: string): Promise<GameProfile> {
  const profileRef = doc(db, "game_profiles", userId);
  try {
    const snap = await getDoc(profileRef);
    if (snap.exists()) {
      const data = snap.data() as GameProfile;
      // sync coins from core wallet to make sure it matches
      const wallet = await getOrCreateWallet(userId);
      if (data.coins !== wallet.balance) {
        await updateDoc(profileRef, { coins: wallet.balance });
        data.coins = wallet.balance;
      }
      return data;
    } else {
      const wallet = await getOrCreateWallet(userId);
      const initialProfile: GameProfile = {
        userId,
        username: username || "Player_" + userId.slice(0, 5),
        avatar: avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80",
        level: 1,
        xp: 0,
        coins: wallet.balance || 100,
        badges: ["Newbie Explorer"],
        ranking: "Unranked",
        wins: 0,
        losses: 0,
        updatedAt: new Date().toISOString()
      };
      await setDoc(profileRef, initialProfile);
      return initialProfile;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `game_profiles/${userId}`);
    throw error;
  }
}

/**
 * 2. Deduct Coins Securely from User's Wallet (with transaction protection)
 */
export async function deductCoinsForGame(
  userId: string, 
  amount: number, 
  reason: string,
  gameId: string
): Promise<{ success: boolean; newBalance: number }> {
  if (amount <= 0) return { success: true, newBalance: 0 };

  const walletRef = doc(db, "wallets", userId);
  const profileRef = doc(db, "game_profiles", userId);
  const transactionId = `gametxn_spend_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const txnRef = doc(db, "coin_transactions", transactionId);

  try {
    const result = await runTransaction(db, async (transaction) => {
      const walletSnap = await transaction.get(walletRef);
      if (!walletSnap.exists()) {
        throw new Error("Wallet does not exist.");
      }
      const walletData = walletSnap.data() as Wallet;
      if (walletData.balance < amount) {
        throw new Error(`Insufficient SoundStream Coins. Need ${amount}, balance is ${walletData.balance}.`);
      }

      const nextBalance = walletData.balance - amount;
      const nextSpent = (walletData.totalSpent || 0) + amount;

      // Update core wallet
      transaction.update(walletRef, {
        balance: nextBalance,
        totalSpent: nextSpent,
        updatedAt: new Date().toISOString()
      });

      // Update game profile coin display
      transaction.update(profileRef, {
        coins: nextBalance,
        updatedAt: new Date().toISOString()
      });

      // Create transaction record
      const txnRecord: CoinTransaction = {
        id: transactionId,
        userId,
        type: "spend",
        amount,
        packageName: `Wager: ${reason}`,
        status: "completed",
        createdAt: new Date().toISOString()
      };
      transaction.set(txnRef, txnRecord);

      return { success: true, newBalance: nextBalance };
    });

    return result;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `wallets/${userId}`);
    throw error;
  }
}

/**
 * 3. Credit Coins Securely to User's Wallet
 */
export async function creditCoinsFromGame(
  userId: string, 
  amount: number, 
  reason: string,
  gameId: string
): Promise<{ success: boolean; newBalance: number }> {
  if (amount <= 0) return { success: false, newBalance: 0 };

  const walletRef = doc(db, "wallets", userId);
  const profileRef = doc(db, "game_profiles", userId);
  const transactionId = `gametxn_earn_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const txnRef = doc(db, "coin_transactions", transactionId);

  try {
    const result = await runTransaction(db, async (transaction) => {
      const walletSnap = await transaction.get(walletRef);
      let walletData: Wallet;
      if (!walletSnap.exists()) {
        walletData = {
          userId,
          balance: 100,
          totalPurchased: 100,
          totalSpent: 0,
          totalReceived: 0,
          updatedAt: new Date().toISOString()
        };
        transaction.set(walletRef, walletData);
      } else {
        walletData = walletSnap.data() as Wallet;
      }

      const nextBalance = (walletData.balance || 0) + amount;
      const nextReceived = (walletData.totalReceived || 0) + amount;

      // Update core wallet
      transaction.update(walletRef, {
        balance: nextBalance,
        totalReceived: nextReceived,
        updatedAt: new Date().toISOString()
      });

      // Update game profile coin display
      transaction.update(profileRef, {
        coins: nextBalance,
        updatedAt: new Date().toISOString()
      });

      // Create transaction record
      const txnRecord: CoinTransaction = {
        id: transactionId,
        userId,
        type: "refund",
        amount,
        packageName: `Winnings: ${reason}`,
        status: "completed",
        createdAt: new Date().toISOString()
      };
      transaction.set(txnRef, txnRecord);

      return { success: true, newBalance: nextBalance };
    });

    return result;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `wallets/${userId}`);
    throw error;
  }
}

/**
 * 4. Record Game History Entry and Update Level/XP & Badges (anti-cheating verification)
 */
export async function saveGameResult(
  userId: string,
  gameId: string,
  gameName: string,
  coinsSpent: number,
  coinsEarned: number,
  status: "won" | "lost" | "draw" | "completed",
  score: number = 0
): Promise<{ success: boolean; newXp: number; newLevel: number; earnedBadges: string[] }> {
  
  // Security Checks: Prevent duplicate reward injections or fraudulent coin wagers on client side.
  // Validate logical outcomes
  if (status === "won" && coinsEarned <= 0 && coinsSpent > 0) {
    console.warn("Suspicious won result: 0 coins earned on positive spend");
  }
  if (coinsEarned > coinsSpent * 100) {
    // Flag potential exploit
    console.error("Antigravity Anti-Cheat System triggered: suspicious payouts blocked.");
    throw new Error("Fraudulent score or payout detected. Transaction rejected by Antigravity Game Guard.");
  }

  const profileRef = doc(db, "game_profiles", userId);
  const historyRef = collection(db, "game_history");
  const scoreRef = collection(db, "game_scores");

  try {
    const historyId = `history_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const historyEntry: GameHistoryEntry = {
      id: historyId,
      userId,
      gameId,
      gameName,
      coinsSpent,
      coinsEarned,
      status,
      createdAt: new Date().toISOString()
    };

    // Save history
    await setDoc(doc(db, "game_history", historyId), historyEntry);

    // Save score if relevant
    if (score > 0) {
      const scoreId = `score_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      await setDoc(doc(db, "game_scores", scoreId), {
        id: scoreId,
        userId,
        gameId,
        gameName,
        score,
        createdAt: new Date().toISOString()
      });
    }

    // Update Game Profile atomically
    const earnedBadges: string[] = [];
    let finalXp = 0;
    let finalLevel = 1;

    const result = await runTransaction(db, async (transaction) => {
      const profileSnap = await transaction.get(profileRef);
      if (!profileSnap.exists()) {
        throw new Error("Game Profile not initialized.");
      }
      const profileData = profileSnap.data() as GameProfile;

      // Calculate XP Gain
      let xpGained = 20; // baseline completion
      if (status === "won") xpGained += 50;
      if (score > 0) xpGained += Math.min(100, Math.floor(score / 10));

      let nextXp = (profileData.xp || 0) + xpGained;
      let nextLevel = profileData.level || 1;

      // Level up algorithm (every 500 XP = 1 Level)
      const xpNeeded = nextLevel * 500;
      if (nextXp >= xpNeeded) {
        nextXp -= xpNeeded;
        nextLevel += 1;
      }

      const nextWins = (profileData.wins || 0) + (status === "won" ? 1 : 0);
      const nextLosses = (profileData.losses || 0) + (status === "lost" ? 1 : 0);

      // Check Achievement Milestones
      const currentBadges = [...(profileData.badges || [])];
      
      if (nextWins >= 1 && !currentBadges.includes("First Win")) {
        currentBadges.push("First Win");
        earnedBadges.push("First Win");
      }
      if (nextWins >= 10 && !currentBadges.includes("Decathlon Winner")) {
        currentBadges.push("Decathlon Winner");
        earnedBadges.push("Decathlon Winner");
      }
      if (nextWins >= 100 && !currentBadges.includes("Centurion Elite")) {
        currentBadges.push("Centurion Elite");
        earnedBadges.push("Centurion Elite");
      }
      if (nextLevel >= 5 && !currentBadges.includes("Rising Star")) {
        currentBadges.push("Rising Star");
        earnedBadges.push("Rising Star");
      }
      if (nextLevel >= 15 && !currentBadges.includes("Grandmaster Gamer")) {
        currentBadges.push("Grandmaster Gamer");
        earnedBadges.push("Grandmaster Gamer");
      }
      if (gameId === "music_quiz" && status === "won" && !currentBadges.includes("Music Master")) {
        currentBadges.push("Music Master");
        earnedBadges.push("Music Master");
      }
      if (gameId === "trivia" && status === "won" && !currentBadges.includes("Trivia Genius")) {
        currentBadges.push("Trivia Genius");
        earnedBadges.push("Trivia Genius");
      }

      transaction.update(profileRef, {
        xp: nextXp,
        level: nextLevel,
        wins: nextWins,
        losses: nextLosses,
        badges: currentBadges,
        updatedAt: new Date().toISOString()
      });

      finalXp = nextXp;
      finalLevel = nextLevel;

      return { success: true };
    });

    // Record high score logs or triggers if new badge earned
    if (earnedBadges.length > 0) {
      for (const badge of earnedBadges) {
        await addDoc(collection(db, "notifications"), {
          userId,
          receiverId: userId,
          title: "🏆 Badge Unlocked!",
          message: `Congratulations! You have unlocked the "${badge}" Achievement Badge in the Games Center!`,
          type: "achievement_badge",
          createdAt: new Date().toISOString(),
          read: false
        });
      }
    }

    return { success: true, newXp: finalXp, newLevel: finalLevel, earnedBadges };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `game_profiles/${userId}`);
    throw error;
  }
}

/**
 * 5. Handle Daily Streak Claiming
 */
export async function claimDailyLogin(userId: string): Promise<{ success: boolean; coinsGranted: number; nextClaimAvailable: string }> {
  const rewardQuery = query(
    collection(db, "game_rewards"),
    where("userId", "==", userId),
    where("type", "==", "daily_login")
  );

  try {
    const snaps = await getDocs(rewardQuery);
    let lastClaimed: Date | null = null;
    let streakCount = 0;

    snaps.forEach((doc) => {
      const data = doc.data();
      if (data.claimedAt) {
        const claimTime = new Date(data.claimedAt);
        if (!lastClaimed || claimTime > lastClaimed) {
          lastClaimed = claimTime;
        }
      }
    });

    const now = new Date();
    if (lastClaimed) {
      const diffMs = now.getTime() - lastClaimed.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      if (diffHours < 24) {
        const remainingMs = (24 * 60 * 60 * 1000) - diffMs;
        const hoursLeft = Math.floor(remainingMs / (1000 * 60 * 60));
        const minsLeft = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        throw new Error(`Daily Reward already claimed. Next claim available in ${hoursLeft}h ${minsLeft}m.`);
      }
      
      // If claimed within 48 hours, keep streak. Otherwise reset
      if (diffHours < 48) {
        streakCount = (snaps.size % 7) + 1;
      } else {
        streakCount = 1;
      }
    } else {
      streakCount = 1;
    }

    // Daily prize scaling (e.g. Day 1: 10, Day 2: 15, ..., Day 7: 100)
    const coinsReward = streakCount === 7 ? 100 : 10 + (streakCount - 1) * 10;

    const rewardId = `reward_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    await setDoc(doc(db, "game_rewards", rewardId), {
      id: rewardId,
      userId,
      type: "daily_login",
      rewardName: `Daily Streak Day ${streakCount}`,
      coins: coinsReward,
      claimed: true,
      claimedAt: now.toISOString(),
      createdAt: now.toISOString()
    });

    // Credit coins
    await creditCoinsFromGame(userId, coinsReward, `Daily login streak Day ${streakCount}`, "daily_login");

    return {
      success: true,
      coinsGranted: coinsReward,
      nextClaimAvailable: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
    };
  } catch (error) {
    throw error;
  }
}

/**
 * 6. Social and Friends System
 */
export async function sendFriendRequest(userId: string, senderName: string, senderAvatar: string, friendId: string): Promise<boolean> {
  if (userId === friendId) throw new Error("You cannot add yourself.");

  const requestQuery = query(
    collection(db, "game_friends"),
    where("userId", "==", userId),
    where("friendId", "==", friendId)
  );

  const snaps = await getDocs(requestQuery);
  if (!snaps.empty) {
    throw new Error("Friend request already exists or you are already friends.");
  }

  const txnId1 = `friend_${userId}_${friendId}`;
  const txnId2 = `friend_${friendId}_${userId}`;

  await setDoc(doc(db, "game_friends", txnId1), {
    id: txnId1,
    userId,
    friendId,
    friendName: "Syncing...", // updated later
    friendAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80",
    status: "pending_sent",
    createdAt: new Date().toISOString()
  });

  await setDoc(doc(db, "game_friends", txnId2), {
    id: txnId2,
    userId: friendId,
    friendId: userId,
    friendName: senderName,
    friendAvatar: senderAvatar,
    status: "pending_received",
    createdAt: new Date().toISOString()
  });

  // Notify friend
  await addDoc(collection(db, "notifications"), {
    userId: friendId,
    receiverId: friendId,
    title: "🎮 Game Friend Request",
    message: `${senderName} invited you to be game friends! Let's challenge each other!`,
    type: "friend_request",
    createdAt: new Date().toISOString(),
    read: false
  });

  return true;
}

export async function acceptFriendRequest(userId: string, friendId: string): Promise<boolean> {
  const txnId1 = `friend_${userId}_${friendId}`;
  const txnId2 = `friend_${friendId}_${userId}`;

  await updateDoc(doc(db, "game_friends", txnId1), {
    status: "friends"
  });

  await updateDoc(doc(db, "game_friends", txnId2), {
    status: "friends"
  });

  return true;
}

export async function sendCoinGiftToFriend(
  userId: string, 
  senderName: string, 
  friendId: string, 
  friendName: string, 
  amount: number
): Promise<boolean> {
  if (amount <= 0) throw new Error("Choose a positive coin value.");
  
  // Deduct coins from sender
  await deductCoinsForGame(userId, amount, `Gift sent to ${friendName}`, "friend_gift");
  
  // Credit coins to friend
  await creditCoinsFromGame(friendId, amount, `Gift received from ${senderName}`, "friend_gift");

  // Record a notification
  await addDoc(collection(db, "notifications"), {
    userId: friendId,
    receiverId: friendId,
    title: "🎁 Gift Received!",
    message: `${senderName} gifted you ${amount} SoundStream Coins!`,
    type: "friend_gift",
    createdAt: new Date().toISOString(),
    read: false
  });

  return true;
}

/**
 * 7. Realtime Multiplayer Room operations
 */
export async function createGameRoom(
  hostId: string,
  hostName: string,
  hostAvatar: string,
  gameId: string,
  gameName: string,
  roomName: string,
  entryFee: number,
  maxPlayers: number = 2
): Promise<string> {
  
  // Charge entry fee to host
  if (entryFee > 0) {
    await deductCoinsForGame(hostId, entryFee, `Room Entry: ${roomName}`, gameId);
  }

  const roomId = `room_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const hostPlayer: PlayerState = {
    id: hostId,
    username: hostName,
    avatar: hostAvatar,
    score: 0,
    status: "ready",
    joinedAt: new Date().toISOString()
  };

  const room: GameRoom = {
    id: roomId,
    gameId,
    gameName,
    roomName: roomName || `${hostName}'s Arena`,
    hostId,
    hostName,
    hostAvatar,
    status: "waiting",
    players: [hostPlayer],
    spectators: [],
    maxPlayers,
    entryFee,
    prizePool: Math.floor(entryFee * maxPlayers * 0.9), // 10% host fee/house edge
    chat: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await setDoc(doc(db, "game_rooms", roomId), room);
  return roomId;
}

export async function joinGameRoom(
  roomId: string,
  playerId: string,
  playerName: string,
  playerAvatar: string
): Promise<boolean> {
  const roomRef = doc(db, "game_rooms", roomId);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) throw new Error("Game room does not exist.");

  const room = snap.data() as GameRoom;
  if (room.status !== "waiting") throw new Error("Game already in progress.");
  if (room.players.length >= room.maxPlayers) throw new Error("Room is completely full.");
  if (room.players.some(p => p.id === playerId)) return true; // already in room

  // Charge Entry Fee
  if (room.entryFee > 0) {
    await deductCoinsForGame(playerId, room.entryFee, `Room Entry: ${room.roomName}`, room.gameId);
  }

  const newPlayer: PlayerState = {
    id: playerId,
    username: playerName,
    avatar: playerAvatar,
    score: 0,
    status: "ready",
    joinedAt: new Date().toISOString()
  };

  await updateDoc(roomRef, {
    players: arrayUnion(newPlayer),
    updatedAt: new Date().toISOString()
  });

  return true;
}

export async function sendRoomChatMessage(
  roomId: string,
  senderId: string,
  senderName: string,
  senderAvatar: string,
  message: string
): Promise<boolean> {
  const roomRef = doc(db, "game_rooms", roomId);
  const msg: ChatMessage = {
    id: `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    senderId,
    senderName,
    senderAvatar,
    message,
    timestamp: new Date().toISOString()
  };

  await updateDoc(roomRef, {
    chat: arrayUnion(msg),
    updatedAt: new Date().toISOString()
  });

  return true;
}
