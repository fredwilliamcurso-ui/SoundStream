import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || (import.meta as any).env.SUPABASE_URL || "";
const rawSupabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || (import.meta as any).env.SUPABASE_ANON_KEY || "";

// Initialize with specified default url if missing to prevent runtime crashes
export const supabaseUrl = rawSupabaseUrl || "https://uxvmdnlpvnjfekqxchfi.supabase.co";
export const supabaseAnonKey = rawSupabaseAnonKey || "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function isSupabaseConfigured(): boolean {
  return !!rawSupabaseUrl && !!rawSupabaseAnonKey;
}

/**
 * Construct redirect URL dynamically.
 * Supports production domains soundstreamy.com and www.soundstreamy.com,
 * falling back to VITE_APP_URL or current host origin for development setups.
 */
export function getAuthRedirectUrl(subPath = ""): string {
  const customRedirectEnv = (import.meta as any).env.VITE_SUPABASE_AUTH_REDIRECT_URL;
  if (customRedirectEnv) {
    return customRedirectEnv + subPath;
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'soundstreamy.com' || host === 'www.soundstreamy.com') {
      return `https://${host}${subPath}`;
    }
    return `${window.location.origin}${subPath}`;
  }

  const appUrl = (import.meta as any).env.VITE_APP_URL || (import.meta as any).env.APP_URL || "https://soundstreamy.com";
  return `${appUrl}${subPath}`;
}

/**
 * Reusable upload function that:
 * - uploads to Supabase Storage
 * - gets the public URL
 * - returns the URL
 */
export async function uploadFile(file: File, bucket: string): Promise<string> {
  // Create a unique file name
  const fileExt = file.name.split('.').pop() || '';
  const cleanFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
  const filePath = cleanFileName;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error(error);
    const isBucketError = 
      error.message.toLowerCase().includes("bucket") || 
      error.message.toLowerCase().includes("not found") || 
      error.message.toLowerCase().includes("does not exist") ||
      error.status === 404 ||
      error.status === 400; // 400 is sometimes returned when bucket does not exist

    const errMsg = isBucketError 
      ? `Bucket "${bucket}" does not exist. Original error: ${error.message}`
      : `Upload failed: ${error.message}`;
    throw new Error(errMsg);
  }

  // Retrieve public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return publicUrl;
}

/**
 * Legacy wrapper / alternative alias (keeping it compatible or mapped)
 */
export async function uploadToSupabase(file: File, bucketName: string): Promise<string> {
  return uploadFile(file, bucketName);
}

/**
 * Uploads a file (or remote URL string) to Cloudinary via unsigned upload preset
 */
export async function uploadToCloudinary(
  fileOrUrl: File | string,
  resourceType: 'image' | 'video',
  customPreset?: string
): Promise<{ secure_url: string; public_id: string; [key: string]: any }> {
  const cloudName = (import.meta as any).env.VITE_CLOUDINARY_CLOUD_NAME || (import.meta as any).env.CLOUDINARY_CLOUD_NAME || "";
  const uploadPreset = customPreset || (import.meta as any).env.VITE_CLOUDINARY_UPLOAD_PRESET || (import.meta as any).env.CLOUDINARY_UPLOAD_PRESET || "";

  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary configuration missing. Please verify CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET are set.");
  }

  const formData = new FormData();
  formData.append('file', fileOrUrl);
  formData.append('upload_preset', uploadPreset);

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

  const response = await fetch(url, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const message = errData.error?.message || `HTTP error ${response.status}`;
    throw new Error(`Cloudinary Upload Error: ${message}`);
  }

  return response.json();
}

/**
 * Generates an optimized, resized cover art URL using Cloudinary transforms
 */
export function getOptimizedCoverUrl(url: string, width = 500, height = 500): string {
  if (!url || !url.includes('cloudinary.com')) {
    return url;
  }
  // Inject transformation rules: center crop, fill aspect ratio, quality & format auto
  // Typical URL format: https://res.cloudinary.com/cloud_name/image/upload/v12345/public_id.jpg
  return url.replace('/image/upload/', `/image/upload/c_fill,g_auto,w_${width},h_${height},f_auto,q_auto/`);
}

/**
 * Generates a video thumbnail URL from a Cloudinary video URL or public ID
 */
export function getVideoThumbnailUrl(cloudinaryVideoUrl: string): string {
  if (!cloudinaryVideoUrl) return "";
  
  // If it's not a Cloudinary URL, we can't transform it directly this way
  if (!cloudinaryVideoUrl.includes('cloudinary.com')) {
    return cloudinaryVideoUrl;
  }

  // Cloudinary video URL: https://res.cloudinary.com/cloud_name/video/upload/v12345/public_id.mp4
  // Change "video" to "image", add image transformations, change .mp4 to .jpg
  let thumb = cloudinaryVideoUrl
    .replace('/video/upload/', '/video/upload/c_fill,g_auto,w_500,h_500,f_auto,q_auto,so_0/')
    .replace(/\.[^/.]+$/, '.jpg'); // Change extension to .jpg

  // Some Cloudinary setups require /video/upload/ to become /image/upload/ or /video/upload/ with f_jpg
  // Actually, Cloudinary handles rendering a video frame as an image using the video resource type directly
  // with an image extension. E.g. /video/upload/w_500,h_500,c_fill,so_0/public_id.jpg is valid!
  return thumb;
}
