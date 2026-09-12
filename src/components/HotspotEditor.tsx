import { useState } from 'react';
import type { Hotspot, Scene } from '../types';
import { vocabulary } from '../data';

/** Only reachable in a Vite DEV branch; exported JSON is reviewed before publishing. */
export function HotspotEditor({ scene, point }: { scene: Scene; point: { x: number; y: number } | null }) {
  const [hotspots, setHotspots] = useState(scene.hotspots);
  const [selected, setSelected] = useState(0);
  const active = hotspots[selected];
  const [copied, setCopied] = useState('');
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
  </div>;
}
