import { Link } from 'react-router-dom';
import { categories, getCategoryScenes } from '../data';
import { Layout } from '../components/Layout';

export function HomePage() {
  return <Layout><section className="home-heading"><p className="eyebrow">English, in the places you know</p>
    <h1>从一个大类开始<br /><span className="heading-translation">Choose your world.</span></h1>
    <p>先选择大类，再进入场景。<br />Choose a category, find a scene, and discover its words.</p>
  </section>
    <div className="category-directory">{categories.map(category => {
      const count = getCategoryScenes(category.id).length;
      return <Link className="category-card" key={category.id} to={`/category/${category.id}`}
        aria-label={`${category.chineseTitle} · ${category.title}`}>
        <h2>{category.chineseTitle}<span>{category.title}</span></h2>
        <p>{category.description}</p>
        <div className="category-card-footer"><span>{count ? `${count} ${count === 1 ? 'scene' : 'scenes'} available` : 'Coming soon'}</span>
          <span aria-hidden="true">↗</span></div>
      </Link>;
    })}</div>
  </Layout>;
}
