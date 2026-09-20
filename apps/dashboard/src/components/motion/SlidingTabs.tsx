import { ReactNode, useEffect, useRef, useState } from 'react';
import { injectStyles } from './styles';

const CSS = `
.bab-tabs {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: 48px;
  background: var(--surface-inset);
  border: 1px solid var(--border);
}
.bab-tab {
  position: relative;
  appearance: none;
  border: 0;
  background: transparent;
  height: 30px;
  padding: 4px 12px;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 48px;
  z-index: 1;
  font-size: 13px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: color var(--dur-base) var(--ease-soft);
  white-space: nowrap;
}
.bab-tab:not([aria-selected="true"]):hover { color: var(--text); }
.bab-tab[aria-selected="true"] { color: var(--accent-fg); }
.bab-tab:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

.bab-tabs-pill {
  position: absolute;
  top: 3px;
  left: 0;
  height: 30px;
  width: 0;
  background: var(--accent);
  border-radius: 48px;
  transform: translateX(0);
  transition:
    transform var(--dur-base) var(--ease-soft),
    width     var(--dur-base) var(--ease-soft);
  will-change: transform, width;
  z-index: 0;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .bab-tabs-pill, .bab-tab { transition: none !important; }
}
`;

export interface SlidingTabItem {
  id: string;
  label: ReactNode;
}

interface SlidingTabsProps {
  tabs: SlidingTabItem[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
}

export default function SlidingTabs({ tabs, value, onChange, ariaLabel }: SlidingTabsProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const pillRef = useRef<HTMLSpanElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    injectStyles('bab-tabs-styles', CSS);
    setReady(true);
  }, []);

  const activeIdx = tabs.findIndex((t) => t.id === value);

  const moveTo = (id: string, animate: boolean) => {
    const tab = tabRefs.current[id];
    const pill = pillRef.current;
    if (!tab || !pill) return;
    const left = tab.offsetLeft;
    const width = tab.offsetWidth;
    if (!animate) {
      const prev = pill.style.transition;
      pill.style.transition = 'none';
      pill.style.transform = `translateX(${left}px)`;
      pill.style.width = `${width}px`;
      void pill.offsetWidth;
      pill.style.transition = prev;
    } else {
      pill.style.transform = `translateX(${left}px)`;
      pill.style.width = `${width}px`;
    }
  };

  useEffect(() => {
    if (!ready) return;
    const id = window.requestAnimationFrame(() => moveTo(value, false));
    const onResize = () => moveTo(value, false);
    window.addEventListener('resize', onResize);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener('resize', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, value, tabs.length]);

  return (
    <div ref={rootRef} className="bab-tabs" role="tablist" aria-label={ariaLabel}>
      <span ref={pillRef} className="bab-tabs-pill" aria-hidden="true" />
      {tabs.map((t, i) => (
        <button
          key={t.id}
          ref={(el) => {
            tabRefs.current[t.id] = el;
          }}
          type="button"
          className="bab-tab"
          role="tab"
          aria-selected={i === activeIdx}
          onClick={() => {
            onChange(t.id);
            moveTo(t.id, true);
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
