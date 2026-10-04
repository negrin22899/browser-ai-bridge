import { useState, useEffect } from 'react';
import {
  Save,
  Globe,
  Shield,
  Monitor,
  Folder,
  Terminal,
  Sun,
  Moon,
  Sparkles,
  Languages,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { isElectron, type BrowserInfo } from '../hooks/useElectron';
import { Toggle, TextStatesSwap } from '../components/motion';
import { api } from '../lib/api';

const DEFAULT_SETTINGS = {
  general: {
    serverPort: 3000,
    autoStart: true,
    minimizeToTray: true,
  },
  browser: {
    id: 'chrome' as BrowserInfo['id'],
    useExistingProfile: true,
    headless: false,
    defaultTimeout: 30000,
  },
  security: {
    requireConfirmation: true,
    dangerousCommands: ['rm -rf', 'sudo', 'format'],
    auditLog: true,
  },
  tools: {
    workingDirectory: '~',
    maxExecutionTime: 30000,
    shell: 'bash',
  },
};


export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [activeSection, setActiveSection] = useState('general');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [browsers, setBrowsers] = useState<BrowserInfo[]>([]);

  useEffect(() => {
    if (isElectron() && window.electronAPI?.listBrowsers) {
      window.electronAPI.listBrowsers().then(setBrowsers).catch(() => setBrowsers([]));
    }
  }, []);

  useEffect(() => {
    async function load() {
      if (isElectron() && window.electronAPI?.loadSettings) {
        try {
          const loaded = await window.electronAPI.loadSettings();
          if (loaded && typeof loaded === 'object') {
            setSettings((prev) => ({
              general: { ...prev.general, ...(loaded.general || {}) },
              browser: { ...prev.browser, ...(loaded.browser || {}) },
              security: { ...prev.security, ...(loaded.security || {}) },
              tools: { ...prev.tools, ...(loaded.tools || {}) },
            }));
          }
        } catch {
          // Keep defaults on error
        }
      } else {
        const raw = localStorage.getItem('bab-settings');
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            setSettings((prev) => ({ ...prev, ...parsed }));
          } catch {
            // Ignore malformed value
          }
        }
      }
    }
    load();
  }, []);

  const sections = [
    { id: 'general', title: t('settings.general'), description: t('settings.generalDesc'), icon: Monitor },
    { id: 'browser', title: t('settings.browser'), description: t('settings.browserDesc'), icon: Globe },
    { id: 'security', title: t('settings.security'), description: t('settings.securityDesc'), icon: Shield },
    { id: 'tools', title: t('settings.tools'), description: t('settings.toolsDesc'), icon: Terminal },
    { id: 'appearance', title: t('settings.appearance'), description: t('settings.appearanceDesc'), icon: theme === 'dark' ? Moon : theme === 'brand' ? Sparkles : Sun },
  ];

  const handleSave = async () => {
    setSaveState('saving');
    try {
      if (isElectron() && window.electronAPI?.saveSettings) {
        const ok = await window.electronAPI.saveSettings(settings);
        if (!ok) throw new Error('IPC save returned false');
      } else {
        localStorage.setItem('bab-settings', JSON.stringify(settings));
      }
      // Mirror to the backend config so server-side features see the same values.
      try {
        await api.saveConfig(settings);
      } catch {
        // Server not running — local settings are still saved.
      }
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (err) {
      console.error('Save settings failed:', err);
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 3000);
    }
  };

  const saveButtonLabel =
    saveState === 'saving' ? (language === 'ru' ? 'Сохраняем…' : 'Saving…')
      : saveState === 'saved' ? (language === 'ru' ? 'Сохранено ✓' : 'Saved ✓')
      : saveState === 'error' ? (language === 'ru' ? 'Ошибка' : 'Error')
      : t('settings.save');

  const inputClass = `w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent ${
    theme === 'dark'
      ? 'bg-gray-700 border-gray-600 text-white'
      : 'bg-white border-gray-200 text-gray-900'
  }`;

  const cardClass = `rounded-xl border p-6 ${
    theme === 'dark'
      ? 'bg-gray-800 border-gray-700'
      : 'bg-white border-gray-200'
  }`;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className={`text-2xl font-bold text-text`}>
            {t('settings.title')}
          </h1>
          <p className="text-text-muted">
            {t('settings.subtitle')}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saveState === 'saving'}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-accent-fg transition-colors duration-[var(--dur-base)] ease-soft ${
            saveState === 'error' ? 'bg-danger hover:opacity-90'
              : saveState === 'saved' ? 'bg-success'
              : 'bg-accent hover:opacity-90 disabled:opacity-60'
          }`}
        >
          <Save className="w-4 h-4" />
          <TextStatesSwap value={saveButtonLabel} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeSection === section.id
                    ? theme === 'dark'
                      ? 'bg-accent-soft text-accent'
                      : 'bg-accent-soft text-accent'
                    : theme === 'dark'
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <section.icon className="w-5 h-5" />
                <div>
                  <p className="font-medium">{section.title}</p>
                  <p className={`text-xs text-text-subtle`}>
                    {section.description}
                  </p>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className={cardClass}>
            {activeSection === 'general' && (
              <div className="space-y-6">
                <h2 className={`text-lg font-semibold text-text`}>
                  {t('settings.general')}
                </h2>

                <div>
                  <label className={`block text-sm font-medium mb-2 text-text-muted`}>
                    {t('settings.serverPort')}
                  </label>
                  <input
                    type="number"
                    value={settings.general.serverPort}
                    onChange={(e) =>
                      setSettings(prev => ({
                        ...prev,
                        general: { ...prev.general, serverPort: parseInt(e.target.value) },
                      }))
                    }
                    className={inputClass}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text">{t('settings.autoStart')}</p>
                    <p className="text-sm text-text-muted">{t('settings.autoStartDesc')}</p>
                  </div>
                  <Toggle
                    checked={settings.general.autoStart}
                    onChange={(v) =>
                      setSettings((prev) => ({ ...prev, general: { ...prev.general, autoStart: v } }))
                    }
                    ariaLabel={t('settings.autoStart')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text">{t('settings.minimizeToTray')}</p>
                    <p className="text-sm text-text-muted">{t('settings.minimizeToTrayDesc')}</p>
                  </div>
                  <Toggle
                    checked={settings.general.minimizeToTray}
                    onChange={(v) =>
                      setSettings((prev) => ({ ...prev, general: { ...prev.general, minimizeToTray: v } }))
                    }
                    ariaLabel={t('settings.minimizeToTray')}
                  />
                </div>
              </div>
            )}

            {activeSection === 'browser' && (
              <div className="space-y-6">
                <h2 className={`text-lg font-semibold text-text`}>
                  {t('settings.browser')}
                </h2>

                <div>
                  <label className={`block text-sm font-medium mb-2 text-text-muted`}>
                    {language === 'ru' ? 'Через какой браузер подключаться' : 'Which browser to use'}
                  </label>
                  <p className={`text-xs mb-3 text-text-subtle`}>
                    {language === 'ru'
                      ? 'Используется ваш уже залогиненный профиль. Не установленные браузеры отключены.'
                      : 'Uses your already-signed-in profile. Browsers not installed are disabled.'}
                  </p>
                  {browsers.length === 0 ? (
                    <div className={`p-3 rounded-lg text-sm ${
                      theme === 'dark' ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-800' : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                    }`}>
                      {language === 'ru'
                        ? 'Ни одного поддерживаемого браузера не найдено. Установите Chrome, Edge, Brave, Opera или Vivaldi.'
                        : 'No supported browsers detected. Install Chrome, Edge, Brave, Opera, or Vivaldi.'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {browsers.map((b) => {
                        const active = settings.browser.id === b.id;
                        return (
                          <button
                            key={b.id}
                            disabled={!b.installed}
                            onClick={() => setSettings(prev => ({
                              ...prev,
                              browser: { ...prev.browser, id: b.id },
                            }))}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-lg border-2 text-sm transition-colors text-left ${
                              !b.installed
                                ? theme === 'dark'
                                  ? 'border-gray-700 bg-gray-800 text-gray-600 cursor-not-allowed'
                                  : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                                : active
                                  ? 'border-accent bg-accent-soft text-accent dark:bg-accent-soft dark:text-accent'
                                  : theme === 'dark'
                                    ? 'border-gray-700 bg-gray-800 text-gray-200 hover:border-gray-600'
                                    : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                            }`}
                          >
                            <span className="font-medium">{b.name}</span>
                            {!b.installed && (
                              <span className="text-xs opacity-70">
                                {language === 'ru' ? 'не установлен' : 'not installed'}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text">{t('settings.useExistingProfile')}</p>
                    <p className="text-sm text-text-muted">{t('settings.useExistingProfileDesc')}</p>
                  </div>
                  <Toggle
                    checked={settings.browser.useExistingProfile}
                    onChange={(v) =>
                      setSettings((prev) => ({
                        ...prev,
                        browser: { ...prev.browser, useExistingProfile: v },
                      }))
                    }
                    ariaLabel={t('settings.useExistingProfile')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text">{t('settings.headlessMode')}</p>
                    <p className="text-sm text-text-muted">{t('settings.headlessModeDesc')}</p>
                  </div>
                  <Toggle
                    checked={settings.browser.headless}
                    onChange={(v) =>
                      setSettings((prev) => ({
                        ...prev,
                        browser: { ...prev.browser, headless: v },
                      }))
                    }
                    ariaLabel={t('settings.headlessMode')}
                  />
                </div>
              </div>
            )}

            {activeSection === 'security' && (
              <div className="space-y-6">
                <h2 className={`text-lg font-semibold text-text`}>
                  {t('settings.security')}
                </h2>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text">{t('settings.requireConfirmation')}</p>
                    <p className="text-sm text-text-muted">{t('settings.requireConfirmationDesc')}</p>
                  </div>
                  <Toggle
                    checked={settings.security.requireConfirmation}
                    onChange={(v) =>
                      setSettings((prev) => ({
                        ...prev,
                        security: { ...prev.security, requireConfirmation: v },
                      }))
                    }
                    ariaLabel={t('settings.requireConfirmation')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text">{t('settings.auditLog')}</p>
                    <p className="text-sm text-text-muted">{t('settings.auditLogDesc')}</p>
                  </div>
                  <Toggle
                    checked={settings.security.auditLog}
                    onChange={(v) =>
                      setSettings((prev) => ({
                        ...prev,
                        security: { ...prev.security, auditLog: v },
                      }))
                    }
                    ariaLabel={t('settings.auditLog')}
                  />
                </div>
              </div>
            )}

            {activeSection === 'tools' && (
              <div className="space-y-6">
                <h2 className={`text-lg font-semibold text-text`}>
                  {t('settings.tools')}
                </h2>

                <div>
                  <label className={`block text-sm font-medium mb-2 text-text-muted`}>
                    {t('settings.workingDirectory')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={settings.tools.workingDirectory}
                      onChange={(e) =>
                        setSettings(prev => ({
                          ...prev,
                          tools: { ...prev.tools, workingDirectory: e.target.value },
                        }))
                      }
                      className={inputClass}
                    />
                    <button className={`px-4 py-2.5 rounded-lg ${
                      theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                    }`}>
                      <Folder className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 text-text-muted`}>
                    {t('settings.maxExecutionTime')}
                  </label>
                  <input
                    type="number"
                    value={settings.tools.maxExecutionTime}
                    onChange={(e) =>
                      setSettings(prev => ({
                        ...prev,
                        tools: { ...prev.tools, maxExecutionTime: parseInt(e.target.value) },
                      }))
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 text-text-muted`}>
                    {t('settings.defaultShell')}
                  </label>
                  <select
                    value={settings.tools.shell}
                    onChange={(e) =>
                      setSettings(prev => ({
                        ...prev,
                        tools: { ...prev.tools, shell: e.target.value },
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="bash">Bash</option>
                    <option value="zsh">Zsh</option>
                    <option value="powershell">PowerShell</option>
                    <option value="cmd">Command Prompt</option>
                  </select>
                </div>
              </div>
            )}

            {activeSection === 'appearance' && (
              <div className="space-y-6">
                <h2 className={`text-lg font-semibold text-text`}>
                  {t('settings.appearance')}
                </h2>

                {/* Theme Selection — three Feral-UI palettes */}
                <div>
                  <label className={`block text-sm font-medium mb-3 text-text-muted`}>
                    {t('settings.theme')}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {([
                      {
                        id: 'brand' as const,
                        label: t('settings.brandTheme'),
                        icon: Sparkles,
                        preview: 'linear-gradient(135deg, #EAF4FC 0%, #A5B7A5 55%, #5B6F57 100%)',
                      },
                      {
                        id: 'light' as const,
                        label: t('settings.lightTheme'),
                        icon: Sun,
                        preview: 'linear-gradient(135deg, #DDDBE0 0%, #A5B7A5 100%)',
                      },
                      {
                        id: 'dark' as const,
                        label: t('settings.darkTheme'),
                        icon: Moon,
                        preview: 'linear-gradient(135deg, #0D0D0D 0%, #707070 100%)',
                      },
                    ]).map((opt) => {
                      const Icon = opt.icon;
                      const active = theme === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setTheme(opt.id)}
                          className={`group flex flex-col gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                            active
                              ? 'border-accent shadow-glass'
                              : 'border-border hover:border-border-strong'
                          }`}
                        >
                          <div
                            className="h-16 w-full rounded-lg shadow-inner"
                            style={{ backgroundImage: opt.preview }}
                          />
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-accent" />
                            <span className="font-medium text-text">{opt.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Language Selection */}
                <div>
                  <label className={`block text-sm font-medium mb-3 text-text-muted`}>
                    {t('settings.language')}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setLanguage('en')}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
                        language === 'en'
                          ? 'border-accent bg-accent-soft dark:bg-accent-soft'
                          : theme === 'dark'
                            ? 'border-gray-600 bg-gray-700 hover:border-gray-500'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <Languages className={`w-6 h-6 ${language === 'en' ? 'text-accent' : 'text-text-muted'}`} />
                      <div className="text-left">
                        <p className={`font-medium ${language === 'en' ? 'text-accent' : 'text-text'}`}>
                          English
                        </p>
                        <p className={`text-xs text-text-muted`}>
                          EN
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => setLanguage('ru')}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
                        language === 'ru'
                          ? 'border-accent bg-accent-soft dark:bg-accent-soft'
                          : theme === 'dark'
                            ? 'border-gray-600 bg-gray-700 hover:border-gray-500'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <Languages className={`w-6 h-6 ${language === 'ru' ? 'text-accent' : 'text-text-muted'}`} />
                      <div className="text-left">
                        <p className={`font-medium ${language === 'ru' ? 'text-accent' : 'text-text'}`}>
                          Русский
                        </p>
                        <p className={`text-xs text-text-muted`}>
                          RU
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
