import Taro from '@tarojs/taro';
import { emptyLearningSnapshot, type LearningSnapshot } from '@shared';

export const GUEST_STORAGE_KEY = 'explore-english-miniapp-guest-v1';
export const PRIVATE_STORAGE_KEY = 'explore-english-miniapp-private-v1';
export const AUTH_PREFERENCE_KEY = 'explore-english-miniapp-auth-choice';
export const GUEST_MERGE_KEY_PREFIX = 'explore-english-miniapp-guest-merge-v1:';

export interface StoragePort {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  remove(key: string): void;
}

export const taroStorage: StoragePort = {
  get: key => Taro.getStorageSync(key),
  set: (key, value) => Taro.setStorageSync(key, value),
  remove: key => Taro.removeStorageSync(key),
};

function validSnapshot(value: unknown): value is LearningSnapshot {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<LearningSnapshot>;
  return item.schemaVersion === 1 && !!item.progress && typeof item.progress === 'object'
    && !!item.attempts && typeof item.attempts === 'object';
}

export function readSnapshot(key: string, storage: StoragePort = taroStorage): LearningSnapshot {
  try {
    const value = storage.get(key);
    return validSnapshot(value) ? value : emptyLearningSnapshot();
  } catch {
    return emptyLearningSnapshot();
  }
}

export function writeSnapshot(key: string, snapshot: LearningSnapshot, storage: StoragePort = taroStorage): boolean {
  try { storage.set(key, snapshot); return true; } catch { return false; }
}

export function clearPrivateStorage(storage: StoragePort = taroStorage) {
  storage.remove(PRIVATE_STORAGE_KEY);
  storage.remove(AUTH_PREFERENCE_KEY);
}
