import { Component, useEffect, useRef, type ErrorInfo, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getCatalogScene, getSceneCategory } from '../data';

export function Layout({ children, back = '/', backLabel = 'Home', className = '' }: { children: ReactNode; back?: string; backLabel?: string; className?: string }) {
  const main = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return <><a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); main.current?.focus(); }}>Skip to content</a>
    <div className="shell"><header className="site-header">
      <Link className="brand" to="/" aria-label="Explore English home"><span className="wordmark">EE</span><span>Explore English</span></Link>
      <Link className="nav-back" to={back}>{back === '/' ? '' : '← '}{backLabel}</Link>
    </header><main id="main-content" ref={main} tabIndex={-1} className={className}>{children}</main>
    <footer className="site-footer"><span>Explore English</span><span>Learn at your own pace.</span></footer></div></>;
}
export function MissingPage({ message = 'This page is not available.' }: { message?: string }) {
  return <Layout><section className="empty-state"><p className="eyebrow">A different direction</p><h1>{message}</h1>
    <p>Choose an available scene and keep exploring.</p><Link className="button primary" to="/">Back Home</Link></section></Layout>;
}
export function UnavailableScenePage({ sceneId }: { sceneId: string }) {
  const record = getCatalogScene(sceneId);
  const category = record ? getSceneCategory(record) : undefined;
  return <Layout><section className="empty-state"><p className="eyebrow">Scene unavailable · 场景暂不可用</p>
    <h1>This scene is temporarily unavailable.</h1>
    <p>Its saved learning records are safe, but this scene is no longer part of the published course.</p>
    <div className="button-row">{category && <Link className="button primary" to={`/category/${category.id}`}>Back to {category.chineseTitle} · {category.title}</Link>}
      <Link className={category ? 'button secondary' : 'button primary'} to="/">Back Home</Link></div>
  </section></Layout>;
}
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Explore English could not render', error, info.componentStack); }
  render() {
    if (this.state.failed) return <main className="shell empty-state"><h1>Something did not load.</h1>
      <p>Your saved progress stays in this browser. Reload the app to try again.</p>
      <a className="button primary" href={import.meta.env.BASE_URL}>Reload Explore English</a></main>;
    return this.props.children;
  }
}
export function RestartDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const cancel = useRef<HTMLButtonElement>(null);
  const confirm = useRef<HTMLButtonElement>(null);
  return <div className="dialog-scrim"><section className="dialog" role="alertdialog" aria-modal="true"
    aria-labelledby="restart-title" aria-describedby="restart-description" onKeyDown={event => {
      if (event.key === 'Escape') onCancel();
      if (event.key === 'Tab') { event.preventDefault(); (event.target === cancel.current ? confirm : cancel).current?.focus(); }
    }}>
    <h2 id="restart-title">Start this scene again?</h2><p id="restart-description">This resets the discovered objects in this scene. Your previous challenge results will stay saved.</p>
    <div className="button-row"><button ref={cancel} autoFocus className="button primary" onClick={onCancel}>Keep my progress</button>
      <button ref={confirm} className="button secondary" onClick={onConfirm}>Restart scene</button></div>
  </section></div>;
}
