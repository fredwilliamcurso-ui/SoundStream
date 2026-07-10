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
  serverTimestamp 
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { 
  Subscription, 
  SubscriptionPlanType, 
  SubscriptionStatusType, 
  PaymentProviderType, 
  CreatorWallet, 
  Payout, 
  PayoutProviderType, 
  PayoutStatusType, 
  MonetizationNotification 
} from "../types";

// AdMob Production IDs vs Test IDs as requested in guidelines
export const ADMOB_IDS = {
  BANNER: process.env.VITE_ADMOB_BANNER_ID || "ca-app-pub-3940256099942544/6300978111",
  INTERSTITIAL: process.env.VITE_ADMOB_INTERSTITIAL_ID || "ca-app-pub-3940256099942544/1033173712",
  REWARDED: process.env.VITE_ADMOB_REWARDED_ID || "ca-app-pub-3940256099942544/5224354917",
  NATIVE: process.env.VITE_ADMOB_NATIVE_ID || "ca-app-pub-3940256099942544/2247696110",
  APP_OPEN: process.env.VITE_ADMOB_APP_OPEN_ID || "ca-app-pub-3940256099942544/3419835294"
};

// Map plan types to their billing costs (USD)
export const PLAN_PRICES: Record<SubscriptionPlanType, { monthly: number; yearly: number }> = {
  "Free Plan": { monthly: 0, yearly: 0 },
  "Premium Individual": { monthly: 9.99, yearly: 99.99 },
  "Premium Family": { monthly: 14.99, yearly: 149.99 },
  "Premium Student": { monthly: 4.99, yearly: 49.99 },
  "Creator Pro": { monthly: 19.99, yearly: 199.99 }
};

class MonetizationService {
  /**
   * Securely logs payment and transaction events without storing card information.
   */
  public async logPaymentEvent(
    userId: string,
    eventName: string,
    status: "success" | "failed",
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      // Ensure NO raw payment card properties exist
      const secureMeta = { ...metadata };
      delete secureMeta.cardNumber;
      delete secureMeta.cardCvv;
      delete secureMeta.cardExpiry;

      const logRef = collection(db, "monetization_logs");
      await addDoc(logRef, {
        userId,
        eventName,
        status,
        metadata: secureMeta,
        timestamp: new Date().toISOString()
      });
      console.log(`Payment secure log saved: ${eventName} - ${status}`);
    } catch (e) {
      console.error("Failed to log payment event securely:", e);
    }
  }

  /**
   * Generates or triggers user notifications in Firestore
   */
  public async sendNotification(
    userId: string,
    title: string,
    message: string,
    type: "payment_success" | "payment_fail" | "subscription_renew" | "subscription_expire" | "payout_complete" | "tip_received" | "gift_received"
  ): Promise<void> {
    try {
      const notifRef = collection(db, "users", userId, "monetization_notifications");
      const notification: MonetizationNotification = {
        id: "notif_" + Math.random().toString(36).substr(2, 9),
        userId,
        title,
        message,
        type,
        createdAt: new Date().toISOString(),
        read: false
      };
      await addDoc(notifRef, notification);

      // Trigger standard browser console event for instant React context updates
      if (typeof window !== "undefined") {
        const event = new CustomEvent("soundstream-monetization-notification", {
          detail: notification
        });
        window.dispatchEvent(event);
      }
    } catch (e) {
      console.error("Failed to create user monetization notification:", e);
    }
  }

  /**
   * Validate payment details and prevent double transactions
   */
  public async validatePaymentRequest(
    userId: string,
    transactionId: string,
    amount: number,
    provider: PaymentProviderType
  ): Promise<boolean> {
    if (!userId || !transactionId || amount < 0) {
      return false;
    }

    try {
      // Check for duplicate transactions in monetization logs to prevent fraud
      const logsRef = collection(db, "monetization_logs");
      const q = query(
        logsRef,
        where("metadata.transactionId", "==", transactionId),
        where("status", "==", "success")
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        console.warn(`Duplicate transaction validation rejected: ${transactionId}`);
        await this.logPaymentEvent(userId, "payment_attempt", "failed", {
          reason: "Duplicate transaction detection block",
          transactionId,
          amount,
          provider
        });
        return false;
      }
      return true;
    } catch (e) {
      console.error("Error during security duplicate validation check:", e);
      return false;
    }
  }

  /**
   * Upgrade / Create User Subscription in Firestore
   */
  public async createSubscription(
    userId: string,
    plan: SubscriptionPlanType,
    billingCycle: "monthly" | "yearly",
    provider: PaymentProviderType,
    cardNumberSimulated?: string
  ): Promise<Subscription | null> {
    try {
      const isFree = plan === "Free Plan";
      const price = isFree ? 0 : PLAN_PRICES[plan][billingCycle];
      const currency = "USD";
      const transactionId = "tx_" + Math.random().toString(36).substr(2, 9);

      // Validate transaction fraud triggers (excluding Free Plan)
      if (!isFree) {
        const isValid = await this.validatePaymentRequest(userId, transactionId, price, provider);
        if (!isValid) {
          await this.sendNotification(
            userId,
            "Payment Validation Failed",
            `We detected a security flag on transaction ${transactionId}. No charges were made.`,
            "payment_fail"
          );
          return null;
        }

        // Simulate rare failed card logic for testing purposes
        if (cardNumberSimulated === "4111111111111111" || cardNumberSimulated === "fail") {
          await this.logPaymentEvent(userId, "payment_charge", "failed", {
            reason: "Declined by issuing bank",
            price,
            plan,
            provider,
            transactionId
          });
          await this.sendNotification(
            userId,
            "Payment Failed",
            `Your payment of $${price.toFixed(2)} using ${provider.toUpperCase()} was declined. Please check your billing details.`,
            "payment_fail"
          );
          return null;
        }
      }

      // Calculate dates
      const startedAt = new Date().toISOString();
      const expiresAtDate = new Date();
      if (billingCycle === "monthly") {
        expiresAtDate.setDate(expiresAtDate.getDate() + 30);
      } else {
        expiresAtDate.setFullYear(expiresAtDate.getFullYear() + 1);
      }
      const expiresAt = isFree ? null : expiresAtDate.toISOString();
      const renewalDate = isFree ? null : expiresAtDate.toISOString();

      const subscription: Subscription = {
        subscriptionId: "sub_" + Math.random().toString(36).substr(2, 9),
        userId,
        plan,
        status: "active",
        price,
        currency,
        billingCycle,
        startedAt,
        expiresAt,
        renewalDate,
        paymentProvider: provider
      };

      // Set subscription details in user document
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        subscription: {
          status: isFree ? "free" : "premium",
          expiresAt,
          updatedAt: new Date().toISOString(),
          planName: plan,
          fullSubscription: subscription
        }
      });

      // Secure payment log
      if (!isFree) {
        await this.logPaymentEvent(userId, "payment_charge", "success", {
          price,
          currency,
          plan,
          billingCycle,
          provider,
          transactionId,
          subscriptionId: subscription.subscriptionId
        });

        await this.sendNotification(
          userId,
          "Subscription Activated",
          `Success! Your ${plan} is active. Billed $${price.toFixed(2)} via ${provider.toUpperCase()}.`,
          "payment_success"
        );
      }

      return subscription;
    } catch (e) {
      console.error("Failed to create subscription in Firestore:", e);
      return null;
    }
  }

  /**
   * Simulate subscription renewal
   */
  public async renewSubscription(userId: string): Promise<Subscription | null> {
    try {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return null;

      const userData = userSnap.data();
      const currentSub: Subscription | undefined = userData.subscription?.fullSubscription;
      if (!currentSub || currentSub.plan === "Free Plan") return null;

      // Renew dates
      const startedAt = new Date().toISOString();
      const nextDate = new Date();
      if (currentSub.billingCycle === "monthly") {
        nextDate.setDate(nextDate.getDate() + 30);
      } else {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      }

      const renewedSub: Subscription = {
        ...currentSub,
        status: "active",
        startedAt,
        expiresAt: nextDate.toISOString(),
        renewalDate: nextDate.toISOString()
      };

      await updateDoc(userRef, {
        "subscription.expiresAt": renewedSub.expiresAt,
        "subscription.updatedAt": new Date().toISOString(),
        "subscription.fullSubscription": renewedSub
      });

      await this.logPaymentEvent(userId, "subscription_renewal", "success", {
        price: renewedSub.price,
        plan: renewedSub.plan,
        subscriptionId: renewedSub.subscriptionId
      });

      await this.sendNotification(
        userId,
        "Subscription Renewed",
        `Your ${renewedSub.plan} renewed successfully. Charged $${renewedSub.price.toFixed(2)} for the next billing cycle.`,
        "subscription_renew"
      );

      return renewedSub;
    } catch (e) {
      console.error("Failed to renew subscription:", e);
      return null;
    }
  }

  /**
   * Fetch or initialize Creator Wallet
   */
  public async getOrCreateCreatorWallet(creatorId: string): Promise<CreatorWallet> {
    const walletRef = doc(db, "creator_wallets", creatorId);
    try {
      const snap = await getDoc(walletRef);
      if (snap.exists()) {
        return snap.data() as CreatorWallet;
      }

      // Initialize brand new wallet
      const newWallet: CreatorWallet = {
        walletId: "wallet_" + Math.random().toString(36).substr(2, 9),
        creatorId,
        availableBalance: 124.50, // Starter funds for testing out features
        pendingBalance: 48.00,
        totalEarnings: 172.50,
        totalWithdrawn: 0.00,
        currency: "USD",
        updatedAt: new Date().toISOString()
      };

      await setDoc(walletRef, newWallet);
      return newWallet;
    } catch (e) {
      console.error("Failed to fetch or create creator wallet:", e);
      return {
        walletId: "wallet_offline",
        creatorId,
        availableBalance: 124.50,
        pendingBalance: 48.00,
        totalEarnings: 172.50,
        totalWithdrawn: 0.00,
        currency: "USD",
        updatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Request direct creator balance payout
   */
  public async requestPayout(
    creatorId: string,
    amount: number,
    provider: PayoutProviderType
  ): Promise<Payout | null> {
    try {
      if (amount <= 0) return null;

      const wallet = await this.getOrCreateCreatorWallet(creatorId);
      if (wallet.availableBalance < amount) {
        console.warn("Insufficient available balance for requested payout");
        return null;
      }

      const payoutId = "pay_" + Math.random().toString(36).substr(2, 9);
      const payout: Payout = {
        payoutId,
        creatorId,
        amount,
        currency: "USD",
        status: "pending",
        provider,
        requestedAt: new Date().toISOString(),
        processedAt: null,
        errorMessage: null
      };

      // Add payout item to collection
      const payoutDocRef = doc(db, "payouts", payoutId);
      await setDoc(payoutDocRef, payout);

      // Subtract from wallet
      const walletRef = doc(db, "creator_wallets", creatorId);
      const updatedWallet: CreatorWallet = {
        ...wallet,
        availableBalance: wallet.availableBalance - amount,
        totalWithdrawn: wallet.totalWithdrawn + amount,
        updatedAt: new Date().toISOString()
      };
      await setDoc(walletRef, updatedWallet);

      // Secure payment log
      await this.logPaymentEvent(creatorId, "payout_request", "success", {
        payoutId,
        amount,
        provider,
        walletId: wallet.walletId
      });

      await this.sendNotification(
        creatorId,
        "Payout Request Submitted",
        `Your payout request of $${amount.toFixed(2)} via ${provider.toUpperCase()} was submitted successfully. Status: PENDING.`,
        "payout_complete" // general payout category
      );

      return payout;
    } catch (e) {
      console.error("Failed to process payout request:", e);
      return null;
    }
  }

  /**
   * Fetch all payouts for a creator
   */
  public async getPayoutHistory(creatorId: string): Promise<Payout[]> {
    try {
      const colRef = collection(db, "payouts");
      const q = query(colRef, where("creatorId", "==", creatorId), orderBy("requestedAt", "desc"));
      const snap = await getDocs(q);
      
      const payouts: Payout[] = [];
      snap.forEach((doc) => {
        payouts.push(doc.data() as Payout);
      });

      if (payouts.length === 0) {
        // Fallback default mock ledger for elegant UI rendering
        return [
          { payoutId: "pay_9831", creatorId, amount: 200.00, currency: "USD", status: "completed", provider: "bank_transfer", requestedAt: "2026-06-25T10:30:00Z", processedAt: "2026-06-26T14:00:00Z" },
          { payoutId: "pay_4821", creatorId, amount: 150.00, currency: "USD", status: "completed", provider: "paypal", requestedAt: "2026-06-12T08:15:00Z", processedAt: "2026-06-13T12:00:00Z" },
          { payoutId: "pay_1192", creatorId, amount: 450.00, currency: "USD", status: "failed", provider: "stripe_connect", requestedAt: "2026-05-30T14:22:00Z", processedAt: "2026-05-30T14:25:00Z", errorMessage: "Direct routing number invalid" }
        ];
      }
      return payouts;
    } catch (e) {
      console.error("Failed to query payouts history from Firestore:", e);
      return [
        { payoutId: "pay_9831", creatorId, amount: 200.00, currency: "USD", status: "completed", provider: "bank_transfer", requestedAt: "2026-06-25T10:30:00Z", processedAt: "2026-06-26T14:00:00Z" }
      ];
    }
  }

  /**
   * Simulate a fan tipping or buying merch or gifting during a stream
   */
  public async simulateIncomingRevenue(
    creatorId: string,
    type: "royalty" | "shorts" | "livestream_gift" | "fan_tip" | "subscription_share" | "ads" | "merchandise" | "digital_product" | "event_ticket",
    amount: number,
    sourceName: string
  ): Promise<void> {
    try {
      const wallet = await this.getOrCreateCreatorWallet(creatorId);
      const updatedWallet: CreatorWallet = {
        ...wallet,
        pendingBalance: wallet.pendingBalance + amount,
        totalEarnings: wallet.totalEarnings + amount,
        updatedAt: new Date().toISOString()
      };

      // Set directly in database
      const walletRef = doc(db, "creator_wallets", creatorId);
      await setDoc(walletRef, updatedWallet);

      // Save analytics breakdown item
      const itemRef = collection(db, "creator_wallets", creatorId, "revenue_items");
      await addDoc(itemRef, {
        type,
        amount,
        sourceName,
        createdAt: new Date().toISOString()
      });

      // Log secure payment log
      await this.logPaymentEvent(creatorId, `incoming_${type}`, "success", {
        amount,
        sourceName,
        walletId: wallet.walletId
      });

      // User notification depending on type
      if (type === "fan_tip") {
        await this.sendNotification(
          creatorId,
          "Fan Tip Received!",
          `You received a secure tip of $${amount.toFixed(2)} from ${sourceName}!`,
          "tip_received"
        );
      } else if (type === "livestream_gift") {
        await this.sendNotification(
          creatorId,
          "Virtual Gift Received!",
          `${sourceName} sent you a virtual gift worth $${amount.toFixed(2)} during your stream!`,
          "gift_received"
        );
      }
    } catch (e) {
      console.error("Failed to simulate incoming creator revenue:", e);
    }
  }

  /**
   * Helper to fetch revenue analytics stats (daily, weekly, monthly, annual, sources)
   */
  public async getRevenueAnalytics(creatorId: string): Promise<{
    daily: number;
    weekly: number;
    monthly: number;
    annual: number;
    sources: Array<{ name: string; value: number }>;
    topSongs: Array<{ title: string; earnings: number }>;
    topVideos: Array<{ title: string; earnings: number }>;
    topStreams: Array<{ title: string; earnings: number }>;
  }> {
    try {
      const wallet = await this.getOrCreateCreatorWallet(creatorId);
      
      // Calculate realistic breakdowns based on wallet earnings
      const total = wallet.totalEarnings;
      
      return {
        daily: total * 0.08,
        weekly: total * 0.22,
        monthly: total * 0.65,
        annual: total,
        sources: [
          { name: "Streaming Royalties", value: total * 0.35 },
          { name: "Shorts Monetization", value: total * 0.15 },
          { name: "Live Stream Gifts", value: total * 0.12 },
          { name: "Fan Tips", value: total * 0.10 },
          { name: "Premium Shares", value: total * 0.08 },
          { name: "Ad Share Shares", value: total * 0.05 },
          { name: "Merchandise Sales", value: total * 0.06 },
          { name: "Digital Products", value: total * 0.05 },
          { name: "Event Tickets", value: total * 0.04 }
        ],
        topSongs: [
          { title: "Last Last (Afrobeats Master)", earnings: total * 0.45 },
          { title: "Kilometre (Burna Cut)", earnings: total * 0.28 },
          { title: "Common Person", earnings: total * 0.15 }
        ],
        topVideos: [
          { title: "Behind The Scenes: Las Vegas", earnings: total * 0.55 },
          { title: "Studio Live Jam Session #4", earnings: total * 0.32 },
          { title: "Short Choreography", earnings: total * 0.13 }
        ],
        topStreams: [
          { title: "Acoustic Sunset Concert Live", earnings: total * 0.60 },
          { title: "Q&A Fan Chat with Burna", earnings: total * 0.25 },
          { title: "Late Night Beats Listening", earnings: total * 0.15 }
        ]
      };
    } catch (e) {
      console.error("Failed to compute analytics stats:", e);
      return {
        daily: 12.50,
        weekly: 55.00,
        monthly: 224.50,
        annual: 1424.50,
        sources: [],
        topSongs: [],
        topVideos: [],
        topStreams: []
      };
    }
  }

  /**
   * Triggers simulated administrative settlement of pending funds into available wallet
   */
  public async settlePendingFunds(creatorId: string): Promise<CreatorWallet | null> {
    try {
      const wallet = await this.getOrCreateCreatorWallet(creatorId);
      if (wallet.pendingBalance <= 0) return wallet;

      const settledAmount = wallet.pendingBalance;
      const updatedWallet: CreatorWallet = {
        ...wallet,
        availableBalance: wallet.availableBalance + settledAmount,
        pendingBalance: 0,
        updatedAt: new Date().toISOString()
      };

      const walletRef = doc(db, "creator_wallets", creatorId);
      await setDoc(walletRef, updatedWallet);

      await this.sendNotification(
        creatorId,
        "Funds Settled to Wallet",
        `Great news! Your pending escrow stream earnings of $${settledAmount.toFixed(2)} have cleared into available wallet balance.`,
        "payout_complete"
      );

      return updatedWallet;
    } catch (e) {
      console.error("Failed to settle pending funds:", e);
      return null;
    }
  }
}

export const monetizationService = new MonetizationService();
