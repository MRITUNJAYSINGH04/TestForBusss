/**
 * camera.ts — Preserved & modernized camera controller from gods-eye-view.
 * Provides target-lock flight, smooth cubic easing, and orbital navigation.
 */

export interface CameraFlightOptions {
  latitude: number;
  longitude: number;
  altitude?: number;       // default 2200 meters
  pitchDeg?: number;       // default -42 degrees for dynamic oblique angle
  headingDeg?: number;     // default 15 degrees
  duration?: number;       // seconds, default 2.0s
  complete?: () => void;
}

export function flyToCoordinates(
  Cesium: any,
  viewer: any,
  {
    latitude,
    longitude,
    altitude = 2200,
    pitchDeg = -42,
    headingDeg = 15,
    duration = 2.0,
    complete,
  }: CameraFlightOptions
) {
  if (!viewer || viewer.isDestroyed()) return;

  // Cancel any previous flight in progress for immediate responsive control
  viewer.camera.cancelFlight();

  const destination = Cesium.Cartesian3.fromDegrees(longitude, latitude, altitude);

  viewer.camera.flyTo({
    destination,
    orientation: {
      heading: Cesium.Math.toRadians(headingDeg),
      pitch: Cesium.Math.toRadians(pitchDeg),
      roll: 0.0,
    },
    duration,
    easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    complete,
  });
}

/**
 * Target-lock camera transition on a corporate node.
 */
export function targetLockCamera(
  Cesium: any,
  viewer: any,
  latitude: number,
  longitude: number,
  onComplete?: () => void
) {
  flyToCoordinates(Cesium, viewer, {
    latitude,
    longitude,
    altitude: 2000,
    pitchDeg: -45,
    headingDeg: 20,
    duration: 1.8,
    complete: onComplete,
  });
}

/**
 * Cinematic startup fly-to showing the whole globe before homing in on global tech hubs.
 */
export function flyToGlobalView(Cesium: any, viewer: any) {
  if (!viewer || viewer.isDestroyed()) return;

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(-30.0, 20.0, 22000000),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90),
      roll: 0.0,
    },
    duration: 1.5,
    easingFunction: Cesium.EasingFunction.CUBIC_OUT,
  });
}

/**
 * Interactive D-Pad controls for manual orbital navigation.
 */
export function zoomCameraIn(viewer: any, factor: number = 0.35) {
  if (!viewer || viewer.isDestroyed()) return;
  const height = viewer.camera.positionCartographic?.height || 2000000;
  viewer.camera.zoomIn(height * factor);
}

export function zoomCameraOut(viewer: any, factor: number = 0.35) {
  if (!viewer || viewer.isDestroyed()) return;
  const height = viewer.camera.positionCartographic?.height || 2000000;
  viewer.camera.zoomOut(height * factor);
}

export function panCamera(viewer: any, direction: 'up' | 'down' | 'left' | 'right', angleDeg: number = 5) {
  if (!viewer || viewer.isDestroyed() || !viewer.scene) return;
  const Cesium = (window as any).Cesium;
  const rad = Cesium ? Cesium.Math.toRadians(angleDeg) : (angleDeg * Math.PI) / 180;

  switch (direction) {
    case 'up':
      viewer.camera.rotateUp(rad);
      break;
    case 'down':
      viewer.camera.rotateDown(rad);
      break;
    case 'left':
      viewer.camera.rotateLeft(rad);
      break;
    case 'right':
      viewer.camera.rotateRight(rad);
      break;
  }
}

