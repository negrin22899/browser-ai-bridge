import { useEffect, useRef, useState } from 'react';
import { injectStyles } from './styles';

const CSS = `
:root {
  --bab-digit-dur: 500ms;
  --bab-digit-distance: 8px;
  --bab-digit-stagger: 70ms;
  --bab-digit-blur: 2px;
  --bab-digit-ease: cubic-bezier(0.34, 1.45, 0.64, 1);
  --bab-digit-dir-x: 0;
  --bab-digit-dir-y: 1;
}

@keyframes bab-digit-pop-in {
  0%   {
    transform: translate(
      calc(var(--bab-digit-distance) * var(--bab-digit-dir-x)),
      calc(var(--bab-digit-distance) * var(--bab-digit-dir-y))
    );
    opacity: 0;
    filter: blur(var(--bab-digit-blur));
  }
  100% { transform: translate(0, 0); opacity: 1; filter: blur(0); }
}

.bab-digit-group {
  display: inline-flex;
  align-items: baseline;
  font-variant-numeric: tabular-nums;
}
.bab-digit {
  display: inline-block;
  will-change: transform, opacity, filter;
}
.bab-digit-group.is-animating .bab-digit {
  animation: bab-digit-pop-in var(--bab-digit-dur) var(--bab-digit-ease) both;
}
.bab-digit-group.is-animating .bab-digit[data-i="1"] { animation-delay: calc(var(--bab-digit-stagger) * 1); }
.bab-digit-group.is-animating .bab-digit[data-i="2"] { animation-delay: calc(var(--bab-digit-stagger) * 2); }
.bab-digit-group.is-animating .bab-digit[data-i="3"] { animation-delay: calc(var(--bab-digit-stagger) * 3); }
.bab-digit-group.is-animating .bab-digit[data-i="4"] { animation-delay: calc(var(--bab-digit-stagger) * 4); }
.bab-digit-group.is-animating .bab-digit[data-i="5"] { animation-delay: calc(var(--bab-digit-stagger) * 5); }

@media (prefers-reduced-motion: reduce) { .bab-digit-group .bab-digit { animation: none !important; } }
`;

interface NumberPopInProps {
  value: string | number;
  /** Replay animation whenever value changes. Default true. */
  replayOnChange?: boolean;
  className?: string;
}

export default function NumberPopIn({ value, replayOnChange = true, className }: NumberPopInProps) {
  const [playing, setPlaying] = useState(true);
  const prev = useRef(String(value));

  useEffect(() => {
    injectStyles('bab-digit-styles', CSS);
  }, []);

  useEffect(() => {
    if (!replayOnChange) return;
    const next = String(value);
    if (next === prev.current) return;
    prev.current = next;
    setPlaying(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setPlaying(true)));
  }, [value, replayOnChange]);

  const text = String(value);

  return (
    <span className={'bab-digit-group' + (playing ? ' is-animating' : '') + ' ' + (className || '')}>
      {text.split('').map((ch, i) => (
        <span key={i} className="bab-digit" data-i={i > 0 ? i : undefined}>
          {ch}
        </span>
      ))}
    </span>
  );
}
