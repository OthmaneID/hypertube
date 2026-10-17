import { axiosInstance } from "../../axiosInstance";
import type { SubtitleTrack } from "../../../components/VideoPlayer";

export interface SubtitleQuery {
  imdbId: string;
  season?: number;
  episode?: number;
  filename?: string;
}

interface EmbeddedSubtitlesResponse {
  pending: boolean;
  tracks: SubtitleTrack[];
}

/**
 * Each VTT is downloaded through axios and exposed as a blob: URL, because browsers refuse
 * to load cross-origin <track> files unless the whole <video> is switched to CORS mode.
 * Call `revokeSubtitles` on the result once it is no longer used.
 */
async function toBlobTracks(tracks: SubtitleTrack[]): Promise<SubtitleTrack[]> {
  const loaded = await Promise.all(
    tracks.map(async (track) => {
      try {
        const vtt = await axiosInstance.get<string>(track.src, { responseType: "text" });
        const blob = new Blob([vtt.data], { type: "text/vtt" });
        return { ...track, src: URL.createObjectURL(blob) };
      } catch {
        return null;
      }
    }),
  );
  return loaded.filter((track): track is SubtitleTrack => track !== null);
}

/**
 * Fetches the English, French and Arabic subtitles of a movie, or of an episode when
 * season/episode are given, from OpenSubtitles. The preferred language of the user is marked `default`.
 */
export async function getSubtitles({ imdbId, season, episode, filename }: SubtitleQuery): Promise<SubtitleTrack[]> {
  try {
    const res = await axiosInstance.get<SubtitleTrack[]>("/subtitles", {
      params: { imdb_id: imdbId, season, episode, filename },
    });
    return await toBlobTracks(res.data);
  } catch {
    return [];
  }
}

/**
 * Asks for the subtitles embedded in the video file. They can only be read once the file is fully
 * downloaded, so `pending` stays true until then and the caller is expected to ask again later.
 */
export async function getEmbeddedSubtitles(
  hash: string,
  streamParams: URLSearchParams,
): Promise<{ pending: boolean; tracks: SubtitleTrack[] }> {
  try {
    const res = await axiosInstance.get<EmbeddedSubtitlesResponse>(`/torrent/stream/${hash}/subtitles`, {
      params: Object.fromEntries(streamParams),
    });
    return { pending: res.data.pending, tracks: await toBlobTracks(res.data.tracks) };
  } catch {
    // Not worth retrying: the external subtitles still cover the video
    return { pending: false, tracks: [] };
  }
}

export function revokeSubtitles(tracks: SubtitleTrack[]) {
  tracks.forEach((track) => {
    if (track.src.startsWith("blob:")) URL.revokeObjectURL(track.src);
  });
}
