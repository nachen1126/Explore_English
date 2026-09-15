import Taro, { getCurrentInstance, useUnload } from '@tarojs/taro';
import { Button, Input, Text, View } from '@tarojs/components';
import { useCallback, useMemo, useState } from 'react';
import {
  currentChallengeQuestion, kitchenVocabularyById, matchesAnswer, type AnswerRecord,
} from '@shared';
import { SceneCanvas } from '../../components/SceneCanvas';
import { useRecorder } from '../../hooks/useRecorder';
import { useLearning } from '../../state/learning';
import { playPronunciation, stopPronunciation } from '../../services/cloud';
import '../../components/SceneCanvas.scss';
import './index.scss';

export default function ChallengePage() {
  const attemptId = getCurrentInstance().router?.params.attemptId ?? '';
  const { snapshot, answer } = useLearning();
  const attempt = snapshot.attempts[attemptId];
  const question = attempt ? currentChallengeQuestion(attempt) : undefined;
  const item = question ? kitchenVocabularyById[question.vocabularyId] : undefined;
  const [typed, setTyped] = useState('');
  const [feedback, setFeedback] = useState('');
  const [audioMessage, setAudioMessage] = useState('');

  const submit = useCallback((value: string, source: AnswerRecord['source'], recognitionId?: string) => {
    if (!attempt || !question || !item) return;
    const correct = source === 'hotspot' ? value === question.vocabularyId : matchesAnswer(value, item);
    const next = answer(attempt.attemptId, question.id, { answer: value, correct, at: Date.now(), source, recognitionId });
    setFeedback(correct ? 'Correct · 答对了' : 'Try again · 首次得分已记录，可继续练习');
    setTyped('');
    if (next?.completedAt) void Taro.redirectTo({ url: `/pages/result/index?attemptId=${attempt.attemptId}` });
  }, [answer, attempt, item, question]);

  const onRecognized = useCallback((text: string, recognitionId: string) => submit(text, 'speech', recognitionId), [submit]);
  const recorder = useRecorder(onRecognized);
  useUnload(stopPronunciation);
  const completedCount = useMemo(() => attempt?.questions.filter(value => value.answers.some(record => record.correct)).length ?? 0, [attempt]);

  if (!attempt) return <View className='page'><Text className='title'>Challenge unavailable</Text><Text>未找到挑战记录，请返回场景重新开始。</Text></View>;
  if (!question || !item) return <View className='page'><Text>Preparing result…</Text></View>;
  return <View className='page challenge-page'>
    <View className='challenge-top'><Text className='eyebrow'>{question.mode === 'find' ? 'Listen & Find' : 'What is this?'}</Text><Text>{completedCount + 1}/10</Text></View>
    <View className='progress'><View className='progress-fill' style={{ width: `${completedCount * 10}%` }} /></View>
    {question.mode === 'find' ? <>
      <View className='prompt card'><Text className='prompt-label'>Listen, then find this word</Text><Text className='prompt-word'>{item.word}</Text>
        <Button className='button' onClick={() => { setAudioMessage('Loading audio…'); void playPronunciation(item.id, error => {
          setAudioMessage(`播放中断，请重试或检查设备音量。${error.message}`);
        }).then(() => setAudioMessage('Playing…')).catch(error => {
          const detail = error instanceof Error ? error.message : 'Audio unavailable.';
          setAudioMessage(`无法播放发音，请稍后重试。${detail}`);
        }); }}>🔊 Play pronunciation</Button>
        {audioMessage ? <Text className='muted'>{audioMessage}</Text> : null}<Text className='muted'>请根据发音在图片中点击对应物品。</Text></View>
      <SceneCanvas discovered={[]} targetId={question.answers.length >= 2 ? question.vocabularyId : undefined} onSelect={id => submit(id, 'hotspot')} />
    </> : <>
      <View className='prompt card'><Text className='prompt-label'>What is this?</Text><Text className='meaning'>{item.chineseMeaning}</Text><Text className='muted'>{item.exampleSentence.replace(new RegExp(item.word, 'i'), '_____')}</Text></View>
      <Input className='input' value={typed} onInput={event => setTyped(event.detail.value)} placeholder='Type the English word' confirmType='done' onConfirm={() => submit(typed, 'typing')} />
      <Button className='button primary' disabled={!typed.trim()} onClick={() => submit(typed, 'typing')}>Submit answer</Button>
      <View className='row'><Button className='button' disabled={recorder.state === 'processing'} onClick={() => void recorder.start()}>🎙 {recorder.state === 'listening' ? 'Listening…' : 'Speak answer'}</Button>
        {recorder.state === 'listening' ? <Button className='button warn' onClick={recorder.stop}>Stop</Button> : null}</View>
      {recorder.message ? <View className={`status ${recorder.state === 'error' ? 'error' : ''}`}><Text>{recorder.message}</Text></View> : null}
    </>}
    {feedback ? <View className='status'><Text>{feedback}</Text></View> : null}
  </View>;
}
