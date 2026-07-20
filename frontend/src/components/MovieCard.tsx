import { Link } from "react-router-dom";
import { ImageConfigContext } from "../global/imageConfigContext";
import { useContext } from "react";

function MovieCard({
  id,
  poster,
  title,
  vote,
}: {
  id?: number;
  poster?: string;
  title?: string;
  vote?: number;
}) {
  const { imageConfig } = useContext(ImageConfigContext);
  const base =
    imageConfig.images?.secure_base_url ?? "https://image.tmdb.org/t/p/";
  const size = imageConfig.images?.poster_sizes?.[5] ?? "w500";
  const src = poster ? `${base}${size}${poster}` : undefined;
  return (
    <Link
      to={"/movies/" + id}
      className="movie-card cursor-pointer duration-300 relative group flex flex-col justify-center items-center max-w-[175px] min-w-[175px] mx-5 h-[250px] rounded-2xl"
    >
      <img
        src={src}
        alt={title}
        className="group-hover:outline-2 group-hover:outline-white rounded-lg w-[175px] h-[220px] duration-200 object-fill" loading="lazy"
      />
      <p className="text-2xl absolute left-0 top-0 text-yellow-400 font-bold [-webkit-text-stroke:1px_black] py-1 px-1 rounded-br-lg bg-gray-50/30">
        {vote?.toFixed(1)}
      </p>
      <p
        className="text-lg text-gray-400 h-[30px] w-full overflow-hidden text-ellipsis text-nowrap "
        title={title}
      >
        {title}
      </p>
    </Link>
  );
}

export default MovieCard;
