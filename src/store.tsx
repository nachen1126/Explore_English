import { createContext, useContext, useEffect, useReducer, useRef, useState, type Dispatch, type ReactNode } from 'react';
import { scenes } from './data';
import { emptyState, learningReducer, loadState, saveState, STORAGE_KEY, type Action } from './logic';
import { useAuth } from './auth';
import { hasLearningProgress, mergeLearningStates } from './progress-sync';
import { readRemoteProgress, writeRemoteProgress } from './supabase';
import type { LearningState } from './types';

type SyncStatus = 'device' | 'loading' | 'prompt' | 'synced' | 'saving' | 'error';
const Context = createContext<{ state: LearningState; dispatch: Dispatch<Action>; syncStatus: SyncStatus } | null>(null);
export function LearningProvider({ children }: { children: ReactNode }) {
  const [loaded] = useState(() => loadState(scenes));
  const [state, dispatch] = useReducer(learningReducer, loaded.state);
  const { status: authStatus, user } = useAuth();
  const [saveFailed, setSaveFailed] = useState(false);
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [cloudNotice, setCloudNotice] = useState<string | null>(null);
  const [syncRetry, setSyncRetry] = useState(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(authStatus === 'unconfigured' ? 'device' : 'loading');
  const [mergePrompt, setMergePrompt] = useState<{ userId: string; device: LearningState; account: LearningState } | null>(null);
  const guestState = useRef(loaded.state);
  const activeUser = useRef<string | null>(null);
  const lastSynced = useRef('');

  useEffect(() => {
    if ((authStatus === 'signed-out' || authStatus === 'unconfigured') && !user) {
      activeUser.current = null;
      setMergePrompt(null);
      setSyncStatus('device');
      dispatch({ type: 'replace', state: guestState.current });
      return;
    }
    if (authStatus !== 'signed-in' || !user || activeUser.current === user.id) return;
    const userId = user.id;
    activeUser.current = userId;
    setSyncStatus('loading');
    setCloudNotice(null);
    dispatch({ type: 'replace', state: emptyState() });
    void readRemoteProgress(userId).then(remote => {
      if (activeUser.current !== userId) return;
      const account = remote ? loadState(scenes, {
        getItem: key => key === STORAGE_KEY ? JSON.stringify(remote.state) : null,
        setItem: () => undefined,
      }).state : emptyState();
      lastSynced.current = JSON.stringify(account);
      const marker = `explore-english-merged-user:${userId}`;
      if (hasLearningProgress(guestState.current) && localStorage.getItem(marker) !== 'done') {
        setMergePrompt({ userId, device: guestState.current, account });
        setSyncStatus('prompt');
      } else {
        dispatch({ type: 'replace', state: account });
        setSyncStatus('synced');
      }
    }).catch(() => {
      if (activeUser.current !== userId) return;
      setSyncStatus('error');
      setCloudNotice('Account progress could not be loaded. Your account data has not been replaced. Check your connection and sign in again.');
    });
  }, [authStatus, user, syncRetry]);

  useEffect(() => {
    if (syncStatus === 'device' && !user) {
      guestState.current = state;
      if (loaded.writable) setSaveFailed(!saveState(state));
      return;
    }
    if (!user || activeUser.current !== user.id || !['synced', 'saving'].includes(syncStatus)) return;
    const serialized = JSON.stringify(state);
    if (serialized === lastSynced.current) return;
    const timer = window.setTimeout(() => {
      setSyncStatus('saving');
      void readRemoteProgress(user.id).then(remote => {
        if (activeUser.current !== user.id) return;
        const combined = remote ? mergeLearningStates(remote.state, state) : state;
        if (JSON.stringify(combined) !== serialized) {
          dispatch({ type: 'replace', state: combined });
          return;
        }
        return writeRemoteProgress(user.id, combined).then(() => {
          lastSynced.current = JSON.stringify(combined);
          setSyncStatus('synced');
          setCloudNotice(null);
        });
      }).catch(() => {
        if (activeUser.current === user.id) {
          setSyncStatus('error');
          setCloudNotice('Progress is still on this screen, but it could not be saved to your account. Check your connection before closing the page.');
        }
      });
    }, 750);
    return () => window.clearTimeout(timer);
  }, [state, syncStatus, user, loaded.writable]);

  function resolveMerge(merge: boolean) {
    if (!mergePrompt || activeUser.current !== mergePrompt.userId) return;
    const next = merge ? mergeLearningStates(mergePrompt.account, mergePrompt.device) : mergePrompt.account;
    localStorage.setItem(`explore-english-merged-user:${mergePrompt.userId}`, 'done');
    setMergePrompt(null);
    dispatch({ type: 'replace', state: next });
    setSyncStatus('synced');
  }
  function retryCloudSync() {
    if (!user) return;
    activeUser.current = null;
    setCloudNotice(null);
    setSyncRetry(value => value + 1);
  }
  return <Context.Provider value={{ state, dispatch, syncStatus }}>
    {!noticeDismissed && (loaded.notice || saveFailed) && <div className="storage-notice" role="status">
      <span>{saveFailed ? 'Your browser cannot save progress right now. Keep this tab open to continue learning. · 浏览器暂时无法保存进度，请保持此页面开启。' : loaded.notice}</span>
      <button type="button" aria-label="Dismiss saved progress notice" onClick={() => setNoticeDismissed(true)}>Close</button>
    </div>}
    {cloudNotice && <div className="storage-notice cloud-error" role="alert"><span>{cloudNotice}</span>
      <div className="button-row"><button type="button" onClick={retryCloudSync}>Retry sync</button>
        <button type="button" aria-label="Dismiss cloud progress notice" onClick={() => setCloudNotice(null)}>Close</button></div></div>}
    {mergePrompt && <div className="dialog-scrim"><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="merge-progress-title">
      <h2 id="merge-progress-title">Add this device's progress to your account?</h2>
      <p>Discoveries are combined. If the same challenge exists in both places, the most recently updated copy is kept. Your account progress is never replaced by an older copy.</p>
      <div className="button-row"><button className="button primary" onClick={() => resolveMerge(true)}>Merge progress</button>
        <button className="button secondary" onClick={() => resolveMerge(false)}>Use account progress only</button></div>
    </section></div>}
    {children}
  </Context.Provider>;
}
export function useLearning() {
  const value = useContext(Context);
  if (!value) throw new Error('LearningProvider is required.');
  return value;
}
