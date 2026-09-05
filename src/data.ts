import type { Category, Scene, Topic, VocabularyItem } from './types';

export const categories: Category[] = [
  { id: 'everyday-life', title: 'Everyday Life', description: 'Familiar spaces, useful words.' },
  { id: 'food-shopping', title: 'Food & Shopping', description: 'From your morning coffee to the weekly shop.' },
  { id: 'travel-transport', title: 'Travel & Transport', description: 'Find your way with confidence.' },
  { id: 'work-study', title: 'Work & Study', description: 'Words for working and learning.' },
  { id: 'health-fitness', title: 'Health & Fitness', description: 'Look after yourself, one word at a time.' },
  { id: 'nature-leisure', title: 'Nature & Leisure', description: 'A little further from the everyday.' },
];

const topicGroups: [string, [string, string][]][] = [
  ['everyday-life', [['kitchen', 'Kitchen'], ['living-room', 'Living Room'], ['bedroom', 'Bedroom'], ['bathroom', 'Bathroom'], ['laundry-room', 'Laundry Room']]],
  ['food-shopping', [['supermarket', 'Supermarket'], ['restaurant', 'Restaurant'], ['cafe', 'Café'], ['bakery', 'Bakery'], ['local-market', 'Local Market']]],
  ['travel-transport', [['airport', 'Airport'], ['train-station', 'Train Station'], ['metro-station', 'Metro Station'], ['hotel', 'Hotel'], ['city-street', 'City Street']]],
  ['work-study', [['office', 'Office'], ['meeting-room', 'Meeting Room'], ['classroom', 'Classroom'], ['library', 'Library']]],
  ['health-fitness', [['gym', 'Gym'], ['pharmacy', 'Pharmacy'], ['clinic', 'Clinic'], ['hospital', 'Hospital']]],
  ['nature-leisure', [['park', 'Park'], ['camping', 'Camping'], ['beach', 'Beach'], ['outdoor-sports', 'Outdoor Sports'], ['underwater', 'Underwater World']]],
];
export const topics: Topic[] = topicGroups.flatMap(([categoryId, entries]) =>
  entries.map(([id, title]) => ({ id, title, categoryId })),
);

// Each ready scene is curated independently in content.ts; plans never inherit words or hotspots.
import { readyScenes, readyVocabulary } from './content';
export const vocabulary: Record<string, VocabularyItem> = Object.fromEntries(
  readyVocabulary.map(item => [item.id, item]),
);
export function assembleScenes(available: Scene[], plannedTopics: Topic[]): Scene[] {
  return [...available, ...plannedTopics.filter(topic => !available.some(scene => scene.topicId === topic.id)).map<Scene>(topic => ({
  id: `${topic.id}-1`,
  topicId: topic.id,
  title: topic.title,
  image: `scenes/${topic.id}-01.webp`,
  thumbnail: `scenes/${topic.id}-01-thumb.webp`,
  imageWidth: 1536,
  imageHeight: 1024,
  published: false,
  assetStatus: 'awaiting-artwork',
  vocabularyIds: [],
  hotspots: [],
  nextSceneId: null,
  }))];
}
export const scenes = assembleScenes(readyScenes, topics);
export const getScene = (id: string) => scenes.find(scene => scene.id === id && scene.published);
export const getTopic = (id: string) => topics.find(topic => topic.id === id);
export const publishedScenes = scenes.filter(scene => scene.published);
export const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`;
