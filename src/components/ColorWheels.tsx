import React, { useRef, useEffect, useState } from "react";
import { ColorChannel } from "../types";
import { RotateCcw } from "lucide-react";

interface ColorWheelProps {
  label: string;
  labelUrdu?: string;
  value: ColorChannel;
  onChange: (value: ColorChannel) => void;
}

export default function ColorWheel({ label, labelUrdu, value, onChange }: ColorWheelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Convert current RGB offset to 2D coordinates (x, y) from -1 to 1 for handle positioning
  // Using reverse mapping:
  // x = (r - (g + b)/2) / 75
  // y = (b - g) * Math.sqrt(3)/2 / 75 (approximate color space layout)
  const getHandlePosition = () => {
    // Center is (128, 128, 128). Max offset is ~50.
    const rx = (value.r - 128) / 50;
    const gy = (value.g - 128) / 50;
    const bz = (value.b - 128) / 50;

    // Convert RGB offsets back to a visual 2D projection
    // Red is at angle 0 (right), Green is at 120deg (bottom-left), Blue is at 240deg (top-left)
    const x = rx - 0.5 * gy - 0.5 * bz;
    const y = 0.866 * gy - 0.866 * bz;

    // Constrain to unit circle
    const mag = Math.sqrt(x * x + y * y);
    if (mag > 0.9) {
      return { x: (x / mag) * 0.9, y: (y / mag) * 0.9 };
    }
    return { x, y };
  };

  const handlePosition = getHandlePosition();

  // Handle interaction and calculate RGB based on position relative to center
  const updatePosition = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    // Normalized coordinates from -1 to 1
    let dx = (clientX - cx) / (rect.width / 2);
    let dy = (clientY - cy) / (rect.height / 2);

    // Limit to circle boundary
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 0.9) {
      dx = (dx / distance) * 0.9;
      dy = (dy / distance) * 0.9;
    }

    // Map 2D coordinate to RGB offsets
    // Angle in radians
    const angle = Math.atan2(-dy, dx); // invert dy so up is positive
    const mag = Math.min(1, Math.sqrt(dx * dx + dy * dy));

    // Convert polar angle & magnitude to RGB offsets
    // Red is at 0 rad, Green is at 2*PI/3 rad, Blue is at 4*PI/3 rad
    const rOffset = Math.cos(angle) * mag * 50;
    const gOffset = Math.cos(angle - (2 * Math.PI) / 3) * mag * 50;
    const bOffset = Math.cos(angle - (4 * Math.PI) / 3) * mag * 50;

    onChange({
      r: Math.min(255, Math.max(0, Math.round(128 + rOffset))),
      g: Math.min(255, Math.max(0, Math.round(128 + gOffset))),
      b: Math.min(255, Math.max(0, Math.round(128 + bOffset)))
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    updatePosition(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    if (e.touches[0]) {
      updatePosition(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      updatePosition(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      if (e.touches[0]) {
        updatePosition(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
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
  }, [isDragging]);

  const handleReset = () => {
    onChange({ r: 128, g: 128, b: 128 });
  };

  return (
    <div className="flex flex-col items-center bg-gray-900/60 p-4 rounded-xl border border-gray-800/80 shadow-md">
      <div className="flex justify-between items-center w-full mb-3 px-1">
        <div>
          <span className="text-xs font-semibold tracking-wider uppercase text-gray-300 block">{label}</span>
          {labelUrdu && <span className="text-[10px] text-gray-500 font-sans block">{labelUrdu}</span>}
        </div>
        <button
          onClick={handleReset}
          className="p-1 text-gray-500 hover:text-white rounded-md hover:bg-gray-800 transition-colors"
          title="Reset"
          id={`reset-${label.toLowerCase()}`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Interactive Color Wheel Disk */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className="relative w-32 h-32 rounded-full cursor-crosshair overflow-hidden shadow-inner border-2 border-gray-800 bg-[conic-gradient(from_0deg,#ff0000,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff,#ff0000)]"
      >
        {/* Radial white-to-transparent overlay to make center white/neutral */}
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,1)_0%,rgba(255,255,255,0.7)_25%,rgba(255,255,255,0)_70%)] pointer-events-none" />
        
        {/* Dark subtle overlay for contrast */}
        <div className="absolute inset-0 bg-black/5 pointer-events-none" />

        {/* Outer Ring Shadow */}
        <div className="absolute inset-0 rounded-full shadow-[inset_0_4px_8px_rgba(0,0,0,0.4)] pointer-events-none" />

        {/* Center Crosshair lines */}
        <div className="absolute top-1/2 left-0 right-0 h-[0.5px] bg-gray-700/30 pointer-events-none" />
        <div className="absolute left-1/2 top-0 bottom-0 w-[0.5px] bg-gray-700/30 pointer-events-none" />

        {/* Floating cursor drag handle */}
        <div
          className="absolute w-3.5 h-3.5 -ml-1.75 -mt-1.75 rounded-full border-2 border-white bg-gray-950 shadow-[0_2px_4px_rgba(0,0,0,0.6)] pointer-events-none transition-transform duration-75"
          style={{
            left: `${50 + handlePosition.x * 50}%`,
            top: `${50 + handlePosition.y * 50}%`,
            transform: isDragging ? "scale(1.2)" : "scale(1)"
          }}
        />
      </div>

      {/* RGB readout */}
      <div className="flex gap-2.5 mt-3 text-[10px] font-mono text-gray-400 bg-black/40 px-2 py-0.5 rounded-full border border-gray-800/40">
        <span className="flex items-center gap-0.5">
          <span className="text-red-500 font-bold">R</span>
          <span>{value.r}</span>
        </span>
        <span className="flex items-center gap-0.5">
          <span className="text-green-500 font-bold">G</span>
          <span>{value.g}</span>
        </span>
        <span className="flex items-center gap-0.5">
          <span className="text-blue-500 font-bold">B</span>
          <span>{value.b}</span>
        </span>
      </div>
    </div>
  );
}
