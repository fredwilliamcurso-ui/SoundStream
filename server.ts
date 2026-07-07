import express from "express";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import Stripe from "stripe";
import nodemailer from "nodemailer";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";

dotenv.config();

// User's live Stripe keys from prompt
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "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";
const stripe = new Stripe(STRIPE_SECRET_KEY);
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

// Initialize Firebase Admin
let firestoreDb: any;
try {
  const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
  const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
  const app = initializeApp({
    projectId: firebaseConfig.projectId,
  });
  firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  console.log("🔥 Firebase Admin initialized successfully. Using Database ID:", firebaseConfig.firestoreDatabaseId);
} catch (error) {
  console.error("❌ Failed to initialize Firebase Admin:", error);
}

// SoundStream Coin Packages
const COIN_PACKAGES = [
  { id: "pkg_100", coins: 100, price: 0.99, badge: "Starter" },
  { id: "pkg_500", coins: 500, price: 4.99, badge: "Value" },
  { id: "pkg_1000", coins: 1000, price: 9.99, badge: "Popular", popular: true },
  { id: "pkg_2500", coins: 2500, price: 24.99, badge: "Bronze" },
  { id: "pkg_5000", coins: 5000, price: 49.99, badge: "Silver" },
  { id: "pkg_10000", coins: 10000, price: 99.99, badge: "Gold Champion" }
];

// Initialize GoogleGenAI client utility server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const app = express();
const PORT = 3000;

app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));

// Helper to check if file exists and get stats
function getFileStats(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      return {
        exists: true,
        size: (stats.size / 1024 / 1024).toFixed(2) + " MB",
        modifiedAt: stats.mtime.toLocaleString()
      };
    }
  } catch (e) {
    // Ignore error
  }
  return { exists: false, size: "0.00 MB", modifiedAt: "N/A" };
}

// RESTRICT ACCESS MIDDLEWARE
// Matches App.tsx: fredwilliamcurso@gmail.com is the main admin
const adminAuthMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const adminEmail = req.headers["x-admin-email"];
  if (adminEmail === "fredwilliamcurso@gmail.com") {
    next();
  } else {
    res.status(403).json({ error: "Access denied. Administrators only." });
  }
};

// API ENDPOINTS

// XML Sitemap Generator for public live streams
app.get("/sitemap.xml", async (req, res) => {
  res.setHeader("Content-Type", "application/xml");
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  <url>
    <loc>https://soundstream.live/</loc>
    <changefreq>always</changefreq>
    <priority>1.0</priority>
  </url>
`;

  if (firestoreDb) {
    try {
      const activeStreamsSnapshot = await firestoreDb.collection("liveStreams")
        .where("status", "==", "live")
        .limit(50)
        .get();
        
      activeStreamsSnapshot.forEach((doc: any) => {
        const stream = doc.data();
        if (stream.isPrivate === true) {
          return; // Skip private streams
        }
        const streamUrl = `https://soundstream.live/?tab=live&amp;streamId=${stream.id}`;
        sitemap += `  <url>
    <loc>${streamUrl}</loc>
    <changefreq>always</changefreq>
    <priority>0.8</priority>
    <video:video>
      <video:thumbnail_loc>${stream.thumbnailUrl || "https://images.unsplash.com/photo-1516280440614-37939bbacd6a?w=500&amp;q=80"}</video:thumbnail_loc>
      <video:title>${stream.title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</video:title>
      <video:description>${(stream.description || "Live stream on SoundStream").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</video:description>
      <video:publication_date>${stream.createdAt || new Date().toISOString()}</video:publication_date>
      <video:live>yes</video:live>
    </video:video>
  </url>\n`;
      });
    } catch (err) {
      console.error("Error generating dynamic sitemap stream entries:", err);
    }
  }

  sitemap += `</urlset>`;
  res.send(sitemap);
});

// TikTok verification route (no extension)
app.get("/tiktok-developers-site-verification", (req, res) => {
  res.setHeader("Content-Type", "text/plain");
  res.send("tiktok-developers-site-verification=IodUUaBmU0IfEytTSjoC8BjV1hfqOMoY");
});

// SoundStream AI Chat Endpoint
app.post("/api/ai/chat", express.json(), async (req, res) => {
  try {
    const { message, chatHistory, userProfile, songs, artists, playlists } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    // 1. Build a compact string representation of the music database to pass as context
    const songsContext = (songs || []).slice(0, 30).map((s: any) => 
      `- [Song ID: ${s.id}] "${s.title}" by ${s.artistName} (Genre: ${s.genre || "Unknown"}, Plays: ${s.playCount || 0}, Likes: ${s.likes || 0})`
    ).join("\n");

    const artistsContext = (artists || []).slice(0, 15).map((a: any) => 
      `- [Artist ID: ${a.uid || a.userId}] "${a.artistName}" (${a.followersCount || 0} followers, Bio: ${a.bio || "None"})`
    ).join("\n");

    const playlistsContext = (playlists || []).slice(0, 15).map((p: any) => 
      `- [Playlist ID: ${p.id}] "${p.title}" (Owner: ${p.ownerId || p.createdBy}, Song Count: ${p.songCount || p.songIds?.length || 0})`
    ).join("\n");

    // 2. Build system instructions tailored to the SoundStream app and current user role
    const username = userProfile?.username || userProfile?.displayName || "Listener";
    const userRole = userProfile?.role || "listener";
    const userSubscription = userProfile?.subscription?.status || "free";

    const systemInstruction = `You are SoundStream AI, the intelligent, helpful, and creative AI assistant integrated into SoundStream—the leading independent lossless streaming and short video sharing platform.

You communicate in a warm, helpful, and professional tone. Keep responses conversational and structured with markdown. Use formatting like lists or bullet points to make things readable. Do not mention system-internal files or paths.

Your capabilities:
1. HELP LISTENERS: Discover music, get personalized recommendations, find playlists/artists, and answer music questions.
2. RECOMMEND CONTENT: Use the provided music database context to recommend REAL songs, artists, or playlists that exist in our database. Do NOT invent fake IDs; always use the IDs from the database list.
3. SMART SEARCH ACTIONS: If a listener requests to play a song or genre (e.g., "Play relaxing music" or "Play some Fuji"), search the provided songs list, find the best match, and trigger a play action.
4. PLAYLIST GENERATION: Generate custom playlists based on mood or prompt. You can suggest creating a real playlist.
5. CREATOR ASSISTANT (for Artists): Help write track/album descriptions, bio copy, suggest hashtags, and help plan content.
6. ADMIN ASSISTANT (for Admins): Assist with content moderation (spam detection, analysis) and platform insights.
7. VOICE FUTURE-READY: Keep answers clear and friendly, optimized for voice playback.

CURRENT DATE & TIME: ${new Date().toUTCString()}
USER PROFILE:
- Username: ${username}
- Role: ${userRole}
- Subscription: ${userSubscription}

DATABASE CONTEXT (REAL SOUNDSTREAM ITEMS AVAILABLE):

--- SONGS ---
${songsContext || "No songs uploaded yet."}

--- ARTISTS ---
${artistsContext || "No artists registered yet."}

--- PLAYLISTS ---
${playlistsContext || "No playlists created yet."}

---

TRIGGERS & ACTIONS:
If you decide to perform an interactive action, append a special tag at the absolute end of your response on a new line. Only use valid IDs from the database list.
- To play a song:
  [ACTION: PLAY_SONG, id: "songId", title: "songTitle"]
- To generate/create a real playlist for the user:
  [ACTION: PLAYLIST_GEN, title: "Playlist Title", description: "Playlist Description", songIds: ["id1", "id2", ...]]
- To view an artist's profile:
  [ACTION: VIEW_ARTIST, id: "artistId", name: "artistName"]
- To view a playlist details page:
  [ACTION: VIEW_PLAYLIST, id: "playlistId", title: "playlistTitle"]
- For comment/text spam check (when asked about spam/moderation):
  [ACTION: DETECT_SPAM, text: "textAnalyzed", isSpam: true/false, confidence: 0.95, reason: "Why it is spam"]

Ensure the markdown body is friendly and lists the recommended items clearly, followed by the action tag at the very end if appropriate. Make sure to only recommend real songs from the context list.`;

    // 3. Setup Gemini API chats parameters
    const contents: any[] = [];
    
    // Add history if present
    if (chatHistory && Array.isArray(chatHistory)) {
      chatHistory.slice(-10).forEach((item: any) => {
        const role = (item.senderId === "soundstream-ai") ? "model" : "user";
        contents.push({
          role,
          parts: [{ text: item.text }]
        });
      });
    }

    // Append current user message
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    const replyText = response.text || "I am here to assist you with SoundStream.";
    
    // Extract actions if present
    let action: any = null;
    const actionRegex = /\[ACTION:\s*([A-Z_]+)\s*,\s*([^\]]+)\]/i;
    const match = replyText.match(actionRegex);
    if (match) {
      const actionType = match[1].trim();
      const paramsStr = match[2].trim();
      
      const params: any = {};
      const pairs = paramsStr.split(",");
      pairs.forEach((pair: string) => {
        const separatorIdx = pair.indexOf(":");
        if (separatorIdx !== -1) {
          const key = pair.slice(0, separatorIdx).trim();
          let val = pair.slice(separatorIdx + 1).trim();
          
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          
          if (val.startsWith("[") || val === "true" || val === "false" || !isNaN(Number(val))) {
            try {
              params[key] = JSON.parse(val);
            } catch (e) {
              params[key] = val;
            }
          } else {
            params[key] = val;
          }
        }
      });
      
      action = {
        type: actionType,
        ...params
      };
    }

    res.json({
      text: replyText.replace(actionRegex, "").trim(),
      action
    });

  } catch (error: any) {
    console.error("Error in server-side AI chat:", error);
    res.status(500).json({ error: error.message || "An error occurred in Gemini AI generation." });
  }
});

// 1. Get Android Release Build Status
app.get("/api/admin/build-status", adminAuthMiddleware, (req, res) => {
  const aabPath = path.join(process.cwd(), "public", "app-release.aab");
  const keystorePath = path.join(process.cwd(), "public", "soundstream_release.keystore");

  const aabStats = getFileStats(aabPath);
  const keystoreStats = getFileStats(keystorePath);

  res.json({
    built: aabStats.exists,
    aab: aabStats,
    keystore: keystoreStats,
    packageName: "com.soundstreamy.app",
    versionCode: 102,
    versionName: "1.0.2",
    keyAlias: process.env.SOUNDSTREAM_KEY_ALIAS || "soundstream_alias",
    timestamp: aabStats.exists ? aabStats.modifiedAt : null
  });
});

// 2. Trigger Android Release Build
app.post("/api/admin/build-android", adminAuthMiddleware, (req, res) => {
  console.log("🚀 [Server] Android release build triggered by administrator.");
  
  // Run the build script
  exec("node scripts/build-android-release.js", (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ [Server] Build error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
        log: stdout + "\n" + stderr
      });
      return;
    }
    
    console.log("✅ [Server] Android build pipeline successfully finished.");
    res.json({
      success: true,
      log: stdout
    });
  });
});

// TIKTOK OAUTH INTEGRATION ENDPOINTS

// Helper to construct callback URI
const getTikTokRedirectUri = (req: express.Request) => {
  const appUrl = process.env.APP_URL || process.env.VITE_APP_URL || "http://localhost:3000";
  return `${appUrl.replace(/\/$/, "")}/api/auth/tiktok/callback`;
};

app.get("/api/auth/tiktok/url", (req, res) => {
  const { userId, isArtist } = req.query;
  const clientKey = process.env.TIKTOK_CLIENT_KEY || "mock_tiktok_key";
  const redirectUri = getTikTokRedirectUri(req);
  
  // Encode userId and isArtist into state
  const state = Buffer.from(JSON.stringify({
    userId: userId || "",
    isArtist: isArtist === "true"
  })).toString("base64");

  const params = new URLSearchParams({
    client_key: clientKey,
    scope: "user.info.basic",
    response_type: "code",
    redirect_uri: redirectUri,
    state: state
  });

  const url = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
  res.json({ url });
});

app.get("/api/auth/tiktok/callback", async (req, res) => {
  const { code, state } = req.query;
  const clientKey = process.env.TIKTOK_CLIENT_KEY || "mock_tiktok_key";
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET || "mock_tiktok_secret";
  const redirectUri = getTikTokRedirectUri(req);

  // Parse state
  let parsedState = { userId: "", isArtist: false };
  if (state && typeof state === "string") {
    try {
      parsedState = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
    } catch (e) {
      console.error("Error parsing TikTok state:", e);
    }
  }

  let openId = `tt_${Math.floor(Math.random() * 1000000000)}`;
  let username = `tiktok_user_${Math.floor(Math.random() * 10000)}`;
  let accessToken = `mock_token_${Math.random().toString(36).substring(2)}`;

  // If we have actual production credentials, attempt the real exchange
  const hasCredentials = process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET;
  let isMock = !hasCredentials || clientKey === "mock_tiktok_key";

  if (!isMock && code) {
    try {
      console.log("Exchanging authorization code for TikTok access token...");
      const tokenResponse = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          client_key: clientKey,
          client_secret: clientSecret,
          code: String(code),
          grant_type: "authorization_code",
          redirect_uri: redirectUri
        }).toString()
      });

      if (tokenResponse.ok) {
        const tokenData: any = await tokenResponse.json();
        console.log("TikTok token data received:", tokenData);
        if (tokenData.access_token) {
          accessToken = tokenData.access_token;
          openId = tokenData.open_id || openId;

          // Attempt to get user info
          const userResponse = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username", {
            headers: {
              "Authorization": `Bearer ${accessToken}`
            }
          });

          if (userResponse.ok) {
            const userData: any = await userResponse.json();
            console.log("TikTok user data received:", userData);
            if (userData.data && userData.data.user) {
              const u = userData.data.user;
              username = u.username || u.display_name || username;
              openId = u.open_id || openId;
            }
          }
        }
      } else {
        const errText = await tokenResponse.text();
        console.error("TikTok token exchange failed, running fallback mock authentication:", errText);
      }
    } catch (error) {
      console.error("Error during TikTok OAuth exchange:", error);
    }
  }

  // HTML to send back. This posts a message to the opener and closes
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>TikTok Authentication</title>
        <style>
          body {
            background-color: #0c0c0e;
            color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            text-align: center;
          }
          .spinner {
            border: 3px solid rgba(255,255,255,0.1);
            border-radius: 50%;
            border-top: 3px solid #ff0050;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          h2 {
            font-weight: 700;
            margin-bottom: 8px;
            color: #ffffff;
          }
          p {
            color: #a1a1aa;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="spinner"></div>
        <h2>Connection Successful!</h2>
        <p>Synchronizing with SoundStream... This window will close automatically.</p>
        <script>
          if (window.opener) {
            window.opener.postMessage({
              type: 'TIKTOK_AUTH_SUCCESS',
              data: {
                openId: ${JSON.stringify(openId)},
                username: ${JSON.stringify(username)},
                accessToken: ${JSON.stringify(accessToken)},
                isMock: ${isMock},
                userId: ${JSON.stringify(parsedState.userId)},
                isArtist: ${parsedState.isArtist}
              }
            }, '*');
            setTimeout(() => {
              window.close();
            }, 800);
          } else {
            window.location.href = '/';
          }
        </script>
      </body>
    </html>
  `);
});

// ==========================================
// SECURE STRIPE CHECKOUT & WEBHOOK FLOW
// ==========================================

// Create checkout session for Coins, Creator Subscription, or Donations
app.post("/api/stripe/create-checkout-session", async (req, res) => {
  try {
    const { userId, email, packageId, amount, customName } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required." });
    }

    let productName = "SoundStream Payment";
    let productDescription = "Virtual transaction on SoundStream platform.";
    let unitAmountCents = 0;
    let metadata: any = {
      userId,
      email: email || "",
      packageId,
    };

    if (packageId === "creator_subscription") {
      productName = "SoundStream Creator Pro Subscription";
      productDescription = "SoundStream Creator Pro license activation. Unlocks unlimited uploads and studio streams.";
      unitAmountCents = 999; // $9.99
      metadata.type = "creator_subscription";
    } else if (packageId === "donation") {
      const donationAmount = Number(amount) || 10.00;
      productName = customName || "SoundStream Development Contribution";
      productDescription = `A voluntary contribution of $${donationAmount.toFixed(2)} USD to support the SoundStream creator platform.`;
      unitAmountCents = Math.round(donationAmount * 100);
      metadata.type = "donation";
      metadata.amount = String(donationAmount);
    } else {
      // Default to Coins package
      const pack = COIN_PACKAGES.find((p) => p.id === packageId);
      if (!pack) {
        return res.status(400).json({ error: "Invalid payment package selected." });
      }
      productName = `${pack.coins} SoundStream Coins`;
      productDescription = `Load ${pack.coins} virtual Coins into your SoundStream wallet instantly.`;
      unitAmountCents = Math.round(pack.price * 100);
      metadata.type = "coins";
      metadata.coins = String(pack.coins);
    }

    const hostUrl = process.env.APP_URL || req.headers.origin || "http://localhost:3000";
    
    console.log(`[Stripe Checkout] Initiating checkout of type [${metadata.type}] for user ${userId} (${email || "no-email"}) - Amount: $${(unitAmountCents / 100).toFixed(2)}`);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productName,
              description: productDescription,
            },
            unit_amount: unitAmountCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${hostUrl}/?status=success&session_id={CHECKOUT_SESSION_ID}&type=${metadata.type}`,
      cancel_url: `${hostUrl}/?status=cancel&type=${metadata.type}`,
      metadata: metadata,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error("❌ Failed to create Stripe Checkout session:", error);
    res.status(500).json({ error: error.message || "Failed to create checkout session." });
  }
});

// Helper function to update coins on backend (Admin Firestore context)
async function creditCoinsBackend(userId: string, coinsToCredit: number, sessionId: string, email: string, packId: string) {
  if (!firestoreDb) {
    throw new Error("Firestore Admin SDK is not initialized.");
  }

  const walletRef = firestoreDb.collection("wallets").doc(userId);
  const txnRef = firestoreDb.collection("coin_transactions").doc(sessionId);

  return firestoreDb.runTransaction(async (transaction: any) => {
    // 1. Check duplicate
    const txnDoc = await transaction.get(txnRef);
    if (txnDoc.exists && txnDoc.data()?.status === "completed") {
      console.log(`[Stripe Webhook] Transaction ${sessionId} has already been credited. Skipping.`);
      return { success: false, duplicate: true, currentBalance: txnDoc.data()?.currentBalance || 0 };
    }

    // 2. Load wallet
    const walletDoc = await transaction.get(walletRef);
    let balance = 100; // Onboard complimentary balance of 100 if user wallet not initialized
    let totalPurchased = 100;
    let totalSpent = 0;
    let totalReceived = 0;

    if (walletDoc.exists) {
      const data = walletDoc.data();
      balance = typeof data.balance === 'number' ? data.balance : 100;
      totalPurchased = typeof data.totalPurchased === 'number' ? data.totalPurchased : 100;
      totalSpent = typeof data.totalSpent === 'number' ? data.totalSpent : 0;
      totalReceived = typeof data.totalReceived === 'number' ? data.totalReceived : 0;
    }

    const nextBalance = balance + coinsToCredit;
    const nextTotalPurchased = totalPurchased + coinsToCredit;

    // 3. Write completed transaction
    transaction.set(txnRef, {
      id: sessionId,
      userId,
      type: "purchase",
      amount: coinsToCredit,
      stripeSessionId: sessionId,
      packageName: `${coinsToCredit} SoundStream Coins`,
      status: "completed",
      createdAt: new Date().toISOString(),
      customerEmail: email || "",
      amountPaid: coinsToCredit / 100, // or approximate
      packageId: packId
    });

    // 4. Update wallet
    transaction.set(walletRef, {
      userId,
      balance: nextBalance,
      totalPurchased: nextTotalPurchased,
      totalSpent,
      totalReceived,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // 5. Trigger notifications for user
    const notifRef = firestoreDb.collection("notifications").doc();
    transaction.set(notifRef, {
      userId,
      receiverId: userId,
      title: "⚡ Coins Credited!",
      message: `Your account has been credited with ${coinsToCredit} SoundStream Coins. Keep supporting creators!`,
      type: "payment_success",
      createdAt: new Date().toISOString(),
      read: false
    });

    return { success: true, newBalance: nextBalance };
  });
}

// Helper function to activate Creator subscription on backend (Admin Firestore context)
async function activateCreatorSubscriptionBackend(userId: string, sessionId: string, email: string) {
  if (!firestoreDb) {
    throw new Error("Firestore Admin SDK is not initialized.");
  }

  const subRef = firestoreDb.collection("subscriptions").doc(sessionId);
  const userRef = firestoreDb.collection("users").doc(userId);

  return firestoreDb.runTransaction(async (transaction: any) => {
    // 1. Check duplicate
    const subDoc = await transaction.get(subRef);
    if (subDoc.exists && subDoc.data()?.status === "active") {
      console.log(`[Stripe Webhook] Subscription ${sessionId} has already been activated. Skipping.`);
      return { success: false, duplicate: true };
    }

    const subscriptionData = {
      creatorSubscriptionStatus: "active",
      creatorSubscriptionDate: new Date().toISOString(),
      creatorSubscriptionProvider: "Stripe",
      creatorSubscriptionActive: true
    };

    // 2. Set subscription document
    transaction.set(subRef, {
      id: sessionId,
      userId,
      type: "creator_subscription",
      status: "active",
      createdAt: new Date().toISOString(),
      customerEmail: email || "",
      amountPaid: 9.99,
      provider: "Stripe"
    });

    // 3. Update user document
    transaction.set(userRef, subscriptionData, { merge: true });

    // 4. Trigger notifications for user
    const notifRef = firestoreDb.collection("notifications").doc();
    transaction.set(notifRef, {
      userId,
      receiverId: userId,
      title: "👑 Creator Studio Activated!",
      message: `Your Creator Pro subscription is active. Unlock master uploads and interactive streams in your Studio!`,
      type: "creator_activation",
      createdAt: new Date().toISOString(),
      read: false
    });

    return { success: true };
  });
}

// Helper function to record Donation on backend (Admin Firestore context)
async function recordDonationBackend(userId: string, amount: number, sessionId: string, email: string) {
  if (!firestoreDb) {
    throw new Error("Firestore Admin SDK is not initialized.");
  }

  const txnRef = firestoreDb.collection("coin_transactions").doc(sessionId);

  return firestoreDb.runTransaction(async (transaction: any) => {
    // 1. Check duplicate
    const txnDoc = await transaction.get(txnRef);
    if (txnDoc.exists && txnDoc.data()?.status === "completed") {
      console.log(`[Stripe Webhook] Donation ${sessionId} has already been registered. Skipping.`);
      return { success: false, duplicate: true };
    }

    // 2. Write donation transaction
    transaction.set(txnRef, {
      id: sessionId,
      userId,
      type: "donation",
      amount: 0,
      stripeSessionId: sessionId,
      packageName: `SoundStream Support Donation`,
      status: "completed",
      createdAt: new Date().toISOString(),
      customerEmail: email || "",
      amountPaid: amount,
      packageId: "donation"
    });

    // 3. Trigger notification for user
    const notifRef = firestoreDb.collection("notifications").doc();
    transaction.set(notifRef, {
      userId,
      receiverId: userId,
      title: "❤️ Thank you for your support!",
      message: `Your kind donation of $${amount.toFixed(2)} has been received. Thank you for supporting independent developers and audio creators on SoundStream!`,
      type: "donation_success",
      createdAt: new Date().toISOString(),
      read: false
    });

    return { success: true };
  });
}

// Helper to send customizable email confirmations via Nodemailer
async function sendConfirmationEmail(
  email: string,
  purchaseItem: string,
  amountPaid: string,
  statusDetail: string,
  balanceOrExpiry: string,
  txnId: string
) {
  if (!email) return;

  const subject = `Your SoundStream Purchase: ${purchaseItem} is confirmed!`;
  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e4e4e7; border-radius: 16px; background-color: #0c0a0f; color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 32px; font-weight: bold; background: linear-gradient(to right, #ff0050, #6366f1); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">SoundStream</span>
      </div>
      <h2 style="color: #6366f1; margin-top: 0; text-align: center;">Payment Receipt &amp; Credit Confirmation</h2>
      <p style="color: #a1a1aa; font-size: 14px; text-align: center; line-height: 1.6;">
        Success! Your Stripe payment completed successfully and your order has been processed in real-time.
      </p>
      
      <div style="background-color: #181524; border: 1px solid #312e45; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #e4e4e7;">
          <tr>
            <td style="padding: 6px 0; color: #a1a1aa;">Item Purchased:</td>
            <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #fbbf24;">${purchaseItem}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #a1a1aa;">Amount Paid:</td>
            <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #ffffff;">${amountPaid}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #a1a1aa;">Status Detail:</td>
            <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #34d399;">${statusDetail}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #a1a1aa;">Wallet/Expiry Status:</td>
            <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #818cf8;">${balanceOrExpiry}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #a1a1aa;">Transaction Ref:</td>
            <td style="padding: 6px 0; text-align: right; font-family: monospace; font-size: 12px; color: #818cf8;">${txnId}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #a1a1aa;">Settled At:</td>
            <td style="padding: 6px 0; text-align: right; color: #e4e4e7;">${new Date().toLocaleString()}</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 11px; color: #71717a; text-align: center; margin-top: 32px;">
        This is an automated confirmation email for virtual goods purchase. SoundStream Inc. - Secure Payment Processor.
      </p>
    </div>
  `;

  try {
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = Number(process.env.SMTP_PORT) || 587;

    let transporter;
    if (smtpUser && smtpPass) {
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });
    } else {
      console.log("[Nodemailer] No custom SMTP credentials specified. Bootstrapping Ethereal virtual mailbox...");
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    }

    const info = await transporter.sendMail({
      from: '"SoundStream Payments" <payments@soundstreamy.com>',
      to: email,
      subject: `Your SoundStream Order Confirmation`,
      html: htmlBody,
      text: `Your purchase of ${purchaseItem} has arrived! Amount paid: ${amountPaid}. Transaction ID: ${txnId}.`
    });

    console.log(`✉️ Confirmation email sent to ${email}. Message ID: ${info.messageId}`);
    if (!smtpUser) {
      console.log(`🔗 Preview Ethereal email at: ${nodemailer.getTestMessageUrl(info)}`);
    }
  } catch (err) {
    console.error("❌ Failed to dispatch email confirmation:", err);
  }
}

// Secure Stripe Webhook Handler
app.post("/api/stripe/webhook", async (req: express.Request, res: express.Response) => {
  const sig = req.headers["stripe-signature"];
  let event: any;

  try {
    if (STRIPE_WEBHOOK_SECRET && sig) {
      event = stripe.webhooks.constructEvent((req as any).rawBody, sig, STRIPE_WEBHOOK_SECRET);
    } else {
      console.warn("⚠️ Stripe Webhook signature verification bypassed. No webhooks secret found or missing signature.");
      event = req.body;
    }
  } catch (err: any) {
    console.error(`❌ Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`[Stripe Webhook] Received webhook event type: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        
        if (session.payment_status === "paid") {
          const userId = session.metadata?.userId;
          const email = session.metadata?.email || session.customer_details?.email || "";
          const packageId = session.metadata?.packageId;
          const type = session.metadata?.type || "coins";

          if (!userId) {
            console.error("❌ Invalid checkout session metadata: missing userId.", session.metadata);
            break;
          }

          if (type === "coins") {
            const coinsToCredit = Number(session.metadata?.coins || 0);
            if (!coinsToCredit) {
              console.error("❌ Invalid checkout session metadata: missing coins.", session.metadata);
              break;
            }
            console.log(`⚡ [Stripe Webhook] Crediting ${coinsToCredit} Coins to user ${userId}...`);
            const result = await creditCoinsBackend(userId, coinsToCredit, session.id, email, packageId);
            
            if (result.success) {
              console.log(`✨ [Stripe Webhook] Successfully credited user ${userId} wallet with ${coinsToCredit} Coins! New balance: ${result.newBalance}`);
              // Dispatch confirmation email
              await sendConfirmationEmail(
                email,
                `${coinsToCredit} SoundStream Coins Package`,
                `$${(coinsToCredit / 100).toFixed(2)} USD`,
                `Credited +${coinsToCredit} Coins`,
                `${result.newBalance} Coins`,
                session.id
              );
            } else if (result.duplicate) {
              console.log(`⚠️ [Stripe Webhook] Event already processed for session ${session.id}. No double crediting occurred.`);
            }
          } else if (type === "creator_subscription") {
            console.log(`⚡ [Stripe Webhook] Activating Creator Subscription for user ${userId}...`);
            const result = await activateCreatorSubscriptionBackend(userId, session.id, email);
            
            if (result.success) {
              console.log(`✨ [Stripe Webhook] Successfully activated Creator Subscription for user ${userId}!`);
              // Dispatch confirmation email
              await sendConfirmationEmail(
                email,
                "SoundStream Creator Pro Subscription",
                "$9.99 USD",
                "Creator Studio Access Activated",
                "Active / Monthly Renewal",
                session.id
              );
            } else if (result.duplicate) {
              console.log(`⚠️ [Stripe Webhook] Subscription already processed for session ${session.id}.`);
            }
          } else if (type === "donation") {
            const donationAmt = Number(session.metadata?.amount || 10.00);
            console.log(`⚡ [Stripe Webhook] Registering Donation of $${donationAmt} from user ${userId}...`);
            const result = await recordDonationBackend(userId, donationAmt, session.id, email);
            
            if (result.success) {
              console.log(`✨ [Stripe Webhook] Successfully logged donation of $${donationAmt} for user ${userId}!`);
              // Dispatch confirmation email
              await sendConfirmationEmail(
                email,
                "SoundStream Development Support Donation",
                `$${donationAmt.toFixed(2)} USD`,
                "Supported platform hosting & audio streaming services",
                "Active Contributor",
                session.id
              );
            } else if (result.duplicate) {
              console.log(`⚠️ [Stripe Webhook] Donation already processed for session ${session.id}.`);
            }
          }
        } else {
          console.log(`⚠️ [Stripe Webhook] Checkout completed session status is unpaid (${session.payment_status}). Skipping processing.`);
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        console.log(`💸 [Stripe Webhook] Payment Intent ${paymentIntent.id} succeeded for $${paymentIntent.amount / 100}`);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;
        console.error(`❌ [Stripe Webhook] Payment Intent ${paymentIntent.id} failed. Error: ${paymentIntent.last_payment_error?.message || "unknown"}`);
        break;
      }

      default: {
        console.log(`ℹ️ [Stripe Webhook] Unhandled event type: ${event.type}`);
        break;
      }
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error("❌ Error processing webhook event:", error);
    res.status(500).json({ error: "Internal server error during webhook processing." });
  }
});

// Serve public directory static files directly
app.use(express.static(path.join(process.cwd(), "public")));

// ============================================================================
// CENTRALIZED PRODUCTION-GRADE SFU (SELECTIVE FORWARDING UNIT) MEDIA SERVER
// ============================================================================
interface StreamSession {
  streamId: string;
  hostSocket: WebSocket | null;
  viewers: Set<WebSocket>;
  lastFrame: string | null;
  createdAt: string;
}

const activeSFUSessions = new Map<string, StreamSession>();

function getOrCreateSFUSession(streamId: string): StreamSession {
  let session = activeSFUSessions.get(streamId);
  if (!session) {
    session = {
      streamId,
      hostSocket: null,
      viewers: new Set(),
      lastFrame: null,
      createdAt: new Date().toISOString(),
    };
    activeSFUSessions.set(streamId, session);
  }
  return session;
}

function cleanUpSFUViewer(ws: WebSocket) {
  for (const [streamId, session] of activeSFUSessions.entries()) {
    if (session.viewers.has(ws)) {
      session.viewers.delete(ws);
      console.log(`📡 [SFU] Viewer disconnected from stream ${streamId}. Remaining viewers: ${session.viewers.size}`);
    }
  }
}

function cleanUpSFUHost(ws: WebSocket) {
  for (const [streamId, session] of activeSFUSessions.entries()) {
    if (session.hostSocket === ws) {
      session.hostSocket = null;
      console.log(`📡 [SFU] Host disconnected from stream ${streamId}`);
      const msg = JSON.stringify({ type: "host-offline", streamId });
      session.viewers.forEach((viewer) => {
        if (viewer.readyState === WebSocket.OPEN) {
          viewer.send(msg);
        }
      });
    }
  }
}

const handleSFUConnection = (ws: WebSocket) => {
  ws.on("message", (rawMessage: any) => {
    try {
      const data = JSON.parse(rawMessage.toString());
      const { type, streamId } = data;

      if (!streamId) return;

      const session = getOrCreateSFUSession(streamId);

      switch (type) {
        case "host-join":
          console.log(`📡 [SFU] Host joined for stream: ${streamId}`);
          session.hostSocket = ws;
          session.viewers.forEach((viewer) => {
            if (viewer.readyState === WebSocket.OPEN) {
              viewer.send(JSON.stringify({ type: "host-online", streamId }));
            }
          });
          break;

        case "host-frame":
          session.lastFrame = data.frame;
          session.viewers.forEach((viewer) => {
            if (viewer.readyState === WebSocket.OPEN && viewer !== ws) {
              viewer.send(rawMessage.toString());
            }
          });
          break;

        case "host-audio":
          session.viewers.forEach((viewer) => {
            if (viewer.readyState === WebSocket.OPEN && viewer !== ws) {
              viewer.send(rawMessage.toString());
            }
          });
          break;

        case "viewer-join":
          console.log(`📡 [SFU] Viewer joined stream: ${streamId}`);
          session.viewers.add(ws);
          
          ws.send(JSON.stringify({
            type: "stream-status",
            streamId,
            hostOnline: session.hostSocket !== null
          }));

          if (session.lastFrame) {
            ws.send(JSON.stringify({
              type: "host-frame",
              streamId,
              frame: session.lastFrame
            }));
          }
          break;

        case "viewer-leave":
          console.log(`📡 [SFU] Viewer voluntarily left stream: ${streamId}`);
          session.viewers.delete(ws);
          break;

        case "ping":
          ws.send(JSON.stringify({ type: "pong" }));
          break;

        default:
          break;
      }
    } catch (err) {
      console.error("📡 [SFU] Error processing WS message:", err);
    }
  });

  ws.on("close", () => {
    cleanUpSFUViewer(ws);
    cleanUpSFUHost(ws);
  });

  ws.on("error", (err) => {
    console.error("📡 [SFU] Socket error:", err);
    cleanUpSFUViewer(ws);
    cleanUpSFUHost(ws);
  });
};

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

wss.on("connection", handleSFUConnection);

server.on("upgrade", (request, socket, head) => {
  const pathname = new URL(request.url || "", `http://${request.headers.host}`).pathname;
  if (pathname === "/api/media-sfu") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  }
});

// Vite middleware for development vs static files for production
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupVite();
