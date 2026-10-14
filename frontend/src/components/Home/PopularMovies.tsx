import MovieCard from "../Card";
// import DummyData from "../../utils/data";
import { Link } from "react-router-dom";
import { BiChevronRight } from "react-icons/bi";
import { useEffect, useState } from "react";
import { getPopularMovies } from "../../utils/api/movieService/moviesApi";
import type { PopularMoviesResponse } from "../../utils/interfaces";
import { useTranslation } from "react-i18next";

function PopularMovies() {
  const { t } = useTranslation();
  const [Movies, setMovies] = useState({
    page: 1,
    results: [],
    total_pages: 0,
    total_results: 0,
  } as PopularMoviesResponse);
  useEffect(() => {
    getPopularMovies(1).then((data) => {
      setMovies(data);
    });
  }, []);
  return (
    <div className="popular-movies flex flex-col py-4 gap-4 w-[calc(100vw-120px)] h-full px-2 overflow-y-hidden">
      <div className="flex flex-row justify-between items-center px-2">
        <h4 className="text-4xl text-white font-thin">{t("home.popularMovies")}</h4>
        <Link
          to="/movies"
          className="text-lg flex flex-nowrap items-center text-nowrap text-gray-400 hover:text-white transition duration-300"
        >
          {t("home.seeAll")} <BiChevronRight className="ml-1" />
        </Link>
      </div>
      <div className="flex flex-row items-end h-90 shrink-0 overflow-x-auto overflow-y-hidden gap-2 border-b-2 border-gray-600">
        {Movies.results.map((movie, index) => {
          const year = movie.release_date?.toString().split("-")[0];
          return <MovieCard
            url={"/movies/" + movie.id}
            key={index}
            tmdb_id={movie.id}
            poster={movie.poster_path}
            title={movie.title}
            vote={movie.vote_average}
            year={year}
          />

        }
        )}
      </div>
    </div>
  );
}

export default PopularMovies;
