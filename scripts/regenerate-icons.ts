import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";

const sourceLogoPath = path.join(process.cwd(), "src/assets/images/soundstream_logo_1782150206757.jpg");
const resDir = path.join(process.cwd(), "android/app/src/main/res");

const densities = [
  { name: "mdpi", scale: 1.0, iconSize: 48, fgSize: 108 },
  { name: "hdpi", scale: 1.5, iconSize: 72, fgSize: 162 },
  { name: "xhdpi", scale: 2.0, iconSize: 96, fgSize: 216 },
  { name: "xxhdpi", scale: 3.0, iconSize: 144, fgSize: 324 },
  { name: "xxxhdpi", scale: 4.0, iconSize: 192, fgSize: 432 }
];

const splashScreens = [
  { dir: "drawable", width: 1080, height: 1920 },
  { dir: "drawable-land-hdpi", width: 800, height: 480 },
  { dir: "drawable-land-mdpi", width: 480, height: 320 },
  { dir: "drawable-land-xhdpi", width: 1280, height: 720 },
  { dir: "drawable-land-xxhdpi", width: 1920, height: 1080 },
  { dir: "drawable-land-xxxhdpi", width: 2560, height: 1440 },
  { dir: "drawable-port-hdpi", width: 480, height: 800 },
  { dir: "drawable-port-mdpi", width: 320, height: 480 },
  { dir: "drawable-port-xhdpi", width: 720, height: 1280 },
  { dir: "drawable-port-xxhdpi", width: 1080, height: 1920 },
  { dir: "drawable-port-xxxhdpi", width: 1440, height: 2560 }
];

const backgroundColor = { r: 18, g: 18, b: 20, alpha: 255 }; // #121214 (aesthetic dark space color)

async function generateIconsAndSplashes() {
  console.log("Starting launcher icon and splash screen regeneration from:", sourceLogoPath);

  if (!fs.existsSync(sourceLogoPath)) {
    console.error("❌ Source logo file does not exist at:", sourceLogoPath);
    process.exit(1);
  }

  // 1. Generate Icons
  for (const density of densities) {
    const dirPath = path.join(resDir, `mipmap-${density.name}`);
    if (!fs.existsSync(dirPath)) {
      console.log(`Creating directory: ${dirPath}`);
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // 1. Legacy Square Launcher Icon: ic_launcher.png
    const legacyPath = path.join(dirPath, "ic_launcher.png");
    console.log(`Generating: ${legacyPath} (${density.iconSize}x${density.iconSize})`);
    await sharp(sourceLogoPath)
      .resize(density.iconSize, density.iconSize)
      .png({ compressionLevel: 9, quality: 100 })
      .toFile(legacyPath);

    // 2. Legacy Round Launcher Icon: ic_launcher_round.png
    const roundPath = path.join(dirPath, "ic_launcher_round.png");
    console.log(`Generating: ${roundPath} (${density.iconSize}x${density.iconSize})`);
    const radius = density.iconSize / 2;
    const circleSvg = `<svg><circle cx="${radius}" cy="${radius}" r="${radius}" fill="white" /></svg>`;
    const circleBuffer = Buffer.from(circleSvg);

    const logoResizedForRound = await sharp(sourceLogoPath)
      .resize(density.iconSize, density.iconSize)
      .toBuffer();

    await sharp(logoResizedForRound)
      .composite([{ input: circleBuffer, blend: "dest-in" }])
      .png({ compressionLevel: 9, quality: 100 })
      .toFile(roundPath);

    // 3. Adaptive Foreground Launcher Icon: ic_launcher_foreground.png
    const fgPath = path.join(dirPath, "ic_launcher_foreground.png");
    const logoSize = Math.round(density.fgSize * 0.667);
    console.log(`Generating: ${fgPath} (${density.fgSize}x${density.fgSize}, logo centered at ${logoSize}x${logoSize})`);

    const logoResizedForFg = await sharp(sourceLogoPath)
      .resize(logoSize, logoSize)
      .toBuffer();

    await sharp({
      create: {
        width: density.fgSize,
        height: density.fgSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([{
        input: logoResizedForFg,
        top: Math.round((density.fgSize - logoSize) / 2),
        left: Math.round((density.fgSize - logoSize) / 2)
      }])
      .png({ compressionLevel: 9, quality: 100 })
      .toFile(fgPath);
  }

  // 2. Generate Splash Screens
  for (const splash of splashScreens) {
    const dirPath = path.join(resDir, splash.dir);
    if (!fs.existsSync(dirPath)) {
      console.log(`Creating directory: ${dirPath}`);
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const splashPath = path.join(dirPath, "splash.png");
    const minDim = Math.min(splash.width, splash.height);
    const logoSize = Math.round(minDim * 0.35); // 35% safe centered logo size
    
    console.log(`Generating Splash: ${splashPath} (${splash.width}x${splash.height}), Logo Size: ${logoSize}x${logoSize}`);
    
    const logoResized = await sharp(sourceLogoPath)
      .resize(logoSize, logoSize)
      .toBuffer();

    await sharp({
      create: {
        width: splash.width,
        height: splash.height,
        channels: 4,
        background: backgroundColor
      }
    })
      .composite([{
        input: logoResized,
        top: Math.round((splash.height - logoSize) / 2),
        left: Math.round((splash.width - logoSize) / 2)
      }])
      .png({ compressionLevel: 9 })
      .toFile(splashPath);
  }

  console.log("✨ All launcher icons and splash screens successfully regenerated!");
}

generateIconsAndSplashes().catch(err => {
  console.error("❌ Icon and splash regeneration failed:", err);
  process.exit(1);
});
