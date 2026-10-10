import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getPopularMovies, getGenres } from "../utils/api/movieService/moviesApi";
import { searchMovies, type SearchResultItem } from "../utils/api/movieService/searchApi";
import {
  BROWSE_SORTS,
  type BrowseOptions,
  type BrowseSort,
  type PopularMoviesResponse,
} from "../utils/interfaces";
import { BiArrowToTop, BiSearch, BiX, BiFilterAlt } from "react-icons/bi";
import Card from "../components/Card";
import { useTranslation } from "react-i18next";
import { useInfiniteScroll } from "../utils/useInfiniteScroll";

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function dedupeById<T extends { id?: number | null }>(items: T[]): T[] {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

const CURRENT_YEAR = new Date().getFullYear();

function Movies() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  // Popular mode state
  const [movies, setMovies] = useState<PopularMoviesResponse["results"]>([]);
  const [isMoviesLoading, setIsMoviesLoading] = useState(false);
  const [moviesHasMore, setMoviesHasMore] = useState(true);
  // requestId invalidates responses that belong to previous sort/filter options
  const popularRef = useRef<{ page: number; hasMore: boolean; loading: boolean; requestId: number; options: BrowseOptions }>(
    { page: 0, hasMore: true, loading: false, requestId: 0, options: {} },
  );

  // Search mode state
  const [query, setQuery] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get("search") || "";
  });
  const debouncedQuery = useDebounce(query, 400);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchHasMore, setSearchHasMore] = useState(false);
  // requestId invalidates responses that belong to a previous query
  const searchRef = useRef({ query: "", page: 0, hasMore: false, loading: false, requestId: 0 });

  // Sync URL with query
  useEffect(() => {
    if (debouncedQuery.trim()) {
      navigate(`/movies?search=${encodeURIComponent(debouncedQuery.trim())}`, { replace: true });
    } else if (location.search.includes("search=")) {
      navigate("/movies", { replace: true });
    }
  }, [debouncedQuery, navigate, location.search]);

  // Sort (browse mode only) & filter state: browse mode sends them to TMDB, search mode filters the loaded results
  const [browseSort, setBrowseSort] = useState<BrowseSort>("popular");
  const [showFilters, setShowFilters] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [minYear, setMinYear] = useState(1900);
  const [maxYear, setMaxYear] = useState(CURRENT_YEAR);
  const [genres, setGenres] = useState<{ id: number; name: string }[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<number>(0);
  const [showTopBtn, setShowTopBtn] = useState(false);

  const isSearchMode = debouncedQuery.trim().length > 0;
  const hasActiveFilters = minRating > 0 || minYear > 1900 || maxYear < CURRENT_YEAR || selectedGenre > 0;
  // Debounced so that typing a year or dragging the rating slider sends a single request
  const filterKey = useDebounce(
    JSON.stringify({
      genre: selectedGenre || undefined,
      minRating: minRating || undefined,
      yearFrom: minYear > 1900 ? minYear : undefined,
      yearTo: maxYear < CURRENT_YEAR ? maxYear : undefined,
    }),
    400,
  );

  useEffect(() => {
    getGenres().then((data) => {
      if (data && data.genres) {
        setGenres(data.genres);
      }
    });
  }, []);

  // Handle showing/hiding the Go Top button
  useEffect(() => {
    const container = document.getElementById("scrollContainer");
    if (!container) return;
    const handleScroll = () => setShowTopBtn(container.scrollTop > 300);
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const loadMorePopular = useCallback(() => {
    const state = popularRef.current;
    if (state.loading || !state.hasMore) return;
    const { requestId } = state;
    state.loading = true;
    setIsMoviesLoading(true);

    getPopularMovies(state.page + 1, state.options)
      .then((data) => {
        if (requestId !== state.requestId) return;
        if (data.error) {
          state.hasMore = false;
        } else {
          setMovies((prev) => dedupeById([...prev, ...data.results]));
          state.page = data.page;
          state.hasMore = data.page < data.total_pages;
        }
        setMoviesHasMore(state.hasMore);
      })
      .finally(() => {
        if (requestId !== state.requestId) return;
        state.loading = false;
        setIsMoviesLoading(false);
      });
  }, []);

  // New sort or filters: restart the list from page 1
  useEffect(() => {
    const state = popularRef.current;
    state.requestId += 1;
    state.options = { sort: browseSort, ...JSON.parse(filterKey) };
    state.page = 0;
    state.hasMore = true;
    state.loading = false;
    setMovies([]);
    setMoviesHasMore(true);
    setIsMoviesLoading(false);
    loadMorePopular();
  }, [browseSort, filterKey, loadMorePopular]);

  const loadMoreSearch = useCallback(() => {
    const state = searchRef.current;
    if (state.loading || !state.hasMore || !state.query) return;
    const { requestId, query: currentQuery } = state;
    const page = state.page + 1;
    state.loading = true;
    setIsSearchLoading(true);

    searchMovies(currentQuery, page)
      .then((data) => {
        if (requestId !== state.requestId) return;
        setSearchResults((prev) => dedupeById(page === 1 ? data.results : [...prev, ...data.results]));
        state.page = page;
        state.hasMore = data.has_more;
        setSearchHasMore(data.has_more);
      })
      .finally(() => {
        if (requestId !== state.requestId) return;
        state.loading = false;
        setIsSearchLoading(false);
      });
  }, []);

  // New query: restart the search from page 1
  useEffect(() => {
    const state = searchRef.current;
    state.requestId += 1;
    state.query = debouncedQuery.trim();
    state.page = 0;
    state.hasMore = state.query.length > 0;
    state.loading = false;
    setSearchResults([]);
    setSearchHasMore(state.hasMore);
    setIsSearchLoading(false);
    loadMoreSearch();
  }, [debouncedQuery, loadMoreSearch]);

  const displayedSearch = searchResults;
  const displayedMovies = movies;

  const { sentinelRef, stalled, resume } = useInfiniteScroll({
    loadMore: isSearchMode ? loadMoreSearch : loadMorePopular,
    isLoading: isSearchMode ? isSearchLoading : isMoviesLoading,
    hasMore: isSearchMode ? searchHasMore : moviesHasMore,
    itemCount: isSearchMode ? displayedSearch.length : displayedMovies.length,
    resetKey: [isSearchMode, debouncedQuery, browseSort, filterKey, selectedGenre, minRating, minYear, maxYear].join("|"),
  });

  function sortButton(key: string, active: boolean, onClick: () => void) {
    return (
      <button
        key={key}
        onClick={onClick}
        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
          active
            ? "bg-purple-600 text-white"
            : "bg-gray-800/70 text-gray-400 hover:bg-gray-700 hover:text-white"
        }`}
      >
        {t(`movies.sort.${key}`)}
      </button>
    );
  }

  function scrollBackUp() {
    document.getElementById("scrollContainer")?.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetFilters() {
    setMinRating(0);
    setMinYear(1900);
    setMaxYear(CURRENT_YEAR);
    setSelectedGenre(0);
  }

  const isLoading = isSearchMode ? isSearchLoading : isMoviesLoading;
  const displayedCount = isSearchMode ? displayedSearch.length : displayedMovies.length;

  return (
    <div className="w-full p-4 flex flex-col justify-center ">
      {/* Header */}
      <div className="w-full flex flex-col gap-3 py-5">
        <div className="flex items-center justify-center">
          <span className="text-4xl text-gray-200 font-thin">
            {isSearchMode ? t("movies.searchResults") : t("movies.pageTitle")}
          </span>
        </div>

        {/* Search input */}
        <div className="relative max-w-xl mx-auto w-full">
          <BiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("movies.searchPlaceholder")}
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

        {/* Sort + Filter row (browse mode only; search keeps TMDB's relevance order unfiltered) */}
        {!isSearchMode && (
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 text-xs">{t("movies.sortLabel")}</span>
              {BROWSE_SORTS.map((s) => sortButton(s, browseSort === s, () => setBrowseSort(s)))}
            </div>

            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                showFilters || hasActiveFilters
                  ? "bg-purple-600 text-white"
                  : "bg-gray-800/70 text-gray-400 hover:bg-gray-700 hover:text-white"
              }`}
            >
              <BiFilterAlt />
              {t("movies.filtersBtn")}{hasActiveFilters ? " •" : ""}
            </button>
          </div>
        )}

        {/* Filter panel */}
        {!isSearchMode && showFilters && (
          <div className="max-w-2xl mx-auto w-full bg-gray-900/80 border border-white/10 rounded-2xl px-6 py-4 flex flex-col gap-4 backdrop-blur-sm">
            {/* Genre filter */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{t("movies.genreLabel")}</span>
              </div>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(parseInt(e.target.value))}
                className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
              >
                <option value={0}>{t("movies.anyGenre")}</option>
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
                <span>{t("movies.minRatingLabel")}</span>
                <span className="text-white font-semibold">
                  {minRating > 0 ? `≥ ${minRating.toFixed(1)} ★` : t("movies.any")}
                </span>
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
                <span>0</span>
                <span>5</span>
                <span>10</span>
              </div>
            </div>

            {/* Year range filter */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{t("movies.yearRangeLabel")}</span>
                <span className="text-white font-semibold">
                  {minYear} – {maxYear}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1888}
                  max={maxYear}
                  value={minYear}
                  onChange={(e) =>
                    setMinYear(
                      Math.min(parseInt(e.target.value) || 1900, maxYear),
                    )
                  }
                  className="w-24 bg-gray-800 border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-purple-500"
                />
                <span className="text-gray-600 text-xs">{t("movies.to")}</span>
                <input
                  type="number"
                  min={minYear}
                  max={CURRENT_YEAR}
                  value={maxYear}
                  onChange={(e) =>
                    setMaxYear(
                      Math.max(
                        parseInt(e.target.value) || CURRENT_YEAR,
                        minYear,
                      ),
                    )
                  }
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
                {t("movies.resetFilters")}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="p-2 flex flex-row flex-wrap gap-3">
        {/* Search mode */}
        {isSearchMode &&
          displayedSearch.map((item) => (
            <Card
              key={`search-${item.id}`}
              url={`/movies/${item.id}`}
              poster={item.poster_path ?? undefined}
              title={item.title}
              vote={item.vote_average}
              year={
                item.release_date
                  ? item.release_date.slice(0, 4)
                  : undefined
              }
            />
          ))}

        {/* Popular mode */}
        {!isSearchMode &&
          displayedMovies.map((movie) => (
            <Card
              url={"/movies/" + movie.id}
              key={`popular-${movie.id}`}
              poster={movie.poster_path}
              title={movie.title}
              vote={movie.vote_average}
              year={
                movie.release_date
                  ? new Date(movie.release_date).getFullYear().toString()
                  : undefined
              }
            />
          ))}

        {displayedCount === 0 && !isLoading && !stalled && (
          <span className="text-xl text-gray-400 text-center w-full py-20">
            {isSearchMode
              ? t("movies.noResults", { query: debouncedQuery })
              : hasActiveFilters
                ? t("movies.noMoviesFiltered")
                : t("movies.noMovies")}
          </span>
        )}

        <div className="w-full h-1" ref={sentinelRef}></div>

        {isLoading && (
          <div className={`w-full flex justify-center items-center ${displayedCount === 0 ? "py-20" : "py-10"}`}>
            <div className="flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-full border-4 border-white/20 border-t-white animate-spin" />
              <span className="text-gray-300">
                {isSearchMode ? t("movies.searching") : t("movies.loadingMovies")}
              </span>
            </div>
          </div>
        )}

        {stalled && !isLoading && (
          <div className="w-full flex justify-center py-6">
            <button
              onClick={resume}
              className="px-4 py-2 rounded-full text-sm bg-gray-800/70 text-gray-300 hover:bg-gray-700 hover:text-white transition-all"
            >
              {t("common.loadMore")}
            </button>
          </div>
        )}
      </div>

      {/* Back to top */}
      {showTopBtn && (
        <div
          onClick={scrollBackUp}
          id="GoTopBtn"
          className="active:scale-105 duration-250 absolute right-10 top-[calc(100vh-100px)] z-50 bg-purple-500 rounded-full w-16 h-16 flex items-center justify-center text-5xl cursor-pointer shadow-lg hover:bg-purple-400 transition-all"
          title={t("common.backToTop")}
        >
          <BiArrowToTop />
        </div>
      )}
    </div>
  );
}

export default Movies;
