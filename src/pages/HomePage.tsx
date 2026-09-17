import { Link } from 'react-router-dom';
import { categories, getCategoryScenes, getScene, getTopic } from '../data';
import { Layout } from '../components/Layout';
import { useLearning } from '../store';

export function HomePage() {
  const { state } = useLearning();
  const available = categories.filter(category => getCategoryScenes(category.id).length);
  const planned = categories.filter(category => !getCategoryScenes(category.id).length);
  const last = Object.entries(state.scenes).filter(([id, progress]) => {
    const scene = getScene(id);
    if (!scene) return false;
    const count = new Set(progress.explored.filter(wordId => scene.vocabularyIds.includes(wordId))).size;
    return count > 0 && count < scene.vocabularyIds.length;
  })
    .sort((a, b) => b[1].lastVisited - a[1].lastVisited)[0];
  const lastScene = last ? getScene(last[0]) : undefined;
  const lastCount = lastScene ? new Set(state.scenes[lastScene.id].explored.filter(id => lastScene.vocabularyIds.includes(id))).size : 0;
  const lastTopic = lastScene ? getTopic(lastScene.topicId) : undefined;
  return <Layout className="directory-main"><section className="home-heading">
    <p className="eyebrow">Explore English · 探索英语</p><h1>Choose your world.</h1>
    <p>在真实场景中发现单词，完成挑战。</p>
  </section>
    {lastScene && <section className="continue-section" aria-labelledby="continue-title"><h2 id="continue-title">继续学习 · Continue learning</h2>
      <Link className="continue-learning" to={`/scene/${lastScene.id}`} aria-label={`Continue ${lastScene.title}`}>
        <div><strong>{lastTopic?.chineseTitle} · {lastScene.title}</strong><span>已发现 {lastCount}/{lastScene.vocabularyIds.length} 个单词</span></div>
        <progress value={lastCount} max={lastScene.vocabularyIds.length} aria-label={`${lastScene.title} learning progress`} />
        <span className="card-arrow" aria-hidden="true">→</span>
      </Link>
    </section>}
    <section className="available-categories" aria-labelledby="available-category-title"><h2 id="available-category-title">全部分类 · All categories</h2>
    <div className="category-directory">{available.map(category => {
      const scenes = getCategoryScenes(category.id);
      const total = scenes.reduce((sum, scene) => sum + scene.vocabularyIds.length, 0);
      const count = scenes.reduce((sum, scene) => sum + scene.vocabularyIds.filter(id => state.scenes[scene.id]?.explored.includes(id)).length, 0);
      return <Link className="category-card" key={category.id} to={`/category/${category.id}`} aria-label={`${category.chineseTitle} · ${category.title}`}>
        <div className="category-copy"><h2>{category.chineseTitle}<span>{category.title}</span></h2>
          <progress value={count} max={total} aria-label={`${category.title} learning progress`} />
          <div className="category-card-footer"><span>{count}/{total} words · {scenes.length} {scenes.length === 1 ? 'scene' : 'scenes'}</span><span aria-hidden="true">↗</span></div>
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
