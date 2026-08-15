const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, dialog, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let tray = null;
let httpServer = null;
let isQuitting = false;

// App state
const state = {
  serverRunning: false,
  connected: false,
  provider: null,
  port: 3000,
  site: null,
};

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

  // Inject window controls after dashboard loads
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
      // Check if title bar already exists
      if (!document.getElementById('electron-title-bar')) {
        const titleBar = document.createElement('div');
        titleBar.id = 'electron-title-bar';
        titleBar.style.cssText = 'position:fixed;top:0;left:0;right:0;height:32px;background:#0f0f23;display:flex;align-items:center;justify-content:space-between;padding:0 8px;z-index:99999;-webkit-app-region:drag;user-select:none;';
        
        const title = document.createElement('span');
        title.style.cssText = 'font-size:12px;color:#888;margin-left:8px;font-family:system-ui;';
        title.textContent = 'Browser AI Bridge';
        
        const controls = document.createElement('div');
        controls.style.cssText = 'display:flex;gap:2px;-webkit-app-region:no-drag;';
        
        const btnStyle = 'width:36px;height:28px;border:none;background:transparent;color:#aaa;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:4px;';
        
        const minBtn = document.createElement('button');
        minBtn.innerHTML = '&#x2500;';
        minBtn.style.cssText = btnStyle;
        minBtn.title = 'Minimize';
        minBtn.onmouseover = () => minBtn.style.background = '#333';
        minBtn.onmouseout = () => minBtn.style.background = 'transparent';
        minBtn.onclick = () => window.electronAPI?.minimizeWindow();
        
        const maxBtn = document.createElement('button');
        maxBtn.innerHTML = '&#x25A1;';
        maxBtn.style.cssText = btnStyle;
        maxBtn.title = 'Maximize';
        maxBtn.onmouseover = () => maxBtn.style.background = '#333';
        maxBtn.onmouseout = () => maxBtn.style.background = 'transparent';
        maxBtn.onclick = () => window.electronAPI?.maximizeWindow();
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&#x2715;';
        closeBtn.style.cssText = btnStyle;
        closeBtn.title = 'Close';
        closeBtn.onmouseover = () => { closeBtn.style.background = '#e81123'; closeBtn.style.color = '#fff'; };
        closeBtn.onmouseout = () => { closeBtn.style.background = 'transparent'; closeBtn.style.color = '#aaa'; };
        closeBtn.onclick = () => window.electronAPI?.closeWindow();
        
        controls.appendChild(minBtn);
        controls.appendChild(maxBtn);
        controls.appendChild(closeBtn);
        titleBar.appendChild(title);
        titleBar.appendChild(controls);
        document.body.insertBefore(titleBar, document.body.firstChild);
        
        // Add padding to body so content isn't hidden behind title bar
        document.body.style.paddingTop = '32px';
      }
    `).catch(() => {});
  });

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

async function startServer(port = 3000) {
  if (state.serverRunning) {
    return { success: true, message: 'Server already running' };
  }

  try {
    const http = require('http');

    // Simple OpenAI-compatible API server
    const requestHandler = (req, res) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      const url = new URL(req.url, `http://localhost:${port}`);

      // Health endpoint
      if (url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          timestamp: Date.now(),
          providers: {}
        }));
        return;
      }

      // Models endpoint
      if (url.pathname === '/models' || url.pathname === '/v1/models') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          object: 'list',
          data: [
            { id: 'gemini', object: 'model', created: 0, owned_by: 'Google' },
            { id: 'chatgpt', object: 'model', created: 0, owned_by: 'OpenAI' },
            { id: 'claude', object: 'model', created: 0, owned_by: 'Anthropic' },
            { id: 'deepseek', object: 'model', created: 0, owned_by: 'DeepSeek' },
          ]
        }));
        return;
      }

      // Sessions endpoint
      if (url.pathname === '/v1/sessions') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ object: 'list', data: [] }));
        return;
      }

      // Tools endpoint
      if (url.pathname === '/v1/tools') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
        return;
      }

      // Chat completions endpoint
      if (url.pathname === '/v1/chat/completions' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          try {
            const request = JSON.parse(body);
            const response = {
              id: `chatcmpl-${Date.now()}`,
              object: 'chat.completion',
              created: Math.floor(Date.now() / 1000),
              model: request.model || 'gemini',
              choices: [{
                index: 0,
                message: {
                  role: 'assistant',
                  content: 'Server is running in standalone mode. To use AI providers, please sign in to your AI provider in Chrome and restart with --site flag.'
                },
                finish_reason: 'stop'
              }]
            };
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(response));
          } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { message: 'Invalid JSON' } }));
          }
        });
        return;
      }

      // 404
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Not found' } }));
    };

    httpServer = http.createServer(requestHandler);

    httpServer.listen(port, 'localhost', () => {
      console.log(`[server] Running at http://localhost:${port}`);
      state.serverRunning = true;
      state.port = port;
      mainWindow?.webContents.send('server-status', { running: true, port });
      updateTray();
    });

    httpServer.on('error', (err) => {
      console.error('[server] Error:', err);
      state.serverRunning = false;
      mainWindow?.webContents.send('server-status', { running: false });
      updateTray();
    });

    return { success: true };
  } catch (error) {
    console.error('[server] Exception:', error);
    return { success: false, error: error.message };
  }
}

function stopServer() {
  if (httpServer) {
    httpServer.close();
    httpServer = null;
  }
  state.serverRunning = false;
  mainWindow?.webContents.send('server-status', { running: false });
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

// Open provider URL in Chrome for sign-in
ipcMain.handle('open-provider-signin', async (_event, providerId) => {
  const url = PROVIDER_URLS[providerId];
  if (!url) {
    return { success: false, error: 'Unknown provider' };
  }

  try {
    shell.openExternal(url);
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
