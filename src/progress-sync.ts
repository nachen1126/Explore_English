import type { ChallengeAttempt, LearningState } from './types';

const attemptTime = (attempt: ChallengeAttempt) => Math.max(attempt.createdAt, attempt.completedAt ?? 0,
  ...attempt.questions.flatMap(question => [question.revealedAt ?? 0, ...question.answers.map(answer => answer.at)]));

export function hasLearningProgress(state: LearningState) {
  return Object.values(state.scenes).some(scene => scene.explored.length > 0 || scene.lastVisited > 0)
    || Object.keys(state.attempts).length > 0;
}

/** Union discoveries and retain the newest version of a colliding attempt. */
export function mergeLearningStates(account: LearningState, device: LearningState): LearningState {
  const scenes = { ...account.scenes };
  for (const [sceneId, local] of Object.entries(device.scenes)) {
    const remote = scenes[sceneId];
    scenes[sceneId] = remote ? {
      explored: [...new Set([...remote.explored, ...local.explored])],
      lastVisited: Math.max(remote.lastVisited, local.lastVisited),
    } : local;
  }
  const attempts = { ...account.attempts };
  for (const [attemptId, local] of Object.entries(device.attempts)) {
    const remote = attempts[attemptId];
    if (!remote || attemptTime(local) > attemptTime(remote)) attempts[attemptId] = local;
  }
  return { schemaVersion: 2, scenes, attempts };
}
