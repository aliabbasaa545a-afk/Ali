import React, { useRef, useEffect, useState } from "react";
import { Activity } from "lucide-react";

interface HistogramScopeProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isActive: boolean; // toggle to save performance
}

export default function HistogramScope({ videoRef, isActive }: HistogramScopeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);
  const [showRGB, setShowRGB] = useState<"rgb" | "red" | "green" | "blue" | "luma">("rgb");

  useEffect(() => {
    // Create an offscreen canvas for fast sampling (120x80 is perfect, runs in <0.5ms)
    const offscreen = document.createElement("canvas");
    offscreen.width = 120;
    offscreen.height = 80;
    offscreenCanvasRef.current = offscreen;

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const offscreen = offscreenCanvasRef.current;

    if (!video || !canvas || !offscreen || !isActive) {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      return;
    }

    const ctx = canvas.getContext("2d");
    const octx = offscreen.getContext("2d", { willReadFrequently: true });
    if (!ctx || !octx) return;

    const ow = offscreen.width;
    const oh = offscreen.height;
    const cw = canvas.width;
    const ch = canvas.height;

    const drawHistogram = () => {
      if (video.paused && requestRef.current) {
        // Continue loop but throttle or wait if video isn't moving
        requestRef.current = requestAnimationFrame(drawHistogram);
        return;
      }

      try {
        // Draw video frame to tiny offscreen canvas
        octx.drawImage(video, 0, 0, ow, oh);
        const imgData = octx.getImageData(0, 0, ow, oh);
        const data = imgData.data;

        // Initialize 256 bins for Red, Green, Blue, and Luma channels
        const rBins = new Array(256).fill(0);
        const gBins = new Array(256).fill(0);
        const bBins = new Array(256).fill(0);
        const lBins = new Array(256).fill(0);

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // Rec. 709 luma formula
          const l = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);

          rBins[r]++;
          gBins[g]++;
          bBins[b]++;
          lBins[l]++;
        }

        // Clear canvas
        ctx.fillStyle = "#0b0f19";
        ctx.fillRect(0, 0, cw, ch);

        // Draw grid lines
        ctx.strokeStyle = "rgba(75, 85, 99, 0.2)";
        ctx.lineWidth = 1;
        
        // Horizontal grids (divisions of luminance)
        for (let i = 1; i < 4; i++) {
          const y = (ch / 4) * i;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(cw, y);
          ctx.stroke();
        }

        // Vertical grids (Blacks, Shadows, Midtones, Highlights, Whites)
        for (let i = 1; i < 4; i++) {
          const x = (cw / 4) * i;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, ch);
          ctx.stroke();
        }

        // Find max value across active channels to scale height
        let maxVal = 1;
        for (let i = 0; i < 256; i++) {
          if (showRGB === "rgb" || showRGB === "red") maxVal = Math.max(maxVal, rBins[i]);
          if (showRGB === "rgb" || showRGB === "green") maxVal = Math.max(maxVal, gBins[i]);
          if (showRGB === "rgb" || showRGB === "blue") maxVal = Math.max(maxVal, bBins[i]);
          if (showRGB === "luma") maxVal = Math.max(maxVal, lBins[i]);
        }

        // Soft smoothing multiplier to avoid spike peaks stretching too much
        maxVal = maxVal * 0.95;

        // Draw paths helper
        const drawChannel = (bins: number[], color: string, fillStyle: string) => {
          ctx.beginPath();
          ctx.moveTo(0, ch);

          for (let i = 0; i < 256; i++) {
            const x = (i / 255) * cw;
            const normalizedVal = bins[i] / maxVal;
            const y = ch - Math.min(1, normalizedVal) * (ch - 4); // clamp to canvas height
            ctx.lineTo(x, y);
          }

          ctx.lineTo(cw, ch);
          ctx.closePath();

          // Fill channel with semi-transparent paint
          ctx.fillStyle = fillStyle;
          ctx.fill();

          // Stroke outline
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        };

        // Render channels based on selection with composite operation for overlaps
        ctx.globalCompositeOperation = "screen";

        if (showRGB === "rgb" || showRGB === "red") {
          drawChannel(rBins, "#ef4444", "rgba(239, 68, 68, 0.15)");
        }
        if (showRGB === "rgb" || showRGB === "green") {
          drawChannel(gBins, "#22c55e", "rgba(34, 197, 94, 0.15)");
        }
        if (showRGB === "rgb" || showRGB === "blue") {
          drawChannel(bBins, "#3b82f6", "rgba(59, 130, 246, 0.15)");
        }
        if (showRGB === "luma") {
          drawChannel(lBins, "#f3f4f6", "rgba(243, 244, 246, 0.2)");
        }

        ctx.globalCompositeOperation = "source-over";

        // Label scope borders
        ctx.fillStyle = "rgba(156, 163, 175, 0.5)";
        ctx.font = "8px sans-serif";
        ctx.fillText("Shadows", 10, ch - 8);
        ctx.fillText("Midtones", cw / 2 - 20, ch - 8);
        ctx.fillText("Highlights", cw - 50, ch - 8);
      } catch (err) {
        // Suppress canvas draw errors when video is loading or swapping source
      }

      requestRef.current = requestAnimationFrame(drawHistogram);
    };

    // Begin render loop
    requestRef.current = requestAnimationFrame(drawHistogram);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    };
  }, [videoRef, isActive, showRGB]);

  return (
    <div className="bg-gray-950/80 p-4 rounded-xl border border-gray-800 shadow-md">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-200">Real-time RGB Histogram</h3>
            <span className="text-[10px] text-gray-500">Live color channel exposure and distribution</span>
          </div>
        </div>
        
        {/* Scope Channel Selector */}
        <div className="flex gap-1 bg-gray-900 p-0.5 rounded-lg border border-gray-800">
          <button
            onClick={() => setShowRGB("rgb")}
            className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-all ${
              showRGB === "rgb" ? "bg-gray-800 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
            }`}
            id="hist-rgb"
          >
            RGB
          </button>
          <button
            onClick={() => setShowRGB("red")}
            className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-all ${
              showRGB === "red" ? "bg-red-950 text-red-400 border border-red-900" : "text-gray-500 hover:text-red-400"
            }`}
            id="hist-red"
          >
            R
          </button>
          <button
            onClick={() => setShowRGB("green")}
            className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-all ${
              showRGB === "green" ? "bg-green-950 text-green-400 border border-green-900" : "text-gray-500 hover:text-green-400"
            }`}
            id="hist-green"
          >
            G
          </button>
          <button
            onClick={() => setShowRGB("blue")}
            className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-all ${
              showRGB === "blue" ? "bg-blue-950 text-blue-400 border border-blue-900" : "text-gray-500 hover:text-blue-400"
            }`}
            id="hist-blue"
          >
            B
          </button>
          <button
            onClick={() => setShowRGB("luma")}
            className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-all ${
              showRGB === "luma" ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
            }`}
            id="hist-luma"
          >
            Luma
          </button>
        </div>
      </div>

      <div className="relative border border-gray-800/80 rounded-lg overflow-hidden h-28 bg-[#0b0f19]">
        <canvas
          ref={canvasRef}
          width={300}
          height={112}
          className="w-full h-full block"
        />
        {!isActive && (
          <div className="absolute inset-0 bg-gray-950/90 flex flex-col items-center justify-center text-center p-3">
            <span className="text-[11px] text-gray-400">Histogram Paused</span>
            <span className="text-[9px] text-gray-500 mt-0.5">Activate playback or play standard source video to inspect</span>
          </div>
        )}
      </div>

      {/* Underlay Range labels */}
      <div className="flex justify-between px-1.5 mt-1.5 text-[9px] font-mono text-gray-500">
        <span>0 (Blacks)</span>
        <span>128 (Gray)</span>
        <span>255 (Whites)</span>
      </div>
    </div>
  );
}
