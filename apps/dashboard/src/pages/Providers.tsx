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
  ExternalLink,
  Chrome,
  Loader2,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { api } from '../lib/api';
import { useElectron } from '../hooks/useElectron';

interface ProviderInfo {
  id: string;
  name: string;
  type: 'browser' | 'api';
  status: 'connected' | 'disconnected' | 'error' | 'checking';
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
  const { isElectron, openProviderSignin, checkProviderStatus } = useElectron();
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [checkingProvider, setCheckingProvider] = useState<string | null>(null);

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
    const interval = setInterval(loadProviders, 15000);
    return () => clearInterval(interval);
  }, []);

  const cardClass = `rounded-xl border ${
    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  }`;

  const connectedCount = providers.filter(p => p.status === 'connected').length;

  const handleAddProvider = async (providerId: string) => {
    setCheckingProvider(providerId);

    try {
      if (isElectron) {
        // Open provider sign-in page in browser
        const result = await openProviderSignin(providerId);

        if (result.success) {
          // Wait a bit for user to sign in, then check status
          setTimeout(async () => {
            try {
              const status = await checkProviderStatus(providerId);

              if (status.connected) {
                // Add provider to list
                const newProvider: ProviderInfo = {
                  id: providerId,
                  name: PROVIDER_META[providerId]?.name || providerId,
                  type: 'browser',
                  status: 'connected',
                  healthy: true,
                };

                setProviders(prev => {
                  const exists = prev.find(p => p.id === providerId);
                  if (exists) {
                    return prev.map(p => p.id === providerId ? { ...p, status: 'connected', healthy: true } : p);
                  }
                  return [...prev, newProvider];
                });

                setShowAddModal(false);
              }
            } catch (err) {
              console.error('Failed to check provider status:', err);
            } finally {
              setCheckingProvider(null);
            }
          }, 3000); // Wait 3 seconds for sign-in
        }
      } else {
        // In browser, just open the provider URL
        window.open(PROVIDER_META[providerId]?.siteUrl, '_blank');
        setCheckingProvider(null);
      }
    } catch (err) {
      console.error('Failed to add provider:', err);
      setCheckingProvider(null);
    }
  };

  const handleCheckAllProviders = async () => {
    if (!isElectron) return;

    for (const providerId of Object.keys(PROVIDER_META)) {
      try {
        const status = await checkProviderStatus(providerId);

        if (status.connected) {
          setProviders(prev => {
            const exists = prev.find(p => p.id === providerId);
            if (exists) {
              return prev.map(p => p.id === providerId ? { ...p, status: 'connected', healthy: true } : p);
            }
            return [...prev, {
              id: providerId,
              name: PROVIDER_META[providerId]?.name || providerId,
              type: 'browser' as const,
              status: 'connected' as const,
              healthy: true,
            }];
          });
        }
      } catch (err) {
        console.error(`Failed to check ${providerId}:`, err);
      }
    }
  };

  // Auto-check providers on mount
  useEffect(() => {
    if (isElectron) {
      handleCheckAllProviders();
    }
  }, [isElectron]);

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
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('providers.add')}
          </button>
        </div>
      </div>

      {error && (
        <div className={`mb-4 p-4 rounded-lg text-sm ${
          theme === 'dark' ? 'bg-red-900/30 border border-red-800 text-red-400' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {error}
        </div>
      )}

      {/* Chrome Status */}
      {isElectron && (
        <div className={`mb-6 p-4 rounded-lg ${
          theme === 'dark' ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-center gap-3">
            <Chrome className="w-5 h-5 text-blue-500" />
            <div>
              <p className={`font-medium ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'}`}>
                Chrome Integration
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`}>
                Sign in to AI providers in Chrome, then they will appear here automatically.
              </p>
            </div>
            <button
              onClick={handleCheckAllProviders}
              className="ml-auto px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Check All
            </button>
          </div>
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
          <p className={`mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            No providers configured yet
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Add Provider
          </button>
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
                        <a
                          href={PROVIDER_META[provider.id].siteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-xs flex items-center gap-1 ${
                            theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                          }`}
                        >
                          {PROVIDER_META[provider.id].siteUrl}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {provider.status === 'checking' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-yellow-50 text-yellow-700">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking...
                    </span>
                  ) : (
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
                  )}

                  {provider.status === 'connected' && (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${
                      provider.healthy
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                    }`}>
                      {provider.healthy ? t('providers.healthy') : t('providers.unhealthy')}
                    </span>
                  )}

                  {provider.latency && (
                    <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      {provider.latency}ms
                    </span>
                  )}
                </div>
              </div>

              {provider.error && (
                <div className={`mt-3 p-3 rounded-lg text-sm ${
                  theme === 'dark' ? 'bg-red-900/30 border border-red-800 text-red-400' : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {provider.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Provider Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${cardClass} p-6 max-w-md w-full mx-4`}>
            <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Add AI Provider
            </h2>
            <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {isElectron
                ? 'Click a provider to open sign-in page in Chrome. After signing in, the provider will be detected automatically.'
                : 'Sign in to your AI provider in Chrome, then the provider will appear here automatically.'
              }
            </p>
            <div className="space-y-2">
              {Object.entries(PROVIDER_META).map(([id, meta]) => (
                <button
                  key={id}
                  onClick={() => handleAddProvider(id)}
                  disabled={checkingProvider === id}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    checkingProvider === id
                      ? 'bg-yellow-50 border border-yellow-200'
                      : theme === 'dark'
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                  }`}
                >
                  {checkingProvider === id ? (
                    <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />
                  ) : (
                    <Globe className="w-5 h-5 text-blue-500" />
                  )}
                  <div className="text-left">
                    <p className="font-medium">{meta.name}</p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {meta.siteUrl}
                    </p>
                  </div>
                  {checkingProvider === id ? (
                    <span className="ml-auto text-xs text-yellow-600">Checking...</span>
                  ) : (
                    <ExternalLink className="w-4 h-4 ml-auto text-gray-400" />
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAddModal(false)}
              className={`w-full mt-4 py-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
              }`}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
