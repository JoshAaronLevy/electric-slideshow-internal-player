import { app, BrowserWindow } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

const WINDOW_TITLE = 'Electric Slideshow Internal Player'
const DEFAULT_WINDOW_DIMENSIONS = { width: 1024, height: 768 }
const IPC_TOKEN_CHANNEL = 'internal-player:set-token'

import type { BrowserWindow as BrowserWindowType } from 'electron'

let win: BrowserWindowType | null

const envSpotifyToken = process.env.SPOTIFY_ACCESS_TOKEN?.trim()

type WidevineConfig = { cdmPath: string; version: string }

if (envSpotifyToken) {
  console.log('[main] SPOTIFY_ACCESS_TOKEN detected; will forward to renderer after load')
} else {
  console.log('[main] SPOTIFY_ACCESS_TOKEN not set; renderer will rely on manual token input')
}

function readManifest(manifestPath: string): string | null {
  try {
    const manifestRaw = fs.readFileSync(manifestPath, 'utf-8')
    const manifest = JSON.parse(manifestRaw) as { version?: string }
    return manifest.version ?? null
  } catch (error) {
    console.warn('[main] Failed to read Widevine manifest.json:', error)
    return null
  }
}

function detectWidevineFromChrome(): WidevineConfig | null {
  // Prefer explicit overrides when provided.
  const envPath = process.env.WIDEVINE_CDM_PATH?.trim()
  const envVersion = process.env.WIDEVINE_CDM_VERSION?.trim()

  if (envPath) {
    if (!fs.existsSync(envPath)) {
      console.warn('[main] WIDEVINE_CDM_PATH provided but file not found:', envPath)
      return null
    }
    const version = envVersion ?? '0'
    return { cdmPath: envPath, version }
  }

  // Default to Chrome’s bundled Widevine CDM (modern path under Google Chrome Framework).
  const archSegment = process.arch === 'arm64' ? 'mac_arm64' : 'mac_x64'
  console.log('[main] Architecture:', process.arch, 'Segment:', archSegment)
  const chromeApp = '/Applications/Google Chrome.app'
  const versionsDir = path.join(
    chromeApp,
    'Contents/Frameworks/Google Chrome Framework.framework/Versions'
  )

  const candidateVersionDirs = ['Current']
  try {
    const versions = fs.readdirSync(versionsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^\d+\./.test(entry.name))
      .map((entry) => entry.name)
      .sort()
      .reverse()
    candidateVersionDirs.push(...versions)
  } catch {
    // ignore — will fall back to legacy path below
  }

  for (const versionDir of candidateVersionDirs) {
    const base = path.join(
      versionsDir,
      versionDir,
      'Libraries',
      'WidevineCdm'
    )
    const manifestPath = path.join(base, 'manifest.json')
    const cdmPath = path.join(base, '_platform_specific', archSegment, 'libwidevinecdm.dylib')
    console.log('[main] Checking modern path:', cdmPath)
    if (fs.existsSync(cdmPath)) {
      const version = envVersion ?? readManifest(manifestPath) ?? '0'
      return { cdmPath, version }
    }
  }

  // Legacy path fallback (older Chrome packaging)
  const legacyBase = path.join(chromeApp, 'Contents/Frameworks/WidevineCdm')
  const legacyManifest = path.join(legacyBase, 'manifest.json')
  const legacyCdm = path.join(legacyBase, '_platform_specific', archSegment, 'libwidevinecdm.dylib')
  console.log('[main] Checking legacy path:', legacyCdm)
  if (fs.existsSync(legacyCdm)) {
    const version = envVersion ?? readManifest(legacyManifest) ?? '0'
    return { cdmPath: legacyCdm, version }
  }

  console.warn('[main] Widevine CDM not found in Chrome installation (checked modern and legacy paths)')
  return null
}

const widevineConfig = detectWidevineFromChrome()
if (widevineConfig) {
  app.commandLine.appendSwitch('widevine-cdm-path', widevineConfig.cdmPath)
  app.commandLine.appendSwitch('widevine-cdm-version', widevineConfig.version)
  console.log('[main] Widevine configured', {
    path: widevineConfig.cdmPath,
    version: widevineConfig.version,
  })
} else {
  console.warn('[main] Widevine not configured; Spotify Web Playback SDK will fail with EME errors')
}

// Allow autoplay without user gesture for headless/hidden playback.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')
// Bypass VMP verification for development
app.commandLine.appendSwitch('no-verify-widevine-cdm')

function createWindow() {
  win = new BrowserWindow({
    title: WINDOW_TITLE,
    width: DEFAULT_WINDOW_DIMENSIONS.width,
    height: DEFAULT_WINDOW_DIMENSIONS.height,
    minWidth: 900,
    minHeight: 600,
    show: false,
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      plugins: true, // Enable Widevine
    },
  })

  console.log('[main] BrowserWindow created')

  win.once('ready-to-show', () => {
    console.log('[main] window ready to show')
    win?.show()
  })

  win.on('closed', () => {
    console.log('[main] window closed')
    win = null
  })

  // Test active push message to Renderer-process.
  win?.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())

    if (envSpotifyToken) {
      win?.webContents.send(IPC_TOKEN_CHANNEL, envSpotifyToken)
    }
  })

  win?.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[main] renderer failed to load', { errorCode, errorDescription })
  })

  if (VITE_DEV_SERVER_URL) {
    win?.loadURL(VITE_DEV_SERVER_URL).catch((error) => {
      console.error('[main] failed to load dev server URL', error)
    })
  } else {
    // win.loadFile('dist/index.html')
    win?.loadFile(path.join(RENDERER_DIST, 'index.html')).catch((error) => {
      console.error('[main] failed to load production HTML', error)
    })
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  console.log('[main] app ready, creating window')
  createWindow()
})
