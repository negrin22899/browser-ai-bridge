const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, dialog, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');

let mainWindow = null;
let tray = null;
let serverProcess = null;
let isQuitting = false;

// App state
const state = {
  serverRunning: false,
  connected: false,
  provider: null,
  port: 3000,
  site: null,
  serverError: null,
};

function resolveCliEntry() {
  const candidates = app.isPackaged
    ? [path.join(process.resourcesPath, 'cli', 'index.js')]
    : [
        path.join(__dirname, '..', '..', 'cli', 'dist', 'index.js'),
        path.join(__dirname, '..', '..', '..', 'apps', 'cli', 'dist', 'index.js'),
      ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function loadBrowserDetector() {
  const candidates = app.isPackaged
    ? [
        path.join(process.resourcesPath, 'node_modules', '@bab', 'playwright-provider', 'dist', 'browsers.js'),
        path.join(process.resourcesPath, 'packages', 'playwright-provider', 'dist', 'browsers.js'),
      ]
    : [
        path.join(__dirname, '..', '..', '..', 'packages', 'playwright-provider', 'dist', 'browsers.js'),
      ];
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

function broadcastServerStatus() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('server-status', {
    running: state.serverRunning,
    port: state.port,
    site: state.site,
    error: state.serverError,
  });
}

// Settings storage path
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return null;
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    return true;
  } catch (e) {
    console.error('Failed to save settings:', e);
    return false;
  }
}

// ─── Platform helpers ────────────────────────────────────────────

function getChromeUserDataDir() {
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

function getChromeExecutablePath() {
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

function isChromeInstalled() {
  return fs.existsSync(getChromeExecutablePath());
}

function isNodeInstalled() {
  try {
    execSync('node --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function getAppPath() {
  if (app.isPackaged) return process.resourcesPath;
  return path.join(__dirname, '..');
}

// ─── Window ──────────────────────────────────────────────────────

function createWindow() {
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

  // Load dashboard
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    const possiblePaths = [
      path.join(process.resourcesPath, 'dashboard', 'index.html'),
      path.join(process.resourcesPath, 'app', 'dashboard', 'dist', 'index.html'),
      path.join(__dirname, '..', 'dashboard', 'dist', 'index.html'),
      path.join(__dirname, '..', '..', 'dashboard', 'dist', 'index.html'),
      path.join(__dirname, '..', '..', 'apps', 'dashboard', 'dist', 'index.html'),
    ];

    let loaded = false;
    for (const dashboardPath of possiblePaths) {
      console.log('[main] Checking dashboard path:', dashboardPath);
      if (fs.existsSync(dashboardPath)) {
        console.log('[main] Loading dashboard from:', dashboardPath);
        mainWindow.loadFile(dashboardPath);
        loaded = true;
        break;
      }
    }

    if (!loaded) {
      console.log('[main] Dashboard not found, loading fallback HTML');
      mainWindow.loadURL(`data:text/html,
        <!DOCTYPE html>
        <html>
        <head>
          <title>Browser AI Bridge</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: #1a1a2e;
              color: #eee;
              display: flex;
              flex-direction: column;
              height: 100vh;
            }
            .title-bar {
              -webkit-app-region: drag;
              height: 32px;
              background: #0f0f23;
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 0 8px;
              user-select: none;
            }
            .title-bar-title {
              font-size: 12px;
              color: #888;
              margin-left: 8px;
            }
            .title-bar-controls {
              -webkit-app-region: no-drag;
              display: flex;
              gap: 2px;
            }
            .title-bar-controls button {
              width: 36px;
              height: 28px;
              border: none;
              background: transparent;
              color: #aaa;
              font-size: 14px;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 4px;
            }
            .title-bar-controls button:hover { background: #333; }
            .title-bar-controls .close:hover { background: #e81123; color: #fff; }
            .container {
              flex: 1;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            .content { text-align: center; max-width: 500px; padding: 20px; }
            h1 { color: #4fc3f7; margin-bottom: 20px; }
            p { line-height: 1.6; }
            .status { margin-top: 20px; padding: 15px; background: #16213e; border-radius: 8px; }
            code { background: #0a0a1a; padding: 4px 8px; border-radius: 4px; font-size: 13px; }
            .btn {
              display: inline-block;
              margin-top: 15px;
              padding: 10px 20px;
              background: #4fc3f7;
              color: #000;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="title-bar">
            <span class="title-bar-title">Browser AI Bridge</span>
            <div class="title-bar-controls">
              <button onclick="electronAPI.minimizeWindow()">&#x2500;</button>
              <button onclick="electronAPI.maximizeWindow()">&#x25A1;</button>
              <button class="close" onclick="electronAPI.closeWindow()">&#x2715;</button>
            </div>
          </div>
          <div class="container">
            <div class="content">
              <h1>Browser AI Bridge</h1>
              <p>Use AI in your code editor — no API keys needed!</p>
              <div class="status">
                <p><strong>API Endpoint:</strong></p>
                <code>http://localhost:3000/v1/chat/completions</code>
                <p style="margin-top: 10px;"><strong>Available Models:</strong></p>
                <code>gemini, chatgpt, claude, deepseek</code>
              </div>
              <p style="margin-top: 20px; font-size: 14px; color: #888;">
                To start: Open Chrome and sign in to your AI provider, then click Start Server.
              </p>
            </div>
          </div>
        </body>
        </html>
      `);
    }
  }

  // Title bar is rendered by the React app (components/TitleBar.tsx) —
  // no runtime injection here, otherwise we get double 32px offset.

  // Prevent close — minimize to tray instead
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
      return;
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

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Track maximize state for the renderer
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-maximized', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-maximized', false);
  });
}

// ─── Tray ────────────────────────────────────────────────────────

function buildTrayMenu() {
  return Menu.buildFromTemplate([
    {
      label: 'Show Window',
      click: () => mainWindow?.show(),
    },
    { type: 'separator' },
    {
      label: state.serverRunning ? 'Server: Running' : 'Server: Stopped',
      enabled: false,
    },
    {
      label: state.serverRunning ? 'Stop Server' : 'Start Server',
      click: () => (state.serverRunning ? stopServer() : startServer()),
    },
    { type: 'separator' },
    {
      label: 'Copy API URL',
      click: () => {
        clipboard.writeText(`http://localhost:${state.port}/v1/chat/completions`);
      },
    },
    {
      label: 'Copy Models List',
      click: () => {
        clipboard.writeText('gemini, chatgpt, claude, deepseek');
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
}

function createTray() {
  const iconPath = path.join(__dirname, '../build/icon.png');

  if (!fs.existsSync(iconPath)) return;

  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.resize({ width: 16, height: 16 }));

  tray.setToolTip('Browser AI Bridge — v1.0.0');
  tray.setContextMenu(buildTrayMenu());

  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function updateTray() {
  if (!tray) return;
  tray.setContextMenu(buildTrayMenu());
}

// ─── Server ──────────────────────────────────────────────────────
// Forks the real BAB CLI (apps/cli/dist/index.js) as a subprocess
// using Electron as Node (ELECTRON_RUN_AS_NODE=1). This gives us the
// full stack: ProviderManager + Playwright provider + real routes.

async function startServer(port) {
  if (state.serverRunning || serverProcess) {
    return { success: true, message: 'Server already running' };
  }

  const settings = loadSettings() || {};
  const general = settings.general || {};
  const browserSettings = settings.browser || {};
  const chosenPort = port || general.serverPort || settings.serverPort || 3000;
  const site = settings.provider || 'gemini';
  const headless = browserSettings.headless ?? settings.headless ?? false;
  const useProfile = browserSettings.useExistingProfile ?? settings.useExistingProfile ?? true;
  const browser =
    (typeof settings.browser === 'string' ? settings.browser : browserSettings.id) || 'chrome';

  const cliEntry = resolveCliEntry();
  if (!cliEntry) {
    const error = 'CLI entry not found. Run "npm run build" in apps/cli.';
    console.error('[server]', error);
    state.serverError = error;
    broadcastServerStatus();
    return { success: false, error };
  }

  const args = [
    cliEntry,
    'serve',
    '--port', String(chosenPort),
    '--site', site,
    '--browser', browser,
    headless ? '--headless' : '--no-headless',
    useProfile ? '--profile' : '--no-profile',
  ];

  console.log('[server] Spawning:', process.execPath, args.join(' '));

  serverProcess = spawn(process.execPath, args, {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  state.serverError = null;
  state.port = chosenPort;
  state.site = site;

  const READY_RE = /running at http:\/\/localhost:(\d+)/i;

  serverProcess.stdout.on('data', (buf) => {
    const text = buf.toString();
    process.stdout.write(`[bab-server] ${text}`);
    const match = text.match(READY_RE);
    if (match && !state.serverRunning) {
      state.serverRunning = true;
      state.port = parseInt(match[1], 10) || chosenPort;
      broadcastServerStatus();
      updateTray();
    }
  });

  serverProcess.stderr.on('data', (buf) => {
    process.stderr.write(`[bab-server] ${buf.toString()}`);
  });

  serverProcess.on('exit', (code, signal) => {
    console.log(`[server] Exited (code=${code}, signal=${signal})`);
    const wasRunning = state.serverRunning;
    state.serverRunning = false;
    serverProcess = null;
    if (code !== 0 && code !== null) {
      state.serverError = `Server exited with code ${code}`;
    }
    if (wasRunning) {
      broadcastServerStatus();
      updateTray();
    }
  });

  serverProcess.on('error', (err) => {
    console.error('[server] Spawn error:', err);
    state.serverError = err.message;
    state.serverRunning = false;
    serverProcess = null;
    broadcastServerStatus();
    updateTray();
  });

  return { success: true, port: chosenPort, site };
}

function stopServer() {
  if (!serverProcess) {
    state.serverRunning = false;
    broadcastServerStatus();
    updateTray();
    return { success: true };
  }
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${serverProcess.pid} /T /F`);
    } else {
      serverProcess.kill('SIGTERM');
    }
  } catch (err) {
    console.error('[server] Kill failed:', err);
  }
  serverProcess = null;
  state.serverRunning = false;
  broadcastServerStatus();
  updateTray();
  return { success: true };
}

// ─── IPC: Window Controls ────────────────────────────────────────

ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window-close', () => mainWindow?.close());
ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized() ?? false);

// ─── IPC: Server ─────────────────────────────────────────────────

ipcMain.handle('start-server', async (_event, port) => {
  return await startServer(port || 3000);
});

ipcMain.handle('stop-server', async () => {
  return stopServer();
});

ipcMain.handle('get-status', async () => {
  return {
    chromeInstalled: isChromeInstalled(),
    nodeInstalled: isNodeInstalled(),
    serverRunning: state.serverRunning,
    connected: state.connected,
    port: state.port,
    site: state.site,
    version: app.getVersion(),
  };
});

ipcMain.handle('open-chrome', async (_event, url) => {
  try {
    shell.openExternal(url);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-external', async (_event, url) => {
  try {
    shell.openExternal(url);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ─── IPC: Provider Detection ─────────────────────────────────────

const PROVIDER_URLS = {
  gemini: 'https://gemini.google.com',
  chatgpt: 'https://chatgpt.com',
  claude: 'https://claude.ai',
  deepseek: 'https://chat.deepseek.com',
};

// Check if Chrome is installed and get its path
ipcMain.handle('check-chrome', async () => {
  const installed = isChromeInstalled();
  const executablePath = getChromeExecutablePath();
  const userDataDir = getChromeUserDataDir();

  return {
    installed,
    executablePath,
    userDataDir,
    userDataExists: fs.existsSync(userDataDir),
  };
});

// Open URL in default browser
ipcMain.handle('open-provider-signin', async (_event, url) => {
  try {
    await shell.openExternal(url);
    return { success: true, url };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Check if provider is accessible (simplified - just check if URL is reachable)
ipcMain.handle('check-provider-status', async (_event, providerId) => {
  const url = PROVIDER_URLS[providerId];
  if (!url) {
    return { connected: false, error: 'Unknown provider' };
  }

  try {
    // Try to fetch the provider URL to check if it's accessible
    const http = require('https');
    return new Promise((resolve) => {
      const req = http.get(url, { timeout: 5000 }, (res) => {
        resolve({
          connected: res.statusCode === 200,
          statusCode: res.statusCode,
          providerId,
        });
      });

      req.on('error', () => {
        resolve({ connected: false, error: 'Network error', providerId });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ connected: false, error: 'Timeout', providerId });
      });
    });
  } catch (error) {
    return { connected: false, error: error.message, providerId };
  }
});

// Get list of detected providers (from Chrome cookies/profile)
ipcMain.handle('get-detected-providers', async () => {
  const userDataDir = getChromeUserDataDir();
  const detected = [];

  if (fs.existsSync(userDataDir)) {
    // Check if Chrome profile exists
    const defaultProfile = path.join(userDataDir, 'Default');
    if (fs.existsSync(defaultProfile)) {
      // Check for cookies file (indicates Chrome is used)
      const cookiesPath = path.join(defaultProfile, 'Cookies');
      if (fs.existsSync(cookiesPath)) {
        // We can't read cookies directly (encrypted), but we know Chrome is in use
        detected.push({
          id: 'chrome-detected',
          name: 'Chrome Profile Detected',
          type: 'browser',
          status: 'available',
        });
      }
    }
  }

  return detected;
});

// ─── IPC: Active provider ────────────────────────────────────────

ipcMain.handle('set-active-provider', async (_event, providerId) => {
  const allowed = ['gemini', 'chatgpt', 'claude', 'deepseek'];
  if (!allowed.includes(providerId)) {
    return { success: false, error: 'Unknown provider' };
  }
  const settings = loadSettings() || {};
  settings.provider = providerId;
  saveSettings(settings);
  // Restart server so the new provider is picked up
  if (state.serverRunning || serverProcess) {
    stopServer();
    // Wait a moment for port release
    await new Promise((r) => setTimeout(r, 500));
  }
  const result = await startServer();
  return { success: result.success, error: result.error, provider: providerId };
});

// ─── IPC: Browsers (multi-browser support) ───────────────────────

ipcMain.handle('list-browsers', async () => {
  const detector = loadBrowserDetector();
  if (!detector) {
    // Detector module not built yet — return Chrome fallback so UI still works.
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

ipcMain.handle('load-settings', async () => {
  return loadSettings();
});

ipcMain.handle('save-settings', async (_event, settings) => {
  return saveSettings(settings);
});

// Atomic partial merge — avoids theme/lang races where two writers each
// read the file and clobber the other's field.
ipcMain.handle('merge-settings', async (_event, patch) => {
  const current = loadSettings() || {};
  const next = { ...current, ...(patch || {}) };
  const ok = saveSettings(next);
  return ok ? next : null;
});

// ─── IPC: Tray actions ───────────────────────────────────────────

ipcMain.on('minimize-to-tray', () => mainWindow?.hide());

// ─── Auto-Updater ────────────────────────────────────────────────

let autoUpdater = null;

async function setupAutoUpdater() {
  try {
    const { autoUpdater: updater } = require('electron-updater');
    autoUpdater = updater;

    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('checking-for-update', () => {
      mainWindow?.webContents.send('update-status', { status: 'checking' });
    });

    autoUpdater.on('update-available', (info) => {
      mainWindow?.webContents.send('update-status', {
        status: 'available',
        version: info.version,
        releaseDate: info.releaseDate,
        releaseName: info.releaseName,
      });

      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: `A new version (${info.version}) is available.`,
        detail: 'Would you like to download and install it?',
        buttons: ['Update', 'Later'],
        defaultId: 0,
        cancelId: 1,
      }).then(({ response }) => {
        if (response === 0) {
          autoUpdater.downloadProgress = 0;
          autoUpdater.downloadUpdate();
        }
      });
    });

    autoUpdater.on('update-not-available', () => {
      mainWindow?.webContents.send('update-status', { status: 'not-available' });
    });

    autoUpdater.on('download-progress', (progress) => {
      mainWindow?.webContents.send('update-status', {
        status: 'downloading',
        percent: progress.percent,
        bytesPerSecond: progress.bytesPerSecond,
      });
    });

    autoUpdater.on('update-downloaded', () => {
      mainWindow?.webContents.send('update-status', { status: 'downloaded' });

      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Ready',
        message: 'Update downloaded. Restart to apply?',
        buttons: ['Restart', 'Later'],
        defaultId: 0,
        cancelId: 1,
      }).then(({ response }) => {
        if (response === 0) {
          isQuitting = true;
          autoUpdater.quitAndInstall();
        }
      });
    });

    autoUpdater.on('error', (err) => {
      console.error('Auto-updater error:', err.message);
      mainWindow?.webContents.send('update-status', { status: 'error', error: err.message });
    });

    // Check for updates after a delay (don't block startup)
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {});
    }, 5000);
  } catch (err) {
    console.log('electron-updater not available, skipping auto-update');
  }
}

ipcMain.handle('check-for-updates', async () => {
  if (!autoUpdater) return { status: 'unavailable' };
  try {
    const result = await autoUpdater.checkForUpdates();
    return { status: 'checked', update: result?.updateInfo ?? null };
  } catch (err) {
    return { status: 'error', error: err.message };
  }
});

// ─── App lifecycle ───────────────────────────────────────────────

app.whenReady().then(async () => {
  createWindow();
  createTray();
  await setupAutoUpdater();

  // Auto-start server
  setTimeout(async () => {
    try {
      await startServer();
    } catch (err) {
      console.error('[auto-start] Failed:', err);
    }
  }, 1000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });
});

app.on('window-all-closed', () => {
  // Don't quit — stay in tray
  if (process.platform === 'darwin') return;
  // On Windows/Linux, keep running in tray
});

app.on('before-quit', () => {
  isQuitting = true;
  stopServer();
});
