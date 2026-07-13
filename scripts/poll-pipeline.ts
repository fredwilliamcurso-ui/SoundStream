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

async function poll() {
  console.log("====================================================");
  console.log(`🔍 MONITORING PRODUCTION PIPELINES FOR COMMIT: ${commitSha.substring(0, 8)}`);
  console.log("====================================================\n");

  let attempts = 0;
  const maxAttempts = 50; // ~15-20 minutes

  while (attempts < maxAttempts) {
    attempts++;
    console.log(`[Attempt ${attempts}/${maxAttempts}] Fetching commit statuses from GitLab...`);

    try {
      const statuses = await apiCall(`/repository/commits/${commitSha}/statuses`);
      
      if (!Array.isArray(statuses)) {
        console.warn("⚠️ Received unexpected response format from GitLab API:", statuses);
      } else {
        const gitlabJob = statuses.find(s => s.name === "build_android");
        const codemagicJob = statuses.find(s => s.name?.includes("codemagic"));

        console.log("----------------------------------------------------");
        if (gitlabJob) {
          console.log(`GitLab Build Job [build_android]: ${gitlabJob.status.toUpperCase()}`);
        } else {
          console.log(`GitLab Build Job [build_android]: NOT STARTED YET`);
        }

        if (codemagicJob) {
          console.log(`Codemagic Build Job [${codemagicJob.name}]: ${codemagicJob.status.toUpperCase()}`);
          if (codemagicJob.target_url) {
            console.log(`👉 Codemagic URL: ${codemagicJob.target_url}`);
          }
        } else {
          console.log(`Codemagic Build Job: WAITING TO TRIGGER`);
        }
        console.log("----------------------------------------------------");

        const gitlabDone = gitlabJob && (gitlabJob.status === "success" || gitlabJob.status === "failed" || gitlabJob.status === "canceled");
        const codemagicDone = codemagicJob && (codemagicJob.status === "success" || codemagicJob.status === "failed" || codemagicJob.status === "canceled");

        if (gitlabDone && codemagicDone) {
          const gitlabSuccess = gitlabJob.status === "success";
          const codemagicSuccess = codemagicJob.status === "success";

          if (gitlabSuccess && codemagicSuccess) {
            console.log("\n🎉 SUCCESS: Both GitLab and Codemagic pipelines completed successfully!");
            process.exit(0);
          } else {
            console.error("\n❌ FAILURE: One or both pipelines failed.");
            process.exit(1);
          }
        }
      }
    } catch (err: any) {
      console.error("⚠️ Error while polling:", err.message);
    }

    // Sleep for 20 seconds
    await new Promise(resolve => setTimeout(resolve, 20000));
  }

  console.error("❌ TIMEOUT: Pipeline monitoring timed out after maximum attempts.");
  process.exit(1);
}

poll().catch(e => {
  console.error("Unhandled error in polling script:", e);
  process.exit(1);
});
