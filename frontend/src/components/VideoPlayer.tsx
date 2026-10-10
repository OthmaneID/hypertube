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
  episodeTitle?: string;
  subtitles?: SubtitleTrack[];
  autoPlay?: boolean;
  hidePlayerBuffering?: boolean;
  disableSeek?: boolean;
  /** The server re-encodes the file live, so seeking restarts the stream at `?start=<seconds>` */
  transcoded?: boolean;
  /** Where a transcoded stream can really start for a seek target (the server snaps to a keyframe) */
  resolveSeekStart?: (time: number) => Promise<number>;
  passedDuration?: number;
  onEnded?: () => void;
  onCanPlay?: () => void;
  onWaiting?: ()   => void;
  onPlaying?: () => void;
  onError?: (e: any) => void;
}

const TRANSCODED_SEEK_DEBOUNCE_MS = 400;

function withStartParam(src: string, start: number) {
  return `${src}${src.includes("?") ? "&" : "?"}start=${start.toFixed(1)}`;
}

export default function VideoPlayer({ src, poster, title, episodeTitle, subtitles, autoPlay = false, hidePlayerBuffering = false, disableSeek = false, transcoded = false, resolveSeekStart, passedDuration, onEnded, onCanPlay, onWaiting, onPlaying, onError }: VideoPlayerProps) {
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

  // Transcoded streams always start at media time 0, so the real position is startOffset + currentTime
  const [startOffset, setStartOffset] = useState(0);
  const [seekAutoPlay, setSeekAutoPlay] = useState<boolean | null>(null);
  const startOffsetRef = useRef(0);
  const lastGoodOffsetRef = useRef(0);
  const pendingSeekRef = useRef<number | null>(null);
  // Bumped by every seek, so a start resolved for an older seek is discarded
  const seekRequestRef = useRef(0);
  const seekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasStartedRef = useRef(false);
  const cueOriginalTimesRef = useRef(new WeakMap<TextTrackCue, [number, number]>());
  // Bottom edge for subtitle cues (percent of the video height), or null for the default position
  const cueLineRef = useRef<number | null>(null);

  const videoSrc = transcoded && startOffset > 0 ? withStartParam(src, startOffset) : src;

  useEffect(() => {
    return () => {
      if (seekTimerRef.current) clearTimeout(seekTimerRef.current);
    };
  }, []);

  const getTotalDuration = () => {
    const mediaDuration = videoRef.current?.duration;
    const hasMediaDuration = mediaDuration !== undefined && Number.isFinite(mediaDuration) && mediaDuration > 0;
    if (!transcoded && hasMediaDuration) return mediaDuration;
    return passedDuration || (hasMediaDuration ? mediaDuration : 0);
  };

  const getPosition = () => {
    if (pendingSeekRef.current !== null) return pendingSeekRef.current;
    return startOffsetRef.current + (videoRef.current?.currentTime || 0);
  };

  const positionCue = (cue: TextTrackCue) => {
    if (!("line" in cue)) return;
    const vtt = cue as VTTCue;
    const line = cueLineRef.current;
    if (line === null) {
      vtt.snapToLines = true;
      vtt.line = "auto";
    } else {
      vtt.snapToLines = false;
      vtt.lineAlign = "end";
      vtt.line = line;
    }
  };

  // Subtitle cues are timed against the whole movie, so shift them by the transcoded start offset
  const applySubtitleOffset = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const originals = cueOriginalTimesRef.current;
    const offset = startOffsetRef.current;
    for (const track of Array.from(video.textTracks)) {
      if (!track.cues) continue;
      for (const cue of Array.from(track.cues)) {
        let original = originals.get(cue);
        if (!original) {
          original = [cue.startTime, cue.endTime];
          originals.set(cue, original);
        }
        cue.startTime = original[0] - offset;
        cue.endTime = original[1] - offset;
        positionCue(cue);
      }
    }
  }, []);

  const controlsVisible = showControls || !isPlaying;

  // Keep subtitles above the bottom controls while they are shown
  useEffect(() => {
    const updateCueLine = () => {
      const video = videoRef.current;
      const bar = progressRef.current;
      const controls = bar?.parentElement;
      if (!video || !bar || !controls) return;
      // Layout offsets ignore the controls' slide-in transform
      const barTop = controls.offsetTop + bar.offsetTop - video.offsetTop;
      if (controlsVisible && video.offsetHeight > 0) {
        const bottom = barTop - 12;
        cueLineRef.current = Math.max(0, Math.min(100, (bottom / video.offsetHeight) * 100));
      } else {
        cueLineRef.current = null;
      }
      applySubtitleOffset();
    };
    updateCueLine();
    window.addEventListener("resize", updateCueLine);
    return () => window.removeEventListener("resize", updateCueLine);
  }, [controlsVisible, isFullscreen, subtitles, applySubtitleOffset]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const trackElements = Array.from(video.querySelectorAll("track"));
    trackElements.forEach((t) => t.addEventListener("load", applySubtitleOffset));
    applySubtitleOffset();
    return () => trackElements.forEach((t) => t.removeEventListener("load", applySubtitleOffset));
  }, [subtitles, startOffset, applySubtitleOffset]);

  useEffect(() => {
    const total = getTotalDuration();
    if (total > 0) setDuration(total);
  }, [passedDuration, transcoded]);

  useEffect(() => {
    if (!subtitles) return;
    const defaultIdx = subtitles.findIndex((s) => s.default);
    // Tracks added after the video started are not auto-enabled by the `default` attribute
    const tracks = videoRef.current?.textTracks;
    if (tracks) {
      for (let i = 0; i < tracks.length; i++) {
        tracks[i].mode = i === defaultIdx ? "showing" : "hidden";
      }
    }
    setActiveSubtitleIndex(defaultIdx);
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
      // Rejects with AbortError when a pause or a new load interrupts it; nothing to recover
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current || isSeeking || pendingSeekRef.current !== null) return;
    if (startOffsetRef.current !== startOffset) return; // old stream still reporting before the new src renders
    const current = getPosition();
    const total = getTotalDuration();
    setCurrentTime(current);
    if (total > 0) {
      setProgress(Math.min(100, (current / total) * 100));
    } else {
      setProgress(0);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(getTotalDuration());
      videoRef.current.playbackRate = speed; // Re-apply speed on load
      applySubtitleOffset();
    }
  };

  const handleCanPlay = () => {
    setIsWaiting(false);
    lastGoodOffsetRef.current = startOffsetRef.current;
    // Without autoplay no "playing" event follows, so report readiness here (e.g. a seek while paused)
    if (!(seekAutoPlay ?? autoPlay)) onCanPlay?.();
  };

  const handleError = () => {
    setIsWaiting(false);
    console.error("Video failed to load");
  };

  const commitTranscodedSeek = (target: number, resume: boolean) => {
    seekRequestRef.current++;
    const previous = startOffsetRef.current;
    startOffsetRef.current = target;
    setSeekAutoPlay(resume);
    setIsWaiting(true);
    onWaiting?.();
    if (target === previous) {
      // Same URL as the current one: React won't touch src, so restart the stream manually
      videoRef.current?.load();
    } else {
      setStartOffset(target);
    }
  };

  const startTranscodedSeek = async (target: number, resume: boolean) => {
    const requestId = ++seekRequestRef.current;
    setIsWaiting(true);
    onWaiting?.();
    let start = target;
    if (resolveSeekStart) {
      try {
        start = await resolveSeekStart(target);
      } catch {
        // The exact target still plays, just up to one keyframe interval off
      }
    }
    if (requestId !== seekRequestRef.current) return;
    pendingSeekRef.current = null;
    commitTranscodedSeek(start, resume);
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

  const seekTo = (target: number) => {
    const video = videoRef.current;
    if (disableSeek || !video) return;
    const total = getTotalDuration();
    const clamped = Math.max(0, total > 0 ? Math.min(target, total - 1) : target);

    setCurrentTime(clamped);
    if (total > 0) setProgress((clamped / total) * 100);

    if (!transcoded) {
      video.currentTime = clamped;
      return;
    }

    // Data the current stream already delivered can be replayed without restarting it
    const local = clamped - startOffsetRef.current;
    if (pendingSeekRef.current === null && local >= 0 && isLocallySeekable(video, local)) {
      video.currentTime = local;
      return;
    }

    // Each transcoded seek restarts ffmpeg on the server, so rapid skips are merged into one
    const resume = hasStartedRef.current ? isPlaying : autoPlay;
    // Stop the old stream right away so it doesn't keep playing while the new one is prepared
    video.pause();
    setIsWaiting(true);
    onWaiting?.();
    pendingSeekRef.current = clamped;
    seekRequestRef.current++;
    if (seekTimerRef.current) clearTimeout(seekTimerRef.current);
    seekTimerRef.current = setTimeout(() => {
      seekTimerRef.current = null;
      // Stays set until the stream restarts, so the old stream's timeupdates don't move the bar back
      const next = pendingSeekRef.current;
      if (next !== null) startTranscodedSeek(next, resume);
    }, TRANSCODED_SEEK_DEBOUNCE_MS);
  };

  const getPointerTarget = (clientX: number) => {
    if (!progressRef.current) return 0;
    const rect = progressRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return pos * getTotalDuration();
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

  const previewSeek = (clientX: number) => {
    const total = getTotalDuration();
    if (total <= 0) return;
    const target = getPointerTarget(clientX);
    setProgress((target / total) * 100);
    setCurrentTime(target);
  };

  const handleSeekStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disableSeek) return;
    if (!videoRef.current || !progressRef.current || getTotalDuration() <= 0) return;
    setIsSeeking(true);
    previewSeek(e.clientX);
    // Transcoded streams only restart once the drag is released
    if (!transcoded) seekTo(getPointerTarget(e.clientX));
  };

  const handleSeekMove = (e: PointerEvent) => {
    if (disableSeek) return;
    if (!isSeeking || !progressRef.current || !videoRef.current) return;
    previewSeek(e.clientX);
  };

  const handleSeekEnd = (e: PointerEvent) => {
    if (disableSeek) return;
    if (!isSeeking || !videoRef.current || !progressRef.current) return;
    setIsSeeking(false);
    seekTo(getPointerTarget(e.clientX));
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
    seekTo(getPosition() - 10);
  };

  const skipForward = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    seekTo(getPosition() + 10);
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

  // Keyboard controls (read through a ref so the listener always sees the latest seek state)
  const keyDownRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyDownRef.current = (e: KeyboardEvent) => {
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => keyDownRef.current(e);
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

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
        src={videoSrc}
        poster={poster}
        className="w-full h-full object-contain cursor-pointer"
        onClick={togglePlay}
        onDoubleClick={handleDoubleClick}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={handleCanPlay}
        onError={(e) => {
          console.error("Video error:", e.currentTarget.error);
          if (transcoded && startOffsetRef.current !== lastGoodOffsetRef.current) {
            // A failed jump falls back to the last position that played instead of killing the player
            commitTranscodedSeek(lastGoodOffsetRef.current, isPlaying);
            return;
          }
          if (onError) onError(e);
        }}
        onWaiting={() => {
          setIsWaiting(true);
          onWaiting?.();
        }}
        onPlaying={() => {
          hasStartedRef.current = true;
          setIsWaiting(false);
          setIsPlaying(true);
          if (onPlaying) onPlaying();
        }}
        onEnded={onEnded}
        preload="auto"
        autoPlay={seekAutoPlay ?? autoPlay}
        autoFocus={true}
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

      {/* Buffering Indicator (the Watch page's own overlay is outside the fullscreen element, so show ours there) */}
      {(!hidePlayerBuffering || isFullscreen) && isWaiting && (
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
          {title || episodeTitle || "Now Playing"}
        </h2>
        {title && episodeTitle && (
          <p className="text-white/60 text-sm drop-shadow-lg max-w-3xl truncate px-4 mt-1">
            {episodeTitle}
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
            className="absolute top-0 left-0 h-full bg-linear-to-r from-purple-600 to-purple-400 rounded-full shadow-[0_0_12px_rgba(168,85,247,0.8)]"
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
