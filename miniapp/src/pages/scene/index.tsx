import Taro, { useUnload } from '@tarojs/taro';
import { Button, Text, View } from '@tarojs/components';
import { useMemo, useRef, useState } from 'react';
import { kitchenScene, kitchenVocabularyById } from '@shared';
import { SceneCanvas } from '../../components/SceneCanvas';
import { WordPanel } from '../../components/WordPanel';
import { useLearning } from '../../state/learning';
import { playPronunciation, stopPronunciation } from '../../services/cloud';
import { uiCopy } from '../../ui/copy';
import '../../components/SceneCanvas.scss';
import '../../components/WordPanel.scss';
import './index.scss';

export default function ScenePage() {
  const { snapshot, discover, restartScene, createAttempt } = useLearning();
  const progress = snapshot.progress[kitchenScene.id];
  const discovered = progress?.discoveredVocabularyIds ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(discovered.at(-1) ?? null);
  const [targetId, setTargetId] = useState<string | undefined>();
  const [audioMessage, setAudioMessage] = useState('');
  const pronunciationRequest = useRef(0);
  const complete = discovered.length === kitchenScene.vocabularyIds.length;
  const incompleteAttempt = useMemo(() => Object.values(snapshot.attempts)
    .filter(attempt => attempt.sceneId === kitchenScene.id && !attempt.completedAt)
    .sort((a, b) => b.startedAt - a.startedAt)[0], [snapshot.attempts]);

  useUnload(stopPronunciation);

  function selectWord(vocabularyId: string) {
    const request = pronunciationRequest.current + 1;
    pronunciationRequest.current = request;
    discover(vocabularyId);
    setSelectedId(vocabularyId); setTargetId(vocabularyId); setAudioMessage('正在播放当前单词…');
    void playPronunciation(vocabularyId, error => {
      console.error('[Explore English][Scene] automatic pronunciation was interrupted.', error);
      if (pronunciationRequest.current === request) setAudioMessage('播放中断，请检查设备音量。');
    })
      .then(() => { if (pronunciationRequest.current === request) setAudioMessage('已播放；可以点击词卡再次收听。'); })
      .catch(error => {
        console.error('[Explore English][Scene] automatic pronunciation failed.', error);
        if (pronunciationRequest.current === request) setAudioMessage('自动发音暂时不可用，词卡和学习进度不受影响。');
      });
  }

  function nextWord() {
    const selectedIndex = selectedId ? kitchenScene.vocabularyIds.indexOf(selectedId) : -1;
    const next = kitchenScene.vocabularyIds[selectedIndex + 1]
      ?? kitchenScene.vocabularyIds.find(id => !discovered.includes(id));
    if (next) selectWord(next);
  }

  function startChallenge() {
    const attempt = createAttempt('full');
    void Taro.navigateTo({ url: `/pages/challenge/index?attemptId=${attempt.attemptId}` });
  }

  async function startOver() {
    const choice = await Taro.showModal({
      title: '重新探索这个场景？',
      content: '这会清除厨房场景中已发现的物品，但不会删除已经完成的挑战成绩。',
      confirmText: '重新开始', confirmColor: '#8a2630',
    });
    if (!choice.confirm) return;
    pronunciationRequest.current += 1; stopPronunciation(); restartScene(); setSelectedId(null); setTargetId(undefined); setAudioMessage('');
  }

  return <View className='page scene-page'>
    <View className='page-actions'><Text onClick={() => Taro.navigateBack()}>← 返回分类</Text><Text onClick={() => Taro.reLaunch({ url: '/pages/index/index' })}>首页</Text></View>
    <Text className='eyebrow'>探索场景</Text>
    <View className='scene-header'><Text className='scene-name'>{uiCopy.kitchenTitle}</Text><Text>{discovered.length}/10</Text></View>
    <View className='progress'><View className='progress-fill' style={{ width: `${discovered.length * 10}%` }} /></View>
    <SceneCanvas discovered={discovered} targetId={targetId} onSelect={selectWord} />
    <Text className='hint'>点击图片中的物品查看词义并自动听发音。对号始终位于对应热点内。</Text>
    {audioMessage ? <View className='status'><Text>{audioMessage}</Text></View> : null}
    {selectedId ? <WordPanel item={kitchenVocabularyById[selectedId]} />
      : <View className='card'><Text className='section-title'>场景里藏着 10 个单词</Text><Text>请先在图片中发现一个物品。</Text></View>}
    <View className='scene-tools'>
      {!complete ? <Button className='button primary' onClick={nextWord}>下一个单词</Button> : null}
      <Button className='button' onClick={() => {
        const next = kitchenScene.vocabularyIds.find(id => !discovered.includes(id)) ?? kitchenScene.vocabularyIds[0];
        setTargetId(next); setSelectedId(complete ? next : selectedId);
      }}>{complete ? '复习物品' : '显示提示'}</Button>
      <Button className='button subtle' onClick={() => void startOver()}>重新开始</Button>
    </View>
    {complete ? <View className='completion card'>
      <Text className='section-title'>全部找到了！</Text>
      {incompleteAttempt ? <Button className='button primary' onClick={() => Taro.navigateTo({ url: `/pages/challenge/index?attemptId=${incompleteAttempt.attemptId}` })}>继续挑战</Button> : null}
      <Button className={`button ${incompleteAttempt ? '' : 'primary'}`} onClick={startChallenge}>开始新挑战</Button>
      <Button className='button' onClick={() => Taro.navigateTo({ url: '/pages/review/index' })}>复习单词</Button>
    </View> : null}
  </View>;
}
