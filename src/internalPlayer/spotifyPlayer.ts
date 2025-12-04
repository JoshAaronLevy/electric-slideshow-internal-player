import { loadSpotifySdk } from './loadSpotifySdk'
import { SpotifyNamespace, SpotifyPlayer, SpotifyErrorPayload } from './spotifyTypes'
import { SpotifyPlayerLifecycleHandlers } from './types'

const PLAYER_NAME = 'Electric Slideshow Internal Player'

let player: SpotifyPlayer | null = null
let currentAccessToken: string | null = null

function assertSpotifyNamespace(namespace: SpotifyNamespace | undefined): asserts namespace is SpotifyNamespace {
  if (!namespace) {
    throw new Error('Spotify Web Playback SDK is not available on window')
  }
}

function attachErrorHandlers(
  instance: SpotifyPlayer,
  handlers: SpotifyPlayerLifecycleHandlers,
) {
  const relay = (label: string) => (payload: SpotifyErrorPayload) => {
    const message = `[internal-player] ${label}: ${payload.message}`
    console.error(message)
    handlers.onPlayerError(payload.message)
  }

  instance.addListener('initialization_error', relay('initialization_error'))
  instance.addListener('authentication_error', relay('authentication_error'))
  instance.addListener('account_error', relay('account_error'))
  instance.addListener('playback_error', relay('playback_error'))
}

export async function initializeSpotifyPlayer(
  token: string,
  handlers: SpotifyPlayerLifecycleHandlers,
): Promise<void> {
  currentAccessToken = token
  console.log('[internal-player] setAccessToken invoked')

  await loadSpotifySdk()
  assertSpotifyNamespace(window.Spotify)

  if (player) {
    console.log('[internal-player] disposing existing Spotify player instance before re-initializing')
    try {
      player.disconnect()
    } catch (error) {
      console.warn('[internal-player] error while disconnecting previous player', error)
    }
    player = null
  }

  player = new window.Spotify.Player({
    name: PLAYER_NAME,
    getOAuthToken: (cb) => {
      if (!currentAccessToken) {
        handlers.onPlayerError('No access token available for Spotify player')
        return
      }
      cb(currentAccessToken)
    },
    volume: 1,
  })

  player.addListener('ready', ({ device_id }) => {
    console.log('[internal-player] player ready', device_id)
    handlers.onReady(device_id)
  })

  player.addListener('not_ready', ({ device_id }) => {
    console.warn('[internal-player] player not ready', device_id)
    handlers.onNotReady(device_id)
  })

  player.addListener('player_state_changed', (state) => {
    handlers.onStateChange(state)
  })

  attachErrorHandlers(player, handlers)

  const connected = await player.connect()
  if (!connected) {
    throw new Error('Failed to connect Spotify Web Playback SDK player')
  }
}

export function refreshAccessToken(token: string) {
  currentAccessToken = token
}

export function disposeSpotifyPlayer() {
  if (!player) {
    return
  }

  try {
    player.disconnect()
  } catch (error) {
    console.warn('[internal-player] error while disconnecting Spotify player', error)
  } finally {
    player = null
  }
}
