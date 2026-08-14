import { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { api, type Session } from '../lib/api';

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
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'tool' | 'permission' | 'session'>('all');

  async function loadLogs() {
    setLoading(true);
    try {
      // Load sessions to show recent activity
      const sessionsData = await api.getSessions();
      const sessions = sessionsData.data || [];
      
      // Generate log entries from sessions
      const logEntries: LogEntry[] = sessions.flatMap((session: Session) => {
        const entries: LogEntry[] = [];
        
        // Add session creation log
        entries.push({
          id: `session-${session.id}`,
          timestamp: session.createdAt,
          type: 'session',
          sessionId: session.id,
          result: 'allowed',
        });

        // Add message logs
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

  const cardClass = `rounded-xl border ${
    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  }`;

  const filteredLogs = filter === 'all' ? logs : logs.filter(l => l.type === filter);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'allowed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'denied': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-orange-500" />;
      default: return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'tool': return 'bg-blue-50 text-blue-700';
      case 'permission': return 'bg-yellow-50 text-yellow-700';
      case 'session': return 'bg-purple-50 text-purple-700';
      default: return '';
    }
  };

  if (loading) {
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
              a.download = `bab-logs-${new Date().toISOString().slice(0, 10)}.json`;
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
          <button
            onClick={() => {
              setLogs([]);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            {t('logs.clear')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['all', 'tool', 'permission', 'session'] as const).map((f) => (
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
            {t(`logs.${f}`)}
          </button>
        ))}
      </div>

      {/* Logs List */}
      {filteredLogs.length === 0 ? (
        <div className={`${cardClass} p-12 text-center`}>
          <FileText className={`w-12 h-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            {t('logs.noLogs')}
          </p>
          <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
            Logs will appear when you use the chat or run tools.
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
                        <span className={`text-xs px-2 py-0.5 rounded ${getTypeColor(log.type)}`}>
                          {t(`logs.${log.type}`)}
                        </span>
                        {log.toolName && (
                          <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {log.toolName}
                          </span>
                        )}
                        {log.sessionId && (
                          <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                            Session: {log.sessionId.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                      {log.reason && (
                        <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                          Reason: {log.reason}
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
