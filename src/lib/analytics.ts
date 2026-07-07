import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export interface AnalyticsEvent {
  eventType: string;
  userId?: string;
  userEmail?: string;
  metadata?: Record<string, any>;
  timestamp: any;
  platform: "web" | "android";
}

class AnalyticsService {
  private measurementId = "G-LNDREMS5P0"; // Official fallback/demo GA4 Measurement ID

  constructor() {
    this.initGA();
  }

  private isNative(): boolean {
    return typeof window !== "undefined" && (window as any).Capacitor !== undefined;
  }

  private initGA() {
    if (typeof window === "undefined") return;

    // Try to retrieve measurement ID from env or configuration
    const envId = (import.meta as any).env.VITE_GA_MEASUREMENT_ID;
    if (envId) {
      this.measurementId = envId;
    }

    try {
      // Setup window dataLayer and gtag function
      (window as any).dataLayer = (window as any).dataLayer || [];
      const gtag = function(...args: any[]) {
        (window as any).dataLayer.push(arguments);
      };
      (window as any).gtag = gtag;

      gtag('js', new Date());
      // Set SameSite=None and Secure for iframe analytics tracking compatibility in developers console
      gtag('config', this.measurementId, {
        send_page_view: true,
        cookie_flags: 'SameSite=None;Secure'
      });

      // Dynamically load Google Analytics script
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`;
      document.head.appendChild(script);
      console.log(`[Google Analytics 4] Loaded dynamically with Measurement ID: ${this.measurementId}`);

      // Check and log installation / first launch events
      this.checkFirstLaunch();
    } catch (e) {
      console.error("[Google Analytics 4] Failed to initialize dynamic tracking script:", e);
    }
  }

  private checkFirstLaunch() {
    const launchedBefore = localStorage.getItem("soundstream_launched_before");
    if (!launchedBefore) {
      localStorage.setItem("soundstream_launched_before", "true");
      this.trackEvent("first_launch", "anonymous", "anonymous", {
        firstLaunchTimestamp: new Date().toISOString()
      });
      this.trackEvent("app_install", "anonymous", "anonymous", {
        installTimestamp: new Date().toISOString()
      });
    }
  }

  public async trackEvent(
    eventType: string,
    userId?: string,
    userEmail?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const isNativePlatform = this.isNative();
    const platformStr = isNativePlatform ? "android" : "web";
    const finalUserId = userId || "anonymous";
    const finalUserEmail = userEmail || "anonymous";
    
    const finalMetadata = {
      ...(metadata || {}),
      user_id: finalUserId,
      user_email: finalUserEmail,
      platform: platformStr,
      timestamp_str: new Date().toISOString()
    };

    // 1. Send to standard Google Analytics 4 Tag
    if (typeof window !== "undefined" && (window as any).gtag) {
      try {
        (window as any).gtag("event", eventType, finalMetadata);
      } catch (err) {
        // Safe catch-all
      }
    }

    // 2. Mirror securely in Firestore collection "analytics_events" for back-up tracking
    try {
      const eventRef = collection(db, "analytics_events");
      await addDoc(eventRef, {
        eventType,
        userId: finalUserId,
        userEmail: finalUserEmail,
        metadata: metadata || {},
        timestamp: serverTimestamp(),
        platform: platformStr
      });
    } catch (e) {
      // Safe catch-all
    }
  }

  // Periodic retention tracking
  public startRetentionTracking(userId?: string, userEmail?: string): () => void {
    const trackPing = () => {
      this.trackEvent("retention_ping", userId, userEmail, {
        sessionDurationMs: performance.now()
      });
    };

    // Track on initial load
    trackPing();

    // Track every 5 minutes
    const interval = setInterval(trackPing, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }
}

export const analytics = new AnalyticsService();
