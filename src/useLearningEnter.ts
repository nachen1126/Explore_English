import { useEffect, useRef } from 'react';

/** Exploration only: answer forms retain their own Enter behavior. */
export function useLearningEnter(onNext: () => void, enabled: boolean) {
  const held = useRef(false);
  const composing = useRef(false);
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (event.key !== 'Enter' || event.isComposing || composing.current || event.keyCode === 229
        || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')
        || (target?.closest('button, a, summary, [role="button"]') && !target.closest('[data-learn-next], .hotspot, .word-chips button'))
        || document.querySelector('[aria-modal="true"], dialog[open]')) return;
      // Prevent the focused Next button's native click, including auto-repeat.
      event.preventDefault();
      if (held.current || event.repeat) return;
      held.current = true;
      if (enabled) onNext();
    }
    const keyup = (event: KeyboardEvent) => { if (event.key === 'Enter') held.current = false; };
    const reset = () => { held.current = false; composing.current = false; };
    const compositionStart = () => { composing.current = true; };
    const compositionEnd = () => { composing.current = false; };
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', reset);
    window.addEventListener('compositionstart', compositionStart);
    window.addEventListener('compositionend', compositionEnd);
    return () => {
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', reset);
      window.removeEventListener('compositionstart', compositionStart);
      window.removeEventListener('compositionend', compositionEnd);
    };
  }, [enabled, onNext]);
}
