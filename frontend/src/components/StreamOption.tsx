import { useState } from 'react';
import { Play, Hd, Monitor, Globe, Star, ExternalLink, Clock, Users } from 'lucide-react';

interface StreamOptionProps {
    provider: string;
    quality: string;
    language: string;
    rating?: number;
    userCount?: number;
    latency?: string;
    isOfficial?: boolean;
    onClick?: () => void;
}

function StreamOption({
    provider,
    quality,
    language,
    rating = 0,
    userCount = 0,
    latency = 'Unknown',
    isOfficial = false,
    onClick
}: StreamOptionProps) {
    const [isHovered, setIsHovered] = useState(false);

    const getQualityIcon = (quality: string) => {
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

    const formatUserCount = (count: number) => {
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
        ${isHovered ? 'shadow-white/10 border-opacity-80' : 'shadow-black/40 border-opacity-50'}
      `}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onClick}
        >
            {/* Official Badge */}
            {isOfficial && (
                <div className="absolute -top-2 -right-2 bg-gray-700 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg z-10">
                    OFFICIAL
                </div>
            )}

            {/* Provider Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg bg-linear-to-br ${getProviderColor()} flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                        {provider.charAt(0).toUpperCase()}
                    </div>
                    <h3 className="text-white font-semibold text-sm truncate max-w-30">
                        {provider}
                    </h3>
                </div>
                {getQualityIcon(quality)}
            </div>

            {/* Quality and Language */}
            <div className="flex items-center gap-2 mb-3">
                <span className="text-white font-bold text-lg">{quality}</span>
                <div className="flex items-center gap-1 text-gray-400 text-xs">
                    <Globe className="w-3 h-3" />
                    <span>{language}</span>
                </div>
            </div>

            {/* Stats Row */}
            <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{formatUserCount(userCount)} watching</span>
                </div>
                <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{latency}</span>
                </div>
            </div>

            {/* Rating */}
            {rating > 0 && (
                <div className="flex items-center gap-1 mb-3">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-white font-semibold text-sm">{rating.toFixed(1)}</span>
                    <span className="text-gray-500 text-xs">/ 5</span>
                </div>
            )}

            {/* Play Button */}
            <button
                className={`
          w-full py-2.5 rounded-lg font-semibold text-sm
          flex items-center justify-center gap-2
          transition-all duration-300
          ${isHovered
                        ? 'bg-white text-black shadow-lg transform -translate-y-0.5'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }
        `}
            >
                <Play className="w-4 h-4" />
                <span>Watch Now</span>
            </button>

            {/* Hover Effect - External Link */}
            <div className={`absolute top-2 right-2 transition-all duration-300 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'}`}>
                <ExternalLink className="w-4 h-4 text-gray-400" />
            </div>

            {/* Gradient Overlay on Hover */}
            <div
                className={`
          absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 pointer-events-none
          bg-linear-to-t from-white/5 to-transparent
          ${isHovered ? 'opacity-100' : ''}
        `}
            />
        </div>
    );
}

export default StreamOption;