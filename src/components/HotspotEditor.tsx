import { useEffect, useState } from 'react';
import type { Hotspot, Scene } from '../types';
import { vocabulary } from '../data';
import { hotspotOutOfBounds, overlappingHotspotPairs, type ImageDisplayMetrics } from '../scene-geometry';

/** Also available on a deployed build only when the explicit hotspotDebug query is present. */
export function HotspotEditor({ scene, point, metrics }: { scene: Scene; point: { x: number; y: number } | null; metrics: ImageDisplayMetrics | null }) {
  const [hotspots, setHotspots] = useState(scene.hotspots);
  const [selected, setSelected] = useState(0);
  const active = hotspots[selected];
  const [copied, setCopied] = useState('');
  const overlaps = overlappingHotspotPairs(hotspots);
  const invalid = hotspots.map((hotspot, index) => hotspotOutOfBounds(hotspot) ? index : -1).filter(index => index >= 0);
  useEffect(() => { setHotspots(scene.hotspots); setSelected(0); }, [scene]);
  function update(patch: Partial<Hotspot>) {
    setHotspots(items => items.map((item, index) => {
      if (index !== selected) return item;
      const next = { ...item, ...patch };
      if (item.points) next.points = item.points.map(([x, y]) => [next.x + (x - item.x) / item.width * next.width, next.y + (y - item.y) / item.height * next.height]);
      return next;
    }));
  }
  return <div className="hotspot-editor">
    <p>Choose an object. Click the image to read a coordinate, then adjust the draft below.</p>
    <div className="calibration-metrics" data-testid="hotspot-metrics">
      <strong>{scene.imageVersion === scene.hotspotImageVersion ? 'Image/hotspot versions match' : 'Review required: image version mismatch'}</strong>
      <span>Image: {scene.imageWidth} × {scene.imageHeight} ({scene.imageVersion})</span>
      <span>Hotspots: {scene.hotspotImageVersion ?? 'not calibrated'}</span>
      {metrics && <><span>Displayed image: {metrics.renderedWidth.toFixed(1)} × {metrics.renderedHeight.toFixed(1)}</span>
        <span>Container offset: {metrics.offsetLeft.toFixed(1)}, {metrics.offsetTop.toFixed(1)}</span>
        <span>Container: {metrics.containerWidth.toFixed(1)} × {metrics.containerHeight.toFixed(1)} · viewport: {metrics.viewportWidth}px</span></>}
      <span className={invalid.length ? 'calibration-warning' : ''}>Out of bounds: {invalid.length ? invalid.map(index => index + 1).join(', ') : 'none'}</span>
      <span className={overlaps.length ? 'calibration-warning' : ''}>Bounding-box overlaps: {overlaps.length ? overlaps.map(([a, b]) => `${a + 1}/${b + 1}`).join(', ') : 'none'}</span>
    </div>
    <div className="calibration-nav"><button onClick={() => setSelected(value => (value - 1 + hotspots.length) % hotspots.length)}>Previous object</button>
      <button onClick={() => setSelected(value => (value + 1) % hotspots.length)}>Next object</button></div>
    <label>Object region <select value={selected} onChange={event => setSelected(Number(event.target.value))}>
      {hotspots.map((hotspot, index) => <option key={index} value={index}>{index + 1}. {vocabulary[hotspot.vocabularyId].word}</option>)}
    </select></label>
    <div className="editor-fields">{(['x', 'y', 'width', 'height'] as const).map(field =>
      <label key={field}>{field}<input type="number" min="0" max="1" step="0.001" value={active[field]}
        onChange={event => update({ [field]: Math.min(1, Math.max(0, Number(event.target.value))) })} /></label>)}</div>
    <label>Shape <select value={active.shape} onChange={event => update({ shape: event.target.value as Hotspot['shape'] })}>
      <option value="rect">Rectangle</option><option value="ellipse">Ellipse</option>
      {active.points && <option value="polygon">Polygon</option>}
    </select></label>
    <button disabled={!point} onClick={() => point && update({ x: point.x, y: point.y })}>Use last click as top-left</button>
    <svg viewBox={`0 0 ${scene.imageWidth} ${scene.imageHeight}`} className="editor-preview" aria-label="Draft hotspot preview">
      <image href={`${import.meta.env.BASE_URL}${scene.image}`} width={scene.imageWidth} height={scene.imageHeight} />
      {hotspots.map((hotspot, index) => hotspot.shape === 'polygon' && hotspot.points
        ? <polygon key={index} points={hotspot.points.map(([x, y]) => `${x * scene.imageWidth},${y * scene.imageHeight}`).join(' ')} fill="none" stroke={index === selected ? 'red' : 'white'} strokeWidth="3" />
        : <rect key={index} x={hotspot.x * scene.imageWidth} y={hotspot.y * scene.imageHeight}
        width={hotspot.width * scene.imageWidth} height={hotspot.height * scene.imageHeight} fill="none"
        stroke={index === selected ? 'red' : 'white'} strokeWidth="3" />)}
    </svg>
    <label>Draft JSON<textarea readOnly rows={8} value={JSON.stringify(hotspots, null, 2)} /></label>
    <button onClick={() => { void navigator.clipboard.writeText(JSON.stringify(hotspots, null, 2))
      .then(() => setCopied('Copied. Paste into the scene record after review.'))
      .catch(() => setCopied('Select and copy the JSON above.')); }}>Copy hotspot JSON</button><p role="status">{copied}</p>
    <div className="calibration-list"><strong>All regions</strong>{hotspots.map((hotspot, index) => <button key={`${hotspot.vocabularyId}-${index}`}
      className={index === selected ? 'is-selected' : ''} onClick={() => setSelected(index)}>
      {index + 1}. {vocabulary[hotspot.vocabularyId].word} · x {hotspot.x.toFixed(3)} · y {hotspot.y.toFixed(3)} · w {hotspot.width.toFixed(3)} · h {hotspot.height.toFixed(3)}
    </button>)}</div>
  </div>;
}
