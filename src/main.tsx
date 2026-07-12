import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';

// 1. Establish premium diagnostic capturing systems
const startupErrors: any[] = [];
window.addEventListener("error", (event) => {
  if (event.message === "Script error." || !event.message) {
    return;
  }
  startupErrors.push({
    message: event.message,
    source: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

window.addEventListener("unhandledrejection", (event) => {
  startupErrors.push({
    message: `Unhandled Promise Rejection: ${event.reason}`,
    error: event.reason
  });
});

// 2. Perform dynamic bootloading of modules to trap initialization crashes
async function bootloader() {
  const rootElement = document.getElementById('root');
  if (!rootElement) return;

  // Set up an absolute 2.5-second fallback timer to force-hide native SplashScreen
  setTimeout(async () => {
    try {
      const { SplashScreen } = await import('@capacitor/splash-screen');
      await SplashScreen.hide();
      console.log("[Bootloader] Fallback splash screen dismiss triggered.");
    } catch (e) {
      // Safe fallback on standard web/browser environments where plugin is omitted
    }
  }, 2500);

  try {
    console.log("[Bootloader] Initializing asynchronous systems...");

    // Safe load and call of Google services initialization
    const { initGoogleServices } = await import('./lib/google-services.ts');
    try {
      initGoogleServices();
    } catch (servicesError) {
      console.warn("[Bootloader] Google Services initialized with warnings:", servicesError);
    }

    // Load App module dynamically to prevent compile-phase synchronous startup crashes
    const appModule = await import('./App.tsx');
    const App = appModule.default;

    // Render the React application
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>
    );

    // Register progressive web service worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => {
            console.log('[Bootloader] ServiceWorker registration successful scope:', reg.scope);
          })
          .catch((err) => {
            console.error('[Bootloader] ServiceWorker registration failed:', err);
          });
      });
    }

  } catch (error: any) {
    console.error("[Bootloader] CRITICAL: Startup pipeline halted due to exception:", error);

    // Unhide the native splash screen so the user doesn't stay stuck in a loop
    try {
      const { SplashScreen } = await import('@capacitor/splash-screen');
      await SplashScreen.hide();
    } catch (splashErr) {
      console.warn("[Bootloader] Splash screen hide skipped or failed:", splashErr);
    }

    // Retrieve any collected background startup errors or fallback to current error details
    const primaryError = error || (startupErrors.length > 0 ? startupErrors[0].error : null);
    const errorMessage = primaryError?.message || String(error) || "Unknown startup error";
    const errorStack = primaryError?.stack || "No error callstack available";

    // Attempt to log this startup exception directly to Firebase Crashlytics (Firestore logs)
    try {
      const { crashlytics } = await import('./lib/google-services.ts');
      crashlytics.logException(primaryError || new Error(errorMessage), "critical_startup_crash");
    } catch (crashlyticsErr) {
      console.warn("[Bootloader] Failed to report startup crash to Firestore:", crashlyticsErr);
    }

    rootElement.innerHTML = `
      <div style="
        background-color: #0c0c0e;
        color: #ffffff;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        min-height: 100vh;
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 24px;
        box-sizing: border-box;
      ">
        <div style="
          max-width: 500px;
          width: 100%;
          background-color: #121214;
          border: 1px solid rgba(239, 68, 68, 0.15);
          border-radius: 24px;
          padding: 32px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          text-align: center;
        ">
          <div style="
            width: 64px;
            height: 64px;
            background-color: rgba(239, 68, 68, 0.1);
            color: #ef4444;
            border: 1px solid rgba(239, 68, 68, 0.2);
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px auto;
            font-size: 32px;
          ">⚠️</div>
          
          <h2 style="
            font-size: 20px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: -0.025em;
            margin: 0 0 8px 0;
            color: #ffffff;
          ">SoundStream Startup Error</h2>
          
          <p style="
            font-size: 14px;
            color: #a1a1aa;
            margin: 0 0 24px 0;
            line-height: 1.5;
          ">
            An unexpected error was intercepted during the startup sequence. Please check the diagnostics below:
          </p>
          
          <div style="
            background-color: rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 16px;
            padding: 16px;
            text-align: left;
            margin-bottom: 24px;
            overflow: auto;
          ">
            <p style="
              font-family: monospace;
              font-size: 9px;
              color: #71717a;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              font-weight: bold;
              margin: 0 0 8px 0;
            ">Diagnostic Reason</p>
            <p style="
              font-family: monospace;
              font-size: 12px;
              color: #fca5a5;
              margin: 0 0 16px 0;
              word-break: break-all;
              white-space: pre-wrap;
            ">${errorMessage}</p>
            
            <p style="
              font-family: monospace;
              font-size: 9px;
              color: #71717a;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              font-weight: bold;
              margin: 0 0 8px 0;
            ">Execution Stack</p>
            <pre style="
              font-family: monospace;
              font-size: 11px;
              color: #d4d4d8;
              margin: 0;
              overflow-x: auto;
              white-space: pre-wrap;
              word-break: break-all;
              max-height: 160px;
              overflow-y: auto;
            ">${errorStack}</pre>
          </div>
          
          <button onclick="window.location.reload()" style="
            width: 100%;
            background-color: #ef4444;
            color: #ffffff;
            border: none;
            border-radius: 12px;
            padding: 12px 24px;
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            cursor: pointer;
            transition: background-color 0.2s;
          ">Retry Initialization</button>
        </div>
      </div>
    `;
  }
}

bootloader();
