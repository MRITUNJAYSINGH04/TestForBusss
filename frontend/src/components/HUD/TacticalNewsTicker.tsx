'use client';

import React, { useState, useEffect } from 'react';
import {
  Radio,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Zap,
  TrendingUp,
  DollarSign,
  Building,
  Users,
  Briefcase,
  Crosshair,
} from 'lucide-react';
import { NewsPulseItem } from '@/lib/api';

interface TacticalNewsTickerProps {
  newsItems: NewsPulseItem[];
  onSelectNewsLocation?: (item: NewsPulseItem) => void;
  onRefreshNews?: () => void;
  isLoading?: boolean;
}

export default function TacticalNewsTicker({
  newsItems,
  onSelectNewsLocation,
  onRefreshNews,
  isLoading = false,
}: TacticalNewsTickerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedItem, setSelectedItem] = useState<NewsPulseItem | null>(null);

  const getSignalBadge = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'FUNDING':
      case 'FUNDING_ROUND':
        return {
          label: 'FUNDING',
          color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/40',
          icon: <DollarSign className="w-3 h-3 text-emerald-400" />,
        };
      case 'EXPANSION':
      case 'BUSINESS_EXPANSION':
        return {
          label: 'EXPANSION',
          color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/40',
          icon: <TrendingUp className="w-3 h-3 text-cyan-400" />,
        };
      case 'HIRING':
      case 'HIRING_PULSE':
        return {
          label: 'HIRING',
          color: 'text-amber-400 bg-amber-500/15 border-amber-500/40',
          icon: <Users className="w-3 h-3 text-amber-400" />,
        };
      case 'ACQUISITION':
      case 'M&A_ACTIVITY':
        return {
          label: 'M&A',
          color: 'text-purple-400 bg-purple-500/15 border-purple-500/40',
          icon: <Briefcase className="w-3 h-3 text-purple-400" />,
        };
      default:
        return {
          label: 'PULSE',
          color: 'text-tactical-cyan bg-tactical-cyan/15 border-tactical-cyan/40',
          icon: <Zap className="w-3 h-3 text-tactical-cyan" />,
        };
    }
  };

  if (!newsItems || newsItems.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-auto select-none">
      {/* Expanded News Feed Drawer */}
      {isExpanded && (
        <div
          className="w-full max-h-72 overflow-y-auto border-t border-tactical-border/80 backdrop-blur-xl shadow-2xl p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 animate-in slide-in-from-bottom duration-200"
          style={{ background: 'rgba(8, 12, 20, 0.96)' }}
        >
          {newsItems.map((item, idx) => {
            const badge = getSignalBadge(item.signal_type);
            return (
              <div
                key={item.id || idx}
                onClick={() => {
                  setSelectedItem(item);
                  if (onSelectNewsLocation) onSelectNewsLocation(item);
                }}
                className="group p-2.5 rounded border border-tactical-border/60 bg-white/[0.02] hover:bg-white/[0.06] hover:border-tactical-cyan/60 transition-all cursor-pointer flex flex-col justify-between gap-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${badge.color}`}
                  >
                    {badge.icon}
                    {badge.label}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">{item.city}</span>
                </div>
                <p className="text-xs font-medium text-zinc-200 line-clamp-2 group-hover:text-white leading-snug">
                  {item.title}
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] font-mono text-zinc-400">
                  <span className="truncate max-w-[120px]">{item.source_name || 'Source'}</span>
                  {item.funding_amount && (
                    <span className="text-emerald-400 font-bold">{item.funding_amount}</span>
                  )}
                  <span className="text-tactical-cyan group-hover:underline flex items-center gap-0.5">
                    <Crosshair className="w-2.5 h-2.5" /> LOCK
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Bottom Ticker Bar */}
      <div
        className="h-9 border-t border-tactical-border/70 flex items-center justify-between px-3 text-xs font-mono backdrop-blur-md"
        style={{ background: 'rgba(7, 10, 18, 0.94)' }}
      >
        {/* Left Live Indicator */}
        <div className="flex items-center gap-2 shrink-0 pr-3 border-r border-tactical-border/60">
          <div className="relative flex items-center justify-center w-3 h-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </div>
          <span className="text-[11px] font-bold tracking-wider text-emerald-400 uppercase">
            LIVE RADAR
          </span>
          <span className="px-1.5 py-0.2 text-[10px] rounded bg-emerald-500/20 text-emerald-300 font-mono">
            {newsItems.length} BEACONS
          </span>
        </div>

        {/* Center Marquee Content */}
        <div
          className="flex-1 overflow-hidden relative mx-2 h-full flex items-center"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div
            className={`flex items-center gap-6 whitespace-nowrap ${
              isPaused ? '' : 'animate-marquee'
            }`}
            style={{
              animationDuration: `${Math.max(35, newsItems.length * 6)}s`,
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
            }}
          >
            {newsItems.concat(newsItems).map((item, idx) => {
              const badge = getSignalBadge(item.signal_type);
              return (
                <div
                  key={`${item.id}-${idx}`}
                  onClick={() => {
                    if (onSelectNewsLocation) onSelectNewsLocation(item);
                  }}
                  className="inline-flex items-center gap-2 text-zinc-300 hover:text-white cursor-pointer transition-colors group"
                >
                  <span
                    className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.5 rounded border ${badge.color}`}
                  >
                    {badge.label}
                  </span>
                  {item.funding_amount && (
                    <span className="text-emerald-400 font-bold text-[11px]">
                      {item.funding_amount}
                    </span>
                  )}
                  <span className="text-[11px] group-hover:text-tactical-cyan group-hover:underline">
                    {item.title}
                  </span>
                  <span className="text-[10px] text-zinc-400">({item.city})</span>
                  <span className="text-zinc-600 font-bold">•</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 shrink-0 pl-3 border-l border-tactical-border/60">
          {onRefreshNews && (
            <button
              onClick={onRefreshNews}
              disabled={isLoading}
              title="Poll live RSS news feeds"
              className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-tactical-cyan' : ''}`} />
            </button>
          )}
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-tactical-cyan/10 border border-tactical-cyan/30 text-tactical-cyan hover:bg-tactical-cyan/20 transition-all font-bold"
          >
            {isExpanded ? (
              <>
                <ChevronDown className="w-3 h-3" /> HIDE RADAR
              </>
            ) : (
              <>
                <ChevronUp className="w-3 h-3" /> FEED RADAR
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
