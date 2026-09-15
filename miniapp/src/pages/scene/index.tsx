import Taro from '@tarojs/taro';
import { Button, Text, View } from '@tarojs/components';
import { kitchenScene, kitchenVocabularyById } from '@shared';
import { SceneCanvas } from '../../components/SceneCanvas';
import { WordPanel } from '../../components/WordPanel';
import { useLearning } from '../../state/learning';
import '../../components/SceneCanvas.scss';
import '../../components/WordPanel.scss';
import './index.scss';

export default function ScenePage() {
  const { snapshot, discover, createAttempt } = useLearning();
  const progress = snapshot.progress[kitchenScene.id];
  const discovered = progress?.discoveredVocabularyIds ?? [];
  const currentId = discovered[discovered.length - 1];
  const complete = discovered.length === kitchenScene.vocabularyIds.length;
  function startChallenge() {
    const attempt = createAttempt();
    Taro.navigateTo({ url: `/pages/challenge/index?attemptId=${attempt.attemptId}` });
  }
  return <View className='page scene-page'>
    <Text className='eyebrow'>Explore the picture</Text>
    <View className='scene-header'><Text className='scene-name'>{kitchenScene.title}</Text><Text>{discovered.length}/10</Text></View>
    <View className='progress'><View className='progress-fill' style={{ width: `${discovered.length * 10}%` }} /></View>
    <SceneCanvas discovered={discovered} onSelect={discover} />
    <Text className='hint'>点击图片中的物品学习单词。对号始终位于对应热点内。</Text>
    {currentId ? <WordPanel item={kitchenVocabularyById[currentId]} /> : <View className='card'><Text>请先在图片中发现一个物品。</Text></View>}
    {complete ? <Button className='button primary' onClick={startChallenge}>Start Challenge · 开始挑战</Button> : null}
  </View>;
}
