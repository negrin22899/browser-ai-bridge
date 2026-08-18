import { useState, useEffect, useCallback } from 'react';
import {
  Server,
  Globe,
  Zap,
  CheckCircle,
  XCircle,
  ExternalLink,
  Chrome,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useElectron } from '../hooks/useElectron';
import { api } from '../lib/api';

interface ProviderInfo {
  id: string;
  name: string;
  siteUrl: string;
  status: 'connected' | 'disconnected';
  latency?: number;
  error?: string;
}

// Static metadata for known providers. Live status comes from /health.
const PROVIDER_META: Record<string, { name: string; siteUrl: string }> = {
  gemini: { name: 'Google Gemini', siteUrl: 'https://gemini.google.com' },
  chatgpt: { name: 'ChatGPT', siteUrl: 'https://chatgpt.com' },
  claude: { name: 'Claude', siteUrl: 'https://claude.ai' },
  deepseek: { name: 'DeepSeek', siteUrl: 'https://chat.deepseek.com' },
};

function getProviderIcon(id: string) {
  if (id === 'chatgpt') return Zap;
  return Globe;
}

export default function Providers() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { isElectron } = useElectron();
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const loadProviders = useCallback(async () => {
    try {
      const [health, models] = await Promise.all([api.getHealth(), api.getModels()]);

      const providerIds = models.data?.length
        ? models.data.map((m) => m.id)
        : Object.keys(health.providers);

      const list: ProviderInfo[] = providerIds.map((id) => {
        const meta = PROVIDER_META[id] ?? { name: id, siteUrl: '' };
        const healthData = health.providers[id];
        return {
          id,
          name: meta.name,
          siteUrl: meta.siteUrl,
          status: healthData?.healthy ? 'connected' : 'disconnected',
          latency: healthData?.latency,
          error: healthData?.error,
        };
      });

      setProviders(list);
    } catch {
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProviders();
    const interval = setInterval(loadProviders, 5000);
    return () => clearInterval(interval);
  }, [loadProviders]);

  const handleConnect = async (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    if (!provider || !provider.siteUrl) return;

    setConnectingId(providerId);
    // In Electron, window.open is intercepted by setWindowOpenHandler
    // and opens in the system browser. In the web dashboard it opens a tab.
    window.open(provider.siteUrl, '_blank');

    // Give the user a moment to sign in, then refresh status.
    setTimeout(() => {
      loadProviders();
      setConnectingId(null);
    }, 3000);
  };

  const cardClass = `rounded-xl border ${
    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  }`;

  const connectedCount = providers.filter((p) => p.status === 'connected').length;

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
      </div>

      {isElectron && (
        <div className={`mb-6 p-4 rounded-lg ${
          theme === 'dark' ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-center gap-3">
            <Chrome className="w-5 h-5 text-blue-500" />
            <p className={`text-sm ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
              Click "Connect" to open the provider in your browser and sign in. Status updates automatically.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                Connected
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
                Available
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Provider List */}
      {loading && providers.length === 0 ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : providers.length === 0 ? (
        <div className={`${cardClass} p-12 text-center`}>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            No providers configured. Start the server with --site flag.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {providers.map((provider) => {
            const Icon = getProviderIcon(provider.id);
            return (
              <div key={provider.id} className={`${cardClass} p-6`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      provider.status === 'connected' ? 'bg-green-500' : 'bg-blue-500'
                    }`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {provider.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {provider.siteUrl && (
                          <a
                            href={provider.siteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-xs flex items-center gap-1 ${
                              theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                            }`}
                          >
                            {provider.siteUrl}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {provider.latency !== undefined && (
                          <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                            {provider.latency}ms
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {provider.status === 'connected' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700">
                        <CheckCircle className="w-4 h-4" />
                        Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-gray-50 text-gray-600">
                        <XCircle className="w-4 h-4" />
                        {provider.error ? 'Error' : 'Disconnected'}
                      </span>
                    )}
                    {provider.status !== 'connected' && (
                      <button
                        onClick={() => handleConnect(provider.id)}
                        disabled={connectingId === provider.id}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 text-sm disabled:opacity-50"
                      >
                        {connectingId === provider.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ExternalLink className="w-4 h-4" />
                        )}
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
