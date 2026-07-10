import { doc, updateDoc, setDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { User } from "../types";

// AdMob Test Unit IDs (Official Google Test IDs for Android)
export const ADMOB_TEST_IDS = {
  APP_ID: "ca-app-pub-3940256099942544~3347511713",
  BANNER: "ca-app-pub-3940256099942544/6300978111",
  INTERSTITIAL: "ca-app-pub-3940256099942544/1033173712",
  REWARDED: "ca-app-pub-3940256099942544/5224354917"
};

export interface GDPRConsent {
  consentGranted: boolean;
  personalizedAds: boolean;
  timestamp: string;
}

export interface AdStats {
  bannerImpressions: number;
  interstitialImpressions: number;
  rewardedImpressions: number;
  rewardsEarned: number;
}

class AdMobService {
  private isInitialized = false;
  private consentData: GDPRConsent | null = null;
  private songSkipCount = 0;
  private playTransitionCount = 0;
  private lastInterstitialTime = 0;

  // Track if we are running in a Capacitor/native Android shell
  public isNative(): boolean {
    return typeof window !== "undefined" && (window as any).Capacitor !== undefined;
  }

  // Initialize AdMob and consent
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log("Initializing SoundStream AdMob Service...");
    
    // Load local GDPR consent
    const localConsent = localStorage.getItem("soundstream_gdpr_consent");
    if (localConsent) {
      try {
        this.consentData = JSON.parse(localConsent);
      } catch (e) {
        console.error("Failed to parse GDPR consent:", e);
      }
    }

    if (this.isNative()) {
      try {
        // Native Capacitor AdMob integration code (using string literal for correct Vite bundling and resolution)
        const { AdMob } = await import("@capacitor-community/admob");
        await AdMob.initialize({
          requestTrackingAuthorization: true,
          testingDevices: ["EMULATOR"],
          initializeForTesting: true,
        } as any);
        console.log("Capacitor AdMob Native SDK initialized successfully.");
      } catch (e) {
        console.error("Capacitor AdMob initialization failed. Falling back to web engine:", e);
      }
    }

    this.isInitialized = true;
  }

  // Save GDPR consent choice
  public saveConsent(granted: boolean, personalized: boolean): GDPRConsent {
    const consent: GDPRConsent = {
      consentGranted: granted,
      personalizedAds: personalized,
      timestamp: new Date().toISOString()
    };
    this.consentData = consent;
    localStorage.setItem("soundstream_gdpr_consent", JSON.stringify(consent));
    return consent;
  }

  public getConsent(): GDPRConsent | null {
    return this.consentData;
  }

  // Check if current user is Premium (no ads)
  public isPremiumUser(user: User | null): boolean {
    if (!user) return false;
    
    // Check if user has active premium status in Firestore
    const subscription = (user as any).subscription;
    if (subscription && subscription.status === "premium") {
      // Check if it has expiration and if it is valid
      if (subscription.expiresAt) {
        const expiry = new Date(subscription.expiresAt).getTime();
        if (expiry > Date.now()) {
          return true;
        }
      } else {
        return true; // Permanent premium
      }
    }

    // Check for temporary premium unlocked via rewarded ads (saved in local storage)
    const tempPremiumExpiry = localStorage.getItem("soundstream_temp_premium_until");
    if (tempPremiumExpiry) {
      const expiry = parseInt(tempPremiumExpiry, 10);
      if (expiry > Date.now()) {
        return true;
      }
    }

    return false;
  }

  // Set subscription status in Firebase
  public async updateUserSubscription(userId: string, status: "free" | "premium", durationHours = 0): Promise<void> {
    try {
      const userRef = doc(db, "users", userId);
      const expiresAt = durationHours > 0 
        ? new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString()
        : null;

      await updateDoc(userRef, {
        subscription: {
          status,
          expiresAt,
          updatedAt: new Date().toISOString()
        }
      });
      console.log(`Successfully updated subscription status to ${status} for user ${userId}`);
    } catch (e) {
      console.error("Failed to update user subscription in Firestore:", e);
      handleFirestoreError(e, OperationType.UPDATE, `users/${userId}`);
    }
  }

  // Log ad events to Firebase for platform analytics & fraud prevention
  public async logAdEvent(userId: string | undefined, eventType: "banner_impression" | "interstitial" | "reward_unlocked", adUnitId: string, rewardValue = 0): Promise<void> {
    if (!userId) return;
    const path = `users/${userId}/ad_logs`;
    try {
      const logsRef = collection(db, "users", userId, "ad_logs");
      await addDoc(logsRef, {
        eventType,
        adUnitId,
        rewardValue,
        timestamp: serverTimestamp(),
        platform: this.isNative() ? "android" : "web"
      });
      console.log(`Ad event logged: ${eventType}`);
    } catch (e) {
      console.error("Failed to log ad event to Firestore:", e);
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  }

  // Tracking logic for interstitial triggers
  public recordSongTransition(user: User | null, isPlaying: boolean): boolean {
    if (this.isPremiumUser(user)) return false;
    if (isPlaying) return false; // Never disrupt active playback

    this.playTransitionCount += 1;
    const now = Date.now();
    const minIntervalMs = 90 * 1000; // Hard frequency cap: at least 90s between interstitials

    // Show interstitial every 4 song/video selections AND respect time interval cap
    if (this.playTransitionCount >= 4 && (now - this.lastInterstitialTime) > minIntervalMs) {
      this.playTransitionCount = 0;
      this.lastInterstitialTime = now;
      return true;
    }
    return false;
  }

  // Grant temporary premium access (e.g. 1 hour of ad-free listening)
  public grantTemporaryPremium(hours = 1): number {
    const expiresAt = Date.now() + (hours * 60 * 60 * 1000);
    localStorage.setItem("soundstream_temp_premium_until", expiresAt.toString());
    return expiresAt;
  }

  // Get remaining temporary premium duration in minutes
  public getTempPremiumRemainingMinutes(): number {
    const tempPremiumExpiry = localStorage.getItem("soundstream_temp_premium_until");
    if (!tempPremiumExpiry) return 0;
    const expiry = parseInt(tempPremiumExpiry, 10);
    const diff = expiry - Date.now();
    return diff > 0 ? Math.ceil(diff / 60000) : 0;
  }
}

export const admob = new AdMobService();
