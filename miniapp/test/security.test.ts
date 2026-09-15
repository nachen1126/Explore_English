import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { safeUserId, ownedDocumentId } = require('../cloudfunctions/user-service/identity.js');
const { answerIsCorrect } = require('../cloudfunctions/user-service/challenge-policy.js');
const { cleanAttempt } = require('../cloudfunctions/user-service/challenge-schema.js');
const { verifyAdministrator } = require('../cloudfunctions/admin-stats-http/policy.js');

describe('CloudBase identity boundaries', () => {
  it('creates different opaque record prefixes for different OpenIDs', () => {
    const a = safeUserId('openid-user-a'), b = safeUserId('openid-user-b');
    expect(a).not.toBe(b); expect(a).not.toContain('openid');
    expect(ownedDocumentId(a, 'kitchen-2')).not.toBe(ownedDocumentId(b, 'kitchen-2'));
  });
  it('does not authorize an ordinary authenticated user for administrator stats', async () => {
    const identity = await verifyAdministrator({ token: 'valid', verifyToken: vi.fn().mockResolvedValue({ id: 'user-a' }),
      findAdministrator: vi.fn().mockResolvedValue(null) });
    expect(identity).toBeNull();
  });
  it('requires an enabled server-side administrator record', async () => {
    const identity = await verifyAdministrator({ token: 'valid', verifyToken: vi.fn().mockResolvedValue({ id: 'admin-a' }),
      findAdministrator: vi.fn().mockResolvedValue({ enabled: true }) });
    expect(identity).toEqual({ id: 'admin-a' });
  });
  it('recomputes answer correctness on the server instead of trusting a client flag', () => {
    expect(answerIsCorrect('oven', 'typing', 'kitchen-oven')).toBe(true);
    expect(answerIsCorrect('fridge', 'typing', 'kitchen-oven')).toBe(false);
    expect(answerIsCorrect('kitchen-oven', 'hotspot', 'kitchen-oven')).toBe(true);
  });
  it('accepts a real weak-word attempt but still rejects an incomplete full challenge', () => {
    const question = { id: 'weak-1-0', vocabularyId: 'kitchen-oven', mode: 'produce', answers: [] };
    expect(cleanAttempt({ attemptId: 'weak-1', sceneId: 'kitchen-2', kind: 'weak', startedAt: 1, completedAt: null,
      questions: [question] })).toEqual(expect.objectContaining({ kind: 'weak', questions: [question] }));
    expect(cleanAttempt({ attemptId: 'weak-1', sceneId: 'kitchen-2', kind: 'full', startedAt: 1, completedAt: null,
      questions: [question] })).toBeNull();
  });
  it('validates reveal records and recomputes their answers on the server', () => {
    const answers = [1, 2, 3].map(at => ({ answer: 'fridge', correct: true, at, source: 'typing' }));
    const attempt = cleanAttempt({ attemptId: 'weak-2', sceneId: 'kitchen-2', kind: 'weak', startedAt: 1, completedAt: null,
      questions: [{ id: 'weak-2-0', vocabularyId: 'kitchen-oven', mode: 'produce', answers,
        revealedAt: 4, answerRequiredAfterReveal: true }] });
    expect(attempt.questions[0].answers.every((answer: { correct: boolean }) => !answer.correct)).toBe(true);
    expect(attempt.questions[0].revealedAt).toBe(4);
  });
});
