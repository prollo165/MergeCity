import { MAX_TIER } from './tiers';

export const GRID = 6;
export const CELLS = GRID * GRID;

/** null = freies Grundstück, sonst die Stufe (1..MAX_TIER) */
export type Board = Array<number | null>;

export interface MergeEvent {
  /** Stufe, die neu entstanden ist */
  tier: number;
  /** Zellindex, an dem das neue Gebäude steht */
  at: number;
  /** wie viele Gebäude verschmolzen sind */
  merged: number;
  /** Punkte für diese Verschmelzung */
  points: number;
}

export interface PlaceResult {
  board: Board;
  events: MergeEvent[];
  points: number;
}

/** Punkte für ein neu entstandenes Gebäude der jeweiligen Stufe */
const POINTS: number[] = [0, 0, 12, 30, 75, 180, 420, 950, 2100, 4600, 9800, 20000, 42000, 88000, 180000, 400000];

export function pointsForTier(tier: number): number {
  return POINTS[Math.min(tier, MAX_TIER)] ?? 0;
}

export function emptyBoard(): Board {
  return new Array(CELLS).fill(null);
}

export function toXY(index: number): { x: number; y: number } {
  return { x: index % GRID, y: Math.floor(index / GRID) };
}

export function toIndex(x: number, y: number): number {
  return y * GRID + x;
}

export function inBounds(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < GRID && y < GRID;
}

export function neighbours(index: number): number[] {
  const { x, y } = toXY(index);
  const out: number[] = [];
  if (inBounds(x - 1, y)) out.push(toIndex(x - 1, y));
  if (inBounds(x + 1, y)) out.push(toIndex(x + 1, y));
  if (inBounds(x, y - 1)) out.push(toIndex(x, y - 1));
  if (inBounds(x, y + 1)) out.push(toIndex(x, y + 1));
  return out;
}

/** Alle zusammenhängenden Zellen gleicher Stufe (4er-Nachbarschaft) */
export function connectedGroup(board: Board, start: number, tier: number): number[] {
  if (board[start] !== tier) return [];
  const seen = new Set<number>([start]);
  const stack = [start];
  const group: number[] = [];
  while (stack.length) {
    const current = stack.pop()!;
    group.push(current);
    for (const n of neighbours(current)) {
      if (!seen.has(n) && board[n] === tier) {
        seen.add(n);
        stack.push(n);
      }
    }
  }
  return group;
}

/** Ab so vielen zusammenhängenden gleichen Gebäuden wird verschmolzen. */
export const MERGE_MIN = 2;

/**
 * Setzt ein Gebäude und löst alle Kettenreaktionen aus.
 *
 * Zwei zusammenhängende gleiche Gebäude ergeben die nächste Epoche; jedes
 * weitere Gebäude in der Gruppe bringt eine Epoche extra. Aus zwei Rundhütten
 * wird also ein Lehmhaus, aus drei Rundhütten gleich eine Steinkate. Der Neubau
 * entsteht dort, wo gebaut wurde, und kann sofort weiterverschmelzen: ein
 * Lehmhaus neben zwei Rundhütten wird darum ebenfalls zur Steinkate.
 */
export function placeAndResolve(board: Board, index: number, tier: number): PlaceResult {
  const next = board.slice();
  next[index] = tier;

  const events: MergeEvent[] = [];
  let points = 1;
  let current = tier;

  while (current < MAX_TIER) {
    const group = connectedGroup(next, index, current);
    if (group.length < MERGE_MIN) break;
    for (const cell of group) next[cell] = null;
    // Jedes Gebäude über das zweite hinaus überspringt eine weitere Epoche.
    current = Math.min(MAX_TIER, current + (group.length - 1));
    next[index] = current;
    const gained = pointsForTier(current);
    points += gained;
    events.push({ tier: current, at: index, merged: group.length, points: gained });
  }

  return { board: next, events, points };
}

/** Gibt es noch mindestens eine mögliche Aktion? */
export function hasFreeCell(board: Board): boolean {
  return board.some((cell) => cell === null);
}

export function isGameOver(board: Board, demolitions: number): boolean {
  return !hasFreeCell(board) && demolitions <= 0;
}

/** Höchste bislang gebaute Stufe */
export function highestTier(board: Board, tracked: number): number {
  return board.reduce<number>((max, cell) => (cell && cell > max ? cell : max), tracked);
}

// ---------------------------------------------------------------------------
// Nachschub
// ---------------------------------------------------------------------------

export interface Rng {
  (): number;
}

/**
 * Der Nachschub wird mit dem Fortschritt großzügiger: Wer schon in der Antike
 * baut, bekommt gelegentlich fertige Lehmhäuser statt nur Rundhütten.
 */
export function drawPiece(highest: number, rng: Rng = Math.random): number {
  const weights: Array<[number, number]> = [[1, 100]];
  if (highest >= 5) weights.push([2, 24]);
  if (highest >= 8) weights.push([3, 11]);
  if (highest >= 11) weights.push([4, 5]);

  const total = weights.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng() * total;
  for (const [tier, weight] of weights) {
    roll -= weight;
    if (roll <= 0) return tier;
  }
  return 1;
}

export function refillQueue(queue: number[], highest: number, length = 3, rng: Rng = Math.random): number[] {
  const next = queue.slice();
  while (next.length < length) next.push(drawPiece(highest, rng));
  return next;
}

/** Abrissbirnen: Startguthaben und Nachschub über verschmolzene Gebäude */
export const DEMOLITIONS_START = 2;
export const DEMOLITIONS_MAX = 5;
export const MERGES_PER_DEMOLITION = 10;
