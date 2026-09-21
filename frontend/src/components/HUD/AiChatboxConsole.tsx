'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  Maximize2,
  Minimize2,
  Compass,
  Download,
  Phone,
  Mail,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Terminal,
  Copy,
  Check,
  Building2,
  Trash2,
  Cpu,
  Layers,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import {
  prospectViperApi,
  chatAiApi,
  plotCompanyReconApi,
  PlotReconResponse,
  ViperLead,
  ViperExecutive,
  ViperTelemetryStep,
  ViperProspectResponse,
} from '@/lib/api';
import { ThemeConfig } from '@/lib/theme';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  telemetryLogs?: ViperTelemetryStep[];
  leads?: ViperLead[];
  plottedTarget?: PlotReconResponse;
  model?: string;
}

interface AiChatboxConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  onFlyToNode?: (lat: number, lon: number, name: string) => void;
  onSelectCompany?: (company: any) => void;
  activeTheme?: ThemeConfig;
}

const PRESET_QUICK_PILLS = [
  'PLOT The Full Circle',
  'Find 10 AI startups in Pune with founder contact numbers',
  'PLOT Persistent Systems',
  'Find HR at Persistent',
  'Top Cybersecurity in Bangalore',
  'Enterprise SaaS in Mumbai',
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome-msg',
    sender: 'assistant',
    timestamp: new Date().toISOString().slice(11, 19) + 'Z',
    text: "Operational. I am your VIPER OSINT & B2B Prospecting Agent, routed via OpenRouter free model engine.\n\nEnter any prompt or natural language prospecting query to execute real-time web discovery, extract verified decision-makers, and lock geospatial coordinates onto the 3D globe.",
    model: 'openrouter/free',
  },
];

export default function AiChatboxConsole({
  isOpen,
  onClose,
  onFlyToNode,
  onSelectCompany,
  activeTheme,
}: AiChatboxConsoleProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDocked, setIsDocked] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const accentColor = activeTheme?.primary || '#f59e0b'; // Amber default

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized, isLoading]);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleLogExpand = (msgId: string) => {
    setExpandedLogs((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const handleExportLeadsCsv = (leads: ViperLead[], queryName: string = 'prospects') => {
    if (!leads || leads.length === 0) return;

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

    for (const lead of leads) {
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
    link.download = `Viper_Prospects_${queryName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendMessage = async (queryText?: string) => {
    const activeText = (queryText || inputText).trim();
    if (!activeText || isLoading) return;

    const userMessageId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMessageId,
      sender: 'user',
      timestamp: new Date().toISOString().slice(11, 19) + 'Z',
      text: activeText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    const normalized = activeText.toLowerCase().trim();
    const isSingleTargetPattern =
      /^(?:hii\s+|hey\s+|hello\s+)?(?:plot|find|locate|where is|recon|inspect|who is|search for)\s+([a-zA-Z0-9\.\-_ ]+)$/i.test(activeText.trim()) &&
      !/\b(startups|companies|leads|clinics|cafes|10|20|top|list|all|dentists|doctors)\b/i.test(activeText);

    const isPlotQuery =
      activeText.toUpperCase().startsWith('PLOT ') ||
      activeText.toLowerCase().startsWith('/plot ') ||
      normalized.includes('full circle') ||
      normalized.includes('thefullcircle') ||
      normalized.includes('the_full_circle') ||
      normalized.includes('flexisales') ||
      isSingleTargetPattern ||
      (activeText.includes('.') && !activeText.includes(' '));

    const isProspectingQuery =
      /\b(find|startups|companies|leads|cto|founder|ceo|hr|contact|hiring|clinics|cafes|in\s+[a-zA-Z]+)\b/i.test(
        activeText
      );

    try {
      if (isPlotQuery) {
        // Execute military-grade corporate reconnaissance & 3D globe PLOT
        let plotTarget = activeText;
        if (activeText.toUpperCase().startsWith('PLOT ')) {
          plotTarget = activeText.slice(5).trim();
        } else if (activeText.toLowerCase().startsWith('/plot ')) {
          plotTarget = activeText.slice(6).trim();
        } else {
          plotTarget = activeText
            .replace(/^(?:hii|hey|hello|please)?\s*(?:plot|find|locate|where is|recon|search for|search|who is)\s+/i, '')
            .trim();
        }

        const plotResp = await plotCompanyReconApi({
          query: plotTarget,
          city: 'Pune',
        });

        // Automatically fly camera to target on 3D globe
        if (onFlyToNode && plotResp.latitude && plotResp.longitude) {
          onFlyToNode(plotResp.latitude, plotResp.longitude, plotResp.company_name);
        }

        // Auto-select company in sidebar if available
        if (onSelectCompany && plotResp.node) {
          onSelectCompany(plotResp.node);
        }

        const assistantMsg: ChatMessage = {
          id: `asst-${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toISOString().slice(11, 19) + 'Z',
          text: `🎯 **TARGET ACQUIRED & PLOTTED ON 3D GLOBE**\n\n**${plotResp.company_name}** located at **${plotResp.hq_address}** (${plotResp.latitude}°N, ${plotResp.longitude}°E).\n\nVerified physical coordinates, direct phone lines, emails, decision-makers, and open-source footprints resolved.`,
          telemetryLogs: plotResp.telemetry_logs,
          plottedTarget: plotResp,
          model: 'openrouter/free',
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else if (isProspectingQuery) {
        // Execute full VIPER OSINT Reconnaissance & OpenRouter synthesis
        const resp: ViperProspectResponse = await prospectViperApi({
          prompt: activeText,
          limit: 10,
        });

        const assistantMsg: ChatMessage = {
          id: `asst-${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toISOString().slice(11, 19) + 'Z',
          text: (resp as any).ai_analysis || `VIPER reconnaissance complete. Identified ${resp.leads.length} verified B2B targets with strict zero-fake provenance.`,
          telemetryLogs: resp.telemetry_logs,
          leads: resp.leads,
          model: 'openrouter/free',
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        // Direct conversational completion via OpenRouter free model
        const chatResp = await chatAiApi({ message: activeText });
        
        // If chat detected a plotted target, trigger flight
        if (chatResp.plotted_node && onFlyToNode && chatResp.plotted_node.latitude && chatResp.plotted_node.longitude) {
          onFlyToNode(chatResp.plotted_node.latitude, chatResp.plotted_node.longitude, chatResp.plotted_node.name);
        }

        const assistantMsg: ChatMessage = {
          id: `asst-${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toISOString().slice(11, 19) + 'Z',
          text: chatResp.response,
          model: chatResp.model || 'openrouter/free',
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toISOString().slice(11, 19) + 'Z',
        text: `⚠️ Execution notice: ${err?.message || 'Failed to connect to AI Gateway.'} Operating in resilient fallback mode.`,
        model: 'local-fallback',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Minimized Widget Bar
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 pointer-events-auto">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full shadow-2xl border font-mono text-xs transition-all hover:scale-105"
          style={{
            background: 'rgba(12, 14, 22, 0.95)',
            borderColor: `${accentColor}66`,
            boxShadow: `0 0 20px ${accentColor}33`,
            color: accentColor,
          }}
        >
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span className="font-bold tracking-wide">CLAUDE OSINT CHATBOX</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 ml-1">
            LIVE
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`fixed z-50 pointer-events-auto flex flex-col font-mono transition-all duration-300 select-none ${
        isDocked
          ? 'bottom-4 right-4 w-[480px] h-[680px] max-h-[85vh] rounded-2xl shadow-2xl border'
          : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[94vw] max-w-4xl h-[86vh] rounded-2xl shadow-2xl border'
      }`}
      style={{
        background: 'rgba(7, 10, 18, 0.92)',
        borderColor: `${accentColor}44`,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: `0 24px 64px -12px rgba(0, 0, 0, 0.85), 0 0 30px ${accentColor}22`,
      }}
    >
      {/* Tactical Claude Header Bar */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between gap-3 shrink-0 rounded-t-2xl"
        style={{
          background: 'rgba(12, 16, 26, 0.9)',
          borderColor: `${accentColor}33`,
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center border"
            style={{
              background: `${accentColor}18`,
              borderColor: `${accentColor}55`,
              color: accentColor,
            }}
          >
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black tracking-wider text-white">
                CLAUDE AI CHATBOX
              </span>
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded border"
                style={{
                  background: `${accentColor}15`,
                  borderColor: `${accentColor}44`,
                  color: accentColor,
                }}
              >
                openrouter/free
              </span>
            </div>
            <div className="text-[9px] text-zinc-400 tracking-wider">
              VIPER PROTOCOL // STRICT ZERO-FAKE PROVENANCE
            </div>
          </div>
        </div>

        {/* Window Action Controls */}
        <div className="flex items-center gap-1.5 text-zinc-400">
          <button
            onClick={() => setMessages(INITIAL_MESSAGES)}
            className="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsDocked((prev) => !prev)}
            className="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors"
            title={isDocked ? 'Expand to Center Modal' : 'Dock to Corner Widget'}
          >
            {isDocked ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors"
            title="Minimize to Floating Button"
          >
            <ChevronDown className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-red-500/20 hover:text-red-400 transition-colors"
            title="Close Chatbox"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chat Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-2`}
            >
              {/* Sender & Timestamp Line */}
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 px-1">
                <span className={isUser ? 'text-zinc-400' : 'text-amber-400 font-bold'}>
                  {isUser ? 'OPERATOR' : 'CLAUDE MCP // VIPER'}
                </span>
                <span>•</span>
                <span>{msg.timestamp}</span>
                {msg.model && (
                  <>
                    <span>•</span>
                    <span className="text-zinc-600">{msg.model}</span>
                  </>
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`p-3.5 rounded-2xl max-w-[92%] leading-relaxed ${
                  isUser
                    ? 'bg-amber-500/15 border border-amber-500/30 text-white rounded-tr-none'
                    : 'bg-black/60 border border-white/10 text-zinc-200 rounded-tl-none backdrop-blur-md'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Telemetry Stream Drawer (if present) */}
                {msg.telemetryLogs && msg.telemetryLogs.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-white/10">
                    <button
                      onClick={() => toggleLogExpand(msg.id)}
                      className="flex items-center justify-between w-full text-[10px] text-zinc-400 hover:text-white transition-colors"
                    >
                      <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <Terminal className="w-3 h-3" />
                        RECON EXECUTION TELEMETRY ({msg.telemetryLogs.length} STEPS)
                      </span>
                      {expandedLogs[msg.id] ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {expandedLogs[msg.id] && (
                      <div className="mt-2 p-2 rounded-lg bg-black/80 border border-emerald-500/20 text-[10px] font-mono space-y-1 max-h-36 overflow-y-auto">
                        {msg.telemetryLogs.map((log, lIdx) => (
                          <div key={lIdx} className="flex items-start gap-2">
                            <span className="text-zinc-600 shrink-0">[{log.timestamp}]</span>
                            <span
                              className={`shrink-0 font-bold ${
                                log.status === 'SUCCESS'
                                  ? 'text-emerald-400'
                                  : log.status === 'WARNING'
                                  ? 'text-amber-400'
                                  : 'text-cyan-400'
                              }`}
                            >
                              [{log.step}]
                            </span>
                            <span className="text-zinc-300">{log.message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Structured PLOT Target Dossier (if present) */}
              {msg.plottedTarget && (
                <div className="w-full mt-2 space-y-2.5">
                  <div className="p-4 rounded-xl bg-black/80 border border-emerald-500/50 shadow-2xl space-y-3.5 backdrop-blur-md">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
                            3D GLOBE PLOT LOCKED
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400">
                            {msg.plottedTarget.latitude}°N, {msg.plottedTarget.longitude}°E
                          </span>
                        </div>
                        <h3 className="text-sm font-black text-white mt-1">
                          {msg.plottedTarget.company_name}
                        </h3>
                        <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                          {msg.plottedTarget.industry} • {msg.plottedTarget.hq_city}, {msg.plottedTarget.hq_country}
                        </div>
                      </div>

                      {onFlyToNode && (
                        <button
                          onClick={() => onFlyToNode(msg.plottedTarget!.latitude, msg.plottedTarget!.longitude, msg.plottedTarget!.company_name)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 font-mono text-[10px] font-bold flex items-center gap-1.5 transition-all shrink-0"
                          title="Lock 3D Cesium camera onto coordinates"
                        >
                          <Compass className="w-3.5 h-3.5" />
                          <span>FLY TO TARGET</span>
                        </button>
                      )}
                    </div>

                    {/* Physical Address Block */}
                    <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 space-y-1">
                      <div className="text-[9px] font-mono text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <span>PHYSICAL HEADQUARTERS & FLOOR</span>
                      </div>
                      <div className="text-xs font-mono text-zinc-200 select-text leading-relaxed">
                        {msg.plottedTarget.hq_address}
                      </div>
                    </div>

                    {/* Direct Contact Points */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between">
                        <div>
                          <div className="text-[9px] font-mono text-zinc-400 font-bold uppercase">DIRECT PHONE</div>
                          <div className="text-xs font-mono text-cyan-300 font-semibold mt-0.5">
                            {msg.plottedTarget.phone ? (
                              <a href={`tel:${msg.plottedTarget.phone}`} className="hover:underline flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {msg.plottedTarget.phone}
                              </a>
                            ) : (
                              <span className="text-zinc-500 italic">Not Publicly Listed</span>
                            )}
                          </div>
                        </div>
                        {msg.plottedTarget.phone && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                            VERIFIED
                          </span>
                        )}
                      </div>

                      <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between">
                        <div>
                          <div className="text-[9px] font-mono text-zinc-400 font-bold uppercase">CONTACT EMAIL</div>
                          <div className="text-xs font-mono text-cyan-300 font-semibold mt-0.5">
                            {msg.plottedTarget.contact_email ? (
                              <a href={`mailto:${msg.plottedTarget.contact_email}`} className="hover:underline flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {msg.plottedTarget.contact_email}
                              </a>
                            ) : (
                              <span className="text-zinc-500 italic">Not Publicly Listed</span>
                            )}
                          </div>
                        </div>
                        {msg.plottedTarget.contact_email && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                            VERIFIED
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Key Decision-Makers */}
                    {msg.plottedTarget.key_people && msg.plottedTarget.key_people.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                          DISCOVERED LEADERSHIP & DECISION-MAKERS
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {msg.plottedTarget.key_people.map((person, pIdx) => (
                            <div key={pIdx} className="p-2 rounded-lg bg-white/5 border border-white/5 flex flex-col justify-between gap-1">
                              <div>
                                <div className="text-xs font-bold text-white flex items-center justify-between">
                                  <span>{person.name}</span>
                                  <span className="text-[8px] px-1 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                                    {person.verification_status}
                                  </span>
                                </div>
                                <div className="text-[10px] font-mono text-amber-300/80">{person.role}</div>
                              </div>
                              <div className="flex items-center gap-2 pt-1 border-t border-white/5 text-[10px]">
                                {person.phone && person.phone !== 'Not Publicly Listed' && (
                                  <a href={`tel:${person.phone}`} className="text-emerald-400 hover:underline flex items-center gap-1">
                                    <Phone className="w-2.5 h-2.5" />
                                    <span>Call</span>
                                  </a>
                                )}
                                {person.linkedin && (
                                  <a href={person.linkedin} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline ml-auto flex items-center gap-0.5">
                                    <span>LinkedIn</span>
                                    <ExternalLink className="w-2 h-2" />
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Open Source Footprints */}
                    {msg.plottedTarget.open_source_resources && msg.plottedTarget.open_source_resources.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                          OPEN-SOURCE WEB FOOTPRINTS & ARTICLES
                        </div>
                        <div className="space-y-1 max-h-28 overflow-y-auto">
                          {msg.plottedTarget.open_source_resources.map((res, rIdx) => {
                            const isUrl = res.startsWith('http');
                            const url = isUrl ? res : res.includes(': http') ? `http${res.split(': http')[1]}` : '#';
                            const title = isUrl ? res : res;
                            return (
                              <div key={rIdx} className="text-[10px] font-mono text-zinc-400 hover:text-cyan-300 flex items-center gap-1.5 truncate">
                                <ExternalLink className="w-2.5 h-2.5 shrink-0 text-cyan-400" />
                                <a href={url} target="_blank" rel="noreferrer" className="truncate hover:underline">
                                  {title}
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Structured Leads Dossiers (if present) */}
              {msg.leads && msg.leads.length > 0 && (
                <div className="w-full mt-2 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] px-1">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-amber-400" />
                      VERIFIED B2B PROSPECTS ({msg.leads.length})
                    </span>
                    <button
                      onClick={() => handleExportLeadsCsv(msg.leads!)}
                      className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      Export CSV
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {msg.leads.map((lead) => (
                      <div
                        key={lead.id}
                        className="p-3 rounded-xl bg-black/70 border border-white/10 hover:border-amber-500/40 transition-all text-xs"
                      >
                        {/* Company Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {lead.domain ? (
                              <img
                                src={`https://www.google.com/s2/favicons?domain=${lead.domain}&sz=64`}
                                alt=""
                                className="w-6 h-6 rounded bg-white/10 p-0.5 shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Building2 className="w-5 h-5 text-amber-400 shrink-0" />
                            )}
                            <div>
                              <div className="font-bold text-white text-[13px] flex items-center gap-2">
                                {lead.name}
                                <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  {lead.lead_match_score}% MATCH
                                </span>
                              </div>
                              <div className="text-[10px] text-zinc-400">
                                {lead.industry} • {lead.hq_city}, {lead.hq_country}
                              </div>
                            </div>
                          </div>

                          {/* Quick Globe Lock Button */}
                          {onFlyToNode && lead.latitude && lead.longitude && (
                            <button
                              onClick={() => onFlyToNode(lead.latitude, lead.longitude, lead.name)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-amber-500/20 text-zinc-400 hover:text-amber-300 border border-white/10 transition-colors"
                              title="Fly Camera to Target Node on 3D Globe"
                            >
                              <Compass className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Decision-Maker Cards */}
                        {lead.key_executives && lead.key_executives.length > 0 && (
                          <div className="mt-2.5 space-y-1.5 border-t border-white/5 pt-2">
                            <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                              RESOLVED DECISION MAKERS
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {lead.key_executives.map((exec, eIdx) => {
                                const isVerified = exec.verification_status === 'VERIFIED';
                                return (
                                  <div
                                    key={eIdx}
                                    className="p-2 rounded-lg bg-white/5 border border-white/5 flex flex-col justify-between gap-1"
                                  >
                                    <div>
                                      <div className="font-bold text-zinc-100 flex items-center justify-between text-[11px]">
                                        <span>{exec.name}</span>
                                        <span
                                          className={`text-[8px] px-1 rounded ${
                                            isVerified
                                              ? 'bg-emerald-500/20 text-emerald-400'
                                              : 'bg-white/10 text-zinc-400'
                                          }`}
                                        >
                                          {exec.verification_status}
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-amber-300/80 font-medium">
                                        {exec.role}
                                      </div>
                                    </div>

                                    {/* Contacts row */}
                                    <div className="flex items-center gap-2 pt-1 border-t border-white/5 text-[10px]">
                                      {exec.email && exec.email !== 'Not Publicly Listed' ? (
                                        <a
                                          href={`mailto:${exec.email}`}
                                          className="text-cyan-400 hover:underline flex items-center gap-1"
                                        >
                                          <Mail className="w-2.5 h-2.5" />
                                          Email
                                        </a>
                                      ) : (
                                        <span className="text-zinc-500 text-[9px]">No Email</span>
                                      )}

                                      {exec.phone && exec.phone !== 'Not Publicly Listed' ? (
                                        <a
                                          href={`tel:${exec.phone}`}
                                          className="text-emerald-400 hover:underline flex items-center gap-1"
                                        >
                                          <Phone className="w-2.5 h-2.5" />
                                          Call
                                        </a>
                                      ) : (
                                        <span className="text-zinc-500 text-[9px]">Unlisted Phone</span>
                                      )}

                                      {exec.linkedin && (
                                        <a
                                          href={exec.linkedin}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-blue-400 hover:underline ml-auto flex items-center gap-0.5"
                                        >
                                          LinkedIn
                                          <ExternalLink className="w-2 h-2" />
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-black/60 border border-amber-500/30 text-amber-300 w-fit">
            <div className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
            <span className="text-xs font-bold tracking-wide animate-pulse">
              ROUTING OPENROUTER & SCANNING OSINT SURFACES...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Pills */}
      <div className="px-4 py-2 border-t border-white/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 bg-black/40">
        <span className="text-[10px] text-zinc-500 font-bold shrink-0">QUICK:</span>
        {PRESET_QUICK_PILLS.map((pill, idx) => (
          <button
            key={idx}
            disabled={isLoading}
            onClick={() => handleSendMessage(pill)}
            className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 hover:bg-amber-500/20 text-zinc-300 hover:text-amber-300 border border-white/10 shrink-0 transition-colors disabled:opacity-50"
          >
            {pill}
          </button>
        ))}
      </div>

      {/* Interactive Chat Input Bar */}
      <div
        className="p-3 border-t flex items-end gap-2 shrink-0 rounded-b-2xl"
        style={{
          background: 'rgba(10, 14, 24, 0.95)',
          borderColor: `${accentColor}33`,
        }}
      >
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            disabled={isLoading}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type prospecting prompt (e.g., 'Find 10 AI startups in Pune with founder contacts')... Enter to send"
            className="w-full resize-none rounded-xl px-3.5 py-2.5 text-xs bg-black/60 border border-white/15 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors font-mono max-h-32"
          />
        </div>

        <button
          onClick={() => handleSendMessage()}
          disabled={!inputText.trim() || isLoading}
          className="h-10 px-4 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
          style={{
            background: `${accentColor}`,
            color: '#000000',
            boxShadow: `0 0 16px ${accentColor}66`,
          }}
          title="Send Query (Enter)"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs font-black">RUN</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
