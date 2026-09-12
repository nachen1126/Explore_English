import { Link } from 'react-router-dom';
import { assetUrl, categories, getCategoryScenes, getScene, vocabulary } from '../data';
import { Layout } from '../components/Layout';
import { useLearning } from '../store';

export function HomePage() {
  const { state } = useLearning();
  const available = categories.filter(category => getCategoryScenes(category.id).length);
  const planned = categories.filter(category => !getCategoryScenes(category.id).length);
  const last = Object.entries(state.scenes).filter(([id]) => getScene(id))
    .sort((a, b) => b[1].lastVisited - a[1].lastVisited)[0];
  const lastScene = last ? getScene(last[0]) : undefined;
  return <Layout className="directory-main"><section className="home-heading">
    <h1>Choose your world.</h1>
    <p>选择场景，看见物品，记住单词。</p>
  </section>
    {lastScene && <section className="continue-learning" aria-labelledby="continue-title">
      <img src={assetUrl(lastScene.thumbnail)} alt="" width={lastScene.imageWidth} height={lastScene.imageHeight} />
      <div><h2 id="continue-title">Continue learning</h2><p>{lastScene.title} · {state.scenes[lastScene.id].explored.filter(id => vocabulary[id]).length}/{lastScene.vocabularyIds.length} words discovered</p></div>
      <Link className="button primary" to={`/scene/${lastScene.id}`}>Continue {lastScene.title} →</Link>
    </section>}
    <section className="available-categories" aria-labelledby="available-category-title"><h2 id="available-category-title">开始探索 · Ready to explore</h2>
    <div className="category-directory">{available.map(category => {
      const scenes = getCategoryScenes(category.id);
      const representative = scenes.find(scene => scene.assetStatus === 'final') ?? scenes[0];
      const total = scenes.reduce((sum, scene) => sum + scene.vocabularyIds.length, 0);
      const count = scenes.reduce((sum, scene) => sum + scene.vocabularyIds.filter(id => state.scenes[scene.id]?.explored.includes(id)).length, 0);
      return <Link className="category-card" key={category.id} to={`/category/${category.id}`} aria-label={`${category.chineseTitle} · ${category.title}`}>
        <img className="category-preview" src={assetUrl(representative.thumbnail)} alt={`${representative.title} scene`} width={representative.imageWidth} height={representative.imageHeight} />
        <div className="category-copy"><h2>{category.chineseTitle}<span>{category.title}</span></h2><p>{category.description}</p>
          <progress value={count} max={total} aria-label={`${category.title} learning progress`} />
          <div className="category-card-footer"><span>{scenes.length} {scenes.length === 1 ? 'scene' : 'scenes'} · {count}/{total} words</span><span aria-hidden="true">↗</span></div>
        </div>
      </Link>;
    })}</div></section>
    <section className="planned-categories" aria-labelledby="planned-category-title"><h2 id="planned-category-title">更多主题 · Coming soon</h2>
      <div>{planned.map(category => <Link key={category.id} to={`/category/${category.id}`} aria-label={`${category.chineseTitle} · ${category.title}`}>
        <strong>{category.chineseTitle} ↗</strong><span>{category.title}</span>
      </Link>)}</div>
    </section>
  </Layout>;
}
