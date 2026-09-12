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
  phase: SessionPhase;
  started: boolean;
  speechSeen: boolean;
  ended: boolean;
}
let sessionSequence = 0;
const START_TIMEOUT = 5000;
const SPEECH_START_TIMEOUT = 9000;
const SPEECH_FINISH_TIMEOUT = 15000;
const RESULT_TIMEOUT = 5000;
const END_GRACE_PERIOD = 1500;

function elapsed(session: Session) {
  return `${Math.max(0, Math.round(performance.now() - session.clickedAt))}ms`;
}
function debugSpeech(session: Session, event: string, detail?: unknown) {
  if (!import.meta.env.DEV) return;
  const message = `[speech] ${session.id} ${elapsed(session)} ${event}`;
  if (detail === undefined) console.debug(message);
  else console.debug(message, detail);
}

// Recognition returns a transcript only. The answer form decides when to submit it.
export function useRecognition(onTranscript: (text: string, recognitionId: string) => void) {
  const activeSession = useRef<Session | null>(null);
  const handler = useRef(onTranscript);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [error, setError] = useState('');
  const [transcript, setTranscript] = useState('');
  const Constructor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  const unavailableReason = window.isSecureContext === false
    ? 'Voice answers require a secure connection. Open the HTTPS website, or type your answer.'
    : !Constructor ? 'Speech recognition is not available in this browser. Open this page in a browser with speech support, or type your answer.' : '';
  useEffect(() => { handler.current = onTranscript; }, [onTranscript]);

  const clean = useCallback((abort = true, reason = 'cleanup') => {
    if (timeout.current !== null) clearTimeout(timeout.current);
    timeout.current = null;
    const session = activeSession.current;
    // Invalidate before touching the native instance: abort can synchronously emit events.
    activeSession.current = null;
    if (!session) return;
    const active = session.recognition;
    debugSpeech(session, `cleanup:${reason}`, { abort, phase: session.phase });
    active.onstart = null; active.onaudiostart = null; active.onspeechstart = null; active.onspeechend = null;
    active.onresult = null; active.onerror = null; active.onend = null; active.onaudioend = null;
    if (abort) {
      try { active.abort(); debugSpeech(session, 'abort'); }
      catch { debugSpeech(session, 'abort:already-ended'); }
    }
  }, []);
  const fail = useCallback((session: Session, message: string, abort = true) => {
    if (activeSession.current !== session) return;
    session.phase = 'failed';
    debugSpeech(session, 'failed', message);
    clean(abort, 'failure');
    setStatus('error');
    setError(message);
  }, [clean]);
  const deadline = useCallback((session: Session, milliseconds: number, message: string, abort = true) => {
    if (timeout.current !== null) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => fail(session, message, abort), milliseconds);
  }, [fail]);
  const cancel = useCallback(() => {
    const session = activeSession.current;
    if (session) session.phase = 'cancelled';
    clean(true, 'cancel');
    setStatus('idle');
    setError('');
    setTranscript('');
  }, [clean]);

  useEffect(() => {
    function leavePage() {
      const session = activeSession.current;
      if (session) fail(session, 'Recording stopped because you left the page. Tap the microphone to retry, or type your answer.');
    }
    function visibilityChanged() { if (document.visibilityState === 'hidden') leavePage(); }
    window.addEventListener('pagehide', leavePage);
    document.addEventListener('visibilitychange', visibilityChanged);
    return () => {
      window.removeEventListener('pagehide', leavePage);
      document.removeEventListener('visibilitychange', visibilityChanged);
      clean();
    };
  }, [clean, fail]);

  const start = useCallback(() => {
    if (activeSession.current) return;
    const clickedAt = performance.now();
    setTranscript('');
    setError('');
    if (!Constructor || unavailableReason) {
      setStatus('error');
      setError(unavailableReason);
      return;
    }
    try {
      // Stay in the button's user gesture; no asynchronous permission preflight.
      window.speechSynthesis?.cancel();
      const active = new Constructor();
      const session: Session = {
        recognition: active,
        id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${++sessionSequence}`,
        clickedAt,
        phase: 'starting',
        started: false,
        speechSeen: false,
        ended: false,
      };
      activeSession.current = session;
      debugSpeech(session, 'click', { userAgent: navigator.userAgent });
      active.lang = 'en-GB';
      active.interimResults = true;
      active.continuous = false;
      const isCurrent = () => activeSession.current === session;
      const listening = (source: string) => {
        if (!isCurrent()) return;
        debugSpeech(session, source);
        if (session.ended) return;
        session.started = true;
        if (session.speechSeen) return;
        session.phase = 'listening';
        setStatus('listening');
        deadline(session, SPEECH_START_TIMEOUT, 'No speech was detected. Speak after the microphone starts, then retry, or type your answer.');
      };
      const speechDetected = (source: string) => {
        if (!isCurrent()) return;
        debugSpeech(session, source);
        if (session.ended) return;
        session.started = true;
        session.speechSeen = true;
        session.phase = 'speechDetected';
        setStatus('speechDetected');
        deadline(session, SPEECH_FINISH_TIMEOUT, 'Speech did not finish normally. Tap the microphone to retry, or type your answer.');
      };
      const processing = (source: string) => {
        if (!isCurrent()) return;
        debugSpeech(session, source);
        if (session.ended) return;
        if (source === 'onspeechend') {
          session.started = true;
          session.speechSeen = true;
        }
        session.phase = 'processing';
        setStatus('processing');
        deadline(session, RESULT_TIMEOUT, session.speechSeen
          ? 'Speech recognition timed out. Check your connection and retry, or type your answer.'
          : 'No speech was detected. Tap the microphone to retry, or type your answer.');
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
            debugSpeech(session, 'interim-result', text);
            if (/\p{L}|\p{N}/u.test(text)) speechDetected('interim-speech-detected');
            continue;
          }
          debugSpeech(session, 'final-result', text);
          if (!/[\p{L}\p{N}]/u.test(text)) {
            fail(session, 'No words were recognised. Speak clearly and retry, or type your answer.');
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
        debugSpeech(session, 'onerror', event.error);
        fail(session, recognitionErrors[event.error] ?? `Speech recognition failed (${event.error || 'unknown error'}). Retry, or type your answer.`);
      };
      active.onend = () => {
        if (!isCurrent()) return;
        debugSpeech(session, 'onend', { phase: session.phase });
        session.ended = true;
        const message = !session.started
          ? 'Recording could not start normally. Tap the microphone to retry, or type your answer.'
          : !session.speechSeen
            ? 'No speech was detected. Tap the microphone to retry, or type your answer.'
            : 'No final speech result was received. Tap the microphone to retry, or type your answer.';
        // Mobile WebKit/Chromium can emit end before delivering its final result.
        // Keep this session current and its callbacks attached during the grace period.
        deadline(session, END_GRACE_PERIOD, message, false);
      };
      setStatus('starting');
      debugSpeech(session, 'recognition.start');
      active.start();
      // Arm the timeout only after the native start call has run in this same
      // user-gesture stack. A synchronous onstart keeps its listening deadline.
      if (isCurrent() && session.phase === 'starting') {
        deadline(session, START_TIMEOUT, 'Microphone access timed out. Check the permission prompt and browser settings, then retry, or type your answer.');
      }
    } catch (failure) {
      clean(true, 'start-exception');
      setStatus('error');
      setError(failureMessage(failure));
    }
  }, [Constructor, unavailableReason, clean, deadline, fail]);
  return { supported: !unavailableReason, unavailableReason, status, error, transcript, start, cancel };
}
