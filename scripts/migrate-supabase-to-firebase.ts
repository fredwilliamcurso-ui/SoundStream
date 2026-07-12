import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// 1. Initialize Supabase
const rawSupabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const rawSupabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

if (!rawSupabaseUrl || !rawSupabaseAnonKey) {
  console.error("❌ Missing Supabase configuration.");
  process.exit(1);
}

const supabase = createClient(rawSupabaseUrl, rawSupabaseAnonKey);

// 2. Initialize Firebase Admin
let firestoreDb: any;
let firebaseStorage: any;
let firebaseConfig: any;

try {
  const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
  firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
  
  const app = admin.initializeApp({
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
  }, "migration-app");
  
  firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  firebaseStorage = getStorage(app);
  console.log("🔥 Firebase Admin initialized. Bucket:", firebaseConfig.storageBucket);
} catch (error) {
  console.error("❌ Failed to initialize Firebase Admin:", error);
  process.exit(1);
}

// Helper to recursively replace Supabase URLs in document data
function replaceSupabaseUrls(obj: any, urlMap: Map<string, string>): { updatedObj: any, changed: boolean } {
  let changed = false;
  if (obj === null || obj === undefined) return { updatedObj: obj, changed };
  
  if (typeof obj === 'string') {
    // Check if this string contains any of our known Supabase URLs
    for (const [sbUrl, fbUrl] of urlMap.entries()) {
      // Decode URLs to ensure we match even with url encoding differences
      const decodedSb = decodeURIComponent(sbUrl);
      const decodedObj = decodeURIComponent(obj);
      
      if (obj === sbUrl || decodedObj === decodedSb) {
        return { updatedObj: fbUrl, changed: true };
      }
      if (obj.includes(sbUrl) || decodedObj.includes(decodedSb)) {
        // Find match in original string and replace
        const index = decodedObj.indexOf(decodedSb);
        if (index !== -1) {
          return { updatedObj: fbUrl, changed: true };
        }
        return { updatedObj: obj.replace(sbUrl, fbUrl), changed: true };
      }
    }
    return { updatedObj: obj, changed };
  }
  
  if (Array.isArray(obj)) {
    const newArr = [];
    for (const item of obj) {
      const res = replaceSupabaseUrls(item, urlMap);
      newArr.push(res.updatedObj);
      if (res.changed) changed = true;
    }
    return { updatedObj: newArr, changed };
  }
  
  if (typeof obj === 'object') {
    // Check if it's a special Firestore class we shouldn't walk (e.g. GeoPoint, Timestamp, Reference)
    if (obj.constructor && obj.constructor.name !== 'Object') {
      return { updatedObj: obj, changed };
    }
    const newObj: any = {};
    for (const key of Object.keys(obj)) {
      const res = replaceSupabaseUrls(obj[key], urlMap);
      newObj[key] = res.updatedObj;
      if (res.changed) changed = true;
    }
    return { updatedObj: newObj, changed };
  }
  
  return { updatedObj: obj, changed };
}

async function runMigration() {
  console.log("🚀 STARTING SUPABASE TO GOOGLE CLOUD/FIREBASE MIGRATION...");

  const buckets = ['songs', 'covers', 'videos'];
  const urlMap = new Map<string, string>(); // Supabase URL -> Firebase URL
  const fbBucket = firebaseStorage.bucket();

  // Step 1: Migrate Files from Storage
  for (const bucketName of buckets) {
    console.log(`\n📦 Migrating Storage Bucket: "${bucketName}"...`);
    
    // List files from Supabase
    const { data: files, error: listError } = await supabase.storage.from(bucketName).list('', {
      limit: 1000
    });

    if (listError) {
      console.error(`❌ Error listing files in "${bucketName}":`, listError.message);
      continue;
    }

    if (!files || files.length === 0) {
      console.log(`ℹ️ Bucket "${bucketName}" is empty.`);
      continue;
    }

    console.log(`Found ${files.length} files to transfer.`);

    for (const fileInfo of files) {
      const fileName = fileInfo.name;
      // Skip folders
      if (fileName === '.emptyFolderPlaceholder') continue;

      console.log(`  File: ${fileName} (${(fileInfo.metadata?.size / 1024 / 1024).toFixed(2)} MB)`);

      try {
        // 1. Download from Supabase
        const { data: fileBlob, error: downloadError } = await supabase.storage
          .from(bucketName)
          .download(fileName);

        if (downloadError) {
          throw new Error(`Supabase download error: ${downloadError.message}`);
        }

        const buffer = Buffer.from(await fileBlob.arrayBuffer());

        // 2. Upload to Firebase Storage
        const fbFilePath = `${bucketName}/${fileName}`;
        const fbFile = fbBucket.file(fbFilePath);

        // Deduce content-type
        let contentType = 'application/octet-stream';
        if (fileName.endsWith('.mp3')) contentType = 'audio/mpeg';
        else if (fileName.endsWith('.wav')) contentType = 'audio/wav';
        else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) contentType = 'image/jpeg';
        else if (fileName.endsWith('.png')) contentType = 'image/png';
        else if (fileName.endsWith('.mp4')) contentType = 'video/mp4';

        await fbFile.save(buffer, {
          metadata: { contentType },
          resumable: false
        });

        // 3. Make Public so it can be served via CDN
        try {
          await fbFile.makePublic();
        } catch (pubErr: any) {
          console.warn(`  ⚠️ Could not explicitly make file public: ${pubErr.message || pubErr}. Proceeding.`);
        }

        // Get public Supabase URL
        const { data: { publicUrl: sbPublicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(fileName);

        // Construct public Firebase Storage URL
        const fbPublicUrl = `https://storage.googleapis.com/${firebaseConfig.storageBucket}/${fbFilePath}`;

        urlMap.set(sbPublicUrl, fbPublicUrl);
        // Also map standard variations just in case of different encodings
        urlMap.set(sbPublicUrl.replace(' ', '%20'), fbPublicUrl);
        
        console.log(`  ✅ Successfully migrated: ${fileName}`);
        console.log(`     From: ${sbPublicUrl}`);
        console.log(`     To:   ${fbPublicUrl}`);

      } catch (err: any) {
        console.error(`  ❌ Failed to migrate ${fileName}:`, err.message || err);
      }
    }
  }

  console.log(`\n✨ Storage Migration Finished! Total files mapped: ${urlMap.size}`);

  // Step 2: Update Firestore Database Records
  console.log("\n🗄️ Scanning and updating Firestore Database Records...");
  const collections = await firestoreDb.listCollections();
  let totalDocsUpdated = 0;

  for (const collection of collections) {
    const colName = collection.id;
    console.log(`Scanning collection: "${colName}"...`);

    const snapshot = await collection.get();
    console.log(`Found ${snapshot.size} documents in "${colName}".`);

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const { updatedObj, changed } = replaceSupabaseUrls(data, urlMap);

      if (changed) {
        console.log(`  Updating doc "${doc.id}" in "${colName}" with new URLs.`);
        await doc.ref.update(updatedObj);
        totalDocsUpdated++;
      }
    }
  }

  console.log(`\n🎉 Firestore Database Update Completed! Total documents updated: ${totalDocsUpdated}`);

  // Step 3: Verify and Cleanup Supabase
  if (urlMap.size > 0) {
    console.log("\n🧹 Cleaning up Supabase storage data as requested...");
    for (const bucketName of buckets) {
      console.log(`Deleting files in Supabase bucket: "${bucketName}"...`);
      const { data: files } = await supabase.storage.from(bucketName).list();
      if (files && files.length > 0) {
        const fileNames = files.map(f => f.name).filter(name => name !== '.emptyFolderPlaceholder');
        if (fileNames.length > 0) {
          const { error: deleteError } = await supabase.storage.from(bucketName).remove(fileNames);
          if (deleteError) {
            console.error(`  ❌ Failed to delete files in "${bucketName}":`, deleteError.message);
          } else {
            console.log(`  ✅ Successfully deleted ${fileNames.length} files from Supabase "${bucketName}".`);
          }
        }
      }
    }
  }

  console.log("\n⭐⭐⭐ MIGRATION COMPLETED SUCCESSFULLY ⭐⭐⭐\n");
}

runMigration().catch(err => {
  console.error("❌ Migration failed with error:", err);
  process.exit(1);
});
