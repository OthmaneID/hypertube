import { axiosInstance } from "../../axiosInstance";
import {
  browseParams,
  type BrowseOptions,
  type Credits,
  type MovieTrailers,
  type PopularSeriesResponse,
  type SerieDetails,
  type SerieSeasonDetails,
} from "../../interfaces";

export async function getPopularSeries(
  page: number,
  options?: BrowseOptions,
): Promise<PopularSeriesResponse> {
  try {
    const res = await axiosInstance.get("/series/popular", {
      params: { page, ...browseParams(options) },
    });
    return res.data;
  } catch (error: any) {
    return {
      page: 1,
      results: [],
      total_pages: 1,
      total_results: 0,
      error: error.message,
    };
  }
}

export async function getTrendingSeries(
  window: "day" | "week",
): Promise<PopularSeriesResponse> {
  try {
    const res = await axiosInstance.get("/series/trending", { params: { window } });
    return res.data;
  } catch (error: any) {
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
    return { error: error.message };
  }
}

export async function getSerieCredits(serie_id: number): Promise<Credits> {
  try {
    const res = await axiosInstance.get("/series/credits/" + serie_id);
    return res.data;
  } catch (error: any) {
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
    return { error: error.message };
  }
}

export async function getSeriesGenres(): Promise<{ genres: Array<{ id: number; name: string }> }> {
  try {
    const res = await axiosInstance.get("/series/genres");
    return res.data;
  } catch {
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
    return { error: error.message };
  }
}
