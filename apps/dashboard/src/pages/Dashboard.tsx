import { useMemo, useState, useEffect } from 'react';
import {
  Activity,
  MessageSquare,
  Server,
  Clock,
  CheckCircle,
  Shield,
  RefreshCw,
  Power,
  WifiOff,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { api, type HealthStatus, type Session, ApiError } from '../lib/api';
import { humanizeError } from '../lib/errors';
import { useElectron } from '../hooks/useElectron';
import { NumberPopIn, TextStatesSwap, ReasoningStream } from '../components/motion';

const PROVIDER_URLS: Record<string, string> = {
  gemini: 'https://gemini.google.com',
  chatgpt: 'https://chatgpt.com',
  claude: 'https://claude.ai',
  deepseek: 'https://chat.deepseek.com',
};

export default function Dashboard() {
  const { t, language } = useLanguage();
  const { isElectron, serverRunning, startServer, stopServer } = useElectron();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [providerCount, setProviderCount] = useState(0);
  const [connectedCount, setConnectedCount] = useState(0);
  const [toolsCount, setToolsCount] = useState<number | null>(null);
  const [confirmCount, setConfirmCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [serverDown, setServerDown] = useState(false);

  async function loadData() {
    setLoading(true);
    setError(null);
    setServerDown(false);
    try {
      const [healthData, sessionsData, toolsData] = await Promise.all([
        api.getHealth(),
        api.getSessions(),
        api.getTools().catch(() => null),
      ]);
      setHealth(healthData);
      setSessions(sessionsData.data || []);
      const providers = Object.keys(healthData.providers);
      setProviderCount(providers.length);
      setConnectedCount(providers.filter((p) => healthData.providers[p]?.healthy).length);
      setToolsCount(Array.isArray(toolsData) ? toolsData.length : null);
      setConfirmCount(
        Array.isArray(toolsData) ? toolsData.filter((t) => t.permission === 'confirm').length : 0,
      );
    } catch (err) {
      if (err instanceof ApiError && err.code === 'SERVER_DOWN') setServerDown(true);
      setError(humanizeError(err, language));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cardClass = 'rounded-xl glass';

  /**
   * Pull the newest assistant reply across every session and split it into
   * short-ish lines so ReasoningStream has enough rows to scroll through
   * without looking like one giant block of text.
   */
  const latestReply = useMemo(() => {
    if (!sessions.length) return null;
    const withMessages = [...sessions]
      .filter((s) => (s.messages?.length ?? 0) > 0)
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    for (const s of withMessages) {
      const assistant = [...(s.messages ?? [])]
        .reverse()
        .find((m) => m.role === 'assistant');
      if (!assistant?.content) continue;
      const raw = String(assistant.content).trim();
      if (!raw) continue;
      const lines = raw
        .split(/\r?\n/)
        .flatMap((line) => {
          // Wrap long lines to about 90 chars so the scroll has visible motion.
          if (line.length <= 90) return [line];
          const words = line.split(/\s+/);
          const out: string[] = [];
          let cur = '';
          for (const w of words) {
            if ((cur + ' ' + w).trim().length > 90) {
              if (cur) out.push(cur);
              cur = w;
            } else {
              cur = (cur + ' ' + w).trim();
            }
          }
          if (cur) out.push(cur);
          return out;
        })
        .filter(Boolean);
      return { providerId: s.providerId, lines: lines.slice(0, 30) };
    }
    return null;
  }, [sessions]);

  // Server not running - show friendly screen
  if (!loading && serverDown) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-surface-inset text-text-subtle">
          <WifiOff className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-display leading-none mb-2 text-text">
          Server Not Running
        </h2>
        <p className="text-sm mb-6 text-text-muted">
          Start the server to connect to your AI provider
        </p>
        <button
          onClick={async () => {
            if (isElectron) {
              await startServer();
              setTimeout(loadData, 3000);
            } else {
              alert('Run in terminal: bab serve --site gemini');
            }
          }}
          className="flex items-center gap-2 px-6 py-3 bg-accent text-accent-fg rounded-lg hover:opacity-90 transition-colors font-medium"
        >
          <Power className="w-5 h-5" />
          {isElectron ? 'Start Server' : 'How to Start'}
        </button>
        {!isElectron && (
          <div className="mt-6 p-4 rounded-lg bg-surface-inset">
            <p className="text-xs font-mono text-text-muted">bab serve --site gemini</p>
          </div>
        )}
      </div>
    );
  }

  // Loading
  if (loading && !health) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const totalMessages = sessions.reduce((sum, s) => sum + (s.messages?.length || 0), 0);
  const runtimeLabel =
    health?.status === 'ok' ? 'Running' : health?.status === 'degraded' ? 'Degraded' : 'Down';
  const stats = [
    { name: t('dashboard.activeSessions'), value: sessions.length.toString(), icon: MessageSquare, change: '' },
    { name: t('dashboard.messages'), value: totalMessages.toString(), icon: Activity, change: '' },
    { name: t('dashboard.activeProviders'), value: `${connectedCount}/${providerCount}`, icon: Server, change: connectedCount > 0 ? 'Online' : 'Offline' },
    { name: t('dashboard.runtime'), value: runtimeLabel, icon: Clock, change: '' },
  ];

  const systemStatus = [
    { name: t('dashboard.runtimeReady'), status: health?.status === 'ok' },
    {
      name: t('dashboard.toolsRegistered'),
      value: toolsCount !== null ? String(toolsCount) : '—',
      status: toolsCount !== null && toolsCount > 0,
    },
    {
      name: t('dashboard.permissionsActive'),
      value: confirmCount > 0 ? `${confirmCount} confirm` : 'auto',
      status: true,
    },
  ];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display leading-none text-text">{t('dashboard.title')}</h1>
          <p className="text-text-muted mt-2">{t('dashboard.welcome')}</p>
        </div>
        <div className="flex items-center gap-2">
          {isElectron && (
            <button
              onClick={() => (serverRunning ? stopServer() : startServer())}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                serverRunning
                  ? 'bg-danger/15 text-danger hover:bg-danger/25'
                  : 'bg-success/15 text-success hover:bg-success/25'
              }`}
            >
              <Power className="w-4 h-4" />
              {serverRunning ? 'Stop' : 'Start'}
            </button>
          )}
          <button
            onClick={loadData}
            className="p-2 rounded-lg transition-colors hover:bg-surface-inset"
          >
            <RefreshCw
              className={`w-5 h-5 text-text-muted ${loading ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className={`${cardClass} p-6`}>
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-accent-soft text-accent">
                <stat.icon className="w-6 h-6" />
              </div>
              {stat.change && (
                <span
                  className={`text-sm font-medium px-2.5 py-1 rounded-full ${
                    stat.change === 'Online'
                      ? 'text-success bg-success/15'
                      : stat.change === 'Offline'
                        ? 'text-danger bg-danger/15'
                        : 'text-text-muted bg-surface-inset'
                  }`}
                >
                  {stat.change}
                </span>
              )}
            </div>
            <div className="mt-4">
              <p className="text-3xl font-display leading-none text-text">
                {/^\d+/.test(stat.value) ? (
                  <NumberPopIn value={stat.value} />
                ) : (
                  <TextStatesSwap value={stat.value} />
                )}
              </p>
              <p className="text-sm mt-2 text-text-muted">{stat.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Latest reply — real AI transcript preview, click opens provider */}
      <div className="mb-8">
        {latestReply ? (
          <ReasoningStream
            lines={latestReply.lines}
            label={
              language === 'ru'
                ? `Последний ответ · ${latestReply.providerId}`
                : `Latest reply · ${latestReply.providerId}`
            }
            href={PROVIDER_URLS[latestReply.providerId]}
            height={160}
          />
        ) : (
          <div className={`${cardClass} p-6 text-center`}>
            <MessageSquare className="w-8 h-8 mx-auto mb-3 text-text-subtle" />
            <p className="text-sm text-text-muted">
              {language === 'ru'
                ? 'Ответов ещё нет — как только IDE обратится к мосту, тут появится живое превью.'
                : 'No replies yet — once your IDE talks to the bridge, a live preview shows up here.'}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Status */}
        <div className={cardClass}>
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-text">{t('dashboard.systemStatus')}</h2>
          </div>
          <div className="divide-y divide-border">
            {systemStatus.map((item) => (
              <div
                key={item.name}
                className="px-6 py-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle
                    className={`w-5 h-5 ${item.status ? 'text-success' : 'text-danger'}`}
                  />
                  <span className="text-text">{item.name}</span>
                </div>
                {item.value && (
                  <span className="text-sm font-medium text-text-muted">{item.value}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Providers Status */}
        <div className={`lg:col-span-2 ${cardClass}`}>
          <div className="px-6 py-4 border-b flex items-center justify-between border-border">
            <h2 className="text-lg font-semibold text-text">Providers</h2>
          </div>
          <div className="divide-y divide-border">
            {health &&
              Object.entries(health.providers).map(([id, provider]) => (
                <div
                  key={id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-surface-inset transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {provider.healthy ? (
                      <CheckCircle className="w-5 h-5 text-success" />
                    ) : (
                      <Shield className="w-5 h-5 text-danger" />
                    )}
                    <div>
                      <p className="font-medium text-text">
                        {id.charAt(0).toUpperCase() + id.slice(1)}
                      </p>
                      <p className="text-xs text-text-subtle">
                        {provider.healthy ? 'Connected' : provider.error || 'Disconnected'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {provider.latency && (
                      <span className="text-xs text-text-subtle font-mono">
                        <NumberPopIn value={provider.latency} />ms
                      </span>
                    )}
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        provider.healthy
                          ? 'bg-success/15 text-success'
                          : 'bg-danger/15 text-danger'
                      }`}
                    >
                      {provider.healthy ? 'Healthy' : 'Unhealthy'}
                    </span>
                  </div>
                </div>
              ))}
            {health && Object.keys(health.providers).length === 0 && (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-text-muted">
                  No providers configured. Start the server with --site flag.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
