import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getScene, getSceneCategory, getTopic, vocabulary } from '../data';
import { createAttempt, weakVocabulary } from '../logic';
import { useLearning } from '../store';
import { speak } from '../speech';
import { Layout, RestartDialog, UnavailableScenePage } from '../components/Layout';
import { SceneArt } from '../components/SceneArt';
import { WordCard, type AudioPlaybackState } from '../components/WordCard';
import { useLearningEnter } from '../useLearningEnter';

export function ExplorePage() {
  const { sceneId = '' } = useParams();
  const scene = getScene(sceneId);
  return scene ? <ExploreScene key={scene.id} sceneId={scene.id} /> : <UnavailableScenePage sceneId={sceneId} />;
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
  const playbackSequence = useRef(0);
  const [playback, setPlayback] = useState<AudioPlaybackState>();
  useEffect(() => { dispatch({ type: 'visit', sceneId: scene.id, at: Date.now() }); }, [dispatch, scene.id]);
  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);
  const explored = state.scenes[scene.id]?.explored ?? [];
  const complete = scene.vocabularyIds.every(id => explored.includes(id));
  function discover(id: string) {
    dispatch({ type: 'discover', sceneId: scene.id, vocabularyId: id, at: Date.now() });
    const request = ++playbackSequence.current;
    const updatePlayback = (patch: Partial<AudioPlaybackState>) => setPlayback(current => current?.request === request
      ? { ...current, ...patch } : current);
    setSelected(id); setHint(undefined); setPlayback({ wordId: id, request, isPlaying: false, error: false });
    if (!speak(vocabulary[id].audioText, () => updatePlayback({ isPlaying: false, error: true }), {
      onStart: () => updatePlayback({ isPlaying: true }),
      onEnd: () => updatePlayback({ isPlaying: false }),
    })) updatePlayback({ error: true });
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
  return <Layout className="explore-main" back={`/category/${category.id}`} backLabel="返回本分类 · Category"><section className="page-heading explore-heading">
    <div><p className="eyebrow">{category.chineseTitle} · {category.title}</p><h1>{topic.chineseTitle}<span className="scene-translation">{scene.title}</span></h1>
      <p>Choose an object. Learn a word. Make it yours.</p></div>
    <div className="progress-counter"><strong>{explored.length}/{scene.vocabularyIds.length}</strong><span>objects discovered</span></div>
  </section>
    <progress className="progress-bar" value={explored.length} max={scene.vocabularyIds.length} aria-label="Exploration progress" />
    <div className="explore-layout"><SceneArt scene={scene} discovered={explored} onTap={discover} highlight={hint ?? selected ?? undefined} />
      <aside className="word-panel" aria-live="polite">{selected ? <WordCard item={vocabulary[selected]} playback={playback} onClose={() => {
        playbackSequence.current += 1; window.speechSynthesis?.cancel(); setSelected(null); setPlayback(undefined);
      }} />
        : <div className="word-card word-card-empty"><span className="eyebrow">A closer look</span><h2>A scene full of words.</h2><p>Tap an object in the picture to see its meaning and hear it in British English.</p><span className="fine-rule" /><p className="small">You can revisit every object as often as you like.</p></div>}
        <div className="learning-next"><button className="button primary" data-learn-next disabled={!nextId} onClick={nextWord}>Next word →</button>
          <span className="small">Press Enter</span></div>
        {!complete && <div className="scene-actions"><button className="text-button" onClick={() => {
          const remaining = scene.vocabularyIds.find(id => !explored.includes(id));
          setHint(remaining);
        }}>Show me a hint</button>
          <button className="text-button muted" onClick={() => setRestart(true)}>Start over</button></div>}
        {complete && <section className="completion-panel"><h2>You found them all!</h2>
      <div className="button-row"><button className="button primary" onClick={start}>Start Challenge →</button>
        <Link className="button secondary" to={`/review/${scene.id}`}>Review Words</Link>
        <button className="button secondary" onClick={() => setRestart(true)}>Start over</button></div></section>}
      </aside></div>
    {restart && <RestartDialog onCancel={() => setRestart(false)} onConfirm={() => {
      playbackSequence.current += 1; window.speechSynthesis?.cancel();
      dispatch({ type: 'restart', sceneId: scene.id }); setSelected(null); setPlayback(undefined); setHint(undefined); setRestart(false);
    }} />}
  </Layout>;
}
