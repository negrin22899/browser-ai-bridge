import type { ReactNode, ComponentType } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export function useSurfaceClasses() {
  const { theme } = useTheme();
  return {
    card: `rounded-xl border ${
      theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`,
    cardHover: theme === 'dark' ? 'hover:bg-gray-750' : 'hover:bg-gray-50',
    text: theme === 'dark' ? 'text-white' : 'text-gray-900',
    textSecondary: theme === 'dark' ? 'text-gray-400' : 'text-gray-600',
    textMuted: theme === 'dark' ? 'text-gray-500' : 'text-gray-400',
    divider: theme === 'dark' ? 'divide-gray-700' : 'divide-gray-100',
    input: `border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
      theme === 'dark'
        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
        : 'bg-white border-gray-200 text-gray-900'
    }`,
  };
}

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = '', hover = false }: CardProps) {
  const { card, cardHover } = useSurfaceClasses();
  return (
    <div className={`${card} ${hover ? `${cardHover} transition-colors` : ''} ${className}`}>
      {children}
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  const { text, textSecondary } = useSurfaceClasses();
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className={`text-2xl font-bold ${text}`}>{title}</h1>
        {subtitle && <p className={`mt-1 ${textSecondary}`}>{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

type BadgeTone = 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'purple';

const badgeTones: Record<BadgeTone, string> = {
  green: 'bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  red: 'bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  yellow: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  gray: 'bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  purple: 'bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}

export function Badge({ children, tone = 'gray', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeTones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  accent?: 'primary' | 'green' | 'red' | 'blue' | 'purple';
  change?: string;
}

const statAccents: Record<NonNullable<StatCardProps['accent']>, { bg: string; fg: string }> = {
  primary: { bg: 'bg-primary-50 dark:bg-primary-900/40', fg: 'text-primary-600 dark:text-primary-300' },
  green: { bg: 'bg-green-50 dark:bg-green-900/40', fg: 'text-green-600 dark:text-green-300' },
  red: { bg: 'bg-red-50 dark:bg-red-900/40', fg: 'text-red-600 dark:text-red-300' },
  blue: { bg: 'bg-blue-50 dark:bg-blue-900/40', fg: 'text-blue-600 dark:text-blue-300' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-900/40', fg: 'text-purple-600 dark:text-purple-300' },
};

export function StatCard({ label, value, icon: Icon, accent = 'primary', change }: StatCardProps) {
  const { text, textSecondary } = useSurfaceClasses();
  const a = statAccents[accent];
  return (
    <Card className="p-6" hover>
      <div className="flex items-center justify-between">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${a.bg}`}>
          <Icon className={`w-6 h-6 ${a.fg}`} />
        </div>
        {change && (
          <Badge tone={change === 'Online' || change === 'ok' ? 'green' : change === 'Offline' ? 'red' : 'gray'}>
            {change}
          </Badge>
        )}
      </div>
      <div className="mt-4">
        <p className={`text-3xl font-bold ${text}`}>{value}</p>
        <p className={`text-sm mt-1 ${textSecondary}`}>{label}</p>
      </div>
    </Card>
  );
}

interface EmptyStateProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
}

export function EmptyState({ icon: Icon, title, hint }: EmptyStateProps) {
  const { textSecondary, textMuted } = useSurfaceClasses();
  return (
    <Card className="p-12 text-center">
      <Icon className={`w-12 h-12 mx-auto mb-4 ${textMuted}`} />
      <p className={textSecondary}>{title}</p>
      {hint && <p className={`text-sm mt-2 ${textMuted}`}>{hint}</p>}
    </Card>
  );
}

export function Spinner({ className = 'w-8 h-8' }: { className?: string }) {
  return <div className={`${className} animate-spin rounded-full border-2 border-primary-500 border-t-transparent`} />;
}
