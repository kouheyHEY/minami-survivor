import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ITEM_TYPES,
  advanceMovement,
  chooseTurnOrder,
  confirmRoll,
  createOrderGame,
  endTurn,
  reroll,
  roll,
  rollForOrder,
} from '../src/game/engine.js';

const decided = (choice) =>
  chooseTurnOrder(rollForOrder(rollForOrder(createOrderGame(['A', 'B']), 0, [6, 5]), 1, [1, 2]), choice);

test('先手・後手はお互いに1回ずつ振り、同じ目なら振り直す', () => {
  let state = createOrderGame(['A', 'B']);
  assert.equal(state.phase, 'order-roll');
  assert.equal(state.players[1].item, null);

  state = rollForOrder(state, 0, [3, 4]);
  assert.throws(() => rollForOrder(state, 0, [6, 6]), /already rolled/);
  assert.throws(() => roll(state, [1, 1]), /phase/);

  state = rollForOrder(state, 1, [2, 5]);
  assert.equal(state.phase, 'order-roll');
  assert.deepEqual(state.orderRolls, [null, null]);
});

test('目が大きい人が先手を選ぶと、そのまま先手になり相手に後手補正がつく', () => {
  const state = decided('first');
  assert.equal(state.firstPlayer, 0);
  assert.equal(state.currentPlayer, 0);
  assert.equal(state.phase, 'awaiting-roll');
  assert.deepEqual(state.players[1].item, { type: ITEM_TYPES.CHARM, level: 'normal' });
  assert.equal(state.players[1].openingRerollAvailable, true);
  assert.equal(state.players[0].item, null);
});

test('目が大きい人が後手を選ぶと、相手が先手になり自分に後手補正がつく', () => {
  const state = decided('second');
  assert.equal(state.firstPlayer, 1);
  assert.equal(state.currentPlayer, 1);
  assert.deepEqual(state.players[0].item, { type: ITEM_TYPES.CHARM, level: 'normal' });
  assert.equal(state.players[0].openingRerollAvailable, true);
  assert.equal(state.players[1].item, null);
});

test('後手の振り直しは、後手になった人の最初の手番だけ使える', () => {
  let state = decided('second');
  state = roll(state, [2, 2]);
  assert.throws(() => reroll(state, [3, 3], 'opening'), /opening reroll/);

  state = confirmRoll(state);
  while (state.phase === 'moving') state = advanceMovement(state);
  state = endTurn(state);
  assert.equal(state.currentPlayer, 0);

  state = reroll(roll(state, [1, 1]), [4, 4], 'opening');
  assert.deepEqual(state.pendingRoll.dice, [4, 4]);
  assert.equal(state.players[0].openingRerollAvailable, false);
});
