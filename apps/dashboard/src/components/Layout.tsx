import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Power, Copy, Check } from 'lucide-react';
import {
  Element3,
  Link21,
  Global,
  MessageText1,
  Setting2,
  Flash,
  Activity,
  SearchStatus,
  Hierarchy,
  DocumentText,
  Category,
} from 'iconsax-react';
import type { Icon as IconsaxIcon } from 'iconsax-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useElectron } from '../hooks/useElectron';
import PermissionPrompt from './PermissionPrompt';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { t } = useLanguage();
  const { serverRunning, serverPort, startServer, stopServer } = useElectron();
  const [copied, setCopied] = useState(false);

  const navigation: Array<{ name: string; href: string; icon: IconsaxIcon }> = [
    { name: t('nav.dashboard'), href: '/', icon: Element3 },
    { name: 'Connect', href: '/connect', icon: Link21 },
    { name: t('nav.providers'), href: '/providers', icon: Global },
    { name: t('nav.sessions'), href: '/sessions', icon: MessageText1 },
    { name: t('nav.runtime'), href: '/runtime', icon: Activity },
    { name: 'Inspector', href: '/inspector', icon: SearchStatus },
    { name: t('nav.debugger'), href: '/debugger', icon: Hierarchy },
    { name: t('nav.logs'), href: '/logs', icon: DocumentText },
    { name: t('nav.extensions'), href: '/extensions', icon: Category },
    { name: t('nav.settings'), href: '/settings', icon: Setting2 },
  ];

  const copyApiUrl = () => {
    navigator.clipboard.writeText(`http://localhost:${serverPort}/v1/chat/completions`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex text-text">
      {/* Sidebar — glass */}
      <aside className="glass w-64 border-r flex flex-col flex-shrink-0 rounded-none border-l-0 border-t-0 border-b-0">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-accent text-accent-fg shadow-soft">
              <Flash size={22} variant="Bold" />
            </div>
            <div>
              <h1 className="font-display text-xl leading-none text-text">Browser&nbsp;AI</h1>
              <p className="text-xs text-text-muted mt-0.5">Bridge</p>
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
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-[var(--dur-fast)] ease-soft ${
                    isActive
                      ? 'bg-accent-soft text-accent'
                      : 'text-text-muted hover:text-text hover:bg-surface-inset'
                  }`}
                >
                  <item.icon size={20} variant={isActive ? 'Bold' : 'Linear'} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Server controls */}
          <div className="p-4 border-t border-border space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={`w-2 h-2 rounded-full ${serverRunning ? 'bg-success' : 'bg-danger'}`}
                  aria-hidden
                />
                <span className="text-text-muted">
                  {serverRunning ? `Port ${serverPort}` : 'Stopped'}
                </span>
              </div>
              <button
                onClick={() => (serverRunning ? stopServer() : startServer())}
                className={`p-1.5 rounded-lg transition-colors ${
                  serverRunning
                    ? 'text-danger hover:bg-danger/10'
                    : 'text-success hover:bg-success/10'
                }`}
                title={serverRunning ? 'Stop Server' : 'Start Server'}
              >
                <Power className="w-4 h-4" />
              </button>
            </div>

            {serverRunning && (
              <button
                onClick={copyApiUrl}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs bg-surface-inset hover:bg-accent-soft text-text-muted hover:text-accent transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-success" />
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
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
      </main>

      <PermissionPrompt />
    </div>
  );
}
