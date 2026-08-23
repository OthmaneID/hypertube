import StreamOption from "../StreamOption";

interface StreamingOptionsProps {
  serie_id: number;
  serie_name: string;
}

function StreamingOptions({ serie_id, serie_name, seasonNumber, episodeNumber }: StreamingOptionsProps) {
  // Mock data - replace with actual API calls
  serie_id;
  serie_name;
  const mockStreams = [
    {
      provider: "Netflix",
      quality: "4K HDR",
      language: "EN",
      rating: 4.9,
      userCount: 22340,
      latency: "10ms",
      isOfficial: true
    },
    {
      provider: "Prime Video",
      quality: "1080p",
      language: "EN",
      rating: 4.6,
      userCount: 12450,
      latency: "22ms",
      isOfficial: true
    },
    {
      provider: "Disney+",
      quality: "4K",
      language: "EN",
      rating: 4.8,
      userCount: 18920,
      latency: "15ms",
      isOfficial: true
    },
    {
      provider: "HBO Max",
      quality: "1080p",
      language: "EN",
      rating: 4.4,
      userCount: 8760,
      latency: "28ms",
      isOfficial: true
    }
  ];

  const handleStreamClick = (provider: string) => {
    console.log(`Streaming from ${provider}`);
    // Add your streaming logic here
  };

  return (
    <div className="h-full md:w-1/4 max-md:w-full py-4 px-4 bg-gray-900/95 rounded-2xl flex flex-col text-gray-200 gap-4 border border-gray-800/50">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">
          Streaming Options
        </h1>
        <span className="text-xs text-gray-500">{mockStreams.length} available</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {mockStreams.map((stream, index) => (
          <StreamOption
            key={index}
            provider={stream.provider}
            quality={stream.quality}
            language={stream.language}
            rating={stream.rating}
            userCount={stream.userCount}
            latency={stream.latency}
            isOfficial={stream.isOfficial}
            onClick={() => handleStreamClick(stream.provider)}
          />
        ))}
      </div>

      <div className="pt-3 border-t border-gray-800 text-gray-500 text-xs flex items-center justify-between">
        <span>All servers online</span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          Live
        </span>
      </div>
    </div>
  );
}

export default StreamingOptions;
