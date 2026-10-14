import { axiosInstance as axios } from "../../axiosInstance";

export interface ProgressUpdate {
  imdb_id: string;
  tmdb_id: number;
  // null for movies
  season: number | null;
  episode: number | null;
  watched_duration: number; // seconds
  is_finished: boolean;
  // Only needed for the "continue watching" list
  title?: string;
  poster_path?: string;
  episode_title?: string;
  duration?: number;
  watch_path?: string;
}

export interface ContinueWatchingItem {
  media_type: "movie" | "tv";
  tmdb_id: number;
  title: string | null;
  poster_path: string | null;
  season: number | null;
  episode: number | null;
  episode_title: string | null;
  position: number;
  duration: number | null;
  // 0 to 1
  progress: number;
  completed: boolean;
  watch_path: string;
  updated_at: string;
}




export interface WatchedStatus {
  watched: boolean;
  duration?: number;
  is_finished?: boolean;
}

export interface SerieEpisodeHistory {
  id: number;
  imdb_id: string;
  tmdb_id: number;
  season: number;
  episode: number;
  watched_duration: number;
  is_finished: boolean;
  created_at?: string;
  last_viewed_at?: string;
}

export async function checkWatched(
  tmdb_id: number,
  season: number = -1,
  episode: number = -1
): Promise<WatchedStatus> {
  try {
    const res = await axios.get(
      `/history/check/${tmdb_id}:${season}:${episode}`
    );
    return res.data;
  } catch (error: any) {
    return { watched: false, duration: 0, is_finished: false };
  }
}

export async function updateProgress(progress: ProgressUpdate): Promise<void> {
  try {
    await axios.patch("/history/progress", progress);
  } catch {
    // Progress saving is best effort
  }
}

// Still delivered when the page is closing, unlike an axios request
export function updateProgressKeepalive(progress: ProgressUpdate): void {
  fetch(`${import.meta.env.VITE_BACKEND_URL}/history/progress`, {
    method: "PATCH",
    keepalive: true,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(progress),
  }).catch(() => {});
}

export async function getContinueWatching(limit = 20): Promise<ContinueWatchingItem[]> {
  const res = await axios.get("/history/continue", { params: { limit } });
  return res.data;
}

// null when the movie or episode was never watched
export async function getProgress(
  tmdb_id: number,
  season?: number,
  episode?: number,
): Promise<ProgressUpdate | null> {
  try {
    const path =
      season !== undefined && episode !== undefined
        ? `/history/progress/${tmdb_id}:${season}:${episode}`
        : `/history/progress/${tmdb_id}`;
    const res = await axios.get(path);
    return res.data;
  } catch {
    return null;
  }
}



export async function getSerieHistory(
  tmdb_id: number
): Promise<SerieEpisodeHistory[]> {
  try {
    const res = await axios.get(`/history/serie/${tmdb_id}`);
    return res.data;
  } catch {
    return [];
  }
} 