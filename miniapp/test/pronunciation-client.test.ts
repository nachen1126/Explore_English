import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const callbacks: { play?: () => void; ended?: () => void; error?: (value: { errCode?: number; errMsg?: string }) => void } = {};
  const audio = {
    obeyMuteSwitch: true, src: '',
    onPlay: vi.fn((callback: () => void) => { callbacks.play = callback; }),
    onEnded: vi.fn((callback: () => void) => { callbacks.ended = callback; }),
    onError: vi.fn((callback: (value: { errCode?: number; errMsg?: string }) => void) => { callbacks.error = callback; }),
    play: vi.fn(() => callbacks.play?.()), stop: vi.fn(), destroy: vi.fn(),
  };
  const fileSystem = {
    access: vi.fn((options: { success(): void; fail(): void }) => options.fail()),
    writeFile: vi.fn((options: { success(): void }) => options.success()),
  };
  return {
    callbacks, audio, fileSystem,
    taro: {
      env: { USER_DATA_PATH: '/user-data' },
      cloud: { callFunction: vi.fn() },
      getFileSystemManager: vi.fn(() => fileSystem),
      createInnerAudioContext: vi.fn(() => audio),
    },
  };
});

vi.mock('@tarojs/taro', () => ({ default: mocks.taro }));

describe('mini-program pronunciation playback', () => {
  beforeAll(() => { vi.stubEnv('TARO_APP_CLOUDBASE_ENV', 'cloud-test-environment'); });
  beforeEach(() => { vi.clearAllMocks(); });

  it('writes returned audio to user storage and starts InnerAudioContext', async () => {
    mocks.taro.cloud.callFunction.mockResolvedValueOnce({ result: { ok: true, data: {
      audioBase64: 'UklGRmZha2VhdWRpbw==', format: 'wav', cacheKey: 'kitchen-standard-en-v1',
    } } });
    const { playPronunciation } = await import('../src/services/cloud');
    const playbackError = vi.fn();
    await expect(playPronunciation('kitchen-oven', playbackError)).resolves.toBeUndefined();
    expect(mocks.taro.cloud.callFunction).toHaveBeenCalledWith({
      name: 'speech-synthesize', data: { vocabularyId: 'kitchen-oven' },
    });
    expect(mocks.audio.src).toContain('/user-data/pronunciation-kitchen-oven-');
    expect(mocks.audio.obeyMuteSwitch).toBe(false);
    expect(mocks.audio.play).toHaveBeenCalledOnce();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.callbacks.error?.({ errCode: 10004, errMsg: 'format error' });
    expect(playbackError).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('10004') }));
  });

  it('surfaces a cloud-function audio error instead of reporting success', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.taro.cloud.callFunction.mockResolvedValueOnce({ result: {
      ok: false, error: 'AUDIO_ASSET_ERROR', message: 'The pronunciation audio could not be loaded.',
    } });
    const { playPronunciation } = await import('../src/services/cloud');
    await expect(playPronunciation('kitchen-oven')).rejects.toThrow('发音暂时无法播放');
  });

  it('reuses a previously cached pronunciation without another cloud invocation', async () => {
    mocks.fileSystem.access.mockImplementationOnce((options: { success(): void }) => options.success());
    const { playPronunciation } = await import('../src/services/cloud');
    await expect(playPronunciation('kitchen-oven')).resolves.toBeUndefined();
    expect(mocks.taro.cloud.callFunction).not.toHaveBeenCalled();
    expect(mocks.fileSystem.writeFile).not.toHaveBeenCalled();
  });
});
