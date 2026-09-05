import { useState } from 'react';
import type { VocabularyItem } from '../types';
import { speak } from '../speech';

export function AudioButton({ item }: { item: VocabularyItem }) {
  const [error, setError] = useState(false);
  const reportError = () => setError(true);
  return <><button className="button secondary audio-button" aria-label={`Play pronunciation of ${item.word}`}
    onClick={() => { setError(false); if (!speak(item.audioText, reportError)) reportError(); }}>
    <span aria-hidden="true">▷</span> Listen</button>
    {error && <small role="status">Audio is unavailable in this browser.</small>}</>;
}
export function WordCard({ item, onClose }: { item: VocabularyItem; onClose?: () => void }) {
  return <section className="word-card" aria-label={`Word card: ${item.word}`}>
    <div className="word-card-top"><div><h2>{item.word}</h2><p className="word-meta">{item.partOfSpeech}
      {item.britishIPA && <> <span aria-hidden="true">·</span> <span>{item.britishIPA}</span> <span className="small">UK</span></>}</p></div>
      {onClose && <button className="text-button" onClick={onClose} aria-label="Close word card">Close ×</button>}</div>
    <p className="meaning" lang="zh-CN">{item.chineseMeaning}</p><p className="example">{item.exampleSentence}</p>
    <AudioButton item={item} />
  </section>;
}
