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
    'nav.debugger': 'Debugger',
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

    // Integrations
    'integrations.title': 'Integrations',
    'integrations.subtitle': 'Connect to browser AI providers',
    'integrations.connected': 'Connected',
    'integrations.available': 'Available',
    'integrations.apiKeys': 'API keys used',
    'integrations.search': 'Search integrations...',
    'integrations.connect': 'Connect',

    // Chat
    'chat.title': 'Chat',
    'chat.subtitle': 'Talk to your browser AI',
    'chat.placeholder': 'Type a message...',
    'chat.thinking': 'Thinking...',
    'chat.quickActions': 'Quick actions:',
    'chat.readFile': 'Read a file',
    'chat.gitStatus': 'Git status',
    'chat.runCommand': 'Run a command',
    'chat.history': 'History',
    'chat.noHistory': 'No history yet',
    'chat.new': 'New chat',

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

    // Debugger
    'debugger.title': 'AI Debugger',
    'debugger.subtitle': 'Live tool-loop timeline — watch what the AI does step by step',
    'debugger.pause': 'Pause',
    'debugger.resume': 'Resume',
    'debugger.clear': 'Clear',
    'debugger.empty': 'No events yet. Send a chat request and watch the tool loop unfold here.',

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

    // Permissions
    'permission.title': 'AI requests permission',
    'permission.tool': 'Tool',
    'permission.session': 'Session',
    'permission.params': 'Parameters',
    'permission.allowOnce': 'Allow once',
    'permission.allowSession': 'This session',
    'permission.deny': 'Deny',

    // Onboarding
    'onboarding.welcomeTitle': 'Welcome to Browser AI Bridge',
    'onboarding.welcomeText': 'Use your logged-in browser AI (Gemini, ChatGPT, Claude, DeepSeek) instead of paying for API keys — right inside your favorite IDE.',
    'onboarding.getStarted': 'Get started',
    'onboarding.chooseProvider': 'Choose a provider',
    'onboarding.chooseProviderText': 'Pick the AI you already use. You can add more later.',
    'onboarding.chooseModel': 'Choose a model',
    'onboarding.chooseModelText': 'This will be your default model.',
    'onboarding.model': 'Model',
    'onboarding.modelPlaceholder': 'e.g. gpt-4o',
    'onboarding.back': 'Back',
    'onboarding.done': 'Finish',

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
    'nav.debugger': 'Отладчик',
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

    // Integrations
    'integrations.title': 'Интеграции',
    'integrations.subtitle': 'Подключение к браузерным AI провайдерам',
    'integrations.connected': 'Подключено',
    'integrations.available': 'Доступно',
    'integrations.apiKeys': 'Использовано API-ключей',
    'integrations.search': 'Поиск интеграций...',
    'integrations.connect': 'Подключить',

    // Chat
    'chat.title': 'Чат',
    'chat.subtitle': 'Общение с твоим браузерным AI',
    'chat.placeholder': 'Напиши сообщение...',
    'chat.thinking': 'Думаю...',
    'chat.quickActions': 'Быстрые действия:',
    'chat.readFile': 'Прочитать файл',
    'chat.gitStatus': 'Статус git',
    'chat.runCommand': 'Выполнить команду',
    'chat.history': 'История',
    'chat.noHistory': 'Истории пока нет',
    'chat.new': 'Новый чат',

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

    // Debugger
    'debugger.title': 'AI Отладчик',
    'debugger.subtitle': 'Живой timeline tool-loop — смотри, что AI делает по шагам',
    'debugger.pause': 'Пауза',
    'debugger.resume': 'Продолжить',
    'debugger.clear': 'Очистить',
    'debugger.empty': 'Событий пока нет. Отправь запрос в чат и смотри, как разворачивается tool-loop.',

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

    // Permissions
    'permission.title': 'AI запрашивает разрешение',
    'permission.tool': 'Инструмент',
    'permission.session': 'Сессия',
    'permission.params': 'Параметры',
    'permission.allowOnce': 'Разрешить (1 раз)',
    'permission.allowSession': 'На сессию',
    'permission.deny': 'Отклонить',

    // Onboarding
    'onboarding.welcomeTitle': 'Добро пожаловать в Browser AI Bridge',
    'onboarding.welcomeText': 'Используй залогиненный браузерный AI (Gemini, ChatGPT, Claude, DeepSeek) вместо оплаты API-ключей — прямо внутри твоей IDE.',
    'onboarding.getStarted': 'Начать',
    'onboarding.chooseProvider': 'Выбери провайдера',
    'onboarding.chooseProviderText': 'Выбери AI, которым уже пользуешься. Потом можно добавить ещё.',
    'onboarding.chooseModel': 'Выбери модель',
    'onboarding.chooseModelText': 'Это будет твоя модель по умолчанию.',
    'onboarding.model': 'Модель',
    'onboarding.modelPlaceholder': 'например, gpt-4o',
    'onboarding.back': 'Назад',
    'onboarding.done': 'Готово',

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
