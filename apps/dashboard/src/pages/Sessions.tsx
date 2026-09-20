import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Plus,
  Clock,
  Server,
  Trash2,
  RefreshCw,
  MoreVertical,
  Copy,
  AlertTriangle,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { api, type Session } from '../lib/api';
import { humanizeError } from '../lib/errors';
import { MenuDropdown, MenuItem, MenuSeparator, NumberPopIn } from '../components/motion';

export default function Sessions() {
  const { t, language } = useLanguage();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [newSessionProvider, setNewSessionProvider] = useState('gemini');
  const [newSessionModel, setNewSessionModel] = useState('gemini');
  const [modelTouched, setModelTouched] = useState(false);

  async function loadSessions() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSessions();
      setSessions(data.data || []);
    } catch (err) {
      setError(humanizeError(err, language));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cardClass = 'rounded-xl glass';
  const inputClass =
    'w-full px-4 py-2.5 rounded-lg border border-border bg-surface-inset text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors';

  const formatRelative = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return language === 'ru' ? 'Только что' : 'Just now';
    if (minutes < 60) return `${minutes}${language === 'ru' ? 'м назад' : 'm ago'}`;
    if (hours < 24) return `${hours}${language === 'ru' ? 'ч назад' : 'h ago'}`;
    return `${days}${language === 'ru' ? 'д назад' : 'd ago'}`;
  };

  const handleCreateSession = async () => {
    try {
      await api.createSession(newSessionProvider, newSessionModel);
      setShowNewModal(false);
      loadSessions();
    } catch (err) {
      setError(humanizeError(err, language));
    }
  };

  const doDeleteSession = async (sessionId: string) => {
    setConfirmDeleteId(null);
    try {
      await api.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      setError(humanizeError(err, language));
    }
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
          <h1 className="text-2xl font-display leading-none text-text">{t('sessions.title')}</h1>
          <p className="text-text-muted mt-2">{t('sessions.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadSessions}
            className="p-2 rounded-lg transition-colors hover:bg-surface-inset"
            aria-label={t('sessions.title')}
          >
            <RefreshCw className="w-5 h-5 text-text-muted" />
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent text-accent-fg rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            {t('sessions.new')}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg text-sm bg-danger/10 border border-danger/30 text-danger">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`${cardClass} p-4`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-success/15 text-success">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-display leading-none text-text">
                <NumberPopIn value={sessions.length} />
              </p>
              <p className="text-sm text-text-muted mt-1">{t('sessions.active')}</p>
            </div>
          </div>
        </div>
        <div className={`${cardClass} p-4`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-accent-soft text-accent">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-display leading-none text-text">
                <NumberPopIn
                  value={sessions.reduce((sum, s) => sum + (s.messages?.length || 0), 0)}
                />
              </p>
              <p className="text-sm text-text-muted mt-1">{t('sessions.messages')}</p>
            </div>
          </div>
        </div>
        <div className={`${cardClass} p-4`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-warning/15 text-warning">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-display leading-none text-text">
                <NumberPopIn value={new Set(sessions.map((s) => s.providerId)).size} />
              </p>
              <p className="text-sm text-text-muted mt-1">{t('sessions.provider')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Session List */}
      {sessions.length === 0 ? (
        <div className={`${cardClass} p-12 text-center`}>
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-text-subtle" />
          <p className="mb-4 text-text-muted">{t('sessions.noSessions')}</p>
          <button
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2 bg-accent text-accent-fg rounded-lg hover:opacity-90 transition-opacity"
          >
            {t('sessions.newSession')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const isConfirming = confirmDeleteId === session.id;
            return (
              <div key={session.id} className={`${cardClass} p-4 transition-shadow`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-accent-soft text-accent">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-text">
                          {session.providerId.charAt(0).toUpperCase() + session.providerId.slice(1)}
                        </h3>
                        <span className="text-xs px-2 py-0.5 rounded bg-accent-soft text-accent">
                          {session.model}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs flex items-center gap-1 text-text-subtle">
                          <MessageSquare className="w-3 h-3" />
                          {session.messages?.length || 0} {t('sessions.messages')}
                        </span>
                        <span className="text-xs flex items-center gap-1 text-text-subtle">
                          <Clock className="w-3 h-3" />
                          {formatRelative(session.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isConfirming ? (
                      <div className="flex items-center gap-2 bg-danger/10 border border-danger/30 rounded-lg px-3 py-1.5 text-sm">
                        <AlertTriangle className="w-4 h-4 text-danger" />
                        <span className="text-danger">
                          {language === 'ru' ? 'Удалить?' : 'Delete?'}
                        </span>
                        <button
                          onClick={() => doDeleteSession(session.id)}
                          className="text-xs px-2 py-1 rounded bg-danger text-white hover:opacity-90"
                        >
                          {t('common.delete')}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs px-2 py-1 rounded text-text-muted hover:bg-surface-inset"
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    ) : (
                      <MenuDropdown
                        origin="top-right"
                        trigger={({ toggle }) => (
                          <button
                            type="button"
                            onClick={toggle}
                            className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface-inset transition-colors"
                            aria-label="Session actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        )}
                      >
                        <MenuItem
                          icon={<Copy className="w-4 h-4" />}
                          onSelect={() => navigator.clipboard.writeText(session.id)}
                        >
                          {language === 'ru' ? 'Скопировать ID' : 'Copy ID'}
                        </MenuItem>
                        <MenuSeparator />
                        <MenuItem
                          danger
                          icon={<Trash2 className="w-4 h-4" />}
                          onSelect={() => setConfirmDeleteId(session.id)}
                        >
                          {t('common.delete')}
                        </MenuItem>
                      </MenuDropdown>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Session Modal */}
      {showNewModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowNewModal(false)}
        >
          <div
            className={`${cardClass} p-6 max-w-md w-full`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-display leading-none mb-4 text-text">
              {t('sessions.newSession')}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-text-muted">
                  {t('sessions.provider')}
                </label>
                <select
                  value={newSessionProvider}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNewSessionProvider(value);
                    if (!modelTouched) setNewSessionModel(value);
                  }}
                  className={inputClass}
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="chatgpt">ChatGPT</option>
                  <option value="claude">Claude</option>
                  <option value="deepseek">DeepSeek</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-text-muted">
                  {t('sessions.model')}
                </label>
                <input
                  type="text"
                  value={newSessionModel}
                  onChange={(e) => {
                    setNewSessionModel(e.target.value);
                    setModelTouched(true);
                  }}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewModal(false)}
                className="flex-1 py-2.5 rounded-lg bg-surface-inset text-text-muted hover:text-text hover:bg-accent-soft transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCreateSession}
                className="flex-1 py-2.5 bg-accent text-accent-fg rounded-lg hover:opacity-90 transition-opacity"
              >
                {t('common.create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
