'use client';

import React from 'react';
import {
  Radar,
  Radio,
  BarChart3,
  AlertTriangle,
  PenTool,
  Network,
  Search,
  Database,
  Palette,
  Compass,
  Camera,
  Sparkles,
} from 'lucide-react';
import { ThemeConfig } from '@/lib/theme';

interface RightActionToolbarProps {
  onToggleDirectory: () => void;
  isDirectoryOpen: boolean;
  onToggleStyleStudio: () => void;
  isStyleStudioOpen: boolean;
  onToggleSearchFocus: () => void;
  onToggleNewsPulse: () => void;
  isNewsTickerActive: boolean;
  onResetView: () => void;
  activeTheme: ThemeConfig;
  onOpenReconStream?: () => void;
  onOpenViper?: () => void;
  isViperOpen?: boolean;
  onOpenAiChatbox?: () => void;
  isAiChatboxOpen?: boolean;
}

export default function RightActionToolbar({
  onToggleDirectory,
  isDirectoryOpen,
  onToggleStyleStudio,
  isStyleStudioOpen,
  onToggleSearchFocus,
  onToggleNewsPulse,
  isNewsTickerActive,
  onResetView,
  activeTheme,
  onOpenReconStream,
  onOpenViper,
  isViperOpen = false,
  onOpenAiChatbox,
  isAiChatboxOpen = false,
}: RightActionToolbarProps) {
  const actions = [
    {
      id: 'ai_chatbox',
      label: 'Claude AI Chatbox & OSINT Assistant',
      icon: <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />,
      onClick: onOpenAiChatbox || onOpenViper || (() => {}),
      active: isAiChatboxOpen || isViperOpen,
    },
    {
      id: 'reset',
      label: 'Reset Orbital Flight (R)',
      icon: <Compass className="w-4 h-4" />,
      onClick: onResetView,
      active: false,
    },
    {
      id: 'cctv_recon',
      label: 'Live Recon Stream / CCTV Feed',
      icon: <Camera className="w-4 h-4 text-red-400" />,
      onClick: onOpenReconStream || (() => {}),
      active: false,
    },
    {
      id: 'style_studio',
      label: 'Style Studio (Live UI Tokens)',
      icon: <Palette className="w-4 h-4" />,
      onClick: onToggleStyleStudio,
      active: isStyleStudioOpen,
    },
    {
      id: 'search',
      label: 'Universal Geospatial Search (/)',
      icon: <Search className="w-4 h-4" />,
      onClick: onToggleSearchFocus,
      active: false,
    },
    {
      id: 'directory',
      label: 'Master Business Directory',
      icon: <Database className="w-4 h-4" />,
      onClick: onToggleDirectory,
      active: isDirectoryOpen,
    },
    {
      id: 'news_pulse',
      label: 'Real-Time News Telemetry Radar',
      icon: <Radio className="w-4 h-4" />,
      onClick: onToggleNewsPulse,
      active: isNewsTickerActive,
    },
    {
      id: 'analytics',
      label: 'Market & Gap Analysis',
      icon: <BarChart3 className="w-4 h-4" />,
      onClick: onToggleDirectory,
      active: false,
    },
  ];

  return (
    <div className="fixed top-20 right-3.5 z-20 flex flex-col gap-2 font-mono select-none pointer-events-auto">
      <div
        className="tactical-glass rounded-2xl p-1.5 flex flex-col gap-1.5 border border-white/10 shadow-2xl backdrop-blur-xl"
        style={{
          background: 'rgba(9, 12, 20, 0.88)',
          borderColor: `${activeTheme.primary}33`,
        }}
      >
        {actions.map((act) => {
          return (
            <div key={act.id} className="relative group">
              <button
                onClick={act.onClick}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  act.active
                    ? 'border text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-white/10 border border-transparent'
                }`}
                style={{
                  backgroundColor: act.active ? `${activeTheme.primary}25` : undefined,
                  borderColor: act.active ? `${activeTheme.primary}88` : undefined,
                  color: act.active ? activeTheme.primary : undefined,
                  boxShadow: act.active ? `0 0 12px ${activeTheme.primary}44` : undefined,
                }}
                title={act.label}
              >
                {act.icon}
              </button>

              {/* Tooltip to the left */}
              <div
                className="absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold whitespace-nowrap z-50 border border-white/15 backdrop-blur-md shadow-xl text-white pointer-events-none"
                style={{ background: 'rgba(10, 14, 22, 0.95)' }}
              >
                <span>{act.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
