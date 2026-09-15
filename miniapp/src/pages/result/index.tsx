import Taro, { getCurrentInstance } from '@tarojs/taro';
import { Button, Text, View } from '@tarojs/components';
import { useState } from 'react';
import { kitchenVocabularyById, summarizeChallenge } from '@shared';
import { useLearning } from '../../state/learning';
import { challengeModeLabel } from '../../ui/copy';
import './index.scss';

function feedback(score: number, total: number) {
  if (score === total) return { title: '太棒了！', detail: '全部单词都在第一次回答时答对了。' };
  if (score >= Math.ceil(total * 0.7)) return { title: '进步很大！', detail: '大部分单词已经掌握，再练习错词会更牢固。' };
  return { title: '继续加油！', detail: '成绩只记录第一次回答；你仍然可以继续练到答对。' };
}

export default function ResultPage() {
  const attemptId = getCurrentInstance().router?.params.attemptId ?? '';
  const { snapshot, createAttempt } = useLearning();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const attempt = snapshot.attempts[attemptId];
  if (!attempt?.completedAt) return <View className='page empty-page'><Text className='title'>暂无挑战结果</Text>
    <Text>这次挑战尚未完成，学习记录没有丢失。</Text>
    <Button className='button primary' onClick={() => Taro.redirectTo({ url: '/pages/scene/index' })}>返回厨房</Button></View>;
  const result = summarizeChallenge(attempt);
  const message = feedback(result.score, result.total);

  function start(kind: 'full' | 'weak') {
    const next = createAttempt(kind, kind === 'weak' ? result.needsPractice : undefined);
    void Taro.redirectTo({ url: `/pages/challenge/index?attemptId=${next.attemptId}` });
  }

  return <View className='page result-page'>
    <Text className='eyebrow'>{attempt.kind === 'weak' ? '弱词练习成绩' : '首次答题成绩'}</Text>
    <Text className='result-title'>{message.title}</Text><Text className='result-description'>{message.detail}</Text>
    <View className='score-card card'><View><Text className='score'>{result.score}/{result.total}</Text><Text className='score-label'>总分</Text></View>
      <View><Text className='accuracy'>{result.accuracy}%</Text><Text className='score-label'>首次回答正确率</Text></View></View>
    <View className='card'><Text className='section-title'>已掌握 ({result.remembered.length})</Text>
      <Text>{result.remembered.length ? result.remembered.map(id => kitchenVocabularyById[id].word).join(' · ') : '0'}</Text></View>
    <View className='card'><Text className='section-title'>需要练习 ({result.needsPractice.length})</Text>
      <Text>{result.needsPractice.length ? result.needsPractice.map(id => kitchenVocabularyById[id].word).join(' · ') : '0'}</Text></View>
    <View className='result-actions'>
      {result.needsPractice.length ? <Button className='button primary' onClick={() => start('weak')}>练习错词</Button> : null}
      <Button className={`button ${result.needsPractice.length ? '' : 'primary'}`} onClick={() => start('full')}>重新挑战</Button>
      <Button className='button' onClick={() => Taro.navigateTo({ url: '/pages/review/index' })}>复习所有单词</Button>
      <Button className='button' onClick={() => setDetailsOpen(value => !value)}>{detailsOpen ? '收起答题详情' : '查看本次答题详情'}</Button>
    </View>
    {detailsOpen ? <View className='attempt-details card'><Text className='section-title'>首次回答与尝试次数</Text>
      {attempt.questions.map((question, position) => <View className='attempt-row' key={question.id}>
        <Text>{position + 1}. {kitchenVocabularyById[question.vocabularyId].word}</Text>
        <Text className={question.answers[0]?.correct ? 'remembered' : 'practice'}>
          {challengeModeLabel(question.mode)} · {question.answers[0]?.correct ? '已掌握' : '需要练习'} · 尝试 {question.answers.length} 次
        </Text>
      </View>)}</View> : null}
    <Button className='button primary' onClick={() => Taro.redirectTo({ url: '/pages/scene/index' })}>返回厨房</Button>
    <Button className='button subtle' onClick={() => Taro.reLaunch({ url: '/pages/index/index' })}>返回首页</Button>
  </View>;
}
