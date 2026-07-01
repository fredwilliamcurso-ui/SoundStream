import https from "https";

async function apiCall(token: string, endpoint: string) {
  return new Promise<{ status: number; body: any }>((resolve, reject) => {
    const options = {
      hostname: "gitlab.com",
      path: "/api/v4" + endpoint,
      method: "GET",
      headers: {
        "User-Agent": "NodeJS-App",
        "PRIVATE-TOKEN": token
      }
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode || 0, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode || 0, body: data });
        }
      });
    });

    req.on("error", (err) => reject(err));
    req.end();
  });
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const token = process.env.GITLAB_PAT;
  if (!token) {
    console.error("No GITLAB_PAT environment variable found!");
    process.exit(1);
  }

  const sha = "310acc61a263eb3fa880b55fd9d254151900d281";
  const projectPath = "fredwilliamcurso-group%2FSoundstreamy";
  const statusesEndpoint = `/projects/${projectPath}/repository/commits/${sha}/statuses`;

  console.log(`========================================================`);
  console.log(`🚀 MONITORING CODEMAGIC BUILD FOR SHA ${sha.slice(0, 8)}`);
  console.log(`========================================================`);

  const startTime = Date.now();
  const maxDuration = 15 * 60 * 1000; // 15 minutes max
  let completed = false;

  while (Date.now() - startTime < maxDuration) {
    try {
      const response = await apiCall(token, statusesEndpoint);
      if (response.status !== 200) {
        console.warn(`[${new Date().toLocaleTimeString()}] Warning: Status code ${response.status} from GitLab API.`);
        await delay(20000);
        continue;
      }

      const statuses = response.body;
      const codemagicStatusObj = statuses.find((s: any) => s.name.includes("codemagic"));

      if (!codemagicStatusObj) {
        console.log(`[${new Date().toLocaleTimeString()}] Codemagic status not registered yet. Waiting...`);
      } else {
        const status = codemagicStatusObj.status;
        const targetUrl = codemagicStatusObj.target_url;
        console.log(`[${new Date().toLocaleTimeString()}] Codemagic Build Status: ${status.toUpperCase()}`);
        console.log(`Build Link: ${targetUrl}`);

        if (status === "success" || status === "failed") {
          console.log(`\n========================================================`);
          console.log(`🎉 BUILD COMPLETED! Final Status: ${status.toUpperCase()}`);
          console.log(`========================================================`);
          completed = true;
          break;
        }
      }
    } catch (err: any) {
      console.error(`[${new Date().toLocaleTimeString()}] API Call failed: ${err.message}`);
    }

    // Wait 20 seconds before the next check
    await delay(20000);
  }

  if (!completed) {
    console.log("❌ Monitoring timeout reached or terminated.");
  }
}

main();
