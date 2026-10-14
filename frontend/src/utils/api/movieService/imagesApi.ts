import {axiosInstance} from "../../axiosInstance";
import type { ImageConfig, MovieImages } from "../../interfaces";

export async function getImageConfig(): Promise<ImageConfig> {
  try {
    const res = await axiosInstance.get("/images/config");
    return res.data;
  } catch (error: any) {
    return {error:error.message}
  }
}

export async function getMovieImages(movie_id: number): Promise<MovieImages> {
  try {
    const res = await axiosInstance.get(`/images/movie/${movie_id}`);
    return res.data;
  } catch (error: any) {
    return { id: movie_id, error: error.message };
  }
}


export async function getSerieImages(serie_id: number): Promise<MovieImages> {
  try {
    const res = await axiosInstance.get(`/images/serie/${serie_id}`);
    return res.data;
  } catch (error: any) {
    return { id: serie_id, error: error.message };
  }
}