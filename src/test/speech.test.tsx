import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { speak, useRecognition, type Recognition } from '../speech';

class FakeRecognition implements Recognition {
  static latest: FakeRecognition;
  lang = '';
  interimResults = false;
  continuous = false;
  onresult: Recognition['onresult'] = null;
  onerror: Recognition['onerror'] = null;
  onend: Recognition['onend'] = null;
  onaudioend: Recognition['onaudioend'] = null;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();
  constructor() { FakeRecognition.latest = this; }
}
afterEach(() => vi.useRealTimers());
describe('speech lifecycle', () => {
  it('cancel removes callbacks so a late transcript cannot change a submitted answer', () => {
    vi.stubGlobal('SpeechRecognition', FakeRecognition);
    const transcript = vi.fn();
    const { result } = renderHook(() => useRecognition(transcript));
    act(() => result.current.start());
    const active = FakeRecognition.latest;
    act(() => result.current.cancel());
    expect(active.onresult).toBeNull();
    expect(active.onerror).toBeNull();
    expect(active.abort).toHaveBeenCalledOnce();
    expect(transcript).not.toHaveBeenCalled();
  });
  it('uses Type It when browser speech recognition is unavailable', () => {
    vi.stubGlobal('SpeechRecognition', undefined);
    vi.stubGlobal('webkitSpeechRecognition', undefined);
    const { result } = renderHook(() => useRecognition(vi.fn()));
    expect(result.current.supported).toBe(false);
    expect(result.current.status).toBe('idle');
  });
  it('exposes Listening, a working stop action, Processing and Success with the transcript', () => {
    vi.stubGlobal('SpeechRecognition', FakeRecognition);
    const transcript = vi.fn();
    const { result } = renderHook(() => useRecognition(transcript));
    act(() => result.current.start());
    const active = FakeRecognition.latest;
    expect(active.lang).toBe('en-GB');
    expect(result.current.status).toBe('listening');
    act(() => result.current.stop());
    expect(active.stop).toHaveBeenCalledOnce();
    expect(result.current.status).toBe('processing');
    act(() => active.onresult?.({ results: [[{ transcript: 'a bottle' }]] }));
    expect(result.current.status).toBe('success');
    expect(transcript).toHaveBeenCalledWith('a bottle');
    act(() => active.onend?.());
    expect(result.current.status).toBe('success');
  });
  it('reports permission errors and safely aborts when the question unmounts', () => {
    vi.stubGlobal('SpeechRecognition', FakeRecognition);
    const { result, unmount } = renderHook(() => useRecognition(vi.fn()));
    act(() => result.current.start());
    const active = FakeRecognition.latest;
    act(() => active.onerror?.({ error: 'not-allowed' }));
    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('type your answer');
    unmount();
    expect(active.abort).toHaveBeenCalledOnce();
    expect(active.onresult).toBeNull();
  });
  it('recovers from no-speech and timeout instead of listening indefinitely', () => {
    vi.useFakeTimers();
    vi.stubGlobal('SpeechRecognition', FakeRecognition);
    const { result } = renderHook(() => useRecognition(vi.fn()));
    act(() => result.current.start());
    act(() => FakeRecognition.latest.onend?.());
    expect(result.current.status).toBe('error');
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(15000));
    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('timed out');
    expect(FakeRecognition.latest.abort).toHaveBeenCalledOnce();
  });
  it('rapid pronunciation replay does not mistake deliberate cancellation for an audio failure', () => {
    const onError = vi.fn();
    speak('door', onError);
    const utterance = vi.mocked(window.speechSynthesis.speak).mock.calls[0][0];
    utterance.onerror?.({ error: 'canceled' } as SpeechSynthesisErrorEvent);
    utterance.onerror?.({ error: 'interrupted' } as SpeechSynthesisErrorEvent);
    expect(onError).not.toHaveBeenCalled();
    utterance.onerror?.({ error: 'audio-busy' } as SpeechSynthesisErrorEvent);
    expect(onError).toHaveBeenCalledOnce();
  });
});
