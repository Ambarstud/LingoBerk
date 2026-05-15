import type { FlashCard, FlashcardRating } from './types';

/**
 * SM-2 spaced repetition algorithm
 * Rating map: 1=Again(q=1), 2=Hard(q=2), 3=Good(q=3), 4=Easy(q=5)
 */
const RATING_TO_QUALITY: Record<FlashcardRating, number> = {
  1: 1,
  2: 2,
  3: 3,
  4: 5,
};

export function applyReview(card: FlashCard, rating: FlashcardRating): FlashCard {
  const q = RATING_TO_QUALITY[rating];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let { interval, repetition, easeFactor } = card;

  if (q < 3) {
    // Failed review — reset
    repetition = 0;
    interval = 1;
  } else {
    // Passed review
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetition += 1;
  }

  // Update ease factor
  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  );

  const nextReviewDate = new Date(today);
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return {
    ...card,
    interval,
    repetition,
    easeFactor,
    nextReview: nextReviewDate.toISOString().split('T')[0],
    lastReview: today.toISOString().split('T')[0],
  };
}

export function isDue(card: FlashCard): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const reviewDate = new Date(card.nextReview);
  reviewDate.setHours(0, 0, 0, 0);
  return reviewDate <= today;
}

export function getDueCards(cards: FlashCard[]): FlashCard[] {
  return cards.filter(isDue);
}

export function getNewCards(cards: FlashCard[]): FlashCard[] {
  return cards.filter((c) => c.repetition === 0 && c.lastReview === null);
}

export function getMasteredCards(cards: FlashCard[]): FlashCard[] {
  // Mastered = interval > 21 days
  return cards.filter((c) => c.interval > 21);
}

export function initCard(partial: Omit<FlashCard, 'interval' | 'repetition' | 'easeFactor' | 'nextReview' | 'lastReview'>): FlashCard {
  const today = new Date().toISOString().split('T')[0];
  return {
    ...partial,
    interval: 1,
    repetition: 0,
    easeFactor: 2.5,
    nextReview: today,
    lastReview: null,
  };
}
