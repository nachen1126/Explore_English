import { Link, useParams } from 'react-router-dom';
import { assetUrl, getCategory, getCategoryScenes, getTopic, topics } from '../data';
import { useLearning } from '../store';
import { Layout, MissingPage } from '../components/Layout';

export function CategoryPage() {
  const { categoryId = '' } = useParams();
  const { state } = useLearning();
  const category = getCategory(categoryId);
  if (!category) return <MissingPage message="This category is not available." />;
  const available = getCategoryScenes(category.id);
  const planned = topics.filter(topic => topic.categoryId === category.id && !available.some(scene => scene.topicId === topic.id));
  return <Layout backLabel="返回首页 · Home"><section className="page-heading category-page-heading">
    <p className="eyebrow">Choose a scene · 选择场景</p>
    <h1>{category.chineseTitle}<span className="category-translation">{category.title}</span></h1>
    <p>{category.description}</p>
  </section>
    {available.length ? <section className="category-section" aria-labelledby="available-scenes">
      <div className="category-heading"><h2 id="available-scenes">开始学习 · Available scenes</h2>
        <span className="small">{available.length} {available.length === 1 ? 'scene' : 'scenes'}</span></div>
      <div className="scene-grid">{available.map(scene => {
        const count = state.scenes[scene.id]?.explored.length ?? 0;
        const label = count === scene.vocabularyIds.length ? 'Review' : count ? 'Continue' : 'Start Exploring';
        const topic = getTopic(scene.topicId);
        return <Link className="scene-card" key={scene.id} to={`/scene/${scene.id}`} aria-label={`${scene.title} · ${label}`}>
          <div className="scene-thumbnail"><img src={assetUrl(scene.thumbnail)} width={scene.imageWidth} height={scene.imageHeight} loading="lazy"
            alt={`${scene.title} illustration`} decoding="async" /></div>
          <div className="scene-card-content"><div className="card-title-row"><h3>{topic?.chineseTitle} · {scene.title}</h3><span>{scene.vocabularyIds.length} words</span></div>
            {scene.assetStatus === 'development' && <p className="development-label">Development artwork</p>}
            <progress value={count} max={scene.vocabularyIds.length} aria-label={`${scene.title} exploration progress`} />
            <div className="card-bottom"><span>{count}/{scene.vocabularyIds.length} discovered</span><strong>{label} <span aria-hidden="true">↗</span></strong></div>
          </div></Link>;
      })}</div>
    </section> : <section className="category-coming-soon"><h2>Coming soon · 敬请期待</h2>
      <p>这个大类的场景正在准备中，完成后即可开始学习。<br />Scenes will be available here when their illustrations and word collections are ready.</p>
    </section>}
    {!!planned.length && <section className="planned-scenes" aria-labelledby="planned-scenes">
      <h2 id="planned-scenes">内容规划 · Coming soon</h2>
      <p>以下场景尚未开放学习。</p>
      <ul>{planned.map(topic => <li key={topic.id}>{topic.chineseTitle} · {topic.title}</li>)}</ul>
    </section>}
  </Layout>;
}
