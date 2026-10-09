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
}

export function buildWatchPath(stream: StreamElement, { duration, imdbId, season, episode }: WatchContext = {}): string {
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
  const query = params.toString();
  return `/watch/${stream.infoHash}${query ? `?${query}` : ""}`;
}
