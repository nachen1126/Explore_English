import { useState, type MouseEvent } from 'react';
import { assetUrl, vocabulary } from '../data';
import { hotspotStyle, normalizePoint } from '../scene-geometry';
import type { Scene } from '../types';
import { HotspotEditor } from './HotspotEditor';

interface Props {
  scene: Scene;
  discovered?: string[];
  onTap?: (id: string) => void;
  highlight?: string;
  challenge?: boolean;
}
export function SceneArt({ scene, discovered = [], onTap, highlight, challenge = false }: Props) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reload, setReload] = useState(0);
  const [debug, setDebug] = useState(false);
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  function inspect(event: MouseEvent<HTMLDivElement>) {
    if (import.meta.env.DEV && debug) {
      setPoint(normalizePoint(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect()));
    }
  }
  return <div className="scene-art-section">
    {scene.assetStatus === 'development' && <p className="asset-note">Development artwork · final illustration to follow</p>}
    <div className="scene-frame" data-testid="scene-frame" style={{ aspectRatio: `${scene.imageWidth} / ${scene.imageHeight}` }} onClick={inspect}>
      <img key={reload} className="scene-image" src={assetUrl(scene.image)} width={scene.imageWidth} height={scene.imageHeight}
        alt={`${scene.title}: an illustrated place to explore`} decoding="async"
        onLoad={() => setStatus('ready')} onError={() => setStatus('error')} />
      {status === 'loading' && <div className="image-status" role="status">Loading the scene…</div>}
      {status === 'error' && <div className="image-status" role="alert"><p>The picture could not load.</p>
        <button onClick={() => { setStatus('loading'); setReload(value => value + 1); }}>Try loading again</button></div>}
      <div className={`hotspot-layer ${debug ? 'debug-hotspots' : ''}`} data-testid="hotspot-layer">
        {scene.hotspots.map((hotspot, index) => {
          const found = discovered.includes(hotspot.vocabularyId);
          const name = vocabulary[hotspot.vocabularyId].word;
          return <button key={hotspot.vocabularyId} className={`hotspot ${found ? 'is-found' : ''} ${highlight === hotspot.vocabularyId ? 'is-highlighted' : ''}`}
            style={hotspotStyle(hotspot)} disabled={status !== 'ready' || !onTap}
            aria-label={challenge ? `Select object ${index + 1}` : `${found ? 'Review' : 'Explore'} ${name}`}
            onClick={() => onTap?.(hotspot.vocabularyId)}>
            {found && <span className="found-marker" aria-hidden="true">✓</span>}
            {highlight === hotspot.vocabularyId && <span className="target-label" aria-hidden="true">This object</span>}
            {import.meta.env.DEV && debug && <><span className="debug-label">{name}</span><span className="debug-center" /></>}
          </button>;
        })}
      </div>
    </div>
    {import.meta.env.DEV && <details className="dev-tools">
      <summary>Hotspot calibration (development only)</summary>
      <label><input type="checkbox" checked={debug} onChange={event => setDebug(event.target.checked)} /> Show names, boundaries and centres</label>
      {point && <output>Click: x = {point.x.toFixed(4)}, y = {point.y.toFixed(4)}</output>}
      {debug && <HotspotEditor scene={scene} point={point} />}
    </details>}
  </div>;
}
