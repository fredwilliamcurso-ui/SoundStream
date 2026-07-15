import { GoogleGenAI } from "@google/genai";

async function main() {
  const token = process.env.GITHUB_PAT;
  const repo = "fredwilliamcurso-ui/SoundStream";
  
  if (!token) {
    console.error("No GITHUB_PAT token found in environment variables.");
    return;
  }

  console.log(`Querying GitHub API for repository: ${repo}...`);
  
  try {
    // 1. Get latest commits
    const commitsRes = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=1`, {
      headers: {
        "Authorization": `token ${token}`,
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "SoundStream-AI-Agent"
      }
    });

    if (!commitsRes.ok) {
      console.error(`Failed to fetch commits: ${commitsRes.status} ${commitsRes.statusText}`);
      const text = await commitsRes.text();
      console.error(text);
      return;
    }

    const commits = await commitsRes.json() as any[];
    if (commits.length === 0) {
      console.log("No commits found.");
      return;
    }

    const latestCommitSha = commits[0].sha;
    const latestCommitMsg = commits[0].commit.message;
    console.log(`Latest Commit: ${latestCommitSha.substring(0, 7)} - "${latestCommitMsg}"`);

    // 2. Get check runs for the latest commit
    console.log(`Fetching check runs for commit ${latestCommitSha.substring(0, 7)}...`);
    const checkRunsRes = await fetch(`https://api.github.com/repos/${repo}/commits/${latestCommitSha}/check-runs`, {
      headers: {
        "Authorization": `token ${token}`,
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "SoundStream-AI-Agent"
      }
    });

    if (checkRunsRes.ok) {
      const data = await checkRunsRes.json() as any;
      console.log(`Found ${data.total_count} check runs:`);
      for (const run of data.check_runs) {
        console.log(`- ${run.name}: status=${run.status}, conclusion=${run.conclusion}, html_url=${run.html_url}`);
        if (run.output) {
          console.log(`  Title: ${run.output.title}`);
          console.log(`  Summary: ${run.output.summary}`);
        }
      }
    } else {
      console.error(`Failed to fetch check runs: ${checkRunsRes.status}`);
    }

    // 3. Get statuses for the latest commit
    console.log(`Fetching statuses for commit ${latestCommitSha.substring(0, 7)}...`);
    const statusesRes = await fetch(`https://api.github.com/repos/${repo}/commits/${latestCommitSha}/status`, {
      headers: {
        "Authorization": `token ${token}`,
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "SoundStream-AI-Agent"
      }
    });

    if (statusesRes.ok) {
      const data = await statusesRes.json() as any;
      console.log(`State: ${data.state}. Found ${data.statuses?.length || 0} statuses:`);
      for (const st of (data.statuses || [])) {
        console.log(`- ${st.context}: state=${st.state}, desc=${st.description}, target_url=${st.target_url}`);
      }
    } else {
      console.error(`Failed to fetch statuses: ${statusesRes.status}`);
    }

    // 4. Get recent workflow runs
    console.log("Fetching recent actions/workflow runs...");
    const workflowRunsRes = await fetch(`https://api.github.com/repos/${repo}/actions/runs?per_page=3`, {
      headers: {
        "Authorization": `token ${token}`,
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "SoundStream-AI-Agent"
      }
    });

    if (workflowRunsRes.ok) {
      const data = await workflowRunsRes.json() as any;
      console.log(`Found ${data.total_count} workflow runs:`);
      for (const run of data.workflow_runs) {
        console.log(`- Workflow: "${run.name}" (#${run.run_number})`);
        console.log(`  Event: ${run.event}, Status: ${run.status}, Conclusion: ${run.conclusion}`);
        console.log(`  Created: ${run.created_at}, URL: ${run.html_url}`);
        if (run.conclusion === "failure") {
          console.log(`  Failed Job list / logs can be fetched from jobs_url: ${run.jobs_url}`);
          // Let's fetch jobs
          const jobsRes = await fetch(run.jobs_url, {
            headers: {
              "Authorization": `token ${token}`,
              "Accept": "application/vnd.github.v3+json",
              "User-Agent": "SoundStream-AI-Agent"
            }
          });
          if (jobsRes.ok) {
            const jobsData = await jobsRes.json() as any;
            for (const job of jobsData.jobs) {
              console.log(`    Job: "${job.name}" (ID: ${job.id}), status=${job.status}, conclusion=${job.conclusion}`);
              for (const step of job.steps) {
                console.log(`      Step: "${step.name}", status=${step.status}, conclusion=${step.conclusion}`);
              }
              if (job.conclusion === "failure") {
                console.log(`    Fetching logs for failed Job ID: ${job.id}...`);
                const logsRes = await fetch(`https://api.github.com/repos/${repo}/actions/jobs/${job.id}/logs`, {
                  headers: {
                    "Authorization": `token ${token}`,
                    "Accept": "application/vnd.github.v3+json",
                    "User-Agent": "SoundStream-AI-Agent"
                  }
                });
                if (logsRes.ok) {
                  const logText = await logsRes.text();
                  console.log("\n=========================================================================");
                  console.log("📝 FAILED JOB LOGS (LAST 100 LINES):");
                  console.log("=========================================================================");
                  const lines = logText.split("\n");
                  console.log(lines.slice(-100).join("\n"));
                  console.log("=========================================================================\n");
                } else {
                  console.error(`    Failed to fetch logs for job ${job.id}: ${logsRes.status}`);
                }
              }
            }
          }
        }
      }
    } else {
      console.error(`Failed to fetch workflow runs: ${workflowRunsRes.status}`);
    }

  } catch (err: any) {
    console.error("Error querying GitHub API:", err);
  }
}

main();
