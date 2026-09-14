import { Link, useParams, useSearchParams } from 'react-router-dom';
import { assetUrl, getCategory, getCategoryScenes, getTopic, topics } from '../data';
import { useLearning } from '../store';
import { Layout, MissingPage } from '../components/Layout';
import type { Scene } from '../types';

type SceneView = 'learned' | 'not-started' | 'plans';

export function CategoryPage() {
  const { categoryId = '' } = useParams();
  const { state } = useLearning();
  const category = getCategory(categoryId);
  const published = getCategoryScenes(categoryId);
  const planned = topics.filter(topic => topic.categoryId === categoryId && !published.some(scene => scene.topicId === topic.id));
  const [params, setParams] = useSearchParams();
  const progressCount = (scene: Scene) => new Set((state.scenes[scene.id]?.explored ?? [])
    .filter(id => scene.vocabularyIds.includes(id))).size;
  const learned = published.filter(scene => progressCount(scene) > 0);
  const notStarted = published.filter(scene => progressCount(scene) === 0);
  const requested = params.get('view');
  const view: SceneView = requested === 'learned' || requested === 'not-started' || requested === 'plans'
    ? requested : published.length ? (learned.length ? 'learned' : 'not-started') : 'plans';
  const tabs: { view: SceneView; label: string; count: number }[] = [
    { view: 'learned', label: '已经学习 · Learned', count: learned.length },
    { view: 'not-started', label: '未学习 · Not started', count: notStarted.length },
    { view: 'plans', label: '内容规划 · Coming soon', count: planned.length },
  ];
  if (!category) return <MissingPage message="This category is not available." />;

  function sceneCard(scene: Scene) {
    const count = progressCount(scene);
    const label = count >= scene.vocabularyIds.length ? 'Review' : count > 0 ? 'Continue' : 'Start Exploring';
    const topic = getTopic(scene.topicId);
    return <Link className="scene-card" key={scene.id} to={`/scene/${scene.id}`} aria-label={`${scene.title} · ${label}`}>
      <div className="scene-thumbnail"><img src={assetUrl(scene.thumbnail)} width={scene.imageWidth} height={scene.imageHeight} loading="lazy"
        alt={`${scene.title} illustration`} decoding="async" /></div>
      <div className="scene-card-content"><div className="card-title-row"><h3>{topic?.chineseTitle} · {scene.title}</h3><span>{scene.vocabularyIds.length} words</span></div>
        <progress value={count} max={scene.vocabularyIds.length} aria-label={`${scene.title} exploration progress`} />
        <div className="card-bottom"><span>{count}/{scene.vocabularyIds.length} discovered</span><strong>{label} <span aria-hidden="true">↗</span></strong></div>
      </div></Link>;
  }

  const visibleScenes = view === 'learned' ? learned : notStarted;
  const sceneHeading = view === 'learned' ? '已经学习 · Learned' : '未学习 · Not started';
  const sceneHeadingId = view === 'learned' ? 'learned-scenes' : 'not-started-scenes';
  return <Layout className="category-main" backLabel="返回首页 · Home"><section className="page-heading category-page-heading">
    <p className="eyebrow">Choose a scene · 选择场景</p>
    <h1>{category.chineseTitle}<span className="category-translation">{category.title}</span></h1>
    <p>{category.description}</p>
  </section>
    <div className="view-switch" role="tablist" aria-label="Scene groups" onKeyDown={event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const current = tabs.findIndex(tab => tab.view === view);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
        : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      setParams({ view: tabs[next].view });
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
    }}>
      {tabs.map(tab => <button key={tab.view} role="tab" aria-selected={view === tab.view} tabIndex={view === tab.view ? 0 : -1}
        onClick={() => setParams({ view: tab.view })}>{tab.label} ({tab.count})</button>)}
    </div>
    {view !== 'plans' ? <section className="category-section" aria-labelledby={sceneHeadingId}>
      <div className="category-heading"><h2 id={sceneHeadingId}>{sceneHeading}</h2>
        <span className="small">{visibleScenes.length} {visibleScenes.length === 1 ? 'scene' : 'scenes'}</span></div>
      {visibleScenes.length ? <div className="scene-grid">{visibleScenes.map(sceneCard)}</div>
        : <p className="category-empty-state">{view === 'learned'
          ? 'You have not explored a scene in this category yet. · 这个分类还没有学习记录。'
          : 'Every published scene in this category has already been started. · 这个分类中的已发布场景都已经开始学习。'}</p>}
    </section> : <section className="planned-scenes category-section" aria-labelledby="planned-scenes">
      <div className="category-heading"><div><h2 id="planned-scenes">内容规划 · Coming soon</h2><p>以下场景尚未开放学习。</p></div>
        <span className="small">{planned.length} {planned.length === 1 ? 'scene' : 'scenes'}</span></div>
      {planned.length ? <ul className="scene-grid planned-scene-grid">{planned.map(topic => <li className="planned-scene-card" key={topic.id}>
        <strong>{topic.chineseTitle} · {topic.title}</strong><span>Coming soon</span></li>)}</ul>
        : <p className="category-empty-state">There are no additional scene plans in this category.</p>}
    </section>}
  </Layout>;
}
