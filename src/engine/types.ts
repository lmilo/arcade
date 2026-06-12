export type Dir = 'up' | 'down' | 'left' | 'right'

export type BoardSize = 'small' | 'normal' | 'large'

export interface GameHelp {
  rules: string
  howTo: string
  win: string
  lose: string
}

export interface GameMeta {
  id: string
  name: string
  emoji: string
  tagline: string
  controls: string
  help: GameHelp
}
