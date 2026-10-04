import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { api, type AuditEntry } from '../lib/api';

type Filter = 'all' | 'allowed' | 'denied' | 'error';

export default function Logs() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAudit();
      setLogs(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 10000);
    return () => clearInterval(interval);
  }, [loadLogs]);

  const cardClass = `rounded-xl border ${
    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  }`;

  const filteredLogs = filter === 'all' ? logs : logs.filter((l) => l.result === filter);

  const formatTime = (timestamp: number) => new Date(timestamp).toLocaleTimeString();

  const getResultIcon = (result: AuditEntry['result']) => {
    switch (result) {
      case 'allowed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'denied': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-orange-500" />;
      default: return null;
    }
  };

  const getResultColor = (result: AuditEntry['result']) => {
    switch (result) {
      case 'allowed': return 'bg-green-50 text-green-700';
      case 'denied': return 'bg-red-50 text-red-700';
      case 'error': return 'bg-orange-50 text-orange-700';
      default: return 'bg-gray-50 text-gray-500';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {t('logs.title')}
          </h1>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            {t('logs.subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadLogs}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''} ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`} />
          </button>
          <button
            onClick={() => {
              const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `bab-audit-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg ${
              theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Download className="w-4 h-4" />
            {t('logs.export')}
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

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['all', 'allowed', 'denied', 'error'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-primary-500 text-white'
                : theme === 'dark'
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="ml-2 text-xs opacity-70">
              {f === 'all' ? logs.length : logs.filter((l) => l.result === f).length}
            </span>
          </button>
        ))}
      </div>

      {/* Logs List */}
      {loading && logs.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className={`${cardClass} p-12 text-center`}>
          <FileText className={`w-12 h-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            {t('logs.noLogs')}
          </p>
          <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
            Logs appear when the AI executes tools.
          </p>
        </div>
      ) : (
        <div className={`${cardClass}`}>
          <div className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-100'}`}>
            {filteredLogs.map((log) => (
              <div key={log.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getResultIcon(log.result)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${getResultColor(log.result)}`}>
                          {log.result}
                        </span>
                        <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {log.toolName}
                        </span>
                        <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                          Session: {log.sessionId.slice(0, 8)}...
                        </span>
                      </div>
                      {log.reason && (
                        <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                          {log.reason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    {formatTime(log.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
