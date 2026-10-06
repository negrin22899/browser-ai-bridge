import { createContext, useContext, useRef, useState, useEffect, ReactNode } from 'react';

export type Theme = 'brand' | 'light' | 'dark';

const THEMES: Theme[] = ['brand', 'light', 'dark'];
const DEFAULT_THEME: Theme = 'brand';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
  /** Legacy alias — many pages still call this. Cycles through the three themes. */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI;
}

function normalize(value: unknown): Theme {
  if (typeof value === 'string' && (THEMES as string[]).includes(value)) return value as Theme;
  return DEFAULT_THEME;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  // Keep the Tailwind `dark:` variant working during the migration.
  root.classList.remove('light', 'dark', 'brand');
  root.classList.add(theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Read persisted theme synchronously so React's initial render already has
  // the right colour palette. If we set state='brand' first and load from
  // localStorage in an effect, the save-effect fires with 'brand' before the
  // load-effect ever runs and silently overwrites the stored value.
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return DEFAULT_THEME;
    return normalize(localStorage.getItem('theme'));
  });

  // Gate persistence until we've finished the async Electron-settings hydrate.
  // Without this, the first render's save-effect would clobber a possibly
  // newer value living in Electron's on-disk settings.json.
  const persistOnChange = useRef(false);

  useEffect(() => {
    applyTheme(theme);
    if (!persistOnChange.current) return;
    try {
      localStorage.setItem('theme', theme);
      if (isElectron() && window.electronAPI?.mergeSettings) {
        window.electronAPI.mergeSettings({ theme }).catch(() => {});
      }
    } catch (e) {
      console.error('Failed to save theme:', e);
    }
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      try {
        if (isElectron() && window.electronAPI?.loadSettings) {
          const settings = await window.electronAPI.loadSettings();
          if (!cancelled && settings?.theme) {
            const next = normalize(settings.theme);
            setThemeState((prev) => (prev !== next ? next : prev));
          }
        }
      } catch (e) {
        console.error('Failed to load theme:', e);
      } finally {
        // Allow subsequent theme changes (user clicks or hydrate diffs) to
        // persist. Setting this after the async hydrate settles is what
        // stops the mount-race entirely.
        persistOnChange.current = true;
      }
    }
    if (!isElectron()) {
      persistOnChange.current = true;
      return;
    }
    hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  const setTheme = (next: Theme) => setThemeState(normalize(next));

  const cycleTheme = () => {
    setThemeState((prev) => {
      const idx = THEMES.indexOf(prev);
      return THEMES[(idx + 1) % THEMES.length];
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme, toggleTheme: cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
