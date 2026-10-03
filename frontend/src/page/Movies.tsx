import { useEffect, useRef, useState } from "react";
import { getPopularMovies } from "../utils/api/movieService/moviesApi";
import { searchMovies, type SearchResultItem } from "../utils/api/movieService/searchApi";
import type { PopularMoviesResponse } from "../utils/interfaces";
import { BiArrowToTop, BiSearch, BiX } from "react-icons/bi";
import Card from "../components/Card";

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function Movies() {
  // Popular mode state
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

  // Search mode state
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 400);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchSources, setSearchSources] = useState<string[]>([]);

  const isSearchMode = debouncedQuery.trim().length > 0;

  // Keep refs in sync
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
  useEffect(() => { totalPagesRef.current = totalPages; }, [totalPages]);
  useEffect(() => { hasMorePagesRef.current = hasMorePages; }, [hasMorePages]);
  useEffect(() => { isMoviesLoadingRef.current = isMoviesLoading; }, [isMoviesLoading]);

  // Infinite scroll for popular mode
  const scrollContainer = document.getElementById("scrollContainer");
  useEffect(() => {
    if (isSearchMode) return;
    setTimeout(() => {
      const observer = new IntersectionObserver(handleIntersection, {
        root: scrollContainer ?? null,
        rootMargin: "100px",
        threshold: 1.0,
      });
      const checker = document.getElementById("intersectionChecker");
      if (checker?.checkVisibility) observer.observe(checker);
      return () => observer.disconnect();
    }, 300);
  }, [isSearchMode]);

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
      .finally(() => setIsMoviesLoading(false));
  }

  useEffect(() => {
    if (!isSearchMode) fetchPopularMovies();
  }, [currentPage, hasMorePages, isMoviesLoading, isSearchMode]);

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

  // Search effect
  useEffect(() => {
    if (!isSearchMode) {
      setSearchResults([]);
      setSearchSources([]);
      return;
    }
    setIsSearching(true);
    searchMovies(debouncedQuery)
      .then((data) => {
        setSearchResults(data.results);
        setSearchSources(data.sources);
      })
      .finally(() => setIsSearching(false));
  }, [debouncedQuery]);

  function scrollBackUp() {
    scrollContainer?.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="p-4 flex flex-col">
      {/* Header + Search bar */}
      <div className="w-full flex flex-col gap-4 py-5">
        <div className="flex items-center justify-center">
          <span className="text-4xl text-gray-200 font-thin">
            {isSearchMode ? "Search Results" : "Popular \u00b7 Movies"}
          </span>
        </div>

        {/* Search input */}
        <div className="relative max-w-xl mx-auto w-full">
          <BiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies..."
            className="w-full bg-gray-800/70 text-gray-100 placeholder-gray-500 rounded-2xl pl-11 pr-10 py-3 text-sm outline-none focus:ring-2 focus:ring-gray-600 transition-all"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              <BiX className="text-xl" />
            </button>
          )}
        </div>

        {/* Source badges when in search mode */}
        {isSearchMode && searchSources.length > 0 && (
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="text-gray-500 text-xs">Sources:</span>
            {searchSources.map((src) => (
              <span
                key={src}
                className="px-2 py-0.5 rounded-full bg-gray-700/60 text-gray-300 text-xs font-medium"
              >
                {src === "archive.org" ? "\ud83c\udfd9\ufe0f archive.org" : "\ud83c\udfa5 TMDB"}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="p-2 flex flex-row flex-wrap w-full">

        {/* Search mode */}
        {isSearchMode && (
          <>
            {isSearching && (
              <div className="w-full flex justify-center items-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-16 w-16 rounded-full border-4 border-white/20 border-t-white animate-spin" />
                  <span className="text-gray-300">Searching...</span>
                </div>
              </div>
            )}
            {!isSearching && searchResults.length === 0 && (
              <span className="text-xl text-gray-400 text-center w-full py-20">
                No results found for "{debouncedQuery}"
              </span>
            )}
            {!isSearching &&
              searchResults.map((item, index) => (
                <Card
                  key={`${item.source}-${item.id ?? item.archive_identifier}-${index}`}
                  url={
                    item.source === "archive"
                      ? (item.archive_url ?? "#")
                      : `/movies/${item.id}`
                  }
                  id={item.id ?? undefined}
                  poster={item.poster_path ?? undefined}
                  title={item.title}
                  vote={item.vote_average}
                  year={item.release_date ? item.release_date.slice(0, 4) : undefined}
                  isExternal={item.source === "archive"}
                />
              ))}
          </>
        )}

        {/* Popular mode */}
        {!isSearchMode && (
          <>
            {movies.length === 0 && !isMoviesLoading ? (
              <span className="text-xl text-gray-400 text-center w-full">
                No movies found. Please try again later.
              </span>
            ) : (
              movies.map((movie, index) => (
                <Card
                  url={"/movies/" + movie.id}
                  key={index}
                  id={movie.id}
                  poster={movie.poster_path}
                  title={movie.title}
                  vote={movie.vote_average}
                  year={
                    movie.release_date
                      ? new Date(movie.release_date).getFullYear().toString()
                      : undefined
                  }
                />
              ))
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
          </>
        )}
      </div>

      {/* Back to top */}
      <div
        onClick={scrollBackUp}
        id="GoTopBtn"
        className="active:scale-105 duration-250 absolute right-10 top-[calc(100vh-100px)] z-50 bg-purple-500 rounded-full w-16 h-16 flex items-center justify-center text-5xl cursor-pointer"
        title="Back to top"
      >
        <BiArrowToTop />
      </div>
    </div>
  );
}

export default Movies;
