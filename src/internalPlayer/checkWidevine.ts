/**
 * Simple Widevine/EME readiness check to fail fast before invoking the Spotify SDK.
 * Throws with a descriptive message if Widevine cannot be obtained.
 */
export async function verifyWidevineSupport(): Promise<void> {
  if (typeof navigator === 'undefined' || !('requestMediaKeySystemAccess' in navigator)) {
    throw new Error('EME API not available in this environment')
  }

  const keySystem = 'com.widevine.alpha'
  const configs: MediaKeySystemConfiguration[] = [
    {
      initDataTypes: ['cenc'],
      // Keep codecs broad but valid for the Spotify Web Playback SDK.
      audioCapabilities: [{ contentType: 'audio/mp4; codecs="mp4a.40.2"', robustness: 'SW_SECURE_CRYPTO' }],
      videoCapabilities: [{ contentType: 'video/mp4; codecs="avc1.42E01E"', robustness: 'SW_SECURE_DECODE' }],
      persistentState: 'optional',
      distinctiveIdentifier: 'optional',
    },
  ]

  try {
    await navigator.requestMediaKeySystemAccess(keySystem, configs)
    console.log('[internal-player] Widevine key system available')
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`Widevine unavailable: ${reason}`)
  }
}
