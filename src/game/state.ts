import {
  Board,
  DEMOLITIONS_MAX,
  DEMOLITIONS_START,
  MERGES_PER_DEMOLITION,
  MergeEvent,
  emptyBoard,
  highestTier,
  isGameOver,
  placeAndResolve,
  refillQueue,
} from './logic';

export interface GameState {
  board: Board;
  /** queue[0] ist das Gebäude, das gerade gebaut wird */
  queue: number[];
  score: number;
  best: number;
  demolitions: number;
  /** Zähler für den Nachschub an Abrissbirnen */
  mergeCount: number;
  highest: number;
  over: boolean;
  /** letzte Verschmelzungen – nur für Animationen/Feedback */
  lastEvents: MergeEvent[];
  /** wächst mit jedem Zug, erzwingt frische Animationen */
  moves: number;
}

export type GameAction =
  | { type: 'place'; index: number }
  | { type: 'demolish'; index: number }
  | { type: 'restart' }
  | { type: 'hydrate'; state: GameState };

export function createGame(best = 0): GameState {
  return {
    board: emptyBoard(),
    queue: refillQueue([], 1),
    score: 0,
    best,
    demolitions: DEMOLITIONS_START,
    mergeCount: 0,
    highest: 1,
    over: false,
    lastEvents: [],
    moves: 0,
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'hydrate':
      return action.state;

    case 'restart':
      return createGame(state.best);

    case 'place': {
      if (state.over) return state;
      if (state.board[action.index] !== null) return state;

      const tier = state.queue[0];
      const { board, events, points } = placeAndResolve(state.board, action.index, tier);

      const mergeCount = state.mergeCount + events.length;
      const earnedDemolitions = Math.floor(mergeCount / MERGES_PER_DEMOLITION) - Math.floor(state.mergeCount / MERGES_PER_DEMOLITION);
      const demolitions = Math.min(DEMOLITIONS_MAX, state.demolitions + earnedDemolitions);

      const highest = highestTier(board, state.highest);
      const queue = refillQueue(state.queue.slice(1), highest);
      const score = state.score + points;

      return {
        ...state,
        board,
        queue,
        score,
        best: Math.max(state.best, score),
        demolitions,
        mergeCount,
        highest,
        over: isGameOver(board, demolitions),
        lastEvents: events,
        moves: state.moves + 1,
      };
    }

    case 'demolish': {
      if (state.over) return state;
      if (state.demolitions <= 0) return state;
      if (state.board[action.index] === null) return state;

      const board = state.board.slice();
      board[action.index] = null;
      const demolitions = state.demolitions - 1;

      return {
        ...state,
        board,
        demolitions,
        over: isGameOver(board, demolitions),
        lastEvents: [],
        moves: state.moves + 1,
      };
    }

    default:
      return state;
  }
}
