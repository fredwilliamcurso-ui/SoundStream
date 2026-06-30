import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const logStream = fs.createWriteStream("build.log", { flags: "w" });
  
  const env = { 
    ...process.env, 
    ANDROID_HOME: "/opt/android-sdk", 
    JAVA_HOME: "/usr/lib/jvm/java-21-openjdk-amd64", 
    PATH: "/usr/lib/jvm/java-21-openjdk-amd64/bin:" + process.env.PATH 
  };
  
  console.log("Starting background build process...");
  
  const p = spawn("./gradlew clean bundleRelease > ../build.log 2>&1", [], { 
    cwd: "android", 
    env, 
    detached: true, 
    shell: true,
    stdio: "ignore" 
  });
  
  p.on("error", (err) => {
    fs.appendFileSync("build.log", `Spawn error: ${err.message}\n`);
    console.error("Spawn error:", err);
  });
  
  if (p && p.pid) {
    p.unref();
    console.log(`Gradle build spawned successfully. PID: ${p.pid}`);
    fs.writeFileSync("build.pid", p.pid.toString());
  } else {
    console.error("Failed to spawn Gradle build process.");
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Error in build runner:", err);
  process.exit(1);
});
