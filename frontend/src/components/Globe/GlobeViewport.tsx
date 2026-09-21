'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CompanyNodeData, renderCompanyPins, renderNewsBeacons, setupNodeClickHandler } from '@/lib/nodes';
import { targetLockCamera, flyToGlobalView } from '@/lib/camera';
import { configureCesiumBloom } from '@/lib/bloom';
import { setupPostProcessingStages } from '@/lib/shaders';
import { NewsPulseItem } from '@/lib/api';
import { ThemeConfig } from '@/lib/theme';
import { Globe, Map, Moon, Satellite } from 'lucide-react';

interface GlobeViewportProps {
  companies: CompanyNodeData[];
  selectedCompany: CompanyNodeData | null;
  onSelectCompany: (company: CompanyNodeData) => void;
  visualMode: 'normal' | 'surveillance' | 'retro';
  newsBeacons?: NewsPulseItem[];
  selectedNewsBeacon?: NewsPulseItem | null;
  onSelectNewsBeacon?: (news: NewsPulseItem) => void;
  activeTheme?: ThemeConfig;
  showScanlines?: boolean;
  onViewerReady?: (viewer: any) => void;
}

export default function GlobeViewport({
  companies,
  selectedCompany,
  onSelectCompany,
  visualMode,
  newsBeacons = [],
  selectedNewsBeacon = null,
  onSelectNewsBeacon,
  activeTheme,
  showScanlines = true,
  onViewerReady,
}: GlobeViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const cesiumRef = useRef<any>(null);
  const shaderControllerRef = useRef<any>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<'3D' | '2D' | 'MAP' | 'SAT'>('3D');
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<string>('1.5');

  const accentColor = activeTheme?.primary || '#FFB800';

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    let destroyed = false;

    const handleWindowResize = () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.resize();
      }
    };
    window.addEventListener('resize', handleWindowResize);

    async function loadCesium(): Promise<any> {
      if (typeof window === 'undefined') return null;
      (window as any).CESIUM_BASE_URL = '/cesium';

      if ((window as any).Cesium) return (window as any).Cesium;

      return new Promise((resolve, reject) => {
        const checkWindowCesium = () => {
          if ((window as any).Cesium) return true;
          return false;
        };

        if (checkWindowCesium()) return resolve((window as any).Cesium);

        let timeoutId: any;
        const intervalId = setInterval(() => {
          if (checkWindowCesium()) {
            clearInterval(intervalId);
            clearTimeout(timeoutId);
            resolve((window as any).Cesium);
          }
        }, 50);

        const existingScript = document.querySelector('script[src*="Cesium.js"]') as HTMLScriptElement;
        if (existingScript) {
          existingScript.addEventListener('load', () => {
            if (checkWindowCesium()) resolve((window as any).Cesium);
          });
          existingScript.addEventListener('error', (err) => {
            clearInterval(intervalId);
            clearTimeout(timeoutId);
            reject(err);
          });
        } else {
          const script = document.createElement('script');
          script.src = '/cesium/Cesium.js';
          script.async = true;
          script.onload = () => {
            if (checkWindowCesium()) resolve((window as any).Cesium);
          };
          script.onerror = (err) => {
            clearInterval(intervalId);
            clearTimeout(timeoutId);
            reject(err);
          };
          document.head.appendChild(script);
        }

        timeoutId = setTimeout(() => {
          clearInterval(intervalId);
          if (checkWindowCesium()) {
            resolve((window as any).Cesium);
          } else {
            reject(new Error('Cesium loading timed out after 10 seconds'));
          }
        }, 10000);
      });
    }

    async function initCesium() {
      const Cesium = await loadCesium();
      if (destroyed || !containerRef.current || !Cesium) return;

      cesiumRef.current = Cesium;

      // Provide Cesium Ion token from environment variable
      const rawToken =
        process.env.NEXT_PUBLIC_CESION_ION_TOKEN ||
        process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN ||
        (process.env as any).CESIUM_ION_TOKEN;

      const hasValidToken =
        Boolean(rawToken) &&
        typeof rawToken === 'string' &&
        rawToken.trim() !== '' &&
        !rawToken.includes('placeholder') &&
        !rawToken.includes('your_token');

      if (hasValidToken) {
        Cesium.Ion.defaultAccessToken = (rawToken as string).trim();
      }

      // Hidden credits container
      const creditContainer = document.createElement('div');
      creditContainer.id = 'cesium-credits-hidden';
      creditContainer.style.display = 'none';
      document.body.appendChild(creditContainer);

      // Initialize Cesium Viewer
      const viewer = new Cesium.Viewer(containerRef.current, {
        timeline: false,
        animation: false,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        fullscreenButton: false,
        vrButton: false,
        selectionIndicator: false,
        infoBox: false,
        baseLayer: false,
        creditContainer: creditContainer,
        msaaSamples: 4,
        contextOptions: {
          webgl: { preserveDrawingBuffer: true },
        },
      });

      // Add high-resolution base imagery
      let imageryLoaded = false;
      if (hasValidToken) {
        try {
          const ionProvider = await Cesium.IonImageryProvider.fromAssetId(2);
          viewer.imageryLayers.addImageryProvider(ionProvider);
          imageryLoaded = true;
        } catch (e) {
          console.warn('[Cesium] Ion World Imagery fallback:', e);
        }
      }

      if (!imageryLoaded) {
        try {
          const esriProvider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
            'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
            {
              credit: 'Powered by Esri',
              enablePickFeatures: false,
            }
          );
          viewer.imageryLayers.addImageryProvider(esriProvider);
          imageryLoaded = true;
        } catch (e) {
          try {
            const osmProvider = new Cesium.OpenStreetMapImageryProvider({
              url: 'https://tile.openstreetmap.org/',
            });
            viewer.imageryLayers.addImageryProvider(osmProvider);
          } catch (osmErr) {
            console.warn('[Cesium] Base vector globe:', osmErr);
          }
        }
      }

      viewer.targetFrameRate = 60;
      viewer.scene.globe.show = true;
      viewer.scene.skyAtmosphere.show = true;
      viewer.scene.skyAtmosphere.atmosphereLightIntensity = 16.0;
      viewer.scene.skyAtmosphere.saturationShift = -0.15;
      viewer.scene.skyAtmosphere.brightnessShift = -0.05;

      viewerRef.current = viewer;
      if (onViewerReady) onViewerReady(viewer);

      // Dynamic multi-frame resize handlers
      viewer.resize();
      requestAnimationFrame(() => viewer.resize());
      setTimeout(() => viewer && !viewer.isDestroyed() && viewer.resize(), 100);
      setTimeout(() => viewer && !viewer.isDestroyed() && viewer.resize(), 500);

      if (containerRef.current && typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(() => {
          if (viewer && !viewer.isDestroyed()) {
            viewer.resize();
          }
        });
        ro.observe(containerRef.current);
        resizeObserverRef.current = ro;
      }

      // Configure Bloom stage
      try {
        configureCesiumBloom(viewer, 50);
      } catch (e) {
        console.warn('Bloom stage warning:', e);
      }

      // Configure Shaders
      try {
        const shaderController = setupPostProcessingStages(Cesium, viewer);
        shaderControllerRef.current = shaderController;
      } catch (e) {
        console.warn('Shader setup warning:', e);
      }

      // Setup click handler for company node pins and news beacons
      try {
        setupNodeClickHandler(
          Cesium,
          viewer,
          (company) => onSelectCompany(company),
          (news) => {
            if (onSelectNewsBeacon) onSelectNewsBeacon(news);
          }
        );
      } catch (e) {
        console.warn('Click handler warning:', e);
      }

      // Real-time cursor coordinates tracker
      try {
        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction((movement: any) => {
          const cartesian = viewer.camera.pickEllipsoid(movement.endPosition, viewer.scene.globe.ellipsoid);
          if (cartesian) {
            const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
            const lat = Cesium.Math.toDegrees(cartographic.latitude);
            const lon = Cesium.Math.toDegrees(cartographic.longitude);
            setCursorCoords({
              lat: Number(lat.toFixed(4)),
              lon: Number(lon.toFixed(4)),
            });

            // Calculate estimated zoom level based on camera height
            const height = viewer.camera.positionCartographic.height;
            const z = (22000000 / Math.max(height, 500)).toFixed(1);
            setZoomLevel(Math.min(Number(z), 18.0).toFixed(1));
          }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
      } catch (e) {
        console.warn('Cursor tracker warning:', e);
      }

      // Initial smooth flight to global view
      try {
        flyToGlobalView(Cesium, viewer);
      } catch (e) {
        console.warn('Global view flight warning:', e);
      }

      setIsLoaded(true);
    }

    initCesium().catch((err) => {
      console.error('Cesium 3D Globe initialization error:', err);
      setIsLoaded(true);
    });

    return () => {
      destroyed = true;
      window.removeEventListener('resize', handleWindowResize);
      const hiddenCredits = document.getElementById('cesium-credits-hidden');
      if (hiddenCredits) hiddenCredits.remove();
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (shaderControllerRef.current) {
        shaderControllerRef.current.destroy();
      }
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [onSelectCompany]);

  // Sync glowing company node pins when companies, selection, or theme changes
  useEffect(() => {
    if (viewerRef.current && cesiumRef.current && isLoaded) {
      renderCompanyPins(
        cesiumRef.current,
        viewerRef.current,
        companies,
        selectedCompany?.id ?? null,
        accentColor
      );
    }
  }, [companies, selectedCompany, isLoaded, accentColor]);

  // Target-lock cinematic camera flight on company selection
  useEffect(() => {
    if (viewerRef.current && cesiumRef.current && selectedCompany) {
      targetLockCamera(
        cesiumRef.current,
        viewerRef.current,
        selectedCompany.latitude,
        selectedCompany.longitude
      );
    }
  }, [selectedCompany]);

  // Render pulsating live news telemetry beacons
  useEffect(() => {
    if (viewerRef.current && cesiumRef.current && isLoaded) {
      renderNewsBeacons(
        cesiumRef.current,
        viewerRef.current,
        newsBeacons,
        selectedNewsBeacon?.id ?? null
      );
    }
  }, [newsBeacons, selectedNewsBeacon, isLoaded]);

  // Target-lock camera flight on news beacon selection
  useEffect(() => {
    if (viewerRef.current && cesiumRef.current && selectedNewsBeacon) {
      targetLockCamera(
        cesiumRef.current,
        viewerRef.current,
        selectedNewsBeacon.latitude,
        selectedNewsBeacon.longitude
      );
    }
  }, [selectedNewsBeacon]);

  // Sync visual shader mode
  useEffect(() => {
    if (shaderControllerRef.current) {
      shaderControllerRef.current.setMode(visualMode);
    }
  }, [visualMode]);

  // View Mode Switcher handler (3D / 2D / MAP / SAT)
  const handleSwitchViewMode = (mode: '3D' | '2D' | 'MAP' | 'SAT') => {
    setViewMode(mode);
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium) return;

    if (mode === '3D') {
      viewer.scene.morphTo3D(1.2);
    } else if (mode === '2D') {
      viewer.scene.morphTo2D(1.2);
    } else if (mode === 'MAP') {
      // Toggle to vector street map
      try {
        viewer.imageryLayers.removeAll();
        const osmProvider = new Cesium.OpenStreetMapImageryProvider({
          url: 'https://tile.openstreetmap.org/',
        });
        viewer.imageryLayers.addImageryProvider(osmProvider);
      } catch (e) {}
    } else if (mode === 'SAT') {
      // Toggle to Esri Satellite
      try {
        viewer.imageryLayers.removeAll();
        const esriProvider = new Cesium.ArcGisMapServerImageryProvider.fromUrl(
          'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
        );
        viewer.imageryLayers.addImageryProvider(esriProvider);
      } catch (e) {}
    }
  };

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden select-none">
      <div ref={containerRef} className="absolute inset-0 w-full h-full overflow-hidden" id="cesiumContainer" />

      {/* Loading Overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#060910] text-zinc-300 font-mono">
          <div
            className="w-12 h-12 border-2 rounded-full animate-spin mb-4"
            style={{
              borderColor: `${accentColor}33`,
              borderTopColor: accentColor,
            }}
          />
          <div
            className="text-xs tracking-widest uppercase animate-pulse font-bold"
            style={{ color: accentColor }}
          >
            INITIALIZING OSIRIS 3D GEOSPATIAL THEATRE...
          </div>
        </div>
      )}

      {/* Cyberpunk Scanlines */}
      {showScanlines && (
        <div className="absolute inset-0 pointer-events-none scanlines z-10 opacity-25" />
      )}

      {/* Bottom Center: Mode Switcher & Scale Bar & Cursor Coordinates */}
      {isLoaded && (
        <div className="fixed bottom-11 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 font-mono select-none pointer-events-auto">
          {/* Mode Switcher Pills: 3D / 2D / MAP / SAT */}
          <div
            className="tactical-glass rounded-full p-1 border flex items-center gap-1 shadow-2xl backdrop-blur-xl"
            style={{
              background: 'rgba(7, 10, 18, 0.92)',
              borderColor: `${accentColor}44`,
            }}
          >
            {[
              { id: '3D', label: '3D', icon: <Globe className="w-3.5 h-3.5" /> },
              { id: '2D', label: '2D', icon: <Map className="w-3.5 h-3.5" /> },
              { id: 'MAP', label: 'MAP', icon: <Moon className="w-3.5 h-3.5" /> },
              { id: 'SAT', label: 'SAT', icon: <Satellite className="w-3.5 h-3.5" /> },
            ].map((tab) => {
              const isSelected = viewMode === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleSwitchViewMode(tab.id as any)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-all border ${
                    isSelected
                      ? 'text-white border'
                      : 'text-zinc-400 hover:text-white border-transparent hover:bg-white/5'
                  }`}
                  style={{
                    backgroundColor: isSelected ? `${accentColor}33` : undefined,
                    borderColor: isSelected ? `${accentColor}99` : undefined,
                    color: isSelected ? accentColor : undefined,
                    boxShadow: isSelected ? `0 0 12px ${accentColor}44` : undefined,
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Scale Bar & Cursor Telemetry Status Line */}
          <div className="flex items-center gap-4 text-[10px] text-zinc-400 bg-black/60 px-3 py-0.5 rounded-full border border-white/10 backdrop-blur-md">
            {/* Scale Bar */}
            <div className="flex items-center gap-1 text-[9px] text-zinc-500">
              <span>|</span>
              <span className="w-10 h-px bg-zinc-600 inline-block" />
              <span>2000 km</span>
              <span className="w-10 h-px bg-zinc-600 inline-block" />
              <span>|</span>
            </div>

            {cursorCoords && (
              <span className="flex items-center gap-1 text-zinc-300">
                CURSOR: <span className="text-white font-bold">{cursorCoords.lat}, {cursorCoords.lon}</span>
              </span>
            )}

            <span className="text-zinc-500">•</span>
            <span>ZOOM: <span className="text-white font-bold">{zoomLevel}</span></span>
          </div>
        </div>
      )}
    </div>
  );
}
