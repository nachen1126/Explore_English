import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { createAttempt, emptyState, learningReducer } from '../logic';
import { mergeLearningStates } from '../progress-sync';
import { publishedScenes } from '../data';

describe('account integration without deployed public configuration', () => {
  it('keeps accounts explicitly disabled instead of presenting a local fake login', () => {
    render(<MemoryRouter initialEntries={['/account']}><App /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Account service is not connected yet.' })).toBeVisible();
    expect(screen.getByText('No placeholder users or localStorage login is being used.')).toBeVisible();
    expect(screen.queryByRole('textbox', { name: 'Email' })).not.toBeInTheDocument();
  });
  it('does not render administrator statistics before the protected service is configured', () => {
    render(<MemoryRouter initialEntries={['/admin']}><App /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Administrator service is not configured.' })).toBeVisible();
    expect(screen.queryByText('Registered users')).not.toBeInTheDocument();
  });
});

describe('account progress merge', () => {
  it('unions discoveries and preserves the newest colliding challenge', () => {
    const scene = publishedScenes[0];
    const older = createAttempt(scene, [], 'full', () => .8);
    older.id = 'shared'; older.questions = older.questions.map((question, index) => ({ ...question, id: `shared-${index}` }));
    older.createdAt = 10;
    const newer = structuredClone(older);
    newer.questions[0].answers.push({ answer: 'newer', correct: false, source: 'typing', at: 40 });
    const account = { ...emptyState(), scenes: { [scene.id]: { explored: [scene.vocabularyIds[0]], lastVisited: 30 } }, attempts: { shared: older } };
    const device = { ...emptyState(), scenes: { [scene.id]: { explored: [scene.vocabularyIds[1]], lastVisited: 20 } }, attempts: { shared: newer } };
    const merged = mergeLearningStates(account, device);
    expect(merged.scenes[scene.id]).toEqual({ explored: [scene.vocabularyIds[0], scene.vocabularyIds[1]], lastVisited: 30 });
    expect(merged.attempts.shared.questions[0].answers).toHaveLength(1);
    expect(learningReducer(merged, { type: 'replace', state: account })).toBe(account);
  });
});
