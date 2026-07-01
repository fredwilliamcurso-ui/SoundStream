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

async function apiCallRaw(token: string, endpoint: string) {
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
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
        resolve({ status: res.statusCode || 0, body: data });
      });
    });

    req.on("error", (err) => reject(err));
    req.end();
  });
}

async function main() {
  const token = process.env.GITLAB_PAT;
  if (!token) {
    console.error("No GITLAB_PAT environment variable found!");
    process.exit(1);
  }

  const pipelineId = "2642256943";
  const projectPath = "fredwilliamcurso-group%2FSoundstreamy";
  const jobsEndpoint = `/projects/${projectPath}/pipelines/${pipelineId}/jobs`;

  console.log(`Fetching jobs for pipeline ${pipelineId}...`);
  try {
    const response = await apiCall(token, jobsEndpoint);
    if (response.status !== 200) {
      console.error(`Failed to fetch jobs: status ${response.status}`);
      console.log(response.body);
      process.exit(1);
    }

    const jobs = response.body;
    console.log(`Found ${jobs.length} job(s) in pipeline.`);
    for (const job of jobs) {
      console.log(`Job ID: ${job.id}, Name: ${job.name}, Status: ${job.status}`);
      if (job.status === "failed") {
        console.log(`\n--- Fetching logs for failed job ${job.id} ---`);
        const traceEndpoint = `/projects/${projectPath}/jobs/${job.id}/trace`;
        const logRes = await apiCallRaw(token, traceEndpoint);
        console.log("Log Res status:", logRes.status);
        console.log("\n--- Log Output ---");
        console.log(logRes.body.slice(-2000)); // Show last 2000 chars
      }
    }
  } catch (err: any) {
    console.error("API call error:", err.message);
  }
}

main();
