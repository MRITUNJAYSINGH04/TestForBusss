'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  X,
  Navigation,
  Building2,
  Coffee,
  HeartPulse,
  Brain,
  Cpu,
  ShoppingBag,
  GraduationCap,
  ChevronRight,
  Star,
  Compass,
} from 'lucide-react';
import { CompanyNodeData } from '@/lib/nodes';
import { fastSearchApi } from '@/lib/api';
import { ThemeConfig } from '@/lib/theme';

interface GoogleMapsSearchBarProps {
  onSelectCompany: (company: CompanyNodeData) => void;
  onOpenDirectory?: () => void;
  onNewEntitiesDiscovered?: (entities: CompanyNodeData[]) => void;
  currentCameraCoords?: { lat: number; lon: number } | null;
  activeCityName?: string;
  activeTheme?: ThemeConfig;
  className?: string;
}

const CATEGORY_CHIPS = [
  { id: 'therapist', query: 'therapist near me', label: 'Therapists', icon: <Brain className="w-3 h-3 text-purple-400" /> },
  { id: 'clinic', query: 'clinics near me', label: 'Clinics & Care', icon: <HeartPulse className="w-3 h-3 text-rose-400" /> },
  { id: 'cafe', query: 'cafes near me', label: 'Cafes & Dining', icon: <Coffee className="w-3 h-3 text-amber-400" /> },
  { id: 'ai', query: 'AI startups', label: 'AI Startups', icon: <Cpu className="w-3 h-3 text-cyan-400" /> },
  { id: 'enterprise', query: 'enterprise software', label: 'Enterprise IT', icon: <Building2 className="w-3 h-3 text-emerald-400" /> },
  { id: 'retail', query: 'shopping malls', label: 'Malls & Retail', icon: <ShoppingBag className="w-3 h-3 text-pink-400" /> },
  { id: 'college', query: 'colleges and universities', label: 'Colleges', icon: <GraduationCap className="w-3 h-3 text-yellow-400" /> },
];

export default function GoogleMapsSearchBar({
  onSelectCompany,
  onOpenDirectory,
  onNewEntitiesDiscovered,
  currentCameraCoords,
  activeCityName = 'Pune',
  activeTheme,
  className = '',
}: GoogleMapsSearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [results, setResults] = useState<CompanyNodeData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const accentColor = activeTheme?.primary || '#FFB800';

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Perform search with live geocoding coordinates
  const executeSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim() || searchQuery.trim().length < 2) {
        setResults([]);
        return;
      }
      setIsLoading(true);
      try {
        const lat = currentCameraCoords?.lat;
        const lon = currentCameraCoords?.lon;
        const res = await fastSearchApi({
          query: searchQuery.trim(),
          city: activeCityName !== 'global' ? activeCityName : 'Pune',
          lat: lat,
          lon: lon,
          limit: 15,
        });

        if (res && res.results) {
          setResults(res.results);
          if (onNewEntitiesDiscovered && res.results.length > 0) {
            onNewEntitiesDiscovered(res.results);
          }
        }
      } catch (err) {
        console.warn('GoogleMapsSearchBar error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [currentCameraCoords, activeCityName, onNewEntitiesDiscovered]
  );

  // Debounced search when user types
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        executeSearch(query);
      } else {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, executeSearch]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (results.length > 0) {
        onSelectCompany(results[0]);
        setIsFocused(false);
      } else if (query.trim()) {
        executeSearch(query);
      }
      if (onOpenDirectory) onOpenDirectory();
    } else if (e.key === 'Escape') {
      setIsFocused(false);
    }
  };

  const handleChipClick = (chip: (typeof CATEGORY_CHIPS)[0]) => {
    setActiveChip(chip.id);
    setQuery(chip.query);
    executeSearch(chip.query);
    setIsFocused(true);
    if (onOpenDirectory) onOpenDirectory();
  };

  const handleResultClick = (company: CompanyNodeData) => {
    onSelectCompany(company);
    setIsFocused(false);
    if (onOpenDirectory) onOpenDirectory();
  };

  return (
    <div
      ref={containerRef}
      className={`absolute top-16 left-3 sm:left-4 z-20 w-[350px] sm:w-[410px] md:w-[440px] select-none ${className}`}
    >
      {/* Main Google Maps-Style Search Card */}
      <div
        className="rounded-2xl tactical-glass border shadow-2xl overflow-hidden backdrop-blur-xl transition-all duration-300"
        style={{
          background: 'rgba(9, 13, 22, 0.94)',
          borderColor: isFocused ? `${accentColor}88` : 'rgba(255, 255, 255, 0.12)',
          boxShadow: isFocused
            ? `0 0 20px ${accentColor}25, 0 16px 32px rgba(0, 0, 0, 0.6)`
            : '0 12px 28px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Top Search Input Row */}
        <div className="flex items-center px-3.5 py-2.5 gap-2.5">
          <button
            onClick={() => executeSearch(query)}
            className="p-1 rounded-lg text-tactical-textDim hover:text-tactical-textPrimary transition-colors"
            title="Execute Search"
          >
            <Search
              className="w-4 h-4 transition-colors"
              style={{ color: isFocused ? accentColor : undefined }}
            />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsFocused(true);
            }}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search here (e.g. 'therapist near me', 'cafes in Pune')..."
            className="flex-1 bg-transparent text-xs font-mono text-tactical-textPrimary placeholder:text-zinc-500 focus:outline-none tracking-tight"
          />

          {isLoading ? (
            <div className="w-3.5 h-3.5 border-2 border-zinc-600 border-t-tactical-cyan rounded-full animate-spin" />
          ) : query ? (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
                setActiveChip(null);
                inputRef.current?.focus();
              }}
              className="p-1 rounded-lg text-zinc-400 hover:text-white transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div
              className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-white/5 text-zinc-400 border border-white/10 flex items-center gap-1"
              title="Location geocoding active"
            >
              <Compass className="w-2.5 h-2.5 text-emerald-400 animate-spin-slow" />
              <span>LIVE GPS</span>
            </div>
          )}
        </div>

        {/* Quick Suggestion Category Chips Carousel */}
        <div className="px-3 pb-2.5 pt-0.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {CATEGORY_CHIPS.map((chip) => (
            <button
              key={chip.id}
              onClick={() => handleChipClick(chip)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-mono whitespace-nowrap transition-all flex items-center gap-1.5 border shrink-0 ${
                activeChip === chip.id
                  ? 'bg-white/15 text-white border-white/40 shadow-sm font-semibold'
                  : 'bg-white/5 border-white/10 text-zinc-400 hover:text-zinc-200 hover:bg-white/10'
              }`}
            >
              {chip.icon}
              <span>{chip.label}</span>
            </button>
          ))}
        </div>

        {/* Live Search Autocomplete Dropdown */}
        {isFocused && query.trim().length >= 2 && (
          <div className="border-t border-white/10 max-h-80 overflow-y-auto divide-y divide-white/5 bg-black/40">
            {results.length > 0 ? (
              results.map((co) => (
                <div
                  key={co.id}
                  onClick={() => handleResultClick(co)}
                  className="px-3.5 py-2.5 hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-zinc-400 group-hover:text-tactical-cyan transition-colors shrink-0">
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-mono font-bold text-zinc-200 group-hover:text-white transition-colors truncate">
                        {co.name}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-400 truncate flex items-center gap-1.5 mt-0.5">
                        <span className="truncate">{co.category || co.industry || 'Local Entity'}</span>
                        <span>•</span>
                        <span>{co.hq_city}</span>
                        {co.rating && (
                          <>
                            <span>•</span>
                            <span className="text-amber-400 flex items-center gap-0.5 font-bold">
                              <Star className="w-2.5 h-2.5 fill-amber-400" />
                              {co.rating}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {co.distanceKm !== undefined && co.distanceKm < 9000 && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-tactical-cyan/15 text-tactical-cyan border border-tactical-cyan/30 flex items-center gap-0.5 font-bold">
                        <Navigation className="w-2.5 h-2.5" />
                        {co.distanceKm < 1 ? `${Math.round(co.distanceKm * 1000)}m` : `${co.distanceKm.toFixed(1)}km`}
                      </span>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-tactical-cyan transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              ))
            ) : !isLoading ? (
              <div className="p-4 text-center text-xs font-mono text-zinc-400 space-y-1.5">
                <div>No local records for &quot;{query}&quot;</div>
                <div className="text-[10px] text-zinc-500">
                  Press Enter to trigger live OpenStreetMap reconnaissance in {activeCityName}.
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
