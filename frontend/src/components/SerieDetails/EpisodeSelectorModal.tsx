import { useState, useEffect, useMemo } from 'react';
import type { SerieDetails, SerieSeasonDetails, Episode } from '../../utils/interfaces';
import { IoClose } from 'react-icons/io5';
import { getSeasonDetails } from '../../utils/api/movieService/seriesApi';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { getSerieHistory, type SerieEpisodeHistory } from '../../utils/api/userService/historyApi';
import { Check } from 'lucide-react';

interface EpisodeSelectorModalProps {
  serie: SerieDetails;
  show: boolean;
  setShow: (show: boolean) => void;
  onEpisodeSelect: (seasonNumber: number, episodeNumber: number, episodeName?: string) => void;
}

function EpisodeSelectorModal({ serie, show, setShow, onEpisodeSelect }: EpisodeSelectorModalProps) {
  const seasons = serie.seasons?.filter((season) => season.season_number && season.season_number > 0) || [];
  const [selectedSeason, setSelectedSeason] = useState<number | null>(
    seasons[0]?.season_number ?? null,
  );
  const [selectedEpisode, setSelectedEpisode] = useState<number | null>(null);
  const [seasonDetails, setSeasonDetails] = useState<SerieSeasonDetails | null>(null);
  const [isLoadingSeason, setIsLoadingSeason] = useState(false);
  const { t } = useTranslation();

  // Fetch full watch history for this serie
  const { data: serieHistory = [] } = useQuery<SerieEpisodeHistory[]>({
    queryKey: ['serieHistory', serie.id],
    queryFn: () => getSerieHistory(serie.id),
    enabled: !!serie.id && show,
    staleTime: 30 * 1000,
  });

  // Map of "season:episode" -> SerieEpisodeHistory for quick O(1) lookups
  const episodeHistoryMap = useMemo(() => {
    const map = new Map<string, SerieEpisodeHistory>();
    for (const h of serieHistory) {
      if (h.season !== null && h.season !== undefined && h.episode !== null && h.episode !== undefined) {
        map.set(`${h.season}:${h.episode}`, h);
      }
    }
    return map;
  }, [serieHistory]);

  // Set of seasons where all aired episodes are watched (or all episodes from season metadata are watched)
  const fullyWatchedSeasons = useMemo(() => {
    const completedSet = new Set<number>();
    const lastAiredSeason = serie.last_episode_to_air?.season_number;
    const lastAiredEpisode = serie.last_episode_to_air?.episode_number;

    for (const season of seasons) {
      const sNum = season.season_number;
      if (!sNum) continue;

      // Determine expected aired episode count for this season
      let expectedAiredCount = season.episode_count ?? 0;
      if (lastAiredSeason !== undefined && lastAiredEpisode !== undefined) {
        if (sNum > lastAiredSeason) {
          expectedAiredCount = 0; // hasn't aired yet
        } else if (sNum === lastAiredSeason) {
          expectedAiredCount = Math.min(expectedAiredCount, lastAiredEpisode);
        }
      }

      if (expectedAiredCount <= 0) continue;

      // Count finished episodes in this season
      let finishedCount = 0;
      for (let ep = 1; ep <= expectedAiredCount; ep++) {
        const record = episodeHistoryMap.get(`${sNum}:${ep}`);
        if (record?.is_finished) {
          finishedCount++;
        }
      }

      if (finishedCount === expectedAiredCount) {
        completedSet.add(sNum);
      }
    }
    return completedSet;
  }, [seasons, episodeHistoryMap, serie.last_episode_to_air]);

  const currentSeason = seasons.find((s) => s.season_number === selectedSeason) || seasons[0];

  // Fetch season details when season changes
  useEffect(() => {
    if (selectedSeason && serie.id) {
      setIsLoadingSeason(true);
      getSeasonDetails(serie.id, selectedSeason)
        .then((data: SerieSeasonDetails) => {
          setSeasonDetails(data);
          setIsLoadingSeason(false);
        })
        .catch(() => {
          setIsLoadingSeason(false);
        });
    }
  }, [selectedSeason, serie.id]);

  const handleSeasonChange = (seasonNumber: number) => {
    setSelectedSeason(seasonNumber);
    setSelectedEpisode(null);
  };

  const handleEpisodeClick = (episodeNumber: number) => {
    if (selectedSeason === null) return;

    // Check if episode has aired
    const lastAiredSeason = serie.last_episode_to_air?.season_number;
    const lastAiredEpisode = serie.last_episode_to_air?.episode_number;

    const isEpisodeAired =
      selectedSeason < lastAiredSeason! ||
      (selectedSeason === lastAiredSeason && episodeNumber <= lastAiredEpisode!);

    if (!isEpisodeAired) return; // Don't allow selecting unaired episodes

    setSelectedEpisode(episodeNumber);
    const episodeName = seasonDetails?.episodes?.find((e) => e.episode_number === episodeNumber)?.name;
    onEpisodeSelect(selectedSeason, episodeNumber, episodeName);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col border border-gray-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h2 className="text-2xl font-bold text-white">{serie.name}</h2>
            <p className="text-gray-400 text-sm mt-1">
              {serie.number_of_seasons} {t("episodeSelector.seasons")} • {serie.number_of_episodes}{' '}
              {t("episodeSelector.episodes")}
            </p>
          </div>
          <button
            onClick={() => setShow(false)}
            className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 active:bg-gray-600 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
          >
            <IoClose className="text-white text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col md:flex-row h-full overflow-hidden">
          {/* Season Selector */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">{t("episodeSelector.seasons")}</h3>
            <div className="flex md:flex-col gap-2 h-full overflow-y-auto overflow-x-auto pb-6 mb-2">
              {seasons.map((season) => {
                const isSeasonWatched = fullyWatchedSeasons.has(season.season_number!);
                const isSelected = selectedSeason === season.season_number;

                return (
                  <button
                    key={season.season_number}
                    onClick={() => handleSeasonChange(season.season_number!)}
                    className={`px-4 py-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap duration-200 relative ${
                      isSelected
                        ? 'bg-white text-black hover:bg-gray-100 active:scale-95'
                        : isSeasonWatched
                        ? 'bg-emerald-950/40 text-emerald-200 border border-emerald-500/30 hover:bg-emerald-900/50 hover:border-emerald-400/50 hover:scale-105 active:scale-95'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700 active:bg-gray-600 hover:scale-105 active:scale-95'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span>{t("episodeSelector.season", { number: season.season_number })}</span>
                        {isSeasonWatched && (
                          <span
                            className={`inline-flex items-center justify-center w-4 h-4 rounded-full ${
                              isSelected ? 'bg-emerald-600 text-white' : 'bg-emerald-500 text-black'
                            }`}
                            title={t("common.watched", "Watched")}
                          >
                            <Check className="w-2.5 h-2.5 stroke-3" />
                          </span>
                        )}
                      </div>
                      <span className="text-xs opacity-70">
                        {season.episode_count} {t("episodeSelector.eps")}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Episode List */}
          {currentSeason && (
            <div className="flex-1 p-6 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  {t("episodeSelector.seasonEpisodes", { number: currentSeason.season_number })}
                </h3>
                <span className="text-sm text-gray-400">
                  {seasonDetails?.episodes?.length || currentSeason.episode_count} {t("episodeSelector.episodes")}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                {isLoadingSeason ? (
                  <div className="w-full h-full flex items-center justify-center py-8">
                    <div className="h-8 w-8 rounded-full border-4 border-white/20 border-t-white animate-spin" />
                  </div>
                ) : seasonDetails?.episodes && seasonDetails.episodes.length > 0 ? (
                  seasonDetails.episodes.map((episode: Episode) => {
                    // Check if episode has aired
                    const lastAiredSeason = serie.last_episode_to_air?.season_number;
                    const lastAiredEpisode = serie.last_episode_to_air?.episode_number;

                    const isEpisodeAired =
                      lastAiredSeason &&
                      lastAiredEpisode &&
                      (currentSeason.season_number! < lastAiredSeason ||
                        (currentSeason.season_number === lastAiredSeason &&
                          episode.episode_number! <= lastAiredEpisode));

                    const episodeName = episode.name || `Episode ${episode.episode_number}`;
                    const episodeAirDate = episode.air_date;

                    // Watch history tracking for this episode
                    const historyRecord = episodeHistoryMap.get(
                      `${currentSeason.season_number}:${episode.episode_number}`,
                    );
                    const isFinished = Boolean(historyRecord?.is_finished);
                    const watchedDuration = historyRecord?.watched_duration || 0;

                    // Calculate progress percentage
                    let progressPercent: number | null = null;
                    if (isFinished) {
                      progressPercent = 100;
                    } else if (watchedDuration > 0) {
                      // runtime is in minutes on TMDB episode object
                      const totalSeconds = (episode.runtime && episode.runtime > 0)
                        ? episode.runtime * 60
                        : (serie.episode_run_time?.[0] ? serie.episode_run_time[0] * 60 : 2700); // fallback ~45min

                      const rawPercent = Math.round((watchedDuration / totalSeconds) * 100);
                      progressPercent = Math.min(Math.max(rawPercent, 5), 95);
                    }

                    return (
                      <button
                        key={episode.episode_number}
                        onClick={() => handleEpisodeClick(episode.episode_number!)}
                        disabled={!isEpisodeAired}
                        className={`w-full text-left p-4 rounded-xl transition-all border duration-200 relative overflow-hidden ${
                          selectedEpisode === episode.episode_number
                            ? 'bg-gray-800 border-white hover:bg-gray-700'
                            : isFinished
                            ? 'bg-emerald-950/20 border-emerald-500/30 hover:bg-emerald-900/30 hover:scale-[1.02] active:scale-[0.98]'
                            : isEpisodeAired
                            ? 'bg-gray-800/50 border-transparent hover:bg-gray-800 hover:scale-[1.02] active:scale-[0.98]'
                            : 'bg-gray-800/30 border-transparent cursor-not-allowed opacity-60'
                        }`}
                      >
                        {/* In-progress bottom bar */}
                        {progressPercent !== null && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800/80">
                            <div
                              className={`h-full transition-all duration-300 ${
                                isFinished
                                  ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]'
                                  : 'bg-purple-500'
                              }`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-4">
                          <div
                            className={`shrink-0 w-12 h-12 rounded-lg flex items-center justify-center relative ${
                              isFinished
                                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                                : isEpisodeAired
                                ? 'bg-gray-700'
                                : 'bg-gray-800'
                            }`}
                          >
                            {isFinished ? (
                              <Check className="w-6 h-6 stroke-3 text-emerald-400" />
                            ) : (
                              <span className="text-white text-lg font-bold">{episode.episode_number}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4
                                className={`font-medium truncate ${
                                  isFinished
                                    ? 'text-emerald-100'
                                    : isEpisodeAired
                                    ? 'text-white'
                                    : 'text-gray-400'
                                }`}
                              >
                                {episodeName}
                              </h4>
                              {isFinished && (
                                <span className="shrink-0 text-[10px] font-bold tracking-wider uppercase bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded">
                                  {t("common.watched", "Watched")}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center w-full justify-between mt-1">
                              <div className="flex items-center gap-2 text-sm">
                                <p className="text-gray-400">
                                  S{currentSeason.season_number} E{episode.episode_number}
                                </p>
                                {!isFinished && progressPercent !== null && (
                                  <span className="text-xs text-purple-400 font-medium">
                                    • {progressPercent}%
                                  </span>
                                )}
                              </div>
                              {!isEpisodeAired && episodeAirDate && (
                                <span className="inline-block px-2 py-1 bg-purple-500/20 font-semibold text-purple-300 text-xs rounded-full">
                                  {new Date(episodeAirDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          {selectedEpisode === episode.episode_number && isEpisodeAired && (
                            <div className="shrink-0">
                              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="w-full h-full flex justify-center items-center text-center text-gray-400 py-4">
                    {t("episodeSelector.noEpisodes")}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EpisodeSelectorModal;
