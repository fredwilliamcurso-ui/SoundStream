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
  const gitlabPat = process.env.GITLAB_PAT;
  
  if (!gitlabPat) {
    console.error("=========================================================================");
    console.error("❌ ERROR: GITLAB_PAT environment variable is not set!");
    console.error("=========================================================================");
    console.error("To push your project directly to GitLab, please follow these steps:");
    console.error("1. Generate a Personal Access Token (PAT) with 'write_repository' scope on GitLab.");
    console.error("2. Go to the Settings / Secrets menu in the AI Studio UI.");
    console.error("3. Add a new secret/environment variable named 'GITLAB_PAT' and paste your token.");
    console.error("4. Run this script again.");
    console.error("=========================================================================");
    process.exit(1);
  }

  // Allow setting custom gitlab repo path or default to fredwilliamcurso-group/Soundstreamy
  const repoPath = process.env.GITLAB_REPO_PATH || "fredwilliamcurso-group/Soundstreamy";
  const authUrl = `https://oauth2:${gitlabPat}@gitlab.com/${repoPath}.git`;

  console.log(`🚀 Starting GitLab Push Script to ${repoPath}...`);

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

  // 3. Setup Remote Origin for GitLab
  console.log("Setting up remote origin for GitLab...");
  try {
    runCmd("git remote remove origin");
  } catch (e) {
    // Ignore error if origin didn't exist
  }
  runCmd(`git remote add origin ${authUrl}`, gitlabPat);

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
    runCmd('git commit -m "chore: Restore project to yesterday\'s stable commit and integrate Audiomark production Android build baseline"');
  }

  // 7. Push to GitLab
  console.log("Pushing code to GitLab 'main' branch...");
  try {
    runCmd("git push -u origin main --force", gitlabPat);
    console.log("=========================================================================");
    console.log("🎉 SUCCESS: Project successfully pushed to GitLab!");
    console.log(`Repository: https://gitlab.com/${repoPath}`);
    console.log("Branch: main");
    console.log("=========================================================================");
  } catch (pushError: any) {
    console.error("❌ Push failed:", pushError.message);
    console.error("-------------------------------------------------------------------------");
    console.error("💡 Trouble-shooting Tips for Fine-Grained Personal Access Tokens (PAT):");
    console.error("- The token you configured is a Fine-Grained PAT, which is locked to specific projects/scopes on GitLab.");
    console.error("- To push successfully to 'fredwilliamcurso-group/Soundstreamy', you must make sure that:");
    console.error("  1. In GitLab under User Settings -> Access Tokens, your token is granted access to the group/project.");
    console.error("  2. The token MUST have both '[Code: Download]' (read) and '[Code: Push]' (write) project permissions enabled.");
    console.error("  3. Make sure the token's role has permission to push to the protected 'main' branch.");
    console.error("- Or, you can generate a classic Personal Access Token with 'write_repository' and 'read_repository' scopes.");
    console.error("=========================================================================");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unhandled rejection:", err);
  process.exit(1);
});
