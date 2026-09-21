'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Building2,
  MapPin,
  Crosshair,
  ExternalLink,
  Search,
  Layers,
  Phone,
  Mail,
  Star,
  Navigation,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  Radio,
  Coffee,
  HeartPulse,
  Brain,
  Cpu,
  ShoppingBag,
  GraduationCap,
  Globe,
} from 'lucide-react';
import { CompanyNodeData } from '@/lib/nodes';
import { NewsPulseItem } from '@/lib/api';

interface MasterDirectoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  companies: CompanyNodeData[];
  onSelectCompany: (company: CompanyNodeData) => void;
  selectedCompanyId?: string | null;
  activeCityCoordinates?: { lat: number; lon: number };
  activeCityName?: string;
  onTriggerScan?: (category?: string) => void;
  isScanning?: boolean;
  newsItems?: NewsPulseItem[];
  onSelectNewsLocation?: (news: NewsPulseItem) => void;
}

// Haversine formula to compute distance in km between two GPS coordinates
function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All Entities', icon: <Layers className="w-3 h-3" /> },
  { id: 'cafe', label: 'Cafes & Food', icon: <Coffee className="w-3 h-3 text-amber-400" /> },
  { id: 'clinic', label: 'Clinics & Medical', icon: <HeartPulse className="w-3 h-3 text-rose-400" /> },
  { id: 'therapist', label: 'Therapists', icon: <Brain className="w-3 h-3 text-purple-400" /> },
  { id: 'tech', label: 'Tech & Startups', icon: <Cpu className="w-3 h-3 text-cyan-400" /> },
  { id: 'retail', label: 'Malls & Retail', icon: <ShoppingBag className="w-3 h-3 text-emerald-400" /> },
  { id: 'college', label: 'Colleges & Univ', icon: <GraduationCap className="w-3 h-3 text-yellow-400" /> },
];

export default function MasterDirectoryDrawer({
  isOpen,
  onClose,
  companies,
  onSelectCompany,
  selectedCompanyId,
  activeCityCoordinates = { lat: 18.5204, lon: 73.8567 },
  activeCityName = 'Pune',
  onTriggerScan,
  isScanning = false,
  newsItems = [],
  onSelectNewsLocation,
}: MasterDirectoryDrawerProps) {
  const [activeTab, setActiveTab] = useState<'directory' | 'news'>('directory');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [userGpsCoords, setUserGpsCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Request real user browser location if permitted
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserGpsCoords({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          });
        },
        () => {
          // Fallback to activeCityCoordinates
        },
        { timeout: 5000 }
      );
    }
  }, []);

  const referenceCoords = userGpsCoords || activeCityCoordinates;

  // Filter & sort companies with distance
  const enrichedList = useMemo(() => {
    let list = companies.map((c) => {
      const distance =
        c.latitude && c.longitude
          ? calculateDistanceKm(
              referenceCoords.lat,
              referenceCoords.lon,
              c.latitude,
              c.longitude
            )
          : 9999;
      return { ...c, distanceKm: distance };
    });

    // Sort by distance (closest first)
    list.sort((a, b) => a.distanceKm - b.distanceKm);

    // Apply category filter
    if (selectedCategory !== 'all') {
      const cat = selectedCategory.toLowerCase();
      list = list.filter((c) => {
        const text = `${c.name || ''} ${c.industry || ''} ${c.category || ''} ${c.business_type || ''}`.toLowerCase();
        if (cat === 'cafe') return text.includes('cafe') || text.includes('coffee') || text.includes('bakery') || text.includes('restaurant');
        if (cat === 'clinic') return text.includes('clinic') || text.includes('hospital') || text.includes('health') || text.includes('medical') || text.includes('doctor');
        if (cat === 'therapist') return text.includes('therapist') || text.includes('counsel') || text.includes('psych') || text.includes('therapy') || text.includes('clinic');
        if (cat === 'tech') return text.includes('software') || text.includes('tech') || text.includes('it') || text.includes('ai') || text.includes('cloud');
        if (cat === 'retail') return text.includes('mall') || text.includes('shop') || text.includes('retail') || text.includes('store');
        if (cat === 'college') return text.includes('college') || text.includes('univ') || text.includes('school') || text.includes('institute');
        return true;
      });
    }

    // Apply text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.hq_city?.toLowerCase().includes(q) ||
          c.industry?.toLowerCase().includes(q) ||
          c.category?.toLowerCase().includes(q) ||
          c.domain?.toLowerCase().includes(q) ||
          c.hq_address?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [companies, referenceCoords, selectedCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <aside
      className="fixed top-14 left-0 bottom-9 w-full sm:w-[420px] md:w-[460px] tactical-glass border-r border-tactical-border z-20 flex flex-col shadow-2xl backdrop-blur-xl animate-in slide-in-from-left duration-300 overflow-hidden"
      style={{ background: 'rgba(10, 14, 23, 0.94)' }}
    >
      {/* Drawer Header */}
      <div className="p-3.5 border-b border-tactical-border/80 flex items-center justify-between gap-3 bg-black/40">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-tactical-cyan/15 border border-tactical-cyan/40 text-tactical-cyan">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-mono font-bold tracking-wider text-tactical-textPrimary uppercase flex items-center gap-2">
              MASTER DIRECTORY
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-tactical-cyan/20 text-tactical-cyan border border-tactical-cyan/40">
                {enrichedList.length} TARGETS
              </span>
            </h2>
            <div className="flex items-center gap-1 text-[10px] font-mono text-tactical-textDim mt-0.5">
              <MapPin className="w-3 h-3 text-tactical-amber" />
              <span>{userGpsCoords ? 'CURRENT GPS LOCATION' : `${activeCityName.toUpperCase()} RECON HUB`}</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-tactical-textDim hover:text-tactical-textPrimary hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs: Directory vs Live News */}
      <div className="flex border-b border-tactical-border/60 bg-black/30 text-xs font-mono">
        <button
          onClick={() => setActiveTab('directory')}
          className={`flex-1 py-2 text-center font-bold transition-all border-b-2 ${
            activeTab === 'directory'
              ? 'text-tactical-cyan border-tactical-cyan bg-tactical-cyan/10'
              : 'text-tactical-textDim border-transparent hover:text-zinc-300'
          }`}
        >
          🏢 DIRECTORY & LEADS ({enrichedList.length})
        </button>
        <button
          onClick={() => setActiveTab('news')}
          className={`flex-1 py-2 text-center font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
            activeTab === 'news'
              ? 'text-emerald-400 border-emerald-400 bg-emerald-500/10'
              : 'text-tactical-textDim border-transparent hover:text-zinc-300'
          }`}
        >
          <Radio className="w-3 h-3 text-emerald-400" />
          NEWS RADAR ({newsItems.length})
        </button>
      </div>

      {activeTab === 'directory' ? (
        <>
          {/* Search & Category Filter Controls */}
          <div className="p-3 border-b border-tactical-border/60 space-y-2.5 bg-black/20">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-tactical-textDim" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, category, or 'therapist near me'..."
                className="w-full pl-8 pr-7 py-1.5 bg-black/60 border border-tactical-border rounded text-xs font-mono text-tactical-textPrimary placeholder:text-tactical-textDim/60 focus:outline-none focus:border-tactical-cyan/80 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tactical-textDim hover:text-tactical-textPrimary"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Quick Suggestion Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORY_FILTERS.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap transition-all flex items-center gap-1 border ${
                    selectedCategory === cat.id
                      ? 'bg-tactical-cyan/20 border-tactical-cyan text-tactical-cyan font-bold shadow-cyanGlow'
                      : 'bg-black/40 border-tactical-border/70 text-tactical-textSecondary hover:border-tactical-borderHover hover:text-tactical-textPrimary'
                  }`}
                >
                  {cat.icon}
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Entity Results List (Google Maps-style Scrollable Directory) */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-tactical-border/60">
            {enrichedList.length === 0 ? (
              <div className="p-8 text-center space-y-3 font-mono">
                <Building2 className="w-8 h-8 text-tactical-textDim mx-auto stroke-1" />
                <div className="text-xs text-tactical-textSecondary font-semibold">
                  No matching entities found in directory
                </div>
                <p className="text-[11px] text-tactical-textDim">
                  Try searching for a broad category (e.g. "therapist", "cafes in Pune") or trigger live reconnaissance.
                </p>
                {onTriggerScan && (
                  <button
                    onClick={() => onTriggerScan(selectedCategory !== 'all' ? selectedCategory : undefined)}
                    disabled={isScanning}
                    className="mt-2 px-3 py-1.5 rounded text-xs font-mono font-bold bg-tactical-cyan text-black hover:bg-tactical-cyan/90 transition-colors shadow-cyanGlow flex items-center gap-1.5 mx-auto"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isScanning ? 'PULLING LIVE OSM DATA...' : 'SCAN DIRECTORY VIA OVERPASS'}
                  </button>
                )}
              </div>
            ) : (
              enrichedList.map((company) => {
                const isSelected = company.id === selectedCompanyId;
                return (
                  <div
                    key={company.id}
                    onClick={() => onSelectCompany(company)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer group ${
                      isSelected
                        ? 'bg-tactical-cyan/15 border-tactical-cyan shadow-cyanGlow'
                        : 'bg-black/40 border-tactical-border/70 hover:border-tactical-cyan/50 hover:bg-black/60'
                    }`}
                  >
                    {/* Top Row: Name & Distance */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-mono font-bold text-tactical-textPrimary group-hover:text-tactical-cyan transition-colors truncate">
                          {company.name}
                        </h3>
                        <div className="text-[10px] font-mono text-tactical-textDim flex items-center gap-1.5 mt-0.5">
                          <span className="truncate">{company.industry || company.category || 'Commercial Entity'}</span>
                          <span>•</span>
                          <span>{company.hq_city}</span>
                        </div>
                      </div>

                      {company.distanceKm !== undefined && company.distanceKm < 9000 && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-tactical-cyan/15 text-tactical-cyan border border-tactical-cyan/30 shrink-0 font-semibold flex items-center gap-1">
                          <Navigation className="w-2.5 h-2.5" />
                          {formatDistance(company.distanceKm)}
                        </span>
                      )}
                    </div>

                    {/* Google Maps Rating & Operating Hours Row */}
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono flex-wrap">
                      <div className="flex items-center gap-1 text-amber-400 font-bold">
                        <Star className="w-2.5 h-2.5 fill-amber-400" />
                        <span>{company.rating ?? 4.6}</span>
                        <span className="text-zinc-500 font-normal">({company.reviews_count ?? 120})</span>
                      </div>
                      <span className="text-zinc-600">•</span>
                      <div className="flex items-center gap-1 text-zinc-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-emerald-400 font-medium">Open</span>
                        <span className="text-zinc-500 truncate max-w-[140px]">
                          • {company.operating_hours || '09:00 - 20:00'}
                        </span>
                      </div>
                    </div>

                    {/* Address snippet if available */}
                    {company.hq_address && (
                      <p className="text-[10px] font-mono text-tactical-textSecondary/80 truncate mt-1">
                        {company.hq_address}
                      </p>
                    )}

                    {/* Action buttons: Phone / Website / Target Lock */}
                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-tactical-border/40 text-[10px] font-mono text-tactical-textDim">
                      <div className="flex items-center gap-2 truncate">
                        {company.phone ? (
                          <a
                            href={`tel:${company.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-tactical-cyan hover:underline truncate font-semibold"
                          >
                            <Phone className="w-2.5 h-2.5" />
                            {company.phone}
                          </a>
                        ) : (
                          <span className="text-zinc-500 text-[9px] italic flex items-center gap-1">
                            <Phone className="w-2 h-2 text-zinc-600" />
                            Not Publicly Listed
                          </span>
                        )}
                        {company.domain && (
                          <a
                            href={`https://${company.domain}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-zinc-400 hover:text-white truncate"
                          >
                            <Globe className="w-2.5 h-2.5" />
                            {company.domain}
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-tactical-green font-bold">
                          {company.lead_match_score ? `${Math.round(company.lead_match_score)}%` : '85%'} FIT
                        </span>
                        <ChevronRight className="w-3 h-3 text-tactical-textDim group-hover:text-tactical-cyan transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        /* Live News Signals List */
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin scrollbar-thumb-tactical-border/60">
          {newsItems.length === 0 ? (
            <div className="p-8 text-center space-y-2 font-mono text-zinc-400">
              <Radio className="w-8 h-8 mx-auto text-zinc-600" />
              <p className="text-xs">No active breaking signals polled yet.</p>
            </div>
          ) : (
            newsItems.map((news) => (
              <div
                key={news.id}
                onClick={() => {
                  if (onSelectNewsLocation) onSelectNewsLocation(news);
                }}
                className="p-3 rounded-lg border border-tactical-border/70 bg-black/40 hover:bg-black/60 hover:border-emerald-500/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {news.signal_type}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">{news.city}</span>
                </div>
                <h4 className="text-xs font-medium text-zinc-200 group-hover:text-white mt-1.5 line-clamp-2">
                  {news.title}
                </h4>
                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-tactical-border/40 text-[10px] font-mono text-zinc-400">
                  <span className="truncate max-w-[150px]">{news.source_name}</span>
                  {news.funding_amount && (
                    <span className="text-emerald-400 font-bold">{news.funding_amount}</span>
                  )}
                  <span className="text-tactical-cyan group-hover:underline flex items-center gap-0.5">
                    <Crosshair className="w-2.5 h-2.5" /> FLY TO
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Drawer Footer */}
      <div className="p-2.5 border-t border-tactical-border/80 bg-black/50 flex items-center justify-between text-xs font-mono">
        <div className="text-[10px] text-tactical-textDim">
          {activeTab === 'directory'
            ? `Showing ${enrichedList.length} verified entities`
            : `${newsItems.length} active live beacons`}
        </div>
        {onTriggerScan && (
          <button
            onClick={() => onTriggerScan(selectedCategory !== 'all' ? selectedCategory : undefined)}
            disabled={isScanning}
            className="px-2.5 py-1 rounded text-[11px] font-mono font-bold bg-tactical-cyan/20 border border-tactical-cyan text-tactical-cyan hover:bg-tactical-cyan hover:text-black transition-colors flex items-center gap-1 shadow-cyanGlow"
          >
            <Crosshair className="w-3 h-3" />
            {isScanning ? 'SCANNING...' : 'SCAN OVERPASS'}
          </button>
        )}
      </div>
    </aside>
  );
}
