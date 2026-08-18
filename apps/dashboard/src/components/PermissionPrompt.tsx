import { useEffect, useState, useCallback } from 'react';
import { ShieldAlert, Check, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useBabEvents } from '../hooks/useBabEvents';
import { api, type PendingPermission } from '../lib/api';

const POLL_INTERVAL_MS = 1500;
const MAX_PARAMS_CHARS = 500;

export default function PermissionPrompt() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [pending, setPending] = useState<PendingPermission[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await api.getPendingPermissions();
      setPending(res.data || []);
    } catch {
      // Server not reachable yet — keep polling silently.
    }
  }, []);

  useEffect(() => {
    poll();
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [poll]);

  useBabEvents((type) => {
    if (type.startsWith('permission.')) {
      poll();
    }
  });

  const act = async (id: string, action: () => Promise<unknown>) => {
    setBusyId(id);
    try {
      await action();
    } catch {
      // The next poll will resync the list.
    } finally {
      setBusyId(null);
    }
    poll();
  };

  if (pending.length === 0) return null;

  const formatParams = (params: Record<string, unknown>): string => {
    const text = JSON.stringify(params, null, 2);
    return text.length > MAX_PARAMS_CHARS ? text.slice(0, MAX_PARAMS_CHARS) + '\n…' : text;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50">
      <div
        className={`w-full max-w-lg rounded-xl border shadow-2xl p-6 space-y-4 ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {t('permission.title')}
            </h2>
            <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              {pending.length === 1 ? '1 request' : `${pending.length} requests`}
            </p>
          </div>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {pending.map((req) => (
            <div
              key={req.id}
              className={`rounded-lg border p-4 ${
                theme === 'dark' ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`font-mono text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {req.toolName}
                </span>
                <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                  {t('permission.session')}: {req.sessionId.slice(0, 8)}…
                </span>
              </div>

              <pre
                className={`text-xs rounded p-3 overflow-x-auto mb-3 whitespace-pre-wrap ${
                  theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {formatParams(req.params)}
              </pre>

              <div className="flex gap-2">
                <button
                  disabled={busyId === req.id}
                  onClick={() => act(req.id, () => api.approvePermission(req.id, 'once'))}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {t('permission.allowOnce')}
                </button>
                <button
                  disabled={busyId === req.id}
                  onClick={() => act(req.id, () => api.approvePermission(req.id, 'session'))}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                    theme === 'dark'
                      ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t('permission.allowSession')}
                </button>
                <button
                  disabled={busyId === req.id}
                  onClick={() => act(req.id, () => api.denyPermission(req.id))}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                    theme === 'dark'
                      ? 'bg-red-900/40 text-red-300 hover:bg-red-900/60'
                      : 'bg-red-50 text-red-600 hover:bg-red-100'
                  }`}
                >
                  <X className="w-4 h-4" />
                  {t('permission.deny')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
