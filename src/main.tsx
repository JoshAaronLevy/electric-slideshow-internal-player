import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { internalPlayerApi } from './internalPlayer/internalPlayerApi'

window.INTERNAL_PLAYER = internalPlayerApi
console.log('[internal-player] INTERNAL_PLAYER API is ready')

const IPC_TOKEN_CHANNEL = 'internal-player:set-token'
let envTokenApplied = false

type IpcListener = Parameters<typeof window.ipcRenderer.on>[1]

const handleEnvToken: IpcListener = async (_event, token?: string) => {
  if (!token || envTokenApplied) {
    return
  }

  console.log('[internal-player] Received SPOTIFY_ACCESS_TOKEN from main process; applying to player')
  envTokenApplied = true

  try {
    await window.INTERNAL_PLAYER?.setAccessToken(token)
  } catch (error) {
    envTokenApplied = false
    const message = error instanceof Error ? error.message : 'Failed to apply env token'
    console.error('[internal-player] Error while applying env token', message)
  }
}

window.ipcRenderer.on(IPC_TOKEN_CHANNEL, handleEnvToken)

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    window.ipcRenderer.off(IPC_TOKEN_CHANNEL, handleEnvToken)
    envTokenApplied = false
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Use contextBridge
window.ipcRenderer.on('main-process-message', (_event, message) => {
  console.log(message)
})

// Use contextBridge
window.ipcRenderer.on('main-process-message', (_event, message) => {
  console.log(message)
})
