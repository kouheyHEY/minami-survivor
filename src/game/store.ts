import { createStore } from '@tanstack/react-store'
import {
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
  randomDice,
  reroll,
  resolveChain,
  roll,
  skipRankBonus,
  takeRankBonus,
  useTobacco,
  type GameState,
  type ItemType,
} from './engine.js'
import {
  RoomError,
  isWaiting,
  roomApi,
  roomCodeFromUrl,
  seatStorage,
  subscribeRoom,
  type OnlineAction,
  type RoomView,
  type SavedSeat,
} from '../online/roomClient.js'

const MOVEMENT_STEP_MS = 160
const OFFLINE_POLL_MS = 3000
let movementTimer: ReturnType<typeof setTimeout> | null = null

interface OnlineState {
  seat: SavedSeat
  room: RoomView
  connected: boolean
}

interface AppState {
  screen: 'setup' | 'waiting' | 'game'
  mode: 'local' | 'online'
  names: [string, string]
  joinCode: string
  onlineName: string
  game: GameState | null
  online: OnlineState | null
  busy: boolean
  error: string
}

const invitedCode = roomCodeFromUrl()

export const gameStore = createStore<AppState>({
  screen: 'setup',
  mode: invitedCode ? 'online' : 'local',
  names: ['みなみ', 'ゲスト'],
  joinCode: invitedCode,
  onlineName: '',
  game: null,
  online: null,
  busy: false,
  error: '',
})

function updateGame(action: (game: GameState) => GameState) {
  gameStore.setState((state) => {
    if (!state.game) return state
    try {
      return { ...state, game: action(state.game), error: '' }
    } catch (error) {
      return { ...state, error: error instanceof Error ? error.message : '操作できませんでした。' }
    }
  })
}

function stopMovement() {
  if (movementTimer !== null) clearTimeout(movementTimer)
  movementTimer = null
}

function scheduleMovement() {
  stopMovement()
  if (gameStore.state.game?.phase !== 'moving') return
  movementTimer = setTimeout(() => {
    movementTimer = null
    updateGame(advanceMovement)
    scheduleMovement()
  }, MOVEMENT_STEP_MS)
}

function updateAndSchedule(action: (game: GameState) => GameState) {
  updateGame(action)
  scheduleMovement()
}

// ---- オンライン対戦 ----

let unsubscribeRoom: (() => void) | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : '通信に失敗しました。')

function applyRoom(room: RoomView) {
  gameStore.setState((state) => {
    if (!state.online || state.online.room.id !== room.id || room.version < state.online.room.version) return state
    return {
      ...state,
      screen: isWaiting(room) ? 'waiting' : 'game',
      game: isWaiting(room) ? null : room.state as GameState,
      online: { ...state.online, room },
    }
  })
}

async function refreshRoom() {
  const online = gameStore.state.online
  if (!online) return
  try {
    const { room } = await roomApi.get(online.seat.code, online.seat.token)
    applyRoom(room)
  } catch (error) {
    if (error instanceof RoomError && error.status === 404) {
      leaveRoom('部屋の期限が切れました。')
    }
  }
}

function setConnected(connected: boolean) {
  gameStore.setState((state) => state.online ? { ...state, online: { ...state.online, connected } } : state)
  if (pollTimer !== null) clearInterval(pollTimer)
  pollTimer = null
  // Realtime がつながらない間は、定期的に取り直して相手の操作を拾う。
  if (!connected) pollTimer = setInterval(refreshRoom, OFFLINE_POLL_MS)
  else void refreshRoom()
}

function onVisible() {
  if (document.visibilityState === 'visible') void refreshRoom()
}

function enterRoom(room: RoomView, seat: SavedSeat) {
  seatStorage.save(seat)
  unsubscribeRoom?.()
  gameStore.setState((state) => ({
    ...state,
    mode: 'online',
    joinCode: '',
    busy: false,
    error: '',
    online: { seat, room, connected: false },
  }))
  applyRoom(room)
  setConnected(false)
  unsubscribeRoom = subscribeRoom(room, {
    onUpdate: (version) => {
      if (version > (gameStore.state.online?.room.version ?? 0)) void refreshRoom()
    },
    onConnection: setConnected,
  })
  document.addEventListener('visibilitychange', onVisible)
}

function leaveRoom(error = '') {
  unsubscribeRoom?.()
  unsubscribeRoom = null
  if (pollTimer !== null) clearInterval(pollTimer)
  pollTimer = null
  document.removeEventListener('visibilitychange', onVisible)
  seatStorage.clear()
  gameStore.setState((state) => ({ ...state, screen: 'setup', game: null, online: null, busy: false, error }))
}

async function withBusy(task: () => Promise<void>) {
  if (gameStore.state.busy) return
  gameStore.setState((state) => ({ ...state, busy: true, error: '' }))
  try {
    await task()
  } catch (error) {
    if (error instanceof RoomError && error.room) applyRoom(error.room)
    // 相手の操作と重なっただけなら、最新の画面を見せれば十分なので知らせない。
    const silent = error instanceof RoomError && error.status === 409 && error.room
    gameStore.setState((state) => ({ ...state, error: silent ? '' : errorMessage(error) }))
  } finally {
    gameStore.setState((state) => ({ ...state, busy: false }))
  }
}

function sendAction(action: OnlineAction) {
  return withBusy(async () => {
    const online = gameStore.state.online
    if (!online) return
    const { room } = await roomApi.act(online.seat, online.room.version, action)
    applyRoom(room)
  })
}

// 画面の操作。オンラインではサーバーへ送り、この端末ではその場で反映する。
const isOnline = () => gameStore.state.mode === 'online' && gameStore.state.online !== null

export const gameActions = {
  setName(index: 0 | 1, name: string) {
    gameStore.setState((state) => ({
      ...state,
      names: state.names.map((current, nameIndex) => nameIndex === index ? name : current) as [string, string],
    }))
  },
  setMode(mode: AppState['mode']) {
    gameStore.setState((state) => ({ ...state, mode, error: '' }))
  },
  setOnlineName(name: string) {
    gameStore.setState((state) => ({ ...state, onlineName: name }))
  },
  setJoinCode(code: string) {
    gameStore.setState((state) => ({ ...state, joinCode: code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) }))
  },
  start() {
    stopMovement()
    gameStore.setState((state) => ({
      ...state,
      screen: 'game',
      mode: 'local',
      game: createGame(state.names),
      error: '',
    }))
  },
  reset() {
    stopMovement()
    if (isOnline()) return leaveRoom()
    gameStore.setState((state) => ({ ...state, screen: 'setup', game: null, error: '' }))
  },
  playAgain() {
    if (isOnline()) return void sendAction({ type: 'rematch' })
    stopMovement()
    gameStore.setState((state) => ({
      ...state,
      game: createGame(state.names),
      error: '',
    }))
  },
  createRoom() {
    return withBusy(async () => {
      const { room, token } = await roomApi.create(gameStore.state.onlineName)
      enterRoom(room, { code: room.code, token: token! })
    })
  },
  joinRoom() {
    return withBusy(async () => {
      const { room, token } = await roomApi.join(gameStore.state.joinCode, gameStore.state.onlineName)
      enterRoom(room, { code: room.code, token: token! })
    })
  },
  resumeRoom() {
    const seat = seatStorage.load()
    if (!seat || gameStore.state.online) return
    return withBusy(async () => {
      try {
        const { room } = await roomApi.get(seat.code, seat.token)
        if (room.seat === null) return seatStorage.clear()
        enterRoom(room, seat)
      } catch (error) {
        if (error instanceof RoomError && error.status === 404) return seatStorage.clear()
        throw error
      }
    })
  },
  roll() {
    if (isOnline()) return void sendAction({ type: 'roll' })
    updateGame((game) => roll(game, randomDice()))
  },
  confirm(options: { adjustment?: number; useSuperBadge?: boolean }) {
    if (isOnline()) return void sendAction({ type: 'confirm', ...options })
    updateAndSchedule((game) => confirmRoll(game, options))
  },
  reroll(source: 'opening' | 'badge') {
    if (isOnline()) return void sendAction({ type: 'reroll', source })
    updateGame((game) => reroll(game, randomDice(), source))
  },
  chooseItem(itemType: ItemType) {
    if (isOnline()) return void sendAction({ type: 'chooseItem', itemType })
    updateAndSchedule((game) => chooseItem(game, itemType))
  },
  keepItem() {
    if (isOnline()) return void sendAction({ type: 'keepItem' })
    updateAndSchedule(keepItem)
  },
  acceptItemUpgrade() {
    if (isOnline()) return void sendAction({ type: 'acceptItemUpgrade' })
    updateAndSchedule(acceptItemUpgrade)
  },
  declineItemUpgrade() {
    if (isOnline()) return void sendAction({ type: 'declineItemUpgrade' })
    updateAndSchedule(declineItemUpgrade)
  },
  acceptItemExchange() {
    if (isOnline()) return void sendAction({ type: 'acceptItemExchange' })
    updateGame(acceptItemExchange)
  },
  declineItemExchange() {
    if (isOnline()) return void sendAction({ type: 'declineItemExchange' })
    updateGame(declineItemExchange)
  },
  challenge() {
    if (isOnline()) return void sendAction({ type: 'challenge' })
    updateGame((game) => challengeChain(game, randomDice()))
  },
  resolveChain() {
    if (isOnline()) return void sendAction({ type: 'resolveChain' })
    updateAndSchedule(resolveChain)
  },
  takeRankBonus() {
    if (isOnline()) return void sendAction({ type: 'takeRankBonus' })
    updateAndSchedule(takeRankBonus)
  },
  skipRankBonus() {
    if (isOnline()) return void sendAction({ type: 'skipRankBonus' })
    updateGame(skipRankBonus)
  },
  endTurn() {
    if (isOnline()) return void sendAction({ type: 'endTurn' })
    updateGame(endTurn)
  },
  useTobacco() {
    if (isOnline()) return void sendAction({ type: 'useTobacco' })
    updateGame(useTobacco)
  },
}
