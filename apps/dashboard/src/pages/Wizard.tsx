import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Chrome,
  Globe,
  Zap,
  MessageSquare,
  ExternalLink,
  Check,
  Copy,
  Loader2,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { isElectron, type BrowserInfo } from '../hooks/useElectron';
import { waitForProviderHealthy } from '../lib/api';
import { TextStatesSwap } from '../components/motion';

type Step = 1 | 2 | 3 | 4;

interface ProviderChoice {
  id: string;
  name: string;
  siteUrl: string;
  icon: typeof Globe;
}

const PROVIDERS: ProviderChoice[] = [
  { id: 'gemini',   name: 'Google Gemini', siteUrl: 'https://gemini.google.com', icon: Globe },
  { id: 'chatgpt',  name: 'ChatGPT',       siteUrl: 'https://chatgpt.com',        icon: Zap },
  { id: 'claude',   name: 'Claude',        siteUrl: 'https://claude.ai',          icon: MessageSquare },
  { id: 'deepseek', name: 'DeepSeek',      siteUrl: 'https://chat.deepseek.com',  icon: Globe },
];

export default function Wizard() {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(1);
  const [browsers, setBrowsers] = useState<BrowserInfo[]>([]);
  const [browserId, setBrowserId] = useState<BrowserInfo['id']>('chrome');
  const [providerId, setProviderId] = useState<string>('gemini');
  const [verifyState, setVerifyState] = useState<'idle' | 'checking' | 'ok' | 'fail'>('idle');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [apiPort, setApiPort] = useState(3000);

  const t = (ru: string, en: string) => (language === 'ru' ? ru : en);

  useEffect(() => {
    async function init() {
      if (isElectron() && window.electronAPI) {
        const list = await window.electronAPI.listBrowsers().catch(() => []);
        setBrowsers(list);
        const firstInstalled = list.find((b) => b.installed);
        if (firstInstalled) setBrowserId(firstInstalled.id);
        const saved = await window.electronAPI.loadSettings?.().catch(() => null);
        if (saved?.serverPort) setApiPort(saved.serverPort);
        if (saved?.general?.serverPort) setApiPort(saved.general.serverPort);
      }
    }
    init();
  }, []);

  const chosenProvider = PROVIDERS.find((p) => p.id === providerId)!;
  const chosenBrowser = browsers.find((b) => b.id === browserId);
  const anyBrowserInstalled = browsers.some((b) => b.installed);

  const goNext = () => setStep((s) => (Math.min(4, s + 1) as Step));
  const goBack = () => setStep((s) => (Math.max(1, s - 1) as Step));

  const openSignin = () => {
    if (isElectron() && window.electronAPI?.openProviderSignin) {
      window.electronAPI.openProviderSignin(chosenProvider.siteUrl);
    } else {
      window.open(chosenProvider.siteUrl, '_blank');
    }
  };

  // Restart the backend only when the desired provider isn't already active,
  // otherwise a repeat "Verify" click kills a server that just came up.
  const ensureProviderActive = async () => {
    if (!isElectron() || !window.electronAPI) return;
    await window.electronAPI.mergeSettings?.({
      provider: providerId,
      browser: { id: browserId },
    });

    let activeMatches = false;
    try {
      const status = await window.electronAPI.getStatus();
      activeMatches = status.serverRunning && status.site === providerId;
    } catch {
      activeMatches = false;
    }

    if (!activeMatches) {
      const result = await window.electronAPI.setActiveProvider(providerId);
      if (!result.success) throw new Error(result.error || 'Switch failed');
    }
  };

  const verifySignedIn = async () => {
    setVerifyState('checking');
    setVerifyError(null);
    try {
      await ensureProviderActive();
      const row = await waitForProviderHealthy(providerId, { timeoutMs: 20000 });
      if (row?.healthy) {
        setVerifyState('ok');
        setTimeout(() => goNext(), 800);
      } else {
        setVerifyState('fail');
        setVerifyError(row?.error || t('Не удалось подтвердить вход', 'Could not verify sign-in'));
      }
    } catch (err) {
      setVerifyState('fail');
      setVerifyError(err instanceof Error ? err.message : String(err));
    }
  };

  const finish = async () => {
    if (isElectron() && window.electronAPI?.saveSettings) {
      const current = (await window.electronAPI.loadSettings?.()) || {};
      await window.electronAPI.saveSettings({ ...current, onboarded: true });
    } else {
      localStorage.setItem('bab-onboarded', 'true');
    }
    navigate('/');
  };

  const apiUrl = `http://localhost:${apiPort}/v1/chat/completions`;

  const backBtnClass =
    'flex items-center gap-2 px-4 py-2.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-inset transition-colors';
  const primaryBtnClass =
    'flex items-center gap-2 px-6 py-2.5 bg-accent text-accent-fg rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity';

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Progress */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                n < step
                  ? 'bg-accent text-accent-fg'
                  : n === step
                    ? 'bg-accent text-accent-fg ring-4 ring-accent/20'
                    : 'bg-surface-inset text-text-subtle'
              }`}
            >
              {n < step ? <Check className="w-4 h-4" /> : n}
            </div>
            {n < 4 && (
              <div
                className={`w-8 h-0.5 ${n < step ? 'bg-accent' : 'bg-surface-inset'}`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-8">
        {/* Step 1 — Browser */}
        {step === 1 && (
          <>
            <h1 className="text-2xl font-display leading-none mb-3 text-text">
              {t('Через какой браузер работать', 'Which browser to use')}
            </h1>
            <p className="mb-6 text-text-muted">
              {t(
                'Мост использует твою уже залогиненную сессию. Выбери браузер, в который зайдёшь под своим AI-аккаунтом.',
                'The bridge uses your already-signed-in session. Pick the browser where you will sign in to your AI account.',
              )}
            </p>

            {!anyBrowserInstalled && (
              <div className="p-4 rounded-lg mb-4 flex items-start gap-3 bg-danger/10 border border-danger/30 text-danger">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <div className="text-sm">
                  {t(
                    'Не найдено ни одного поддерживаемого браузера. Установите Chrome, Edge, Brave, Opera или Vivaldi.',
                    'No supported browser detected. Install Chrome, Edge, Brave, Opera, or Vivaldi.',
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {browsers.map((b) => {
                const selected = b.id === browserId;
                return (
                  <button
                    key={b.id}
                    disabled={!b.installed}
                    onClick={() => setBrowserId(b.id)}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-colors ${
                      !b.installed
                        ? 'border-border bg-surface-inset text-text-subtle cursor-not-allowed opacity-70'
                        : selected
                          ? 'border-accent bg-accent-soft'
                          : 'border-border bg-surface hover:border-border-strong'
                    }`}
                  >
                    <Chrome
                      className={`w-6 h-6 flex-shrink-0 ${selected ? 'text-accent' : 'text-text-muted'}`}
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-text">{b.name}</p>
                      <p className="text-xs text-text-subtle">
                        {b.installed
                          ? t('установлен', 'installed')
                          : t('не установлен', 'not installed')}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end mt-8">
              <button
                onClick={goNext}
                disabled={!chosenBrowser?.installed}
                className={primaryBtnClass}
              >
                {t('Дальше', 'Next')}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* Step 2 — Provider */}
        {step === 2 && (
          <>
            <h1 className="text-2xl font-display leading-none mb-3 text-text">
              {t('Выбери AI-провайдера', 'Pick an AI provider')}
            </h1>
            <p className="mb-6 text-text-muted">
              {t(
                'Тот, чьим веб-интерфейсом ты будешь пользоваться. Можно поменять позже.',
                'Whose web interface you will use. Can be changed later.',
              )}
            </p>

            <div className="grid grid-cols-2 gap-3">
              {PROVIDERS.map((p) => {
                const Icon = p.icon;
                const selected = p.id === providerId;
                return (
                  <button
                    key={p.id}
                    onClick={() => setProviderId(p.id)}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-colors ${
                      selected
                        ? 'border-accent bg-accent-soft'
                        : 'border-border bg-surface hover:border-border-strong'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        selected ? 'bg-accent text-accent-fg' : 'bg-surface-inset text-text-muted'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-text">{p.name}</p>
                      <p className="text-xs text-text-subtle truncate">{p.siteUrl}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between mt-8">
              <button onClick={goBack} className={backBtnClass}>
                <ArrowLeft className="w-4 h-4" />
                {t('Назад', 'Back')}
              </button>
              <button onClick={goNext} className={primaryBtnClass}>
                {t('Дальше', 'Next')}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* Step 3 — Sign in + verify */}
        {step === 3 && (
          <>
            <h1 className="text-2xl font-display leading-none mb-3 text-text">
              {t(`Войди в ${chosenProvider.name}`, `Sign in to ${chosenProvider.name}`)}
            </h1>
            <p className="mb-6 text-text-muted">
              {t(
                'Мы откроем сайт в твоём браузере. Залогинься под своим аккаунтом, вернись сюда и нажми «Проверить». Мы поднимем сервер и убедимся, что сессия работает.',
                'We will open the site in your browser. Sign in, come back, and hit "Verify". We will spin up the server and confirm your session works.',
              )}
            </p>

            <div className="p-4 rounded-lg mb-4 bg-surface-inset border border-border">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <chosenProvider.icon className="w-6 h-6 text-accent flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-text">{chosenProvider.name}</p>
                    <p className="text-xs text-text-subtle truncate">{chosenProvider.siteUrl}</p>
                  </div>
                </div>
                <button
                  onClick={openSignin}
                  className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-fg rounded-lg hover:opacity-90 text-sm transition-opacity flex-shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                  {t('Открыть сайт', 'Open site')}
                </button>
              </div>
            </div>

            {verifyState !== 'idle' && (
              <div
                className={`p-4 rounded-lg mb-4 flex items-start gap-3 border ${
                  verifyState === 'checking'
                    ? 'bg-accent-soft border-accent/30 text-accent'
                    : verifyState === 'ok'
                      ? 'bg-success/10 border-success/30 text-success'
                      : 'bg-danger/10 border-danger/30 text-danger'
                }`}
              >
                {verifyState === 'checking' && (
                  <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
                )}
                {verifyState === 'ok' && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
                {verifyState === 'fail' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                <div className="text-sm">
                  <TextStatesSwap
                    value={
                      verifyState === 'checking'
                        ? t('Запускаем сервер и проверяем сессию…', 'Starting server and checking session…')
                        : verifyState === 'ok'
                          ? t('Готово! Сессия подтверждена.', 'All good — session verified.')
                          : t('Не получилось подтвердить вход.', 'Could not verify sign-in.')
                    }
                  />
                  {verifyState === 'fail' && verifyError && (
                    <p className="mt-1 opacity-80 text-xs">{verifyError}</p>
                  )}
                  {verifyState === 'fail' && (
                    <p className="mt-2">
                      {t(
                        'Проверь, что залогинен на сайте, и нажми «Проверить» ещё раз.',
                        'Make sure you are signed in on the site, then hit "Verify" again.',
                      )}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-between mt-8">
              <button
                onClick={goBack}
                disabled={verifyState === 'checking'}
                className={backBtnClass}
              >
                <ArrowLeft className="w-4 h-4" />
                {t('Назад', 'Back')}
              </button>
              <button
                onClick={verifySignedIn}
                disabled={verifyState === 'checking'}
                className={primaryBtnClass}
              >
                {verifyState === 'checking' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {t('Проверить', 'Verify')}
              </button>
            </div>
          </>
        )}

        {/* Step 4 — Done */}
        {step === 4 && (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 bg-success/15 text-success">
                <Check className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-display leading-none text-text">
                {t('Всё готово', 'You are all set')}
              </h1>
              <p className="mt-2 text-text-muted">
                {t(
                  'Скопируй этот URL в Cursor, VS Code или другой AI-клиент.',
                  'Copy this URL into Cursor, VS Code, or any other AI client.',
                )}
              </p>
            </div>

            <div className="p-4 rounded-lg mb-6 bg-surface-inset border border-border">
              <p className="text-xs mb-2 text-text-muted">{t('API URL', 'API URL')}</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-sm px-3 py-2 rounded bg-surface text-success">
                  {apiUrl}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(apiUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="p-2 rounded-lg hover:bg-surface text-text-muted hover:text-accent transition-colors"
                  title={t('Скопировать', 'Copy')}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs mt-3 text-text-muted">
                {t('Model: ', 'Model: ')}
                <code className="font-mono text-text">{providerId}</code>
              </p>
            </div>

            <button
              onClick={finish}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-accent text-accent-fg rounded-lg hover:opacity-90 font-medium transition-opacity"
            >
              {t('Перейти в приложение', 'Go to the app')}
              <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
