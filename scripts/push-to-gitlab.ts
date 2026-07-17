import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import https from "https";

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

function apiCall(method: "GET" | "POST", endpoint: string, body?: any, token?: string) {
  return new Promise<{ status: number; body: any }>((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : "";
    const options = {
      hostname: "gitlab.com",
      path: "/api/v4" + endpoint,
      method: method,
      headers: {
        "User-Agent": "NodeJS-App",
        ...(token ? { "PRIVATE-TOKEN": token } : {}),
        ...(body ? {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData)
        } : {})
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
    if (body) {
      req.write(postData);
    }
    req.end();
  });
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

  // 1. Validate Token First
  console.log("Checking token validity with GitLab...");
  try {
    const tokenCheck = await apiCall("GET", "/personal_access_tokens/self", null, gitlabPat);
    if (tokenCheck.status !== 200) {
      console.error("=========================================================================");
      console.error(`❌ ERROR: Provided GITLAB_PAT token is invalid or has expired.`);
      console.error(`   GitLab returned Status: ${tokenCheck.status}`);
      console.error("   Details:", JSON.stringify(tokenCheck.body));
      console.error("=========================================================================");
      console.error("Please generate a brand new Personal Access Token on GitLab:");
      console.error("1. Go to User Settings -> Access Tokens on gitlab.com.");
      console.error("2. Add a token with 'api', 'read_repository', and 'write_repository' scopes.");
      console.error("3. Paste the new token into the GITLAB_PAT secret in AI Studio Settings.");
      console.error("=========================================================================");
      process.exit(1);
    }
    console.log("✅ Token is valid!");
  } catch (err: any) {
    console.warn(`⚠️ Warning: Could not verify token validity via API: ${err.message}. Proceeding anyway...`);
  }

  // Allow setting custom gitlab repo path or default to fredwilliamcurso-group/Soundstreamy
  const repoPath = process.env.GITLAB_REPO_PATH || "fredwilliamcurso-group/Soundstreamy";
  
  // Extract namespace and project name from repoPath
  const parts = repoPath.split("/");
  let namespacePath = "";
  let projectName = "";
  if (parts.length > 1) {
    namespacePath = parts.slice(0, -1).join("/");
    projectName = parts[parts.length - 1];
  } else {
    projectName = parts[0];
  }

  // 2. Check if Project exists, if not, create it
  let namespaceId: number | null = null;
  if (namespacePath) {
    console.log(`Searching for GitLab namespace "${namespacePath}"...`);
    try {
      const nsRes = await apiCall("GET", `/namespaces?search=${encodeURIComponent(namespacePath)}`, null, gitlabPat);
      if (nsRes.status === 200 && Array.isArray(nsRes.body)) {
        const exactMatch = nsRes.body.find((ns: any) => ns.path === namespacePath || ns.full_path === namespacePath);
        if (exactMatch) {
          namespaceId = exactMatch.id;
          console.log(`Found exact namespace match: "${namespacePath}" (ID: ${namespaceId})`);
        } else if (nsRes.body.length > 0) {
          namespaceId = nsRes.body[0].id;
          console.log(`Using closest namespace match: "${nsRes.body[0].full_path}" (ID: ${namespaceId})`);
        }
      }
    } catch (e: any) {
      console.warn(`⚠️ Could not query namespaces: ${e.message}`);
    }
  }

  console.log(`Checking if repository "${repoPath}" exists on GitLab...`);
  try {
    const projRes = await apiCall("GET", `/projects/${encodeURIComponent(repoPath)}`, null, gitlabPat);
    if (projRes.status === 200) {
      console.log(`✅ Repository "${repoPath}" already exists on GitLab.`);
    } else if (projRes.status === 404) {
      console.log(`ℹ️ Repository "${repoPath}" not found. Creating brand new project...`);
      const createPayload: any = {
        name: projectName,
        path: projectName,
        visibility: "private",
        initialize_with_readme: false
      };
      if (namespaceId !== null) {
        createPayload.namespace_id = namespaceId;
      }
      
      const createRes = await apiCall("POST", "/projects", createPayload, gitlabPat);
      if (createRes.status === 201) {
        console.log(`🎉 Successfully created new project on GitLab: ${createRes.body.web_url}`);
      } else {
        console.error("❌ Failed to automatically create project:", createRes.body);
        throw new Error(`GitLab project creation failed with status ${createRes.status}`);
      }
    } else {
      console.log(`Warning: GitLab returned status ${projRes.status} for project search. Proceeding to push anyway.`);
    }
  } catch (err: any) {
    console.warn(`⚠️ Could not perform project check/creation: ${err.message}. Proceeding to push anyway...`);
  }

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

  // 5. Try to fetch remote main to align branch history and avoid force-pushes on protected branches
  console.log("Fetching remote 'main' branch status to align history...");
  let remoteExists = false;
  try {
    runCmd(`git fetch origin main`, gitlabPat);
    remoteExists = true;
    console.log("✅ Remote 'main' branch exists. Resetting local branch pointer to align history...");
    runCmd("git reset origin/main");
  } catch (fetchErr: any) {
    console.log("ℹ️ Remote 'main' branch does not exist or is empty. Proceeding with initial history.");
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
    const msg = process.env.COMMIT_MESSAGE || "chore: Update Android build files and configs for production stability";
    runCmd(`git commit -m "${msg}"`);
  }

  // 8. Push to GitLab
  console.log("Pushing code to GitLab 'main' branch...");
  try {
    // Try standard push first (works on protected branches when history is aligned)
    console.log("Attempting standard push (non-force)...");
    try {
      runCmd("git push -u origin main", gitlabPat);
    } catch (standardPushErr: any) {
      console.log("Standard push failed/rejected. Attempting force-push...");
      runCmd("git push -u origin main --force", gitlabPat);
    }
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
