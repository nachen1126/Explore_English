import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { assetUrl, vocabulary } from '../data';
import { hotspotDebugEnabled, hotspotStyle, imageDisplayMetrics, normalizePoint, type ImageDisplayMetrics } from '../scene-geometry';
import type { Scene } from '../types';
import { HotspotEditor } from './HotspotEditor';
import { Modal } from './Modal';

interface Props {
  scene: Scene;
  discovered?: string[];
  onTap?: (id: string) => void;
  highlight?: string;
  challenge?: boolean;
  enlarged?: boolean;
  hintPulse?: boolean;
}
export function SceneArt({ scene, discovered = [], onTap, highlight, challenge = false, enlarged = false, hintPulse = false }: Props) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reload, setReload] = useState(0);
  const [debug, setDebug] = useState(hotspotDebugEnabled);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const [metrics, setMetrics] = useState<ImageDisplayMetrics | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const updateMetrics = useCallback(() => {
    const frame = frameRef.current, image = imageRef.current;
    if (!frame || !image || !image.naturalWidth || !image.naturalHeight) return;
    const bounds = frame.getBoundingClientRect();
    setMetrics(imageDisplayMetrics(image.naturalWidth, image.naturalHeight, bounds.width, bounds.height, window.innerWidth));
  }, []);
  useEffect(() => {
    if (!debug) return;
    updateMetrics();
    const observer = new ResizeObserver(updateMetrics);
    if (frameRef.current) observer.observe(frameRef.current);
    window.addEventListener('resize', updateMetrics);
    return () => { observer.disconnect(); window.removeEventListener('resize', updateMetrics); };
  }, [debug, status, updateMetrics]);
  function inspect(event: MouseEvent<HTMLDivElement>) {
    if (debug) {
      const container = event.currentTarget.getBoundingClientRect();
      const imageBounds = metrics ? { left: container.left + metrics.offsetLeft, top: container.top + metrics.offsetTop,
        width: metrics.renderedWidth, height: metrics.renderedHeight } : container;
      setPoint(normalizePoint(event.clientX, event.clientY, imageBounds));
    }
  }
  return <div className={`scene-art-section ${enlarged ? 'enlarged-art' : ''} ${debug ? 'is-hotspot-debug' : ''}`}>
    <div className="scene-canvas" style={{ '--scene-ratio': scene.imageWidth / scene.imageHeight } as CSSProperties}>
    <div ref={frameRef} className="scene-frame" data-testid="scene-frame" style={{ aspectRatio: `${scene.imageWidth} / ${scene.imageHeight}` }} onClick={inspect}>
      <img ref={imageRef} key={reload} className="scene-image" src={assetUrl(scene.image)} width={scene.imageWidth} height={scene.imageHeight}
        alt={`${scene.title}: an illustrated place to explore`} decoding="async"
        onLoad={() => { setStatus('ready'); requestAnimationFrame(updateMetrics); }} onError={() => setStatus('error')} />
      {status === 'loading' && <div className="image-status" role="status">Loading the scene…</div>}
      {status === 'error' && <div className="image-status" role="alert"><p>The picture could not load.</p>
        <button onClick={() => { setStatus('loading'); setReload(value => value + 1); }}>Try loading again</button></div>}
      <div className={`hotspot-layer ${debug ? 'debug-hotspots' : ''}`} data-testid="hotspot-layer">
        {scene.hotspots.map((hotspot, index) => {
          const found = discovered.includes(hotspot.vocabularyId);
          const name = vocabulary[hotspot.vocabularyId].word;
          return <button key={`${hotspot.vocabularyId}-${index}`} data-word-id={hotspot.vocabularyId} data-region={index}
            className={`hotspot ${found ? 'is-found' : ''} ${highlight === hotspot.vocabularyId ? 'is-highlighted' : ''} ${hintPulse && highlight === hotspot.vocabularyId ? 'is-hinting' : ''}`}
            style={{ ...hotspotStyle(hotspot), zIndex: scene.hotspots.filter(other => other.width * other.height > hotspot.width * hotspot.height).length + 1 }} disabled={status !== 'ready' || !onTap}
            aria-label={challenge ? `Select object ${index + 1}` : `${found ? 'Review' : 'Explore'} ${name}`}
            onClick={() => onTap?.(hotspot.vocabularyId)}>
            {highlight === hotspot.vocabularyId && !hintPulse && <span className="target-label" aria-hidden="true">This object</span>}
            {debug && <><span className="debug-label">{name}<small>{hotspot.x.toFixed(3)}, {hotspot.y.toFixed(3)}, {hotspot.width.toFixed(3)}, {hotspot.height.toFixed(3)}</small></span><span className="debug-center" /></>}
          </button>;
        })}
        {scene.hotspots.map((hotspot, index) => discovered.includes(hotspot.vocabularyId) &&
          <span key={`marker-${hotspot.vocabularyId}-${index}`} className="found-marker" aria-hidden="true" style={{
            '--marker-x': `${(hotspot.x + hotspot.width) * 100}%`,
            '--marker-y': `${hotspot.y * 100}%`,
          } as CSSProperties}>✓</span>)}
      </div>
      <svg className="hotspot-outlines" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
        {scene.hotspots.filter(h => debug || h.vocabularyId === highlight).map((h, index) => {
          const props = { fill: 'none', stroke: h.vocabularyId === highlight ? '#285c4d' : '#b72040', strokeWidth: 3, vectorEffect: 'non-scaling-stroke' as const };
          return h.shape === 'polygon' && h.points ? <polygon key={index} points={h.points.map(([x, y]) => `${x * 1000},${y * 1000}`).join(' ')} {...props} />
            : h.shape === 'ellipse' ? <ellipse key={index} cx={(h.x + h.width / 2) * 1000} cy={(h.y + h.height / 2) * 1000} rx={h.width * 500} ry={h.height * 500} {...props} />
              : <rect key={index} x={h.x * 1000} y={h.y * 1000} width={h.width * 1000} height={h.height * 1000} {...props} />;
        })}
      </svg>
    </div></div>
    {!enlarged && <button className="text-button enlarge-picture" onClick={() => setZoomOpen(true)}>Enlarge picture</button>}
    {zoomOpen && <Modal title={`${scene.title} · Larger picture`} onClose={() => setZoomOpen(false)}>
      <p className="small">Scroll across the larger picture to see and select smaller objects.</p>
      <SceneArt scene={scene} discovered={discovered} highlight={highlight} challenge={challenge} hintPulse={hintPulse} enlarged
        onTap={onTap ? id => { onTap(id); setZoomOpen(false); } : undefined} />
    </Modal>}
    {(import.meta.env.DEV || debug) && !enlarged && <details className="dev-tools" open={debug || undefined}>
      <summary>Hotspot calibration</summary>
      <label><input type="checkbox" checked={debug} onChange={event => setDebug(event.target.checked)} /> Show names, boundaries and centres</label>
      {point && <output>Click: x = {point.x.toFixed(4)}, y = {point.y.toFixed(4)}</output>}
      {debug && <HotspotEditor scene={scene} point={point} metrics={metrics} />}
    </details>}
  </div>;
}
