'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Globe2,
  Sliders,
  Target,
  User,
  Radar,
  Eye,
  Sparkles,
  Search,
  Download,
  X,
  Building2,
  Layers,
  Palette,
  Navigation,
  ExternalLink,
  Terminal,
} from 'lucide-react';
import { CompanyNodeData } from '@/lib/nodes';
import { ThemeConfig } from '@/lib/theme';

interface TacticalHeaderProps {
  targetsCount: number;
  selectedRegion: string;
  onSelectRegion: (region: string) => void;
  selectedCompanySize: string;
  onSelectCompanySize: (size: string) => void;
  selectedIndustry: string;
  onSelectIndustry: (ind: string) => void;
  visualMode: 'normal' | 'surveillance' | 'retro';
  onSetVisualMode: (mode: 'normal' | 'surveillance' | 'retro') => void;
  onOpenProfile: () => void;
  onTriggerDiscovery: () => void;
  isDiscovering: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchResults?: CompanyNodeData[];
  onSelectSearchResult?: (company: CompanyNodeData) => void;
  onExportCsv?: () => void;
  onToggleDirectory?: () => void;
  isDirectoryOpen?: boolean;
  activeTheme?: ThemeConfig;
  onToggleStyleStudio?: () => void;
  isStyleStudioOpen?: boolean;
  activeLayersCount?: number;
  onToggleAiChatbox?: () => void;
  isAiChatboxOpen?: boolean;
  onToggleTerminal?: () => void;
  isTerminalOpen?: boolean;
}

export default function TacticalHeader({
  targetsCount,
  selectedRegion,
  onSelectRegion,
  selectedCompanySize,
  onSelectCompanySize,
  selectedIndustry,
  onSelectIndustry,
  visualMode,
  onSetVisualMode,
  onOpenProfile,
  onTriggerDiscovery,
  isDiscovering,
  searchQuery = '',
  onSearchChange,
  searchResults = [],
  onSelectSearchResult,
  onExportCsv,
  onToggleDirectory,
  isDirectoryOpen = false,
  activeTheme,
  onToggleStyleStudio,
  isStyleStudioOpen = false,
  activeLayersCount = 6,
  onToggleAiChatbox,
  isAiChatboxOpen = false,
  onToggleTerminal,
  isTerminalOpen = false,
}: TacticalHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [zuluTime, setZuluTime] = useState<string>('00:00:00Z');
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Live real-time ZULU (UTC) clock updating every 1000ms
  useEffect(() => {
    const updateZulu = () => {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      setZuluTime(
        `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}Z`
      );
    };
    updateZulu();
    const interval = setInterval(updateZulu, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchResults.length > 0 && onSelectSearchResult) {
      onSelectSearchResult(searchResults[0]);
      setIsSearchOpen(false);
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
    }
  };

  const accentColor = activeTheme?.primary || '#FFB800';

  return (
    <header
      className="fixed top-0 left-0 right-0 h-14 z-30 tactical-glass border-b px-3 sm:px-4 flex items-center justify-between gap-2 font-mono select-none"
      style={{
        background: 'rgba(6, 9, 16, 0.94)',
        borderColor: `${accentColor}33`,
      }}
    >
      {/* Brand: Horus / God's Eye Icon & Title */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="flex items-center gap-2">
          {/* Eye of Horus Vector Logo */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all cursor-pointer"
            onClick={onToggleStyleStudio}
            style={{
              backgroundColor: `${accentColor}18`,
              borderColor: `${accentColor}55`,
              color: accentColor,
              boxShadow: `0 0 12px ${accentColor}33`,
            }}
            title="Open Osiris Style Studio"
          >
            <svg
              viewBox="0 0 24 24"
              width={20}
              height={20}
              className="w-5 h-5 fill-current stroke-current stroke-1 shrink-0"
              style={{ width: '20px', height: '20px', maxWidth: '20px', maxHeight: '20px' }}
            >
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
              <circle cx="12" cy="12" r="1.5" />
            </svg>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1
                className="text-xs sm:text-sm font-black tracking-widest uppercase transition-colors"
                style={{ color: accentColor }}
              >
                GOD&apos;S EYE
              </h1>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-zinc-300 border border-white/15">
                OSIRIS V4.2
              </span>
            </div>
            <div className="text-[8px] sm:text-[9px] text-zinc-400 tracking-wider hidden sm:block">
              OPEN SOURCE BUSINESS INTELLIGENCE
            </div>
          </div>
        </div>

        <div className="hidden lg:block h-6 w-px bg-white/10 mx-1" />
      </div>

      {/* Center Osiris Telemetry Status Bar */}
      <div className="hidden xl:flex items-center gap-3 text-[11px] px-3 py-1 rounded-full bg-black/50 border border-white/10">
        <span className="font-bold flex items-center gap-1" style={{ color: accentColor }}>
          ZULU {zuluTime}
        </span>
        <span className="text-zinc-600 font-bold">•</span>
        <span className="flex items-center gap-1 font-bold text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          STATUS: LIVE
        </span>
        <span className="text-zinc-600 font-bold">•</span>
        <span className="text-zinc-400 font-medium">{activeLayersCount} LAYERS</span>
        <span className="text-zinc-600 font-bold">•</span>
        <span className="text-emerald-400 font-bold">{targetsCount.toLocaleString()} ENTITIES</span>
        <span className="text-zinc-600 font-bold">•</span>
        <span className="text-zinc-400">SOLAR: Kp1</span>
      </div>

      {/* Google Maps-Style Universal Search Bar */}
      <div ref={searchContainerRef} className="relative flex-1 max-w-xs sm:max-w-sm md:max-w-md mx-1">
        <div className="relative flex items-center">
          <Search
            className="w-3.5 h-3.5 absolute left-2.5 pointer-events-none"
            style={{ color: accentColor }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              onSearchChange?.(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search 'therapist near me', 'cafes in Pune'..."
            className="w-full bg-black/60 border border-white/15 focus:border-amber-400/80 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none transition-all shadow-inner"
            style={{
              borderColor: isSearchOpen ? `${accentColor}99` : undefined,
            }}
          />
          {searchQuery && (
            <button
              onClick={() => {
                onSearchChange?.('');
                setIsSearchOpen(false);
              }}
              className="absolute right-2 text-zinc-400 hover:text-white p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Universal Search Results Autocomplete Dropdown */}
        {isSearchOpen && searchQuery.trim() !== '' && (
          <div
            className="absolute top-full left-0 right-0 mt-1.5 tactical-glass border rounded-xl shadow-2xl max-h-72 overflow-y-auto z-50 py-1.5 backdrop-blur-xl"
            style={{
              background: 'rgba(8, 12, 20, 0.96)',
              borderColor: `${accentColor}55`,
            }}
          >
            {searchResults.length > 0 ? (
              searchResults.map((company) => (
                <button
                  key={company.id}
                  onClick={() => {
                    onSelectSearchResult?.(company);
                    setIsSearchOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-white/5 border-b border-white/5 last:border-none flex items-center justify-between gap-2 group transition-colors"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <Building2
                      className="w-4 h-4 shrink-0"
                      style={{ color: accentColor }}
                    />
                    <div className="truncate">
                      <div className="text-xs font-bold text-zinc-200 group-hover:text-white transition-colors truncate">
                        {company.name}
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate">
                        {company.hq_city}, {company.hq_country} • {company.industry || company.category || 'Commercial Entity'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {company.distanceKm !== undefined && company.distanceKm < 9000 && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-white/5 text-zinc-300 border border-white/10 flex items-center gap-0.5">
                        <Navigation className="w-2.5 h-2.5" />
                        {company.distanceKm < 1
                          ? `${Math.round(company.distanceKm * 1000)}m`
                          : `${company.distanceKm.toFixed(1)}km`}
                      </span>
                    )}
                    {company.lead_match_score && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                        {Math.round(company.lead_match_score)}%
                      </span>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="px-3 py-3 text-xs text-zinc-400 text-center">
                Press Enter to scan live OSM nodes for &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        )}
      </div>

      {/* Region Teleport & Filters */}
      <div className="hidden lg:flex items-center gap-1.5">
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/50 border border-white/10 hover:border-white/25 transition-colors text-xs">
          <Target className="w-3 h-3 text-zinc-400 shrink-0" />
          <select
            value={selectedRegion}
            onChange={(e) => onSelectRegion(e.target.value)}
            className="bg-transparent text-zinc-200 font-mono text-xs focus:outline-none cursor-pointer pr-1"
          >
            <option value="global" className="bg-[#0c0c14] text-white">🌐 GLOBAL</option>
            <option value="pune" className="bg-[#0c0c14] text-white">📍 PUNE</option>
            <option value="mumbai" className="bg-[#0c0c14] text-white">📍 MUMBAI</option>
            <option value="bengaluru" className="bg-[#0c0c14] text-white">📍 BENGALURU</option>
            <option value="new york" className="bg-[#0c0c14] text-white">📍 NEW YORK</option>
            <option value="san francisco" className="bg-[#0c0c14] text-white">📍 SAN FRANCISCO</option>
            <option value="london" className="bg-[#0c0c14] text-white">📍 LONDON</option>
            <option value="singapore" className="bg-[#0c0c14] text-white">📍 SINGAPORE</option>
          </select>
        </div>
      </div>

      {/* Right Controls: Style Studio & Export & Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Autonomous PLOT CLI Terminal Button */}
        {onToggleTerminal && (
          <button
            onClick={onToggleTerminal}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-all shrink-0 ${
              isTerminalOpen
                ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/80 shadow-lg shadow-emerald-500/30'
                : 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-400 border-emerald-500/50 shadow-sm shadow-emerald-500/20'
            }`}
            title="Open Autonomous PLOT CLI & Reconnaissance Terminal"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline font-mono">PLOT CLI</span>
          </button>
        )}

        {/* Claude AI Chatbox Button */}
        {onToggleAiChatbox && (
          <button
            onClick={onToggleAiChatbox}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-all shrink-0 ${
              isAiChatboxOpen
                ? 'bg-amber-500/25 text-amber-300 border-amber-500/60 shadow-lg shadow-amber-500/20'
                : 'bg-black/50 hover:bg-amber-500/15 text-amber-400 border-amber-500/30'
            }`}
            title="Open Claude AI Chatbox & VIPER Prospector"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-400" />
            <span className="hidden sm:inline">AI CHAT</span>
          </button>
        )}

        {/* Style Studio Button */}
        {onToggleStyleStudio && (
          <button
            onClick={onToggleStyleStudio}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-all shrink-0 ${
              isStyleStudioOpen
                ? 'bg-white/15 text-white border-white/40 shadow-lg'
                : 'bg-black/50 hover:bg-white/10 text-zinc-300 border-white/15'
            }`}
            style={{
              borderColor: isStyleStudioOpen ? accentColor : undefined,
              color: isStyleStudioOpen ? accentColor : undefined,
            }}
            title="Open Osiris Style Studio (Theme Tokens)"
          >
            <Palette className="w-3.5 h-3.5" />
            <span className="hidden md:inline">STYLE STUDIO</span>
          </button>
        )}

        {/* Export CSV Button */}
        {onExportCsv && (
          <button
            onClick={onExportCsv}
            className="px-2.5 py-1.5 rounded-lg text-xs border border-white/10 bg-black/40 text-zinc-300 hover:text-white hover:border-white/30 transition-colors flex items-center gap-1.5"
            title="Export Verified Leads to CSV"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">EXPORT</span>
          </button>
        )}

        {/* Master Directory Drawer Toggle */}
        {onToggleDirectory && (
          <button
            onClick={onToggleDirectory}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-all shrink-0 ${
              isDirectoryOpen
                ? 'bg-white/20 text-white border-white/40'
                : 'bg-black/50 hover:bg-white/10 text-zinc-300 border-white/15'
            }`}
            style={{
              borderColor: isDirectoryOpen ? accentColor : undefined,
              color: isDirectoryOpen ? accentColor : undefined,
            }}
            title="Toggle Master Directory & Search Results Panel"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">DIRECTORY</span>
          </button>
        )}
      </div>
    </header>
  );
}
