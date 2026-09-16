import type { Scene, VocabularyItem } from '@shared';
import generatedCatalog from './catalog.generated.json';

export interface MiniappCategory {
  id: string;
  chineseTitle: string;
  title: string;
  description: string;
}

export interface MiniappScene extends Scene {
  categoryId: string;
  chineseTitle: string;
  imageAsset: string;
  thumbnailAsset: string;
}

type GeneratedScene = Scene & { categoryId: string; chineseTitle: string };
const generatedScenes = generatedCatalog.scenes as unknown as GeneratedScene[];

export const miniappScenes: MiniappScene[] = generatedScenes.map(scene => ({
  ...scene,
  imageAsset: `/assets/${scene.image}`,
  thumbnailAsset: `/assets/${scene.thumbnail}`,
}));
export const miniappSceneById = Object.fromEntries(miniappScenes.map(scene => [scene.id, scene])) as Record<string, MiniappScene>;
export const miniappVocabularyById = generatedCatalog.vocabulary as unknown as Record<string, VocabularyItem>;
export const miniappVocabulary = Object.values(miniappVocabularyById);
export const miniappCategories = generatedCatalog.categories as MiniappCategory[];

export const scenesForCategory = (categoryId: string) => miniappScenes.filter(scene => scene.categoryId === categoryId);
export const categoryById = (categoryId: string) => miniappCategories.find(category => category.id === categoryId);
export const sceneForVocabulary = (vocabularyId: string) => miniappScenes.find(scene => scene.vocabularyIds.includes(vocabularyId));
