import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ITEM_TYPES,
  challengeChain,
  chooseItem,
  confirmRoll,
  createGame,
  endTurn,
  reroll,
  resolveChain,
  roll,
  useTobacco,
} from '../src/game/engine.js';

const dice = (a, b) => [a, b];

test('後手は通常アイテム1個と初手振り直しを持って開始する', () => {
  const state = createGame(['みなみ', 'ゲスト'], () => 0.5);

  assert.equal(state.players[0].item, null);
  assert.deepEqual(state.players[1].item, { type: ITEM_TYPES.CHARM, level: 'normal' });
  assert.equal(state.players[1].openingRerollAvailable, true);
  assert.equal(state.currentPlayer, 0);
});

test('通常の出目で進んでも、番を終わるボタン相当の操作までは手番を維持する', () => {
  let state = confirmRoll(roll(createGame(), dice(2, 4)));

  assert.equal(state.players[0].position, 6);
  assert.equal(state.currentPlayer, 0);
  assert.equal(state.phase, 'turn-complete');

  state = endTurn(state);
  assert.equal(state.currentPlayer, 1);
  assert.equal(state.phase, 'awaiting-roll');
});

test('行動結果が出る前に番を終えることはできない', () => {
  assert.throws(() => endTurn(createGame()), /turn-complete/);
});

test('7連鎖は成功で7マス追加し、失敗で2マス戻って終了する', () => {
  let state = confirmRoll(roll(createGame(), dice(3, 4)));
  assert.equal(state.players[0].position, 0);
  assert.equal(state.phase, 'chain-choice');
  assert.equal(state.chainStreak, 1);
  assert.deepEqual(state.lastChainResult, {
    outcome: 'started',
    dice: [3, 4],
    total: 7,
    streak: 1,
    playerName: 'プレイヤー1',
    source: 'dice',
  });

  state = challengeChain(state, dice(2, 5));
  assert.equal(state.players[0].position, 0);
  assert.equal(state.phase, 'chain-choice');
  assert.equal(state.chainStreak, 2);
  assert.deepEqual(state.lastChainResult, {
    outcome: 'success',
    dice: [2, 5],
    total: 7,
    streak: 2,
    playerName: 'プレイヤー1',
    source: 'dice',
  });

  state = challengeChain(state, dice(4, 4));
  assert.equal(state.players[0].position, 0);
  assert.equal(state.currentPlayer, 0);
  assert.equal(state.phase, 'chain-resolution');
  assert.equal(state.chainStreak, 2);
  assert.deepEqual(state.lastChainResult, {
    outcome: 'failure',
    dice: [4, 4],
    total: 8,
    streak: 2,
    playerName: 'プレイヤー1',
    source: 'dice',
  });

  state = resolveChain(state);
  assert.equal(state.players[0].position, 12);
  assert.equal(state.currentPlayer, 0);
  assert.equal(state.phase, 'turn-complete');

  state = endTurn(state);
  assert.equal(state.currentPlayer, 1);
  assert.equal(state.phase, 'awaiting-roll');
  assert.equal(state.chainStreak, 0);
});

test('次の通常ロールを始めると直前の連鎖結果を閉じる', () => {
  let state = confirmRoll(roll(createGame(), dice(3, 4)));
  state = challengeChain(state, dice(1, 1));
  assert.equal(state.lastChainResult.outcome, 'failure');

  state = endTurn(resolveChain(state));
  state = roll(state, dice(2, 3));
  assert.equal(state.lastChainResult, null);
});

test('合計3は未所持なら選択取得、所持中ならSUPER化する', () => {
  let state = confirmRoll(roll(createGame(), dice(1, 2)));
  assert.equal(state.phase, 'choose-item');

  state = chooseItem(state, ITEM_TYPES.BADGE);
  assert.deepEqual(state.players[0].item, { type: ITEM_TYPES.BADGE, level: 'normal' });
  assert.equal(state.currentPlayer, 0);
  assert.equal(state.phase, 'turn-complete');

  state = endTurn(state);
  state = confirmRoll(roll(state, dice(1, 2)));
  assert.deepEqual(state.players[1].item?.level, 'super');
  assert.equal(state.currentPlayer, 1);
  assert.equal(state.phase, 'turn-complete');
});

test('10と25は通常、45はSUPERのアイテムを取得する', () => {
  let state = createGame();
  state.players[0].position = 4;
  state = confirmRoll(roll(state, dice(2, 4)));
  assert.equal(state.phase, 'choose-item');
  assert.equal(state.pendingItemLevel, 'normal');
  state = chooseItem(state, ITEM_TYPES.TOBACCO);
  assert.equal(state.players[0].item.level, 'normal');

  state = createGame();
  state.players[0].position = 19;
  state = confirmRoll(roll(state, dice(2, 4)));
  assert.equal(state.phase, 'choose-item');
  assert.equal(state.pendingItemLevel, 'normal');

  state = createGame();
  state.players[1].position = 39;
  state.players[1].item = null;
  state.currentPlayer = 1;
  state = confirmRoll(roll(state, dice(3, 3)));
  assert.equal(state.phase, 'choose-item');
  assert.equal(state.pendingItemLevel, 'super');
  state = chooseItem(state, ITEM_TYPES.CHARM);
  assert.equal(state.players[1].item.level, 'super');
});

test('7連鎖は挑戦せず確定ボタン相当の操作でまとめて移動する', () => {
  let state = confirmRoll(roll(createGame(), dice(3, 4)));
  assert.equal(state.players[0].position, 0);

  state = resolveChain(state);

  assert.equal(state.players[0].position, 7);
  assert.equal(state.currentPlayer, 0);
  assert.equal(state.phase, 'turn-complete');
});

test('サイコロ移動で同じマスに着地すると所持アイテムを交換する', () => {
  let state = createGame();
  state.players[0].position = 8;
  state.players[0].item = { type: ITEM_TYPES.BADGE, level: 'normal' };
  state.players[1].position = 12;
  state.players[1].item = { type: ITEM_TYPES.TOBACCO, level: 'super' };

  state = confirmRoll(roll(state, dice(1, 3)));
  assert.deepEqual(state.players[0].item, { type: ITEM_TYPES.TOBACCO, level: 'super' });
  assert.deepEqual(state.players[1].item, { type: ITEM_TYPES.BADGE, level: 'normal' });
});

test('通常バッジで振り直し、SUPERバッジで出目を7にできる', () => {
  let state = createGame();
  state.players[0].item = { type: ITEM_TYPES.BADGE, level: 'normal' };
  state = reroll(roll(state, dice(1, 1)), dice(3, 4), 'badge');
  assert.equal(state.pendingRoll.total, 7);
  assert.equal(state.players[0].item, null);

  state = createGame();
  state.players[0].item = { type: ITEM_TYPES.BADGE, level: 'super' };
  state = confirmRoll(roll(state, dice(1, 1)), { useSuperBadge: true });
  assert.equal(state.players[0].position, 0);
  assert.equal(state.phase, 'chain-choice');
  assert.equal(state.players[0].item, null);
});

test('チャームは通常±1、SUPER±2の範囲で合計値を調整して消費する', () => {
  let state = createGame();
  state.players[0].item = { type: ITEM_TYPES.CHARM, level: 'normal' };
  state = confirmRoll(roll(state, dice(2, 4)), { adjustment: 1 });
  assert.equal(state.players[0].position, 0);
  assert.equal(state.phase, 'chain-choice');
  assert.equal(state.players[0].item, null);

  state = createGame();
  state.players[0].item = { type: ITEM_TYPES.CHARM, level: 'super' };
  state = confirmRoll(roll(state, dice(2, 3)), { adjustment: 2 });
  assert.equal(state.players[0].position, 0);
  assert.equal(state.phase, 'chain-choice');
});

test('タバコは通常なら自分-3/相手-7、SUPERなら相手だけ-7', () => {
  let state = createGame();
  state.players[0].position = 10;
  state.players[1].position = 20;
  state.players[0].item = { type: ITEM_TYPES.TOBACCO, level: 'normal' };
  state = useTobacco(state);
  assert.deepEqual(state.players.map((player) => player.position), [7, 13]);

  state.players[0].item = { type: ITEM_TYPES.TOBACCO, level: 'super' };
  state = useTobacco(state);
  assert.deepEqual(state.players.map((player) => player.position), [7, 6]);
});

test('73マス以上へ到達すると即勝利する', () => {
  let state = createGame();
  state.players[0].position = 68;
  state = confirmRoll(roll(state, dice(2, 4)));

  assert.equal(state.status, 'won');
  assert.equal(state.winner, 0);
  assert.equal(state.players[0].position, 74);
});
