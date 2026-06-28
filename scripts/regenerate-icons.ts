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

async function generateIcons() {
  console.log("Starting launcher icon regeneration from:", sourceLogoPath);

  if (!fs.existsSync(sourceLogoPath)) {
    console.error("❌ Source logo file does not exist at:", sourceLogoPath);
    process.exit(1);
  }

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
    // The standard Android adaptive foreground is 108dp x 108dp.
    // Safe zone is the inner 72dp. So the logo itself should occupy ~66.7% of the total size.
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

  console.log("✨ All launcher icons successfully regenerated!");
}

generateIcons().catch(err => {
  console.error("❌ Icon generation failed:", err);
  process.exit(1);
});
