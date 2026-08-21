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
  type SerieDetails as ISerieDetails,
} from "../utils/interfaces";
import {
  getImageConfig,
  getSerieImages,
} from "../utils/api/movieService/imagesApi";
import { ImageConfigContext } from "../global/imageConfigContext";
import StreamingOptions from "../components/MovieDetails/StreamingOptions";
import { BiCameraMovie, BiStar } from "react-icons/bi";
import { BsArrowLeft } from "react-icons/bs";
import type { Credits as ICredits } from "../utils/interfaces";
import { getSerieCredits, getSerieDetails } from "../utils/api/movieService/seriesApi";
import TrailerModule from "../components/TrailerModule";

function SerieDetails() {
  const { imageConfig, setImageConfig } = useContext(ImageConfigContext);
  let { id } = useParams();
  let serieId = parseInt(id || "");
  const image_baseUrl =
    imageConfig.images?.secure_base_url ?? "https://image.tmdb.org/t/p/";
  const backdrop_size = "original";
  const poster_size = imageConfig.images?.poster_sizes?.[5] ?? "w500";

  const [serie, setSerie] = useState<ISerieDetails>();
  const [titleLogo, setTitleLogo] = useState<Image>();
  const [credits, setCredits] = useState<ICredits>();
  const [showModule, setShowModule] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
    const seriePromise = getSerieDetails(serieId).then((data) => {
      setSerie(data);
      console.log(data);
    });
    const imageConfigPromise = getImageConfig().then((data) => {
      setImageConfig(data);
    });

    const serieImagesPromise = getSerieImages(serieId).then((data) => {
      setTitleLogo(data.logos?.[0]);
    });

    const serieCreditsPromise = getSerieCredits(serieId).then((data) => {
      setCredits(data);
    });

    const allPromises = Promise.all([
      seriePromise,
      imageConfigPromise,
      serieImagesPromise,
      serieCreditsPromise,
    ]);
    setIsLoading(true);

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
        {serie?.backdrop_path !== null && (
          <img
            src={image_baseUrl + backdrop_size + serie?.backdrop_path}
            alt={serie?.name}
            className="h-full w-full bg-cover bg-center bg-no-repeat"
            loading="lazy"
          />
        )}
        <div className="bg-gradient-to-t from-[#000000b2] to-[#200049b2] opacity-60 z-30 absolute top-0 left-0 h-full w-full"></div>
      </div>
      <div className="absolute z-50 top-0  left-0 flex w-full h-screen flex-row flex-wrap overflow-auto">
        {/* serie details section*/}
        <div className=" h-screen py-5 px-6 flex flex-col justify-between  w-3/4 min-w-[500px]">
          <div className="pt-5 gap-6 flex flex-row w-full justify-between">
            {/* here should be the logo */}
            {titleLogo?.file_path ? (
              <img
                src={image_baseUrl + poster_size + "/" + titleLogo?.file_path}
                alt={serie?.name}
                className="w-[600px]"
                loading="lazy"
              />
            ) : (
              <span className="text-[50px] font-bold text-gray-200 [-webkit-text-stroke:0.5px_purple] ">
                {serie?.name}
              </span>
            )}
            <span className="px-4 py-2 text-purple-300 font-bold text-2xl  h-8 rounded-xl bg-gray-400/40 flex items-center justify-center">
              {serie?.status}
            </span>
          </div>
          {/* runtime, date, vote, trailer */}
          <div className="flex flex-row justify-between  text-gray-200 font-bold text-3xl  mt-6">
            <div className="flex flex-row gap-6 items-center">
              <span>
                {new Date(serie?.first_air_date ?? "").getFullYear().toString()}
                <span> - </span>
                {serie?.status === "Ended"
                  ? new Date(serie?.last_air_date ?? "")
                    .getFullYear()
                    .toString()
                  : "..."}
              </span>
              <span className="flex flex-row">
                {serie?.vote_average?.toFixed(1)}{" "}
                <BiStar className="text-yellow-400" />
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span
                className="group peer flex flex-row gap-2 items-center text-4xl bg-gray-500/60 px-4 py-2 rounded-xl cursor-pointer hover:bg-gray-500/70 active:scale-105 duration-300"
                title="Play Trailer"
                onClick={() => {
                  setShowModule(true);
                }}
              >
                <BiCameraMovie className="group-hover:text-purple-500 text-purple-400" />
              </span>
              <span className="text-sm opacity-0 peer-hover:opacity-100 transition-opacity duration-200">
                View trailer
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
                {serie?.genres?.map((genre, index) => {
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
          <div className=" flex flex-col w-full rounded-2xl py-2 px-4 bg-gray-50/50 ">
            <span className="text-3xl text-gray-800 font-semibold mb-2">
              summary
            </span>
            <span className="text-2xl">{serie?.overview}</span>
          </div>
        </div>
        {/* streaming options section */}
        <StreamingOptions movie_id={serieId} movie_name={serie?.name ?? ""} />
      </div>
      {/* trailer module */}
      {showModule && (
        <TrailerModule
          type="serie"
          id={serieId}
          show={showModule}
          setShow={setShowModule}
        />
      )}
    </div>
  );
}

export default SerieDetails;
