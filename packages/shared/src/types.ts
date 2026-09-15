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
  ipaSources?: string[];
}

export interface Hotspot {
  vocabularyId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: 'rect' | 'ellipse' | 'polygon';
  points?: [number, number][];
}

export interface Scene {
  id: string;
  topicId: string;
  title: string;
  image: string;
  thumbnail: string;
  imageWidth: number;
  imageHeight: number;
  imageVersion: string;
  hotspotImageVersion: string | null;
  published: boolean;
  assetStatus: 'development' | 'final' | 'awaiting-artwork';
  vocabularyIds: string[];
  hotspots: Hotspot[];
  nextSceneId: string | null;
}

export type QuestionMode = 'find' | 'produce';
export type AnswerSource = 'hotspot' | 'typing' | 'speech';

export interface AnswerRecord {
  answer: string;
  correct: boolean;
  at: number;
  source: AnswerSource;
  recognitionId?: string;
}

export interface ChallengeQuestion {
  id: string;
  vocabularyId: string;
  mode: QuestionMode;
  answers: AnswerRecord[];
  revealedAt?: number;
  answerRequiredAfterReveal?: true;
}

export interface ChallengeAttempt {
  attemptId: string;
  sceneId: string;
  kind: 'full' | 'weak';
  questions: ChallengeQuestion[];
  startedAt: number;
  completedAt: number | null;
}

export interface SceneProgress {
  sceneId: string;
  discoveredVocabularyIds: string[];
  completed: boolean;
  updatedAt: number;
  schemaVersion: 1;
}

export interface LearningSnapshot {
  schemaVersion: 1;
  progress: Record<string, SceneProgress>;
  attempts: Record<string, ChallengeAttempt>;
}
