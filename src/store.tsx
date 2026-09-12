import { createContext, useContext, useEffect, useReducer, useState, type Dispatch, type ReactNode } from 'react';
import { scenes } from './data';
import { learningReducer, loadState, saveState, type Action } from './logic';
import type { LearningState } from './types';

const Context = createContext<{ state: LearningState; dispatch: Dispatch<Action> } | null>(null);
export function LearningProvider({ children }: { children: ReactNode }) {
  const [loaded] = useState(() => loadState(scenes));
  const [state, dispatch] = useReducer(learningReducer, loaded.state);
  const [saveFailed, setSaveFailed] = useState(false);
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  useEffect(() => {
    if (loaded.writable) setSaveFailed(!saveState(state));
  }, [state, loaded.writable]);
  return <Context.Provider value={{ state, dispatch }}>
    {!noticeDismissed && (loaded.notice || saveFailed) && <div className="storage-notice" role="status">
      <span>{saveFailed ? 'Your browser cannot save progress right now. Keep this tab open to continue learning. · 浏览器暂时无法保存进度，请保持此页面开启。' : loaded.notice}</span>
      <button type="button" aria-label="Dismiss saved progress notice" onClick={() => setNoticeDismissed(true)}>Close</button>
    </div>}
    {children}
  </Context.Provider>;
}
export function useLearning() {
  const value = useContext(Context);
  if (!value) throw new Error('LearningProvider is required.');
  return value;
}
