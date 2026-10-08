import { axiosInstance } from "../../axiosInstance";
import type { SubtitleTrack } from "../../../components/VideoPlayer";

/**
 * Fetches the available subtitles (English, Arabic, French) for a given movie.
 * This function can be used by any developer across the app to get subtitle tracks.
 * 
 * @param movieId - The TMDB ID of the movie
 * @returns A promise that resolves to an array of SubtitleTrack objects
 */
export async function getMovieSubtitles(movieId: number | string): Promise<SubtitleTrack[]> {
  try {
    const res = await axiosInstance.get(`/subtitles/${movieId}`);
    return res.data;
  } catch (error) {
    console.error(`Failed to fetch subtitles for movie ${movieId}:`, error);
    return [];
  }
}
