import { createContext, useContext, useEffect, useReducer, useState, type Dispatch, type ReactNode } from 'react';
import { scenes } from './data';
import { learningReducer, loadState, saveState, type Action } from './logic';
import type { LearningState } from './types';

const Context = createContext<{ state: LearningState; dispatch: Dispatch<Action> } | null>(null);
export function LearningProvider({ children }: { children: ReactNode }) {
  const [loaded] = useState(() => loadState(scenes));
  const [state, dispatch] = useReducer(learningReducer, loaded.state);
  const [saveFailed, setSaveFailed] = useState(false);
  useEffect(() => {
    if (loaded.writable) setSaveFailed(!saveState(state));
  }, [state, loaded.writable]);
  return <Context.Provider value={{ state, dispatch }}>
    {(loaded.notice || saveFailed) && <div className="storage-notice" role="status">
      {saveFailed ? 'Your browser cannot save progress right now. Keep this tab open to continue learning.' : loaded.notice}
    </div>}
    {children}
  </Context.Provider>;
}
export function useLearning() {
  const value = useContext(Context);
  if (!value) throw new Error('LearningProvider is required.');
  return value;
}
