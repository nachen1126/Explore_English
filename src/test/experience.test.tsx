import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { getScene, publishedScenes, scenes, vocabulary } from '../data';
import { createAttempt, emptyState, learningReducer, loadState, recommendNext, saveState, summarize } from '../logic';
import { resultFeedback } from '../result-feedback';

const kitchen = getScene('kitchen-2')!;
function mount(path: string) { return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>); }
function desktop(enabled: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(hover: hover) and (pointer: fine)' && enabled,
    addEventListener: vi.fn(), removeEventListener: vi.fn() }));
}
function typingAttempt() {
  const attempt = createAttempt(kitchen, kitchen.vocabularyIds.slice(0, 2), 'weak', () => .99);
  attempt.questions.forEach(q => { q.mode = 'produce'; });
  saveState({ ...emptyState(), attempts: { [attempt.id]: attempt } });
  return attempt;
}
const input = () => screen.getByRole('textbox', { name: 'Type the English word' });

describe('continuous keyboard answers and picture-only prompts', () => {
  it('focuses the initial desktop input, clears and refocuses the next, and completes with keyboard only', async () => {
    desktop(true);
    const user = userEvent.setup();
    const attempt = typingAttempt();
    mount(`/challenge/kitchen-2/${attempt.id}`);
    expect(input()).toHaveFocus();
    expect(screen.queryByText('冰箱', { exact: true })).not.toBeInTheDocument();
    await user.keyboard('fridge{Enter}');
    expect(screen.getByText('1 / 2')).toBeVisible();
    expect(screen.getByText('Correct.')).toBeVisible();
    await user.keyboard('{Enter}');
    expect(input()).toHaveFocus();
    expect(input()).toHaveValue('');
    expect(screen.queryByText('水槽', { exact: true })).not.toBeInTheDocument();
    await user.keyboard('sink{Enter}');
    expect(screen.getByText('2 / 2')).toBeVisible();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('heading', { name: 'Great practice!' })).toBeVisible();
    expect(screen.getByText('You got both review words right.')).toBeVisible();
    expect(loadState(scenes).state.attempts[attempt.id].questions.map(q => q.answers.length)).toEqual([1, 1]);
  });
  it('never forces focus on a touch device when entering or changing a question', async () => {
    desktop(false);
    const user = userEvent.setup();
    const attempt = typingAttempt();
    mount(`/challenge/kitchen-2/${attempt.id}`);
    expect(input()).not.toHaveFocus();
    await user.type(input(), 'fridge{Enter}{Enter}');
    expect(screen.getByText('2 / 2')).toBeVisible();
    expect(input()).not.toHaveFocus();
    expect(input()).toHaveValue('');
  });
  it('keeps the Chinese meaning absent until the third valid error, then retains it on retry and clears it on Next', async () => {
    desktop(true);
    const user = userEvent.setup();
    const attempt = typingAttempt();
    mount(`/challenge/kitchen-2/${attempt.id}`);
    await user.keyboard('{Enter}');
    expect(loadState(scenes).state.attempts[attempt.id].questions[0].answers).toHaveLength(0);
    await user.keyboard('wrong{Enter}{Enter}');
    expect(screen.queryByText('冰箱', { exact: true })).not.toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('status', { name: 'Word hint' })).toHaveTextContent('冰箱');
    await user.click(screen.getByRole('button', { name: '查看答案 · Show answer' }));
    expect(input()).toHaveFocus();
    expect(input()).toHaveValue('');
    expect(input()).not.toHaveAttribute('readonly');
    expect(screen.queryByRole('button', { name: 'Next word →' })).not.toBeInTheDocument();
    await user.keyboard('fridge{Enter}');
    expect(screen.getByText('Correct.')).toBeVisible();
    expect(screen.getByRole('status', { name: 'Word hint' })).toBeVisible();
    await user.keyboard('{Enter}');
    expect(screen.queryByRole('status', { name: 'Word hint' })).not.toBeInTheDocument();
    expect(input()).toHaveFocus();
    expect(summarize(loadState(scenes).state.attempts[attempt.id]).score).toBe(0);
  });
});

describe('multiple visible regions of one object', () => {
  it.each(['kitchen-chopping-board', 'kitchen-cupboard'])('all %s regions discover the same word once and can be revisited', async id => {
    const user = userEvent.setup();
    mount('/scene/kitchen-2');
    fireEvent.load(screen.getByRole('img', { name: /an illustrated place/ }));
    const buttons = screen.getAllByRole('button', { name: `Explore ${vocabulary[id].word}` });
    expect(buttons.length).toBeGreaterThan(1);
    for (const button of buttons) await user.click(button);
    expect(screen.getByRole('region', { name: `Word card: ${vocabulary[id].word}` })).toBeVisible();
    expect(loadState(scenes).state.scenes[kitchen.id].explored).toEqual([id]);
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(buttons.length);
  });
  it.each([0, 1, 2, 3, 4])('accepts cupboard position %i during Find It with a single settlement', position => {
    vi.useFakeTimers();
    const attempt = createAttempt(kitchen, ['kitchen-cupboard'], 'weak');
    saveState({ ...emptyState(), attempts: { [attempt.id]: attempt } });
    mount(`/challenge/kitchen-2/${attempt.id}`);
    fireEvent.load(screen.getByRole('img', { name: /an illustrated place/ }));
    const indexes = kitchen.hotspots.map((h, i) => h.vocabularyId === 'kitchen-cupboard' ? i : -1).filter(i => i >= 0);
    const button = screen.getByRole('button', { name: `Select object ${indexes[position] + 1}` });
    fireEvent.click(button); fireEvent.click(button);
    expect(screen.getByText('Correct.')).toBeVisible();
    act(() => vi.advanceTimersByTime(600));
    expect(summarize(loadState(scenes).state.attempts[attempt.id]).score).toBe(1);
    vi.useRealTimers();
  });
});

describe('recommendation hierarchy and separately saved results', () => {
  it('goes to a real next topic scene, then the same category, then other categories', () => {
    const state = emptyState();
    expect(recommendNext(kitchen, scenes, state)?.id).toBe('airport-2');
    const sameCategory = { ...kitchen, id: 'test-food', topicId: 'restaurant', image: 'scenes/test-food.webp' };
    expect(recommendNext(kitchen, [kitchen, sameCategory, getScene('airport-2')!], state)?.id).toBe('test-food');
  });
  it('every published scene recommendation resolves to a real, different image and route', () => {
    publishedScenes.forEach(scene => {
      const next = recommendNext(scene, scenes, emptyState());
      expect(next).toBeDefined(); expect(getScene(next!.id)).toBe(next);
      expect(next!.id).not.toBe(scene.id); expect(next!.image).not.toBe(scene.image);
      expect(next!.vocabularyIds).toHaveLength(10);
    });
  });
  it('retains the original 8/10 full result after a perfect 2-word practice and after reload', async () => {
    const user = userEvent.setup();
    const full = createAttempt(kitchen, [], 'full', () => .99);
    let state = learningReducer(emptyState(), { type: 'start', attempt: full });
    full.questions.forEach((q, index) => {
      if (index < 2) state = learningReducer(state, { type: 'answer', attemptId: full.id, questionId: q.id, record: { answer:'wrong',correct:false,source:'typing',at:index+1 } });
      state = learningReducer(state, { type: 'answer', attemptId: full.id, questionId: q.id, record: { answer:vocabulary[q.vocabularyId].word,correct:true,source:'typing',at:index+2 } });
    });
    const weak = createAttempt(kitchen, summarize(state.attempts[full.id]).weak, 'weak');
    state = learningReducer(state, { type: 'start', attempt: weak });
    weak.questions.forEach(q => { state = learningReducer(state, { type: 'answer', attemptId: weak.id, questionId: q.id, record: {answer:vocabulary[q.vocabularyId].word,correct:true,source:'typing',at:100} }); });
    saveState(state);
    const page = mount(`/result/kitchen-2/${weak.id}`);
    expect(screen.getByText(/Weak word practice result/)).toBeVisible();
    expect(screen.getByRole('heading', {name:'Great practice!'})).toBeVisible();
    expect(screen.getByText(/Full challenge: 8\/10/)).toBeVisible();
    await user.click(screen.getByRole('link', {name:'View full challenge'}));
    expect(screen.getByText('80%')).toBeVisible();
    expect(screen.getByText('Remembered').parentElement).toHaveTextContent('8');
    expect(screen.getByText('Needs practice').parentElement).toHaveTextContent('2');
    page.unmount(); mount('/result/kitchen-2');
    expect(screen.getByText('80%')).toBeVisible();
    expect(Object.keys(loadState(scenes).state.attempts)).toHaveLength(2);
  });
  it.each([1, 2, 7])('uses review-specific wording for %i words', total => {
    expect(resultFeedback(total,total,'weak')?.title).toBe('Great practice!');
    expect(resultFeedback(total-1,total,'weak')?.title).toBe('Keep going!');
  });
  it('shows the most recently visited real scene and no home pagination or development labels', () => {
    saveState({...emptyState(),scenes:{'gym-1':{explored:['gym-chair'],lastVisited:30},'kitchen-2':{explored:['kitchen-fridge'],lastVisited:10}}});
    mount('/');
    expect(screen.getByRole('link',{name:'Continue Kitchen · Cooking →'})).toHaveAttribute('href','/scene/kitchen-2');
    expect(within(screen.getByRole('region',{name:/Ready to explore/})).getAllByRole('img')).toHaveLength(2);
    expect(screen.queryByRole('button',{name:'Next page'})).not.toBeInTheDocument();
    expect(screen.queryByText(/Development artwork/)).not.toBeInTheDocument();
  });
});
