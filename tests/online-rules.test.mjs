import test from 'node:test';
import assert from 'node:assert/strict';

import { ITEM_TYPES } from '../src/game/engine.js';
import { applyAction, canAct, createGame, seatCount } from '../src/game/online-rules.js';

const fixedDice = (...pairs) => () => {
  if (pairs.length === 0) throw new Error('No dice left.');
  return pairs.shift();
};

// 席0が大きい目を出して先手を選んだ状態から始める。
function startedGame(names = ['A', 'B']) {
  let state = createGame({ names });
  state = applyAction(state, { type: 'rollOrder' }, { seat: 0, dice: fixedDice([6, 6]) });
  state = applyAction(state, { type: 'rollOrder' }, { seat: 1, dice: fixedDice([1, 1]) });
  return applyAction(state, { type: 'chooseOrder', choice: 'first' }, { seat: 0 });
}

test('2席の部屋は、サイコロで先手・後手を決めるところから始まる', () => {
  const state = createGame({ names: ['みなみ', 'ゲスト'] });
  assert.equal(seatCount, 2);
  assert.deepEqual(state.players.map((player) => player.name), ['みなみ', 'ゲスト']);
  assert.equal(state.phase, 'order-roll');
  assert.equal(canAct(state, 0, { type: 'rollOrder' }), true);
  assert.equal(canAct(state, 1, { type: 'rollOrder' }), true);
  assert.equal(canAct(state, 0, { type: 'roll' }), false);
});

test('先手・後手の決定では、自分の席のサイコロと、目が大きかった席の選択だけができる', () => {
  let state = createGame({ names: ['A', 'B'] });
  state = applyAction(state, { type: 'rollOrder' }, { seat: 1, dice: fixedDice([5, 6]) });
  assert.equal(canAct(state, 1, { type: 'rollOrder' }), false);

  state = applyAction(state, { type: 'rollOrder' }, { seat: 0, dice: fixedDice([2, 2]) });
  assert.equal(state.phase, 'order-choice');
  assert.equal(canAct(state, 0, { type: 'chooseOrder', choice: 'first' }), false);
  assert.equal(canAct(state, 1, { type: 'chooseOrder', choice: 'second' }), true);

  state = applyAction(state, { type: 'chooseOrder', choice: 'second' }, { seat: 1 });
  assert.equal(state.currentPlayer, 0);
  assert.equal(canAct(state, 0, { type: 'roll' }), true);
  assert.equal(canAct(state, 1, { type: 'roll' }), false);
  assert.deepEqual(state.players[1].item, { type: ITEM_TYPES.CHARM, level: 'normal' });
});

test('手番の席だけが操作でき、再戦は決着後にどちらの席からもできる', () => {
  const state = startedGame();
  assert.equal(canAct(state, 0, { type: 'roll' }), true);
  assert.equal(canAct(state, 1, { type: 'roll' }), false);
  assert.equal(canAct(state, 1, { type: 'rematch' }), false);

  const won = { ...state, status: 'won', phase: 'finished', winner: 0 };
  assert.equal(canAct(won, 0, { type: 'roll' }), false);
  assert.equal(canAct(won, 1, { type: 'rematch' }), true);
  assert.equal(canAct(won, 2, { type: 'rematch' }), false);
});

test('サイコロはサーバーが渡したものを使い、操作に含まれる出目は無視する', () => {
  let state = startedGame();
  state = applyAction(state, { type: 'roll', dice: [6, 6] }, { seat: 0, dice: fixedDice([2, 4]) });
  assert.deepEqual(state.pendingRoll.dice, [2, 4]);
});

test('移動は止まる地点まで一度に進める', () => {
  let state = startedGame();
  state = applyAction(state, { type: 'roll' }, { seat: 0, dice: fixedDice([2, 4]) });
  state = applyAction(state, { type: 'confirm' }, { seat: 0 });
  assert.equal(state.players[0].position, 6);
  assert.equal(state.phase, 'turn-complete');
});

test('移動中のアイテムマスでは止まり、選んだあと残りを進む', () => {
  let state = startedGame();
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
  const state = startedGame();
  assert.throws(() => applyAction(state, { type: 'teleport' }, { seat: 0 }), /Unknown action/);
  assert.throws(() => applyAction(state, { type: 'constructor' }, { seat: 0 }), /Unknown action/);
  assert.throws(() => applyAction(state, null, { seat: 0 }), /Unknown action/);
  assert.throws(() => applyAction(state, { type: 'endTurn' }, { seat: 0 }), /phase/);
  assert.throws(() => applyAction(state, { type: 'rematch' }, { seat: 0 }), /in progress/);
});

test('再戦すると同じ名前で、先手・後手を決め直すところから始める', () => {
  const state = startedGame();
  state.players[0].position = 73;
  const won = { ...state, status: 'won', phase: 'finished', winner: 0 };
  const next = applyAction(won, { type: 'rematch' }, { seat: 1 });
  assert.equal(next.status, 'playing');
  assert.equal(next.phase, 'order-roll');
  assert.equal(next.players[0].position, 0);
  assert.deepEqual(next.players.map((player) => player.name), ['A', 'B']);
});
