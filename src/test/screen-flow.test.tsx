import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { categories, publishedScenes, scenes, vocabulary } from '../data';
import { createAttempt, emptyState, loadState, saveState, summarize } from '../logic';
import { resultFeedback } from '../result-feedback';

const kitchen = publishedScenes.find(scene => scene.id === 'kitchen-1')!;
function mount(path = '/') { return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>); }
function seed(count = 3, firstCorrect?: number) {
  const attempt = createAttempt(kitchen, kitchen.vocabularyIds.slice(0, count), count === 10 ? 'full' : 'weak', () => .99);
  attempt.questions.forEach((question, index) => {
    question.mode = 'produce';
    if (firstCorrect !== undefined) {
      if (index >= firstCorrect) question.answers.push({ answer: 'wrong', correct: false, source: 'typing', at: index * 2 + 1 });
      question.answers.push({ answer: vocabulary[question.vocabularyId].word, correct: true, source: 'typing', at: index * 2 + 2 });
    }
  });
  if (firstCorrect !== undefined) attempt.completedAt = 100;
  saveState({ ...emptyState(), attempts: { [attempt.id]: attempt } });
  return attempt;
}
const input = () => screen.getByRole('textbox', { name: 'Type the English word' });

describe('Produce Enter state transitions', () => {
  it('submits once, retains input focus, and needs a second Enter to advance', async () => {
    const user = userEvent.setup();
    const attempt = seed();
    mount(`/challenge/kitchen-1/${attempt.id}`);
    await user.type(input(), 'door{Enter}');
    expect(screen.getByText('1 / 3')).toBeVisible();
    expect(screen.getByText('Correct.')).toBeVisible();
    expect(input()).toHaveFocus();
    expect(input()).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'Next word →' })).toBeEnabled();
    expect(screen.getByText('Press Enter')).toBeVisible();
    await user.keyboard('{Enter}');
    expect(screen.getByText('2 / 3')).toBeVisible();
    expect(input()).toHaveValue('');
    const stored = loadState(scenes).state.attempts[attempt.id];
    expect(stored.questions[0].answers).toHaveLength(1);
    expect(stored.questions[1].answers).toHaveLength(0);
  });
  it('wrong answers keep submitting; composition and held Enter cannot advance a solved question', async () => {
    const user = userEvent.setup();
    const attempt = seed();
    mount(`/challenge/kitchen-1/${attempt.id}`);
    await user.type(input(), 'wrong{Enter}{Enter}');
    expect(loadState(scenes).state.attempts[attempt.id].questions[0].answers).toHaveLength(2);
    expect(screen.getByText('1 / 3')).toBeVisible();
    await user.clear(input()); await user.type(input(), 'door');
    await user.keyboard('{Enter>4}');
    expect(screen.getByText('Correct.')).toBeVisible();
    expect(screen.getByText('1 / 3')).toBeVisible();
    await user.keyboard('{/Enter}');
    fireEvent.compositionStart(input());
    await user.keyboard('{Enter}');
    expect(screen.getByText('1 / 3')).toBeVisible();
    fireEvent.compositionEnd(input());
    fireEvent.keyDown(input(), { key: 'Enter', isComposing: true });
    fireEvent.keyDown(input(), { key: 'Enter', keyCode: 229 });
    expect(screen.getByText('1 / 3')).toBeVisible();
    await user.keyboard('{Enter>4}');
    expect(screen.getByText('2 / 3')).toBeVisible();
    await user.keyboard('{/Enter}');
    expect(summarize(loadState(scenes).state.attempts[attempt.id]).score).toBe(0);
  });
  it('suppresses a focused Next button’s native activation and duplicate keydown across question changes', async () => {
    const user = userEvent.setup();
    const attempt = seed();
    mount(`/challenge/kitchen-1/${attempt.id}`);
    await user.type(input(), 'door{Enter}');
    screen.getByRole('button', { name: 'Next word →' }).focus();
    await user.keyboard('{Enter}');
    expect(screen.getByText('2 / 3')).toBeVisible();
    await user.type(input(), 'window{Enter}');
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(screen.getByText('3 / 3')).toBeVisible();
    fireEvent.keyUp(window, { key: 'Enter' });
  });
  it('Enter after Show answer finishes the last question without a mastery point', async () => {
    const user = userEvent.setup();
    const attempt = seed(1);
    mount(`/challenge/kitchen-1/${attempt.id}`);
    await user.type(input(), 'wrong{Enter}{Enter}{Enter}');
    await user.click(screen.getByRole('button', { name: '查看答案 · Show answer' }));
    input().focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('heading', { name: 'Keep going!' })).toBeVisible();
    expect(screen.getByText('0%')).toBeVisible();
    expect(summarize(loadState(scenes).state.attempts[attempt.id])).toMatchObject({ score: 0, weak: ['kitchen-door'] });
  });
  it('cleans listeners on departure and handles the final correct answer on a fresh mount', async () => {
    const user = userEvent.setup();
    const attempt = seed(1);
    const first = mount(`/challenge/kitchen-1/${attempt.id}`);
    first.unmount();
    mount(`/challenge/kitchen-1/${attempt.id}`);
    await user.type(input(), 'door{Enter}');
    expect(screen.getByRole('button', { name: 'See results →' })).toBeVisible();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('heading', { name: 'Great practice!' })).toBeVisible();
    expect(screen.getByText('100%')).toBeVisible();
  });
});

describe('exact first-answer feedback thresholds', () => {
  it.each([
    [0, 10, 'Let’s practise together.'], [399, 1000, 'Let’s practise together.'],
    [2, 5, 'Getting more familiar!'], [599, 1000, 'Getting more familiar!'],
    [3, 5, 'A good start!'], [799, 1000, 'A good start!'],
    [4, 5, 'You know these words well!'], [999, 1000, 'You know these words well!'],
    [6, 7, 'You know these words well!'], [1, 1, 'Perfect recall!'], [7, 7, 'Perfect recall!'],
  ])('%i/%i uses the raw ratio', (score, total, title) => expect(resultFeedback(score, total)?.title).toBe(title));
  it.each([[0, 0], [1, 0], [-1, 10], [11, 10], [NaN, 5], [1, 2.5]])('rejects invalid counts %s/%s', (score, total) => {
    expect(resultFeedback(score, total)).toBeNull();
  });
  it.each([0, 2, 3, 4, 5])('keeps title, description, first score and weak count consistent after reload: %i/5', firstCorrect => {
    const attempt = seed(10, firstCorrect * 2);
    const expected = resultFeedback(firstCorrect, 5)!;
    const page = mount(`/result/kitchen-1/${attempt.id}`);
    expect(screen.getByRole('heading', { name: expected.title })).toBeVisible();
    expect(screen.getByText(expected.description)).toBeVisible();
    expect(screen.getByText(`${firstCorrect * 20}%`)).toBeVisible();
    expect(screen.getByText('Needs practice').parentElement).toHaveTextContent(String(10 - firstCorrect * 2));
    page.unmount();
    mount(`/result/kitchen-1/${attempt.id}`);
    expect(screen.getByRole('heading', { name: expected.title })).toBeVisible();
    expect(summarize(loadState(scenes).state.attempts[attempt.id]).score).toBe(firstCorrect * 2);
  });
  it('shows an empty state when no valid attempt is available', () => {
    mount('/result/kitchen-1');
    expect(screen.getByRole('heading', { name: 'No result here yet.' })).toBeVisible();
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });
});

describe('paged content and result dialogs', () => {
  it('shows all eight categories with ready scenes before smaller plans, without pagination', () => {
    mount('/?page=2');
    const links = within(screen.getByRole('main')).getAllByRole('link');
    expect(new Set(links.map(link => link.getAttribute('aria-label')))).toEqual(new Set(categories.map(category => `${category.chineseTitle} · ${category.title}`)));
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: /Ready to explore/ })).getAllByRole('link')).toHaveLength(3);
    expect(within(screen.getByRole('region', { name: /Coming soon/ })).getAllByRole('link')).toHaveLength(5);
  });
  it('separates planned scenes and keeps all travel plans reachable', () => {
    mount('/category/travel-transport');
    expect(screen.getByRole('link', { name: 'Airport · Start Exploring' })).toBeVisible();
    fireEvent.click(screen.getByRole('tab', { name: /内容规划/ }));
    expect(screen.queryByRole('link', { name: 'Airport · Start Exploring' })).not.toBeInTheDocument();
    expect(screen.getByText(/Train Station/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText(/Beach/)).toBeVisible();
    fireEvent.click(screen.getByRole('tab', { name: /开始学习/ }));
    expect(screen.getByRole('link', { name: 'Airport · Start Exploring' })).toBeVisible();
  });
  it('puts the complete attempt history in a keyboard-accessible dialog, restoring focus on close', async () => {
    const user = userEvent.setup();
    const attempt = seed(10, 0);
    mount(`/result/kitchen-1/${attempt.id}`);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    const open = screen.getByRole('button', { name: 'View this attempt' });
    await user.click(open);
    const dialog = screen.getByRole('dialog', { name: 'View this attempt' });
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(10);
    expect(within(dialog).getByRole('button', { name: 'Close ×' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(open).toHaveFocus();
    expect(screen.getByRole('heading', { name: 'Let’s practise together.' })).toBeVisible();
  });
  it('keeps mobile category pages smaller and responds to the viewport media query', () => {
    let small = true;
    let change: (() => void) | undefined;
    vi.stubGlobal('matchMedia', () => ({ matches: small, addEventListener: (_: string, fn: () => void) => { change = fn; }, removeEventListener: vi.fn() }));
    mount('/category/food-dining');
    expect(within(screen.getByRole('main')).getAllByRole('link')).toHaveLength(1);
    small = false;
    act(() => change?.());
    expect(within(screen.getByRole('main')).getAllByRole('link')).toHaveLength(2);
  });
  it('removes only the Home navigation arrow and keeps scene and next arrows', async () => {
    const user = userEvent.setup();
    mount();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('link', { name: '← Home' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: '运动篇 · Sports & Fitness' }));
    expect(screen.getByRole('link', { name: '返回首页 · Home' })).toHaveAttribute('href', '/');
    await user.click(screen.getByRole('link', { name: /Gym ·/ }));
    expect(screen.getByRole('link', { name: '← 返回本分类 · Category' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Next word →' })).toBeVisible();
  });
});
