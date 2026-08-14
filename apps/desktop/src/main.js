const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, dialog, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync, spawn } = require('child_process');

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

function getCliPath() {
  return path.join(getAppPath(), 'apps', 'cli', 'dist', 'index.js');
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
      if (fs.existsSync(dashboardPath)) {
        mainWindow.loadFile(dashboardPath);
        loaded = true;
        break;
      }
    }

    if (!loaded) {
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
    const cliPath = getCliPath();

    if (!fs.existsSync(cliPath)) {
      const appPath = getAppPath();
      try {
        execSync('npm run build', { cwd: appPath, stdio: 'ignore' });
      } catch {
        return { success: false, error: 'CLI not found. Please build the project first.' };
      }
    }

    serverProcess = spawn('node', [cliPath, 'serve', '--port', port.toString()], {
      cwd: getAppPath(),
      stdio: 'pipe',
    });

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(output);
      if (output.includes('running at')) {
        state.serverRunning = true;
        state.port = port;
        mainWindow?.webContents.send('server-status', { running: true, port });
        updateTray();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(data.toString());
    });

    serverProcess.on('close', () => {
      state.serverRunning = false;
      serverProcess = null;
      mainWindow?.webContents.send('server-status', { running: false });
      updateTray();
    });

    await new Promise((r) => setTimeout(r, 2000));

    state.serverRunning = true;
    state.port = port;
    mainWindow?.webContents.send('server-status', { running: true, port });
    updateTray();

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
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
      console.error('Failed to auto-start server:', err);
    }
  }, 2000);

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
