import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useBabEvents } from '../hooks/useBabEvents';
import { api, type AuditEntry } from '../lib/api';
import { SlidingTabs } from '../components/motion';

type Filter = 'all' | 'allowed' | 'denied' | 'error';

export default function Logs() {
  const { t, language } = useLanguage();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Real audit trail from the runtime's audit logger.
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

  useBabEvents((type) => {
    if (type.startsWith('tool.') || type.startsWith('permission.') || type.startsWith('session.')) {
      loadLogs();
    }
  });

  const cardClass = 'rounded-xl glass';

  const filteredLogs = filter === 'all' ? logs : logs.filter((l) => l.result === filter);

  const formatTime = (timestamp: number) => new Date(timestamp).toLocaleTimeString();

  const getResultIcon = (result: AuditEntry['result']) => {
    switch (result) {
      case 'allowed':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'denied':
        return <XCircle className="w-4 h-4 text-danger" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-warning" />;
      default:
        return null;
    }
  };

  const getResultColor = (result: AuditEntry['result']) => {
    switch (result) {
      case 'allowed':
        return 'bg-success/15 text-success';
      case 'denied':
        return 'bg-danger/15 text-danger';
      case 'error':
        return 'bg-warning/15 text-warning';
      default:
        return 'bg-surface-inset text-text-muted';
    }
  };

  const doExport = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bab-audit-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display leading-none text-text">{t('logs.title')}</h1>
          <p className="text-text-muted mt-2">{t('logs.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadLogs}
            className="p-2 rounded-lg transition-colors hover:bg-surface-inset"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-5 h-5 text-text-muted ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={doExport}
            disabled={logs.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface-inset text-text-muted hover:text-accent hover:bg-accent-soft transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            {t('logs.export')}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg text-sm bg-danger/10 border border-danger/30 text-danger">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="mb-6">
        <SlidingTabs
          ariaLabel="Log filter"
          value={filter}
          onChange={(v) => setFilter(v as Filter)}
          tabs={(['all', 'allowed', 'denied', 'error'] as const).map((f) => ({
            id: f,
            label: (
              <>
                {t(`logs.${f}`)}
                <span className="ml-2 text-xs opacity-70">
                  {f === 'all' ? logs.length : logs.filter((l) => l.result === f).length}
                </span>
              </>
            ),
          }))}
        />
      </div>

      {/* Logs List */}
      {loading && logs.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-accent" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className={`${cardClass} p-12 text-center`}>
          <FileText className="w-12 h-12 mx-auto mb-4 text-text-subtle" />
          <p className="text-text-muted">{t('logs.noLogs')}</p>
          <p className="text-sm mt-2 text-text-subtle">
            {language === 'ru'
              ? 'Логи появятся, когда IDE обратится к мосту или выполнится инструмент.'
              : 'Logs will appear when you use the chat or run tools.'}
          </p>
        </div>
      ) : (
        <div className={cardClass}>
          <div className="divide-y divide-border">
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
                        {log.toolName && (
                          <span className="font-medium text-text font-mono text-sm">
                            {log.toolName}
                          </span>
                        )}
                        {log.sessionId && (
                          <span className="text-xs text-text-subtle font-mono">
                            {log.sessionId.slice(0, 8)}
                          </span>
                        )}
                      </div>
                      {log.reason && (
                        <p className="text-xs mt-1 text-text-subtle">Reason: {log.reason}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-text-subtle font-mono">
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
