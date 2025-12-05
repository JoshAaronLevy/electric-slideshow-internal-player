const SDK_URL = 'https://sdk.scdn.co/spotify-player.js'

let loadPromise: Promise<void> | null = null

function injectSdkScript(onError: (message: string) => void) {
  if (document.querySelector(`script[src="${SDK_URL}"]`)) {
    return
  }

  const script = document.createElement('script')
  script.id = 'spotify-player'
  script.src = SDK_URL
  script.async = true
  script.onerror = () => {
    const message = 'Failed to load Spotify Web Playback SDK script'
    console.error(`[internal-player] ${message}`)
    onError(message)
  }
  document.head.appendChild(script)
}

export async function loadSpotifySdk(): Promise<void> {
  if (window.Spotify) {
    return
  }

  if (loadPromise) {
    return loadPromise
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      window.onSpotifyWebPlaybackSDKReady = undefined
    }

    // eslint-disable-next-line prefer-const
    let failTimer: number

    window.onSpotifyWebPlaybackSDKReady = () => {
      window.clearTimeout(failTimer)
      cleanup()
      resolve()
    }

    failTimer = window.setTimeout(() => {
      cleanup()
      reject(new Error('Timed out waiting for Spotify Web Playback SDK'))
    }, 15000)

    injectSdkScript((message) => {
      window.clearTimeout(failTimer)
      cleanup()
      reject(new Error(message))
    })
  })

  loadPromise.catch(() => {
    loadPromise = null
  })

  return loadPromise
}
