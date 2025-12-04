# Context & Problem

I’m building a desktop app called **Electric Slideshow** (macOS, Swift/SwiftUI) that syncs Apple Photos slideshows with Spotify playlists. Right now, playback is done via **external devices** (Spotify Connect to the user’s normal Spotify app). For the MVP to be viable, I now need a reliable **internal Spotify player** that runs as its own app/process.

Instead of wiring this via CEF inside the Swift app (which is getting messy and depends on internal-ish CEF build instructions), I want to build a **separate Electron + React app** that acts as a dedicated Spotify Web Playback SDK “internal player” device. My main macOS app will later integrate with it (e.g., launching it, passing tokens, etc.), but the immediate goal is:

> Get a working, self-contained internal player in Electron that registers as a Spotify device and plays audio using the Web Playback SDK.

The Electron internal player does **not** replace the Swift app. It is a companion process.

---

## Stack & Repos

**Main app (already exists)**  
- macOS app “Electric Slideshow”
- Swift + SwiftUI
- Talks to Spotify APIs (auth, playlists, playback control, etc.)
- Currently uses external Spotify devices (no internal player yet).

**Backend server (already exists)**  
- Repo: `electric-slideshow-server`
- Node/Express backend
- Already deployed at: `https://electric-slideshow-server.onrender.com`
- Previously used to host an `/internal-player` page prototype; you can reference this repo *for patterns only* if needed, but don’t assume it must remain the internal-player UI.

**New internal player app (THIS repo)**  
- Repo: `electric-slideshow-internal-player`
- Scaffolded with **electron-vite React template**
  - `npm create electron-vite@latest electric-slideshow-internal-player`
  - Template: React
- Tech stack:
  - Electron (main process)
  - Vite + React + TypeScript (renderer)
  - MacOS only target is fine for now (Windows/Linux can come later).

This internal-player repo has been added to my VS Code workspace alongside:
- `Electric-Slideshow` (Swift/macOS)
- `electric-slideshow-server` (Node/Express backend)

You can inspect `electric-slideshow-server` if you want to reuse some concepts or types, but **do not tightly couple** the Electron app to it. The internal player should be self-contained and capable of running with only:
- A valid Spotify OAuth access token
- The Web Playback SDK

---

## High-Level Requirements for the Internal Player

The Electron app should:

1. **Run the Spotify Web Playback SDK** in the renderer (React) and register a device name like `"Electric Slideshow Internal Player"`.

2. Provide a global, scriptable API in the renderer, similar to:
   ```ts
   window.INTERNAL_PLAYER = {
     setAccessToken(token: string): void;
     getStatus(): InternalPlayerStatus;
     // (optional later: pause(), resume(), next(), previous(), etc.)
   };
  ```

This allows DevTools scripts (or a future controlling process) to call:

```js
INTERNAL_PLAYER.setAccessToken("<SPOTIFY_ACCESS_TOKEN>");
```

3. Accept a Spotify OAuth access token that has scopes:

   * `streaming`
   * `user-read-playback-state`
   * `user-modify-playback-state`

   For **v1**:

   * It’s acceptable to paste the token manually into a simple UI or DevTools.
   * It’s a nice bonus if we can also inject it from `process.env.SPOTIFY_ACCESS_TOKEN` on startup (e.g., `SPOTIFY_ACCESS_TOKEN=... npm run dev`).

4. Maintain the Web Playback SDK lifecycle:

   * Initialize when a token is provided.
   * Handle `ready`/`not_ready` events.
   * Reconnect if the player becomes unavailable.
   * Expose basic status (connected, deviceId, player state) in a simple React UI for debugging.

5. Be as **simple, explicit, and maintainable** as possible:

   * I’m comfortable with TS/React and want clear types.
   * Prefer straightforward, well-named modules over magic or heavy abstractions.

6. Not rely on packaging or production builds yet:

   * `npm run dev` working reliably is enough for now.
   * Packaging can come later.

---

## Do NOT Write Tests

* **Do NOT** add unit/integration tests right now.
* Focus 100% on:

  * Correct, explicit, type-safe implementation
  * Good structure and naming
  * Clear logging and debugability

We can add tests later once the basic internal player is proven.

---

## Implementation Strategy & Stages

Please first produce a **high-level implementation plan** (in Markdown) and then we’ll implement it stage by stage.

Overall shape I’d like:

* A clean separation between:

  * **Main process**: window creation, environment wiring, IPC if needed.
  * **Renderer**: React app + Web Playback SDK wrapper + `INTERNAL_PLAYER` global.

* A dedicated module for the Web Playback SDK in the renderer, something like:

  * `src/renderer/internalPlayer/spotifyPlayer.ts`
  * `src/renderer/internalPlayer/internalPlayerApi.ts`
  * Or similar, as long as structure is clear.

### Stage 0 – Plan Only

**Goal:** Produce a concise but detailed implementation plan doc (`INTERNAL_PLAYER_IMPLEMENTATION.md`) in this repo that I can commit and refer to.

Plan should include:

1. **File structure changes**

   * Which files/modules you’ll create or modify (main & renderer).
   * Where the “internal player” logic will live (e.g. `src/renderer/internalPlayer/*`).

2. **Main process changes**

   * How we’ll configure the BrowserWindow (size, devtools, etc.).
   * Whether we need a preload script to expose any APIs to the renderer (we might not for v1 if everything happens in the renderer).

3. **Renderer changes**

   * Where the React entry point is.
   * Where / how the Web Playback SDK bundle will be loaded.
   * How the `INTERNAL_PLAYER` global will be set on `window`.
   * How React UI will subscribe to the internal player state for debugging.

4. **Token injection strategies**

   * v1: manual paste/token input and a DevTools-accessible `INTERNAL_PLAYER.setAccessToken()`.
   * Optional: reading an env var at startup (`process.env.SPOTIFY_ACCESS_TOKEN`) passed from main to renderer (e.g., via `BrowserWindow` `loadURL` query params or preload context bridge).

5. **Minimal UI design**

   * Rough description of a tiny status panel:

     * Device name
     * Device ID (once ready)
     * Connection status (ready/not_ready)
     * Last error
   * No styling obsession; just enough to see what’s going on.

6. **Logging**

   * Where logs go (console in main vs renderer).
   * Specifically log:

     * When token is set
     * Player `ready` event and deviceId
     * `player_state_changed` events (at least basic info: track name, playing/paused).

> **For Stage 0:** Do not modify any code. Just produce the plan in a new `INTERNAL_PLAYER_IMPLEMENTATION.md` file.

---

### Stage 1 – Wire up basic Electron + React + scaffolding (no Web Playback yet)

**Goal:** Clean up the scaffold so we have a clearly named app and renderer, and a place to put internal-player logic.

Implementation details I’d like in Stage 1:

1. **Main process:**

   * Confirm the default Electron Vite main file (e.g. `electron/main/index.ts` or similar).
   * Make sure there is a single BrowserWindow titled “Electric Slideshow Internal Player”.
   * Enable DevTools by default in dev.
   * Ensure hot reload still works.

2. **Renderer:**

   * Confirm the React entry point (e.g. `src/renderer/src/main.tsx` or similar).
   * Implement a simple top-level `App` component with:

     * A header: “Electric Slideshow Internal Player”
     * A placeholder status box indicating that the internal player is “Not initialized” yet.

3. **Types & config:**

   * Make sure TypeScript builds.
   * Keep ESLint/Prettier config minimal and default; don’t overconfigure.

After Stage 1, `npm run dev` should:

* Open a window with a simple UI.
* No Web Playback SDK loaded yet.
* No `INTERNAL_PLAYER` global yet.

---

### Stage 2 – Implement `INTERNAL_PLAYER` global and basic Web Playback SDK wiring

**Goal:** Implement a TS module that owns the Web Playback SDK initialization and exposes an `INTERNAL_PLAYER` global on `window`.

Details:

1. **Spotify Player module:**

   * Create a module like `src/renderer/internalPlayer/spotifyPlayer.ts` that:

     * Encapsulates the Web Playback SDK instance.
     * Exposes a function to initialize the player when given a token.
     * Handles `ready`, `not_ready`, `player_state_changed` events.
   * Define a TS interface for internal player status:

     ```ts
     interface InternalPlayerStatus {
       initialized: boolean;
       connected: boolean;
       deviceId: string | null;
       currentTrackName: string | null;
       isPlaying: boolean;
       lastError: string | null;
     }
     ```

2. **`INTERNAL_PLAYER` API:**

   * Create a module like `src/renderer/internalPlayer/internalPlayerApi.ts` that:

     * Maintains the status object above.
     * Exports functions like:

       * `setAccessToken(token: string): void`
       * `getStatus(): InternalPlayerStatus`
     * On first `setAccessToken`, lazily initializes the Web Playback SDK and player.

3. **Global exposure:**

   * In the renderer entry (e.g. `src/renderer/src/main.tsx`), attach:

     ```ts
     declare global {
       interface Window {
         INTERNAL_PLAYER?: {
           setAccessToken(token: string): void;
           getStatus(): InternalPlayerStatus;
         };
       }
     }

     window.INTERNAL_PLAYER = {
       setAccessToken,
       getStatus,
     };
     ```

     where `setAccessToken`/`getStatus` come from the internalPlayer API module.

4. **Loading the Web Playback SDK script:**

   * Implement a helper that injects the `<script src="https://sdk.scdn.co/spotify-player.js">` tag once, before initializing the player.
   * Wait for `window.Spotify` to be available before creating the player instance.
   * Handle errors if the SDK fails to load.

5. **Token handling (v1):**

   * For Stage 2, support:

     * Calling `INTERNAL_PLAYER.setAccessToken("<token>")` from DevTools.
     * (Optional) A simple React input box to paste the token and call the same function.

Don’t worry about token refresh yet; we’ll assume the token is valid long enough to test.

---

### Stage 3 – React UI status panel & logging

**Goal:** Make the app debuggable: small React UI bound to `InternalPlayerStatus` and good console logs.

Implementation details:

1. **Status UI:**

   * Update the `App` component to subscribe to internal player status (e.g., via a simple polling hook or an event-based hook, whichever is simpler).
   * Display:

     * Connection status (initialized/connected).
     * Device ID (or “N/A”).
     * Current track name.
     * Is playing or paused.
     * Last error if any.

2. **Manual token input UI:**

   * Add a small section (dev-only is fine) with:

     * A text input for “Access Token”.
     * A “Set Token” button that calls `INTERNAL_PLAYER.setAccessToken(token)`.
   * This is purely for debugging / local manual testing.

3. **Logging:**

   * Log to the **renderer console**:

     * When `setAccessToken` is called.
     * When the player `ready` event fires and show the deviceId.
     * When `player_state_changed` triggers (log track name + paused/playing).
   * Log to the **main process console**:

     * Window created/closed.
     * Any errors relating to loading the renderer.

---

### Stage 4 – Optional env-based token injection (nice-to-have)

**Goal:** Allow starting the app like:

```bash
SPOTIFY_ACCESS_TOKEN="<token>" npm run dev
```

and have the renderer automatically call `INTERNAL_PLAYER.setAccessToken(TOKEN)`.

Implementation details:

1. **Main process:**

   * Read `process.env.SPOTIFY_ACCESS_TOKEN` in the main process.
   * If present, pass it to the renderer via:

     * `BrowserWindow.loadURL` query param (e.g. `?token=...`), or
     * `BrowserWindow.webContents.send('set-token', token)` after load, or
     * Preload script with `contextBridge` (if needed).

2. **Renderer:**

   * On initial load, read the token:

     * From location query params, or
     * Via an IPC listener.
   * If present, immediately call `INTERNAL_PLAYER.setAccessToken(token)`.

This should still work alongside the manual UI and DevTools access.

---

## How I Want You to Proceed

1. **First response:**

   * Generate the `INTERNAL_PLAYER_IMPLEMENTATION.md` **implementation plan only** according to the stages above.
   * Do *not* modify any code yet.
   * Include a short checklist for each stage.

2. **Subsequent stages:**

   * When I say **“Please proceed with implementing Stage 1”**, update the codebase accordingly and explain what changed (files & key responsibilities).
   * Then wait for my confirmation before moving to Stage 2, Stage 3, etc.

Remember:

* Keep things explicit and straightforward; I value readability and clean architecture over cleverness.
* Do **not** write tests for now.