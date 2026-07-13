import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";

const rootDir = process.cwd();
const sourceLogoPath = path.join(rootDir, "src/assets/images/soundstream_logo_1782150206757.jpg");
const srcPublicDir = path.join(rootDir, "src/public");
const destPublicDir = path.join(rootDir, "public");

const backgroundColor = { r: 18, g: 18, b: 20, alpha: 255 }; // #121214 (aesthetic dark space color)

async function main() {
  console.log("=========================================================================");
  console.log("🚀 STARTING WEB BRANDING ASSET GENERATION PIPELINE...");
  console.log("=========================================================================");

  // 1. Ensure root public folder exists
  if (!fs.existsSync(destPublicDir)) {
    console.log(`Creating public folder at: ${destPublicDir}`);
    fs.mkdirSync(destPublicDir, { recursive: true });
  }

  // 2. Copy sitemap, robots, manifest and AAB from src/public if they exist
  if (fs.existsSync(srcPublicDir)) {
    console.log(`\n📂 Copying base public configuration files from src/public to public...`);
    const filesToCopy = ["manifest.json", "robots.txt", "sitemap.xml", "app-release.aab"];
    for (const file of filesToCopy) {
      const srcFile = path.join(srcPublicDir, file);
      const destFile = path.join(destPublicDir, file);
      if (fs.existsSync(srcFile)) {
        console.log(`Copying ${file} -> public/${file}`);
        fs.copyFileSync(srcFile, destFile);
      } else {
        console.log(`⚠️ Warning: ${file} not found in src/public`);
      }
    }
  }

  // 3. Verify source logo exists
  if (!fs.existsSync(sourceLogoPath)) {
    console.error(`\n❌ ERROR: Source logo not found at: ${sourceLogoPath}`);
    process.exit(1);
  }
  console.log(`\n🎨 Verified source logo path: ${sourceLogoPath}`);

  // 4. Generate favicons and PWA icons
  console.log(`\n📦 Generating favicons and PWA icons...`);

  // A. Favicon 16x16
  const fav16Path = path.join(destPublicDir, "favicon-16x16.png");
  console.log(`Generating: favicon-16x16.png (16x16)`);
  await sharp(sourceLogoPath)
    .resize(16, 16)
    .png({ compressionLevel: 9 })
    .toFile(fav16Path);

  // B. Favicon 32x32
  const fav32Path = path.join(destPublicDir, "favicon-32x32.png");
  console.log(`Generating: favicon-32x32.png (32x32)`);
  await sharp(sourceLogoPath)
    .resize(32, 32)
    .png({ compressionLevel: 9 })
    .toFile(fav32Path);

  // C. Favicon.ico (We can save as 32x32 png, browsers accept PNG files under .ico naming)
  const favIcoPath = path.join(destPublicDir, "favicon.ico");
  console.log(`Generating: favicon.ico (32x32 PNG mapped)`);
  await sharp(sourceLogoPath)
    .resize(32, 32)
    .png({ compressionLevel: 9 })
    .toFile(favIcoPath);

  // D. Apple Touch Icon (180x180)
  const appleTouchPath = path.join(destPublicDir, "apple-touch-icon.png");
  console.log(`Generating: apple-touch-icon.png (180x180)`);
  await sharp(sourceLogoPath)
    .resize(180, 180)
    .png({ compressionLevel: 9 })
    .toFile(appleTouchPath);

  // E. Android Chrome 192x192
  const chrome192Path = path.join(destPublicDir, "android-chrome-192x192.png");
  console.log(`Generating: android-chrome-192x192.png (192x192)`);
  await sharp(sourceLogoPath)
    .resize(192, 192)
    .png({ compressionLevel: 9 })
    .toFile(chrome192Path);

  // F. Android Chrome 512x512
  const chrome512Path = path.join(destPublicDir, "android-chrome-512x512.png");
  console.log(`Generating: android-chrome-512x512.png (512x512)`);
  await sharp(sourceLogoPath)
    .resize(512, 512)
    .png({ compressionLevel: 9 })
    .toFile(chrome512Path);

  // G. Maskable Icon (512x512 with safe margin - 65% size centered on a solid color)
  const maskablePath = path.join(destPublicDir, "maskable-icon.png");
  const logoResizedForMaskable = await sharp(sourceLogoPath)
    .resize(332, 332)
    .toBuffer();

  console.log(`Generating: maskable-icon.png (512x512 with center logo and safe margins)`);
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: backgroundColor
    }
  })
    .composite([{
      input: logoResizedForMaskable,
      top: 90,
      left: 90
    }])
    .png({ compressionLevel: 9 })
    .toFile(maskablePath);

  // H. Beautiful Open Graph / Twitter social preview image (1200x630 with center logo and padding)
  const ogImagePath = path.join(destPublicDir, "og-image.png");
  const logoResizedForOg = await sharp(sourceLogoPath)
    .resize(360, 360)
    .toBuffer();

  console.log(`Generating: og-image.png (1200x630 branded social card)`);
  await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: backgroundColor
    }
  })
    .composite([{
      input: logoResizedForOg,
      top: 135,
      left: 420
    }])
    .png({ compressionLevel: 9 })
    .toFile(ogImagePath);

  console.log("\n=========================================================================");
  console.log("🎉 SUCCESS: ALL WEB BRANDING ASSETS COMPLETED!");
  console.log("=========================================================================");
}

main().catch(err => {
  console.error("❌ Branding asset generation pipeline failed:", err);
  process.exit(1);
});
