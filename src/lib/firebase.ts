import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

import { uploadFile } from "./supabase";

// Firebase Config
const rawAuthDomain = (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN;
const defaultAuthDomain = "project-8462457c-9513-4dcb-9e9.firebaseapp.com";
const resolvedAuthDomain = (rawAuthDomain && (rawAuthDomain.endsWith(".firebaseapp.com") || rawAuthDomain.endsWith(".web.app")))
  ? rawAuthDomain
  : defaultAuthDomain;

export const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY || "AIzaSyDkmniMTxAENBxtDbKJWbk98MzJ2nQwGiw",
  authDomain: resolvedAuthDomain,
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID || "project-8462457c-9513-4dcb-9e9",
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET || undefined,
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID || undefined,
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID || undefined,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
// Use custom databaseId to prevent "Permission Denied" in AI Studio
export const db = initializeFirestore(app, {}, "ai-studio-a456ed2d-95ac-4aa8-8590-32ae5d6e0f4a");

// Re-export uploadFile from supabase as uploadToStorage for backward compatibility if needed
export async function uploadToStorage(
  file: File,
  bucket: "songs" | "covers" | "videos" | "audio"
): Promise<string> {
  const targetBucket = bucket === "audio" ? "songs" : bucket;
  return uploadFile(file, targetBucket);
}

// Audio upload
export async function uploadSong(file: File) {
  return uploadFile(file, "songs");
}

// Cover upload
export async function uploadCover(file: File) {
  return uploadFile(file, "covers");
}

// Video upload
export async function uploadVideo(file: File) {
  return uploadFile(file, "videos");
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
  throw new Error(JSON.stringify(errInfo));
}
