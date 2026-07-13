import https from "https";

const token = process.env.GITLAB_PAT;
const auth = Buffer.from(`oauth2:${token}`).toString("base64");

const namespaces = [
  "fredwilliamcurso",
  "fredwilliamcurso-ui",
  "soundstream",
  "soundstreamy",
  "soundstream-y"
];

const repos = [
  "soundstream",
  "SoundStream",
  "sound-stream",
  "Soundstream",
  "app",
  "soundstreamy",
  "soundstreamy-app",
  "sound-stream-y",
  "SoundStream-y"
];

const paths: string[] = [];
for (const ns of namespaces) {
  for (const r of repos) {
    paths.push(`${ns}/${r}`);
  }
}

async function checkPath(p: string): Promise<boolean> {
  return new Promise((resolve) => {
    const url = `/${p}.git/info/refs?service=git-upload-pack`;
    const options = {
      hostname: "gitlab.com",
      path: url,
      headers: {
        Authorization: `Basic ${auth}`,
        "User-Agent": "git/2.34.1"
      }
    };
    const req = https.get(options, (res) => {
      res.resume();
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    req.on("error", () => {
      resolve(false);
    });
  });
}

async function main() {
  console.log(`Probing ${paths.length} potential GitLab repository paths...`);
  for (const p of paths) {
    const ok = await checkPath(p);
    if (ok) {
      console.log(`✅ FOUND WORKING PATH: ${p}`);
    }
  }
  console.log("Done probing.");
}

main().catch(console.error);

