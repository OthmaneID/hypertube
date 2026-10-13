import type { StreamElement } from "./interfaces";

export function getSeeders(stream: StreamElement): number | null {
  const seeders = (stream.title || "").match(/👤\s*(\d+)/)?.[1];
  return seeders ? Number(seeders) : null;
}

export function sortBySeeders(streams: StreamElement[]): StreamElement[] {
  return [...streams].sort((a, b) => (getSeeders(b) ?? -1) - (getSeeders(a) ?? -1));
}

export interface WatchContext {
  duration?: number;
  imdbId?: string;
  season?: number;
  episode?: number;
  // Shown in the player: the movie or show name, and for episodes a line like "S1 E3 · Pilot"
  title?: string;
  episodeTitle?: string;
  // Lets the player save the user's progress for the "continue watching" list
  tmdbId?: number;
  mediaType?: WatchMediaType;
  poster?: string;
}

export type WatchMediaType = "movie" | "tv";

export function buildWatchPath(stream: StreamElement, { duration, imdbId, season, episode, title, episodeTitle, tmdbId, mediaType, poster }: WatchContext = {}): string {
  const params = new URLSearchParams();
  if (stream.fileIdx !== undefined && stream.fileIdx !== null) {
    params.set("fileIdx", String(stream.fileIdx));
  }
  if (stream.behaviorHints?.filename) {
    params.set("filename", stream.behaviorHints.filename);
  }
  if (duration !== undefined) {
    params.set("duration", String(duration));
  }
  if (imdbId) {
    params.set("imdb", imdbId);
    if (season !== undefined && episode !== undefined) {
      params.set("season", String(season));
      params.set("episode", String(episode));
    }
  }
  if (title) params.set("title", title);
  if (episodeTitle) params.set("episodeTitle", episodeTitle);
  if (tmdbId !== undefined && mediaType) {
    params.set("tmdb", String(tmdbId));
    params.set("type", mediaType);
  }
  if (poster) params.set("poster", poster);
  const query = params.toString();
  return `/watch/${stream.infoHash}${query ? `?${query}` : ""}`;
}
