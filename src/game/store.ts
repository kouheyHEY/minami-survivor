import { createStore } from '@tanstack/react-store'
import {
  advanceMovement,
  challengeChain,
  chooseItem,
  confirmRoll,
  createGame,
  endTurn,
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

const MOVEMENT_STEP_MS = 160
let movementTimer: ReturnType<typeof setTimeout> | null = null

interface AppState {
  screen: 'setup' | 'game'
  names: [string, string]
  game: GameState | null
  error: string
}

export const gameStore = createStore<AppState>({
  screen: 'setup',
  names: ['みなみ', 'ゲスト'],
  game: null,
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

export const gameActions = {
  setName(index: 0 | 1, name: string) {
    gameStore.setState((state) => ({
      ...state,
      names: state.names.map((current, nameIndex) => nameIndex === index ? name : current) as [string, string],
    }))
  },
  start() {
    stopMovement()
    gameStore.setState((state) => ({
      ...state,
      screen: 'game',
      game: createGame(state.names),
      error: '',
    }))
  },
  reset() {
    stopMovement()
    gameStore.setState((state) => ({ ...state, screen: 'setup', game: null, error: '' }))
  },
  playAgain() {
    stopMovement()
    gameStore.setState((state) => ({
      ...state,
      game: createGame(state.names),
      error: '',
    }))
  },
  roll() {
    updateGame((game) => roll(game, randomDice()))
  },
  confirm(options: { adjustment?: number; useSuperBadge?: boolean }) {
    updateAndSchedule((game) => confirmRoll(game, options))
  },
  reroll(source: 'opening' | 'badge') {
    updateGame((game) => reroll(game, randomDice(), source))
  },
  chooseItem(itemType: ItemType) {
    updateAndSchedule((game) => chooseItem(game, itemType))
  },
  challenge() {
    updateGame((game) => challengeChain(game, randomDice()))
  },
  resolveChain() {
    updateAndSchedule(resolveChain)
  },
  takeRankBonus() {
    updateAndSchedule(takeRankBonus)
  },
  skipRankBonus() {
    updateGame(skipRankBonus)
  },
  endTurn() {
    updateGame(endTurn)
  },
  useTobacco() {
    updateGame(useTobacco)
  },
}
