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

async function main() {
  const token = process.env.GITLAB_PAT;
  if (!token) {
    console.error("No GITLAB_PAT environment variable found!");
    process.exit(1);
  }

  const projectPath = "fredwilliamcurso-group%2FSoundstreamy";
  const commitsEndpoint = `/projects/${projectPath}/repository/commits?per_page=5`;

  console.log("Fetching recent commits...");
  try {
    const resCommits = await apiCall(token, commitsEndpoint);
    if (resCommits.status !== 200) {
      console.error(`Failed to fetch commits: status ${resCommits.status}`);
      process.exit(1);
    }

    const commits = resCommits.body;
    for (const commit of commits) {
      console.log(`\nCommit: ${commit.id.slice(0, 8)} - ${commit.title}`);
      const statusesEndpoint = `/projects/${projectPath}/repository/commits/${commit.id}/statuses`;
      const resStatuses = await apiCall(token, statusesEndpoint);
      if (resStatuses.status === 200) {
        const statuses = resStatuses.body;
        console.log(`Statuses found: ${statuses.length}`);
        statuses.forEach((s: any) => {
          console.log(`  Name: ${s.name}, Status: ${s.status}, Target URL: ${s.target_url}`);
        });
      }
    }
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

main();
