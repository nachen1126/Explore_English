import type { PropsWithChildren } from 'react';
import { LearningProvider } from './state/learning';
import { initializeCloud } from './services/cloud';
import './app.scss';

initializeCloud();

export default function App({ children }: PropsWithChildren) {
  return <LearningProvider>{children}</LearningProvider>;
}
