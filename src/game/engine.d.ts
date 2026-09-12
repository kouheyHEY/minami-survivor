export type ItemType = 'badge' | 'charm' | 'tobacco'
export type ItemLevel = 'normal' | 'super'
export type Phase = 'awaiting-roll' | 'roll-options' | 'choose-item' | 'chain-choice' | 'finished'
export type LogTone = 'neutral' | 'accent' | 'danger' | 'win'
export type DicePair = [number, number]

export interface Item {
  type: ItemType
  level: ItemLevel
}

export interface Player {
  id: string
  name: string
  position: number
  item: Item | null
  turnsTaken: number
  openingRerollAvailable: boolean
}

export interface GameState {
  status: 'playing' | 'won'
  phase: Phase
  currentPlayer: 0 | 1
  winner: 0 | 1 | null
  turn: number
  pendingRoll: { dice: DicePair; total: number; adjustment: number } | null
  pendingItemLevel: ItemLevel | null
  afterItemChoice: 'chain-choice' | 'end-turn' | null
  nextLogId: number
  players: [Player, Player]
  log: Array<{ id: number; message: string; tone: LogTone }>
}

export const ITEM_TYPES: Readonly<{ BADGE: 'badge'; CHARM: 'charm'; TOBACCO: 'tobacco' }>
export const ITEM_LABELS: Readonly<Record<ItemType, string>>
export const GOAL: number
export const ITEM_SPACES: readonly number[]

export function createGame(names?: string[], random?: () => number): GameState
export function roll(state: GameState, dice: DicePair): GameState
export function reroll(state: GameState, dice: DicePair, source: 'opening' | 'badge'): GameState
export function confirmRoll(state: GameState, options?: { adjustment?: number; useSuperBadge?: boolean }): GameState
export function chooseItem(state: GameState, itemType: ItemType): GameState
export function challengeChain(state: GameState, dice: DicePair): GameState
export function stopChain(state: GameState): GameState
export function useTobacco(state: GameState): GameState
export function randomDice(random?: () => number): DicePair
