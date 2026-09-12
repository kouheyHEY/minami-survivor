import { createStore } from '@tanstack/react-store'
import {
  challengeChain,
  chooseItem,
  confirmRoll,
  createGame,
  endTurn,
  randomDice,
  reroll,
  resolveChain,
  roll,
  useTobacco,
  type GameState,
  type ItemType,
} from './engine.js'

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

export const gameActions = {
  setName(index: 0 | 1, name: string) {
    gameStore.setState((state) => ({
      ...state,
      names: state.names.map((current, nameIndex) => nameIndex === index ? name : current) as [string, string],
    }))
  },
  start() {
    gameStore.setState((state) => ({
      ...state,
      screen: 'game',
      game: createGame(state.names),
      error: '',
    }))
  },
  reset() {
    gameStore.setState((state) => ({ ...state, screen: 'setup', game: null, error: '' }))
  },
  playAgain() {
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
    updateGame((game) => confirmRoll(game, options))
  },
  reroll(source: 'opening' | 'badge') {
    updateGame((game) => reroll(game, randomDice(), source))
  },
  chooseItem(itemType: ItemType) {
    updateGame((game) => chooseItem(game, itemType))
  },
  challenge() {
    updateGame((game) => challengeChain(game, randomDice()))
  },
  resolveChain() {
    updateGame(resolveChain)
  },
  endTurn() {
    updateGame(endTurn)
  },
  useTobacco() {
    updateGame(useTobacco)
  },
}
