import { axiosInstance as axios } from "../axiosInstance";
import type { WatchMediaType } from "../streams";

export interface ProgressUpdate {
  media_type: WatchMediaType;
  tmdb_id: number;
  title: string;
  poster_path?: string;
  season?: number;
  episode?: number;
  episode_title?: string;
  position: number;
  duration?: number;
  watch_path: string;
}

export interface ContinueWatchingItem {
  media_type: WatchMediaType;
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

export async function saveProgress(update: ProgressUpdate): Promise<void> {
  try {
    await axios.put("/history/progress", update);
  } catch (err) {
    console.error("error while saving progress : ", err);
  }
}

// Still delivered when the page is closing, unlike an axios request
export function saveProgressKeepalive(update: ProgressUpdate): void {
  fetch(`${import.meta.env.VITE_BACKEND_URL}/history/progress`, {
    method: "PUT",
    keepalive: true,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update),
  }).catch(() => {});
}

export async function getContinueWatching(limit = 20): Promise<ContinueWatchingItem[]> {
  const res = await axios.get("/history/continue", { params: { limit } });
  return res.data;
}
