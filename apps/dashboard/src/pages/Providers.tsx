import { useState, useEffect, useCallback } from 'react';
import {
  Server,
  Globe,
  Zap,
  CheckCircle,
  XCircle,
  ExternalLink,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { isElectron } from '../hooks/useElectron';
import { api, waitForProviderHealthy } from '../lib/api';
import { humanizeError } from '../lib/errors';
import { NumberPopIn, TextStatesSwap } from '../components/motion';

interface ProviderCatalogEntry {
  id: string;
  name: string;
  siteUrl: string;
  icon: typeof Globe;
}

const CATALOG: ProviderCatalogEntry[] = [
  { id: 'gemini',   name: 'Google Gemini', siteUrl: 'https://gemini.google.com', icon: Globe },
  { id: 'chatgpt',  name: 'ChatGPT',       siteUrl: 'https://chatgpt.com',        icon: Zap },
  { id: 'claude',   name: 'Claude',        siteUrl: 'https://claude.ai',          icon: Globe },
  { id: 'deepseek', name: 'DeepSeek',      siteUrl: 'https://chat.deepseek.com',  icon: Globe },
];

type HealthRow = { healthy: boolean; latency?: number; error?: string };

export default function Providers() {
  const { t, language } = useLanguage();
  const [health, setHealth] = useState<Record<string, HealthRow>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setError(null);
    try {
      const h = await api.getHealth();
      setHealth(h.providers || {});
      // Active provider is whichever backend reports (the CLI --site).
      const activeCandidate = Object.keys(h.providers || {})[0] || null;
      setActiveId(activeCandidate);
    } catch (err) {
      setError(humanizeError(err, language));
      setHealth({});
      setActiveId(null);
    } finally {
      setLoading(false);
    }
    // language is only read inside the catch; humanizeError picks the string
    // per-call. Not adding it as a dep to avoid tearing down the 10s interval
    // whenever the language toggle flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 10000);
    return () => clearInterval(interval);
  }, [loadStatus]);

  const switchProvider = async (id: string) => {
    if (!isElectron() || !window.electronAPI?.setActiveProvider) {
      // In pure browser dev we can't restart the server ourselves.
      window.alert(
        language === 'ru'
          ? `Для переключения провайдера перезапустите сервер вручную: bab serve --site ${id}`
          : `To switch provider, restart the server: bab serve --site ${id}`,
      );
      return;
    }
    setSwitching(id);
    setError(null);
    try {
      const result = await window.electronAPI.setActiveProvider(id);
      if (!result.success) throw new Error(result.error || 'Switch failed');
      // Poll /health until the new provider reports healthy (or 20s elapses).
      await waitForProviderHealthy(id, { timeoutMs: 20000 });
      await loadStatus();
    } catch (err) {
      setError(humanizeError(err, language));
    } finally {
      setSwitching(null);
    }
  };

  const openSignin = (siteUrl: string) => {
    if (isElectron() && window.electronAPI?.openProviderSignin) {
      window.electronAPI.openProviderSignin(siteUrl);
    } else {
      window.open(siteUrl, '_blank');
    }
  };

  const cardClass = 'rounded-xl glass';

  const activeRow = activeId ? health[activeId] : undefined;
  const connectedCount = Object.values(health).filter((h) => h.healthy).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display leading-none text-text">
            {t('providers.title')}
          </h1>
          <p className="text-text-muted mt-2">
            {language === 'ru'
              ? 'Одновременно активен один провайдер. Переключение перезапускает сервер.'
              : 'One provider is active at a time. Switching restarts the server.'}
          </p>
        </div>
        <button
          onClick={loadStatus}
          disabled={loading}
          className="p-2 rounded-lg transition-colors hover:bg-surface-inset disabled:opacity-60"
          title={language === 'ru' ? 'Обновить' : 'Refresh'}
        >
          <RefreshCw className={`w-5 h-5 text-text-muted ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg text-sm bg-danger/10 border border-danger/30 text-danger">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`${cardClass} p-4`}>
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                activeRow?.healthy
                  ? 'bg-success/15 text-success'
                  : 'bg-surface-inset text-text-subtle'
              }`}
            >
              {activeRow?.healthy ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            </div>
            <div>
              <p className="text-lg font-display leading-none text-text">
                <TextStatesSwap
                  value={
                    activeId
                      ? activeId.charAt(0).toUpperCase() + activeId.slice(1)
                      : language === 'ru' ? 'Нет' : 'None'
                  }
                />
              </p>
              <p className="text-sm text-text-muted mt-1">
                {language === 'ru' ? 'Активный провайдер' : 'Active provider'}
              </p>
            </div>
          </div>
        </div>
        <div className={`${cardClass} p-4`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-accent-soft text-accent">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-display leading-none text-text">
                <NumberPopIn value={connectedCount} />/
                {Object.keys(health).length || '—'}
              </p>
              <p className="text-sm text-text-muted mt-1">
                {language === 'ru' ? 'Подключено' : 'Connected'}
              </p>
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
                {activeRow?.latency ? (
                  <>
                    <NumberPopIn value={activeRow.latency} />
                    <span className="text-base text-text-muted"> ms</span>
                  </>
                ) : (
                  '—'
                )}
              </p>
              <p className="text-sm text-text-muted mt-1">
                {language === 'ru' ? 'Задержка' : 'Latency'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Provider list */}
      <div className="space-y-3">
        {CATALOG.map((p) => {
          const Icon = p.icon;
          const isActive = p.id === activeId;
          const row = health[p.id];
          const isHealthy = row?.healthy === true;
          const isSwitchingThis = switching === p.id;

          return (
            <div
              key={p.id}
              className={`${cardClass} p-5 transition-shadow ${
                isActive ? 'ring-2 ring-accent shadow-glass' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isHealthy
                        ? 'bg-success text-white'
                        : isActive
                          ? 'bg-warning text-white'
                          : 'bg-surface-inset text-text-subtle'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-text">{p.name}</h3>
                      {isActive && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            isHealthy
                              ? 'bg-success/15 text-success'
                              : 'bg-warning/15 text-warning'
                          }`}
                        >
                          {isHealthy
                            ? language === 'ru'
                              ? 'Активен · подключён'
                              : 'Active · connected'
                            : language === 'ru'
                              ? 'Активен · нет входа'
                              : 'Active · not signed in'}
                        </span>
                      )}
                    </div>
                    <a
                      href={p.siteUrl}
                      onClick={(e) => {
                        e.preventDefault();
                        openSignin(p.siteUrl);
                      }}
                      className="text-xs flex items-center gap-1 mt-1 text-accent hover:opacity-80"
                    >
                      {p.siteUrl}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    {isActive && !isHealthy && row?.error && (
                      <p className="text-xs mt-1 text-danger">{row.error}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {isActive && !isHealthy && (
                    <button
                      onClick={() => openSignin(p.siteUrl)}
                      className="px-3 py-1.5 rounded-lg text-sm bg-warning/15 text-warning hover:bg-warning/25 transition-colors"
                    >
                      {language === 'ru' ? 'Войти в аккаунт' : 'Sign in'}
                    </button>
                  )}
                  {!isActive && (
                    <button
                      onClick={() => switchProvider(p.id)}
                      disabled={isSwitchingThis || switching !== null}
                      className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-fg rounded-lg hover:opacity-90 text-sm disabled:opacity-60 transition-opacity"
                    >
                      {isSwitchingThis ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {language === 'ru' ? 'Переключаем…' : 'Switching…'}
                        </>
                      ) : language === 'ru' ? (
                        'Сделать активным'
                      ) : (
                        'Make active'
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!loading && Object.keys(health).length === 0 && !error && (
        <div className={`${cardClass} mt-6 p-6 text-center`}>
          <p className="text-sm text-text-muted">
            {language === 'ru'
              ? 'Сервер работает, но ни один провайдер не подключён. Выберите провайдера кнопкой «Сделать активным».'
              : 'Server is running but no provider is connected. Pick one with "Make active".'}
          </p>
        </div>
      )}
    </div>
  );
}
