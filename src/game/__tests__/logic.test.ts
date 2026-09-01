import assert from 'node:assert/strict';
import test from 'node:test';

import {
  Ages,
  Board,
  CELLS,
  drawPiece,
  emptyAges,
  emptyBoard,
  isGameOver,
  placeAndResolve,
  refillQueue,
  toIndex,
} from '../logic';
import { createGame, gameReducer } from '../state';
import { MAX_TIER } from '../tiers';

/** Baut ein Testfeld: Gebäude in der Reihenfolge, in der sie gesetzt wurden. */
function city(entries: Array<{ x: number; y: number; tier: number }>): { board: Board; ages: Ages } {
  const board = emptyBoard();
  const ages = emptyAges();
  entries.forEach((entry, i) => {
    const index = toIndex(entry.x, entry.y);
    board[index] = entry.tier;
    ages[index] = i + 1;
  });
  return { board, ages };
}

test('zwei Rundhütten werden zum Lehmhaus', () => {
  const { board, ages } = city([{ x: 0, y: 0, tier: 1 }]);

  const result = placeAndResolve(board, ages, toIndex(1, 0), 1, 2);

  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].tier, 2);
});

test('der Neubau steht auf dem älteren Grundstück, nicht auf dem neuen', () => {
  const { board, ages } = city([{ x: 3, y: 2, tier: 1 }]);
  const old = toIndex(3, 2);
  const fresh = toIndex(4, 2);

  const result = placeAndResolve(board, ages, fresh, 1, 2);

  assert.equal(result.board[old], 2, 'das Lehmhaus steht auf dem alten Grundstück');
  assert.equal(result.board[fresh], null, 'das gerade bebaute Feld ist wieder frei');
  assert.equal(result.events[0].at, old);
  assert.equal(result.ages[old], 1, 'das Grundstück behält sein Baujahr');
});

test('drei Rundhütten überspringen eine Epoche', () => {
  const { board, ages } = city([
    { x: 0, y: 0, tier: 1 },
    { x: 2, y: 0, tier: 1 },
  ]);

  const result = placeAndResolve(board, ages, toIndex(1, 0), 1, 3);

  assert.equal(result.board[toIndex(0, 0)], 3, 'der Neubau steht auf der ältesten Hütte');
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].merged, 3);
});

test('zwei Rundhütten an einem Lehmhaus ergeben eine Steinkate – auch gegenüberliegend', () => {
  // [1][2][1] – die beiden Hütten berühren sich nicht, nur das Lehmhaus.
  const { board, ages } = city([
    { x: 1, y: 1, tier: 2 },
    { x: 0, y: 1, tier: 1 },
  ]);

  const result = placeAndResolve(board, ages, toIndex(2, 1), 1, 3);

  assert.equal(result.board[toIndex(1, 1)], 3, 'die Steinkate steht auf dem ältesten Grundstück');
  assert.deepEqual(
    result.events.map((event) => event.tier),
    [2, 3],
  );
});

test('eine einzelne Hütte neben einem Lehmhaus verschmilzt nicht', () => {
  const { board, ages } = city([{ x: 1, y: 1, tier: 2 }]);

  const result = placeAndResolve(board, ages, toIndex(2, 1), 1, 2);

  assert.equal(result.events.length, 0);
  assert.equal(result.board[toIndex(2, 1)], 1);
  assert.equal(result.board[toIndex(1, 1)], 2);
});

test('diagonale Nachbarn gehören nicht zum Viertel', () => {
  const { board, ages } = city([{ x: 0, y: 0, tier: 1 }]);

  const result = placeAndResolve(board, ages, toIndex(1, 1), 1, 2);

  assert.equal(result.events.length, 0);
});

test('eine Kette aus verschiedenen Stufen löst eine lange Reaktion aus', () => {
  // Viertel mit je einem Bau der Stufen 1, 2 und 3 – eine weitere Hütte zündet alles.
  const { board, ages } = city([
    { x: 3, y: 0, tier: 3 },
    { x: 2, y: 0, tier: 2 },
    { x: 1, y: 0, tier: 1 },
  ]);

  const result = placeAndResolve(board, ages, toIndex(0, 0), 1, 4);

  assert.deepEqual(
    result.events.map((event) => event.tier),
    [2, 3, 4],
  );
  assert.equal(result.board[toIndex(3, 0)], 4, 'der Turm wächst auf dem ältesten Grundstück');
});

test('die letzte Epoche ist das Ende der Leiter', () => {
  const { board, ages } = city([{ x: 0, y: 0, tier: MAX_TIER }]);

  const result = placeAndResolve(board, ages, toIndex(1, 0), MAX_TIER, 2);

  assert.equal(result.events.length, 0);
  assert.equal(result.board[toIndex(0, 0)], MAX_TIER);
  assert.equal(result.board[toIndex(1, 0)], MAX_TIER);
});

test('große Gruppen springen höchstens bis zur letzten Epoche', () => {
  const { board, ages } = city([
    { x: 0, y: 0, tier: MAX_TIER - 1 },
    { x: 2, y: 0, tier: MAX_TIER - 1 },
    { x: 1, y: 1, tier: MAX_TIER - 1 },
  ]);

  const result = placeAndResolve(board, ages, toIndex(1, 0), MAX_TIER - 1, 4);

  assert.equal(result.board[toIndex(0, 0)], MAX_TIER);
});

test('das Raster ist fünf mal fünf Felder groß', () => {
  assert.equal(CELLS, 25);
  assert.equal(emptyBoard().length, 25);
  assert.equal(emptyAges().length, 25);
});

test('Spielende erst ohne Platz und ohne Abrissbirne', () => {
  const full = new Array(CELLS).fill(1);

  assert.equal(isGameOver(full, 1), false);
  assert.equal(isGameOver(full, 0), true);
  assert.equal(isGameOver(emptyBoard(), 0), false);
});

test('Nachschub bleibt in gültigen Grenzen', () => {
  for (let highest = 1; highest <= MAX_TIER; highest += 1) {
    for (let i = 0; i < 100; i += 1) {
      const piece = drawPiece(highest);
      assert.ok(piece >= 1 && piece <= 4, `unerwartetes Gebäude: ${piece}`);
    }
  }
  assert.equal(refillQueue([], 1).length, 3);
});

test('Reducer setzt, reißt ab und führt den Rekord mit', () => {
  let game = createGame(0);

  game = gameReducer(game, { type: 'place', index: 0 });
  assert.equal(game.moves, 1);
  assert.notEqual(game.board[0], null);
  assert.equal(game.ages[0], 1);
  assert.equal(game.queue.length, 3);
  assert.equal(game.best, game.score);

  const before = game.demolitions;
  game = gameReducer(game, { type: 'demolish', index: 0 });
  assert.equal(game.board[0], null);
  assert.equal(game.ages[0], 0);
  assert.equal(game.demolitions, before - 1);
});

test('besetzte Felder lassen sich nicht bebauen', () => {
  let game = createGame(0);
  game = gameReducer(game, { type: 'place', index: 5 });
  const snapshot = game;
  game = gameReducer(game, { type: 'place', index: 5 });
  assert.equal(game, snapshot);
});

test('Neustart behält den Rekord', () => {
  let game = createGame(0);
  game = gameReducer(game, { type: 'place', index: 0 });
  const best = game.best;
  game = gameReducer(game, { type: 'restart' });
  assert.equal(game.best, best);
  assert.equal(game.score, 0);
  assert.ok(game.board.every((cell) => cell === null));
  assert.ok(game.ages.every((age) => age === 0));
});
