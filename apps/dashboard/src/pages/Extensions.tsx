import { useState, useEffect } from 'react';
import {
  Puzzle,
  Download,
  Package,
  Globe,
  Zap,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { api } from '../lib/api';

interface Extension {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  type: 'provider' | 'tool' | 'extension';
  enabled: boolean;
}

const BUILT_IN_EXTENSIONS: Extension[] = [
  {
    id: 'provider-gemini',
    name: 'Google Gemini Provider',
    description: 'Connect to Google Gemini via browser automation',
    version: '1.0.0',
    author: 'BAB Core',
    type: 'provider',
    enabled: true,
  },
  {
    id: 'provider-chatgpt',
    name: 'ChatGPT Provider',
    description: 'Connect to ChatGPT via browser automation',
    version: '1.0.0',
    author: 'BAB Core',
    type: 'provider',
    enabled: true,
  },
  {
    id: 'provider-claude',
    name: 'Claude Provider',
    description: 'Connect to Claude via browser automation',
    version: '1.0.0',
    author: 'BAB Core',
    type: 'provider',
    enabled: true,
  },
  {
    id: 'provider-deepseek',
    name: 'DeepSeek Provider',
    description: 'Connect to DeepSeek via browser automation',
    version: '1.0.0',
    author: 'BAB Core',
    type: 'provider',
    enabled: true,
  },
  {
    id: 'tool-fs',
    name: 'Filesystem Tools',
    description: 'Read, write, and manage files',
    version: '1.0.0',
    author: 'BAB Core',
    type: 'tool',
    enabled: true,
  },
  {
    id: 'tool-git',
    name: 'Git Tools',
    description: 'Git operations (status, diff, commit)',
    version: '1.0.0',
    author: 'BAB Core',
    type: 'tool',
    enabled: true,
  },
  {
    id: 'tool-shell',
    name: 'Shell Tools',
    description: 'Execute shell commands',
    version: '1.0.0',
    author: 'BAB Core',
    type: 'tool',
    enabled: true,
  },
];

export default function Extensions() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [extensions] = useState<Extension[]>(BUILT_IN_EXTENSIONS);
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);

  useEffect(() => {
    async function loadStatus() {
      try {
        const health = await api.getHealth();
        const connected = Object.entries(health.providers)
          .filter(([_, data]) => data.healthy)
          .map(([id]) => id);
        setConnectedProviders(connected);
      } catch {
        setConnectedProviders([]);
      }
    }
    loadStatus();
  }, []);

  const cardClass = `rounded-xl border ${
    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  }`;

  const getProviderIcon = (id: string) => {
    if (id.includes('gemini')) return <Globe className="w-6 h-6" />;
    if (id.includes('chatgpt')) return <Zap className="w-6 h-6" />;
    if (id.includes('claude')) return <MessageSquare className="w-6 h-6" />;
    return <Puzzle className="w-6 h-6" />;
  };

  const isProviderConnected = (id: string) => {
    const providerId = id.replace('provider-', '');
    return connectedProviders.includes(providerId);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {t('extensions.title')}
        </h1>
        <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
          {t('extensions.subtitle')}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`${cardClass} p-4`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              theme === 'dark' ? 'bg-blue-900' : 'bg-blue-50'
            }`}>
              <Package className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {extensions.filter(e => e.enabled).length}
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {t('extensions.enabled')}
              </p>
            </div>
          </div>
        </div>
        <div className={`${cardClass} p-4`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              theme === 'dark' ? 'bg-green-900' : 'bg-green-50'
            }`}>
              <Puzzle className={`w-5 h-5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {extensions.length}
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
              <Globe className={`w-5 h-5 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {connectedProviders.length}
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Connected
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Extensions List */}
      <div className="space-y-4">
        {extensions.map((ext) => (
          <div key={ext.id} className={`${cardClass} p-6`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  ext.type === 'provider'
                    ? theme === 'dark' ? 'bg-blue-900' : 'bg-blue-50'
                    : theme === 'dark' ? 'bg-green-900' : 'bg-green-50'
                }`}>
                  {ext.type === 'provider' ? getProviderIcon(ext.id) : <Puzzle className={`w-6 h-6 ${
                    theme === 'dark' ? 'text-green-400' : 'text-green-600'
                  }`} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {ext.name}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                    }`}>
                      v{ext.version}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      ext.type === 'provider'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-green-50 text-green-700'
                    }`}>
                      {ext.type}
                    </span>
                  </div>
                  <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {ext.description}
                  </p>
                  <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                    by {ext.author}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {ext.type === 'provider' && isProviderConnected(ext.id) && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700">
                    Connected
                  </span>
                )}
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                  ext.enabled
                    ? 'bg-green-50 text-green-700'
                    : 'bg-gray-50 text-gray-500'
                }`}>
                  {ext.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Marketplace Notice */}
      <div className={`mt-8 ${cardClass} p-6 text-center`}>
        <Puzzle className={`w-12 h-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
        <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Plugin Marketplace Coming Soon
        </h3>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Community plugins will be available in a future release.
          <br />
          For now, all providers and tools are built-in.
        </p>
      </div>
    </div>
  );
}
