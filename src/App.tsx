import { useState } from 'react'
import './App.css'
import { useInternalPlayerStatus } from './internalPlayer/useInternalPlayerStatus'

function App() {
  const status = useInternalPlayerStatus()
  const [tokenInput, setTokenInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  const connectionLabel = status.connected
    ? 'Connected'
    : status.initialized
      ? 'Initialized'
      : 'Not initialized'

  const connectionPillClass = status.connected
    ? 'status-pill status-pill--ok'
    : status.initialized
      ? 'status-pill status-pill--pending'
      : 'status-pill status-pill--idle'

  const playbackLabel = status.currentTrackName
    ? `${status.currentTrackName} • ${status.isPlaying ? 'Playing' : 'Paused'}`
    : 'No track reported yet'

  const lastUpdated = new Date(status.lastUpdatedAt).toLocaleTimeString()

  async function handleSetToken(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = tokenInput.trim()

    if (!trimmed) {
      setSubmitError('Please paste a valid Spotify access token.')
      setSubmitSuccess(null)
      return
    }

    if (!window.INTERNAL_PLAYER) {
      setSubmitError('INTERNAL_PLAYER API is not available in this window.')
      setSubmitSuccess(null)
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(null)

    try {
      await window.INTERNAL_PLAYER.setAccessToken(trimmed)
      setSubmitSuccess('Token applied. Waiting for Spotify player to connect…')
      setTokenInput('')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to set access token'
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="app-label">Electric Slideshow</p>
        <h1>Electric Slideshow Internal Player</h1>
        <p className="app-subtitle">Companion Spotify Web Playback SDK device</p>
      </header>

      <section className="status-panel">
        <div className="status-panel__header">
          <h2>Internal Player Status</h2>
          <span className={connectionPillClass}>{connectionLabel}</span>
        </div>

        <dl className="status-list">
          <div>
            <dt>Device ID</dt>
            <dd>{status.deviceId ?? '—'}</dd>
          </div>
          <div>
            <dt>Playback</dt>
            <dd>{playbackLabel}</dd>
          </div>
          <div>
            <dt>Last Error</dt>
            <dd>{status.lastError ?? 'None reported'}</dd>
          </div>
          <div>
            <dt>Last Update</dt>
            <dd>{lastUpdated}</dd>
          </div>
        </dl>

        <p className="status-detail">
          Paste a Spotify access token with <code>streaming</code>, <code>user-read-playback-state</code>, and{' '}
          <code>user-modify-playback-state</code> scopes to bring this player online.
        </p>
      </section>

      <section className="token-panel">
        <h2>Manual Token Input</h2>
        <p className="token-panel__hint">
          Tokens expire quickly; run them via DevTools (`INTERNAL_PLAYER.setAccessToken(token)`) or use this form.
        </p>

        <form className="token-form" onSubmit={handleSetToken}>
          <textarea
            className="token-input"
            placeholder="Paste Spotify access token here"
            value={tokenInput}
            onChange={(event) => setTokenInput(event.target.value)}
            spellCheck={false}
            rows={4}
          />
          <div className="token-form__actions">
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Applying…' : 'Set Access Token'}
            </button>
          </div>
        </form>

        {submitError && <p className="feedback feedback--error">{submitError}</p>}
        {submitSuccess && <p className="feedback feedback--success">{submitSuccess}</p>}
      </section>
    </main>
  )
}

export default App
