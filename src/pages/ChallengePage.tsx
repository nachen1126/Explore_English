import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getScene, vocabulary } from '../data';
import { createAttempt, currentQuestion, hasHint, isSolved, matches, weakVocabulary, wrongAttempts } from '../logic';
import { useLearning } from '../store';
import { speak, useRecognition } from '../speech';
import type { ChallengeAttempt, ChallengeQuestion, Scene } from '../types';
import { Layout, MissingPage, UnavailableScenePage } from '../components/Layout';
import { SceneArt } from '../components/SceneArt';
import { AudioButton, type AudioPlaybackState } from '../components/WordCard';
import { useChallengeEnter } from '../useChallengeEnter';

export function ChallengePage() {
  const { sceneId = '', attemptId } = useParams();
  const scene = getScene(sceneId);
  const { state, dispatch } = useLearning();
  const navigate = useNavigate();
  if (!scene) return <UnavailableScenePage sceneId={sceneId} />;
  const attempt = attemptId ? state.attempts[attemptId] : undefined;
  if (attemptId && (!attempt || attempt.sceneId !== scene.id)) return <MissingPage message="This challenge could not be found." />;
  if (!attempt) {
    const ready = scene.vocabularyIds.every(id => state.scenes[scene.id]?.explored.includes(id));
    return <Layout back={`/scene/${scene.id}`} backLabel="Back to scene"><section className="empty-state">
      <p className="eyebrow">{scene.title}</p><h1>{ready ? 'Ready to try your words?' : 'Explore the scene first.'}</h1>
      <p>Every word appears once. Your first answer counts towards your score, and you can keep trying.</p>
      {ready ? <button className="button primary" onClick={() => {
        const next = createAttempt(scene, weakVocabulary(state)); dispatch({ type: 'start', attempt: next });
        navigate(`/challenge/${scene.id}/${next.id}`);
      }}>Start Challenge</button> : <Link className="button primary" to={`/scene/${scene.id}`}>Continue Exploring</Link>}
    </section></Layout>;
  }
  return <ChallengeSession key={attempt.id} scene={scene} attempt={attempt} />;
}
function ChallengeSession({ scene, attempt }: { scene: Scene; attempt: ChallengeAttempt }) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(() => {
    const first = currentQuestion(attempt);
    return first ? attempt.questions.findIndex(question => question.id === first.id) : attempt.questions.length - 1;
  });
  const question = attempt.questions[index];
  const advanced = useRef<string | null>(null);
  const spokenQuestion = useRef<string | null>(null);
  const playbackSequence = useRef(0);
  const [findPlayback, setFindPlayback] = useState<AudioPlaybackState>();
  useEffect(() => {
    if (question.mode !== 'find' || spokenQuestion.current === question.id) return;
    spokenQuestion.current = question.id;
    const request = ++playbackSequence.current;
    const item = vocabulary[question.vocabularyId];
    const updatePlayback = (patch: Partial<AudioPlaybackState>) => setFindPlayback(current => current?.request === request
      ? { ...current, ...patch } : current);
    setFindPlayback({ wordId: item.id, request, isPlaying: false, error: false });
    // Browsers may block the first unprompted utterance. Keep the challenge usable
    // and let the existing replay button provide the user-initiated retry.
    speak(item.audioText, () => updatePlayback({ isPlaying: false }), {
      onStart: () => updatePlayback({ isPlaying: true }),
      onEnd: () => updatePlayback({ isPlaying: false }),
    });
  }, [question.id, question.mode, question.vocabularyId]);
  const next = useCallback(() => {
    if (!isSolved(question) || advanced.current === question.id) return;
    advanced.current = question.id;
    if (index === attempt.questions.length - 1) navigate(`/result/${scene.id}/${attempt.id}`);
    else setIndex(value => value === index ? value + 1 : value);
  }, [question, index, attempt.questions.length, attempt.id, navigate, scene.id]);
  useChallengeEnter(question, next);
  return <Layout className="challenge-main" back={`/scene/${scene.id}`} backLabel="Back to scene">
    <QuestionPanel key={question.id} scene={scene} attempt={attempt} question={question} index={index}
      findPlayback={findPlayback} onNext={next} />
  </Layout>;
}
function QuestionPanel({ scene, attempt, question, index, findPlayback, onNext }: {
  scene: Scene; attempt: ChallengeAttempt; question: ChallengeQuestion; index: number;
  findPlayback?: AudioPlaybackState; onNext: () => void;
}) {
  const { dispatch } = useLearning();
  const [answer, setAnswer] = useState('');
  const [inputSource, setInputSource] = useState<'typing' | 'speech'>('typing');
  const [recognitionId, setRecognitionId] = useState<string | undefined>();
  const composing = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const [audioError, setAudioError] = useState(false);
  const [findHintActive, setFindHintActive] = useState(false);
  const findHintTimer = useRef<number | null>(null);
  const lastFindClick = useRef<{ id: string; at: number } | null>(null);
  const submittedRecognitionIds = useRef(new Set<string>());
  const [pendingSpeech, setPendingSpeech] = useState<{ text: string; id: string } | null>(null);
  const item = vocabulary[question.vocabularyId];
  const solved = isSolved(question);
  const lastAnswer = question.answers.at(-1);
  const recognition = useRecognition((text, id) => {
    setAnswer(text);
    setInputSource('speech');
    setRecognitionId(id);
    setPendingSpeech({ text, id });
  });
  const assisted = hasHint(question);
  const revealed = question.revealedAt !== undefined;
  const duplicateSpeech = inputSource === 'speech' && recognitionId !== undefined
    && question.answers.some(record => record.recognitionId === recognitionId);
  const validAnswer = /[\p{L}\p{N}]/u.test(answer);
  const recording = recognition.status === 'starting' || recognition.status === 'listening' || recognition.status === 'speechDetected';
  const findHintAvailable = question.mode === 'find' && wrongAttempts(question) >= 3;
  useEffect(() => {
    // A mouse/trackpad desktop gets continuous typing; touch devices keep control
    // of the software keyboard. Never steal focus from an open dialog.
    if (question.mode === 'produce' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches
      && !document.querySelector('[aria-modal="true"]')) input.current?.focus({ preventScroll: true });
  }, [question.id, question.mode]);
  useEffect(() => {
    if (!revealed || solved) return;
    setAnswer('');
    setInputSource('typing');
    setRecognitionId(undefined);
    setPendingSpeech(null);
    if (window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) input.current?.focus({ preventScroll: true });
  }, [question.revealedAt, revealed, solved]);
  useEffect(() => {
    if (!pendingSpeech || solved || question.mode !== 'produce' || submittedRecognitionIds.current.has(pendingSpeech.id)) return;
    submittedRecognitionIds.current.add(pendingSpeech.id);
    dispatch({ type: 'answer', attemptId: attempt.id, questionId: question.id,
      record: { answer: pendingSpeech.text, correct: matches(pendingSpeech.text, item), source: 'speech',
        recognitionId: pendingSpeech.id, at: Date.now() } });
    setPendingSpeech(null);
  }, [attempt.id, dispatch, item, pendingSpeech, question.id, question.mode, solved]);
  useEffect(() => {
    if (question.mode !== 'find' || !solved) return;
    const timer = window.setTimeout(onNext, 600);
    return () => window.clearTimeout(timer);
  }, [question.mode, solved, onNext]);
  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);
  useEffect(() => () => {
    if (findHintTimer.current !== null) window.clearTimeout(findHintTimer.current);
  }, []);
  const mode = question.mode === 'find' ? 'Find It' : recognition.supported ? 'Say It / Type It' : 'Type It';
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!validAnswer || solved || duplicateSpeech || composing.current) return;
    dispatch({ type: 'answer', attemptId: attempt.id, questionId: question.id,
      record: { answer, correct: matches(answer, item), source: inputSource, at: Date.now(),
        ...(inputSource === 'speech' && recognitionId ? { recognitionId } : {}) } });
    recognition.cancel();
  }
  function answerFind(id: string) {
    const at = Date.now();
    const previous = lastFindClick.current;
    if (previous?.id === id && at - previous.at < 500) return;
    lastFindClick.current = { id, at };
    dispatch({ type: 'answer', attemptId: attempt.id, questionId: question.id,
      record: { answer: id, correct: id === item.id, source: 'hotspot', at } });
  }
  function showFindHint() {
    if (findHintTimer.current !== null) window.clearTimeout(findHintTimer.current);
    setFindHintActive(true);
    findHintTimer.current = window.setTimeout(() => {
      setFindHintActive(false);
      findHintTimer.current = null;
    }, 1600);
  }
  return <section className="challenge-page">
    <div className="challenge-heading"><div><p className="eyebrow">{attempt.kind === 'weak' ? 'Weak word practice' : 'Scene challenge'} · {mode}</p>
      <h1>{question.mode === 'find' ? `Find the ${item.word}.` : 'What is this?'}</h1>
      <p>{question.mode === 'find' ? 'Select the object in the picture.' : 'Name the highlighted object in English.'}</p></div>
      <span className="question-counter">{index + 1} / {attempt.questions.length}</span></div>
    <progress className="progress-bar" value={index} max={attempt.questions.length} aria-label="Challenge progress" />
    <div className="challenge-layout"><SceneArt key={scene.id} scene={scene} challenge
      highlight={question.mode === 'produce' || findHintActive ? item.id : undefined} hintPulse={findHintActive}
      onTap={question.mode === 'find' && !solved ? answerFind : undefined} />
      <div className="answer-panel">
        {question.mode === 'find' ? <><h2>Listen & find</h2><AudioButton item={item} playback={findPlayback} />
          {findHintAvailable && !solved && <button className="button secondary find-hint-button" disabled={findHintActive} onClick={showFindHint}>
            {findHintActive ? 'Hint showing…' : 'Show me a hint'}
          </button>}</> : <>
          <form onSubmit={submit}><label htmlFor="word-answer">Type the English word</label>
            <input ref={input} id="word-answer" name="answer" autoComplete="off" autoCapitalize="none" spellCheck={false} value={answer}
              readOnly={solved} onChange={event => { if (!solved) { setAnswer(event.target.value); setInputSource('typing'); setRecognitionId(undefined); setPendingSpeech(null); } }}
              onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}
              onKeyDown={event => {
                if (event.key === 'Enter' && (composing.current || event.nativeEvent.isComposing || event.keyCode === 229 || event.repeat)) event.preventDefault();
              }} placeholder="Your answer" />
            <button className="button primary" type="submit" disabled={!validAnswer || solved || duplicateSpeech}>Check answer</button>
          </form>
          {!solved && (recognition.supported ? <div className="speech-controls">
            {recording ? <button className="button secondary" disabled>{recognition.status === 'starting' ? 'Starting microphone…'
              : recognition.status === 'speechDetected' ? 'Speech detected…' : 'Listening…'}</button>
              : recognition.status === 'processing' ? <button className="button secondary" disabled>Recognising…</button>
                : <button className="button secondary" disabled={solved} onClick={recognition.start}>{recognition.status === 'error' || duplicateSpeech ? 'Retry microphone' : 'Use microphone'}</button>}
            <p role="status" className="speech-status">{({ idle: 'Click to start · 点击开始', starting: 'Starting microphone… · 正在启动', listening: 'Listening… Please say the word. · 正在聆听', speechDetected: 'Speech detected… Please finish the word. · 已检测到语音', processing: 'Recognising… · 正在识别', success: 'Transcript ready · 请检查识别文本', error: 'Recognition failed · 识别失败，请重试或输入' })[recognition.status]}</p>
            {recognition.transcript && <p className="speech-transcript">Recognised text: <strong>{recognition.transcript}</strong></p>}
            {duplicateSpeech && !solved && <p className="small">This recording has been checked. Record again or edit your answer to retry.</p>}
            {recognition.error && <p className="inline-notice" role="alert">{recognition.error}</p>}
            {recognition.debugEnabled && <details className="speech-debug" open>
              <summary>Speech diagnostics · 语音诊断</summary>
              <p><strong>API:</strong> {recognition.debugInfo.apiName} · <strong>Secure:</strong> {String(recognition.debugInfo.isSecureContext)}</p>
              <p className="speech-debug-agent">{recognition.debugInfo.userAgent}</p>
              {recognition.diagnostic && <p className="speech-debug-error"><strong>Speech error: {recognition.diagnostic.code}</strong><br />
                Source: {recognition.diagnostic.source}<br />Time after start: {recognition.diagnostic.afterMs}ms</p>}
              <ol>{recognition.debugTimeline.map((entry, position) => <li key={`${position}-${entry}`}>{entry}</li>)}</ol>
            </details>}
          </div> : <div className="speech-controls"><button className="button secondary" disabled>Microphone unavailable</button>
            <p className="inline-notice">{recognition.unavailableReason}</p>
            {recognition.debugEnabled && <details className="speech-debug" open>
              <summary>Speech diagnostics · 语音诊断</summary>
              <p><strong>API:</strong> {recognition.debugInfo.apiName} · <strong>Secure:</strong> {String(recognition.debugInfo.isSecureContext)}</p>
              <p className="speech-debug-agent">{recognition.debugInfo.userAgent}</p>
            </details>}
          </div>)}
        </>}
        <div className="answer-feedback" role="status" aria-live="polite">
          {lastAnswer && (solved ? <><strong>Correct.</strong><p>{question.answers[0].correct && !revealed ? 'Remembered on your first try.' : 'This word stays in Needs practice.'}</p></>
            : revealed ? <><strong>Answer shown.</strong><p>Type the word yourself to finish. It stays in Needs practice.</p></>
            : assisted ? <strong>A little help is ready.</strong>
              : <><strong>Not quite. Try again.</strong><p>Your first answer is kept.</p></>)}
        </div>
        {assisted && <section className="answer-hint" aria-label="Word hint" role="status"><h2>A little help · 提示</h2>
          <p className="hint-clue"><span lang="zh-CN">{item.chineseMeaning}</span><span className="letter-hint">{item.word.split(' ').map(word => [...word].map((letter, position) => position === 0 ? letter : '_').join(' ')).join(' / ')}</span></p>
          <div className="hint-actions"><p className="small">{item.word.replace(/[^a-z]/gi, '').length} letters · Needs practice</p>
          {!solved && !revealed && <button className="button secondary" onClick={() => {
            recognition.cancel();
            dispatch({ type: 'reveal', attemptId: attempt.id, questionId: question.id, at: Date.now() });
            if (!speak(item.audioText, () => setAudioError(true))) setAudioError(true);
          }}>查看答案 · Show answer</button>}</div>
        </section>}
        {revealed && <section className="revealed-word" aria-label={`Word card: ${item.word}`}><div><h2>{item.word}</h2>{item.britishIPA && <p>{item.britishIPA} · UK</p>}</div><AudioButton item={item} /></section>}
        {audioError && <p className="inline-notice">Pronunciation is unavailable. You can still read the answer and continue.</p>}
        {solved && (question.mode === 'find' ? <p className="small" role="status">Correct selection · continuing…</p>
          : <div className="answer-next"><button className="button primary" data-challenge-next onClick={onNext}>{index + 1 === attempt.questions.length ? 'See results →' : 'Next word →'}</button><span className="small">Press Enter</span></div>)}
        <p className="score-explanation small">Only your first answer counts.</p>
      </div></div>
  </section>;
}
