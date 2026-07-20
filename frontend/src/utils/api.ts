import axiosInstance from "./axiosInstance";
import type { MovieDetails, PopularMoviesResponse, ImageConfig, MovieImages } from "./interfaces";

export async function getImageConfig(): Promise<ImageConfig> {
  try {
    const res = await axiosInstance.get("/images/config");
    return res.data;
  } catch (error: any) {
    console.log("error while fetching images configuration : ", error.message);
    return {error:error.message}
  }
}


export async function getPopularMovies(): Promise<PopularMoviesResponse> {
  try {
    const res = await axiosInstance.get("/movies/popular");
    return res.data;
  } catch (error: any) {
    console.log("error while fetchin popular movies . ", error.message);
    return { page: 1, results: [], total_pages: 0, total_results: 0 };
  }
}


export async function getMovieDetails(movie_id: number): Promise<MovieDetails> {
  try {
    const res = await axiosInstance.get(`/movies/details/${movie_id}`);
    return res.data;
  } catch (error: any) {
    console.log("error while fetching movie details : ", error.message);
    return {id:movie_id, error:error.message};
  }
}


export async function getMovieImages(movie_id: number): Promise<MovieImages> {
  try {
    const res = await axiosInstance.get(`/images/movie/${movie_id}`);
    return res.data;
  } catch (error: any) {
    console.log("error while fetching movie details : ", error.message);
    return { id: movie_id, error: error.message };
  }
}