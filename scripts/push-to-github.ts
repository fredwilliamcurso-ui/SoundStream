import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

function runCmd(cmd: string, hideInLogs: string | null = null) {
  const logCmd = hideInLogs ? cmd.replace(hideInLogs, "********") : cmd;
  console.log(`Executing: ${logCmd}`);
  try {
    const output = execSync(cmd, {
      stdio: "pipe",
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" }
    });
    return output.toString().trim();
  } catch (error: any) {
    const errMsg = error.stderr ? error.stderr.toString().trim() : error.message;
    const cleanErrMsg = hideInLogs ? errMsg.replace(hideInLogs, "********") : errMsg;
    throw new Error(`Command failed: ${cleanErrMsg}`);
  }
}

async function main() {
  const githubPat = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN;
  
  if (!githubPat) {
    console.error("=========================================================================");
    console.error("❌ ERROR: GITHUB_PAT or GITHUB_TOKEN environment variable is not set!");
    console.error("=========================================================================");
    console.error("To push your project directly to GitHub, please follow these steps:");
    console.error("1. Generate a Personal Access Token (PAT) with 'repo' permissions on GitHub.");
    console.error("2. Go to the Settings / Secrets menu in the AI Studio UI.");
    console.error("3. Add a new secret/environment variable named 'GITHUB_PAT' and paste your token.");
    console.error("4. Run this script again.");
    console.error("=========================================================================");
    process.exit(1);
  }

  const repoUrl = "github.com/fredwilliamcurso-ui/SoundStream.git";
  const authUrl = `https://${githubPat}@${repoUrl}`;

  console.log("🚀 Starting GitHub Push Script...");

  // 1. Initialize git repo if not exists
  if (!fs.existsSync(path.join(process.cwd(), ".git"))) {
    console.log("Initializing local git repository...");
    runCmd("git init");
  } else {
    console.log("Local git repository already initialized.");
  }

  // 2. Configure Git User Identity
  console.log("Configuring git user...");
  runCmd('git config user.name "SoundStream AI Agent"');
  runCmd('git config user.email "fredwilliamcurso@gmail.com"');

  // 3. Setup Remote Origin
  console.log("Setting up remote origin...");
  try {
    runCmd("git remote remove origin");
  } catch (e) {
    // Ignore error if origin didn't exist
  }
  runCmd(`git remote add origin ${authUrl}`, githubPat);

  // 4. Ensure we are on branch 'main'
  console.log("Checking and switching to branch 'main'...");
  try {
    runCmd("git checkout -B main");
  } catch (checkoutErr: any) {
    console.log("Branch checkout info:", checkoutErr.message);
  }

  // 5. Stage files (ignoring anything in .gitignore)
  console.log("Staging project files...");
  runCmd("git add .");

  // 6. Check status and commit
  console.log("Checking for changes...");
  const statusOutput = runCmd("git status --porcelain");
  if (!statusOutput) {
    console.log("✨ No changes to commit.");
  } else {
    console.log("Changes found. Creating commit...");
    const msg = process.env.COMMIT_MESSAGE || "fix: Add AdMob APPLICATION_ID metadata in AndroidManifest to prevent native startup crash";
    runCmd(`git commit -m "${msg}"`);
  }

  // 7. Push to GitHub
  console.log("Pushing code to GitHub 'main' branch...");
  try {
    runCmd("git push -u origin main --force", githubPat);
    console.log("=========================================================================");
    console.log("🎉 SUCCESS: Project successfully pushed to GitHub!");
    console.log("Repository: https://github.com/fredwilliamcurso-ui/SoundStream");
    console.log("Branch: main");
    console.log("=========================================================================");
  } catch (pushError: any) {
    console.error("❌ Push failed:", pushError.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unhandled rejection:", err);
  process.exit(1);
});
