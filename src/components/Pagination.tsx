import { useSyncExternalStore } from 'react';
import { useSearchParams } from 'react-router-dom';

const query = '(max-width: 600px)';
const subscribe = (notify: () => void) => {
  const media = window.matchMedia?.(query);
  media?.addEventListener('change', notify);
  return () => media?.removeEventListener('change', notify);
};
export const useSmallScreen = () => useSyncExternalStore(subscribe, () => window.matchMedia?.(query).matches ?? false, () => false);

export function usePagination<T>(items: T[], pageSize: number, key = 'page') {
  const [params, setParams] = useSearchParams();
  const requested = Number(params.get(key) ?? 1);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(pages, Number.isInteger(requested) && requested > 0 ? requested : 1);
  const setPage = (next: number) => setParams(previous => {
    const updated = new URLSearchParams(previous);
    updated.set(key, String(Math.max(1, Math.min(pages, next))));
    return updated;
  });
  return { items: items.slice((page - 1) * pageSize, page * pageSize), page, pages, setPage };
}
export function Pagination({ page, pages, setPage, label }: { page: number; pages: number; setPage: (page: number) => void; label: string }) {
  if (pages <= 1) return null;
  return <nav className="pagination" aria-label={label}>
    <button className="button secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous page</button>
    <span role="status">Page {page} of {pages}</span>
    <button className="button secondary" disabled={page === pages} onClick={() => setPage(page + 1)}>Next page</button>
  </nav>;
}
