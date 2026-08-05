import { useState } from 'react';
import {
  Globe,
  Github,
  MessageSquare,
  Zap,
  Search,
  ExternalLink,
  Check,
  Plus,
  Settings,
  RefreshCw,
  Trash2,
  Clock,
  Star,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  status: 'connected' | 'disconnected' | 'error';
  category: 'ai' | 'devtools' | 'productivity';
  features: string[];
  connectedAt?: string;
  lastUsed?: string;
}

const getIntegrations = (t: any): Integration[] => [
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Access Gemini AI for text generation, analysis, and code assistance',
    icon: Globe,
    color: 'bg-blue-500',
    status: 'connected',
    category: 'ai',
    features: ['Text generation', 'Code analysis', 'Multi-modal', '1M context'],
    connectedAt: '2024-01-15',
    lastUsed: '2 minutes ago',
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    description: 'OpenAI ChatGPT for conversational AI and code generation',
    icon: Zap,
    color: 'bg-green-500',
    status: 'connected',
    category: 'ai',
    features: ['GPT-4o', 'Code interpreter', 'DALL-E', 'Web browsing'],
    connectedAt: '2024-01-10',
    lastUsed: '15 minutes ago',
  },
  {
    id: 'claude',
    name: 'Claude',
    description: 'Anthropic Claude for thoughtful analysis and long-form content',
    icon: MessageSquare,
    color: 'bg-orange-500',
    status: 'disconnected',
    category: 'ai',
    features: ['200K context', 'Code analysis', 'Artifacts', 'Projects'],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'DeepSeek AI for coding and technical discussions',
    icon: Zap,
    color: 'bg-purple-500',
    status: 'disconnected',
    category: 'ai',
    features: ['Code generation', 'Technical analysis', 'Math', 'Reasoning'],
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Manage repositories, pull requests, issues, and code reviews',
    icon: Github,
    color: 'bg-gray-800',
    status: 'connected',
    category: 'devtools',
    features: ['Repositories', 'Pull requests', 'Issues', 'Actions', 'Code review'],
    connectedAt: '2024-01-05',
    lastUsed: '1 hour ago',
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    description: 'GitLab integration for CI/CD, repositories, and project management',
    icon: Github,
    color: 'bg-orange-600',
    status: 'disconnected',
    category: 'devtools',
    features: ['Repositories', 'CI/CD', 'Issues', 'Merge requests'],
  },
];

export default function Integrations() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [integrations, setIntegrations] = useState(getIntegrations(t));

  const categories = [
    { id: 'all', name: t('integrations.all') },
    { id: 'ai', name: t('integrations.ai') },
    { id: 'devtools', name: t('integrations.devtools') },
  ];

  const filteredIntegrations = integrations.filter((integration) => {
    const matchesCategory = selectedCategory === 'all' || integration.category === selectedCategory;
    const matchesSearch =
      integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleConnect = (id: string) => {
    setIntegrations((prev) =>
      prev.map((integration) =>
        integration.id === id
          ? {
              ...integration,
              status: 'connected' as const,
              connectedAt: new Date().toISOString().split('T')[0],
              lastUsed: 'Just now',
            }
          : integration
      )
    );
  };

  const handleDisconnect = (id: string) => {
    setIntegrations((prev) =>
      prev.map((integration) =>
        integration.id === id
          ? {
              ...integration,
              status: 'disconnected' as const,
              connectedAt: undefined,
              lastUsed: undefined,
            }
          : integration
      )
    );
  };

  const connectedCount = integrations.filter((i) => i.status === 'connected').length;

  const cardClass = `rounded-xl border ${
    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  }`;

  return (
    <div>
      <div className="mb-8">
        <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {t('integrations.title')}
        </h1>
        <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
          {t('integrations.subtitle')}
        </p>
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
              <Star className={`w-5 h-5 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
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
        <div className="flex gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-primary-500 text-white'
                  : theme === 'dark'
                    ? 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
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
              {integration.status === 'connected' && integration.connectedAt && (
                <div className={`mt-4 flex items-center gap-4 text-xs ${
                  theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                }`}>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {t('integrations.connected')} {integration.connectedAt}
                  </span>
                  {integration.lastUsed && (
                    <span className="flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5" />
                      {integration.lastUsed}
                    </span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="mt-4 flex items-center gap-2">
                {integration.status === 'connected' ? (
                  <>
                    <button className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      theme === 'dark'
                        ? 'text-gray-300 bg-gray-700 hover:bg-gray-600'
                        : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                    }`}>
                      <Settings className="w-4 h-4" />
                      {t('integrations.configure')}
                    </button>
                    <button
                      onClick={() => handleDisconnect(integration.id)}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      {t('integrations.disconnect')}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleConnect(integration.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    {t('integrations.connect')}
                  </button>
                )}
                <button className={`p-2.5 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}>
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
