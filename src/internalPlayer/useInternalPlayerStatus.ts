import { useEffect, useState } from 'react'
import type { InternalPlayerStatus } from './types'

const fallbackStatus: InternalPlayerStatus = {
  initialized: false,
  connected: false,
  deviceId: null,
  currentTrackName: null,
  isPlaying: false,
  lastError: null,
  lastUpdatedAt: Date.now(),
}

function getInitialStatus(): InternalPlayerStatus {
  try {
    return window.INTERNAL_PLAYER?.getStatus() ?? fallbackStatus
  } catch (error) {
    console.warn('[internal-player] Unable to read initial status', error)
    return fallbackStatus
  }
}

export function useInternalPlayerStatus() {
  const [status, setStatus] = useState<InternalPlayerStatus>(getInitialStatus)

  useEffect(() => {
    const api = window.INTERNAL_PLAYER
    if (!api) {
      console.warn('[internal-player] INTERNAL_PLAYER API missing in renderer')
      return
    }

    const unsubscribe = api.subscribe((next) => {
      setStatus(next)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  return status
}
