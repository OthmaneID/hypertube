import { useEffect, useRef, useState } from "react";
import { getPopularMovies } from "../utils/api/movieService/moviesApi";
import {
  searchMovies,
  type SearchResultItem,
} from "../utils/api/movieService/searchApi";
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
  const [sortBy, setSortBy] = useState("popularity.desc");
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
  const requestVersionRef = useRef(0);

  // Search mode state
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 400);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchSources, setSearchSources] = useState<string[]>([]);

  const isSearchMode = debouncedQuery.trim().length > 0;

  // Keep refs in sync
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
    const requestVersion = requestVersionRef.current;

    getPopularMovies(currentPageRef.current, sortBy)
      .then((data) => {
        if (requestVersion !== requestVersionRef.current) return;
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
  }, [currentPage, hasMorePages, isMoviesLoading, isSearchMode, sortBy]);

  function handleSortChange(nextSortBy: string) {
    requestVersionRef.current += 1;
    requestedPagesRef.current.clear();
    currentPageRef.current = 1;
    totalPagesRef.current = 1;
    hasMorePagesRef.current = true;
    setMovies([]);
    setCurrentPage(1);
    setTotalPages(1);
    setHasMorePages(true);
    setSortBy(nextSortBy);
  }

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
    <div className="p-4 flex flex-col w-full mx-auto">
      {/* Header + Search bar */}
      <div className="w-full flex flex-col gap-6 py-8">
        <div className="flex flex-col items-center justify-center gap-2 mb-2 mt-4">
          <h1 className="text-4xl md:text-5xl text-gray-100 font-extrabold tracking-tight">
            {isSearchMode ? "Search Movies" : "Discover Movies"}
          </h1>
          <p className="text-gray-400 text-sm md:text-base font-medium">
            {isSearchMode
              ? "Find your favorite films and public domain classics"
              : "Discover trending films around the world"}
          </p>
        </div>

        {/* Search input */}
        <div className="relative max-w-3xl mx-auto w-full group mt-2 mb-4">
          <div className="relative flex items-center bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-white/10">
            <BiSearch className="absolute left-6 text-gray-400 text-2xl pointer-events-none group-focus-within:text-purple-400 transition-colors" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for movies..."
              className="w-full bg-transparent text-gray-100 placeholder-gray-500 rounded-2xl pl-16 pr-14 py-5 text-lg outline-none transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-4 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <BiX className="text-2xl" />
              </button>
            )}
          </div>
        </div>

        {!isSearchMode && (
          <div className="flex items-center justify-center gap-3">
            <label
              htmlFor="movie-sort"
              className="text-sm font-medium text-gray-400"
            >
              Sort by
            </label>
            <select
              id="movie-sort"
              value={sortBy}
              onChange={(event) => handleSortChange(event.target.value)}
              className="rounded-md border border-white/15 bg-gray-900 px-3 py-2 text-sm text-gray-100 outline-none focus:border-white/40"
            >
              <option value="original_title.asc">Original title (A-Z)</option>
              <option value="original_title.desc">Original title (Z-A)</option>
              <option value="popularity.asc">Popularity (low to high)</option>
              <option value="popularity.desc">Popularity (high to low)</option>
              <option value="revenue.asc">Revenue (low to high)</option>
              <option value="revenue.desc">Revenue (high to low)</option>
              <option value="primary_release_date.asc">
                Release date (oldest)
              </option>
              <option value="primary_release_date.desc">
                Release date (newest)
              </option>
              <option value="title.asc">Title (A-Z)</option>
              <option value="title.desc">Title (Z-A)</option>
              <option value="vote_average.asc">Rating (low to high)</option>
              <option value="vote_average.desc">Rating (high to low)</option>
              <option value="vote_count.asc">Vote count (low to high)</option>
              <option value="vote_count.desc">Vote count (high to low)</option>
            </select>
          </div>
        )}

        {/* Source badges when in search mode */}
        {isSearchMode && searchSources.length > 0 && (
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <span className="text-gray-400 text-sm font-medium">
              Results from:
            </span>
            {searchSources.map((src) => (
              <div
                key={src}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-semibold tracking-wide shadow-lg transition-transform hover:scale-105 ${
                  src === "archive.org"
                    ? "bg-amber-900/30 border-amber-500/30 text-amber-300"
                    : "bg-blue-900/30 border-blue-500/30 text-blue-300"
                }`}
              >
                {src === "archive.org" ? "🏛️ Archive.org" : "🎬 TMDB"}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="p-2 flex flex-row flex-wrap w-full justify-start gap-y-8 gap-x-4">
        {/* Search mode */}
        {isSearchMode && (
          <>
            {isSearching && (
              <div className="w-full flex flex-row flex-wrap justify-center gap-x-4 gap-y-8 py-10">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="w-45 h-67.5 rounded-2xl overflow-hidden shadow-lg relative bg-gray-800/40 animate-pulse border border-white/5"
                  >
                    <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-2">
                      <div className="h-4 bg-gray-700/80 rounded-md w-3/4"></div>
                      <div className="h-3 bg-gray-700/80 rounded-md w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!isSearching && searchResults.length === 0 && (
              <div className="flex flex-col items-center justify-center w-full py-32 opacity-80">
                <BiSearch className="text-7xl text-gray-600 mb-4" />
                <span className="text-2xl text-gray-400 font-medium">
                  No results found for "{debouncedQuery}"
                </span>
                <p className="text-gray-500 mt-2">
                  Try adjusting your keywords.
                </p>
              </div>
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
                  year={
                    item.release_date
                      ? item.release_date.slice(0, 4)
                      : undefined
                  }
                  isExternal={item.source === "archive"}
                />
              ))}
          </>
        )}

        {/* Popular mode */}
        {!isSearchMode && (
          <>
            {movies.length === 0 && !isMoviesLoading ? (
              <div className="flex flex-col items-center justify-center w-full py-32 opacity-80">
                <span className="text-2xl text-gray-400 font-medium">
                  No movies found. Please try again later.
                </span>
              </div>
            ) : (
              movies.map((movie, index) => (
                <Card
                  key={index}
                  url={"/movies/" + movie.id}
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
              <div className="w-full flex flex-row flex-wrap justify-center gap-x-4 gap-y-8 py-10">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={`loading-${i}`}
                    className="w-45 h-67.5 rounded-2xl overflow-hidden shadow-lg relative bg-gray-800/40 animate-pulse border border-white/5"
                  >
                    <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-2">
                      <div className="h-4 bg-gray-700/80 rounded-md w-3/4"></div>
                      <div className="h-3 bg-gray-700/80 rounded-md w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Back to top */}
      <div
        onClick={scrollBackUp}
        id="GoTopBtn"
        className="active:scale-95 hover:bg-purple-400 transition-all duration-300 absolute right-10 top-[calc(100vh-100px)] z-50 bg-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.4)] rounded-full w-14 h-14 flex items-center justify-center text-3xl cursor-pointer text-white"
        title="Back to top"
      >
        <BiArrowToTop />
      </div>
    </div>
  );
}

export default Movies;
