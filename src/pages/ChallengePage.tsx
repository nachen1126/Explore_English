import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getScene, vocabulary } from '../data';
import { createAttempt, currentQuestion, hasHint, isSolved, matches, weakVocabulary } from '../logic';
import { useLearning } from '../store';
import { speak, useRecognition } from '../speech';
import type { ChallengeAttempt, ChallengeQuestion, Scene } from '../types';
import { Layout, MissingPage } from '../components/Layout';
import { SceneArt } from '../components/SceneArt';
import { AudioButton, WordCard } from '../components/WordCard';

export function ChallengePage() {
  const { sceneId = '', attemptId } = useParams();
  const scene = getScene(sceneId);
  const { state, dispatch } = useLearning();
  const navigate = useNavigate();
  if (!scene) return <MissingPage message="This scene is not available yet." />;
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
  const next = useCallback(() => {
    if (!isSolved(question) || advanced.current === question.id) return;
    advanced.current = question.id;
    if (index === attempt.questions.length - 1) navigate(`/result/${scene.id}/${attempt.id}`);
    else setIndex(value => value === index ? value + 1 : value);
  }, [question, index, attempt.questions.length, attempt.id, navigate, scene.id]);
  return <Layout back={`/scene/${scene.id}`} backLabel="Back to scene">
    <QuestionPanel key={question.id} scene={scene} attempt={attempt} question={question} index={index} onNext={next} />
  </Layout>;
}
function QuestionPanel({ scene, attempt, question, index, onNext }: {
  scene: Scene; attempt: ChallengeAttempt; question: ChallengeQuestion; index: number; onNext: () => void;
}) {
  const { dispatch } = useLearning();
  const [answer, setAnswer] = useState('');
  const [inputSource, setInputSource] = useState<'typing' | 'speech'>('typing');
  const [recognitionId, setRecognitionId] = useState<string | undefined>();
  const composing = useRef(false);
  const [audioError, setAudioError] = useState(false);
  const item = vocabulary[question.vocabularyId];
  const solved = isSolved(question);
  const lastAnswer = question.answers.at(-1);
  const recognition = useRecognition((text, id) => { setAnswer(text); setInputSource('speech'); setRecognitionId(id); });
  const assisted = hasHint(question);
  const revealed = question.revealedAt !== undefined;
  const duplicateSpeech = inputSource === 'speech' && recognitionId !== undefined
    && question.answers.some(record => record.recognitionId === recognitionId);
  const validAnswer = /[\p{L}\p{N}]/u.test(answer);
  const recording = recognition.status === 'starting' || recognition.status === 'listening';
  useEffect(() => {
    if (question.mode !== 'find' || !solved) return;
    const timer = window.setTimeout(onNext, 600);
    return () => window.clearTimeout(timer);
  }, [question.mode, solved, onNext]);
  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);
  const mode = question.mode === 'find' ? 'Find It' : recognition.supported ? 'Say It / Type It' : 'Type It';
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!validAnswer || solved || duplicateSpeech || composing.current) return;
    dispatch({ type: 'answer', attemptId: attempt.id, questionId: question.id,
      record: { answer, correct: matches(answer, item), source: inputSource, at: Date.now(),
        ...(inputSource === 'speech' && recognitionId ? { recognitionId } : {}) } });
    recognition.cancel();
  }
  return <section className="challenge-page">
    <div className="challenge-heading"><div><p className="eyebrow">{attempt.kind === 'weak' ? 'Weak word practice' : 'Scene challenge'} · {mode}</p>
      <h1>{question.mode === 'find' ? `Find the ${item.word}.` : 'What is this?'}</h1>
      <p>{question.mode === 'find' ? 'Select the object in the picture.' : 'Name the highlighted object in English.'}</p></div>
      <span className="question-counter">{index + 1} / {attempt.questions.length}</span></div>
    <progress className="progress-bar" value={index} max={attempt.questions.length} aria-label="Challenge progress" />
    <div className="challenge-layout"><SceneArt key={scene.id} scene={scene} challenge highlight={question.mode === 'produce' ? item.id : undefined}
      onTap={question.mode === 'find' && !solved ? id => dispatch({ type: 'answer', attemptId: attempt.id, questionId: question.id,
        record: { answer: id, correct: id === item.id, source: 'hotspot', at: Date.now() } }) : undefined} />
      <div className="answer-panel">
        {question.mode === 'find' ? <><h2>Listen & find</h2><AudioButton item={item} />
          <details className="object-list"><summary>Text alternatives for the picture</summary>
            <div className="answer-options">{scene.hotspots.map((hotspot, position) => <button key={hotspot.vocabularyId}
              className="button secondary" disabled={solved} onClick={() => dispatch({
                type: 'answer', attemptId: attempt.id, questionId: question.id,
                record: { answer: hotspot.vocabularyId, correct: hotspot.vocabularyId === item.id, source: 'hotspot', at: Date.now() },
              })}>{position + 1}. <span lang="zh-CN">{vocabulary[hotspot.vocabularyId].chineseMeaning}</span></button>)}</div>
          </details></> : <><h2>Your answer</h2><p className="image-alternative">Picture clue: <span lang="zh-CN">{item.chineseMeaning}</span></p>
          <form onSubmit={submit}><label htmlFor="word-answer">Type the English word</label>
            <input id="word-answer" name="answer" autoComplete="off" autoCapitalize="none" spellCheck={false} value={answer}
              disabled={solved} onChange={event => { setAnswer(event.target.value); setInputSource('typing'); setRecognitionId(undefined); }}
              onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}
              onKeyDown={event => {
                if (event.key === 'Enter' && (composing.current || event.nativeEvent.isComposing || event.keyCode === 229 || event.repeat)) event.preventDefault();
              }} placeholder="Your answer" />
            <button className="button primary" type="submit" disabled={!validAnswer || solved || duplicateSpeech}>Check answer</button>
          </form>
          {recognition.supported ? <div className="speech-controls">
            <p className="small">Click to start. Say the word, check the recognized text, then select Check answer.</p>
            {recording ? <button className="button secondary" onClick={recognition.stop}>Stop recording</button>
              : recognition.status === 'processing' ? <button className="button secondary" onClick={recognition.cancel}>Cancel recognition</button>
                : <button className="button secondary" disabled={solved} onClick={recognition.start}>{recognition.status === 'error' || duplicateSpeech ? 'Retry microphone' : 'Use microphone'}</button>}
            <p role="status" className="speech-status">{({ idle: 'Click to start · 点击开始', starting: 'Requesting microphone… · 正在启动', listening: 'Listening… · 正在聆听', processing: 'Recognizing… · 正在识别', success: 'Transcript ready · 请检查识别文本', error: 'Recognition failed · 识别失败，请重试或输入' })[recognition.status]}</p>
            {recognition.transcript && <p className="speech-transcript">Recognized text: <strong>{recognition.transcript}</strong></p>}
            {duplicateSpeech && !solved && <p className="small">This recording has been checked. Record again or edit your answer to retry.</p>}
            {recognition.error && <p className="inline-notice" role="alert">{recognition.error}</p>}
          </div> : <div className="speech-controls"><button className="button secondary" disabled>Microphone unavailable</button>
            <p className="inline-notice">{recognition.unavailableReason}</p></div>}
        </>}
        <div className="answer-feedback" role="status" aria-live="polite">
          {lastAnswer && (revealed ? <><strong>Answer shown.</strong><p>This word stays in Needs practice. Continue when you are ready.</p></>
            : solved ? <><strong>Correct.</strong><p>{question.answers[0].correct ? 'Remembered on your first try.' : 'You got there. This word stays in Needs practice for this attempt.'}</p></>
            : assisted ? <><strong>A little help is ready.</strong><p>Use the hint below, or view the answer to continue.</p></>
              : <><strong>Not quite. Try again.</strong><p>This word is marked for practice. Another try will help you learn it.</p></>)}
        </div>
        {assisted && <section className="answer-hint" aria-label="Word hint" role="status"><h2>A little help · 提示</h2>
          <p lang="zh-CN">{item.chineseMeaning}</p>
          <p className="letter-hint">{item.word.split(' ').map(word => [...word].map((letter, position) => position === 0 ? letter : '_').join(' ')).join(' / ')}</p>
          <p className="small">{item.word.replace(/[^a-z]/gi, '').length} letters · 字母。使用提示后，本题保留在 Needs practice。</p>
          {!solved && <button className="button secondary" onClick={() => {
            recognition.cancel();
            dispatch({ type: 'reveal', attemptId: attempt.id, questionId: question.id, at: Date.now() });
            if (!speak(item.audioText, () => setAudioError(true))) setAudioError(true);
          }}>查看答案 · Show answer</button>}
        </section>}
        {revealed && <WordCard item={item} />}
        {audioError && <p className="inline-notice">Pronunciation is unavailable. You can still read the answer and continue.</p>}
        {solved && (question.mode === 'find' ? <p className="small" role="status">Correct selection · continuing…</p>
          : <button className="button primary" onClick={onNext}>{index + 1 === attempt.questions.length ? 'See results →' : 'Next word →'}</button>)}
        <p className="score-explanation small">Only your first answer counts towards this attempt’s score.</p>
      </div></div>
  </section>;
}
