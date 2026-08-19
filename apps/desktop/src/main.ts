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
} from 'electron';
import path from 'path';
import fs from 'fs';
import { execSync, spawn, ChildProcess } from 'child_process';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let serverProcess: ChildProcess | null = null;
let isQuitting = false;

// App state
const state = {
  serverRunning: false,
  connected: false,
  provider: null as any,
  port: 3000,
  site: null as string | null,
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
  return path.join(getAppPath(), 'apps', 'cli', 'dist', 'index.js');
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
    const dashboardPath = path.join(process.resourcesPath, 'dashboard', 'index.html');
    if (fs.existsSync(dashboardPath)) {
      mainWindow.loadFile(dashboardPath);
    }
  }

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
      click: () => clipboard.writeText('gemini, chatgpt, claude, deepseek'),
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
  tray.setToolTip('Browser AI Bridge — v1.0.0');
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

async function startServer(port = 3000): Promise<{ success: boolean; error?: string }> {
  if (state.serverRunning) return { success: true };

  try {
    const cliPath = getCliPath();
    if (!fs.existsSync(cliPath)) {
      try { execSync('npm run build', { cwd: getAppPath(), stdio: 'ignore' }); } catch {
        return { success: false, error: 'CLI not found. Please build the project first.' };
      }
    }

    serverProcess = spawn('node', [cliPath, 'serve', '--port', port.toString()], {
      cwd: getAppPath(),
      stdio: 'pipe',
    });

    serverProcess.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      if (output.includes('running at')) {
        state.serverRunning = true;
        state.port = port;
        mainWindow?.webContents.send('server-status', { running: true, port });
        updateTray();
      }
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
    notify('Browser AI Bridge', `Server running at http://localhost:${port}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

function stopServer(): { success: boolean } {
  if (serverProcess) { serverProcess.kill(); serverProcess = null; }
  state.serverRunning = false;
  mainWindow?.webContents.send('server-status', { running: false });
  updateTray();
  notify('Browser AI Bridge', 'Server stopped');
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
});
