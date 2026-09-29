/**
 * api.ts — Client-side API integration for God's Eye for Business backend.
 */

// If running in browser, relative '/api' utilizes Next.js rewrite proxy to FastAPI (port 8000).
// If NEXT_PUBLIC_BACKEND_URL is explicitly set, use that.
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  (typeof window !== 'undefined' ? '/api' : 'http://127.0.0.1:8000/api');

export async function fetchCompaniesApi(industry?: string, country?: string, limit: number = 500) {
  const params = new URLSearchParams();
  if (industry) params.append('industry', industry);
  if (country) params.append('country', country);
  if (limit) params.append('limit', String(limit));

  const url = `${BACKEND_URL}/companies${params.toString() ? '?' + params.toString() : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch companies: ${res.statusText}`);
  }
  return await res.json();
}

export async function fetchCompanyDetailsApi(companyId: string) {
  const res = await fetch(`${BACKEND_URL}/companies/${companyId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch company details: ${res.statusText}`);
  }
  return await res.json();
}

export async function fetchCompanyNewsApi(companyId: string) {
  const res = await fetch(`${BACKEND_URL}/companies/${companyId}/news`);
  if (!res.ok) {
    throw new Error(`Failed to fetch company news: ${res.statusText}`);
  }
  return await res.json();
}

export async function fetchCompanyOsintApi(companyId: string) {
  const res = await fetch(`${BACKEND_URL}/companies/${companyId}/osint`);
  if (!res.ok) {
    throw new Error(`Failed to fetch company osint: ${res.statusText}`);
  }
  return await res.json();
}

export async function saveProfileApi(profileData: any) {
  const res = await fetch(`${BACKEND_URL}/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profileData),
  });
  if (!res.ok) {
    throw new Error(`Failed to save profile: ${res.statusText}`);
  }
  return await res.json();
}

export async function fetchActiveProfileApi() {
  const res = await fetch(`${BACKEND_URL}/profile`);
  if (!res.ok) {
    throw new Error(`Failed to fetch active profile: ${res.statusText}`);
  }
  return await res.json();
}

export interface DiscoveryApiParams {
  target_city_or_region?: string;
  company_size_filter?: string;
  industry_override?: string;
  region_override?: string;
  max_companies?: number;
}

export async function triggerDiscoveryApi(params?: DiscoveryApiParams) {
  const res = await fetch(`${BACKEND_URL}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params || {}),
  });
  if (!res.ok) {
    throw new Error(`Failed to trigger discovery scan: ${res.statusText}`);
  }
  return await res.json();
}

export async function saveCampaignStatusApi(
  companyId: string,
  outreachStatus: string,
  customNotes?: string
) {
  const res = await fetch(`${BACKEND_URL}/campaign/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      company_id: companyId,
      outreach_status: outreachStatus,
      custom_notes: customNotes,
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to update campaign status: ${res.statusText}`);
  }
  return await res.json();
}

export async function fetchCampaignsApi(statusFilter?: string) {
  const params = new URLSearchParams();
  if (statusFilter) params.append('status_filter', statusFilter);
  const url = `${BACKEND_URL}/campaign${params.toString() ? '?' + params.toString() : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch campaigns: ${res.statusText}`);
  }
  return await res.json();
}

export function getCampaignExportUrl(statusFilter?: string) {
  const params = new URLSearchParams();
  if (statusFilter) params.append('status_filter', statusFilter);
  return `${BACKEND_URL}/campaign/export${params.toString() ? '?' + params.toString() : ''}`;
}

export async function downloadCampaignCsvApi(statusFilter?: string) {
  const url = getCampaignExportUrl(statusFilter);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to export CSV: ${res.statusText}`);
  }
  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `gods_eye_leads_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

// -----------------------------------------------------------------------------
// Production Master Upgrade API Methods (OSM Overpass, Search, Enrichment)
// -----------------------------------------------------------------------------

export interface OverpassDiscoveryParams {
  city: string;
  category?: string;
  country?: string;
  radius_meters?: number;
  limit?: number;
}

export async function discoverOverpassApi(params: OverpassDiscoveryParams) {
  const res = await fetch(`${BACKEND_URL}/discovery/overpass`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error(`Overpass discovery failed: ${res.statusText}`);
  }
  return await res.json();
}

export interface FastSearchParams {
  query: string;
  city?: string;
  lat?: number;
  lon?: number;
  radius?: number;
  limit?: number;
}

export interface NewsPulseItem {
  id: string;
  title: string;
  headline?: string;
  source: string;
  source_name: string;
  source_url: string;
  published_at?: string;
  published_date?: string;
  signal_type: string;
  funding_amount?: string;
  city: string;
  latitude: number;
  longitude: number;
  beacon_color?: string;
  summary: string;
}

export async function fastSearchApi(
  queryOrParams: string | FastSearchParams,
  city?: string,
  limit: number = 25
) {
  const params = new URLSearchParams();
  if (typeof queryOrParams === 'string') {
    params.append('q', queryOrParams);
    if (city) params.append('city', city);
    params.append('limit', String(limit));
  } else {
    params.append('q', queryOrParams.query);
    if (queryOrParams.city) params.append('city', queryOrParams.city);
    if (queryOrParams.lat != null) params.append('lat', String(queryOrParams.lat));
    if (queryOrParams.lon != null) params.append('lon', String(queryOrParams.lon));
    if (queryOrParams.radius != null) params.append('radius', String(queryOrParams.radius));
    params.append('limit', String(queryOrParams.limit || 25));
  }
  const res = await fetch(`${BACKEND_URL}/search?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Search failed: ${res.statusText}`);
  }
  return await res.json();
}

export async function fetchNewsPulseApi(city?: string, topic?: string, limit: number = 25): Promise<{ status: string; count: number; results: NewsPulseItem[]; pulse: NewsPulseItem[] }> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (city && city.toLowerCase() !== 'global') params.append('city', city);
  if (topic) params.append('topic', topic);
  const res = await fetch(`${BACKEND_URL}/news/pulse?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch news pulse: ${res.statusText}`);
  }
  return await res.json();
}

export async function enrichCompanyApi(companyId: string) {
  const res = await fetch(`${BACKEND_URL}/enrichment/${companyId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Enrichment failed: ${res.statusText}`);
  }
  return await res.json();
}

export async function fetchCompanyContactsApi(companyId: string) {
  const res = await fetch(`${BACKEND_URL}/companies/${companyId}/contacts`);
  if (!res.ok) {
    throw new Error(`Failed to fetch contacts: ${res.statusText}`);
  }
  return await res.json();
}

export async function fetchCompanyTechnologyApi(companyId: string) {
  const res = await fetch(`${BACKEND_URL}/companies/${companyId}/technology`);
  if (!res.ok) {
    throw new Error(`Failed to fetch technology: ${res.statusText}`);
  }
  return await res.json();
}

export async function fetchCompanySignalsApi(companyId: string) {
  const res = await fetch(`${BACKEND_URL}/companies/${companyId}/signals`);
  if (!res.ok) {
    throw new Error(`Failed to fetch signals: ${res.statusText}`);
  }
  return await res.json();
}

export async function runCompanyGapAnalysisApi(companyId: string) {
  const res = await fetch(`${BACKEND_URL}/companies/${companyId}/gap-analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Failed to run gap analysis: ${res.statusText}`);
  }
  return await res.json();
}

export async function hydrateCompanyContactsApi(companyId: string) {
  const res = await fetch(`${BACKEND_URL}/companies/${companyId}/hydrate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Failed to hydrate company contacts: ${res.statusText}`);
  }
  return await res.json();
}

// -----------------------------------------------------------------------------
// VIPER OSINT, Claude-style MCP Connector & B2B Prospecting
// -----------------------------------------------------------------------------

export interface ViperExecutive {
  name: string;
  role: string;
  linkedin?: string;
  email?: string;
  phone?: string;
  verification_status: string;
  confidence: number;
}

export interface ViperLead {
  id: string;
  name: string;
  domain?: string;
  website?: string;
  logo_url?: string;
  facility_image_url?: string;
  industry: string;
  hq_city: string;
  hq_country: string;
  hq_address?: string;
  latitude: number;
  longitude: number;
  lead_match_score: number;
  confidence_level: string;
  phone?: string;
  contact_email?: string;
  rating: number;
  reviews_count: number;
  operating_hours?: string;
  summary?: string;
  key_executives: ViperExecutive[];
  tech_stack: string[];
  operational_gaps: string[];
  outreach_status: string;
}

export interface ViperTelemetryStep {
  step: string;
  message: string;
  timestamp: string;
  status: 'SUCCESS' | 'INFO' | 'WARNING' | 'ERROR';
}

export interface ViperProspectResponse {
  status: string;
  prompt: string;
  parsed_intent: Record<string, any>;
  total_found: number;
  leads: ViperLead[];
  telemetry_logs: ViperTelemetryStep[];
  generated_at: string;
}

export interface ViperReconResponse {
  status: string;
  company_name: string;
  domain?: string;
  lead?: ViperLead;
  telemetry_logs: ViperTelemetryStep[];
  generated_at: string;
}

export async function prospectViperApi(data: {
  prompt: string;
  location?: string;
  industry?: string;
  limit?: number;
}): Promise<ViperProspectResponse> {
  const res = await fetch(`${BACKEND_URL}/viper/prospect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`VIPER Prospecting failed: ${res.statusText}`);
  }
  return await res.json();
}

export async function reconCompanyApi(data: {
  company_name: string;
  domain?: string;
  city?: string;
}): Promise<ViperReconResponse> {
  const res = await fetch(`${BACKEND_URL}/recon`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`VIPER Recon failed: ${res.statusText}`);
  }
  return await res.json();
}

export interface OpenCorporatesData {
  company_name: string;
  company_number?: string;
  jurisdiction_code?: string;
  incorporation_date?: string;
  dissolution_date?: string;
  company_type?: string;
  current_status?: string;
  registered_address?: string;
  opencorporates_url?: string;
  confidence_score?: number;
  data_source?: string;
  verified?: boolean;
}

export interface RedditDiscussion {
  title: string;
  subreddit: string;
  author: string;
  score: number;
  num_comments: number;
  permalink: string;
  url: string;
  created_utc?: string;
  selftext?: string;
}

export interface CommonCrawlRecord {
  url: string;
  timestamp: string;
  parsed_date?: string;
  mime?: string;
  status?: string;
  length?: number;
  offset?: number;
  filename?: string;
  archive_index?: string;
}

export interface ChatAiResponse {
  status: string;
  message: string;
  response: string;
  model: string;
  plotted_node?: any;
  wikidata?: any;
  gdelt_signals?: GdeltNewsSignal[];
  opencorporates?: OpenCorporatesData | null;
  reddit_discussions?: RedditDiscussion[];
  common_crawl?: CommonCrawlRecord[];
}

export async function chatAiApi(data: {
  message: string;
  system_prompt?: string;
}): Promise<ChatAiResponse> {
  const res = await fetch(`${BACKEND_URL}/viper/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`AI Chat request failed: ${res.statusText}`);
  }
  return await res.json();
}

// -----------------------------------------------------------------------------
// Autonomous Corporate Reconnaissance & 3D Globe PLOT Engine
// -----------------------------------------------------------------------------

export interface PlotReconResponse {
  status: string;
  plotted: boolean;
  query: string;
  company_name: string;
  domain?: string;
  hq_city: string;
  hq_country: string;
  hq_address: string;
  latitude: number;
  longitude: number;
  coordinates: { lat: number; lon: number };
  phone?: string;
  contact_email?: string;
  all_phones: string[];
  all_emails: string[];
  industry: string;
  key_people: Array<{
    name: string;
    role: string;
    email?: string;
    phone?: string;
    linkedin?: string;
    verification_status: string;
    confidence?: number;
  }>;
  open_source_resources: string[];
  lead_match_score: number;
  confidence_level: string;
  wikidata?: any;
  gdelt_signals?: GdeltNewsSignal[];
  opencorporates?: OpenCorporatesData | null;
  reddit_discussions?: RedditDiscussion[];
  common_crawl?: CommonCrawlRecord[];
  node: any;
  telemetry_logs: ViperTelemetryStep[];
}

export async function plotCompanyReconApi(data: {
  query: string;
  city?: string;
}): Promise<PlotReconResponse> {
  const res = await fetch(`${BACKEND_URL}/recon/plot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`PLOT Recon failed: ${res.statusText}`);
  }
  return await res.json();
}

// -----------------------------------------------------------------------------
// GDELT 2.0 Live Signals & Wikidata Knowledge Graph APIs
// -----------------------------------------------------------------------------

export interface GdeltNewsSignal {
  title: string;
  url: string;
  seendate: string;
  domain: string;
  language: string;
  source_country: string;
  signal_type: string;
  source: string;
}

export async function fetchGdeltSignalsApi(query: string, limit: number = 10): Promise<{
  status: string;
  query: string;
  count: number;
  signals: GdeltNewsSignal[];
}> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const res = await fetch(`${BACKEND_URL}/gdelt/signals?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch GDELT signals: ${res.statusText}`);
  }
  return await res.json();
}

export async function searchWikidataApi(query: string, limit: number = 10) {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const res = await fetch(`${BACKEND_URL}/gdelt/wikidata/search?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Wikidata search failed: ${res.statusText}`);
  }
  return await res.json();
}

export async function fetchWikidataEntityApi(entityId: string) {
  const res = await fetch(`${BACKEND_URL}/gdelt/wikidata/entity/${entityId}`);
  if (!res.ok) {
    throw new Error(`Wikidata entity fetch failed: ${res.statusText}`);
  }
  return await res.json();
}

export async function enrichWikidataApi(query: string) {
  const params = new URLSearchParams({ q: query });
  const res = await fetch(`${BACKEND_URL}/gdelt/wikidata/enrich?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Wikidata enrichment failed: ${res.statusText}`);
  }
  return await res.json();
}

// -----------------------------------------------------------------------------
// OpenCorporates, Reddit & Common Crawl Public APIs
// -----------------------------------------------------------------------------

export async function fetchOpenCorporatesApi(query: string): Promise<{
  status: string;
  query: string;
  result: OpenCorporatesData | null;
}> {
  const params = new URLSearchParams({ q: query });
  const res = await fetch(`${BACKEND_URL}/gdelt/opencorporates?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`OpenCorporates fetch failed: ${res.statusText}`);
  }
  return await res.json();
}

export async function fetchRedditDiscussionsApi(query: string, limit: number = 8): Promise<{
  status: string;
  query: string;
  count: number;
  discussions: RedditDiscussion[];
}> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const res = await fetch(`${BACKEND_URL}/gdelt/reddit?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Reddit discussions fetch failed: ${res.statusText}`);
  }
  return await res.json();
}

export async function fetchCommonCrawlArchivesApi(domain: string, limit: number = 10): Promise<{
  status: string;
  domain: string;
  count: number;
  archives: CommonCrawlRecord[];
}> {
  const params = new URLSearchParams({ domain: domain, limit: String(limit) });
  const res = await fetch(`${BACKEND_URL}/gdelt/commoncrawl?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Common Crawl fetch failed: ${res.statusText}`);
  }
  return await res.json();
}



