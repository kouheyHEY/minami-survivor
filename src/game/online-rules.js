// game-server の共通 Edge Function から使うルール定義。
// game-server/supabase/functions/game-rooms/rules/minami-survivor/ へ engine.js と一緒にコピーして使う。
import {
  acceptItemExchange,
  acceptItemUpgrade,
  advanceMovement,
  challengeChain,
  chooseItem,
  chooseTurnOrder,
  confirmRoll,
  createOrderGame,
  declineItemExchange,
  declineItemUpgrade,
  endTurn,
  keepItem,
  randomDice,
  reroll,
  resolveChain,
  roll,
  rollForOrder,
  skipRankBonus,
  takeRankBonus,
  useTobacco,
} from './engine.js';

export const seatCount = 2;

const handlers = {
  rollOrder: (state, _action, dice, seat) => rollForOrder(state, seat, dice()),
  chooseOrder: (state, action) => chooseTurnOrder(state, action.choice),
  roll: (state, _action, dice) => roll(state, dice()),
  reroll: (state, action, dice) => reroll(state, dice(), action.source),
  confirm: (state, action) => confirmRoll(state, { adjustment: action.adjustment ?? 0, useSuperBadge: action.useSuperBadge === true }),
  chooseItem: (state, action) => chooseItem(state, action.itemType),
  keepItem: (state) => keepItem(state),
  acceptItemUpgrade: (state) => acceptItemUpgrade(state),
  declineItemUpgrade: (state) => declineItemUpgrade(state),
  acceptItemExchange: (state) => acceptItemExchange(state),
  declineItemExchange: (state) => declineItemExchange(state),
  challenge: (state, _action, dice) => challengeChain(state, dice()),
  resolveChain: (state) => resolveChain(state),
  takeRankBonus: (state) => takeRankBonus(state),
  skipRankBonus: (state) => skipRankBonus(state),
  endTurn: (state) => endTurn(state),
  useTobacco: (state) => useTobacco(state),
};

// オンラインでは1マスずつの進行を端末側の演出に任せ、サーバーは止まる地点まで一気に進める。
function settleMovement(state) {
  let next = state;
  while (next.status === 'playing' && next.phase === 'moving') next = advanceMovement(next);
  return next;
}

export function createGame({ names } = {}) {
  return createOrderGame(names);
}

export function canAct(state, seat, action) {
  if (seat !== 0 && seat !== 1) return false;
  if (action?.type === 'rematch') return state.status === 'won';
  if (state.status !== 'playing') return false;
  // 先手・後手を決める間は、自分の席のサイコロと、目が大きかった席の選択だけを受け付ける。
  if (state.phase === 'order-roll') return action?.type === 'rollOrder' && state.orderRolls[seat] === null;
  if (state.phase === 'order-choice') return action?.type === 'chooseOrder' && state.orderWinner === seat;
  return state.currentPlayer === seat;
}

export function applyAction(state, action, { seat, dice = randomDice } = {}) {
  if (action?.type === 'rematch') {
    if (state.status !== 'won') throw new Error('The match is still in progress.');
    return createOrderGame(state.players.map((player) => player.name));
  }
  const handler = Object.hasOwn(handlers, action?.type) ? handlers[action.type] : null;
  if (!handler) throw new Error('Unknown action.');
  return settleMovement(handler(state, action, dice, seat));
}
