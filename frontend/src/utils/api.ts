import axiosInstance from "./axiosInstance";
import type { MovieDetails, PopularMoviesResponse, ImageConfig, MovieImages, Credits, MovieTrailers, PopularSeriesResponse, SerieDetails } from "./interfaces";

export async function getImageConfig(): Promise<ImageConfig> {
  try {
    const res = await axiosInstance.get("/images/config");
    return res.data;
  } catch (error: any) {
    console.log("error while fetching images configuration : ", error.message);
    return {error:error.message}
  }
}


export async function getPopularMovies(page: number): Promise<PopularMoviesResponse> {
  try {
    const res = await axiosInstance.get("/movies/popular?page=" + page);
    return res.data;
  } catch (error: any) {
    console.log("error while fetchin popular movies . ", error.message);
    return { page: 1, results: [], total_pages: 1, total_results: 0, error: error.message};
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

export async function getMovieCredits(movie_id: number): Promise<Credits> {
  try {
    const res = await axiosInstance.get(`/movies/credits/${movie_id}`)
    return res.data
  } catch (error: any) {
    console.log("error while fetching movie cast : ", error.message)
    return {error: error.message}
  }
}


export async function getMovieTrailers(movie_id: number): Promise<MovieTrailers>{
  try {
    const res = await axiosInstance.get(`/movies/videos/${movie_id}`);
    return res.data
    
  } catch (error: any) {
    console.log("error while fetching movie trailers : ", error.message)
    return {error: error.message}
  
  }
}




export async function getPopularSeries(page: number): Promise<PopularSeriesResponse> {
  try {
    const res = await axiosInstance.get("/series/popular?page=" + page);
    return res.data;
  } catch (error: any) {
    console.log("error while fetchin popular series . ", error.message);
    return { page: 1, results: [], total_pages: 1, total_results: 0, error: error.message};
  }
}

export async function getSerieDetails(serie_id: number): Promise<SerieDetails> {
  try {
    const res = await axiosInstance.get("/series/details/" + serie_id)
    return res.data
  } catch (error: any) {
    console.log("error while fetching popular series : ", error.message)
    return { error: error.message }
  }
}


export async function getSerieCredits(serie_id: number): Promise<Credits>{
  try {
    const res = await axiosInstance.get("/series/credits/" + serie_id)
    return res.data
  } catch (error: any) {
    console.log("error while fetching serie credits : ", error.message)
    return {error:error.message}
  }
}

export async function getSerieImages(serie_id: number): Promise<MovieImages> {
  try {
    const res = await axiosInstance.get(`/images/serie/${serie_id}`);
    return res.data;
  } catch (error: any) {
    console.log("error while fetching serie details : ", error.message);
    return { id: serie_id, error: error.message };
  }
}


export async function getSerieTrailers(serie_id: number): Promise<MovieTrailers> {
  try {
    const res = await axiosInstance.get(`/series/videos/${serie_id}`)
    return res.data
  } catch (error: any) {
    console.log("error while fetching serie trailers : ", error.message)
    return {error:error.message}
  }
}