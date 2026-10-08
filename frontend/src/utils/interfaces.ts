import type { TokenResponse } from "@react-oauth/google";

export interface Movie {
  adult?: boolean;
  backdrop_path?: string;
  genre_ids?: Array<number>;
  id?: number;
  original_language?: string;
  original_title?: string;
  overview?: string;
  popularity?: number;
  poster_path?: string;
  release_date?: Date;
  title?: string;
  video?: boolean;
  vote_average?: number;
  vote_count?: number;
}

export interface PopularMoviesResponse {
  page: number;
  results: Movie[];
  total_pages: number;
  total_results: number;
  error?: string;
}

export interface ImageConfig {
  images?: {
    base_url?: string;
    secure_base_url?: string;
    backdrop_sizes?: Array<string>;
    logo_sizes?: Array<string>;
    poster_sizes?: Array<string>;
    profile_sizes?: Array<string>;
    still_sizes?: Array<string>;
    change_keys?: Array<string>;
  };
  error?: string;
}

export interface MovieDetails {
  adult?: boolean;
  backdrop_path?: string;
  is_favorite?: boolean;
  belongs_to_collection?: {
    id?: number;
    name?: string;
    poster_path?: string;
    backdrop_path?: string;
  };
  budget?: number;
  genres?: Array<{ id: number; name: string }>;
  homepage?: string;
  id: number;
  imdb_id?: string;
  origin_country?: Array<string>;
  original_language?: string;
  original_title?: string;
  overview?: string;
  popularity?: number;
  poster_path?: string;
  production_companies?: Array<{
    id?: number;
    logo_path?: string;
    name?: string;
    origin_country?: string;
  }>;
  production_countries?: Array<{ iso_3166_1: string; name: string }>;
  release_date?: Date;
  revenue?: number;
  runtime?: number;
  spoken_languages?: Array<{
    english_name?: string;
    iso_639_1?: string;
    name?: string;
  }>;
  status?: string;
  tagline?: string;
  title?: string;
  video?: boolean;
  vote_average?: number;
  vote_count?: number;
  error?: string;
}

export interface Image {
  aspect_ratio?: number;
  height?: number;
  iso_3166_1?: string;
  iso_639_1?: string;
  file_path?: string;
  vote_average?: number;
  vote_count?: number;
  width?: number;
}

export interface MovieImages {
  id: number;
  backdrops?: Array<Image>;
  logos?: Array<Image>;
  posters?: Array<Image>;
  error?: string;
}

export interface Cast {
  adult?: boolean;
  gender?: number;
  id: number;
  known_for_department?: string;
  name?: string;
  original_name?: string;
  popularity?: number;
  profile_path?: string;
  cast_id?: number;
  character?: string;
  credit_id?: string;
  order?: number;
}

export interface Crew {
  adult?: boolean;
  gender?: number;
  id: number;
  known_for_department?: string;
  name?: string;
  original_name?: string;
  popularity?: number;
  profile_path?: string;
  credit_id?: string;
  department?: string;
  job?: string;
}

export interface Credits {
  id?: number;
  cast?: Array<Cast>;
  crew?: Array<Crew>;
  error?: string;
}

export interface Trailer {
  iso_639_1?: string;
  iso_3166_1?: string;
  name?: string;
  key?: string;
  site?: string;
  size?: number;
  type?: string;
  official?: boolean;
  published_at?: Date;
  id?: string;
}

export interface MovieTrailers {
  id?: number;
  results?: Array<Trailer>;
  error?: string;
}

export interface Serie {
  backdrop_path?: string;
  first_air_date?: string;
  genre_ids?: Array<number>;
  id?: number;
  name?: string;
  origin_country?: Array<string>;
  original_language?: string;
  original_name?: string;
  overview?: string;
  popularity?: number;
  poster_path?: string;
  vote_average?: number;
  vote_count?: number;
}

export interface PopularSeriesResponse {
  page: number;
  results: Serie[];
  total_pages: number;
  total_results: number;
  error?: string;
}

export interface SerieDetails {
  adult?: boolean;
  backdrop_path?: string;
  is_favorite?: boolean;
  imdb_id?: string;
  created_by?: Array<{
    id?: number;
    credit_id?: string;
    name?: string;
    gender?: number;
    profile_path?: string;
  }>;
  episode_run_time?: number[];
  first_air_date?: string;
  genres?: Array<{
    id?: number;
    name?: string;
  }>;
  homepage?: string;
  id?: number;
  in_production?: boolean;
  languages?: string[];
  last_air_date?: string;
  last_episode_to_air?: {
    id?: number;
    name?: string;
    overview?: string;
    vote_average?: number;
    vote_count?: number;
    air_date: string;
    episode_number?: number;
    production_code?: string;
    runtime?: number;
    season_number?: number;
    show_id?: number;
    still_path?: string;
  };
  name?: string;
  next_episode_to_air?: null;
  networks?: Array<{
    id?: number;
    logo_path?: string;
    name?: string;
    origin_country?: string;
  }>;
  number_of_episodes?: number;
  number_of_seasons?: number;
  origin_country?: string[];
  original_language?: string;
  original_name?: string;
  overview?: string;
  popularity?: number;
  poster_path?: string;
  production_companies?: Array<{
    id?: number;
    logo_path?: string | null;
    name?: string;
    origin_country?: string;
  }>;
  production_countries?: Array<{
    iso_3166_1?: string;
    name?: string;
  }>;
  seasons?: Array<{
    air_date?: string;
    episode_count?: number;
    id?: number;
    name?: string;
    overview?: string;
    poster_path?: string;
    season_number?: number;
    vote_average?: number;
  }>;
  spoken_languages?: Array<{
    english_name?: string;
    iso_639_1?: string;
    name?: string;
  }>;
  status?: string;
  tagline?: string;
  type?: string;
  vote_average?: number;
  vote_count?: number;
  error?: string;
}

export interface Episode {
  id?: number;
  name?: string;
  air_date?: string;
  episode_number?: number;
  episode_type?: string;
  overview?: string;
  production_code?: string;
  runtime?: number;
  season_number?: number;
  show_id?: number;
  still_path?: string;
  vote_average?: number;
  vote_count?: number;
  crew?: Array<Crew>;
  guest_stars?: Array<any>;
  error?: string;
}
export interface SerieSeasonDetails {
  _id?: string;
  id?: number;
  air_date?: string;
  episodes?: Array<Episode>;
  name?: string;
  networks?: any;
  overview?: string;
  poster_path?: string;
  vote_average?: number;
  season_number?: number;
  error?: string;
}

export interface User {
  id?: number;
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  preferred_language?: string;
  picture?: string;
  oauth_provider?: string;
  created_at?: string;
  is_verified?: boolean;
  favorite_movies?: number[];
  favorite_series?: number[];
  deleted?: boolean;
  error?: string;
}

export interface AuthResponse {
  user?: User;
  access_token?: string;
  error?: string;
}

export interface AuthContextType {
  user: User | undefined;
  // token: string | undefined; \\ using httpOnly accessToken now
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => void;
  Glogin: (token: TokenResponse) => void;
  register: (
    username: string,
    email: string,
    password: string,
    confirmPassword: string,
    firstName: string,
    lastName: string,
  ) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

export interface BehaviorHints {
  bingeGroup?: string;
  filename?: string;
}

export interface StreamElement {
  name: string;
  title: string;
  infoHash: string;
  fileIdx?: number;
  behaviorHints?: BehaviorHints;
  sources?: string[];
}

export interface SourcesResponse {
  streams: StreamElement[];
  cacheMaxAge?: number;
  staleRevalidate?: number;
  staleError?: number;
  error?: string;
}
