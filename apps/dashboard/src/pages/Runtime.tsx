import { useState, useEffect } from 'react';
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
  RefreshCw,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { api } from '../lib/api';

interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export default function RuntimePage() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [isRunning, setIsRunning] = useState(false);
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadTools() {
    setLoading(true);
    try {
      const health = await api.getHealth();
      setIsRunning(health.status === 'ok');
      
      const toolsList = await api.getTools();
      setTools(toolsList || []);
    } catch {
      setIsRunning(false);
      setTools([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTools();
  }, []);

  const cardClass = `rounded-xl border ${
    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  }`;

  const getPermissionMode = (name: string): 'auto' | 'confirm' => {
    // Read-only operations are auto-approved
    if (name.includes('read') || name.includes('status') || name.includes('diff') || name.includes('log') || name.includes('list')) {
      return 'auto';
    }
    // Write operations need confirmation
    return 'confirm';
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

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
          onClick={loadTools}
          className={`p-2 rounded-lg transition-colors ${
            theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
          }`}
        >
          <RefreshCw className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
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
                {tools.filter(t => getPermissionMode(t.name) === 'confirm').length}
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {t('runtime.permissions')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tools List */}
      {tools.length === 0 ? (
        <div className={`${cardClass} p-12 text-center`}>
          <Terminal className={`w-12 h-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            No tools registered. Start the server with --site flag.
          </p>
        </div>
      ) : (
        <div className={`${cardClass}`}>
          <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {t('runtime.tools')}
            </h2>
          </div>
          <div className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-100'}`}>
            {tools.map((tool) => {
              const permMode = getPermissionMode(tool.name);
              return (
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
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${getPermissionColor(permMode)}`}>
                    {getPermissionIcon(permMode)}
                    {t(`runtime.${permMode}`)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
