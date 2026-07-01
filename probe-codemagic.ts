import https from "https";

async function probeUrl(url: string) {
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": "NodeJS-App" } }, (res) => {
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
  const buildId = "6a4469e696ac47c3b7398538";
  
  const urls = [
    `https://api.codemagic.io/builds/${buildId}`,
    `https://api.codemagic.io/builds/${buildId}/steps`,
    `https://api.codemagic.io/builds/${buildId}/logs`,
    `https://codemagic.io/api/builds/${buildId}`,
    `https://codemagic.io/api/builds/${buildId}/steps`
  ];

  for (const url of urls) {
    console.log(`Probing: ${url}`);
    try {
      const res = await probeUrl(url);
      console.log(`Status: ${res.status}`);
      if (res.status === 200) {
        console.log("Success! Preview of body:");
        console.log(res.body.slice(0, 1000));
      } else {
        console.log(`Failed with status ${res.status}: ${res.body.slice(0, 300)}`);
      }
    } catch (e: any) {
      console.error(`Error: ${e.message}`);
    }
    console.log("-----------------------------------------");
  }
}

main();
