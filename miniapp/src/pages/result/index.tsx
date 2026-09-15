import Taro, { getCurrentInstance } from '@tarojs/taro';
import { Button, Text, View } from '@tarojs/components';
import { useState } from 'react';
import { kitchenVocabularyById, summarizeChallenge } from '@shared';
import { useLearning } from '../../state/learning';
import './index.scss';

function feedback(score: number, total: number) {
  if (score === total) return { title: 'Excellent!', detail: '全部单词都在第一次回答时答对了。' };
  if (score >= Math.ceil(total * 0.7)) return { title: 'Great progress!', detail: '大部分单词已经掌握，再练习错词会更牢固。' };
  return { title: 'Keep exploring.', detail: '成绩只记录第一次回答；你仍然可以继续练到答对。' };
}

export default function ResultPage() {
  const attemptId = getCurrentInstance().router?.params.attemptId ?? '';
  const { snapshot, createAttempt } = useLearning();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const attempt = snapshot.attempts[attemptId];
  if (!attempt?.completedAt) return <View className='page empty-page'><Text className='title'>Result unavailable</Text>
    <Text>这次挑战尚未完成，学习记录没有丢失。</Text>
    <Button className='button primary' onClick={() => Taro.redirectTo({ url: '/pages/scene/index' })}>Back to Kitchen</Button></View>;
  const result = summarizeChallenge(attempt);
  const message = feedback(result.score, result.total);

  function start(kind: 'full' | 'weak') {
    const next = createAttempt(kind, kind === 'weak' ? result.needsPractice : undefined);
    void Taro.redirectTo({ url: `/pages/challenge/index?attemptId=${next.attemptId}` });
  }

  return <View className='page result-page'>
    <Text className='eyebrow'>{attempt.kind === 'weak' ? 'Weak word practice result' : 'Real first-attempt result'}</Text>
    <Text className='result-title'>{message.title}</Text><Text className='result-description'>{message.detail}</Text>
    <View className='score-card card'><View><Text className='score'>{result.score}/{result.total}</Text><Text className='score-label'>Total score</Text></View>
      <View><Text className='accuracy'>{result.accuracy}%</Text><Text className='score-label'>First-answer accuracy</Text></View></View>
    <View className='card'><Text className='section-title'>Remembered · 已掌握 ({result.remembered.length})</Text>
      <Text>{result.remembered.length ? result.remembered.map(id => kitchenVocabularyById[id].word).join(' · ') : '0'}</Text></View>
    <View className='card'><Text className='section-title'>Needs practice · 需练习 ({result.needsPractice.length})</Text>
      <Text>{result.needsPractice.length ? result.needsPractice.map(id => kitchenVocabularyById[id].word).join(' · ') : '0'}</Text></View>
    <View className='result-actions'>
      {result.needsPractice.length ? <Button className='button primary' onClick={() => start('weak')}>Practice Weak Words · 练习错词</Button> : null}
      <Button className={`button ${result.needsPractice.length ? '' : 'primary'}`} onClick={() => start('full')}>Retry Full Challenge · 再试一次</Button>
      <Button className='button' onClick={() => Taro.navigateTo({ url: '/pages/review/index' })}>Review All Words · 复习词卡</Button>
      <Button className='button' onClick={() => setDetailsOpen(value => !value)}>{detailsOpen ? 'Hide Attempt Details' : 'View This Attempt · 答题详情'}</Button>
    </View>
    {detailsOpen ? <View className='attempt-details card'><Text className='section-title'>First answers and attempts</Text>
      {attempt.questions.map((question, position) => <View className='attempt-row' key={question.id}>
        <Text>{position + 1}. {kitchenVocabularyById[question.vocabularyId].word}</Text>
        <Text className={question.answers[0]?.correct ? 'remembered' : 'practice'}>
          {question.mode === 'find' ? 'Listen & Find' : 'What is this'} · {question.answers[0]?.correct ? 'Remembered' : 'Needs practice'} · {question.answers.length} {question.answers.length === 1 ? 'try' : 'tries'}
        </Text>
      </View>)}</View> : null}
    <Button className='button primary' onClick={() => Taro.redirectTo({ url: '/pages/scene/index' })}>Back to Kitchen</Button>
    <Button className='button subtle' onClick={() => Taro.reLaunch({ url: '/pages/index/index' })}>Back Home</Button>
  </View>;
}
