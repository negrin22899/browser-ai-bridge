import { useEffect, useRef, useState } from 'react';
import { injectStyles, readNum } from './styles';

const CSS = `
:root {
  --bab-text-swap-dur: 200ms;
  --bab-text-swap-y: 4px;
  --bab-text-swap-blur: 2px;
}

.bab-text-swap {
  display: inline-block;
  transform: translateY(0);
  filter: blur(0);
  opacity: 1;
  transition:
    transform var(--bab-text-swap-dur) var(--ease-soft),
    filter    var(--bab-text-swap-dur) var(--ease-soft),
    opacity   var(--bab-text-swap-dur) var(--ease-soft);
  will-change: transform, filter, opacity;
}
.bab-text-swap.is-exit {
  transform: translateY(calc(var(--bab-text-swap-y) * -1));
  filter: blur(var(--bab-text-swap-blur));
  opacity: 0;
}
.bab-text-swap.is-enter-start {
  transform: translateY(var(--bab-text-swap-y));
  filter: blur(var(--bab-text-swap-blur));
  opacity: 0;
  transition: none;
}

@media (prefers-reduced-motion: reduce) { .bab-text-swap { transition: none !important; } }
`;

interface TextStatesSwapProps {
  value: string | number;
  className?: string;
}

/**
 * Three-phase text swap: exit old → replace → enter new.
 * Drop-in inline element: whenever `value` changes, it plays the transition.
 */
export default function TextStatesSwap({ value, className }: TextStatesSwapProps) {
  const [display, setDisplay] = useState(value);
  const ref = useRef<HTMLSpanElement | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    injectStyles('bab-text-swap-styles', CSS);
  }, []);

  useEffect(() => {
    if (value === display) return;
    const el = ref.current;
    if (!el) {
      setDisplay(value);
      return;
    }
    if (busy.current) {
      setDisplay(value);
      return;
    }
    busy.current = true;
    const dur = readNum('--bab-text-swap-dur', 200);
    el.classList.add('is-exit');
    window.setTimeout(() => {
      setDisplay(value);
      el.classList.remove('is-exit');
      el.classList.add('is-enter-start');
      void el.offsetWidth;
      el.classList.remove('is-enter-start');
      busy.current = false;
    }, dur);
  }, [value, display]);

  return (
    <span ref={ref} className={'bab-text-swap ' + (className || '')}>
      {display}
    </span>
  );
}
