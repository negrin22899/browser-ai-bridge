import { useState, useEffect } from 'react';

export interface RuntimeState {
  provider: {
    name: string;
    status: 'connected' | 'disconnected' | 'busy' | 'error';
    latency: number;
  };
  browser: {
    connected: boolean;
    url: string;
  };
  session: {
    id: string;
    messageCount: number;
  };
  currentTool: {
    name: string;
    status: 'running' | 'idle';
  };
  queue: string[];
  permissions: Array<{
    tool: string;
    mode: 'auto' | 'confirm' | 'deny';
  }>;
  performance: {
    providerLatency: number;
    runtimeLatency: number;
    toolLatency: number;
  };
  system: {
    cpu: number;
    memory: number;
    uptime: number;
  };
  logs: Array<{
    timestamp: number;
    level: 'info' | 'warn' | 'error';
    message: string;
  }>;
}

/**
 * Hook to get real runtime state
 * 
 * In production, this would connect to the Runtime via WebSocket or polling.
 * For now, it returns initial state and simulates updates.
 */
export function useRuntimeState(): RuntimeState {
  const [state, setState] = useState<RuntimeState>({
    provider: {
      name: 'Gemini',
      status: 'disconnected',
      latency: 0,
    },
    browser: {
      connected: false,
      url: '',
    },
    session: {
      id: '',
      messageCount: 0,
    },
    currentTool: {
      name: '',
      status: 'idle',
    },
    queue: [],
    permissions: [
      { tool: 'fs.read', mode: 'auto' },
      { tool: 'fs.write', mode: 'confirm' },
      { tool: 'git.status', mode: 'auto' },
      { tool: 'git.commit', mode: 'confirm' },
      { tool: 'shell.exec', mode: 'confirm' },
    ],
    performance: {
      providerLatency: 0,
      runtimeLatency: 0,
      toolLatency: 0,
    },
    system: {
      cpu: 0,
      memory: 0,
      uptime: 0,
    },
    logs: [],
  });

  // Fetch real state from API
  useEffect(() => {
    const fetchState = async () => {
      try {
        // Fetch provider status
        const providerRes = await fetch('/v1/models');
        if (providerRes.ok) {
          const providerData = await providerRes.json();
          setState(prev => ({
            ...prev,
            provider: {
              ...prev.provider,
              name: providerData.data?.[0]?.id ?? 'Not connected',
              status: providerData.data?.length > 0 ? 'connected' : 'disconnected',
            },
          }));
        }

        // Fetch health
        const healthRes = await fetch('/health');
        if (healthRes.ok) {
          const healthData = await healthRes.json();
          setState(prev => ({
            ...prev,
            provider: {
              ...prev.provider,
              latency: healthData.providers?.gemini?.latency ?? 0,
            },
            browser: {
              connected: healthData.providers?.gemini?.healthy ?? false,
              url: healthData.providers?.gemini?.details?.url ?? '',
            },
          }));
        }

        // Fetch sessions
        const sessionsRes = await fetch('/v1/sessions');
        if (sessionsRes.ok) {
          const sessionsData = await sessionsRes.json();
          if (sessionsData.data?.length > 0) {
            const lastSession = sessionsData.data[sessionsData.data.length - 1];
            setState(prev => ({
              ...prev,
              session: {
                id: lastSession.id,
                messageCount: lastSession.messageCount ?? 0,
              },
            }));
          }
        }
      } catch (error) {
        // API not available, use default state
        console.debug('Could not fetch runtime state:', error);
      }
    };

    // Fetch immediately
    fetchState();

    // Then poll every 5 seconds
    const interval = setInterval(fetchState, 5000);

    return () => clearInterval(interval);
  }, []);

  // Simulate system metrics (would be real in production)
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => ({
        ...prev,
        system: {
          cpu: Math.min(100, Math.max(0, prev.system.cpu + Math.random() * 10 - 5)),
          memory: Math.min(100, Math.max(0, prev.system.memory + Math.random() * 5 - 2.5)),
          uptime: prev.system.uptime + 1,
        },
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return state;
}
