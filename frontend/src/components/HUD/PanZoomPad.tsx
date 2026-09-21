'use client';

import React from 'react';
import {
  Plus,
  Minus,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Compass,
} from 'lucide-react';
import { ThemeConfig } from '@/lib/theme';

interface PanZoomPadProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onPanUp: () => void;
  onPanDown: () => void;
  onPanLeft: () => void;
  onPanRight: () => void;
  onResetView?: () => void;
  activeTheme: ThemeConfig;
  currentLocationName?: string;
}

export default function PanZoomPad({
  onZoomIn,
  onZoomOut,
  onPanUp,
  onPanDown,
  onPanLeft,
  onPanRight,
  onResetView,
  activeTheme,
  currentLocationName = 'ORBITAL THEATRE',
}: PanZoomPadProps) {
  const toggleFullscreen = () => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="fixed bottom-12 right-3.5 z-20 flex flex-col items-end gap-1 font-mono select-none pointer-events-auto">
      {/* D-Pad Glass Card */}
      <div
        className="tactical-glass rounded-2xl p-2 border shadow-2xl backdrop-blur-xl flex items-center gap-3"
        style={{
          background: 'rgba(8, 12, 20, 0.90)',
          borderColor: `${activeTheme.primary}44`,
          boxShadow: `0 0 20px ${activeTheme.primary}18`,
        }}
      >
        {/* Zoom Controls (+ / -) */}
        <div className="flex flex-col items-center gap-1 pr-2.5 border-r border-white/10">
          <button
            onClick={onZoomIn}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Zoom In (+)"
          >
            <Plus className="w-4 h-4" />
          </button>
          <div className="w-3 h-px bg-white/10" />
          <button
            onClick={onZoomOut}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Zoom Out (-)"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        {/* Pan Directional Arrows */}
        <div className="grid grid-cols-3 gap-1 w-20 h-20 items-center justify-items-center">
          <div />
          <button
            onClick={onPanUp}
            className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Pan Up"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <div />

          <button
            onClick={onPanLeft}
            className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Pan Left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={onResetView}
            className="w-6 h-6 rounded-full flex items-center justify-center transition-all border"
            style={{
              backgroundColor: `${activeTheme.primary}22`,
              borderColor: `${activeTheme.primary}55`,
              color: activeTheme.primary,
            }}
            title="Reset Global View (R)"
          >
            <Compass className="w-3 h-3" />
          </button>

          <button
            onClick={onPanRight}
            className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Pan Right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div />
          <button
            onClick={onPanDown}
            className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Pan Down"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <div />
        </div>
      </div>

      {/* Footer shortcut helper & status */}
      <div className="flex items-center gap-2 text-[10px] text-zinc-500 pr-1 mt-0.5">
        <button
          onClick={toggleFullscreen}
          className="hover:text-zinc-300 transition-colors underline decoration-zinc-700"
        >
          fullscreen
        </button>
        <span>•</span>
        <button
          onClick={onResetView}
          className="hover:text-zinc-300 transition-colors"
        >
          R reset view
        </button>
        <span>|</span>
        <span className="flex items-center gap-1 font-bold text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          ONLINE
        </span>
      </div>
    </div>
  );
}
