import { useEffect, useState } from 'react';
import { injectStyles } from './styles';

const CSS = `
:root {
  --bab-toggle-dur: 350ms;
  --bab-toggle-travel: 18px;
  --bab-toggle-ov1: 1.5px;
  --bab-toggle-ov2: 0px;
  --bab-toggle-ease: cubic-bezier(0.34, 1.35, 0.64, 1);
}

.bab-toggle {
  position: relative;
  width: 42px;
  height: 24px;
  padding: 3px;
  border-radius: 999px;
  border: 1px solid var(--border-strong);
  background: var(--surface-inset);
  cursor: pointer;
  transition: background var(--dur-base) var(--ease-soft), border-color var(--dur-base) var(--ease-soft);
  flex-shrink: 0;
}
.bab-toggle[data-on="true"] {
  background: var(--accent);
  border-color: var(--accent);
}
.bab-toggle:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.bab-toggle-thumb {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 15, 25, 0.20);
  translate: 0 0;
  will-change: translate;
}
.bab-toggle[data-on="true"] .bab-toggle-thumb { translate: var(--bab-toggle-travel) 0; }

.bab-toggle.is-init[data-on="true"]  .bab-toggle-thumb { animation: bab-toggle-on  var(--bab-toggle-dur) var(--bab-toggle-ease) both; }
.bab-toggle.is-init[data-on="false"] .bab-toggle-thumb { animation: bab-toggle-off var(--bab-toggle-dur) var(--bab-toggle-ease) both; }

@keyframes bab-toggle-on {
  0%   { translate: 0 0; }
  55%  { translate: calc(var(--bab-toggle-travel) + var(--bab-toggle-ov1)) 0; }
  80%  { translate: calc(var(--bab-toggle-travel) - var(--bab-toggle-ov2)) 0; }
  100% { translate: var(--bab-toggle-travel) 0; }
}
@keyframes bab-toggle-off {
  0%   { translate: var(--bab-toggle-travel) 0; }
  55%  { translate: calc(0px - var(--bab-toggle-ov1)) 0; }
  80%  { translate: var(--bab-toggle-ov2) 0; }
  100% { translate: 0 0; }
}

@media (prefers-reduced-motion: reduce) { .bab-toggle-thumb { animation: none !important; } }
`;

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  ariaLabel?: string;
  disabled?: boolean;
}

export default function Toggle({ checked, onChange, ariaLabel, disabled }: ToggleProps) {
  const [init, setInit] = useState(false);

  useEffect(() => {
    injectStyles('bab-toggle-styles', CSS);
  }, []);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      data-on={checked ? 'true' : 'false'}
      className={'bab-toggle' + (init ? ' is-init' : '') + (disabled ? ' opacity-50 cursor-not-allowed' : '')}
      onClick={() => {
        if (disabled) return;
        setInit(true);
        onChange(!checked);
      }}
    >
      <span className="bab-toggle-thumb" aria-hidden="true" />
    </button>
  );
}
