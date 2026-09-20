import { Minus, Square, X, Wifi, WifiOff, Sun, Moon, Sparkles, Languages, Palette } from 'lucide-react';
import { useElectron } from '../hooks/useElectron';
import { useTheme, type Theme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { ClearInput, MenuDropdown, MenuItem, MenuSeparator } from './motion';

const THEME_ICONS: Record<Theme, typeof Sparkles> = {
  brand: Sparkles,
  light: Sun,
  dark: Moon,
};

export default function TitleBar() {
  const { isElectron, minimize, maximize, close, serverRunning, startServer, stopServer } = useElectron();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();

  if (!isElectron) return null;

  const ThemeIcon = THEME_ICONS[theme];

  return (
    <div
      className="glass h-10 flex items-center justify-between select-none border-l-0 border-r-0 border-t-0 rounded-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Left: brand + server pill */}
      <div className="flex items-center gap-3 pl-3 text-text">
        <span className="font-display text-sm leading-none">Browser AI Bridge</span>
        <div
          className="flex items-center gap-2"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {serverRunning ? (
            <button
              onClick={() => stopServer()}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-success/15 text-success hover:bg-success/25 transition-colors"
              title="Stop server"
            >
              <Wifi className="w-3 h-3" />
              <span>Running</span>
            </button>
          ) : (
            <button
              onClick={() => startServer()}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-danger/15 text-danger hover:bg-danger/25 transition-colors"
              title="Start server"
            >
              <WifiOff className="w-3 h-3" />
              <span>Stopped</span>
            </button>
          )}
        </div>
      </div>

      {/* Centre: global search */}
      <div
        className="flex-1 flex justify-center px-4"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <ClearInput
          className="max-w-md w-full"
          placeholder={language === 'ru' ? 'Найти сессию, провайдера…' : 'Search sessions, providers…'}
        />
      </div>

      {/* Right: theme/lang menu + window controls */}
      <div
        className="flex items-center"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <MenuDropdown
          origin="top-right"
          trigger={({ toggle }) => (
            <button
              type="button"
              onClick={toggle}
              className="h-10 px-3 flex items-center gap-1.5 text-text-muted hover:text-text hover:bg-surface-inset transition-colors"
              title="Appearance"
            >
              <ThemeIcon className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wide">{language}</span>
            </button>
          )}
        >
          <div className="px-2 py-1 text-[11px] uppercase tracking-widest text-text-subtle flex items-center gap-1">
            <Palette className="w-3 h-3" /> Theme
          </div>
          <MenuItem icon={<Sparkles className="w-4 h-4" />} onSelect={() => setTheme('brand')}>
            Brand
          </MenuItem>
          <MenuItem icon={<Sun className="w-4 h-4" />} onSelect={() => setTheme('light')}>
            Light
          </MenuItem>
          <MenuItem icon={<Moon className="w-4 h-4" />} onSelect={() => setTheme('dark')}>
            Dark
          </MenuItem>
          <MenuSeparator />
          <div className="px-2 py-1 text-[11px] uppercase tracking-widest text-text-subtle flex items-center gap-1">
            <Languages className="w-3 h-3" /> Language
          </div>
          <MenuItem onSelect={() => setLanguage('en')}>English</MenuItem>
          <MenuItem onSelect={() => setLanguage('ru')}>Русский</MenuItem>
        </MenuDropdown>

        <button
          onClick={minimize}
          className="w-11 h-10 flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-inset transition-colors"
          title="Minimize"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={maximize}
          className="w-11 h-10 flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-inset transition-colors"
          title="Maximize"
        >
          <Square className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={close}
          className="w-11 h-10 flex items-center justify-center text-text-muted hover:bg-danger hover:text-white transition-colors"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
