import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Plus,
  Clock,
  Server,
  Trash2,
  ArrowRight,
  RefreshCw,
  FileJson,
  FileText,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useBabEvents } from '../hooks/useBabEvents';
import { api, type Session } from '../lib/api';

export default function Sessions() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newSessionProvider, setNewSessionProvider] = useState('gemini');
  const [newSessionModel, setNewSessionModel] = useState('gemini');

  async function loadSessions() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSessions();
      setSessions(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 15000);
    return () => clearInterval(interval);
  }, []);

  useBabEvents((type) => {
    if (type.startsWith('session.')) {
      loadSessions();
    }
  });

  const cardClass = `rounded-xl border ${
    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  }`;

  const formatRelative = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleCreateSession = async () => {
    try {
      await api.createSession(newSessionProvider, newSessionModel);
      setShowNewModal(false);
      loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await api.deleteSession(sessionId);
      loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session');
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
            {t('sessions.title')}
          </h1>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            {t('sessions.subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadSessions}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            <RefreshCw className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('sessions.new')}
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`${cardClass} p-4`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              theme === 'dark' ? 'bg-green-900' : 'bg-green-50'
            }`}>
              <MessageSquare className={`w-5 h-5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {sessions.length}
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {t('sessions.active')}
              </p>
            </div>
          </div>
        </div>
        <div className={`${cardClass} p-4`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              theme === 'dark' ? 'bg-blue-900' : 'bg-blue-50'
            }`}>
              <MessageSquare className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {sessions.reduce((sum, s) => sum + (s.messageCount ?? s.messages?.length ?? 0), 0)}
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {t('sessions.messages')}
              </p>
            </div>
          </div>
        </div>
        <div className={`${cardClass} p-4`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              theme === 'dark' ? 'bg-purple-900' : 'bg-purple-50'
            }`}>
              <Server className={`w-5 h-5 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {new Set(sessions.map(s => s.providerId)).size}
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {t('sessions.provider')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Session List */}
      {sessions.length === 0 ? (
        <div className={`${cardClass} p-12 text-center`}>
          <MessageSquare className={`w-12 h-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
          <p className={`mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {t('sessions.noSessions')}
          </p>
          <button
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Create Session
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div key={session.id} className={`${cardClass} p-4 hover:shadow-md transition-shadow`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    theme === 'dark' ? 'bg-green-900' : 'bg-green-50'
                  }`}>
                    <MessageSquare className={`w-5 h-5 ${
                      theme === 'dark' ? 'text-green-400' : 'text-green-600'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {session.providerId.charAt(0).toUpperCase() + session.providerId.slice(1)}
                      </h3>
                      <span className="text-xs px-2 py-0.5 rounded bg-green-50 text-green-700">
                        {session.model}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className={`text-xs flex items-center gap-1 ${
                        theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                        <MessageSquare className="w-3 h-3" />
                        {session.messageCount ?? session.messages?.length ?? 0} {t('sessions.messages')}
                      </span>
                      <span className={`text-xs flex items-center gap-1 ${
                        theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                        <Clock className="w-3 h-3" />
                        {formatRelative(session.createdAt)}
                      </span>
                    </div>

                    {/* Context usage */}
                    {typeof session.contextUsagePercent === 'number' && (
                      <div className="mt-2 max-w-xs">
                        <div className={`h-1.5 rounded-full overflow-hidden ${
                          theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                        }`}>
                          <div
                            className={`h-full rounded-full transition-all ${
                              session.contextUsagePercent > 80
                                ? 'bg-red-500'
                                : session.contextUsagePercent > 60
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                            }`}
                            style={{ width: `${session.contextUsagePercent}%` }}
                          />
                        </div>
                        <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                          ~{(session.estimatedTokens ?? 0).toLocaleString()} / {(session.contextLimit ?? 0).toLocaleString()} tokens
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    title="Export as Markdown"
                    onClick={() => api.downloadSession(session.id, 'markdown').catch((err) => setError(err instanceof Error ? err.message : 'Export failed'))}
                    className={`p-2 rounded-lg transition-colors ${
                      theme === 'dark'
                        ? 'text-gray-400 hover:text-blue-400 hover:bg-gray-700'
                        : 'text-gray-400 hover:text-blue-600 hover:bg-gray-100'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                  <button
                    title="Export as JSON"
                    onClick={() => api.downloadSession(session.id, 'json').catch((err) => setError(err instanceof Error ? err.message : 'Export failed'))}
                    className={`p-2 rounded-lg transition-colors ${
                      theme === 'dark'
                        ? 'text-gray-400 hover:text-blue-400 hover:bg-gray-700'
                        : 'text-gray-400 hover:text-blue-600 hover:bg-gray-100'
                    }`}
                  >
                    <FileJson className="w-4 h-4" />
                  </button>
                  <button className={`p-2 rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteSession(session.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      theme === 'dark'
                        ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700'
                        : 'text-gray-400 hover:text-red-600 hover:bg-gray-100'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Session Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${cardClass} p-6 max-w-md w-full mx-4`}>
            <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              New Session
            </h2>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Provider
                </label>
                <select
                  value={newSessionProvider}
                  onChange={(e) => {
                    setNewSessionProvider(e.target.value);
                    setNewSessionModel(e.target.value);
                  }}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-200 text-gray-900'
                  }`}
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="chatgpt">ChatGPT</option>
                  <option value="claude">Claude</option>
                  <option value="deepseek">DeepSeek</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Model
                </label>
                <input
                  type="text"
                  value={newSessionModel}
                  onChange={(e) => setNewSessionModel(e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewModal(false)}
                className={`flex-1 py-2.5 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSession}
                className="flex-1 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
