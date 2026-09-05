import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal('speechSynthesis', { getVoices: () => [], cancel: vi.fn(), speak: vi.fn() });
  vi.stubGlobal('SpeechSynthesisUtterance', class {
    text: string;
    lang = '';
    onerror: (() => void) | null = null;
    constructor(text: string) { this.text = text; }
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
