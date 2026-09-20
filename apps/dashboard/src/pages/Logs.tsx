import { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { api, type Session } from '../lib/api';
import { SlidingTabs } from '../components/motion';

interface LogEntry {
  id: string;
  timestamp: number;
  type: 'tool' | 'permission' | 'session';
  toolName?: string;
  sessionId?: string;
  result: 'allowed' | 'denied' | 'error';
  reason?: string;
}

export default function Logs() {
  const { t, language } = useLanguage();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'tool' | 'permission' | 'session'>('all');
  const [confirmingClear, setConfirmingClear] = useState(false);

  async function loadLogs() {
    setLoading(true);
    try {
      // Synthesise entries from sessions until we have a real audit log endpoint.
      const sessionsData = await api.getSessions();
      const sessions = sessionsData.data || [];

      const logEntries: LogEntry[] = sessions.flatMap((session: Session) => {
        const entries: LogEntry[] = [];

        entries.push({
          id: `session-${session.id}`,
          timestamp: session.createdAt,
          type: 'session',
          sessionId: session.id,
          result: 'allowed',
        });

        session.messages?.forEach((_, idx) => {
          entries.push({
            id: `msg-${session.id}-${idx}`,
            timestamp: session.createdAt + (idx + 1) * 1000,
            type: 'tool',
            toolName: 'chat.message',
            sessionId: session.id,
            result: 'allowed',
          });
        });

        return entries;
      });

      setLogs(logEntries.sort((a, b) => b.timestamp - a.timestamp));
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  const cardClass = 'rounded-xl glass';

  const filteredLogs = filter === 'all' ? logs : logs.filter((l) => l.type === filter);

  const formatTime = (timestamp: number) => new Date(timestamp).toLocaleTimeString();

  const getResultIcon = (result: string) => {
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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'tool':
        return 'bg-accent-soft text-accent';
      case 'permission':
        return 'bg-warning/15 text-warning';
      case 'session':
        return 'bg-success/15 text-success';
      default:
        return '';
    }
  };

  const doExport = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bab-logs-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

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
          {confirmingClear ? (
            <div className="flex items-center gap-2 bg-danger/10 border border-danger/30 rounded-lg px-3 py-1.5 text-sm">
              <AlertTriangle className="w-4 h-4 text-danger" />
              <span className="text-danger">
                {language === 'ru' ? 'Очистить всё?' : 'Clear all?'}
              </span>
              <button
                onClick={() => {
                  setLogs([]);
                  setConfirmingClear(false);
                }}
                className="text-xs px-2 py-1 rounded bg-danger text-white hover:opacity-90"
              >
                {t('logs.clear')}
              </button>
              <button
                onClick={() => setConfirmingClear(false)}
                className="text-xs px-2 py-1 rounded text-text-muted hover:bg-surface-inset"
              >
                {t('common.cancel')}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingClear(true)}
              disabled={logs.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-danger/15 text-danger hover:bg-danger/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              {t('logs.clear')}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <SlidingTabs
          ariaLabel="Log filter"
          value={filter}
          onChange={(v) => setFilter(v as typeof filter)}
          tabs={(['all', 'tool', 'permission', 'session'] as const).map((f) => ({
            id: f,
            label: t(`logs.${f}`),
          }))}
        />
      </div>

      {/* Logs List */}
      {filteredLogs.length === 0 ? (
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
                        <span className={`text-xs px-2 py-0.5 rounded ${getTypeColor(log.type)}`}>
                          {t(`logs.${log.type}`)}
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
