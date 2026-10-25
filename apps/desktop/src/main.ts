import {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  Tray,
  Menu,
  nativeImage,
  dialog,
  clipboard,
  globalShortcut,
  Notification,
  session,
  Session,
} from 'electron';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { execSync, spawn, ChildProcess } from 'child_process';
import { pathToFileURL } from 'url';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let serverProcess: ChildProcess | null = null;
let uiServer: http.Server | null = null;
let uiServerPort = 0;
let isQuitting = false;
let signInWindow: BrowserWindow | null = null;

/** Persisted Google auth cookies shared with Playwright. */
function authCookiesPath(): string {
  return path.join(
    process.env.HOME || process.env.USERPROFILE || '',
    '.browser-ai-bridge',
    'auth-cookies.json'
  );
}

function saveAuthCookies(cookies: any[]): void {
  try {
    const dir = path.dirname(authCookiesPath());
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(authCookiesPath(), JSON.stringify(cookies, null, 2), 'utf-8');
    console.log('[auth] Saved', cookies.length, 'cookies for Playwright');
  } catch (e) {
    console.error('[auth] Failed to save cookies:', e);
  }
}

function loadAuthCookies(): any[] {
  try {
    const p = authCookiesPath();
    if (!fs.existsSync(p)) return [];
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return [];
  }
}

function getSignInSession(): Session {
  return session.fromPartition('persist:bab-auth');
}

// App state
const state = {
  serverRunning: false,
  connected: false,
  provider: null as any,
  port: 3000,
  site: null as string | null,
  serverError: null as string | null,
  updateChannel: (process.env.BAB_UPDATE_CHANNEL ?? 'stable') as 'stable' | 'beta',
};

// ─── Platform helpers ────────────────────────────────────────────

function getChromeUserDataDir(): string {
  switch (process.platform) {
    case 'win32':
      return path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'User Data');
    case 'darwin':
      return path.join(process.env.HOME || '', 'Library', 'Application Support', 'Google', 'Chrome');
    case 'linux':
      return path.join(process.env.HOME || '', '.config', 'google-chrome');
    default:
      return '';
  }
}

/**
 * App-managed Chrome profile. Login window and the Playwright session share
 * it, so signing in once is enough and the everyday browser can stay closed.
 */
function getAppChromeProfileDir(): string {
  return path.join(process.env.HOME || process.env.USERPROFILE || '', '.browser-ai-bridge', 'chrome-profile');
}

function getChromeExecutablePath(): string {
  switch (process.platform) {
    case 'win32':
      return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    case 'darwin':
      return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    case 'linux':
      return '/usr/bin/google-chrome';
    default:
      return '';
  }
}

function isChromeInstalled(): boolean {
  return fs.existsSync(getChromeExecutablePath());
}

function isNodeInstalled(): boolean {
  try {
    execSync('node --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function getAppPath(): string {
  if (app.isPackaged) return process.resourcesPath;
  return path.join(__dirname, '..');
}

function getCliPath(): string {
  if (app.isPackaged) {
    // extraResources maps ../../apps/cli/dist → <resources>/cli
    return path.join(process.resourcesPath, 'cli', 'index.js');
  }
  // Dev: apps/desktop/dist → ../cli/dist/index.js
  return path.join(getAppPath(), '..', 'cli', 'dist', 'index.js');
}

function getDashboardDir(): string | null {
  const candidates = [
    path.join(process.resourcesPath, 'dashboard'),
    path.join(getAppPath(), '..', 'dashboard', 'dist'),
    path.join(getAppPath(), 'dashboard'),
  ];
  return candidates.find((p) => fs.existsSync(path.join(p, 'index.html'))) ?? null;
}

/**
 * Serve the dashboard over 127.0.0.1. Vite emits ES modules, and Chromium
 * always fetches module scripts with CORS — which fails on the opaque file://
 * origin, leaving the window stuck on its backgroundColor. A tiny local HTTP
 * server avoids that entirely.
 */
function startUiServer(rootDir: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const mime: Record<string, string> = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.mjs': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.webp': 'image/webp',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.map': 'application/json; charset=utf-8',
      '.webmanifest': 'application/manifest+json',
    };

    const server = http.createServer((req, res) => {
      try {
        const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
        let filePath = path.join(rootDir, urlPath === '/' ? 'index.html' : urlPath);
        if (!filePath.startsWith(rootDir)) {
          res.writeHead(403).end('Forbidden');
          return;
        }
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          filePath = path.join(rootDir, 'index.html');
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, {
          'Content-Type': mime[ext] || 'application/octet-stream',
          'Cache-Control': 'no-cache',
        });
        fs.createReadStream(filePath).pipe(res);
      } catch {
        res.writeHead(500).end('Internal error');
      }
    });

    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      if (!port) {
        reject(new Error('UI server failed to bind a port'));
        return;
      }
      uiServer = server;
      uiServerPort = port;
      resolve(`http://127.0.0.1:${port}/index.html`);
    });
  });
}

function stopUiServer(): void {
  try {
    uiServer?.close();
  } catch {
    // ignore
  }
  uiServer = null;
  uiServerPort = 0;
}

// ─── Settings store (used by the dashboard via IPC) ─────────────

const settingsPath = path.join(app.getPath('userData'), 'settings.json');

function loadSettings(): any {
  try {
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return null;
}

function saveSettings(settings: any): boolean {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    return true;
  } catch (e) {
    console.error('Failed to save settings:', e);
    return false;
  }
}

function broadcastServerStatus(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('server-status', {
    running: state.serverRunning,
    port: state.port,
    site: state.site,
    error: state.serverError,
  });
}

function loadBrowserDetector(): any {
  const candidates = app.isPackaged
    ? [
        path.join(process.resourcesPath, 'node_modules', '@bab', 'playwright-provider', 'dist', 'browsers.js'),
        path.join(process.resourcesPath, 'packages', 'playwright-provider', 'dist', 'browsers.js'),
      ]
    : [path.join(__dirname, '..', '..', '..', 'packages', 'playwright-provider', 'dist', 'browsers.js')];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        return require(p);
      } catch (err) {
        console.error('[browsers] Failed to load detector at', p, err);
      }
    }
  }
  return null;
}

// ─── Notifications ───────────────────────────────────────────────

function notify(title: string, body: string): void {
  try {
    if (!Notification.isSupported()) return;
    const iconPath = path.join(__dirname, '../build/icon.png');
    const notification = new Notification({
      title,
      body,
      icon: fs.existsSync(iconPath) ? iconPath : undefined,
    });
    notification.on('click', () => {
      mainWindow?.show();
      mainWindow?.focus();
    });
    notification.show();
  } catch (error) {
    console.error('Notification failed:', error);
  }
}

// ─── Global hotkeys ──────────────────────────────────────────────

function registerHotkeys(): void {
  // Toggle the main window.
  globalShortcut.register('CommandOrControl+Shift+B', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) mainWindow.hide();
    else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Toggle the local API server.
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    if (state.serverRunning) stopServer();
    else startServer();
  });
}

function unregisterHotkeys(): void {
  globalShortcut.unregisterAll();
}

// ─── Window ──────────────────────────────────────────────────────

function showLoadError(message: string): void {
  const safe = message.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]!);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Browser AI Bridge</title>
<style>
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         font-family: system-ui, sans-serif; background:#1a1a2e; color:#eee; padding:32px; }
  .box { max-width:520px; background:#252542; border:1px solid #3d3d66; border-radius:12px; padding:24px; }
  h1 { margin:0 0 12px; font-size:18px; color:#c4b5fd; }
  p { margin:0 0 8px; line-height:1.5; color:#c8c8e0; font-size:14px; word-break:break-word; }
</style></head><body><div class="box">
<h1>Не удалось загрузить интерфейс</h1>
<p>${safe}</p>
<p>Попробуй переустановить приложение или запустить: <code>npm run build</code></p>
</div></body></html>`;
  const tmp = path.join(app.getPath('temp'), 'bab-load-error.html');
  try {
    fs.writeFileSync(tmp, html, 'utf-8');
    mainWindow?.loadFile(tmp).catch(() => {});
  } catch {
    // last resort
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'Browser AI Bridge',
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
    backgroundColor: '#1a1a2e',
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: false,
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    const dashboardDir = getDashboardDir();
    if (!dashboardDir) {
      console.error('[window] Dashboard not found in resources');
      showLoadError('Dashboard UI files not found in resources.');
    } else {
      startUiServer(dashboardDir)
        .then((url) => {
          console.log('[window] Serving dashboard at', url, 'from', dashboardDir);
          return mainWindow!.loadURL(url);
        })
        .catch((err) => {
          console.error('[window] UI server / load failed:', err);
          // Fallback: file:// may still work for non-module assets
          const indexHtml = path.join(dashboardDir, 'index.html');
          mainWindow
            ?.loadURL(pathToFileURL(indexHtml).href)
            .catch(() => showLoadError(String(err)));
        });
    }
  }

  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error('[window] did-fail-load', code, desc, url);
    if (code === -3) return; // aborted (redirect / navigation cancel)
    if (url.startsWith('data:') || url.endsWith('bab-load-error.html')) return;
    showLoadError(`${desc} (${code}) while loading ${url}`);
  });

  mainWindow.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    const tag = level >= 2 ? 'error' : level === 1 ? 'warn' : 'info';
    console.log(`[renderer:${tag}] ${message} (${sourceId}:${line})`);
  });

  // Prevent close — minimize to tray instead
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.webContents.send('app-status', {
      chromeInstalled: isChromeInstalled(),
      nodeInstalled: isNodeInstalled(),
      serverRunning: state.serverRunning,
      connected: state.connected,
    });
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-maximized', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-maximized', false);
  });
}

// ─── Tray ────────────────────────────────────────────────────────

function buildTrayMenu(): Electron.Menu {
  return Menu.buildFromTemplate([
    { label: 'Show Window', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: state.serverRunning ? 'Server: Running' : 'Server: Stopped', enabled: false },
    {
      label: state.serverRunning ? 'Stop Server' : 'Start Server',
      click: () => (state.serverRunning ? stopServer() : startServer()),
    },
    { type: 'separator' },
    {
      label: 'Copy API URL',
      click: () => clipboard.writeText(`http://localhost:${state.port}/v1/chat/completions`),
    },
    {
      label: 'Copy Models List',
      click: () => clipboard.writeText('google-ai, gemini, chatgpt, claude, deepseek'),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => { isQuitting = true; app.quit(); },
    },
  ]);
}

function createTray(): void {
  const iconPath = path.join(__dirname, '../build/icon.png');
  if (!fs.existsSync(iconPath)) return;

  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip('Browser AI Bridge — v1.1.0');
  tray.setContextMenu(buildTrayMenu());
  tray.on('click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

function updateTray(): void {
  if (!tray) return;
  tray.setContextMenu(buildTrayMenu());
}

// ─── Server ──────────────────────────────────────────────────────

async function startServer(port = 3000): Promise<{ success: boolean; error?: string; port?: number; site?: string }> {
  if (state.serverRunning) return { success: true, port: state.port, site: state.site ?? undefined };

  try {
    const cliPath = getCliPath();
    if (!fs.existsSync(cliPath)) {
      const error = 'CLI entry not found. Please build the project first.';
      console.error('[server]', error);
      state.serverError = error;
      broadcastServerStatus();
      return { success: false, error };
    }

    // Honour the dashboard settings (provider, browser, headless, profile).
    const settings = loadSettings() || {};
    const general = settings.general || {};
    const browserSettings = settings.browser || {};
    const chosenPort = port || general.serverPort || settings.serverPort || 3000;
    const site = settings.provider || 'gemini';
    // Headless when a saved Google session exists (OAuth popup) so no extra
    // Chrome window appears next to the desktop app.
    const hasSavedAuth = loadAuthCookies().length > 0;
    const headless = browserSettings.headless ?? settings.headless ?? hasSavedAuth;
    const useProfile = browserSettings.useExistingProfile ?? settings.useExistingProfile ?? true;
    const browser =
      (typeof settings.browser === 'string' ? settings.browser : browserSettings.id) || 'chrome';

    const args = [
      cliPath,
      'serve',
      '--port', String(chosenPort),
      '--site', site,
      '--browser', browser,
      headless ? '--headless' : '--no-headless',
      useProfile ? '--profile' : '--no-profile',
      '--profile-dir', getAppChromeProfileDir(),
    ];

    // Run the CLI with Electron's bundled Node runtime (ELECTRON_RUN_AS_NODE),
    // so a separately installed Node is NOT required by end users.
    console.log('[server] Spawning:', process.execPath, args.join(' '));
    serverProcess = spawn(process.execPath, args, {
      cwd: getAppPath(),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    });

    state.serverError = null;
    state.port = chosenPort;
    state.site = site;

    const READY_RE = /running at http:\/\/localhost:(\d+)/i;

    serverProcess.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      process.stdout.write(`[bab-server] ${text}`);
      const match = text.match(READY_RE);
      if (match && !state.serverRunning) {
        state.serverRunning = true;
        state.port = parseInt(match[1], 10) || chosenPort;
        broadcastServerStatus();
        updateTray();
        notify('Browser AI Bridge', `Server running at http://localhost:${state.port}`);
      }
    });

    serverProcess.stderr?.on('data', (data: Buffer) => {
      process.stderr.write(`[bab-server] ${data.toString()}`);
    });

    serverProcess.on('close', (code: number | null) => {
      console.log(`[server] Exited (code=${code})`);
      const wasRunning = state.serverRunning;
      state.serverRunning = false;
      serverProcess = null;
      if (code !== 0 && code !== null) {
        state.serverError = `Server exited with code ${code}`;
      }
      if (wasRunning || state.serverError) {
        broadcastServerStatus();
        updateTray();
      }
    });

    serverProcess.on('error', (err: Error) => {
      console.error('[server] Spawn error:', err);
      state.serverError = err.message;
      state.serverRunning = false;
      serverProcess = null;
      broadcastServerStatus();
      updateTray();
    });

    return { success: true, port: chosenPort, site };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

function stopServer(): { success: boolean } {
  if (serverProcess) {
    try {
      if (process.platform === 'win32' && serverProcess.pid) {
        execSync(`taskkill /pid ${serverProcess.pid} /T /F`);
      } else {
        serverProcess.kill('SIGTERM');
      }
    } catch (err) {
      console.error('[server] Kill failed:', err);
    }
    serverProcess = null;
  }
  const wasRunning = state.serverRunning;
  state.serverRunning = false;
  if (wasRunning) notify('Browser AI Bridge', 'Server stopped');
  broadcastServerStatus();
  updateTray();
  return { success: true };
}

// ─── IPC: Window Controls ────────────────────────────────────────

ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('window-close', () => mainWindow?.close());
ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized() ?? false);
ipcMain.on('minimize-to-tray', () => mainWindow?.hide());

// ─── IPC: Server ─────────────────────────────────────────────────

ipcMain.handle('start-server', async (_e: any, port: number) => await startServer(port || 3000));
ipcMain.handle('stop-server', async () => stopServer());
ipcMain.handle('get-status', async () => ({
  chromeInstalled: isChromeInstalled(),
  nodeInstalled: isNodeInstalled(),
  serverRunning: state.serverRunning,
  connected: state.connected,
  port: state.port,
  site: state.site,
  version: app.getVersion(),
}));
ipcMain.handle('open-chrome', async (_e: any, url: string) => {
  try { shell.openExternal(url); return { success: true }; } catch (error: any) { return { success: false, error: error.message }; }
});
ipcMain.handle('open-external', async (_e: any, url: string) => {
  try { shell.openExternal(url); return { success: true }; } catch (error: any) { return { success: false, error: error.message }; }
});

// ─── IPC: Provider detection & active provider ───────────────────

const PROVIDER_URLS: Record<string, string> = {
  'google-ai': 'https://www.google.com/search?udm=50',
  gemini: 'https://gemini.google.com',
  chatgpt: 'https://chatgpt.com',
  claude: 'https://claude.ai',
  deepseek: 'https://chat.deepseek.com',
};

ipcMain.handle('check-chrome', async () => {
  const executablePath = getChromeExecutablePath();
  const userDataDir = getChromeUserDataDir();
  return {
    installed: fs.existsSync(executablePath),
    executablePath,
    userDataDir,
    userDataExists: fs.existsSync(userDataDir),
  };
});

ipcMain.handle('open-provider-signin', async (_e: any, url: string) => {
  try {
    if (signInWindow && !signInWindow.isDestroyed()) {
      signInWindow.focus();
      return { success: true, url, reused: true };
    }

    // Google OAuth-style popup: compact window, no tab bar / address bar —
    // same look as the official "Choose an account" window Google uses.
    const signInUrl =
      url.includes('accounts.google.com') || url.includes('myaccount.google.com')
        ? url
        : `https://accounts.google.com/AccountChooser?continue=${encodeURIComponent(url)}&hl=en`;

    const ses = getSignInSession();

    signInWindow = new BrowserWindow({
      width: 480,
      height: 700,
      minWidth: 400,
      minHeight: 560,
      maxWidth: 560,
      maxHeight: 820,
      resizable: true,
      maximizable: false,
      fullscreenable: false,
      modal: false,
      parent: mainWindow ?? undefined,
      title: 'Sign in with Google',
      autoHideMenuBar: true,
      backgroundColor: '#ffffff',
      webPreferences: {
        session: ses,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });

    signInWindow.setMenuBarVisibility(false);

    // Persist cookies after every navigation so Playwright can reuse them
    // even after this popup is closed.
    const persist = async () => {
      try {
        const cookies = await ses.cookies.get({});
        saveAuthCookies(cookies);
      } catch (e) {
        console.error('[auth] cookie persist failed:', e);
      }
    };

    signInWindow.webContents.on('did-finish-load', async () => {
      await persist();
      const u = signInWindow?.webContents.getURL() || '';
      // Signed in → myaccount / provider page, not the ServiceLogin form.
      const signedIn =
        /myaccount\.google\.com/i.test(u) ||
        (/gemini\.google\.com|google\.com\/search|chatgpt\.com|claude\.ai|chat\.deepseek\.com/i.test(u) &&
          !/ServiceLogin|signin|AccountChooser/i.test(u));
      if (signedIn) {
        await persist();
        setTimeout(() => {
          if (signInWindow && !signInWindow.isDestroyed()) {
            signInWindow.close();
          }
        }, 1200);
      }
    });

    signInWindow.on('closed', () => {
      signInWindow = null;
      void persist();
    });

    await signInWindow.loadURL(signInUrl);
    return { success: true, url: signInUrl, mode: 'oauth-popup' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('check-provider-status', async (_e: any, providerId: string) => {
  try {
    const ses = getSignInSession();
    const cookies = await ses.cookies.get({});
    // Also consider cookies we already persisted to disk.
    const all = [...cookies, ...loadAuthCookies()];
    const names = new Set(all.map((c) => c.name));
    const hasGoogleSession =
      (names.has('SID') || names.has('__Secure-1PSID') || names.has('LSID') || names.has('SIDCC')) &&
      (names.has('HSID') || names.has('SSID') || names.has('__Secure-3PSID') || names.has('NID'));

    if (!hasGoogleSession) {
      return {
        connected: false,
        signedIn: false,
        error: 'Google session not found — sign in via the popup window',
        providerId,
      };
    }

    // Optional: who is signed in (email from myaccount page is handled in
    // the popup; here we only confirm the session cookie set).
    if (cookies.length > 0) saveAuthCookies(cookies);

    return {
      connected: true,
      signedIn: true,
      cookieCount: all.length,
      providerId,
    };
  } catch (error: any) {
    return {
      connected: false,
      signedIn: false,
      error: error?.message || 'Sign-in check failed',
      providerId,
    };
  }
});

ipcMain.handle('get-detected-providers', async () => {
  const userDataDir = getChromeUserDataDir();
  const detected: Array<{ id: string; name: string; type: string; status: string }> = [];
  if (fs.existsSync(userDataDir)) {
    const defaultProfile = path.join(userDataDir, 'Default');
    const cookiesPath = path.join(defaultProfile, 'Cookies');
    if (fs.existsSync(defaultProfile) && fs.existsSync(cookiesPath)) {
      detected.push({
        id: 'chrome-detected',
        name: 'Chrome Profile Detected',
        type: 'browser',
        status: 'available',
      });
    }
  }
  return detected;
});

ipcMain.handle('set-active-provider', async (_e: any, providerId: string) => {
  const allowed = ['google-ai', 'gemini', 'chatgpt', 'claude', 'deepseek'];
  if (!allowed.includes(providerId)) {
    return { success: false, error: 'Unknown provider' };
  }
  const settings = loadSettings() || {};
  settings.provider = providerId;
  saveSettings(settings);
  // Restart the server so the new provider is picked up.
  if (state.serverRunning || serverProcess) {
    stopServer();
    await new Promise((r) => setTimeout(r, 500));
  }
  const result = await startServer();
  return { success: result.success, error: result.error, provider: providerId };
});

// ─── IPC: Browsers (multi-browser support) ───────────────────────

ipcMain.handle('list-browsers', async () => {
  const detector = loadBrowserDetector();
  if (!detector) {
    // Detector module not built yet — return a Chrome fallback so the UI still works.
    return [{
      id: 'chrome',
      name: 'Google Chrome',
      executablePath: getChromeExecutablePath(),
      userDataDir: getChromeUserDataDir(),
      installed: isChromeInstalled(),
    }];
  }
  try {
    return detector.listAllBrowsers();
  } catch (err) {
    console.error('[browsers] listAllBrowsers failed:', err);
    return [];
  }
});

ipcMain.handle('detect-installed-browsers', async () => {
  const detector = loadBrowserDetector();
  if (!detector) {
    return isChromeInstalled()
      ? [{ id: 'chrome', name: 'Google Chrome', installed: true, executablePath: getChromeExecutablePath(), userDataDir: getChromeUserDataDir() }]
      : [];
  }
  try {
    return detector.detectInstalledBrowsers();
  } catch (err) {
    console.error('[browsers] detectInstalledBrowsers failed:', err);
    return [];
  }
});

// ─── IPC: Settings ───────────────────────────────────────────────

ipcMain.handle('load-settings', async () => loadSettings());

ipcMain.handle('save-settings', async (_e: any, settings: any) => saveSettings(settings));

// Atomic partial merge — avoids theme/lang races where two writers each
// read the file and clobber the other's field.
ipcMain.handle('merge-settings', async (_e: any, patch: any) => {
  const current = loadSettings() || {};
  const next = { ...current, ...(patch || {}) };
  const ok = saveSettings(next);
  return ok ? next : null;
});

// ─── Auto-Updater ────────────────────────────────────────────────

let autoUpdater: any = null;

async function setupAutoUpdater(): Promise<void> {
  try {
    const { autoUpdater: updater } = require('electron-updater');
    autoUpdater = updater;
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowPrerelease = state.updateChannel === 'beta';
    autoUpdater.channel = state.updateChannel === 'beta' ? 'beta' : 'latest';

    autoUpdater.on('checking-for-update', () => {
      mainWindow?.webContents.send('update-status', { status: 'checking' });
    });

    autoUpdater.on('update-available', (info: any) => {
      mainWindow?.webContents.send('update-status', {
        status: 'available', version: info.version,
        releaseDate: info.releaseDate, releaseName: info.releaseName,
      });
      notify('Update available', `Browser AI Bridge ${info.version} is ready to download.`);
      dialog.showMessageBox(mainWindow!, {
        type: 'info', title: 'Update Available',
        message: `A new version (${info.version}) is available.`,
        detail: 'Would you like to download and install it?',
        buttons: ['Update', 'Later'], defaultId: 0, cancelId: 1,
      }).then(({ response }) => { if (response === 0) autoUpdater.downloadUpdate(); });
    });

    autoUpdater.on('update-not-available', () => {
      mainWindow?.webContents.send('update-status', { status: 'not-available' });
    });

    autoUpdater.on('download-progress', (progress: any) => {
      mainWindow?.webContents.send('update-status', {
        status: 'downloading', percent: progress.percent,
        bytesPerSecond: progress.bytesPerSecond,
      });
    });

    autoUpdater.on('update-downloaded', () => {
      mainWindow?.webContents.send('update-status', { status: 'downloaded' });
      notify('Update ready', 'Restart Browser AI Bridge to apply the update.');
      dialog.showMessageBox(mainWindow!, {
        type: 'info', title: 'Update Ready',
        message: 'Update downloaded. Restart to apply?',
        buttons: ['Restart', 'Later'], defaultId: 0, cancelId: 1,
      }).then(({ response }) => {
        if (response === 0) { isQuitting = true; autoUpdater.quitAndInstall(); }
      });
    });

    autoUpdater.on('error', (err: Error) => {
      console.error('Auto-updater error:', err.message);
      mainWindow?.webContents.send('update-status', { status: 'error', error: err.message });
    });

    setTimeout(() => { autoUpdater.checkForUpdates().catch(() => {}); }, 5000);
  } catch {
    console.log('electron-updater not available, skipping auto-update');
  }
}

ipcMain.handle('check-for-updates', async () => {
  if (!autoUpdater) return { status: 'unavailable' };
  try {
    const result = await autoUpdater.checkForUpdates();
    return { status: 'checked', update: result?.updateInfo ?? null };
  } catch (err: any) {
    return { status: 'error', error: err.message };
  }
});

ipcMain.handle('set-update-channel', async (_e: any, channel: string) => {
  if (channel !== 'stable' && channel !== 'beta') {
    return { success: false, error: 'Channel must be stable or beta' };
  }
  state.updateChannel = channel;
  if (autoUpdater) {
    autoUpdater.allowPrerelease = channel === 'beta';
    autoUpdater.channel = channel === 'beta' ? 'beta' : 'latest';
    try {
      await autoUpdater.checkForUpdates();
    } catch {
      // Ignore immediate check failures.
    }
  }
  return { success: true, channel };
});

// ─── App lifecycle ───────────────────────────────────────────────

app.whenReady().then(async () => {
  createWindow();
  createTray();
  registerHotkeys();
  await setupAutoUpdater();

  setTimeout(async () => {
    try { await startServer(); } catch (err) { console.error('Failed to auto-start server:', err); }
  }, 2000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow?.show();
  });
});

app.on('window-all-closed', () => {
  // Stay in tray — don't quit
});

app.on('before-quit', () => {
  isQuitting = true;
  unregisterHotkeys();
  stopServer();
  stopUiServer();
});
