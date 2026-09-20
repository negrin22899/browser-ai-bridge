import { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle,
  XCircle,
  Shield,
  Terminal,
  FileText,
  GitBranch,
  RefreshCw,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { api } from '../lib/api';
import { NumberPopIn } from '../components/motion';

interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export default function RuntimePage() {
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

  const cardClass = 'rounded-xl glass';

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
      case 'auto': return 'bg-success/15 text-success';
      case 'confirm': return 'bg-warning/15 text-warning';
      case 'deny': return 'bg-danger/15 text-danger';
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
        <RefreshCw className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className={`text-2xl font-bold text-text`}>
            {t('runtime.title')}
          </h1>
          <p className="text-text-muted">
            {t('runtime.subtitle')}
          </p>
        </div>
        <button
          onClick={loadTools}
          className={`p-2 rounded-lg transition-colors hover:bg-surface-inset`}
        >
          <RefreshCw className={`w-5 h-5 text-text-muted`} />
        </button>
      </div>

      {/* Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`${cardClass} p-4`}>
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isRunning ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
              }`}
            >
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-lg font-display leading-none text-text">
                {isRunning ? t('runtime.running') : t('runtime.stopped')}
              </p>
              <p className="text-sm text-text-muted mt-1">
                {t('runtime.status')}
              </p>
            </div>
          </div>
        </div>
        <div className={`${cardClass} p-4`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-accent-soft text-accent">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-display leading-none text-text">
                <NumberPopIn value={tools.length} />
              </p>
              <p className="text-sm text-text-muted mt-1">
                {t('runtime.tools')}
              </p>
            </div>
          </div>
        </div>
        <div className={`${cardClass} p-4`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-warning/15 text-warning">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-display leading-none text-text">
                <NumberPopIn value={tools.filter((t) => getPermissionMode(t.name) === 'confirm').length} />
              </p>
              <p className="text-sm text-text-muted mt-1">
                {t('runtime.permissions')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tools List */}
      {tools.length === 0 ? (
        <div className={`${cardClass} p-12 text-center`}>
          <Terminal className={`w-12 h-12 mx-auto mb-4 text-text-subtle`} />
          <p className="text-text-muted">
            No tools registered. Start the server with --site flag.
          </p>
        </div>
      ) : (
        <div className={`${cardClass}`}>
          <div className={`px-6 py-4 border-b border-border`}>
            <h2 className={`text-lg font-semibold text-text`}>
              {t('runtime.tools')}
            </h2>
          </div>
          <div className={`divide-y divide-border`}>
            {tools.map((tool) => {
              const permMode = getPermissionMode(tool.name);
              return (
                <div key={tool.name} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-surface-inset`}>
                      {getToolIcon(tool.name)}
                    </div>
                    <div>
                      <p className={`font-medium text-text`}>
                        {tool.name}
                      </p>
                      <p className={`text-sm text-text-muted`}>
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
