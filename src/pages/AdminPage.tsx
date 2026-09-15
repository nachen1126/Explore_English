import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { Layout } from '../components/Layout';
import { supabase } from '../supabase';

type Sort = 'registered_desc' | 'registered_asc' | 'activity_desc' | 'activity_asc' | 'login_desc' | 'login_asc';
interface AdminUser {
  id: string; email?: string; nickname: string | null; registeredAt: string | number; lastLoginAt: string | number | null;
  learnedSceneCount?: number; completedSceneCount: number; challengeCount: number;
  lastLearningAt?: string | null; lastStudyAt?: number | null; lastActivityAt?: string | null; averageFirstAnswerAccuracy?: number;
}
interface AdminResponse {
  totals: { users: number; new7Days: number; new30Days: number; activeUsers?: number; active7Days?: number };
  activeRule: string;
  users: AdminUser[];
}
const date = (value: string | number | null | undefined) => value ? new Date(value).toLocaleString() : 'Never';
const cloudBaseAdminEndpoint = import.meta.env.VITE_CLOUDBASE_ADMIN_ENDPOINT?.trim();

export function AdminPage() {
  const { status, user, isAdmin, adminChecked, accessToken } = useAuth();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<Sort>('activity_desc');
  const [data, setData] = useState<AdminResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const load = useCallback(async (nextSearch: string, nextSort: Sort) => {
    if (!supabase || !user || !isAdmin) return;
    setLoading(true); setError('');
    if (cloudBaseAdminEndpoint && accessToken) {
      try {
        const request = await fetch(cloudBaseAdminEndpoint, { method: 'POST', headers: {
          Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json',
        }, body: JSON.stringify({ search: nextSearch, sort: nextSort }) });
        const response = await request.json() as AdminResponse & { error?: string };
        if (!request.ok) throw new Error(response.error || 'CloudBase administrator request failed.');
        setData(response);
      } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'CloudBase administrator data could not be loaded.'); }
    } else {
      const { data: response, error: requestError } = await supabase.functions.invoke<AdminResponse>('admin-users', { body: { search: nextSearch, sort: nextSort } });
      if (requestError) setError(requestError.message || 'Administrator data could not be loaded.');
      else setData(response);
    }
    setLoading(false);
  }, [accessToken, isAdmin, user]);
  useEffect(() => { if (adminChecked && isAdmin) void load('', 'activity_desc'); }, [adminChecked, isAdmin, load]);
  function submit(event: FormEvent) { event.preventDefault(); void load(search, sort); }

  if (status === 'unconfigured') return <Layout><section className="empty-state"><h1>Administrator service is not configured.</h1><p>Deploy the Supabase migration and protected Edge Function before this route can show real data.</p></section></Layout>;
  if (status === 'loading' || (status === 'signed-in' && !adminChecked)) return <Layout><section className="empty-state"><p role="status">Verifying administrator access…</p></section></Layout>;
  if (!user) return <Layout><section className="empty-state"><h1>Administrator sign-in required.</h1><p>This route does not accept a role from browser storage.</p><Link className="button primary" to="/account">Sign in</Link></section></Layout>;
  if (!isAdmin) return <Layout><section className="empty-state"><h1>Access denied.</h1><p>Your authenticated user ID is not present in the server-side administrator allow-list.</p><Link className="button primary" to="/">Back Home</Link></section></Layout>;
  return <Layout><section className="admin-page"><p className="eyebrow">Restricted administration</p><h1>User activity</h1>
    {data && <><div className="admin-stats"><article><strong>{data.totals.users}</strong><span>Registered users</span></article><article><strong>{data.totals.new7Days}</strong><span>New in 7 days</span></article><article><strong>{data.totals.new30Days}</strong><span>New in 30 days</span></article><article><strong>{data.totals.active7Days ?? data.totals.activeUsers ?? 0}</strong><span>Active in 7 days</span></article></div><p className="small">Active rule: {data.activeRule}</p></>}
    <form className="admin-filters" onSubmit={submit}><label>Search {cloudBaseAdminEndpoint ? 'nickname or user ID' : 'email or nickname'}<input type="search" value={search} onChange={event => setSearch(event.target.value)} /></label>
      <label>Sort<select value={sort} onChange={event => setSort(event.target.value as Sort)}>{cloudBaseAdminEndpoint && <><option value="login_desc">Last login — newest</option><option value="login_asc">Last login — oldest</option></>}<option value="activity_desc">Recent activity — newest</option><option value="activity_asc">Recent activity — oldest</option><option value="registered_desc">Registration — newest</option><option value="registered_asc">Registration — oldest</option></select></label>
      <button className="button primary" disabled={loading}>{loading ? 'Loading…' : 'Apply'}</button></form>
    {error && <p className="form-error" role="alert">{error}</p>}
    {data && <div className="admin-table-wrap"><table><thead><tr><th>User</th><th>Registered</th><th>Last login</th><th>Last study</th><th>Learned</th><th>Completed</th><th>Challenges</th><th>First-answer accuracy</th></tr></thead>
      <tbody>{data.users.map(record => <tr key={record.id}><td><strong>{record.nickname || 'No nickname'}</strong><span>{record.email || record.id}</span></td><td>{date(record.registeredAt)}</td><td>{date(record.lastLoginAt)}</td><td>{date(record.lastStudyAt ?? record.lastLearningAt)}</td><td>{record.learnedSceneCount ?? '—'}</td><td>{record.completedSceneCount}</td><td>{record.challengeCount}</td><td>{record.averageFirstAnswerAccuracy === undefined ? '—' : `${record.averageFirstAnswerAccuracy}%`}</td></tr>)}</tbody></table>
      {!data.users.length && <p>No users match this search.</p>}</div>}
  </section></Layout>;
}
