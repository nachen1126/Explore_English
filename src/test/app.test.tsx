import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { publishedScenes, scenes, vocabulary } from '../data';
import { createAttempt, emptyState, learningReducer, loadState, saveState, STORAGE_KEY, summarize } from '../logic';

const scene = publishedScenes.find(item => item.id === 'kitchen-1')!;
function mount(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
}
function loadPicture() {
  const image = screen.getByRole('img', { name: /an illustrated place/ });
  fireEvent.load(image);
}
function finishAttempt() {
  const attempt = createAttempt(scene, [], 'full', () => .9);
  let state = learningReducer(emptyState(), { type: 'start', attempt });
  attempt.questions.forEach((question, index) => {
    if (index === 0) state = learningReducer(state, { type: 'answer', attemptId: attempt.id, questionId: question.id,
      record: { answer: 'wrong', correct: false, at: 1, source: 'typing' } });
    state = learningReducer(state, { type: 'answer', attemptId: attempt.id, questionId: question.id,
      record: { answer: vocabulary[question.vocabularyId].word, correct: true, at: index + 2, source: 'typing' } });
  });
  saveState(state);
  return state.attempts[attempt.id];
}
describe('exploration interaction', () => {
  it('1–3. repeated discoveries replay and reopen; home, re-entry and remount keep progress', async () => {
    const user = userEvent.setup();
    let page = mount('/scene/kitchen-1');
    loadPicture();
    await user.click(screen.getByRole('button', { name: 'Explore door' }));
    expect(screen.getByRole('region', { name: 'Word card: door' })).toBeVisible();
    expect(screen.getByRole('progressbar', { name: 'Exploration progress' })).toHaveAttribute('value', '1');
    await user.click(screen.getByRole('button', { name: 'Close word card' }));
    await user.click(screen.getByRole('button', { name: 'Review door' }));
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('region', { name: 'Word card: door' })).toBeVisible();
    await user.click(screen.getByRole('link', { name: 'Explore English home' }));
    await user.click(screen.getByRole('link', { name: '饮食篇 · Food & Dining' }));
    await user.click(screen.getByRole('link', { name: 'Kitchen · Continue' }));
    expect(screen.getByRole('progressbar', { name: 'Exploration progress' })).toHaveAttribute('value', '1');
    page.unmount();
    page = mount('/scene/kitchen-1');
    loadPicture();
    expect(screen.getByRole('button', { name: 'Review door' })).toBeEnabled();
    expect(screen.getByRole('progressbar', { name: 'Exploration progress' })).toHaveAttribute('value', '1');
    page.unmount();
  });
  it('only a confirmed restart resets discovery', async () => {
    const user = userEvent.setup();
    mount('/scene/kitchen-1'); loadPicture();
    await user.click(screen.getByRole('button', { name: 'Explore door' }));
    await user.click(screen.getByRole('button', { name: 'Start over' }));
    expect(screen.getByRole('alertdialog')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Keep my progress' }));
    expect(screen.getByRole('progressbar', { name: 'Exploration progress' })).toHaveAttribute('value', '1');
    await user.click(screen.getByRole('button', { name: 'Start over' }));
    await user.click(screen.getByRole('button', { name: 'Restart scene' }));
    expect(screen.getByRole('progressbar', { name: 'Exploration progress' })).toHaveAttribute('value', '0');
  });
  it('shows the full completion area and challenge return keeps all discoveries', async () => {
    const user = userEvent.setup();
    mount('/scene/kitchen-1'); loadPicture();
    for (const id of scene.vocabularyIds) await user.click(screen.getByRole('button', { name: `Explore ${vocabulary[id].word}` }));
    expect(screen.getByRole('heading', { name: 'You found them all!' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Review Words' })).toBeVisible();
    expect(screen.getByRole('link', { name: '返回本分类 · Category' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: /Start Challenge/ }));
    expect(screen.getByRole('heading', { name: /^Find the/ })).toBeVisible();
    await user.click(screen.getByRole('link', { name: '← Back to scene' }));
    expect(screen.getByRole('progressbar', { name: 'Exploration progress' })).toHaveAttribute('value', '10');
  });
  it('handles image errors with an accessible retry action', async () => {
    const user = userEvent.setup();
    mount('/scene/kitchen-1');
    fireEvent.error(screen.getByRole('img', { name: /an illustrated place/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('The picture could not load');
    await user.click(screen.getByRole('button', { name: 'Try loading again' }));
    loadPicture();
    expect(screen.queryByText('The picture could not load.')).not.toBeInTheDocument();
  });
});
describe('challenge journey', () => {
  it('tests all 10 words through the UI, clears typed input on each question and retains first-attempt scoring', async () => {
    const user = userEvent.setup();
    const attempt = createAttempt(scene, [], 'full', () => .9);
    saveState(learningReducer(emptyState(), { type: 'start', attempt }));
    mount(`/challenge/${scene.id}/${attempt.id}`);
    for (let index = 0; index < attempt.questions.length; index++) {
      const question = attempt.questions[index];
      loadPicture();
      if (question.mode === 'find') {
        const targetIndex = scene.hotspots.findIndex(hotspot => hotspot.vocabularyId === question.vocabularyId);
        if (index === 0) {
          await user.click(screen.getByRole('button', { name: `Select object ${(targetIndex + 1) % 10 + 1}` }));
          expect(screen.getByText('Not quite. Try again.')).toBeVisible();
        }
        await user.click(screen.getByRole('button', { name: `Select object ${targetIndex + 1}` }));
      } else {
        const input = screen.getByRole('textbox', { name: 'Type the English word' });
        expect(input).toHaveValue('');
        await user.type(input, vocabulary[question.vocabularyId].word);
        await user.click(screen.getByRole('button', { name: 'Check answer' }));
      }
      expect(screen.getByText('Correct.')).toBeVisible();
      if (question.mode === 'find') await waitFor(() => expect(screen.getByText(`${index + 2} / 10`)).toBeVisible());
      else await user.click(screen.getByRole('button', { name: index === 9 ? 'See results →' : 'Next word →' }));
    }
    expect(screen.getByText('90%')).toBeVisible();
    expect(summarize(loadState(scenes).state.attempts[attempt.id]).score).toBe(9);
    expect(loadState(scenes).state.attempts[attempt.id].questions.map(question => question.vocabularyId)).toEqual(attempt.questions.map(question => question.vocabularyId));
  });
  it('resumes an unfinished challenge after remount with the same question sequence', async () => {
    const user = userEvent.setup();
    const attempt = createAttempt(scene);
    saveState(learningReducer(emptyState(), { type: 'start', attempt }));
    const page = mount(`/challenge/${scene.id}/${attempt.id}`);
    loadPicture();
    const position = scene.hotspots.findIndex(hotspot => hotspot.vocabularyId === attempt.questions[0].vocabularyId);
    await user.click(screen.getByRole('button', { name: `Select object ${position + 1}` }));
    page.unmount();
    mount(`/challenge/${scene.id}/${attempt.id}`);
    expect(screen.getByRole('heading', { name: `Find the ${vocabulary[attempt.questions[1].vocabularyId].word}.` })).toBeVisible();
    expect(loadState(scenes).state.attempts[attempt.id].questions.map(question => question.id)).toEqual(attempt.questions.map(question => question.id));
  });
});
describe('results and navigation', () => {
  it('a bookmarked review page requires exploration before starting a new challenge', () => {
    mount('/review/kitchen-1');
    expect(screen.queryByRole('button', { name: /Start Challenge/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue Exploring' })).toHaveAttribute('href', '/scene/kitchen-1');
  });
  it('7–8. result refresh preserves the exact score, remembered count and complete weak list', () => {
    const attempt = finishAttempt();
    const page = mount(`/result/${scene.id}/${attempt.id}`);
    expect(screen.getByText('90%')).toBeVisible();
    expect(screen.getByText('Remembered').parentElement).toHaveTextContent('9');
    expect(screen.getByText('Needs practice').parentElement).toHaveTextContent('1');
    expect(screen.getByRole('button', { name: `Play pronunciation of ${vocabulary[attempt.questions[0].vocabularyId].word}` })).toBeVisible();
    page.unmount();
    mount(`/result/${scene.id}/${attempt.id}`);
    expect(screen.getByText('90%')).toBeVisible();
  });
  it('10. Continue Exploring explicitly explains that no next scene exists', async () => {
    const user = userEvent.setup();
    const attempt = finishAttempt();
    mount(`/result/${scene.id}/${attempt.id}`);
    await user.click(screen.getByRole('button', { name: 'Continue Exploring →' }));
    expect(screen.getByRole('heading', { name: 'You’ve completed the available Kitchen scenes.' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Choose another topic' })).toHaveAttribute('href', '/');
  });
  it('Practice Weak Words starts an attempt containing only failed words', async () => {
    const user = userEvent.setup();
    const attempt = finishAttempt();
    mount(`/result/${scene.id}/${attempt.id}`);
    await user.click(screen.getByRole('button', { name: 'Practice Weak Words' }));
    const fresh = Object.values(loadState(scenes).state.attempts).find(item => item.kind === 'weak')!;
    expect(fresh.questions.map(question => question.vocabularyId)).toEqual(summarize(attempt).weak);
    expect(screen.getByText('1 / 1')).toBeVisible();
  });
  it('12–13. corrupt saved data and unpublished routes cannot blank the app or publish drafts', () => {
    localStorage.setItem(STORAGE_KEY, '{broken');
    const page = mount('/');
    expect(screen.getByRole('heading', { name: /Choose your world/ })).toBeVisible();
    const main = screen.getByRole('main');
    expect(within(main).getAllByRole('link')).toHaveLength(8);
    expect(within(main).queryByRole('link', { name: /Café|Underwater|Living Room/ })).not.toBeInTheDocument();
    page.unmount();
    mount('/scene/cafe-1');
    expect(screen.getByRole('heading', { name: 'This scene is not available yet.' })).toBeVisible();
  });
  it('shows the invalid-route page', () => {
    mount('/missing/anything');
    expect(screen.getByRole('heading', { name: 'This page is not available.' })).toBeVisible();
  });
  it('skip navigation focuses main content without changing the hash route', async () => {
    const user = userEvent.setup();
    mount('/');
    await user.click(screen.getByRole('link', { name: 'Skip to content' }));
    expect(screen.getByRole('main')).toHaveFocus();
    expect(screen.getByRole('heading', { name: /Choose your world/ })).toBeVisible();
  });
  it('future schema data is left untouched by a mounted app', () => {
    const payload = '{"schemaVersion":999,"scenes":{},"attempts":{}}';
    localStorage.setItem(STORAGE_KEY, payload);
    mount('/');
    expect(localStorage.getItem(STORAGE_KEY)).toBe(payload);
  });
  it('storage failures are communicated while the page remains usable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    mount('/');
    expect(screen.getByRole('status')).toHaveTextContent('cannot save progress');
    expect(screen.getByRole('heading', { name: /Choose your world/ })).toBeVisible();
  });
});
