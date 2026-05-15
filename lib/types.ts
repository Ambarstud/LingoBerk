// Core flashcard type with SM-2 fields
export interface FlashCard {
  id: string;
  english: string;
  turkish: string;
  example: string;
  category: 'yds' | 'maritime' | 'daily' | 'academic';
  difficulty: 'A2' | 'B1' | 'B2' | 'C1';
  tags: string[];
  // SM-2 fields
  interval: number;
  repetition: number;
  easeFactor: number;
  nextReview: string;
  lastReview: string | null;
}

export interface StorageProvider {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
  clear(): void;
}

export interface UserStats {
  totalXP: number;
  todayXP: number;
  lastXPDate: string;
  cardsReviewed: number;
  exercisesCompleted: number;
  passagesRead: number;
  chatMessages: number;
  studyMinutes: number;
  totalWordsLearned: number;
  averageAccuracy: number;
}

export interface StreakData {
  currentStreak: number;
  bestStreak: number;
  lastActiveDate: string | null;
  calendar: Record<string, number>; // date string -> XP earned that day
}

export interface UserSettings {
  dailyGoal: number;
  darkMode: boolean;
  notifications: boolean;
  preferredProvider: 'claude' | 'gpt' | 'gemini';
}

export interface ExerciseResult {
  exerciseId: string;
  correct: boolean;
  userAnswer: string;
  timestamp: string;
  timeTaken: number;
}

export interface ReadingPassage {
  id: string;
  title: string;
  text: string;
  difficulty: 'B1' | 'B2' | 'C1';
  category: 'science' | 'social' | 'technology' | 'environment' | 'history' | 'maritime';
  questions: ReadingQuestion[];
  vocabulary: VocabularyItem[];
}

export interface ReadingQuestion {
  id: string;
  type: 'main_idea' | 'detail' | 'inference' | 'vocabulary_in_context' | 'author_purpose';
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface VocabularyItem {
  word: string;
  definition: string;
  turkishTranslation: string;
}

export interface ReadingResult {
  passageId: string;
  score: number;
  totalQuestions: number;
  completedAt: string;
  timeSpent: number;
}

export interface GrammarExercise {
  id: string;
  type: 'gap_fill' | 'sentence_completion' | 'error_correction' | 'sentence_rewriting';
  topic: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ConversationScenario {
  id: string;
  title: string;
  description: string;
  category: 'travel' | 'work' | 'social' | 'maritime' | 'academic' | 'daily';
  difficulty: 'A2' | 'B1' | 'B2';
  dialogues: { speaker: 'A' | 'B'; text: string; turkishTranslation: string }[];
  keyPhrases: { phrase: string; meaning: string; usage: string; examples: string[] }[];
  practicePrompts: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  corrections?: string;
}

export interface ChatConversation {
  id: string;
  messages: ChatMessage[];
  createdAt: string;
  provider: 'claude' | 'gpt' | 'gemini';
}

export interface GrammarTopicProgress {
  topicId: string;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
  lastPracticed: string;
}

export type FlashcardRating = 1 | 2 | 3 | 4;

export interface SessionResult {
  cardsReviewed: number;
  correct: number;
  xpEarned: number;
  duration: number;
}
