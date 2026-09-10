import { useEffect, useRef } from 'react';
import { isSolved } from './logic';
import type { ChallengeQuestion } from './types';

/** Mounted for the whole session so a held key stays held across question changes. */
export function useChallengeEnter(question: ChallengeQuestion, onNext: () => void) {
  const held = useRef(false);
  const composing = useRef(false);
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (question.mode !== 'produce' || event.key !== 'Enter' || event.isComposing || composing.current
        || event.keyCode === 229 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey
        || document.querySelector('[aria-modal="true"], dialog[open]')) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('a, summary, textarea, select, [contenteditable="true"]')
        || (target?.closest('input') && target.id !== 'word-answer')
        || (target?.closest('button') && !target.closest('[data-challenge-next], button[type="submit"]'))) return;
      if (held.current || event.repeat) {
        event.preventDefault(); event.stopPropagation(); return;
      }
      held.current = true;
      // Capture before the form submits. That same event can never also advance.
      if (isSolved(question)) {
        event.preventDefault(); event.stopPropagation(); onNext();
      }
    }
    const keyup = (event: KeyboardEvent) => { if (event.key === 'Enter') held.current = false; };
    const reset = () => { held.current = false; composing.current = false; };
    const start = () => { composing.current = true; };
    const end = () => { composing.current = false; };
    window.addEventListener('keydown', keydown, true);
    window.addEventListener('keyup', keyup, true);
    window.addEventListener('blur', reset);
    window.addEventListener('compositionstart', start, true);
    window.addEventListener('compositionend', end, true);
    return () => {
      window.removeEventListener('keydown', keydown, true);
      window.removeEventListener('keyup', keyup, true);
      window.removeEventListener('blur', reset);
      window.removeEventListener('compositionstart', start, true);
      window.removeEventListener('compositionend', end, true);
    };
  }, [question, onNext]);
}
