import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getScene, getSceneCategory, scenes, vocabulary } from '../data';
import { createAttempt, isSolved, recommendNext, summarize, weakVocabulary } from '../logic';
import { useLearning } from '../store';
import { Layout, UnavailableScenePage } from '../components/Layout';
import { AudioButton } from '../components/WordCard';
import type { ChallengeAttempt, Scene } from '../types';
import { Modal } from '../components/Modal';
import { resultFeedback } from '../result-feedback';

export function ResultPage() {
  const { sceneId = '', attemptId } = useParams();
  const { state } = useLearning();
  const scene = getScene(sceneId);
  if (!scene) return <UnavailableScenePage sceneId={sceneId} />;
  const attempt = attemptId ? state.attempts[attemptId] : Object.values(state.attempts)
    .filter(item => item.sceneId === scene.id && item.completedAt && item.kind === 'full').sort((a, b) => b.createdAt - a.createdAt)[0];
  if (!attempt || attempt.sceneId !== scene.id || !attempt.questions.length
    || (attempt.completedAt !== null && !attempt.questions.every(question => question.answers.length && isSolved(question)))) return <Layout><section className="empty-state"><h1>No result here yet.</h1>
    <p>Complete a challenge to see your first-attempt score.</p><Link className="button primary" to={`/scene/${scene.id}`}>Back to scene</Link></section></Layout>;
  if (!attempt.completedAt) return <Layout><section className="empty-state"><h1>Your challenge is still in progress.</h1>
    <Link className="button primary" to={`/challenge/${scene.id}/${attempt.id}`}>Resume Challenge</Link></section></Layout>;
  return <Result key={attempt.id} scene={scene} attempt={attempt} />;
}
function Result({ scene, attempt }: { scene: Scene; attempt: ChallengeAttempt }) {
  const { state, dispatch } = useLearning();
  const navigate = useNavigate();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const result = summarize(attempt);
  const feedback = resultFeedback(result.score, result.total, attempt.kind)!;
  const fullAttempt = Object.values(state.attempts).filter(record => record.sceneId === scene.id && record.kind === 'full' && record.completedAt)
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  const percentage = result.score === result.total ? 100 : Math.floor(result.score / result.total * 1000) / 10;
  const next = recommendNext(scene, scenes, state);
  const category = getSceneCategory(scene)!;
  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);
  function start(kind: 'full' | 'weak') {
    const nextAttempt = createAttempt(scene, kind === 'weak' ? result.weak : weakVocabulary(state), kind);
    dispatch({ type: 'start', attempt: nextAttempt });
    navigate(`/challenge/${scene.id}/${nextAttempt.id}`);
  }
  return <Layout className="result-main"><section className="result-page">
    <div className="result-heading"><p className="eyebrow">{scene.title} · {attempt.kind === 'weak' ? 'Weak word practice result' : 'Full challenge result'}</p>
      <h1>{feedback.title}</h1><p>{feedback.description}</p></div>
    <div className="result-body"><div className="result-overview">
    {attempt.kind === 'weak' && <p className="practice-scope">This result covers {result.total} review {result.total === 1 ? 'word' : 'words'} only.
      {fullAttempt && <> Full challenge: {summarize(fullAttempt).score}/{fullAttempt.questions.length}. <Link to={`/result/${scene.id}/${fullAttempt.id}`}>View full challenge</Link></>}</p>}
    <div className="result-summary"><div className="score"><strong>{result.score}</strong><span>/ {result.total}</span><p>Total score</p></div>
      <dl className="result-stats"><div><dt>First-attempt accuracy</dt><dd>{percentage}%</dd></div>
        <div><dt>Remembered</dt><dd>{result.remembered.length}</dd></div><div><dt>Needs practice</dt><dd>{result.weak.length}</dd></div></dl></div>
    <div className="result-actions"><button className="button primary" disabled={!result.weak.length} onClick={() => start('weak')}>Practice Weak Words</button>
      {next ? <Link className="button primary next-scene" to={`/scene/${next.id}`}>Explore next: {next.title} →</Link>
        : <Link className="button primary next-scene" to={`/category/${category.id}`}>Back to {category.chineseTitle}</Link>}
      <button className="button secondary" onClick={() => start('full')}>Retry Challenge</button>
      <Link className="button secondary" to={`/review/${scene.id}`}>Review All Words</Link>
      <button className="text-button" onClick={() => setDetailsOpen(true)}>View this attempt</button>
      {next && <Link className="text-button" to={`/category/${category.id}`}>Back to {category.chineseTitle}</Link>}
      <Link className="text-button" to="/">Back Home</Link></div>
    </div>
    {result.weak.length > 0 ? <section className="weak-words"><h2>Words to revisit · {result.weak.length}</h2><p>These words will come first in your next practice.</p>
      <div className="weak-word-grid">{result.weak.map(id => <div className="weak-word" key={id}><div><strong>{vocabulary[id].word}</strong><span lang="zh-CN">{vocabulary[id].chineseMeaning}</span></div><AudioButton item={vocabulary[id]} /></div>)}</div>
    </section> : <section className="weak-words perfect-words"><h2>{attempt.kind === 'weak' ? 'Review words, remembered.' : 'Every word, remembered.'}</h2><p>{attempt.kind === 'weak' ? 'All the words in this practice were correct on the first try.' : 'You answered every word correctly on the first try.'}</p></section>}
    </div>
    {detailsOpen && <Modal title="View this attempt" onClose={() => setDetailsOpen(false)}><div className="attempt-details"><p className="small">Saved {new Date(attempt.createdAt).toLocaleString()} · First answers are kept even after retries.</p>
      <ol>{attempt.questions.map(question => <li key={question.id}><span>{vocabulary[question.vocabularyId].word}</span>
        <span>{question.mode === 'find' ? 'Find It' : 'Say / Type It'} · {question.answers[0]?.correct ? 'Remembered' : 'Needs practice'} · {question.answers.length} {question.answers.length === 1 ? 'try' : 'tries'}</span></li>)}</ol>
    </div></Modal>}
  </section></Layout>;
}
