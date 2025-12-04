I’ve reviewed the `INTERNAL_PLAYER_PLAN.md` you generated and I’m ready to implement **Stage 1 – Scaffolding Cleanup** in this repo.

Important context & constraints:

- This repo was scaffolded with **electron-vite** using the **React template**.
- Please always align with the **actual file structure** created by electron-vite. On my machine, it looks like:

  ```text
  electron/
    main/index.ts        # main process entry
    preload/index.ts     # preload entry (already wired by electron-vite)
  src/
    main.tsx             # React entry point
    App.tsx              # Default React root component
  ```

* Do **NOT** create parallel files like `electron/main.ts` or `electron/preload.ts` if `electron/main/index.ts` and `electron/preload/index.ts` already exist. Reuse and edit the existing files.
* Do **NOT** add tests right now.
* Do **NOT** implement the Web Playback SDK yet; Stage 1 is only about window + basic React shell.

---

## Stage 1 Goals (from the plan, adapted to the real scaffold)

1. **Main process (Electron)**
   In `electron/main/index.ts` (or equivalent):

   * Ensure there is a single `BrowserWindow` configured with:

     * Title: `"Electric Slideshow Internal Player"`.
     * A reasonable default size (e.g. `width: 1024`, `height: 768`).
     * DevTools enabled in development (whatever electron-vite already sets up is fine, just don’t disable it).
   * Keep hot reload working; reuse existing logic from the scaffold.
   * Add **lightweight logging** to the main process console:

     * When the window is created.
     * When it’s ready to show.
     * When it’s closed.
     * Any load failures.

   Please keep the existing electron-vite wiring intact (e.g., URLs for dev vs production). Only adjust the window config and logs.

2. **Preload (Electron)**

   * For Stage 1, do **not** add new APIs to preload beyond what electron-vite already provides.
   * Make sure we don’t break whatever preload entry the scaffold already created (`electron/preload/index.ts`).
   * You can leave a small `// TODO` comment indicating that Stage 4 might extend preload for token IPC, but do not implement it yet.

3. **Renderer entry (`src/main.tsx`)**

   * Confirm this is the React entry point.
   * Ensure it renders a top-level `App` component.
   * We will later wire `window.INTERNAL_PLAYER` and internal player logic here (Stage 2), but **do not** do that in Stage 1. For now, it should simply render the basic UI.

4. **React shell (`src/App.tsx`)**
   Replace the default template UI with a minimal Electric Slideshow internal-player shell:

   * A simple layout with:

     * A header/title: `"Electric Slideshow Internal Player"`.
     * A subtitle line explaining that the internal player is **not initialized** yet and is waiting for a Spotify token.

       * e.g., `"Status: Not initialized – waiting for Spotify access token (will be wired up in later stages)."`
   * You do **not** need to implement any state or hooks yet, just static text and minimal structure.
   * Keep styling extremely simple: plain JSX with minimal inline styles or a tiny CSS snippet. No complex design.

5. **No INTERNAL_PLAYER yet**

   * Do **not** attach `window.INTERNAL_PLAYER` in Stage 1.
   * Do **not** load the Spotify Web Playback SDK.
   * Stage 1 should strictly be about a clean, named window and a recognizable React shell that clearly signals that the internal player is not initialized yet.

---

## After Stage 1, I should be able to:

1. Run `npm run dev` in this repo.
2. See an Electron window titled **“Electric Slideshow Internal Player”**.
3. See a basic UI with:

   * A clear header.
   * A human-readable line indicating “Not initialized – waiting for Spotify token” (or similar).
4. See main-process logs in the terminal indicating window lifecycle events.

---

## Implementation Notes

* Please describe the changes you make in your response:

  * Which files were modified.
  * The key responsibilities of each modified file.
* Don’t jump ahead to Stage 2. Once Stage 1 is done and compilable, stop and wait for my explicit request: **“Please proceed with Stage 2.”**

Remember:

* No tests.
* Keep the code straightforward and explicit.
* Prefer clarity over cleverness.