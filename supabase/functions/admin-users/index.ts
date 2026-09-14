import { createClient, type User } from 'npm:@supabase/supabase-js@2.116.0';

const liveOrigin = 'https://nachen1126.github.io';
const activeRule = 'Signed in or saved learning activity within the last 30 days.';
const allowedOrigin = (origin: string | null) => origin === liveOrigin || Boolean(origin && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
const cors = (origin: string | null) => ({
  ...(allowedOrigin(origin) ? { 'Access-Control-Allow-Origin': origin! } : {}),
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
});
const json = (body: unknown, status: number, origin: string | null) => new Response(JSON.stringify(body), {
  status, headers: { ...cors(origin), 'Content-Type': 'application/json; charset=utf-8' },
});
const time = (value: string | null | undefined) => value ? new Date(value).getTime() : 0;

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('Origin');
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, origin);
  if (!allowedOrigin(origin)) return json({ error: 'Origin not allowed.' }, 403, origin);
  const authorization = request.headers.get('Authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  const serviceKey = Deno.env.get('SUPABASE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const projectUrl = Deno.env.get('SUPABASE_URL');
  if (!token || !serviceKey || !projectUrl) return json({ error: 'Unauthorized.' }, 401, origin);

  const admin = createClient(projectUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: verified, error: authError } = await admin.auth.getUser(token);
  if (authError || !verified.user) return json({ error: 'Unauthorized.' }, 401, origin);
  const { data: grant, error: grantError } = await admin.from('admin_users').select('user_id').eq('user_id', verified.user.id).maybeSingle();
  if (grantError) return json({ error: 'Administrator verification failed.' }, 500, origin);
  if (!grant) return json({ error: 'Forbidden.' }, 403, origin);

  let body: { search?: unknown; sort?: unknown } = {};
  try { body = await request.json(); } catch { /* Empty filters are valid. */ }
  const search = typeof body.search === 'string' ? body.search.trim().toLocaleLowerCase().slice(0, 200) : '';
  const sort = ['registered_desc', 'registered_asc', 'activity_desc', 'activity_asc'].includes(String(body.sort))
    ? String(body.sort) : 'activity_desc';

  const authUsers: User[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return json({ error: 'User list could not be loaded.' }, 500, origin);
    authUsers.push(...data.users);
    if (data.users.length < 1000) break;
  }
  const ids = authUsers.map(user => user.id);
  const [{ data: profiles, error: profileError }, { data: records, error: recordError }] = ids.length ? await Promise.all([
    admin.from('profiles').select('id, nickname').in('id', ids),
    admin.from('learning_records').select('user_id, completed_scene_count, challenge_count, last_learning_at').in('user_id', ids),
  ]) : [{ data: [], error: null }, { data: [], error: null }];
  if (profileError || recordError) return json({ error: 'Learning activity could not be loaded.' }, 500, origin);
  const nickname = new Map((profiles ?? []).map(row => [row.id as string, row.nickname as string | null]));
  const learning = new Map((records ?? []).map(row => [row.user_id as string, row]));
  const now = Date.now(), day = 86_400_000, cutoff7 = now - 7 * day, cutoff30 = now - 30 * day;
  const all = authUsers.map(user => {
    const record = learning.get(user.id);
    const lastLearningAt = record?.last_learning_at as string | null | undefined;
    const lastActivityTime = Math.max(time(user.last_sign_in_at), time(lastLearningAt));
    const lastActivityAt = lastActivityTime ? new Date(lastActivityTime).toISOString() : null;
    return { id: user.id, email: user.email ?? '', nickname: nickname.get(user.id) ?? null,
      registeredAt: user.created_at, lastLoginAt: user.last_sign_in_at ?? null,
      completedSceneCount: Number(record?.completed_scene_count ?? 0), challengeCount: Number(record?.challenge_count ?? 0),
      lastLearningAt: lastLearningAt ?? null, lastActivityAt };
  });
  const totals = { users: all.length,
    new7Days: all.filter(user => time(user.registeredAt) >= cutoff7).length,
    new30Days: all.filter(user => time(user.registeredAt) >= cutoff30).length,
    activeUsers: all.filter(user => time(user.lastActivityAt) >= cutoff30).length };
  const filtered = search ? all.filter(user => user.email.toLocaleLowerCase().includes(search)
    || user.nickname?.toLocaleLowerCase().includes(search)) : all;
  const direction = sort.endsWith('_asc') ? 1 : -1;
  const field = sort.startsWith('registered') ? 'registeredAt' : 'lastActivityAt';
  filtered.sort((a, b) => (time(a[field]) - time(b[field])) * direction || a.email.localeCompare(b.email));
  return json({ totals, activeRule, users: filtered }, 200, origin);
});
