import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";

const rootDir = process.cwd();
const targetPath = path.join(rootDir, "src/assets/images/soundstream_logo_1782150206757.jpg");

const svgLogo = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradient -->
    <radialGradient id="bg-grad" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#18181b" />
      <stop offset="100%" stop-color="#09090b" />
    </radialGradient>

    <!-- Main Vibrant Branding Gradient -->
    <linearGradient id="brand-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1" />  <!-- Indigo-500 -->
      <stop offset="50%" stop-color="#a855f7" /> <!-- Purple-500 -->
      <stop offset="100%" stop-color="#06b6d4" /> <!-- Cyan-500 -->
    </linearGradient>

    <!-- Glowing Accent Gradient -->
    <linearGradient id="glow-grad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#6366f1" stop-opacity="0.8" />
    </linearGradient>

    <!-- Gaussian Blur for Glow Effect -->
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="30" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Deep space dark background -->
  <rect width="1024" height="1024" fill="url(#bg-grad)" />

  <!-- Outer Ambient Glow -->
  <circle cx="512" cy="512" r="320" fill="none" stroke="url(#glow-grad)" stroke-width="48" filter="url(#glow)" opacity="0.15" />

  <!-- Outer Ring representing continuous stream/orbit -->
  <circle cx="512" cy="512" r="340" fill="none" stroke="url(#brand-grad)" stroke-width="12" stroke-dasharray="12 24" opacity="0.4" />

  <!-- Inner solid ring with nice gradients -->
  <circle cx="512" cy="512" r="280" fill="none" stroke="url(#brand-grad)" stroke-width="18" filter="url(#glow)" opacity="0.85" />
  <circle cx="512" cy="512" r="280" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.2" />

  <!-- Symmetrical stylized vertical sound waves inside -->
  <g id="soundwave-bars" opacity="0.9">
    <!-- Bar 1 -->
    <rect x="342" y="412" width="24" height="200" rx="12" fill="url(#brand-grad)" />
    <!-- Bar 2 -->
    <rect x="392" y="312" width="24" height="400" rx="12" fill="url(#brand-grad)" />
    <!-- Bar 3 -->
    <rect x="442" y="212" width="24" height="600" rx="12" fill="url(#brand-grad)" />
    
    <!-- Center Spacer for the overlapping Play icon -->
    
    <!-- Bar 5 -->
    <rect x="558" y="212" width="24" height="600" rx="12" fill="url(#brand-grad)" />
    <!-- Bar 6 -->
    <rect x="608" y="312" width="24" height="400" rx="12" fill="url(#brand-grad)" />
    <!-- Bar 7 -->
    <rect x="658" y="412" width="24" height="200" rx="12" fill="url(#brand-grad)" />
  </g>

  <!-- Centered Futuristic Play / Stream Icon with glowing core -->
  <g transform="translate(512, 512)">
    <!-- Sleek, rounded Play button in the center -->
    <!-- Path representing a rounded triangle pointing right -->
    <path d="M -40 -90 L 90 0 L -40 90 Z" fill="#ffffff" filter="url(#glow)" />
    <path d="M -30 -70 L 70 0 L -30 70 Z" fill="url(#brand-grad)" />
    <circle cx="0" cy="0" r="16" fill="#ffffff" filter="url(#glow)" />
  </g>

  <!-- Elegant Brand Typography overlay at the bottom border of the circle -->
  <text x="512" y="870" font-family="'Inter', sans-serif" font-weight="800" font-size="44" fill="#ffffff" letter-spacing="16" text-anchor="middle" opacity="0.95">
    SOUNDSTREAM
  </text>
</svg>
`;

async function generateMasterLogo() {
  console.log("Generating high-resolution vector master logo...");
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  await sharp(Buffer.from(svgLogo))
    .jpeg({ quality: 100 })
    .toFile(targetPath);

  console.log("✅ Successfully created master logo at:", targetPath);
}

generateMasterLogo().catch(err => {
  console.error("❌ Failed to generate master logo:", err);
  process.exit(1);
});
