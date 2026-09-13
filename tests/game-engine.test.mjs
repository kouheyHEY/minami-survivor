import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ITEM_TYPES,
  acceptItemExchange,
  acceptItemUpgrade,
  advanceMovement,
  challengeChain,
  chooseItem,
  confirmRoll,
  createGame,
  declineItemExchange,
  declineItemUpgrade,
  endTurn,
  keepItem,
  reroll,
  resolveChain,
  roll,
  skipRankBonus,
  takeRankBonus,
  useTobacco,
} from '../src/game/engine.js';

const dice = (a, b) => [a, b];

function advanceAll(state) {
  let next = state;
  while (next.phase === 'moving') next = advanceMovement(next);
  return next;
}

test('確定した移動は1マスずつ進行する', () => {
  let state = confirmRoll(roll(createGame(), dice(2, 4)));
  assert.equal(state.phase, 'moving');
  assert.equal(state.players[0].position, 0);
  assert.equal(state.pendingMovement.remaining, 6);

  state = advanceMovement(state);
  assert.equal(state.players[0].position, 1);
  assert.equal(state.pendingMovement.remaining, 5);

  state = advanceAll(state);
  assert.equal(state.players[0].position, 6);
  assert.equal(state.phase, 'turn-complete');
});

test('移動中にアイテムマスへ着いた瞬間に選択し、残り歩数を再開する', () => {
  let state = createGame();
  state.players[0].position = 6;
  state = confirmRoll(roll(state, dice(3, 3)));
  state = advanceMovement(advanceMovement(advanceMovement(advanceMovement(state))));

  assert.equal(state.players[0].position, 10);
  assert.equal(state.phase, 'choose-item');
  assert.equal(state.pendingMovement.remaining, 2);

  state = chooseItem(state, ITEM_TYPES.CHARM);
  assert.equal(state.phase, 'moving');
  state = advanceAll(state);
  assert.equal(state.players[0].position, 12);
  assert.equal(state.phase, 'turn-complete');
});

test('アイテム所持中でもアイテムマスで停止し、現在のアイテムを保持できる', () => {
  let state = createGame();
  state.currentPlayer = 1;
  state.players[1].position = 6;
  state = confirmRoll(roll(state, dice(3, 3)));
  state = advanceAll(state);

  assert.equal(state.players[1].position, 10);
  assert.equal(state.phase, 'choose-item');
  assert.deepEqual(state.players[1].item, { type: ITEM_TYPES.CHARM, level: 'normal' });

  state = advanceAll(keepItem(state));
  assert.equal(state.players[1].position, 12);
  assert.deepEqual(state.players[1].item, { type: ITEM_TYPES.CHARM, level: 'normal' });
});

test('アイテム所持中にアイテムマスで新しいアイテムへ交換できる', () => {
  let state = createGame();
  state.currentPlayer = 1;
  state.players[1].position = 6;
  state = advanceAll(confirmRoll(roll(state, dice(3, 3))));

  state = advanceAll(chooseItem(state, ITEM_TYPES.TOBACCO));
  assert.equal(state.players[1].position, 12);
  assert.deepEqual(state.players[1].item, { type: ITEM_TYPES.TOBACCO, level: 'normal' });
});

test('後手は通常チャームと初手振り直しを持って開始する', () => {
  const state = createGame(['みなみ', 'ゲスト'], () => 0);

  assert.equal(state.players[0].item, null);
  assert.deepEqual(state.players[1].item, { type: ITEM_TYPES.CHARM, level: 'normal' });
  assert.equal(state.players[1].openingRerollAvailable, true);
  assert.equal(state.currentPlayer, 0);
});

test('通常の出目で進んでも、番を終わるボタン相当の操作までは手番を維持する', () => {
  let state = confirmRoll(roll(createGame(), dice(2, 4)));
  state = advanceAll(state);

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

test('7の追加ロールは最後の出目も加算し、7→7→8なら22マス進む', () => {
  let state = confirmRoll(roll(createGame(), dice(3, 4)));
  assert.equal(state.players[0].position, 0);
  assert.equal(state.phase, 'chain-choice');
  assert.equal(state.chainStreak, 1);
  assert.equal(state.chainTotal, 7);
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
  assert.equal(state.chainTotal, 14);
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
    outcome: 'completed',
    dice: [4, 4],
    total: 8,
    streak: 2,
    playerName: 'プレイヤー1',
    source: 'dice',
  });
  assert.equal(state.chainTotal, 22);

  state = advanceAll(resolveChain(state));
  assert.equal(state.players[0].position, 10);
  assert.equal(state.currentPlayer, 0);
  assert.equal(state.phase, 'choose-item');
  state = chooseItem(state, ITEM_TYPES.CHARM);
  state = advanceAll(state);
  assert.equal(state.players[0].position, 22);
  assert.equal(state.phase, 'turn-complete');

  state = endTurn(state);
  assert.equal(state.currentPlayer, 1);
  assert.equal(state.phase, 'awaiting-roll');
  assert.equal(state.chainStreak, 0);
});

test('次の通常ロールを始めると直前の連鎖結果を閉じる', () => {
  let state = confirmRoll(roll(createGame(), dice(3, 4)));
  state = challengeChain(state, dice(1, 1));
  assert.equal(state.lastChainResult.outcome, 'completed');

  state = endTurn(advanceAll(resolveChain(state)));
  state = roll(state, dice(2, 3));
  assert.equal(state.lastChainResult, null);
});

test('合計3はアイテムを取得してから3マス移動する', () => {
  let state = confirmRoll(roll(createGame(), dice(1, 2)));
  assert.equal(state.phase, 'choose-item');
  assert.equal(state.players[0].position, 0);

  state = chooseItem(state, ITEM_TYPES.BADGE);
  assert.deepEqual(state.players[0].item, { type: ITEM_TYPES.BADGE, level: 'normal' });
  assert.equal(state.players[0].position, 0);
  assert.equal(state.phase, 'moving');

  state = advanceAll(state);
  assert.equal(state.players[0].position, 3);
  assert.equal(state.phase, 'turn-complete');
});

test('合計3のSUPER化は移動前に任意で選べる', () => {
  let state = createGame();
  state.players[0].item = { type: ITEM_TYPES.BADGE, level: 'normal' };
  state = confirmRoll(roll(state, dice(1, 2)));
  assert.equal(state.phase, 'upgrade-item-choice');
  assert.equal(state.players[0].position, 0);

  const upgraded = acceptItemUpgrade(state);
  assert.deepEqual(upgraded.players[0].item, { type: ITEM_TYPES.BADGE, level: 'super' });
  assert.equal(upgraded.players[0].position, 0);
  assert.equal(upgraded.phase, 'moving');
  assert.equal(advanceAll(upgraded).players[0].position, 3);

  const unchanged = declineItemUpgrade(state);
  assert.deepEqual(unchanged.players[0].item, { type: ITEM_TYPES.BADGE, level: 'normal' });
  assert.equal(unchanged.players[0].position, 0);
  assert.equal(unchanged.phase, 'moving');
});

test('10と25は通常、45はSUPERのアイテムを取得する', () => {
  let state = createGame();
  state.players[0].position = 4;
  state = confirmRoll(roll(state, dice(2, 4)));
  state = advanceAll(state);
  assert.equal(state.phase, 'choose-item');
  assert.equal(state.pendingItemLevel, 'normal');
  state = chooseItem(state, ITEM_TYPES.TOBACCO);
  assert.equal(state.players[0].item.level, 'normal');

  state = createGame();
  state.players[0].position = 19;
  state = confirmRoll(roll(state, dice(2, 4)));
  state = advanceAll(state);
  assert.equal(state.phase, 'choose-item');
  assert.equal(state.pendingItemLevel, 'normal');

  state = createGame();
  state.players[1].position = 39;
  state.players[1].item = null;
  state.currentPlayer = 1;
  state = confirmRoll(roll(state, dice(3, 3)));
  state = advanceAll(state);
  assert.equal(state.phase, 'choose-item');
  assert.equal(state.pendingItemLevel, 'super');
  state = chooseItem(state, ITEM_TYPES.CHARM);
  assert.equal(state.players[1].item.level, 'super');
});

test('アイテムマスは通過した場合も、最初に通過したものを取得する', () => {
  let state = createGame();
  state.players[0].position = 6;
  state = confirmRoll(roll(state, dice(3, 3)));
  state = advanceAll(state);
  assert.equal(state.players[0].position, 10);
  assert.equal(state.phase, 'choose-item');
  assert.equal(state.pendingItemLevel, 'normal');
  state = advanceAll(chooseItem(state, ITEM_TYPES.BADGE));
  assert.equal(state.players[0].position, 12);

  state = createGame();
  state.players[0].position = 42;
  state = confirmRoll(roll(state, dice(2, 3)));
  state = advanceAll(state);
  assert.equal(state.players[0].position, 45);
  assert.equal(state.phase, 'choose-item');
  assert.equal(state.pendingItemLevel, 'super');
  state = advanceAll(chooseItem(state, ITEM_TYPES.CHARM));
  assert.equal(state.players[0].position, 47);
});

test('7連鎖は挑戦せず確定ボタン相当の操作でまとめて移動する', () => {
  let state = confirmRoll(roll(createGame(), dice(3, 4)));
  assert.equal(state.players[0].position, 0);

  state = advanceAll(resolveChain(state));

  assert.equal(state.players[0].position, 7);
  assert.equal(state.currentPlayer, 0);
  assert.equal(state.phase, 'turn-complete');
});

test('主移動後に2位なら任意で1マス進むかスキップできる', () => {
  let state = createGame();
  state.players[1].position = 12;
  state = confirmRoll(roll(state, dice(2, 4)));
  state = advanceAll(state);
  assert.equal(state.phase, 'rank-bonus-choice');
  assert.equal(state.players[0].position, 6);

  const skipped = skipRankBonus(state);
  assert.equal(skipped.players[0].position, 6);
  assert.equal(skipped.phase, 'turn-complete');

  state = advanceAll(takeRankBonus(state));
  assert.equal(state.players[0].position, 7);
  assert.equal(state.phase, 'turn-complete');
});

test('順位ボーナスでアイテムマスへ進んだ場合も取得できる', () => {
  let state = createGame();
  state.players[0].position = 3;
  state.players[1].position = 20;
  state = confirmRoll(roll(state, dice(2, 4)));
  state = advanceAll(state);
  assert.equal(state.players[0].position, 9);
  assert.equal(state.phase, 'rank-bonus-choice');

  state = advanceAll(takeRankBonus(state));
  assert.equal(state.players[0].position, 10);
  assert.equal(state.phase, 'choose-item');
  state = advanceAll(chooseItem(state, ITEM_TYPES.BADGE));
  assert.equal(state.phase, 'turn-complete');
});

test('サイコロ移動で同じマスに着地したとき交換するか任意で選べる', () => {
  let state = createGame();
  state.players[0].position = 8;
  state.players[0].item = { type: ITEM_TYPES.BADGE, level: 'normal' };
  state.players[1].position = 12;
  state.players[1].item = { type: ITEM_TYPES.TOBACCO, level: 'super' };

  state = advanceAll(confirmRoll(roll(state, dice(1, 3))));
  state = advanceAll(keepItem(state));
  assert.equal(state.phase, 'item-exchange-choice');
  assert.deepEqual(state.players[0].item, { type: ITEM_TYPES.BADGE, level: 'normal' });

  const exchanged = acceptItemExchange(state);
  assert.deepEqual(exchanged.players[0].item, { type: ITEM_TYPES.TOBACCO, level: 'super' });
  assert.deepEqual(exchanged.players[1].item, { type: ITEM_TYPES.BADGE, level: 'normal' });

  const kept = declineItemExchange(state);
  assert.deepEqual(kept.players[0].item, { type: ITEM_TYPES.BADGE, level: 'normal' });
  assert.deepEqual(kept.players[1].item, { type: ITEM_TYPES.TOBACCO, level: 'super' });
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

test('タバコは通常なら自分-3/相手-7、SUPERなら自分+3/相手-7で手番を続ける', () => {
  let state = createGame();
  state.players[0].position = 10;
  state.players[1].position = 20;
  state.players[0].item = { type: ITEM_TYPES.TOBACCO, level: 'normal' };
  state = useTobacco(state);
  assert.deepEqual(state.players.map((player) => player.position), [7, 13]);

  state.players[0].item = { type: ITEM_TYPES.TOBACCO, level: 'super' };
  state = useTobacco(state);
  assert.deepEqual(state.players.map((player) => player.position), [10, 6]);
  assert.equal(state.phase, 'awaiting-roll');
});

test('SUPERタバコの移動ではアイテムを取得せず、73以上なら即勝利する', () => {
  let state = createGame();
  state.players[0].position = 43;
  state.players[1].position = 52;
  state.players[0].item = { type: ITEM_TYPES.TOBACCO, level: 'super' };
  state = useTobacco(state);
  assert.equal(state.players[0].position, 46);
  assert.equal(state.players[0].item, null);
  assert.equal(state.phase, 'awaiting-roll');

  state.players[0].position = 71;
  state.players[0].item = { type: ITEM_TYPES.TOBACCO, level: 'super' };
  state = useTobacco(state);
  assert.equal(state.status, 'won');
  assert.equal(state.winner, 0);
});

test('73マス以上へ到達すると即勝利する', () => {
  let state = createGame();
  state.players[0].position = 68;
  state = confirmRoll(roll(state, dice(2, 4)));
  state = advanceAll(state);

  assert.equal(state.status, 'won');
  assert.equal(state.winner, 0);
  assert.equal(state.players[0].position, 73);
});
