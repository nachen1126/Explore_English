import { useCallback, useEffect, useRef, useState } from 'react';
export type SpeechStatus = 'idle' | 'starting' | 'listening' | 'processing' | 'success' | 'error';
interface RecognitionResult extends ArrayLike<{ transcript: string }> { isFinal: boolean }
interface RecognitionResultEvent { resultIndex: number; results: ArrayLike<RecognitionResult> }
interface RecognitionErrorEvent { error: string }
export interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: (() => void) | null;
  onaudiostart: (() => void) | null;
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
interface Session { recognition: Recognition; id: string; stopping: boolean }
let sessionSequence = 0;

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

  const clean = useCallback((abort = true) => {
    if (timeout.current !== null) clearTimeout(timeout.current);
    timeout.current = null;
    const session = activeSession.current;
    // Invalidate before touching the native instance: abort can synchronously emit events.
    activeSession.current = null;
    if (!session) return;
    const active = session.recognition;
    active.onstart = null; active.onaudiostart = null; active.onspeechend = null;
    active.onresult = null; active.onerror = null; active.onend = null; active.onaudioend = null;
    if (abort) {
      try { active.abort(); } catch { /* An already ended native session needs no further cleanup. */ }
    }
  }, []);
  const fail = useCallback((session: Session, message: string, abort = true) => {
    if (activeSession.current !== session) return;
    clean(abort);
    setStatus('error');
    setError(message);
  }, [clean]);
  const deadline = useCallback((session: Session, milliseconds: number, message: string) => {
    if (timeout.current !== null) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => fail(session, message), milliseconds);
  }, [fail]);
  const cancel = useCallback(() => {
    clean();
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
        recognition: active, stopping: false,
        id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${++sessionSequence}`,
      };
      activeSession.current = session;
      active.lang = 'en-GB';
      active.interimResults = false;
      active.continuous = false;
      const isCurrent = () => activeSession.current === session;
      const listening = () => {
        if (!isCurrent() || session.stopping) return;
        setStatus('listening');
        deadline(session, 15000, 'Listening timed out. Tap the microphone to retry, or type your answer.');
      };
      const processing = () => {
        if (!isCurrent()) return;
        setStatus('processing');
        deadline(session, 10000, 'Speech recognition timed out. Check your connection and retry, or type your answer.');
      };
      active.onstart = listening;
      active.onaudiostart = listening;
      active.onspeechend = processing;
      active.onaudioend = processing;
      active.onresult = event => {
        if (!isCurrent() || !Number.isInteger(event.resultIndex)) return;
        for (let index = Math.max(0, event.resultIndex); index < event.results.length; index++) {
          const result = event.results[index];
          if (!result?.isFinal) continue;
          const text = result[0]?.transcript?.trim() ?? '';
          if (!/[\p{L}\p{N}]/u.test(text)) {
            fail(session, 'No words were recognised. Speak clearly and retry, or type your answer.');
            return;
          }
          // A single final result resolves this recording. Saved or duplicate callbacks are stale.
          clean();
          setTranscript(text);
          setStatus('success');
          handler.current(text, session.id);
          return;
        }
      };
      active.onerror = event => fail(session, recognitionErrors[event.error] ?? 'Speech recognition failed. Retry, or type your answer.');
      active.onend = () => fail(session, 'No speech result was received. Tap the microphone to retry, or type your answer.', false);
      setStatus('starting');
      deadline(session, 30000, 'Microphone access timed out. Check the permission prompt and browser settings, then retry, or type your answer.');
      active.start();
    } catch (failure) {
      clean();
      setStatus('error');
      setError(failureMessage(failure));
    }
  }, [Constructor, unavailableReason, clean, deadline, fail]);
  const stop = useCallback(() => {
    const session = activeSession.current;
    if (!session || session.stopping) return;
    session.stopping = true;
    setStatus('processing');
    deadline(session, 10000, 'Speech recognition timed out. Check your connection and retry, or type your answer.');
    try { session.recognition.stop(); }
    catch { fail(session, 'Recording could not finish. Tap the microphone to retry, or type your answer.'); }
  }, [deadline, fail]);
  return { supported: !unavailableReason, unavailableReason, status, error, transcript, start, stop, cancel };
}
