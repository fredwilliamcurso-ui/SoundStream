const https = require('https');
const token = process.env.GITLAB_PAT;

function request(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'gitlab.com',
      path: path,
      headers: { 'PRIVATE-TOKEN': token }
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch(e) {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  try {
    const commitSha = '9b883de580dbbfae8ee4c391e24e55d0474bd35c';
    console.log(`Checking statuses for commit ${commitSha}...`);
    const statuses = await request(`/api/v4/projects/83860265/repository/commits/${commitSha}/statuses`);
    if (Array.isArray(statuses)) {
      console.log('Current statuses:', statuses.map(s => ({ name: s.name, status: s.status })));
      
      const pipelines = await request(`/api/v4/projects/83860265/pipelines?sha=${commitSha}`);
      if (Array.isArray(pipelines) && pipelines.length > 0) {
        const pipelineId = pipelines[0].id;
        const jobs = await request(`/api/v4/projects/83860265/pipelines/${pipelineId}/jobs`);
        if (Array.isArray(jobs) && jobs.length > 0) {
          const activeJob = jobs[0];
          console.log(`Job ${activeJob.name} (ID: ${activeJob.id}) is: ${activeJob.status}`);
          const trace = await request(`/api/v4/projects/83860265/jobs/${activeJob.id}/trace`);
          if (typeof trace === 'string') {
            console.log(`Trace length: ${trace.length} characters`);
            console.log('--- LOGS START ---');
            console.log(trace.slice(-2000));
            console.log('--- LOGS END ---');
          }
        }
      }
    } else {
      console.log('Error, response is not an array:', statuses);
    }
  } catch(e) {
    console.error('Error in script:', e);
  }
}

main();
