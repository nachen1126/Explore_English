import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { publishedScenes, scenes, vocabulary } from '../data';
import { createAttempt, emptyState, loadState, saveState, summarize } from '../logic';
import type { Recognition } from '../speech';
import type { ChallengeAttempt, ChallengeQuestion } from '../types';

const kitchen = publishedScenes.find(scene => scene.id === 'kitchen-1')!;
const gym = publishedScenes.find(scene => scene.id === 'gym-1')!;

function HistoryControls() {
  const location = useLocation();
  const navigate = useNavigate();
  return <aside aria-label="Test navigation">
    <output aria-label="Current route">{location.pathname}</output>
    <button onClick={() => navigate(-1)}>Browser back</button>
    <button onClick={() => navigate(1)}>Browser forward</button>
  </aside>;
}
function mount(path = '/') {
  return render(<MemoryRouter initialEntries={[path]}><App /><HistoryControls /></MemoryRouter>);
}
function loadPicture() {
  fireEvent.load(screen.getByRole('img', { name: /an illustrated place to explore/ }));
}
function pressEnter() {
  fireEvent.keyDown(window, { key: 'Enter' });
  fireEvent.keyUp(window, { key: 'Enter' });
}
function storedAttempt(attempt: ChallengeAttempt) {
  return loadState(scenes).state.attempts[attempt.id];
}
function seedAttempt(modes: ChallengeQuestion['mode'][]) {
  const state = emptyState();
  const attempt = createAttempt(kitchen, kitchen.vocabularyIds.slice(0, modes.length), 'weak', () => .99);
  attempt.questions.forEach((question, index) => { question.mode = modes[index]; });
  state.scenes[kitchen.id] = { explored: [...kitchen.vocabularyIds], lastVisited: 1 };
  state.attempts[attempt.id] = attempt;
  saveState(state);
  return attempt;
}
function targetButton(question: ChallengeQuestion) {
  const position = kitchen.hotspots.findIndex(hotspot => hotspot.vocabularyId === question.vocabularyId);
  return screen.getByRole('button', { name: `Select object ${position + 1}` });
}
function typeAnswer(answer: string) {
  fireEvent.change(screen.getByRole('textbox', { name: 'Type the English word' }), { target: { value: answer } });
  fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
}
function result(text: string): Parameters<NonNullable<Recognition['onresult']>>[0] {
  return { resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal: true })] };
}
class FakeRecognition implements Recognition {
  static instances: FakeRecognition[] = [];
  lang = '';
  interimResults = false;
  continuous = false;
  onstart: Recognition['onstart'] = null;
  onaudiostart: Recognition['onaudiostart'] = null;
  onspeechend: Recognition['onspeechend'] = null;
  onresult: Recognition['onresult'] = null;
  onerror: Recognition['onerror'] = null;
  onend: Recognition['onend'] = null;
  onaudioend: Recognition['onaudioend'] = null;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();
  constructor() { FakeRecognition.instances.push(this); }
}
function startRecording() {
  fireEvent.click(screen.getByRole('button', { name: /Use microphone|Retry microphone/ }));
  const recording = FakeRecognition.instances.at(-1)!;
  act(() => recording.onstart?.());
  return recording;
}

beforeEach(() => { FakeRecognition.instances = []; });
afterEach(() => { vi.useRealTimers(); });

describe('category navigation and existing discoveries', () => {
  it('requires Home → Sports → Gym, with working category/home links and browser history', () => {
    mount();
    expect(within(screen.getByRole('main')).getAllByRole('link')).toHaveLength(8);
    expect(screen.queryByRole('link', { name: /Gym ·/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: '运动篇 · Sports & Fitness' }));
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/category/sports-fitness');
    expect(screen.getByRole('link', { name: '← 返回首页 · Home' })).toHaveAttribute('href', '/');
    fireEvent.click(screen.getByRole('link', { name: 'Gym · Start Exploring' }));
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/scene/gym-1');
    expect(screen.getByRole('link', { name: '← 返回本分类 · Category' })).toHaveAttribute('href', '/category/sports-fitness');
    expect(screen.getByRole('link', { name: 'Explore English home' })).toHaveAttribute('href', '/');
    fireEvent.click(screen.getByRole('button', { name: 'Browser back' }));
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/category/sports-fitness');
    fireEvent.click(screen.getByRole('button', { name: 'Browser forward' }));
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/scene/gym-1');
    fireEvent.click(screen.getByRole('link', { name: '← 返回本分类 · Category' }));
    fireEvent.click(screen.getByRole('link', { name: '← 返回首页 · Home' }));
    expect(screen.getByRole('link', { name: '运动篇 · Sports & Fitness' })).toBeVisible();
  });

  it('remounts category and scene bookmarks while retaining old schema-2 discoveries', () => {
    const oldState = emptyState();
    oldState.scenes[gym.id] = { explored: gym.vocabularyIds.slice(0, 3), lastVisited: 42 };
    saveState(oldState);
    let page = mount('/category/sports-fitness');
    expect(screen.getByRole('progressbar', { name: 'Gym exploration progress' })).toHaveAttribute('value', '3');
    expect(screen.getByRole('link', { name: 'Gym · Continue' })).toHaveAttribute('href', '/scene/gym-1');
    page.unmount();
    page = mount('/scene/gym-1');
    loadPicture();
    expect(screen.getByRole('progressbar', { name: 'Exploration progress' })).toHaveAttribute('value', '3');
    expect(screen.getByRole('button', { name: `Review ${vocabulary[gym.vocabularyIds[0]].word}` })).toBeEnabled();
    expect(loadState(scenes).state.scenes[gym.id].explored).toEqual(oldState.scenes[gym.id].explored);
    page.unmount();
    mount('/category/sports-fitness');
    expect(screen.getByRole('link', { name: 'Gym · Continue' })).toBeVisible();
  });

  it('shows empty categories as forthcoming plans without fake scene links or images', () => {
    mount('/category/animals');
    expect(screen.getByRole('heading', { name: 'Coming soon · 敬请期待' })).toBeVisible();
    expect(screen.getByText(/Farm/)).toBeVisible();
    expect(within(screen.getByRole('main')).queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

describe('learning Enter shortcut', () => {
  it('updates one word, highlight, pronunciation and saved progress per physical press; ignores holds and IME', () => {
    mount('/scene/kitchen-1'); loadPicture();
    const progress = screen.getByRole('progressbar', { name: 'Exploration progress' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(screen.getByRole('region', { name: 'Word card: door' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Review door' })).toHaveClass('is-highlighted');
    expect(progress).toHaveAttribute('value', '1');
    fireEvent.keyDown(window, { key: 'Enter', repeat: true });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(progress).toHaveAttribute('value', '1');
    fireEvent.keyUp(window, { key: 'Enter' });
    fireEvent.keyDown(window, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(window, { key: 'Enter', keyCode: 229 });
    fireEvent.compositionStart(window);
    pressEnter();
    fireEvent.compositionEnd(window);
    expect(progress).toHaveAttribute('value', '1');
    pressEnter();
    expect(screen.getByRole('region', { name: 'Word card: window' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Review window' })).toHaveClass('is-highlighted');
    expect(screen.getByRole('button', { name: 'Review door' })).not.toHaveClass('is-highlighted');
    expect(progress).toHaveAttribute('value', '2');
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(2);
    expect(loadState(scenes).state.scenes[kitchen.id].explored).toEqual(kitchen.vocabularyIds.slice(0, 2));
  });

  it('a focused Next button receives one keyboard activation and modal Enter cannot change the underlying word', async () => {
    const user = userEvent.setup();
    mount('/scene/kitchen-1'); loadPicture();
    screen.getByRole('button', { name: 'Next word →' }).focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('progressbar', { name: 'Exploration progress' })).toHaveAttribute('value', '1');
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Start over' }));
    expect(screen.getByRole('alertdialog')).toBeVisible();
    pressEnter();
    expect(screen.getByRole('progressbar', { name: 'Exploration progress' })).toHaveAttribute('value', '1');
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Keep my progress' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next word →' }));
    expect(screen.getByRole('region', { name: 'Word card: window' })).toBeVisible();
  });

  it('continues with Enter after clicking a picture object instead of replaying the focused hotspot', async () => {
    const user = userEvent.setup();
    mount('/scene/kitchen-1'); loadPicture();
    await user.click(screen.getByRole('button', { name: 'Explore door' }));
    expect(screen.getByRole('button', { name: 'Review door' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('region', { name: 'Word card: window' })).toBeVisible();
    expect(screen.getByRole('progressbar', { name: 'Exploration progress' })).toHaveAttribute('value', '2');
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(2);
  });

  it('stops at the last word, retains the completion flow, and cleans listeners on navigation and remount', () => {
    mount('/scene/kitchen-1'); loadPicture();
    for (const id of kitchen.vocabularyIds) {
      pressEnter();
      expect(screen.getByRole('region', { name: `Word card: ${vocabulary[id].word}` })).toBeVisible();
    }
    pressEnter();
    expect(screen.getByRole('button', { name: 'Next word →' })).toBeDisabled();
    expect(screen.getByRole('heading', { name: 'You found them all!' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Start Challenge →' })).toBeVisible();
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(10);
    fireEvent.click(screen.getByRole('link', { name: 'Explore English home' }));
    pressEnter();
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(10);
    fireEvent.click(screen.getByRole('link', { name: '饮食篇 · Food & Dining' }));
    fireEvent.click(screen.getByRole('link', { name: 'Kitchen · Review' }));
    pressEnter();
    expect(screen.getByRole('region', { name: 'Word card: door' })).toBeVisible();
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(11);
    expect(loadState(scenes).state.scenes[kitchen.id].explored).toHaveLength(10);
  });

  it('Enter in the answer input submits once, keeps the current question and never activates learning navigation', async () => {
    const user = userEvent.setup();
    const attempt = seedAttempt(['produce', 'produce']);
    mount(`/challenge/${kitchen.id}/${attempt.id}`); loadPicture();
    const input = screen.getByRole('textbox', { name: 'Type the English word' });
    await user.type(input, 'wrong{Enter}');
    expect(storedAttempt(attempt).questions[0].answers).toHaveLength(1);
    expect(storedAttempt(attempt).questions[1].answers).toHaveLength(0);
    expect(screen.getByText('1 / 2')).toBeVisible();
    await user.clear(input);
    await user.type(input, vocabulary[attempt.questions[0].vocabularyId].word);
    fireEvent.compositionStart(input);
    await user.keyboard('{Enter}');
    expect(storedAttempt(attempt).questions[0].answers).toHaveLength(1);
    fireEvent.compositionEnd(input);
    await user.keyboard('{Enter}');
    expect(storedAttempt(attempt).questions[0].answers).toHaveLength(2);
    expect(screen.getByText('Correct.')).toBeVisible();
    expect(screen.getByText('1 / 2')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Next word →' })).toBeVisible();
    expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
  });
});

describe('Find It automatic advancement', () => {
  it('wrong clicks stay put; correct feedback locks all choices and advances exactly once after 600 ms', () => {
    vi.useFakeTimers();
    const attempt = seedAttempt(['find', 'find', 'produce']);
    mount(`/challenge/${kitchen.id}/${attempt.id}`); loadPicture();
    fireEvent.click(targetButton(attempt.questions[1]));
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText('1 / 3')).toBeVisible();
    expect(screen.getByText('Not quite. Try again.')).toBeVisible();
    const correct = targetButton(attempt.questions[0]);
    fireEvent.click(correct);
    fireEvent.click(correct);
    fireEvent.doubleClick(correct);
    expect(screen.getByText('Correct.')).toBeVisible();
    expect(correct).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Next word →' })).not.toBeInTheDocument();
    expect(storedAttempt(attempt).questions[0].answers).toHaveLength(2);
    expect(summarize(storedAttempt(attempt)).score).toBe(0);
    act(() => vi.advanceTimersByTime(599));
    expect(screen.getByText('1 / 3')).toBeVisible();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText('2 / 3')).toBeVisible();
    expect(screen.getByRole('heading', { name: `Find the ${vocabulary[attempt.questions[1].vocabularyId].word}.` })).toBeVisible();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText('2 / 3')).toBeVisible();
    expect(storedAttempt(attempt).questions[1].answers).toHaveLength(0);
  });

  it('automatically opens results after a one-word Find practice without duplicate scoring', () => {
    vi.useFakeTimers();
    const attempt = seedAttempt(['find']);
    mount(`/challenge/${kitchen.id}/${attempt.id}`); loadPicture();
    const correct = targetButton(attempt.questions[0]);
    fireEvent.click(correct); fireEvent.click(correct);
    expect(screen.getByText('Correct.')).toBeVisible();
    act(() => vi.advanceTimersByTime(600));
    expect(screen.getByLabelText('Current route')).toHaveTextContent(`/result/${kitchen.id}/${attempt.id}`);
    expect(screen.getByText('100%')).toBeVisible();
    expect(storedAttempt(attempt).questions[0].answers).toHaveLength(1);
    expect(summarize(storedAttempt(attempt)).score).toBe(1);
  });

  it('clears a pending transition when leaving the challenge and resumes at the next unsolved question', () => {
    vi.useFakeTimers();
    const scheduled = vi.spyOn(window, 'setTimeout');
    const cleared = vi.spyOn(window, 'clearTimeout');
    const attempt = seedAttempt(['find', 'produce']);
    const page = mount(`/challenge/${kitchen.id}/${attempt.id}`); loadPicture();
    fireEvent.click(targetButton(attempt.questions[0]));
    const transitionIndex = scheduled.mock.calls.findIndex(([, delay]) => delay === 600);
    expect(transitionIndex).toBeGreaterThanOrEqual(0);
    const transitionTimer = scheduled.mock.results[transitionIndex].value;
    fireEvent.click(screen.getByRole('link', { name: 'Explore English home' }));
    expect(cleared).toHaveBeenCalledWith(transitionTimer);
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole('link', { name: '运动篇 · Sports & Fitness' })).toBeVisible();
    expect(storedAttempt(attempt).questions[1].answers).toHaveLength(0);
    page.unmount();
    mount(`/challenge/${kitchen.id}/${attempt.id}`);
    expect(screen.getByRole('heading', { name: 'What is this?' })).toBeVisible();
    expect(screen.getByText('2 / 2')).toBeVisible();
  });
});

describe('shared wrong-answer hints and voice integration', () => {
  it('typing + speech + typing reveals a persistent third-error hint; reveal keeps zero mastery and resets on Next', () => {
    vi.stubGlobal('SpeechRecognition', FakeRecognition);
    const attempt = seedAttempt(['produce', 'produce']);
    let page = mount(`/challenge/${kitchen.id}/${attempt.id}`); loadPicture();
    typeAnswer('wrong');
    expect(screen.queryByRole('status', { name: 'Word hint' })).not.toBeInTheDocument();
    const recording = startRecording();
    const duplicateResult = recording.onresult!;
    act(() => duplicateResult(result('wrong voice')));
    expect(screen.getByText('Recognized text:')).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Type the English word' })).toHaveValue('wrong voice');
    expect(storedAttempt(attempt).questions[0].answers).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    act(() => duplicateResult(result('wrong voice')));
    expect(screen.getByRole('button', { name: 'Check answer' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    expect(storedAttempt(attempt).questions[0].answers).toHaveLength(2);
    expect(screen.queryByRole('status', { name: 'Word hint' })).not.toBeInTheDocument();
    typeAnswer('wrong again');
    expect(storedAttempt(attempt).questions[0].answers.map(answer => answer.source)).toEqual(['typing', 'speech', 'typing']);
    const hint = screen.getByRole('status', { name: 'Word hint' });
    expect(hint).toHaveTextContent(vocabulary[attempt.questions[0].vocabularyId].chineseMeaning);
    expect(hint).toHaveTextContent('d _ _ _');
    expect(hint).toHaveTextContent('4 letters');
    page.unmount();
    page = mount(`/challenge/${kitchen.id}/${attempt.id}`);
    expect(screen.getByRole('status', { name: 'Word hint' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '查看答案 · Show answer' }));
    expect(screen.getByRole('region', { name: 'Word card: door' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Play pronunciation of door' })).toBeVisible();
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    const helped = storedAttempt(attempt);
    expect(helped.questions[0].revealedAt).toBeDefined();
    expect(summarize(helped).remembered).not.toContain(attempt.questions[0].vocabularyId);
    expect(summarize(helped).weak).toContain(attempt.questions[0].vocabularyId);
    expect(summarize(helped).score).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Next word →' }));
    expect(screen.getByText('2 / 2')).toBeVisible();
    expect(screen.queryByRole('status', { name: 'Word hint' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Type the English word' })).toHaveValue('');
    typeAnswer('wrong');
    expect(storedAttempt(attempt).questions[1].answers).toHaveLength(1);
    expect(screen.queryByRole('status', { name: 'Word hint' })).not.toBeInTheDocument();
    page.unmount();
  });

  it('a correct retry keeps the hint and first-answer score, with no Produce auto-advance', () => {
    vi.useFakeTimers();
    const attempt = seedAttempt(['produce', 'produce']);
    mount(`/challenge/${kitchen.id}/${attempt.id}`);
    for (let index = 0; index < 3; index++) typeAnswer(`wrong ${index}`);
    typeAnswer(vocabulary[attempt.questions[0].vocabularyId].word);
    expect(screen.getByText('Correct.')).toBeVisible();
    expect(screen.getByRole('status', { name: 'Word hint' })).toBeVisible();
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText('1 / 2')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Next word →' })).toBeVisible();
    expect(summarize(storedAttempt(attempt)).score).toBe(0);
  });

  it.each([
    ['not-allowed', /permission was denied/],
    ['no-speech', /No speech was detected/],
    ['network', /could not connect/],
    ['audio-capture', /microphone could not be used/],
    ['service-not-allowed', /speech service is unavailable/],
  ])('voice failure %s gives an actionable retry and never adds a vocabulary error', (error, message) => {
    vi.stubGlobal('SpeechRecognition', FakeRecognition);
    const attempt = seedAttempt(['produce']);
    mount(`/challenge/${kitchen.id}/${attempt.id}`);
    const recording = startRecording();
    expect(screen.getByText(/Listening…/)).toBeVisible();
    act(() => recording.onerror?.({ error }));
    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('button', { name: 'Retry microphone' })).toBeEnabled();
    expect(screen.getByRole('textbox', { name: 'Type the English word' })).toBeEnabled();
    expect(storedAttempt(attempt).questions[0].answers).toHaveLength(0);
    expect(screen.queryByRole('status', { name: 'Word hint' })).not.toBeInTheDocument();
  });

  it('blank typing and empty recognition are not attempts; leaving a live recording cleans it and ignores stale results', () => {
    vi.stubGlobal('SpeechRecognition', FakeRecognition);
    const attempt = seedAttempt(['produce']);
    mount(`/challenge/${kitchen.id}/${attempt.id}`);
    typeAnswer('   ');
    expect(storedAttempt(attempt).questions[0].answers).toHaveLength(0);
    const emptyRecording = startRecording();
    act(() => emptyRecording.onresult?.(result('  ')));
    expect(screen.getByRole('alert')).toHaveTextContent(/No words/);
    expect(storedAttempt(attempt).questions[0].answers).toHaveLength(0);
    const active = startRecording();
    const stale = active.onresult!;
    fireEvent.click(screen.getByRole('link', { name: 'Explore English home' }));
    expect(active.abort).toHaveBeenCalledTimes(1);
    expect(active.onresult).toBeNull();
    act(() => stale(result('door')));
    expect(storedAttempt(attempt).questions[0].answers).toHaveLength(0);
    expect(screen.getByRole('link', { name: '运动篇 · Sports & Fitness' })).toBeVisible();
  });
});
