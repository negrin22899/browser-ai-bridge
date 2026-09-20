import { useState, useEffect } from 'react';
import {
  Puzzle,
  Package,
  Globe,
  Zap,
  MessageSquare,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { api } from '../lib/api';
import { NumberPopIn } from '../components/motion';

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

  const cardClass = 'rounded-xl glass';

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
        <h1 className={`text-2xl font-bold text-text`}>
          {t('extensions.title')}
        </h1>
        <p className="text-text-muted">
          {t('extensions.subtitle')}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`${cardClass} p-4`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-accent-soft text-accent">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-display leading-none text-text">
                <NumberPopIn value={extensions.filter((e) => e.enabled).length} />
              </p>
              <p className="text-sm text-text-muted mt-1">{t('extensions.enabled')}</p>
            </div>
          </div>
        </div>
        <div className={`${cardClass} p-4`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-success/15 text-success">
              <Puzzle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-display leading-none text-text">
                <NumberPopIn value={extensions.length} />
              </p>
              <p className="text-sm text-text-muted mt-1">Available</p>
            </div>
          </div>
        </div>
        <div className={`${cardClass} p-4`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-warning/15 text-warning">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-display leading-none text-text">
                <NumberPopIn value={connectedProviders.length} />
              </p>
              <p className="text-sm text-text-muted mt-1">Connected</p>
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
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    ext.type === 'provider'
                      ? 'bg-accent-soft text-accent'
                      : 'bg-success/15 text-success'
                  }`}
                >
                  {ext.type === 'provider' ? getProviderIcon(ext.id) : <Puzzle className="w-6 h-6" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-text">{ext.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded bg-surface-inset text-text-muted">
                      v{ext.version}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        ext.type === 'provider'
                          ? 'bg-accent-soft text-accent'
                          : 'bg-success/15 text-success'
                      }`}
                    >
                      {ext.type}
                    </span>
                  </div>
                  <p className="text-sm mt-1 text-text-muted">{ext.description}</p>
                  <p className="text-xs mt-2 text-text-subtle">by {ext.author}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {ext.type === 'provider' && isProviderConnected(ext.id) && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-success/15 text-success">
                    Connected
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                    ext.enabled ? 'bg-success/15 text-success' : 'bg-surface-inset text-text-subtle'
                  }`}
                >
                  {ext.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Marketplace Notice */}
      <div className={`mt-8 ${cardClass} p-6 text-center`}>
        <Puzzle className={`w-12 h-12 mx-auto mb-4 text-text-subtle`} />
        <h3 className={`text-lg font-semibold mb-2 text-text`}>
          Plugin Marketplace Coming Soon
        </h3>
        <p className={`text-sm text-text-muted`}>
          Community plugins will be available in a future release.
          <br />
          For now, all providers and tools are built-in.
        </p>
      </div>
    </div>
  );
}
