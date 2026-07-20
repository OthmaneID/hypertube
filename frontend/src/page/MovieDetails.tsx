import { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  type Image,
  type MovieDetails as IMovieDetails,
} from "../utils/interfaces";
import { getImageConfig, getMovieDetails, getMovieImages } from "../utils/api";
import { ImageConfigContext } from "../global/imageConfigContext";
import { BiStar } from "react-icons/bi";

function MovieDetails() {
  const { imageConfig, setImageConfig } = useContext(ImageConfigContext);
  let { id } = useParams();
  let movieId = parseInt(id || "");
  const image_baseUrl =
    imageConfig.images?.secure_base_url ?? "https://image.tmdb.org/t/p/";
  const backdrop_size = "original";
  const poster_size = imageConfig.images?.poster_sizes?.[5] ?? "w500";

  const [movie, setMovie] = useState<IMovieDetails>();
  const [titleLogo, setTitleLogo] = useState<Image>();

  useEffect(() => {
    getMovieDetails(movieId).then((data) => {
      setMovie(data);
    });
    getImageConfig().then((data) => {
      setImageConfig(data);
    });

    getMovieImages(movieId).then((data) => {
      setTitleLogo(data.logos?.[0]);
    });
  }, []);
  return (
    <div className="relative">
      {/* backdrop image */}
      <div className="bg-cover h-screen w-full z-20 absolute top-0 left-0">
        <img
          src={image_baseUrl + backdrop_size + movie?.backdrop_path}
          alt={movie?.title}
          className="h-full w-full bg-cover bg-center bg-no-repeat"
          loading="lazy"
        />
        <div className="bg-gradient-to-t from-[#000000] to-[#250055c0] opacity-50 z-30 absolute top-0 left-0 h-full w-full"></div>
      </div>
      <div className="absolute top-0 left-0 w-full h-full z-50 px-4">
        <div className="py-5">
          {/* here shouold be the logo */}
          <img
            src={image_baseUrl + poster_size + "/" + titleLogo?.file_path}
            alt={movie?.title}
            className="w-[600px]"
            loading="lazy"
          />
          <div className="flex flex-row gap-6 text-gray-200 font-bold text-3xl  mt-2">
            <span>{movie?.runtime} min</span>
            <span>
              {new Date(movie?.release_date ?? "").getFullYear().toString()}
            </span>
            <span className="flex flex-row">
              {movie?.vote_average?.toFixed(1)}{" "}
              <BiStar className="text-yellow-400" />
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-2xl text-gray-300 font-semibold [-webkit-text-stroke:0.5px_purple] ">
            Genres
          </span>
          <div className="flex flex-row gap-3">
            {movie?.genres?.map((genre, index) => {
              return (
                <span
                  className="px-3 py-1 rounded-xl bg-gray-500/50 text-gray-200 text-lg font-bold text-center"
                  key={index}
                >
                  {genre.name}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MovieDetails;
