import { axiosInstance } from "../../axiosInstance";
import type {
  Credits,
  MovieDetails,
  MovieTrailers,
  PopularMoviesResponse,
} from "../../interfaces";

export async function getPopularMovies(
  page: number,
  sortBy?: string,
): Promise<PopularMoviesResponse> {
  try {
    const res = await axiosInstance.get("/movies/popular", {
      params: { page, ...(sortBy ? { sort_by: sortBy } : {}) },
    });
    return res.data;
  } catch (error: any) {
    console.log("error while fetchin popular movies . ", error.message);
    return {
      page: 1,
      results: [],
      total_pages: 1,
      total_results: 0,
      error: error.message,
    };
  }
}

export async function getMovieDetails(movie_id: number): Promise<MovieDetails> {
  try {
    const res = await axiosInstance.get(`/movies/details/${movie_id}`);
    return res.data;
  } catch (error: any) {
    console.log("error while fetching movie details : ", error.message);
    return { id: movie_id, error: error.message };
  }
}

export async function getMovieCredits(movie_id: number): Promise<Credits> {
  try {
    const res = await axiosInstance.get(`/movies/credits/${movie_id}`);
    return res.data;
  } catch (error: any) {
    console.log("error while fetching movie cast : ", error.message);
    return { error: error.message };
  }
}

export async function getMovieTrailers(
  movie_id: number,
): Promise<MovieTrailers> {
  try {
    const res = await axiosInstance.get(`/movies/videos/${movie_id}`);
    return res.data;
  } catch (error: any) {
    console.log("error while fetching movie trailers : ", error.message);
    return { error: error.message };
  }
}
