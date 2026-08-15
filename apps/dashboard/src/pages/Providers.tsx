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
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useElectron } from '../hooks/useElectron';

interface ProviderInfo {
  id: string;
  name: string;
  siteUrl: string;
  status: 'connected' | 'available' | 'checking';
  icon: typeof Globe;
}

const PROVIDERS: ProviderInfo[] = [
  { id: 'gemini', name: 'Google Gemini', siteUrl: 'https://gemini.google.com', status: 'available', icon: Globe },
  { id: 'chatgpt', name: 'ChatGPT', siteUrl: 'https://chatgpt.com', status: 'available', icon: Zap },
  { id: 'claude', name: 'Claude', siteUrl: 'https://claude.ai', status: 'available', icon: Globe },
  { id: 'deepseek', name: 'DeepSeek', siteUrl: 'https://chat.deepseek.com', status: 'available', icon: Globe },
];

export default function Providers() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { isElectron, openProviderSignin, checkChrome } = useElectron();
  const [providers, setProviders] = useState<ProviderInfo[]>(PROVIDERS);
  const [chromeStatus, setChromeStatus] = useState<{ installed: boolean; userDataExists: boolean } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);

  useEffect(() => {
    if (isElectron) {
      checkChrome().then(status => {
        setChromeStatus(status);
      });
    }

    // Load saved providers from localStorage
    const saved = localStorage.getItem('bab-connected-providers');
    if (saved) {
      try {
        const connectedIds = JSON.parse(saved) as string[];
        setProviders(prev => prev.map(p => ({
          ...p,
          status: connectedIds.includes(p.id) ? 'connected' : 'available',
        })));
      } catch {}
    }
  }, [isElectron]);

  const cardClass = `rounded-xl border ${
    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  }`;

  const connectedCount = providers.filter(p => p.status === 'connected').length;

  const handleConnect = async (providerId: string) => {
    setConnectingProvider(providerId);

    const provider = providers.find(p => p.id === providerId);
    if (!provider) return;

    if (isElectron) {
      // Open in default browser
      const result = await openProviderSignin(provider.siteUrl);
      if (!result.success) {
        console.error('Failed to open URL:', result.error);
      }
    } else {
      window.open(provider.siteUrl, '_blank');
    }
  };

  const handleMarkConnected = (providerId: string) => {
    setProviders(prev => prev.map(p =>
      p.id === providerId ? { ...p, status: 'connected' } : p
    ));

    // Save to localStorage
    const connected = providers
      .filter(p => p.status === 'connected' || p.id === providerId)
      .map(p => p.id);
    localStorage.setItem('bab-connected-providers', JSON.stringify(connected));

    setConnectingProvider(null);
  };

  const handleDisconnect = (providerId: string) => {
    setProviders(prev => prev.map(p =>
      p.id === providerId ? { ...p, status: 'available' } : p
    ));

    const connected = providers
      .filter(p => p.status === 'connected' && p.id !== providerId)
      .map(p => p.id);
    localStorage.setItem('bab-connected-providers', JSON.stringify(connected));
  };

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
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('providers.add')}
          </button>
        </div>
      </div>

      {/* Chrome Status */}
      {isElectron && chromeStatus && (
        <div className={`mb-6 p-4 rounded-lg ${
          chromeStatus.installed
            ? theme === 'dark' ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'
            : theme === 'dark' ? 'bg-yellow-900/20 border border-yellow-800' : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <div className="flex items-center gap-3">
            <Chrome className={`w-5 h-5 ${chromeStatus.installed ? 'text-green-500' : 'text-yellow-500'}`} />
            <div>
              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {chromeStatus.installed ? 'Chrome Detected' : 'Chrome Not Found'}
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {chromeStatus.installed
                  ? 'Chrome is installed. Sign in to AI providers to connect them.'
                  : 'Please install Google Chrome to use browser-based AI providers.'
                }
              </p>
            </div>
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
        <div className={`${cardClass} p-4`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              theme === 'dark' ? 'bg-purple-900' : 'bg-purple-50'
            }`}>
              <Chrome className={`w-5 h-5 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {chromeStatus?.installed ? 'Yes' : 'No'}
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Chrome
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Provider List */}
      <div className="space-y-4">
        {providers.map((provider) => {
          const Icon = provider.icon;
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
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                      }`}>
                        Browser
                      </span>
                      <a
                        href={provider.siteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-xs flex items-center gap-1 ${
                          theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                        }`}
                      >
                        {provider.siteUrl}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {provider.status === 'connected' ? (
                    <>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700">
                        <CheckCircle className="w-4 h-4" />
                        Connected
                      </span>
                      <button
                        onClick={() => handleDisconnect(provider.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          theme === 'dark'
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Disconnect
                      </button>
                    </>
                  ) : connectingProvider === provider.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-yellow-600">Sign in, then click:</span>
                      <button
                        onClick={() => handleMarkConnected(provider.id)}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm transition-colors"
                      >
                        I'm Signed In
                      </button>
                      <button
                        onClick={() => setConnectingProvider(null)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          theme === 'dark'
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleConnect(provider.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Connect
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Provider Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${cardClass} p-6 max-w-md w-full mx-4`}>
            <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Add AI Provider
            </h2>
            <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Select a provider to connect. You'll need to sign in to the provider's website.
            </p>
            <div className="space-y-2">
              {providers.filter(p => p.status !== 'connected').map((provider) => {
                const Icon = provider.icon;
                return (
                  <button
                    key={provider.id}
                    onClick={() => {
                      handleConnect(provider.id);
                      setShowAddModal(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      theme === 'dark'
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                    }`}
                  >
                    <Icon className="w-5 h-5 text-blue-500" />
                    <div className="text-left">
                      <p className="font-medium">{provider.name}</p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {provider.siteUrl}
                      </p>
                    </div>
                    <ExternalLink className="w-4 h-4 ml-auto text-gray-400" />
                  </button>
                );
              })}
              {providers.every(p => p.status === 'connected') && (
                <p className={`text-center py-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  All providers are connected!
                </p>
              )}
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
