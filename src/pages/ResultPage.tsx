import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getScene, getTopic, scenes, vocabulary } from '../data';
import { createAttempt, recommendNext, summarize, weakVocabulary } from '../logic';
import { useLearning } from '../store';
import { Layout, MissingPage } from '../components/Layout';
import { AudioButton } from '../components/WordCard';
import type { ChallengeAttempt, Scene } from '../types';

export function ResultPage() {
  const { sceneId = '', attemptId } = useParams();
  const { state } = useLearning();
  const scene = getScene(sceneId);
  if (!scene) return <MissingPage message="This scene is not available yet." />;
  const attempt = attemptId ? state.attempts[attemptId] : Object.values(state.attempts)
    .filter(item => item.sceneId === scene.id && item.completedAt).sort((a, b) => b.createdAt - a.createdAt)[0];
  if (!attempt || attempt.sceneId !== scene.id) return <Layout><section className="empty-state"><h1>No result here yet.</h1>
    <p>Complete a challenge to see your first-attempt score.</p><Link className="button primary" to={`/scene/${scene.id}`}>Back to scene</Link></section></Layout>;
  if (!attempt.completedAt) return <Layout><section className="empty-state"><h1>Your challenge is still in progress.</h1>
    <Link className="button primary" to={`/challenge/${scene.id}/${attempt.id}`}>Resume Challenge</Link></section></Layout>;
  return <Result key={attempt.id} scene={scene} attempt={attempt} />;
}
function Result({ scene, attempt }: { scene: Scene; attempt: ChallengeAttempt }) {
  const { state, dispatch } = useLearning();
  const navigate = useNavigate();
  const [topicComplete, setTopicComplete] = useState(false);
  const result = summarize(attempt);
  const next = recommendNext(scene, scenes, state);
  function start(kind: 'full' | 'weak') {
    const nextAttempt = createAttempt(scene, kind === 'weak' ? result.weak : weakVocabulary(state), kind);
    dispatch({ type: 'start', attempt: nextAttempt });
    navigate(`/challenge/${scene.id}/${nextAttempt.id}`);
  }
  return <Layout><section className="result-page">
    <div className="result-heading"><p className="eyebrow">{scene.title} · {attempt.kind === 'weak' ? 'Practice complete' : 'Challenge complete'}</p>
      <h1>A little more familiar.</h1><p>Here’s what you remembered on your first try.</p></div>
    <div className="result-summary"><div className="score"><strong>{result.score}</strong><span>/ {result.total}</span><p>Total score</p></div>
      <dl className="result-stats"><div><dt>First-attempt accuracy</dt><dd>{result.accuracy}%</dd></div>
        <div><dt>Remembered</dt><dd>{result.remembered.length}</dd></div><div><dt>Needs practice</dt><dd>{result.weak.length}</dd></div></dl></div>
    {result.weak.length > 0 ? <section className="weak-words"><h2>Words to revisit</h2><p>A second look makes a difference. These words will come first in your next practice.</p>
      {result.weak.map(id => <div className="weak-word" key={id}><div><strong>{vocabulary[id].word}</strong><span lang="zh-CN">{vocabulary[id].chineseMeaning}</span></div><AudioButton item={vocabulary[id]} /></div>)}
    </section> : <section className="weak-words"><h2>Every word, remembered.</h2><p>You answered every word correctly on the first try.</p></section>}
    <div className="result-actions"><button className="button primary" disabled={!result.weak.length} onClick={() => start('weak')}>Practice Weak Words</button>
      <button className="button secondary" onClick={() => start('full')}>Retry Challenge</button>
      <button className="button secondary" onClick={() => { if (next) navigate(`/scene/${next.id}`); else setTopicComplete(true); }}>Continue Exploring →</button>
      <Link className="text-button" to="/">Back Home</Link></div>
    {topicComplete && <section className="completion-panel" role="status"><div><h2>You’ve completed the available {getTopic(scene.topicId)!.title} scenes.</h2>
      <p>There isn’t another scene in this topic yet. Choose a different place, or review these words.</p></div>
      <div className="button-row"><Link className="button primary" to="/">Choose another topic</Link><Link className="button secondary" to={`/review/${scene.id}`}>Review Words</Link></div></section>}
    <details className="attempt-details"><summary>View this attempt</summary><p className="small">Saved {new Date(attempt.createdAt).toLocaleString()} · First answers are kept even after retries.</p>
      <ol>{attempt.questions.map(question => <li key={question.id}><span>{vocabulary[question.vocabularyId].word}</span>
        <span>{question.mode === 'find' ? 'Find It' : 'Say / Type It'} · {question.answers[0]?.correct ? 'Remembered' : 'Needs practice'} · {question.answers.length} {question.answers.length === 1 ? 'try' : 'tries'}</span></li>)}</ol>
    </details>
  </section></Layout>;
}
