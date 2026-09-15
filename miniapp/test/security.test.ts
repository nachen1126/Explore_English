import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { safeUserId, ownedDocumentId } = require('../cloudfunctions/user-service/identity.js');
const { answerIsCorrect } = require('../cloudfunctions/user-service/challenge-policy.js');
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
});
