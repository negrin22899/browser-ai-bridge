import { useState, useEffect, useCallback } from 'react';
import {
  Puzzle,
  Package,
  Globe,
  Zap,
  MessageSquare,
  Terminal,
  FileText,
  GitBranch,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { api, type Extension } from '../lib/api';
import { NumberPopIn } from '../components/motion';

export default function Extensions() {
  const { t } = useLanguage();
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [loading, setLoading] = useState(true);

  const loadExtensions = useCallback(async () => {
    try {
      const data = await api.getExtensions();
      setExtensions(data.data || []);
    } catch {
      setExtensions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExtensions();
    const interval = setInterval(loadExtensions, 10000);
    return () => clearInterval(interval);
  }, [loadExtensions]);

  const cardClass = 'rounded-xl glass';

  const getTypeIcon = (ext: Extension) => {
    if (ext.type === 'provider') {
      if (ext.providerId?.includes('chatgpt')) return Zap;
      if (ext.providerId?.includes('claude')) return MessageSquare;
      return Globe;
    }
    if (ext.name.startsWith('git.')) return GitBranch;
    if (ext.name.startsWith('fs.')) return FileText;
    if (ext.name.startsWith('shell.')) return Terminal;
    return Puzzle;
  };

  const connectedCount = extensions.filter((e) => e.status === 'connected').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display leading-none text-text">{t('extensions.title')}</h1>
          <p className="text-text-muted mt-2">{t('extensions.subtitle')}</p>
        </div>
        <button
          onClick={loadExtensions}
          className="p-2 rounded-lg transition-colors hover:bg-surface-inset"
          title={t('extensions.title')}
        >
          <RefreshCw className={`w-5 h-5 text-text-muted ${loading ? 'animate-spin' : ''}`} />
        </button>
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
                <NumberPopIn value={connectedCount} />
              </p>
              <p className="text-sm text-text-muted mt-1">Connected</p>
            </div>
          </div>
        </div>
      </div>

      {/* Extensions List */}
      {loading && extensions.length === 0 ? (
        <div className="flex items-center justify-center h-40">
          <RefreshCw className="w-8 h-8 animate-spin text-accent" />
        </div>
      ) : extensions.length === 0 ? (
        <div className={`${cardClass} p-12 text-center`}>
          <Puzzle className="w-12 h-12 mx-auto mb-4 text-text-subtle" />
          <p className="text-text-muted">
            No extensions registered. Start the server to load providers and tools.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {extensions.map((ext) => {
            const Icon = getTypeIcon(ext);
            const connected = ext.status === 'connected';
            return (
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
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-text">{ext.name}</h3>
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
                      {ext.description && (
                        <p className="text-sm mt-1 text-text-muted">{ext.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {ext.type === 'provider' && (
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                          connected ? 'bg-success/15 text-success' : 'bg-surface-inset text-text-subtle'
                        }`}
                      >
                        {connected ? <CheckCircle className="w-4 h-4" /> : <Puzzle className="w-4 h-4" />}
                        {connected ? 'Connected' : 'Disconnected'}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
