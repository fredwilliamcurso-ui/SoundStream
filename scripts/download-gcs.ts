import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

async function main() {
  console.log("\n=========================================================================");
  console.log("📥 SOUNDSTREAMY APK GOOGLE DRIVE RETRIEVAL PIPELINE");
  console.log("=========================================================================");

  const driveUrl = "https://drive.google.com/uc?export=download&id=1_GP6y3A-B_r4SLy3VoLchdrGkeTZAoAI";
  const publicDir = path.join(process.cwd(), "public");
  const destPath = path.join(publicDir, "Soundstream.apk");

  // Ensure public directory exists
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  console.log(`Step 1: Contacting Google Drive landing page...`);
  console.log(`URL: ${driveUrl}\n`);

  try {
    const res = await fetch(driveUrl);
    const text = await res.text();

    if (!res.ok) {
      console.error(`❌ HTTP Error contacting landing page:`);
      console.error(`Status: ${res.status} ${res.statusText}`);
      console.error(`Response Body Sample: ${text.substring(0, 1000)}`);
      throw new Error(`Failed to contact Google Drive landing page (HTTP ${res.status})`);
    }

    // Extract cookies from response headers to preserve session context
    const setCookieHeaders = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    
    // Extract hidden inputs for form-based warning bypass
    const uuidRegex = /name="uuid"\s+value="([^"]+)"/;
    const uuidMatch = text.match(uuidRegex);
    const uuid = uuidMatch ? uuidMatch[1] : null;

    const confirmRegex = /name="confirm"\s+value="([^"]+)"/;
    const confirmMatch = text.match(confirmRegex);
    const confirm = confirmMatch ? confirmMatch[1] : "t";

    if (!uuid) {
      console.error(`❌ Error parsing Google Drive confirmation inputs.`);
      console.error(`Landing page status: ${res.status}`);
      console.error(`First 1000 characters of HTML response:`);
      console.error(text.substring(0, 1000));
      throw new Error("Could not extract confirmation UUID from Google Drive download page.");
    }

    console.log(`Step 2: Extracted security context successfully.`);
    console.log(`- Extracted UUID: ${uuid}`);
    console.log(`- Extracted Confirm Token: ${confirm}`);

    // Construct download URL
    const downloadUrl = `https://drive.usercontent.google.com/download?id=1_GP6y3A-B_r4SLy3VoLchdrGkeTZAoAI&export=download&confirm=${confirm}&uuid=${uuid}`;
    console.log(`\nStep 3: Fetching actual APK file from:`);
    console.log(`URL: ${downloadUrl}`);

    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };
    
    if (setCookieHeaders.length > 0) {
      headers["Cookie"] = setCookieHeaders.map(c => c.split(";")[0]).join("; ");
    }

    const downloadRes = await fetch(downloadUrl, { headers });
    
    if (!downloadRes.ok) {
      const errorText = await downloadRes.text();
      console.error(`❌ HTTP Error downloading APK:`);
      console.error(`Status: ${downloadRes.status} ${downloadRes.statusText}`);
      console.error(`Response Body: ${errorText.substring(0, 1000)}`);
      throw new Error(`Failed to download APK from Google Drive (HTTP ${downloadRes.status})`);
    }

    const arrayBuffer = await downloadRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save download to destination
    fs.writeFileSync(destPath, buffer);

    const stats = fs.statSync(destPath);

    // Assert that the file is not empty or a text warning
    if (stats.size < 1000) {
      const content = buffer.toString("utf8").substring(0, 500);
      throw new Error(`Downloaded file size is too small (${stats.size} bytes). Content: ${content}`);
    }

    // Verify ZIP magic bytes (APK files are standard ZIPs and start with "PK\x03\x04" or 504b0304 hex)
    const headerHex = buffer.subarray(0, 4).toString("hex");
    const isZipFormat = headerHex === "504b0304";
    if (!isZipFormat) {
      const sampleText = buffer.toString("utf8", 0, Math.min(buffer.length, 1000));
      throw new Error(
        `Downloaded file does not start with valid ZIP/APK magic bytes (expected 504b0304, got ${headerHex}). It is not a valid APK binary. Sample content:\n${sampleText}`
      );
    }

    // Compute SHA-256 Checksum
    const hashSum = crypto.createHash("sha256");
    hashSum.update(buffer);
    const sha256 = hashSum.digest("hex");

    console.log(`\n✅ SUCCESS: APK retrieved and verified successfully!`);
    console.log(`   - Destination Path: ${destPath}`);
    console.log(`   - Size:             ${stats.size} bytes (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`   - Format Check:     Passed (Valid ZIP/APK magic signature PK\\x03\\x04)`);
    console.log(`   - SHA-256 Checksum: ${sha256}`);
    console.log("=========================================================================\n");

  } catch (error: any) {
    console.log("=========================================================================");
    console.log("❌ FATAL: BUILD REJECTED DUE TO APK DOWNLOAD OR INTEGRITY FAILURE");
    console.log("=========================================================================");
    console.log(`Reason: ${error.message}`);
    console.log("\nThe build has failed intentionally to prevent deploying a broken or missing APK file.");
    console.log("=========================================================================\n");
    process.exit(1);
  }
}

main();
