const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ── Window controls ──────────────────────────────────────────
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  minimizeToTray: () => ipcRenderer.send('minimize-to-tray'),

  // ── Server control ───────────────────────────────────────────
  startServer: (port) => ipcRenderer.invoke('start-server', port),
  stopServer: () => ipcRenderer.invoke('stop-server'),

  // ── Status ───────────────────────────────────────────────────
  getStatus: () => ipcRenderer.invoke('get-status'),

  // ── Browser ──────────────────────────────────────────────────
  openChrome: (url) => ipcRenderer.invoke('open-chrome', url),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // ── Updates ──────────────────────────────────────────────────
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),

  // ── Events ───────────────────────────────────────────────────
  onServerStatus: (callback) => {
    ipcRenderer.on('server-status', (_e, data) => callback(data));
  },
  onAppStatus: (callback) => {
    ipcRenderer.on('app-status', (_e, data) => callback(data));
  },
  onConnectionStatus: (callback) => {
    ipcRenderer.on('connection-status', (_e, data) => callback(data));
  },
  onWindowMaximized: (callback) => {
    ipcRenderer.on('window-maximized', (_e, maximized) => callback(maximized));
  },
  onUpdateStatus: (callback) => {
    ipcRenderer.on('update-status', (_e, data) => callback(data));
  },

  // ── Cleanup ──────────────────────────────────────────────────
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
});
