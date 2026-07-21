import { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  type Image,
  type MovieDetails as IMovieDetails,
} from "../utils/interfaces";
import { getImageConfig, getMovieDetails, getMovieImages } from "../utils/api";
import { ImageConfigContext } from "../global/imageConfigContext";
import { BiStar } from "react-icons/bi";
import { BsArrowLeft } from "react-icons/bs";
import type { Credits as ICredits } from "../utils/interfaces";
import { getMovieCredits } from "../utils/api";

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
  const [credits, setCredits] = useState<ICredits>();

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

    getMovieCredits(movieId).then((data) => {
      setCredits(data);
    });
  }, []);
  return (
    <div className="relative">
      <div
        className="absolute left-1 top-0 z-100 text-5xl font-bold text-gray-300 cursor-pointer w-[100px] h-[100px] flex "
        onClick={() => window.history.back()}
      >
        <BsArrowLeft className="[-webkit-text-stroke:0.5px_purple] " />
      </div>
      {/* backdrop image */}
      <div className="bg-cover h-screen w-full z-20 absolute top-0 left-0">
        <img
          src={image_baseUrl + backdrop_size + movie?.backdrop_path}
          alt={movie?.title}
          className="h-full w-full bg-cover bg-center bg-no-repeat"
          loading="lazy"
        />
        <div className="bg-gradient-to-t from-[#000000] to-[#200049] opacity-60 z-30 absolute top-0 left-0 h-full w-full"></div>
      </div>
      <div className="absolute top-0 py-5 left-0 w-full h-screen z-50 px-6 flex flex-col justify-between overflow-auto">
        <div className="pt-5 gap-6">
          {/* here should be the logo */}
          {titleLogo?.file_path ? (
            <img
              src={image_baseUrl + poster_size + "/" + titleLogo?.file_path}
              alt={movie?.title}
              className="w-[600px]"
              loading="lazy"
            />
          ) : (
            <span className="text-[50px] font-bold text-gray-200 [-webkit-text-stroke:0.5px_purple] ">
              {movie?.title}
            </span>
          )}
        </div>
        <div className="flex flex-row gap-6 text-gray-200 font-bold text-3xl  mt-6">
          <span>{movie?.runtime} min</span>
          <span>
            {new Date(movie?.release_date ?? "").getFullYear().toString()}
          </span>
          <span className="flex flex-row">
            {movie?.vote_average?.toFixed(1)}{" "}
            <BiStar className="text-yellow-400" />
          </span>
        </div>
        <div className="w-full flex flex-col gap-4 items-center">
          <div className="flex flex-col gap-2 w-full">
            <span className="text-2xl text-gray-300 font-semibold [-webkit-text-stroke:0.5px_purple]">
              Genres
            </span>
            <div className="flex flex-row gap-3 overflow-x-auto pb-2">
              {movie?.genres?.map((genre, index) => {
                return (
                  <span
                    className="px-3 py-1 rounded-xl bg-gray-500/50 text-gray-200 text-lg font-bold text-center flex-shrink-0"
                    key={index}
                  >
                    {genre.name}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full">
            <span className="text-2xl text-gray-300 font-semibold [-webkit-text-stroke:0.5px_purple]">
              Cast
            </span>
            <div className="flex flex-row gap-3 overflow-x-auto pb-2">
              {credits?.cast?.map((cast, index) => {
                return (
                  <div
                    className="px-3 py-2 h-[100px] w-[200px] rounded-xl bg-gray-500/50 text-gray-200 text-sm font-bold text-left flex-shrink-0 flex flex-col justify-center"
                    key={index}
                  >
                    <span className="text-base">{cast.name}</span>
                    <span className="text-sm text-gray-300">
                      {cast.character}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full">
            <span className="text-2xl text-gray-300 font-semibold [-webkit-text-stroke:0.5px_purple]">
              Crew
            </span>
            <div className="flex flex-row gap-3 overflow-x-auto pb-2">
              {credits?.crew?.map((crew, index) => {
                return (
                  <div
                    className="px-3 py-2 h-[100px] w-[200px] rounded-xl bg-gray-500/50 text-gray-200 text-sm font-bold text-left flex-shrink-0 flex flex-col justify-center"
                    key={index}
                  >
                    <span className="text-base">{crew.name}</span>
                    <span className="text-sm text-gray-300">{crew.job}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {/* overview */}
        <div className=" flex flex-col w-2/3">
          <span className="text-2xl text-gray-300 font-semibold [-webkit-text-stroke:0.5px_purple] ">
            summary
          </span>
          <span className="text-lg text-white">{movie?.overview}</span>
        </div>
      </div>
    </div>
  );
}

export default MovieDetails;
