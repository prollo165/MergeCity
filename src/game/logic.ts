import { MAX_TIER } from './tiers';

export const GRID = 5;
export const CELLS = GRID * GRID;

/** null = freies Grundstück, sonst die Stufe (1..MAX_TIER) */
export type Board = Array<number | null>;

/**
 * Baujahr jedes Grundstücks (0 = unbebaut). Beim Verschmelzen entsteht der
 * Neubau auf dem am längsten bebauten Grundstück der Gruppe – nicht dort, wo
 * gerade gesetzt wurde.
 */
export type Ages = number[];

export function emptyAges(): Ages {
  return new Array(CELLS).fill(0);
}

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
  ages: Ages;
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

/**
 * Das Viertel um ein Gebäude: alle Häuser, die über bebaute Nachbarn
 * miteinander verbunden sind – unabhängig von ihrer Stufe.
 */
export function district(board: Board, start: number): number[] {
  if (board[start] === null) return [];
  const seen = new Set<number>([start]);
  const stack = [start];
  const cells: number[] = [];
  while (stack.length) {
    const current = stack.pop()!;
    cells.push(current);
    for (const n of neighbours(current)) {
      if (!seen.has(n) && board[n] !== null) {
        seen.add(n);
        stack.push(n);
      }
    }
  }
  return cells;
}

/** Ab so vielen gleichen Gebäuden im Viertel wird verschmolzen. */
export const MERGE_MIN = 2;

/**
 * Setzt ein Gebäude und löst alle Kettenreaktionen aus.
 *
 * Verschmolzen wird innerhalb eines Viertels, also über zusammenhängende
 * Bebauung hinweg: Immer die niedrigste Stufe, die mindestens zweimal vorkommt,
 * wird zu einem Bau zusammengefasst. Zwei Rundhütten ergeben ein Lehmhaus, drei
 * gleich eine Steinkate – und zwei Rundhütten an einem Lehmhaus werden erst zum
 * zweiten Lehmhaus und dann zur Steinkate, ganz gleich, wie sie liegen.
 *
 * Der Neubau entsteht auf dem am längsten bebauten Grundstück der Gruppe.
 */
export function placeAndResolve(
  board: Board,
  ages: Ages,
  index: number,
  tier: number,
  stamp: number,
): PlaceResult {
  const nextBoard = board.slice();
  const nextAges = ages.slice();
  nextBoard[index] = tier;
  nextAges[index] = stamp;

  const events: MergeEvent[] = [];
  let points = 1;
  let focus = index;

  for (;;) {
    const cells = district(nextBoard, focus);

    // niedrigste Stufe suchen, die mindestens zweimal im Viertel steht
    let level: number | null = null;
    for (const cell of cells) {
      const value = nextBoard[cell]!;
      if (value >= MAX_TIER) continue;
      if (level !== null && value >= level) continue;
      const same = cells.filter((other) => nextBoard[other] === value);
      if (same.length >= MERGE_MIN) level = value;
    }
    if (level === null) break;

    const group = cells.filter((cell) => nextBoard[cell] === level);
    // Ältestes Grundstück gewinnt; bei gleichem Alter das niedrigere Feld.
    const anchor = group.reduce((oldest, cell) =>
      nextAges[cell] < nextAges[oldest] || (nextAges[cell] === nextAges[oldest] && cell < oldest) ? cell : oldest,
    );
    const anchorAge = nextAges[anchor];

    for (const cell of group) {
      nextBoard[cell] = null;
      nextAges[cell] = 0;
    }

    // Jedes Gebäude über das zweite hinaus überspringt eine weitere Epoche.
    const grown = Math.min(MAX_TIER, level + (group.length - 1));
    nextBoard[anchor] = grown;
    nextAges[anchor] = anchorAge;

    const gained = pointsForTier(grown);
    points += gained;
    events.push({ tier: grown, at: anchor, merged: group.length, points: gained });
    focus = anchor;
  }

  return { board: nextBoard, ages: nextAges, events, points };
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
