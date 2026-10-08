import { axiosInstance } from "../../axiosInstance";

export interface SearchResultItem {
  id: number | null;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  media_type: "movie" | "series";
  source: "tmdb" | "archive";
  archive_identifier?: string;
  archive_url?: string;
}

export interface SearchResponse {
  query: string;
  page: number;
  results: SearchResultItem[];
  total_results: number;
  sources: string[];
}

export async function searchMovies(
  query: string,
  page = 1
): Promise<SearchResponse> {
  try {
    const res = await axiosInstance.get("/search/movies", {
      params: { q: query, page },
    });
    console.log("here")
    console.log(res.data)
    return res.data;
  } catch (error: any) {
    return { query, page, results: [], total_results: 0, sources: [] };
  }
}

export async function searchSeries(
  query: string,
  page = 1
): Promise<SearchResponse> {
  try {
    const res = await axiosInstance.get("/search/series", {
      params: { q: query, page },
    });
    return res.data;
  } catch (error: any) {
    return { query, page, results: [], total_results: 0, sources: [] };
  }
}
