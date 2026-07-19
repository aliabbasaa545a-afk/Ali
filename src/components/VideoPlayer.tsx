import React, { useRef, useEffect, useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize,
  Grid,
  Sparkles,
  Info,
  Columns,
  Eye,
  Split,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  Tv
} from "lucide-react";

interface VideoPlayerProps {
  videoUrl: string;
  onVideoRefCreated: (video: HTMLVideoElement) => void;
  brightness: number;
  contrast: number;
  saturation: number;
  hueRotate: number;
  sepia: number;
  grayscale: number;
  temperature: number;
  tint: number;
  vignette: number;
  shadows: { r: number; g: number; b: number };
  midtones: { r: number; g: number; b: number };
  highlights: { r: number; g: number; b: number };
  compareMode: "split" | "graded" | "original";
  onCompareModeChange?: (mode: "split" | "graded" | "original") => void;
}

export default function VideoPlayer({
  videoUrl,
  onVideoRefCreated,
  brightness,
  contrast,
  saturation,
  hueRotate,
  sepia,
  grayscale,
  temperature,
  tint,
  vignette,
  shadows,
  midtones,
  highlights,
  compareMode,
  onCompareModeChange
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const splitVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(true);
  const [splitPosition, setSplitPosition] = useState(50); // percentage for split compare
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isPortrait, setIsPortrait] = useState(false);
  const FPS = 24; // Standard cinema timeline frames per second

  // Lift, Gamma, Gain calculation for SVG filter properties
  const amplitudeR = 1 + (highlights.r - 128) / 128;
  const amplitudeG = 1 + (highlights.g - 128) / 128;
  const amplitudeB = 1 + (highlights.b - 128) / 128;

  const exponentR = Math.max(0.1, Math.pow(2, -(midtones.r - 128) / 64));
  const exponentG = Math.max(0.1, Math.pow(2, -(midtones.g - 128) / 64));
  const exponentB = Math.max(0.1, Math.pow(2, -(midtones.b - 128) / 64));

  const offsetR = (shadows.r - 128) / 256;
  const offsetG = (shadows.g - 128) / 256;
  const offsetB = (shadows.b - 128) / 256;

  useEffect(() => {
    if (videoRef.current) {
      onVideoRefCreated(videoRef.current);
    }
  }, [videoUrl]);

  // Synchronize play state and attributes to the split screen video when state changes
  useEffect(() => {
    const main = videoRef.current;
    const split = splitVideoRef.current;
    if (!main || !split) return;

    split.loop = isLooping;
    split.muted = isMuted;
    split.volume = isMuted ? 0 : volume;
    split.playbackRate = playbackRate;
  }, [isLooping, isMuted, volume, playbackRate, compareMode]);

  // Handle Play/Pause
  const togglePlay = () => {
    const video = videoRef.current;
    const splitVideo = splitVideoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => {
        setIsPlaying(true);
        if (splitVideo) {
          splitVideo.play().catch(() => {});
        }
      }).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
      if (splitVideo) {
        splitVideo.pause();
      }
    }
  };

  // Format time (mm:ss)
  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return "00:00";
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const mainTime = videoRef.current.currentTime;
      setCurrentTime(mainTime);

      // Sync the split screen video if it drifts
      if (splitVideoRef.current && Math.abs(splitVideoRef.current.currentTime - mainTime) > 0.08) {
        splitVideoRef.current.currentTime = mainTime;
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      const width = videoRef.current.videoWidth;
      const height = videoRef.current.videoHeight;
      if (width && height) {
        setIsPortrait(height > width);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    if (splitVideoRef.current) {
      splitVideoRef.current.currentTime = time;
    }
  };

  const stepFrame = (direction: "forward" | "backward") => {
    const video = videoRef.current;
    if (!video) return;

    if (!video.paused) {
      video.pause();
      setIsPlaying(false);
      if (splitVideoRef.current) {
        splitVideoRef.current.pause();
      }
    }

    const frameTime = 1 / FPS;
    let nextTime = direction === "forward" ? video.currentTime + frameTime : video.currentTime - frameTime;
    nextTime = Math.max(0, Math.min(duration, nextTime));

    video.currentTime = nextTime;
    setCurrentTime(nextTime);
    if (splitVideoRef.current) {
      splitVideoRef.current.currentTime = nextTime;
    }
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    if (splitVideoRef.current) {
      splitVideoRef.current.playbackRate = rate;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    setIsMuted(vol === 0);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      videoRef.current.muted = vol === 0;
    }
    if (splitVideoRef.current) {
      splitVideoRef.current.volume = vol;
      splitVideoRef.current.muted = vol === 0;
    }
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (videoRef.current) {
      videoRef.current.muted = nextMute;
      videoRef.current.volume = nextMute ? 0 : volume;
    }
    if (splitVideoRef.current) {
      splitVideoRef.current.muted = nextMute;
      splitVideoRef.current.volume = nextMute ? 0 : volume;
    }
  };

  const toggleLoop = () => {
    const nextLoop = !isLooping;
    setIsLooping(nextLoop);
    if (videoRef.current) {
      videoRef.current.loop = nextLoop;
    }
    if (splitVideoRef.current) {
      splitVideoRef.current.loop = nextLoop;
    }
  };

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen();
      }
    }
  };

  // Convert Color values to customized matrix styles
  // We can construct a dynamic SVG filter to implement Lift, Gamma, Gain, Temperature, Tint, and Vignette!
  const getFilterStyles = (graded: boolean) => {
    if (!graded || compareMode === "original") {
      return "none";
    }

    // Standard CSS Filters + SVG custom Lift, Gamma, Gain filter
    return `
      url(#lgg-filter)
      brightness(${brightness}%)
      contrast(${contrast}%)
      saturate(${saturation}%)
      hue-rotate(${hueRotate}deg)
      sepia(${sepia}%)
      grayscale(${grayscale}%)
    `;
  };

  // Calculate RGB Overlay styles for Temperature/Tint/Lift/Gamma/Gain simulated blending
  // Midtones: mix-blend-mode overlay
  // Temperature & Tint: mix-blend-mode color
  // Shadows & Highlights can be overlayed or color shifted
  const getOverlayStyles = () => {
    if (compareMode === "original") return null;

    // Temperature (Warm: orange, Cool: blue-cyan)
    let tempColor = "transparent";
    if (temperature > 0) {
      tempColor = `rgba(245, 158, 11, ${Math.min(0.35, (temperature / 100) * 0.75)})`;
    } else if (temperature < 0) {
      tempColor = `rgba(59, 130, 246, ${Math.min(0.35, (Math.abs(temperature) / 100) * 0.75)})`;
    }

    // Tint (Green vs Magenta/Purple)
    let tintColor = "transparent";
    if (tint > 0) {
      tintColor = `rgba(34, 197, 94, ${Math.min(0.25, (tint / 100) * 0.5)})`;
    } else if (tint < 0) {
      tintColor = `rgba(236, 72, 153, ${Math.min(0.25, (Math.abs(tint) / 100) * 0.5)})`;
    }

    // Shadows (Lift tinting, darkest values)
    const sR = shadows.r - 128;
    const sG = shadows.g - 128;
    const sB = shadows.b - 128;
    const shadowsColor = `rgba(${128 + sR * 2}, ${128 + sG * 2}, ${128 + sB * 2}, ${Math.max(0, Math.min(0.2, (Math.max(Math.abs(sR), Math.abs(sG), Math.abs(sB)) / 128) * 0.5))})`;

    // Midtones (Gamma tinting, middle grays)
    const mR = midtones.r - 128;
    const mG = midtones.g - 128;
    const mB = midtones.b - 128;
    const midtonesColor = `rgba(${128 + mR * 2}, ${128 + mG * 2}, ${128 + mB * 2}, ${Math.max(0, Math.min(0.25, (Math.max(Math.abs(mR), Math.abs(mG), Math.abs(mB)) / 128) * 0.6))})`;

    // Highlights (Gain tinting, bright values)
    const hR = highlights.r - 128;
    const hG = highlights.g - 128;
    const hB = highlights.b - 128;
    const highlightsColor = `rgba(${128 + hR * 2}, ${128 + hG * 2}, ${128 + hB * 2}, ${Math.max(0, Math.min(0.25, (Math.max(Math.abs(hR), Math.abs(hG), Math.abs(hB)) / 128) * 0.6))})`;

    return {
      tempColor,
      tintColor,
      shadowsColor,
      midtonesColor,
      highlightsColor
    };
  };

  const overlays = getOverlayStyles();

  // Handle Dragging Split position for Split Screen Compare Mode
  const handleSplitMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pos = ((clientX - rect.left) / rect.width) * 100;
    setSplitPosition(Math.max(0, Math.min(100, pos)));
  };

  const handleMouseDownSplit = () => {
    setIsDraggingSplit(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSplit) return;
      handleSplitMove(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingSplit) return;
      if (e.touches[0]) {
        handleSplitMove(e.touches[0].clientX);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingSplit(false);
    };

    if (isDraggingSplit) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDraggingSplit]);

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={containerRef}
        className={`relative w-full rounded-xl overflow-hidden bg-black shadow-2xl border border-gray-800/60 select-none group transition-all duration-500 ease-in-out ${
          isPortrait 
            ? "aspect-[9/16] max-w-[340px] mx-auto ring-1 ring-amber-500/20" 
            : "aspect-video w-full"
        }`}
      >
        {/* Split Screen Comparing Layout */}
        {compareMode === "split" ? (
          <div className="absolute inset-0 w-full h-full">
            {/* Graded Version (Left side of split slider) */}
            <div
              className="absolute inset-0 h-full overflow-hidden z-10 border-r border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
              style={{ width: `${splitPosition}%` }}
            >
              <video
                ref={splitVideoRef}
                src={videoUrl}
                className="absolute top-0 left-0 h-full w-full object-contain pointer-events-none"
                style={{
                  width: containerRef.current?.getBoundingClientRect().width,
                  maxWidth: "none",
                  filter: getFilterStyles(true)
                }}
              />
              {/* Dynamic Color Blend Overlays */}
              {overlays && (
                <>
                  <div
                    className="absolute inset-0 mix-blend-color pointer-events-none"
                    style={{ backgroundColor: overlays.tempColor }}
                  />
                  <div
                    className="absolute inset-0 mix-blend-color pointer-events-none"
                    style={{ backgroundColor: overlays.tintColor }}
                  />
                </>
              )}

              {/* Dynamic CSS Vignette */}
              {vignette > 0 && (
                <div
                  className="absolute inset-0 pointer-events-none transition-opacity"
                  style={{
                    background: `radial-gradient(circle, transparent ${100 - vignette * 0.6}%, rgba(0,0,0,${vignette / 100}) 100%)`
                  }}
                />
              )}

              {/* Badge */}
              <div className="absolute top-4 left-4 bg-amber-500/90 text-gray-950 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md uppercase tracking-wider">
                Graded View
              </div>
            </div>

            {/* Original Version (Right side of split slider) */}
            <div className="absolute inset-0 w-full h-full">
              <video
                ref={videoRef}
                src={videoUrl}
                loop={isLooping}
                muted={isMuted}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onClick={togglePlay}
                className="w-full h-full object-contain cursor-pointer"
                style={{ filter: getFilterStyles(false) }}
              />

              {/* Badge */}
              <div className="absolute top-4 right-4 bg-gray-800/95 text-gray-200 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md uppercase tracking-wider">
                Original
              </div>
            </div>

            {/* Split Screen Slider Bar */}
            <div
              className="absolute top-0 bottom-0 w-1 cursor-ew-resize bg-amber-500 z-20"
              style={{ left: `${splitPosition}%` }}
              onMouseDown={handleMouseDownSplit}
              onTouchStart={handleMouseDownSplit}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-amber-500 text-gray-950 flex items-center justify-center shadow-lg hover:scale-115 active:scale-95 transition-transform">
                <Grid className="w-4 h-4 rotate-45" />
              </div>
            </div>
          </div>
        ) : (
          /* Normal or Full Graded / Full Original Screen Mode */
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              src={videoUrl}
              loop={isLooping}
              muted={isMuted}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onClick={togglePlay}
              className="w-full h-full object-contain cursor-pointer"
              style={{ filter: getFilterStyles(compareMode === "graded") }}
            />

            {/* Simulated Color Grading Overlay Blend Layers */}
            {compareMode === "graded" && overlays && (
              <>
                <div
                  className="absolute inset-0 mix-blend-color pointer-events-none"
                  style={{ backgroundColor: overlays.tempColor }}
                />
                <div
                  className="absolute inset-0 mix-blend-color pointer-events-none"
                  style={{ backgroundColor: overlays.tintColor }}
                />
              </>
            )}

            {/* Dynamic CSS Vignette (only graded) */}
            {compareMode === "graded" && vignette > 0 && (
              <div
                className="absolute inset-0 pointer-events-none transition-opacity"
                style={{
                  background: `radial-gradient(circle, transparent ${100 - vignette * 0.6}%, rgba(0,0,0,${vignette / 100}) 100%)`
                }}
              />
            )}

            {/* Mode Indicator Badge */}
            <div className="absolute top-4 left-4 bg-gray-950/80 border border-gray-800 backdrop-blur-md text-gray-300 text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1.5 uppercase tracking-wider z-10">
              {compareMode === "graded" ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Graded Preview</span>
                </>
              ) : (
                <>
                  <Info className="w-3.5 h-3.5 text-gray-400" />
                  <span>Original Bypass</span>
                </>
              )}
            </div>

            {/* Dynamic Aspect Ratio/Format Badge */}
            <div className="absolute top-4 right-4 bg-gray-950/85 border border-amber-500/30 backdrop-blur-md text-gray-300 text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1.5 uppercase tracking-wider select-none z-10">
              {isPortrait ? (
                <>
                  <Smartphone className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span className="text-amber-400 font-bold">Shorts (9:16)</span>
                </>
              ) : (
                <>
                  <Tv className="w-3.5 h-3.5 text-blue-400" />
                  <span>Landscape (16:9)</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Hover Gradient Overlay for playback controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 flex flex-col gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30">
          
          {/* Custom video timeline track */}
          <div className="flex items-center gap-3 w-full">
            <span className="text-[11px] font-mono text-gray-300">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.01}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 accent-amber-500 h-1.5 bg-gray-700 rounded-lg cursor-pointer"
              id="video-timeline"
            />
            <span className="text-[11px] font-mono text-gray-300">{formatTime(duration)}</span>
          </div>

          <div className="flex justify-between items-center w-full">
            {/* Play, Pause, Loop Controls */}
            <div className="flex items-center gap-4">
              <button
                onClick={togglePlay}
                className="p-1.5 rounded-full bg-amber-500 text-gray-950 hover:bg-amber-400 hover:scale-105 active:scale-95 transition-all"
                id="play-pause-btn"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-gray-950" /> : <Play className="w-4 h-4 fill-gray-950" />}
              </button>

              <button
                onClick={toggleLoop}
                className={`p-1.5 rounded-md transition-all ${
                  isLooping ? "text-amber-400 bg-amber-500/10" : "text-gray-400 hover:text-white"
                }`}
                title="Toggle Loop"
                id="loop-toggle"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Volume Controller */}
              <div className="flex items-center gap-2 group/volume">
                <button
                  onClick={toggleMute}
                  className="text-gray-400 hover:text-white transition-all"
                  id="mute-btn"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 accent-amber-500 h-1 bg-gray-700 rounded-lg cursor-pointer transition-all opacity-40 group-hover/volume:opacity-100"
                  id="volume-slider"
                />
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2">
              {onCompareModeChange && (
                <button
                  onClick={() => onCompareModeChange(compareMode === "split" ? "graded" : "split")}
                  className={`p-1.5 rounded-md hover:bg-gray-800/40 transition-all flex items-center justify-center ${
                    compareMode === "split"
                      ? "text-amber-400 bg-amber-500/20 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]"
                      : "text-gray-400 hover:text-white border border-transparent"
                  }`}
                  title={compareMode === "split" ? "Switch to Graded View" : "Toggle Split Screen Side-by-Side"}
                  id="player-split-screen-toggle-btn"
                >
                  <Columns className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={toggleFullscreen}
                className="p-1.5 text-gray-400 hover:text-white rounded-md hover:bg-gray-800/40 transition-colors"
                title="Maximize Video"
                id="fullscreen-btn"
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ALWAYS VISIBLE DETAILED TIMELINE SCRUBBER PANEL */}
      <div className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-4 flex flex-col gap-3 shadow-inner" id="dedicated-timeline-scrubber">
        {/* Scrubber slider line */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono">
            <span className="bg-gray-950 px-2 py-0.5 rounded border border-gray-800 text-amber-500 font-bold">
              {formatTime(currentTime)}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">FRAME</span>
              <span className="text-white font-bold bg-gray-950 px-2 py-0.5 rounded border border-gray-800 text-[10px]">
                {Math.floor(currentTime * FPS)}
              </span>
              <span className="text-gray-600">/</span>
              <span className="text-gray-400">
                {Math.floor(duration * FPS)}
              </span>
            </div>
            <span className="bg-gray-950 px-2 py-0.5 rounded border border-gray-800 text-gray-400">
              {formatTime(duration)}
            </span>
          </div>

          <div className="relative group/scrubber pt-1">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.01}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-800 accent-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
              id="timeline-scrubber-slider"
            />
            {/* Tick marks on the timeline for aesthetic precision */}
            <div className="flex justify-between px-1 text-[8px] text-gray-600 font-mono mt-1 pointer-events-none select-none">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* Timeline controls: step backward/forward, play/pause, speed rate */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-gray-800/40">
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="flex items-center justify-center p-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-950 hover:scale-105 active:scale-95 transition-all cursor-pointer font-bold"
              title={isPlaying ? "Pause Video" : "Play Video"}
              id="scrubber-play-btn"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-gray-950" /> : <Play className="w-4 h-4 fill-gray-950" />}
            </button>

            {/* Step Frame Backwards */}
            <button
              onClick={() => stepFrame("backward")}
              className="flex items-center justify-center p-2 rounded-lg bg-gray-950 border border-gray-850 text-gray-300 hover:text-white hover:bg-gray-900 transition-all cursor-pointer gap-1"
              title="Step Back 1 Frame"
              id="scrubber-step-back-btn"
            >
              <ChevronLeft className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] font-mono pr-0.5">-1F</span>
            </button>

            {/* Step Frame Forwards */}
            <button
              onClick={() => stepFrame("forward")}
              className="flex items-center justify-center p-2 rounded-lg bg-gray-950 border border-gray-850 text-gray-300 hover:text-white hover:bg-gray-900 transition-all cursor-pointer gap-1"
              title="Step Forward 1 Frame"
              id="scrubber-step-forward-btn"
            >
              <span className="text-[10px] font-mono pl-0.5">+1F</span>
              <ChevronRight className="w-4 h-4 text-amber-500" />
            </button>
          </div>

          {/* Preset frame skip jumps */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Skip:</span>
            <button
              onClick={() => {
                const video = videoRef.current;
                if (video) {
                  const t = Math.max(0, video.currentTime - 5);
                  video.currentTime = t;
                  setCurrentTime(t);
                  if (splitVideoRef.current) splitVideoRef.current.currentTime = t;
                }
              }}
              className="bg-gray-950 border border-gray-800 hover:bg-gray-900 text-gray-300 hover:text-white px-2 py-1 rounded text-[10px] font-mono cursor-pointer transition-colors"
            >
              -5s
            </button>
            <button
              onClick={() => {
                const video = videoRef.current;
                if (video) {
                  const t = Math.min(duration, video.currentTime + 5);
                  video.currentTime = t;
                  setCurrentTime(t);
                  if (splitVideoRef.current) splitVideoRef.current.currentTime = t;
                }
              }}
              className="bg-gray-950 border border-gray-800 hover:bg-gray-900 text-gray-300 hover:text-white px-2 py-1 rounded text-[10px] font-mono cursor-pointer transition-colors"
            >
              +5s
            </button>
          </div>

          {/* Speed Selector Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Speed:</span>
            <div className="flex items-center gap-1 bg-gray-950 p-1 rounded-lg border border-gray-800 text-[10px] font-mono">
              {[0.25, 0.5, 1, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  onClick={() => handleSpeedChange(rate)}
                  className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                    playbackRate === rate
                      ? "bg-amber-500 text-gray-950 font-bold"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic hardware-accelerated SVG Color Grading Filter definition */}
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true" style={{ width: 0, height: 0, position: "absolute" }}>
        <filter id="lgg-filter" colorInterpolationFilters="sRGB">
          <feComponentTransfer>
            <feFuncR type="gamma" amplitude={amplitudeR} exponent={exponentR} offset={offsetR} />
            <feFuncG type="gamma" amplitude={amplitudeG} exponent={exponentG} offset={offsetG} />
            <feFuncB type="gamma" amplitude={amplitudeB} exponent={exponentB} offset={offsetB} />
          </feComponentTransfer>
        </filter>
      </svg>
    </div>
  );
}
