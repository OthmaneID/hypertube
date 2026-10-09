import { useEffect } from "react";
import { BiX } from "react-icons/bi";
import StreamOption from "../StreamOption";
import { get_episode_streams } from "../../utils/api/movieService/torrentsApi";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { buildWatchPath, sortBySeeders } from "../../utils/streams";
import type { StreamElement } from "../../utils/interfaces";

interface StreamingOptionsProps {
  imdb_id?: string;
  seasonNumber: number;
  episodeNumber: number;
  serie_name: string;
  setShowStreams: (show: boolean) => void;
  showStreams: boolean;
  duration?: number;
}

function StreamingOptions({
  imdb_id,
  seasonNumber,
  episodeNumber,
  serie_name,
  setShowStreams,
  showStreams,
  duration,
}: StreamingOptionsProps) {
  const sourcesQuery = useQuery({
    queryKey: ["sources", imdb_id, seasonNumber, episodeNumber],
    queryFn: () => get_episode_streams(imdb_id || "", seasonNumber, episodeNumber),
    enabled: showStreams && !!imdb_id
  })

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
      const episodeLabel = `S${String(seasonNumber).padStart(2, "0")}E${String(episodeNumber).padStart(2, "0")}`;
      navigate(buildWatchPath(stream, {
        title: serie_name ? `${serie_name} - ${episodeLabel}` : undefined,
        duration,
        imdbId: imdb_id,
        season: seasonNumber,
        episode: episodeNumber,
      }));
    }
  };

  const streams = sortBySeeders(sourcesQuery.data?.streams ?? []);

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
                Choose your preferred streaming service for "{serie_name}" - Season {seasonNumber}, Episode {episodeNumber}
              </p>
            </div>

            {/* Streams Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sourcesQuery.isLoading ? (
                <div className="flex items-center justify-center h-screen">
                  <div className="animate-spin rounded-full h-32 w-32 border-b-3 border-purple-700"></div>
                </div>
              ) : sourcesQuery.error ? (
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
                Showing {sourcesQuery.data?.streams?.length || 0} streaming options
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
