import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";

const svgContent = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0d1127" />
      <stop offset="50%" stop-color="#080c1d" />
      <stop offset="100%" stop-color="#030409" />
    </linearGradient>
    
    <!-- S Ribbon Gradient -->
    <linearGradient id="s-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#d946ef" /> <!-- vibrant purple -->
      <stop offset="35%" stop-color="#a855f7" /> <!-- medium purple -->
      <stop offset="70%" stop-color="#3b82f6" /> <!-- deep blue -->
      <stop offset="100%" stop-color="#06b6d4" /> <!-- cyan -->
    </linearGradient>

    <!-- EQ Bars Gradient -->
    <linearGradient id="eq-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#d946ef" stop-opacity="1" />
      <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.3" />
    </linearGradient>

    <!-- Music Note Gradient -->
    <linearGradient id="note-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60a5fa" />
      <stop offset="100%" stop-color="#1d4ed8" />
    </linearGradient>

    <!-- Text Gradient -->
    <linearGradient id="text-grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#a855f7" />
      <stop offset="100%" stop-color="#3b82f6" />
    </linearGradient>

    <!-- Shadow filter for 3D effect -->
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.6"/>
    </filter>
    <filter id="glow" x="-25%" y="-25%" width="150%" height="150%">
      <feGaussianBlur stdDeviation="35" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background Rect with Rounded Corners -->
  <rect width="1024" height="1024" rx="220" fill="url(#bg-grad)" />

  <!-- Ambient glow behind the main elements -->
  <circle cx="512" cy="420" r="300" fill="#3b82f6" opacity="0.12" filter="url(#glow)" />
  <circle cx="512" cy="420" r="220" fill="#d946ef" opacity="0.08" filter="url(#glow)" />

  <g filter="url(#shadow)">
    <!-- Audio Wave Equalizer inside S -->
    <g transform="translate(40, -10)">
      <rect x="410" y="270" width="14" height="130" rx="7" fill="url(#eq-grad)" />
      <rect x="435" y="230" width="14" height="170" rx="7" fill="url(#eq-grad)" />
      <rect x="460" y="200" width="14" height="200" rx="7" fill="url(#eq-grad)" />
      <rect x="485" y="240" width="14" height="160" rx="7" fill="url(#eq-grad)" />
      <rect x="510" y="220" width="14" height="180" rx="7" fill="url(#eq-grad)" />
      <rect x="535" y="260" width="14" height="140" rx="7" fill="url(#eq-grad)" />
      <rect x="560" y="290" width="14" height="110" rx="7" fill="url(#eq-grad)" />
      <rect x="585" y="320" width="14" height="80" rx="7" fill="url(#eq-grad)" />
    </g>

    <!-- Stylized 3D Gradient "S" Ribbon Curve -->
    <path d="M 685, 175 
             C 690, 160, 600, 140, 520, 140 
             C 370, 140, 300, 240, 300, 350 
             C 300, 470, 440, 490, 520, 520 
             C 645, 550, 685, 610, 685, 700 
             C 685, 800, 595, 850, 480, 850 
             C 350, 850, 310, 770, 310, 770
             C 310, 770, 340, 805, 430, 805
             C 520, 805, 595, 760, 595, 690
             C 595, 600, 490, 580, 410, 550
             C 300, 510, 240, 440, 240, 340
             C 240, 220, 340, 100, 520, 100
             C 610, 100, 700, 145, 700, 165
             Z" 
          fill="url(#s-grad)" />

    <!-- 3D Style Glossy Music Note inside lower loop of S -->
    <g transform="translate(305, 435)">
      <!-- Note Head -->
      <ellipse cx="65" cy="115" rx="35" ry="25" fill="url(#note-grad)" transform="rotate(-15, 65, 115)" />
      <ellipse cx="65" cy="115" rx="35" ry="25" fill="none" stroke="#93c5fd" stroke-width="2.5" transform="rotate(-15, 65, 115)" />
      
      <!-- Stem & Flag -->
      <path d="M 100, 5 L 100, 115" stroke="url(#note-grad)" stroke-width="16" stroke-linecap="round" />
      <path d="M 100, 15 C 115, 15, 135, 30, 142, 52 C 145, 62, 145, 92, 118, 78 C 110, 74, 102, 45, 100, 25" fill="none" stroke="url(#note-grad)" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" />
    </g>
  </g>

  <!-- Brand Typography: SOUNDSTREAM -->
  <text x="512" y="755" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="82" letter-spacing="1" text-anchor="middle">
    <tspan fill="#ffffff">SOUND</tspan><tspan fill="url(#text-grad)">STREAM</tspan>
  </text>

  <!-- Tagline Typography: DISCOVER. LISTEN. SUPPORT. -->
  <text x="512" y="825" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="28" fill="#9ca3af" letter-spacing="12" text-anchor="middle">
    DISCOVER. LISTEN. SUPPORT.
  </text>
</svg>
`;

// Transparent background SVG optimized for the safe zone of adaptive launcher icons
const foregroundSvgContent = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- S Ribbon Gradient -->
    <linearGradient id="s-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#d946ef" />
      <stop offset="35%" stop-color="#a855f7" />
      <stop offset="70%" stop-color="#3b82f6" />
      <stop offset="100%" stop-color="#06b6d4" />
    </linearGradient>

    <!-- EQ Bars Gradient -->
    <linearGradient id="eq-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#d946ef" stop-opacity="1" />
      <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.3" />
    </linearGradient>

    <!-- Music Note Gradient -->
    <linearGradient id="note-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60a5fa" />
      <stop offset="100%" stop-color="#1d4ed8" />
    </linearGradient>

    <!-- Shadow filter for 3D effect -->
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.6"/>
    </filter>
  </defs>

  <!-- Sized and scaled group centered within the 1024x1024 viewport (safe area for adaptive icons) -->
  <g transform="translate(136, 100) scale(0.74)" filter="url(#shadow)">
    <!-- Audio Wave Equalizer inside S -->
    <g transform="translate(40, -10)">
      <rect x="410" y="270" width="14" height="130" rx="7" fill="url(#eq-grad)" />
      <rect x="435" y="230" width="14" height="170" rx="7" fill="url(#eq-grad)" />
      <rect x="460" y="200" width="14" height="200" rx="7" fill="url(#eq-grad)" />
      <rect x="485" y="240" width="14" height="160" rx="7" fill="url(#eq-grad)" />
      <rect x="510" y="220" width="14" height="180" rx="7" fill="url(#eq-grad)" />
      <rect x="535" y="260" width="14" height="140" rx="7" fill="url(#eq-grad)" />
      <rect x="560" y="290" width="14" height="110" rx="7" fill="url(#eq-grad)" />
      <rect x="585" y="320" width="14" height="80" rx="7" fill="url(#eq-grad)" />
    </g>

    <!-- Stylized 3D Gradient "S" Ribbon Curve -->
    <path d="M 685, 175 
             C 690, 160, 600, 140, 520, 140 
             C 370, 140, 300, 240, 300, 350 
             C 300, 470, 440, 490, 520, 520 
             C 645, 550, 685, 610, 685, 700 
             C 685, 800, 595, 850, 480, 850 
             C 350, 850, 310, 770, 310, 770
             C 310, 770, 340, 805, 430, 805
             C 520, 805, 595, 760, 595, 690
             C 595, 600, 490, 580, 410, 550
             C 300, 510, 240, 440, 240, 340
             C 240, 220, 340, 100, 520, 100
             C 610, 100, 700, 145, 700, 165
             Z" 
          fill="url(#s-grad)" />

    <!-- 3D Style Glossy Music Note inside lower loop of S -->
    <g transform="translate(305, 435)">
      <!-- Note Head -->
      <ellipse cx="65" cy="115" rx="35" ry="25" fill="url(#note-grad)" transform="rotate(-15, 65, 115)" />
      <ellipse cx="65" cy="115" rx="35" ry="25" fill="none" stroke="#93c5fd" stroke-width="2.5" transform="rotate(-15, 65, 115)" />
      
      <!-- Stem & Flag -->
      <path d="M 100, 5 L 100, 115" stroke="url(#note-grad)" stroke-width="16" stroke-linecap="round" />
      <path d="M 100, 15 C 115, 15, 135, 30, 142, 52 C 145, 62, 145, 92, 118, 78 C 110, 74, 102, 45, 100, 25" fill="none" stroke="url(#note-grad)" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" />
    </g>
  </g>
</svg>
`;

async function main() {
  console.log("🚀 Starting SoundStream logo & asset builder script...");

  const svgBuffer = Buffer.from(svgContent.trim());
  const foregroundSvgBuffer = Buffer.from(foregroundSvgContent.trim());

  // Define target outputs and sizes
  const targets = [
    // Web and general assets
    { path: "src/assets/images/soundstream_logo_1782150206757.jpg", width: 512, format: "jpeg" as const, useForeground: false },
    { path: "public/logo.png", width: 512, format: "png" as const, useForeground: false },
    { path: "public/icon.png", width: 512, format: "png" as const, useForeground: false },
    { path: "public/android-chrome-192x192.png", width: 192, format: "png" as const, useForeground: false },
    { path: "public/android-chrome-512x512.png", width: 512, format: "png" as const, useForeground: false },
    { path: "public/apple-touch-icon.png", width: 180, format: "png" as const, useForeground: false },
    
    // Android launcher icon (mipmap)
    { path: "android/app/src/main/res/mipmap-mdpi/ic_launcher.png", width: 48, format: "png" as const, useForeground: false },
    { path: "android/app/src/main/res/mipmap-hdpi/ic_launcher.png", width: 72, format: "png" as const, useForeground: false },
    { path: "android/app/src/main/res/mipmap-xhdpi/ic_launcher.png", width: 96, format: "png" as const, useForeground: false },
    { path: "android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png", width: 144, format: "png" as const, useForeground: false },
    { path: "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png", width: 192, format: "png" as const, useForeground: false },
    
    // Rounded Android Launcher icons
    { path: "android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png", width: 48, format: "png" as const, rounded: true, useForeground: false },
    { path: "android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png", width: 72, format: "png" as const, rounded: true, useForeground: false },
    { path: "android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png", width: 96, format: "png" as const, rounded: true, useForeground: false },
    { path: "android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png", width: 144, format: "png" as const, rounded: true, useForeground: false },
    { path: "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png", width: 192, format: "png" as const, rounded: true, useForeground: false },

    // Android Adaptive Icon Foreground (mipmap)
    { path: "android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png", width: 108, format: "png" as const, useForeground: true },
    { path: "android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png", width: 162, format: "png" as const, useForeground: true },
    { path: "android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png", width: 216, format: "png" as const, useForeground: true },
    { path: "android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png", width: 324, format: "png" as const, useForeground: true },
    { path: "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png", width: 432, format: "png" as const, useForeground: true }
  ];

  for (const target of targets) {
    const dir = path.dirname(target.path);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const currentSvgBuffer = target.useForeground ? foregroundSvgBuffer : svgBuffer;
    let pipeline = sharp(currentSvgBuffer).resize(target.width, target.width);

    if (target.rounded) {
      // Create a circular mask for round icons
      const radius = target.width / 2;
      const maskSvg = `<svg><circle cx="${radius}" cy="${radius}" r="${radius}" /></svg>`;
      pipeline = pipeline.composite([
        {
          input: Buffer.from(maskSvg),
          blend: "dest-in"
        }
      ]);
    }

    if (target.format === "jpeg") {
      pipeline = pipeline.jpeg({ quality: 95 });
    } else {
      pipeline = pipeline.png({ compressionLevel: 9 });
    }

    try {
      await pipeline.toFile(target.path);
      console.log(`✅ Generated: ${target.path} (${target.width}x${target.width})`);
    } catch (err: any) {
      console.error(`❌ Failed to write ${target.path}:`, err.message);
    }
  }

  // Also copy to android assets so it syncs up properly on build
  try {
    const androidAssetsPublicDir = "android/app/src/main/assets/public";
    if (fs.existsSync(androidAssetsPublicDir)) {
      fs.copyFileSync("public/logo.png", path.join(androidAssetsPublicDir, "logo.png"));
      fs.copyFileSync("public/icon.png", path.join(androidAssetsPublicDir, "icon.png"));
      fs.copyFileSync("public/android-chrome-192x192.png", path.join(androidAssetsPublicDir, "android-chrome-192x192.png"));
      fs.copyFileSync("public/android-chrome-512x512.png", path.join(androidAssetsPublicDir, "android-chrome-512x512.png"));
      fs.copyFileSync("public/apple-touch-icon.png", path.join(androidAssetsPublicDir, "apple-touch-icon.png"));
      console.log("✅ Synced logos to Android web assets directory!");
    }
  } catch (err: any) {
    console.error("⚠️ Failed to sync web assets to Android build folder:", err.message);
  }

  console.log("🎉 All SoundStream app branding assets built and synced successfully!");
}

main().catch(err => {
  console.error("❌ Asset compilation crashed:", err);
  process.exit(1);
});
