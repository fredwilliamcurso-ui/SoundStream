import fs from "fs";
import path from "path";
import { Wallet, CoinTransaction } from "../types/coins";

// Let's define the path for the standalone billing database
const DB_PATH = path.join(process.cwd(), "billing_db.json");

interface BillingSchema {
  wallets: Record<string, Wallet>;
  transactions: Record<string, CoinTransaction>;
  processedEvents: Record<string, boolean>;
}

class BillingDbManager {
  private cache: BillingSchema = {
    wallets: {},
    transactions: {},
    processedEvents: {}
  };
  private writePromise: Promise<void> = Promise.resolve();
  private initialized = false;

  constructor() {
    this.init();
  }

  /**
   * Initializes the database from disk, or creates it if it doesn't exist.
   */
  private init() {
    if (this.initialized) return;
    try {
      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, "utf-8");
        const parsed = JSON.parse(raw);
        this.cache = {
          wallets: parsed.wallets || {},
          transactions: parsed.transactions || {},
          processedEvents: parsed.processedEvents || {}
        };
        console.log(`📦 [Billing Database] Loaded successfully. Wallets: ${Object.keys(this.cache.wallets).length}, Transactions: ${Object.keys(this.cache.transactions).length}, Processed Events: ${Object.keys(this.cache.processedEvents).length}`);
      } else {
        console.log("📦 [Billing Database] Database file not found. Creating a fresh database...");
        this.saveSync();
      }
      this.initialized = true;
    } catch (err) {
      console.error("❌ [Billing Database] Initialization failed. Starting with empty cache:", err);
      this.initialized = true; // prevent infinite loops
    }
  }

  /**
   * Synchronous save used during initialization or emergency shutdowns.
   */
  private saveSync() {
    try {
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_PATH, JSON.stringify(this.cache, null, 2), "utf-8");
    } catch (err) {
      console.error("❌ [Billing Database] Synchronous write failed:", err);
    }
  }

  /**
   * Thread-safe sequential file saver. Prevents concurrent writes from corrupting the JSON file.
   */
  private async save(): Promise<void> {
    // Chain onto the existing write promise to ensure serialization of writes
    this.writePromise = this.writePromise.then(async () => {
      try {
        const tempPath = `${DB_PATH}.tmp`;
        await fs.promises.writeFile(tempPath, JSON.stringify(this.cache, null, 2), "utf-8");
        await fs.promises.rename(tempPath, DB_PATH);
      } catch (err) {
        console.error("❌ [Billing Database] Standalone database write failed:", err);
        throw err;
      }
    });
    return this.writePromise;
  }

  /**
   * Safe fetch or create a user wallet.
   */
  public async getOrCreateWallet(userId: string): Promise<Wallet> {
    this.init();
    if (this.cache.wallets[userId]) {
      return { ...this.cache.wallets[userId] };
    }

    const initialWallet: Wallet = {
      userId,
      balance: 100, // Onboard complimentary balance of 100 SoundStream Coins
      totalPurchased: 100,
      totalSpent: 0,
      totalReceived: 0,
      updatedAt: new Date().toISOString()
    };

    this.cache.wallets[userId] = initialWallet;
    await this.save();
    return { ...initialWallet };
  }

  /**
   * Safely get all transaction history for a user.
   */
  public getTransactions(userId: string): CoinTransaction[] {
    this.init();
    return Object.values(this.cache.transactions)
      .filter((tx) => tx.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Checks if a Stripe Checkout Session or Webhook Event ID has already been fully processed.
   */
  public isEventOrSessionProcessed(id: string): boolean {
    this.init();
    if (this.cache.processedEvents[id]) return true;
    if (this.cache.transactions[id] && this.cache.transactions[id].status === "completed") return true;
    return false;
  }

  /**
   * Marks a Stripe Event ID as processed.
   */
  public async markEventProcessed(eventId: string): Promise<void> {
    this.init();
    this.cache.processedEvents[eventId] = true;
    await this.save();
  }

  /**
   * Core atomic logic to credit coins to a user wallet.
   */
  public async creditCoins(
    userId: string,
    coinsToCredit: number,
    sessionId: string,
    email: string,
    packageId: string,
    eventId?: string
  ): Promise<{ success: boolean; duplicate: boolean; wallet: Wallet; transaction: CoinTransaction }> {
    this.init();

    // 1. Double spend guard
    if (this.isEventOrSessionProcessed(sessionId) || (eventId && this.isEventOrSessionProcessed(eventId))) {
      console.log(`⚠️ [Billing Database] Session/Event [${sessionId} / ${eventId}] already processed. Duplicate guard activated.`);
      
      // Look up existing transaction or return current wallet state
      const wallet = await this.getOrCreateWallet(userId);
      const transaction = this.cache.transactions[sessionId] || {
        id: sessionId,
        userId,
        type: "purchase",
        amount: coinsToCredit,
        stripeSessionId: sessionId,
        packageName: `${coinsToCredit} SoundStream Coins`,
        status: "completed",
        createdAt: new Date().toISOString()
      };

      return {
        success: true,
        duplicate: true,
        wallet,
        transaction
      };
    }

    // 2. Fetch or create wallet
    const wallet = await this.getOrCreateWallet(userId);
    const prevBalance = wallet.balance;
    const nextBalance = prevBalance + coinsToCredit;
    const nextTotalPurchased = wallet.totalPurchased + coinsToCredit;

    // 3. Create the completed transaction record
    const transaction: CoinTransaction = {
      id: sessionId,
      userId,
      type: "purchase",
      amount: coinsToCredit,
      stripeSessionId: sessionId,
      packageName: `${coinsToCredit} SoundStream Coins`,
      status: "completed",
      createdAt: new Date().toISOString()
    };

    // 4. Update the local cache
    wallet.balance = nextBalance;
    wallet.totalPurchased = nextTotalPurchased;
    wallet.updatedAt = new Date().toISOString();

    this.cache.wallets[userId] = wallet;
    this.cache.transactions[sessionId] = transaction;
    
    if (eventId) {
      this.cache.processedEvents[eventId] = true;
    }

    // Persist to local disk immediately
    await this.save();
    console.log(`✨ [Billing Database] Local Coin Credit success: User ${userId} (+${coinsToCredit} Coins) | Balance: ${prevBalance} -> ${nextBalance}`);

    return {
      success: true,
      duplicate: false,
      wallet: { ...wallet },
      transaction: { ...transaction }
    };
  }
}

export const billingDb = new BillingDbManager();
