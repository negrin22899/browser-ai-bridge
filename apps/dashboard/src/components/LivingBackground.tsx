import { useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';

// Colour positions from the supplied presets. Flow motion is an approximation
// until the original generator's rendering algorithm is available.
const PALETTES = {
  brand: [['#EAF4FC', 0.167], ['#A5B7A5', 0.5], ['#5B6F57', 0.833]],
  light: [['#A5B7A5', 0.25], ['#DDDBE0', 0.75]],
  dark: [['#0D0D0D', 0.25], ['#707070', 0.75]],
} as const;

/**
 * Living background — approximates the supplied `type: 'flow'` presets.
 *
 * A 135° linear gradient (BLACK → MOON HAZE for dark, MOON WHITE → PALE OAK →
 * RUSTED STOREROOM for brand) is warped by an SVG `feDisplacementMap` whose
 * input is a low-frequency `feTurbulence`. The animation just breathes the
 * turbulence's `baseFrequency` and the displacement `scale` — everything else
 * (colours, hue interpolation, sampling) uses the browser's SVG filter
 * pipeline, so there's no per-frame JS.
 *
 * A subtle grain overlay sits on top for the `noise: 6` texture from the
 * Feral UI palette exports. Theme swaps propagate automatically because the
 * gradient stops follow the current theme's exported palette.
 */
const STYLES = `
.living-bg {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
  isolation: isolate;
  background-color: var(--grad-2);
  transition: background-color 400ms var(--ease-soft);
}

.living-bg-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.living-bg-noise {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: url("data:image/svg+xml;utf8,\
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 220 220'>\
<filter id='n'>\
<feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/>\
<feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0'/>\
</filter>\
<rect width='100%' height='100%' filter='url(%23n)' opacity='0.7'/>\
</svg>");
  background-size: 220px 220px;
  opacity: 0.06;
  mix-blend-mode: overlay;
}

`;

let stylesInjected = false;
function ensureStyles() {
  if (stylesInjected || typeof document === 'undefined') return;
  if (document.getElementById('bab-living-bg-styles')) {
    stylesInjected = true;
    return;
  }
  const style = document.createElement('style');
  style.id = 'bab-living-bg-styles';
  style.textContent = STYLES;
  document.head.appendChild(style);
  stylesInjected = true;
}

export default function LivingBackground() {
  const { theme } = useTheme();
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    ensureStyles();
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => {
      const svg = svgRef.current;
      if (!svg) return;
      if (media.matches || document.hidden) svg.pauseAnimations();
      else svg.unpauseAnimations();
    };
    updateMotion();
    media.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updateMotion);
    return () => {
      media.removeEventListener('change', updateMotion);
      document.removeEventListener('visibilitychange', updateMotion);
    };
  }, []);

  return (
    <div className="living-bg" aria-hidden="true">
      <svg
        ref={svgRef}
        className="living-bg-svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/*
            The warp filter. `baseFrequency` picks blob size (smaller = larger
            structures, closer to the reference clip's slow-moving ribbon).
            `scale` on the displacement map controls how far the gradient
            gets pushed — that's what turns the straight 135° band into a
            curling S-shape.
          */}
          <filter
            id="bab-flow-warp"
            x="-30%"
            y="-30%"
            width="160%"
            height="160%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.011"
              numOctaves="2"
              seed="6"
              result="noise"
            >
              <animate
                attributeName="baseFrequency"
                values="0.009;0.014;0.010;0.012;0.009"
                dur="30s"
                repeatCount="indefinite"
                calcMode="spline"
                keySplines="0.22 1 0.36 1; 0.22 1 0.36 1; 0.22 1 0.36 1; 0.22 1 0.36 1"
              />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="42">
              <animate
                attributeName="scale"
                values="34;54;40;48;34"
                dur="30s"
                repeatCount="indefinite"
                calcMode="spline"
                keySplines="0.22 1 0.36 1; 0.22 1 0.36 1; 0.22 1 0.36 1; 0.22 1 0.36 1"
              />
            </feDisplacementMap>
          </filter>

          {/*
            Palette colours and stop positions match the exported presets.
          */}
          <linearGradient
            id="bab-flow-grad"
            gradientUnits="objectBoundingBox"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            {PALETTES[theme].map(([color, position]) => (
              <stop key={color} offset={position} stopColor={color} />
            ))}
          </linearGradient>
        </defs>

        {/*
          Draw slightly outside the viewBox so displacement never reveals a
          hard edge at the viewport border.
        */}
        <rect
          x="-15"
          y="-15"
          width="130"
          height="130"
          fill="url(#bab-flow-grad)"
          filter="url(#bab-flow-warp)"
        />
      </svg>
      <div className="living-bg-noise" />
    </div>
  );
}
