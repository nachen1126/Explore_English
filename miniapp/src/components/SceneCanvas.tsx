import { Button, Image, Text, View } from '@tarojs/components';
import { useMemo, useState } from 'react';
import { hotspotStyle, type Hotspot, type Scene } from '@shared';
import { foundMarkerStyle } from '../services/hotspot-marker';

interface Props {
  scene: Scene;
  imageSrc: string;
  discovered?: string[];
  targetId?: string;
  disabled?: boolean;
  onSelect?(vocabularyId: string): void;
}

function clipPath(hotspot: Hotspot) {
  if (hotspot.shape !== 'polygon' || !hotspot.points?.length) return undefined;
  return `polygon(${hotspot.points.map(([x, y]) => {
    const localX = (x - hotspot.x) / hotspot.width * 100;
    const localY = (y - hotspot.y) / hotspot.height * 100;
    return `${localX}% ${localY}%`;
  }).join(',')})`;
}

export function SceneCanvas({ scene, imageSrc, discovered = [], targetId, disabled = false, onSelect }: Props) {
  const [imageState, setImageState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const markerRegions = useMemo(() => {
    const selected = new Map<string, number>();
    scene.hotspots.forEach((hotspot, index) => {
      const current = selected.get(hotspot.vocabularyId);
      if (current === undefined || hotspot.width * hotspot.height > scene.hotspots[current].width * scene.hotspots[current].height) {
        selected.set(hotspot.vocabularyId, index);
      }
    });
    return selected;
  }, [scene]);
  return <View className='scene-frame' data-scene-id={scene.id} style={{ aspectRatio: `${scene.imageWidth} / ${scene.imageHeight}` }}>
    <Image key={`${scene.id}-${reloadKey}`} className='scene-image' src={imageSrc} mode='aspectFit'
      onLoad={() => setImageState('ready')} onError={error => {
        console.error(`[Explore English][Scene] ${scene.id} image failed to load.`, error);
        setImageState('error');
      }} />
    {imageState !== 'ready' ? <View className='image-status'>
      {imageState === 'loading' ? <Text>正在加载场景…</Text> : <>
        <Text>场景图片加载失败，但学习记录仍然安全。</Text>
        <Button className='image-retry' onClick={() => { setImageState('loading'); setReloadKey(value => value + 1); }}>重新加载</Button>
      </>}
    </View> : null}
    <View className='hotspot-layer'>
      {scene.hotspots.map((hotspot, index) => {
        const found = discovered.includes(hotspot.vocabularyId);
        return <View key={`${hotspot.vocabularyId}-${index}`} className='hotspot-region'
          data-vocabulary-id={hotspot.vocabularyId} style={hotspotStyle(hotspot)}>
          <View className={`hotspot ${targetId === hotspot.vocabularyId ? 'target' : ''} ${onSelect && !disabled ? '' : 'noninteractive'}`}
            data-hotspot-id={`${scene.id}:${hotspot.vocabularyId}:${index}`}
            data-vocabulary-id={hotspot.vocabularyId}
            style={{ clipPath: clipPath(hotspot), WebkitClipPath: clipPath(hotspot) }}
            onClick={onSelect && !disabled ? () => { if (imageState === 'ready') onSelect(hotspot.vocabularyId); } : undefined} />
          {found && markerRegions.get(hotspot.vocabularyId) === index
            ? <View className='found-marker' data-vocabulary-id={hotspot.vocabularyId} style={foundMarkerStyle(scene, hotspot)}>
              <View className='found-marker-tick' />
            </View> : null}
        </View>;
      })}
    </View>
  </View>;
}
