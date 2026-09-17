import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getScene, vocabulary } from '../data';
import { createAttempt, weakVocabulary } from '../logic';
import { useLearning } from '../store';
import { Layout, UnavailableScenePage } from '../components/Layout';
import { WordCard } from '../components/WordCard';
import { Pagination, usePagination, useSmallScreen } from '../components/Pagination';

export function ReviewPage() {
  const { sceneId = '' } = useParams();
  const { state, dispatch } = useLearning();
  const navigate = useNavigate();
  const scene = getScene(sceneId);
  const weak = weakVocabulary(state);
  const ids = [...(scene?.vocabularyIds ?? [])].sort((a, b) => Number(weak.includes(b)) - Number(weak.includes(a)));
  const pagination = usePagination(ids, useSmallScreen() ? 1 : 4);
  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);
  if (!scene) return <UnavailableScenePage sceneId={sceneId} />;
  const ready = scene.vocabularyIds.every(id => state.scenes[scene.id]?.explored.includes(id));
  return <Layout className="review-main" back={`/scene/${scene.id}`} backLabel="Back to scene"><section className="page-heading"><p className="eyebrow">{scene.title}</p>
    <h1>A second look.</h1><p>Listen again, read the examples, and take your time.</p></section>
    <div className="review-grid">{pagination.items.map(id => <div key={id}>{weak.includes(id) && <p className="practice-label">Needs practice</p>}<WordCard item={vocabulary[id]} /></div>)}</div>
    <Pagination {...pagination} label="Review word pages" />
    <div className="button-row review-actions">{ready ? <button className="button primary" onClick={() => {
      const attempt = createAttempt(scene, weak); dispatch({ type: 'start', attempt }); navigate(`/challenge/${scene.id}/${attempt.id}`);
    }}>Start Challenge →</button> : <Link className="button primary" to={`/scene/${scene.id}`}>Continue Exploring</Link>}<Link className="button secondary" to="/">Back to Topics</Link></div>
  </Layout>;
}
