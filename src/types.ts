export interface Category {
  id: string;
  title: string;
  description: string;
}
export interface Topic {
  id: string;
  categoryId: string;
  title: string;
}
export interface VocabularyItem {
  id: string;
  word: string;
  partOfSpeech: string;
  britishIPA: string | null;
  chineseMeaning: string;
  exampleSentence: string;
  acceptedAnswers: string[];
  audioText: string;
  ipaSource?: string;
}
export interface Hotspot {
  vocabularyId: string;
  /** Normalized top-left and size in the original image, each in [0, 1]. */
  x: number;
  y: number;
  width: number;
  height: number;
  shape: 'rect' | 'ellipse';
}
export interface Scene {
  id: string;
  topicId: string;
  title: string;
  image: string;
  thumbnail: string;
  imageWidth: number;
  imageHeight: number;
  published: boolean;
  assetStatus: 'development' | 'final' | 'awaiting-artwork';
  vocabularyIds: string[];
  hotspots: Hotspot[];
  nextSceneId: string | null;
}
export interface SceneProgress {
  explored: string[];
  lastVisited: number;
}
export type QuestionMode = 'find' | 'produce';
export interface AnswerRecord {
  answer: string;
  correct: boolean;
  at: number;
  source: 'hotspot' | 'typing' | 'speech';
}
export interface ChallengeQuestion {
  id: string;
  vocabularyId: string;
  mode: QuestionMode;
  answers: AnswerRecord[];
}
export interface ChallengeAttempt {
  id: string;
  sceneId: string;
  kind: 'full' | 'weak';
  createdAt: number;
  completedAt: number | null;
  questions: ChallengeQuestion[];
}
export interface LearningState {
  schemaVersion: 2;
  scenes: Record<string, SceneProgress>;
  attempts: Record<string, ChallengeAttempt>;
}
