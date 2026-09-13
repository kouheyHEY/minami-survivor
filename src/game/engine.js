export const ITEM_TYPES = Object.freeze({ BADGE: 'badge', CHARM: 'charm', TOBACCO: 'tobacco' });
export const ITEM_LABELS = Object.freeze({ badge: 'ぬいぐるみバッジ', charm: 'めじるしチャーム', tobacco: 'タバコ' });
export const GOAL = 73;
export const ITEM_SPACES = Object.freeze([10, 25, 45]);
const itemTypes = Object.values(ITEM_TYPES);
const copy = (state) => structuredClone(state);

function assertPhase(state, expected) {
  if (state.status !== 'playing' || state.phase !== expected) throw new Error(`Action requires phase "${expected}".`);
}
function validateDice(dice) {
  if (!Array.isArray(dice) || dice.length !== 2 || dice.some((value) => !Number.isInteger(value) || value < 1 || value > 6)) throw new Error('Dice must contain two integers from 1 to 6.');
}
function addLog(state, message, tone = 'neutral') {
  state.log = [{ id: state.nextLogId, message, tone }, ...state.log].slice(0, 12);
  state.nextLogId += 1;
}
function prepareTurnEnd(state) {
  state.phase = 'turn-complete';
  state.pendingRoll = null;
  state.pendingMovement = null;
  state.pendingItemLevel = null;
  state.pendingItemSource = null;
  state.pendingAfterItemPhase = null;
  return state;
}
function checkWinner(state) {
  const player = state.players[state.currentPlayer];
  if (player.position < GOAL) return false;
  state.status = 'won';
  state.winner = state.currentPlayer;
  state.phase = 'finished';
  state.pendingRoll = null;
  state.pendingMovement = null;
  addLog(state, `${player.name}が${player.position}マス目に到達。勝利！`, 'win');
  return true;
}
function hasItemExchangeChoice(state) {
  const current = state.players[state.currentPlayer];
  const opponent = state.players[state.currentPlayer === 0 ? 1 : 0];
  if (current.position !== opponent.position) return false;
  if (current.item === null && opponent.item === null) return false;
  return current.item?.type !== opponent.item?.type || current.item?.level !== opponent.item?.level;
}
function phaseAfterMainMovement(state) {
  const player = state.players[state.currentPlayer];
  const opponent = state.players[state.currentPlayer === 0 ? 1 : 0];
  return player.position < opponent.position ? 'rank-bonus-choice' : 'turn-complete';
}
function offerItem(state, itemSpace, afterPhase) {
  state.phase = 'choose-item';
  state.pendingItemLevel = itemSpace === 45 ? 'super' : 'normal';
  state.pendingItemSource = 'space';
  state.pendingAfterItemPhase = afterPhase;
  addLog(state, `${itemSpace}マス目のアイテムマスに到着！${state.pendingItemLevel === 'super' ? ' SUPERアイテム' : ' アイテム'}を選ぼう。`, 'accent');
  return state;
}
function continueAfterMovement(state, allowRankBonus = true) {
  const player = state.players[state.currentPlayer];
  const afterPhase = allowRankBonus ? phaseAfterMainMovement(state) : 'turn-complete';
  if (afterPhase === 'rank-bonus-choice') {
    state.phase = afterPhase;
    state.pendingRoll = null;
    addLog(state, `${player.name}は現在2位。順位ボーナスで1マス追加できる。`, 'accent');
    return state;
  }
  return prepareTurnEnd(state);
}
function startMovement(state, spaces, options = {}) {
  const player = state.players[state.currentPlayer];
  state.phase = options.defer ? state.phase : 'moving';
  state.pendingRoll = null;
  state.pendingMovement = {
    remaining: spaces,
    total: spaces,
    kind: options.kind || 'main',
    exchangeOnComplete: options.exchangeOnComplete ?? true,
    allowRankBonus: options.allowRankBonus ?? true,
  };
  if (!options.defer) addLog(state, `${player.name}が${spaces}マスの移動を開始。`, options.tone || 'neutral');
  return state;
}
function finishMovement(state) {
  const movement = state.pendingMovement;
  const player = state.players[state.currentPlayer];
  state.pendingMovement = null;
  addLog(state, `${player.name}が${player.position}マス目に到着。`, movement.kind === 'main' ? 'neutral' : 'accent');
  if (movement.exchangeOnComplete && hasItemExchangeChoice(state)) {
    state.phase = 'item-exchange-choice';
    addLog(state, `同じ${player.position}マス目に着地。アイテムを交換するか選ぼう。`, 'accent');
    return state;
  }
  return continueAfterMovement(state, movement.allowRankBonus);
}

export function createGame(names = ['プレイヤー1', 'プレイヤー2']) {
  const normalizedNames = [0, 1].map((index) => String(names[index] || '').trim() || `プレイヤー${index + 1}`);
  return {
    status: 'playing', phase: 'awaiting-roll', currentPlayer: 0, winner: null, turn: 1,
    pendingRoll: null, pendingMovement: null, pendingItemLevel: null, pendingItemSource: null, pendingAfterItemPhase: null,
    chainStreak: 0, chainTotal: 0, lastChainResult: null, nextLogId: 3,
    firstPlayer: 0, orderRolls: [null, null], orderWinner: null,
    players: [
      { id: 'player-1', name: normalizedNames[0], position: 0, item: null, turnsTaken: 0, openingRerollAvailable: false },
      { id: 'player-2', name: normalizedNames[1], position: 0, item: { type: ITEM_TYPES.CHARM, level: 'normal' }, turnsTaken: 0, openingRerollAvailable: true },
    ],
    log: [
      { id: 2, message: `${normalizedNames[1]}は後手補正で「${ITEM_LABELS[ITEM_TYPES.CHARM]}」を獲得。`, tone: 'accent' },
      { id: 1, message: `${normalizedNames[0]}の手番からスタート。`, tone: 'neutral' },
    ],
  };
}

// 先手・後手をサイコロで決めるところから始める対戦。
export function createOrderGame(names) {
  const state = createGame(names);
  state.phase = 'order-roll';
  for (const player of state.players) {
    player.item = null;
    player.openingRerollAvailable = false;
  }
  state.log = [];
  state.nextLogId = 1;
  addLog(state, 'サイコロを振って先手・後手を決めよう。目が大きい人が選べる。');
  return state;
}

export function rollForOrder(state, playerIndex, dice) {
  assertPhase(state, 'order-roll');
  validateDice(dice);
  if (playerIndex !== 0 && playerIndex !== 1) throw new Error('Unknown player.');
  if (state.orderRolls[playerIndex] !== null) throw new Error('The player has already rolled for turn order.');
  const next = copy(state);
  next.orderRolls[playerIndex] = [...dice];
  addLog(next, `${next.players[playerIndex].name}の出目は ${dice[0]} + ${dice[1]} = ${dice[0] + dice[1]}。`);
  const [first, second] = next.orderRolls;
  if (first === null || second === null) return next;
  const totals = [first[0] + first[1], second[0] + second[1]];
  if (totals[0] === totals[1]) {
    next.orderRolls = [null, null];
    addLog(next, `どちらも${totals[0]}。もう一度振ろう。`, 'accent');
    return next;
  }
  next.orderWinner = totals[0] > totals[1] ? 0 : 1;
  next.phase = 'order-choice';
  addLog(next, `${next.players[next.orderWinner].name}の目が大きい。先手か後手を選ぼう。`, 'accent');
  return next;
}

export function chooseTurnOrder(state, choice) {
  assertPhase(state, 'order-choice');
  if (choice !== 'first' && choice !== 'second') throw new Error('Choose first or second.');
  const next = copy(state);
  const chooser = next.orderWinner;
  const firstPlayer = choice === 'first' ? chooser : chooser === 0 ? 1 : 0;
  const secondPlayer = firstPlayer === 0 ? 1 : 0;
  next.firstPlayer = firstPlayer;
  next.currentPlayer = firstPlayer;
  next.phase = 'awaiting-roll';
  next.players[secondPlayer].item = { type: ITEM_TYPES.CHARM, level: 'normal' };
  next.players[secondPlayer].openingRerollAvailable = true;
  addLog(next, `${next.players[chooser].name}が${choice === 'first' ? '先手' : '後手'}を選択。`, 'accent');
  addLog(next, `${next.players[secondPlayer].name}は後手補正で「${ITEM_LABELS[ITEM_TYPES.CHARM]}」を獲得。`, 'accent');
  addLog(next, `${next.players[firstPlayer].name}の手番からスタート。`);
  return next;
}

export function roll(state, dice) {
  assertPhase(state, 'awaiting-roll');
  validateDice(dice);
  const next = copy(state);
  next.lastChainResult = null;
  next.chainStreak = 0;
  next.chainTotal = 0;
  next.pendingRoll = { dice: [...dice], total: dice[0] + dice[1], adjustment: 0 };
  next.phase = 'roll-options';
  addLog(next, `${next.players[next.currentPlayer].name}の出目は ${dice[0]} + ${dice[1]} = ${next.pendingRoll.total}。`);
  return next;
}

export function reroll(state, dice, source) {
  assertPhase(state, 'roll-options');
  validateDice(dice);
  const next = copy(state);
  const player = next.players[next.currentPlayer];
  if (source === 'opening') {
    if (next.currentPlayer === (next.firstPlayer ?? 0) || player.turnsTaken !== 0 || !player.openingRerollAvailable) throw new Error('The opening reroll is not available.');
    player.openingRerollAvailable = false;
    addLog(next, `${player.name}が後手補正で振り直した。`, 'accent');
  } else if (source === 'badge') {
    if (player.item?.type !== ITEM_TYPES.BADGE || player.item.level !== 'normal') throw new Error('A normal badge is required to reroll.');
    player.item = null;
    addLog(next, `${player.name}がぬいぐるみバッジで振り直した。`, 'accent');
  } else throw new Error('Unknown reroll source.');
  next.pendingRoll = { dice: [...dice], total: dice[0] + dice[1], adjustment: 0 };
  addLog(next, `振り直しの出目は ${dice[0]} + ${dice[1]} = ${next.pendingRoll.total}。`);
  return next;
}

export function confirmRoll(state, options = {}) {
  assertPhase(state, 'roll-options');
  const next = copy(state);
  const player = next.players[next.currentPlayer];
  let total = next.pendingRoll.total;
  if (options.useSuperBadge) {
    if (player.item?.type !== ITEM_TYPES.BADGE || player.item.level !== 'super') throw new Error('A SUPER badge is required.');
    player.item = null;
    total = 7;
    addLog(next, `${player.name}がSUPERぬいぐるみバッジで出目を7にした！`, 'accent');
  }
  const adjustment = options.adjustment ?? 0;
  if (adjustment !== 0) {
    if (player.item?.type !== ITEM_TYPES.CHARM) throw new Error('A charm is required to adjust the roll.');
    const limit = player.item.level === 'super' ? 2 : 1;
    if (!Number.isInteger(adjustment) || Math.abs(adjustment) > limit) throw new Error(`The adjustment must be within ±${limit}.`);
    player.item = null;
    total += adjustment;
    addLog(next, `${player.name}がめじるしチャームで合計を${adjustment > 0 ? '+' : ''}${adjustment}した。`, 'accent');
  }
  next.pendingRoll.adjustment = adjustment;
  next.pendingRoll.total = total;
  if (total === 7) {
    next.chainStreak = 1;
    next.chainTotal = 7;
    next.lastChainResult = { outcome: 'started', dice: [...next.pendingRoll.dice], total, streak: 1, playerName: player.name, source: options.useSuperBadge ? 'super-badge' : adjustment !== 0 ? 'charm' : 'dice' };
    next.phase = 'chain-choice';
    next.pendingRoll = null;
    addLog(next, `${player.name}が7！ 追加ロールの出目も移動数へ加算できる。`, 'accent');
    return next;
  }
  if (total === 3) {
    startMovement(next, 3, { defer: true, tone: 'accent' });
    if (player.item === null) {
      next.phase = 'choose-item';
      next.pendingItemLevel = 'normal';
      next.pendingItemSource = 'sum-three';
      next.pendingAfterItemPhase = 'moving';
      addLog(next, '合計3！ アイテムを選んでから3マス進もう。', 'accent');
      return next;
    }
    if (player.item.level === 'normal') {
      next.phase = 'upgrade-item-choice';
      addLog(next, `合計3！ ${ITEM_LABELS[player.item.type]}をSUPER化するか選ぼう。`, 'accent');
      return next;
    }
    next.phase = 'moving';
    addLog(next, `合計3！ アイテムはすでにSUPER。3マスの移動を開始。`, 'accent');
    return next;
  }
  return startMovement(next, total);
}

export function advanceMovement(state) {
  assertPhase(state, 'moving');
  const next = copy(state);
  const movement = next.pendingMovement;
  if (!movement) throw new Error('No movement is pending.');
  const player = next.players[next.currentPlayer];
  if (movement.remaining > 0) {
    player.position += 1;
    movement.remaining -= 1;
    if (checkWinner(next)) return next;
    if (ITEM_SPACES.includes(player.position)) {
      return offerItem(next, player.position, 'moving');
    }
  }
  if (movement.remaining > 0) return next;
  return finishMovement(next);
}

export function chooseItem(state, itemType) {
  assertPhase(state, 'choose-item');
  if (!itemTypes.includes(itemType)) throw new Error('Unknown item type.');
  const next = copy(state);
  const player = next.players[next.currentPlayer];
  if (player.item !== null && next.pendingItemSource !== 'space') throw new Error('The player already has an item.');
  const previousItem = player.item;
  player.item = { type: itemType, level: next.pendingItemLevel || 'normal' };
  addLog(next, previousItem
    ? `${player.name}が${ITEM_LABELS[previousItem.type]}を手放し、${player.item.level === 'super' ? 'SUPER ' : ''}${ITEM_LABELS[itemType]}へ交換。`
    : `${player.name}が${player.item.level === 'super' ? 'SUPER ' : ''}${ITEM_LABELS[itemType]}を獲得。`, 'accent');
  return completeItemChoice(next);
}

function completeItemChoice(state) {
  const player = state.players[state.currentPlayer];
  const nextPhase = state.pendingAfterItemPhase || 'turn-complete';
  const itemSource = state.pendingItemSource;
  state.pendingItemLevel = null;
  state.pendingItemSource = null;
  state.pendingAfterItemPhase = null;
  if (nextPhase === 'moving') {
    state.phase = 'moving';
    if (itemSource === 'sum-three') addLog(state, `${player.name}がアイテムを選択。3マスの移動を開始。`, 'accent');
    return state;
  }
  if (nextPhase === 'rank-bonus-choice') {
    state.phase = nextPhase;
    addLog(state, `${player.name}は現在2位。順位ボーナスで1マス追加できる。`, 'accent');
    return state;
  }
  return prepareTurnEnd(state);
}

export function keepItem(state) {
  assertPhase(state, 'choose-item');
  const next = copy(state);
  const player = next.players[next.currentPlayer];
  if (next.pendingItemSource !== 'space' || player.item === null) throw new Error('There is no current item to keep.');
  addLog(next, `${player.name}は${ITEM_LABELS[player.item.type]}を保持。`, 'accent');
  return completeItemChoice(next);
}

function resolveItemUpgrade(state, upgrade) {
  assertPhase(state, 'upgrade-item-choice');
  const next = copy(state);
  const player = next.players[next.currentPlayer];
  if (player.item === null || player.item.level !== 'normal') throw new Error('A normal item is required.');
  if (upgrade) {
    player.item.level = 'super';
    addLog(next, `${player.name}が${ITEM_LABELS[player.item.type]}をSUPER化！ 3マスの移動を開始。`, 'accent');
  } else {
    addLog(next, `${player.name}はSUPER化せず、3マスの移動を開始。`);
  }
  next.phase = 'moving';
  return next;
}

export const acceptItemUpgrade = (state) => resolveItemUpgrade(state, true);
export const declineItemUpgrade = (state) => resolveItemUpgrade(state, false);

function resolveItemExchange(state, exchange) {
  assertPhase(state, 'item-exchange-choice');
  const next = copy(state);
  const current = next.players[next.currentPlayer];
  const opponent = next.players[next.currentPlayer === 0 ? 1 : 0];
  if (!hasItemExchangeChoice(next)) throw new Error('There is no item exchange to resolve.');
  if (exchange) {
    [current.item, opponent.item] = [opponent.item, current.item];
    addLog(next, `${current.name}がアイテム交換を選択。`, 'accent');
  } else {
    addLog(next, `${current.name}はアイテムを交換しなかった。`);
  }
  return continueAfterMovement(next, true);
}

export const acceptItemExchange = (state) => resolveItemExchange(state, true);
export const declineItemExchange = (state) => resolveItemExchange(state, false);

export function challengeChain(state, dice) {
  assertPhase(state, 'chain-choice');
  validateDice(dice);
  const next = copy(state);
  const total = dice[0] + dice[1];
  const player = next.players[next.currentPlayer];
  next.chainTotal += total;
  if (total === 7) {
    next.chainStreak += 1;
    next.lastChainResult = { outcome: 'success', dice: [...dice], total, streak: next.chainStreak, playerName: player.name, source: 'dice' };
    addLog(next, `追加ロールも7！ 合計${next.chainTotal}マスを保留中。`, 'accent');
    return next;
  }
  next.lastChainResult = { outcome: 'completed', dice: [...dice], total, streak: next.chainStreak, playerName: player.name, source: 'dice' };
  next.phase = 'chain-resolution';
  addLog(next, `追加ロールは ${dice[0]} + ${dice[1]} = ${total}。合計${next.chainTotal}マス。`, 'accent');
  return next;
}

export function resolveChain(state) {
  if (state.status !== 'playing' || !['chain-choice', 'chain-resolution'].includes(state.phase)) throw new Error('Action requires phase "chain-choice" or "chain-resolution".');
  const next = copy(state);
  addLog(next, `連鎖を確定。合計${next.chainTotal}マスを1マスずつ進む。`, 'accent');
  return startMovement(next, next.chainTotal, { tone: 'accent' });
}

export function takeRankBonus(state) {
  assertPhase(state, 'rank-bonus-choice');
  const next = copy(state);
  const player = next.players[next.currentPlayer];
  const opponent = next.players[next.currentPlayer === 0 ? 1 : 0];
  if (player.position >= opponent.position) throw new Error('The rank bonus is only available to the trailing player.');
  addLog(next, `${player.name}が順位ボーナスを選択。`, 'accent');
  return startMovement(next, 1, { kind: 'rank-bonus', exchangeOnComplete: false, allowRankBonus: false, tone: 'accent' });
}

export function skipRankBonus(state) {
  assertPhase(state, 'rank-bonus-choice');
  const next = copy(state);
  addLog(next, `${next.players[next.currentPlayer].name}は順位ボーナスを使わなかった。`);
  return prepareTurnEnd(next);
}

export function endTurn(state) {
  assertPhase(state, 'turn-complete');
  const next = copy(state);
  const player = next.players[next.currentPlayer];
  player.turnsTaken += 1;
  if (next.currentPlayer !== (next.firstPlayer ?? 0) && player.turnsTaken === 1) player.openingRerollAvailable = false;
  const nextPlayer = next.currentPlayer === 0 ? 1 : 0;
  next.currentPlayer = nextPlayer;
  next.turn += 1;
  next.phase = 'awaiting-roll';
  next.pendingRoll = null;
  next.pendingMovement = null;
  next.pendingItemLevel = null;
  next.pendingItemSource = null;
  next.pendingAfterItemPhase = null;
  next.chainStreak = 0;
  next.chainTotal = 0;
  next.lastChainResult = null;
  addLog(next, `${player.name}が番を終了。${next.players[nextPlayer].name}の番。`);
  return next;
}

export function useTobacco(state) {
  assertPhase(state, 'awaiting-roll');
  const next = copy(state);
  const player = next.players[next.currentPlayer];
  const opponent = next.players[next.currentPlayer === 0 ? 1 : 0];
  if (player.item?.type !== ITEM_TYPES.TOBACCO) throw new Error('Tobacco is required.');
  const isSuper = player.item.level === 'super';
  if (isSuper) player.position += 3;
  else player.position = Math.max(0, player.position - 3);
  opponent.position = Math.max(0, opponent.position - 7);
  player.item = null;
  addLog(next, isSuper ? `${player.name}がSUPERタバコを使用。自分は3マス進み、相手を7マス戻した！` : `${player.name}がタバコを使用。自分は3マス、相手は7マス戻った。`, 'danger');
  checkWinner(next);
  return next;
}

export function randomDice(random = Math.random) {
  return [1 + Math.floor(random() * 6), 1 + Math.floor(random() * 6)];
}
