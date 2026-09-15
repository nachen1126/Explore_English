'use strict';
const cloud = require('wx-server-sdk');
const { verifyAdministrator } = require('./policy');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const headers = origin => ({
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'authorization,content-type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
});
const response = (statusCode, body, origin) => ({ statusCode, headers: headers(origin), body: JSON.stringify(body) });
async function all(name) {
  const rows = [];
  for (let skip = 0; ; skip += 100) {
    const page = await db.collection(name).skip(skip).limit(100).get(); rows.push(...page.data);
    if (page.data.length < 100) return rows;
  }
}
function header(event, name) {
  const entries = Object.entries(event.headers || {});
  return entries.find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];
}

exports.main = async event => {
  const allowedOrigin = process.env.ADMIN_WEB_ORIGIN || 'https://nachen1126.github.io';
  const origin = header(event, 'origin') || allowedOrigin;
  if (origin !== allowedOrigin) return response(403, { error: 'ORIGIN_DENIED' }, allowedOrigin);
  if ((event.httpMethod || event.requestContext?.httpMethod) === 'OPTIONS') return response(204, {}, allowedOrigin);
  const token = String(header(event, 'authorization') || '').replace(/^Bearer\s+/i, '');
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!token || !supabaseUrl || !supabaseAnonKey) return response(401, { error: 'UNAUTHENTICATED' }, allowedOrigin);
  const webUser = await verifyAdministrator({
    token,
    verifyToken: async accessToken => {
      const verified = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: supabaseAnonKey, authorization: `Bearer ${accessToken}` } });
      return verified.ok ? verified.json() : null;
    },
    findAdministrator: async adminId => (await db.collection('admins').doc(adminId).get().catch(() => ({ data: null }))).data,
  });
  if (!webUser) return response(403, { error: 'ADMIN_REQUIRED' }, allowedOrigin);
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : event.body || {};
    const [users, progress, attempts] = await Promise.all([all('users'), all('sceneProgress'), all('challengeAttempts')]);
    const now = Date.now(), day = 86400000;
    const learned = new Map(), completed = new Map(), challengeCount = new Map(), correct = new Map(), total = new Map();
    for (const row of progress) {
      if ((row.discoveredVocabularyIds?.length ?? 0) > 0) learned.set(row.userId, (learned.get(row.userId) || 0) + 1);
      if (row.completed) completed.set(row.userId, (completed.get(row.userId) || 0) + 1);
    }
    for (const row of attempts) {
      challengeCount.set(row.userId, (challengeCount.get(row.userId) || 0) + 1);
      const answeredQuestions = Array.isArray(row.questions) ? row.questions.filter(question => question.answers?.length) : [];
      const firstAnswerCorrect = answeredQuestions.filter(question => question.answers[0]?.correct === true).length;
      correct.set(row.userId, (correct.get(row.userId) || 0) + firstAnswerCorrect);
      total.set(row.userId, (total.get(row.userId) || 0) + answeredQuestions.length);
    }
    const search = String(body.search || '').trim().toLowerCase().slice(0, 80);
    const records = users.map(user => ({
      id: user._id, nickname: user.nickname || null, registeredAt: user.createdAt,
      lastLoginAt: user.lastLoginAt || null, lastStudyAt: user.lastStudyAt || null,
      learnedSceneCount: learned.get(user._id) || 0, completedSceneCount: completed.get(user._id) || 0,
      challengeCount: challengeCount.get(user._id) || 0,
      averageFirstAnswerAccuracy: total.get(user._id) ? Math.round((correct.get(user._id) || 0) / total.get(user._id) * 100) : 0,
    })).filter(user => !search || user.id.toLowerCase().includes(search) || user.nickname?.toLowerCase().includes(search));
    const sorters = {
      login_asc: (a, b) => (a.lastLoginAt || 0) - (b.lastLoginAt || 0),
      login_desc: (a, b) => (b.lastLoginAt || 0) - (a.lastLoginAt || 0),
      registered_asc: (a, b) => a.registeredAt - b.registeredAt,
      registered_desc: (a, b) => b.registeredAt - a.registeredAt,
      activity_asc: (a, b) => Math.max(a.lastLoginAt || 0, a.lastStudyAt || 0) - Math.max(b.lastLoginAt || 0, b.lastStudyAt || 0),
      activity_desc: (a, b) => Math.max(b.lastLoginAt || 0, b.lastStudyAt || 0) - Math.max(a.lastLoginAt || 0, a.lastStudyAt || 0),
    };
    records.sort(sorters[body.sort] || sorters.login_desc);
    return response(200, { totals: {
      users: users.length,
      new7Days: users.filter(user => user.createdAt >= now - 7 * day).length,
      new30Days: users.filter(user => user.createdAt >= now - 30 * day).length,
      active7Days: users.filter(user => Math.max(user.lastLoginAt || 0, user.lastStudyAt || 0) >= now - 7 * day).length,
    }, activeRule: 'Last login or study activity within the previous 7 days.', users: records }, allowedOrigin);
  } catch (error) {
    console.error('admin stats failed', error);
    return response(500, { error: 'ADMIN_STATS_FAILED' }, allowedOrigin);
  }
};
