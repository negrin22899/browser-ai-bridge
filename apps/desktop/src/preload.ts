import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // ── Window controls ──────────────────────────────────────────
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  minimizeToTray: () => ipcRenderer.send('minimize-to-tray'),

  // ── Server control ───────────────────────────────────────────
  startServer: (port: number) => ipcRenderer.invoke('start-server', port),
  stopServer: () => ipcRenderer.invoke('stop-server'),

  // ── Status ───────────────────────────────────────────────────
  getStatus: () => ipcRenderer.invoke('get-status'),

  // ── Browser ──────────────────────────────────────────────────
  openChrome: (url: string) => ipcRenderer.invoke('open-chrome', url),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),

  // ── Updates ──────────────────────────────────────────────────
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  setUpdateChannel: (channel: 'stable' | 'beta') => ipcRenderer.invoke('set-update-channel', channel),

  // ── Provider Detection ───────────────────────────────────────
  checkChrome: () => ipcRenderer.invoke('check-chrome'),
  openProviderSignin: (url: string) => ipcRenderer.invoke('open-provider-signin', url),
  checkProviderStatus: (providerId: string) => ipcRenderer.invoke('check-provider-status', providerId),
  getDetectedProviders: () => ipcRenderer.invoke('get-detected-providers'),

  // ── Settings ─────────────────────────────────────────────────
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  mergeSettings: (patch: any) => ipcRenderer.invoke('merge-settings', patch),

  // ── Browsers (multi-browser support) ─────────────────────────
  listBrowsers: () => ipcRenderer.invoke('list-browsers'),
  detectInstalledBrowsers: () => ipcRenderer.invoke('detect-installed-browsers'),

  // ── Active provider ──────────────────────────────────────────
  setActiveProvider: (id: string) => ipcRenderer.invoke('set-active-provider', id),

  // ── Events ───────────────────────────────────────────────────
  onServerStatus: (callback: (status: any) => void) => {
    ipcRenderer.on('server-status', (_e, status) => callback(status));
  },
  onAppStatus: (callback: (status: any) => void) => {
    ipcRenderer.on('app-status', (_e, status) => callback(status));
  },
  onConnectionStatus: (callback: (status: any) => void) => {
    ipcRenderer.on('connection-status', (_e, status) => callback(status));
  },
  onWindowMaximized: (callback: (maximized: boolean) => void) => {
    ipcRenderer.on('window-maximized', (_e, maximized) => callback(maximized));
  },
  onUpdateStatus: (callback: (status: any) => void) => {
    ipcRenderer.on('update-status', (_e, status) => callback(status));
  },

  // ── Cleanup ──────────────────────────────────────────────────
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});
