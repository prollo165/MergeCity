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

test('drei zusammenhängende Gebäude werden zur nächsten Epoche', () => {
  const board = emptyBoard();
  board[toIndex(0, 0)] = 1;
  board[toIndex(1, 0)] = 1;

  const result = placeAndResolve(board, toIndex(2, 0), 1);

  assert.equal(result.board[toIndex(2, 0)], 2);
  assert.equal(result.board[toIndex(0, 0)], null);
  assert.equal(result.board[toIndex(1, 0)], null);
  assert.equal(result.events.length, 1);
  assert.ok(result.points > 0);
});

test('Kettenreaktionen laufen über mehrere Epochen', () => {
  const board = emptyBoard();
  board[toIndex(0, 0)] = 1;
  board[toIndex(1, 0)] = 1;
  board[toIndex(2, 1)] = 2;
  board[toIndex(3, 0)] = 2;

  const result = placeAndResolve(board, toIndex(2, 0), 1);

  assert.equal(result.events.length, 2);
  assert.equal(result.board[toIndex(2, 0)], 3);
});

test('diagonale Nachbarn verschmelzen nicht', () => {
  const board = emptyBoard();
  board[toIndex(0, 0)] = 1;
  board[toIndex(1, 1)] = 1;

  const result = placeAndResolve(board, toIndex(2, 2), 1);

  assert.equal(result.events.length, 0);
});

test('die letzte Epoche ist das Ende der Leiter', () => {
  const board = emptyBoard();
  board[toIndex(0, 0)] = MAX_TIER;
  board[toIndex(1, 0)] = MAX_TIER;

  const result = placeAndResolve(board, toIndex(2, 0), MAX_TIER);

  assert.equal(result.events.length, 0);
  assert.equal(result.board[toIndex(2, 0)], MAX_TIER);
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
