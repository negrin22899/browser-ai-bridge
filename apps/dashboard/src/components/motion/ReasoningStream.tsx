import { ReactNode, useEffect, useRef } from 'react';
import { injectStyles, readNum } from './styles';

const CSS = `
:root {
  --bab-reason-hold: 900ms;
  --bab-reason-step: 500ms;
  --bab-reason-lines: 2;
  --bab-reason-fade: 28px;
}

.bab-reason {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--surface);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  color: var(--text);
  cursor: pointer;
  transition: border-color var(--dur-base) var(--ease-soft), transform var(--dur-base) var(--ease-soft);
}
.bab-reason:hover { border-color: var(--border-strong); transform: translateY(-1px); }
.bab-reason:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

.bab-reason-viewport {
  position: absolute;
  inset: 40px 16px 16px 16px;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(
    transparent 0,
    black var(--bab-reason-fade),
    black calc(100% - var(--bab-reason-fade)),
    transparent 100%);
  mask-image: linear-gradient(
    transparent 0,
    black var(--bab-reason-fade),
    black calc(100% - var(--bab-reason-fade)),
    transparent 100%);
}
.bab-reason-scroll {
  position: absolute;
  left: 0; right: 0;
  transform: translateY(0);
  will-change: transform;
  font-size: 13px;
  line-height: 1.55;
  color: var(--text-muted);
}
.bab-reason-scroll p { margin: 0 0 6px 0; }

.bab-reason-head {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px 6px 14px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-subtle);
}
.bab-reason-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 10px;
  letter-spacing: 0.06em;
}

@media (prefers-reduced-motion: reduce) {
  .bab-reason-scroll { transition: none !important; transform: none !important; }
}
`;

interface ReasoningStreamProps {
  lines: string[];
  /** Label shown in the corner (e.g. provider name). */
  label?: ReactNode;
  /** Click target — usually the provider's live URL. */
  href?: string;
  /** How many lines advance per hold. Default 2. */
  step?: number;
  height?: number | string;
}

/**
 * Small "always scrolling" preview of an AI transcript. Clones the
 * content once so the offset wraps by one copy's height mid-hold, and
 * the loop never shows a jump.
 */
export default function ReasoningStream({
  lines,
  label,
  href,
  step = 2,
  height = 160,
}: ReasoningStreamProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    injectStyles('bab-reason-styles', CSS);
  }, []);

  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll || lines.length === 0) return;
    const hold = readNum('--bab-reason-hold', 900);
    const dur = readNum('--bab-reason-step', 500);
    let offset = 0;
    let timeoutId: number | null = null;

    const measure = () => scroll.scrollHeight / 2; // scroll contains 2 clones

    const tick = () => {
      const copyH = measure();
      if (copyH <= 0) {
        timeoutId = window.setTimeout(tick, hold);
        return;
      }
      // 13px * 1.55 lineHeight ≈ 20px per line
      const lineH = 20;
      offset += lineH * step;
      if (offset >= copyH) {
        // Snap without transition, then re-arm.
        scroll.style.transition = 'none';
        scroll.style.transform = `translateY(0)`;
        void scroll.offsetHeight;
        offset = 0;
        scroll.style.transition = `transform ${dur}ms var(--ease-soft)`;
      } else {
        scroll.style.transition = `transform ${dur}ms var(--ease-soft)`;
        scroll.style.transform = `translateY(-${offset}px)`;
      }
      timeoutId = window.setTimeout(tick, hold);
    };

    scroll.style.transition = `transform ${dur}ms var(--ease-soft)`;
    timeoutId = window.setTimeout(tick, hold);

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [lines, step]);

  const openIfLink = () => {
    if (!href) return;
    if (typeof window !== 'undefined' && (window as any).electronAPI?.openExternal) {
      (window as any).electronAPI.openExternal(href);
    } else {
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  };

  const body = (
    <>
      <div className="bab-reason-head">
        <span>{label ?? 'Latest reply'}</span>
        {href && <span className="bab-reason-pill">Open ↗</span>}
      </div>
      <div className="bab-reason-viewport" style={{ height: typeof height === 'number' ? `${height}px` : height }}>
        <div ref={scrollRef} className="bab-reason-scroll">
          {[0, 1].map((clone) => (
            <div key={clone}>
              {lines.map((l, i) => (
                <p key={`${clone}-${i}`}>{l}</p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <div
      className="bab-reason"
      role={href ? 'link' : undefined}
      tabIndex={href ? 0 : undefined}
      onClick={openIfLink}
      onKeyDown={(e) => {
        if (href && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          openIfLink();
        }
      }}
      style={{ height: typeof height === 'number' ? `${height + 40}px` : undefined }}
    >
      {body}
    </div>
  );
}
