import { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Clock,
  Server,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface Session {
  id: string;
  providerId: string;
  providerName: string;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
  status: 'active' | 'closed';
}

const mockSessions: Session[] = [
  {
    id: '1',
    providerId: 'gemini',
    providerName: 'Gemini',
    messageCount: 12,
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 300000,
    status: 'active',
  },
  {
    id: '2',
    providerId: 'chatgpt',
    providerName: 'ChatGPT',
    messageCount: 8,
    createdAt: Date.now() - 7200000,
    updatedAt: Date.now() - 600000,
    status: 'active',
  },
  {
    id: '3',
    providerId: 'claude',
    providerName: 'Claude',
    messageCount: 24,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 3600000,
    status: 'closed',
  },
];

export default function Sessions() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [sessions] = useState(mockSessions);

  const cardClass = `rounded-xl border ${
    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  }`;

  const activeSessions = sessions.filter(s => s.status === 'active');

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

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
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600">
          <Plus className="w-4 h-4" />
          {t('sessions.new')}
        </button>
      </div>

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
                {activeSessions.length}
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
                {sessions.reduce((sum, s) => sum + s.messageCount, 0)}
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
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            {t('sessions.noSessions')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div key={session.id} className={`${cardClass} p-4 hover:shadow-md transition-shadow`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    session.status === 'active'
                      ? theme === 'dark' ? 'bg-green-900' : 'bg-green-50'
                      : theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    <MessageSquare className={`w-5 h-5 ${
                      session.status === 'active'
                        ? theme === 'dark' ? 'text-green-400' : 'text-green-600'
                        : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {session.providerName}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        session.status === 'active'
                          ? 'bg-green-50 text-green-700'
                          : theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {session.status === 'active' ? t('sessions.active') : t('sessions.closed')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className={`text-xs flex items-center gap-1 ${
                        theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                        <MessageSquare className="w-3 h-3" />
                        {session.messageCount} {t('sessions.messages')}
                      </span>
                      <span className={`text-xs flex items-center gap-1 ${
                        theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                        <Clock className="w-3 h-3" />
                        {formatRelative(session.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button className={`p-2 rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button className={`p-2 rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700'
                      : 'text-gray-400 hover:text-red-600 hover:bg-gray-100'
                  }`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
