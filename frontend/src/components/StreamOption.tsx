import { useState } from 'react';
import { Play, Hd, Monitor, Globe, ExternalLink, Clock, Users } from 'lucide-react';
import type { StreamElement } from '../utils/interfaces';
import { getSeeders } from '../utils/streams';

interface StreamOptionProps {
  stream: StreamElement;
  language?: string;
  onClick?: () => void;
}

function StreamOption({
  stream,
  language = "EN",
  onClick
}: StreamOptionProps) {
  const [isHovered, setIsHovered] = useState(false);

  const parseStream = (s: StreamElement) => {
    const [name1 = "", quality = ""] = (s.name || "").split("\n");
    const lines = (s.title || "").split("\n");

    const size = lines.join(" ").match(/💾\s*([\d.,]+\s*[KMGT]?B)/i)?.[1];
    const provider = lines.join(" ").match(/⚙️\s*([^\n]+)/)?.[1]?.trim();

    return {
      addon: name1.trim(),
      quality: quality.trim() || null,
      filename: s.behaviorHints?.filename ?? lines[0] ?? null,
      seeders: getSeeders(s),
      size: size ?? null,
      provider: provider ?? null,
      infoHash: s.infoHash ?? null,
    };
  };

  const parsed = parseStream(stream);
  const likelyDead = parsed.seeders === 0;

  const getQualityIcon = (quality: string | null) => {
    if (!quality) return null;
    if (quality.includes('4K') || quality.includes('2160')) {
      return <Monitor className="w-4 h-4 text-white" />;
    }
    if (quality.includes('1080') || quality.includes('HD')) {
      return <Hd className="w-4 h-4 text-white" />;
    }
    return null;
  };

  const getQualityColor = () => {
    return 'from-gray-800/50 to-gray-900/50 border-gray-700/50';
  };

  const getProviderColor = () => {
    return 'from-gray-700 to-gray-800';
  };

  const formatUserCount = (count: number | null) => {
    if (!count) return "0";
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };



  return (
    <div
      className={`
        relative group cursor-pointer
        bg-linear-to-br ${getQualityColor()}
        border-2 rounded-xl p-4
        transition-all duration-300 ease-out
        hover:scale-[1.02] hover:shadow-xl hover:border-opacity-60
        ${isHovered ? "shadow-white/10 border-opacity-80" : "shadow-black/40 border-opacity-50"}
        ${likelyDead ? "opacity-50" : ""}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Provider Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-lg bg-linear-to-br ${getProviderColor()} flex items-center justify-center text-white font-bold text-sm shadow-md`}
          >
            {parsed.provider?.charAt(0).toUpperCase() || "T"}
          </div>
          <h3 className="text-white font-semibold text-sm truncate max-w-30" title={parsed.provider || parsed.addon}>
            {parsed.provider || parsed.addon || "Unknown"}
          </h3>
        </div>
        {getQualityIcon(parsed.quality)}
      </div>

      {/* Quality and Language */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-white font-bold text-lg">{parsed.quality || "Unknown"}</span>
        <div className="flex items-center gap-1 text-gray-400 text-xs">
          <Globe className="w-3 h-3" />
          <span>{language}</span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
        <div className={`flex items-center gap-1 ${likelyDead ? "text-red-400" : ""}`}>
          <Users className="w-3 h-3" />
          <span>{formatUserCount(parsed.seeders)} seeders</span>
          {likelyDead && <span>(likely dead)</span>}
        </div>
        {parsed.size && (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{parsed.size}</span>
          </div>
        )}
      </div>

      {/* Filename */}
      {parsed.filename && (
        <div className="text-xs text-gray-500 mb-3 truncate" title={parsed.filename}>
          {parsed.filename}
        </div>
      )}

      {/* Play Button: navigation is handled by the card's onClick */}
      <div
        className={`
          w-full py-2.5 rounded-lg font-semibold text-sm
          flex items-center justify-center gap-2
          transition-all duration-300
          ${isHovered
            ? "bg-white text-black shadow-lg transform -translate-y-0.5"
            : "bg-white/10 text-gray-300 hover:bg-white/20"
          }
        `}
      >
        <Play className="w-4 h-4" />
        <span>
          Watch Now
        </span>
      </div>

      {/* Hover Effect - External Link */}
      <div
        className={`absolute top-2 right-2 transition-all duration-300 ${isHovered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2"}`}
      >
        <ExternalLink className="w-4 h-4 text-gray-400" />
      </div>

      {/* Gradient Overlay on Hover */}
      <div
        className={`
          absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 pointer-events-none
          bg-linear-to-t from-white/5 to-transparent
          ${isHovered ? "opacity-100" : ""}
        `}
      />
    </div>
  );
}

export default StreamOption;