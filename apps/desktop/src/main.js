const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync, spawn } = require('child_process');

let mainWindow = null;
let tray = null;
let serverProcess = null;
let isServerRunning = false;

// App state
const state = {
  serverRunning: false,
  connected: false,
  provider: null,
  port: 3000,
  site: null,
};

// Get Chrome user data directory based on platform
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

// Get default Chrome executable path
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

// Check if Chrome is installed
function isChromeInstalled() {
  const executablePath = getChromeExecutablePath();
  return fs.existsSync(executablePath);
}

// Check if Node.js is installed
function isNodeInstalled() {
  try {
    execSync('node --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Get app path
function getAppPath() {
  if (app.isPackaged) {
    return process.resourcesPath;
  }
  return path.join(__dirname, '..');
}

// Get CLI path
function getCliPath() {
  const appPath = getAppPath();
  return path.join(appPath, 'apps', 'cli', 'dist', 'index.js');
}

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
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: 'hiddenInset',
  });

  // Load the dashboard
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Try multiple paths for dashboard
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
      // Create a simple dashboard HTML
      mainWindow.loadURL(`data:text/html,
        <!DOCTYPE html>
        <html>
        <head>
          <title>Browser AI Bridge</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: #1a1a2e; 
              color: #eee; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              height: 100vh; 
              margin: 0; 
            }
            .container { text-align: center; max-width: 500px; padding: 20px; }
            h1 { color: #4fc3f7; margin-bottom: 20px; }
            p { line-height: 1.6; }
            .status { margin-top: 20px; padding: 15px; background: #16213e; border-radius: 8px; }
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
          <div class="container">
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
        </body>
        </html>
      `);
    }
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    
    // Send initial status
    mainWindow?.webContents.send('app-status', {
      chromeInstalled: isChromeInstalled(),
      nodeInstalled: isNodeInstalled(),
      serverRunning: state.serverRunning,
      connected: state.connected,
    });
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '../build/icon.png');
  
  if (!fs.existsSync(iconPath)) {
    // Create a simple icon if not exists
    return;
  }
  
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.resize({ width: 16, height: 16 }));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Window',
      click: () => {
        mainWindow?.show();
      },
    },
    { type: 'separator' },
    {
      label: state.serverRunning ? 'Server Running ✓' : 'Start Server',
      enabled: !state.serverRunning,
      click: () => startServer(),
    },
    {
      label: state.serverRunning ? 'Stop Server' : 'Server Stopped',
      enabled: state.serverRunning,
      click: () => stopServer(),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setToolTip('Browser AI Bridge - v1.0.0');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow?.show();
  });
}

function updateTray() {
  if (!tray) return;
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Window',
      click: () => {
        mainWindow?.show();
      },
    },
    { type: 'separator' },
    {
      label: state.serverRunning ? 'Server Running ✓' : 'Start Server',
      enabled: !state.serverRunning,
      click: () => startServer(),
    },
    {
      label: state.serverRunning ? 'Stop Server' : 'Server Stopped',
      enabled: state.serverRunning,
      click: () => stopServer(),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

async function startServer(port = 3000) {
  if (state.serverRunning) {
    return { success: true, message: 'Server already running' };
  }

  try {
    const cliPath = getCliPath();
    
    if (!fs.existsSync(cliPath)) {
      // Try to build first
      const appPath = getAppPath();
      try {
        execSync('npm run build', { cwd: appPath, stdio: 'ignore' });
      } catch (e) {
        return { success: false, error: 'CLI not found. Please build the project first.' };
      }
    }

    // Start server as child process
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

    serverProcess.on('close', (code) => {
      state.serverRunning = false;
      serverProcess = null;
      mainWindow?.webContents.send('server-status', { running: false });
      updateTray();
    });

    // Wait a bit for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

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

// IPC Handlers
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

// App lifecycle
app.whenReady().then(async () => {
  createWindow();
  createTray();

  // Auto-start server after a short delay
  setTimeout(async () => {
    try {
      await startServer();
      console.log('Server auto-started');
    } catch (error) {
      console.error('Failed to auto-start server:', error);
    }
  }, 2000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  stopServer();
});
