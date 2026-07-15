import { User, Artist, Song, Playlist } from "./types";

// Seeds are deleted as requested. The app starts completely clean (empty state) until real music is uploaded.
export const INITIAL_ARTISTS: Artist[] = [];

export const INITIAL_SONGS: Song[] = [];

export const INITIAL_USERS: User[] = [];

export const GENRES = [
  "All",
  "Afrobeats",
  "Amapiano",
  "Gospel",
  "Hip Hop",
  "Fuji",
  "Highlife"
];
