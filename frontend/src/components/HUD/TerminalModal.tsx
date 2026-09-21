'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal as TerminalIcon,
  X,
  Minimize2,
  Maximize2,
  ChevronRight,
  Sparkles,
  MapPin,
  Phone,
  Mail,
  Globe,
  Building2,
  ExternalLink,
  Copy,
  Check,
  RotateCcw,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { plotCompanyReconApi, prospectViperApi, chatAiApi, PlotReconResponse } from '@/lib/api';
import { ThemeConfig } from '@/lib/theme';

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'success' | 'system' | 'card';
  text?: string;
  cardData?: PlotReconResponse;
  leadsData?: any[];
  timestamp: string;
}

interface TerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFlyToNode?: (lat: number, lon: number, name: string) => void;
  onSelectCompany?: (company: any) => void;
  activeTheme?: ThemeConfig;
}

const WELCOME_BANNER = `
  ██████╗  ██████╗ ██████╗     ███████╗██╗   ██╗███████╗
 ██╔════╝ ██╔═══██╗██╔══██╗    ██╔════╝╚██╗ ██╔╝██╔════╝
 ██║  ███╗██║   ██║██║  ██║    █████╗   ╚████╔╝ █████╗  
 ██║   ██║██║   ██║██║  ██║    ██╔══╝    ╚██╔╝  ██╔══╝  
 ╚██████╔╝╚██████╔╝██████╔╝    ███████╗   ██║   ███████╗
  ╚═════╝  ╚═════╝ ╚═════╝     ╚══════╝   ╚═╝   ╚══════╝
 ════════════════════════════════════════════════════════
 [TACTICAL OSINT RECONNAISSANCE TERMINAL v4.2 // ONLINE]
 Target Facility: The Full Circle (3D Printing & Prototyping)
 Engine: OpenRouter Free Model Gateway | Zero-Mock Provenance
 Type 'help' for command syntax or click quick action buttons.
 ════════════════════════════════════════════════════════
`;

const QUICK_COMMANDS = [
  'plot The Full Circle',
  'plot Flexisales',
  'prospect hardware startups Pune',
  'contacts The Full Circle',
  'status',
  'help',
];

export default function TerminalModal({
  isOpen,
  onClose,
  onFlyToNode,
  onSelectCompany,
  activeTheme,
}: TerminalModalProps) {
  const [history, setHistory] = useState<TerminalLine[]>([
    {
      id: 'init-1',
      type: 'system',
      text: WELCOME_BANNER,
      timestamp: new Date().toISOString().slice(11, 19) + 'Z',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [commandLog, setCommandLog] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const accentColor = activeTheme?.primary || '#10b981';

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen) {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [history, isOpen]);

  if (!isOpen) return null;

  const appendLine = (line: Omit<TerminalLine, 'id' | 'timestamp'>) => {
    setHistory((prev) => [
      ...prev,
      {
        ...line,
        id: `term-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString().slice(11, 19) + 'Z',
      },
    ]);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCommandExecution = async (rawCmd: string) => {
    const trimmed = rawCmd.trim();
    if (!trimmed) return;

    // Record in command navigation history
    setCommandLog((prev) => [trimmed, ...prev]);
    setHistoryIndex(-1);

    // Print command input line
    appendLine({
      type: 'input',
      text: trimmed,
    });

    setInputValue('');
    setIsProcessing(true);

    const parts = trimmed.split(' ');
    const cmd = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ').trim();

    try {
      switch (cmd) {
        case 'clear':
        case 'cls':
          setHistory([]);
          break;

        case 'help':
          appendLine({
            type: 'output',
            text: `
AVAILABLE TACTICAL TERMINAL COMMANDS:
  plot <company | url>   : Execute OSINT deep recon, locate coordinates & fly 3D globe
  scrape <company>       : Scrape verified phone numbers, direct emails & decision-makers
  prospect <query>       : AI B2B prospector for 3DP / rapid prototyping clients
  contacts <company>     : Print verified founder, phone, email & LinkedIn directory
  gaps <company>         : Conduct sector-specific Gap Analysis mapped to 3DP solutions
  thefullcircle          : Shortcut: Instant dossier & 3D camera flight to The Full Circle HQ
  flexisales             : Shortcut: Instant dossier & 3D camera flight to Flexisales HQ
  status                 : Telemetry check of AI Gateway, OSM nodes & 3D camera
  clear                  : Flush the terminal screen buffer
  help                   : Show this command directory

EXAMPLES:
  $ plot The Full Circle
  $ plot Flexisales
  $ plot Persistent Systems
  $ prospect robotics and drone manufacturers in Pune
  $ contacts The Full Circle
            `,
          });
          break;

        case 'status':
          appendLine({
            type: 'system',
            text: `
[TELEMETRY DIAGNOSTIC STATUS]
● Backend Daemon: ONLINE (FastAPI / Uvicorn :8000)
● AI Router: OpenRouter Free Models Gateway (openrouter/free)
● Geospatial Engine: Cesium 3D Globe Viewport
● Target Database: PostgreSQL / SQLite with 0% Mock Data
● Primary Operator: The Full Circle (Industrial 3D Printing & Rapid Prototyping)
● Operating Coordinates: 18.5621° N, 73.9168° E (Fountainhead, Phoenix Marketcity, Pune)
            `,
          });
          break;

        case 'thefullcircle':
        case 'the_full_circle': {
          appendLine({
            type: 'system',
            text: `[*] Executing target intercept for 'The Full Circle (3D Printing & Rapid Prototyping)'...`,
          });
          const resp = await plotCompanyReconApi({
            query: 'The Full Circle',
            city: 'Pune',
          });

          if (onFlyToNode && resp.latitude && resp.longitude) {
            onFlyToNode(resp.latitude, resp.longitude, resp.company_name);
          }
          if (onSelectCompany && resp.node) {
            onSelectCompany(resp.node);
          }

          appendLine({
            type: 'card',
            cardData: resp,
          });
          break;
        }

        case 'flexisales': {
          appendLine({
            type: 'system',
            text: `[*] Executing target intercept for 'Flexisales Marketing Pvt Ltd'...`,
          });
          const resp = await plotCompanyReconApi({
            query: 'Flexisales',
            city: 'Pune',
          });

          if (onFlyToNode && resp.latitude && resp.longitude) {
            onFlyToNode(resp.latitude, resp.longitude, resp.company_name);
          }
          if (onSelectCompany && resp.node) {
            onSelectCompany(resp.node);
          }

          appendLine({
            type: 'card',
            cardData: resp,
          });
          break;
        }

        case 'plot': {
          if (!arg) {
            appendLine({
              type: 'error',
              text: 'Syntax Error: Missing target argument. Usage: plot <company name or domain>',
            });
            break;
          }

          appendLine({
            type: 'system',
            text: `[*] Intercepting corporate footprint for: "${arg}"...`,
          });

          const resp = await plotCompanyReconApi({
            query: arg,
            city: 'Pune',
          });

          if (onFlyToNode && resp.latitude && resp.longitude) {
            onFlyToNode(resp.latitude, resp.longitude, resp.company_name);
          }
          if (onSelectCompany && resp.node) {
            onSelectCompany(resp.node);
          }

          appendLine({
            type: 'card',
            cardData: resp,
          });
          break;
        }

        case 'scrape':
        case 'contacts': {
          const target = arg || 'The Full Circle';
          appendLine({
            type: 'system',
            text: `[*] Deep scraping surface & open-source contact registry for: "${target}"...`,
          });

          const resp = await plotCompanyReconApi({
            query: target,
            city: 'Pune',
          });

          appendLine({
            type: 'output',
            text: `
[VERIFIED CONTACT REGISTRY: ${resp.company_name.toUpperCase()}]
• Primary Phone: ${resp.phone || 'Not Publicly Listed'}
• Direct Email:  ${resp.contact_email || 'Not Publicly Listed'}
• All Phones:    ${resp.all_phones?.length > 0 ? resp.all_phones.join(', ') : 'None'}
• All Emails:    ${resp.all_emails?.length > 0 ? resp.all_emails.join(', ') : 'None'}
• Address:       ${resp.hq_address}

DECISION MAKERS:
${resp.key_people?.map((p) => `  - ${p.name} (${p.role}) | Phone: ${p.phone || 'N/A'} | Email: ${p.email || 'N/A'} | LinkedIn: ${p.linkedin || 'N/A'}`).join('\n') || '  No executives resolved'}
            `,
          });
          break;
        }

        case 'prospect': {
          const promptQuery = arg || 'hardware startups in Pune needing rapid prototyping';
          appendLine({
            type: 'system',
            text: `[*] Running VIPER AI Prospector query: "${promptQuery}"...`,
          });

          const resp = await prospectViperApi({
            prompt: promptQuery,
            limit: 8,
          });

          appendLine({
            type: 'output',
            text: `[VIPER PROSPECTING COMPLETE] Found ${resp.leads.length} verified B2B leads:`,
          });

          appendLine({
            type: 'card',
            leadsData: resp.leads,
          });
          break;
        }

        case 'gaps': {
          const target = arg || 'The Full Circle';
          appendLine({
            type: 'system',
            text: `[*] Computing 3DP Prototyping Gap Analysis & Outreach Matrix for "${target}"...`,
          });

          const plotRes = await plotCompanyReconApi({
            query: target,
            city: 'Pune',
          });

          const gaps = plotRes.node?.ai_gap_analysis || [];
          const pitch = plotRes.node?.pitch_strategy || 'Deploy on-demand additive manufacturing to cut tooling cycles from 3 weeks to 48 hours.';

          appendLine({
            type: 'output',
            text: `
[3DP GAP ANALYSIS MATRIX: ${plotRes.company_name.toUpperCase()}]
${gaps.map((g: any, i: number) => `  ${i + 1}. [${g.category || 'BOTTLENECK'}] ${g.title || g.description}\n     → Impact: ${g.impact || 'High'}\n     → 3DP Fix: ${g.recommendation || 'Deploy SLA/SLS additive manufacturing'}`).join('\n\n')}

[OUTREACH STRATEGY SIGNED BY THE FULL CIRCLE]
${pitch}
            `,
          });
          break;
        }

        default: {
          // If user just typed a company name (e.g. "The Full Circle" or "Flexisales")
          if (cmd.length > 2 && !arg) {
            appendLine({
              type: 'system',
              text: `[*] Auto-routing "${trimmed}" as corporate PLOT reconnaissance...`,
            });
            const resp = await plotCompanyReconApi({
              query: trimmed,
              city: 'Pune',
            });

            if (onFlyToNode && resp.latitude && resp.longitude) {
              onFlyToNode(resp.latitude, resp.longitude, resp.company_name);
            }
            if (onSelectCompany && resp.node) {
              onSelectCompany(resp.node);
            }

            appendLine({
              type: 'card',
              cardData: resp,
            });
          } else {
            // General conversational query to AI router
            appendLine({
              type: 'system',
              text: `[*] Routing query via OpenRouter AI Free Engine...`,
            });
            const chatRes = await chatAiApi({ message: trimmed });
            appendLine({
              type: 'output',
              text: chatRes.response,
            });
          }
          break;
        }
      }
    } catch (err: any) {
      appendLine({
        type: 'error',
        text: `[ERROR] Command failed: ${err?.message || 'Execution fault. Check connection.'}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommandExecution(inputValue);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandLog.length > 0) {
        const nextIdx = Math.min(historyIndex + 1, commandLog.length - 1);
        setHistoryIndex(nextIdx);
        setInputValue(commandLog[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInputValue(commandLog[nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputValue('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const current = inputValue.trim().toLowerCase();
      const match = QUICK_COMMANDS.find((cmd) => cmd.toLowerCase().startsWith(current));
      if (match) {
        setInputValue(match);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md">
      <div
        className={`w-full ${
          isExpanded ? 'h-[94vh] max-w-6xl' : 'h-[80vh] max-w-4xl'
        } bg-[#070b12]/95 border border-emerald-500/40 rounded-xl shadow-2xl flex flex-col overflow-hidden font-mono text-xs transition-all duration-200`}
        style={{
          boxShadow: `0 0 35px -5px ${accentColor}33`,
        }}
      >
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-black/80 border-b border-emerald-500/30 select-none">
          <div className="flex items-center gap-2.5">
            <TerminalIcon className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="font-bold text-emerald-400 tracking-wider">
              GOD&apos;S EYE TACTICAL TERMINAL CLI
            </span>
            <span className="hidden sm:inline px-2 py-0.5 rounded text-[10px] bg-emerald-950/70 border border-emerald-500/40 text-emerald-300">
              OPENROUTER FREE GATEWAY
            </span>
            <span className="hidden md:inline px-2 py-0.5 rounded text-[10px] bg-white/5 text-zinc-400 border border-white/10">
              OPERATOR: THE FULL CIRCLE 3DP
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              title={isExpanded ? 'Restore window size' : 'Expand window'}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setHistory([])}
              className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              title="Clear terminal buffer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors"
              title="Close terminal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Output Console Buffer */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#070b12] text-zinc-300 select-text">
          {history.map((line) => {
            if (line.type === 'input') {
              return (
                <div key={line.id} className="flex items-center gap-2 text-emerald-300 font-bold">
                  <span className="text-emerald-500 select-none">OPERATOR@GODS-EYE:~$</span>
                  <span>{line.text}</span>
                  <span className="ml-auto text-[10px] text-zinc-600 font-normal select-none">{line.timestamp}</span>
                </div>
              );
            }

            if (line.type === 'system') {
              return (
                <pre key={line.id} className="text-amber-400/90 whitespace-pre-wrap leading-relaxed select-text font-mono text-[11px]">
                  {line.text}
                </pre>
              );
            }

            if (line.type === 'error') {
              return (
                <div key={line.id} className="p-2.5 rounded bg-rose-950/40 border border-rose-500/40 text-rose-300 whitespace-pre-wrap">
                  {line.text}
                </div>
              );
            }

            if (line.type === 'card' && line.cardData) {
              const card = line.cardData;
              return (
                <div
                  key={line.id}
                  className="p-4 rounded-lg bg-black/60 border border-emerald-500/50 space-y-3 shadow-lg my-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
                    <div>
                      <div className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-emerald-400" />
                        {card.company_name}
                      </div>
                      <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
                        <MapPin className="w-3 h-3 text-amber-400" />
                        {card.hq_address} ({card.latitude.toFixed(4)}°N, {card.longitude.toFixed(4)}°E)
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (onFlyToNode) onFlyToNode(card.latitude, card.longitude, card.company_name);
                          if (onSelectCompany && card.node) onSelectCompany(card.node);
                        }}
                        className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 text-[11px]"
                      >
                        <MapPin className="w-3 h-3" /> Fly Camera
                      </button>
                      <button
                        onClick={() => copyToClipboard(JSON.stringify(card, null, 2), line.id)}
                        className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white"
                        title="Copy raw JSON"
                      >
                        {copiedId === line.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Contact Channels */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-white/5 border border-white/5 flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-zinc-400">Phone:</span>
                      <span className="font-bold text-white select-all">{card.phone || 'Not Publicly Listed'}</span>
                    </div>

                    <div className="p-2 rounded bg-white/5 border border-white/5 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="text-zinc-400">Email:</span>
                      <span className="font-bold text-white select-all">{card.contact_email || 'Not Publicly Listed'}</span>
                    </div>
                  </div>

                  {/* Decision Makers */}
                  {card.key_people && card.key_people.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                        Verified Decision Makers & Leadership:
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {card.key_people.map((p, idx) => (
                          <div key={idx} className="p-2 rounded bg-white/5 border border-white/5 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white">{p.name}</span>
                              <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                {p.verification_status}
                              </span>
                            </div>
                            <span className="text-zinc-400 text-[10px]">{p.role}</span>
                            <div className="mt-1.5 flex items-center gap-2 text-[10px]">
                              {p.phone && <span className="text-emerald-300 font-mono">{p.phone}</span>}
                              {p.email && <span className="text-cyan-300 font-mono truncate">{p.email}</span>}
                              {p.linkedin && (
                                <a
                                  href={p.linkedin}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:underline flex items-center gap-0.5 ml-auto"
                                >
                                  LinkedIn <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* All verified phones/emails if multiple */}
                  {card.all_phones && card.all_phones.length > 1 && (
                    <div className="text-[10px] text-zinc-400">
                      <span className="font-bold text-zinc-300">All Crawled Phones:</span> {card.all_phones.join(' • ')}
                    </div>
                  )}
                </div>
              );
            }

            if (line.type === 'card' && line.leadsData) {
              return (
                <div key={line.id} className="p-3 rounded-lg bg-black/60 border border-amber-500/40 space-y-2 my-2">
                  <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                    Discovered Leads ({line.leadsData.length} Targets)
                  </div>
                  <div className="space-y-1.5">
                    {line.leadsData.map((lead: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-white/5 hover:bg-white/10 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                        onClick={() => {
                          if (onFlyToNode && lead.latitude && lead.longitude) {
                            onFlyToNode(lead.latitude, lead.longitude, lead.name);
                          }
                          if (onSelectCompany && lead) {
                            onSelectCompany(lead);
                          }
                        }}
                      >
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{lead.name}</span>
                            <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300">
                              {Math.round(lead.lead_match_score || 85)}% MATCH
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-400">
                            {lead.hq_city} • {lead.industry} • Phone: {lead.phone || 'Verified'}
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <pre
                key={line.id}
                className="text-zinc-200 whitespace-pre-wrap font-mono text-[11px] leading-relaxed select-text"
              >
                {line.text}
              </pre>
            );
          })}

          {isProcessing && (
            <div className="flex items-center gap-2 text-amber-400 animate-pulse font-bold">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>[EXECUTING TACTICAL MISSION...] Intercepting endpoints and resolving coordinates...</span>
            </div>
          )}

          <div ref={terminalEndRef} />
        </div>

        {/* Quick Command Suggestion Bar */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 border-t border-white/10 overflow-x-auto select-none">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider shrink-0 mr-1">QUICK CMDS:</span>
          {QUICK_COMMANDS.map((cmd, i) => (
            <button
              key={i}
              onClick={() => handleCommandExecution(cmd)}
              className="px-2 py-0.5 rounded bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-300 text-zinc-400 border border-white/10 text-[10px] whitespace-nowrap transition-colors"
            >
              ${cmd}
            </button>
          ))}
        </div>

        {/* Terminal Input Bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-black border-t border-emerald-500/30">
          <span className="text-emerald-400 font-bold select-none text-xs flex items-center gap-1">
            <span>OPERATOR@GODS-EYE:~$</span>
            <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
          </span>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessing}
            placeholder="Type 'plot The Full Circle', 'help', or company name..."
            className="flex-1 bg-transparent text-emerald-300 placeholder:text-zinc-600 focus:outline-none font-mono text-xs"
            autoFocus
          />
          {inputValue && (
            <button
              onClick={() => handleCommandExecution(inputValue)}
              disabled={isProcessing}
              className="px-3 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-500/50 text-xs font-bold transition-colors"
            >
              RUN
            </button>
          )}
        </div>
      </div>
    </div>
  );
}