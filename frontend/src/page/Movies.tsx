import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getPopularMovies, getGenres } from "../utils/api/movieService/moviesApi";
import { searchMovies, type SearchResultItem } from "../utils/api/movieService/searchApi";
import type { PopularMoviesResponse } from "../utils/interfaces";
import { BiArrowToTop, BiSearch, BiX, BiFilterAlt } from "react-icons/bi";
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

const CURRENT_YEAR = new Date().getFullYear();

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
  const location = useLocation();
  const navigate = useNavigate();
  
  // Search mode state
  const [query, setQuery] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get("search") || "";
  });
  const debouncedQuery = useDebounce(query, 400);

  // Sync URL with query
  useEffect(() => {
    if (debouncedQuery.trim()) {
      navigate(`/movies?search=${encodeURIComponent(debouncedQuery.trim())}`, { replace: true });
    } else if (location.search.includes("search=")) {
      navigate("/movies", { replace: true });
    }
  }, [debouncedQuery, navigate, location.search]);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Sort & Filter state
  const [sortBy, setSortBy] = useState<"alpha" | "year" | "rating">("alpha");
  const [showFilters, setShowFilters] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [minYear, setMinYear] = useState(1900);
  const [maxYear, setMaxYear] = useState(CURRENT_YEAR);
  
  const [genres, setGenres] = useState<{ id: number; name: string }[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<number>(0);
  const [showTopBtn, setShowTopBtn] = useState(false);

  const isSearchMode = debouncedQuery.trim().length > 0;
  const hasActiveFilters = minRating > 0 || minYear > 1900 || maxYear < CURRENT_YEAR || selectedGenre > 0;

  useEffect(() => {
    getGenres().then((data) => {
      if (data && data.genres) {
        setGenres(data.genres);
      }
    });
  }, []);

  // Sort + filter helper — works on both search results and popular movies
  function processItems<T extends { title: string; release_date?: string; vote_average?: number; genre_ids?: number[] }>(items: T[]): T[] {
    let result = [...items];

    // Filter by genre
    if (selectedGenre > 0) {
      result = result.filter((i) => i.genre_ids?.includes(selectedGenre));
    }

    // Filter by rating
    if (minRating > 0) {
      result = result.filter((i) => (i.vote_average ?? 0) >= minRating);
    }

    // Filter by year
    result = result.filter((i) => {
      const year = parseInt(i.release_date?.slice(0, 4) || "0");
      if (!year) return true; // no year data → don't exclude
      return year >= minYear && year <= maxYear;
    });

    // Sort
    result.sort((a, b) => {
      if (sortBy === "alpha") return (a.title || "").localeCompare(b.title || "");
      if (sortBy === "year") {
        const ya = parseInt(a.release_date?.slice(0, 4) || "0");
        const yb = parseInt(b.release_date?.slice(0, 4) || "0");
        return yb - ya;
      }
      if (sortBy === "rating") return (b.vote_average ?? 0) - (a.vote_average ?? 0);
      return 0;
    });

    return result;
  }

  // Keep refs in sync
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
  useEffect(() => { totalPagesRef.current = totalPages; }, [totalPages]);
  useEffect(() => { hasMorePagesRef.current = hasMorePages; }, [hasMorePages]);
  useEffect(() => { isMoviesLoadingRef.current = isMoviesLoading; }, [isMoviesLoading]);

  // Handle showing/hiding the Go Top button
  useEffect(() => {
    const container = document.getElementById("scrollContainer");
    if (!container) return;
    const handleScroll = () => setShowTopBtn(container.scrollTop > 300);
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

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

  // Search effect — only show TMDB results (filter out archive)
  useEffect(() => {
    if (!isSearchMode) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    searchMovies(debouncedQuery)
      .then((data) => {
        // Only show TMDB results — archive results don't have reliable metadata
        setSearchResults(data.results.filter((r) => r.source === "tmdb"));
      })
      .finally(() => setIsSearching(false));
  }, [debouncedQuery]);

  function scrollBackUp() {
    scrollContainer?.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetFilters() {
    setMinRating(0);
    setMinYear(1900);
    setMaxYear(CURRENT_YEAR);
    setSelectedGenre(0);
  }

  const displayedSearch = processItems(searchResults);
  const displayedMovies = processItems(movies);

  return (
    <div className="p-4 flex flex-col">
      {/* Header */}
      <div className="w-full flex flex-col gap-3 py-5">
        <div className="flex items-center justify-center">
          <span className="text-4xl text-gray-200 font-thin">
            {isSearchMode ? "Search Results" : "Popular · Movies"}
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

        {/* Sort + Filter row */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {/* Sort pills */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 text-xs">Sort:</span>
            {(["alpha", "year", "rating"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  sortBy === s
                    ? "bg-purple-600 text-white"
                    : "bg-gray-800/70 text-gray-400 hover:bg-gray-700 hover:text-white"
                }`}
              >
                {s === "alpha" ? "A–Z" : s === "year" ? "Newest" : "Rating ★"}
              </button>
            ))}
          </div>

          {/* Filter toggle button */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
              showFilters || hasActiveFilters
                ? "bg-purple-600 text-white"
                : "bg-gray-800/70 text-gray-400 hover:bg-gray-700 hover:text-white"
            }`}
          >
            <BiFilterAlt />
            Filters{hasActiveFilters ? " •" : ""}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="max-w-2xl mx-auto w-full bg-gray-900/80 border border-white/10 rounded-2xl px-6 py-4 flex flex-col gap-4 backdrop-blur-sm">
            {/* Genre filter */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Genre</span>
              </div>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(parseInt(e.target.value))}
                className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
              >
                <option value={0}>Any Genre</option>
                {genres.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Rating filter */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Min Rating</span>
                <span className="text-white font-semibold">{minRating > 0 ? `≥ ${minRating.toFixed(1)} ★` : "Any"}</span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={minRating}
                onChange={(e) => setMinRating(parseFloat(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-600">
                <span>0</span><span>5</span><span>10</span>
              </div>
            </div>

            {/* Year range filter */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Year Range</span>
                <span className="text-white font-semibold">{minYear} – {maxYear}</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1888}
                  max={maxYear}
                  value={minYear}
                  onChange={(e) => setMinYear(Math.min(parseInt(e.target.value) || 1900, maxYear))}
                  className="w-24 bg-gray-800 border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-purple-500"
                />
                <span className="text-gray-600 text-xs">to</span>
                <input
                  type="number"
                  min={minYear}
                  max={CURRENT_YEAR}
                  value={maxYear}
                  onChange={(e) => setMaxYear(Math.max(parseInt(e.target.value) || CURRENT_YEAR, minYear))}
                  className="w-24 bg-gray-800 border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Reset */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="self-end text-xs text-gray-400 hover:text-white underline transition-colors"
              >
                Reset filters
              </button>
            )}
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
            {!isSearching && displayedSearch.length === 0 && (
              <span className="text-xl text-gray-400 text-center w-full py-20">
                No results found for "{debouncedQuery}"
              </span>
            )}
            {!isSearching &&
              displayedSearch.map((item, index) => (
                <Card
                  key={`${item.source}-${item.id}-${index}`}
                  url={`/movies/${item.id}`}
                  id={item.id ?? undefined}
                  poster={item.poster_path ?? undefined}
                  title={item.title}
                  vote={item.vote_average}
                  year={item.release_date ? item.release_date.slice(0, 4) : undefined}
                />
              ))}
          </>
        )}

        {/* Popular mode */}
        {!isSearchMode && (
          <>
            {displayedMovies.length === 0 && !isMoviesLoading ? (
              <span className="text-xl text-gray-400 text-center w-full py-20">
                {hasActiveFilters ? "No movies match your filters." : "No movies found. Please try again later."}
              </span>
            ) : (
              displayedMovies.map((movie, index) => (
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
              <div className="w-full flex justify-center items-center py-10">
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
      {showTopBtn && (
        <div
          onClick={scrollBackUp}
          id="GoTopBtn"
          className="active:scale-105 duration-250 absolute right-10 top-[calc(100vh-100px)] z-50 bg-purple-500 rounded-full w-16 h-16 flex items-center justify-center text-5xl cursor-pointer shadow-lg hover:bg-purple-400 transition-all"
          title="Back to top"
        >
          <BiArrowToTop />
        </div>
      )}
    </div>
  );
}

export default Movies;
