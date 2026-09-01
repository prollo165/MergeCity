import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CELLS,
  drawPiece,
  emptyBoard,
  isGameOver,
  placeAndResolve,
  refillQueue,
  toIndex,
} from '../logic';
import { createGame, gameReducer } from '../state';
import { MAX_TIER } from '../tiers';

test('zwei Rundhütten werden zum Lehmhaus', () => {
  const board = emptyBoard();
  board[toIndex(0, 0)] = 1;

  const result = placeAndResolve(board, toIndex(1, 0), 1);

  assert.equal(result.board[toIndex(1, 0)], 2);
  assert.equal(result.board[toIndex(0, 0)], null);
  assert.equal(result.events.length, 1);
  assert.ok(result.points > 0);
});

test('drei Rundhütten überspringen eine Epoche', () => {
  const board = emptyBoard();
  board[toIndex(0, 0)] = 1;
  board[toIndex(2, 0)] = 1;

  // Die gesetzte Hütte verbindet beide zu einer Dreiergruppe.
  const result = placeAndResolve(board, toIndex(1, 0), 1);

  assert.equal(result.board[toIndex(1, 0)], 3);
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].merged, 3);
});

test('vier Rundhütten überspringen zwei Epochen', () => {
  const board = emptyBoard();
  board[toIndex(0, 0)] = 1;
  board[toIndex(2, 0)] = 1;
  board[toIndex(1, 1)] = 1;

  const result = placeAndResolve(board, toIndex(1, 0), 1);

  assert.equal(result.board[toIndex(1, 0)], 4);
});

test('ein Lehmhaus neben zwei Rundhütten wird zur Steinkate', () => {
  const board = emptyBoard();
  board[toIndex(0, 0)] = 1; // Rundhütte
  board[toIndex(2, 0)] = 2; // Lehmhaus

  // Die zweite Rundhütte verschmilzt erst zum Lehmhaus und dann weiter.
  const result = placeAndResolve(board, toIndex(1, 0), 1);

  assert.equal(result.board[toIndex(1, 0)], 3);
  assert.equal(result.events.length, 2);
  assert.deepEqual(
    result.events.map((event) => event.tier),
    [2, 3],
  );
});

test('diagonale Nachbarn verschmelzen nicht', () => {
  const board = emptyBoard();
  board[toIndex(0, 0)] = 1;

  const result = placeAndResolve(board, toIndex(1, 1), 1);

  assert.equal(result.events.length, 0);
  assert.equal(result.board[toIndex(1, 1)], 1);
});

test('ein einzelnes Gebäude bleibt stehen', () => {
  const result = placeAndResolve(emptyBoard(), toIndex(3, 3), 1);

  assert.equal(result.board[toIndex(3, 3)], 1);
  assert.equal(result.events.length, 0);
});

test('die letzte Epoche ist das Ende der Leiter', () => {
  const board = emptyBoard();
  board[toIndex(0, 0)] = MAX_TIER;

  const result = placeAndResolve(board, toIndex(1, 0), MAX_TIER);

  assert.equal(result.events.length, 0);
  assert.equal(result.board[toIndex(1, 0)], MAX_TIER);
});

test('große Gruppen springen höchstens bis zur letzten Epoche', () => {
  const board = emptyBoard();
  board[toIndex(0, 0)] = MAX_TIER - 1;
  board[toIndex(2, 0)] = MAX_TIER - 1;
  board[toIndex(1, 1)] = MAX_TIER - 1;

  const result = placeAndResolve(board, toIndex(1, 0), MAX_TIER - 1);

  assert.equal(result.board[toIndex(1, 0)], MAX_TIER);
});

test('das Raster ist sechs mal sechs Felder groß', () => {
  assert.equal(CELLS, 36);
  assert.equal(emptyBoard().length, 36);
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
  assert.equal(game.queue.length, 3);
  assert.equal(game.best, game.score);

  const before = game.demolitions;
  game = gameReducer(game, { type: 'demolish', index: 0 });
  assert.equal(game.board[0], null);
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
});
