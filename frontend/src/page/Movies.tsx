import { useEffect, useRef, useState } from "react";
import { getPopularMovies } from "../utils/api";
import type { PopularMoviesResponse } from "../utils/interfaces";
import MovieCard from "../components/MovieCard";

function Movies() {
  const [isMoviesLoading, setIsMoviesLoading] = useState(false);
  const [movies, setMovies] = useState<PopularMoviesResponse["results"]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const requestedPagesRef = useRef<Set<number>>(new Set());
  const currentPageRef = useRef(currentPage);
  const totalPagesRef = useRef(totalPages);
  const hasMorePagesRef = useRef(hasMorePages);
  const isMoviesLoadingRef = useRef(isMoviesLoading);
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    totalPagesRef.current = totalPages;
  }, [totalPages]);

  useEffect(() => {
    hasMorePagesRef.current = hasMorePages;
  }, [hasMorePages]);

  useEffect(() => {
    isMoviesLoadingRef.current = isMoviesLoading;
  }, [isMoviesLoading]);

  useEffect(() => {
    const scrollContainer = document.getElementById("scrollContainer");
    const observer = new IntersectionObserver(handleIntersection, {
      root: scrollContainer ? scrollContainer : null,
      rootMargin: "0px",
      threshold: 1.0,
    });
    const intersectionChecker = document.getElementById("intersectionChecker");
    if (intersectionChecker?.checkVisibility) {
      observer.observe(intersectionChecker);
    }
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!hasMorePagesRef.current || isMoviesLoadingRef.current) return;
    if (requestedPagesRef.current.has(currentPageRef.current)) return;

    requestedPagesRef.current.add(currentPageRef.current);
    setIsMoviesLoading(true);

    getPopularMovies(currentPageRef.current)
      .then((data) => {
        setMovies((prev) => [...prev, ...data.results]);
        setTotalPages(data.total_pages);
        setCurrentPage(data.page);
        setHasMorePages(data.page < data.total_pages);
      })
      .finally(() => {
        setIsMoviesLoading(false);
      });
  }, [currentPage, hasMorePages, isMoviesLoading]);

  function handleIntersection(entries: IntersectionObserverEntry[]) {
    entries.forEach((entry) => {
      if (
        entry.isIntersecting &&
        currentPageRef.current < totalPagesRef.current &&
        !isMoviesLoadingRef.current &&
        hasMorePagesRef.current
      ) {
        setCurrentPage((prev) => prev + 1);
      }
    });
  }

  return (
    <div className="p-4 flex flex-col">
      <div className="w-full flex flex-row justify-between items-center py-5 relative">
        <div className="flex flex-row items-center justify-center gap-2 w-full">
          <span className="text-4xl text-gray-200 font-thin">
            Popular - Movies
          </span>
        </div>
      </div>
      {/* movies */}
      <div className="flex flex-row flex-nowrap">
        <div className="p-2 flex flex-row flex-wrap w-full">
          {movies?.length === 0 ? (
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
          {isMoviesLoading && (
            <div className="w-full flex justify-center items-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="h-16 w-16 rounded-full border-4 border-white/20 border-t-white animate-spin" />
                <span className="text-gray-300">Loading movies...</span>
              </div>
            </div>
          )}
          <div
            className="w-full h-20"
            id="intersectionChecker"
          ></div>
        </div>
      </div>
    </div>
  );
}

export default Movies;
