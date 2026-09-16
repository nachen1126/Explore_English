import type { Hotspot, Scene } from '@shared';

export interface MarkerBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function sceneMarkerBox(scene: Scene, hotspot: Hotspot, displayWidth: number, maxSize = 18, inset = 1): MarkerBox {
  const displayHeight = displayWidth * scene.imageHeight / scene.imageWidth;
  const hotspotBox = {
    x: hotspot.x * displayWidth,
    y: hotspot.y * displayHeight,
    width: hotspot.width * displayWidth,
    height: hotspot.height * displayHeight,
  };
  const safeInset = Math.min(inset, hotspotBox.width / 4, hotspotBox.height / 4);
  const size = Math.max(0, Math.min(maxSize, hotspotBox.width - safeInset * 2, hotspotBox.height - safeInset * 2));
  return {
    x: hotspotBox.x + hotspotBox.width - size - safeInset,
    y: hotspotBox.y + safeInset,
    width: size,
    height: size,
  };
}

export function foundMarkerStyle(scene: Scene, hotspot: Hotspot) {
  // Use percentages derived from a narrow 280px scene. The marker therefore
  // scales down with the hotspot on small phones, while maxWidth/maxHeight keep
  // it compact on larger screens. Its outer border remains inside the hotspot.
  const referenceWidth = 280;
  const displayHeight = referenceWidth * scene.imageHeight / scene.imageWidth;
  const region = {
    x: hotspot.x * referenceWidth,
    y: hotspot.y * displayHeight,
    width: hotspot.width * referenceWidth,
    height: hotspot.height * displayHeight,
  };
  const marker = sceneMarkerBox(scene, hotspot, referenceWidth);
  const right = region.x + region.width - marker.x - marker.width;
  return {
    top: `${region.height ? (marker.y - region.y) / region.height * 100 : 0}%`,
    right: `${region.width ? right / region.width * 100 : 0}%`,
    width: `${region.width ? marker.width / region.width * 100 : 0}%`,
    height: `${region.height ? marker.height / region.height * 100 : 0}%`,
    maxWidth: '18px',
    maxHeight: '18px',
  };
}
