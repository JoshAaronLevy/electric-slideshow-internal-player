import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { internalPlayerApi } from './internalPlayer/internalPlayerApi'

window.INTERNAL_PLAYER = internalPlayerApi
console.log('[internal-player] INTERNAL_PLAYER API is ready')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Use contextBridge
window.ipcRenderer.on('main-process-message', (_event, message) => {
  console.log(message)
})
