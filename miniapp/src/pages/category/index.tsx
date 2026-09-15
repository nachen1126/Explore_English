import Taro from '@tarojs/taro';
import { Button, Image, Text, View } from '@tarojs/components';
import { kitchenScene } from '@shared';
import { useLearning } from '../../state/learning';
import './index.scss';

export default function CategoryPage() {
  const { snapshot } = useLearning();
  const count = snapshot.progress[kitchenScene.id]?.discoveredVocabularyIds.length ?? 0;
  const label = count === kitchenScene.vocabularyIds.length ? 'Review' : count > 0 ? 'Continue' : 'Start Exploring';
  return <View className='page category-page'>
    <Text className='eyebrow'>Choose a scene</Text><Text className='title'>饮食篇</Text>
    <Text className='muted'>Food & Dining</Text>
    <View className='card scene-card' onClick={() => Taro.navigateTo({ url: '/pages/scene/index' })}>
      <Image className='thumbnail' src='/assets/kitchen-cooking.webp' mode='aspectFit' />
      <Text className='scene-title'>{kitchenScene.title}</Text>
      <Text className='muted'>{count}/{kitchenScene.vocabularyIds.length} discovered</Text>
      <View className='progress'><View className='progress-fill' style={{ width: `${count / kitchenScene.vocabularyIds.length * 100}%` }} /></View>
      <Button className='button primary'>{label}</Button>
    </View>
    <View className='card coming-soon'><Text>More scenes · Coming soon</Text><Text className='muted'>MVP 验收后再逐个迁移。</Text></View>
  </View>;
}
