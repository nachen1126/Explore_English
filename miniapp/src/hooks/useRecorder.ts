import Taro, { useDidHide, useDidShow, useUnload } from '@tarojs/taro';
import { useCallback, useEffect, useRef, useState } from 'react';
import { recognizeRecording } from '../services/cloud';
import { requestRecordPermission } from '../services/record-permission';

export type RecorderState = 'idle' | 'listening' | 'processing' | 'error';

export function useRecorder(onRecognized: (text: string, recognitionId: string) => void) {
  const recorder = useRef<Taro.RecorderManager | null>(null);
  const startedAt = useRef(0);
  const recognitionId = useRef('');
  const recognizedCallback = useRef(onRecognized);
  const cancelled = useRef(false);
  const [state, setState] = useState<RecorderState>('idle');
  const [transcript, setTranscript] = useState('');
  const [message, setMessage] = useState('');

  const stop = useCallback(() => {
    if (state !== 'listening') return;
    if (Date.now() - startedAt.current < 1200) {
      setMessage('请继续说话，录音至少保留 1.2 秒。');
      return;
    }
    recorder.current?.stop();
  }, [state]);

  useEffect(() => { recognizedCallback.current = onRecognized; }, [onRecognized]);

  useEffect(() => {
    const manager = Taro.getRecorderManager();
    recorder.current = manager;
    const handleStop = async (result: Taro.RecorderManager.OnStopCallbackResult) => {
      if (cancelled.current) { setState('idle'); return; }
      setState('processing'); setMessage('Processing…');
      try {
        const response = await recognizeRecording(result.tempFilePath, recognitionId.current);
        if (response.noSpeech || !response.text.trim()) {
          setState('idle'); setMessage('没有检测到语音，本次不计为答错。'); return;
        }
        setTranscript(response.text); setState('idle'); setMessage(`Recognized: ${response.text}`);
        recognizedCallback.current(response.text, response.recognitionId);
      } catch (error) {
        setState('error');
        setMessage(error instanceof Error ? `${error.message} 本次不计为答错。` : '语音识别失败，本次不计分。');
      }
    };
    const handleError = (error: TaroGeneral.CallbackResult) => {
      setState('error');
      const denied = /auth|permission|authorize/i.test(error.errMsg ?? '');
      setMessage(denied ? '麦克风权限被拒绝，请在小程序设置中允许录音，或使用文字输入。' : '录音失败，本次不计为答错。');
    };
    manager.onStop(handleStop); manager.onError(handleError);
    return () => { manager.stop(); };
  }, []);

  const cleanup = useCallback(() => { cancelled.current = true; recorder.current?.stop(); }, []);
  useDidHide(cleanup); useUnload(cleanup);
  useDidShow(() => { cancelled.current = false; });

  const start = useCallback(async () => {
    if (state === 'listening' || state === 'processing') return;
    cancelled.current = false;
    setTranscript(''); setMessage('');
    const authorized = await requestRecordPermission();
    if (!authorized) {
      setState('error');
      setMessage('麦克风权限未授权，请在小程序设置中允许录音，或使用文字输入。');
      return;
    }
    recognitionId.current = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    startedAt.current = Date.now(); setState('listening'); setMessage('Listening…');
    recorder.current?.start({ duration: 6000, sampleRate: 16000, numberOfChannels: 1, encodeBitRate: 48000, format: 'mp3' });
  }, [state]);

  return { state, transcript, message, start, stop };
}
