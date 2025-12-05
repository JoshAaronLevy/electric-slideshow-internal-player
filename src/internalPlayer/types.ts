export interface InternalPlayerStatus {
  initialized: boolean
  connected: boolean
  deviceId: string | null
  currentTrackName: string | null
  isPlaying: boolean
  lastError: string | null
  lastUpdatedAt: number
}

export type InternalPlayerStatusListener = (status: InternalPlayerStatus) => void

export interface InternalPlayerApi {
  setAccessToken(token: string): Promise<void>
  getStatus(): InternalPlayerStatus
  subscribe(listener: InternalPlayerStatusListener): () => void
}

export interface WebPlaybackState {
  paused: boolean
  track_window?: {
    current_track?: WebPlaybackTrack | null
  }
}

export interface WebPlaybackTrack {
  name?: string | null
  artists?: Array<{ name?: string | null }> | null
}

export interface SpotifyPlayerLifecycleHandlers {
  onReady(deviceId: string): void
  onNotReady(deviceId?: string): void
  onStateChange(state: WebPlaybackState | null): void
  onPlayerError(message: string): void
}
