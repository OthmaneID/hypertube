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
  tmdbId?: number;
  season?: number;
  episode?: number;
  // Shown in the player: the movie or show name, and for episodes a line like "S1 E3 · Pilot"
  title?: string;
  episodeTitle?: string;
}

export function buildWatchPath(stream: StreamElement, { duration, imdbId, tmdbId, season, episode, title, episodeTitle }: WatchContext = {}): string {
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
  if (tmdbId !== undefined) params.set("tmdb", String(tmdbId));
  if (title) params.set("title", title);
  if (episodeTitle) params.set("episodeTitle", episodeTitle);
  const query = params.toString();
  return `/watch/${stream.infoHash}${query ? `?${query}` : ""}`;
}
