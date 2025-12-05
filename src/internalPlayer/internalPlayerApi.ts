import {
  InternalPlayerApi,
  InternalPlayerStatus,
  InternalPlayerStatusListener,
  WebPlaybackState,
  SpotifyPlayerLifecycleHandlers,
} from './types'
import { disposeSpotifyPlayer, initializeSpotifyPlayer, refreshAccessToken } from './spotifyPlayer'
<<<<<<< HEAD
=======
import { verifyWidevineSupport } from './checkWidevine'
>>>>>>> dev

const defaultStatus: InternalPlayerStatus = {
  initialized: false,
  connected: false,
  deviceId: null,
  currentTrackName: null,
  isPlaying: false,
  lastError: null,
  lastUpdatedAt: Date.now(),
}

let status: InternalPlayerStatus = { ...defaultStatus }
const listeners = new Set<InternalPlayerStatusListener>()

function snapshot(): InternalPlayerStatus {
  return { ...status }
}

function emitStatus() {
  const next = snapshot()
  listeners.forEach((listener) => listener(next))
}

function mutateStatus(partial: Partial<InternalPlayerStatus>) {
  status = { ...status, ...partial, lastUpdatedAt: Date.now() }
  emitStatus()
}

function handleStateChange(state: WebPlaybackState | null) {
  if (!state) {
    mutateStatus({ currentTrackName: null, isPlaying: false })
    return
  }

  const trackName = state.track_window?.current_track?.name ?? null
  mutateStatus({ currentTrackName: trackName, isPlaying: !state.paused })

  console.log('[internal-player] player_state_changed', {
    trackName,
    paused: state.paused,
  })
}

function handleReady(deviceId: string) {
  mutateStatus({ connected: true, deviceId, initialized: true, lastError: null })
}

function handleNotReady(deviceId?: string) {
  mutateStatus({ connected: false, deviceId: deviceId ?? status.deviceId })
}

function handlePlayerError(message: string) {
  mutateStatus({ lastError: message })
}

const lifecycleHandlers: SpotifyPlayerLifecycleHandlers = {
  onReady: handleReady,
  onNotReady: handleNotReady,
  onStateChange: handleStateChange,
  onPlayerError: handlePlayerError,
}

async function setAccessToken(token: string): Promise<void> {
  const trimmed = token?.trim()
  if (!trimmed) {
    const errorMessage = 'Access token must be a non-empty string'
    handlePlayerError(errorMessage)
    throw new Error(errorMessage)
  }

  console.log('[internal-player] INTERNAL_PLAYER.setAccessToken invoked')
  refreshAccessToken(trimmed)
  mutateStatus({ initialized: true, lastError: null })

  try {
<<<<<<< HEAD
=======
    // Fail fast if Widevine/EME is not available before touching the SDK.
    await verifyWidevineSupport()
>>>>>>> dev
    await initializeSpotifyPlayer(trimmed, lifecycleHandlers)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to initialize Spotify player'
    handlePlayerError(message)
    disposeSpotifyPlayer()
    throw error
  }
}

function getStatus(): InternalPlayerStatus {
  return snapshot()
}

function subscribe(listener: InternalPlayerStatusListener): () => void {
  listeners.add(listener)
  listener(snapshot())
  return () => listeners.delete(listener)
}

export const internalPlayerApi: InternalPlayerApi = {
  setAccessToken,
  getStatus,
  subscribe,
}

export { setAccessToken, getStatus, subscribe }

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    listeners.clear()
    disposeSpotifyPlayer()
  })
}
