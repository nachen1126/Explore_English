import { Text, View } from '@tarojs/components';
import type { VocabularyItem } from '@shared';

export function WordPanel({ item }: { item: VocabularyItem }) {
  return <View className='word-panel card'>
    <View className='word-heading'><Text className='word'>{item.word}</Text><Text className='ipa'>{item.britishIPA}</Text></View>
    <Text className='meaning'>{item.chineseMeaning}</Text>
    <Text className='example'>{item.exampleSentence}</Text>
  </View>;
}
