import { useCallback, useEffect, useRef, useState } from 'react';
import type { VocabularyItem } from '../types';
import { speak } from '../speech';

export interface AudioPlaybackState {
  wordId: string;
  request: number;
  isPlaying: boolean;
  error: boolean;
}

export function AudioButton({ item, playback: autoPlayback }: { item: VocabularyItem; playback?: AudioPlaybackState }) {
  const [error, setError] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const playbackSequence = useRef(0);
  const previousItem = useRef(item.id);
  const externalRequest = useRef(0);
  const source = useRef<'idle' | 'external' | 'manual'>('idle');
  const play = useCallback(() => {
    const request = ++playbackSequence.current;
    source.current = 'manual';
    setError(false);
    setHasPlayed(true);
    setIsPlaying(false);
    const current = () => playbackSequence.current === request;
    const failed = () => {
      if (!current()) return;
      setIsPlaying(false);
      setError(true);
    };
    if (!speak(item.audioText, failed, {
      onStart: () => { if (current()) setIsPlaying(true); },
      onEnd: () => { if (current()) setIsPlaying(false); },
    })) failed();
  }, [item.audioText]);
  useEffect(() => {
    if (previousItem.current !== item.id) window.speechSynthesis?.cancel();
    previousItem.current = item.id;
    playbackSequence.current += 1;
    externalRequest.current = 0;
    source.current = 'idle';
    setError(false);
    setHasPlayed(false);
    setIsPlaying(false);
  }, [item.id]);
  useEffect(() => {
    if (!autoPlayback || autoPlayback.wordId !== item.id || autoPlayback.request <= 0) return;
    if (externalRequest.current !== autoPlayback.request) {
      externalRequest.current = autoPlayback.request;
      source.current = 'external';
      setHasPlayed(true);
    }
    if (source.current === 'external') {
      setIsPlaying(autoPlayback.isPlaying);
      setError(autoPlayback.error);
    }
  }, [autoPlayback, item.id]);
  return <div className="audio-control"><button className="button secondary audio-button" aria-label={`Play pronunciation of ${item.word}`}
    onClick={play}>
    <span aria-hidden="true">🔊</span> {hasPlayed ? '再次播放' : '播放发音'}</button>
    {isPlaying && <small className="audio-playing" role="status">正在播放...</small>}
    {error && <small role="status">Audio is unavailable in this browser.</small>}</div>;
}
export function WordCard({ item, onClose, playback }: { item: VocabularyItem; onClose?: () => void; playback?: AudioPlaybackState }) {
  return <section className="word-card" aria-label={`Word card: ${item.word}`}>
    <div className="word-card-top"><div><div className="word-heading-line"><h2>{item.word}</h2>
      {item.britishIPA && <span className="word-pronunciation">{item.britishIPA}</span>}</div>
      <p className="word-meta">{item.partOfSpeech}{item.britishIPA && <> <span aria-hidden="true">·</span> <span>UK</span></>}</p></div>
      {onClose && <button className="text-button" onClick={onClose} aria-label="Close word card">Close ×</button>}</div>
    <p className="meaning" lang="zh-CN">{item.chineseMeaning}</p><p className="example">{item.exampleSentence}</p>
    <AudioButton item={item} playback={playback} />
  </section>;
}
