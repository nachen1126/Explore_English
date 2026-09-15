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
const environmentId = process.env.TARO_APP_CLOUDBASE_ENV?.trim() ?? '';

export function isCloudConfigured() { return environmentId.length > 0; }

export function initializeCloud() {
  if (isCloudConfigured()) Taro.cloud.init({ env: environmentId, traceUser: true });
}

async function call<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  if (!isCloudConfigured()) throw new Error('CloudBase is not configured. You can continue as a guest.');
  const result = await Taro.cloud.callFunction({ name: 'user-service', data: { action, ...payload } });
  const body = result.result as ServiceResult<T>;
  if (!body?.ok || body.data === undefined) throw new Error(body?.message || body?.error || 'CloudBase request failed.');
  return body.data;
}

export async function wechatLogin(): Promise<MiniappUser> {
  const session = await Taro.login({ timeout: 10000 });
  if (!session.code) throw new Error('WeChat login did not return a valid code.');
  // Taro.cloud attaches the verified WeChat identity. The code is deliberately
  // not persisted and OpenID is read only inside the cloud function.
  return call<MiniappUser>('login', { loginCodeReceived: true });
}

export const pullCloudSnapshot = () => call<LearningSnapshot>('pull');
export const syncCloudSnapshot = (snapshot: LearningSnapshot) => call<LearningSnapshot>('sync', { snapshot });
export const updateCloudProfile = (nickname: string | null, avatar: string | null) =>
  call<MiniappUser>('profile', { nickname, avatar });

export async function uploadProfileAvatar(filePath: string, userId: string) {
  if (!isCloudConfigured()) throw new Error('CloudBase is not configured.');
  const extension = filePath.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const uploaded = await Taro.cloud.uploadFile({ cloudPath: `avatars/${userId}/${Date.now()}.${extension}`, filePath });
  return uploaded.fileID;
}

export async function recognizeRecording(filePath: string, recognitionId: string) {
  if (!isCloudConfigured()) throw new Error('Speech recognition requires a configured CloudBase environment.');
  const uploaded = await Taro.cloud.uploadFile({ cloudPath: `speech/${recognitionId}.mp3`, filePath });
  try {
    const response = await Taro.cloud.callFunction({
      name: 'speech-recognize', data: { fileID: uploaded.fileID, recognitionId, format: 'mp3' },
    });
    const body = response.result as ServiceResult<{ text: string; recognitionId: string; noSpeech?: boolean }>;
    if (!body?.ok || body.data === undefined) throw new Error(body?.message || body?.error || 'Speech recognition failed.');
    return body.data;
  } finally {
    void Taro.cloud.deleteFile({ fileList: [uploaded.fileID] }).catch(() => undefined);
  }
}

export async function playPronunciation(vocabularyId: string) {
  if (!isCloudConfigured()) throw new Error('Pronunciation audio requires a configured CloudBase environment.');
  const response = await Taro.cloud.callFunction({ name: 'speech-synthesize', data: { vocabularyId } });
  const body = response.result as ServiceResult<{ fileID: string }>;
  if (!body?.ok || !body.data?.fileID) throw new Error(body?.message || body?.error || 'Pronunciation audio is unavailable.');
  const temporary = await Taro.cloud.getTempFileURL({ fileList: [body.data.fileID] });
  const url = temporary.fileList[0]?.tempFileURL;
  if (!url) throw new Error('Pronunciation audio could not be loaded.');
  const audio = Taro.createInnerAudioContext();
  audio.autoplay = true; audio.src = url;
  audio.onEnded(() => audio.destroy()); audio.onError(() => audio.destroy());
}
