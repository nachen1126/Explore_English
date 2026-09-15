import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('../cloudfunctions/speech-recognize/index.js', import.meta.url), 'utf8');

describe('speech-recognize cloud function wiring', () => {
  it('calls Tencent one-sentence English recognition with the recorded audio', () => {
    expect(source).toContain('SentenceRecognition');
    expect(source).toContain("EngSerViceType: '16k_en'");
    expect(source).toContain("VoiceFormat: event.format === 'wav' ? 'wav' : 'mp3'");
    expect(source).toContain("Data: buffer.toString('base64')");
  });

  it('requires server-side credentials without embedding credential values', () => {
    expect(source).toContain('TENCENT_SECRET_ID');
    expect(source).toContain('TENCENT_SECRET_KEY');
    expect(source).not.toMatch(/secretId:\s*['"][^'"]+['"]/);
    expect(source).not.toMatch(/secretKey:\s*['"][^'"]+['"]/);
  });

  it('does not return the previous placeholder fallback message', () => {
    expect(source).not.toContain('Speech recognition is not configured');
    expect(source).toContain("TENCENT_ASR_PROJECT_ID = '0'");
  });
});
