export const ITEM_TYPES = Object.freeze({
  BADGE: 'badge',
  CHARM: 'charm',
  TOBACCO: 'tobacco',
});

export const ITEM_LABELS = Object.freeze({
  [ITEM_TYPES.BADGE]: 'ぬいぐるみバッジ',
  [ITEM_TYPES.CHARM]: 'めじるしチャーム',
  [ITEM_TYPES.TOBACCO]: 'タバコ',
});

export const GOAL = 73;
export const ITEM_SPACES = Object.freeze([10, 25, 45]);

const itemTypes = Object.values(ITEM_TYPES);

function copy(state) {
  return structuredClone(state);
}

function assertPhase(state, expected) {
  if (state.status !== 'playing' || state.phase !== expected) {
    throw new Error(`Action requires phase "${expected}".`);
  }
}

function validateDice(dice) {
  if (
    !Array.isArray(dice)
    || dice.length !== 2
    || dice.some((value) => !Number.isInteger(value) || value < 1 || value > 6)
  ) {
    throw new Error('Dice must contain two integers from 1 to 6.');
  }
}

function addLog(state, message, tone = 'neutral') {
  state.log = [
    { id: state.nextLogId, message, tone },
    ...state.log,
  ].slice(0, 12);
  state.nextLogId += 1;
}

function finishTurn(state) {
  const player = state.players[state.currentPlayer];
  player.turnsTaken += 1;
  if (state.currentPlayer === 1 && player.turnsTaken === 1) {
    player.openingRerollAvailable = false;
  }

  state.currentPlayer = state.currentPlayer === 0 ? 1 : 0;
  state.turn += 1;
  state.phase = 'awaiting-roll';
  state.pendingRoll = null;
  state.pendingItemLevel = null;
  state.afterItemChoice = null;
  return state;
}

function checkWinner(state) {
  const player = state.players[state.currentPlayer];
  if (player.position < GOAL) return false;

  state.status = 'won';
  state.winner = state.currentPlayer;
  state.phase = 'finished';
  state.pendingRoll = null;
  addLog(state, `${player.name}が${player.position}マス目に到達。勝利！`, 'win');
  return true;
}

function exchangeItemsOnCollision(state) {
  const current = state.players[state.currentPlayer];
  const opponent = state.players[state.currentPlayer === 0 ? 1 : 0];
  if (current.position !== opponent.position) return;

  [current.item, opponent.item] = [opponent.item, current.item];
  addLog(state, `同じ${current.position}マス目に着地。アイテムを交換！`, 'accent');
}

function continueAfterLanding(state, nextPhase) {
  const player = state.players[state.currentPlayer];
  if (ITEM_SPACES.includes(player.position) && player.item === null) {
    state.phase = 'choose-item';
    state.pendingItemLevel = player.position === 45 ? 'super' : 'normal';
    state.afterItemChoice = nextPhase;
    addLog(
      state,
      `${player.position}マス目のアイテムマス！${state.pendingItemLevel === 'super' ? ' SUPERアイテム' : ' アイテム'}を選ぼう。`,
      'accent',
    );
    return state;
  }

  if (nextPhase === 'chain-choice') {
    state.phase = 'chain-choice';
    state.pendingRoll = null;
    return state;
  }
  return finishTurn(state);
}

function moveByDice(state, spaces, nextPhase) {
  const player = state.players[state.currentPlayer];
  player.position += spaces;
  addLog(state, `${player.name}が${spaces}マス進んで${player.position}マス目へ。`);
  if (checkWinner(state)) return state;
  exchangeItemsOnCollision(state);
  return continueAfterLanding(state, nextPhase);
}

export function createGame(names = ['プレイヤー1', 'プレイヤー2'], random = Math.random) {
  const normalizedNames = [0, 1].map((index) => {
    const value = String(names[index] || '').trim();
    return value || `プレイヤー${index + 1}`;
  });
  const randomIndex = Math.min(itemTypes.length - 1, Math.floor(random() * itemTypes.length));
  const openingItem = itemTypes[Math.max(0, randomIndex)];

  return {
    status: 'playing',
    phase: 'awaiting-roll',
    currentPlayer: 0,
    winner: null,
    turn: 1,
    pendingRoll: null,
    pendingItemLevel: null,
    afterItemChoice: null,
    nextLogId: 3,
    players: [
      {
        id: 'player-1',
        name: normalizedNames[0],
        position: 0,
        item: null,
        turnsTaken: 0,
        openingRerollAvailable: false,
      },
      {
        id: 'player-2',
        name: normalizedNames[1],
        position: 0,
        item: { type: openingItem, level: 'normal' },
        turnsTaken: 0,
        openingRerollAvailable: true,
      },
    ],
    log: [
      { id: 2, message: `${normalizedNames[1]}は後手補正で「${ITEM_LABELS[openingItem]}」を獲得。`, tone: 'accent' },
      { id: 1, message: `${normalizedNames[0]}の手番からスタート。`, tone: 'neutral' },
    ],
  };
}

export function roll(state, dice) {
  assertPhase(state, 'awaiting-roll');
  validateDice(dice);
  const next = copy(state);
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
    if (next.currentPlayer !== 1 || player.turnsTaken !== 0 || !player.openingRerollAvailable) {
      throw new Error('The opening reroll is not available.');
    }
    player.openingRerollAvailable = false;
    addLog(next, `${player.name}が後手補正で振り直した。`, 'accent');
  } else if (source === 'badge') {
    if (player.item?.type !== ITEM_TYPES.BADGE || player.item.level !== 'normal') {
      throw new Error('A normal badge is required to reroll.');
    }
    player.item = null;
    addLog(next, `${player.name}がぬいぐるみバッジで振り直した。`, 'accent');
  } else {
    throw new Error('Unknown reroll source.');
  }

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
    if (player.item?.type !== ITEM_TYPES.BADGE || player.item.level !== 'super') {
      throw new Error('A SUPER badge is required.');
    }
    player.item = null;
    total = 7;
    addLog(next, `${player.name}がSUPERぬいぐるみバッジで出目を7にした！`, 'accent');
  }

  const adjustment = options.adjustment ?? 0;
  if (adjustment !== 0) {
    if (player.item?.type !== ITEM_TYPES.CHARM) {
      throw new Error('A charm is required to adjust the roll.');
    }
    const limit = player.item.level === 'super' ? 2 : 1;
    if (!Number.isInteger(adjustment) || Math.abs(adjustment) > limit) {
      throw new Error(`The adjustment must be within ±${limit}.`);
    }
    player.item = null;
    total += adjustment;
    addLog(next, `${player.name}がめじるしチャームで合計を${adjustment > 0 ? '+' : ''}${adjustment}した。`, 'accent');
  }

  next.pendingRoll.adjustment = adjustment;
  next.pendingRoll.total = total;

  if (total === 3) {
    player.position += 3;
    addLog(next, `${player.name}が3マス進んで${player.position}マス目へ。`, 'accent');
    if (checkWinner(next)) return next;
    exchangeItemsOnCollision(next);

    if (player.item === null) {
      next.phase = 'choose-item';
      next.pendingItemLevel = player.position === 45 ? 'super' : 'normal';
      next.afterItemChoice = 'end-turn';
      addLog(next, '合計3！ 好きなアイテムを1つ選ぼう。', 'accent');
      return next;
    }

    player.item.level = 'super';
    addLog(next, `合計3！ ${ITEM_LABELS[player.item.type]}がSUPERになった。`, 'accent');
    return finishTurn(next);
  }

  return moveByDice(next, total, total === 7 ? 'chain-choice' : 'end-turn');
}

export function chooseItem(state, itemType) {
  assertPhase(state, 'choose-item');
  if (!itemTypes.includes(itemType)) throw new Error('Unknown item type.');
  const next = copy(state);
  const player = next.players[next.currentPlayer];
  if (player.item !== null) throw new Error('The player already has an item.');

  player.item = { type: itemType, level: next.pendingItemLevel || 'normal' };
  addLog(
    next,
    `${player.name}が${player.item.level === 'super' ? 'SUPER ' : ''}${ITEM_LABELS[itemType]}を獲得。`,
    'accent',
  );

  if (next.afterItemChoice === 'chain-choice') {
    next.phase = 'chain-choice';
    next.pendingItemLevel = null;
    next.afterItemChoice = null;
    next.pendingRoll = null;
    return next;
  }
  return finishTurn(next);
}

export function challengeChain(state, dice) {
  assertPhase(state, 'chain-choice');
  validateDice(dice);
  const next = copy(state);
  const total = dice[0] + dice[1];
  addLog(next, `連鎖チャレンジは ${dice[0]} + ${dice[1]} = ${total}。`, total === 7 ? 'accent' : 'danger');

  if (total === 7) {
    return moveByDice(next, 7, 'chain-choice');
  }

  const player = next.players[next.currentPlayer];
  player.position = Math.max(0, player.position - 2);
  addLog(next, `連鎖失敗。${player.name}は2マス戻って${player.position}マス目へ。`, 'danger');
  return finishTurn(next);
}

export function stopChain(state) {
  assertPhase(state, 'chain-choice');
  const next = copy(state);
  addLog(next, `${next.players[next.currentPlayer].name}は連鎖を確定した。`);
  return finishTurn(next);
}

export function useTobacco(state) {
  assertPhase(state, 'awaiting-roll');
  const next = copy(state);
  const player = next.players[next.currentPlayer];
  const opponent = next.players[next.currentPlayer === 0 ? 1 : 0];
  if (player.item?.type !== ITEM_TYPES.TOBACCO) {
    throw new Error('Tobacco is required.');
  }

  const isSuper = player.item.level === 'super';
  if (!isSuper) player.position = Math.max(0, player.position - 3);
  opponent.position = Math.max(0, opponent.position - 7);
  player.item = null;
  addLog(
    next,
    isSuper
      ? `${player.name}がSUPERタバコを使用。相手を7マス戻した！`
      : `${player.name}がタバコを使用。自分は3マス、相手は7マス戻った。`,
    'danger',
  );
  return next;
}

export function randomDice(random = Math.random) {
  return [1 + Math.floor(random() * 6), 1 + Math.floor(random() * 6)];
}

