import Taro, { getCurrentInstance } from '@tarojs/taro';
import { Button, Text, View } from '@tarojs/components';
import { kitchenVocabularyById, summarizeChallenge } from '@shared';
import { useLearning } from '../../state/learning';
import './index.scss';

export default function ResultPage() {
  const attemptId = getCurrentInstance().router?.params.attemptId ?? '';
  const { snapshot } = useLearning();
  const attempt = snapshot.attempts[attemptId];
  if (!attempt?.completedAt) return <View className='page'><Text className='title'>Result unavailable</Text><Text>这次挑战尚未完成。</Text></View>;
  const result = summarizeChallenge(attempt);
  return <View className='page result-page'>
    <Text className='eyebrow'>Real first-attempt result</Text><Text className='title'>{result.score}/{result.total}</Text>
    <Text className='accuracy'>{result.accuracy}% first-answer accuracy</Text>
    <View className='card'><Text className='section-title'>Remembered · 已掌握</Text>
      <Text>{result.remembered.length ? result.remembered.map(id => kitchenVocabularyById[id].word).join(' · ') : '0'}</Text></View>
    <View className='card'><Text className='section-title'>Needs practice · 需练习</Text>
      <Text>{result.needsPractice.length ? result.needsPractice.map(id => kitchenVocabularyById[id].word).join(' · ') : '0'}</Text></View>
    <Button className='button primary' onClick={() => Taro.redirectTo({ url: '/pages/scene/index' })}>Back to Kitchen</Button>
  </View>;
}
