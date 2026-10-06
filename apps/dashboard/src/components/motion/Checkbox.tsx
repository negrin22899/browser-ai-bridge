import { useEffect, useRef } from 'react';
import { injectStyles } from './styles';

const CSS = `
:root {
  --bab-check-box: 150ms;
  --bab-check-draw: 350ms;
  --bab-check-delay: 0ms;
  --bab-check-uncheck: 150ms;
}

.bab-check {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  border: 1.5px solid var(--border-strong);
  background: var(--surface-inset);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--accent-fg);
  transition:
    background var(--bab-check-box) var(--ease-soft),
    border-color var(--bab-check-box) var(--ease-soft);
  flex-shrink: 0;
}
.bab-check[aria-checked="true"] {
  background: var(--accent);
  border-color: var(--accent);
}
.bab-check:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

.bab-check svg { pointer-events: none; }
.bab-check svg path {
  stroke: currentColor;
  stroke-dasharray: var(--bab-check-len, 15);
  stroke-dashoffset: var(--bab-check-len, 15);
  transition: stroke-dashoffset var(--bab-check-uncheck) var(--ease-soft);
}
.bab-check[aria-checked="true"] svg path {
  stroke-dashoffset: 0;
  transition: stroke-dashoffset var(--bab-check-draw) var(--ease-soft) var(--bab-check-delay);
}

@media (prefers-reduced-motion: reduce) {
  .bab-check, .bab-check svg path { transition: none !important; }
}
`;

interface CheckboxProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export default function Checkbox({ checked, onChange, label, disabled }: CheckboxProps) {
  const boxRef = useRef<HTMLButtonElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);

  useEffect(() => {
    injectStyles('bab-check-styles', CSS);
    // Measure the stroke length so dasharray matches exactly and the
    // draw never over/under-shoots.
    if (pathRef.current && boxRef.current) {
      const len = pathRef.current.getTotalLength();
      boxRef.current.style.setProperty('--bab-check-len', String(Math.ceil(len) + 1));
    }
  }, []);

  return (
    <label
      className={
        'inline-flex items-center gap-2 select-none ' +
        (disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer')
      }
      onClick={(e) => {
        if (disabled) return;
        e.preventDefault();
        onChange(!checked);
      }}
    >
      <button
        ref={boxRef}
        type="button"
        className="bab-check"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
      >
        <svg width="10" height="10" viewBox="0 0 10.1668 10.1668" fill="none">
          <path
            ref={pathRef}
            d="M1 5.52L3.92 9.17L9.17 1"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {label && <span className="text-sm text-text">{label}</span>}
    </label>
  );
}
