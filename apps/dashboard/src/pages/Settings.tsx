import { useState } from 'react';
import {
  Save,
  Globe,
  Shield,
  Monitor,
  Folder,
  Terminal,
  Sun,
  Moon,
  Languages,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [activeSection, setActiveSection] = useState('general');
  const [settings, setSettings] = useState({
    general: {
      serverPort: 3000,
      autoStart: true,
      minimizeToTray: true,
    },
    browser: {
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
  });

  const sections = [
    { id: 'general', title: t('settings.general'), description: t('settings.generalDesc'), icon: Monitor },
    { id: 'browser', title: t('settings.browser'), description: t('settings.browserDesc'), icon: Globe },
    { id: 'security', title: t('settings.security'), description: t('settings.securityDesc'), icon: Shield },
    { id: 'tools', title: t('settings.tools'), description: t('settings.toolsDesc'), icon: Terminal },
    { id: 'appearance', title: t('settings.appearance'), description: t('settings.appearanceDesc'), icon: theme === 'dark' ? Moon : Sun },
  ];

  const handleSave = () => {
    localStorage.setItem('bab-settings', JSON.stringify(settings));
    alert(language === 'ru' ? 'Настройки сохранены!' : 'Settings saved!');
  };

  const inputClass = `w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
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
          <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {t('settings.title')}
          </h1>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            {t('settings.subtitle')}
          </p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          <Save className="w-4 h-4" />
          {t('settings.save')}
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
                      ? 'bg-primary-900 text-primary-300'
                      : 'bg-primary-50 text-primary-700'
                    : theme === 'dark'
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <section.icon className="w-5 h-5" />
                <div>
                  <p className="font-medium">{section.title}</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
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
                <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {t('settings.general')}
                </h2>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
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
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {t('settings.autoStart')}
                    </p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {t('settings.autoStartDesc')}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setSettings(prev => ({
                        ...prev,
                        general: { ...prev.general, autoStart: !prev.general.autoStart },
                      }))
                    }
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.general.autoStart ? 'bg-primary-500' : theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.general.autoStart ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {t('settings.minimizeToTray')}
                    </p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {t('settings.minimizeToTrayDesc')}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setSettings(prev => ({
                        ...prev,
                        general: { ...prev.general, minimizeToTray: !prev.general.minimizeToTray },
                      }))
                    }
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.general.minimizeToTray ? 'bg-primary-500' : theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.general.minimizeToTray ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {activeSection === 'browser' && (
              <div className="space-y-6">
                <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {t('settings.browser')}
                </h2>

                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {t('settings.useExistingProfile')}
                    </p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {t('settings.useExistingProfileDesc')}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setSettings(prev => ({
                        ...prev,
                        browser: { ...prev.browser, useExistingProfile: !prev.browser.useExistingProfile },
                      }))
                    }
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.browser.useExistingProfile ? 'bg-primary-500' : theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.browser.useExistingProfile ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {t('settings.headlessMode')}
                    </p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {t('settings.headlessModeDesc')}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setSettings(prev => ({
                        ...prev,
                        browser: { ...prev.browser, headless: !prev.browser.headless },
                      }))
                    }
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.browser.headless ? 'bg-primary-500' : theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.browser.headless ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {activeSection === 'security' && (
              <div className="space-y-6">
                <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {t('settings.security')}
                </h2>

                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {t('settings.requireConfirmation')}
                    </p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {t('settings.requireConfirmationDesc')}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setSettings(prev => ({
                        ...prev,
                        security: { ...prev.security, requireConfirmation: !prev.security.requireConfirmation },
                      }))
                    }
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.security.requireConfirmation ? 'bg-primary-500' : theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.security.requireConfirmation ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {t('settings.auditLog')}
                    </p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {t('settings.auditLogDesc')}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setSettings(prev => ({
                        ...prev,
                        security: { ...prev.security, auditLog: !prev.security.auditLog },
                      }))
                    }
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.security.auditLog ? 'bg-primary-500' : theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.security.auditLog ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {activeSection === 'tools' && (
              <div className="space-y-6">
                <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {t('settings.tools')}
                </h2>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
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
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
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
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
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
                <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {t('settings.appearance')}
                </h2>

                {/* Theme Selection */}
                <div>
                  <label className={`block text-sm font-medium mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {t('settings.theme')}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setTheme('light')}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
                        theme === 'light'
                          ? 'border-primary-500 bg-primary-50'
                          : theme === 'dark'
                            ? 'border-gray-600 bg-gray-700 hover:border-gray-500'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <Sun className={`w-6 h-6 ${theme === 'light' ? 'text-primary-600' : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                      <div className="text-left">
                        <p className={`font-medium ${theme === 'light' ? 'text-primary-700' : theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {t('settings.lightTheme')}
                        </p>
                        <div className={`mt-1 w-full h-2 rounded-full ${theme === 'light' ? 'bg-gray-200' : 'bg-gray-600'}`}>
                          <div className="w-1/2 h-full bg-white rounded-full shadow-sm" />
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
                        theme === 'dark'
                          ? 'border-primary-500 bg-primary-900'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <Moon className={`w-6 h-6 ${theme === 'dark' ? 'text-primary-400' : 'text-gray-600'}`} />
                      <div className="text-left">
                        <p className={`font-medium ${theme === 'dark' ? 'text-primary-300' : 'text-gray-900'}`}>
                          {t('settings.darkTheme')}
                        </p>
                        <div className={`mt-1 w-full h-2 rounded-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
                          <div className={`w-1/2 h-full rounded-full shadow-sm ml-auto ${theme === 'dark' ? 'bg-gray-500' : 'bg-gray-400'}`} />
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Language Selection */}
                <div>
                  <label className={`block text-sm font-medium mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {t('settings.language')}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setLanguage('en')}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
                        language === 'en'
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900'
                          : theme === 'dark'
                            ? 'border-gray-600 bg-gray-700 hover:border-gray-500'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <Languages className={`w-6 h-6 ${language === 'en' ? 'text-primary-600' : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                      <div className="text-left">
                        <p className={`font-medium ${language === 'en' ? 'text-primary-700 dark:text-primary-300' : theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          English
                        </p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          EN
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => setLanguage('ru')}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
                        language === 'ru'
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900'
                          : theme === 'dark'
                            ? 'border-gray-600 bg-gray-700 hover:border-gray-500'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <Languages className={`w-6 h-6 ${language === 'ru' ? 'text-primary-600' : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                      <div className="text-left">
                        <p className={`font-medium ${language === 'ru' ? 'text-primary-700 dark:text-primary-300' : theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          Русский
                        </p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
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
