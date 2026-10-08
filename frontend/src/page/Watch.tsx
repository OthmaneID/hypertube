import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";

// Slightly longer than the backend's metadata timeout so its 504 arrives first
const LOAD_TIMEOUT_MS = 70_000;

type PlayerStatus = "loading" | "buffering" | "playing" | "error";

function Watch() {
    const { hash } = useParams()
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);

    const streamParams = new URLSearchParams();
    const fileIdx = queryParams.get("fileIdx");
    const filename = queryParams.get("filename");
    if (fileIdx) streamParams.set("fileIdx", fileIdx);
    if (filename) streamParams.set("filename", filename);

    const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:8000"
    const streamUrl = `${backendUrl}/torrent/stream/${hash}?${streamParams.toString()}`

    return <StreamPlayer key={streamUrl} streamUrl={streamUrl} />
}

function StreamPlayer({ streamUrl }: { streamUrl: string }) {
    const navigate = useNavigate();
    const [status, setStatus] = useState<PlayerStatus>("loading");

    useEffect(() => {
        const timer = setTimeout(() => {
            setStatus((current) => (current === "loading" ? "error" : current));
        }, LOAD_TIMEOUT_MS);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="relative w-full h-screen flex items-center justify-center bg-black">
            {status !== "error" && (
                <video
                    src={streamUrl}
                    controls
                    autoPlay
                    className="w-full h-full max-w-250"
                    onCanPlay={() => setStatus("playing")}
                    onWaiting={() => setStatus((current) => (current === "loading" ? current : "buffering"))}
                    onPlaying={() => setStatus("playing")}
                    onError={() => setStatus("error")}
                />
            )}

            {(status === "loading" || status === "buffering") && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-3 border-purple-700"></div>
                    <p className="text-gray-300 text-sm">
                        {status === "loading" ? "Connecting to peers..." : "Buffering..."}
                    </p>
                </div>
            )}

            {status === "error" && (
                <div className="flex flex-col items-center gap-4 text-center px-6">
                    <p className="text-red-400 text-lg font-semibold">This source could not be loaded</p>
                    <p className="text-gray-400 text-sm max-w-md">
                        The torrent may have no active seeders, or the episode file could not be found in it.
                        Try another source.
                    </p>
                    <button
                        className="px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-sm cursor-pointer transition-all duration-300"
                        onClick={() => navigate(-1)}
                    >
                        Choose another source
                    </button>
                </div>
            )}
        </div>
    )
}



export default Watch;
