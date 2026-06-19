import { SPACING_MINUTES } from '../sm2.js';
import {
  Challenge,
  ChallengeProgress,
  DailyReviewStat,
  ReviewEntry,
  StreakState,
} from '../types.js';
import { dateRange, toLocalDate } from './dates.js';

export interface BreakdownRow {
  key: string;
  seen: number;
  reviews: number;
  correct: number;
  accuracy: number;
}

export interface ComputedStats {
  today: {
    reviews: number;
    correct: number;
    correctPct: number;
    learning: number;
    review: number;
  };
  streak: number;
  cardCounts: { new: number; learning: number; young: number; mature: number; total: number };
  dueNow: number;
  futureDue: { date: string; count: number }[];
  calendar: { date: string; reviews: number }[];
  reviewsOverTime: { date: string; reviews: number; correct: number }[];
  intervals: { label: string; count: number }[];
  breakdownByLevel: BreakdownRow[];
  breakdownByType: BreakdownRow[];
  hourly: { hour: number; reviews: number; correctPct: number }[];
  hasHistory: boolean;
}

function formatInterval(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  if (minutes < 43_200) return `${Math.round(minutes / 1440)}d`;
  return `${Math.round(minutes / 43_200)}mo`;
}

function cardState(intervalIndex: number | undefined): 'new' | 'learning' | 'young' | 'mature' {
  if (intervalIndex === undefined) return 'new';
  if (intervalIndex <= 2) return 'learning';
  if (intervalIndex <= 7) return 'young';
  return 'mature';
}

function buildBreakdown(
  deck: Challenge[],
  progress: Record<string, ChallengeProgress>,
  keyFn: (c: Challenge) => string,
): BreakdownRow[] {
  const buckets = new Map<string, { seen: number; reviews: number; correct: number }>();

  for (const card of deck) {
    const key = keyFn(card) || 'unknown';
    const p = progress[card.id];
    if (!p) continue;
    const bucket = buckets.get(key) ?? { seen: 0, reviews: 0, correct: 0 };
    bucket.seen++;
    bucket.reviews += p.attempts;
    bucket.correct += p.correct;
    buckets.set(key, bucket);
  }

  return [...buckets.entries()]
    .map(([key, b]) => ({
      key,
      seen: b.seen,
      reviews: b.reviews,
      correct: b.correct,
      accuracy: b.reviews > 0 ? Math.round((b.correct / b.reviews) * 100) : 0,
    }))
    .sort((a, b) => b.seen - a.seen);
}

export function computeStats(
  deck: Challenge[],
  progress: Record<string, ChallengeProgress>,
  reviewDaily: Record<string, DailyReviewStat>,
  reviewLog: ReviewEntry[],
  streak: StreakState,
  now = Date.now(),
): ComputedStats {
  const today = toLocalDate(now);

  const todayLog = reviewLog.filter((e) => toLocalDate(e.ts) === today);
  const todayDaily = reviewDaily[today];
  const todayReviews = todayDaily?.reviews ?? todayLog.length;
  const todayCorrect = todayDaily?.correct ?? todayLog.filter((e) => e.correct).length;
  const todayLearning = todayLog.filter((e) => e.intervalIndex <= 2).length;
  const todayReview = todayLog.filter((e) => e.intervalIndex > 2).length;

  const counts = { new: 0, learning: 0, young: 0, mature: 0, total: deck.length };
  let dueNow = 0;

  for (const card of deck) {
    const p = progress[card.id];
    const state = cardState(p?.intervalIndex);
    counts[state]++;
    if (!p || p.dontShowUntil <= now) dueNow++;
  }

  const futureDueMap = new Map<string, number>();
  const forecastDates = dateRange(today, 30);
  for (const d of forecastDates) futureDueMap.set(d, 0);

  for (const card of deck) {
    const p = progress[card.id];
    if (!p) continue;
    const dueDate = toLocalDate(p.dontShowUntil);
    if (futureDueMap.has(dueDate)) {
      futureDueMap.set(dueDate, (futureDueMap.get(dueDate) ?? 0) + 1);
    } else if (p.dontShowUntil <= now) {
      futureDueMap.set(today, (futureDueMap.get(today) ?? 0) + 1);
    }
  }

  const futureDue = forecastDates.map((date) => ({
    date,
    count: futureDueMap.get(date) ?? 0,
  }));

  const calendar = dateRange(today, 365).map((date) => ({
    date,
    reviews: reviewDaily[date]?.reviews ?? 0,
  }));

  const reviewsOverTime = dateRange(today, 90).map((date) => ({
    date,
    reviews: reviewDaily[date]?.reviews ?? 0,
    correct: reviewDaily[date]?.correct ?? 0,
  }));

  const intervalCounts = new Map<number, number>();
  for (const card of deck) {
    const p = progress[card.id];
    if (!p) continue;
    const idx = Math.min(p.intervalIndex, SPACING_MINUTES.length - 1);
    intervalCounts.set(idx, (intervalCounts.get(idx) ?? 0) + 1);
  }

  const intervals = [...intervalCounts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([idx, count]) => ({
      label: formatInterval(SPACING_MINUTES[idx]),
      count,
    }));

  const cutoff = now - 30 * 86_400_000;
  const recentLog = reviewLog.filter((e) => e.ts >= cutoff);
  const hourlyBuckets = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    reviews: 0,
    correct: 0,
  }));

  for (const entry of recentLog) {
    const hour = new Date(entry.ts).getHours();
    hourlyBuckets[hour].reviews++;
    if (entry.correct) hourlyBuckets[hour].correct++;
  }

  const hourly = hourlyBuckets.map((b) => ({
    hour: b.hour,
    reviews: b.reviews,
    correctPct: b.reviews > 0 ? Math.round((b.correct / b.reviews) * 100) : 0,
  }));

  const hasHistory = reviewLog.length > 0 || Object.keys(reviewDaily).length > 0;

  return {
    today: {
      reviews: todayReviews,
      correct: todayCorrect,
      correctPct: todayReviews > 0 ? Math.round((todayCorrect / todayReviews) * 100) : 0,
      learning: todayLearning,
      review: todayReview,
    },
    streak: streak.current,
    cardCounts: counts,
    dueNow,
    futureDue,
    calendar,
    reviewsOverTime,
    intervals,
    breakdownByLevel: buildBreakdown(deck, progress, (c) => c.level ?? 'unknown'),
    breakdownByType: buildBreakdown(deck, progress, (c) => c.type),
    hourly,
    hasHistory,
  };
}
