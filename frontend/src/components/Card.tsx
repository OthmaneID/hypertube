import { Link } from "react-router-dom";
import { ImageConfigContext } from "../global/imageConfigContext";
import { useContext } from "react";
import { Star } from "lucide-react";

function Card({
  id,
  poster,
  title,
  vote,
  url,
  year,
  isExternal = false,
}: {
  id?: number;
  poster?: string;
  title?: string;
  vote?: number;
  url: string;
  year?: string;
  isExternal?: boolean;
}) {
  const { imageConfig } = useContext(ImageConfigContext);
  const base =
    imageConfig.images?.secure_base_url ?? "https://image.tmdb.org/t/p/";
  const size = imageConfig.images?.poster_sizes?.[5] ?? "w500";
  const src = poster ? `${base}${size}${poster}` : undefined;

  const cardInner = (
    <>
      <div className="relative w-45 h-67.5 rounded-2xl overflow-hidden shadow-lg transition-all duration-300 group-hover:shadow-2xl group-hover:-translate-y-2">
        {/* Image / placeholder */}
        {src ? (
          <img
            src={src}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <span className="text-gray-500 text-xs text-center px-2">{title}</span>
          </div>
        )}

        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Rating badge */}
        {!!vote && vote > 0 && (
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-yellow-500/30">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-semibold text-white">
              {vote.toFixed(1)}
            </span>
          </div>
        )}

        {/* archive.org badge */}
        {isExternal && (
          <div className="absolute top-3 left-3 px-1.5 py-0.5 rounded bg-amber-600/80 text-white text-[10px] font-bold tracking-wide">
            archive
          </div>
        )}

        {/* Play button overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
            <div className="w-0 h-0 border-t-8 border-t-transparent border-l-14 border-l-white border-b-8 border-b-transparent ml-1" />
          </div>
        </div>
      </div>

      {/* Title + year */}
      <div className="mt-3 w-45">
        <p
          className="text-sm font-medium text-gray-200 truncate group-hover:text-white transition-colors"
          title={title}
        >
          {title}
        </p>
        {year && (
          <p className="text-xs text-gray-500 mt-0.5">{year}</p>
        )}
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

