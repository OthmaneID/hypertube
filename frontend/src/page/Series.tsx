import { useEffect, useRef, useState } from "react";
import { getPopularSeries } from "../utils/api/movieService/seriesApi";
import type { PopularSeriesResponse } from "../utils/interfaces";
import Card from "../components/Card";
import { BiArrowToTop } from "react-icons/bi";

function Series() {
  const [sortBy, setSortBy] = useState("popularity.desc");
  const [isSeriesLoading, setIsSeriesLoading] = useState(false);
  const [series, setSeries] = useState<PopularSeriesResponse["results"]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const requestedPagesRef = useRef<Set<number>>(new Set());
  const currentPageRef = useRef(currentPage);
  const totalPagesRef = useRef(totalPages);
  const hasMorePagesRef = useRef(hasMorePages);
  const isSeriesLoadingRef = useRef(isSeriesLoading);
  const requestVersionRef = useRef(0);
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
    isSeriesLoadingRef.current = isSeriesLoading;
  }, [isSeriesLoading]);

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

  function fetchPopularSeries() {
    if (!hasMorePagesRef.current || isSeriesLoadingRef.current) return;
    if (requestedPagesRef.current.has(currentPageRef.current)) return;
    requestedPagesRef.current.add(currentPageRef.current);
    setIsSeriesLoading(true);
    const requestVersion = requestVersionRef.current;

    getPopularSeries(currentPageRef.current, sortBy)
      .then((data) => {
        if (requestVersion !== requestVersionRef.current) return;
        setSeries((prev) => {
          const combined = [...prev, ...data.results];
          const uniqueMap = new Map(combined.map((serie) => [serie.id, serie]));
          return Array.from(uniqueMap.values());
        });
        setTotalPages(data.total_pages);
        totalPagesRef.current = data.total_pages;
        setCurrentPage(data.page);
        setHasMorePages(data.page < data.total_pages);
      })
      .finally(() => {
        setIsSeriesLoading(false);
      });
  }

  useEffect(() => {
    fetchPopularSeries();
  }, [currentPage, hasMorePages, isSeriesLoading, sortBy]);

  function handleSortChange(nextSortBy: string) {
    requestVersionRef.current += 1;
    requestedPagesRef.current.clear();
    currentPageRef.current = 1;
    totalPagesRef.current = 1;
    hasMorePagesRef.current = true;
    setSeries([]);
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
        !isSeriesLoadingRef.current &&
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
      <div className="w-full flex flex-col sm:flex-row sm:justify-between items-center gap-4 py-5">
        <div className="flex flex-row items-center justify-center gap-2">
          <span className="text-4xl text-gray-200 font-thin">
            Discover Series
          </span>
        </div>
        <div className="flex items-center gap-3">
          <label
            htmlFor="series-sort"
            className="text-sm font-medium text-gray-400"
          >
            Sort by
          </label>
          <select
            id="series-sort"
            value={sortBy}
            onChange={(event) => handleSortChange(event.target.value)}
            className="rounded-md border border-white/15 bg-gray-900 px-3 py-2 text-sm text-gray-100 outline-none focus:border-white/40"
          >
            <option value="first_air_date.asc">First air date (oldest)</option>
            <option value="first_air_date.desc">First air date (newest)</option>
            <option value="name.asc">Name (A-Z)</option>
            <option value="name.desc">Name (Z-A)</option>
            <option value="original_name.asc">Original name (A-Z)</option>
            <option value="original_name.desc">Original name (Z-A)</option>
            <option value="popularity.asc">Popularity (low to high)</option>
            <option value="popularity.desc">Popularity (high to low)</option>
            <option value="vote_average.asc">Rating (low to high)</option>
            <option value="vote_average.desc">Rating (high to low)</option>
            <option value="vote_count.asc">Vote count (low to high)</option>
            <option value="vote_count.desc">Vote count (high to low)</option>
          </select>
        </div>
      </div>
      {/* series */}
      <div className="flex flex-row flex-nowrap justify-center">
        <div className="p-2 flex flex-row flex-wrap w-full justify-start gap-y-8 gap-x-4">
          {series?.length === 0 && !isSeriesLoading ? (
            <span className="text-xl text-gray-400 text-center w-full">
              No series found. Please try again later.
            </span>
          ) : (
            series?.map((serie, index) => {
              return (
                <Card
                  url={"/series/" + serie.id}
                  key={index}
                  id={serie.id}
                  poster={serie.poster_path}
                  title={serie.name}
                  vote={serie.vote_average}
                />
              );
            })
          )}
          <div className="w-full h-1" id="intersectionChecker"></div>
          {isSeriesLoading && (
            <div className="w-full flex justify-center items-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="h-16 w-16 rounded-full border-4 border-white/20 border-t-white animate-spin" />
                <span className="text-gray-300">Loading series...</span>
              </div>
            </div>
          )}
        </div>
      </div>
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

export default Series;
