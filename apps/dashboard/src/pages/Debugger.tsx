import { useState } from 'react';
import { Trash2, Bug, Play, Check, X, Wrench, Repeat, Flag, Cpu } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useBabEvents } from '../hooks/useBabEvents';

interface TimelineEntry {
  id: number;
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
}

const EVENT_META: Record<string, { label: string; tone: string; icon: typeof Bug }> = {
  'request.received': { label: 'Request received', tone: 'blue', icon: Play },
  'request.completed': { label: 'Request completed', tone: 'green', icon: Check },
  'request.error': { label: 'Request error', tone: 'red', icon: X },
  'loop.started': { label: 'Tool loop started', tone: 'blue', icon: Flag },
  'loop.iteration': { label: 'Tool iteration', tone: 'purple', icon: Cpu },
  'loop.repair': { label: 'JSON repair', tone: 'yellow', icon: Repeat },
  'loop.final': { label: 'Final answer', tone: 'green', icon: Check },
  'tool.requested': { label: 'Tool requested', tone: 'purple', icon: Wrench },
  'tool.executing': { label: 'Tool running', tone: 'purple', icon: Cpu },
  'tool.completed': { label: 'Tool done', tone: 'green', icon: Check },
  'tool.error': { label: 'Tool failed', tone: 'red', icon: X },
  'permission.requested': { label: 'Permission asked', tone: 'yellow', icon: Repeat },
  'permission.granted': { label: 'Permission granted', tone: 'green', icon: Check },
  'permission.denied': { label: 'Permission denied', tone: 'red', icon: X },
};

const toneClasses: Record<string, { dot: string; badge: string }> = {
  blue: { dot: 'bg-blue-500', badge: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  green: { dot: 'bg-green-500', badge: 'bg-green-500/10 text-green-500 border-green-500/20' },
  red: { dot: 'bg-red-500', badge: 'bg-red-500/10 text-red-500 border-red-500/20' },
  purple: { dot: 'bg-purple-500', badge: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  yellow: { dot: 'bg-yellow-500', badge: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
};

function summaryOf(entry: TimelineEntry): string {
  const d = entry.data;
  if ('model' in d) return `model: ${String(d.model)}`;
  if ('tools' in d) return `tools: ${(d.tools as string[]).join(', ')}`;
  if ('toolName' in d) return `tool: ${String(d.toolName)}`;
  if ('error' in d) return `error: ${String(d.error)}`;
  if ('iterations' in d) return `iterations: ${String(d.iterations)}`;
  if ('repairs' in d) return `repair #${String(d.repairs)}`;
  if ('duration' in d) return `${String(d.duration)}ms`;
  return '';
}

export default function Debugger() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [paused, setPaused] = useState(false);

  useBabEvents((type, data) => {
    if (paused) return;
    if (!EVENT_META[type]) return;
    setEntries((prev) => [
      { id: Date.now() + Math.random(), type, data: (data ?? {}) as Record<string, unknown>, timestamp: Date.now() },
      ...prev,
    ].slice(0, 200));
  });

  const cardClass = `rounded-xl border ${
    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  }`;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {t('debugger.title')}
          </h1>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            {t('debugger.subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPaused((v) => !v)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              paused
                ? 'bg-green-500 text-white'
                : theme === 'dark'
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {paused ? t('debugger.resume') : t('debugger.pause')}
          </button>
          <button
            onClick={() => setEntries([])}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
            }`}
            title={t('debugger.clear')}
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className={`${cardClass} p-12 text-center`}>
          <Bug className={`w-12 h-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            {t('debugger.empty')}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const meta = EVENT_META[entry.type];
            const tones = toneClasses[meta.tone] ?? toneClasses.blue;
            const Icon = meta.icon;
            return (
              <div key={entry.id} className={`${cardClass} px-4 py-3 flex items-start gap-3`}>
                <div className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${tones.dot}`} />
                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${tones.dot.replace('bg-', 'text-')}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${tones.badge}`}>
                      {meta.label}
                    </span>
                    <span className={`text-xs font-mono ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      {entry.type}
                    </span>
                  </div>
                  {summaryOf(entry) && (
                    <p className={`text-sm mt-1 font-mono truncate ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {summaryOf(entry)}
                    </p>
                  )}
                </div>
                <span className={`text-xs flex-shrink-0 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
