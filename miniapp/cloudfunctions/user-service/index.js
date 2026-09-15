'use strict';
const cloud = require('wx-server-sdk');
const { safeUserId, ownedDocumentId } = require('./identity');
const { SCENE_ID, VOCABULARY_IDS, vocabulary, object, finite, cleanAttempt, attemptStats } = require('./challenge-schema');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const ok = data => ({ ok: true, data });
const fail = (error, message) => ({ ok: false, error, message });

async function readAll(collection, userId) {
  const rows = [];
  for (let skip = 0; ; skip += 100) {
    const page = await db.collection(collection).where({ userId }).skip(skip).limit(100).get();
    rows.push(...page.data);
    if (page.data.length < 100) return rows;
  }
}

async function pull(userId) {
  const [progressRows, attemptRows] = await Promise.all([readAll('sceneProgress', userId), readAll('challengeAttempts', userId)]);
  const progress = {};
  for (const row of progressRows) progress[row.sceneId] = {
    sceneId: row.sceneId, discoveredVocabularyIds: row.discoveredVocabularyIds ?? [], completed: !!row.completed,
    updatedAt: row.updatedAt ?? 0, schemaVersion: 1,
  };
  const attempts = {};
  for (const row of attemptRows) attempts[row.attemptId] = {
    attemptId: row.attemptId, sceneId: row.sceneId, kind: row.kind || 'full', questions: row.questions,
    startedAt: row.startedAt, completedAt: row.completedAt ?? null,
  };
  return { schemaVersion: 1, progress, attempts };
}

async function sync(userId, incoming) {
  if (!object(incoming) || incoming.schemaVersion !== 1 || !object(incoming.progress) || !object(incoming.attempts)) {
    throw new Error('INVALID_SNAPSHOT');
  }
  const current = await pull(userId);
  const submittedProgress = incoming.progress[SCENE_ID];
  if (submittedProgress) {
    if (!object(submittedProgress) || !Array.isArray(submittedProgress.discoveredVocabularyIds)) throw new Error('INVALID_PROGRESS');
    const discovered = [...new Set([
      ...(current.progress[SCENE_ID]?.discoveredVocabularyIds ?? []),
      ...submittedProgress.discoveredVocabularyIds,
    ])].filter(id => typeof id === 'string' && vocabulary.has(id));
    const updatedAt = Math.max(current.progress[SCENE_ID]?.updatedAt ?? 0, finite(submittedProgress.updatedAt) ? submittedProgress.updatedAt : 0);
    await db.collection('sceneProgress').doc(ownedDocumentId(userId, SCENE_ID)).set({ data: {
      userId, sceneId: SCENE_ID, discoveredVocabularyIds: discovered,
      completed: discovered.length === VOCABULARY_IDS.length, updatedAt, schemaVersion: 1,
    } });
  }
  for (const value of Object.values(incoming.attempts)) {
    const attempt = cleanAttempt(value);
    if (!attempt) throw new Error('INVALID_ATTEMPT');
    const existing = current.attempts[attempt.attemptId];
    const existingAnswers = existing?.questions.reduce((sum, question) => sum + question.answers.length, 0) ?? -1;
    const incomingAnswers = attempt.questions.reduce((sum, question) => sum + question.answers.length, 0);
    const selected = existing?.completedAt || existingAnswers > incomingAnswers ? existing : attempt;
    await db.collection('challengeAttempts').doc(ownedDocumentId(userId, attempt.attemptId)).set({ data: {
      userId, ...selected, ...attemptStats(selected),
    } });
  }
  const progressActivity = submittedProgress && Array.isArray(submittedProgress.discoveredVocabularyIds)
    && submittedProgress.discoveredVocabularyIds.length ? submittedProgress.updatedAt : 0;
  const attemptActivity = Object.values(incoming.attempts).reduce((latest, attempt) => {
    if (!object(attempt) || !Array.isArray(attempt.questions)) return latest;
    return Math.max(latest, ...attempt.questions.flatMap(question => Array.isArray(question.answers)
      ? question.answers.map(answer => finite(answer.at) ? answer.at : 0) : []));
  }, 0);
  const lastStudyAt = Math.min(Date.now(), Math.max(progressActivity || 0, attemptActivity));
  if (lastStudyAt > 0) await db.collection('users').doc(userId).update({ data: { lastStudyAt } });
  return pull(userId);
}

exports.main = async event => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return fail('UNAUTHENTICATED', 'A verified WeChat identity is required.');
  const userId = safeUserId(OPENID);
  try {
    if (event.action === 'login') {
      const now = Date.now();
      const existing = await db.collection('users').doc(userId).get().catch(() => ({ data: null }));
      const user = existing.data || { _id: userId, createdAt: now, nickname: null, avatar: null, lastStudyAt: null };
      const next = { ...user, lastLoginAt: now };
      const stored = { ...next };
      delete stored._id;
      await db.collection('users').doc(userId).set({ data: stored });
      return ok({ id: userId, nickname: next.nickname ?? null, avatar: next.avatar ?? null,
        createdAt: next.createdAt, lastLoginAt: next.lastLoginAt, lastStudyAt: next.lastStudyAt ?? null });
    }
    if (event.action === 'pull') return ok(await pull(userId));
    if (event.action === 'sync') return ok(await sync(userId, event.snapshot));
    if (event.action === 'profile') {
      const nickname = event.nickname === null ? null : typeof event.nickname === 'string' ? event.nickname.trim().slice(0, 40) : null;
      const avatar = event.avatar === null ? null : typeof event.avatar === 'string'
        && event.avatar.startsWith('cloud://') && event.avatar.includes(`/avatars/${userId}/`) ? event.avatar : null;
      await db.collection('users').doc(userId).update({ data: { nickname, avatar } });
      const row = (await db.collection('users').doc(userId).get()).data;
      return ok({ id: userId, nickname: row.nickname ?? null, avatar: row.avatar ?? null,
        createdAt: row.createdAt, lastLoginAt: row.lastLoginAt, lastStudyAt: row.lastStudyAt ?? null });
    }
    return fail('UNKNOWN_ACTION', 'Unknown user-service action.');
  } catch (error) {
    console.error('user-service failed', { action: event.action, userId, error: error.message });
    return fail(error.message || 'SERVICE_ERROR', 'Cloud data could not be updated. Local progress remains safe.');
  }
};
