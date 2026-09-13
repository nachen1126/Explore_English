import type { Hotspot } from './types';

export interface ImageDisplayMetrics {
  naturalWidth: number;
  naturalHeight: number;
  renderedWidth: number;
  renderedHeight: number;
  offsetLeft: number;
  offsetTop: number;
  containerWidth: number;
  containerHeight: number;
  viewportWidth: number;
}

/** The image and overlay fill the same intrinsic-ratio box. Never add pixel minimums to hotspots. */
export const hotspotStyle = (hotspot: Hotspot) => ({
  left: `${hotspot.x * 100}%`,
  top: `${hotspot.y * 100}%`,
  width: `${hotspot.width * 100}%`,
  height: `${hotspot.height * 100}%`,
  borderRadius: hotspot.shape === 'ellipse' ? '50%' : '8px',
  ...(hotspot.shape === 'polygon' && hotspot.points ? {
    clipPath: `polygon(${hotspot.points.map(([x, y]) => `${(x - hotspot.x) / hotspot.width * 100}% ${(y - hotspot.y) / hotspot.height * 100}%`).join(',')})`,
  } : {}),
});
export const normalizePoint = (x: number, y: number, bounds: { left: number; top: number; width: number; height: number }) => ({
  x: Math.min(1, Math.max(0, (x - bounds.left) / bounds.width)),
  y: Math.min(1, Math.max(0, (y - bounds.top) / bounds.height)),
});

export function hotspotDebugEnabled(location: Pick<Location, 'search' | 'hash'> = window.location) {
  const search = new URLSearchParams(location.search);
  const hashQuery = location.hash.includes('?') ? location.hash.slice(location.hash.indexOf('?') + 1) : '';
  return search.get('hotspotDebug') === '1' || new URLSearchParams(hashQuery).get('hotspotDebug') === '1';
}

/** Returns the visible object-fit:contain image box inside its positioning container. */
export function imageDisplayMetrics(naturalWidth: number, naturalHeight: number, containerWidth: number, containerHeight: number, viewportWidth: number): ImageDisplayMetrics {
  const scale = Math.min(containerWidth / naturalWidth, containerHeight / naturalHeight);
  const renderedWidth = naturalWidth * scale;
  const renderedHeight = naturalHeight * scale;
  return { naturalWidth, naturalHeight, renderedWidth, renderedHeight, offsetLeft: (containerWidth - renderedWidth) / 2,
    offsetTop: (containerHeight - renderedHeight) / 2, containerWidth, containerHeight, viewportWidth };
}

export function hotspotOutOfBounds(hotspot: Hotspot) {
  const values = [hotspot.x, hotspot.y, hotspot.width, hotspot.height];
  return values.some(value => !Number.isFinite(value)) || hotspot.x < 0 || hotspot.y < 0 || hotspot.width <= 0 || hotspot.height <= 0
    || hotspot.x + hotspot.width > 1 || hotspot.y + hotspot.height > 1
    || Boolean(hotspot.points?.some(([x, y]) => x < 0 || y < 0 || x > 1 || y > 1));
}

export function overlappingHotspotPairs(hotspots: Hotspot[]) {
  const pairs: [number, number][] = [];
  for (let a = 0; a < hotspots.length; a += 1) for (let b = a + 1; b < hotspots.length; b += 1) {
    const first = hotspots[a], second = hotspots[b];
    if (first.vocabularyId === second.vocabularyId) continue;
    const width = Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x);
    const height = Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y);
    if (width > 0 && height > 0) pairs.push([a, b]);
  }
  return pairs;
}
