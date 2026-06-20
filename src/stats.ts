import { StorageService } from './storage.js';
import { kbdFooter, primaryButton } from './ui/primitives.js';
import { SPACING_MINUTES } from './sm2.js';
import {
  Challenge,
  ChallengeProgress,
  DailyReviewStat,
  ReviewEntry,
  StreakState,
} from './types.js';

// --- date helpers (moved from stats/dates.ts) ---
export function toLocalDate(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toLocalDate(d.getTime());
}

function dateRange(endDate: string, count: number): string[] {
  const dates: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    dates.push(addDays(endDate, -i));
  }
  return dates;
}

// --- stats computation (moved from stats/compute.ts) ---
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

function pctBar(value: number, max: number, colorClass: string): string {
  const height = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return `<div class="stats-bar ${colorClass}" style="height: ${height}%"></div>`;
}

function heatmapIntensity(reviews: number, max: number): number {
  if (reviews === 0 || max === 0) return 0;
  return Math.min(4, Math.ceil((reviews / max) * 4));
}

function renderSummaryGrid(stats: ComputedStats): string {
  const { today, streak, dueNow, cardCounts } = stats;
  return `
    <div class="stats-summary-grid">
      <div class="stats-summary-cell">
        <span class="stats-summary-value">${today.reviews}</span>
        <span class="stats-summary-label">Today</span>
      </div>
      <div class="stats-summary-cell">
        <span class="stats-summary-value">${today.correctPct}%</span>
        <span class="stats-summary-label">Correct</span>
      </div>
      <div class="stats-summary-cell">
        <span class="stats-summary-value">${streak}</span>
        <span class="stats-summary-label">Streak</span>
      </div>
      <div class="stats-summary-cell">
        <span class="stats-summary-value">${dueNow}</span>
        <span class="stats-summary-label">Due</span>
      </div>
    </div>
    <p class="type-label-sm text-muted normal-case tracking-normal text-center">
      ${today.learning} learning · ${today.review} review today
    </p>`;
}

function renderCardCounts(counts: ComputedStats['cardCounts']): string {
  const segments = [
    { key: 'new', label: 'New', count: counts.new, color: 'stats-segment--new' },
    {
      key: 'learning',
      label: 'Learning',
      count: counts.learning,
      color: 'stats-segment--learning',
    },
    { key: 'young', label: 'Young', count: counts.young, color: 'stats-segment--young' },
    { key: 'mature', label: 'Mature', count: counts.mature, color: 'stats-segment--mature' },
  ];
  const bar = segments
    .filter((s) => s.count > 0)
    .map(
      (s) =>
        `<div class="stats-segment ${s.color}" style="flex: ${s.count}" title="${s.label}: ${s.count}"></div>`,
    )
    .join('');
  const legend = segments
    .map(
      (s) =>
        `<div class="stats-legend-item"><span class="stats-legend-dot ${s.color}"></span>${s.label} <span class="text-muted">${s.count}</span></div>`,
    )
    .join('');
  return `
    <div class="stats-section">
      <h3 class="stats-section-title">Card counts</h3>
      <div class="stats-stacked-bar">${bar || '<div class="stats-segment stats-segment--new" style="flex:1"></div>'}</div>
      <div class="stats-legend">${legend}</div>
      <p class="type-label-sm text-muted normal-case tracking-normal">${counts.total} cards total</p>
    </div>`;
}

function renderBarChart(
  title: string,
  items: { label: string; value: number }[],
  colorClass: string,
): string {
  const max = Math.max(...items.map((i) => i.value), 1);
  const bars = items
    .map(
      (i) => `
      <div class="stats-bar-col" title="${i.label}: ${i.value}">
        ${pctBar(i.value, max, colorClass)}
        <span class="stats-bar-label">${i.label}</span>
      </div>`,
    )
    .join('');
  return `
    <div class="stats-section">
      <h3 class="stats-section-title">${title}</h3>
      <div class="stats-bar-chart">${bars}</div>
    </div>`;
}

function renderHeatmap(calendar: ComputedStats['calendar']): string {
  const max = Math.max(...calendar.map((d) => d.reviews), 1);
  const cells = calendar
    .map((d) => {
      const intensity = heatmapIntensity(d.reviews, max);
      return `<div class="stats-heatmap-cell stats-heatmap-cell--${intensity}" title="${d.date}: ${d.reviews} reviews"></div>`;
    })
    .join('');
  return `
    <div class="stats-section">
      <h3 class="stats-section-title">Activity</h3>
      <div class="stats-heatmap-wrap">
        <div class="stats-heatmap">${cells}</div>
      </div>
      <p class="type-label-sm text-muted normal-case tracking-normal">Last 12 months · darker = more reviews</p>
    </div>`;
}

function renderBreakdown(title: string, rows: BreakdownRow[]): string {
  if (rows.length === 0) {
    return `
      <div class="stats-section">
        <h3 class="stats-section-title">${title}</h3>
        <p class="type-body-md text-muted">No data yet</p>
      </div>`;
  }
  const tableRows = rows
    .map(
      (r) => `
      <tr>
        <td class="stats-table-key">${r.key}</td>
        <td class="stats-table-num">${r.seen}</td>
        <td class="stats-table-num">${r.accuracy}%</td>
      </tr>`,
    )
    .join('');
  return `
    <div class="stats-section">
      <h3 class="stats-section-title">${title}</h3>
      <table class="stats-table">
        <thead><tr><th>Name</th><th>Seen</th><th>Acc</th></tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>`;
}

function renderHourly(hourly: ComputedStats['hourly']): string {
  const max = Math.max(...hourly.map((h) => h.reviews), 1);
  const bars = hourly
    .map((h) => {
      const label = h.hour % 6 === 0 ? String(h.hour) : '';
      return `
      <div class="stats-bar-col" title="${h.hour}:00 — ${h.reviews} reviews, ${h.correctPct}% correct">
        ${pctBar(h.reviews, max, 'stats-bar--accent')}
        <span class="stats-bar-label">${label}</span>
      </div>`;
    })
    .join('');
  return `
    <div class="stats-section">
      <h3 class="stats-section-title">Hourly (30 days)</h3>
      <div class="stats-bar-chart stats-bar-chart--dense">${bars}</div>
    </div>`;
}

export function renderStats(stats: ComputedStats): string {
  const futureDue = stats.futureDue.map((d) => ({
    label: d.date.slice(5),
    value: d.count,
  }));
  const reviewsChart = stats.reviewsOverTime.slice(-30).map((d) => ({
    label: d.date.slice(8),
    value: d.reviews,
  }));
  const intervalChart = stats.intervals.map((i) => ({
    label: i.label,
    value: i.count,
  }));

  const emptyNote = stats.hasHistory
    ? ''
    : `<p class="type-body-md text-muted text-center">Complete a few challenges to start building your stats.</p>`;

  return `
    <div id="challenge-wrapper" class="challenge-shell">
      <div class="flashcard stats-card p-lg flex flex-col gap-lg">
        <p class="challenge-label">Voortgang</p>
        <h2 class="type-headline-md text-ink text-center">Statistics</h2>
        ${emptyNote}
        ${renderSummaryGrid(stats)}
        ${renderCardCounts(stats.cardCounts)}
        ${renderBarChart('Future due (30 days)', futureDue, 'stats-bar--accent')}
        ${renderHeatmap(stats.calendar)}
        ${renderBarChart('Reviews (30 days)', reviewsChart, 'stats-bar--success')}
        ${intervalChart.length > 0 ? renderBarChart('Intervals', intervalChart, 'stats-bar--muted') : ''}
        ${renderHourly(stats.hourly)}
        ${renderBreakdown('By level', stats.breakdownByLevel)}
        ${renderBreakdown('By type', stats.breakdownByType)}
        ${primaryButton('stats-close', 'Terug')}
        ${kbdFooter([{ key: 'Esc', label: 'Close' }])}
      </div>
    </div>`;
}

export class StatsMode {
  private open = false;
  private overlay: HTMLElement | null = null;

  mount(storage: StorageService): void {
    const btn = document.getElementById('stats-btn');
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.open) return;
      void this.show(storage);
    });
  }

  async show(storage: StorageService): Promise<void> {
    if (this.open) return;
    this.open = true;

    const deck = storage.getDeck();
    const ignoredSet = new Set(storage.getIgnored());
    const activeDeck = deck.filter((c) => !ignoredSet.has(c.id));

    const stats = computeStats(
      activeDeck,
      storage.getProgress(),
      storage.getReviewDaily(),
      storage.getReviewLog(),
      storage.getStreak(),
    );

    const overlay = document.createElement('div');
    overlay.id = 'stats-overlay';
    overlay.className = 'stats-overlay animate-fade-in';
    overlay.tabIndex = -1;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `<div class="stats-overlay__panel w-full max-w-stats">${renderStats(stats)}</div>`;
    document.body.appendChild(overlay);
    this.overlay = overlay;
    overlay.focus();

    return new Promise((resolve) => {
      let closed = false;

      const cleanup = () => {
        if (closed) return;
        closed = true;
        document.removeEventListener('keydown', onDocumentCapture, true);
        document.removeEventListener('click', onDocumentCapture, true);
        overlay.remove();
        this.overlay = null;
        this.open = false;
        resolve();
      };

      const onDocumentCapture = (e: Event) => {
        if (!overlay.isConnected) return;

        if (e.type === 'keydown') {
          const key = (e as KeyboardEvent).key;
          if (key !== 'Escape') return;
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          cleanup();
          return;
        }

        const target = e.target as HTMLElement;
        if (target.closest('#stats-close') || target === overlay) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          cleanup();
        }
      };

      document.addEventListener('keydown', onDocumentCapture, true);
      document.addEventListener('click', onDocumentCapture, true);
    });
  }
}
