async function main() {
  const token = process.env.GITHUB_PAT;
  const repo = "fredwilliamcurso-ui/SoundStream";
  
  if (!token) {
    console.error("No GITHUB_PAT token found.");
    return;
  }

  // Poll for up to 3 minutes (18 * 10 seconds)
  for (let i = 0; i < 18; i++) {
    console.log(`\nPolling workflow run status (attempt ${i + 1}/18)...`);
    try {
      const res = await fetch(`https://api.github.com/repos/${repo}/actions/runs?per_page=1`, {
        headers: {
          "Authorization": `token ${token}`,
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "SoundStream-AI-Agent"
        }
      });
      
      if (!res.ok) {
        console.error(`Failed to fetch runs: ${res.status}`);
        continue;
      }

      const data = await res.json() as any;
      const run = data.workflow_runs[0];
      console.log(`- Run #${run.run_number}: status=${run.status}, conclusion=${run.conclusion}`);
      
      const jobsRes = await fetch(run.jobs_url, {
        headers: {
          "Authorization": `token ${token}`,
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "SoundStream-AI-Agent"
        }
      });

      if (jobsRes.ok) {
        const jobsData = await jobsRes.json() as any;
        const job = jobsData.jobs[0];
        if (job) {
          console.log(`  Current Job: "${job.name}", status=${job.status}, conclusion=${job.conclusion}`);
          for (const step of job.steps) {
            if (step.status !== "queued") {
              console.log(`    - Step "${step.name}": status=${step.status}, conclusion=${step.conclusion}`);
            }
          }
        }
      }

      if (run.status === "completed") {
        console.log(`\n=========================================================================`);
        console.log(`🎉 Workflow Run #${run.run_number} finished with conclusion: ${run.conclusion.toUpperCase()}`);
        console.log(`=========================================================================\n`);
        
        if (run.conclusion === "failure" && jobsRes.ok) {
          const jobsData = await jobsRes.json() as any;
          const failedJob = jobsData.jobs.find((j: any) => j.conclusion === "failure");
          if (failedJob) {
            console.log(`Fetching logs for failed Job: ${failedJob.name}...`);
            const logsRes = await fetch(`https://api.github.com/repos/${repo}/actions/jobs/${failedJob.id}/logs`, {
              headers: {
                "Authorization": `token ${token}`,
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "SoundStream-AI-Agent"
              }
            });
            if (logsRes.ok) {
              const text = await logsRes.text();
              const lines = text.split("\n");
              console.log("📝 FAILED LOGS:\n", lines.slice(-40).join("\n"));
            }
          }
        }
        break;
      }
    } catch (err: any) {
      console.error("Error during polling:", err.message);
    }
    
    // Wait 10 seconds between polls
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
}

main().catch(console.error);
