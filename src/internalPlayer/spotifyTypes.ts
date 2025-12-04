import { WebPlaybackState } from './types'

export interface SpotifyReadyEvent {
  device_id: string
}

export interface SpotifyErrorPayload {
  message: string
}

export type SpotifyErrorHandler = (payload: SpotifyErrorPayload) => void

export interface SpotifyPlayer {
  connect(): Promise<boolean>
  disconnect(): void
  addListener(event: 'ready', callback: (payload: SpotifyReadyEvent) => void): boolean
  addListener(event: 'not_ready', callback: (payload: SpotifyReadyEvent) => void): boolean
  addListener(event: 'player_state_changed', callback: (state: WebPlaybackState | null) => void): boolean
  addListener(
    event: 'initialization_error' | 'authentication_error' | 'account_error' | 'playback_error',
    callback: SpotifyErrorHandler,
  ): boolean
}

export interface SpotifyPlayerOptions {
  name: string
  getOAuthToken: (cb: (token: string) => void) => void
  volume?: number
}

export interface SpotifyNamespace {
  Player: new (options: SpotifyPlayerOptions) => SpotifyPlayer
}
