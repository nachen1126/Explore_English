import { Route, Routes } from 'react-router-dom';
import { LearningProvider } from './store';
import { ErrorBoundary, MissingPage } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { CategoryPage } from './pages/CategoryPage';
import { ExplorePage } from './pages/ExplorePage';
import { ChallengePage } from './pages/ChallengePage';
import { ResultPage } from './pages/ResultPage';
import { ReviewPage } from './pages/ReviewPage';
import { AccountPage } from './pages/AccountPage';
import { AdminPage } from './pages/AdminPage';
import { AuthProvider } from './auth';

export function App() {
  return <ErrorBoundary><AuthProvider><LearningProvider><Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/category/:categoryId" element={<CategoryPage />} />
    <Route path="/scene/:sceneId" element={<ExplorePage />} />
    <Route path="/challenge/:sceneId" element={<ChallengePage />} />
    <Route path="/challenge/:sceneId/:attemptId" element={<ChallengePage />} />
    <Route path="/result/:sceneId" element={<ResultPage />} />
    <Route path="/result/:sceneId/:attemptId" element={<ResultPage />} />
    <Route path="/review/:sceneId" element={<ReviewPage />} />
    <Route path="/account" element={<AccountPage />} />
    <Route path="/admin" element={<AdminPage />} />
    <Route path="*" element={<MissingPage />} />
  </Routes></LearningProvider></AuthProvider></ErrorBoundary>;
}
