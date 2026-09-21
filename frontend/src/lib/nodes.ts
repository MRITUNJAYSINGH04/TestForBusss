/**
 * nodes.ts — Dynamic glowing corporate node pins & live news telemetry beacons on Cesium 3D Globe.
 * Preserves the tactical cyberpunk / Blade Runner aesthetic.
 */

export interface CompanyNodeData {
  id: string;
  name: string;
  domain: string;
  hq_city: string;
  hq_country: string;
  hq_address?: string;
  google_maps_url?: string;
  latitude: number;
  longitude: number;
  industry: string;
  sub_industry?: string;
  employee_count_range?: string;
  estimated_revenue_usd?: string;
  phone?: string;
  contact_email?: string;
  category?: string;
  social_profiles?: Record<string, string>;
  key_people?: Array<{ name: string; role: string; linkedin?: string }>;
  rating?: number;
  reviews_count?: number;
  operating_hours?: string;
  business_type?: string;
  status: string;
  lead_match_score?: number;
  outreach_status?: string;
  gaps_count?: number;
  top_gap?: string;
  recent_news?: Array<{ title: string; date: string; source?: string; tag?: string; summary?: string }>;
  osint_data?: Record<string, any>;
  distanceKm?: number;
  source?: string;
  source_url?: string;
  osm_id?: string;
  tech_stack?: string[];
  ai_gap_analysis?: any;
  pitch_strategy?: any;
}

export function renderCompanyPins(
  Cesium: any,
  viewer: any,
  companies: CompanyNodeData[],
  selectedId: string | null = null,
  themeColor?: string
) {
  if (!viewer || viewer.isDestroyed()) return;

  // Clear existing target node entities
  const existing = viewer.entities.values.filter((e: any) => e.name === 'CompanyTargetNode');
  existing.forEach((e: any) => viewer.entities.remove(e));

  const BEACON_HEIGHT = 450; // meters above ground

  companies.forEach((company) => {
    const isSelected = company.id === selectedId;
    const isContacted = company.outreach_status === 'CONTACTED' || company.outreach_status === 'MEETING_BOOKED';
    const basePosition = Cesium.Cartesian3.fromDegrees(company.longitude, company.latitude, 0);
    const elevatedPosition = Cesium.Cartesian3.fromDegrees(company.longitude, company.latitude, BEACON_HEIGHT);

    const pinColor = isSelected
      ? '#ffaa00'
      : isContacted
      ? '#00ff88'
      : (themeColor || '#00d4ff');

    // 1. Holographic vertical beacon tether line
    viewer.entities.add({
      name: 'CompanyTargetNode',
      polyline: {
        positions: [basePosition, elevatedPosition],
        width: isSelected ? 2.5 : 1.5,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: isSelected ? 0.45 : 0.25,
          color: isSelected
            ? Cesium.Color.fromCssColorString('rgba(255, 170, 0, 0.85)')
            : isContacted
            ? Cesium.Color.fromCssColorString('rgba(0, 255, 136, 0.75)')
            : Cesium.Color.fromCssColorString('rgba(0, 212, 255, 0.65)'),
        }),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 18000000),
      },
      properties: { companyData: company },
    });

    const matchText = company.lead_match_score ? ` [${Math.round(company.lead_match_score)}% MATCH]` : '';
    const statusText = company.outreach_status && company.outreach_status !== 'NEW' ? ` • ${company.outreach_status}` : '';

    // 2. Primary elevated glowing cyber-pin
    viewer.entities.add({
      name: 'CompanyTargetNode',
      position: elevatedPosition,
      properties: { companyData: company },
      point: {
        pixelSize: isSelected ? 18 : 12,
        color: Cesium.Color.fromCssColorString(pinColor),
        outlineColor: isSelected
          ? Cesium.Color.fromCssColorString('rgba(255, 170, 0, 0.5)')
          : isContacted
          ? Cesium.Color.fromCssColorString('rgba(0, 255, 136, 0.4)')
          : Cesium.Color.fromCssColorString('rgba(0, 212, 255, 0.4)'),
        outlineWidth: isSelected ? 12 : 7,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: `◈ ${company.name.toUpperCase()}${matchText}${statusText}`,
        font: 'bold 11px "JetBrains Mono", monospace',
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        fillColor: Cesium.Color.fromCssColorString('#e8eaed'),
        outlineColor: Cesium.Color.fromCssColorString('#0a0a0f'),
        outlineWidth: 3,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -14),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 12000000),
      },
    });

    // 3. Ground ring target indicator
    viewer.entities.add({
      name: 'CompanyTargetNode',
      position: basePosition,
      properties: { companyData: company },
      point: {
        pixelSize: isSelected ? 10 : 6,
        color: Cesium.Color.fromCssColorString(pinColor),
        outlineColor: Cesium.Color.fromCssColorString(pinColor),
        outlineWidth: isSelected ? 6 : 3,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5000000),
      },
    });
  });

  viewer.scene.requestRender();
}

export function renderNewsBeacons(
  Cesium: any,
  viewer: any,
  newsItems: any[],
  selectedId: string | null = null
) {
  if (!viewer || viewer.isDestroyed() || !newsItems) return;

  // Clear existing news beacon entities
  const existing = viewer.entities.values.filter((e: any) => e.name === 'NewsBeaconNode');
  existing.forEach((e: any) => viewer.entities.remove(e));

  const BEACON_HEIGHT = 650;

  newsItems.forEach((item) => {
    if (!item.latitude || !item.longitude) return;
    const isSelected = item.id === selectedId;
    const basePosition = Cesium.Cartesian3.fromDegrees(item.longitude, item.latitude, 0);
    const elevatedPosition = Cesium.Cartesian3.fromDegrees(item.longitude, item.latitude, BEACON_HEIGHT);

    const beaconColor = item.beacon_color || (
      item.signal_type === 'FUNDING' ? '#10b981' :
      item.signal_type === 'EXPANSION' ? '#00d4ff' :
      item.signal_type === 'HIRING' ? '#ffaa00' : '#a855f7'
    );

    // 1. Vertical pulsating news beam
    viewer.entities.add({
      name: 'NewsBeaconNode',
      polyline: {
        positions: [basePosition, elevatedPosition],
        width: isSelected ? 3 : 1.5,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.4,
          color: Cesium.Color.fromCssColorString(beaconColor),
        }),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 18000000),
      },
      properties: { newsData: item },
    });

    // 2. Elevated pulsating news radar beacon
    viewer.entities.add({
      name: 'NewsBeaconNode',
      position: elevatedPosition,
      properties: { newsData: item },
      point: {
        pixelSize: isSelected ? 18 : 12,
        color: Cesium.Color.fromCssColorString(beaconColor),
        outlineColor: Cesium.Color.fromCssColorString(beaconColor).withAlpha(0.4),
        outlineWidth: isSelected ? 14 : 8,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: `⚡ [${item.signal_type}] ${item.title?.slice(0, 35)}...`,
        font: 'bold 10px "JetBrains Mono", monospace',
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        fillColor: Cesium.Color.fromCssColorString('#ffffff'),
        outlineColor: Cesium.Color.fromCssColorString('#000000'),
        outlineWidth: 3,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -14),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 10000000),
      },
    });
  });

  viewer.scene.requestRender();
}

export function setupNodeClickHandler(
  Cesium: any,
  viewer: any,
  onSelectCompany: (company: CompanyNodeData) => void,
  onSelectNews?: (news: any) => void
) {
  if (!viewer || viewer.isDestroyed()) return () => {};

  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

  // Left click to select target node or news beacon
  handler.setInputAction((movement: any) => {
    const pickedObject = viewer.scene.pick(movement.position);
    if (
      Cesium.defined(pickedObject) &&
      pickedObject.id &&
      pickedObject.id.properties
    ) {
      if (pickedObject.id.properties.companyData) {
        const data = pickedObject.id.properties.companyData.getValue();
        onSelectCompany(data);
      } else if (pickedObject.id.properties.newsData && onSelectNews) {
        const news = pickedObject.id.properties.newsData.getValue();
        onSelectNews(news);
      }
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  // Hover cursor styling
  handler.setInputAction((movement: any) => {
    const pickedObject = viewer.scene.pick(movement.endPosition);
    if (
      Cesium.defined(pickedObject) &&
      pickedObject.id &&
      pickedObject.id.properties &&
      (pickedObject.id.properties.companyData || pickedObject.id.properties.newsData)
    ) {
      viewer.canvas.style.cursor = 'pointer';
    } else {
      viewer.canvas.style.cursor = 'default';
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

  return () => {
    if (!handler.isDestroyed()) {
      handler.destroy();
    }
  };
}
