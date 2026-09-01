import AsyncStorage from '@react-native-async-storage/async-storage';
import { CELLS } from './logic';
import { MAX_TIER } from './tiers';
import { GameState, createGame } from './state';

const STATE_KEY = 'mergecity.state.v1';
const SEEN_INTRO_KEY = 'mergecity.intro.v1';

/** Speichert den Spielstand, damit die Stadt eine App-Pause übersteht. */
export async function saveGame(state: GameState): Promise<void> {
  try {
    const payload = {
      board: state.board,
      ages: state.ages,
      queue: state.queue,
      score: state.score,
      best: state.best,
      demolitions: state.demolitions,
      mergeCount: state.mergeCount,
      highest: state.highest,
      over: state.over,
    };
    await AsyncStorage.setItem(STATE_KEY, JSON.stringify(payload));
  } catch {
    // Ein verlorener Spielstand ist ärgerlich, aber kein Grund abzustürzen.
  }
}

function isValidBoard(value: unknown): value is Array<number | null> {
  return (
    Array.isArray(value) &&
    value.length === CELLS &&
    value.every((cell) => cell === null || (typeof cell === 'number' && cell >= 1 && cell <= MAX_TIER))
  );
}

export async function loadGame(): Promise<GameState | null> {
  try {
    const raw = await AsyncStorage.getItem(STATE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!isValidBoard(data?.board)) return null;
    if (!Array.isArray(data.queue) || data.queue.length === 0) return null;

    const ages = Array.isArray(data.ages) && data.ages.length === CELLS ? data.ages.map((a: unknown) => Number(a) || 0) : undefined;

    const base = createGame(Number(data.best) || 0);
    return {
      ...base,
      board: data.board,
      ages: ages ?? base.ages,
      queue: data.queue.map((t: unknown) => Number(t) || 1),
      score: Number(data.score) || 0,
      best: Math.max(Number(data.best) || 0, Number(data.score) || 0),
      demolitions: Number(data.demolitions) || 0,
      mergeCount: Number(data.mergeCount) || 0,
      highest: Number(data.highest) || 1,
      over: Boolean(data.over),
    };
  } catch {
    return null;
  }
}

export async function loadIntroSeen(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(SEEN_INTRO_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function markIntroSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(SEEN_INTRO_KEY, '1');
  } catch {
    // egal
  }
}
