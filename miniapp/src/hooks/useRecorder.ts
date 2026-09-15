import Taro, { useDidHide, useDidShow, useUnload } from '@tarojs/taro';
import { useCallback, useEffect, useRef, useState } from 'react';
import { recognizeRecording } from '../services/cloud';
import { requestRecordPermission } from '../services/record-permission';
import { AUTO_RECORD_DURATION_MS, RECORDING_WATCHDOG_MS, VoiceRecordingGuard } from '../services/recording-session';

export type RecorderState = 'idle' | 'listening' | 'processing' | 'error';

export function useRecorder(onRecognized: (text: string, recognitionId: string) => void) {
  const recorder = useRef<Taro.RecorderManager | null>(null);
  const recognizedCallback = useRef(onRecognized);
  const cancelled = useRef(false);
  const starting = useRef(false);
  const stopping = useRef(false);
  const currentRecognitionId = useRef('');
  const watchdog = useRef<ReturnType<typeof setTimeout> | null>(null);
  const guard = useRef(new VoiceRecordingGuard());
  const stateRef = useRef<RecorderState>('idle');
  const [state, setStateValue] = useState<RecorderState>('idle');
  const [transcript, setTranscript] = useState('');
  const [message, setMessage] = useState('');

  const setState = useCallback((next: RecorderState) => {
    stateRef.current = next;
    setStateValue(next);
  }, []);

  const clearWatchdog = useCallback(() => {
    if (watchdog.current) clearTimeout(watchdog.current);
    watchdog.current = null;
  }, []);

  const stopCurrentRecording = useCallback(() => {
    if (stateRef.current !== 'listening' || stopping.current) return;
    stopping.current = true;
    clearWatchdog();
    recorder.current?.stop();
  }, [clearWatchdog]);

  useEffect(() => { recognizedCallback.current = onRecognized; }, [onRecognized]);

  useEffect(() => {
    const manager = Taro.getRecorderManager();
    recorder.current = manager;
    const handleStop = async (result: Taro.RecorderManager.OnStopCallbackResult) => {
      clearWatchdog();
      stopping.current = false;
      const id = currentRecognitionId.current;
      const generation = guard.current.beginProcessing(id);
      if (cancelled.current || generation === null) {
        if (!cancelled.current) setState('idle');
        return;
      }
      setState('processing');
      setMessage('正在识别…');
      try {
        const response = await recognizeRecording(result.tempFilePath, id);
        if (!guard.current.isCurrent(id, generation) || cancelled.current) return;
        if (response.recognitionId !== id) throw new Error('语音识别返回了过期结果。');
        if (response.noSpeech || !response.text.trim()) {
          guard.current.finish(id, generation);
          setState('idle');
          setMessage('没听清，请再试一次。本次不计为答错。');
          return;
        }
        const text = response.text.trim();
        guard.current.finish(id, generation);
        setTranscript(text);
        setState('idle');
        setMessage(`识别结果：${text}`);
        recognizedCallback.current(text, id);
      } catch (error) {
        if (!guard.current.isCurrent(id, generation) || cancelled.current) return;
        guard.current.finish(id, generation);
        console.error('[Explore English][Recorder] speech recognition failed without scoring the answer.', error);
        setState('error');
        setMessage('语音识别暂时失败，请再试一次或使用文字输入。本次不计为答错。');
      }
    };
    const handleError = (error: TaroGeneral.CallbackResult) => {
      clearWatchdog();
      stopping.current = false;
      guard.current.cancel();
      if (cancelled.current) return;
      console.error('[Explore English][Recorder] recording failed without scoring the answer.', error);
      setState('error');
      const denied = /auth|permission|authorize/i.test(error.errMsg ?? '');
      setMessage(denied ? '麦克风权限被拒绝，请在小程序设置中允许录音，或使用文字输入。' : '录音失败，请再试一次。本次不计为答错。');
    };
    manager.onStop(handleStop);
    manager.onError(handleError);
    return () => {
      cancelled.current = true;
      clearWatchdog();
      guard.current.cancel();
      if (stateRef.current === 'listening') manager.stop();
    };
  }, [clearWatchdog, setState]);

  const cleanup = useCallback(() => {
    cancelled.current = true;
    starting.current = false;
    clearWatchdog();
    guard.current.cancel();
    if (stateRef.current === 'listening' && !stopping.current) {
      stopping.current = true;
      recorder.current?.stop();
    }
    currentRecognitionId.current = '';
    setState('idle');
  }, [clearWatchdog, setState]);
  useDidHide(cleanup);
  useUnload(cleanup);
  useDidShow(() => { cancelled.current = false; });

  const reset = useCallback(() => {
    clearWatchdog();
    guard.current.cancel();
    starting.current = false;
    if (stateRef.current === 'listening' && !stopping.current) {
      stopping.current = true;
      recorder.current?.stop();
    }
    currentRecognitionId.current = '';
    setTranscript('');
    setMessage('');
    setState('idle');
  }, [clearWatchdog, setState]);

  const start = useCallback(async () => {
    if (starting.current || stopping.current || stateRef.current === 'listening' || stateRef.current === 'processing') return;
    starting.current = true;
    cancelled.current = false;
    clearWatchdog();
    guard.current.cancel();
    setTranscript('');
    setMessage('');
    const authorized = await requestRecordPermission();
    if (!authorized) {
      starting.current = false;
      setState('error');
      setMessage('麦克风权限未授权，请在小程序设置中允许录音，或使用文字输入。');
      return;
    }
    if (cancelled.current) { starting.current = false; return; }
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    currentRecognitionId.current = id;
    guard.current.begin(id);
    setState('listening');
    setMessage('正在聆听…说完后会自动识别。');
    try {
      if (!recorder.current) throw new Error('RecorderManager is unavailable.');
      recorder.current?.start({
        duration: AUTO_RECORD_DURATION_MS,
        sampleRate: 16000,
        numberOfChannels: 1,
        encodeBitRate: 48000,
        format: 'mp3',
      });
      starting.current = false;
      watchdog.current = setTimeout(stopCurrentRecording, RECORDING_WATCHDOG_MS);
    } catch (error) {
      starting.current = false;
      guard.current.cancel();
      console.error('[Explore English][Recorder] recording could not start.', error);
      setState('error');
      setMessage('无法开始录音，请再试一次或使用文字输入。本次不计为答错。');
    }
  }, [clearWatchdog, setState, stopCurrentRecording]);

  return { state, transcript, message, start, reset };
}
