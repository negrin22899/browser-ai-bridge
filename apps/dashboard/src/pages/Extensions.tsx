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
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { api, type Extension } from '../lib/api';

export default function Extensions() {
  const { theme } = useTheme();
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

  const cardClass = `rounded-xl border ${
    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  }`;

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

  const providerCount = extensions.filter((e) => e.type === 'provider').length;
  const toolCount = extensions.filter((e) => e.type === 'tool').length;
  const connectedCount = extensions.filter((e) => e.status === 'connected').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {t('extensions.title')}
          </h1>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            {t('extensions.subtitle')}
          </p>
        </div>
        <button
          onClick={loadExtensions}
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
              theme === 'dark' ? 'bg-blue-900' : 'bg-blue-50'
            }`}>
              <Package className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {extensions.length}
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
                {providerCount}
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Providers
              </p>
            </div>
          </div>
        </div>
        <div className={`${cardClass} p-4`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              theme === 'dark' ? 'bg-purple-900' : 'bg-purple-50'
            }`}>
              <Terminal className={`w-5 h-5 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {toolCount}
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Tools ({connectedCount} providers connected)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Extensions List */}
      {loading && extensions.length === 0 ? (
        <div className="flex items-center justify-center h-40">
          <RefreshCw className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : extensions.length === 0 ? (
        <div className={`${cardClass} p-12 text-center`}>
          <Puzzle className={`w-12 h-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            No extensions registered. Start the server to load providers and tools.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {extensions.map((ext) => {
            const Icon = getTypeIcon(ext);
            const connected = ext.status === 'connected';
            return (
              <div key={ext.id} className={`${cardClass} p-4 hover:shadow-md transition-shadow`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      ext.type === 'provider'
                        ? theme === 'dark' ? 'bg-blue-900' : 'bg-blue-50'
                        : theme === 'dark' ? 'bg-green-900' : 'bg-green-50'
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        ext.type === 'provider'
                          ? theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                          : theme === 'dark' ? 'text-green-400' : 'text-green-600'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {ext.name}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          ext.type === 'provider'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-green-50 text-green-700'
                        }`}>
                          {ext.type}
                        </span>
                      </div>
                      {ext.description && (
                        <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {ext.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {ext.type === 'provider' && (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                        connected ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'
                      }`}>
                        {connected ? <CheckCircle className="w-4 h-4" /> : <Puzzle className="w-4 h-4" />}
                        {connected ? 'Connected' : 'Disconnected'}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700">
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
