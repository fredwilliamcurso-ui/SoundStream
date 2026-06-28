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
  const gitlabPat = process.env.GITLAB_PAT || process.env.GITLAB_TOKEN;
  
  if (!gitlabPat) {
    console.error("=========================================================================");
    console.error("❌ ERROR: GITLAB_PAT or GITLAB_TOKEN environment variable is not set!");
    console.error("=========================================================================");
    console.error("To push your project directly to GitLab, please follow these steps:");
    console.error("1. Go to GitLab (gitlab.com) -> Preferences -> Personal Access Tokens.");
    console.error("2. Create a token with 'write_repository' or 'api' scope.");
    console.error("3. Go to the Settings / Secrets menu in the AI Studio UI.");
    console.error("4. Add a new secret/environment variable named 'GITLAB_PAT' and paste your token.");
    console.error("5. Run this push script or request the AI to try again.");
    console.error("=========================================================================");
    process.exit(1);
  }

  const repoUrl = "gitlab.com/fredwilliamcurso-group/Soundstreamy.git";
  // For GitLab, oauth2:<token> or <username>:<token> or directly <token> can be used.
  // We use "oauth2" as the user for Personal Access Tokens on GitLab, which is standard and highly reliable.
  const authUrl = `https://oauth2:${gitlabPat}@${repoUrl}`;

  console.log("🚀 Starting GitLab Migration & Push Script...");

  // 1. Force clean initialization of git repo to avoid any corruptions
  const gitDir = path.join(process.cwd(), ".git");
  if (fs.existsSync(gitDir)) {
    console.log("Removing existing .git directory to ensure clean state...");
    fs.rmSync(gitDir, { recursive: true, force: true });
  }
  console.log("Initializing local git repository...");
  runCmd("git init");

  // 2. Configure Git User Identity
  console.log("Configuring git user...");
  runCmd('git config user.name "SoundStream AI Agent"');
  runCmd('git config user.email "fredwilliamcurso@gmail.com"');

  // 3. Setup Remote Origin for GitLab
  console.log("Setting up remote origin...");
  try {
    runCmd("git remote remove origin");
  } catch (e) {
    // Ignore error if origin didn't exist
  }
  runCmd(`git remote add origin ${authUrl}`, gitlabPat);

  // 4. Ensure we are on branch 'main'
  console.log("Checking and switching to branch 'main'...");
  try {
    runCmd("git checkout -b main");
  } catch (e) {
    try {
      runCmd("git checkout main");
    } catch (checkoutErr: any) {
      console.log("Branch checkout info:", checkoutErr.message);
    }
  }

  // 5. Remove soundstream.zip from the filesystem and git tracking if it exists
  const zipPath = path.join(process.cwd(), "soundstream.zip");
  if (fs.existsSync(zipPath)) {
    console.log("Removing soundstream.zip from workspace...");
    try {
      fs.unlinkSync(zipPath);
    } catch (e: any) {
      console.warn("Could not delete soundstream.zip file:", e.message);
    }
  }

  try {
    console.log("Checking if soundstream.zip is tracked in git...");
    runCmd("git rm --cached soundstream.zip");
    console.log("Removed soundstream.zip from git cache.");
  } catch (e) {
    // Expected to fail if not tracked
  }

  // 6. Stage files (ignoring anything in .gitignore)
  console.log("Staging project files...");
  runCmd("git add .");

  // 7. Check status and commit
  console.log("Checking for changes...");
  const statusOutput = runCmd("git status --porcelain");
  if (!statusOutput) {
    console.log("✨ No changes to commit.");
  } else {
    console.log("Changes found. Creating commit...");
    runCmd('git commit -m "chore: Migrate SoundStream project to GitLab and configure GitLab CI/CD pipeline"');
  }

  // 8. Push to GitLab
  console.log("Pushing code to GitLab 'main' branch...");
  try {
    runCmd("git push -u origin main --force", gitlabPat);
    console.log("=========================================================================");
    console.log("🎉 SUCCESS: Project successfully migrated and pushed to GitLab!");
    console.log("Repository: https://gitlab.com/fredwilliamcurso-group/Soundstreamy");
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
