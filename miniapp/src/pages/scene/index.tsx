import Taro, { getCurrentInstance, useUnload } from '@tarojs/taro';
import { Button, Text, View } from '@tarojs/components';
import { useMemo, useRef, useState } from 'react';
import { SceneCanvas } from '../../components/SceneCanvas';
import { WordPanel } from '../../components/WordPanel';
import { miniappSceneById, miniappVocabularyById } from '../../data/catalog';
import { useLearning } from '../../state/learning';
import { playPronunciation, stopPronunciation } from '../../services/cloud';
import '../../components/SceneCanvas.scss';
import '../../components/WordPanel.scss';
import './index.scss';

export default function ScenePage() {
  const sceneId = getCurrentInstance().router?.params.sceneId ?? 'kitchen-2';
  const scene = miniappSceneById[sceneId];
  const { snapshot, discover, restartScene, createAttempt } = useLearning();
  const progress = scene ? snapshot.progress[scene.id] : undefined;
  const discovered = progress?.discoveredVocabularyIds ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(discovered.at(-1) ?? null);
  const [targetId, setTargetId] = useState<string | undefined>();
  const [audioMessage, setAudioMessage] = useState('');
  const pronunciationRequest = useRef(0);
  const complete = !!scene && discovered.length === scene.vocabularyIds.length;
  const incompleteAttempt = useMemo(() => Object.values(snapshot.attempts)
    .filter(attempt => attempt.sceneId === sceneId && !attempt.completedAt)
    .sort((a, b) => b.startedAt - a.startedAt)[0], [sceneId, snapshot.attempts]);

  useUnload(stopPronunciation);

  function selectWord(vocabularyId: string) {
    if (!scene) return;
    const request = pronunciationRequest.current + 1;
    pronunciationRequest.current = request;
    discover(scene.id, vocabularyId);
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
    if (!scene) return;
    const selectedIndex = selectedId ? scene.vocabularyIds.indexOf(selectedId) : -1;
    const next = scene.vocabularyIds[selectedIndex + 1]
      ?? scene.vocabularyIds.find(id => !discovered.includes(id));
    if (next) selectWord(next);
  }

  function startChallenge() {
    if (!scene) return;
    const attempt = createAttempt(scene.id, 'full');
    void Taro.navigateTo({ url: `/pages/challenge/index?attemptId=${attempt.attemptId}` });
  }

  async function startOver() {
    if (!scene) return;
    const choice = await Taro.showModal({
      title: '重新探索这个场景？',
      content: `这会清除“${scene.chineseTitle}”中已发现的物品，但不会删除已经完成的挑战成绩。`,
      confirmText: '重新开始', confirmColor: '#8a2630',
    });
    if (!choice.confirm) return;
    pronunciationRequest.current += 1; stopPronunciation(); restartScene(scene.id); setSelectedId(null); setTargetId(undefined); setAudioMessage('');
  }

  if (!scene) return <View className='page empty-page'><Text className='title'>场景不可用</Text>
    <Text>没有找到这个场景，请返回分类重新选择。</Text>
    <Button className='button primary' onClick={() => Taro.navigateBack()}>返回分类</Button></View>;

  return <View className='page scene-page'>
    <View className='page-actions'><Text onClick={() => Taro.navigateBack()}>← 返回分类</Text><Text onClick={() => Taro.reLaunch({ url: '/pages/index/index' })}>首页</Text></View>
    <Text className='eyebrow'>探索场景</Text>
    <View className='scene-header'><Text className='scene-name'>{scene.chineseTitle}</Text><Text>{discovered.length}/{scene.vocabularyIds.length}</Text></View>
    <Text className='scene-english-name'>{scene.title}</Text>
    <View className='progress'><View className='progress-fill' style={{ width: `${discovered.length / scene.vocabularyIds.length * 100}%` }} /></View>
    <SceneCanvas key={scene.id} scene={scene} imageSrc={scene.imageAsset} discovered={discovered} targetId={targetId} onSelect={selectWord} />
    <Text className='hint'>点击图片中的物品查看词义并自动听发音。对号始终位于对应热点内。</Text>
    {audioMessage ? <View className='status'><Text>{audioMessage}</Text></View> : null}
    {selectedId && miniappVocabularyById[selectedId] ? <WordPanel item={miniappVocabularyById[selectedId]} />
      : <View className='card'><Text className='section-title'>场景里藏着 {scene.vocabularyIds.length} 个单词</Text><Text>请先在图片中发现一个物品。</Text></View>}
    <View className='scene-tools'>
      {!complete ? <Button className='button primary' onClick={nextWord}>下一个单词</Button> : null}
      <Button className='button' onClick={() => {
        const next = scene.vocabularyIds.find(id => !discovered.includes(id)) ?? scene.vocabularyIds[0];
        setTargetId(next); setSelectedId(complete ? next : selectedId);
      }}>{complete ? '复习物品' : '显示提示'}</Button>
      <Button className='button subtle' onClick={() => void startOver()}>重新开始</Button>
    </View>
    {complete ? <View className='completion card'>
      <Text className='section-title'>全部找到了！</Text>
      {incompleteAttempt ? <Button className='button primary' onClick={() => Taro.navigateTo({ url: `/pages/challenge/index?attemptId=${incompleteAttempt.attemptId}` })}>继续挑战</Button> : null}
      <Button className={`button ${incompleteAttempt ? '' : 'primary'}`} onClick={startChallenge}>开始新挑战</Button>
      <Button className='button' onClick={() => Taro.navigateTo({ url: `/pages/review/index?sceneId=${scene.id}` })}>复习单词</Button>
    </View> : null}
  </View>;
}
