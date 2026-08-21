import { useEffect, useRef, useState } from "react";
import { getPopularMovies } from "../utils/api/movieService/moviesApi";
import type { PopularMoviesResponse } from "../utils/interfaces";
import { BiArrowToTop } from "react-icons/bi";
import Card from "../components/Card";

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

  const scrollContainer = document.getElementById("scrollContainer");
  useEffect(() => {
    setTimeout(() => {
      const observer = new IntersectionObserver(handleIntersection, {
        root: scrollContainer ? scrollContainer : null,
        rootMargin: "100px",
        threshold: 1.0,
      });
      const intersectionChecker = document.getElementById(
        "intersectionChecker",
      );
      if (intersectionChecker?.checkVisibility) {
        observer.observe(intersectionChecker);
      }
      return () => {
        observer.disconnect();
      };
    }, 300);
  }, []);

  function fetchPopularMovies() {
    if (!hasMorePagesRef.current || isMoviesLoadingRef.current) return;
    if (requestedPagesRef.current.has(currentPageRef.current)) return;

    requestedPagesRef.current.add(currentPageRef.current);
    setIsMoviesLoading(true);

    getPopularMovies(currentPageRef.current)
      .then((data) => {
        setMovies((prev) => {
          const combined = [...prev, ...data.results];
          const uniqueMap = new Map(combined.map((movie) => [movie.id, movie]));
          return Array.from(uniqueMap.values());
        });
        setTotalPages(data.total_pages);
        totalPagesRef.current = data.total_pages;
        setCurrentPage(data.page);
        setHasMorePages(data.page < data.total_pages);
      })
      .finally(() => {
        setIsMoviesLoading(false);
      });
  }

  useEffect(() => {
    fetchPopularMovies();
  }, [currentPage, hasMorePages, isMoviesLoading]);
  function handleIntersection(entries: IntersectionObserverEntry[]) {
    entries.forEach((entry) => {
      if (
        entry.isIntersecting &&
        currentPageRef.current <= totalPagesRef.current &&
        !isMoviesLoadingRef.current &&
        hasMorePagesRef.current
      ) {
        setCurrentPage((prev) => prev + 1);
      }
    });
  }
  function scrollBackUp() {
    scrollContainer?.scrollTo({
      top: 0,
      behavior: "smooth",
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
                <Card
                  url={"/movies/" + movie.id}
                  key={index}
                  id={movie.id}
                  poster={movie.poster_path}
                  title={movie.title}
                  vote={movie.vote_average}
                />
              );
            })
          )}
          <div className="w-full h-1" id="intersectionChecker"></div>
          {isMoviesLoading && (
            <div className="w-full flex justify-center items-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="h-16 w-16 rounded-full border-4 border-white/20 border-t-white animate-spin" />
                <span className="text-gray-300">Loading movies...</span>
              </div>
            </div>
          )}
        </div>
      </div>
      {
        // console.log(scrollContainer?.scroll)
        // scrollContainer?.scrollHeight
      }
      <div
        onClick={scrollBackUp}
        id="GoTopBtn"
        className=" active:scale-105 duration-250 absolute right-10 top-[calc(100vh-100px)] z-50 bg-purple-500  rounded-full w-16 h-16 flex items-center justify-center text-5xl cursor-pointer"
        title="Back to top"
      >
        <BiArrowToTop />
      </div>
    </div>
  );
}

export default Movies;
