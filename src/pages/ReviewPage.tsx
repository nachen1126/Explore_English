import { Link, useNavigate, useParams } from 'react-router-dom';
import { getScene, vocabulary } from '../data';
import { createAttempt, weakVocabulary } from '../logic';
import { useLearning } from '../store';
import { Layout, MissingPage } from '../components/Layout';
import { WordCard } from '../components/WordCard';

export function ReviewPage() {
  const { sceneId = '' } = useParams();
  const { state, dispatch } = useLearning();
  const navigate = useNavigate();
  const scene = getScene(sceneId);
  if (!scene) return <MissingPage message="This scene is not available yet." />;
  const weak = weakVocabulary(state);
  const ready = scene.vocabularyIds.every(id => state.scenes[scene.id]?.explored.includes(id));
  const ids = [...scene.vocabularyIds].sort((a, b) => Number(weak.includes(b)) - Number(weak.includes(a)));
  return <Layout back={`/scene/${scene.id}`} backLabel="Back to scene"><section className="page-heading"><p className="eyebrow">{scene.title}</p>
    <h1>A second look.</h1><p>Listen again, read the examples, and take your time.</p></section>
    <div className="review-grid">{ids.map(id => <div key={id}>{weak.includes(id) && <p className="practice-label">Needs practice</p>}<WordCard item={vocabulary[id]} /></div>)}</div>
    <div className="button-row review-actions">{ready ? <button className="button primary" onClick={() => {
      const attempt = createAttempt(scene, weak); dispatch({ type: 'start', attempt }); navigate(`/challenge/${scene.id}/${attempt.id}`);
    }}>Start Challenge →</button> : <Link className="button primary" to={`/scene/${scene.id}`}>Continue Exploring</Link>}<Link className="button secondary" to="/">Back to Topics</Link></div>
  </Layout>;
}
