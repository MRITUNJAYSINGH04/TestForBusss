'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Camera,
  Maximize2,
  Minimize2,
  Radio,
  Eye,
  Crosshair,
  Compass,
  Thermometer,
  Wind,
  CloudSun,
  Shield,
  Layers,
  Sparkles,
  Download,
} from 'lucide-react';
import { CompanyNodeData } from '@/lib/nodes';
import { ThemeConfig } from '@/lib/theme';

interface LiveReconStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: CompanyNodeData | null;
  activeTheme?: ThemeConfig;
}

export default function LiveReconStreamModal({
  isOpen,
  onClose,
  company,
  activeTheme,
}: LiveReconStreamModalProps) {
  const [filterMode, setFilterMode] = useState<'RGB' | 'FLIR' | 'NVG' | 'CRT'>('FLIR');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zuluTime, setZuluTime] = useState('00:00:00Z');
  const [azimuth, setAzimuth] = useState(148);
  const [snapshotSuccess, setSnapshotSuccess] = useState(false);

  const accentColor = activeTheme?.primary || '#FFB800';

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      setZuluTime(
        `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}Z`
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isOpen || !company) return null;

  const handleSnapshot = () => {
    setSnapshotSuccess(true);
    setTimeout(() => setSnapshotSuccess(false), 2000);
  };

  const getFilterStyle = () => {
    switch (filterMode) {
      case 'FLIR':
        return 'hue-rotate-180 contrast-200 saturate-200 brightness-110 sepia invert';
      case 'NVG':
        return 'sepia saturate-200 hue-rotate-90 brightness-125 contrast-150';
      case 'CRT':
        return 'contrast-150 grayscale brightness-90';
      default:
        return 'contrast-125 saturate-125';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200 font-mono select-none">
      <div
        className={`w-full max-w-5xl rounded-2xl border shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          isFullscreen ? 'h-full max-h-screen rounded-none' : 'max-h-[90vh]'
        }`}
        style={{
          background: 'rgba(6, 10, 18, 0.96)',
          borderColor: `${accentColor}55`,
          boxShadow: `0 0 40px ${accentColor}25`,
        }}
      >
        {/* Header Telemetry */}
        <div className="p-3 sm:p-4 border-b border-white/10 flex items-center justify-between bg-black/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
              </span>
              <span className="text-xs font-bold text-red-500 uppercase tracking-widest animate-pulse">
                REC LIVE
              </span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>OSIRIS SATELLITE RECON // CAM-01</span>
                <span
                  className="px-1.5 py-0.2 rounded text-[9px] font-bold"
                  style={{
                    backgroundColor: `${accentColor}22`,
                    color: accentColor,
                    borderColor: `${accentColor}44`,
                  }}
                >
                  TARGET LOCKED
                </span>
              </div>
              <div className="text-[10px] text-zinc-400">
                {company.name} • {company.hq_city}, {company.hq_country}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-[10px] text-zinc-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
              <span className="font-bold text-emerald-400">FPS: 60</span>
              <span>•</span>
              <span>1080P HD</span>
              <span>•</span>
              <span className="text-zinc-300">ZULU: {zuluTime}</span>
            </div>

            <button
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Close Recon Feed"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Canvas Body Simulation */}
        <div className="relative flex-1 min-h-[380px] sm:min-h-[460px] bg-black overflow-hidden flex items-center justify-center">
          {/* Simulated Tactical Satellite / Drone Imagery Layer */}
          <div
            className={`absolute inset-0 w-full h-full bg-cover bg-center transition-all duration-300 ${getFilterStyle()}`}
            style={{
              backgroundImage: `radial-gradient(circle at center, rgba(30, 45, 75, 0.4) 0%, rgba(5, 8, 15, 0.95) 80%), url('https://images.unsplash.com/photo-1508873696983-2df5293cb395?auto=format&fit=crop&w=1600&q=80')`,
            }}
          />

          {/* Sci-Fi Grid Overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-25"
            style={{
              backgroundImage: `linear-gradient(to right, ${accentColor}22 1px, transparent 1px), linear-gradient(to bottom, ${accentColor}22 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
            }}
          />

          {/* CRT Scanline Simulation */}
          <div className="absolute inset-0 pointer-events-none scanlines opacity-40" />

          {/* Center Target Crosshair */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Outer Circular Azimuth Dial */}
            <div
              className="w-56 h-56 sm:w-72 sm:h-72 rounded-full border border-dashed flex items-center justify-center animate-spin-slow"
              style={{ borderColor: `${accentColor}44` }}
            >
              <div
                className="w-44 h-44 sm:w-56 sm:h-56 rounded-full border border-dotted"
                style={{ borderColor: `${accentColor}33` }}
              />
            </div>

            {/* Precision Crosshair Reticle */}
            <div className="absolute w-28 h-28 sm:w-36 sm:h-36 flex items-center justify-center">
              {/* Corner brackets */}
              <div
                className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2"
                style={{ borderColor: accentColor }}
              />
              <div
                className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2"
                style={{ borderColor: accentColor }}
              />
              <div
                className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2"
                style={{ borderColor: accentColor }}
              />
              <div
                className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2"
                style={{ borderColor: accentColor }}
              />

              {/* Center Dot & Range Ruler */}
              <div
                className="w-2 h-2 rounded-full animate-ping"
                style={{ background: accentColor }}
              />
              <span
                className="absolute -bottom-6 text-[10px] font-bold tracking-wider px-1.5 py-0.2 rounded bg-black/70 border"
                style={{ color: accentColor, borderColor: `${accentColor}66` }}
              >
                LOCK: 1,420m
              </span>
            </div>
          </div>

          {/* Top-Left Telemetry Overlay Box */}
          <div
            className="absolute top-4 left-4 p-3 rounded-xl border backdrop-blur-md text-[11px] space-y-1.5 max-w-xs pointer-events-none shadow-xl"
            style={{
              background: 'rgba(6, 10, 18, 0.85)',
              borderColor: `${accentColor}44`,
            }}
          >
            <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5" style={{ color: accentColor }} />
              TARGET TELEMETRY
            </div>
            <div className="text-white font-bold truncate">{company.name}</div>
            <div className="text-[10px] text-zinc-300 font-mono">
              LAT: {company.latitude.toFixed(5)}°N
            </div>
            <div className="text-[10px] text-zinc-300 font-mono">
              LON: {company.longitude.toFixed(5)}°E
            </div>
            <div className="text-[10px] text-emerald-400 font-bold">
              ALT: 450m MSL • AZ: {azimuth}° SE
            </div>
          </div>

          {/* Top-Right Environmental Telemetry Box */}
          <div
            className="absolute top-4 right-4 p-3 rounded-xl border backdrop-blur-md text-[10px] space-y-1.5 max-w-[200px] pointer-events-none shadow-xl hidden sm:block"
            style={{
              background: 'rgba(6, 10, 18, 0.85)',
              borderColor: `${accentColor}44`,
            }}
          >
            <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Wind className="w-3.5 h-3.5 text-cyan-400" />
              TACTICAL RADAR
            </div>
            <div className="flex items-center justify-between text-zinc-300">
              <span>TEMP:</span>
              <span className="font-bold text-white">28°C / 82°F</span>
            </div>
            <div className="flex items-center justify-between text-zinc-300">
              <span>WIND:</span>
              <span className="font-bold text-white">12 km/h NW</span>
            </div>
            <div className="flex items-center justify-between text-zinc-300">
              <span>VISIBILITY:</span>
              <span className="font-bold text-emerald-400">9.8 km (CLEAR)</span>
            </div>
            <div className="flex items-center justify-between text-zinc-300 pt-1 border-t border-white/10">
              <span>ACTIVITY:</span>
              <span className="font-bold text-emerald-400">NOMINAL</span>
            </div>
          </div>

          {/* Bottom Overlay Watermark */}
          <div className="absolute bottom-4 left-4 text-[10px] text-zinc-500 pointer-events-none flex items-center gap-2">
            <span>OSIRIS RECON SAT-GEO-4B</span>
            <span>•</span>
            <span>SECURE DOWNLINK</span>
          </div>
        </div>

        {/* Bottom Control Toolbar */}
        <div className="p-3 sm:p-4 border-t border-white/10 bg-black/60 flex flex-wrap items-center justify-between gap-3">
          {/* Optical Filter Mode Pills */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-400 uppercase font-bold mr-1">OPTICS:</span>
            {(['RGB', 'FLIR', 'NVG', 'CRT'] as const).map((mode) => {
              const isSelected = filterMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setFilterMode(mode)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                    isSelected
                      ? 'text-white shadow-md'
                      : 'bg-black/50 text-zinc-400 border-white/10 hover:text-white hover:bg-white/5'
                  }`}
                  style={{
                    backgroundColor: isSelected ? `${accentColor}33` : undefined,
                    borderColor: isSelected ? accentColor : undefined,
                    color: isSelected ? accentColor : undefined,
                  }}
                >
                  {mode === 'RGB' && 'OPTICAL RGB'}
                  {mode === 'FLIR' && '🔥 THERMAL FLIR'}
                  {mode === 'NVG' && '👁️ NIGHT NVG'}
                  {mode === 'CRT' && '📺 CRT MONITOR'}
                </button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSnapshot}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/20 bg-white/5 hover:bg-white/15 text-white transition-all flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{snapshotSuccess ? 'SNAPSHOT SAVED!' : 'SNAPSHOT'}</span>
            </button>

            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-black transition-all"
              style={{
                background: accentColor,
                boxShadow: `0 0 15px ${accentColor}66`,
              }}
            >
              DISMISS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
