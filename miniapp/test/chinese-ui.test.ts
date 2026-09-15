import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

function visibleSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return visibleSourceFiles(path);
    return /\.tsx$|\.config\.ts$/.test(entry.name) ? [path] : [];
  });
}

const sourceFiles = visibleSourceFiles(fileURLToPath(new URL('../src', import.meta.url)));
const source = sourceFiles.map(file => readFileSync(file, 'utf8')).join('\n');

describe('Chinese-first mini-program UI', () => {
  it('removes the previous mixed-language interface labels', () => {
    for (const label of [
      'Review an object', 'Start over', 'You found them all', 'Start New Challenge',
      'Review Words', 'Check answer', 'Speak answer', 'Listening…', 'Processing…',
      'Show answer', 'Back Home', 'Total score', 'Needs practice',
    ]) expect(source).not.toContain(label);
  });

  it('does not expose a manual Stop recording button', () => {
    expect(source).not.toMatch(/>Stop<|recorder\.stop/);
  });

  it('keeps English learning content bindings intact', () => {
    expect(source).toContain('{item.word}');
    expect(source).toContain('{item.britishIPA}');
    expect(source).toContain('{item.exampleSentence}');
    expect(source).toContain('· UK');
  });
});
