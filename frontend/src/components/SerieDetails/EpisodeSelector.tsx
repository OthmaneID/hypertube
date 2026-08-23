import { useState } from 'react';
import type { SerieDetails } from '../../utils/interfaces';

interface EpisodeSelectorProps {
  serie: SerieDetails;
  onEpisodeSelect: (seasonNumber: number, episodeNumber: number) => void;
}

function EpisodeSelector({ serie, onEpisodeSelect }: EpisodeSelectorProps) {
  const seasons = serie.seasons?.filter((season) => season.season_number && season.season_number > 0) || [];
  const [selectedSeason, setSelectedSeason] = useState<number | null>(
    seasons[0]?.season_number ?? null,
  );
  const [selectedEpisode, setSelectedEpisode] = useState<number | null>(null);

  const currentSeason = seasons.find(s => s.season_number === selectedSeason) || seasons[0];

  const handleSeasonChange = (seasonNumber: number) => {
    setSelectedSeason(seasonNumber);
    setSelectedEpisode(null);
  };

  const handleEpisodeClick = (episodeNumber: number) => {
    if (selectedSeason === null) return;
    setSelectedEpisode(episodeNumber);
    onEpisodeSelect(selectedSeason, episodeNumber);
  };

  const generateEpisodes = (episodeCount: number) => {
    return Array.from({ length: episodeCount }, (_, i) => i + 1);
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Season Selector */}
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-white">Seasons</h3>
        <div className="flex flex-wrap gap-2">
          {seasons.map((season) => (
            <button
              key={season.season_number}
              onClick={() => handleSeasonChange(season.season_number!)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${selectedSeason === season.season_number
                ? 'bg-white text-black'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
            >
              {season.season_number}
            </button>
          ))}
        </div>
      </div>

      {/* Episode List */}
      {currentSeason && (
        <div className="flex flex-col gap-2 flex-1 overflow-hidden">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              Episodes
            </h3>
            <span className="text-xs text-gray-400">
              {currentSeason.episode_count} episodes
            </span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-2">
            {generateEpisodes(currentSeason.episode_count || 0).map((episodeNumber) => (
              <button
                key={episodeNumber}
                onClick={() => handleEpisodeClick(episodeNumber)}
                className={`w-full text-left p-3 rounded-lg transition-all ${selectedEpisode === episodeNumber
                  ? 'bg-gray-800 border-l-2 border-white'
                  : 'bg-transparent hover:bg-gray-800/50 border-l-2 border-transparent'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className="shrink-0 w-8 h-8 bg-gray-700 rounded flex items-center justify-center">
                    <span className="text-white text-sm font-bold">{episodeNumber}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white text-sm font-medium">
                      Episode {episodeNumber}
                    </h4>
                  </div>
                  {selectedEpisode === episodeNumber && (
                    <div className="shrink-0">
                      <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default EpisodeSelector;
