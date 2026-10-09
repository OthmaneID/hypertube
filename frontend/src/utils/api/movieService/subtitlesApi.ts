import { axiosInstance } from "../../axiosInstance";
import type { SubtitleTrack } from "../../../components/VideoPlayer";

export interface SubtitleQuery {
  imdbId: string;
  season?: number;
  episode?: number;
  filename?: string;
}

/**
 * Fetches the English, French and Arabic subtitles of a movie, or of an episode when
 * season/episode are given. The preferred language of the user is marked `default`.
 *
 * Each VTT is downloaded through axios and exposed as a blob: URL, because browsers refuse
 * to load cross-origin <track> files unless the whole <video> is switched to CORS mode.
 * Call `revokeSubtitles` on the result once it is no longer used.
 */
export async function getSubtitles({ imdbId, season, episode, filename }: SubtitleQuery): Promise<SubtitleTrack[]> {
  try {
    const res = await axiosInstance.get<SubtitleTrack[]>("/subtitles", {
      params: { imdb_id: imdbId, season, episode, filename },
    });
    const tracks = await Promise.all(
      res.data.map(async (track) => {
        try {
          const vtt = await axiosInstance.get<string>(track.src, { responseType: "text" });
          const blob = new Blob([vtt.data], { type: "text/vtt" });
          return { ...track, src: URL.createObjectURL(blob) };
        } catch (error) {
          console.error(`Failed to load ${track.label} subtitles:`, error);
          return null;
        }
      }),
    );
    return tracks.filter((track): track is SubtitleTrack => track !== null);
  } catch (error) {
    console.error(`Failed to fetch subtitles for ${imdbId}:`, error);
    return [];
  }
}

export function revokeSubtitles(tracks: SubtitleTrack[]) {
  tracks.forEach((track) => {
    if (track.src.startsWith("blob:")) URL.revokeObjectURL(track.src);
  });
}
