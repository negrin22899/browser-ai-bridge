import { ReactNode, useEffect, useState } from 'react';
import { injectStyles } from './styles';

const CSS = `
:root {
  --bab-acc-expand: 280ms;
  --bab-acc-collapse: 260ms;
}

.bab-acc {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  overflow: hidden;
}
.bab-acc + .bab-acc { margin-top: 8px; }

.bab-acc-head {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  color: var(--text);
  font-size: 14px;
  font-weight: 500;
  background: transparent;
  border: 0;
  cursor: pointer;
  text-align: left;
}
.bab-acc-head:hover { background: var(--surface-inset); }
.bab-acc-head:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }

.bab-acc-panel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--bab-acc-collapse) var(--ease-soft);
}
.bab-acc[data-open="true"] .bab-acc-panel {
  grid-template-rows: 1fr;
  transition: grid-template-rows var(--bab-acc-expand) var(--ease-soft);
}
.bab-acc-panel-inner {
  overflow: hidden;
  opacity: 0;
  filter: blur(2px);
  padding: 0 16px;
  transition:
    opacity var(--bab-acc-collapse) var(--ease-soft),
    filter  var(--bab-acc-collapse) var(--ease-soft);
}
.bab-acc[data-open="true"] .bab-acc-panel-inner {
  opacity: 1;
  filter: blur(0);
  padding: 0 16px 16px 16px;
  transition:
    opacity var(--bab-acc-expand) var(--ease-soft),
    filter  var(--bab-acc-expand) var(--ease-soft);
}

.bab-acc-chevron {
  display: inline-flex;
  color: var(--text-muted);
  transform: scaleY(1);
  transform-origin: center;
  transition: transform var(--dur-base) var(--ease-soft);
}
.bab-acc-chevron path { vector-effect: non-scaling-stroke; }
.bab-acc[data-open="true"] .bab-acc-chevron { transform: scaleY(-1); color: var(--accent); }

@media (prefers-reduced-motion: reduce) {
  .bab-acc-panel, .bab-acc-panel-inner, .bab-acc-chevron { transition: none !important; }
}
`;

interface AccordionProps {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}

export default function Accordion({ title, children, defaultOpen = false }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    injectStyles('bab-acc-styles', CSS);
  }, []);

  return (
    <div className="bab-acc" data-open={open ? 'true' : 'false'}>
      <button
        type="button"
        className="bab-acc-head"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{title}</span>
        <span className="bab-acc-chevron" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 6.5L8 10.5L12 6.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      <div className="bab-acc-panel">
        <div className="bab-acc-panel-inner">{children}</div>
      </div>
    </div>
  );
}
