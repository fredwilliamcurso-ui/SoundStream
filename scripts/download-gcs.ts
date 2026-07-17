import * as fs from "fs";
import * as path from "path";
import * as https from "https";

// Helper to follow redirects and get final response or html
async function fetchUrl(url: string, headers: any = {}): Promise<{ status: number; contentType: string; headers: any; body: string; buffer?: Buffer }> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      const statusCode = res.statusCode || 0;
      
      if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
        // Handle redirect
        const nextUrl = res.headers.location.startsWith("http") 
          ? res.headers.location 
          : new URL(res.headers.location, url).toString();
        resolve(fetchUrl(nextUrl, headers));
        return;
      }

      const contentType = res.headers['content-type'] || '';
      
      if (contentType.includes("text/html")) {
        let body = "";
        res.on("data", (chunk) => { body += chunk.toString(); });
        res.on("end", () => {
          resolve({ status: statusCode, contentType, headers: res.headers, body });
        });
      } else {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => { chunks.push(chunk); });
        res.on("end", () => {
          resolve({ 
            status: statusCode, 
            contentType, 
            headers: res.headers, 
            body: "", 
            buffer: Buffer.concat(chunks) 
          });
        });
      }
    }).on("error", reject);
  });
}

async function main() {
  console.log("\n=========================================================================");
  console.log("📥 SOUNDSTREAMY APK GOOGLE DRIVE REAL RETRIEVAL PIPELINE");
  console.log("=========================================================================");

  const publicDir = path.join(process.cwd(), "public");
  const destPath = path.join(publicDir, "Soundstream.apk");

  // Ensure public directory exists
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const fileId = "1SPqh9sOUfMUU801udi-t4cUqvJmQpQsW";
  const initialUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  
  console.log(`Fetching APK binary from Google Drive (ID: ${fileId})...`);
  
  try {
    const initialRes = await fetchUrl(initialUrl);
    console.log(`Initial response: Status ${initialRes.status}, Content-Type: ${initialRes.contentType}`);

    if (initialRes.contentType.includes("text/html")) {
      console.log("Virus scan warning page detected. Extracting download form parameters...");
      const html = initialRes.body;
      
      // Parse action URL
      const actionMatch = html.match(/form id="download-form" action="([^"]+)"/);
      const actionUrl = actionMatch ? actionMatch[1] : "https://drive.usercontent.google.com/download";
      
      // Parse hidden inputs
      const inputs: Record<string, string> = {};
      const inputRegex = /<input[^>]+type="hidden"[^>]*>/gi;
      let match;
      while ((match = inputRegex.exec(html)) !== null) {
        const inputTag = match[0];
        const nameMatch = inputTag.match(/name="([^"]+)"/i);
        const valueMatch = inputTag.match(/value="([^"]+)"/i);
        if (nameMatch && valueMatch) {
          inputs[nameMatch[1]] = valueMatch[1];
        }
      }
      
      console.log("Extracted hidden input fields:", inputs);
      
      // Construct final URL
      const queryParams = Object.entries(inputs)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");
      
      const finalUrl = `${actionUrl}?${queryParams}`;
      console.log("Fetching final download stream...");
      
      const finalRes = await fetchUrl(finalUrl);
      if (finalRes.buffer) {
        fs.writeFileSync(destPath, finalRes.buffer);
        console.log(`\n✅ SUCCESS: Real APK downloaded and saved to disk!`);
        console.log(`   - Destination: ${destPath}`);
        console.log(`   - File Size: ${finalRes.buffer.length} bytes (~${(finalRes.buffer.length / (1024 * 1024)).toFixed(2)} MB)`);
      } else {
        throw new Error("Could not retrieve binary buffer from final direct link.");
      }
    } else if (initialRes.buffer) {
      fs.writeFileSync(destPath, initialRes.buffer);
      console.log(`\n✅ SUCCESS: Direct APK downloaded and saved to disk!`);
      console.log(`   - Destination: ${destPath}`);
      console.log(`   - File Size: ${initialRes.buffer.length} bytes`);
    } else {
      throw new Error("No download buffer or HTML response returned.");
    }
    console.log("=========================================================================\n");
  } catch (error: any) {
    console.error("❌ ERROR: Could not download the actual APK file from Google Drive:", error.message);
    process.exit(1);
  }
}

main();
