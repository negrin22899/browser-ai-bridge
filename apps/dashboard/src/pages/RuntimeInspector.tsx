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
import { useTheme } from '../contexts/ThemeContext';
import { useRuntimeState } from '../hooks/useRuntimeState';

export default function RuntimeInspector() {
  const { theme } = useTheme();
  const state = useRuntimeState();

  const cardClass = `rounded-xl border ${
    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  }`;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'busy':
      case 'running':
        return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <XCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getPermissionColor = (mode: string) => {
    switch (mode) {
      case 'auto': return 'bg-green-50 text-green-700';
      case 'confirm': return 'bg-yellow-50 text-yellow-700';
      case 'deny': return 'bg-red-50 text-red-700';
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
          <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Runtime Inspector
          </h1>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            Real-time runtime state and debugging
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg ${
            theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
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
            <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-lg font-semibold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                <Server className="w-5 h-5" />
                Provider
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>Name</span>
                <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {state.provider.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>Status</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(state.provider.status)}
                  <span className={`font-medium capitalize ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {state.provider.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>Latency</span>
                <span className={`font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {Math.round(state.provider.latency)} ms
                </span>
              </div>
            </div>
          </div>

          {/* Browser Status */}
          <div className={cardClass}>
            <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-lg font-semibold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                <Activity className="w-5 h-5" />
                Browser
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>Connected</span>
                {state.browser.connected ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>URL</span>
                <span className={`text-sm truncate ml-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {state.browser.url || 'Not connected'}
                </span>
              </div>
            </div>
          </div>

          {/* Session */}
          <div className={cardClass}>
            <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-lg font-semibold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                <MessageSquare className="w-5 h-5" />
                Session
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>ID</span>
                <span className={`font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {state.session.id || 'No active session'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>Messages</span>
                <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
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
            <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-lg font-semibold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                <Terminal className="w-5 h-5" />
                Current Tool
              </h2>
            </div>
            <div className="p-6">
              {state.currentTool.name ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    {getStatusIcon(state.currentTool.status)}
                    <span className={`text-xl font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {state.currentTool.name}()
                    </span>
                  </div>
                  {state.queue.length > 0 && (
                    <div>
                      <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        Queue:
                      </p>
                      <div className="space-y-1">
                        {state.queue.map((tool, i) => (
                          <div key={i} className={`text-sm font-mono px-3 py-1.5 rounded ${
                            theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {tool}()
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                  No tool executing
                </p>
              )}
            </div>
          </div>

          {/* Performance */}
          <div className={cardClass}>
            <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-lg font-semibold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                <Clock className="w-5 h-5" />
                Latency
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>Provider</span>
                <span className={`font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {Math.round(state.performance.providerLatency)} ms
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>Runtime</span>
                <span className={`font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {state.performance.runtimeLatency} ms
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>Tool</span>
                <span className={`font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {state.performance.toolLatency} ms
                </span>
              </div>
            </div>
          </div>

          {/* System */}
          <div className={cardClass}>
            <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-lg font-semibold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                <Cpu className="w-5 h-5" />
                System
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>CPU</span>
                  <span className={`font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {Math.round(state.system.cpu)}%
                  </span>
                </div>
                <div className={`h-2 rounded-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all"
                    style={{ width: `${state.system.cpu}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>Memory</span>
                  <span className={`font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {Math.round(state.system.memory)}%
                  </span>
                </div>
                <div className={`h-2 rounded-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${state.system.memory}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>Uptime</span>
                <span className={`font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
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
            <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Permissions
              </h2>
            </div>
            <div className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-100'}`}>
              {state.permissions.map((perm) => (
                <div key={perm.tool} className="px-6 py-3 flex items-center justify-between">
                  <span className={`font-mono text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
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
            <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Logs
              </h2>
            </div>
            <div className="p-4 max-h-64 overflow-y-auto">
              {state.logs.length > 0 ? (
                state.logs.map((log, i) => (
                  <div key={i} className="mb-2 last:mb-0">
                    <div className="flex items-start gap-2">
                      <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        log.level === 'error' ? 'bg-red-50 text-red-700' :
                        log.level === 'warn' ? 'bg-yellow-50 text-yellow-700' :
                        'bg-blue-50 text-blue-700'
                      }`}>
                        {log.level}
                      </span>
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        {log.message}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
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
