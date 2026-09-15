import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const taroMock = vi.hoisted(() => ({
  getSetting: vi.fn(),
  authorize: vi.fn(),
  login: vi.fn(),
  cloud: {
    init: vi.fn(), callFunction: vi.fn(), uploadFile: vi.fn(), deleteFile: vi.fn(),
    getTempFileURL: vi.fn(),
  },
  createInnerAudioContext: vi.fn(),
}));

vi.mock('@tarojs/taro', () => ({ default: taroMock }));

import { requestRecordPermission } from '../src/services/record-permission';

describe('startup and permission resilience', () => {
  it('does not declare scope.record in app.json source configuration', () => {
    const source = readFileSync(new URL('../src/app.config.ts', import.meta.url), 'utf8');
    expect(source).not.toContain("'scope.record'");
    expect(source).not.toMatch(/\bpermission\s*:/);
  });

  it('uses an existing microphone grant without requesting it again', async () => {
    taroMock.getSetting.mockResolvedValueOnce({ authSetting: { 'scope.record': true } });
    expect(await requestRecordPermission(taroMock)).toBe(true);
    expect(taroMock.authorize).not.toHaveBeenCalled();
  });

  it('requests scope.record only after the user starts recording', async () => {
    taroMock.getSetting.mockResolvedValueOnce({ authSetting: {} });
    taroMock.authorize.mockResolvedValueOnce({});
    expect(await requestRecordPermission(taroMock)).toBe(true);
    expect(taroMock.authorize).toHaveBeenCalledWith({ scope: 'scope.record' });
  });

  it('returns a visible-flow failure instead of throwing when recording is denied', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    taroMock.getSetting.mockResolvedValueOnce({ authSetting: { 'scope.record': false } });
    taroMock.authorize.mockRejectedValueOnce(new Error('authorize:fail auth deny'));
    await expect(requestRecordPermission(taroMock)).resolves.toBe(false);
  });

  it('contains CloudBase initialization errors and logs them', async () => {
    vi.stubEnv('TARO_APP_CLOUDBASE_ENV', 'cloud-test-environment');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    taroMock.cloud.init.mockImplementationOnce(() => { throw new Error('invalid environment'); });
    const { initializeCloud } = await import('../src/services/cloud');
    expect(() => initializeCloud()).not.toThrow();
    expect(initializeCloud()).toBe(true);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('initialization failed'), expect.any(Error),
    );
  });

  it('logs and rejects failed login calls so the UI can show guest entry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    taroMock.login.mockResolvedValueOnce({ code: 'temporary-code' });
    taroMock.cloud.callFunction.mockRejectedValueOnce(new Error('cloud unavailable'));
    const { wechatLogin } = await import('../src/services/cloud');
    await expect(wechatLogin()).rejects.toThrow('cloud unavailable');
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('WeChat login failed'), expect.any(Error),
    );
  });
});
