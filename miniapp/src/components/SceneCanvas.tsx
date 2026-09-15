import { Image, Text, View } from '@tarojs/components';
import { useMemo } from 'react';
import { hotspotStyle, kitchenScene, type Hotspot } from '@shared';

interface Props {
  discovered?: string[];
  targetId?: string;
  onSelect(vocabularyId: string): void;
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
    <Image className='scene-image' src='/assets/kitchen-cooking.webp' mode='aspectFit' />
    <View className='hotspot-layer'>
      {kitchenScene.hotspots.map((hotspot, index) => {
        const found = discovered.includes(hotspot.vocabularyId);
        return <View key={`${hotspot.vocabularyId}-${index}`} className='hotspot-region'
          data-vocabulary-id={hotspot.vocabularyId} style={hotspotStyle(hotspot)}>
          <View className={`hotspot ${targetId === hotspot.vocabularyId ? 'target' : ''}`}
            data-hotspot-id={`${kitchenScene.id}:${hotspot.vocabularyId}:${index}`}
            data-vocabulary-id={hotspot.vocabularyId}
            style={{ clipPath: clipPath(hotspot), WebkitClipPath: clipPath(hotspot) }}
            onClick={() => onSelect(hotspot.vocabularyId)} />
          {found && markerRegions.get(hotspot.vocabularyId) === index
            ? <View className='found-marker' data-vocabulary-id={hotspot.vocabularyId}><Text>✓</Text></View> : null}
        </View>;
      })}
    </View>
  </View>;
}
