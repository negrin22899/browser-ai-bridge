import { useState, useEffect } from 'react';
import { api } from '../lib/api';

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
 * Hook to get real runtime state from API
 */
export function useRuntimeState(): RuntimeState {
  const [state, setState] = useState<RuntimeState>({
    provider: {
      name: 'Not connected',
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

  useEffect(() => {
    let mounted = true;

    async function fetchState() {
      try {
        // Fetch health status
        const health = await api.getHealth();
        if (!mounted) return;

        const providerIds = Object.keys(health.providers);
        const connectedProviders = providerIds.filter(id => health.providers[id]?.healthy);
        const firstProvider = providerIds[0];
        const providerData = firstProvider ? health.providers[firstProvider] : null;

        setState(prev => ({
          ...prev,
          provider: {
            name: firstProvider ? firstProvider.charAt(0).toUpperCase() + firstProvider.slice(1) : 'Not connected',
            status: providerData?.healthy ? 'connected' : 'disconnected',
            latency: providerData?.latency ?? 0,
          },
          browser: {
            connected: connectedProviders.length > 0,
            url: providerData?.details?.url as string ?? '',
          },
          performance: {
            providerLatency: providerData?.latency ?? 0,
            runtimeLatency: 0,
            toolLatency: 0,
          },
        }));

        // Fetch sessions
        const sessions = await api.getSessions();
        if (!mounted) return;

        if (sessions.data?.length > 0) {
          const lastSession = sessions.data[sessions.data.length - 1];
          setState(prev => ({
            ...prev,
            session: {
              id: lastSession.id,
              messageCount: lastSession.messages?.length ?? 0,
            },
          }));
        }

        // Fetch tools
        try {
          const tools = await api.getTools();
          if (!mounted) return;

          setState(prev => ({
            ...prev,
            permissions: tools.map(tool => ({
              tool: tool.name,
              mode: (tool.permission ?? (tool.name.includes('read') || tool.name.includes('status') || tool.name.includes('diff')
                ? 'auto'
                : 'confirm')) as 'auto' | 'confirm' | 'deny',
            })),
          }));
        } catch {
          // Tools endpoint not available
        }
      } catch {
        // API not available
      }
    }

    fetchState();
    const interval = setInterval(fetchState, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return state;
}
