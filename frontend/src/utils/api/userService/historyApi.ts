import { axiosInstance as axios } from "../../axiosInstance";

export interface ProgressUpdate {
  imdb_id: string;
  tmdb_id: number;
  // null for movies
  season: number | null;
  episode: number | null;
  watched_duration: number; // seconds
  is_finished: boolean;
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
  } catch (error: any) {
    console.log("Error while updating progress:", error.message);
  }
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
  } catch (error: any) {
    console.log("Error while getting progress:", error.message);
    return null;
  }
}



export async function getSerieHistory(
  tmdb_id: number
): Promise<SerieEpisodeHistory[]> {
  try {
    const res = await axios.get(`/history/serie/${tmdb_id}`);
    return res.data;
  } catch (error: any) {
    console.log("Error while getting serie history:", error.message);
    return [];
  }
} 