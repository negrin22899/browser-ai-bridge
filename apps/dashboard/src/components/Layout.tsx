import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Server,
  MessageSquare,
  Activity,
  Bug,
  Workflow,
  FileText,
  Puzzle,
  Settings,
  Zap,
  Link as LinkIcon,
  Power,
  Copy,
  Check,
} from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useElectron } from '../hooks/useElectron';
import PermissionPrompt from './PermissionPrompt';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { isElectron, serverRunning, serverPort, startServer, stopServer } = useElectron();
  const [copied, setCopied] = useState(false);

  const navigation = [
    { name: t('nav.dashboard'), href: '/', icon: LayoutDashboard },
    { name: 'Connect', href: '/connect', icon: LinkIcon },
    { name: t('nav.providers'), href: '/providers', icon: Server },
    { name: t('nav.sessions'), href: '/sessions', icon: MessageSquare },
    { name: t('nav.runtime'), href: '/runtime', icon: Activity },
    { name: 'Inspector', href: '/inspector', icon: Bug },
    { name: t('nav.debugger'), href: '/debugger', icon: Workflow },
    { name: t('nav.logs'), href: '/logs', icon: FileText },
    { name: t('nav.extensions'), href: '/extensions', icon: Puzzle },
    { name: t('nav.settings'), href: '/settings', icon: Settings },
  ];

  const copyApiUrl = () => {
    navigator.clipboard.writeText(`http://localhost:${serverPort}/v1/chat/completions`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 w-64 border-r flex flex-col ${
          isElectron ? 'top-8' : 'top-0'
        } ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className={`flex items-center gap-3 px-6 py-5 border-b ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  BAB
                </h1>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Browser AI Bridge
                </p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? theme === 'dark'
                          ? 'bg-primary-900 text-primary-300'
                          : 'bg-primary-50 text-primary-700'
                        : theme === 'dark'
                          ? 'text-gray-300 hover:bg-gray-700'
                          : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Server Controls */}
            <div className={`p-4 border-t space-y-2 ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            }`}>
              {/* Server Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${serverRunning ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    {serverRunning ? `Port ${serverPort}` : 'Stopped'}
                  </span>
                </div>
                <button
                  onClick={() => serverRunning ? stopServer() : startServer()}
                  className={`p-1.5 rounded-lg transition-colors ${
                    serverRunning
                      ? 'text-red-400 hover:bg-red-900/30'
                      : 'text-green-400 hover:bg-green-900/30'
                  }`}
                  title={serverRunning ? 'Stop Server' : 'Start Server'}
                >
                  <Power className="w-4 h-4" />
                </button>
              </div>

              {/* Copy API URL */}
              {serverRunning && (
                <button
                  onClick={copyApiUrl}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                    theme === 'dark'
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-green-500" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span className="truncate">localhost:{serverPort}/v1/chat/completions</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className={`flex-1 ${isElectron ? 'ml-64 mt-8' : 'ml-64'}`}>
          <div className="max-w-7xl mx-auto px-6 py-8">
            {children}
          </div>
        </main>
      </div>

      <PermissionPrompt />
    </div>
  );
}
