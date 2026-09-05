import type { Hotspot } from './types';

/** The image and overlay fill the same intrinsic-ratio box. Never add pixel minimums to hotspots. */
export const hotspotStyle = (hotspot: Hotspot) => ({
  left: `${hotspot.x * 100}%`,
  top: `${hotspot.y * 100}%`,
  width: `${hotspot.width * 100}%`,
  height: `${hotspot.height * 100}%`,
  borderRadius: hotspot.shape === 'ellipse' ? '50%' : '8px',
});
export const normalizePoint = (x: number, y: number, bounds: { left: number; top: number; width: number; height: number }) => ({
  x: Math.min(1, Math.max(0, (x - bounds.left) / bounds.width)),
  y: Math.min(1, Math.max(0, (y - bounds.top) / bounds.height)),
});
