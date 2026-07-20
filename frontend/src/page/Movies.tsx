import { useEffect, useState } from "react";
import { getPopularMovies } from "../utils/api";
import type { PopularMoviesResponse } from "../utils/interfaces";
import MovieCard from "../components/MovieCard";
import { FaArrowLeft } from "react-icons/fa";
import {
  MdArrowBack,
  MdKeyboardArrowLeft,
  MdKeyboardArrowRight,
  MdKeyboardDoubleArrowLeft,
  MdKeyboardDoubleArrowRight,
} from "react-icons/md";
import { useNavigate } from "react-router-dom";

function Movies() {
  const navigator = useNavigate();
  const [isMoviesLoading, setIsMoviesLoading] = useState(false);
  const params = new URLSearchParams(window.location.search);
  const [movies, setMovies] = useState<PopularMoviesResponse["results"]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(parseInt(params.get("page") ?? "1"));
  useEffect(() => {
    setIsMoviesLoading(true);
    getPopularMovies(page)
      .then((data) => {
        setMovies(data.results);
        setTotalPages(data.total_pages);
        setPage(data.page);
      })
      .finally(() => {
        setIsMoviesLoading(false);
      });
  }, [page]);

  useEffect(() => {
    if (page < 1) setPage(1);
    if (page > totalPages) setPage(totalPages);
      // window.history.replaceState({}, "", `/movies?page=${page}`);
      navigator(`/movies?page=${page}`);
  }, [page]);
  return (
    <div className="p-4 flex flex-col">
      <div className="w-full flex flex-row justify-between items-center py-5 relative">
        {/* prev */}
        <span
          className={" absolute left-5 top-5 flex flex-row gap-2 items-center cursor-pointer hover:text-white hover:scale-105 transition duration-300 " + (page === 1 ? "hidden" : "")}
          onClick={() => setPage(1)}
        >
          <MdKeyboardDoubleArrowLeft className="text-gray-200 text-4xl font-thin " />
          <span className="text-gray-200 text-xl">Back to Page 1</span>
        </span>
        <div className="flex flex-row items-center justify-center gap-2 w-full">
          <MdKeyboardArrowLeft
            className={"text-gray-200 text-4xl font-thin cursor-pointer hover:text-white hover:scale-105 transition duration-300 " + (page === 1 ? "hidden" : "")}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          />
          <span className="text-4xl text-gray-200 font-thin">
            Popular - Movies
          </span>
          <MdKeyboardArrowRight
            className={"text-gray-200 text-4xl font-thin cursor-pointer hover:text-white hover:scale-105 transition duration-300 " + (page === totalPages ? "hidden" : "")}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          />
        </div>
      </div>
      {/* movies */}
      <div className="flex flex-row flex-nowrap">
        <div className="p-2 flex flex-row flex-wrap w-full">
          {isMoviesLoading ? (
            <div className="w-full flex justify-center items-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="h-16 w-16 rounded-full border-4 border-white/20 border-t-white animate-spin" />
                <span className="text-gray-300">Loading movies...</span>
              </div>
            </div>
          ) : movies?.length === 0 ? (
            <span className="text-xl text-gray-400 text-center w-full">
              No movies found. Please try again later.
            </span>
          ) : (
            movies?.map((movie, index) => {
              return (
                <MovieCard
                  key={index}
                  id={movie.id}
                  poster={movie.poster_path}
                  title={movie.title}
                  vote={movie.vote_average}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default Movies;
