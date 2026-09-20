import {
  Activity,
  Server,
  MessageSquare,
  Terminal,
  Clock,
  Cpu,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useRuntimeState } from '../hooks/useRuntimeState';

export default function RuntimeInspector() {
  const state = useRuntimeState();

  const cardClass = 'rounded-xl glass';

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'busy':
      case 'running':
        return <Loader2 className="w-4 h-4 text-warning animate-spin" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-danger" />;
      default:
        return <XCircle className="w-4 h-4 text-text-subtle" />;
    }
  };

  const getPermissionColor = (mode: string) => {
    switch (mode) {
      case 'auto': return 'bg-success/15 text-success';
      case 'confirm': return 'bg-warning/15 text-warning';
      case 'deny': return 'bg-danger/15 text-danger';
      default: return '';
    }
  };

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className={`text-2xl font-bold text-text`}>
            Runtime Inspector
          </h1>
          <p className="text-text-muted">
            Real-time runtime state and debugging
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface-inset text-text-muted hover:text-accent hover:bg-accent-soft transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Status */}
        <div className="space-y-6">
          {/* Provider Status */}
          <div className={cardClass}>
            <div className={`px-6 py-4 border-b border-border`}>
              <h2 className={`text-lg font-semibold flex items-center gap-2 text-text`}>
                <Server className="w-5 h-5" />
                Provider
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Name</span>
                <span className={`font-medium text-text`}>
                  {state.provider.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Status</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(state.provider.status)}
                  <span className={`font-medium capitalize text-text`}>
                    {state.provider.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Latency</span>
                <span className={`font-mono text-text`}>
                  {Math.round(state.provider.latency)} ms
                </span>
              </div>
            </div>
          </div>

          {/* Browser Status */}
          <div className={cardClass}>
            <div className={`px-6 py-4 border-b border-border`}>
              <h2 className={`text-lg font-semibold flex items-center gap-2 text-text`}>
                <Activity className="w-5 h-5" />
                Browser
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Connected</span>
                {state.browser.connected ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">URL</span>
                <span className={`text-sm truncate ml-2 text-text-muted`}>
                  {state.browser.url || 'Not connected'}
                </span>
              </div>
            </div>
          </div>

          {/* Session */}
          <div className={cardClass}>
            <div className={`px-6 py-4 border-b border-border`}>
              <h2 className={`text-lg font-semibold flex items-center gap-2 text-text`}>
                <MessageSquare className="w-5 h-5" />
                Session
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">ID</span>
                <span className={`font-mono text-text`}>
                  {state.session.id || 'No active session'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Messages</span>
                <span className={`font-medium text-text`}>
                  {state.session.messageCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column - Tools & Performance */}
        <div className="space-y-6">
          {/* Current Tool */}
          <div className={cardClass}>
            <div className={`px-6 py-4 border-b border-border`}>
              <h2 className={`text-lg font-semibold flex items-center gap-2 text-text`}>
                <Terminal className="w-5 h-5" />
                Current Tool
              </h2>
            </div>
            <div className="p-6">
              {state.currentTool.name ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    {getStatusIcon(state.currentTool.status)}
                    <span className={`text-xl font-mono text-text`}>
                      {state.currentTool.name}()
                    </span>
                  </div>
                  {state.queue.length > 0 && (
                    <div>
                      <p className={`text-sm mb-2 text-text-muted`}>
                        Queue:
                      </p>
                      <div className="space-y-1">
                        {state.queue.map((tool, i) => (
                          <div
                            key={i}
                            className="text-sm font-mono px-3 py-1.5 rounded bg-surface-inset text-text-muted"
                          >
                            {tool}()
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-text-muted">
                  No tool executing
                </p>
              )}
            </div>
          </div>

          {/* Performance */}
          <div className={cardClass}>
            <div className={`px-6 py-4 border-b border-border`}>
              <h2 className={`text-lg font-semibold flex items-center gap-2 text-text`}>
                <Clock className="w-5 h-5" />
                Latency
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Provider</span>
                <span className={`font-mono text-text`}>
                  {Math.round(state.performance.providerLatency)} ms
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Runtime</span>
                <span className={`font-mono text-text`}>
                  {state.performance.runtimeLatency} ms
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Tool</span>
                <span className={`font-mono text-text`}>
                  {state.performance.toolLatency} ms
                </span>
              </div>
            </div>
          </div>

          {/* System */}
          <div className={cardClass}>
            <div className={`px-6 py-4 border-b border-border`}>
              <h2 className={`text-lg font-semibold flex items-center gap-2 text-text`}>
                <Cpu className="w-5 h-5" />
                System
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-text-muted">CPU</span>
                  <span className={`font-mono text-text`}>
                    {Math.round(state.system.cpu)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface-inset">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${state.system.cpu}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-text-muted">Memory</span>
                  <span className={`font-mono text-text`}>
                    {Math.round(state.system.memory)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface-inset">
                  <div
                    className="h-full bg-success rounded-full transition-all"
                    style={{ width: `${state.system.memory}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Uptime</span>
                <span className={`font-mono text-text`}>
                  {formatUptime(state.system.uptime)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Permissions & Logs */}
        <div className="space-y-6">
          {/* Permissions */}
          <div className={cardClass}>
            <div className={`px-6 py-4 border-b border-border`}>
              <h2 className={`text-lg font-semibold text-text`}>
                Permissions
              </h2>
            </div>
            <div className={`divide-y divide-border`}>
              {state.permissions.map((perm) => (
                <div key={perm.tool} className="px-6 py-3 flex items-center justify-between">
                  <span className={`font-mono text-sm text-text-muted`}>
                    {perm.tool}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${getPermissionColor(perm.mode)}`}>
                    {perm.mode.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Logs */}
          <div className={cardClass}>
            <div className={`px-6 py-4 border-b border-border`}>
              <h2 className={`text-lg font-semibold text-text`}>
                Logs
              </h2>
            </div>
            <div className="p-4 max-h-64 overflow-y-auto">
              {state.logs.length > 0 ? (
                state.logs.map((log, i) => (
                  <div key={i} className="mb-2 last:mb-0">
                    <div className="flex items-start gap-2">
                      <span className={`text-xs text-text-subtle`}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        log.level === 'error' ? 'bg-danger/15 text-danger' :
                        log.level === 'warn' ? 'bg-warning/15 text-warning' :
                        'bg-accent-soft text-accent'
                      }`}>
                        {log.level}
                      </span>
                      <span className={`text-sm text-text-muted`}>
                        {log.message}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-text-muted">
                  No logs yet
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
