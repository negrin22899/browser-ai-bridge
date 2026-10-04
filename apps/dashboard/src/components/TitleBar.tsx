import { Minus, Square, X, Wifi, WifiOff } from 'lucide-react';
import { useElectron } from '../hooks/useElectron';
import { useTheme } from '../contexts/ThemeContext';

export default function TitleBar() {
  const { theme } = useTheme();
  const { isElectron, minimize, maximize, close, serverRunning, startServer, stopServer } = useElectron();

  if (!isElectron) return null;

  return (
    <div
      className={`h-8 flex items-center justify-between select-none ${
        theme === 'dark' ? 'bg-[#0f0f23] text-gray-400' : 'bg-gray-100 text-gray-600'
      }`}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Left: Title + Server Status */}
      <div className="flex items-center gap-2 px-3">
        <span className="text-xs font-medium">Browser AI Bridge</span>
        <div className="flex items-center gap-1 ml-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {serverRunning ? (
            <button
              onClick={() => stopServer()}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-green-900/50 text-green-400 hover:bg-green-900/80 transition-colors"
              title="Stop Server"
            >
              <Wifi className="w-3 h-3" />
              <span>Running</span>
            </button>
          ) : (
            <button
              onClick={() => startServer()}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-900/50 text-red-400 hover:bg-red-900/80 transition-colors"
              title="Start Server"
            >
              <WifiOff className="w-3 h-3" />
              <span>Stopped</span>
            </button>
          )}
        </div>
      </div>

      {/* Right: Window Controls */}
      <div
        className="flex items-center"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={minimize}
          className={`w-10 h-8 flex items-center justify-center transition-colors ${
            theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
          }`}
          title="Minimize"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={maximize}
          className={`w-10 h-8 flex items-center justify-center transition-colors ${
            theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
          }`}
          title="Maximize"
        >
          <Square className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={close}
          className={`w-10 h-8 flex items-center justify-center transition-colors ${
            theme === 'dark' ? 'hover:bg-red-600 hover:text-white' : 'hover:bg-red-500 hover:text-white'
          }`}
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
