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
  increment
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { 
  LiveBattle, 
  BattleInvite, 
  BattleResult, 
  BattleHistoryEntry, 
  BattleLeaderboardRecord, 
  BattleLeaderboardEntry 
} from "../types/battle";
import { Gift } from "../types/coins";
import { sendGift } from "./coinsService";

/**
 * Creates a battle invitation to another creator.
 */
export async function createBattleInvite(
  senderId: string,
  senderName: string,
  senderPhoto: string,
  senderStreamId: string,
  receiverId: string,
  receiverName: string,
  receiverPhoto: string,
  receiverStreamId: string,
  durationSeconds: number = 300
): Promise<BattleInvite> {
  const inviteId = `invite_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const inviteRef = doc(db, "battle_invites", inviteId);

  const invite: BattleInvite = {
    id: inviteId,
    senderId,
    senderName,
    senderPhoto,
    senderStreamId,
    receiverId,
    receiverName,
    receiverPhoto,
    receiverStreamId,
    status: "pending",
    duration: durationSeconds,
    createdAt: new Date().toISOString()
  };

  try {
    await setDoc(inviteRef, invite);
    
    // Add real-time notification to the receiver
    await addDoc(collection(db, "notifications"), {
      userId: receiverId,
      receiverId,
      title: "⚔️ Live PK Battle Invite!",
      message: `${senderName} has challenged you to a live PK Battle! Accept now to face off!`,
      type: "battle_invite",
      createdAt: new Date().toISOString(),
      read: false,
      metadata: { inviteId }
    });

    return invite;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `battle_invites/${inviteId}`);
    throw error;
  }
}

/**
 * Declines a battle invite.
 */
export async function declineBattleInvite(inviteId: string): Promise<void> {
  const inviteRef = doc(db, "battle_invites", inviteId);
  try {
    await updateDoc(inviteRef, {
      status: "declined"
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `battle_invites/${inviteId}`);
    throw error;
  }
}

/**
 * Accepts a battle invite and provisions the active PK battle.
 */
export async function acceptBattleInvite(inviteId: string): Promise<LiveBattle> {
  const inviteRef = doc(db, "battle_invites", inviteId);
  const battleId = `battle_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const battleRef = doc(db, "live_battles", battleId);

  try {
    const inviteSnap = await getDoc(inviteRef);
    if (!inviteSnap.exists()) {
      throw new Error("Invitation not found.");
    }

    const invite = inviteSnap.data() as BattleInvite;
    if (invite.status !== "pending") {
      throw new Error("Invitation has already been processed.");
    }

    const startedAt = new Date().toISOString();
    const endsAt = new Date(Date.now() + invite.duration * 1000).toISOString();

    const battle: LiveBattle = {
      id: battleId,
      creator1Id: invite.senderId,
      creator1Name: invite.senderName,
      creator1Photo: invite.senderPhoto || "",
      creator1StreamId: invite.senderStreamId,
      creator2Id: invite.receiverId,
      creator2Name: invite.receiverName,
      creator2Photo: invite.receiverPhoto || "",
      creator2StreamId: invite.receiverStreamId,
      creator1Score: 0,
      creator2Score: 0,
      status: "active",
      duration: invite.duration,
      startedAt,
      endsAt,
      winnerId: null
    };

    // Use a transaction to accept invitation and create battle atomically
    await runTransaction(db, async (transaction) => {
      transaction.update(inviteRef, {
        status: "accepted",
        acceptedBattleId: battleId
      });
      transaction.set(battleRef, battle);
    });

    // Update both creators' live stream documents so viewers can sync with the battle
    if (invite.senderStreamId) {
      await updateDoc(doc(db, "liveStreams", invite.senderStreamId), {
        activeBattleId: battleId
      }).catch(err => console.warn("Failed to update sender stream battle reference:", err));
    }
    if (invite.receiverStreamId) {
      await updateDoc(doc(db, "liveStreams", invite.receiverStreamId), {
        activeBattleId: battleId
      }).catch(err => console.warn("Failed to update receiver stream battle reference:", err));
    }

    return battle;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `live_battles/${battleId}`);
    throw error;
  }
}

/**
 * Handles sending a gift during an active PK Battle.
 * Points are credited to the specific creator's score inside the battle.
 * Credits normal creator earnings too.
 */
export async function sendBattleGift(
  senderId: string,
  senderName: string,
  senderPhoto: string,
  receiverId: string,
  receiverName: string,
  streamId: string,
  gift: Gift,
  battleId: string
): Promise<{ success: boolean; coinsRemaining: number; diamondsEarned: number; newScore: number }> {
  try {
    // 1. Send the physical gift using existing transaction to handle coins & diamonds perfectly
    const giftResult = await sendGift(
      senderId,
      senderName,
      senderPhoto,
      receiverId,
      receiverName,
      streamId,
      gift
    );

    if (giftResult.success) {
      const battleRef = doc(db, "live_battles", battleId);
      const points = gift.cost; // 1 Coin = 1 Battle Point
      let finalScore = points;

      // 2. Safely increment the target creator's score inside the battle document
      const battleSnap = await getDoc(battleRef);
      if (battleSnap.exists()) {
        const battleData = battleSnap.data() as LiveBattle;
        if (battleData.status === "active") {
          const isCreator1 = receiverId === battleData.creator1Id;
          const scoreUpdate = isCreator1 
            ? { creator1Score: increment(points) } 
            : { creator2Score: increment(points) };
          
          await updateDoc(battleRef, scoreUpdate);
          
          finalScore = isCreator1 
            ? (battleData.creator1Score || 0) + points 
            : (battleData.creator2Score || 0) + points;

          // Track specific user's gift points for this battle inside battle_scores
          const scoreId = `${battleId}_${receiverId}`;
          const scoreRef = doc(db, "battle_scores", scoreId);
          const scoreSnap = await getDoc(scoreRef);
          if (scoreSnap.exists()) {
            await updateDoc(scoreRef, {
              totalScore: increment(points),
              giftCount: increment(1),
              updatedAt: new Date().toISOString()
            });
          } else {
            await setDoc(scoreRef, {
              id: scoreId,
              battleId,
              creatorId: receiverId,
              totalScore: points,
              giftCount: 1,
              updatedAt: new Date().toISOString()
            });
          }

          // 3. Increment Battle Gifters and Battle Fans and Battle Creators leaderboards
          await updateBattleLeaderboards(
            senderId, 
            senderName, 
            senderPhoto, 
            receiverId, 
            receiverName, 
            gift.cost, 
            points
          );

          // 4. Inject a beautiful battle notice in the live chat
          try {
            await addDoc(collection(db, "liveStreams", streamId, "chat"), {
              senderId: "system_battle",
              senderName: "🏆 Battle Notice",
              senderPhoto: "",
              message: `🔥 ${senderName} sent ${gift.name} and boosted ${receiverName}'s score by +${points}!`,
              createdAt: new Date().toISOString(),
              type: "system",
              isBattleGift: true,
              giftPoints: points,
              receiverName
            });
          } catch (chatError) {
            console.warn("Failed to inject battle gift notice in chat:", chatError);
          }
        }
      }

      return {
        ...giftResult,
        newScore: finalScore
      };
    } else {
      throw new Error("Gift purchase transaction failed.");
    }
  } catch (error) {
    console.error("sendBattleGift error:", error);
    throw error;
  }
}

/**
 * Concludes a live battle, determines the winner, saves logs, and updates statistics.
 */
export async function endBattle(battleId: string, endedByAdmin: boolean = false): Promise<BattleResult> {
  const battleRef = doc(db, "live_battles", battleId);
  const resultRef = doc(db, "battle_results", battleId);

  try {
    const snap = await getDoc(battleRef);
    if (!snap.exists()) {
      throw new Error("PK Battle record not found.");
    }

    const battle = snap.data() as LiveBattle;
    if (battle.status !== "active") {
      throw new Error("PK Battle is already ended.");
    }

    // Determine the outcome
    let winnerId: string | "draw" = "draw";
    let outcome1: "win" | "loss" | "draw" = "draw";
    let outcome2: "win" | "loss" | "draw" = "draw";

    if (battle.creator1Score > battle.creator2Score) {
      winnerId = battle.creator1Id;
      outcome1 = "win";
      outcome2 = "loss";
    } else if (battle.creator2Score > battle.creator1Score) {
      winnerId = battle.creator2Id;
      outcome1 = "loss";
      outcome2 = "win";
    }

    const endedAt = new Date().toISOString();
    const statusValue = endedByAdmin ? "ended_by_admin" : "finished";

    // Atomic update to battle document
    await updateDoc(battleRef, {
      status: statusValue,
      winnerId,
      endedAt
    });

    const result: BattleResult = {
      id: battleId,
      battleId,
      creator1Id: battle.creator1Id,
      creator1Score: battle.creator1Score,
      creator2Id: battle.creator2Id,
      creator2Score: battle.creator2Score,
      winnerId,
      endedAt
    };

    // Save archive record
    await setDoc(resultRef, result);

    // Save battle history participation logs for Creator Dashboard
    const diamondsEarned1 = Math.round(battle.creator1Score * 0.7);
    const diamondsEarned2 = Math.round(battle.creator2Score * 0.7);

    const historyId1 = `${battle.creator1Id}_${battleId}`;
    await setDoc(doc(db, "battle_history", historyId1), {
      id: historyId1,
      creatorId: battle.creator1Id,
      battleId,
      opponentId: battle.creator2Id,
      opponentName: battle.creator2Name,
      opponentPhoto: battle.creator2Photo || "",
      score: battle.creator1Score,
      opponentScore: battle.creator2Score,
      outcome: outcome1,
      earnings: diamondsEarned1,
      timestamp: endedAt
    } as BattleHistoryEntry);

    const historyId2 = `${battle.creator2Id}_${battleId}`;
    await setDoc(doc(db, "battle_history", historyId2), {
      id: historyId2,
      creatorId: battle.creator2Id,
      battleId,
      opponentId: battle.creator1Id,
      opponentName: battle.creator1Name,
      opponentPhoto: battle.creator1Photo || "",
      score: battle.creator2Score,
      opponentScore: battle.creator1Score,
      outcome: outcome2,
      earnings: diamondsEarned2,
      timestamp: endedAt
    } as BattleHistoryEntry);

    // Update Top Battle Winners leaderboard for the winner (increment win tally)
    if (winnerId !== "draw") {
      const winnerName = winnerId === battle.creator1Id ? battle.creator1Name : battle.creator2Name;
      const winnerPhoto = winnerId === battle.creator1Id ? battle.creator1Photo : battle.creator2Photo;
      await incrementWinnerLeaderboard(winnerId, winnerName, winnerPhoto || "");
    }

    // Unlink stream battle states
    if (battle.creator1StreamId) {
      await updateDoc(doc(db, "liveStreams", battle.creator1StreamId), {
        activeBattleId: null
      }).catch(() => {});
    }
    if (battle.creator2StreamId) {
      await updateDoc(doc(db, "liveStreams", battle.creator2StreamId), {
        activeBattleId: null
      }).catch(() => {});
    }

    return result;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `live_battles/${battleId}`);
    throw error;
  }
}

/**
 * Increment total win tally for creators in Battle Winners Leaderboards
 */
async function incrementWinnerLeaderboard(
  winnerId: string, 
  winnerName: string, 
  winnerPhoto: string
): Promise<void> {
  const periods: ("today" | "week" | "month" | "all")[] = ["today", "week", "month", "all"];
  
  for (const period of periods) {
    const boardId = `winners_${period}`;
    const boardRef = doc(db, "battle_leaderboards", boardId);
    try {
      const snap = await getDoc(boardRef);
      let rankings: BattleLeaderboardEntry[] = [];
      if (snap.exists()) {
        rankings = (snap.data().rankings || []) as BattleLeaderboardEntry[];
      }

      const idx = rankings.findIndex(r => r.userId === winnerId);
      if (idx !== -1) {
        rankings[idx].value = (rankings[idx].value || 0) + 1;
        rankings[idx].username = winnerName;
        rankings[idx].photoURL = winnerPhoto;
      } else {
        rankings.push({
          userId: winnerId,
          username: winnerName,
          photoURL: winnerPhoto,
          value: 1
        });
      }

      rankings.sort((a, b) => b.value - a.value);
      rankings = rankings.slice(0, 15);

      await setDoc(boardRef, {
        id: boardId,
        type: "winners",
        period,
        rankings,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.warn("Winner leaderboard increment error:", e);
    }
  }
}

/**
 * Dynamic real-time updates of Battle-specific leaderboards:
 * Top Battle Gifters, Fans, Creators (points accumulation).
 */
async function updateBattleLeaderboards(
  senderId: string,
  senderName: string,
  senderPhoto: string,
  receiverId: string,
  receiverName: string,
  coinsSpent: number,
  pointsScored: number
): Promise<void> {
  const periods: ("today" | "week" | "month" | "all")[] = ["today", "week", "month", "all"];
  
  for (const period of periods) {
    // 1. Top Battle Gifters
    const gifterBoardId = `gifters_${period}`;
    const gRef = doc(db, "battle_leaderboards", gifterBoardId);
    try {
      const boardSnap = await getDoc(gRef);
      let rankings: BattleLeaderboardEntry[] = [];
      if (boardSnap.exists()) {
        rankings = (boardSnap.data().rankings || []) as BattleLeaderboardEntry[];
      }

      const idx = rankings.findIndex(r => r.userId === senderId);
      if (idx !== -1) {
        rankings[idx].value = (rankings[idx].value || 0) + coinsSpent;
        rankings[idx].username = senderName;
        rankings[idx].photoURL = senderPhoto;
      } else {
        rankings.push({
          userId: senderId,
          username: senderName,
          photoURL: senderPhoto,
          value: coinsSpent
        });
      }

      rankings.sort((a, b) => b.value - a.value);
      rankings = rankings.slice(0, 15);

      await setDoc(gRef, {
        id: gifterBoardId,
        type: "gifters",
        period,
        rankings,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.warn("Battle Gifters board error:", e);
    }

    // 2. Top Battle Fans (Supporting battle ecosystem with gifts)
    const fanBoardId = `fans_${period}`;
    const fRef = doc(db, "battle_leaderboards", fanBoardId);
    try {
      const boardSnap = await getDoc(fRef);
      let rankings: BattleLeaderboardEntry[] = [];
      if (boardSnap.exists()) {
        rankings = (boardSnap.data().rankings || []) as BattleLeaderboardEntry[];
      }

      const idx = rankings.findIndex(r => r.userId === senderId);
      if (idx !== -1) {
        rankings[idx].value = (rankings[idx].value || 0) + coinsSpent;
        rankings[idx].username = senderName;
        rankings[idx].photoURL = senderPhoto;
      } else {
        rankings.push({
          userId: senderId,
          username: senderName,
          photoURL: senderPhoto,
          value: coinsSpent
        });
      }

      rankings.sort((a, b) => b.value - a.value);
      rankings = rankings.slice(0, 15);

      await setDoc(fRef, {
        id: fanBoardId,
        type: "fans",
        period,
        rankings,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.warn("Battle Fans board error:", e);
    }

    // 3. Top Battle Creators (Total points scored during battles)
    const creatorBoardId = `creators_${period}`;
    const cRef = doc(db, "battle_leaderboards", creatorBoardId);
    try {
      const boardSnap = await getDoc(cRef);
      let rankings: BattleLeaderboardEntry[] = [];
      if (boardSnap.exists()) {
        rankings = (boardSnap.data().rankings || []) as BattleLeaderboardEntry[];
      }

      const idx = rankings.findIndex(r => r.userId === receiverId);
      if (idx !== -1) {
        rankings[idx].value = (rankings[idx].value || 0) + pointsScored;
        rankings[idx].username = receiverName;
      } else {
        rankings.push({
          userId: receiverId,
          username: receiverName,
          value: pointsScored
        });
      }

      rankings.sort((a, b) => b.value - a.value);
      rankings = rankings.slice(0, 15);

      await setDoc(cRef, {
        id: creatorBoardId,
        type: "creators",
        period,
        rankings,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.warn("Battle Creators board error:", e);
    }
  }
}
