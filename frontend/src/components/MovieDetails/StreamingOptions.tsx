import { useEffect } from "react";
import { BiX } from "react-icons/bi";
import StreamOption from "../StreamOption";
import { get_sources } from "../../utils/api/movieService/torrentsApi";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { buildWatchPath, sortBySeeders } from "../../utils/streams";
import type { StreamElement } from "../../utils/interfaces";

interface StreamingOptionsProps {
  movie_id?: string;
  movie_name: string;
  setShowStreams: (show: boolean) => void;
  showStreams: boolean;
  year: string;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
}

function StreamingOptions({
  movie_id,
  movie_name,
  setShowStreams,
  showStreams,
  year,
  seasonNumber,
  episodeNumber,
}: StreamingOptionsProps) {
  const {
    data: streamingData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [
      "sources",
      movie_id,
      movie_name,
      year,
      seasonNumber,
      episodeNumber,
    ],
    enabled: showStreams && !!movie_id,
    queryFn: () =>
      get_sources(
        movie_id || "",
      ),
  });

  const navigate = useNavigate();

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowStreams(false);
    };

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [setShowStreams]);

  const handleStreamClick = (stream: StreamElement) => {
    if (stream.infoHash) {
      navigate(buildWatchPath(stream));
    }
  };

  const streams = sortBySeeders(streamingData?.streams ?? []);

  return (
    <div
      className={
        "absolute w-full h-full z-40 top-0 left-0 duration-500 flex justify-center items-center " +
        (showStreams
          ? "opacity-100 scale-100"
          : "opacity-0 scale-0 pointer-events-none")
      }
    >
      <div
        className="absolute top-0 left-0 w-full h-full bg-black/60 backdrop-blur-xl"
        onClick={() => setShowStreams(false)}
      ></div>
      <div className="relative flex flex-row flex-wrap items-center gap-6 z-75 h-full container p-4">
        <div className="container h-full flex items-center justify-center rounded-3xl bg-linear-to-br from-gray-900/95 to-black/95 border border-gray-800/50 shadow-2xl">
          {/* Close Button */}
          <button
            className="absolute top-4 right-4 z-100 rounded-full bg-gray-700/50 hover:bg-gray-600/50 p-2 transition-all duration-300 hover:scale-110 cursor-pointer text-white"
            onClick={() => setShowStreams(false)}
            title="Close"
            aria-label="Close"
          >
            <BiX className="w-6 h-6" />
          </button>

          <div className="text-white flex flex-col h-full w-full py-8 px-6 max-h-[80vh] overflow-y-auto overflow-x-hidden custom-scrollbar">
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-white mb-2">
                Streaming Options
              </h2>
              <p className="text-gray-400 text-sm">
                {seasonNumber && episodeNumber
                  ? `Choose your preferred streaming service for "${movie_name}" - Season ${seasonNumber}, Episode ${episodeNumber}`
                  : `Choose your preferred streaming service for "${movie_name}"`}
              </p>
            </div>

            {/* Streams Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-screen">
                  <div className="animate-spin rounded-full h-32 w-32 border-b-3 border-purple-700"></div>
                </div>
              ) : isError ? (
                <div className="text-red-400">
                  Error loading streaming options
                </div>
              ) : streams.length > 0 ? (
                streams.map((stream, index) => (
                  <StreamOption
                    key={index}
                    stream={stream}
                    language="EN"
                    onClick={() => handleStreamClick(stream)}
                  />
                ))
              ) : (
                <div className="text-gray-400">
                  No streaming options available
                </div>
              )}
            </div>

            {/* Footer Info */}
            <div className="mt-6 pt-4 border-t border-gray-800 text-gray-500 text-xs flex items-center justify-between">
              <span>
                Showing {streamingData?.streams?.length || 0} streaming options
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                All servers online
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StreamingOptions;
