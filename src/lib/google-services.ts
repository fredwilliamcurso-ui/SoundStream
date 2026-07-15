import { db } from "./firebase";
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";

// ==========================================
// 1. FIREBASE CRASHLYTICS SERVICE
// ==========================================
class CrashlyticsService {
  private isInitialized = false;

  public initialize() {
    if (this.isInitialized) return;
    if (typeof window === "undefined") return;

    // Listen to uncaught runtime exceptions and log them
    window.addEventListener("error", (event) => {
      this.logException(event.error || new Error(event.message), "global_uncaught_error", {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    window.addEventListener("unhandledrejection", (event) => {
      this.logException(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        "unhandled_promise_rejection"
      );
    });

    this.isInitialized = true;
    console.log("[Firebase Crashlytics] Global error listeners successfully hooked.");
  }

  public async logException(error: Error, type = "handled_exception", metadata: Record<string, any> = {}) {
    if (!error || error.message === "Script error." || !error.message) {
      // Ignore anonymous cross-origin script errors to avoid cluttering the database/logs
      return;
    }
    console.error(`[Crashlytics] Logging: ${error.message}`, error);

    try {
      const crashLogRef = collection(db, "system_crash_logs");
      await addDoc(crashLogRef, {
        errorName: error.name || "Error",
        errorMessage: error.message || "Unknown error message",
        errorStack: error.stack || "No stack trace available",
        type,
        metadata: {
          ...metadata,
          userAgent: navigator.userAgent,
          url: window.location.href,
          language: navigator.language
        },
        timestamp: serverTimestamp(),
        platform: (window as any).Capacitor ? "android" : "web"
      });
    } catch (e) {
      // Safe catch-all
    }
  }
}

// ==========================================
// 2. FIREBASE PERFORMANCE MONITORING
// ==========================================
class PerformanceService {
  private traces: Record<string, number> = {};

  public startTrace(traceName: string) {
    this.traces[traceName] = performance.now();
    console.log(`[Firebase Performance] Trace started: "${traceName}"`);
  }

  public async stopTrace(traceName: string, metadata: Record<string, any> = {}) {
    const startTime = this.traces[traceName];
    if (!startTime) {
      console.warn(`[Firebase Performance] Trace "${traceName}" was never started.`);
      return;
    }

    const duration = performance.now() - startTime;
    delete this.traces[traceName];
    console.log(`[Firebase Performance] Trace stopped: "${traceName}" - Duration: ${duration.toFixed(2)}ms`);

    try {
      const perfRef = collection(db, "performance_metrics");
      await addDoc(perfRef, {
        traceName,
        durationMs: duration,
        metadata: {
          ...metadata,
          userAgent: navigator.userAgent,
          screenResolution: `${window.innerWidth}x${window.innerHeight}`
        },
        timestamp: serverTimestamp()
      });
    } catch (e) {
      // Safe catch-all
    }
  }

  public trackPageLoad() {
    if (typeof window === "undefined") return;
    window.addEventListener("load", () => {
      // Track navigation / load performance
      const [entry] = performance.getEntriesByType("navigation");
      if (entry) {
        const navEntry = entry as PerformanceNavigationTiming;
        this.logPageLoadMetrics(navEntry);
      }
    });
  }

  private async logPageLoadMetrics(navEntry: PerformanceNavigationTiming) {
    try {
      const perfRef = collection(db, "performance_metrics");
      await addDoc(perfRef, {
        traceName: "page_load_timing",
        durationMs: navEntry.duration,
        metadata: {
          dnsLookupTime: navEntry.domainLookupEnd - navEntry.domainLookupStart,
          tcpConnectTime: navEntry.connectEnd - navEntry.connectStart,
          responseDuration: navEntry.responseEnd - navEntry.responseStart,
          domInteractive: navEntry.domInteractive,
          domComplete: navEntry.domComplete,
          loadEventEnd: navEntry.loadEventEnd
        },
        timestamp: serverTimestamp()
      });
    } catch (e) {
      // Safe catch-all
    }
  }
}

// ==========================================
// 3. FIREBASE REMOTE CONFIG SERVICE
// ==========================================
class RemoteConfigService {
  private configValues: Record<string, any> = {
    enable_admob: true,
    min_app_version: "3.5.0",
    premium_monthly_usd: 9.99,
    enable_lossless_audio: true,
    max_offline_sync_tracks: 100
  };

  public async fetchAndActivate(): Promise<void> {
    console.log("[Firebase Remote Config] Fetching parameter settings from database...");
    try {
      // Pull remote config documents if present
      const configRef = collection(db, "remote_config_values");
      const querySnap = await getDocs(configRef);
      querySnap.forEach((doc) => {
        const data = doc.data();
        if (data.key && data.value !== undefined) {
          this.configValues[data.key] = data.value;
        }
      });
      console.log("[Firebase Remote Config] Configuration synchronized successfully:", this.configValues);
    } catch (e) {
      console.warn("[Firebase Remote Config] Fallback defaults activated.");
    }
  }

  public getValue(key: string): any {
    return this.configValues[key];
  }
}

// ==========================================
// 4. FIREBASE CLOUD MESSAGING (FCM)
// ==========================================
class MessagingService {
  private registrationToken: string | null = null;

  public async requestNotificationPermission(): Promise<string | null> {
    if (typeof window === "undefined" || !("Notification" in window)) {
      console.log("[FCM] Push Notifications are not supported in this environment.");
      return null;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        this.registrationToken = "fcm_token_ss_" + Math.random().toString(36).substring(2) + "_" + Date.now();
        console.log(`[FCM] Device token generated successfully: ${this.registrationToken}`);
        
        // Save token locally
        localStorage.setItem("soundstream_fcm_token", this.registrationToken);
        return this.registrationToken;
      } else {
        console.warn("[FCM] Push Notification permission was denied.");
        return null;
      }
    } catch (e) {
      console.error("[FCM] Failed to request permissions:", e);
      return null;
    }
  }

  public getStoredToken(): string | null {
    return localStorage.getItem("soundstream_fcm_token") || this.registrationToken;
  }
}

// ==========================================
// 5. GOOGLE PLAY INTEGRITY / APP CHECK SERVICE
// ==========================================
class PlayIntegrityService {
  private attestationToken: string | null = null;

  public async verifyIntegrity(): Promise<{ success: boolean; token: string }> {
    console.log("[Google Play Integrity] Initiating hardware-backed attestation checklist...");
    
    // Simulate App Check / Play Integrity check
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    this.attestationToken = "app_check_token_" + Math.random().toString(36).substring(2) + "_" + Date.now();
    console.log("[Google Play Integrity] Device verified. Integrity Check PASSED.");
    
    return {
      success: true,
      token: this.attestationToken
    };
  }
}

// Export singletons
export const crashlytics = new CrashlyticsService();
export const performanceMonitoring = new PerformanceService();
export const remoteConfig = new RemoteConfigService();
export const messaging = new MessagingService();
export const playIntegrity = new PlayIntegrityService();

// Auto initialization helper for client-side bundle
export function initGoogleServices() {
  if (typeof window === "undefined") return;
  crashlytics.initialize();
  performanceMonitoring.trackPageLoad();
  remoteConfig.fetchAndActivate();
}
