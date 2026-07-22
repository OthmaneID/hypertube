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
import { getImageConfig, getMovieDetails, getMovieImages } from "../utils/api";
import { ImageConfigContext } from "../global/imageConfigContext";
import StreamingOptions from "../components/MovieDetails/StreamingOptions";
import { BiCameraMovie, BiMovie, BiMoviePlay, BiStar } from "react-icons/bi";
import { BsArrowLeft } from "react-icons/bs";
import type { Credits as ICredits } from "../utils/interfaces";
import { getMovieCredits } from "../utils/api";
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
  const [showModule, setShowModule] = useState(false);
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
    <div className="relative select-none scroll-smooth">
      <div
        className="absolute left-1 top-0 z-[60] text-5xl font-bold text-gray-300 cursor-pointer w-[60px] h-[50px] flex "
        onClick={() => window.history.back()}
      >
        <BsArrowLeft className="[-webkit-text-stroke:0.5px_purple] " />
      </div>
      {/* backdrop image */}
      <div className="bg-cover h-screen w-full z-20 absolute top-0 left-0">
        {movie?.backdrop_path !== null && (
          <img
            src={image_baseUrl + backdrop_size + movie?.backdrop_path}
            alt={movie?.title}
            className="h-full w-full bg-cover bg-center bg-no-repeat"
            loading="lazy"
          />
        )}
        <div className="bg-gradient-to-t from-[#000000b2] to-[#200049b2] opacity-60 z-30 absolute top-0 left-0 h-full w-full"></div>
      </div>
      <div className="absolute z-50 top-0  left-0 flex w-full h-screen flex-row flex-wrap overflow-auto">
        {/* movie details section*/}
        <div className=" h-screen py-5 px-6 flex flex-col justify-between  w-3/4 min-w-[500px]">
          <div className="pt-5 gap-6 flex flex-row w-full justify-between">
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
            <span className="px-4 py-2 text-purple-300 font-bold text-2xl  h-8 rounded-xl bg-gray-400/40 flex items-center justify-center">
              {movie?.status}
            </span>
          </div>
          {/* runtime, date, vote, trailer */}
          <div className="flex flex-row justify-between  text-gray-200 font-bold text-3xl  mt-6">
            <div className="flex flex-row gap-6 items-center">
              <span>{movie?.runtime} min</span>
              <span>
                {new Date(movie?.release_date ?? "").getFullYear().toString()}
              </span>
              <span className="flex flex-row">
                {movie?.vote_average?.toFixed(1)}{" "}
                <BiStar className="text-yellow-400" />
              </span>
            </div>
            <div>
              <span
                className="flex flex-row gap-2 items-center text-4xl bg-gray-700/40 px-4 py-2 rounded-xl cursor-pointer hover:bg-gray-700/50 active:scale-105 duration-300"
                title="Play Trailer"
                onClick={() => {
                  setShowModule(true);
                }}
              >
                <BiCameraMovie className="text-purple-700" />
              </span>
            </div>
          </div>
          <div className="w-full flex flex-col gap-4 items-start">
            <div className="flex flex-col gap-2 w-full ">
              <span className="text-2xl text-gray-300 font-semibold [-webkit-text-stroke:0.5px_purple]">
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
                      className="px-3 h-[70px] w-[200px] rounded-xl bg-gray-500/50 text-gray-200 text-sm font-bold text-left flex-shrink-0 flex flex-col justify-center"
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
              <div
                ref={crewRef}
                className="flex flex-row gap-3 overflow-x-auto pb-2 cursor-grab active:cursor-grabbing"
                onMouseDown={(event) => startDragging(event, crewRef.current)}
                onMouseMove={(event) => onDrag(event, crewRef.current)}
                onMouseLeave={stopDragging}
                onMouseUp={stopDragging}
              >
                {credits?.crew?.map((crew, index) => {
                  return (
                    <div
                      className="px-3 h-[70px] w-[200px] rounded-xl bg-gray-500/50 text-gray-200 text-sm font-bold text-left flex-shrink-0 flex flex-col justify-center"
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
          <div className=" flex flex-col w-full">
            <span className="text-2xl text-gray-300 font-semibold [-webkit-text-stroke:0.5px_purple] ">
              summary
            </span>
            <span className="text-lg text-white">{movie?.overview}</span>
          </div>
        </div>
        {/* streaming options section */}
        <StreamingOptions movie_id={movieId} movie_name={movie?.title ?? ""} />
      </div>
      {/* trailer module */}
      {showModule && (
        <TrailerModule
          movie_id={movieId}
          show={showModule}
          setShow={setShowModule}
        />
      )}
    </div>
  );
}

export default MovieDetails;
