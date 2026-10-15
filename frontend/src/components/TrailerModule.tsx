import { useEffect, useRef, useState } from "react";
import { BiLeftArrowAlt, BiRightArrowAlt, BiX } from "react-icons/bi";
import type { Trailer } from "../utils/interfaces";
import { getMovieTrailers } from "../utils/api/movieService/moviesApi";
import { getSerieTrailers } from "../utils/api/movieService/seriesApi";
import { useTranslation } from "react-i18next";


function TrailerModule({
  type,
  id,
  show,
  setShow,
}: {
  type: "movie" | "serie";
  id: number;
  show: boolean;
  setShow: (value: boolean) => void;
}) {
  const trailers = useRef<Array<Trailer>>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();
  useEffect(() => {
    if (type == "movie") {
      getMovieTrailers(id)
        .then((data) => {
          const results = data.results ?? [];
          let filtered = results.filter(
            (trailer) =>
              trailer.type === "Teaser" || trailer.type === "Trailer",
          );
          trailers.current = filtered.sort((a, b) => {
            if (
              a.name?.toLowerCase().startsWith("official") &&
              !b.name?.toLowerCase().startsWith("official")
            )
              return -1;
            if (
              !a.name?.toLowerCase().startsWith("official") &&
              b.name?.toLowerCase().startsWith("official")
            )
              return 1;
            return 0;
          });


          setCurrentIndex(0);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      getSerieTrailers(id)
        .then((data) => {
          const results = data.results ?? [];
          let filtered = results.filter(
            (trailer) =>
              trailer.type === "Teaser" || trailer.type === "Trailer",
          );
          trailers.current = filtered.sort((a, b) => {
            if (
              a.name?.toLowerCase().startsWith("official") &&
              !b.name?.toLowerCase().startsWith("official")
            )
              return -1;
            if (
              !a.name?.toLowerCase().startsWith("official") &&
              b.name?.toLowerCase().startsWith("official")
            )
              return 1;
            return 0;
          });


          setCurrentIndex(0);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [id]);

  useEffect(() => {
    changeTrailer(currentIndex);
  }, [currentIndex]);

  function changeTrailer(index: number) {
    setCurrentIndex(index);
  }
  const video_parent = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLIFrameElement>(null);
  const trailer_moduleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShow(false);
      }
    };

    document.addEventListener("keydown", handleKeydown);

    return () => {
      document.removeEventListener("keydown", handleKeydown);
    };
  }, []);

  if (trailers.current.length === 0 && !isLoading) {
  }

  return (
    <div
      className={
        "fixed inset-y-0 left-20 right-0 z-60 duration-500  flex justify-center items-center " +
        (show ? "opacity-100 scale-100" : "opacity-0 scale-0")
      }
    >
      {/* <iframe src="" frameborder="0"></iframe> */}
      <div
        className="absolute top-0  left-0 w-full h-full bg-black/30 backdrop-blur-lg"
        onClick={() => setShow(false)}
      ></div>
      {/* thiss is the true module */}
      <div
        id="trailer-module"
        ref={trailer_moduleRef}
        className=" relative container h-full w-full z-70 rounded-2xl overflow-y-auto"
      >
        {/* close btn */}
        <span
          className="absolute top-3 right-3 z-100] rounded-full bg-gray-400 font-bold text-3xl hover:bg-gray-500 active:scale-105 cursor-pointer"
          onClick={() => setShow(false)}
          title="Close"
          aria-label="Close"
        >
          <BiX />
        </span>
        <div className="flex flex-row flex-wrap items-center gap-6 z-75 h-full">
          {trailers.current.length === 0 && !isLoading ? (
            <div className="flex flex-col justify-center items-center gap-4 w-full h-[90%]">
              <h1 className="text-gray-400 text-2xl">{t("trailer.noTrailers")}</h1>
            </div>
          ) : (
            <div className="flex flex-col gap-2 w-full h-[90%] z-75">
              <div ref={video_parent} className="w-full h-[90%]">
                {isLoading ? (
                  <div className="w-full h-[90%] flex justify-center items-center">
                    <div className="h-16 w-16 rounded-full border-4 border-white/20 border-t-white animate-spin" />
                    <p className="text-gray-400 text-lg">{t("trailer.loading")}</p>
                  </div>
                ) : (
                  <iframe
                    ref={video}
                    width={video_parent.current?.clientWidth}
                    height={video_parent.current?.clientHeight}
                    className="rounded-lg z-75"
                    src={
                      "https://www.youtube.com/embed/" +
                      trailers.current?.at(currentIndex)?.key
                    }
                    title={trailers.current?.at(currentIndex)?.name}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                )}
              </div>
              <div className="bg-gray-500/50 rounded-lg p-3 flex flex-row justify-between items-center">
                <span
                  className="bg-gray-300/30 rounded-full p-3 text-3xl font-bold cursor-pointer hover:bg-gray-300/40 active:scale-105"
                  onClick={() =>
                    setCurrentIndex((prev) => {
                      if (prev > 0) return prev - 1;
                      else return trailers.current.length - 1;
                    })
                  }
                >
                  <BiLeftArrowAlt />
                </span>
                <div className="w-full text-center flex flex-col justify-center items-center">
                  <p className="text-sm text-gray-200 font-semibold">
                    {trailers.current?.at(currentIndex)?.name}
                  </p>
                  <div className="flex flex-row justify-between w-[200px]">
                    {trailers.current?.at(currentIndex)?.published_at && (
                      <p className="text-xs text-gray-400 mt-1">
                        {t("trailer.published")}{" "}
                        {new Date(
                          trailers.current
                            ?.at(currentIndex)
                            ?.published_at?.toString() || "",
                        ).toLocaleDateString()}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      <span>
                        {trailers.current.length > 0 &&(currentIndex % trailers.current.length) + 1}
                      </span>
                      /<span>{trailers.current.length}</span>
                    </p>
                  </div>
                </div>
                <span
                  className="bg-gray-300/30 rounded-full p-3 text-3xl font-bold cursor-pointer hover:bg-gray-300/40 active:scale-105"
                  onClick={() =>
                    setCurrentIndex((prev) => {
                      if (prev < trailers.current.length - 1) return prev + 1;
                      else return 0;
                    })
                  }
                >
                  <BiRightArrowAlt />
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TrailerModule;
