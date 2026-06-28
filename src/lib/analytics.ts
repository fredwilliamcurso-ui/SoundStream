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
  private isNative(): boolean {
    return typeof window !== "undefined" && (window as any).Capacitor !== undefined;
  }

  public async trackEvent(
    eventType: string,
    userId?: string,
    userEmail?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const eventRef = collection(db, "analytics_events");
      await addDoc(eventRef, {
        eventType,
        userId: userId || "anonymous",
        userEmail: userEmail || "anonymous",
        metadata: metadata || {},
        timestamp: serverTimestamp(),
        platform: this.isNative() ? "android" : "web"
      });
    } catch (e) {
      // Do not log error unless we want to, but keep it minimal to satisfy "remove debug logging"
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
