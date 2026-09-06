import type { Category, Scene, Topic, VocabularyItem } from './types';

export const categories: Category[] = [
  { id: 'sports-fitness', chineseTitle: '运动篇', title: 'Sports & Fitness', description: 'Words for moving, training and playing.' },
  { id: 'beauty-personal-care', chineseTitle: '美妆篇', title: 'Beauty & Personal Care', description: 'Explore everyday care and beauty routines.' },
  { id: 'food-dining', chineseTitle: '饮食篇', title: 'Food & Dining', description: 'From your kitchen to your favourite café.' },
  { id: 'animals', chineseTitle: '动物篇', title: 'Animals', description: 'Meet animals at home, on land and under the sea.' },
  { id: 'home-living', chineseTitle: '居家篇', title: 'Home & Living', description: 'Familiar spaces, useful words.' },
  { id: 'travel-transport', chineseTitle: '旅行篇', title: 'Travel & Transport', description: 'Find your way and explore new places.' },
  { id: 'study-work', chineseTitle: '学习与工作篇', title: 'Study & Work', description: 'Words for working and learning.' },
  { id: 'health-wellbeing', chineseTitle: '健康篇', title: 'Health & Wellbeing', description: 'Words for looking after your health.' },
];

const topicGroups: [string, [string, string, string][]][] = [
  ['sports-fitness', [['gym', 'Gym', '健身房'], ['yoga-studio', 'Yoga Studio', '瑜伽室'], ['running', 'Running', '跑步'], ['badminton', 'Badminton', '羽毛球'], ['outdoor-sports', 'Outdoor Sports', '户外运动']]],
  ['beauty-personal-care', [['dressing-table', 'Dressing Table', '化妆台'], ['skin-care', 'Skin Care', '护肤'], ['body-care', 'Body Care', '洗护'], ['hair-salon', 'Hair Salon', '美发']]],
  ['food-dining', [['kitchen', 'Kitchen', '厨房'], ['supermarket', 'Supermarket', '超市'], ['restaurant', 'Restaurant', '餐厅'], ['cafe', 'Café', '咖啡馆'], ['bakery', 'Bakery', '烘焙'], ['local-market', 'Local Market', '集市']]],
  ['animals', [['farm', 'Farm', '农场'], ['zoo', 'Zoo', '动物园'], ['underwater', 'Underwater World', '海洋动物'], ['pets', 'Pets', '宠物']]],
  ['home-living', [['living-room', 'Living Room', '客厅'], ['bedroom', 'Bedroom', '卧室'], ['bathroom', 'Bathroom', '浴室'], ['laundry-room', 'Laundry Room', '洗衣房']]],
  ['travel-transport', [['airport', 'Airport', '机场'], ['train-station', 'Train Station', '火车站'], ['metro-station', 'Metro Station', '地铁站'], ['hotel', 'Hotel', '酒店'], ['city-street', 'City Street', '城市街道'], ['park', 'Park', '公园'], ['camping', 'Camping', '露营'], ['beach', 'Beach', '海滩']]],
  ['study-work', [['office', 'Office', '办公室'], ['meeting-room', 'Meeting Room', '会议室'], ['classroom', 'Classroom', '教室'], ['library', 'Library', '图书馆']]],
  ['health-wellbeing', [['pharmacy', 'Pharmacy', '药房'], ['clinic', 'Clinic', '诊所'], ['hospital', 'Hospital', '医院']]],
];
export const topics: Topic[] = topicGroups.flatMap(([categoryId, entries]) =>
  entries.map(([id, title, chineseTitle]) => ({ id, title, chineseTitle, categoryId })),
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
export const getCategory = (id: string) => categories.find(category => category.id === id);
export const getSceneCategory = (scene: Scene) => getCategory(getTopic(scene.topicId)?.categoryId ?? '');
export const getCategoryScenes = (categoryId: string) => publishedScenes.filter(scene => getTopic(scene.topicId)?.categoryId === categoryId);
export const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`;
