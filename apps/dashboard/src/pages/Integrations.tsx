import { useState, useEffect } from 'react';
import {
  Globe,
  Zap,
  MessageSquare,
  Search,
  ExternalLink,
  Check,
  Plus,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { api } from '../lib/api';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  status: 'connected' | 'disconnected' | 'error';
  category: 'ai';
  features: string[];
  siteUrl: string;
  latency?: number;
}

export default function Integrations() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [selectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadIntegrations() {
    setLoading(true);
    try {
      const health = await api.getHealth();
      
      const baseIntegrations: Omit<Integration, 'status' | 'latency'>[] = [
        {
          id: 'gemini',
          name: 'Google Gemini',
          description: 'Access Gemini AI for text generation, analysis, and code assistance',
          icon: Globe,
          color: 'bg-blue-500',
          category: 'ai',
          features: ['Text generation', 'Code analysis', 'Multi-modal', '1M context'],
          siteUrl: 'https://gemini.google.com',
        },
        {
          id: 'chatgpt',
          name: 'ChatGPT',
          description: 'OpenAI ChatGPT for conversational AI and code generation',
          icon: Zap,
          color: 'bg-green-500',
          category: 'ai',
          features: ['GPT-4o', 'Code interpreter', 'DALL-E', 'Web browsing'],
          siteUrl: 'https://chatgpt.com',
        },
        {
          id: 'claude',
          name: 'Claude',
          description: 'Anthropic Claude for thoughtful analysis and long-form content',
          icon: MessageSquare,
          color: 'bg-orange-500',
          category: 'ai',
          features: ['200K context', 'Code analysis', 'Artifacts', 'Projects'],
          siteUrl: 'https://claude.ai',
        },
        {
          id: 'deepseek',
          name: 'DeepSeek',
          description: 'DeepSeek AI for coding and technical discussions',
          icon: Zap,
          color: 'bg-purple-500',
          category: 'ai',
          features: ['Code generation', 'Technical analysis', 'Math', 'Reasoning'],
          siteUrl: 'https://chat.deepseek.com',
        },
      ];

      const integrationsWithStatus: Integration[] = baseIntegrations.map(base => {
        const providerData = health.providers[base.id];
        return {
          ...base,
          status: providerData?.healthy ? 'connected' : (providerData?.error ? 'error' : 'disconnected'),
          latency: providerData?.latency,
        };
      });

      setIntegrations(integrationsWithStatus);
    } catch {
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIntegrations();
    const interval = setInterval(loadIntegrations, 15000);
    return () => clearInterval(interval);
  }, []);

  const filteredIntegrations = integrations.filter((integration) => {
    const matchesCategory = selectedCategory === 'all' || integration.category === selectedCategory;
    const matchesSearch =
      integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const connectedCount = integrations.filter((i) => i.status === 'connected').length;

  const cardClass = `rounded-xl border ${
    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  }`;

  if (loading && integrations.length === 0) {
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
            {t('integrations.title')}
          </h1>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            {t('integrations.subtitle')}
          </p>
        </div>
        <button
          onClick={loadIntegrations}
          className={`p-2 rounded-lg transition-colors ${
            theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
          }`}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''} ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`${cardClass} p-4`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              theme === 'dark' ? 'bg-green-900' : 'bg-green-50'
            }`}>
              <Check className={`w-5 h-5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {connectedCount}
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {t('integrations.connected')}
              </p>
            </div>
          </div>
        </div>
        <div className={`${cardClass} p-4`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              theme === 'dark' ? 'bg-blue-900' : 'bg-blue-50'
            }`}>
              <Globe className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {integrations.length}
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {t('integrations.available')}
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
                100%
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {t('integrations.secure')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
          theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
        }`} />
        <input
          type="text"
          placeholder={t('integrations.search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
            theme === 'dark'
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
              : 'bg-white border-gray-200 text-gray-900'
          }`}
        />
      </div>

      {/* Integration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredIntegrations.map((integration) => (
          <div
            key={integration.id}
            className={`${cardClass} hover:shadow-md transition-shadow`}
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 ${integration.color} rounded-xl flex items-center justify-center flex-shrink-0`}
                >
                  <integration.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {integration.name}
                    </h3>
                    {integration.status === 'connected' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                        {t('integrations.connected')}
                      </span>
                    )}
                    {integration.status === 'error' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                        Error
                      </span>
                    )}
                  </div>
                  <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {integration.description}
                  </p>
                </div>
              </div>

              {/* Features */}
              <div className="mt-4 flex flex-wrap gap-2">
                {integration.features.slice(0, 4).map((feature) => (
                  <span
                    key={feature}
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {feature}
                  </span>
                ))}
              </div>

              {/* Status Info */}
              {integration.status === 'connected' && (
                <div className={`mt-4 flex items-center gap-4 text-xs ${
                  theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                }`}>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Connected
                  </span>
                  {integration.latency && (
                    <span className="flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5" />
                      {integration.latency}ms
                    </span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="mt-4 flex items-center gap-2">
                <a
                  href={integration.siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    integration.status === 'connected'
                      ? 'text-green-600 bg-green-50 hover:bg-green-100'
                      : theme === 'dark'
                        ? 'text-gray-300 bg-gray-700 hover:bg-gray-600'
                        : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {integration.status === 'connected' ? (
                    <>
                      <Check className="w-4 h-4" />
                      Connected
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      {t('integrations.connect')}
                    </>
                  )}
                </a>
                <a
                  href={integration.siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-2.5 rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
