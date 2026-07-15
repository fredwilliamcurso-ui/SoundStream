import https from 'https';

function fetchGitlab(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'gitlab.com',
      path: '/api/v4' + path,
      headers: {
        'User-Agent': 'NodeJS-App',
      }
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  const usernames = ['soundstreamy', 'soundstream', 'soundstream-y', 'soundstreamy-app'];
  for (const username of usernames) {
    const res = await fetchGitlab(`/users?username=${username}`);
    console.log(`User ${username}:`, res);
  }
}

main().catch(console.error);
