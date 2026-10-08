import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Loader2,
  Settings,
  RotateCcw,
  RotateCw,
  FastForward,
  MessageSquareText,
} from "lucide-react";

export interface SubtitleTrack {
  src: string;
  srcLang: string;
  label: string;
  default?: boolean;
}

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  subtitles?: SubtitleTrack[];
  onEnded?: () => void;
  onCanPlay?: () => void;
  onWaiting?: ()   => void;
  onPlaying?: () => void;
  onError?: () => void;
}

export default function VideoPlayer({ src, poster, title, subtitles, onEnded, onCanPlay, onWaiting, onPlaying, onError }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isWaiting, setIsWaiting] = useState(true);
  
  // New State for Settings and Speed
  const [speed, setSpeed] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [isSpeedingUp, setIsSpeedingUp] = useState(false); // For hold-to-fast-forward
  const [showSubtitlesMenu, setShowSubtitlesMenu] = useState(false);
  const [activeSubtitleIndex, setActiveSubtitleIndex] = useState<number>(-1);
  
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (subtitles) {
      const defaultIdx = subtitles.findIndex((s) => s.default);
      if (defaultIdx !== -1) setActiveSubtitleIndex(defaultIdx);
    }
  }, [subtitles]);

  // Auto-hide controls when mouse is idle
  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setShowSettings(false); // Close settings menu if open
        setShowSubtitlesMenu(false); // Close subtitles menu if open
      }, 3000);
    }
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying]);

  // Video Event Handlers
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const total = videoRef.current.duration;
    setCurrentTime(current);
    if (total > 0) setProgress((current / total) * 100);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      videoRef.current.playbackRate = speed; // Re-apply speed on load
    }
  };

  const handleCanPlay = () => {
    setIsWaiting(false);
  };

  const handleError = () => {
    setIsWaiting(false);
    console.error("Video failed to load");
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * videoRef.current.duration;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) videoRef.current.volume = val;
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
    if (newMuted) setVolume(0);
    else {
      setVolume(1);
      videoRef.current.volume = 1;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // --- New Features ---
  
  const skipBackward = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (videoRef.current) videoRef.current.currentTime -= 10;
  };

  const skipForward = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (videoRef.current) videoRef.current.currentTime += 10;
  };

  const changeSpeed = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (videoRef.current) videoRef.current.playbackRate = newSpeed;
    setShowSettings(false);
  };

  const changeSubtitle = (index: number) => {
    if (!videoRef.current) return;
    const tracks = videoRef.current.textTracks;
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = i === index ? "showing" : "hidden";
    }
    setActiveSubtitleIndex(index);
    setShowSubtitlesMenu(false);
  };

  // Hold-to-speed-up handlers
  const handleSpeedUpPress = (e?: React.PointerEvent) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.playbackRate = speed * 2;
      setIsSpeedingUp(true);
    }
  };

  const handleSpeedUpRelease = (e?: React.PointerEvent) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setIsSpeedingUp(false);
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return;
      
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "ArrowRight":
          skipForward();
          break;
        case "ArrowLeft":
          skipBackward();
          break;
      }
    };
    
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMuted, speed]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-2xl bg-black group select-none"
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => {
        if (isPlaying) {
          setShowControls(false);
          setShowSettings(false);
        }
        handleSpeedUpRelease(); // Failsafe if mouse leaves while holding fast-forward
      }}
      tabIndex={0}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-contain aspect-video"
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={handleCanPlay}
        onError={onError}
        onWaiting={onWaiting}
        onPlaying={onPlaying}
        onEnded={onEnded}
        preload="auto"
        crossOrigin="anonymous"
      >
        {subtitles?.map((sub, idx) => (
          <track
            key={idx}
            kind="subtitles"
            src={sub.src}
            srcLang={sub.srcLang}
            label={sub.label}
            default={sub.default}
          />
        ))}
      </video>

      {/* Buffering Indicator */}
      {isWaiting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none transition-all z-10">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
        </div>
      )}

      {/* Speeding up indicator */}
      {isSpeedingUp && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md text-white px-4 py-2 rounded-full font-medium flex items-center gap-2 animate-pulse z-10">
          <FastForward className="w-4 h-4" />
          <span>Playing at {speed * 2}x Speed</span>
        </div>
      )}

      {/* Top Title Bar (Glassmorphic) */}
      <div
        className={`absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <h2 className="text-white font-medium text-lg drop-shadow-md">
          {title || "Now Playing"}
        </h2>
      </div>

      {/* Central Play/Pause overlay */}
      <div 
        className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${
          !isPlaying && !isWaiting ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="bg-purple-600/80 backdrop-blur-md text-white p-4 rounded-full shadow-lg scale-110">
          <Play className="w-10 h-10 ml-1" />
        </div>
      </div>

      {/* Bottom Controls (Glassmorphic) */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-4 pt-12 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${
          showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        {/* Progress Bar */}
        <div 
          ref={progressRef}
          className="relative h-2 bg-white/20 rounded-full mb-4 cursor-pointer hover:h-3 transition-all"
          onClick={handleSeek}
        >
          <div className="absolute top-0 left-0 h-full bg-white/30 rounded-full" style={{ width: '0%' }} />
          <div
            className="absolute top-0 left-0 h-full bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.7)]"
            style={{ width: `${progress}%` }}
          />
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progress}% - 8px)` }}
          />
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <button
              onClick={togglePlay}
              className="hover:text-purple-400 transition-colors active:scale-95"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>
            
            {/* Skip Backward 10s */}
            <button onClick={skipBackward} className="hover:text-purple-400 transition-colors active:scale-95">
              <RotateCcw className="w-5 h-5" />
            </button>

            {/* Skip Forward 10s */}
            <button onClick={skipForward} className="hover:text-purple-400 transition-colors active:scale-95">
              <RotateCw className="w-5 h-5" />
            </button>
            
            {/* Volume Control */}
            <div className="flex items-center gap-2 group/volume relative">
              <button
                onClick={toggleMute}
                className="hover:text-purple-400 transition-colors"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={handleVolumeChange}
                className="w-0 opacity-0 group-hover/volume:w-20 group-hover/volume:opacity-100 transition-all duration-300 accent-purple-500 cursor-pointer h-1.5"
              />
            </div>

            {/* Timestamps */}
            <div className="text-xs font-medium text-gray-300 tracking-wide font-mono min-w-[90px]">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="flex items-center gap-4">
            
            {/* Hold to Fast Forward */}
            <button 
              onPointerDown={handleSpeedUpPress}
              onPointerUp={handleSpeedUpRelease}
              onPointerLeave={handleSpeedUpRelease}
              className={`transition-colors active:scale-95 flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${
                isSpeedingUp ? "bg-purple-600 text-white" : "text-gray-300 hover:text-white bg-white/10 hover:bg-white/20"
              }`}
              title="Hold to Fast Forward"
            >
              <FastForward className="w-4 h-4" />
            </button>

            {/* Subtitles Menu Toggle */}
            {subtitles && subtitles.length > 0 && (
              <div className="relative">
                <button 
                  onClick={() => {
                    setShowSubtitlesMenu(!showSubtitlesMenu);
                    setShowSettings(false);
                  }}
                  className={`transition-colors duration-300 ${
                    showSubtitlesMenu || activeSubtitleIndex !== -1 ? "text-purple-400" : "text-gray-300 hover:text-white"
                  }`}
                  title="Subtitles/Captions"
                >
                  <MessageSquareText className="w-5 h-5" />
                </button>

                {/* Subtitles Dropdown */}
                {showSubtitlesMenu && (
                  <div className="absolute bottom-full right-0 mb-4 w-32 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl z-20 origin-bottom-right animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-2 border-b border-white/10 text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      Subtitles
                    </div>
                    <div className="flex flex-col py-1">
                      <button
                        onClick={() => changeSubtitle(-1)}
                        className={`text-left px-4 py-2 text-sm transition-colors hover:bg-white/10 ${
                          activeSubtitleIndex === -1 ? "text-purple-400 font-medium bg-purple-500/10" : "text-gray-200"
                        }`}
                      >
                        Off
                      </button>
                      {subtitles.map((sub, idx) => (
                        <button
                          key={idx}
                          onClick={() => changeSubtitle(idx)}
                          className={`text-left px-4 py-2 text-sm transition-colors hover:bg-white/10 ${
                            activeSubtitleIndex === idx ? "text-purple-400 font-medium bg-purple-500/10" : "text-gray-200"
                          }`}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Settings Menu Toggle */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowSettings(!showSettings);
                  setShowSubtitlesMenu(false);
                }}
                className={`transition-colors hover:rotate-45 duration-300 ${
                  showSettings ? "text-purple-400" : "text-gray-300 hover:text-white"
                }`}
              >
                <Settings className="w-5 h-5" />
              </button>

              {/* Settings Dropdown */}
              {showSettings && (
                <div className="absolute bottom-full right-0 mb-4 w-32 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl z-20 origin-bottom-right animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-2 border-b border-white/10 text-xs text-gray-400 font-semibold uppercase tracking-wider">
                    Speed
                  </div>
                  <div className="flex flex-col py-1">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                      <button
                        key={s}
                        onClick={() => changeSpeed(s)}
                        className={`text-left px-4 py-2 text-sm transition-colors hover:bg-white/10 ${
                          speed === s ? "text-purple-400 font-medium bg-purple-500/10" : "text-gray-200"
                        }`}
                      >
                        {s === 1 ? "Normal" : `${s}x`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={toggleFullscreen}
              className="text-gray-300 hover:text-white transition-colors active:scale-95"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
