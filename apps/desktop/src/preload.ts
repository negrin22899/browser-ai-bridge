import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  startServer: (port: number) => ipcRenderer.invoke('start-server', port),
  stopServer: () => ipcRenderer.invoke('stop-server'),
  connectSite: (siteUrl: string, useExistingProfile: boolean) =>
    ipcRenderer.invoke('connect-site', siteUrl, useExistingProfile),
  disconnectSite: () => ipcRenderer.invoke('disconnect-site'),
  getStatus: () => ipcRenderer.invoke('get-status'),
  onServerStatus: (callback: (status: any) => void) => {
    ipcRenderer.on('server-status', (_event, status) => callback(status));
  },
  onConnectionStatus: (callback: (status: any) => void) => {
    ipcRenderer.on('connection-status', (_event, status) => callback(status));
  },
});
