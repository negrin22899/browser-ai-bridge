import { useState } from 'react';
import {
  Server,
  Globe,
  Zap,
  CheckCircle,
  XCircle,
  Loader2,
  Plus,
  RefreshCw,
  Activity,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface Provider {
  id: string;
  name: string;
  type: 'browser' | 'api';
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  healthy: boolean;
  siteUrl?: string;
}

const mockProviders: Provider[] = [
  { id: 'gemini', name: 'Google Gemini', type: 'browser', status: 'disconnected', healthy: false, siteUrl: 'https://gemini.google.com' },
  { id: 'chatgpt', name: 'ChatGPT', type: 'browser', status: 'disconnected', healthy: false, siteUrl: 'https://chat.openai.com' },
  { id: 'claude', name: 'Claude', type: 'browser', status: 'disconnected', healthy: false, siteUrl: 'https://claude.ai' },
  { id: 'deepseek', name: 'DeepSeek', type: 'browser', status: 'disconnected', healthy: false, siteUrl: 'https://chat.deepseek.com' },
];

export default function Providers() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [providers, setProviders] = useState(mockProviders);

  const handleConnect = (id: string) => {
    setProviders(prev =>
      prev.map(p =>
        p.id === id ? { ...p, status: 'connecting' as const } : p
      )
    );

    // Simulate connection
    setTimeout(() => {
      setProviders(prev =>
        prev.map(p =>
          p.id === id ? { ...p, status: 'connected' as const, healthy: true } : p
        )
      );
    }, 2000);
  };

  const handleDisconnect = (id: string) => {
    setProviders(prev =>
      prev.map(p =>
        p.id === id ? { ...p, status: 'disconnected' as const, healthy: false } : p
      )
    );
  };

  const cardClass = `rounded-xl border ${
    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  }`;

  const connectedCount = providers.filter(p => p.status === 'connected').length;

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
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600">
          <Plus className="w-4 h-4" />
          {t('providers.add')}
        </button>
      </div>

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
                    {provider.siteUrl && (
                      <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                        {provider.siteUrl}
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
                    : provider.status === 'connecting'
                      ? 'bg-yellow-50 text-yellow-700'
                      : provider.status === 'error'
                        ? 'bg-red-50 text-red-700'
                        : theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                }`}>
                  {provider.status === 'connected' && <CheckCircle className="w-4 h-4" />}
                  {provider.status === 'connecting' && <Loader2 className="w-4 h-4 animate-spin" />}
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

                {/* Actions */}
                {provider.status === 'connected' ? (
                  <button
                    onClick={() => handleDisconnect(provider.id)}
                    className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                  >
                    {t('providers.disconnect')}
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect(provider.id)}
                    disabled={provider.status === 'connecting'}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 disabled:opacity-50"
                  >
                    {provider.status === 'connecting' ? t('providers.connecting') : t('providers.connect')}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
