import { Button, Text, View } from '@tarojs/components';
import { useState } from 'react';
import { playPronunciation } from '../services/cloud';
import { uiCopy } from '../ui/copy';

export function PronunciationButton({ vocabularyId, compact = false }: { vocabularyId: string; compact?: boolean }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function play() {
    if (status === 'loading') return;
    setStatus('loading'); setMessage('正在加载发音…');
    try {
      await playPronunciation(vocabularyId, error => {
        console.error('[Explore English][Pronunciation] playback was interrupted.', error);
        setStatus('error'); setMessage('播放中断，请检查设备音量后重试。');
      });
      setStatus('playing'); setMessage('正在播放…');
    } catch (error) {
      console.error('[Explore English][Pronunciation] user playback request failed.', error);
      setStatus('error');
      setMessage('暂时无法播放发音，请稍后重试。');
    }
  }

  return <View className={`pronunciation-control ${compact ? 'compact' : ''}`}>
    <Button className='button pronunciation-button' disabled={status === 'loading'} onClick={() => void play()}>
      🔊 {status === 'loading' ? uiCopy.loadingPronunciation : status === 'playing' ? uiCopy.playAgain : uiCopy.playPronunciation}
    </Button>
    {message ? <Text className={`pronunciation-status ${status === 'error' ? 'error' : ''}`}>{message}</Text> : null}
  </View>;
}
