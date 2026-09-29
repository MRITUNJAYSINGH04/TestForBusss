'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Globe,
  Radio,
  Search,
  ExternalLink,
  Compass,
  Building2,
  Copy,
  Check,
  Code2,
  Sparkles,
  ChevronRight,
  TrendingUp,
  MapPin,
  Calendar,
  Layers,
  Database,
  RefreshCw,
  Building,
  MessageSquare,
  Archive,
  FileCheck,
} from 'lucide-react';
import {
  searchWikidataApi,
  fetchWikidataEntityApi,
  enrichWikidataApi,
  fetchGdeltSignalsApi,
  plotCompanyReconApi,
  fetchOpenCorporatesApi,
  fetchRedditDiscussionsApi,
  fetchCommonCrawlArchivesApi,
  GdeltNewsSignal,
  OpenCorporatesData,
  RedditDiscussion,
  CommonCrawlRecord,
} from '@/lib/api';
import { ThemeConfig } from '@/lib/theme';

interface GlobalOsintDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onFlyToTarget?: (lat: number, lon: number, name: string) => void;
  onSelectCompany?: (company: any) => void;
  activeTheme?: ThemeConfig;
}

const WIKIDATA_PRESETS = [
  'Persistent Systems',
  'The Full Circle',
  'Zomato',
  'Tata Consultancy Services',
  'Microsoft',
  'Flexisales',
];

const GDELT_PRESETS = [
  '3D Printing Additive Manufacturing',
  'Artificial Intelligence Pune',
  'B2B SaaS India',
  'Industrial Robotics',
  'Venture Capital Funding',
];

const OPENCORPORATES_PRESETS = [
  'Persistent Systems',
  'The Full Circle',
  'Flexisales',
  'Infosys',
  'Tata Consultancy Services',
  'Microsoft',
];

const REDDIT_PRESETS = [
  'Persistent Systems',
  'The Full Circle 3D printing',
  'Pune tech startups',
  'B2B SaaS India',
  'Zomato engineering',
];

const COMMON_CRAWL_PRESETS = [
  'persistent.com',
  'thefullcircle.in',
  'flexisales.com',
  'zomato.com',
  'tcs.com',
];

export default function GlobalOsintDrawer({
  isOpen,
  onClose,
  onFlyToTarget,
  onSelectCompany,
  activeTheme,
}: GlobalOsintDrawerProps) {
  const [activeTab, setActiveTab] = useState<
    'wikidata' | 'gdelt' | 'opencorporates' | 'reddit' | 'commoncrawl'
  >('wikidata');

  // Wikidata State
  const [wikiQuery, setWikiQuery] = useState('Persistent Systems');
  const [wikiCandidates, setWikiCandidates] = useState<any[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [isWikiLoading, setIsWikiLoading] = useState(false);
  const [showSparql, setShowSparql] = useState(false);
  const [copiedSparql, setCopiedSparql] = useState(false);
  const [isPlottingEntity, setIsPlottingEntity] = useState(false);
  const [plotSuccess, setPlotSuccess] = useState(false);

  // GDELT State
  const [gdeltQuery, setGdeltQuery] = useState('3D Printing Additive Manufacturing');
  const [gdeltSignals, setGdeltSignals] = useState<GdeltNewsSignal[]>([]);
  const [isGdeltLoading, setIsGdeltLoading] = useState(false);
  const [gdeltTimespan, setGdeltTimespan] = useState('3m');

  // OpenCorporates State
  const [ocQuery, setOcQuery] = useState('Persistent Systems');
  const [ocResult, setOcResult] = useState<OpenCorporatesData | null>(null);
  const [isOcLoading, setIsOcLoading] = useState(false);

  // Reddit State
  const [redditQuery, setRedditQuery] = useState('Persistent Systems');
  const [redditDiscussions, setRedditDiscussions] = useState<RedditDiscussion[]>([]);
  const [isRedditLoading, setIsRedditLoading] = useState(false);

  // Common Crawl State
  const [ccDomain, setCcDomain] = useState('persistent.com');
  const [ccArchives, setCcArchives] = useState<CommonCrawlRecord[]>([]);
  const [isCcLoading, setIsCcLoading] = useState(false);

  const accentColor = activeTheme?.primary || '#06b6d4'; // Cyan default for OSINT

  // Initial load when drawer opens
  useEffect(() => {
    if (isOpen) {
      if (!selectedEntity && wikiQuery) {
        handleSearchWikidata(wikiQuery);
      }
      if (gdeltSignals.length === 0 && gdeltQuery) {
        handleFetchGdelt(gdeltQuery);
      }
      if (!ocResult && ocQuery) {
        handleSearchOc(ocQuery);
      }
      if (redditDiscussions.length === 0 && redditQuery) {
        handleSearchReddit(redditQuery);
      }
      if (ccArchives.length === 0 && ccDomain) {
        handleSearchCc(ccDomain);
      }
    }
  }, [isOpen]);

  const handleSearchWikidata = async (q: string) => {
    if (!q.trim()) return;
    setIsWikiLoading(true);
    setPlotSuccess(false);
    try {
      // 1. Search candidate entities
      const searchRes = await searchWikidataApi(q.trim(), 6);
      const items = searchRes.results || [];
      setWikiCandidates(items);

      // 2. Automatically enrich the top candidate if available
      if (items.length > 0) {
        const topEntityId = items[0].id;
        const detailsRes = await fetchWikidataEntityApi(topEntityId);
        setSelectedEntity({
          ...items[0],
          ...(detailsRes.details || {}),
        });
      } else {
        setSelectedEntity(null);
      }
    } catch (err) {
      console.error('Wikidata search error:', err);
    } finally {
      setIsWikiLoading(false);
    }
  };

  const handleSelectCandidate = async (cand: any) => {
    setIsWikiLoading(true);
    setPlotSuccess(false);
    try {
      const detailsRes = await fetchWikidataEntityApi(cand.id);
      setSelectedEntity({
        ...cand,
        ...(detailsRes.details || detailsRes),
      });
    } catch (err) {
      console.error('Failed to load entity details:', err);
    } finally {
      setIsWikiLoading(false);
    }
  };

  const handleFetchGdelt = async (q: string) => {
    if (!q.trim()) return;
    setIsGdeltLoading(true);
    try {
      const res = await fetchGdeltSignalsApi(q.trim(), 15);
      setGdeltSignals(res.signals || []);
    } catch (err) {
      console.error('GDELT fetch error:', err);
    } finally {
      setIsGdeltLoading(false);
    }
  };

  const handleSearchOc = async (q: string) => {
    if (!q.trim()) return;
    setIsOcLoading(true);
    try {
      const res = await fetchOpenCorporatesApi(q.trim());
      setOcResult(res.result);
    } catch (err) {
      console.error('OpenCorporates fetch error:', err);
    } finally {
      setIsOcLoading(false);
    }
  };

  const handleSearchReddit = async (q: string) => {
    if (!q.trim()) return;
    setIsRedditLoading(true);
    try {
      const res = await fetchRedditDiscussionsApi(q.trim(), 10);
      setRedditDiscussions(res.discussions || []);
    } catch (err) {
      console.error('Reddit fetch error:', err);
    } finally {
      setIsRedditLoading(false);
    }
  };

  const handleSearchCc = async (d: string) => {
    if (!d.trim()) return;
    setIsCcLoading(true);
    try {
      const cleanDomain = d.trim().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
      const res = await fetchCommonCrawlArchivesApi(cleanDomain, 12);
      setCcArchives(res.archives || []);
    } catch (err) {
      console.error('Common Crawl fetch error:', err);
    } finally {
      setIsCcLoading(false);
    }
  };

  const handlePlotSelectedEntity = async () => {
    if (!selectedEntity || isPlottingEntity) return;
    setIsPlottingEntity(true);
    try {
      const targetQuery = selectedEntity.label || selectedEntity.official_name || wikiQuery;
      const resp = await plotCompanyReconApi({
        query: targetQuery,
        city: selectedEntity.hq_location || 'Pune',
      });
      setPlotSuccess(true);
      if (onFlyToTarget && resp.latitude && resp.longitude) {
        onFlyToTarget(resp.latitude, resp.longitude, resp.company_name);
      }
      if (onSelectCompany && resp.node) {
        onSelectCompany(resp.node);
      }
      setTimeout(() => setPlotSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to plot entity:', err);
    } finally {
      setIsPlottingEntity(false);
    }
  };

  const sparqlQueryString = selectedEntity
    ? `SELECT ?prop ?propLabel ?val ?valLabel WHERE {
  wd:${selectedEntity.wikidata_id || selectedEntity.id} ?p ?val .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`
    : '';

  const handleCopySparql = () => {
    if (!sparqlQueryString) return;
    navigator.clipboard.writeText(sparqlQueryString);
    setCopiedSparql(true);
    setTimeout(() => setCopiedSparql(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-[94vw] max-w-[540px] pointer-events-auto flex flex-col font-mono select-none shadow-2xl transition-all duration-300">
      {/* Tactical Glass Container */}
      <div
        className="flex-1 flex flex-col border-l backdrop-blur-2xl overflow-hidden"
        style={{
          background: 'rgba(6, 9, 16, 0.94)',
          borderColor: `${accentColor}44`,
          boxShadow: `-12px 0 40px -10px rgba(0, 0, 0, 0.9), 0 0 30px ${accentColor}15`,
        }}
      >
        {/* Header Bar */}
        <div
          className="p-4 border-b flex items-center justify-between gap-3 shrink-0"
          style={{
            background: 'rgba(10, 15, 26, 0.9)',
            borderColor: `${accentColor}33`,
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center border"
              style={{
                background: `${accentColor}18`,
                borderColor: `${accentColor}55`,
                color: accentColor,
              }}
            >
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black tracking-wider text-white">
                  GLOBAL OSINT RADAR
                </span>
                <span
                  className="text-[9px] font-bold px-1.5 py-0.2 rounded border"
                  style={{
                    background: `${accentColor}18`,
                    borderColor: `${accentColor}44`,
                    color: accentColor,
                  }}
                >
                  LIVE PROVENANCE
                </span>
              </div>
              <div className="text-[9px] text-zinc-400 tracking-wider">
                WIKIDATA OPEN GRAPH // GDELT 2.0 LIVE SIGNALS
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-transparent hover:border-red-500/30 transition-colors"
            title="Close OSINT Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-3 py-2 border-b border-white/10 flex items-center gap-1.5 bg-black/40 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('wikidata')}
            className={`py-1.5 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 whitespace-nowrap transition-all border shrink-0 ${
              activeTab === 'wikidata'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-lg'
                : 'text-zinc-400 border-transparent hover:text-white hover:bg-white/5'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>WIKIDATA</span>
          </button>

          <button
            onClick={() => setActiveTab('gdelt')}
            className={`py-1.5 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 whitespace-nowrap transition-all border shrink-0 ${
              activeTab === 'gdelt'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-lg'
                : 'text-zinc-400 border-transparent hover:text-white hover:bg-white/5'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>GDELT 2.0</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('opencorporates');
              if (!ocResult && ocQuery) handleSearchOc(ocQuery);
            }}
            className={`py-1.5 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 whitespace-nowrap transition-all border shrink-0 ${
              activeTab === 'opencorporates'
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/50 shadow-lg'
                : 'text-zinc-400 border-transparent hover:text-white hover:bg-white/5'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>OPENCORPORATES</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('reddit');
              if (redditDiscussions.length === 0 && redditQuery) handleSearchReddit(redditQuery);
            }}
            className={`py-1.5 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 whitespace-nowrap transition-all border shrink-0 ${
              activeTab === 'reddit'
                ? 'bg-orange-500/20 text-orange-300 border-orange-500/50 shadow-lg'
                : 'text-zinc-400 border-transparent hover:text-white hover:bg-white/5'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>REDDIT</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('commoncrawl');
              if (ccArchives.length === 0 && ccDomain) handleSearchCc(ccDomain);
            }}
            className={`py-1.5 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 whitespace-nowrap transition-all border shrink-0 ${
              activeTab === 'commoncrawl'
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-lg'
                : 'text-zinc-400 border-transparent hover:text-white hover:bg-white/5'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>COMMON CRAWL</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {activeTab === 'wikidata' ? (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    value={wikiQuery}
                    onChange={(e) => setWikiQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchWikidata(wikiQuery)}
                    placeholder="Search company or entity in Wikidata..."
                    className="w-full pl-9 pr-20 py-2 rounded-xl bg-black/60 border border-white/15 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 text-xs transition-colors font-mono"
                  />
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <button
                    onClick={() => handleSearchWikidata(wikiQuery)}
                    disabled={isWikiLoading || !wikiQuery.trim()}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-black text-[10px] transition-all disabled:opacity-40"
                  >
                    {isWikiLoading ? 'SCAN...' : 'SEARCH'}
                  </button>
                </div>

                {/* Preset Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                  <span className="text-[9px] text-zinc-500 font-bold shrink-0">QUICK:</span>
                  {WIKIDATA_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setWikiQuery(preset);
                        handleSearchWikidata(preset);
                      }}
                      className="text-[9px] px-2 py-0.5 rounded-md bg-white/5 hover:bg-cyan-500/20 text-zinc-300 hover:text-cyan-300 border border-white/10 shrink-0 transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Candidate Entities Selector (if multiple) */}
              {wikiCandidates.length > 1 && (
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                    CANDIDATE ENTITIES ({wikiCandidates.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {wikiCandidates.slice(0, 4).map((cand) => {
                      const isSelected = selectedEntity?.id === cand.id;
                      return (
                        <button
                          key={cand.id}
                          onClick={() => handleSelectCandidate(cand)}
                          className={`p-2 rounded-lg text-left transition-all border ${
                            isSelected
                              ? 'bg-cyan-500/20 border-cyan-500/50 text-white shadow'
                              : 'bg-white/5 border-white/5 text-zinc-300 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="truncate">{cand.label}</span>
                            <span className="text-[9px] text-cyan-400 shrink-0 font-mono ml-1">
                              {cand.id}
                            </span>
                          </div>
                          <div className="text-[9px] text-zinc-400 line-clamp-1 mt-0.5">
                            {cand.description || 'Enterprise entity'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Selected Entity Detailed Dossier */}
              {selectedEntity ? (
                <div className="p-4 rounded-xl bg-black/80 border border-cyan-500/40 shadow-2xl space-y-3.5 backdrop-blur-md">
                  {/* Entity Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">
                          {selectedEntity.label || selectedEntity.official_name}
                        </span>
                        <a
                          href={`https://www.wikidata.org/wiki/${selectedEntity.id || selectedEntity.wikidata_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 flex items-center gap-1"
                        >
                          <span>{selectedEntity.id || selectedEntity.wikidata_id}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">
                        {selectedEntity.description || 'Verified Open Knowledge Graph Record'}
                      </div>
                    </div>

                    {onFlyToTarget && selectedEntity.latitude && selectedEntity.longitude && (
                      <button
                        onClick={() =>
                          onFlyToTarget(
                            selectedEntity.latitude,
                            selectedEntity.longitude,
                            selectedEntity.label
                          )
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 font-bold text-[10px] flex items-center gap-1.5 transition-all shrink-0"
                        title="Fly Camera to Coordinates on 3D Globe"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>FLY TO GLOBE</span>
                      </button>
                    )}
                  </div>

                  {/* Property Matrix Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                    {selectedEntity.website && (
                      <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                        <span className="text-zinc-500 block text-[9px] font-bold uppercase">OFFICIAL WEBSITE</span>
                        <a
                          href={selectedEntity.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-300 hover:underline flex items-center gap-1 truncate mt-0.5 font-semibold"
                        >
                          <span className="truncate">{selectedEntity.website}</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        </a>
                      </div>
                    )}

                    {selectedEntity.hq_location && (
                      <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                        <span className="text-zinc-500 block text-[9px] font-bold uppercase">HEADQUARTERS</span>
                        <span className="text-zinc-200 block truncate mt-0.5 font-semibold">
                          {selectedEntity.hq_location}{selectedEntity.country ? `, ${selectedEntity.country}` : ''}
                        </span>
                      </div>
                    )}

                    {selectedEntity.founders && selectedEntity.founders.length > 0 && (
                      <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                        <span className="text-zinc-500 block text-[9px] font-bold uppercase">FOUNDED BY</span>
                        <span className="text-amber-300 block truncate mt-0.5 font-bold">
                          {selectedEntity.founders.join(', ')}
                        </span>
                      </div>
                    )}

                    {selectedEntity.ceo && selectedEntity.ceo.length > 0 && (
                      <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                        <span className="text-zinc-500 block text-[9px] font-bold uppercase">CHIEF EXECUTIVE (CEO)</span>
                        <span className="text-emerald-400 block truncate mt-0.5 font-bold">
                          {selectedEntity.ceo.join(', ')}
                        </span>
                      </div>
                    )}

                    {selectedEntity.inception && (
                      <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                        <span className="text-zinc-500 block text-[9px] font-bold uppercase">INCEPTION / FOUNDED</span>
                        <span className="text-zinc-200 block truncate mt-0.5 font-semibold">
                          {selectedEntity.inception}
                        </span>
                      </div>
                    )}

                    {selectedEntity.industry && selectedEntity.industry.length > 0 && (
                      <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                        <span className="text-zinc-500 block text-[9px] font-bold uppercase">INDUSTRY / SECTOR</span>
                        <span className="text-zinc-200 block truncate mt-0.5 font-semibold">
                          {selectedEntity.industry.join(', ')}
                        </span>
                      </div>
                    )}

                    {selectedEntity.latitude && selectedEntity.longitude && (
                      <div className="p-2 rounded-lg bg-white/5 border border-white/5 sm:col-span-2">
                        <span className="text-zinc-500 block text-[9px] font-bold uppercase">AUTHENTIC GPS COORDINATES</span>
                        <span className="text-cyan-400 block truncate mt-0.5 font-semibold">
                          {Number(selectedEntity.latitude).toFixed(4)}°N, {Number(selectedEntity.longitude).toFixed(4)}°E (Precision Locked)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setShowSparql((prev) => !prev)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 text-[10px] font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{showSparql ? 'HIDE SPARQL' : 'VIEW SPARQL QUERY'}</span>
                    </button>

                    <button
                      onClick={handlePlotSelectedEntity}
                      disabled={isPlottingEntity}
                      className={`px-3 py-1.5 rounded-lg font-bold text-[10px] flex items-center gap-1.5 transition-all ${
                        plotSuccess
                          ? 'bg-emerald-500 text-black'
                          : 'bg-cyan-500 hover:bg-cyan-400 text-black'
                      }`}
                    >
                      {isPlottingEntity ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : plotSuccess ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Database className="w-3.5 h-3.5" />
                      )}
                      <span>{plotSuccess ? 'PLOTTED & SAVED' : 'PLOT TO 3D GLOBE'}</span>
                    </button>
                  </div>

                  {/* Expandable SPARQL Viewer */}
                  {showSparql && (
                    <div className="p-2.5 rounded-lg bg-black/90 border border-cyan-500/30 space-y-2">
                      <div className="flex items-center justify-between text-[9px]">
                        <span className="text-zinc-400 font-bold">W3C SPARQL QUERY (query.wikidata.org)</span>
                        <button
                          onClick={handleCopySparql}
                          className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
                        >
                          {copiedSparql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedSparql ? 'COPIED' : 'COPY'}</span>
                        </button>
                      </div>
                      <pre className="text-[9px] text-zinc-300 overflow-x-auto p-2 bg-black/50 rounded border border-white/5">
                        {sparqlQueryString}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                !isWikiLoading && (
                  <div className="p-8 text-center rounded-xl bg-black/40 border border-white/5 space-y-2">
                    <Globe className="w-8 h-8 text-zinc-600 mx-auto" />
                    <div className="text-xs text-zinc-400 font-bold">No Wikidata Entity Loaded</div>
                    <div className="text-[10px] text-zinc-500">
                      Enter any enterprise or organization name to query the open knowledge graph.
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            /* GDELT Live Signals Tab */
            <div className="space-y-4">
              {/* GDELT Search Input */}
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    value={gdeltQuery}
                    onChange={(e) => setGdeltQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleFetchGdelt(gdeltQuery)}
                    placeholder="Search global media signals in GDELT 2.0..."
                    className="w-full pl-9 pr-20 py-2 rounded-xl bg-black/60 border border-white/15 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-400 text-xs transition-colors font-mono"
                  />
                  <Radio className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <button
                    onClick={() => handleFetchGdelt(gdeltQuery)}
                    disabled={isGdeltLoading || !gdeltQuery.trim()}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[10px] transition-all disabled:opacity-40"
                  >
                    {isGdeltLoading ? 'FETCH...' : 'QUERY'}
                  </button>
                </div>

                {/* Preset Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                  <span className="text-[9px] text-zinc-500 font-bold shrink-0">TOPIC:</span>
                  {GDELT_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setGdeltQuery(preset);
                        handleFetchGdelt(preset);
                      }}
                      className="text-[9px] px-2 py-0.5 rounded-md bg-white/5 hover:bg-emerald-500/20 text-zinc-300 hover:text-emerald-300 border border-white/10 shrink-0 transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Signals Feed */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] text-zinc-400 px-1">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    LIVE MEDIA SIGNALS ({gdeltSignals.length})
                  </span>
                  <span className="text-[9px] text-zinc-500 font-mono">
                    GDELT 2.0 GLOBAL DOC API
                  </span>
                </div>

                {isGdeltLoading ? (
                  <div className="p-8 text-center rounded-xl bg-black/40 border border-emerald-500/20 space-y-2">
                    <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin mx-auto" />
                    <div className="text-xs text-emerald-300 font-bold">Scanning Global Event Database...</div>
                  </div>
                ) : gdeltSignals.length > 0 ? (
                  <div className="space-y-2">
                    {gdeltSignals.map((sig, sIdx) => {
                      const signalColor =
                        sig.signal_type === 'FUNDING'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : sig.signal_type === 'ACQUISITION'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                          : sig.signal_type === 'PARTNERSHIP'
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          : sig.signal_type === 'EXPANSION'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          : sig.signal_type === 'LEADERSHIP'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-white/10 text-zinc-300 border-white/15';

                      return (
                        <div
                          key={sIdx}
                          className="p-3 rounded-xl bg-black/70 border border-white/10 hover:border-emerald-500/40 transition-all flex items-start justify-between gap-2.5"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold border ${signalColor}`}>
                                {sig.signal_type}
                              </span>
                              <span className="text-[9px] text-zinc-400 truncate">
                                {sig.domain || 'Global Media'} • {sig.seendate ? String(sig.seendate).slice(0, 10) : 'Recent'}
                              </span>
                              {sig.source_country && (
                                <span className="text-[9px] text-zinc-500 ml-auto shrink-0">
                                  {sig.source_country}
                                </span>
                              )}
                            </div>
                            <a
                              href={sig.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-zinc-200 hover:text-cyan-300 font-medium line-clamp-2 hover:underline leading-relaxed"
                            >
                              {sig.title}
                            </a>
                          </div>
                          <a
                            href={sig.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-zinc-400 hover:text-emerald-300 shrink-0 border border-white/5 transition-colors"
                            title="Open verified article"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center rounded-xl bg-black/40 border border-white/5 space-y-2">
                    <Radio className="w-8 h-8 text-zinc-600 mx-auto" />
                    <div className="text-xs text-zinc-400 font-bold">No Signals Detected</div>
                    <div className="text-[10px] text-zinc-500">
                      Query a company or topic to scan global media for real-time market activity.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* OpenCorporates Tab */}
          {activeTab === 'opencorporates' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    value={ocQuery}
                    onChange={(e) => setOcQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchOc(ocQuery)}
                    placeholder="Search company in OpenCorporates registry..."
                    className="w-full pl-9 pr-20 py-2 rounded-xl bg-black/60 border border-white/15 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-400 text-xs transition-colors font-mono"
                  />
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <button
                    onClick={() => handleSearchOc(ocQuery)}
                    disabled={isOcLoading}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-bold transition-colors disabled:opacity-50"
                  >
                    {isOcLoading ? 'SCANNING...' : 'LOOKUP'}
                  </button>
                </div>

                {/* Preset Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <span className="text-[9px] text-zinc-500 uppercase font-bold shrink-0">PRESETS:</span>
                  {OPENCORPORATES_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setOcQuery(preset);
                        handleSearchOc(preset);
                      }}
                      className="px-2 py-0.5 rounded-full bg-white/5 hover:bg-blue-500/20 text-zinc-400 hover:text-blue-300 border border-white/10 text-[9px] whitespace-nowrap transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {isOcLoading ? (
                <div className="p-8 text-center rounded-xl bg-black/40 border border-white/5 space-y-2">
                  <RefreshCw className="w-6 h-6 text-blue-400 animate-spin mx-auto" />
                  <div className="text-xs text-zinc-300 font-bold">Querying OpenCorporates API...</div>
                  <div className="text-[10px] text-zinc-500">Checking global company registers and incorporation databases</div>
                </div>
              ) : ocResult ? (
                <div className="p-4 rounded-xl bg-black/70 border border-blue-500/40 shadow-xl space-y-3">
                  <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">{ocResult.company_name}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                          {ocResult.company_number || 'CIN REGISTRY'}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">
                        Jurisdiction: <span className="text-blue-300 font-bold uppercase">{ocResult.jurisdiction_code || 'GLOBAL'}</span>
                      </div>
                    </div>

                    {ocResult.opencorporates_url && (
                      <a
                        href={ocResult.opencorporates_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-[10px] font-bold flex items-center gap-1.5 transition-colors shrink-0"
                      >
                        <span>FILING</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="p-2 rounded bg-white/5 border border-white/5">
                      <span className="text-zinc-500 block text-[9px] font-bold uppercase">STATUS</span>
                      <span className="text-white font-semibold capitalize mt-0.5 block">
                        {ocResult.current_status || 'Active Entity'}
                      </span>
                    </div>

                    <div className="p-2 rounded bg-white/5 border border-white/5">
                      <span className="text-zinc-500 block text-[9px] font-bold uppercase">COMPANY TYPE</span>
                      <span className="text-zinc-200 font-semibold truncate mt-0.5 block">
                        {ocResult.company_type || 'Private Limited'}
                      </span>
                    </div>

                    {ocResult.incorporation_date && (
                      <div className="p-2 rounded bg-white/5 border border-white/5">
                        <span className="text-zinc-500 block text-[9px] font-bold uppercase">INCORPORATION</span>
                        <span className="text-zinc-200 font-semibold mt-0.5 block">
                          {ocResult.incorporation_date}
                        </span>
                      </div>
                    )}

                    {ocResult.confidence_score != null && (
                      <div className="p-2 rounded bg-white/5 border border-white/5">
                        <span className="text-zinc-500 block text-[9px] font-bold uppercase">CONFIDENCE</span>
                        <span className="text-emerald-400 font-bold mt-0.5 block">
                          {Math.round(ocResult.confidence_score * 100)}% Verified
                        </span>
                      </div>
                    )}

                    {ocResult.registered_address && (
                      <div className="p-2 rounded bg-white/5 border border-white/5 col-span-2">
                        <span className="text-zinc-500 block text-[9px] font-bold uppercase">REGISTERED ADDRESS</span>
                        <span className="text-zinc-300 mt-0.5 block leading-relaxed">
                          {ocResult.registered_address}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center rounded-xl bg-black/40 border border-white/5 space-y-2">
                  <Building className="w-8 h-8 text-zinc-600 mx-auto" />
                  <div className="text-xs text-zinc-400 font-bold">No Corporate Record Loaded</div>
                  <div className="text-[10px] text-zinc-500">
                    Search any company above or pick a preset to view verified registry filings.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reddit Tab */}
          {activeTab === 'reddit' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    value={redditQuery}
                    onChange={(e) => setRedditQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchReddit(redditQuery)}
                    placeholder="Search Reddit discussions & sentiment..."
                    className="w-full pl-9 pr-20 py-2 rounded-xl bg-black/60 border border-white/15 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-400 text-xs transition-colors font-mono"
                  />
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <button
                    onClick={() => handleSearchReddit(redditQuery)}
                    disabled={isRedditLoading}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-bold transition-colors disabled:opacity-50"
                  >
                    {isRedditLoading ? 'SCANNING...' : 'SEARCH'}
                  </button>
                </div>

                {/* Preset Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <span className="text-[9px] text-zinc-500 uppercase font-bold shrink-0">TOPICS:</span>
                  {REDDIT_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setRedditQuery(preset);
                        handleSearchReddit(preset);
                      }}
                      className="px-2 py-0.5 rounded-full bg-white/5 hover:bg-orange-500/20 text-zinc-400 hover:text-orange-300 border border-white/10 text-[9px] whitespace-nowrap transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {isRedditLoading ? (
                <div className="p-8 text-center rounded-xl bg-black/40 border border-white/5 space-y-2">
                  <RefreshCw className="w-6 h-6 text-orange-400 animate-spin mx-auto" />
                  <div className="text-xs text-zinc-300 font-bold">Scanning Reddit Communities...</div>
                  <div className="text-[10px] text-zinc-500">Querying public threads, developer sentiments, and discussions</div>
                </div>
              ) : redditDiscussions.length > 0 ? (
                <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                  {redditDiscussions.map((disc, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-black/70 border border-white/10 hover:border-orange-500/40 transition-all flex items-start justify-between gap-2.5"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                            r/{disc.subreddit}
                          </span>
                          <span className="text-[9px] text-zinc-400">
                            ▲ {disc.score} • {disc.num_comments} comments {disc.author ? `• u/${disc.author}` : ''}
                          </span>
                        </div>
                        <a
                          href={disc.url || disc.permalink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-zinc-200 hover:text-orange-300 font-medium line-clamp-2 hover:underline leading-relaxed"
                        >
                          {disc.title}
                        </a>
                      </div>
                      <a
                        href={disc.url || disc.permalink}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-orange-500/20 text-zinc-400 hover:text-orange-300 shrink-0 border border-white/5 transition-colors"
                        title="Open Reddit thread"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center rounded-xl bg-black/40 border border-white/5 space-y-2">
                  <MessageSquare className="w-8 h-8 text-zinc-600 mx-auto" />
                  <div className="text-xs text-zinc-400 font-bold">No Discussions Found</div>
                  <div className="text-[10px] text-zinc-500">
                    Search for a company, topic, or technology to discover developer feedback.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Common Crawl Tab */}
          {activeTab === 'commoncrawl' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    value={ccDomain}
                    onChange={(e) => setCcDomain(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchCc(ccDomain)}
                    placeholder="Enter domain (e.g. persistent.com or thefullcircle.in)..."
                    className="w-full pl-9 pr-20 py-2 rounded-xl bg-black/60 border border-white/15 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400 text-xs transition-colors font-mono"
                  />
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <button
                    onClick={() => handleSearchCc(ccDomain)}
                    disabled={isCcLoading}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-[10px] font-bold transition-colors disabled:opacity-50"
                  >
                    {isCcLoading ? 'FETCHING...' : 'LOOKUP'}
                  </button>
                </div>

                {/* Preset Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <span className="text-[9px] text-zinc-500 uppercase font-bold shrink-0">DOMAINS:</span>
                  {COMMON_CRAWL_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setCcDomain(preset);
                        handleSearchCc(preset);
                      }}
                      className="px-2 py-0.5 rounded-full bg-white/5 hover:bg-purple-500/20 text-zinc-400 hover:text-purple-300 border border-white/10 text-[9px] whitespace-nowrap transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {isCcLoading ? (
                <div className="p-8 text-center rounded-xl bg-black/40 border border-white/5 space-y-2">
                  <RefreshCw className="w-6 h-6 text-purple-400 animate-spin mx-auto" />
                  <div className="text-xs text-zinc-300 font-bold">Querying Common Crawl Index...</div>
                  <div className="text-[10px] text-zinc-500">Searching global web crawl index for historical snapshots</div>
                </div>
              ) : ccArchives.length > 0 ? (
                <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                  {ccArchives.map((crawl, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-black/70 border border-white/10 hover:border-purple-500/40 transition-all flex items-start justify-between gap-2.5"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                            {crawl.archive_index || 'CC-MAIN'}
                          </span>
                          <span className="text-[9px] text-zinc-400 font-mono">
                            {crawl.parsed_date || crawl.timestamp || 'Historical'}
                          </span>
                          {crawl.mime && (
                            <span className="text-[8px] px-1 py-0.2 rounded bg-white/10 text-zinc-300 font-mono">
                              {crawl.mime}
                            </span>
                          )}
                        </div>
                        <a
                          href={crawl.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-zinc-200 hover:text-purple-300 font-mono line-clamp-1 hover:underline leading-relaxed"
                        >
                          {crawl.url}
                        </a>
                      </div>
                      <a
                        href={crawl.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-purple-500/20 text-zinc-400 hover:text-purple-300 shrink-0 border border-white/5 transition-colors"
                        title="Open archived snapshot"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center rounded-xl bg-black/40 border border-white/5 space-y-2">
                  <Archive className="w-8 h-8 text-zinc-600 mx-auto" />
                  <div className="text-xs text-zinc-400 font-bold">No Snapshots Found</div>
                  <div className="text-[10px] text-zinc-500">
                    Enter a domain name to inspect captured historical web crawler indices.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
