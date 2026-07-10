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
  serverTimestamp,
  arrayUnion,
  increment
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { 
  Wallet, 
  CoinTransaction, 
  Gift, 
  GiftTransaction, 
  DiamondWallet, 
  Withdrawal, 
  CoinPackage,
  DEFAULT_GIFTS
} from "../types/coins";

/**
 * Fetch or initialize a user's Coin Wallet.
 */
export async function getOrCreateWallet(userId: string): Promise<Wallet> {
  const walletRef = doc(db, "wallets", userId);
  try {
    const snap = await getDoc(walletRef);
    if (snap.exists()) {
      return snap.data() as Wallet;
    } else {
      const initialWallet: Wallet = {
        userId,
        balance: 100, // Onboard with 100 complimentary SoundStream Coins for direct engagement!
        totalPurchased: 100,
        totalSpent: 0,
        totalReceived: 0,
        updatedAt: new Date().toISOString()
      };
      await setDoc(walletRef, initialWallet);
      return initialWallet;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `wallets/${userId}`);
    throw error;
  }
}

/**
 * Fetch or initialize a creator's Diamond Wallet.
 */
export async function getOrCreateDiamondWallet(creatorId: string): Promise<DiamondWallet> {
  const walletRef = doc(db, "diamond_wallets", creatorId);
  try {
    const snap = await getDoc(walletRef);
    if (snap.exists()) {
      return snap.data() as DiamondWallet;
    } else {
      const initialWallet: DiamondWallet = {
        creatorId,
        totalDiamonds: 0,
        estimatedEarnings: 0,
        withdrawableBalance: 0,
        totalWithdrawn: 0,
        updatedAt: new Date().toISOString()
      };
      await setDoc(walletRef, initialWallet);
      return initialWallet;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `diamond_wallets/${creatorId}`);
    throw error;
  }
}

/**
 * Handle virtual coin package purchase via Stripe payment.
 */
export async function purchaseCoins(
  userId: string, 
  pack: CoinPackage, 
  referenceId: string
): Promise<{ success: boolean; newBalance: number; transaction: CoinTransaction }> {
  throw new Error("Direct client-side coin purchases are strictly disabled for security. All coin purchases must be routed securely through the Stripe Checkout gateway.");
}

/**
 * Core Gifting Logic: Transact Gifting dynamically between users during live streams.
 */
export async function sendGift(
  senderId: string,
  senderName: string,
  senderPhoto: string,
  receiverId: string,
  receiverName: string,
  streamId: string,
  gift: Gift
): Promise<{ success: boolean; coinsRemaining: number; diamondsEarned: number }> {
  const senderWalletRef = doc(db, "wallets", senderId);
  const receiverDiamondRef = doc(db, "diamond_wallets", receiverId);
  const transactionId = `gift_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const giftTxnRef = doc(db, "gift_transactions", transactionId);

  try {
    // Perform Gifting via an atomic Firestore Transaction to completely prevent Negative Balances and Duplicate Gifts
    const result = await runTransaction(db, async (transaction) => {
      // 1. Read sender wallet
      const senderWalletSnap = await transaction.get(senderWalletRef);
      if (!senderWalletSnap.exists()) {
        throw new Error("Sender wallet does not exist.");
      }
      const senderWallet = senderWalletSnap.data() as Wallet;

      // Ensure insufficient funds are guarded
      if (senderWallet.balance < gift.cost) {
        throw new Error(`Insufficient Coins. ${gift.name} costs ${gift.cost} Coins. Your balance is ${senderWallet.balance}.`);
      }

      // 2. Read receiver diamond wallet
      const receiverWalletSnap = await transaction.get(receiverDiamondRef);
      let receiverWallet: DiamondWallet;
      if (!receiverWalletSnap.exists()) {
        receiverWallet = {
          creatorId: receiverId,
          totalDiamonds: 0,
          estimatedEarnings: 0,
          withdrawableBalance: 0,
          totalWithdrawn: 0,
          updatedAt: new Date().toISOString()
        };
      } else {
        receiverWallet = receiverWalletSnap.data() as DiamondWallet;
      }

      // 3. Deduct sender Coins
      const nextSenderBalance = senderWallet.balance - gift.cost;
      const nextSenderTotalSpent = (senderWallet.totalSpent || 0) + gift.cost;

      // 4. Credit receiver Diamonds (100 Coins -> 70 Diamonds)
      const earnedDiamonds = Math.round(gift.cost * 0.7);
      const nextReceiverTotalDiamonds = (receiverWallet.totalDiamonds || 0) + earnedDiamonds;
      const nextReceiverEstimatedEarnings = Number(((receiverWallet.estimatedEarnings || 0) + (earnedDiamonds * 0.01)).toFixed(2));
      const nextReceiverWithdrawableBalance = Number(((receiverWallet.withdrawableBalance || 0) + (earnedDiamonds * 0.01)).toFixed(2));

      // 5. Update databases
      transaction.update(senderWalletRef, {
        balance: nextSenderBalance,
        totalSpent: nextSenderTotalSpent,
        updatedAt: new Date().toISOString()
      });

      if (!receiverWalletSnap.exists()) {
        transaction.set(receiverDiamondRef, {
          creatorId: receiverId,
          totalDiamonds: nextReceiverTotalDiamonds,
          estimatedEarnings: nextReceiverEstimatedEarnings,
          withdrawableBalance: nextReceiverWithdrawableBalance,
          totalWithdrawn: 0,
          updatedAt: new Date().toISOString()
        });
      } else {
        transaction.update(receiverDiamondRef, {
          totalDiamonds: nextReceiverTotalDiamonds,
          estimatedEarnings: nextReceiverEstimatedEarnings,
          withdrawableBalance: nextReceiverWithdrawableBalance,
          updatedAt: new Date().toISOString()
        });
      }

      // 6. Record the transaction
      const giftRecord: GiftTransaction = {
        id: transactionId,
        senderId,
        senderName,
        senderPhoto,
        receiverId,
        receiverName,
        streamId,
        giftId: gift.id,
        giftName: gift.name,
        giftCost: gift.cost,
        diamondsEarned: earnedDiamonds,
        createdAt: new Date().toISOString()
      };
      transaction.set(giftTxnRef, giftRecord);

      return { 
        coinsRemaining: nextSenderBalance, 
        diamondsEarned: earnedDiamonds 
      };
    });

    // 7. Update User's Gift Inventories and Leaderboards asynchronously or best-effort
    try {
      const inventoryId = `${senderId}_${gift.id}`;
      const inventoryRef = doc(db, "gift_inventory", inventoryId);
      const invSnap = await getDoc(inventoryRef);
      if (invSnap.exists()) {
        await updateDoc(inventoryRef, {
          count: increment(1),
          updatedAt: new Date().toISOString()
        });
      } else {
        await setDoc(inventoryRef, {
          userId: senderId,
          giftId: gift.id,
          giftName: gift.name,
          count: 1,
          updatedAt: new Date().toISOString()
        });
      }

      // Also increment liveStream gift metrics
      if (streamId && streamId !== "lobby" && streamId !== "short") {
        const streamRef = doc(db, "liveStreams", streamId);
        await updateDoc(streamRef, {
          virtualGiftsCount: increment(1),
          tipsAmount: increment(Number((gift.cost * 0.01).toFixed(2)))
        });
      }

      // Trigger creator notification
      await addDoc(collection(db, "notifications"), {
        userId: receiverId,
        receiverId,
        title: "🎁 Gift Received!",
        message: `${senderName} sent you a ${gift.name}! You earned +${result.diamondsEarned} Diamonds.`,
        type: "gift_received",
        createdAt: new Date().toISOString(),
        read: false
      });

      // Update leaderboards dynamically
      await updateLeaderboards(senderId, senderName, senderPhoto, receiverId, receiverName, gift.cost, result.diamondsEarned);

    } catch (e) {
      console.warn("Leaderboard/inventory update minor error:", e);
    }

    return { success: true, coinsRemaining: result.coinsRemaining, diamondsEarned: result.diamondsEarned };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `gift_transactions/${transactionId}`);
    throw error;
  }
}

/**
 * Handle cash-out / withdrawals requests from creators.
 */
export async function requestWithdrawal(
  creatorId: string,
  diamondsCount: number,
  paymentMethod: "PayPal" | "Stripe" | "Bank Transfer",
  paymentDetails: string
): Promise<{ success: boolean; withdrawal: Withdrawal }> {
  if (diamondsCount < 100) {
    throw new Error("The minimum cash-out is 100 Diamonds.");
  }

  const walletRef = doc(db, "diamond_wallets", creatorId);
  const withdrawalId = `wd_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const wdRef = doc(db, "withdrawals", withdrawalId);

  try {
    const dWallet = await getOrCreateDiamondWallet(creatorId);
    if (dWallet.totalDiamonds < diamondsCount) {
      throw new Error(`Insufficient Diamonds. You requested ${diamondsCount} Diamonds, but only have ${dWallet.totalDiamonds}.`);
    }

    const usdAmount = Number((diamondsCount * 0.01).toFixed(2));
    if (dWallet.withdrawableBalance < usdAmount) {
      throw new Error(`Insufficient withdrawable USD balance. Required: $${usdAmount}, Available: $${dWallet.withdrawableBalance}`);
    }

    // Update Diamond Wallet
    const updatedWallet: Partial<DiamondWallet> = {
      totalDiamonds: dWallet.totalDiamonds - diamondsCount,
      withdrawableBalance: Number((dWallet.withdrawableBalance - usdAmount).toFixed(2)),
      totalWithdrawn: Number((dWallet.totalWithdrawn + usdAmount).toFixed(2)),
      updatedAt: new Date().toISOString()
    };

    const withdrawalRecord: Withdrawal = {
      id: withdrawalId,
      creatorId,
      amount: usdAmount,
      diamondsExchanged: diamondsCount,
      paymentMethod,
      paymentDetails,
      status: "pending",
      requestedAt: new Date().toISOString()
    };

    await setDoc(wdRef, withdrawalRecord);
    await updateDoc(walletRef, updatedWallet);

    // Save payout transaction in general payouts collection too
    try {
      await addDoc(collection(db, "payouts"), {
        payoutId: withdrawalId,
        creatorId,
        amount: usdAmount,
        currency: "USD",
        status: "pending",
        provider: paymentMethod === "PayPal" ? "paypal" : paymentMethod === "Stripe" ? "stripe_connect" : "bank_transfer",
        requestedAt: new Date().toISOString()
      });
    } catch (e) {
      console.warn("Could not save to payouts collection:", e);
    }

    return { success: true, withdrawal: withdrawalRecord };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `withdrawals/${withdrawalId}`);
    throw error;
  }
}

/**
 * Realtime leaderboard update engine.
 */
async function updateLeaderboards(
  senderId: string,
  senderName: string,
  senderPhoto: string,
  receiverId: string,
  receiverName: string,
  coinsSpent: number,
  diamondsEarned: number
): Promise<void> {
  const periods: ("today" | "week" | "month" | "all")[] = ["today", "week", "month", "all"];
  
  for (const period of periods) {
    // 1. Update Gifters Leaderboard
    const gifterBoardId = `gifters_${period}`;
    const gBoardRef = doc(db, "leaderboards", gifterBoardId);
    try {
      const snap = await getDoc(gBoardRef);
      let rankings: any[] = [];
      if (snap.exists()) {
        rankings = snap.data().rankings || [];
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
      
      // Sort and limit to top 15
      rankings.sort((a, b) => b.value - a.value);
      rankings = rankings.slice(0, 15);
      
      await setDoc(gBoardRef, {
        id: gifterBoardId,
        period,
        type: "gifters",
        rankings,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.warn(`Gifter board update error for ${period}:`, e);
    }

    // 2. Update Creators Leaderboard
    const creatorBoardId = `creators_${period}`;
    const cBoardRef = doc(db, "leaderboards", creatorBoardId);
    try {
      const snap = await getDoc(cBoardRef);
      let rankings: any[] = [];
      if (snap.exists()) {
        rankings = snap.data().rankings || [];
      }
      
      const idx = rankings.findIndex(r => r.userId === receiverId);
      if (idx !== -1) {
        rankings[idx].value = (rankings[idx].value || 0) + diamondsEarned;
        rankings[idx].username = receiverName;
      } else {
        rankings.push({
          userId: receiverId,
          username: receiverName,
          value: diamondsEarned
        });
      }
      
      rankings.sort((a, b) => b.value - a.value);
      rankings = rankings.slice(0, 15);
      
      await setDoc(cBoardRef, {
        id: creatorBoardId,
        period,
        type: "creators",
        rankings,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.warn(`Creator board update error for ${period}:`, e);
    }
  }
}
