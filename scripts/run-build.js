const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

function main() {
  const logStream = fs.createWriteStream("build.log", { flags: "w" });
  
  const env = { 
    ...process.env, 
    ANDROID_HOME: "/opt/android-sdk", 
    JAVA_HOME: "/usr/lib/jvm/java-21-openjdk-amd64", 
    PATH: "/usr/lib/jvm/java-21-openjdk-amd64/bin:" + process.env.PATH 
  };
  
  console.log("Starting background build process...");
  
  const p = spawn("./gradlew", ["clean", "bundleRelease"], { 
    cwd: "android", 
    env, 
    detached: true, 
    shell: true,
    stdio: ["ignore", "pipe", "pipe"] 
  });
  
  if (p && p.pid) {
    p.stdout.pipe(logStream);
    p.stderr.pipe(logStream);
    p.unref();
    console.log(`Gradle build spawned successfully. PID: ${p.pid}`);
    fs.writeFileSync("build.pid", p.pid.toString());
  } else {
    console.error("Failed to spawn Gradle build process.");
    process.exit(1);
  }
}

main();
