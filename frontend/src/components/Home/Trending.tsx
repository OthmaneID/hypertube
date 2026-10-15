import Card from "../Card";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getTrendingMovies } from "../../utils/api/movieService/moviesApi";
import { getTrendingSeries } from "../../utils/api/movieService/seriesApi";
import type { Movie, Serie } from "../../utils/interfaces";

type TimeWindow = "day" | "week";

interface TrendingProps {
  mediaType: "movie" | "serie";
}

function Trending({ mediaType }: TrendingProps) {
  const { t } = useTranslation();
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("day");
  const isMovie = mediaType === "movie";

  const { data } = useQuery({
    queryKey: ["trending", mediaType, timeWindow],
    queryFn: () =>
      isMovie ? getTrendingMovies(timeWindow) : getTrendingSeries(timeWindow),
  });

  // Movies and series name their title and date fields differently
  const items = isMovie
    ? ((data?.results ?? []) as Movie[]).map((movie) => ({
      id: movie.id,
      title: movie.title,
      date: movie.release_date,
      poster: movie.poster_path,
      vote: movie.vote_average,
    }))
    : ((data?.results ?? []) as Serie[]).map((serie) => ({
      id: serie.id,
      title: serie.name,
      date: serie.first_air_date,
      poster: serie.poster_path,
      vote: serie.vote_average,
    }));

  const windows: { value: TimeWindow; label: string }[] = [
    { value: "day", label: t("home.today") },
    { value: "week", label: t("home.thisWeek") },
  ];

  return (
    <div className="trending flex flex-col py-4 gap-4 w-[calc(100vw-120px)] h-full px-2 overflow-y-hidden">
      <div className="flex flex-row flex-wrap gap-4 items-center px-2">
        <h4 className="text-4xl text-white font-thin">
          {isMovie ? t("home.trendingMovies") : t("home.trendingSeries")}
        </h4>
        <div className="flex flex-row rounded-full border border-gray-600 p-1">
          {windows.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTimeWindow(value)}
              aria-pressed={timeWindow === value}
              className={`px-4 py-1 rounded-full text-sm transition duration-300 ${timeWindow === value
                ? "bg-white text-black"
                : "text-gray-400 hover:text-white"
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-row items-end h-90 shrink-0 overflow-x-auto overflow-y-hidden gap-2 border-b-2 border-gray-600 px-2">
        {items.map((item) => (
          <Card
            url={(isMovie ? "/movies/" : "/series/") + item.id}
            key={item.id}
            tmdb_id={item.id}
            poster={item.poster}
            title={item.title}
            vote={item.vote}
            year={item.date?.toString().split("-")[0]}
          />
        ))}
      </div>
    </div>
  );
}

export default Trending;
