import { axiosInstance } from "../../axiosInstance";
import type {
  Credits,
  MovieTrailers,
  PopularSeriesResponse,
  SerieDetails,
  SerieSeasonDetails,
} from "../../interfaces";

export async function getPopularSeries(
  page: number,
  sortBy?: string,
): Promise<PopularSeriesResponse> {
  try {
    const res = await axiosInstance.get("/series/popular", {
      params: { page, ...(sortBy ? { sort_by: sortBy } : {}) },
    });
    return res.data;
  } catch (error: any) {
    console.log("error while fetchin popular series . ", error.message);
    return {
      page: 1,
      results: [],
      total_pages: 1,
      total_results: 0,
      error: error.message,
    };
  }
}

export async function getSerieDetails(serie_id: number): Promise<SerieDetails> {
  try {
    const res = await axiosInstance.get("/series/details/" + serie_id);
    return res.data;
  } catch (error: any) {
    console.log("error while fetching popular series : ", error.message);
    return { error: error.message };
  }
}

export async function getSerieCredits(serie_id: number): Promise<Credits> {
  try {
    const res = await axiosInstance.get("/series/credits/" + serie_id);
    return res.data;
  } catch (error: any) {
    console.log("error while fetching serie credits : ", error.message);
    return { error: error.message };
  }
}

export async function getSerieTrailers(
  serie_id: number,
): Promise<MovieTrailers> {
  try {
    const res = await axiosInstance.get(`/series/videos/${serie_id}`);
    return res.data;
  } catch (error: any) {
    console.log("error while fetching serie trailers : ", error.message);
    return { error: error.message };
  }
}

export async function getSeriesGenres(): Promise<{ genres: Array<{ id: number; name: string }> }> {
  try {
    const res = await axiosInstance.get("/series/genres");
    return res.data;
  } catch (error: any) {
    console.log("error while fetching series genres: ", error.message);
    return { genres: [] };
  }
}

export async function getSeasonDetails(
  serie_id: number,
  season_number: number,
): Promise<SerieSeasonDetails> {
  try {
    const res = await axiosInstance.get(
      `/series/${serie_id}/season/${season_number}`,
    );
    return res.data;
  } catch (error: any) {
    console.log("error while fetching season details : ", error.message);
    return { error: error.message };
  }
}
