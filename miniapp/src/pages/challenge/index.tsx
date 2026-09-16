import Taro, { getCurrentInstance, useDidHide, useDidShow, useUnload } from '@tarojs/taro';
import { Button, Input, Text, View } from '@tarojs/components';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  currentChallengeQuestion, hasChallengeHint, isQuestionSolved, matchesAnswer,
  wrongChallengeAttempts, type AnswerRecord, type ChallengeAttempt,
} from '@shared';
import { PronunciationButton } from '../../components/PronunciationButton';
import { SceneCanvas } from '../../components/SceneCanvas';
import { SPEECH_RECOGNITION_ENABLED } from '../../config/features';
import { miniappSceneById, miniappVocabularyById } from '../../data/catalog';
import { useRecorder } from '../../hooks/useRecorder';
import { useLearning } from '../../state/learning';
import { ChallengeInputGuard, challengeConfirmAction } from '../../services/challenge-input';
import { playPronunciation, stopPronunciation } from '../../services/cloud';
import { FIND_AUTO_PLAY_DELAY_MS, FIND_CORRECT_ADVANCE_MS, ListenFindGuard } from '../../services/listen-find';
import { challengeModeLabel, uiCopy } from '../../ui/copy';
import '../../components/SceneCanvas.scss';
import './index.scss';

export default function ChallengePage() {
  const attemptId = getCurrentInstance().router?.params.attemptId ?? '';
  const { snapshot, answer, reveal } = useLearning();
  const attempt = snapshot.attempts[attemptId];
  const scene = attempt ? miniappSceneById[attempt.sceneId] : undefined;
  const initialQuestion = attempt ? currentChallengeQuestion(attempt) : undefined;
  const [index, setIndex] = useState(() => attempt && initialQuestion
    ? attempt.questions.findIndex(question => question.id === initialQuestion.id)
    : attempt?.questions.length ?? 0);
  const question = attempt?.questions[index];
  const item = question ? miniappVocabularyById[question.vocabularyId] : undefined;
  const [typed, setTyped] = useState('');
  const [feedback, setFeedback] = useState('');
  const [audioMessage, setAudioMessage] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [revealedFindQuestionId, setRevealedFindQuestionId] = useState<string | null>(null);
  const [findPlayback, setFindPlayback] = useState<{
    questionId: string; status: 'idle' | 'loading' | 'playing' | 'error'; message: string;
  }>({ questionId: '', status: 'idle', message: '' });
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoPlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pronunciationRequest = useRef(0);
  const inputGuard = useRef(new ChallengeInputGuard());
  const listenFindGuard = useRef(new ListenFindGuard());
  const composing = useRef(false);
  const compositionEndedAt = useRef(0);

  const clearFocusTimer = useCallback(() => {
    if (focusTimer.current) clearTimeout(focusTimer.current);
    focusTimer.current = null;
  }, []);

  const focusAnswerInput = useCallback(() => {
    clearFocusTimer();
    // A short false -> true transition makes WeChat refocus the same controlled
    // Input after a wrong answer or when the next question reuses the component.
    setInputFocused(false);
    focusTimer.current = setTimeout(() => setInputFocused(true), 60);
  }, [clearFocusTimer]);

  const clearAutoPlayTimer = useCallback(() => {
    if (autoPlayTimer.current) clearTimeout(autoPlayTimer.current);
    autoPlayTimer.current = null;
  }, []);

  const playFindWord = useCallback(async (questionId: string, vocabularyId: string) => {
    const request = pronunciationRequest.current + 1;
    pronunciationRequest.current = request;
    stopPronunciation();
    setFindPlayback({ questionId, status: 'loading', message: '正在加载发音…' });
    try {
      await playPronunciation(vocabularyId, error => {
        if (pronunciationRequest.current !== request) return;
        console.error('[Explore English][Challenge] listen-and-find playback was interrupted.', error);
        setFindPlayback({ questionId, status: 'error', message: '播放中断，请检查设备音量后重试。' });
      }, () => {
        if (pronunciationRequest.current === request) {
          setFindPlayback({ questionId, status: 'idle', message: '播放完成，可以点击“再次播放”重听。' });
        }
      });
      if (pronunciationRequest.current === request) {
        setFindPlayback({ questionId, status: 'playing', message: '正在播放…' });
      }
    } catch (error) {
      if (pronunciationRequest.current !== request) return;
      console.error('[Explore English][Challenge] listen-and-find pronunciation failed.', error);
      setFindPlayback({ questionId, status: 'error', message: '自动发音暂时无法播放，你仍可继续选择物品或稍后重试。' });
    }
  }, []);

  const scheduleFindAutoPlay = useCallback((questionId: string, vocabularyId: string) => {
    clearAutoPlayTimer();
    autoPlayTimer.current = setTimeout(() => {
      autoPlayTimer.current = null;
      if (listenFindGuard.current.requestAutoPlay(questionId)) void playFindWord(questionId, vocabularyId);
    }, FIND_AUTO_PLAY_DELAY_MS);
  }, [clearAutoPlayTimer, playFindWord]);

  const moveNext = useCallback(() => {
    if (!attempt || !question) return;
    if (!inputGuard.current.beginAdvance(question.id)) return;
    if (advanceTimer.current) { clearTimeout(advanceTimer.current); advanceTimer.current = null; }
    clearFocusTimer(); clearAutoPlayTimer(); setInputFocused(false);
    pronunciationRequest.current += 1; stopPronunciation();
    setRevealedFindQuestionId(null); setTyped(''); setFeedback(''); setAudioMessage('');
    if (index >= attempt.questions.length - 1) {
      void Taro.redirectTo({ url: `/pages/result/index?attemptId=${attempt.attemptId}` });
    } else setIndex(value => value + 1);
  }, [attempt, clearAutoPlayTimer, clearFocusTimer, index, question]);

  const submit = useCallback((value: string, source: AnswerRecord['source'], recognitionId?: string) => {
    if (!attempt || !question || !item || isQuestionSolved(question) || !/[\p{L}\p{N}]/u.test(value)) return;
    if (question.mode === 'find' && listenFindGuard.current.isLocked(question.id)) return;
    if (!inputGuard.current.beginSubmit(question.id, value)) return;
    const correct = source === 'hotspot' ? value === question.vocabularyId : matchesAnswer(value, item);
    if (correct && question.mode === 'find' && !listenFindGuard.current.lockCorrectAnswer(question.id)) return;
    answer(attempt.attemptId, question.id, { answer: value, correct, at: Date.now(), source, recognitionId });
    setFeedback(correct
      ? (question.answers.length === 0 ? '第一次回答正确' : '已答对，但本题仍计入需练习')
      : `第 ${question.answers.length + 1} 次回答不正确，请继续尝试`);
    setTyped('');
    if (correct && question.mode === 'find') {
      pronunciationRequest.current += 1; stopPronunciation();
      advanceTimer.current = setTimeout(moveNext, FIND_CORRECT_ADVANCE_MS);
    } else if (!correct && question.mode === 'produce') focusAnswerInput();
    else if (correct && question.mode === 'produce') setInputFocused(true);
  }, [answer, attempt, focusAnswerInput, item, moveNext, question]);

  const onRecognized = useCallback((text: string, recognitionId: string) => submit(text, 'speech', recognitionId), [submit]);
  const recorder = useRecorder(onRecognized);
  useEffect(() => {
    recorder.reset();
    inputGuard.current.reset(question?.id ?? '');
    if (question?.mode === 'produce') focusAnswerInput();
    else { clearFocusTimer(); setInputFocused(false); }
    return clearFocusTimer;
  }, [question?.id, question?.mode]);
  useEffect(() => {
    clearAutoPlayTimer();
    if (question?.mode !== 'find' || !item) return undefined;
    const questionId = question.id;
    const vocabularyId = item.id;
    setFindPlayback({ questionId, status: 'idle', message: '' });
    scheduleFindAutoPlay(questionId, vocabularyId);
    return () => {
      clearAutoPlayTimer();
      pronunciationRequest.current += 1;
      stopPronunciation();
    };
  }, [clearAutoPlayTimer, item?.id, question?.id, question?.mode, scheduleFindAutoPlay]);
  const cleanupPage = useCallback(() => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    clearAutoPlayTimer(); clearFocusTimer(); setInputFocused(false);
    pronunciationRequest.current += 1; stopPronunciation();
  }, [clearAutoPlayTimer, clearFocusTimer]);
  useDidHide(cleanupPage);
  useDidShow(() => {
    if (question?.mode === 'produce') focusAnswerInput();
    else if (question?.mode === 'find' && item) scheduleFindAutoPlay(question.id, item.id);
  });
  useUnload(cleanupPage);
  const completedCount = useMemo(() => attempt?.questions.filter(value => isQuestionSolved(value)).length ?? 0, [attempt]);

  if (!attempt) return <View className='page empty-page'><Text className='title'>无法打开挑战</Text>
    <Text>未找到挑战记录，请返回场景重新开始。</Text>
    <Button className='button primary' onClick={() => Taro.reLaunch({ url: '/pages/index/index' })}>返回首页</Button></View>;
  if (!scene) return <View className='page empty-page'><Text className='title'>场景不可用</Text>
    <Text>这个挑战对应的场景不存在，学习记录仍然保留。</Text>
    <Button className='button primary' onClick={() => Taro.reLaunch({ url: '/pages/index/index' })}>返回首页</Button></View>;
  if (!question || !item) return <View className='page empty-page'><Text className='title'>挑战已完成</Text>
    <Text>挑战已经完成，成绩保存在本机并会在登录后同步。</Text>
    <Button className='button primary' onClick={() => Taro.redirectTo({ url: `/pages/result/index?attemptId=${attempt.attemptId}` })}>{uiCopy.viewResults}</Button></View>;

  const wrongCount = wrongChallengeAttempts(question);
  const solved = isQuestionSolved(question);
  const hintAvailable = question.mode === 'produce' && hasChallengeHint(question);
  const revealed = question.revealedAt !== undefined;
  const findWordRevealed = revealedFindQuestionId === question.id;
  const activeFindPlayback = findPlayback.questionId === question.id
    ? findPlayback : { status: 'idle' as const, message: '' };
  const activeVocabularyId = item.id;
  const letterHint = item.word.split(' ').map(word => [...word]
    .map((letter, position) => position === 0 ? letter : '_').join(' ')).join(' / ');

  function handleConfirm(value: string) {
    // Selecting a candidate in a Chinese IME must not be treated as submitting
    // an English answer. The next deliberate confirm remains available.
    if (composing.current || Date.now() - compositionEndedAt.current < 100) return;
    const action = challengeConfirmAction({
      solved,
      isLastQuestion: index === attempt.questions.length - 1,
      value,
    });
    if (action === 'submit') submit(value, 'typing');
    else if (action === 'next' || action === 'results') moveNext();
    else focusAnswerInput();
  }

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
      <View className='prompt card listen-find-prompt'><Text className='prompt-label listen-find-title'>听发音，找到对应物品</Text>
        <View className='listen-find-controls'>
          <Button className='button compact-button' onClick={() => setRevealedFindQuestionId(value => value === question.id ? null : question.id)}>
            {findWordRevealed ? '隐藏单词' : '显示单词'}
          </Button>
          <Button className='button compact-button' onClick={() => void playFindWord(question.id, item.id)}>🔊 再次播放</Button>
        </View>
        {findWordRevealed ? <Text className='listen-find-word'>{item.word}</Text> : null}
        {activeFindPlayback.message ? <Text className={`listen-playback-status ${activeFindPlayback.status === 'error' ? 'error' : ''}`}>{activeFindPlayback.message}</Text> : null}
        <Text className='muted listen-find-instruction'>请根据发音在图片中点击对应物品。</Text></View>
      <SceneCanvas scene={scene} imageSrc={scene.imageAsset} discovered={[]} disabled={solved || listenFindGuard.current.isLocked(question.id)}
        targetId={solved || wrongCount >= 3 ? question.vocabularyId : undefined}
        onSelect={id => submit(id, 'hotspot')} />
      {wrongCount >= 3 && !solved ? <View className='hint-panel status'><Text>提示：目标物品已经在图片中高亮。</Text></View> : null}
    </> : <>
      <View className='prompt card'><Text className='what-is-title'>这是什么？</Text>
        <Text className='what-is-instruction'>看高亮物品，用英文说出或输入它的名称。</Text></View>
      <SceneCanvas scene={scene} imageSrc={scene.imageAsset} discovered={[]} targetId={item.id} />
      {hintAvailable ? <View className='hint-panel card'>
        <Text className='section-title'>提示</Text>
        <Text className='meaning'>{item.chineseMeaning}</Text><Text className='letter-hint'>{letterHint}</Text>
        {!revealed && !solved ? <Button className='button' onClick={showAnswer}>查看答案</Button> : null}
      </View> : null}
      {revealed ? <View className='revealed-word card'><Text className='prompt-word'>{item.word}</Text>
        <Text className='muted'>{item.britishIPA} · UK</Text><PronunciationButton vocabularyId={item.id} /></View> : null}
      <Input className='input answer-input' value={typed} focus={inputFocused} confirmHold adjustPosition cursorSpacing={24}
        onFocus={() => setInputFocused(true)} onBlur={() => setInputFocused(false)}
        onKeyboardCompositionStart={() => { composing.current = true; }}
        onKeyboardCompositionEnd={() => { composing.current = false; compositionEndedAt.current = Date.now(); }}
        onInput={event => { if (!solved) setTyped(event.detail.value); }}
        placeholder={solved ? (index === attempt.questions.length - 1 ? '按确认键查看结果' : '按确认键进入下一题') : '请输入英文单词'}
        confirmType={solved && index < attempt.questions.length - 1 ? 'next' : 'done'}
        onConfirm={event => handleConfirm(event.detail.value)} />
      {!solved ? <Button className='button primary' disabled={!typed.trim()} onClick={() => submit(typed, 'typing')}>检查答案</Button> : null}
      {!solved ? <Button className='button voice-answer' disabled={!SPEECH_RECOGNITION_ENABLED || recorder.state === 'listening' || recorder.state === 'processing'}
        onClick={() => { if (SPEECH_RECOGNITION_ENABLED) void recorder.start(); }}>
        {SPEECH_RECOGNITION_ENABLED ? `🎙 ${recorder.state === 'listening' ? uiCopy.listening : recorder.state === 'processing' ? uiCopy.recognizing : uiCopy.voiceAnswer}` : '语音回答暂未开放'}
      </Button> : null}
      {SPEECH_RECOGNITION_ENABLED && recorder.message ? <View className={`status ${recorder.state === 'error' ? 'error' : ''}`}><Text>{recorder.message}</Text></View> : null}
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
