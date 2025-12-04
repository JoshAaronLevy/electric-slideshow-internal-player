/// <reference types="vite/client" />

import type { InternalPlayerApi } from './internalPlayer/types'
import type { SpotifyNamespace } from './internalPlayer/spotifyTypes'

declare global {
	interface Window {
		INTERNAL_PLAYER?: InternalPlayerApi
		Spotify?: SpotifyNamespace
		onSpotifyWebPlaybackSDKReady?: () => void
	}
}

export {}
