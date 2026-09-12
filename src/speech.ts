import { useCallback, useEffect, useRef, useState } from 'react';
export type SpeechStatus = 'idle' | 'starting' | 'listening' | 'speechDetected' | 'processing' | 'success' | 'error';
interface RecognitionResult extends ArrayLike<{ transcript: string }> { isFinal: boolean }
interface RecognitionResultEvent { resultIndex: number; results: ArrayLike<RecognitionResult> }
interface RecognitionErrorEvent { error: string }
export interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: (() => void) | null;
  onaudiostart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onaudioend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionConstructor = new () => Recognition;
declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  }
}
export function speak(text: string, onError?: () => void): boolean {
  if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return false;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-GB';
  const voice = window.speechSynthesis.getVoices().find(item => item.lang.toLowerCase() === 'en-gb');
  if (voice) utterance.voice = voice;
  utterance.onerror = event => {
    if (event.error !== 'canceled' && event.error !== 'interrupted') onError?.();
  };
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}

const recognitionErrors: Record<string, string> = {
  'not-allowed': 'Microphone permission was denied. Allow microphone access in this site’s browser settings, then retry, or type your answer.',
  'service-not-allowed': 'The speech service is unavailable or disabled. Check your browser and device speech settings; in Safari, check Siri and Dictation. Retry or type your answer.',
  'no-speech': 'No speech was detected. Move closer to the microphone, then retry, or type your answer.',
  network: 'The speech service could not connect. Check your internet connection, then retry, or type your answer.',
  'audio-capture': 'The microphone could not be used. Check that it is connected and available, close other recording apps, then retry, or type your answer.',
  aborted: 'Recording was interrupted. Tap the microphone to retry, or type your answer.',
  'language-not-supported': 'This speech service does not support English recognition on this device. Check the device’s speech languages or type your answer.',
};
function failureMessage(error: unknown): string {
  const name = error && typeof error === 'object' && 'name' in error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return recognitionErrors['not-allowed'];
  if (name === 'NotFoundError') return recognitionErrors['audio-capture'];
  return 'The microphone could not start. Check microphone access in your browser settings, then retry, or type your answer.';
}
type SessionPhase = 'starting' | 'listening' | 'speechDetected' | 'processing' | 'resultReceived' | 'failed' | 'cancelled';
interface Session {
  recognition: Recognition;
  id: string;
  clickedAt: number;
  startedAt: number;
  phase: SessionPhase;
  started: boolean;
  speechSeen: boolean;
  ended: boolean;
  retryCount: number;
}
export interface SpeechDiagnostic { code: string; source: string; afterMs: number }
let sessionSequence = 0;
const START_TIMEOUT = 5000;
const SPEECH_START_TIMEOUT = 9000;
const SPEECH_FINISH_TIMEOUT = 15000;
const RESULT_TIMEOUT = 5000;
const END_GRACE_PERIOD = 1500;
const SPOKEN_END_GRACE_PERIOD = 3000;

function elapsed(session: Session) {
  return `${Math.max(0, Math.round(performance.now() - session.clickedAt))}ms`;
}
function debugRequested() {
  const page = new URLSearchParams(window.location.search).get('speechDebug') === '1';
  const hashQuery = window.location.hash.includes('?') ? window.location.hash.slice(window.location.hash.indexOf('?') + 1) : '';
  return page || new URLSearchParams(hashQuery).get('speechDebug') === '1';
}

// Recognition returns a transcript only. The answer form decides when to submit it.
export function useRecognition(onTranscript: (text: string, recognitionId: string) => void) {
  const activeSession = useRef<Session | null>(null);
  const handler = useRef(onTranscript);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  const [debugEnabled] = useState(debugRequested);
  const [debugTimeline, setDebugTimeline] = useState<string[]>([]);
  const [diagnostic, setDiagnostic] = useState<SpeechDiagnostic | null>(null);
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [error, setError] = useState('');
  const [transcript, setTranscript] = useState('');
  const Constructor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  const apiName = window.SpeechRecognition ? 'SpeechRecognition'
    : window.webkitSpeechRecognition ? 'webkitSpeechRecognition' : 'unavailable';
  const unavailableReason = window.isSecureContext === false
    ? 'Voice answers require a secure connection. Open the HTTPS website, or type your answer.'
    : !Constructor ? 'Speech recognition is not available in this browser. Open this page in a browser with speech support, or type your answer.' : '';
  useEffect(() => { handler.current = onTranscript; }, [onTranscript]);

  const appendLine = useCallback((line: string) => {
    if (debugEnabled && mounted.current) setDebugTimeline(current => [...current.slice(-119), line]);
  }, [debugEnabled]);
  const trace = useCallback((session: Session, event: string, detail?: unknown) => {
    const suffix = detail === undefined ? '' : `: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`;
    const line = `${elapsed(session)} ${event}${suffix}`;
    if (import.meta.env.DEV || debugEnabled) console.debug(`[speech] ${session.id} ${line}`);
    appendLine(line);
  }, [appendLine, debugEnabled]);
  const clean = useCallback((abort = true, reason = 'cleanup') => {
    if (timeout.current !== null) clearTimeout(timeout.current);
    timeout.current = null;
    const session = activeSession.current;
    // Invalidate before touching the native instance: abort can synchronously emit events.
    activeSession.current = null;
    if (!session) return;
    const active = session.recognition;
    trace(session, `cleanup: ${reason}`, { abort, phase: session.phase });
    active.onstart = null; active.onaudiostart = null; active.onspeechstart = null; active.onspeechend = null;
    active.onresult = null; active.onerror = null; active.onend = null; active.onaudioend = null;
    if (abort) {
      try { active.abort(); trace(session, `abort(): ${reason}`); }
      catch { trace(session, `abort() skipped: ${reason}`, 'already ended'); }
    }
  }, [trace]);
  const fail = useCallback((session: Session, message: string, options: {
    abort?: boolean; code: string; source: string;
  }) => {
    if (activeSession.current !== session) return;
    session.phase = 'failed';
    const afterMs = Math.max(0, Math.round(performance.now() - session.clickedAt));
    trace(session, `failure: ${options.code}`, `source=${options.source}`);
    clean(options.abort ?? true, `${options.source}:${options.code}`);
    if (mounted.current) setDiagnostic({ code: options.code, source: options.source, afterMs });
    setStatus('error');
    setError(message);
  }, [clean, trace]);
  const schedule = useCallback((session: Session, milliseconds: number, action: () => void) => {
    if (timeout.current !== null) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => {
      timeout.current = null;
      if (activeSession.current === session) action();
    }, milliseconds);
  }, []);
  const deadline = useCallback((session: Session, milliseconds: number, message: string, code: string, source: string, abort = true) => {
    const expire = () => {
      if (document.visibilityState === 'hidden') {
        trace(session, `${source} paused`, 'document hidden');
        schedule(session, milliseconds, expire);
        return;
      }
      fail(session, message, { abort, code, source });
    };
    schedule(session, milliseconds, expire);
  }, [fail, schedule, trace]);
  const cancel = useCallback(() => {
    const session = activeSession.current;
    if (session) session.phase = 'cancelled';
    clean(true, 'cancel');
    setStatus('idle');
    setError('');
    setTranscript('');
    setDiagnostic(null);
  }, [clean]);

  useEffect(() => {
    mounted.current = true;
    function pageHidden() {
      const session = activeSession.current;
      if (!session) return;
      trace(session, 'pagehide');
      session.phase = 'cancelled';
      clean(true, 'pagehide');
      setStatus('idle');
      setError('');
    }
    function visibilityChanged() {
      const session = activeSession.current;
      if (session) trace(session, `visibilitychange: ${document.visibilityState}`);
    }
    window.addEventListener('pagehide', pageHidden);
    document.addEventListener('visibilitychange', visibilityChanged);
    return () => {
      window.removeEventListener('pagehide', pageHidden);
      document.removeEventListener('visibilitychange', visibilityChanged);
      mounted.current = false;
      const session = activeSession.current;
      if (session) session.phase = 'cancelled';
      clean(true, 'component-unmount');
    };
  }, [clean, trace]);

  const start = useCallback(() => {
    if (activeSession.current) return;
    const clickedAt = performance.now();
    if (debugEnabled) setDebugTimeline([
      '0ms button click',
      `0ms userAgent: ${navigator.userAgent}`,
      `0ms secure context: ${String(window.isSecureContext)}`,
      `0ms API: ${apiName}`,
    ]);
    setTranscript('');
    setError('');
    setDiagnostic(null);
    if (!Constructor || unavailableReason) {
      setStatus('error');
      setError(unavailableReason);
      setDiagnostic({ code: !Constructor ? 'unsupported' : 'insecure-context', source: 'preflight', afterMs: 0 });
      return;
    }

    function beginSession(retryCount: number, trigger: string) {
      const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${++sessionSequence}`;
      let active: Recognition;
      try { active = new Constructor!(); }
      catch (failure) {
        const afterMs = Math.max(0, Math.round(performance.now() - clickedAt));
        const message = failureMessage(failure);
        if (debugEnabled) appendLine(`${afterMs}ms start-exception: ${failure instanceof Error ? failure.name : 'unknown'}`);
        setDiagnostic({ code: 'start-exception', source: 'constructor', afterMs });
        setStatus('error');
        setError(message);
        return;
      }
      const session: Session = {
        recognition: active,
        id,
        clickedAt,
        startedAt: performance.now(),
        phase: 'starting',
        started: false,
        speechSeen: false,
        ended: false,
        retryCount,
      };
      activeSession.current = session;
      trace(session, `session: ${session.id}`, { trigger, retryCount });
      active.lang = 'en-GB';
      active.interimResults = true;
      active.continuous = false;
      const isCurrent = () => activeSession.current === session;
      const listening = (source: string) => {
        if (!isCurrent()) return;
        trace(session, source);
        if (session.ended) return;
        session.started = true;
        if (session.speechSeen) return;
        session.phase = 'listening';
        setStatus('listening');
        deadline(session, SPEECH_START_TIMEOUT, 'No speech was detected. Speak after the microphone starts, then retry, or type your answer.', 'no-speech', 'listening-timeout');
      };
      const speechDetected = (source: string) => {
        if (!isCurrent()) return;
        trace(session, source);
        if (session.ended) return;
        session.started = true;
        session.speechSeen = true;
        session.phase = 'speechDetected';
        setStatus('speechDetected');
        deadline(session, SPEECH_FINISH_TIMEOUT, 'Speech did not finish normally. Tap the microphone to retry, or type your answer.', 'speech-timeout', 'speech-detected-timeout');
      };
      const processing = (source: string) => {
        if (!isCurrent()) return;
        trace(session, source);
        if (session.ended) return;
        if (source === 'onspeechend') {
          session.started = true;
          session.speechSeen = true;
        }
        session.phase = 'processing';
        setStatus('processing');
        deadline(session, RESULT_TIMEOUT, session.speechSeen
          ? 'Speech recognition timed out. Check your connection and retry, or type your answer.'
          : 'No speech was detected. Tap the microphone to retry, or type your answer.',
        session.speechSeen ? 'result-timeout' : 'no-speech', source);
      };
      const retryPremature = (code: 'premature-end' | 'premature-aborted', source: string) => {
        if (!isCurrent() || session.retryCount >= 1 || document.visibilityState !== 'visible') return false;
        trace(session, `auto-restart: ${code}`, `source=${source}`);
        session.phase = 'cancelled';
        clean(false, `auto-restart:${code}`);
        setStatus('starting');
        setError('');
        beginSession(session.retryCount + 1, code);
        return true;
      };
      active.onstart = () => listening('onstart');
      active.onaudiostart = () => listening('onaudiostart');
      active.onspeechstart = () => speechDetected('onspeechstart');
      active.onspeechend = () => processing('onspeechend');
      active.onaudioend = () => processing('onaudioend');
      active.onresult = event => {
        if (!isCurrent() || !Number.isInteger(event.resultIndex)) return;
        for (let index = Math.max(0, event.resultIndex); index < event.results.length; index++) {
          const result = event.results[index];
          const text = result[0]?.transcript?.trim() ?? '';
          if (!result?.isFinal) {
            trace(session, 'interim result', text);
            if (/\p{L}|\p{N}/u.test(text)) speechDetected('interim-speech-detected');
            continue;
          }
          trace(session, 'final result', text);
          if (!/[\p{L}\p{N}]/u.test(text)) {
            fail(session, 'No words were recognised. Speak clearly and retry, or type your answer.', { code: 'empty-result', source: 'onresult' });
            return;
          }
          // A single final result resolves this recording. Saved or duplicate callbacks are stale.
          session.phase = 'resultReceived';
          clean(false, 'final-result');
          setTranscript(text);
          setStatus('success');
          handler.current(text, session.id);
          return;
        }
      };
      active.onerror = event => {
        if (!isCurrent()) return;
        const code = event.error || 'unknown-error';
        trace(session, 'onerror', code);
        const prematureAbort = code === 'aborted' && !session.speechSeen
          && performance.now() - session.startedAt < 2000;
        if (prematureAbort) {
          trace(session, 'premature-aborted', `phase=${session.phase}`);
          const resolveAbort = () => {
            if (!isCurrent()) return;
            if (document.visibilityState === 'hidden') {
              trace(session, 'premature-aborted waiting', 'document hidden');
              schedule(session, 500, resolveAbort);
              return;
            }
            if (!retryPremature('premature-aborted', 'onerror')) {
              fail(session, 'Recording ended unexpectedly while starting. Tap the microphone to retry, or type your answer.', {
                code: 'premature-aborted', source: 'onerror', abort: false,
              });
            }
          };
          resolveAbort();
          return;
        }
        fail(session, recognitionErrors[code] ?? `Speech recognition failed (${code}). Retry, or type your answer.`, {
          code, source: 'onerror',
        });
      };
      active.onend = () => {
        if (!isCurrent()) return;
        trace(session, 'onend', { phase: session.phase });
        session.ended = true;
        if (session.speechSeen) {
          session.phase = 'processing';
          setStatus('processing');
        }
        const resolveEnd = () => {
          if (!isCurrent()) return;
          if (document.visibilityState === 'hidden') {
            trace(session, 'onend waiting', 'document hidden');
            schedule(session, 500, resolveEnd);
            return;
          }
          if (!session.started && retryPremature('premature-end', 'onend')) return;
          const message = !session.started
            ? 'Recording could not start normally. Tap the microphone to retry, or type your answer.'
            : !session.speechSeen
              ? 'No speech was detected. Tap the microphone to retry, or type your answer.'
              : 'No final speech result was received. Tap the microphone to retry, or type your answer.';
          fail(session, message, {
            code: !session.started ? 'premature-end' : !session.speechSeen ? 'no-speech' : 'missing-final-result',
            source: 'onend', abort: false,
          });
        };
        schedule(session, session.speechSeen ? SPOKEN_END_GRACE_PERIOD : END_GRACE_PERIOD, resolveEnd);
      };
      setStatus('starting');
      trace(session, 'recognition.start()');
      try { active.start(); }
      catch (failure) {
        const message = failureMessage(failure);
        trace(session, 'start-exception', failure instanceof Error ? failure.name : 'unknown');
        fail(session, message, { code: 'start-exception', source: 'recognition.start' });
        return;
      }
      // Arm the timeout only after the native start call has run in this same
      // user-gesture stack. A synchronous onstart keeps its listening deadline.
      if (isCurrent() && session.phase === 'starting') {
        deadline(session, START_TIMEOUT, 'Microphone access timed out. Check the permission prompt and browser settings, then retry, or type your answer.', 'start-timeout', 'starting-timeout');
      }
    }
    // No await, promise, timeout or permission preflight may precede this call.
    window.speechSynthesis?.cancel();
    beginSession(0, 'button-click');
  }, [Constructor, unavailableReason, apiName, appendLine, clean, deadline, debugEnabled, fail, schedule, trace]);
  return {
    supported: !unavailableReason, unavailableReason, status, error, transcript, start, cancel,
    debugEnabled, debugTimeline, diagnostic,
    debugInfo: { userAgent: navigator.userAgent, isSecureContext: window.isSecureContext, apiName },
  };
}
