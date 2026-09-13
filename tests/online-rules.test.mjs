import test from 'node:test';
import assert from 'node:assert/strict';

import { ITEM_TYPES } from '../src/game/engine.js';
import { applyAction, canAct, createGame, seatCount } from '../src/game/online-rules.js';

const fixedDice = (...pairs) => () => {
  if (pairs.length === 0) throw new Error('No dice left.');
  return pairs.shift();
};

test('2席の部屋で、席の順に名前を入れて対戦を始める', () => {
  const state = createGame({ names: ['みなみ', 'ゲスト'] });
  assert.equal(seatCount, 2);
  assert.deepEqual(state.players.map((player) => player.name), ['みなみ', 'ゲスト']);
  assert.equal(state.currentPlayer, 0);
});

test('手番の席だけが操作でき、再戦は決着後にどちらの席からもできる', () => {
  const state = createGame({ names: ['A', 'B'] });
  assert.equal(canAct(state, 0, { type: 'roll' }), true);
  assert.equal(canAct(state, 1, { type: 'roll' }), false);
  assert.equal(canAct(state, 1, { type: 'rematch' }), false);

  const won = { ...state, status: 'won', phase: 'finished', winner: 0 };
  assert.equal(canAct(won, 0, { type: 'roll' }), false);
  assert.equal(canAct(won, 1, { type: 'rematch' }), true);
  assert.equal(canAct(won, 2, { type: 'rematch' }), false);
});

test('サイコロはサーバーが渡したものを使い、操作に含まれる出目は無視する', () => {
  let state = createGame({ names: ['A', 'B'] });
  state = applyAction(state, { type: 'roll', dice: [6, 6] }, { seat: 0, dice: fixedDice([2, 4]) });
  assert.deepEqual(state.pendingRoll.dice, [2, 4]);
});

test('移動は止まる地点まで一度に進める', () => {
  let state = createGame({ names: ['A', 'B'] });
  state = applyAction(state, { type: 'roll' }, { seat: 0, dice: fixedDice([2, 4]) });
  state = applyAction(state, { type: 'confirm' }, { seat: 0 });
  assert.equal(state.players[0].position, 6);
  assert.equal(state.phase, 'turn-complete');
});

test('移動中のアイテムマスでは止まり、選んだあと残りを進む', () => {
  let state = createGame({ names: ['A', 'B'] });
  state.players[0].position = 6;
  state = applyAction(state, { type: 'roll' }, { seat: 0, dice: fixedDice([3, 3]) });
  state = applyAction(state, { type: 'confirm' }, { seat: 0 });
  assert.equal(state.players[0].position, 10);
  assert.equal(state.phase, 'choose-item');

  state = applyAction(state, { type: 'chooseItem', itemType: ITEM_TYPES.CHARM }, { seat: 0 });
  assert.equal(state.players[0].position, 12);
  assert.equal(state.phase, 'turn-complete');
});

test('知らない操作や、ルールに合わない操作はエラーにする', () => {
  const state = createGame({ names: ['A', 'B'] });
  assert.throws(() => applyAction(state, { type: 'teleport' }, { seat: 0 }), /Unknown action/);
  assert.throws(() => applyAction(state, { type: 'constructor' }, { seat: 0 }), /Unknown action/);
  assert.throws(() => applyAction(state, null, { seat: 0 }), /Unknown action/);
  assert.throws(() => applyAction(state, { type: 'endTurn' }, { seat: 0 }), /phase/);
  assert.throws(() => applyAction(state, { type: 'rematch' }, { seat: 0 }), /in progress/);
});

test('再戦すると同じ名前で最初から始める', () => {
  const state = createGame({ names: ['A', 'B'] });
  state.players[0].position = 73;
  const won = { ...state, status: 'won', phase: 'finished', winner: 0 };
  const next = applyAction(won, { type: 'rematch' }, { seat: 1 });
  assert.equal(next.status, 'playing');
  assert.equal(next.players[0].position, 0);
  assert.deepEqual(next.players.map((player) => player.name), ['A', 'B']);
});
