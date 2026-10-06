import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { injectStyles, readNum } from './styles';

const CSS = `
:root {
  --bab-dd-open: 220ms;
  --bab-dd-close: 150ms;
  --bab-dd-pre-scale: 0.96;
  --bab-dd-closing-scale: 0.98;
}

.bab-dd-wrap { position: relative; display: inline-flex; }

.bab-dd {
  position: absolute;
  min-width: 180px;
  padding: 6px;
  border-radius: var(--radius-md);
  background: var(--surface-strong);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-glass);
  transform-origin: top left;
  transform: scale(var(--bab-dd-pre-scale));
  opacity: 0;
  pointer-events: none;
  transition:
    transform var(--bab-dd-open) var(--ease-soft),
    opacity   var(--bab-dd-open) var(--ease-soft);
  will-change: transform, opacity;
  z-index: 50;
}

.bab-dd[data-origin="top-right"]     { transform-origin: top right; }
.bab-dd[data-origin="top-center"]    { transform-origin: top center; }
.bab-dd[data-origin="bottom-left"]   { transform-origin: bottom left; }
.bab-dd[data-origin="bottom-center"] { transform-origin: bottom center; }
.bab-dd[data-origin="bottom-right"]  { transform-origin: bottom right; }

.bab-dd.is-open {
  transform: scale(1);
  opacity: 1;
  pointer-events: auto;
}
.bab-dd.is-closing {
  transform: scale(var(--bab-dd-closing-scale));
  opacity: 0;
  pointer-events: none;
  transition:
    transform var(--bab-dd-close) var(--ease-soft),
    opacity   var(--bab-dd-close) var(--ease-soft);
}

.bab-dd-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text);
  font-size: 13px;
  cursor: pointer;
  text-align: left;
}
.bab-dd-item:hover, .bab-dd-item:focus-visible {
  background: var(--accent-soft);
  color: var(--accent);
  outline: none;
}
.bab-dd-sep {
  height: 1px;
  margin: 4px 0;
  background: var(--border);
}

@media (prefers-reduced-motion: reduce) { .bab-dd { transition: none !important; } }
`;

type DdOrigin = 'top-left' | 'top-right' | 'top-center' | 'bottom-left' | 'bottom-right' | 'bottom-center';

interface MenuDropdownProps {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: ReactNode;
  origin?: DdOrigin;
  /** Extra offset from the trigger's edge (px). Default 4. */
  offset?: number;
}

export default function MenuDropdown({ trigger, children, origin = 'top-right', offset = 4 }: MenuDropdownProps) {
  const [state, setState] = useState<'closed' | 'open' | 'closing'>('closed');
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    injectStyles('bab-dd-styles', CSS);
  }, []);

  useEffect(() => {
    if (state !== 'closing') return;
    const ms = readNum('--bab-dd-close', 150);
    const id = window.setTimeout(() => setState('closed'), ms);
    return () => window.clearTimeout(id);
  }, [state]);

  useEffect(() => {
    if (state !== 'open') return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setState('closing');
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setState('closing');
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [state]);

  const toggle = useCallback(() => {
    setState((s) => (s === 'open' ? 'closing' : 'open'));
  }, []);

  // Convert origin into positioning styles relative to the trigger.
  const isTop = origin.startsWith('top');
  const posStyle: React.CSSProperties = isTop
    ? { top: `calc(100% + ${offset}px)` }
    : { bottom: `calc(100% + ${offset}px)` };
  if (origin.endsWith('right')) posStyle.right = 0;
  else if (origin.endsWith('center')) {
    posStyle.left = '50%';
    posStyle.transform = 'translateX(-50%)';
  } else posStyle.left = 0;

  return (
    <div ref={wrapRef} className="bab-dd-wrap">
      {trigger({ open: state === 'open', toggle })}
      <div
        role="menu"
        data-origin={origin}
        style={posStyle}
        className={
          'bab-dd' +
          (state === 'open' ? ' is-open' : '') +
          (state === 'closing' ? ' is-closing' : '')
        }
      >
        {children}
      </div>
    </div>
  );
}

interface ItemProps {
  onSelect: () => void;
  children: ReactNode;
  icon?: ReactNode;
  danger?: boolean;
}
export function MenuItem({ onSelect, children, icon, danger }: ItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      className="bab-dd-item"
      onClick={onSelect}
      style={danger ? { color: 'var(--danger)' } : undefined}
    >
      {icon}
      {children}
    </button>
  );
}

export function MenuSeparator() {
  return <div role="separator" className="bab-dd-sep" aria-hidden />;
}
