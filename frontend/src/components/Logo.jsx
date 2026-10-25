import { STUDIO_NAME, STUDIO_TAGLINE } from '../config';

// Decorative flourish that sits above the studio name.
// Drawn as SVG (no background), so it stays sharp at any size and takes its colour from CSS.
export function Flourish({ className = '' }) {
  const half = (
    <g fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      {/* scroll closest to the centre */}
      <path d="M97 27 C91 19 80 18 76 24 C73 29 79 32 81 28 C82.5 25.5 79 24 77.5 26" />
      {/* middle scroll */}
      <path d="M75 27 C68 32 58 32 55 26 C53 21.5 58.5 19.5 60.5 23 C61.5 25 59 26.5 57.5 25" />
      {/* outer scroll */}
      <path d="M53 28 C46 23 38 23.5 35 27.5 C33.5 30 36.5 31.5 38 29.5" />
      {/* small curl above the inner scroll */}
      <path d="M88 20.5 C86 14.5 91 12 93.5 15.5 C94.5 17 93 18.5 91.5 17.5" />
    </g>
  );

  return (
    <svg className={className} viewBox="0 0 200 40" aria-hidden="true" focusable="false">
      {/* thin tapered base line */}
      <path d="M8 31 Q100 29.4 192 31 Q100 32.6 8 31 Z" fill="currentColor" />
      {half}
      <g transform="translate(200 0) scale(-1 1)">{half}</g>
      {/* centre fleuron: one tall petal and two leaning petals */}
      <g fill="currentColor">
        <path d="M100 3 C103.2 9 103.2 17 100 22 C96.8 17 96.8 9 100 3 Z" />
        <path d="M99.5 22 C93.5 20.5 90.5 15.5 91.5 10.5 C95.5 12.5 98.5 17 99.5 22 Z" />
        <path d="M100.5 22 C106.5 20.5 109.5 15.5 108.5 10.5 C104.5 12.5 101.5 17 100.5 22 Z" />
        <circle cx="100" cy="26" r="1.6" />
        <path d="M100 32 L102.4 35 L100 38 L97.6 35 Z" />
      </g>
    </svg>
  );
}

// Small eight-petal flower used under the full logo (and as the favicon).
export function Flower({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <g fill="currentColor">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <ellipse key={angle} cx="10" cy="5" rx="1.7" ry="3" transform={`rotate(${angle} 10 10)`} />
        ))}
        <circle cx="10" cy="10" r="0.9" />
      </g>
    </svg>
  );
}

// The Kalanidhi logo.
// - "full": flourish, name, tagline and flower (auth pages, footer)
// - "compact": flourish, name and tagline (navbar)
// The name uses Cinzel (its lowercase letters are small capitals, so "Kalanidhi"
// shows a tall K followed by small caps). The tagline uses Tenor Sans.
export default function Logo({ variant = 'compact', className = '' }) {
  return (
    <span className={`logo logo-${variant} ${className}`}>
      <Flourish className="logo-flourish" />
      <span className="logo-name">{STUDIO_NAME}</span>
      <span className="logo-tagline">{STUDIO_TAGLINE}</span>
      {variant === 'full' && <Flower className="logo-flower" />}
    </span>
  );
}
