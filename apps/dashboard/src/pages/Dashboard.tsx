import { useState, useEffect } from 'react';
import {
  Activity,
  MessageSquare,
  Server,
  Clock,
  CheckCircle,
  Shield,
  RefreshCw,
  Power,
  WifiOff,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { api, type HealthStatus, type Session } from '../lib/api';
import { useElectron } from '../hooks/useElectron';

export default function Dashboard() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { isElectron, serverRunning, startServer, stopServer } = useElectron();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [providerCount, setProviderCount] = useState(0);
  const [connectedCount, setConnectedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [healthData, sessionsData] = await Promise.all([
        api.getHealth(),
        api.getSessions(),
      ]);
      setHealth(healthData);
      setSessions(sessionsData.data || []);
      const providers = Object.keys(healthData.providers);
      setProviderCount(providers.length);
      setConnectedCount(providers.filter(p => healthData.providers[p]?.healthy).length);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const cardClass = `rounded-xl border ${
    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  }`;

  // Server not running - show friendly screen
  if (!loading && error && error.includes('Server not running')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
        }`}>
          <WifiOff className={`w-10 h-10 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
        </div>
        <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Server Not Running
        </h2>
        <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Start the server to connect to your AI provider
        </p>
        <button
          onClick={async () => {
            if (isElectron) {
              await startServer();
              setTimeout(loadData, 3000);
            } else {
              // In browser, show instructions
              alert('Run in terminal: bab serve --site gemini');
            }
          }}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          <Power className="w-5 h-5" />
          {isElectron ? 'Start Server' : 'How to Start'}
        </button>
        {!isElectron && (
          <div className={`mt-6 p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <p className={`text-xs font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              bab serve --site gemini
            </p>
          </div>
        )}
      </div>
    );
  }

  // Loading
  if (loading && !health) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const stats = [
    { name: t('dashboard.totalRequests'), value: sessions.length.toString(), icon: Activity, change: '' },
    { name: t('dashboard.activeSessions'), value: sessions.length.toString(), icon: MessageSquare, change: '' },
    { name: t('dashboard.activeProviders'), value: `${connectedCount}/${providerCount}`, icon: Server, change: connectedCount > 0 ? 'Online' : 'Offline' },
    { name: t('dashboard.uptime'), value: health?.status === 'ok' ? 'Running' : 'Down', icon: Clock, change: health?.status || 'unknown' },
  ];

  const systemStatus = [
    { name: t('dashboard.runtimeReady'), status: health?.status === 'ok' },
    { name: t('dashboard.toolsRegistered'), value: '6', status: true },
    { name: t('dashboard.permissionsActive'), value: 'scope', status: true },
  ];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {t('dashboard.title')}
          </h1>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            {t('dashboard.welcome')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isElectron && (
            <button
              onClick={() => serverRunning ? stopServer() : startServer()}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                serverRunning
                  ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                  : 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
              }`}
            >
              <Power className="w-4 h-4" />
              {serverRunning ? 'Stop' : 'Start'}
            </button>
          )}
          <button
            onClick={loadData}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''} ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className={`${cardClass} p-6 hover:shadow-md transition-shadow`}>
            <div className="flex items-center justify-between">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                theme === 'dark' ? 'bg-primary-900' : 'bg-primary-50'
              }`}>
                <stat.icon className={`w-6 h-6 ${theme === 'dark' ? 'text-primary-400' : 'text-primary-600'}`} />
              </div>
              {stat.change && (
                <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${
                  stat.change === 'Online' || stat.change === 'ok'
                    ? 'text-green-600 bg-green-50'
                    : stat.change === 'Offline'
                      ? 'text-red-600 bg-red-50'
                      : 'text-gray-600 bg-gray-50'
                }`}>
                  {stat.change}
                </span>
              )}
            </div>
            <div className="mt-4">
              <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {stat.value}
              </p>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {stat.name}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Status */}
        <div className={`${cardClass}`}>
          <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {t('dashboard.systemStatus')}
            </h2>
          </div>
          <div className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-100'}`}>
            {systemStatus.map((item) => (
              <div key={item.name} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className={`w-5 h-5 ${item.status ? 'text-green-500' : 'text-red-500'}`} />
                  <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                    {item.name}
                  </span>
                </div>
                {item.value && (
                  <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {item.value}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Providers Status */}
        <div className={`lg:col-span-2 ${cardClass}`}>
          <div className={`px-6 py-4 border-b flex items-center justify-between ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Providers
            </h2>
          </div>
          <div className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-100'}`}>
            {health && Object.entries(health.providers).map(([id, provider]) => (
              <div key={id} className={`px-6 py-4 flex items-center justify-between ${
                theme === 'dark' ? 'hover:bg-gray-750' : 'hover:bg-gray-50'
              }`}>
                <div className="flex items-center gap-3">
                  {provider.healthy ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <Shield className="w-5 h-5 text-red-500" />
                  )}
                  <div>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {id.charAt(0).toUpperCase() + id.slice(1)}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      {provider.healthy ? 'Connected' : provider.error || 'Disconnected'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {provider.latency && (
                    <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      {provider.latency}ms
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    provider.healthy
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}>
                    {provider.healthy ? 'Healthy' : 'Unhealthy'}
                  </span>
                </div>
              </div>
            ))}
            {health && Object.keys(health.providers).length === 0 && (
              <div className="px-6 py-8 text-center">
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  No providers configured. Start the server with --site flag.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
