import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { speak, useRecognition, type Recognition } from '../speech';

class FakeRecognition implements Recognition {
  static latest: FakeRecognition;
  static instances: FakeRecognition[] = [];
  static startAction: (() => void) | undefined;
  lang = '';
  interimResults = true;
  continuous = true;
  onstart: Recognition['onstart'] = null;
  onaudiostart: Recognition['onaudiostart'] = null;
  onspeechstart: Recognition['onspeechstart'] = null;
  onspeechend: Recognition['onspeechend'] = null;
  onresult: Recognition['onresult'] = null;
  onerror: Recognition['onerror'] = null;
  onend: Recognition['onend'] = null;
  onaudioend: Recognition['onaudioend'] = null;
  start = vi.fn(() => FakeRecognition.startAction?.());
  stop = vi.fn();
  abort = vi.fn();
  constructor() { FakeRecognition.latest = this; FakeRecognition.instances.push(this); }
}
function resultEvent(text: string, isFinal = true) {
  return { resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal })] };
}
beforeEach(() => {
  FakeRecognition.instances = [];
  FakeRecognition.startAction = undefined;
  vi.stubGlobal('SpeechRecognition', FakeRecognition);
  vi.stubGlobal('webkitSpeechRecognition', undefined);
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('speech lifecycle', () => {
  it('starts directly from the action, cancels pronunciation first, and waits for native listening events', () => {
    const { result } = renderHook(() => useRecognition(vi.fn()));
    act(() => result.current.start());
    const active = FakeRecognition.latest;
    expect(active.start).toHaveBeenCalledOnce();
    expect(window.speechSynthesis.cancel).toHaveBeenCalledOnce();
    expect(vi.mocked(window.speechSynthesis.cancel).mock.invocationCallOrder[0]).toBeLessThan(active.start.mock.invocationCallOrder[0]);
    expect(active.lang).toBe('en-GB');
    expect(active.interimResults).toBe(true);
    expect(active.continuous).toBe(false);
    expect(result.current.status).toBe('starting');
    act(() => active.onstart?.());
    expect(result.current.status).toBe('listening');
  });
  it('preserves a synchronous native onstart deadline instead of replacing it with the startup timer', () => {
    vi.useFakeTimers();
    FakeRecognition.startAction = () => FakeRecognition.latest.onstart?.();
    const { result } = renderHook(() => useRecognition(vi.fn()));
    act(() => result.current.start());
    expect(result.current.status).toBe('listening');
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.status).toBe('listening');
    act(() => vi.advanceTimersByTime(4000));
    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('No speech was detected');
  });
  it('accepts native audio-start as listening and audio-end as processing', () => {
    const { result } = renderHook(() => useRecognition(vi.fn()));
    act(() => result.current.start());
    act(() => FakeRecognition.latest.onaudiostart?.());
    expect(result.current.status).toBe('listening');
    act(() => FakeRecognition.latest.onaudioend?.());
    expect(result.current.status).toBe('processing');
  });
  it('uses speech-start and interim results only to show speech detection', () => {
    const transcript = vi.fn();
    const { result } = renderHook(() => useRecognition(transcript));
    act(() => result.current.start());
    act(() => FakeRecognition.latest.onspeechstart?.());
    expect(result.current.status).toBe('speechDetected');
    act(() => FakeRecognition.latest.onresult?.(resultEvent('bot', false)));
    expect(result.current.status).toBe('speechDetected');
    expect(transcript).not.toHaveBeenCalled();
  });
  it('uses the prefixed API when the standard constructor is absent', () => {
    vi.stubGlobal('SpeechRecognition', undefined);
    vi.stubGlobal('webkitSpeechRecognition', FakeRecognition);
    const { result } = renderHook(() => useRecognition(vi.fn()));
    expect(result.current.supported).toBe(true);
    act(() => result.current.start());
    expect(FakeRecognition.latest.start).toHaveBeenCalledOnce();
  });
  it('provides a usable typed-answer explanation when speech is unavailable', () => {
    vi.stubGlobal('SpeechRecognition', undefined);
    const transcript = vi.fn();
    const { result } = renderHook(() => useRecognition(transcript));
    expect(result.current.supported).toBe(false);
    expect(result.current.unavailableReason).toContain('type your answer');
    act(() => result.current.start());
    expect(result.current.status).toBe('error');
    expect(transcript).not.toHaveBeenCalled();
  });
  it('explains HTTPS requirements without creating a microphone session in an insecure context', () => {
    vi.stubGlobal('isSecureContext', false);
    const { result } = renderHook(() => useRecognition(vi.fn()));
    expect(result.current.supported).toBe(false);
    act(() => result.current.start());
    expect(result.current.error).toContain('HTTPS');
    expect(FakeRecognition.instances).toHaveLength(0);
  });
  it('ignores repeated starts while recording or processing', () => {
    const { result } = renderHook(() => useRecognition(vi.fn()));
    act(() => { result.current.start(); result.current.start(); });
    expect(FakeRecognition.instances).toHaveLength(1);
    act(() => { FakeRecognition.latest.onspeechend?.(); result.current.start(); });
    expect(FakeRecognition.instances).toHaveLength(1);
    expect(FakeRecognition.latest.start).toHaveBeenCalledOnce();
  });
  it('uses native speech end without manual stop and delivers a final transcript with a stable session identity', () => {
    const transcript = vi.fn();
    const { result } = renderHook(() => useRecognition(transcript));
    act(() => result.current.start());
    const active = FakeRecognition.latest;
    act(() => active.onstart?.());
    act(() => active.onspeechend?.());
    expect(active.stop).not.toHaveBeenCalled();
    expect(result.current.status).toBe('processing');
    act(() => active.onresult?.(resultEvent(' a bottle ')));
    expect(result.current.status).toBe('success');
    expect(result.current.transcript).toBe('a bottle');
    expect(transcript).toHaveBeenCalledExactlyOnceWith('a bottle', expect.any(String));
    expect(active.abort).not.toHaveBeenCalled();
  });
  it('considers only changed final results and ignores interim and already-handled final results', () => {
    const transcript = vi.fn();
    const { result } = renderHook(() => useRecognition(transcript));
    act(() => result.current.start());
    const deliver = FakeRecognition.latest.onresult!;
    act(() => deliver({ resultIndex: 1, results: [
      Object.assign([{ transcript: 'old result' }], { isFinal: true }),
      Object.assign([{ transcript: 'a bot' }], { isFinal: false }),
    ] }));
    expect(transcript).not.toHaveBeenCalled();
    const finalEvent = { resultIndex: 1, results: [
      Object.assign([{ transcript: 'old result' }], { isFinal: true }),
      Object.assign([{ transcript: 'a bottle' }], { isFinal: true }),
    ] };
    act(() => { deliver(finalEvent); deliver(finalEvent); });
    expect(transcript).toHaveBeenCalledExactlyOnceWith('a bottle', expect.any(String));
  });
  it.each(['', '   ', '...'])('does not turn an empty or non-word transcript %j into an answer', text => {
    const transcript = vi.fn();
    const { result } = renderHook(() => useRecognition(transcript));
    act(() => result.current.start());
    act(() => FakeRecognition.latest.onresult?.(resultEvent(text)));
    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('No words');
    expect(transcript).not.toHaveBeenCalled();
  });
  it.each([
    ['not-allowed', 'permission was denied'],
    ['service-not-allowed', 'speech settings'],
    ['no-speech', 'No speech was detected'],
    ['network', 'internet connection'],
    ['audio-capture', 'close other recording apps'],
    ['aborted', 'interrupted'],
    ['language-not-supported', 'speech languages'],
    ['unknown-error', 'Speech recognition failed'],
  ])('reports %s as a service failure without submitting an answer and permits retry', (code, message) => {
    const transcript = vi.fn();
    const { result } = renderHook(() => useRecognition(transcript));
    act(() => result.current.start());
    const active = FakeRecognition.latest;
    const lateEnd = active.onend!;
    act(() => active.onerror?.({ error: code }));
    act(() => lateEnd());
    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain(message);
    expect(result.current.error).toContain('type your answer');
    expect(transcript).not.toHaveBeenCalled();
    expect(active.abort).toHaveBeenCalledOnce();
    act(() => result.current.start());
    expect(result.current.status).toBe('starting');
    expect(FakeRecognition.instances).toHaveLength(2);
  });
  it('handles constructor failures without escaping the click handler', () => {
    vi.stubGlobal('SpeechRecognition', class { constructor() { throw new Error('unavailable'); } });
    const transcript = vi.fn();
    const { result } = renderHook(() => useRecognition(transcript));
    act(() => result.current.start());
    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('could not start');
    expect(transcript).not.toHaveBeenCalled();
  });
  it('handles synchronous permission/start failures and clears the session for retry', () => {
    FakeRecognition.startAction = () => { throw new DOMException('permission blocked', 'NotAllowedError'); };
    const transcript = vi.fn();
    const { result } = renderHook(() => useRecognition(transcript));
    act(() => result.current.start());
    expect(result.current.error).toContain('permission was denied');
    expect(FakeRecognition.latest.abort).toHaveBeenCalledOnce();
    FakeRecognition.startAction = undefined;
    act(() => result.current.start());
    expect(result.current.status).toBe('starting');
    expect(transcript).not.toHaveBeenCalled();
  });
  it('cancel invalidates saved callbacks as well as detaching them, even after another session starts', () => {
    const transcript = vi.fn();
    const { result } = renderHook(() => useRecognition(transcript));
    act(() => result.current.start());
    const previous = FakeRecognition.latest;
    const lateResult = previous.onresult!;
    const lateError = previous.onerror!;
    const lateEnd = previous.onend!;
    act(() => result.current.cancel());
    expect(previous.onresult).toBeNull();
    expect(previous.onerror).toBeNull();
    expect(previous.onstart).toBeNull();
    expect(previous.abort).toHaveBeenCalledOnce();
    expect(result.current.status).toBe('idle');
    act(() => result.current.start());
    act(() => { lateResult(resultEvent('stale')); lateError({ error: 'network' }); lateEnd(); });
    expect(result.current.status).toBe('starting');
    expect(transcript).not.toHaveBeenCalled();
    act(() => FakeRecognition.latest.onresult?.(resultEvent('new')));
    expect(transcript).toHaveBeenCalledExactlyOnceWith('new', expect.any(String));
  });
  it('gives each new recording its own identity, and uses the latest transcript callback', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(({ callback }) => useRecognition(callback), { initialProps: { callback: first } });
    act(() => result.current.start());
    act(() => FakeRecognition.latest.onresult?.(resultEvent('door')));
    rerender({ callback: second });
    act(() => result.current.start());
    expect(result.current.transcript).toBe('');
    act(() => FakeRecognition.latest.onresult?.(resultEvent('window')));
    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
    expect(first.mock.calls[0][1]).not.toBe(second.mock.calls[0][1]);
  });
  it('waits through the mobile end grace period before failing without a final result', () => {
    vi.useFakeTimers();
    const transcript = vi.fn();
    const { result } = renderHook(() => useRecognition(transcript));
    act(() => result.current.start());
    act(() => FakeRecognition.latest.onresult?.(resultEvent('interim only', false)));
    act(() => FakeRecognition.latest.onend?.());
    expect(result.current.status).toBe('speechDetected');
    act(() => vi.advanceTimersByTime(1499));
    expect(result.current.status).toBe('speechDetected');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('No final speech result');
    expect(FakeRecognition.latest.abort).not.toHaveBeenCalled();
    expect(transcript).not.toHaveBeenCalled();
  });
  it('accepts a delayed final result after audio-end and onend', () => {
    vi.useFakeTimers();
    const transcript = vi.fn();
    const { result } = renderHook(() => useRecognition(transcript));
    act(() => result.current.start());
    const active = FakeRecognition.latest;
    act(() => active.onstart?.());
    act(() => active.onspeechstart?.());
    act(() => active.onaudioend?.());
    act(() => active.onend?.());
    expect(result.current.status).toBe('processing');
    act(() => vi.advanceTimersByTime(1200));
    act(() => active.onresult?.(resultEvent('bottle')));
    expect(result.current.status).toBe('success');
    expect(transcript).toHaveBeenCalledExactlyOnceWith('bottle', expect.any(String));
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.status).toBe('success');
    expect(vi.getTimerCount()).toBe(0);
  });
  it('does not report an early mobile onend as an immediate failure', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useRecognition(vi.fn()));
    act(() => result.current.start());
    act(() => FakeRecognition.latest.onend?.());
    expect(result.current.status).toBe('starting');
    act(() => vi.advanceTimersByTime(1499));
    expect(result.current.status).toBe('starting');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('could not start normally');
  });
  it('reports no speech only after an ended listening session exhausts its grace period', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useRecognition(vi.fn()));
    act(() => result.current.start());
    act(() => FakeRecognition.latest.onstart?.());
    act(() => FakeRecognition.latest.onend?.());
    expect(result.current.status).toBe('listening');
    act(() => vi.advanceTimersByTime(1500));
    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('No speech was detected');
  });
  it.each([
    ['starting', 5000], ['listening', 9000], ['processing', 5000],
  ])('times out %s and releases the native microphone session', (phase, milliseconds) => {
    vi.useFakeTimers();
    const transcript = vi.fn();
    const { result } = renderHook(() => useRecognition(transcript));
    act(() => result.current.start());
    if (phase === 'listening') act(() => FakeRecognition.latest.onstart?.());
    if (phase === 'processing') act(() => FakeRecognition.latest.onspeechend?.());
    act(() => vi.advanceTimersByTime(Number(milliseconds)));
    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain(phase === 'listening' ? 'No speech was detected' : 'timed out');
    expect(FakeRecognition.latest.abort).toHaveBeenCalledOnce();
    expect(transcript).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('lets native speech-end control normal recording and applies only a long safety timeout', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useRecognition(vi.fn()));
    act(() => result.current.start());
    act(() => FakeRecognition.latest.onspeechstart?.());
    act(() => vi.advanceTimersByTime(14999));
    expect(result.current.status).toBe('speechDetected');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('did not finish normally');
  });
  it('cleans recording callbacks and timers when the question unmounts', () => {
    vi.useFakeTimers();
    const transcript = vi.fn();
    const { result, unmount } = renderHook(() => useRecognition(transcript));
    act(() => result.current.start());
    const active = FakeRecognition.latest;
    const lateResult = active.onresult!;
    unmount();
    expect(active.abort).toHaveBeenCalledOnce();
    expect(active.onresult).toBeNull();
    expect(active.onspeechstart).toBeNull();
    expect(active.onaudioend).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    act(() => lateResult(resultEvent('late')));
    expect(transcript).not.toHaveBeenCalled();
  });
  it.each(['pagehide', 'visibilitychange'])('stops recording on %s and lets the user retry on return', event => {
    const transcript = vi.fn();
    const { result } = renderHook(() => useRecognition(transcript));
    act(() => result.current.start());
    if (event === 'visibilitychange') vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    act(() => (event === 'pagehide' ? window : document).dispatchEvent(new Event(event)));
    expect(FakeRecognition.latest.abort).toHaveBeenCalledOnce();
    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('left the page');
    expect(transcript).not.toHaveBeenCalled();
  });
  it('tolerates an already-stopped native abort during cleanup', () => {
    const { result, unmount } = renderHook(() => useRecognition(vi.fn()));
    act(() => result.current.start());
    FakeRecognition.latest.abort.mockImplementation(() => { throw new Error('already stopped'); });
    expect(unmount).not.toThrow();
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
    utterance.onerror?.({ error: 'synthesis-failed' } as SpeechSynthesisErrorEvent);
    expect(onError).toHaveBeenCalledTimes(2);
  });
  it('writes a development-only event timeline with relative times and cleanup reasons', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    const { result } = renderHook(() => useRecognition(vi.fn()));
    act(() => result.current.start());
    const active = FakeRecognition.latest;
    act(() => active.onstart?.());
    act(() => active.onaudiostart?.());
    act(() => active.onspeechstart?.());
    act(() => active.onspeechend?.());
    act(() => active.onresult?.(resultEvent('kettle')));
    const timeline = debug.mock.calls.map(call => String(call[0])).join('\n');
    expect(timeline).toMatch(/\[speech] .+ \d+ms click/);
    expect(timeline).toContain('recognition.start');
    expect(timeline).toContain('onstart');
    expect(timeline).toContain('onaudiostart');
    expect(timeline).toContain('onspeechstart');
    expect(timeline).toContain('onspeechend');
    expect(timeline).toContain('final-result');
    expect(timeline).toContain('cleanup:final-result');
  });
});
