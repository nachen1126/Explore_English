import Taro, { getCurrentInstance, useUnload } from '@tarojs/taro';
import { Button, Input, Text, View } from '@tarojs/components';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  currentChallengeQuestion, hasChallengeHint, isQuestionSolved, kitchenVocabularyById, matchesAnswer,
  wrongChallengeAttempts, type AnswerRecord, type ChallengeAttempt,
} from '@shared';
import { PronunciationButton } from '../../components/PronunciationButton';
import { SceneCanvas } from '../../components/SceneCanvas';
import { useRecorder } from '../../hooks/useRecorder';
import { useLearning } from '../../state/learning';
import { playPronunciation, stopPronunciation } from '../../services/cloud';
import { challengeModeLabel, uiCopy } from '../../ui/copy';
import '../../components/SceneCanvas.scss';
import './index.scss';

export default function ChallengePage() {
  const attemptId = getCurrentInstance().router?.params.attemptId ?? '';
  const { snapshot, answer, reveal } = useLearning();
  const attempt = snapshot.attempts[attemptId];
  const initialQuestion = attempt ? currentChallengeQuestion(attempt) : undefined;
  const [index, setIndex] = useState(() => attempt && initialQuestion
    ? attempt.questions.findIndex(question => question.id === initialQuestion.id)
    : attempt?.questions.length ?? 0);
  const question = attempt?.questions[index];
  const item = question ? kitchenVocabularyById[question.vocabularyId] : undefined;
  const [typed, setTyped] = useState('');
  const [feedback, setFeedback] = useState('');
  const [audioMessage, setAudioMessage] = useState('');
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const moveNext = useCallback(() => {
    if (!attempt || !question) return;
    if (advanceTimer.current) { clearTimeout(advanceTimer.current); advanceTimer.current = null; }
    stopPronunciation(); setTyped(''); setFeedback(''); setAudioMessage('');
    if (index >= attempt.questions.length - 1) {
      void Taro.redirectTo({ url: `/pages/result/index?attemptId=${attempt.attemptId}` });
    } else setIndex(value => value + 1);
  }, [attempt, index, question]);

  const submit = useCallback((value: string, source: AnswerRecord['source'], recognitionId?: string) => {
    if (!attempt || !question || !item || isQuestionSolved(question) || !/[\p{L}\p{N}]/u.test(value)) return;
    const correct = source === 'hotspot' ? value === question.vocabularyId : matchesAnswer(value, item);
    answer(attempt.attemptId, question.id, { answer: value, correct, at: Date.now(), source, recognitionId });
    setFeedback(correct
      ? (question.answers.length === 0 ? '第一次回答正确' : '已答对，但本题仍计入需练习')
      : `第 ${question.answers.length + 1} 次回答不正确，请继续尝试`);
    setTyped('');
    if (correct && question.mode === 'find') {
      advanceTimer.current = setTimeout(moveNext, 650);
    }
  }, [answer, attempt, item, moveNext, question]);

  const onRecognized = useCallback((text: string, recognitionId: string) => submit(text, 'speech', recognitionId), [submit]);
  const recorder = useRecorder(onRecognized);
  useEffect(() => { recorder.reset(); }, [question?.id]);
  useUnload(() => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    stopPronunciation();
  });
  const completedCount = useMemo(() => attempt?.questions.filter(value => isQuestionSolved(value)).length ?? 0, [attempt]);

  if (!attempt) return <View className='page empty-page'><Text className='title'>无法打开挑战</Text>
    <Text>未找到挑战记录，请返回场景重新开始。</Text>
    <Button className='button primary' onClick={() => Taro.redirectTo({ url: '/pages/scene/index' })}>返回厨房</Button></View>;
  if (!question || !item) return <View className='page empty-page'><Text className='title'>挑战已完成</Text>
    <Text>挑战已经完成，成绩保存在本机并会在登录后同步。</Text>
    <Button className='button primary' onClick={() => Taro.redirectTo({ url: `/pages/result/index?attemptId=${attempt.attemptId}` })}>{uiCopy.viewResults}</Button></View>;

  const wrongCount = wrongChallengeAttempts(question);
  const solved = isQuestionSolved(question);
  const hintAvailable = question.mode === 'produce' && hasChallengeHint(question);
  const revealed = question.revealedAt !== undefined;
  const activeVocabularyId = item.id;
  const letterHint = item.word.split(' ').map(word => [...word]
    .map((letter, position) => position === 0 ? letter : '_').join(' ')).join(' / ');

  function showAnswer() {
    reveal(attempt.attemptId, question.id);
    setTyped(''); setFeedback('答案已显示。请亲自输入正确单词完成本题；本题仍计入需练习。');
    void playPronunciation(activeVocabularyId).catch(error => {
      console.error('[Explore English][Challenge] revealed-answer pronunciation failed.', error);
      setAudioMessage('答案已显示，但发音暂时无法播放。');
    });
  }

  return <View className='page challenge-page'>
    <View className='page-actions'><Text onClick={() => Taro.navigateBack()}>← 退出挑战</Text><Text onClick={() => Taro.reLaunch({ url: '/pages/index/index' })}>{uiCopy.home}</Text></View>
    <View className='challenge-top'><Text className='eyebrow'>{attempt.kind === 'weak' ? '弱词练习' : challengeModeLabel(question.mode)}</Text><Text>{index + 1}/{attempt.questions.length}</Text></View>
    <View className='progress'><View className='progress-fill' style={{ width: `${completedCount / attempt.questions.length * 100}%` }} /></View>
    {question.mode === 'find' ? <>
      <View className='prompt card'><Text className='prompt-label'>听发音，找到对应物品</Text><Text className='prompt-word'>{item.word}</Text>
        <PronunciationButton vocabularyId={item.id} />
        <Text className='muted'>请根据发音在图片中点击对应物品。</Text></View>
      <SceneCanvas discovered={[]} targetId={wrongCount >= 3 && !solved ? question.vocabularyId : undefined}
        onSelect={id => submit(id, 'hotspot')} />
      {wrongCount >= 3 && !solved ? <View className='hint-panel status'><Text>提示：目标物品已经在图片中高亮。</Text></View> : null}
    </> : <>
      <View className='prompt card'><Text className='prompt-label'>这是什么？</Text>
        <Text className='muted'>看高亮物品，用英文说出或输入它的名称。</Text></View>
      <SceneCanvas discovered={[]} targetId={item.id} />
      {hintAvailable ? <View className='hint-panel card'>
        <Text className='section-title'>提示</Text>
        <Text className='meaning'>{item.chineseMeaning}</Text><Text className='letter-hint'>{letterHint}</Text>
        {!revealed && !solved ? <Button className='button' onClick={showAnswer}>查看答案</Button> : null}
      </View> : null}
      {revealed ? <View className='revealed-word card'><Text className='prompt-word'>{item.word}</Text>
        <Text className='muted'>{item.britishIPA} · UK</Text><PronunciationButton vocabularyId={item.id} /></View> : null}
      <Input className='input' value={typed} onInput={event => { if (!solved) setTyped(event.detail.value); }}
        placeholder={solved ? '按确认键进入下一题' : '请输入英文单词'} confirmType={solved ? 'next' : 'done'}
        onConfirm={() => { if (solved) moveNext(); else submit(typed, 'typing'); }} />
      {!solved ? <Button className='button primary' disabled={!typed.trim()} onClick={() => submit(typed, 'typing')}>检查答案</Button> : null}
      {!solved ? <Button className='button voice-answer' disabled={recorder.state === 'listening' || recorder.state === 'processing'} onClick={() => void recorder.start()}>🎙 {recorder.state === 'listening' ? uiCopy.listening : recorder.state === 'processing' ? uiCopy.recognizing : uiCopy.voiceAnswer}</Button> : null}
      {recorder.message ? <View className={`status ${recorder.state === 'error' ? 'error' : ''}`}><Text>{recorder.message}</Text></View> : null}
    </>}
    {feedback ? <View className={`status feedback ${solved ? 'correct' : ''}`}><Text>{feedback}</Text>
      {!solved && wrongCount > 0 ? <Text className='attempt-count'>已答错 {wrongCount} 次；只有第一次有效回答计分。</Text> : null}</View> : null}
    {audioMessage ? <View className='status error'><Text>{audioMessage}</Text></View> : null}
    {solved ? <View className='answer-next card'><Text className='section-title'>答对了</Text>
      <Text>{question.answers[0]?.correct && !hintAvailable && !revealed ? '第一次回答正确，本题得分。' : '你已经答对；第一次回答结果保持不变。'}</Text>
      {question.mode === 'find' ? <Text className='muted'>即将自动进入下一题…</Text>
        : <Button className='button primary' onClick={moveNext}>{index === attempt.questions.length - 1 ? uiCopy.viewResults : uiCopy.nextQuestion}</Button>}
    </View> : null}
    <Text className='score-note'>只有第一次有效回答计分</Text>
  </View>;
}
