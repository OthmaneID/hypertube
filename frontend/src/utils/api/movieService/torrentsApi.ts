import { axiosInstance as axios } from "../../axiosInstance";
import type { SourcesResponse } from "../../interfaces";


export async function get_sources(
  movie_id: string,
): Promise<SourcesResponse> {
  try {
    const res = await axios.get(
      `/torrent/stream/movie/${movie_id}`,
    );
    return res.data;
  } catch (err: any) {
    console.log("error while getting sources : ", err);
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
    console.log("error while getting episode sources : ", err);
    return { streams: [], error: err.message };
  }
}

// export async function stream