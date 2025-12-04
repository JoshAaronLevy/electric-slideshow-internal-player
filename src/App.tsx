import './App.css'

function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="app-label">Electric Slideshow</p>
        <h1>Electric Slideshow Internal Player</h1>
        <p className="app-subtitle">Companion Spotify Web Playback SDK device</p>
      </header>

      <section className="status-panel">
        <h2>Internal Player Status</h2>
        <p className="status-message">
          Status:{' '}
          <span className="status-pill status-pill--pending">Not initialized</span>
        </p>
        <p className="status-detail">
          Waiting for Spotify access token. Player wiring lands in Stage 2 and Stage 3.
        </p>
      </section>
    </main>
  )
}

export default App
