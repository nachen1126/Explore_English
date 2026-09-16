import Taro, { getCurrentInstance, useUnload } from '@tarojs/taro';
import { Button, Text, View } from '@tarojs/components';
import { useMemo, useState } from 'react';
import { weakVocabularyIds } from '@shared';
import { WordPanel } from '../../components/WordPanel';
import { miniappSceneById, miniappVocabularyById } from '../../data/catalog';
import { useLearning } from '../../state/learning';
import { stopPronunciation } from '../../services/cloud';
import '../../components/WordPanel.scss';
import './index.scss';

export default function ReviewPage() {
  const sceneId = getCurrentInstance().router?.params.sceneId ?? 'kitchen-2';
  const scene = miniappSceneById[sceneId];
  const { snapshot, createAttempt } = useLearning();
  const weak = useMemo(() => weakVocabularyIds(Object.values(snapshot.attempts)
    .filter(attempt => attempt.sceneId === sceneId)), [sceneId, snapshot.attempts]);
  const orderedIds = useMemo(() => [...(scene?.vocabularyIds ?? [])]
    .sort((a, b) => Number(weak.includes(b)) - Number(weak.includes(a))), [scene, weak]);
  const [index, setIndex] = useState(0);
  const vocabularyId = orderedIds[index];
  const ready = !!scene && scene.vocabularyIds.every(id => snapshot.progress[scene.id]?.discoveredVocabularyIds.includes(id));
  useUnload(stopPronunciation);

  function startChallenge() {
    if (!scene) return;
    const attempt = createAttempt(scene.id, 'full');
    void Taro.redirectTo({ url: `/pages/challenge/index?attemptId=${attempt.attemptId}` });
  }

  if (!scene || !vocabularyId) return <View className='page empty-page'><Text className='title'>场景不可用</Text>
    <Text>没有找到可复习的场景单词。</Text>
    <Button className='button primary' onClick={() => Taro.reLaunch({ url: '/pages/index/index' })}>返回首页</Button></View>;

  return <View className='page review-page'>
    <View className='page-actions'><Text onClick={() => Taro.navigateBack()}>← 返回场景</Text><Text onClick={() => Taro.reLaunch({ url: '/pages/index/index' })}>首页</Text></View>
    <Text className='eyebrow'>{scene.chineseTitle}</Text><Text className='title'>复习单词</Text>
    <Text className='muted'>重新听发音、阅读例句；需要练习的单词会排在前面。</Text>
    <View className='review-counter'><Text>{index + 1}/{orderedIds.length}</Text>{weak.includes(vocabularyId) ? <Text className='practice-label'>需要练习</Text> : null}</View>
    <WordPanel item={miniappVocabularyById[vocabularyId]} />
    <View className='review-navigation row'>
      <Button className='button' disabled={index === 0} onClick={() => setIndex(value => Math.max(0, value - 1))}>上一个</Button>
      <Button className='button primary' disabled={index === orderedIds.length - 1} onClick={() => setIndex(value => Math.min(orderedIds.length - 1, value + 1))}>下一个</Button>
    </View>
    {ready ? <Button className='button primary' onClick={startChallenge}>开始挑战</Button>
      : <Button className='button primary' onClick={() => Taro.redirectTo({ url: `/pages/scene/index?sceneId=${scene.id}` })}>继续探索</Button>}
  </View>;
}
