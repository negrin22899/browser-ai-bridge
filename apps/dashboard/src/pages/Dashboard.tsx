import {
  Activity,
  MessageSquare,
  Server,
  Clock,
  CheckCircle,
  Terminal,
  Shield,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function Dashboard() {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const stats = [
    { name: t('dashboard.totalRequests'), value: '1,234', icon: Activity, change: '+12%' },
    { name: t('dashboard.activeSessions'), value: '3', icon: MessageSquare, change: '+1' },
    { name: t('dashboard.activeProviders'), value: '2', icon: Server, change: 'Online' },
    { name: t('dashboard.uptime'), value: '2h 34m', icon: Clock, change: '99.9%' },
  ];

  const systemStatus = [
    { name: t('dashboard.runtimeReady'), status: true },
    { name: t('dashboard.toolsRegistered'), value: '9', status: true },
    { name: t('dashboard.permissionsActive'), value: '5', status: true },
  ];

  const recentActivity = [
    { id: 1, type: 'tool', tool: 'fs.read', result: 'allowed', time: '2 min ago' },
    { id: 2, type: 'permission', tool: 'fs.write', result: 'denied', time: '5 min ago' },
    { id: 3, type: 'tool', tool: 'git.status', result: 'allowed', time: '10 min ago' },
    { id: 4, type: 'tool', tool: 'shell.exec', result: 'denied', time: '15 min ago' },
  ];

  const cardClass = `rounded-xl border ${
    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  }`;

  return (
    <div>
      <div className="mb-8">
        <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {t('dashboard.title')}
        </h1>
        <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
          {t('dashboard.welcome')}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className={`${cardClass} p-6 hover:shadow-md transition-shadow`}>
            <div className="flex items-center justify-between">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                theme === 'dark' ? 'bg-primary-900' : 'bg-primary-50'
              }`}>
                <stat.icon className={`w-6 h-6 ${theme === 'dark' ? 'text-primary-400' : 'text-primary-600'}`} />
              </div>
              <span className="text-sm font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                {stat.change}
              </span>
            </div>
            <div className="mt-4">
              <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {stat.value}
              </p>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {stat.name}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Status */}
        <div className={`${cardClass}`}>
          <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {t('dashboard.systemStatus')}
            </h2>
          </div>
          <div className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-100'}`}>
            {systemStatus.map((item) => (
              <div key={item.name} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className={`w-5 h-5 ${item.status ? 'text-green-500' : 'text-red-500'}`} />
                  <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                    {item.name}
                  </span>
                </div>
                {item.value && (
                  <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {item.value}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className={`lg:col-span-2 ${cardClass}`}>
          <div className={`px-6 py-4 border-b flex items-center justify-between ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {t('dashboard.recentActivity')}
            </h2>
            <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              {t('status.viewAll')}
            </button>
          </div>
          <div className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-100'}`}>
            {recentActivity.map((activity) => (
              <div key={activity.id} className={`px-6 py-4 flex items-center justify-between ${
                theme === 'dark' ? 'hover:bg-gray-750' : 'hover:bg-gray-50'
              }`}>
                <div className="flex items-center gap-3">
                  {activity.result === 'allowed' ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <Shield className="w-5 h-5 text-red-500" />
                  )}
                  <div>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {activity.tool}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      {activity.type}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    activity.result === 'allowed'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}>
                    {activity.result}
                  </span>
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                    {activity.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
