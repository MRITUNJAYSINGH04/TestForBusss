'use client';

import React, { useState } from 'react';
import {
  X,
  RotateCcw,
  Copy,
  Sliders,
  Sparkles,
  Eye,
  Layers,
  Compass,
  Check,
} from 'lucide-react';
import { ThemeConfig, THEME_PRESETS, ThemePreset } from '@/lib/theme';

interface StyleStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTheme: ThemeConfig;
  onSelectPreset: (preset: ThemePreset) => void;
  onUpdateTheme: (updated: Partial<ThemeConfig>) => void;
  showPanZoomPad: boolean;
  onTogglePanZoomPad: () => void;
  showScanlines: boolean;
  onToggleScanlines: () => void;
  visualMode: 'normal' | 'surveillance' | 'retro';
  onSetVisualMode: (mode: 'normal' | 'surveillance' | 'retro') => void;
}

export default function StyleStudioModal({
  isOpen,
  onClose,
  activeTheme,
  onSelectPreset,
  onUpdateTheme,
  showPanZoomPad,
  onTogglePanZoomPad,
  showScanlines,
  onToggleScanlines,
  visualMode,
  onSetVisualMode,
}: StyleStudioModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyTokens = () => {
    navigator.clipboard.writeText(JSON.stringify(activeTheme, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetDefault = () => {
    onSelectPreset('horus');
  };

  return (
    <div
      className="fixed top-16 left-4 z-40 w-80 sm:w-96 rounded-xl border border-tactical-border/80 tactical-glass shadow-2xl backdrop-blur-2xl flex flex-col font-mono select-none overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      style={{
        background: 'rgba(8, 11, 18, 0.94)',
        borderColor: `${activeTheme.primary}44`,
        boxShadow: `0 0 25px ${activeTheme.primary}22`,
      }}
    >
      {/* Header */}
      <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-black/40">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full animate-pulse"
              style={{ background: activeTheme.primary }}
            />
            <h2 className="text-xs font-bold tracking-widest uppercase text-white">
              STYLE STUDIO
            </h2>
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5 tracking-wider">
            LIVE UI TOKENS
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleCopyTokens}
            title="Copy theme JSON"
            className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleResetDefault}
            title="Reset to Horus Gold"
            className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-3.5 space-y-4 max-h-[75vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
        {/* Preset Selector */}
        <div>
          <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-2">
            PRESET
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {(Object.keys(THEME_PRESETS) as ThemePreset[]).map((key) => {
              const p = THEME_PRESETS[key];
              const isSelected = activeTheme.id === key;
              return (
                <button
                  key={key}
                  onClick={() => onSelectPreset(key)}
                  className={`px-2.5 py-1.5 rounded text-[11px] font-bold flex items-center gap-1.5 border transition-all ${
                    isSelected
                      ? 'bg-white/10 border-white/40 text-white shadow-sm'
                      : 'bg-black/40 border-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                  }`}
                  style={{
                    borderColor: isSelected ? p.primary : undefined,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: p.primary }}
                  />
                  <span className="truncate">{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Accent Colors */}
        <div className="space-y-2.5 pt-2 border-t border-white/5">
          <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
            ACCENT
          </div>

          {/* Primary Color Picker */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">PRIMARY</span>
            <div className="flex items-center gap-2">
              <span className="text-zinc-300 uppercase font-mono text-[11px]">
                {activeTheme.primary}
              </span>
              <input
                type="color"
                value={activeTheme.primary}
                onChange={(e) => onUpdateTheme({ primary: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer border border-white/20 bg-transparent"
              />
            </div>
          </div>

          {/* Secondary Color Picker */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">SECONDARY</span>
            <div className="flex items-center gap-2">
              <span className="text-zinc-300 uppercase font-mono text-[11px]">
                {activeTheme.secondary}
              </span>
              <input
                type="color"
                value={activeTheme.secondary}
                onChange={(e) => onUpdateTheme({ secondary: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer border border-white/20 bg-transparent"
              />
            </div>
          </div>

          {/* Glow Slider */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">GLOW</span>
              <span className="text-zinc-200 font-bold">{activeTheme.glowIntensity}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={activeTheme.glowIntensity}
              onChange={(e) => onUpdateTheme({ glowIntensity: Number(e.target.value) })}
              className="w-full h-1.5 bg-black/60 rounded-lg appearance-none cursor-pointer accent-amber-400"
              style={{ accentColor: activeTheme.primary }}
            />
          </div>
        </div>

        {/* Signals Palette */}
        <div className="space-y-2 pt-2 border-t border-white/5">
          <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
            SIGNAL
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between p-1.5 rounded bg-black/40 border border-white/5">
              <span className="text-[10px] text-zinc-400">CRITICAL</span>
              <span
                className="w-3 h-3 rounded"
                style={{ background: activeTheme.critical }}
              />
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-black/40 border border-white/5">
              <span className="text-[10px] text-zinc-400">WARNING</span>
              <span
                className="w-3 h-3 rounded"
                style={{ background: activeTheme.warning }}
              />
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-black/40 border border-white/5">
              <span className="text-[10px] text-zinc-400">NOMINAL</span>
              <span
                className="w-3 h-3 rounded"
                style={{ background: activeTheme.nominal }}
              />
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-black/40 border border-white/5">
              <span className="text-[10px] text-zinc-400">INFO</span>
              <span
                className="w-3 h-3 rounded"
                style={{ background: activeTheme.info }}
              />
            </div>
          </div>
        </div>

        {/* Map Controls & Shaders */}
        <div className="space-y-2 pt-2 border-t border-white/5">
          <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
            MAP CONTROLS
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">PAN / ZOOM PAD</span>
            <button
              onClick={onTogglePanZoomPad}
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                showPanZoomPad
                  ? 'bg-amber-400/20 text-amber-300 border-amber-400/50'
                  : 'bg-black/40 text-zinc-500 border-white/10'
              }`}
              style={{
                backgroundColor: showPanZoomPad ? `${activeTheme.primary}22` : undefined,
                borderColor: showPanZoomPad ? `${activeTheme.primary}88` : undefined,
                color: showPanZoomPad ? activeTheme.primary : undefined,
              }}
            >
              {showPanZoomPad ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">CRT SCANLINES</span>
            <button
              onClick={onToggleScanlines}
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                showScanlines
                  ? 'bg-amber-400/20 text-amber-300 border-amber-400/50'
                  : 'bg-black/40 text-zinc-500 border-white/10'
              }`}
              style={{
                backgroundColor: showScanlines ? `${activeTheme.primary}22` : undefined,
                borderColor: showScanlines ? `${activeTheme.primary}88` : undefined,
                color: showScanlines ? activeTheme.primary : undefined,
              }}
            >
              {showScanlines ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">SHADER MODE</span>
            <div className="flex items-center gap-1">
              {(['normal', 'surveillance', 'retro'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => onSetVisualMode(m)}
                  className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold border ${
                    visualMode === m
                      ? 'bg-white/20 text-white border-white/50'
                      : 'bg-black/40 text-zinc-500 border-white/10 hover:text-zinc-300'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
