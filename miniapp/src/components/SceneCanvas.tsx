import { Button, Image, Text, View } from '@tarojs/components';
import { useMemo, useState } from 'react';
import { hotspotStyle, kitchenScene, type Hotspot } from '@shared';

interface Props {
  discovered?: string[];
  targetId?: string;
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

export function SceneCanvas({ discovered = [], targetId, onSelect }: Props) {
  const [imageState, setImageState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const markerRegions = useMemo(() => {
    const selected = new Map<string, number>();
    kitchenScene.hotspots.forEach((hotspot, index) => {
      const current = selected.get(hotspot.vocabularyId);
      if (current === undefined || hotspot.width * hotspot.height > kitchenScene.hotspots[current].width * kitchenScene.hotspots[current].height) {
        selected.set(hotspot.vocabularyId, index);
      }
    });
    return selected;
  }, []);
  return <View className='scene-frame' data-scene-id={kitchenScene.id}>
    <Image key={reloadKey} className='scene-image' src='/assets/kitchen-cooking.webp' mode='aspectFit'
      onLoad={() => setImageState('ready')} onError={error => {
        console.error('[Explore English][Scene] Kitchen image failed to load.', error);
        setImageState('error');
      }} />
    {imageState !== 'ready' ? <View className='image-status'>
      {imageState === 'loading' ? <Text>Loading the scene…</Text> : <>
        <Text>场景图片加载失败，但学习记录仍然安全。</Text>
        <Button className='image-retry' onClick={() => { setImageState('loading'); setReloadKey(value => value + 1); }}>重新加载</Button>
      </>}
    </View> : null}
    <View className='hotspot-layer'>
      {kitchenScene.hotspots.map((hotspot, index) => {
        const found = discovered.includes(hotspot.vocabularyId);
        return <View key={`${hotspot.vocabularyId}-${index}`} className='hotspot-region'
          data-vocabulary-id={hotspot.vocabularyId} style={hotspotStyle(hotspot)}>
          <View className={`hotspot ${targetId === hotspot.vocabularyId ? 'target' : ''} ${onSelect ? '' : 'noninteractive'}`}
            data-hotspot-id={`${kitchenScene.id}:${hotspot.vocabularyId}:${index}`}
            data-vocabulary-id={hotspot.vocabularyId}
            style={{ clipPath: clipPath(hotspot), WebkitClipPath: clipPath(hotspot) }}
            onClick={onSelect ? () => { if (imageState === 'ready') onSelect(hotspot.vocabularyId); } : undefined} />
          {found && markerRegions.get(hotspot.vocabularyId) === index
            ? <View className='found-marker' data-vocabulary-id={hotspot.vocabularyId}><Text>✓</Text></View> : null}
        </View>;
      })}
    </View>
  </View>;
}
