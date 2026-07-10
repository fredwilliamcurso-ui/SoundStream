import https from 'https';

const token = process.env.GITLAB_PAT || '';

function fetchGitlab(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'gitlab.com',
      path: '/api/v4' + path,
      headers: {
        'User-Agent': 'NodeJS-App',
        ...(token ? { 'PRIVATE-TOKEN': token } : {}),
      }
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  const endpoints = [
    '/personal_access_tokens/self',
    '/user',
    '/metadata',
    '/version'
  ];

  for (const ep of endpoints) {
    const res = await fetchGitlab(ep);
    console.log(`Endpoint ${ep} Status: ${res.status}`);
    console.log(res.body);
  }
}

main().catch(console.error);
