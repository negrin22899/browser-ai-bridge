import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'ru';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.providers': 'Providers',
    'nav.sessions': 'Sessions',
    'nav.runtime': 'Runtime',
    'nav.logs': 'Logs',
    'nav.extensions': 'Extensions',
    'nav.settings': 'Settings',

    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': 'Welcome to Browser AI Bridge',
    'dashboard.totalRequests': 'Total Requests',
    'dashboard.activeSessions': 'Active Sessions',
    'dashboard.activeProviders': 'Active Providers',
    'dashboard.uptime': 'Uptime',
    'dashboard.recentActivity': 'Recent Activity',
    'dashboard.systemStatus': 'System Status',
    'dashboard.runtimeReady': 'Runtime Ready',
    'dashboard.toolsRegistered': 'Tools Registered',
    'dashboard.permissionsActive': 'Permissions Active',

    // Providers
    'providers.title': 'Providers',
    'providers.subtitle': 'Connect and manage AI providers',
    'providers.add': 'Add Provider',
    'providers.connect': 'Connect',
    'providers.disconnect': 'Disconnect',
    'providers.connected': 'Connected',
    'providers.disconnected': 'Disconnected',
    'providers.connecting': 'Connecting...',
    'providers.error': 'Error',
    'providers.healthCheck': 'Health Check',
    'providers.healthy': 'Healthy',
    'providers.unhealthy': 'Unhealthy',
    'providers.type': 'Type',
    'providers.browser': 'Browser',
    'providers.api': 'API',
    'providers.status': 'Status',

    // Sessions
    'sessions.title': 'Sessions',
    'sessions.subtitle': 'Manage conversation sessions',
    'sessions.new': 'New Session',
    'sessions.active': 'Active',
    'sessions.closed': 'Closed',
    'sessions.messages': 'Messages',
    'sessions.provider': 'Provider',
    'sessions.created': 'Created',
    'sessions.lastActivity': 'Last Activity',
    'sessions.noSessions': 'No sessions yet',

    // Runtime
    'runtime.title': 'Runtime',
    'runtime.subtitle': 'Runtime engine status and tools',
    'runtime.status': 'Status',
    'runtime.running': 'Running',
    'runtime.stopped': 'Stopped',
    'runtime.tools': 'Registered Tools',
    'runtime.permissions': 'Permission Rules',
    'runtime.start': 'Start Runtime',
    'runtime.stop': 'Stop Runtime',
    'runtime.autoApprove': 'Auto Approve',
    'runtime.confirm': 'Confirm',
    'runtime.deny': 'Deny',

    // Logs
    'logs.title': 'Logs',
    'logs.subtitle': 'Audit log and system events',
    'logs.clear': 'Clear Logs',
    'logs.export': 'Export',
    'logs.filter': 'Filter',
    'logs.all': 'All',
    'logs.tool': 'Tool',
    'logs.permission': 'Permission',
    'logs.session': 'Session',
    'logs.noLogs': 'No logs yet',

    // Extensions
    'extensions.title': 'Extensions',
    'extensions.subtitle': 'Manage plugins and extensions',
    'extensions.install': 'Install',
    'extensions.uninstall': 'Uninstall',
    'extensions.enabled': 'Enabled',
    'extensions.disabled': 'Disabled',
    'extensions.noExtensions': 'No extensions installed',

    // Settings
    'settings.title': 'Settings',
    'settings.subtitle': 'Configure Browser AI Bridge',
    'settings.save': 'Save Changes',
    'settings.general': 'General',
    'settings.generalDesc': 'Basic application settings',
    'settings.browser': 'Browser',
    'settings.browserDesc': 'Browser automation settings',
    'settings.security': 'Security',
    'settings.securityDesc': 'Permissions and security settings',
    'settings.tools': 'Tools',
    'settings.toolsDesc': 'Local tools configuration',
    'settings.appearance': 'Appearance',
    'settings.appearanceDesc': 'Theme and language settings',
    'settings.serverPort': 'Server Port',
    'settings.autoStart': 'Auto Start',
    'settings.autoStartDesc': 'Start server when application launches',
    'settings.minimizeToTray': 'Minimize to Tray',
    'settings.minimizeToTrayDesc': 'Keep running in background when closed',
    'settings.useExistingProfile': 'Use Existing Browser Profile',
    'settings.useExistingProfileDesc': 'Use your current Chrome profile with all logins',
    'settings.headlessMode': 'Headless Mode',
    'settings.headlessModeDesc': 'Run browser without visible window',
    'settings.requireConfirmation': 'Require Confirmation',
    'settings.requireConfirmationDesc': 'Ask before executing dangerous commands',
    'settings.auditLog': 'Audit Log',
    'settings.auditLogDesc': 'Log all tool executions for security',
    'settings.workingDirectory': 'Working Directory',
    'settings.maxExecutionTime': 'Max Execution Time (ms)',
    'settings.defaultShell': 'Default Shell',
    'settings.theme': 'Theme',
    'settings.language': 'Language',
    'settings.lightTheme': 'Light',
    'settings.darkTheme': 'Dark',
    'settings.english': 'English',
    'settings.russian': 'Russian',

    // Status
    'status.serverRunning': 'Server running',
    'status.success': 'success',
    'status.viewAll': 'View all',
  },
  ru: {
    // Navigation
    'nav.dashboard': 'Главная',
    'nav.providers': 'Провайдеры',
    'nav.sessions': 'Сессии',
    'nav.runtime': 'Рантайм',
    'nav.logs': 'Логи',
    'nav.extensions': 'Расширения',
    'nav.settings': 'Настройки',

    // Dashboard
    'dashboard.title': 'Главная',
    'dashboard.welcome': 'Добро пожаловать в Browser AI Bridge',
    'dashboard.totalRequests': 'Всего запросов',
    'dashboard.activeSessions': 'Активные сессии',
    'dashboard.activeProviders': 'Активные провайдеры',
    'dashboard.uptime': 'Время работы',
    'dashboard.recentActivity': 'Недавняя активность',
    'dashboard.systemStatus': 'Состояние системы',
    'dashboard.runtimeReady': 'Рантайм готов',
    'dashboard.toolsRegistered': 'Инструментов',
    'dashboard.permissionsActive': 'Активных прав',

    // Providers
    'providers.title': 'Провайдеры',
    'providers.subtitle': 'Подключение и управление AI провайдерами',
    'providers.add': 'Добавить провайдер',
    'providers.connect': 'Подключить',
    'providers.disconnect': 'Отключить',
    'providers.connected': 'Подключен',
    'providers.disconnected': 'Отключен',
    'providers.connecting': 'Подключение...',
    'providers.error': 'Ошибка',
    'providers.healthCheck': 'Проверка здоровья',
    'providers.healthy': 'Здоров',
    'providers.unhealthy': 'Нездоров',
    'providers.type': 'Тип',
    'providers.browser': 'Браузер',
    'providers.api': 'API',
    'providers.status': 'Статус',

    // Sessions
    'sessions.title': 'Сессии',
    'sessions.subtitle': 'Управление сессиями разговоров',
    'sessions.new': 'Новая сессия',
    'sessions.active': 'Активные',
    'sessions.closed': 'Закрытые',
    'sessions.messages': 'Сообщений',
    'sessions.provider': 'Провайдер',
    'sessions.created': 'Создана',
    'sessions.lastActivity': 'Последняя активность',
    'sessions.noSessions': 'Сессий пока нет',

    // Runtime
    'runtime.title': 'Рантайм',
    'runtime.subtitle': 'Состояние рантайм движка и инструментов',
    'runtime.status': 'Статус',
    'runtime.running': 'Работает',
    'runtime.stopped': 'Остановлен',
    'runtime.tools': 'Зарегистрированные инструменты',
    'runtime.permissions': 'Правила разрешений',
    'runtime.start': 'Запустить рантайм',
    'runtime.stop': 'Остановить рантайм',
    'runtime.autoApprove': 'Авто-одобрение',
    'runtime.confirm': 'Подтверждение',
    'runtime.deny': 'Запрет',

    // Logs
    'logs.title': 'Логи',
    'logs.subtitle': 'Аудит лог и системные события',
    'logs.clear': 'Очистить логи',
    'logs.export': 'Экспорт',
    'logs.filter': 'Фильтр',
    'logs.all': 'Все',
    'logs.tool': 'Инструмент',
    'logs.permission': 'Разрешение',
    'logs.session': 'Сессия',
    'logs.noLogs': 'Логов пока нет',

    // Extensions
    'extensions.title': 'Расширения',
    'extensions.subtitle': 'Управление плагинами и расширениями',
    'extensions.install': 'Установить',
    'extensions.uninstall': 'Удалить',
    'extensions.enabled': 'Включено',
    'extensions.disabled': 'Отключено',
    'extensions.noExtensions': 'Расширения не установлены',

    // Settings
    'settings.title': 'Настройки',
    'settings.subtitle': 'Настройка Browser AI Bridge',
    'settings.save': 'Сохранить изменения',
    'settings.general': 'Общие',
    'settings.generalDesc': 'Основные настройки приложения',
    'settings.browser': 'Браузер',
    'settings.browserDesc': 'Настройки автоматизации браузера',
    'settings.security': 'Безопасность',
    'settings.securityDesc': 'Настройки разрешений и безопасности',
    'settings.tools': 'Инструменты',
    'settings.toolsDesc': 'Конфигурация локальных инструментов',
    'settings.appearance': 'Внешний вид',
    'settings.appearanceDesc': 'Настройки темы и языка',
    'settings.serverPort': 'Порт сервера',
    'settings.autoStart': 'Автозапуск',
    'settings.autoStartDesc': 'Запускать сервер при старте приложения',
    'settings.minimizeToTray': 'Сворачивать в трей',
    'settings.minimizeToTrayDesc': 'Продолжать работу в фоне при закрытии',
    'settings.useExistingProfile': 'Использовать существующий профиль',
    'settings.useExistingProfileDesc': 'Использовать текущий профиль Chrome с сохранёнными входами',
    'settings.headlessMode': 'Фоновый режим',
    'settings.headlessModeDesc': 'Запускать браузер без видимого окна',
    'settings.requireConfirmation': 'Требовать подтверждение',
    'settings.requireConfirmationDesc': 'Спрашивать перед выполнением опасных команд',
    'settings.auditLog': 'Аудит лог',
    'settings.auditLogDesc': 'Логировать все выполнения инструментов',
    'settings.workingDirectory': 'Рабочая директория',
    'settings.maxExecutionTime': 'Макс. время выполнения (мс)',
    'settings.defaultShell': 'Оболочка по умолчанию',
    'settings.theme': 'Тема',
    'settings.language': 'Язык',
    'settings.lightTheme': 'Светлая',
    'settings.darkTheme': 'Тёмная',
    'settings.english': 'Английский',
    'settings.russian': 'Русский',

    // Status
    'status.serverRunning': 'Сервер работает',
    'status.success': 'успешно',
    'status.viewAll': 'Показать все',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  // Load language on mount
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        if (isElectron()) {
          const settings = await window.electronAPI!.loadSettings();
          if (settings?.language) {
            setLanguageState(settings.language as Language);
            return;
          }
        }
        const saved = localStorage.getItem('language');
        if (saved) {
          setLanguageState(saved as Language);
        }
      } catch (e) {
        console.error('Failed to load language:', e);
      }
    };
    loadLanguage();
  }, []);

  // Save language when it changes
  useEffect(() => {
    document.documentElement.lang = language;

    const saveLanguage = async () => {
      try {
        localStorage.setItem('language', language);
        if (isElectron()) {
          const settings = await window.electronAPI!.loadSettings() || {};
          settings.language = language;
          await window.electronAPI!.saveSettings(settings);
        }
      } catch (e) {
        console.error('Failed to save language:', e);
      }
    };
    saveLanguage();
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
