import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, DocumentSnapshot } from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import firebaseConfigData from "../../firebase-applet-config.json";

// Global helper to sanitize any incoming corrupted plain-object FieldValues (e.g. from previous bad writes)
function sanitizeIncomingData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeIncomingData(item));
  }
  if (typeof data === "object") {
    // Check if it's a Firestore document reference (which we should NOT sanitize/flatten)
    if (
      (data.constructor && data.constructor.name !== "Object") ||
      ('firestore' in data && 'id' in data && 'path' in data)
    ) {
      return data;
    }
    // Check if it's a corrupted FieldValue written as a plain object from previous bad updates
    if ('_methodName' in data || 'Pr' in data) {
      return 0; // Safe fallback for corrupted counters/likes
    }
    const clean: any = {};
    Object.keys(data).forEach((key) => {
      clean[key] = sanitizeIncomingData(data[key]);
    });
    return clean;
  }
  return data;
}

// Monkeypatch DocumentSnapshot prototype globally to intercept and clean any incoming corrupted objects on-the-fly
const originalData = DocumentSnapshot.prototype.data;
DocumentSnapshot.prototype.data = function (options?: any) {
  const data = originalData.call(this, options);
  return sanitizeIncomingData(data);
};

// Firebase Config loaded from firebase-applet-config.json
export const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY || firebaseConfigData.apiKey,
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigData.authDomain,
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID || firebaseConfigData.projectId,
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigData.storageBucket || "project-8462457c-9513-4dcb-9e9.firebasestorage.app",
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigData.messagingSenderId,
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID || firebaseConfigData.appId,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
// Use custom databaseId to prevent "Permission Denied" in AI Studio
export const db = initializeFirestore(app, {}, "ai-studio-a456ed2d-95ac-4aa8-8590-32ae5d6e0f4a");

// Generic upload function for Firebase Storage
export async function uploadToFirebaseStorage(file: File, folder: string): Promise<string> {
  const storage = getStorage(app);
  const fileExt = file.name.split('.').pop() || '';
  const cleanFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
  const filePath = `${folder}/${cleanFileName}`;
  
  const pRef = storageRef(storage, filePath);
  const snapshot = await uploadBytes(pRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  return downloadURL;
}

// Re-export uploadToStorage using Firebase Storage
export async function uploadToStorage(
  file: File,
  bucket: "songs" | "covers" | "videos" | "audio"
): Promise<string> {
  const folder = bucket === "audio" ? "songs" : bucket;
  return uploadToFirebaseStorage(file, folder);
}

// Upload profile picture with validation
export async function uploadProfilePicture(userId: string, file: File): Promise<string> {
  // 1. Check file type
  if (!file.type.startsWith("image/")) {
    throw new Error("Invalid file type. Please select an image file (PNG, JPG, JPEG, GIF, etc.).");
  }
  
  // 2. Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error("File is too large. Please select an image under 5MB.");
  }

  try {
    return await uploadToFirebaseStorage(file, `users/${userId}`);
  } catch (error: any) {
    console.error("Firebase Storage upload failed:", error);
    throw new Error(`Profile image upload failed: ${error.message || error}`);
  }
}

// Audio upload
export async function uploadSong(file: File) {
  return uploadToFirebaseStorage(file, "songs");
}

// Cover upload
export async function uploadCover(file: File) {
  return uploadToFirebaseStorage(file, "covers");
}

// Video upload
export async function uploadVideo(file: File) {
  return uploadToFirebaseStorage(file, "videos");
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // Log the error but do not throw to prevent crashing the entire React UI on transient network/permission errors
}
