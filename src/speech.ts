import { useCallback, useEffect, useRef, useState } from 'react';
export type SpeechStatus = 'idle' | 'listening' | 'processing' | 'success' | 'error';
interface RecognitionResultEvent { results: ArrayLike<ArrayLike<{ transcript: string }>> }
interface RecognitionErrorEvent { error: string }
export interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
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
export function useRecognition(onTranscript: (text: string) => void) {
  const recognition = useRef<Recognition | null>(null);
  const handler = useRef(onTranscript);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [error, setError] = useState('');
  const Constructor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  useEffect(() => { handler.current = onTranscript; }, [onTranscript]);
  const clean = useCallback(() => {
    if (timeout.current) clearTimeout(timeout.current);
    const active = recognition.current;
    if (active) {
      active.onresult = null; active.onerror = null; active.onend = null; active.onaudioend = null;
      active.abort();
      recognition.current = null;
    }
  }, []);
  useEffect(() => clean, [clean]);
  function start() {
    if (!Constructor) return;
    clean();
    setError('');
    const active = new Constructor();
    recognition.current = active;
    active.lang = 'en-GB';
    active.interimResults = false;
    active.continuous = false;
    let received = false;
    active.onresult = event => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        received = true;
        setStatus('success');
        handler.current(transcript);
      } else { setStatus('error'); setError('No words were recognised. Try again or type your answer.'); }
    };
    active.onaudioend = () => { if (!received) setStatus('processing'); };
    active.onerror = event => {
      received = true;
      setStatus('error');
      setError(event.error === 'not-allowed' ? 'Microphone access was not allowed. You can type your answer.' : 'Speech could not be recognised. Try again or type your answer.');
    };
    active.onend = () => {
      if (timeout.current) clearTimeout(timeout.current);
      if (!received) { setStatus('error'); setError('No speech was received. Try again or type your answer.'); }
      recognition.current = null;
    };
    try {
      setStatus('listening');
      active.start();
      timeout.current = setTimeout(() => {
        clean(); setStatus('error'); setError('Listening timed out. Please try again or type your answer.');
      }, 15000);
    } catch { clean(); setStatus('error'); setError('The microphone could not start. You can type your answer.'); }
  }
  function stop() {
    if (recognition.current) { setStatus('processing'); recognition.current.stop(); }
  }
  function cancel() {
    clean();
    setStatus('idle');
    setError('');
  }
  return { supported: Boolean(Constructor), status, error, start, stop, cancel };
}
