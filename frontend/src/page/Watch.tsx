import { useParams } from "react-router-dom";

function Watch() {
    const { hash } = useParams()
    const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:8000"

    return (
        <div className="w-full h-screen flex items-center justify-center bg-black">
            <video
                src={`${backendUrl}/torrent/stream/${hash}`}
                controls
                autoPlay
                className="w-full h-full max-w-250"
            />
        </div>
    )
}



export default Watch;