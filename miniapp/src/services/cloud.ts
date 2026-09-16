import Taro from '@tarojs/taro';
import type { LearningSnapshot } from '@shared';

export interface MiniappUser {
  id: string;
  nickname: string | null;
  avatar: string | null;
  createdAt: number;
  lastLoginAt: number;
  lastStudyAt: number | null;
}

interface ServiceResult<T> { ok: boolean; data?: T; error?: string; message?: string }
interface PronunciationResult { audioBase64: string; format: 'wav'; cacheKey: string }
const environmentId = process.env.TARO_APP_CLOUDBASE_ENV?.trim() ?? '';
const pronunciationCacheKey = 'all-scenes-standard-en-v2';
let activePronunciation: Taro.InnerAudioContext | null = null;
let pronunciationRequestSequence = 0;

export function isCloudConfigured() { return environmentId.length > 0; }

function cloudError(operation: string, error: unknown): Error {
  console.error(`[Explore English][CloudBase] ${operation} failed. Guest mode remains available.`, error);
  if (/speech recognition/i.test(operation)) return new Error('语音识别服务暂时不可用。');
  if (/pronunciation/i.test(operation)) return new Error('发音暂时无法播放。');
  if (/login/i.test(operation)) return new Error('微信登录失败，请检查网络后重试，或使用游客模式。');
  if (/avatar/i.test(operation)) return new Error('头像上传失败，请检查网络后重试。');
  return new Error('云服务请求失败，本机数据仍会保留。');
}

function withTimeout<T>(promise: Promise<T>, operation: string, milliseconds = 12000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('网络请求超时，请稍后重试。')), milliseconds);
    promise.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}

export function initializeCloud(): boolean {
  if (!isCloudConfigured()) {
    console.warn('[Explore English][CloudBase] TARO_APP_CLOUDBASE_ENV is empty. Starting without cloud sync.');
    return false;
  }
  try {
    if (!Taro.cloud?.init) throw new Error('The current WeChat runtime does not expose wx.cloud.');
    Taro.cloud.init({ env: environmentId, traceUser: true });
    console.info(`[Explore English][CloudBase] initialized: ${environmentId}`);
    return true;
  } catch (error) {
    cloudError('initialization', error);
    return false;
  }
}

async function call<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  if (!isCloudConfigured()) throw new Error('云开发环境尚未配置，你仍可以使用游客模式。');
  try {
    const result = await withTimeout(
      Taro.cloud.callFunction({ name: 'user-service', data: { action, ...payload } }),
      `user-service:${action}`,
    );
    const body = result.result as ServiceResult<T>;
    if (!body?.ok || body.data === undefined) throw new Error(body?.message || body?.error || '云服务请求失败。');
    return body.data;
  } catch (error) {
    throw cloudError(`user-service:${action}`, error);
  }
}

export async function wechatLogin(): Promise<MiniappUser> {
  try {
    const session = await Taro.login({ timeout: 10000 });
    if (!session.code) throw new Error('微信登录未返回有效凭证。');
    // Taro.cloud attaches the verified WeChat identity. The code is deliberately
    // not persisted and OpenID is read only inside the cloud function.
    return await call<MiniappUser>('login', { loginCodeReceived: true });
  } catch (error) {
    throw cloudError('WeChat login', error);
  }
}

export const pullCloudSnapshot = () => call<LearningSnapshot>('pull');
export const syncCloudSnapshot = (snapshot: LearningSnapshot) => call<LearningSnapshot>('sync', { snapshot });
export const updateCloudProfile = (nickname: string | null, avatar: string | null) =>
  call<MiniappUser>('profile', { nickname, avatar });

export async function uploadProfileAvatar(filePath: string, userId: string) {
  if (!isCloudConfigured()) throw new Error('云开发环境尚未配置。');
  try {
    const extension = filePath.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const uploaded = await Taro.cloud.uploadFile({ cloudPath: `avatars/${userId}/${Date.now()}.${extension}`, filePath });
    return uploaded.fileID;
  } catch (error) {
    throw cloudError('avatar upload', error);
  }
}

export async function recognizeRecording(filePath: string, recognitionId: string) {
  if (!isCloudConfigured()) throw new Error('语音识别需要先配置云开发环境。');
  let uploaded: Taro.cloud.UploadFileResult | undefined;
  try {
    uploaded = await Taro.cloud.uploadFile({ cloudPath: `speech/${recognitionId}.mp3`, filePath });
    const response = await withTimeout(Taro.cloud.callFunction({
      name: 'speech-recognize', data: { fileID: uploaded.fileID, recognitionId, format: 'mp3' },
    }), 'speech-recognize', 20000);
    const body = response.result as ServiceResult<{ text: string; recognitionId: string; noSpeech?: boolean }>;
    if (!body?.ok || body.data === undefined) throw new Error(body?.message || body?.error || '语音识别失败。');
    return body.data;
  } catch (error) {
    throw cloudError('speech recognition', error);
  } finally {
    if (uploaded?.fileID) void Taro.cloud.deleteFile({ fileList: [uploaded.fileID] }).catch(error => {
      console.error('[Explore English][CloudBase] temporary recording cleanup failed.', error);
    });
  }
}

export async function playPronunciation(
  vocabularyId: string,
  onPlaybackError?: (error: Error) => void,
  onPlaybackEnded?: () => void,
) {
  if (!isCloudConfigured()) throw new Error('播放发音需要先配置云开发环境。');
  // Replays must replace audio immediately, including while an earlier request
  // is still loading, so two words can never overlap.
  stopPronunciation();
  const requestSequence = ++pronunciationRequestSequence;
  try {
    const safeVocabularyId = vocabularyId.replace(/[^a-z0-9-]/gi, '');
    const fileSystem = Taro.getFileSystemManager();
    let filePath = `${Taro.env.USER_DATA_PATH}/pronunciation-${safeVocabularyId}-${pronunciationCacheKey}.wav`;
    const cached = await new Promise<boolean>(resolve => fileSystem.access({
      path: filePath, success: () => resolve(true), fail: () => resolve(false),
    }));
    if (!cached) {
      const response = await withTimeout(
        Taro.cloud.callFunction({ name: 'speech-synthesize', data: { vocabularyId } }),
        'speech-synthesize',
      );
      const body = response.result as ServiceResult<PronunciationResult>;
      if (!body?.ok || !body.data?.audioBase64) {
        throw new Error(body?.message || body?.error || '发音音频暂时不可用。');
      }
      if (body.data.format !== 'wav' || !/^[a-z0-9.-]+$/i.test(body.data.cacheKey)) {
        throw new Error('发音服务返回了不支持的音频格式。');
      }
      filePath = `${Taro.env.USER_DATA_PATH}/pronunciation-${safeVocabularyId}-${body.data.cacheKey}.wav`;
      await new Promise<void>((resolve, reject) => fileSystem.writeFile({
        filePath, data: body.data!.audioBase64, encoding: 'base64',
        success: () => resolve(), fail: result => reject(new Error(result.errMsg || '音频文件无法保存。')),
      }));
    }
    if (requestSequence !== pronunciationRequestSequence) return;
    if (activePronunciation) { activePronunciation.stop(); activePronunciation.destroy(); }
    const audio = Taro.createInnerAudioContext();
    activePronunciation = audio;
    audio.obeyMuteSwitch = false;
    audio.src = filePath;
    await new Promise<void>((resolve, reject) => {
      let started = false;
      audio.onPlay(() => { started = true; resolve(); });
      audio.onEnded(() => {
        audio.destroy();
        if (activePronunciation === audio) activePronunciation = null;
        onPlaybackEnded?.();
      });
      audio.onError(result => {
        const error = new Error(`音频播放失败${result.errCode ? ` (${result.errCode})` : ''}：${result.errMsg || '未知错误'}`);
        console.error('[Explore English][Audio] pronunciation playback failed.', result);
        audio.destroy(); if (activePronunciation === audio) activePronunciation = null;
        onPlaybackError?.(error);
        if (!started) reject(error);
      });
      audio.play();
    });
  } catch (error) {
    throw cloudError('pronunciation', error);
  }
}

export function stopPronunciation() {
  pronunciationRequestSequence += 1;
  if (!activePronunciation) return;
  activePronunciation.stop(); activePronunciation.destroy(); activePronunciation = null;
}
