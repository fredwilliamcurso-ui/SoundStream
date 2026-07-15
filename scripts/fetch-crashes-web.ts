import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import fs from "fs";
import path from "path";

async function fetchCrashesWeb() {
  console.log("🔍 Fetching crash logs using client-side Web Firebase SDK...");
  
  let firebaseConfig: any;
  try {
    const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
    firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
  } catch (err) {
    console.error("❌ Failed to read firebase-applet-config.json:", err);
    process.exit(1);
  }

  try {
    // Initialize standard Firebase client SDK
    const app = initializeApp({
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId,
    });
    
    // Explicitly target the correct databaseId
    const db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);
    
    const crashLogsRef = collection(db, "system_crash_logs");
    const q = query(crashLogsRef, orderBy("timestamp", "desc"), limit(15));
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log("ℹ️ No crash logs found in system_crash_logs.");
      return;
    }
    
    console.log(`\nFound ${snapshot.size} recent crash log(s):`);
    snapshot.forEach((doc) => {
      const data = doc.data();
      // Handle timestamp conversion
      let dateStr = "N/A";
      if (data.timestamp) {
        if (data.timestamp.toDate) {
          dateStr = data.timestamp.toDate().toISOString();
        } else if (typeof data.timestamp === "object" && data.timestamp.seconds) {
          dateStr = new Date(data.timestamp.seconds * 1000).toISOString();
        } else {
          dateStr = String(data.timestamp);
        }
      }
      
      console.log("\n=========================================================================");
      console.log(`Document ID: ${doc.id}`);
      console.log(`Timestamp:   ${dateStr}`);
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

fetchCrashesWeb();
