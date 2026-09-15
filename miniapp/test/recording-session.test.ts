import { describe, expect, it } from 'vitest';
import { AUTO_RECORD_DURATION_MS, RECORDING_WATCHDOG_MS, VoiceRecordingGuard } from '../src/services/recording-session';

describe('voice answer recording session', () => {
  it('uses a short automatic recording window without a manual stop step', () => {
    expect(AUTO_RECORD_DURATION_MS).toBeGreaterThanOrEqual(3000);
    expect(AUTO_RECORD_DURATION_MS).toBeLessThanOrEqual(6000);
    expect(RECORDING_WATCHDOG_MS).toBeGreaterThan(AUTO_RECORD_DURATION_MS);
  });

  it('accepts only one recognition request for each recording', () => {
    const guard = new VoiceRecordingGuard();
    const generation = guard.begin('recording-1');
    expect(guard.beginProcessing('recording-1')).toBe(generation);
    expect(guard.beginProcessing('recording-1')).toBeNull();
    expect(guard.finish('recording-1', generation)).toBe(true);
    expect(guard.beginProcessing('recording-1')).toBeNull();
  });

  it('invalidates a late recognition result after leaving the page', () => {
    const guard = new VoiceRecordingGuard();
    const generation = guard.begin('recording-2');
    expect(guard.beginProcessing('recording-2')).toBe(generation);
    guard.cancel();
    expect(guard.isCurrent('recording-2', generation)).toBe(false);
    expect(guard.finish('recording-2', generation)).toBe(false);
  });
});
