'use client';

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Terminal,
  Search,
  Download,
  ExternalLink,
  Phone,
  Mail,
  Check,
  Copy,
  Navigation,
  ShieldCheck,
  ShieldAlert,
  Building2,
  Cpu,
  UserCheck,
  Radio,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  prospectViperApi,
  ViperLead,
  ViperExecutive,
  ViperTelemetryStep,
  ViperProspectResponse,
} from '@/lib/api';

interface ViperProspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFlyToNode?: (lat: number, lon: number, name: string) => void;
}

const PRESET_PROMPTS = [
  'Find 10 AI startups in Pune with founder contact numbers',
  'Identify top cybersecurity companies in Bangalore and their CTOs',
  'Find enterprise SaaS companies in Mumbai with VP Engineering',
  'Discover top healthtech and diagnostic clinics in Delhi with direct contacts',
];

export default function ViperProspectorModal({
  isOpen,
  onClose,
  onFlyToNode,
}: ViperProspectorModalProps) {
  const [prompt, setPrompt] = useState('Find 10 AI startups in Pune with founder contact numbers');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ViperProspectResponse | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunProspecting = async (selectedPrompt?: string) => {
    const activePrompt = selectedPrompt || prompt;
    if (!activePrompt.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const resp = await prospectViperApi({ prompt: activePrompt, limit: 10 });
      setResult(resp);
    } catch (err: any) {
      console.error('VIPER prospecting failed:', err);
      setError(err?.message || 'VIPER prospecting engine failed to execute. Check backend connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportCsv = () => {
    if (!result || !result.leads.length) return;

    const rows = [
      [
        'Company Name',
        'Domain',
        'City',
        'Country',
        'Industry',
        'Executive Name',
        'Executive Role',
        'Executive Email',
        'Executive Phone',
        'Executive LinkedIn',
        'Verification Status',
        'Lead Match Score',
      ],
    ];

    for (const lead of result.leads) {
      if (lead.key_executives && lead.key_executives.length > 0) {
        for (const exec of lead.key_executives) {
          rows.push([
            lead.name,
            lead.domain || '',
            lead.hq_city,
            lead.hq_country,
            lead.industry,
            exec.name,
            exec.role,
            exec.email || 'Not Publicly Listed',
            exec.phone || 'Not Publicly Listed',
            exec.linkedin || '',
            exec.verification_status,
            `${lead.lead_match_score}%`,
          ]);
        }
      } else {
        rows.push([
          lead.name,
          lead.domain || '',
          lead.hq_city,
          lead.hq_country,
          lead.industry,
          'Executive Leadership',
          'Director',
          lead.contact_email || 'Not Publicly Listed',
          lead.phone || 'Not Publicly Listed',
          '',
          lead.confidence_level,
          `${lead.lead_match_score}%`,
        ]);
      }
    }

    const csvContent = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VIPER_Prospecting_Leads_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-[#0b0f17] border border-[#1e293b] rounded-2xl shadow-2xl overflow-hidden font-sans">
        {/* Top Military HUD Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b] bg-gradient-to-r from-[#0d1424] via-[#090d16] to-[#0d1424]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide uppercase font-mono">
                  VIPER OSINT PROSPECTOR & MCP CONSOLE
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded uppercase">
                  ACTIVE ROUTING: OPENROUTER / FREE
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Autonomous Natural Language B2B Lead Machine • 100% Verified Provenance • Zero Synthetic Contact Data
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Claude-style Prompt Box */}
          <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-4 shadow-inner">
            <label className="block text-xs font-mono font-semibold text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              Target Prospecting Intent Prompt
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleRunProspecting()}
                  placeholder="e.g. Find 10 AI startups in Pune with founder contact numbers..."
                  className="w-full bg-[#080d1a] border border-[#273549] rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                />
              </div>
              <button
                onClick={() => handleRunProspecting()}
                disabled={isLoading || !prompt.trim()}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold text-sm rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isLoading ? (
                  <>
                    <Cpu className="w-4 h-4 animate-spin" />
                    <span>EXECUTING RECON...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>LAUNCH VIPER</span>
                  </>
                )}
              </button>
            </div>

            {/* Prompt Quick-Pills */}
            <div className="mt-3 flex flex-wrap gap-2 items-center">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                Quick Presets:
              </span>
              {PRESET_PROMPTS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPrompt(preset);
                    handleRunProspecting(preset);
                  }}
                  className="text-xs bg-[#1a2333] hover:bg-[#223048] border border-[#2d3d57] text-zinc-300 hover:text-amber-300 px-2.5 py-1 rounded-md transition"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-sm flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Real-Time Telemetry Terminal */}
          {result?.telemetry_logs && result.telemetry_logs.length > 0 && (
            <div className="bg-[#070b14] border border-[#1a2436] rounded-xl p-4 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1a2436]">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span className="font-bold tracking-widest uppercase text-[11px] text-zinc-300">
                    VIPER RECON TELEMETRY LOGS
                  </span>
                </div>
                <span className="text-[10px] text-zinc-400">STATUS: {result.status}</span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto scrollbar-thin">
                {result.telemetry_logs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-zinc-300">
                    <span className="text-zinc-400 text-[10px] whitespace-nowrap">[{log.timestamp}]</span>
                    <span
                      className={`px-1 rounded text-[9px] font-bold ${
                        log.status === 'SUCCESS'
                          ? 'text-emerald-400 bg-emerald-500/10'
                          : 'text-cyan-400 bg-cyan-500/10'
                      }`}
                    >
                      {log.step}
                    </span>
                    <span className="text-zinc-200">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Leads Grid Header & 1-Click CSV Export */}
          {result && (
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-zinc-200">
                  Verified Executive Dossiers ({result.leads.length})
                </h3>
                <span className="text-xs text-zinc-400">
                  Target Hub: <span className="text-amber-400">{result.parsed_intent?.location}</span> • Industry: <span className="text-cyan-400">{result.parsed_intent?.industry}</span>
                </span>
              </div>
              <button
                onClick={handleExportCsv}
                className="px-3.5 py-1.5 bg-[#152238] hover:bg-[#1c3050] border border-[#2d436b] text-cyan-300 hover:text-cyan-200 rounded-lg text-xs font-mono font-semibold flex items-center gap-2 transition"
              >
                <Download className="w-3.5 h-3.5" />
                1-CLICK CSV EXPORT
              </button>
            </div>
          )}

          {/* Dossier Cards List */}
          {result && result.leads.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.leads.map((lead) => (
                <div
                  key={lead.id}
                  className="bg-[#0f172a]/70 border border-[#1e293b] hover:border-amber-500/40 rounded-xl p-4 transition shadow-lg flex flex-col justify-between"
                >
                  {/* Company Header */}
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={lead.logo_url || `https://www.google.com/s2/favicons?domain=${lead.domain}&sz=128`}
                          alt={lead.name}
                          className="w-10 h-10 rounded-lg border border-zinc-700 bg-zinc-800 p-1 object-contain"
                          onError={(e) => {
                            // Fallback to generic icon if favicon fails
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div>
                          <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                            {lead.name}
                            {lead.website && (
                              <a
                                href={lead.website}
                                target="_blank"
                                rel="noreferrer"
                                className="text-zinc-400 hover:text-amber-400 transition"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </h4>
                          <p className="text-xs text-zinc-400">
                            {lead.hq_city}, {lead.hq_country} • {lead.industry}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                          {lead.lead_match_score}% MATCH
                        </span>
                        <span className="text-[9px] font-mono text-zinc-400 mt-1 uppercase">
                          {lead.confidence_level}
                        </span>
                      </div>
                    </div>

                    {lead.summary && (
                      <p className="text-xs text-zinc-300 mt-3 line-clamp-2 italic">
                        "{lead.summary}"
                      </p>
                    )}

                    {/* Key Decision Makers / Executives */}
                    <div className="mt-4 pt-3 border-t border-[#1e293b] space-y-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                        Verified Decision Makers:
                      </span>

                      {lead.key_executives.map((exec, eIdx) => (
                        <div
                          key={eIdx}
                          className="bg-[#090d16] border border-[#1a2538] rounded-lg p-2.5 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                              <span className="text-xs font-semibold text-white">{exec.name}</span>
                              <span className="text-[10px] px-1.5 py-0.2 bg-zinc-800 text-zinc-300 rounded font-mono">
                                {exec.role}
                              </span>
                            </div>
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.2 rounded uppercase font-bold ${
                                exec.verification_status === 'VERIFIED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                              }`}
                            >
                              {exec.verification_status}
                            </span>
                          </div>

                          {/* Contact Details with Strict Provenance */}
                          <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
                            {/* Phone */}
                            {exec.phone ? (
                              <a
                                href={`tel:${exec.phone}`}
                                className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-mono"
                              >
                                <Phone className="w-3 h-3" />
                                {exec.phone}
                              </a>
                            ) : (
                              <span className="flex items-center gap-1 text-zinc-400 font-mono text-[11px]">
                                <Phone className="w-3 h-3 text-zinc-400" />
                                Not Publicly Listed
                              </span>
                            )}

                            {/* Email */}
                            {exec.email ? (
                              <a
                                href={`mailto:${exec.email}`}
                                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-mono"
                              >
                                <Mail className="w-3 h-3" />
                                {exec.email}
                              </a>
                            ) : (
                              <span className="flex items-center gap-1 text-zinc-400 font-mono text-[11px]">
                                <Mail className="w-3 h-3 text-zinc-400" />
                                Not Publicly Listed
                              </span>
                            )}

                            {/* LinkedIn Link */}
                            {exec.linkedin && (
                              <a
                                href={exec.linkedin}
                                target="_blank"
                                rel="noreferrer"
                                className="text-zinc-400 hover:text-blue-400 flex items-center gap-1 ml-auto text-[11px]"
                              >
                                <ExternalLink className="w-3 h-3" />
                                LinkedIn
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="mt-4 pt-3 border-t border-[#1e293b] flex items-center justify-between">
                    <span className="text-[10px] font-mono text-zinc-400">
                      Coordinates: [{lead.latitude.toFixed(4)}°, {lead.longitude.toFixed(4)}°]
                    </span>
                    {onFlyToNode && (
                      <button
                        onClick={() => onFlyToNode(lead.latitude, lead.longitude, lead.name)}
                        className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded text-xs font-mono flex items-center gap-1.5 transition"
                      >
                        <Navigation className="w-3 h-3" />
                        FLY TO GLOBE
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
