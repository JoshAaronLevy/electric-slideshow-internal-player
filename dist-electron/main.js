var _a;
import { app, BrowserWindow } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
const WINDOW_TITLE = "Electric Slideshow Internal Player";
const DEFAULT_WINDOW_DIMENSIONS = { width: 1024, height: 768 };
const IPC_TOKEN_CHANNEL = "internal-player:set-token";
let win;
const envSpotifyToken = (_a = process.env.SPOTIFY_ACCESS_TOKEN) == null ? void 0 : _a.trim();
if (envSpotifyToken) {
  console.log("[main] SPOTIFY_ACCESS_TOKEN detected; will forward to renderer after load");
} else {
  console.log("[main] SPOTIFY_ACCESS_TOKEN not set; renderer will rely on manual token input");
}
console.log("[main] Runtime versions", {
  electron: process.versions.electron,
  chrome: process.versions.chrome,
  node: process.versions.node
});
function readManifest(manifestPath) {
  try {
    const manifestRaw = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(manifestRaw);
    return manifest.version ?? null;
  } catch (error) {
    console.warn("[main] Failed to read Widevine manifest.json:", error);
    return null;
  }
}
function detectWidevineFromChrome() {
  var _a2, _b;
  const envPath = (_a2 = process.env.WIDEVINE_CDM_PATH) == null ? void 0 : _a2.trim();
  const envVersion = (_b = process.env.WIDEVINE_CDM_VERSION) == null ? void 0 : _b.trim();
  if (envPath) {
    if (!fs.existsSync(envPath)) {
      console.warn("[main] WIDEVINE_CDM_PATH provided but file not found:", envPath);
      return null;
    }
    const version = envVersion ?? "0";
    return { cdmPath: envPath, version };
  }
  const archSegment = process.arch === "arm64" ? "mac_arm64" : "mac_x64";
  console.log("[main] Architecture:", process.arch, "Segment:", archSegment);
  const chromeApp = "/Applications/Google Chrome.app";
  const versionsDir = path.join(
    chromeApp,
    "Contents/Frameworks/Google Chrome Framework.framework/Versions"
  );
  const candidateVersionDirs = ["Current"];
  try {
    const versions = fs.readdirSync(versionsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory() && /^\d+\./.test(entry.name)).map((entry) => entry.name).sort().reverse();
    candidateVersionDirs.push(...versions);
  } catch {
  }
  for (const versionDir of candidateVersionDirs) {
    const base = path.join(
      versionsDir,
      versionDir,
      "Libraries",
      "WidevineCdm"
    );
    const manifestPath = path.join(base, "manifest.json");
    const cdmPath = path.join(base, "_platform_specific", archSegment, "libwidevinecdm.dylib");
    console.log("[main] Checking modern path:", cdmPath);
    if (fs.existsSync(cdmPath)) {
      const version = envVersion ?? readManifest(manifestPath) ?? "0";
      return { cdmPath, version };
    }
  }
  const legacyBase = path.join(chromeApp, "Contents/Frameworks/WidevineCdm");
  const legacyManifest = path.join(legacyBase, "manifest.json");
  const legacyCdm = path.join(legacyBase, "_platform_specific", archSegment, "libwidevinecdm.dylib");
  console.log("[main] Checking legacy path:", legacyCdm);
  if (fs.existsSync(legacyCdm)) {
    const version = envVersion ?? readManifest(legacyManifest) ?? "0";
    return { cdmPath: legacyCdm, version };
  }
  console.warn("[main] Widevine CDM not found in Chrome installation (checked modern and legacy paths)");
  return null;
}
const chromeWidevineOptIn = (() => {
  var _a2;
  const raw = (_a2 = process.env.USE_CHROME_WIDEVINE) == null ? void 0 : _a2.trim().toLowerCase();
  return raw === "1" || raw === "true";
})();
if (chromeWidevineOptIn) {
  try {
    const widevineConfig = detectWidevineFromChrome();
    if (widevineConfig) {
      app.commandLine.appendSwitch("widevine-cdm-path", widevineConfig.cdmPath);
      app.commandLine.appendSwitch("widevine-cdm-version", widevineConfig.version);
      console.log("[main] Optional Chrome Widevine configured", {
        path: widevineConfig.cdmPath,
        version: widevineConfig.version
      });
    } else {
      console.warn("[main] Optional Chrome Widevine fallback not available; continuing with bundled Widevine");
    }
  } catch (error) {
    console.warn("[main] Optional Chrome Widevine fallback failed; continuing with bundled Widevine", error);
  }
} else {
  console.log("[main] Skipping Chrome Widevine fallback; relying on bundled Widevine from castLabs Electron");
}
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
app.commandLine.appendSwitch("no-verify-widevine-cdm");
function createWindow() {
  win = new BrowserWindow({
    title: WINDOW_TITLE,
    width: DEFAULT_WINDOW_DIMENSIONS.width,
    height: DEFAULT_WINDOW_DIMENSIONS.height,
    minWidth: 900,
    minHeight: 600,
    show: false,
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs"),
      plugins: true
      // Enable Widevine
    }
  });
  console.log("[main] BrowserWindow created");
  win.once("ready-to-show", () => {
    console.log("[main] window ready to show");
    win == null ? void 0 : win.show();
  });
  win.on("closed", () => {
    console.log("[main] window closed");
    win = null;
  });
  win == null ? void 0 : win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
    if (envSpotifyToken) {
      win == null ? void 0 : win.webContents.send(IPC_TOKEN_CHANNEL, envSpotifyToken);
    }
  });
  win == null ? void 0 : win.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    console.error("[main] renderer failed to load", { errorCode, errorDescription });
  });
  if (VITE_DEV_SERVER_URL) {
    win == null ? void 0 : win.loadURL(VITE_DEV_SERVER_URL).catch((error) => {
      console.error("[main] failed to load dev server URL", error);
    });
  } else {
    win == null ? void 0 : win.loadFile(path.join(RENDERER_DIST, "index.html")).catch((error) => {
      console.error("[main] failed to load production HTML", error);
    });
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  console.log("[main] app ready, creating window");
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
