import React, { useState, useRef, useEffect } from "react";
import {
  ColorGradingSettings,
  Preset,
  DEFAULT_PRESETS,
  SAMPLE_VIDEOS,
  INITIAL_SETTINGS
} from "../types";
import VideoPlayer from "./VideoPlayer";
import HistogramScope from "./HistogramScope";
import ColorWheel from "./ColorWheels";
import {
  Sparkles,
  Upload,
  Camera,
  Download,
  Sliders,
  Palette,
  Eye,
  Film,
  Play,
  Pause,
  RotateCcw,
  RefreshCw,
  TrendingUp,
  X,
  FileVideo,
  Flame,
  HelpCircle,
  FileJson
} from "lucide-react";

export default function ColorGradingDashboard() {
  // Video and Grading State
  const [videoUrl, setVideoUrl] = useState<string>(SAMPLE_VIDEOS[0].url);
  const [videoName, setVideoName] = useState<string>("Sample Cinematic Forest");
  const [activePreset, setActivePreset] = useState<string>("original");
  const [settings, setSettings] = useState<ColorGradingSettings>({ ...INITIAL_SETTINGS });
  const [compareMode, setCompareMode] = useState<"graded" | "split" | "original">("graded");
  const [activeTab, setActiveTab] = useState<"presets" | "primary" | "wheels" | "scopes">("presets");

  // Video Ref registration for the Histogram analyzer
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

  // AI Prompt and API States
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiExplanation, setAiExplanation] = useState<string>("");
  const [showAiGuide, setShowAiGuide] = useState<boolean>(true);

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Export Recorder State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);

  // Settings File Import/Export States and Refs
  const settingsInputRef = useRef<HTMLInputElement>(null);
  const [toastMessage, setToastMessage] = useState<string>("");

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(""), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleExportSettings = () => {
    try {
      const settingsPayload = {
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        videoName,
        settings
      };
      const dataStr = JSON.stringify(settingsPayload, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const safeName = videoName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
      const exportFileDefaultName = `grading_settings_${safeName}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      setToastMessage("Settings exported successfully!");
    } catch (err) {
      console.error(err);
      setToastMessage("Failed to export settings");
    }
  };

  const handleImportSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const payload = JSON.parse(event.target?.result as string);
        const imported = payload && payload.settings ? payload.settings : payload;

        if (typeof imported === 'object' && imported !== null) {
          setSettings({
            brightness: typeof imported.brightness === 'number' ? imported.brightness : 100,
            contrast: typeof imported.contrast === 'number' ? imported.contrast : 100,
            saturation: typeof imported.saturation === 'number' ? imported.saturation : 100,
            hueRotate: typeof imported.hueRotate === 'number' ? imported.hueRotate : 0,
            sepia: typeof imported.sepia === 'number' ? imported.sepia : 0,
            grayscale: typeof imported.grayscale === 'number' ? imported.grayscale : 0,
            temperature: typeof imported.temperature === 'number' ? imported.temperature : 0,
            tint: typeof imported.tint === 'number' ? imported.tint : 0,
            vignette: typeof imported.vignette === 'number' ? imported.vignette : 0,
            shadows: (imported.shadows && typeof imported.shadows.r === 'number') ? imported.shadows : { r: 128, g: 128, b: 128 },
            midtones: (imported.midtones && typeof imported.midtones.r === 'number') ? imported.midtones : { r: 128, g: 128, b: 128 },
            highlights: (imported.highlights && typeof imported.highlights.r === 'number') ? imported.highlights : { r: 128, g: 128, b: 128 }
          });
          setActivePreset("custom");
          setToastMessage("Settings imported successfully!");
        } else {
          setToastMessage("Invalid settings JSON structure.");
        }
      } catch (err) {
        setToastMessage("Error parsing JSON file.");
      }
    };
    reader.readAsText(file);
    // Reset file input so same file can be selected again
    e.target.value = "";
  };

  // Update a single slider value
  const updateSetting = (key: keyof ColorGradingSettings, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value
    }));
    setActivePreset("custom");
  };

  // Select a pre-configured Cinematic Look Preset
  const handleSelectPreset = (preset: Preset) => {
    setSettings({ ...preset.settings });
    setActivePreset(preset.id);
    setAiExplanation("");
  };

  // Handle Local Video Import
  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith("video/")) {
      alert("Please upload a valid video file.");
      return;
    }
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setVideoName(file.name);
    setActivePreset("original");
    setSettings({ ...INITIAL_SETTINGS });
    setAiExplanation("");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Reset all grading parameters back to normal
  const handleResetAll = () => {
    setSettings({ ...INITIAL_SETTINGS });
    setActivePreset("original");
    setAiExplanation("");
  };

  // Smart Look Generation via Gemini API
  const handleGenerateAiGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    setIsAiLoading(true);
    setAiExplanation("");
    try {
      // Capture current video frame if available for multimodal analysis
      let frameImage: string | undefined = undefined;
      if (videoElement) {
        try {
          const canvas = document.createElement("canvas");
          // Scale down for speed and lower payload size
          const maxDim = 640;
          let w = videoElement.videoWidth || 640;
          let h = videoElement.videoHeight || 360;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(videoElement, 0, 0, w, h);
            frameImage = canvas.toDataURL("image/jpeg", 0.75);
          }
        } catch (captureErr) {
          console.warn("Could not capture video frame due to CORS or structure. Proceeding with prompt-only analysis.", captureErr);
        }
      }

      const response = await fetch("/api/gemini/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt, frameImage })
      });
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Smoothly apply generated parameters
      setSettings({
        brightness: data.brightness ?? 100,
        contrast: data.contrast ?? 100,
        saturation: data.saturation ?? 100,
        hueRotate: data.hueRotate ?? 0,
        sepia: data.sepia ?? 0,
        grayscale: data.grayscale ?? 0,
        temperature: data.temperature ?? 0,
        tint: data.tint ?? 0,
        vignette: data.vignette ?? 0,
        shadows: data.shadows ?? { r: 128, g: 128, b: 128 },
        midtones: data.midtones ?? { r: 128, g: 128, b: 128 },
        highlights: data.highlights ?? { r: 128, g: 128, b: 128 }
      });
      setActivePreset("ai");
      setAiExplanation(data.explanation || "AI Look applied successfully!");
    } catch (err: any) {
      console.error(err);
      // Fallback fallback setting with helpful comment
      setAiExplanation("AI matching error. Direct grading offline mode active. Try adding API key or refine your prompt.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Auto-Grade: intelligent automatic correction based on current frame analysis
  const handleAutoGrade = async () => {
    setIsAiLoading(true);
    setAiExplanation("");
    try {
      // Capture current video frame if available for multimodal analysis
      let frameImage: string | undefined = undefined;
      if (videoElement) {
        try {
          const canvas = document.createElement("canvas");
          const maxDim = 640;
          let w = videoElement.videoWidth || 640;
          let h = videoElement.videoHeight || 360;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(videoElement, 0, 0, w, h);
            frameImage = canvas.toDataURL("image/jpeg", 0.75);
          }
        } catch (captureErr) {
          console.warn("Could not capture video frame for Auto-Grade. Proceeding with standard correction.", captureErr);
        }
      }

      const response = await fetch("/api/gemini/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: "Perform automatic professional color correction and optimization. Balance the exposure/brightness, contrast, saturation, temperature, tint, and highlights/shadows/midtones to make the video look perfectly graded, natural, and visually rich.", 
          frameImage 
        })
      });
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setSettings({
        brightness: data.brightness ?? 100,
        contrast: data.contrast ?? 100,
        saturation: data.saturation ?? 100,
        hueRotate: data.hueRotate ?? 0,
        sepia: data.sepia ?? 0,
        grayscale: data.grayscale ?? 0,
        temperature: data.temperature ?? 0,
        tint: data.tint ?? 0,
        vignette: data.vignette ?? 0,
        shadows: data.shadows ?? { r: 128, g: 128, b: 128 },
        midtones: data.midtones ?? { r: 128, g: 128, b: 128 },
        highlights: data.highlights ?? { r: 128, g: 128, b: 128 }
      });
      setActivePreset("ai-auto");
      setAiExplanation(data.explanation || "Auto-graded frame successfully based on Gemini frame analysis!");
      setToastMessage("Auto-grade applied successfully!");
    } catch (err: any) {
      console.error(err);
      // Fallback settings if offline/no API key
      setSettings({
        brightness: 105,
        contrast: 112,
        saturation: 115,
        hueRotate: 0,
        sepia: 0,
        grayscale: 0,
        temperature: 4,
        tint: -2,
        vignette: 10,
        shadows: { r: 122, g: 126, b: 130 },
        midtones: { r: 128, g: 128, b: 128 },
        highlights: { r: 132, g: 130, b: 126 }
      });
      setActivePreset("ai-auto");
      setAiExplanation("Applied offline Auto-Grade preset. (Tip: Enter your GEMINI_API_KEY in Settings > Secrets to unlock intelligent, real-time visual frame analysis!).");
      setToastMessage("Standard auto-grade applied!");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Capture current canvas frame as Snapshot PNG
  const handleTakeSnapshot = () => {
    if (!videoElement) return;

    // Create custom rendering canvas at original video resolution
    const canvas = document.createElement("canvas");
    canvas.width = videoElement.videoWidth || 1920;
    canvas.height = videoElement.videoHeight || 1080;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw video frame to high-res canvas
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    // Get pixel data to apply manual grading on snapshot if needed
    // In our player we use CSS filters, so we can apply them using 2D canvas context filter
    ctx.filter = `
      url(#lgg-filter)
      brightness(${settings.brightness}%)
      contrast(${settings.contrast}%)
      saturate(${settings.saturation}%)
      hue-rotate(${settings.hueRotate}deg)
      sepia(${settings.sepia}%)
      grayscale(${settings.grayscale}%)
    `;

    // Re-draw with filters
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    // Apply vignette overlay
    if (settings.vignette > 0) {
      const gradient = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        canvas.width * 0.35,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width * 0.75
      );
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(1, `rgba(0,0,0,${settings.vignette / 100})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Trigger local download
    const link = document.createElement("a");
    link.download = `graded_${videoName.replace(/\.[^/.]+$/, "")}_snapshot.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  // Export graded video using MediaRecorder capturing the canvas frame buffers in real-time
  const handleExportVideo = async () => {
    if (!videoElement) return;
    setIsExporting(true);
    setExportProgress(5);

    // Pause current playing stream
    videoElement.pause();
    videoElement.currentTime = 0;

    const canvas = document.createElement("canvas");
    canvas.width = videoElement.videoWidth || 1280;
    canvas.height = videoElement.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setIsExporting(false);
      return;
    }

    // Capture canvas stream at 30fps
    const canvasStream = canvas.captureStream(30);
    const mediaRecorder = new MediaRecorder(canvasStream, {
      mimeType: "video/webm;codecs=vp9"
    });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `graded_${videoName.replace(/\.[^/.]+$/, "")}.webm`;
      link.href = url;
      link.click();
      setIsExporting(false);
      setExportProgress(0);
    };

    mediaRecorder.start();

    // Loop through video frame-by-frame and render them sequentially
    const totalDuration = videoElement.duration || 5;
    let currentSampleTime = 0;
    const timeInterval = 0.05; // sampling step (approx 20fps render for perfect recording speed)

    const recordFrame = async () => {
      if (currentSampleTime >= totalDuration) {
        mediaRecorder.stop();
        return;
      }

      // Seek to sample time
      videoElement.currentTime = currentSampleTime;
      
      // Wait for seeked frame event
      await new Promise<void>((resolve) => {
        const onSeeked = () => {
          videoElement.removeEventListener("seeked", onSeeked);
          resolve();
        };
        videoElement.addEventListener("seeked", onSeeked);
      });

      // Clear Canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Apply Filter properties
      ctx.filter = `
        url(#lgg-filter)
        brightness(${settings.brightness}%)
        contrast(${settings.contrast}%)
        saturate(${settings.saturation}%)
        hue-rotate(${settings.hueRotate}deg)
        sepia(${settings.sepia}%)
        grayscale(${settings.grayscale}%)
      `;

      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      // Reset filters for secondary overlays
      ctx.filter = "none";

      // Draw Temperature, Tint and Wheels simulated shading overlays
      let tempOverlayColor = "transparent";
      if (settings.temperature > 0) {
        tempOverlayColor = `rgba(245, 158, 11, ${Math.min(0.25, (settings.temperature / 100) * 0.65)})`;
      } else if (settings.temperature < 0) {
        tempOverlayColor = `rgba(59, 130, 246, ${Math.min(0.25, (Math.abs(settings.temperature) / 100) * 0.65)})`;
      }
      if (tempOverlayColor !== "transparent") {
        ctx.fillStyle = tempOverlayColor;
        ctx.globalCompositeOperation = "color";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      let tintOverlayColor = "transparent";
      if (settings.tint > 0) {
        tintOverlayColor = `rgba(34, 197, 94, ${Math.min(0.18, (settings.tint / 100) * 0.45)})`;
      } else if (settings.tint < 0) {
        tintOverlayColor = `rgba(236, 72, 153, ${Math.min(0.18, (Math.abs(settings.tint) / 100) * 0.45)})`;
      }
      if (tintOverlayColor !== "transparent") {
        ctx.fillStyle = tintOverlayColor;
        ctx.globalCompositeOperation = "color";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Redraw overlays on source-over
      ctx.globalCompositeOperation = "source-over";

      // Vignette Overlay on Canvas
      if (settings.vignette > 0) {
        const gradient = ctx.createRadialGradient(
          canvas.width / 2,
          canvas.height / 2,
          canvas.width * 0.35,
          canvas.width / 2,
          canvas.height / 2,
          canvas.width * 0.75
        );
        gradient.addColorStop(0, "rgba(0,0,0,0)");
        gradient.addColorStop(1, `rgba(0,0,0,${settings.vignette / 100})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      currentSampleTime += timeInterval;
      setExportProgress(Math.round((currentSampleTime / totalDuration) * 100));
      
      // Call next frame
      setTimeout(recordFrame, 35);
    };

    // Trigger frame recording loop
    recordFrame();
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans relative"
    >
      {/* Full-screen drag and drop video importer overlay */}
      {isDragging && (
        <div className="fixed inset-0 bg-amber-500/10 backdrop-blur-md border-4 border-dashed border-amber-500/80 z-50 flex flex-col items-center justify-center p-8 pointer-events-none transition-all animate-pulse">
          <div className="bg-gray-950/95 border border-gray-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 text-center max-w-sm">
            <div className="p-4 bg-amber-500/10 rounded-full border border-amber-500/20 text-amber-500">
              <Upload className="w-10 h-10 animate-bounce" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Drop Your Video File Here</h3>
              <p className="text-xs text-gray-400 mt-1">Video import kar k grading shuru karein!</p>
              <span className="text-[10px] text-amber-500 font-mono mt-3 block">Supports MP4, WebM, QuickTime, AVI</span>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-gray-900 border border-amber-500/30 text-white text-xs px-4 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-2.5 backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}
      
      {/* App Header Bar */}
      <header className="border-b border-gray-900 bg-gray-950/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 text-gray-950 p-2 rounded-xl shadow-lg shadow-amber-500/10">
            <Film className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Color Grading Studio
              <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium px-2 py-0.5 rounded-full uppercase tracking-wider">
                Pro Suite
              </span>
            </h1>
            <p className="text-xs text-gray-400">Cinematic real-time video look designer & analyzer</p>
          </div>
        </div>

        {/* File actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-gray-200 hover:text-white text-xs font-semibold px-3 py-2 rounded-lg border border-gray-800 transition-all cursor-pointer"
            id="import-video-btn"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Video</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            className="hidden"
          />

          <button
            onClick={handleResetAll}
            className="flex items-center gap-1.5 bg-gray-950 hover:bg-gray-900 text-gray-400 hover:text-white text-xs font-semibold px-3 py-2 rounded-lg border border-gray-900 hover:border-gray-800 transition-all"
            id="reset-all-btn"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Look</span>
          </button>
        </div>
      </header>

      {/* Main Studio Body Grid */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1700px] w-full mx-auto">
        
        {/* Left Column (Video Screen, AI match, Compare controls) - Col 7 */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Active File Descriptor */}
          <div className="flex justify-between items-center bg-gray-900/40 px-4 py-2.5 rounded-xl border border-gray-900">
            <div className="flex items-center gap-2 min-w-0">
              <FileVideo className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span className="text-xs font-medium text-gray-300 truncate">{videoName}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-500 font-mono">Format: WebM/MP4</span>
            </div>
          </div>

          {/* Interactive Player Section */}
          <VideoPlayer
            videoUrl={videoUrl}
            onVideoRefCreated={(v) => setVideoElement(v)}
            brightness={settings.brightness}
            contrast={settings.contrast}
            saturation={settings.saturation}
            hueRotate={settings.hueRotate}
            sepia={settings.sepia}
            grayscale={settings.grayscale}
            temperature={settings.temperature}
            tint={settings.tint}
            vignette={settings.vignette}
            shadows={settings.shadows}
            midtones={settings.midtones}
            highlights={settings.highlights}
            compareMode={compareMode}
            onCompareModeChange={setCompareMode}
          />

          {/* Player Toolbar: Comparisons and Snapshots */}
          <div className="flex flex-wrap justify-between items-center gap-4 bg-gray-900/50 p-4 rounded-xl border border-gray-900">
            
            {/* Compare Selector Modes */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mr-1">Compare:</span>
              <div className="flex bg-gray-950 p-0.5 rounded-lg border border-gray-800 shadow-inner">
                <button
                  onClick={() => setCompareMode("graded")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                    compareMode === "graded"
                      ? "bg-amber-500 text-gray-950 shadow-md"
                      : "text-gray-400 hover:text-white"
                  }`}
                  id="compare-graded"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Graded Look</span>
                </button>
                <button
                  onClick={() => setCompareMode("split")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                    compareMode === "split"
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-md"
                      : "text-gray-400 hover:text-white"
                  }`}
                  id="compare-split"
                >
                  <Eye className="w-3 h-3" />
                  <span>Split Screen</span>
                </button>
                <button
                  onClick={() => setCompareMode("original")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                    compareMode === "original"
                      ? "bg-gray-800 text-white shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                  id="compare-original"
                >
                  <Sliders className="w-3 h-3" />
                  <span>Bypass Off</span>
                </button>
              </div>
            </div>

            {/* Snapshot & Export triggers */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportSettings}
                className="flex items-center gap-1.5 bg-gray-950 hover:bg-gray-900 text-gray-300 hover:text-white text-[11px] font-bold px-3 py-2 rounded-lg border border-gray-800 transition-all active:scale-95 cursor-pointer"
                title="Export current grading settings as JSON"
                id="export-settings-btn"
              >
                <FileJson className="w-3.5 h-3.5 text-amber-500" />
                <span>Export Settings</span>
              </button>

              <button
                onClick={() => settingsInputRef.current?.click()}
                className="flex items-center gap-1.5 bg-gray-950 hover:bg-gray-900 text-gray-300 hover:text-white text-[11px] font-bold px-3 py-2 rounded-lg border border-gray-800 transition-all active:scale-95 cursor-pointer"
                title="Import grading settings from a JSON file"
                id="import-settings-btn"
              >
                <Upload className="w-3.5 h-3.5 text-amber-500" />
                <span>Import Settings</span>
              </button>
              <input
                ref={settingsInputRef}
                type="file"
                accept=".json"
                onChange={handleImportSettings}
                className="hidden"
              />

              <button
                onClick={handleTakeSnapshot}
                className="flex items-center gap-1.5 bg-gray-950 hover:bg-gray-900 text-gray-300 hover:text-white text-[11px] font-bold px-3 py-2 rounded-lg border border-gray-800 transition-all active:scale-95 cursor-pointer"
                title="Save graded snapshot image"
                id="snapshot-btn"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Snap Frame</span>
              </button>
              
              <button
                onClick={handleExportVideo}
                disabled={isExporting}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-gray-950 text-[11px] font-bold px-3.5 py-2 rounded-lg shadow-md hover:shadow-amber-500/10 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                id="export-btn"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExporting ? `Exporting (${exportProgress}%)` : "Export Graded Video"}</span>
              </button>
            </div>
          </div>

          {/* AI Color Grading Look Assistant (Gemini) */}
          <div className="bg-gray-900/30 border border-gray-900 rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 pointer-events-none">
              <Sparkles className="w-16 h-16 text-amber-500/5 rotate-12" />
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-2.5">
                <div className="bg-gradient-to-tr from-amber-500 to-amber-600 text-gray-950 p-1.5 rounded-lg">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">AI Intelligent Look Match</h3>
                  <p className="text-[10px] text-gray-400">Describe any creative vibe or movie styling to let Gemini grade it</p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleAutoGrade}
                  disabled={isAiLoading}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-950 text-xs font-bold px-3 py-1.5 rounded-lg shadow-md hover:shadow-amber-500/10 transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                  id="ai-auto-grade-btn"
                  title="Automatically optimize contrast, brightness, saturation, and balance based on current frame analysis"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isAiLoading ? "animate-spin" : ""}`} />
                  <span>Auto-Grade Frame</span>
                </button>

                <button
                  onClick={() => setShowAiGuide(!showAiGuide)}
                  className="text-gray-500 hover:text-gray-300 p-1 rounded-md hover:bg-gray-950/60"
                  title="Toggle Prompt Suggestions"
                  id="ai-guide-toggle"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>
            </div>

            {showAiGuide && (
              <div className="bg-gray-950/60 p-3 rounded-lg border border-gray-800/40 text-[11px] text-gray-400 flex flex-col gap-2">
                <p className="font-semibold text-gray-300">💡 Roman Urdu / Urdu examples to try:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-mono text-[10px]">
                  <button
                    onClick={() => setAiPrompt("Mujhe is video ko purani 90s camcorder retro look daini hai")}
                    className="text-left p-1.5 rounded bg-gray-900/60 hover:bg-gray-900 hover:text-white transition-all text-amber-400/90 truncate"
                  >
                    "purani 90s retro look"
                  </button>
                  <button
                    onClick={() => setAiPrompt("Matrix movie jaisa ghunghat dark green and moody aesthetic look banaye")}
                    className="text-left p-1.5 rounded bg-gray-900/60 hover:bg-gray-900 hover:text-white transition-all text-amber-400/90 truncate"
                  >
                    "Matrix green aesthetic"
                  </button>
                  <button
                    onClick={() => setAiPrompt("Hollywood blockbuster style teal and orange cinematic color grading")}
                    className="text-left p-1.5 rounded bg-gray-900/60 hover:bg-gray-900 hover:text-white transition-all text-amber-400/90 truncate"
                  >
                    "Hollywood teal and orange"
                  </button>
                  <button
                    onClick={() => setAiPrompt("Guroob e aftab sunset golden lighting karny hain orange tone me")}
                    className="text-left p-1.5 rounded bg-gray-900/60 hover:bg-gray-900 hover:text-white transition-all text-amber-400/90 truncate"
                  >
                    "Guroob e aftab golden style"
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleGenerateAiGrade} className="flex gap-2">
              <input
                type="text"
                placeholder="Ask Gemini: e.g. 'Matrix movie green vibe' ya 'warm classic wedding style'..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="flex-1 bg-gray-950 border border-gray-800/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
                id="ai-prompt-input"
              />
              <button
                type="submit"
                disabled={isAiLoading || !aiPrompt.trim()}
                className="bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
                id="ai-grade-submit"
              >
                {isAiLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Match Style</span>
              </button>
            </form>

            {/* AI Grading Explanation output box */}
            {aiExplanation && (
              <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl flex flex-col gap-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" />
                  AI Colorist Commentary
                </span>
                <p className="text-xs text-gray-300 leading-relaxed font-sans">{aiExplanation}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Control Panels: presets, primary, wheels, scopes) - Col 5 */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Main Controls Tabs Bar */}
          <div className="flex bg-gray-900/80 p-1 rounded-xl border border-gray-900 shadow-inner">
            <button
              onClick={() => setActiveTab("presets")}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "presets"
                  ? "bg-gray-800 text-white shadow-md border border-gray-700/50"
                  : "text-gray-400 hover:text-gray-200"
              }`}
              id="tab-presets"
            >
              <Palette className="w-4 h-4 text-purple-400" />
              <span>Presets</span>
            </button>
            <button
              onClick={() => setActiveTab("primary")}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "primary"
                  ? "bg-gray-800 text-white shadow-md border border-gray-700/50"
                  : "text-gray-400 hover:text-gray-200"
              }`}
              id="tab-primary"
            >
              <Sliders className="w-4 h-4 text-sky-400" />
              <span>Primary</span>
            </button>
            <button
              onClick={() => setActiveTab("wheels")}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "wheels"
                  ? "bg-gray-800 text-white shadow-md border border-gray-700/50"
                  : "text-gray-400 hover:text-gray-200"
              }`}
              id="tab-wheels"
            >
              <TrendingUp className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Color Wheels</span>
            </button>
            <button
              onClick={() => setActiveTab("scopes")}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "scopes"
                  ? "bg-gray-800 text-white shadow-md border border-gray-700/50"
                  : "text-gray-400 hover:text-gray-200"
              }`}
              id="tab-scopes"
            >
              <FileVideo className="w-4 h-4 text-emerald-400" />
              <span>Scopes</span>
            </button>
          </div>

          {/* Tab View Container */}
          <div className="flex-1 bg-gray-900/30 border border-gray-900 rounded-2xl p-5 min-h-[480px] flex flex-col gap-6">
            
            {/* 1. Presets View */}
            {activeTab === "presets" && (
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400">Cinematic Look LUTs</h3>
                  <p className="text-[10px] text-gray-500">Apply one-click curated look profiles to establish grades</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto max-h-[500px] pr-1 scrollbar-thin">
                  {/* AI Auto-Grade Quick Action Card */}
                  <button
                    onClick={handleAutoGrade}
                    disabled={isAiLoading}
                    className={`text-left p-3.5 rounded-xl border transition-all relative overflow-hidden group/preset flex flex-col justify-between cursor-pointer ${
                      activePreset === "ai-auto"
                        ? "bg-amber-950/20 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                        : "bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/15"
                    }`}
                    id="ai-auto-grade-preset-card"
                  >
                    <div className="absolute top-0 right-0 p-1">
                      <Sparkles className="w-8 h-8 text-amber-500/10" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Sparkles className={`w-3.5 h-3.5 text-amber-400 ${isAiLoading ? "animate-spin" : ""}`} />
                        <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider">AI Auto-Grade</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-sans mt-0.5 block">Automatic Color Correction</span>
                      <span className="text-[9.5px] text-gray-400 block leading-relaxed mt-1.5">
                        Let Gemini analyze the current frame and optimize brightness, contrast, saturation, and overall color balance.
                      </span>
                    </div>
                  </button>

                  {DEFAULT_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPreset(p)}
                      className={`text-left p-3.5 rounded-xl border transition-all relative overflow-hidden group/preset ${
                        activePreset === p.id
                          ? "bg-purple-950/20 border-purple-500/80 shadow-[0_0_12px_rgba(168,85,247,0.15)]"
                          : "bg-gray-900/40 border-gray-800 hover:border-gray-700 hover:bg-gray-900/80"
                      }`}
                      id={`preset-btn-${p.id}`}
                    >
                      {activePreset === p.id && (
                        <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-purple-500 rounded-bl-lg flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        </div>
                      )}
                      
                      <span className="text-xs font-bold block text-gray-200 group-hover/preset:text-white">{p.name}</span>
                      <span className="text-[10px] text-purple-400/90 font-medium font-sans mt-0.5 block">{p.descriptionUrdu}</span>
                      <span className="text-[9.5px] text-gray-500 block leading-relaxed mt-1.5">{p.description}</span>
                    </button>
                  ))}
                </div>

                {/* Built-in high-res video source selector */}
                <div className="border-t border-gray-800/80 pt-4 mt-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block mb-2">Change Demo Video Source:</span>
                  <div className="flex flex-col gap-2">
                    {SAMPLE_VIDEOS.map((sv) => (
                      <button
                        key={sv.id}
                        onClick={() => {
                          setVideoUrl(sv.url);
                          setVideoName(sv.name);
                        }}
                        className={`flex items-center gap-3 p-2 rounded-lg border transition-all text-left ${
                          videoUrl === sv.url
                            ? "bg-gray-800 border-gray-700 text-white"
                            : "bg-gray-950/40 border-gray-900 hover:bg-gray-900 hover:text-white text-gray-400"
                        }`}
                        id={`src-btn-${sv.id}`}
                      >
                        <img
                          src={sv.poster}
                          alt={sv.name}
                          className="w-12 h-8 object-cover rounded"
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold block truncate">{sv.name} ({sv.nameUrdu})</span>
                          <span className="text-[9.5px] text-gray-500 block truncate">{sv.vibe}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. Primary Corrections View */}
            {activeTab === "primary" && (
              <div className="flex flex-col gap-5 overflow-y-auto max-h-[550px] pr-1">
                
                {/* Tone panel */}
                <div className="flex flex-col gap-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 border-b border-gray-800/80 pb-1.5 block">Exposure & Contrast</span>
                  
                  {/* Slider: Brightness */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-gray-300">Exposure / Brightness</span>
                      <span className="text-sky-400 font-mono">{settings.brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={150}
                      step={1}
                      value={settings.brightness}
                      onChange={(e) => updateSetting("brightness", parseInt(e.target.value))}
                      className="accent-sky-500 h-1.5 bg-gray-950 rounded-lg cursor-pointer"
                      id="slide-brightness"
                    />
                  </div>

                  {/* Slider: Contrast */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-gray-300">Contrast</span>
                      <span className="text-sky-400 font-mono">{settings.contrast}%</span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={150}
                      step={1}
                      value={settings.contrast}
                      onChange={(e) => updateSetting("contrast", parseInt(e.target.value))}
                      className="accent-sky-500 h-1.5 bg-gray-950 rounded-lg cursor-pointer"
                      id="slide-contrast"
                    />
                  </div>
                </div>

                {/* White Balance panel */}
                <div className="flex flex-col gap-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 border-b border-gray-800/80 pb-1.5 block">White Balance & Color</span>
                  
                  {/* Slider: Temperature */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-gray-300">Color Temperature</span>
                      <span className={`font-mono text-xs ${settings.temperature > 0 ? "text-amber-400" : settings.temperature < 0 ? "text-blue-400" : "text-sky-400"}`}>
                        {settings.temperature > 0 ? `+${settings.temperature} (Warm)` : settings.temperature < 0 ? `${settings.temperature} (Cool)` : "0"}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-50}
                      max={50}
                      step={1}
                      value={settings.temperature}
                      onChange={(e) => updateSetting("temperature", parseInt(e.target.value))}
                      className="accent-amber-500 h-1.5 bg-gradient-to-r from-blue-600 via-gray-700 to-amber-500 rounded-lg cursor-pointer"
                      id="slide-temp"
                    />
                  </div>

                  {/* Slider: Tint */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-gray-300">Color Tint (Green / Magenta)</span>
                      <span className={`font-mono text-xs ${settings.tint > 0 ? "text-emerald-400" : settings.tint < 0 ? "text-pink-400" : "text-sky-400"}`}>
                        {settings.tint > 0 ? `+${settings.tint} (Green)` : settings.tint < 0 ? `${settings.tint} (Magenta)` : "0"}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-50}
                      max={50}
                      step={1}
                      value={settings.tint}
                      onChange={(e) => updateSetting("tint", parseInt(e.target.value))}
                      className="accent-pink-500 h-1.5 bg-gradient-to-r from-pink-500 via-gray-700 to-emerald-500 rounded-lg cursor-pointer"
                      id="slide-tint"
                    />
                  </div>
                </div>

                {/* Saturation panel */}
                <div className="flex flex-col gap-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 border-b border-gray-800/80 pb-1.5 block">Vibrancy & Art Filters</span>
                  
                  {/* Slider: Saturation */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-gray-300">Color Saturation</span>
                      <span className="text-sky-400 font-mono">{settings.saturation}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={200}
                      step={1}
                      value={settings.saturation}
                      onChange={(e) => updateSetting("saturation", parseInt(e.target.value))}
                      className="accent-sky-500 h-1.5 bg-gray-950 rounded-lg cursor-pointer"
                      id="slide-saturate"
                    />
                  </div>

                  {/* Slider: Vignette */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-gray-300">Vignette Shading</span>
                      <span className="text-sky-400 font-mono">{settings.vignette}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={settings.vignette}
                      onChange={(e) => updateSetting("vignette", parseInt(e.target.value))}
                      className="accent-sky-500 h-1.5 bg-gray-950 rounded-lg cursor-pointer"
                      id="slide-vignette"
                    />
                  </div>

                  {/* Slider: Sepia */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-gray-300">Sepia / Vintage Film Tint</span>
                      <span className="text-sky-400 font-mono">{settings.sepia}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={settings.sepia}
                      onChange={(e) => updateSetting("sepia", parseInt(e.target.value))}
                      className="accent-sky-500 h-1.5 bg-gray-950 rounded-lg cursor-pointer"
                      id="slide-sepia"
                    />
                  </div>

                  {/* Slider: Hue Rotation */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-gray-300">Hue Color Rotation Shift</span>
                      <span className="text-sky-400 font-mono">{settings.hueRotate}°</span>
                    </div>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      step={1}
                      value={settings.hueRotate}
                      onChange={(e) => updateSetting("hueRotate", parseInt(e.target.value))}
                      className="accent-sky-500 h-1.5 bg-gray-950 rounded-lg cursor-pointer"
                      id="slide-huerotate"
                    />
                  </div>
                </div>

              </div>
            )}

            {/* 3. Color Wheels View (Lift, Gamma, Gain) */}
            {activeTab === "wheels" && (
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">3-Way Color Wheels</h3>
                  <p className="text-[10px] text-gray-500">Fine-tune distinct tints for Shadows, Midtones, and Highlights</p>
                </div>

                <div className="flex flex-col gap-4 overflow-y-auto max-h-[500px] pr-1">
                  <ColorWheel
                    label="Lift (Shadows)"
                    labelUrdu="Parchiyan / Kalay rang ki shades"
                    value={settings.shadows}
                    onChange={(val) => updateSetting("shadows", val)}
                  />
                  <ColorWheel
                    label="Gamma (Midtones)"
                    labelUrdu="Darmyani Rang / Skin tones"
                    value={settings.midtones}
                    onChange={(val) => updateSetting("midtones", val)}
                  />
                  <ColorWheel
                    label="Gain (Highlights)"
                    labelUrdu="Roshni / Safaid rang ki chamak"
                    value={settings.highlights}
                    onChange={(val) => updateSetting("highlights", val)}
                  />
                </div>
              </div>
            )}

            {/* 4. Scopes (Live Histogram) View */}
            {activeTab === "scopes" && (
              <div className="flex flex-col gap-4">
                <HistogramScope
                  videoRef={{ current: videoElement }}
                  isActive={videoElement ? !videoElement.paused : false}
                />

                {/* Grading explanation/tips helper box */}
                <div className="bg-gray-950/60 p-4 rounded-xl border border-gray-800/60 text-xs text-gray-400 flex flex-col gap-2">
                  <span className="font-bold text-gray-300 uppercase tracking-wider text-[10px] text-emerald-400">💡 Color Grading Pro-Tips:</span>
                  <ul className="list-disc list-inside space-y-1 text-[11px]">
                    <li><strong className="text-gray-300">Clipping check:</strong> Keep RGB waves inside the 0-255 boundaries on the histogram to prevent loss of detail.</li>
                    <li><strong className="text-gray-300">Teal & Orange check:</strong> Highlights are warm/yellow (Gain wheel top-right) and Shadows are cool/teal (Lift wheel bottom-right).</li>
                    <li><strong className="text-gray-300">Contrast check:</strong> Boosting contrast stretches the waveform, pulling blacks down and highlights up.</li>
                  </ul>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* Real-time Video Render exporting Overlay */}
      {isExporting && (
        <div className="fixed inset-0 bg-gray-950/90 flex flex-col items-center justify-center p-6 z-50 text-center backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl max-w-md w-full flex flex-col items-center gap-5">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-500 animate-pulse">
              <Film className="w-8 h-8 stroke-[1.5]" />
            </div>
            
            <div className="space-y-1">
              <h4 className="text-base font-bold text-white">Rendering Graded Video</h4>
              <p className="text-xs text-gray-400">Video frames are being processed sequentially with custom LUT filters</p>
            </div>

            {/* Visual progress loader */}
            <div className="w-full space-y-2">
              <div className="flex justify-between text-xs text-gray-400 font-mono">
                <span>Progress:</span>
                <span className="text-amber-400 font-bold">{exportProgress}%</span>
              </div>
              <div className="w-full bg-gray-950 h-2.5 rounded-full overflow-hidden border border-gray-850">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>

            <p className="text-[10px] text-gray-500 leading-normal">
              A WebM video file will automatically start downloading once the composition is completed. Please keep this tab active.
            </p>
          </div>
        </div>
      )}

      {/* Tiny Footer */}
      <footer className="border-t border-gray-950 py-4 text-center text-[10px] text-gray-600 bg-gray-950 font-mono">
        &copy; {new Date().getFullYear()} Video Color Grading Studio | Powered by Gemini 3.5 Flash
      </footer>
    </div>
  );
}
