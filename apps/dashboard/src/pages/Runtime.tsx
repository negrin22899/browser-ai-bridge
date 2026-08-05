import { useState } from 'react';
import {
  Activity,
  Play,
  Square,
  CheckCircle,
  XCircle,
  Shield,
  Terminal,
  FileText,
  GitBranch,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface Tool {
  name: string;
  description: string;
  permissionMode: 'auto' | 'confirm' | 'deny';
}

const mockTools: Tool[] = [
  { name: 'fs.read', description: 'Read file contents', permissionMode: 'auto' },
  { name: 'fs.write', description: 'Write file contents', permissionMode: 'confirm' },
  { name: 'fs.list', description: 'List directory', permissionMode: 'auto' },
  { name: 'fs.delete', description: 'Delete file', permissionMode: 'confirm' },
  { name: 'git.status', description: 'Git status', permissionMode: 'auto' },
  { name: 'git.diff', description: 'Git diff', permissionMode: 'auto' },
  { name: 'git.commit', description: 'Git commit', permissionMode: 'confirm' },
  { name: 'git.push', description: 'Git push', permissionMode: 'confirm' },
  { name: 'shell.exec', description: 'Execute shell command', permissionMode: 'confirm' },
];

export default function RuntimePage() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [isRunning, setIsRunning] = useState(true);
  const [tools] = useState(mockTools);

  const cardClass = `rounded-xl border ${
    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  }`;

  const getPermissionColor = (mode: string) => {
    switch (mode) {
      case 'auto': return 'bg-green-50 text-green-700';
      case 'confirm': return 'bg-yellow-50 text-yellow-700';
      case 'deny': return 'bg-red-50 text-red-700';
      default: return '';
    }
  };

  const getPermissionIcon = (mode: string) => {
    switch (mode) {
      case 'auto': return <CheckCircle className="w-4 h-4" />;
      case 'confirm': return <Shield className="w-4 h-4" />;
      case 'deny': return <XCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const getToolIcon = (name: string) => {
    if (name.startsWith('fs.')) return <FileText className="w-5 h-5" />;
    if (name.startsWith('git.')) return <GitBranch className="w-5 h-5" />;
    if (name.startsWith('shell.')) return <Terminal className="w-5 h-5" />;
    return <Activity className="w-5 h-5" />;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {t('runtime.title')}
          </h1>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            {t('runtime.subtitle')}
          </p>
        </div>
        <button
          onClick={() => setIsRunning(!isRunning)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium ${
            isRunning
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-green-500 text-white hover:bg-green-600'
          }`}
        >
          {isRunning ? (
            <>
              <Square className="w-4 h-4" />
              {t('runtime.stop')}
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              {t('runtime.start')}
            </>
          )}
        </button>
      </div>

      {/* Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`${cardClass} p-4`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isRunning
                ? theme === 'dark' ? 'bg-green-900' : 'bg-green-50'
                : theme === 'dark' ? 'bg-red-900' : 'bg-red-50'
            }`}>
              <Activity className={`w-5 h-5 ${
                isRunning
                  ? theme === 'dark' ? 'text-green-400' : 'text-green-600'
                  : theme === 'dark' ? 'text-red-400' : 'text-red-600'
              }`} />
            </div>
            <div>
              <p className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {isRunning ? t('runtime.running') : t('runtime.stopped')}
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {t('runtime.status')}
              </p>
            </div>
          </div>
        </div>
        <div className={`${cardClass} p-4`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              theme === 'dark' ? 'bg-blue-900' : 'bg-blue-50'
            }`}>
              <Terminal className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {tools.length}
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {t('runtime.tools')}
              </p>
            </div>
          </div>
        </div>
        <div className={`${cardClass} p-4`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              theme === 'dark' ? 'bg-purple-900' : 'bg-purple-50'
            }`}>
              <Shield className={`w-5 h-5 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {tools.filter(t => t.permissionMode === 'confirm').length}
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {t('runtime.permissions')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tools List */}
      <div className={`${cardClass}`}>
        <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {t('runtime.tools')}
          </h2>
        </div>
        <div className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-100'}`}>
          {tools.map((tool) => (
            <div key={tool.name} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                }`}>
                  {getToolIcon(tool.name)}
                </div>
                <div>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tool.name}
                  </p>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {tool.description}
                  </p>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${getPermissionColor(tool.permissionMode)}`}>
                {getPermissionIcon(tool.permissionMode)}
                {t(`runtime.${tool.permissionMode}`)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
