import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getScene, vocabulary } from '../data';
import { createAttempt, currentQuestion, isSolved, matches, weakVocabulary } from '../logic';
import { useLearning } from '../store';
import { useRecognition } from '../speech';
import type { ChallengeAttempt, ChallengeQuestion, Scene } from '../types';
import { Layout, MissingPage } from '../components/Layout';
import { SceneArt } from '../components/SceneArt';
import { AudioButton } from '../components/WordCard';

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
  function next() {
    if (index === attempt.questions.length - 1) navigate(`/result/${scene.id}/${attempt.id}`);
    else setIndex(value => value + 1);
  }
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
  const item = vocabulary[question.vocabularyId];
  const solved = isSolved(question);
  const lastAnswer = question.answers.at(-1);
  const recognition = useRecognition(text => { setAnswer(text); setInputSource('speech'); });
  const mode = question.mode === 'find' ? 'Find It' : recognition.supported ? 'Say It / Type It' : 'Type It';
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!answer.trim() || solved) return;
    dispatch({ type: 'answer', attemptId: attempt.id, questionId: question.id,
      record: { answer, correct: matches(answer, item), source: inputSource, at: Date.now() } });
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
              disabled={solved} onChange={event => { setAnswer(event.target.value); setInputSource('typing'); }} placeholder="Your answer" />
            <button className="button primary" type="submit" disabled={!answer.trim() || solved}>Check answer</button>
          </form>
          {recognition.supported ? <div className="speech-controls">
            <p className="small">Or use your voice, then check the transcript.</p>
            {recognition.status === 'listening' ? <button className="button secondary" onClick={recognition.stop}>Stop recording</button>
              : <button className="button secondary" disabled={solved || recognition.status === 'processing'} onClick={recognition.start}>Use microphone</button>}
            <p role="status" className="speech-status">{({ idle: 'Ready to listen', listening: 'Listening…', processing: 'Processing…', success: 'Success · transcript ready to check', error: 'Error · please try again or type' })[recognition.status]}</p>
            {recognition.error && <p className="inline-notice" role="alert">{recognition.error}</p>}
          </div> : <p className="small">Type It is available in this browser.</p>}
        </>}
        <div className="answer-feedback" role="status" aria-live="polite">
          {lastAnswer && (solved ? <><strong>Correct.</strong><p>{question.answers[0].correct ? 'Remembered on your first try.' : 'You got there. This word stays in Needs practice for this attempt.'}</p></>
            : <><strong>Not quite. Try again.</strong><p>This word is marked for practice. Another try will help you learn it.</p></>)}
        </div>
        {solved && <button className="button primary" onClick={onNext}>{index + 1 === attempt.questions.length ? 'See results →' : 'Next word →'}</button>}
        <p className="score-explanation small">Only your first answer counts towards this attempt’s score.</p>
      </div></div>
  </section>;
}
