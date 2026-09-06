import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getScene, getSceneCategory, getTopic, vocabulary } from '../data';
import { createAttempt, weakVocabulary } from '../logic';
import { useLearning } from '../store';
import { speak } from '../speech';
import { Layout, MissingPage, RestartDialog } from '../components/Layout';
import { SceneArt } from '../components/SceneArt';
import { WordCard } from '../components/WordCard';
import { useLearningEnter } from '../useLearningEnter';

export function ExplorePage() {
  const { sceneId = '' } = useParams();
  const scene = getScene(sceneId);
  return scene ? <ExploreScene key={scene.id} sceneId={scene.id} /> : <MissingPage message="This scene is not available yet." />;
}
function ExploreScene({ sceneId }: { sceneId: string }) {
  const scene = getScene(sceneId)!;
  const topic = getTopic(scene.topicId)!;
  const category = getSceneCategory(scene)!;
  const { state, dispatch } = useLearning();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const [hint, setHint] = useState<string | undefined>();
  const [restart, setRestart] = useState(false);
  const [audioError, setAudioError] = useState(false);
  useEffect(() => { dispatch({ type: 'visit', sceneId: scene.id, at: Date.now() }); }, [dispatch, scene.id]);
  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);
  const explored = state.scenes[scene.id]?.explored ?? [];
  const complete = scene.vocabularyIds.every(id => explored.includes(id));
  const latestAttempt = Object.values(state.attempts).filter(attempt => attempt.sceneId === scene.id)
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  function discover(id: string) {
    dispatch({ type: 'discover', sceneId: scene.id, vocabularyId: id, at: Date.now() });
    setSelected(id); setHint(undefined); setAudioError(false);
    if (!speak(vocabulary[id].audioText, () => setAudioError(true))) setAudioError(true);
  }
  const nextId = selected === null ? scene.vocabularyIds[0]
    : scene.vocabularyIds[scene.vocabularyIds.indexOf(selected) + 1]
      ?? scene.vocabularyIds.find(id => !explored.includes(id));
  function nextWord() { if (nextId) discover(nextId); }
  useLearningEnter(nextWord, Boolean(nextId) && !restart);
  function start() {
    const attempt = createAttempt(scene, weakVocabulary(state));
    dispatch({ type: 'start', attempt });
    navigate(`/challenge/${scene.id}/${attempt.id}`);
  }
  return <Layout back={`/category/${category.id}`} backLabel="返回本分类 · Category"><section className="page-heading explore-heading">
    <div><p className="eyebrow">{topic.title} · Explore</p><h1>{scene.title}</h1><p>Choose an object. Learn a word. Make it yours.</p></div>
    <div className="progress-counter"><strong>{explored.length}/{scene.vocabularyIds.length}</strong><span>objects discovered</span></div>
  </section>
    <progress className="progress-bar" value={explored.length} max={scene.vocabularyIds.length} aria-label="Exploration progress" />
    <div className="explore-layout"><div><SceneArt scene={scene} discovered={explored} onTap={discover} highlight={hint ?? selected ?? undefined} />
      <div className="scene-actions"><button className="text-button" onClick={() => {
        const remaining = scene.vocabularyIds.find(id => !explored.includes(id));
        setHint(remaining); if (!remaining) setSelected(scene.vocabularyIds[0]);
      }}>{complete ? 'Review an object' : 'Show me a hint'}</button>
        <button className="text-button muted" onClick={() => setRestart(true)}>Start over</button></div>
      <details className="object-list"><summary>All objects · keyboard & small-screen access</summary>
        <div className="word-chips">{scene.vocabularyIds.map((id, index) => <button key={id} onClick={() => discover(id)}>
          <span>{String(index + 1).padStart(2, '0')}</span> {vocabulary[id].word}{explored.includes(id) && <span aria-label="discovered"> ✓</span>}
        </button>)}</div></details></div>
      <aside className="word-panel" aria-live="polite">{selected ? <WordCard item={vocabulary[selected]} onClose={() => setSelected(null)} />
        : <div className="word-card word-card-empty"><span className="eyebrow">A closer look</span><h2>A scene full of words.</h2><p>Tap an object in the picture to see its meaning and hear it in British English.</p><span className="fine-rule" /><p className="small">You can revisit every object as often as you like.</p></div>}
        {audioError && <p className="inline-notice" role="status">Pronunciation is unavailable in this browser. The word card is still available.</p>}
        <div className="learning-next"><button className="button primary" data-learn-next disabled={!nextId} onClick={nextWord}>Next word →</button>
          <span className="small">Press Enter</span></div>
      </aside></div>
    {complete && <section className="completion-panel"><div><p className="eyebrow">Exploration complete</p><h2>You found them all!</h2><p>Put your new words into practice, or take another look.</p></div>
      <div className="button-row"><button className="button primary" onClick={start}>Start Challenge →</button>
        {latestAttempt && !latestAttempt.completedAt && <Link className="button secondary" to={`/challenge/${scene.id}/${latestAttempt.id}`}>Resume Challenge</Link>}
        <Link className="button secondary" to={`/review/${scene.id}`}>Review Words</Link><Link className="text-button" to={`/category/${category.id}`}>返回本分类 · Category</Link></div></section>}
    {restart && <RestartDialog onCancel={() => setRestart(false)} onConfirm={() => {
      dispatch({ type: 'restart', sceneId: scene.id }); setSelected(null); setHint(undefined); setRestart(false);
    }} />}
  </Layout>;
}
