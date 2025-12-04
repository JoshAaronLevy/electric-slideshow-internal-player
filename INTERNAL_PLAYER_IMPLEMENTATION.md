# Internal Player Implementation Plan

This document outlines the staged implementation approach for the Electric Slideshow internal Spotify player inside the Electron + React app scaffolded in this repo. The focus is on keeping the main process, renderer, and Spotify Web Playback SDK integration cleanly separated and easy to iterate on.

## Target File Structure

```
/electron
  main.ts              # BrowserWindow setup and env wiring
  preload.ts           # (optional) context bridge surface if/when needed
/src
  main.tsx             # React entry; wires up INTERNAL_PLAYER global
  App.tsx              # React UI shell and status/debug surface
  internalPlayer/
    spotifyPlayer.ts   # Web Playback SDK wrapper (init, event lifecycle)
    internalPlayerApi.ts # INTERNAL_PLAYER implementation, status store
```

* `electron/main.ts` owns window lifecycle, passes optional env token to renderer, enables DevTools during development, and logs window events.
* `electron/preload.ts` currently exposes `ipcRenderer`; Stage 4 may extend this to carry env tokens or narrow IPC surface.
* `src/main.tsx` becomes the handoff point for exposing `window.INTERNAL_PLAYER` and booting the React tree.
* `src/internalPlayer/*` encapsulates all Web Playback SDK code and avoids leaking implementation details into React components.

## Main Process Strategy

* **Window creation** – Single `BrowserWindow` titled "Electric Slideshow Internal Player" with sensible min size (e.g., 1024×768). DevTools stay enabled during `npm run dev` for quick inspection.
* **Asset loading** – Continue using Vite dev server in dev and `dist/index.html` in production builds with no extra magic.
* **Token passthrough** – Stage 4 optionally reads `process.env.SPOTIFY_ACCESS_TOKEN` and forwards it to the renderer via query param or IPC once the window loads. Until then, tokens are set manually inside the renderer.
* **Logging** – Log window creation, ready-to-show, focus, close, and any load errors to the main process console for quick diagnosis.

## Renderer Strategy

* **Entry point (`src/main.tsx`)** – Imports the internal player API, attaches `INTERNAL_PLAYER` to `window`, handles optional token injection, and renders `<App />`.
* **Spotify SDK loading** – `spotifyPlayer.ts` dynamically injects `https://sdk.scdn.co/spotify-player.js`, waits for `window.Spotify`, and instantiates the player with lifecycle handlers (`ready`, `not_ready`, `player_state_changed`).
* **Internal API** – `internalPlayerApi.ts` exposes `setAccessToken`, `getStatus`, and any later helpers (pause/resume). It holds the mutable status object, notifies listeners (simple subscription pattern or React hook), and ensures only one player instance exists at a time.
* **INTERNAL_PLAYER global** – `window.INTERNAL_PLAYER = { setAccessToken, getStatus }` for DevTools scripting. Types are declared in `src/vite-env.d.ts` (or a new global typings file) to keep TypeScript happy.
* **React UI** – `App.tsx` is a tiny status dashboard showing device readiness, device ID, track info, and exposing a manual token input with "Set Token" button for debugging.

## Token Injection

1. **Manual UI** – Text input + button in `App.tsx` that calls `INTERNAL_PLAYER.setAccessToken` with the pasted token.
2. **DevTools global** – Developers can run `INTERNAL_PLAYER.setAccessToken('<token>')` directly.
3. **Env passthrough (Stage 4)** – If `process.env.SPOTIFY_ACCESS_TOKEN` exists, the main process relays it to the renderer (via URL param, IPC, or preload context bridge) and the renderer automatically sets it during boot, without blocking manual overrides.

## Minimal Debug UI

* Header with app title and quick instructions.
* Status panel listing:
  * Player initialization state (initialized / waiting for token).
  * Connection state (connected / not_ready) and device name/id.
  * Current track title + paused/playing indicator (updated on `player_state_changed`).
  * Last error string (or "None").
* Token paste box + "Set Token" button (disabled while empty) for quick manual testing.
* Barebones styling (CSS modules or plain CSS) just to keep layout readable; no complex design work yet.

## Logging Guidelines

* **Renderer console**
  * When tokens are set or replaced.
  * Spotify player lifecycle events (`ready`, `not_ready`, error callbacks).
  * Every `player_state_changed` event should log track name, artist, and play/pause state for debugging.
* **Main process console**
  * Window lifecycle (create/show/close).
  * Env token detection and delivery steps.
  * Any IPC errors or renderer load failures.

## Stage Checklists

### Stage 0 – Plan (this doc)
- [x] Capture file/module layout and responsibilities.
- [x] Document strategies for main process, renderer, token injection, UI, and logging.
- [x] Provide per-stage checklists to guide development.

### Stage 1 – Scaffolding Cleanup
- [ ] Rename/tune BrowserWindow (title, size, devtools policy).
- [ ] Ensure preload path and hot reload remain intact.
- [ ] Replace default React content with Electric Slideshow shell + "Not initialized" state message.

### Stage 2 – INTERNAL_PLAYER + Spotify SDK
- [ ] Create `src/internalPlayer/` modules (`spotifyPlayer.ts`, `internalPlayerApi.ts`).
- [ ] Load Spotify Web Playback SDK script dynamically and manage lifecycle events.
- [ ] Attach `INTERNAL_PLAYER` global with `setAccessToken`/`getStatus` APIs.
- [ ] Ensure DevTools calls initialize the player and log state transitions.

### Stage 3 – UI + Logging Polish
- [ ] Bind React UI to `InternalPlayerStatus` (polling or subscription hook).
- [ ] Build the status dashboard (connection, device ID, track info, last error).
- [ ] Add manual token input form and wire it to the API.
- [ ] Enhance renderer logging for token set, ready/not_ready, and state changes; add main-process window logs.

### Stage 4 – Env-Based Token Injection (Optional)
- [ ] Detect `process.env.SPOTIFY_ACCESS_TOKEN` in main process.
- [ ] Transfer token to renderer (query param, IPC, or preload bridge).
- [ ] Auto-call `INTERNAL_PLAYER.setAccessToken` on renderer boot when token is provided.
- [ ] Ensure manual overrides still work and are logged.
