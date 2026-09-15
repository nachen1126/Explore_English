import { Text, View } from '@tarojs/components';
import type { VocabularyItem } from '@shared';
import { PronunciationButton } from './PronunciationButton';

export function WordPanel({ item }: { item: VocabularyItem }) {
  return <View className='word-panel card'>
    <View className='word-heading'><Text className='word'>{item.word}</Text><Text className='ipa'>{item.britishIPA}</Text></View>
    <Text className='part-of-speech'>{item.partOfSpeech} · UK</Text>
    <Text className='meaning'>{item.chineseMeaning}</Text>
    <Text className='example'>{item.exampleSentence}</Text>
    <PronunciationButton vocabularyId={item.id} />
  </View>;
}
