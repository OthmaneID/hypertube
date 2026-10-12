import { Link } from "react-router-dom";
import { ImageConfigContext } from "../global/imageConfigContext";
import { useContext } from "react";
import { Star, Check, RotateCcw, Play } from "lucide-react";
import { checkWatched } from "../utils/api/userService/historyApi";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

function Card({
  tmdb_id,
  poster,
  title,
  vote,
  url,
  year,
  isExternal = false,
}: {
  poster?: string;
  tmdb_id: number;
  title?: string;
  vote?: number;
  url: string;
  year?: string;
  isExternal?: boolean;
}) {
  const { imageConfig } = useContext(ImageConfigContext);
  const { t } = useTranslation();
  const base =
    imageConfig.images?.secure_base_url ?? "https://image.tmdb.org/t/p/";
  const size = imageConfig.images?.poster_sizes?.[5] ?? "w500";
  const src = poster ? `${base}${size}${poster}` : undefined;

  const { data: history } = useQuery({
    queryFn: () => checkWatched(tmdb_id),
    queryKey: ["isWatched", tmdb_id],
    enabled: !!tmdb_id,
    staleTime: 60 * 1000,
  });

  const isWatched = Boolean(history?.watched);
  const isFinished = Boolean(history?.is_finished);
  const isWatching = isWatched && !isFinished;

  const cardInner = (
    <>
      <div
        className={`relative w-45 h-67.5 rounded-2xl overflow-hidden shadow-lg transition-all duration-300 group-hover:shadow-2xl group-hover:-translate-y-2 ${
          isFinished
            ? "ring-2 ring-emerald-500/70 shadow-[0_0_20px_-3px_rgba(16,185,129,0.35)] group-hover:ring-emerald-400 group-hover:shadow-[0_0_28px_-2px_rgba(16,185,129,0.55)]"
            : isWatching
            ? "ring-2 ring-amber-500/70 shadow-[0_0_20px_-3px_rgba(245,158,11,0.35)] group-hover:ring-amber-400 group-hover:shadow-[0_0_28px_-2px_rgba(245,158,11,0.55)]"
            : "border border-white/5"
        }`}
      >
        {/* Image / placeholder */}
        {src ? (
          <img
            src={src}
            alt={title}
            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-110 ${
              isFinished
                ? "brightness-95 contrast-[1.02]"
                : isWatching
                ? "brightness-100 contrast-[1.02]"
                : ""
            }`}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <span className="text-gray-500 text-xs text-center px-2">
              {title}
            </span>
          </div>
        )}

        {/* Ambient tint */}
        {isFinished && (
          <div className="absolute inset-0 bg-radial from-emerald-500/10 via-transparent to-black/30 pointer-events-none" />
        )}
        {isWatching && (
          <div className="absolute inset-0 bg-radial from-amber-500/10 via-transparent to-black/30 pointer-events-none" />
        )}

        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Top-left Badges (Finished / In-Progress / Archive) */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 items-start pointer-events-none">
          {isFinished && (
            <div className="flex items-center gap-1 bg-emerald-600/90 text-white text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full shadow-lg shadow-emerald-950/60 backdrop-blur-md border border-emerald-400/40">
              <Check className="w-3 h-3 stroke-3" />
              <span>{t("common.watched", "Watched")}</span>
            </div>
          )}
          {isWatching && (
            <div className="flex items-center gap-1.5 bg-amber-600/90 text-white text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full shadow-lg shadow-amber-950/60 backdrop-blur-md border border-amber-400/40">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-200 animate-pulse" />
              <span>{t("common.watching", "Watching")}</span>
            </div>
          )}
          {isExternal && (
            <div className="px-1.5 py-0.5 rounded bg-amber-600/90 text-white text-[10px] font-bold tracking-wide shadow">
              {t("common.archive", "archive")}
            </div>
          )}
        </div>

        {/* Rating badge */}
        {!!vote && vote > 0 && (
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-yellow-500/30">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-semibold text-white">
              {vote.toFixed(1)}
            </span>
          </div>
        )}

        {/* Bottom progress bar */}
        {isFinished && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/60 z-10 overflow-hidden">
            <div className="h-full w-full bg-linear-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          </div>
        )}
        {isWatching && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/70 z-10 overflow-hidden">
            <div className="h-full w-1/2 bg-linear-to-r from-amber-500 to-orange-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
          </div>
        )}

        {/* Action button overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          {isFinished ? (
            <div className="flex flex-col items-center gap-1.5 transform transition-all duration-300 group-hover:scale-105">
              <div className="w-13 h-13 rounded-full bg-emerald-500/30 backdrop-blur-md flex items-center justify-center border border-emerald-400/60 shadow-[0_0_20px_rgba(16,185,129,0.45)] group-hover:bg-emerald-500/40">
                <RotateCcw className="w-6 h-6 text-white stroke-[2.2]" />
              </div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] bg-black/70 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                {t("common.rewatch", "Rewatch")}
              </span>
            </div>
          ) : isWatching ? (
            <div className="flex flex-col items-center gap-1.5 transform transition-all duration-300 group-hover:scale-105">
              <div className="w-13 h-13 rounded-full bg-amber-500/30 backdrop-blur-md flex items-center justify-center border border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.45)] group-hover:bg-amber-500/40">
                <Play className="w-6 h-6 text-white fill-white ml-0.5" />
              </div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] bg-black/70 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-amber-500/40">
                {t("common.continue", "Continue")}
              </span>
            </div>
          ) : (
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 transition-transform duration-300 group-hover:scale-105">
              <div className="w-0 h-0 border-t-8 border-t-transparent border-l-14 border-l-white border-b-8 border-b-transparent ml-1" />
            </div>
          )}
        </div>
      </div>

      {/* Title + year + status */}
      <div className="mt-3 w-45">
        <p
          className={`text-sm font-medium truncate transition-colors ${
            isFinished
              ? "text-gray-100 group-hover:text-emerald-300"
              : isWatching
              ? "text-gray-100 group-hover:text-amber-300"
              : "text-gray-200 group-hover:text-white"
          }`}
          title={title}
        >
          {title}
        </p>
        <div className="flex items-center justify-between text-xs mt-0.5">
          {year ? <span className="text-gray-500">{year}</span> : <span />}
          {isFinished && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400/90">
              <Check className="w-3 h-3 stroke-2.5" />
              <span>{t("common.watched", "Watched")}</span>
            </span>
          )}
          {isWatching && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400/90">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>{t("common.watching", "Watching")}</span>
            </span>
          )}
        </div>
      </div>
    </>
  );

  if (isExternal) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative flex flex-col items-center"
      >
        {cardInner}
      </a>
    );
  }

  return (
    <Link to={url} className="group relative flex flex-col items-center">
      {cardInner}
    </Link>
  );
}

export default Card;
