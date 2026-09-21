/**
 * theme.ts — OsirisAI Style Studio Theme Token System
 * Supports Horus Gold, Phantom Dark, Terminal Green, Crimson Alert, Arctic Cyan, and Blackout presets.
 */

export type ThemePreset = 'horus' | 'phantom' | 'terminal' | 'crimson' | 'arctic' | 'blackout';

export interface ThemeConfig {
  id: ThemePreset;
  name: string;
  primary: string;
  secondary: string;
  glowIntensity: number; // 0 - 100
  critical: string;
  warning: string;
  nominal: string;
  info: string;
}

export const THEME_PRESETS: Record<ThemePreset, ThemeConfig> = {
  horus: {
    id: 'horus',
    name: 'HORUS',
    primary: '#FFB800',
    secondary: '#FF9500',
    glowIntensity: 90,
    critical: '#FF3D3D',
    warning: '#FF9500',
    nominal: '#00E676',
    info: '#448AFF',
  },
  phantom: {
    id: 'phantom',
    name: 'PHANTOM',
    primary: '#A855F7',
    secondary: '#C084FC',
    glowIntensity: 85,
    critical: '#FF3D3D',
    warning: '#FF9500',
    nominal: '#00E676',
    info: '#448AFF',
  },
  terminal: {
    id: 'terminal',
    name: 'TERMINAL',
    primary: '#00E676',
    secondary: '#10B981',
    glowIntensity: 88,
    critical: '#FF3D3D',
    warning: '#FF9500',
    nominal: '#00E676',
    info: '#448AFF',
  },
  crimson: {
    id: 'crimson',
    name: 'CRIMSON',
    primary: '#FF4D5A',
    secondary: '#FF3D3D',
    glowIntensity: 92,
    critical: '#FF3D3D',
    warning: '#FF9500',
    nominal: '#00E676',
    info: '#448AFF',
  },
  arctic: {
    id: 'arctic',
    name: 'ARCTIC',
    primary: '#00F0FF',
    secondary: '#38BDF8',
    glowIntensity: 90,
    critical: '#FF3D3D',
    warning: '#FF9500',
    nominal: '#00E676',
    info: '#448AFF',
  },
  blackout: {
    id: 'blackout',
    name: 'BLACKOUT',
    primary: '#94A3B8',
    secondary: '#64748B',
    glowIntensity: 40,
    critical: '#EF4444',
    warning: '#F59E0B',
    nominal: '#10B981',
    info: '#3B82F6',
  },
};

export function applyThemeTokens(theme: ThemeConfig) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  root.style.setProperty('--tactical-primary', theme.primary);
  root.style.setProperty('--tactical-secondary', theme.secondary);
  root.style.setProperty('--tactical-glow-opacity', String(theme.glowIntensity / 100));
  root.style.setProperty('--tactical-critical', theme.critical);
  root.style.setProperty('--tactical-warning', theme.warning);
  root.style.setProperty('--tactical-nominal', theme.nominal);
  root.style.setProperty('--tactical-info', theme.info);

  try {
    localStorage.setItem('godseye_theme_preset', theme.id);
  } catch {
    // Ignore localStorage exceptions
  }
}

export function getSavedThemePreset(): ThemePreset {
  if (typeof window === 'undefined') return 'horus';
  try {
    const saved = localStorage.getItem('godseye_theme_preset') as ThemePreset;
    if (saved && THEME_PRESETS[saved]) {
      return saved;
    }
  } catch {
    // Ignore
  }
  return 'horus';
}
