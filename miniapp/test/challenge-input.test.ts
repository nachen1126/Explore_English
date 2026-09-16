import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  ChallengeInputGuard, CONFIRM_GUARD_MS, challengeConfirmAction,
} from '../src/services/challenge-input';

const challengePage = readFileSync(fileURLToPath(new URL('../src/pages/challenge/index.tsx', import.meta.url)), 'utf8');
const challengeStyles = readFileSync(fileURLToPath(new URL('../src/pages/challenge/index.scss', import.meta.url)), 'utf8');

describe('challenge keyboard-only answer flow', () => {
  it('maps confirm to submit, next, and final results using one state decision', () => {
    expect(challengeConfirmAction({ solved: false, isLastQuestion: false, value: 'kettle' })).toBe('submit');
    expect(challengeConfirmAction({ solved: true, isLastQuestion: false, value: '' })).toBe('next');
    expect(challengeConfirmAction({ solved: true, isLastQuestion: true, value: '' })).toBe('results');
  });

  it('ignores blank confirms without recording a wrong answer', () => {
    expect(challengeConfirmAction({ solved: false, isLastQuestion: false, value: '   ' })).toBe('ignore');
    const guard = new ChallengeInputGuard();
    guard.reset('q1');
    expect(guard.beginSubmit('q1', '   ', 100)).toBe(false);
  });

  it('prevents held or repeated confirm events from submitting or advancing twice', () => {
    const guard = new ChallengeInputGuard();
    guard.reset('q1');
    expect(guard.beginSubmit('q1', 'kettle', 100)).toBe(true);
    expect(guard.beginSubmit('q1', 'kettle', 101)).toBe(false);
    expect(guard.beginAdvance('q1', 102)).toBe(false);
    expect(guard.beginAdvance('q1', 100 + CONFIRM_GUARD_MS)).toBe(true);
    expect(guard.beginAdvance('q1', 100 + CONFIRM_GUARD_MS + 1)).toBe(false);
  });

  it('resets for each new question so several questions can be completed by keyboard alone', () => {
    const guard = new ChallengeInputGuard();
    let now = 100;
    for (const questionId of ['q1', 'q2', 'q3']) {
      guard.reset(questionId);
      expect(guard.beginSubmit(questionId, 'answer', now)).toBe(true);
      now += CONFIRM_GUARD_MS;
      expect(guard.beginAdvance(questionId, now)).toBe(true);
      now += 1;
    }
  });

  it('uses controlled WeChat focus and keyboard-safe input properties', () => {
    expect(challengePage).toContain('focus={inputFocused}');
    expect(challengePage).toContain('confirmHold adjustPosition cursorSpacing={24}');
    expect(challengePage).toContain('onFocus={() => setInputFocused(true)}');
    expect(challengePage).toContain('onBlur={() => setInputFocused(false)}');
    expect(challengePage).toContain('onConfirm={event => handleConfirm(event.detail.value)}');
    expect(challengePage).toContain('onKeyboardCompositionStart');
    expect(challengePage).toContain('onKeyboardCompositionEnd');
    expect(challengePage).not.toMatch(/document\.|window\.|querySelector|\.focus\(\)/);
  });

  it('refocuses after a wrong answer and after each produce question change', () => {
    expect(challengePage).toContain("else if (!correct && question.mode === 'produce') focusAnswerInput()");
    expect(challengePage).toContain("if (question?.mode === 'produce') focusAnswerInput()");
    expect(challengePage).toContain("setRevealedFindQuestionId(null); setTyped(''); setFeedback(''); setAudioMessage('')");
  });

  it('uses the same submit and advance functions for buttons and keyboard confirm', () => {
    expect(challengePage).toContain("if (action === 'submit') submit(value, 'typing')");
    expect(challengePage).toContain("else if (action === 'next' || action === 'results') moveNext()");
    expect(challengePage).toContain("onClick={() => submit(typed, 'typing')}");
    expect(challengePage).toContain('onClick={moveNext}');
  });
});

describe('produce prompt hierarchy and paused ASR', () => {
  it('makes the title larger than the instruction', () => {
    const titleSize = Number(challengeStyles.match(/\.what-is-title[^}]*font-size:\s*(\d+)px/)?.[1]);
    const instructionSize = Number(challengeStyles.match(/\.what-is-instruction[^}]*font-size:\s*(\d+)px/)?.[1]);
    expect(titleSize).toBe(38);
    expect(instructionSize).toBe(26);
    expect(titleSize).toBeGreaterThan(instructionSize);
  });

  it('keeps text answers usable while paid speech recognition is disabled', () => {
    expect(challengePage).toContain("'语音回答暂未开放'");
    expect(challengePage).toContain('disabled={!SPEECH_RECOGNITION_ENABLED');
    expect(challengePage).toContain("onClick={() => submit(typed, 'typing')}");
  });
});
