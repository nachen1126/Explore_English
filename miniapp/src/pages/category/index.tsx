import Taro from '@tarojs/taro';
import { Button, Image, Text, View } from '@tarojs/components';
import { useState } from 'react';
import { kitchenScene } from '@shared';
import { useLearning } from '../../state/learning';
import './index.scss';

export default function CategoryPage() {
  const { snapshot } = useLearning();
  const count = snapshot.progress[kitchenScene.id]?.discoveredVocabularyIds.length ?? 0;
  const label = count === kitchenScene.vocabularyIds.length ? 'Review' : count > 0 ? 'Continue' : 'Start Exploring';
  const [view, setView] = useState<'learned' | 'not-started' | 'plans'>(count > 0 ? 'learned' : 'not-started');
  const visible = view === 'learned' ? count > 0 : view === 'not-started' ? count === 0 : false;
  return <View className='page category-page'>
    <View className='page-actions'><Text onClick={() => Taro.navigateBack()}>← 返回首页</Text></View>
    <Text className='eyebrow'>Choose a scene</Text><Text className='title'>饮食篇</Text>
    <Text className='muted'>Food & Dining</Text>
    <View className='scene-tabs'>
      <Button className={`scene-tab ${view === 'learned' ? 'active' : ''}`} onClick={() => setView('learned')}>已经学习 ({count > 0 ? 1 : 0})</Button>
      <Button className={`scene-tab ${view === 'not-started' ? 'active' : ''}`} onClick={() => setView('not-started')}>未学习 ({count === 0 ? 1 : 0})</Button>
      <Button className={`scene-tab ${view === 'plans' ? 'active' : ''}`} onClick={() => setView('plans')}>规划中</Button>
    </View>
    {view !== 'plans' && visible ? <View className='card scene-card' onClick={() => Taro.navigateTo({ url: '/pages/scene/index' })}>
      <Image className='thumbnail' src='/assets/kitchen-cooking.webp' mode='aspectFit' />
      <Text className='scene-title'>{kitchenScene.title}</Text>
      <Text className='muted'>{count}/{kitchenScene.vocabularyIds.length} discovered</Text>
      <View className='progress'><View className='progress-fill' style={{ width: `${count / kitchenScene.vocabularyIds.length * 100}%` }} /></View>
      <Button className='button primary'>{label}</Button>
    </View> : null}
    {view !== 'plans' && !visible ? <View className='card empty-state'><Text>{view === 'learned'
      ? '还没有学习过的场景。发现至少一个单词后会显示在这里。'
      : '所有已发布场景都已经开始学习。'}</Text></View> : null}
    {view === 'plans' ? <View className='card coming-soon'><Text>More scenes · Coming soon</Text><Text className='muted'>其他网页版场景会在逐一迁移并校准后发布，不展示假入口。</Text></View> : null}
  </View>;
}
