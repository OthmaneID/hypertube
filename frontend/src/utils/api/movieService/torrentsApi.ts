import { axiosInstance as axios } from "../../axiosInstance";
import type { SourcesResponse, StreamInfo } from "../../interfaces";


export async function get_sources(
  movie_id: string,
): Promise<SourcesResponse> {
  try {
    const res = await axios.get(
      `/torrent/stream/movie/${movie_id}`,
    );
    return res.data;
  } catch (err: any) {
    return { streams: [], error: err.message };
  }
}

export async function get_episode_streams(
  imdb_id: string,
  season: number,
  episode: number,
): Promise<SourcesResponse> {
  try {
    const res = await axios.get(
      `/torrent/stream/series/${imdb_id}:${season}:${episode}`,
    );
    return res.data;
  } catch (err: any) {
    return { streams: [], error: err.message };
  }
}

// Throws on failure: the player can't pick a playback mode without it
export async function get_stream_info(
  hash: string,
  streamParams: URLSearchParams,
  start = 0,
): Promise<StreamInfo> {
  const params = Object.fromEntries(streamParams);
  const res = await axios.get(`/torrent/stream/${hash}/info`, {
    params: start > 0 ? { ...params, start } : params,
  });
  return res.data;
}

// export async function stream