import type { Hotspot } from './types';

export function hotspotStyle(hotspot: Hotspot) {
  return {
    left: `${hotspot.x * 100}%`, top: `${hotspot.y * 100}%`,
    width: `${hotspot.width * 100}%`, height: `${hotspot.height * 100}%`,
  };
}

export function scaleHotspot(hotspot: Hotspot, width: number, height: number) {
  return { x: hotspot.x * width, y: hotspot.y * height, width: hotspot.width * width, height: hotspot.height * height };
}

export function markerBox(hotspot: Hotspot, displayWidth: number, displayHeight: number, maxSize: number, inset = 2) {
  const box = scaleHotspot(hotspot, displayWidth, displayHeight);
  const size = Math.max(4, Math.min(maxSize, box.width - inset * 2, box.height - inset * 2));
  return { x: box.x + box.width - size - inset, y: box.y + inset, width: size, height: size };
}
