import { useState, useEffect } from 'react';
import {
  Server,
  Globe,
  Zap,
  CheckCircle,
  XCircle,
  Plus,
  RefreshCw,
  Activity,
  MessageSquare,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { api, type HealthStatus } from '../lib/api';

interface ProviderInfo {
  id: string;
  name: string;
  type: 'browser' | 'api';
  status: 'connected' | 'disconnected' | 'error';
  healthy: boolean;
  latency?: number;
  error?: string;
}

const PROVIDER_META: Record<string, { name: string; type: 'browser' | 'api'; siteUrl: string }> = {
  gemini: { name: 'Google Gemini', type: 'browser', siteUrl: 'https://gemini.google.com' },
  chatgpt: { name: 'ChatGPT', type: 'browser', siteUrl: 'https://chatgpt.com' },
  claude: { name: 'Claude', type: 'browser', siteUrl: 'https://claude.ai' },
  deepseek: { name: 'DeepSeek', type: 'browser', siteUrl: 'https://chat.deepseek.com' },
};

export default function Providers() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadProviders() {
    setLoading(true);
    setError(null);
    try {
      const health = await api.getHealth();
      const providerList: ProviderInfo[] = Object.entries(health.providers).map(([id, data]) => ({
        id,
        name: PROVIDER_META[id]?.name || id.charAt(0).toUpperCase() + id.slice(1),
        type: PROVIDER_META[id]?.type || 'browser',
        status: data.healthy ? 'connected' : (data.error ? 'error' : 'disconnected'),
        healthy: data.healthy,
        latency: data.latency,
        error: data.error,
      }));
      setProviders(providerList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load providers');
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProviders();
    const interval = setInterval(loadProviders, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const cardClass = `rounded-xl border ${
    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  }`;

  const connectedCount = providers.filter(p => p.status === 'connected').length;

  if (loading && providers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {t('providers.title')}
          </h1>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            {t('providers.subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadProviders}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''} ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`} />
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600">
            <Plus className="w-4 h-4" />
            {t('providers.add')}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`${cardClass} p-4`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              theme === 'dark' ? 'bg-green-900' : 'bg-green-50'
            }`}>
              <CheckCircle className={`w-5 h-5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {connectedCount}
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {t('providers.connected')}
              </p>
            </div>
          </div>
        </div>
        <div className={`${cardClass} p-4`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              theme === 'dark' ? 'bg-blue-900' : 'bg-blue-50'
            }`}>
              <Server className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {providers.length}
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {t('providers.available')}
              </p>
            </div>
          </div>
        </div>
        <div className={`${cardClass} p-4`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              theme === 'dark' ? 'bg-purple-900' : 'bg-purple-50'
            }`}>
              <Activity className={`w-5 h-5 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {providers.filter(p => p.healthy).length}
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {t('providers.healthy')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Provider List */}
      {providers.length === 0 && !loading ? (
        <div className={`${cardClass} p-12 text-center`}>
          <Server className={`w-12 h-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            No providers configured. Start the server with --site flag.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {providers.map((provider) => (
            <div key={provider.id} className={`${cardClass} p-6`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    provider.type === 'browser' ? 'bg-blue-500' : 'bg-green-500'
                  }`}>
                    {provider.type === 'browser' ? (
                      <Globe className="w-6 h-6 text-white" />
                    ) : (
                      <Zap className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {provider.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {provider.type === 'browser' ? t('providers.browser') : t('providers.api')}
                      </span>
                      {PROVIDER_META[provider.id]?.siteUrl && (
                        <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                          {PROVIDER_META[provider.id].siteUrl}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Status Badge */}
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                    provider.status === 'connected'
                      ? 'bg-green-50 text-green-700'
                      : provider.status === 'error'
                        ? 'bg-red-50 text-red-700'
                        : theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {provider.status === 'connected' && <CheckCircle className="w-4 h-4" />}
                    {provider.status === 'error' && <XCircle className="w-4 h-4" />}
                    {provider.status === 'disconnected' && <XCircle className="w-4 h-4" />}
                    {t(`providers.${provider.status}`)}
                  </span>

                  {/* Health Badge */}
                  {provider.status === 'connected' && (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${
                      provider.healthy
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                    }`}>
                      {provider.healthy ? t('providers.healthy') : t('providers.unhealthy')}
                    </span>
                  )}

                  {/* Latency */}
                  {provider.latency && (
                    <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      {provider.latency}ms
                    </span>
                  )}
                </div>
              </div>

              {/* Error message */}
              {provider.error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {provider.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
