const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let tray = null;
let server = null;
let provider = null;
let modules = {};

// Log file for debugging
const logFile = path.join(app.getPath('userData'), 'bab-debug.log');

function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  console.log(line.trim());
  try {
    fs.appendFileSync(logFile, line);
  } catch (e) {
    // ignore
  }
}

// Initialize modules dynamically
async function initializeModules() {
  try {
    log('Initializing modules...');
    const core = await import('@bab/core');
    const runtime = await import('@bab/runtime');
    const promptEngineModule = await import('@bab/prompt-engine');
    const toolsFs = await import('@bab/tools-fs');
    const toolsGit = await import('@bab/tools-git');
    const toolsShell = await import('@bab/tools-shell');

    modules = { core, runtime, promptEngineModule, toolsFs, toolsGit, toolsShell };

    modules.eventBus = new core.EventBus();
    modules.logger = new core.Logger({ level: 'info', format: 'text', context: 'Desktop' });
    modules.sessionManager = new core.SessionManager(modules.eventBus);
    modules.router = new core.Router(modules.eventBus);
    modules.promptEngine = new promptEngineModule.PromptEngine();
    modules.toolDispatcher = new runtime.ToolDispatcher(modules.eventBus);

    modules.toolDispatcher.register(new toolsFs.FsReadTool());
    modules.toolDispatcher.register(new toolsFs.FsWriteTool());
    modules.toolDispatcher.register(new toolsGit.GitStatusTool());
    modules.toolDispatcher.register(new toolsGit.GitDiffTool());
    modules.toolDispatcher.register(new toolsGit.GitCommitTool());
    modules.toolDispatcher.register(new toolsShell.ShellExecTool());

    log('Modules initialized successfully');
    return true;
  } catch (error) {
    log('Failed to initialize modules: ' + error.message);
    return false;
  }
}

// Find dashboard path
function findDashboardPath() {
  const possiblePaths = [
    // Development
    path.join(__dirname, '..', '..', 'dashboard', 'dist', 'index.html'),
    // Production - resources
    path.join(process.resourcesPath || '', 'dashboard', 'index.html'),
    // Production - app.asar
    path.join(app.getAppPath(), '..', 'dashboard', 'index.html'),
    // Production - unpacked
    path.join(app.getAppPath(), '..', '..', 'dashboard', 'dist', 'index.html'),
  ];

  for (const p of possiblePaths) {
    log('Checking dashboard path: ' + p);
    if (fs.existsSync(p)) {
      log('Found dashboard at: ' + p);
      return p;
    }
  }

  log('Dashboard not found in any path');
  return null;
}

function createWindow() {
  log('Creating window...');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'Browser AI Bridge',
    show: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Remove menu bar completely
  mainWindow.setMenu(null);

  // Load the dashboard
  const dashboardPath = findDashboardPath();

  if (dashboardPath) {
    log('Loading dashboard from: ' + dashboardPath);
    mainWindow.loadFile(dashboardPath).catch(err => {
      log('Failed to load dashboard: ' + err.message);
      // Fallback to inline HTML
      loadFallbackHTML();
    });
  } else {
    log('No dashboard found, loading fallback');
    loadFallbackHTML();
  }

  // Open devtools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  log('Window created');
}

function loadFallbackHTML() {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Browser AI Bridge</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .container {
          text-align: center;
          padding: 40px;
          background: rgba(255,255,255,0.1);
          border-radius: 20px;
          backdrop-filter: blur(10px);
        }
        h1 { font-size: 2.5em; margin-bottom: 10px; }
        p { font-size: 1.2em; opacity: 0.9; }
        .status { margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.2); border-radius: 10px; }
        .btn {
          display: inline-block;
          margin-top: 20px;
          padding: 12px 30px;
          background: white;
          color: #667eea;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn:hover { background: #f0f0f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>⚡ Browser AI Bridge</h1>
        <p>Use browser AI in your local environment</p>
        <div class="status">
          <p>Server: <strong id="server-status">Stopped</strong></p>
          <p>Port: <strong>3000</strong></p>
        </div>
        <button class="btn" onclick="startServer()">Start Server</button>
      </div>
      <script>
        const { ipcRenderer } = require('electron');

        async function startServer() {
          const result = await ipcRenderer.invoke('start-server', 3000);
          if (result.success) {
            document.getElementById('server-status').textContent = 'Running';
          }
        }

        ipcRenderer.on('server-status', (event, status) => {
          document.getElementById('server-status').textContent = status.running ? 'Running' : 'Stopped';
        });

        // Check status on load
        ipcRenderer.invoke('get-status').then(status => {
          document.getElementById('server-status').textContent = status.serverRunning ? 'Running' : 'Stopped';
        });
      </script>
    </body>
    </html>
  `;

  mainWindow.loadURL('data:text/html,' + encodeURIComponent(html));
}

function createTray() {
  try {
    // Create a simple tray icon programmatically
    const icon = nativeImage.createEmpty();

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show Window',
        click: () => {
          if (mainWindow) mainWindow.show();
        },
      },
      { type: 'separator' },
      {
        label: 'Start Server',
        click: () => startServer(3000),
      },
      {
        label: 'Stop Server',
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

    tray = new Tray(icon);
    tray.setToolTip('Browser AI Bridge');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });

    log('Tray created');
  } catch (error) {
    log('Failed to create tray: ' + error.message);
  }
}

async function startServer(port = 3000) {
  if (server) {
    log('Server already running');
    return;
  }

  try {
    const { createServer } = await import('@bab/api');
    const { serve } = await import('@hono/node-server');

    const appInstance = createServer({
      router: modules.router,
      sessionManager: modules.sessionManager,
      logger: modules.logger,
      promptEngine: modules.promptEngine
    });

    server = serve({ fetch: appInstance.fetch, port }, () => {
      log(`Server running on port ${port}`);
      if (mainWindow) mainWindow.webContents.send('server-status', { running: true, port });
    });
  } catch (error) {
    log('Failed to start server: ' + error.message);
  }
}

function stopServer() {
  if (server) {
    server.close();
    server = null;
    log('Server stopped');
    if (mainWindow) mainWindow.webContents.send('server-status', { running: false });
  }
}

// IPC Handlers
ipcMain.handle('start-server', async (_event, port) => {
  await startServer(port);
  return { success: true };
});

ipcMain.handle('stop-server', async () => {
  stopServer();
  return { success: true };
});

ipcMain.handle('get-status', async () => {
  return {
    serverRunning: !!server,
    connected: !!provider,
    tools: modules.toolDispatcher ? modules.toolDispatcher.getDescriptions() : [],
  };
});

ipcMain.handle('connect-site', async (_event, siteUrl, useExistingProfile) => {
  try {
    if (!modules.router) {
      return { success: false, error: 'Modules not initialized' };
    }

    const { PlaywrightProvider } = await import('@bab/playwright-provider');

    const options = {
      id: 'browser',
      name: 'Browser AI',
      siteUrl,
      headless: false,
    };

    provider = new PlaywrightProvider(options);
    provider.setTools(modules.toolDispatcher.getDescriptions());

    await provider.connect();
    modules.router.registerProvider(provider);
    modules.router.setActiveProvider('browser');

    log(`Connected to ${siteUrl}`);
    return { success: true };
  } catch (error) {
    log('Failed to connect: ' + error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('disconnect-site', async () => {
  if (provider) {
    await provider.shutdown();
    provider = null;
    if (modules.router) modules.router.unregisterProvider('browser');
  }
  return { success: true };
});

// App lifecycle
app.whenReady().then(async () => {
  log('App starting...');
  log('App path: ' + app.getAppPath());
  log('Resources path: ' + (process.resourcesPath || 'N/A'));
  log('User data: ' + app.getPath('userData'));

  // Initialize modules (non-blocking)
  initializeModules().then(success => {
    if (success) {
      log('All modules ready');
    } else {
      log('Some modules failed to load');
    }
  });

  // Create window immediately
  createWindow();

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
  if (provider) {
    await provider.shutdown();
  }
});
