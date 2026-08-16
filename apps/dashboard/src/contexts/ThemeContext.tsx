import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');

  // Load theme on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        if (isElectron()) {
          const settings = await window.electronAPI!.loadSettings();
          if (settings?.theme) {
            setThemeState(settings.theme as Theme);
            return;
          }
        }
        // Fallback to localStorage
        const saved = localStorage.getItem('theme');
        if (saved) {
          setThemeState(saved as Theme);
        }
      } catch (e) {
        console.error('Failed to load theme:', e);
      }
    };
    loadTheme();
  }, []);

  // Save theme when it changes
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);

    const saveTheme = async () => {
      try {
        localStorage.setItem('theme', theme);
        if (isElectron()) {
          const settings = await window.electronAPI!.loadSettings() || {};
          settings.theme = theme;
          await window.electronAPI!.saveSettings(settings);
        }
      } catch (e) {
        console.error('Failed to save theme:', e);
      }
    };
    saveTheme();
  }, [theme]);

  const toggleTheme = () => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
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
