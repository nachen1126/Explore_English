import Taro, { getCurrentInstance } from '@tarojs/taro';
import { Button, Image, Text, View } from '@tarojs/components';
import { useState } from 'react';
import { categoryById, miniappCategories, scenesForCategory, type MiniappScene } from '../../data/catalog';
import { useLearning } from '../../state/learning';
import './index.scss';

function SceneCard({ scene, discovered }: { scene: MiniappScene; discovered: number }) {
  const [imageFailed, setImageFailed] = useState(false);
  const total = scene.vocabularyIds.length;
  const completed = discovered === total;
  const status = completed ? '已完成' : discovered > 0 ? `已学习 ${discovered}/${total}` : '未学习';
  const action = completed ? '复习' : discovered > 0 ? '继续' : '开始探索';

  return <View className='card scene-card' onClick={() => Taro.navigateTo({ url: `/pages/scene/index?sceneId=${scene.id}` })}>
    {!imageFailed ? <Image className='thumbnail' src={scene.thumbnailAsset} mode='aspectFit'
      lazyLoad onError={error => { console.error(`[Explore English][Category] ${scene.id} thumbnail failed.`, error); setImageFailed(true); }} />
      : <View className='thumbnail thumbnail-error'><Text>缩略图加载失败</Text><Text className='muted'>进入场景后可以重新加载大图。</Text></View>}
    <Text className='scene-title'>{scene.chineseTitle}</Text>
    <Text className='scene-english-name'>{scene.title}</Text>
    <View className='scene-meta'><Text>{total} 个单词</Text><Text>{status}</Text></View>
    <View className='progress'><View className='progress-fill' style={{ width: `${discovered / total * 100}%` }} /></View>
    <Button className='button primary'>{action}</Button>
  </View>;
}

export default function CategoryPage() {
  const requestedId = getCurrentInstance().router?.params.categoryId ?? miniappCategories[0]?.id ?? '';
  const category = categoryById(requestedId);
  const { snapshot } = useLearning();
  const [view, setView] = useState<'learned' | 'not-started'>('not-started');

  if (!category) return <View className='page empty-page'><Text className='title'>分类不可用</Text>
    <Button className='button primary' onClick={() => Taro.reLaunch({ url: '/pages/index/index' })}>返回首页</Button></View>;

  const scenes = scenesForCategory(category.id);
  const learned = scenes.filter(scene => (snapshot.progress[scene.id]?.discoveredVocabularyIds.length ?? 0) > 0);
  const notStarted = scenes.filter(scene => (snapshot.progress[scene.id]?.discoveredVocabularyIds.length ?? 0) === 0);
  const visible = view === 'learned' ? learned : notStarted;

  return <View className='page category-page'>
    <View className='page-actions'><Text onClick={() => Taro.navigateBack()}>← 返回首页</Text></View>
    <Text className='eyebrow'>选择场景</Text><Text className='title'>{category.chineseTitle}</Text>
    <Text className='category-english'>{category.title}</Text>
    <Text className='muted'>{category.description}</Text>
    <View className='scene-tabs two-tabs'>
      <Button className={`scene-tab ${view === 'learned' ? 'active' : ''}`} onClick={() => setView('learned')}>已经学习 ({learned.length})</Button>
      <Button className={`scene-tab ${view === 'not-started' ? 'active' : ''}`} onClick={() => setView('not-started')}>未学习 ({notStarted.length})</Button>
    </View>
    <View className='scene-list'>
      {visible.map(scene => <SceneCard key={scene.id} scene={scene}
        discovered={snapshot.progress[scene.id]?.discoveredVocabularyIds.length ?? 0} />)}
    </View>
    {!visible.length ? <View className='card empty-state'><Text>{view === 'learned'
      ? '还没有学习过的场景。发现至少一个单词后会显示在这里。'
      : '这个分类中的场景都已经开始学习。'}</Text></View> : null}
  </View>;
}
