import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

async function fetchCrashes() {
  console.log("🔍 Fetching crash logs from Firebase Firestore...");
  
  let firebaseConfig: any;
  try {
    const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
    firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
  } catch (err) {
    console.error("❌ Failed to read firebase-applet-config.json:", err);
    process.exit(1);
  }

  try {
    const app = admin.initializeApp({
      projectId: firebaseConfig.projectId,
    }, "crash-fetcher");
    
    const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    
    const crashLogsRef = db.collection("system_crash_logs");
    const snapshot = await crashLogsRef.orderBy("timestamp", "desc").limit(10).get();
    
    if (snapshot.empty) {
      console.log("ℹ️ No crash logs found in system_crash_logs.");
      return;
    }
    
    console.log(`\nFound ${snapshot.size} recent crash log(s):`);
    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log("\n=========================================================================");
      console.log(`Document ID: ${doc.id}`);
      console.log(`Timestamp:   ${data.timestamp ? (data.timestamp.toDate ? data.timestamp.toDate().toISOString() : data.timestamp) : "N/A"}`);
      console.log(`Platform:    ${data.platform || "unknown"}`);
      console.log(`Type:        ${data.type || "unknown"}`);
      console.log(`Error Name:  ${data.errorName || "Error"}`);
      console.log(`Message:     ${data.errorMessage || "No message"}`);
      console.log(`Metadata:    ${JSON.stringify(data.metadata || {}, null, 2)}`);
      console.log(`Stack Trace:\n${data.errorStack || "No stack trace"}`);
      console.log("=========================================================================");
    });
  } catch (error) {
    console.error("❌ Failed to query Firestore:", error);
  }
}

fetchCrashes();
