import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import VideoPlayer from "../components/VideoPlayer";
import { get_stream_info } from "../utils/api/movieService/torrentsApi";
import {
  ArrowLeft,
  Wifi,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  Keyboard,
} from "lucide-react";

// Slightly longer than the backend's metadata timeout so its 504 arrives first
const LOAD_TIMEOUT_MS = 70_000;

type PlayerStatus = "loading" | "buffering" | "playing" | "error" | "ended";

function Watch() {
  const { hash } = useParams();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  const streamParams = new URLSearchParams();
  const fileIdx = queryParams.get("fileIdx");
  const filename = queryParams.get("filename");
  const title = queryParams.get("title") || undefined;
  const subtitle = queryParams.get("subtitle") || undefined;
  const durationParam = queryParams.get("duration");
  const passedDuration = durationParam ? Number(durationParam) : undefined;
  if (fileIdx) streamParams.set("fileIdx", fileIdx);
  if (filename) streamParams.set("filename", filename);

  const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const streamUrl = `${backendUrl}/torrent/stream/${hash}?${streamParams.toString()}`;

  return <StreamPlayer key={streamUrl} hash={hash ?? ""} streamParams={streamParams} streamUrl={streamUrl} title={title} subtitle={subtitle} passedDuration={passedDuration} />;
}

const SHORTCUTS = [
  { key: "Space / K", action: "Play / Pause" },
  { key: "← / →", action: "Skip 10s" },
  { key: "M", action: "Mute" },
  { key: "F", action: "Fullscreen" },
];

function StreamPlayer({
  hash,
  streamParams,
  streamUrl,
  title,
  subtitle,
  passedDuration,
}: {
  hash: string;
  streamParams: URLSearchParams;
  streamUrl: string;
  title?: string;
  subtitle?: string;
  passedDuration?: number;
}) {
  const navigate = useNavigate();
  const [playerStatus, setStatus] = useState<PlayerStatus>("loading");

  // Whether the file is transcoded is decided by the backend, which also knows its real duration
  const { data: streamInfo, isError: streamInfoFailed } = useQuery({
    queryKey: ["streamInfo", streamUrl],
    queryFn: () => get_stream_info(hash, streamParams),
    retry: false,
    staleTime: Infinity,
  });
  const status: PlayerStatus = streamInfoFailed ? "error" : playerStatus;

  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showTopBar, setShowTopBar] = useState(true);
  const [topBarTimeout, setTopBarTimeout] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  const resetTopBar = useCallback(() => {
    setShowTopBar(true);
    if (topBarTimeout) clearTimeout(topBarTimeout);
    if (status === "playing") {
      const t = setTimeout(() => setShowTopBar(false), 3000);
      setTopBarTimeout(t);
    }
  }, [status, topBarTimeout]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStatus((current) => (current === "loading" ? "error" : current));
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (topBarTimeout) clearTimeout(topBarTimeout);
    };
  }, [topBarTimeout]);


  // Transcoded streams can't be range-requested, so a seek restarts the stream at `offset`
  const [offset, setOffset] = useState(0);
  const latestSeek = useRef(0);

  const handleServerSeek = useCallback(
    async (time: number) => {
      const seekId = ++latestSeek.current;
      setStatus("buffering");
      try {
        // The backend snaps the time to where the stream can really start (a keyframe)
        const { start } = await get_stream_info(hash, streamParams, time);
        if (seekId === latestSeek.current) setOffset(start);
      } catch {
        if (seekId === latestSeek.current) setStatus("error");
      }
    },
    [hash, streamParams]
  );

  let videoSrc = streamUrl;
  if (offset > 0) {
    const url = new URL(streamUrl);
    url.searchParams.set("start", String(offset));
    videoSrc = url.toString();
  }

  const isOverlay = status === "loading" || status === "buffering";

  return (
    <div
      className="relative w-full min-h-screen bg-black flex flex-col overflow-hidden"
      onMouseMove={resetTopBar}
    >
      {/* Ambient background glow — hidden when error */}
      {status !== "error" && (
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(88,28,135,0.18) 0%, transparent 70%)",
          }}
        />
      )}

      {/* Top bar — back button + title */}
      <div
        className={`absolute top-0 left-0 right-0 z-30 flex items-center gap-3 px-5 pt-5 pb-8 transition-all duration-300 ${
          showTopBar || status !== "playing"
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)",
        }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors group"
          aria-label="Go back"
        >
          <span className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 group-hover:bg-white/20 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </span>
        </button>

        {title && (
          <span className="text-white/80 text-sm font-medium tracking-wide truncate max-w-xs">
            {title}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Connection status badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-500 ${
              status === "playing"
                ? "bg-emerald-500/15 text-emerald-400"
                : status === "buffering"
                  ? "bg-amber-500/15 text-amber-400"
                  : status === "loading"
                    ? "bg-purple-500/15 text-purple-400"
                    : status === "error"
                      ? "bg-red-500/15 text-red-400"
                      : "bg-white/10 text-white/50"
            }`}
          >
            {status === "playing" ? (
              <>
                <Wifi className="w-3 h-3" />
                Streaming
              </>
            ) : status === "buffering" ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Buffering
              </>
            ) : status === "loading" ? (
              <>
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                Connecting
              </>
            ) : status === "error" ? (
              <>
                <WifiOff className="w-3 h-3" />
                Failed
              </>
            ) : null}
          </div>

          {/* Keyboard shortcuts toggle */}
          <button
            onClick={() => setShowShortcuts((v) => !v)}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
              showShortcuts
                ? "bg-purple-500/30 text-purple-300"
                : "bg-white/10 text-white/50 hover:bg-white/20 hover:text-white"
            }`}
            aria-label="Keyboard shortcuts"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Keyboard shortcuts panel */}
      {showShortcuts && (
        <div
          className="absolute top-16 right-5 z-40 bg-gray-950/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl min-w-[200px]"
          style={{ animation: "fadeUp 0.18s ease" }}
        >
          <p className="text-xs text-white/40 uppercase tracking-widest mb-3 font-semibold">
            Shortcuts
          </p>
          <div className="flex flex-col gap-2">
            {SHORTCUTS.map(({ key, action }) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <kbd className="text-xs bg-white/10 text-white/70 px-2 py-0.5 rounded font-mono">
                  {key}
                </kbd>
                <span className="text-xs text-white/50">{action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Video player — full-bleed theater */}
      <div className="relative flex-1 flex items-center justify-center z-10">
        {status !== "error" && streamInfo && (
          <div className="w-full h-full flex items-center justify-center">
            <VideoPlayer
              src={videoSrc}
              title={title}
              subtitle={subtitle}
              autoPlay
              hidePlayerBuffering
              passedDuration={streamInfo.duration ?? passedDuration}
              timeOffset={streamInfo.transcoded ? offset : 0}
              onServerSeek={streamInfo.transcoded ? handleServerSeek : undefined}
              onCanPlay={() => setStatus("playing")}
              onWaiting={() =>
                setStatus((current) =>
                  current === "loading" ? current : "buffering"
                )
              }
              onPlaying={() => setStatus("playing")}
              onError={() => setStatus("error")}
              onEnded={() => setStatus("ended")}
            />
          </div>
        )}

        {/* Loading / Buffering overlay */}
        {isOverlay && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 pointer-events-none z-20">
            {/* Cinematic spinner */}
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-white/5" />
              <div
                className="absolute inset-0 rounded-full border-2 border-transparent border-t-purple-500 animate-spin"
                style={{ animationDuration: "0.9s" }}
              />
              <div
                className="absolute inset-2 rounded-full border border-transparent border-t-purple-400/40 animate-spin"
                style={{
                  animationDuration: "1.4s",
                  animationDirection: "reverse",
                }}
              />
            </div>

            <div className="text-center">
              <p className="text-white/90 text-sm font-medium">
                {status === "loading"
                  ? "Connecting to peers…"
                  : "Buffering stream…"}
              </p>
              <p className="text-white/30 text-xs mt-1">
                {status === "loading"
                  ? "Finding seeders on the torrent network"
                  : "Waiting for more data"}
              </p>
            </div>

            {/* Peer activity dots */}
            {status === "loading" && (
              <div className="flex gap-1.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-purple-500/60"
                    style={{
                      animation: `pulse 1.4s ease-in-out ${i * 0.18}s infinite`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error state */}
        {status === "error" && (
          <div className="flex flex-col items-center gap-6 text-center px-8 max-w-md z-20">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>

            <div>
              <h2 className="text-white text-lg font-semibold mb-2">
                Stream unavailable
              </h2>
              <p className="text-white/50 text-sm leading-relaxed">
                This torrent may have no active seeders, or the file could not
                be located. Try a different source.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/8 hover:bg-white/12 text-white/70 hover:text-white text-sm font-medium transition-all border border-white/8 hover:border-white/15"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="w-4 h-4" />
                Choose source
              </button>
              <button
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 hover:text-purple-200 text-sm font-medium transition-all border border-purple-500/20 hover:border-purple-500/40"
                onClick={() => {
                  setStatus("loading");
                  // Force remount will be handled by the key prop on parent
                  window.location.reload();
                }}
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Ended state */}
        {status === "ended" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 z-20 bg-black/60 backdrop-blur-sm">
            <p className="text-white/60 text-sm font-medium tracking-wide uppercase">
              Stream ended
            </p>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/18 text-white text-sm font-medium transition-all border border-white/10 hover:border-white/20"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to details
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.85); }
          40%            { opacity: 1;   transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}

export default Watch;
