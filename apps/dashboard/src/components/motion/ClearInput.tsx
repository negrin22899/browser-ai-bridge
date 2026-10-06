import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { X } from 'lucide-react';
import { injectStyles, makeEase, readEase, readNum } from './styles';

const CSS = `
:root {
  --bab-clear-dur: 1000ms;
  --bab-clear-out-dur: 400ms;
  --bab-clear-in-dur: 400ms;
  --bab-clear-out-fly: 12px;
  --bab-clear-in-fly: 12px;
  --bab-clear-out-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --bab-clear-in-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --bab-clear-blur: 2px;
  --bab-clear-glow-delay: 50ms;
  --bab-clear-glow-peak-at: 0.15;
  --bab-clear-glow-opacity: 0.42;
  --bab-clear-glow-spread: 1.5;
}

.bab-clear {
  position: relative;
  display: flex;
  align-items: center;
  height: 34px;
  padding: 0 8px 0 32px;
  min-width: 220px;
  border-radius: 999px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
  overflow: hidden;
  transition: border-color var(--dur-base) var(--ease-soft), background var(--dur-base) var(--ease-soft);
}
.bab-clear:focus-within {
  border-color: var(--accent);
  background: var(--surface-strong);
}
.bab-clear > svg.bab-clear-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}
.bab-clear > input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: 0;
  outline: none;
  color: var(--text);
  font-size: 13px;
  padding: 0;
}
.bab-clear > input::placeholder { color: var(--text-subtle); }

.bab-clear-mirror,
.bab-clear-placeholder {
  position: absolute;
  inset: 0 40px 0 32px;
  display: flex;
  align-items: center;
  pointer-events: none;
  white-space: nowrap;
  overflow: hidden;
  z-index: 2;
  font-size: 13px;
}
.bab-clear-mirror { opacity: 0; color: var(--text); }
.bab-clear.has-value .bab-clear-mirror,
.bab-clear.is-clearing .bab-clear-mirror { opacity: 1; }
.bab-clear.has-value > input,
.bab-clear.is-clearing > input { -webkit-text-fill-color: transparent; color: transparent; }
.bab-clear-placeholder { color: var(--text-subtle); }
.bab-clear.has-value .bab-clear-placeholder { opacity: 0; }

.bab-clear-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  z-index: 3;
  mix-blend-mode: multiply;
}
:root[data-theme="dark"] .bab-clear-glow { mix-blend-mode: screen; }

.bab-clear-btn {
  position: relative;
  z-index: 4;
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  border-radius: 999px;
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--dur-fast) var(--ease-soft), background var(--dur-fast) var(--ease-soft);
}
.bab-clear.has-value .bab-clear-btn { opacity: 1; pointer-events: auto; }
.bab-clear-btn:hover { background: var(--accent-soft); color: var(--accent); }

@media (prefers-reduced-motion: reduce) { .bab-clear-glow { opacity: 0 !important; } }
`;

interface ClearInputProps {
  defaultValue?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  onClear?: () => void;
  className?: string;
}

export interface ClearInputHandle {
  focus: () => void;
  value: () => string;
  clear: () => void;
}

const ClearInput = forwardRef<ClearInputHandle, ClearInputProps>(function ClearInput(
  { defaultValue = '', placeholder = '', onChange, onClear, className },
  ref,
) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const mirrorRef = useRef<HTMLDivElement | null>(null);
  const phRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const isClearing = useRef(false);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    value: () => inputRef.current?.value ?? '',
    clear: () => runClear(),
  }));

  useEffect(() => {
    injectStyles('bab-clear-styles', CSS);
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    const input = inputRef.current;
    if (!wrap || !input) return;
    const sync = () => {
      const has = input.value.length > 0;
      wrap.classList.toggle('has-value', has);
      if (has && mirrorRef.current) {
        mirrorRef.current.textContent = input.value.replace(/ /g, ' ');
      }
      onChange?.(input.value);
    };
    input.addEventListener('input', sync);
    sync();
    return () => input.removeEventListener('input', sync);
  }, [onChange]);

  const runClear = () => {
    const wrap = wrapRef.current;
    const input = inputRef.current;
    const mirror = mirrorRef.current;
    const ph = phRef.current;
    const glow = glowRef.current;
    if (!wrap || !input || !mirror || !ph || !glow) return;
    if (isClearing.current || !input.value) return;
    isClearing.current = true;
    const wasFocused = document.activeElement === input;
    mirror.textContent = input.value.replace(/ /g, ' ');
    const bg = buildLayers(wrap, mirror.textContent);
    const peakAt = readNum('--bab-clear-glow-peak-at', 0.15);
    const opacity = readNum('--bab-clear-glow-opacity', 0.42);
    const total = readNum('--bab-clear-dur', 1000);
    const outDur = readNum('--bab-clear-out-dur', 400);
    const inDur = readNum('--bab-clear-in-dur', 400);
    const outFly = readNum('--bab-clear-out-fly', 12);
    const inFly = readNum('--bab-clear-in-fly', 12);
    const blurPx = readNum('--bab-clear-blur', 2);
    const glowDly = readNum('--bab-clear-glow-delay', 50);
    const eOut = makeEase(readEase('--bab-clear-out-ease', 'cubic-bezier(0.22, 1, 0.36, 1)'));
    const eIn = makeEase(readEase('--bab-clear-in-ease', 'cubic-bezier(0.22, 1, 0.36, 1)'));

    input.value = '';
    onChange?.('');
    onClear?.();
    wrap.classList.remove('has-value');
    wrap.classList.add('is-clearing');
    ph.style.transform = `translateY(-${inFly}px)`;
    ph.style.opacity = '0.9';
    ph.style.filter = `blur(${blurPx}px)`;
    glow.style.background = bg;
    glow.style.opacity = '0';

    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(1, elapsed / total);
      const e = eOut(Math.min(1, elapsed / outDur));
      mirror.style.transform = `translateY(${(e * outFly).toFixed(1)}px)`;
      mirror.style.opacity = (1 - e).toFixed(3);
      mirror.style.filter = `blur(${(e * blurPx).toFixed(1)}px)`;
      const pe = eIn(Math.min(1, elapsed / inDur));
      ph.style.transform = `translateY(${(-inFly + pe * inFly).toFixed(1)}px)`;
      ph.style.opacity = (0.9 + pe * 0.1).toFixed(3);
      ph.style.filter = `blur(${(blurPx - pe * blurPx).toFixed(1)}px)`;
      let g = 0;
      if (elapsed > glowDly) {
        const remaining = Math.max(1, total - glowDly);
        const gp = Math.min(1, (elapsed - glowDly) / remaining);
        g = gp < peakAt ? gp / peakAt : 1 - (gp - peakAt) / (1 - peakAt);
      }
      glow.style.opacity = (g * opacity).toFixed(3);
      if (p < 1) requestAnimationFrame(tick);
      else {
        wrap.classList.remove('is-clearing');
        [mirror, ph].forEach((el) => (el.style.cssText = ''));
        mirror.textContent = '';
        glow.style.opacity = '0';
        glow.style.background = '';
        isClearing.current = false;
        if (wasFocused) input.focus({ preventScroll: true });
      }
    };
    requestAnimationFrame(tick);
  };

  return (
    <div ref={wrapRef} className={'bab-clear ' + (className || '')}>
      <svg
        className="bab-clear-icon"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.5" y2="16.5" />
      </svg>
      <input ref={inputRef} type="text" defaultValue={defaultValue} placeholder={placeholder} />
      <div ref={mirrorRef} className="bab-clear-mirror" aria-hidden />
      <div ref={phRef} className="bab-clear-placeholder" aria-hidden>
        {placeholder}
      </div>
      <div ref={glowRef} className="bab-clear-glow" aria-hidden />
      <button
        type="button"
        className="bab-clear-btn"
        aria-label="Clear"
        onPointerDown={(e) => {
          if (document.activeElement === inputRef.current) e.preventDefault();
        }}
        onMouseDown={(e) => {
          if (document.activeElement === inputRef.current) e.preventDefault();
        }}
        onClick={runClear}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
});

export default ClearInput;

function buildLayers(wrap: HTMLElement, text: string): string {
  const inputW = wrap.clientWidth || 280;
  const padLeft = 32;
  const segments = text.split(/(\s+)/);
  const spread = readNum('--bab-clear-glow-spread', 1.5);
  const ctx = (buildLayers as any)._ctx ?? ((buildLayers as any)._ctx = (() => {
    const c = document.createElement('canvas').getContext('2d')!;
    c.font = "400 13px Inter, sans-serif";
    return c;
  })());
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const rgb = isDark ? '255,255,255' : '0,0,0';
  const layers: string[] = [];
  let x = 0;
  for (const seg of segments) {
    const w = ctx.measureText(seg).width;
    if (seg.trim()) {
      const cx = padLeft + x + w / 2;
      const hw = Math.max(w * 0.45, 8) * spread;
      const stops = [
        { dx: 0, rw: hw * 0.8, rh: 7, a: 0.22 },
        { dx: hw * 0.45, rw: hw * 0.55, rh: 8, a: 0.18 },
        { dx: -hw * 0.4, rw: hw * 0.65, rh: 6, a: 0.16 },
        { dx: hw * 0.15, rw: hw * 0.9, rh: 5, a: 0.14 },
      ];
      for (const l of stops) {
        const lx = ((cx + l.dx) / inputW * 100).toFixed(2);
        layers.push(
          `radial-gradient(ellipse ${Math.max(l.rw, 2).toFixed(1)}px ${l.rh}px at ${lx}% 100%, rgba(${rgb},${l.a.toFixed(3)}), transparent)`,
        );
      }
    }
    x += w;
  }
  return layers.join(', ');
}
