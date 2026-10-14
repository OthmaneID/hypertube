import { axiosInstance } from "../../axiosInstance";

// Search merges TMDB and Trakt (when the backend has a Trakt key); results are sorted by name
// and `id` is always the TMDB id
export interface SearchResultItem {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  media_type: "movie" | "series";
  sources: ("tmdb" | "trakt")[];
}

export interface SearchResponse {
  query: string;
  page: number;
  results: SearchResultItem[];
  total_results: number;
  total_pages: number;
  has_more: boolean;
  sources: string[];
}

function emptyResponse(query: string, page: number): SearchResponse {
  return { query, page, results: [], total_results: 0, total_pages: 0, has_more: false, sources: [] };
}

export async function searchMovies(
  query: string,
  page = 1
): Promise<SearchResponse> {
  try {
    const res = await axiosInstance.get("/search/movies", {
      params: { q: query, page },
    });
    return res.data;
  } catch (error: any) {
    return emptyResponse(query, page);
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
    return emptyResponse(query, page);
  }
}
