import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FIND_CORRECT_ADVANCE_MS, ListenFindGuard } from '../src/services/listen-find';

const page = readFileSync(fileURLToPath(new URL('../src/pages/challenge/index.tsx', import.meta.url)), 'utf8');
const cloud = readFileSync(fileURLToPath(new URL('../src/services/cloud.ts', import.meta.url)), 'utf8');

describe('listen-and-find automatic pronunciation', () => {
  it('requests automatic playback when the first question loads', () => {
    const guard = new ListenFindGuard();
    expect(guard.requestAutoPlay('q1')).toBe(true);
    expect(page).toContain('scheduleFindAutoPlay(questionId, vocabularyId)');
  });

  it('does not replay the same question after a React rerender', () => {
    const guard = new ListenFindGuard();
    expect(guard.requestAutoPlay('q1')).toBe(true);
    expect(guard.requestAutoPlay('q1')).toBe(false);
  });

  it('automatically plays a different word when the next question appears', () => {
    const guard = new ListenFindGuard();
    expect(guard.requestAutoPlay('q1')).toBe(true);
    expect(guard.requestAutoPlay('q2')).toBe(true);
  });

  it('lets the user replay the current word without revealing it', () => {
    expect(page).toContain("onClick={() => void playFindWord(question.id, item.id)}");
    expect(page).toContain('🔊 再次播放');
  });

  it('stops and replaces active audio before every playback', () => {
    expect(cloud).toMatch(/playPronunciation[\s\S]*stopPronunciation\(\);[\s\S]*const requestSequence/);
  });

  it('reports automatic playback failure without disabling scene selection', () => {
    expect(page).toContain('自动发音暂时无法播放，你仍可继续选择物品或稍后重试。');
    expect(page).toContain("onSelect={id => submit(id, 'hotspot')}");
  });
});

describe('listen-and-find hidden word', () => {
  it('hides the English word by default', () => {
    expect(page).toContain("useState<string | null>(null)");
    expect(page).toContain("findWordRevealed ? <Text className='listen-find-word'>{item.word}</Text> : null");
  });

  it('shows the exact current word only after the display-word action', () => {
    expect(page).toContain("findWordRevealed ? '隐藏单词' : '显示单词'");
    expect(page).toContain("value === question.id ? null : question.id");
  });

  it('resets the reveal state while moving to the next question', () => {
    expect(page).toContain('setRevealedFindQuestionId(null)');
    expect(page).toContain('revealedFindQuestionId === question.id');
  });

  it('does not score or advance when the word is shown', () => {
    const revealHandler = page.split('\n').find(line => line.includes('setRevealedFindQuestionId(value =>')) ?? '';
    expect(revealHandler).not.toContain('answer(');
    expect(revealHandler).not.toContain('moveNext(');
    expect(revealHandler).not.toContain('playFindWord(');
  });
});

describe('listen-and-find correct-answer transition', () => {
  it('waits 600 milliseconds before advancing a correct answer', () => {
    expect(FIND_CORRECT_ADVANCE_MS).toBe(600);
    expect(page).toContain('setTimeout(moveNext, FIND_CORRECT_ADVANCE_MS)');
  });

  it('does not advance after a wrong selection', () => {
    expect(page).toMatch(/if \(correct && question\.mode === 'find'\)[\s\S]*setTimeout\(moveNext, FIND_CORRECT_ADVANCE_MS\)/);
  });

  it('locks a correct question against double taps and adjacent hotspots', () => {
    const guard = new ListenFindGuard();
    expect(guard.lockCorrectAnswer('q1')).toBe(true);
    expect(guard.lockCorrectAnswer('q1')).toBe(false);
    expect(guard.isLocked('q1')).toBe(true);
    expect(guard.isLocked('q2')).toBe(false);
  });

  it('routes the final question to results and intermediate questions forward', () => {
    expect(page).toContain('index >= attempt.questions.length - 1');
    expect(page).toContain('/pages/result/index?attemptId=');
    expect(page).toContain('setIndex(value => value + 1)');
  });

  it('clears delayed advance and audio when the page leaves', () => {
    expect(page).toContain('if (advanceTimer.current) clearTimeout(advanceTimer.current)');
    expect(page).toContain('clearAutoPlayTimer(); clearFocusTimer()');
    expect(page).toContain('pronunciationRequest.current += 1; stopPronunciation()');
    expect(page).toContain('useDidHide(cleanupPage)');
    expect(page).toContain('useUnload(cleanupPage)');
  });
});
