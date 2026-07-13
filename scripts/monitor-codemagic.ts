import { execSync } from "child_process";
import https from "https";

const gitlabPat = process.env.GITLAB_PAT;
const commitSha = execSync("git rev-parse HEAD").toString().trim();
const projectId = "83860265";

if (!gitlabPat) {
  console.error("❌ GITLAB_PAT env variable is missing!");
  process.exit(1);
}

function apiCall(endpoint: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "gitlab.com",
      path: `/api/v4/projects/${projectId}${endpoint}`,
      method: "GET",
      headers: {
        "PRIVATE-TOKEN": gitlabPat,
        "User-Agent": "NodeJS-App"
      }
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on("error", (err) => reject(err));
    req.end();
  });
}

async function monitor() {
  console.log("====================================================");
  console.log(`🔍 CODEMAGIC PIPELINE MONITOR FOR COMMIT: ${commitSha.substring(0, 8)}`);
  console.log("====================================================\n");

  let attempts = 0;
  const maxAttempts = 60; // 30 minutes total

  while (attempts < maxAttempts) {
    attempts++;
    console.log(`[${new Date().toLocaleTimeString()}] Attempt ${attempts}/${maxAttempts}: Fetching commit statuses...`);

    try {
      const statuses = await apiCall(`/repository/commits/${commitSha}/statuses`);
      
      if (!Array.isArray(statuses)) {
        console.warn("⚠️ Received unexpected response format from GitLab API:", statuses);
      } else {
        const codemagicJob = statuses.find(s => s.name?.toLowerCase().includes("codemagic"));

        if (codemagicJob) {
          console.log(`----------------------------------------------------`);
          console.log(`✅ CODEMAGIC DETECTED!`);
          console.log(`Job Name:   ${codemagicJob.name}`);
          console.log(`Status:     ${codemagicJob.status.toUpperCase()}`);
          if (codemagicJob.target_url) {
            console.log(`Build URL:  ${codemagicJob.target_url}`);
          }
          if (codemagicJob.description) {
            console.log(`Details:    ${codemagicJob.description}`);
          }
          console.log(`----------------------------------------------------`);

          if (codemagicJob.status === "success") {
            console.log("\n🎉 SUCCESS: Codemagic build completed successfully!");
            process.exit(0);
          } else if (codemagicJob.status === "failed") {
            console.error("\n❌ FAILURE: Codemagic build failed.");
            process.exit(1);
          } else if (codemagicJob.status === "canceled") {
            console.error("\n❌ CANCELED: Codemagic build was canceled.");
            process.exit(1);
          }
        } else {
          console.log("⌛ Codemagic Job: WAITING TO TRIGGER (not registered on GitLab yet)...");
        }
      }
    } catch (err: any) {
      console.error("⚠️ Error while polling:", err.message);
    }

    // Sleep for 30 seconds
    await new Promise(resolve => setTimeout(resolve, 30000));
  }

  console.error("❌ TIMEOUT: Codemagic monitoring timed out.");
  process.exit(1);
}

monitor().catch(e => {
  console.error("Unhandled error in monitor script:", e);
  process.exit(1);
});
