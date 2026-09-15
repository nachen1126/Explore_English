import type { ChallengeAttempt, LearningSnapshot, Scene, SceneProgress } from './types';

export const emptyLearningSnapshot = (): LearningSnapshot => ({ schemaVersion: 1, progress: {}, attempts: {} });

export function discoverVocabulary(snapshot: LearningSnapshot, scene: Scene, vocabularyId: string, now: number): LearningSnapshot {
  if (!scene.vocabularyIds.includes(vocabularyId)) return snapshot;
  const current = snapshot.progress[scene.id];
  const discovered = new Set(current?.discoveredVocabularyIds ?? []);
  discovered.add(vocabularyId);
  const progress: SceneProgress = {
    sceneId: scene.id,
    discoveredVocabularyIds: [...discovered],
    completed: discovered.size === scene.vocabularyIds.length,
    updatedAt: now,
    schemaVersion: 1,
  };
  return { ...snapshot, progress: { ...snapshot.progress, [scene.id]: progress } };
}

export function saveAttempt(snapshot: LearningSnapshot, attempt: ChallengeAttempt): LearningSnapshot {
  return { ...snapshot, attempts: { ...snapshot.attempts, [attempt.attemptId]: attempt } };
}

export function mergeLearningSnapshots(local: LearningSnapshot, cloud: LearningSnapshot, scenes: Scene[]): LearningSnapshot {
  const merged = emptyLearningSnapshot();
  for (const scene of scenes) {
    const localProgress = local.progress[scene.id];
    const cloudProgress = cloud.progress[scene.id];
    if (!localProgress && !cloudProgress) continue;
    const valid = new Set(scene.vocabularyIds);
    const discovered = [...new Set([
      ...(cloudProgress?.discoveredVocabularyIds ?? []),
      ...(localProgress?.discoveredVocabularyIds ?? []),
    ])].filter(id => valid.has(id));
    merged.progress[scene.id] = {
      sceneId: scene.id, discoveredVocabularyIds: discovered,
      completed: discovered.length === scene.vocabularyIds.length,
      updatedAt: Math.max(localProgress?.updatedAt ?? 0, cloudProgress?.updatedAt ?? 0), schemaVersion: 1,
    };
  }
  merged.attempts = { ...cloud.attempts };
  for (const [attemptId, localAttempt] of Object.entries(local.attempts)) {
    const cloudAttempt = merged.attempts[attemptId];
    if (!cloudAttempt) { merged.attempts[attemptId] = localAttempt; continue; }
    const localAnswers = localAttempt.questions.reduce((sum, question) => sum + question.answers.length, 0);
    const cloudAnswers = cloudAttempt.questions.reduce((sum, question) => sum + question.answers.length, 0);
    if ((localAttempt.completedAt !== null && cloudAttempt.completedAt === null) || localAnswers > cloudAnswers) {
      merged.attempts[attemptId] = localAttempt;
    }
  }
  return merged;
}
