'use client';

import React from 'react';
import {
  Building2,
  Cpu,
  HeartPulse,
  Coffee,
  GraduationCap,
  Radio,
  SlidersHorizontal,
  Layers,
} from 'lucide-react';
import { ThemeConfig } from '@/lib/theme';

export interface LayerToggleState {
  enterprises: boolean;
  startups: boolean;
  healthcare: boolean;
  retail: boolean;
  education: boolean;
  newsSignals: boolean;
}

interface LeftLayerToolbarProps {
  layers: LayerToggleState;
  onToggleLayer: (layer: keyof LayerToggleState) => void;
  counts: {
    enterprises: number;
    startups: number;
    healthcare: number;
    retail: number;
    education: number;
    newsSignals: number;
  };
  activeTheme: ThemeConfig;
}

export default function LeftLayerToolbar({
  layers,
  onToggleLayer,
  counts,
  activeTheme,
}: LeftLayerToolbarProps) {
  const layerItems: Array<{
    key: keyof LayerToggleState;
    label: string;
    icon: React.ReactNode;
    count: number;
  }> = [
    {
      key: 'enterprises',
      label: 'Global Enterprise & MNC Nodes',
      icon: <Building2 className="w-4 h-4" />,
      count: counts.enterprises,
    },
    {
      key: 'startups',
      label: 'Tech Hubs & AI Startups',
      icon: <Cpu className="w-4 h-4" />,
      count: counts.startups,
    },
    {
      key: 'healthcare',
      label: 'Clinics, Hospitals & Therapists',
      icon: <HeartPulse className="w-4 h-4" />,
      count: counts.healthcare,
    },
    {
      key: 'retail',
      label: 'Retail, Malls & Cafes',
      icon: <Coffee className="w-4 h-4" />,
      count: counts.retail,
    },
    {
      key: 'education',
      label: 'Colleges & Universities',
      icon: <GraduationCap className="w-4 h-4" />,
      count: counts.education,
    },
    {
      key: 'newsSignals',
      label: 'Live News Signals & Funding Beacons',
      icon: <Radio className="w-4 h-4" />,
      count: counts.newsSignals,
    },
  ];

  return (
    <div className="fixed top-20 left-3.5 z-20 flex flex-col gap-2 font-mono select-none pointer-events-auto">
      <div
        className="tactical-glass rounded-2xl p-1.5 flex flex-col gap-1.5 border border-white/10 shadow-2xl backdrop-blur-xl"
        style={{
          background: 'rgba(9, 12, 20, 0.88)',
          borderColor: `${activeTheme.primary}33`,
        }}
      >
        {layerItems.map((item) => {
          const isActive = layers[item.key];
          return (
            <div key={item.key} className="relative group">
              <button
                onClick={() => onToggleLayer(item.key)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all relative ${
                  isActive
                    ? 'text-white border'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'
                }`}
                style={{
                  backgroundColor: isActive ? `${activeTheme.primary}25` : undefined,
                  borderColor: isActive ? `${activeTheme.primary}77` : undefined,
                  color: isActive ? activeTheme.primary : undefined,
                  boxShadow: isActive ? `0 0 12px ${activeTheme.primary}33` : undefined,
                }}
                title={`${item.label} (${item.count})`}
              >
                {item.icon}

                {/* Counter Badge */}
                {item.count > 0 && (
                  <span
                    className="absolute -top-1 -right-1 text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center text-black"
                    style={{
                      background: activeTheme.primary,
                      boxShadow: `0 0 8px ${activeTheme.primary}`,
                    }}
                  >
                    {item.count > 99 ? '99+' : item.count}
                  </span>
                )}
              </button>

              {/* Hover Tooltip */}
              <div
                className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold whitespace-nowrap z-50 border border-white/15 backdrop-blur-md shadow-xl text-white pointer-events-none"
                style={{ background: 'rgba(10, 14, 22, 0.95)' }}
              >
                <span>{item.label}</span>
                <span
                  className="px-1.5 py-0.2 rounded text-[9px]"
                  style={{
                    background: `${activeTheme.primary}22`,
                    color: activeTheme.primary,
                  }}
                >
                  {item.count}
                </span>
                <span className="text-[9px] text-zinc-400">
                  [{isActive ? 'ENABLED' : 'MUTED'}]
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
