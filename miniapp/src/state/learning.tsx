import Taro, { useDidShow } from '@tarojs/taro';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import {
  createChallenge, discoverVocabulary, mergeLearningSnapshots,
  recordChallengeAnswer, revealChallengeAnswer, saveAttempt, weakVocabularyIds,
  type AnswerRecord, type ChallengeAttempt, type LearningSnapshot,
} from '@shared';
import { miniappSceneById, miniappScenes } from '../data/catalog';
import {
  pullCloudSnapshot, syncCloudSnapshot, updateCloudProfile, wechatLogin, type MiniappUser,
} from '../services/cloud';
import {
  AUTH_PREFERENCE_KEY, clearPrivateStorage, GUEST_MERGE_KEY_PREFIX, GUEST_STORAGE_KEY, PRIVATE_STORAGE_KEY,
  readSnapshot, taroStorage, writeSnapshot,
} from '../services/storage';

type SyncState = 'local' | 'syncing' | 'synced' | 'error';
interface LearningContextValue {
  snapshot: LearningSnapshot;
  user: MiniappUser | null;
  guest: boolean;
  ready: boolean;
  syncState: SyncState;
  message: string;
  continueAsGuest(): void;
  login(): Promise<void>;
  logout(): void;
  updateProfile(nickname: string | null, avatar: string | null): Promise<void>;
  discover(sceneId: string, vocabularyId: string): void;
  restartScene(sceneId: string): void;
  createAttempt(sceneId: string, kind?: ChallengeAttempt['kind'], vocabularyIds?: string[]): ChallengeAttempt;
  answer(attemptId: string, questionId: string, record: AnswerRecord): ChallengeAttempt | null;
  reveal(attemptId: string, questionId: string): ChallengeAttempt | null;
  retrySync(): Promise<void>;
}

const LearningContext = createContext<LearningContextValue | null>(null);
const hasLearningData = (snapshot: LearningSnapshot) => Object.keys(snapshot.progress).length > 0 || Object.keys(snapshot.attempts).length > 0;
const uniqueAttemptId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;

export function LearningProvider({ children }: PropsWithChildren) {
  const [snapshot, setSnapshot] = useState<LearningSnapshot>(() => readSnapshot(GUEST_STORAGE_KEY));
  const snapshotRef = useRef(snapshot);
  const [user, setUser] = useState<MiniappUser | null>(null);
  const [guest, setGuest] = useState(false);
  const [ready, setReady] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>('local');
  const [message, setMessage] = useState('');
  const sessionVersion = useRef(0);

  const acceptCloudSnapshot = useCallback((next: LearningSnapshot, version: number) => {
    if (sessionVersion.current !== version) return false;
    snapshotRef.current = next; setSnapshot(next);
    const saved = writeSnapshot(PRIVATE_STORAGE_KEY, next);
    if (!saved) {
      console.error('[Explore English][Storage] authenticated progress could not be cached locally.');
      setMessage('云端进度已读取，但本机缓存保存失败。');
    } else setMessage('');
    setSyncState('synced');
    return true;
  }, []);

  const persist = useCallback((next: LearningSnapshot, currentUser = user) => {
    snapshotRef.current = next;
    setSnapshot(next);
    const saved = writeSnapshot(currentUser ? PRIVATE_STORAGE_KEY : GUEST_STORAGE_KEY, next);
    if (!saved) setMessage('本地进度保存失败，请检查小程序存储空间。');
    if (currentUser) {
      const version = sessionVersion.current;
      setSyncState('syncing');
      void syncCloudSnapshot(next).then(canonical => {
        acceptCloudSnapshot(canonical, version);
      }).catch(error => {
        if (sessionVersion.current !== version) return;
        console.error('[Explore English][Learning] background progress sync failed.', error);
        setSyncState('error'); setMessage('云同步失败，本机进度已保留，网络恢复后可重试。');
      });
    }
  }, [acceptCloudSnapshot, user]);

  const login = useCallback(async () => {
    const version = sessionVersion.current + 1;
    sessionVersion.current = version;
    setMessage(''); setSyncState('syncing');
    try {
      const nextUser = await wechatLogin();
      if (sessionVersion.current !== version) return;
      const cloud = await pullCloudSnapshot();
      if (sessionVersion.current !== version) return;
      const local = readSnapshot(GUEST_STORAGE_KEY);
      let next = cloud;
      const mergeDecisionKey = `${GUEST_MERGE_KEY_PREFIX}${nextUser.id}`;
      if (hasLearningData(local) && taroStorage.get(mergeDecisionKey) !== true) {
        const decision = await Taro.showModal({
          title: '合并本机学习进度？',
          content: '合并会取本机和云端的已发现单词并集，不会用空记录覆盖云端。',
          confirmText: '合并', cancelText: '仅用云端',
        });
        if (sessionVersion.current !== version) return;
        if (decision.confirm) next = mergeLearningSnapshots(local, cloud, miniappScenes);
        taroStorage.set(mergeDecisionKey, true);
      }
      setUser(nextUser); setGuest(false); taroStorage.set(AUTH_PREFERENCE_KEY, 'wechat');
      snapshotRef.current = next; setSnapshot(next); writeSnapshot(PRIVATE_STORAGE_KEY, next);
      const canonical = await syncCloudSnapshot(next);
      acceptCloudSnapshot(canonical, version);
    } catch (error) {
      if (sessionVersion.current !== version) return;
      console.error('[Explore English][Learning] login or state restoration failed.', error);
      setSyncState('error'); setMessage(error instanceof Error ? error.message : '微信登录失败。');
      throw error;
    }
  }, [acceptCloudSnapshot]);

  useEffect(() => {
    setReady(true);
    try {
      const preference = taroStorage.get(AUTH_PREFERENCE_KEY);
      if (preference === 'wechat') void login().catch(() => setGuest(false));
    } catch (error) {
      console.error('[Explore English][Storage] authentication preference could not be restored.', error);
      setGuest(false);
    }
  }, [login]);

  useDidShow(() => {
    if (user && syncState === 'error') {
      const version = sessionVersion.current;
      void syncCloudSnapshot(snapshotRef.current).then(next => { acceptCloudSnapshot(next, version); }).catch(error => {
        console.error('[Explore English][Learning] page-show sync retry failed.', error);
      });
    }
  });

  useEffect(() => {
    const handler = (event: Taro.onNetworkStatusChange.CallbackResult) => {
      if (event.isConnected && user && syncState === 'error') {
        const version = sessionVersion.current;
        void syncCloudSnapshot(snapshotRef.current).then(next => { acceptCloudSnapshot(next, version); }).catch(error => {
          console.error('[Explore English][Learning] network recovery sync failed.', error);
        });
      }
    };
    Taro.onNetworkStatusChange(handler);
    return () => Taro.offNetworkStatusChange(handler);
  }, [acceptCloudSnapshot, syncState, user]);

  const value = useMemo<LearningContextValue>(() => ({
    snapshot, user, guest, ready, syncState, message,
    continueAsGuest() {
      sessionVersion.current += 1;
      taroStorage.remove(AUTH_PREFERENCE_KEY); setUser(null); setGuest(true); setSyncState('local'); setMessage('');
      const local = readSnapshot(GUEST_STORAGE_KEY); snapshotRef.current = local; setSnapshot(local);
    },
    async login() { await login(); },
    logout() {
      sessionVersion.current += 1;
      clearPrivateStorage(); setUser(null); setGuest(true); setSyncState('local'); setMessage('');
      const local = readSnapshot(GUEST_STORAGE_KEY); snapshotRef.current = local; setSnapshot(local);
    },
    async updateProfile(nickname, avatar) {
      try {
        const next = await updateCloudProfile(nickname, avatar); setUser(next); setMessage('资料已保存。');
      } catch (error) {
        console.error('[Explore English][Profile] profile update failed.', error);
        setMessage('资料保存失败，请检查网络后重试。');
        throw error;
      }
    },
    discover(sceneId, vocabularyId) {
      const scene = miniappSceneById[sceneId];
      if (scene) persist(discoverVocabulary(snapshotRef.current, scene, vocabularyId, Date.now()));
    },
    restartScene(sceneId) {
      const next: LearningSnapshot = { ...snapshotRef.current, progress: { ...snapshotRef.current.progress } };
      delete next.progress[sceneId];
      persist(next);
    },
    createAttempt(sceneId, kind = 'full', vocabularyIds) {
      const scene = miniappSceneById[sceneId];
      if (!scene) throw new Error('无法为未知场景创建挑战。');
      const selected = kind === 'weak'
        ? (vocabularyIds ?? weakVocabularyIds(Object.values(snapshotRef.current.attempts)))
        : scene.vocabularyIds;
      const sceneSelection = selected.filter(id => scene.vocabularyIds.includes(id));
      const attempt = createChallenge(scene, uniqueAttemptId(), Date.now(), Math.random, kind, sceneSelection);
      persist(saveAttempt(snapshotRef.current, attempt)); return attempt;
    },
    answer(attemptId, questionId, record) {
      const attempt = snapshotRef.current.attempts[attemptId];
      if (!attempt) return null;
      const nextAttempt = recordChallengeAnswer(attempt, questionId, record);
      if (nextAttempt === attempt) return attempt;
      persist(saveAttempt(snapshotRef.current, nextAttempt)); return nextAttempt;
    },
    reveal(attemptId, questionId) {
      const attempt = snapshotRef.current.attempts[attemptId];
      if (!attempt) return null;
      const nextAttempt = revealChallengeAnswer(attempt, questionId, Date.now());
      if (nextAttempt === attempt) return attempt;
      persist(saveAttempt(snapshotRef.current, nextAttempt)); return nextAttempt;
    },
    async retrySync() {
      if (!user) return;
      const version = sessionVersion.current;
      setSyncState('syncing');
      try { const next = await syncCloudSnapshot(snapshotRef.current); acceptCloudSnapshot(next, version); }
      catch (error) { if (sessionVersion.current === version) {
        console.error('[Explore English][Learning] manual sync retry failed.', error);
        setSyncState('error'); setMessage('云同步仍未成功，本机进度保持不变。');
      } }
    },
  }), [acceptCloudSnapshot, guest, login, message, persist, ready, snapshot, syncState, user]);

  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>;
}

export function useLearning() {
  const value = useContext(LearningContext);
  if (!value) throw new Error('useLearning must be used inside LearningProvider');
  return value;
}
