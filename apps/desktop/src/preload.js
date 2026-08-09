const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Server control
  startServer: (port) => ipcRenderer.invoke('start-server', port),
  stopServer: () => ipcRenderer.invoke('stop-server'),
  
  // Status
  getStatus: () => ipcRenderer.invoke('get-status'),
  
  // Browser
  openChrome: (url) => ipcRenderer.invoke('open-chrome', url),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // Events
  onServerStatus: (callback) => {
    ipcRenderer.on('server-status', (_event, data) => callback(data));
  },
  onAppStatus: (callback) => {
    ipcRenderer.on('app-status', (_event, data) => callback(data));
  },
  onConnectionStatus: (callback) => {
    ipcRenderer.on('connection-status', (_event, data) => callback(data));
  },
  
  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
});
