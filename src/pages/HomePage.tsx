import { Link } from 'react-router-dom';
import { assetUrl, categories, publishedScenes, topics } from '../data';
import { useLearning } from '../store';
import { Layout } from '../components/Layout';

export function HomePage() {
  const { state } = useLearning();
  return <Layout><section className="home-heading"><p className="eyebrow">English, in the places you know</p><h1>Where do you<br className="desktop-break" /> want to go?</h1>
    <p>Explore a scene. Discover its words. Come back whenever you like.</p></section>
    {!publishedScenes.length && <section className="empty-state"><h2>New scenes are being prepared.</h2><p>Complete illustrations and word collections will appear here when they are ready.</p></section>}
    <div className="home-categories">{categories.map(category => {
      const categoryTopics = topics.filter(topic => topic.categoryId === category.id);
      const available = publishedScenes.filter(scene => categoryTopics.some(topic => topic.id === scene.topicId));
      if (!available.length) return null;
      return <section className="category-section" key={category.id} aria-labelledby={category.id}>
        <div className="category-heading"><div><h2 id={category.id}>{category.title}</h2><p>{category.description}</p></div><span className="small">{available.length} {available.length === 1 ? 'scene' : 'scenes'}</span></div>
        <div className="scene-grid">{available.map(scene => {
          const count = state.scenes[scene.id]?.explored.length ?? 0;
          const label = count === scene.vocabularyIds.length ? 'Review' : count ? 'Continue' : 'Start Exploring';
          return <Link className="scene-card" key={scene.id} to={`/scene/${scene.id}`} aria-label={`${scene.title} · ${label}`}>
            <div className="scene-thumbnail"><img src={assetUrl(scene.thumbnail)} width={scene.imageWidth} height={scene.imageHeight} loading="lazy"
              alt={`${scene.title} illustration`} decoding="async" /></div>
            <div className="scene-card-content"><div className="card-title-row"><h3>{scene.title}</h3><span>{scene.vocabularyIds.length} words</span></div>
              {scene.assetStatus === 'development' && <p className="development-label">Development artwork</p>}
              <progress value={count} max={scene.vocabularyIds.length} aria-label={`${scene.title} exploration progress`} />
              <div className="card-bottom"><span>{count}/{scene.vocabularyIds.length} discovered</span><strong>{label} <span aria-hidden="true">↗</span></strong></div>
            </div></Link>;
        })}</div>
      </section>;
    })}</div>
  </Layout>;
}
