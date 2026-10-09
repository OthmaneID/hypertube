import React, { useState, useEffect, useRef, useCallback } from "react";
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
  // Secondary line under the title, e.g. "S1 E3 · Pilot"
  subtitle?: string;
  subtitles?: SubtitleTrack[];
  autoPlay?: boolean;
  hidePlayerBuffering?: boolean;
  disableSeek?: boolean;
  passedDuration?: number;
  // Position in the full video where `src` begins (transcoded streams restart at the seek target)
  timeOffset?: number;
  // When set, seeks outside what the current `src` has buffered are handed to the parent, with the absolute time
  onServerSeek?: (time: number) => void;
  onEnded?: () => void;
  onCanPlay?: () => void;
  onWaiting?: ()   => void;
  onPlaying?: () => void;
  onError?: (e: any) => void;
}

export default function VideoPlayer({ src, poster, title, subtitle, subtitles, autoPlay = false, hidePlayerBuffering = false, disableSeek = false, passedDuration, timeOffset = 0, onServerSeek, onEnded, onCanPlay, onWaiting, onPlaying, onError }: VideoPlayerProps) {
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
  
  const [isSeeking, setIsSeeking] = useState(false);
  const [doubleClickSide, setDoubleClickSide] = useState<"left" | "right" | null>(null);

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

  // For transcoded streams the element only knows the length of the current segment
  const getTotal = () => {
    const elementDuration = videoRef.current?.duration;
    if (!onServerSeek && elementDuration && Number.isFinite(elementDuration)) return elementDuration;
    return passedDuration || 0;
  };

  const isLocallySeekable = (video: HTMLVideoElement, time: number) => {
    const inRanges = (ranges: TimeRanges) => {
      for (let i = 0; i < ranges.length; i++) {
        if (ranges.start(i) <= time && time <= ranges.end(i)) return true;
      }
      return false;
    };
    return inRanges(video.buffered) && inRanges(video.seekable);
  };

  // All seeks go through here with an absolute time in the full video
  const seekTo = (time: number) => {
    const video = videoRef.current;
    if (!video) return;
    const total = getTotal();
    if (!Number.isFinite(total) || total <= 0) return;
    // A stream started at the very end would be empty
    const target = Math.max(0, Math.min(time, total - 1));

    setCurrentTime(target);
    setProgress((target / total) * 100);

    const local = target - timeOffset;
    if (onServerSeek && !(local >= 0 && isLocallySeekable(video, local))) {
      onServerSeek(target);
      return;
    }
    video.currentTime = local;
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current || isSeeking) return;
    const current = timeOffset + videoRef.current.currentTime;
    const total = getTotal();
    setCurrentTime(current);
    if (total > 0 && total !== Infinity) {
      setProgress((current / total) * 100);
    } else {
      setProgress(0);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(getTotal());
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

  // Double click to seek
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (disableSeek) return;
    if (!containerRef.current || !videoRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const isLeft = e.clientX - rect.left < rect.width / 2;

    if (isLeft) {
      skipBackward();
      setDoubleClickSide("left");
    } else {
      skipForward();
      setDoubleClickSide("right");
    }

    setTimeout(() => setDoubleClickSide(null), 500);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>) => {
    if (disableSeek) return;
    if (!videoRef.current || !progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    // Optimistic UI update
    setProgress(pos * 100);
    setCurrentTime(pos * getTotal());
  };

  const handleSeekStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disableSeek) return;
    setIsSeeking(true);
    handleSeek(e);
  };

  const handleSeekMove = (e: PointerEvent) => {
    if (disableSeek) return;
    if (!isSeeking || !progressRef.current || !videoRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setProgress(pos * 100);
    setCurrentTime(pos * getTotal());
  };

  const handleSeekEnd = (e: PointerEvent) => {
    if (disableSeek) return;
    if (!isSeeking || !videoRef.current || !progressRef.current) return;
    setIsSeeking(false);
    const rect = progressRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekTo(pos * getTotal());
  };

  useEffect(() => {
    if (isSeeking) {
      window.addEventListener("pointermove", handleSeekMove);
      window.addEventListener("pointerup", handleSeekEnd);
      return () => {
        window.removeEventListener("pointermove", handleSeekMove);
        window.removeEventListener("pointerup", handleSeekEnd);
      };
    }
  }, [isSeeking]);

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
    if (disableSeek) return;
    if (videoRef.current) seekTo(timeOffset + videoRef.current.currentTime - 10);
  };

  const skipForward = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (disableSeek) return;
    if (videoRef.current) seekTo(timeOffset + videoRef.current.currentTime + 10);
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
  }, [isMuted, speed, timeOffset, onServerSeek, passedDuration]);

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
      className="relative w-full h-full overflow-hidden bg-black group select-none flex items-center justify-center"
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
        className="w-full h-full object-contain cursor-pointer"
        onClick={togglePlay}
        onDoubleClick={handleDoubleClick}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={handleCanPlay}
        onError={(e) => {
          console.error("Video error:", e.currentTarget.error);
          if (onError) onError(e);
        }}
        onWaiting={onWaiting}
        onPlaying={() => {
          setIsPlaying(true);
          if (onPlaying) onPlaying();
        }}
        onEnded={onEnded}
        preload="auto"
        autoPlay={autoPlay}
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

      {/* Double click ripple indicators */}
      <div
        className={`absolute top-0 bottom-0 left-0 w-1/3 pointer-events-none flex items-center justify-center transition-opacity duration-300 ${
          doubleClickSide === "left" ? "opacity-100" : "opacity-0"
        }`}
        style={{ background: "linear-gradient(to right, rgba(0,0,0,0.4) 0%, transparent 100%)" }}
      >
        <div className="bg-black/40 backdrop-blur-sm rounded-full p-4 flex flex-col items-center gap-1 animate-bounce">
          <RotateCcw className="w-8 h-8 text-white" />
          <span className="text-white font-bold text-sm">10s</span>
        </div>
      </div>
      <div
        className={`absolute top-0 bottom-0 right-0 w-1/3 pointer-events-none flex items-center justify-center transition-opacity duration-300 ${
          doubleClickSide === "right" ? "opacity-100" : "opacity-0"
        }`}
        style={{ background: "linear-gradient(to left, rgba(0,0,0,0.4) 0%, transparent 100%)" }}
      >
        <div className="bg-black/40 backdrop-blur-sm rounded-full p-4 flex flex-col items-center gap-1 animate-bounce">
          <RotateCw className="w-8 h-8 text-white" />
          <span className="text-white font-bold text-sm">10s</span>
        </div>
      </div>

      {/* Buffering Indicator (hidden when Watch page provides its own overlay) */}
      {!hidePlayerBuffering && isWaiting && (
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
        className={`absolute top-0 left-0 right-0 p-6 pt-8 pb-12 bg-gradient-to-b from-black/90 via-black/50 to-transparent transition-opacity duration-300 pointer-events-none z-20 ${
          showControls || !isPlaying ? "opacity-100" : "opacity-0"
        }`}
      >
        <h2 className="text-white/90 font-medium text-xl drop-shadow-lg max-w-3xl truncate px-4">
          {title || subtitle || "Now Playing"}
        </h2>
        {title && subtitle && (
          <p className="text-white/60 text-sm drop-shadow-lg max-w-3xl truncate px-4 mt-1">
            {subtitle}
          </p>
        )}
      </div>

      {/* Central Play/Pause overlay */}
      <div
        className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-300 ${
          !isPlaying && !isWaiting ? "opacity-100 scale-100" : "opacity-0 scale-75"
        }`}
      >
        <div className="bg-purple-600/80 hover:bg-purple-600 backdrop-blur-md text-white p-5 rounded-full shadow-[0_0_40px_rgba(147,51,234,0.5)] border border-purple-400/30">
          <Play className="w-12 h-12 ml-1" />
        </div>
      </div>

      {/* Bottom Controls (Glassmorphic) */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-6 pt-16 bg-gradient-to-t from-black/95 via-black/60 to-transparent transition-all duration-300 z-20 ${
          showControls || !isPlaying ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        {/* Progress Bar */}
        <div
          ref={progressRef}
          className={`relative h-1.5 hover:h-2.5 bg-white/20 rounded-full mb-4 transition-all duration-200 flex items-center ${disableSeek ? 'cursor-default' : 'cursor-pointer'}`}
          onPointerDown={handleSeekStart}
        >
          {/* Buffer / Trail bar */}
          <div className="absolute top-0 left-0 h-full bg-white/10 rounded-full w-full" />

          {/* Filled Progress */}
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full shadow-[0_0_12px_rgba(168,85,247,0.8)]"
            style={{ width: `${progress}%` }}
          />

          {/* Seek Thumb */}
          <div
            className={`absolute w-3.5 h-3.5 bg-white rounded-full shadow-md transition-transform duration-100 ${
              disableSeek ? 'hidden' : (isSeeking ? "scale-125 opacity-100" : "group-hover:opacity-100 opacity-0 hover:scale-110")
            }`}
            style={{ left: `calc(${progress}% - 7px)` }}
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
            <button disabled={disableSeek} onClick={skipBackward} className={`transition-colors active:scale-95 ${disableSeek ? 'text-gray-500 cursor-not-allowed' : 'hover:text-purple-400'}`}>
              <RotateCcw className="w-5 h-5" />
            </button>

            {/* Skip Forward 10s */}
            <button disabled={disableSeek} onClick={skipForward} className={`transition-colors active:scale-95 ${disableSeek ? 'text-gray-500 cursor-not-allowed' : 'hover:text-purple-400'}`}>
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
