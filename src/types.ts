export interface User {
  uid: string;
  username: string;
  email: string;
  photoURL?: string;
  createdAt: string;
  role: "listener" | "artist" | "admin";
  isSuspended?: boolean;
  subscription?: {
    status: "free" | "premium";
    expiresAt?: string | null;
    updatedAt?: string;
  };

  // Backwards compatibility properties
  id?: string;
  displayName?: string;
}

export interface Artist {
  uid: string;
  artistName: string;
  bio: string;
  verified: boolean;
  profilePhoto: string;
  followersCount: number;
  createdAt: string;
  isSuspended?: boolean;
  isFeatured?: boolean;

  // Backwards compatibility properties
  userId: string;
}

export interface Song {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  genre: string;
  coverUrl: string;
  audioUrl: string;
  videoUrl?: string;
  lyrics?: string;
  playCount: number;
  likes: number;
  createdAt: string;
  type: "song";
  isFeatured?: boolean;
  isModerated?: boolean;

  // Album support
  albumId?: string;
  albumTitle?: string;
  trackNumber?: number;
  discNumber?: number;
}

export interface Album {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  description: string;
  genre: string;
  coverUrl: string;
  releaseDate: string;
  createdAt: string;
  trackCount: number;
  totalDuration: number; // in seconds
  isEP?: boolean;
}

export interface Playlist {
  id: string;
  title: string;
  description?: string;
  coverUrl: string;
  createdBy: string; // for backwards compatibility
  userId?: string; // for backwards compatibility and security rules matching
  ownerId: string;
  songIds: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  songCount: number;
}

export interface PlaylistSong {
  id?: string;
  playlistId: string;
  songId: string;
  trackOrder: number;
  addedAt: string;
}

export interface UploadProgress {
  progress: number;
  status:
    | "idle"
    | "uploading"
    | "processing"
    | "completed"
    | "failed";
  error?: string;
}
