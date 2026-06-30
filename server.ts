import express from "express";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

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
    versionCode: 100,
    versionName: "1.0.0",
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

// Serve public directory static files directly
app.use(express.static(path.join(process.cwd(), "public")));

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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupVite();
