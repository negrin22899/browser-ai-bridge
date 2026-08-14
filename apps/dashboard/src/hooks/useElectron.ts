import { useState, useEffect, useCallback } from 'react';

interface ElectronAPI {
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  isMaximized: () => Promise<boolean>;
  minimizeToTray: () => void;
  startServer: (port?: number) => Promise<{ success: boolean; error?: string }>;
  stopServer: () => Promise<{ success: boolean }>;
  getStatus: () => Promise<{
    chromeInstalled: boolean;
    nodeInstalled: boolean;
    serverRunning: boolean;
    connected: boolean;
    port: number;
    site: string | null;
    version: string;
  }>;
  checkForUpdates: () => Promise<{ status: string }>;
  onServerStatus: (callback: (status: { running: boolean; port?: number }) => void) => void;
  onAppStatus: (callback: (status: any) => void) => void;
  onWindowMaximized: (callback: (maximized: boolean) => void) => void;
  onUpdateStatus: (callback: (status: any) => void) => void;
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI;
}

export function useElectron() {
  const [isReady, setIsReady] = useState(false);
  const [serverRunning, setServerRunning] = useState(false);
  const [serverPort, setServerPort] = useState(3000);
  const [isMaximized, setIsMaximized] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<{ status: string; version?: string; percent?: number } | null>(null);

  useEffect(() => {
    if (!isElectron()) return;

    const api = window.electronAPI!;

    // Get initial status
    api.getStatus().then((status) => {
      setServerRunning(status.serverRunning);
      setServerPort(status.port);
      setIsReady(true);
    });

    // Listen for server status changes
    api.onServerStatus((status) => {
      setServerRunning(status.running);
      if (status.port) setServerPort(status.port);
    });

    // Listen for window maximize state
    api.onWindowMaximized((maximized) => {
      setIsMaximized(maximized);
    });

    // Listen for update status
    api.onUpdateStatus((status) => {
      setUpdateStatus(status);
    });

    return () => {
      api.removeAllListeners('server-status');
      api.removeAllListeners('window-maximized');
      api.removeAllListeners('update-status');
    };
  }, []);

  const minimize = useCallback(() => {
    window.electronAPI?.minimizeWindow();
  }, []);

  const maximize = useCallback(() => {
    window.electronAPI?.maximizeWindow();
  }, []);

  const close = useCallback(() => {
    window.electronAPI?.closeWindow();
  }, []);

  const minimizeToTray = useCallback(() => {
    window.electronAPI?.minimizeToTray();
  }, []);

  const startServer = useCallback(async (port?: number) => {
    if (!window.electronAPI) return { success: false, error: 'Not in Electron' };
    return await window.electronAPI.startServer(port);
  }, []);

  const stopServer = useCallback(async () => {
    if (!window.electronAPI) return { success: false };
    return await window.electronAPI.stopServer();
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (!window.electronAPI) return { status: 'unavailable' };
    return await window.electronAPI.checkForUpdates();
  }, []);

  return {
    isElectron: isElectron(),
    isReady,
    serverRunning,
    serverPort,
    isMaximized,
    updateStatus,
    minimize,
    maximize,
    close,
    minimizeToTray,
    startServer,
    stopServer,
    checkForUpdates,
  };
}
