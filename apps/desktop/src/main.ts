const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow: any = null;
let tray: any = null;
let server: any = null;
let provider: any = null;
let eventBus: any = null;
let logger: any = null;
let sessionManager: any = null;
let router: any = null;
let promptEngine: any = null;
let toolDispatcher: any = null;

// Initialize modules dynamically
async function initializeModules() {
  const core = await import('@bab/core');
  const runtime = await import('@bab/runtime');
  const promptEngineModule = await import('@bab/prompt-engine');
  const toolsFs = await import('@bab/tools-fs');
  const toolsGit = await import('@bab/tools-git');
  const toolsShell = await import('@bab/tools-shell');

  eventBus = new core.EventBus();
  logger = new core.Logger({ level: 'info', format: 'text', context: 'Desktop' });
  sessionManager = new core.SessionManager(eventBus);
  router = new core.Router(eventBus);
  promptEngine = new promptEngineModule.PromptEngine();
  toolDispatcher = new runtime.ToolDispatcher(eventBus);

  // Register tools
  toolDispatcher.register(new toolsFs.FsReadTool());
  toolDispatcher.register(new toolsFs.FsWriteTool());
  toolDispatcher.register(new toolsGit.GitStatusTool());
  toolDispatcher.register(new toolsGit.GitDiffTool());
  toolDispatcher.register(new toolsGit.GitCommitTool());
  toolDispatcher.register(new toolsShell.ShellExecTool());

  return { core, runtime, promptEngineModule, toolsFs, toolsGit, toolsShell };
}

// Get Chrome user data directory based on platform
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

// Get default Chrome executable path
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
  });

  // Load the dashboard
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    const dashboardPath = path.join(process.resourcesPath, 'dashboard', 'index.html');
    mainWindow.loadFile(dashboardPath);
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '../build/icon.png');
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

  tray.setToolTip('Browser AI Bridge');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow?.show();
  });
}

async function startServer(port: number = 3000) {
  if (server) {
    logger?.warn('Server already running');
    return;
  }

  const { createServer } = await import('@bab/api');
  const { serve } = await import('@hono/node-server');

  const app = createServer({ router, sessionManager, logger, promptEngine });

  server = serve({ fetch: app.fetch, port }, () => {
    logger?.info(`Server running on port ${port}`);
    mainWindow?.webContents.send('server-status', { running: true, port });
  });
}

function stopServer() {
  if (server) {
    server.close();
    server = null;
    logger?.info('Server stopped');
    mainWindow?.webContents.send('server-status', { running: false });
  }
}

async function connectToSite(siteUrl: string, useExistingProfile: boolean = true) {
  if (provider) {
    await provider.shutdown();
  }

  const { PlaywrightProvider } = await import('@bab/playwright-provider');

  const options: any = {
    id: 'browser',
    name: 'Browser AI',
    siteUrl,
    headless: false,
  };

  // Use existing Chrome profile
  if (useExistingProfile) {
    const userDataDir = getChromeUserDataDir();
    const executablePath = getChromeExecutablePath();

    if (fs.existsSync(userDataDir)) {
      logger?.info(`Using existing Chrome profile: ${userDataDir}`);
      // Playwright can connect to existing Chrome via CDP
      // For now we use a new profile but with the same executable
      options.executablePath = executablePath;
    }
  }

  provider = new PlaywrightProvider(options);
  provider.setTools(toolDispatcher.getDescriptions());

  await provider.connect();
  router.registerProvider(provider);
  router.setActiveProvider('browser');

  logger?.info(`Connected to ${siteUrl}`);
  mainWindow?.webContents.send('connection-status', { connected: true, site: siteUrl });
}

// IPC Handlers
ipcMain.handle('start-server', async (_event: any, port: number) => {
  await startServer(port);
  return { success: true };
});

ipcMain.handle('stop-server', async () => {
  stopServer();
  return { success: true };
});

ipcMain.handle('connect-site', async (_event: any, siteUrl: string, useExistingProfile: boolean) => {
  try {
    await connectToSite(siteUrl, useExistingProfile);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('disconnect-site', async () => {
  if (provider) {
    await provider.shutdown();
    provider = null;
    router.unregisterProvider('browser');
    mainWindow?.webContents.send('connection-status', { connected: false });
  }
  return { success: true };
});

ipcMain.handle('get-status', async () => {
  return {
    serverRunning: !!server,
    connected: !!provider,
    tools: toolDispatcher?.getDescriptions() || [],
  };
});

// App lifecycle
app.whenReady().then(async () => {
  await initializeModules();
  createWindow();
  createTray();

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
