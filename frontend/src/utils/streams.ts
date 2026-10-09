import type { StreamElement } from "./interfaces";

export function getSeeders(stream: StreamElement): number | null {
  const seeders = (stream.title || "").match(/👤\s*(\d+)/)?.[1];
  return seeders ? Number(seeders) : null;
}

export function sortBySeeders(streams: StreamElement[]): StreamElement[] {
  return [...streams].sort((a, b) => (getSeeders(b) ?? -1) - (getSeeders(a) ?? -1));
}

// `title` and `subtitle` are only shown in the player (e.g. the show name and "S1 E3 · Pilot")
export function buildWatchPath(stream: StreamElement, duration?: number, title?: string, subtitle?: string): string {
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
  if (title) params.set("title", title);
  if (subtitle) params.set("subtitle", subtitle);
  const query = params.toString();
  return `/watch/${stream.infoHash}${query ? `?${query}` : ""}`;
}
