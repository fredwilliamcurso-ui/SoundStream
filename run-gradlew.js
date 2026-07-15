import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

async function main() {
  const androidDir = path.join(process.cwd(), 'android');
  
  // Make gradlew executable
  try {
    fs.chmodSync(path.join(androidDir, 'gradlew'), '755');
  } catch (e) {
    console.log('Chmod error:', e.message);
  }

  console.log('Running ./gradlew clean in android directory...');
  const cleanProcess = spawn('./gradlew', ['clean'], { cwd: androidDir, stdio: 'inherit' });
  
  const cleanCode = await new Promise((resolve) => {
    cleanProcess.on('close', resolve);
  });

  console.log(`Clean process exited with code ${cleanCode}`);

  if (cleanCode !== 0) {
    console.error('Clean failed! Stopping build.');
    process.exit(1);
  }

  console.log('Running ./gradlew bundleRelease in android directory...');
  const buildProcess = spawn('./gradlew', ['bundleRelease'], { cwd: androidDir, stdio: 'inherit' });

  const buildCode = await new Promise((resolve) => {
    buildProcess.on('close', resolve);
  });

  console.log(`Build process exited with code ${buildCode}`);
  process.exit(buildCode || 0);
}

main().catch(console.error);
