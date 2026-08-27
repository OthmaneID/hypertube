import {
  useContext,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { useParams } from "react-router-dom";
import {
  type Image,
  type MovieDetails as IMovieDetails,
} from "../utils/interfaces";
import { getImageConfig, getMovieImages } from "../utils/api/movieService/imagesApi";

import { ImageConfigContext } from "../global/imageConfigContext";
import StreamingOptions from "../components/MovieDetails/StreamingOptions";
import { BiCameraMovie, BiPlay, BiStar } from "react-icons/bi";
import { BsArrowLeft } from "react-icons/bs";
import type { Credits as ICredits } from "../utils/interfaces";
import { getMovieCredits, getMovieDetails } from "../utils/api/movieService/moviesApi";
import TrailerModule from "../components/TrailerModule";

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
  const [showModule, setShowModule] = useState(false)
  const [showStreams, setShowStreams] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const genresRef = useRef<HTMLDivElement | null>(null);
  const castRef = useRef<HTMLDivElement | null>(null);
  const crewRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{
    isDragging: boolean;
    startX: number;
    scrollLeft: number;
  }>({
    isDragging: false,
    startX: 0,
    scrollLeft: 0,
  });

  useEffect(() => {
    const moviePromise = getMovieDetails(movieId).then((data) => {
      setMovie(data);
    });
    const imageConfigPromise = getImageConfig().then((data) => {
      setImageConfig(data);
    });

    const movieImagesPromise = getMovieImages(movieId).then((data) => {
      setTitleLogo(data.logos?.[0]);
    });

    const movieCreditsPromise = getMovieCredits(movieId).then((data) => {
      setCredits(data);
    });

    const allPromises = Promise.all([
      moviePromise,
      imageConfigPromise,
      movieImagesPromise,
      movieCreditsPromise,
    ]);
    setIsLoading(true)

    allPromises.finally(() => setIsLoading(false));
  }, []);



  const startDragging = (
    event: MouseEvent<HTMLDivElement>,
    ref: HTMLDivElement | null,
  ) => {
    if (!ref) return;
    dragState.current = {
      isDragging: true,
      startX: event.pageX - ref.offsetLeft,
      scrollLeft: ref.scrollLeft,
    };
  };

  const onDrag = (
    event: MouseEvent<HTMLDivElement>,
    ref: HTMLDivElement | null,
  ) => {
    if (!ref || !dragState.current.isDragging) return;
    event.preventDefault();
    const x = event.pageX - ref.offsetLeft;
    const walk = (x - dragState.current.startX) * 1.2;
    ref.scrollLeft = dragState.current.scrollLeft - walk;
  };

  const stopDragging = () => {
    dragState.current.isDragging = false;
  };

  if (isLoading)
    return (
      <div className="w-full flex justify-center items-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-16 w-16 rounded-full border-4 border-white/20 border-t-white animate-spin" />
          <span className="text-gray-300">Loading movies...</span>
        </div>
      </div>
    );

  return (
    <div className="relative select-none scroll-smooth h-full">
      {/* back button */}
      <div className="absolute z-40 left-1 top-0 text-5xl font-bold text-gray-300 cursor-pointer w-15 h-12.5 flex "
        onClick={() => window.history.back()}
      >
        <BsArrowLeft className="text-gray-300" />
      </div>

      {/* backdrop image */}
      <div className="absolute top-0 left-0 bg-cover h-full w-full ">
        {movie?.backdrop_path !== null && (
          <img
            src={image_baseUrl + backdrop_size + movie?.backdrop_path}
            alt={movie?.title}
            className="h-full w-full bg-cover bg-center bg-no-repeat"
            loading="lazy"
          />
        )}
        <div className="bg-linear-to-t from-black/70 to-black/40 absolute top-0 left-0 h-full w-full"></div>
      </div>
      <div className="relative z-30 w-full h-full overflow-auto">
        {/* movie details section*/}
        <div className="h-full py-5 px-6 flex flex-col justify-between w-full">
          <div className="pt-5 gap-6 flex flex-row-reverse flex-wrap w-full justify-between">
            {/* here should be the logo */}
            <span className="px-2 py-2 text-white font-bold text-2xl  h-8 rounded-xl bg-gray-700 flex items-center justify-start">
              {movie?.status}
            </span>
            {titleLogo?.file_path ? (
              <img
                src={image_baseUrl + poster_size + "/" + titleLogo?.file_path}
                alt={movie?.title}
                width="600px"
                height="auto"
                loading="lazy"
              />
            ) : (
              <span className="text-[50px] font-bold text-gray-200">
                {movie?.title}
              </span>
            )}
          </div>
          {/* runtime, date, vote, trailer, streams */}
          <div className="flex flex-row flex-wrap justify-between  text-gray-200 font-bold text-3xl  mt-6">
            <div className="flex flex-row gap-6 items-center w-1/2 min-w-50 max-md:w-full">
              <span className="text-nowrap">{movie?.runtime} min</span>
              <span className="text-nowrap">
                {new Date(movie?.release_date ?? "").getFullYear().toString()}
              </span>
              <span className="flex flex-row">
                {movie?.vote_average?.toFixed(1)}{" "}
                <BiStar className="text-yellow-400" />
              </span>
            </div>
            <div className="flex flex-row justify-end gap-5 items-center w-1/2 min-w-50 max-md:w-full">
              <div>
                <span
                  className="group peer flex flex-row gap-2 items-center text-4xl bg-gray-500/60 px-4 py-2 rounded-xl cursor-pointer hover:bg-gray-500/70 active:scale-105 duration-300"
                  title="Play Trailer"
                  onClick={() => {
                    setShowModule(true);
                  }}
                >
                  <BiCameraMovie className="group-hover:text-white text-gray-300" />
                </span>
                <span className="text-sm opacity-0 peer-hover:opacity-100 transition-opacity duration-200">
                  View trailer
                </span>
              </div>
              <div>
                <span
                  className="group peer flex flex-row gap-2 justify-center items-center text-4xl bg-gray-500/60 px-4 py-2 rounded-xl cursor-pointer hover:bg-gray-500/70 active:scale-105 duration-300"
                  title="Stream Movie"
                  onClick={() => {
                    setShowStreams(true);
                  }}
                >
                  <BiPlay className="group-hover:text-white text-gray-300" />
                </span>
                <span className="text-sm opacity-0 peer-hover:opacity-100 transition-opacity duration-200">
                  Stream Movie
                </span>
              </div>
            </div>
          </div>
          <div className="w-full flex flex-col gap-4 items-start">
            <div className="flex flex-col gap-2 w-full ">
              <span className="text-2xl text-gray-300 font-semibold">
                Genres
              </span>
              <div
                ref={genresRef}
                className="flex flex-row gap-3 overflow-x-auto pb-2 cursor-grab active:cursor-grabbing"
                onMouseDown={(event) => startDragging(event, genresRef.current)}
                onMouseMove={(event) => onDrag(event, genresRef.current)}
                onMouseLeave={stopDragging}
                onMouseUp={stopDragging}
              >
                {movie?.genres?.map((genre, index) => {
                  return (
                    <span
                      className="px-1.5 py-1 rounded-xl bg-gray-500/50 text-gray-200 text-lg font-bold text-center shrink-0"
                      key={index}
                    >
                      {genre.name}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full">
              <span className="text-2xl text-gray-300 font-semibold">
                Cast
              </span>
              <div
                ref={castRef}
                className="flex flex-row gap-3 overflow-x-auto pb-2 cursor-grab active:cursor-grabbing"
                onMouseDown={(event) => startDragging(event, castRef.current)}
                onMouseMove={(event) => onDrag(event, castRef.current)}
                onMouseLeave={stopDragging}
                onMouseUp={stopDragging}
              >
                {credits?.cast?.map((cast, index) => {
                  return (
                    <div
                      className="px-1.5 h-17.5 w-50 rounded-xl bg-gray-500/50 text-gray-200 text-sm font-bold text-left shrink-0 flex flex-col justify-center"
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
              <span className="text-2xl text-gray-300 font-semibold">
                Crew
              </span>
              <div
                ref={crewRef}
                className="flex flex-row gap-3 overflow-x-auto overflow-y-hidden pb-2 cursor-grab active:cursor-grabbing"
                onMouseDown={(event) => startDragging(event, crewRef.current)}
                onMouseMove={(event) => onDrag(event, crewRef.current)}
                onMouseLeave={stopDragging}
                onMouseUp={stopDragging}
              >
                {credits?.crew?.map((crew, index) => {
                  return (
                    <div
                      className="px-1.5 h-17.5 w-50 rounded-xl bg-gray-500/50 text-gray-200 text-sm font-bold text-left shrink-0 flex flex-col justify-center"
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
          <div className=" flex flex-col w-full rounded-2xl py-2 px-4 bg-gray-50/50 ">
            <span className="text-3xl text-gray-800 font-semibold mb-2">
              summary
            </span>
            <span className="text-2xl ">{movie?.overview}</span>
          </div>
        </div>
      </div>
      {/* streaming options section */}
      {
        showStreams && (
          <StreamingOptions movie_id={movieId} movie_name={movie?.title ?? ""} setShowStreams={setShowStreams} showStreams={showStreams} />
        )
      }
      {/* trailer module */}
      {showModule && (
        <TrailerModule
          type="movie"
          id={movieId}
          show={showModule}
          setShow={setShowModule}
        />
      )}
    </div>
  );
}

export default MovieDetails;
