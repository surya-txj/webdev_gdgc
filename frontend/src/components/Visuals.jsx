import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { formatMoney } from '../config';

// ---------------------------------------------------------------------------
// CurvedMarquee
//
// A looping row of painting cards that moves from right to left on a curved,
// cylinder-like track:
//   - cards in the middle are smaller and face the viewer flat
//   - cards towards the left/right edges get bigger, turn inward (rotateY)
//     and lean slightly (skewY), as if wrapping around the inside of a cylinder
//   - on first load the cards stream in from the right as a trail and settle
//     into the loop
// Positions are calculated every animation frame in JavaScript and written as
// CSS variables, so only `transform` and `opacity` change (cheap for the browser).
// ---------------------------------------------------------------------------

const CARD_STEP = 122;        // distance between card centres on the flat track (px)
const SPEED = 62;             // cruise speed (px per second)
const INTRO_DURATION = 1.6;   // seconds each card takes to fly in
const INTRO_STAGGER = 0.7;    // extra delay spread across the trail (seconds)
const MIN_TRACK = 2400;       // minimum track length so the loop never shows a gap

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

// Shape of the curve for a card at normalised distance d from the centre (-1 = left edge, 1 = right edge).
function curveFor(d) {
  const a = Math.min(Math.abs(d), 1.25);
  return {
    scale: 0.72 + 0.5 * a * a,          // small in the middle, larger at the edges
    rotate: -d * 36,                    // left cards turn right, right cards turn left
    skew: -d * 5,                       // slight inward lean
    lift: a * a * 6,                    // tiny vertical drift so the row feels curved
    z: Math.round(10 + a * 20),         // edge cards are "closer", so they sit on top
  };
}

export function CurvedMarquee({ images = [] }) {
  const viewportRef = useRef(null);
  const cardRefs = useRef([]);

  // Only rebuild the track when the actual paintings change (not on every refetch),
  // otherwise the intro animation would replay each time the data reloads.
  const signature = images.map((p) => `${p.id}:${p.image_url}`).join('|');

  // Repeat the paintings (in the same order) until the track is long enough to loop.
  const items = useMemo(() => {
    const source = images.length ? images : Array.from({ length: 8 }, (_, i) => ({ id: `placeholder-${i}`, placeholder: true }));
    const minimumCards = Math.ceil(MIN_TRACK / CARD_STEP);
    const repeats = Math.max(1, Math.ceil(minimumCards / source.length));
    return Array.from({ length: source.length * repeats }, (_, i) => source[i % source.length]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cycle = items.length * CARD_STEP;
    // Starting position of each card on the flat track, centred on 0.
    const base = items.map((_, i) => (i - (items.length - 1) / 2) * CARD_STEP);

    let width = viewport.clientWidth;
    const onResize = () => { width = viewport.clientWidth; };
    window.addEventListener('resize', onResize);

    let frame = null;
    let start = null;

    const render = (now) => {
      if (start === null) start = now;
      const elapsed = reduceMotion ? 1000 : (now - start) / 1000;
      const half = width / 2;
      const drift = reduceMotion ? 0 : elapsed * SPEED;
      const introDistance = width * 1.2;

      items.forEach((_, i) => {
        const card = cardRefs.current[i];
        if (!card) return;

        // Position on the looping track, moving left over time.
        // When a card leaves on the left it wraps round to the far right.
        let u = base[i] - drift;
        u = ((u + cycle / 2) % cycle + cycle) % cycle - cycle / 2;

        // Intro: the cards that will be on screen start off to the right and
        // ease into place. Cards further left start earlier, so they arrive as a trail.
        const delay = clamp((u + half) / (2 * half), 0, 1) * INTRO_STAGGER;
        const progress = clamp((elapsed - delay) / INTRO_DURATION, 0, 1);
        const introShift = introDistance * (1 - easeOutCubic(progress));
        const hiddenDuringIntro = progress < 1 && u < -half * 1.2;
        u += introShift;

        // Spread cards out a little towards the edges so the bigger cards don't overlap.
        const n = u / half;
        const x = u * (1 + 0.2 * Math.min(n * n, 1.8));
        const d = x / half;
        const { scale, rotate, skew, lift, z } = curveFor(d);

        // Fade out past the edges, and fade in during the intro.
        const edgeFade = clamp((1.28 - Math.abs(d)) / 0.3, 0, 1);
        const introFade = clamp((elapsed - delay) / 0.35, 0, 1);
        const opacity = hiddenDuringIntro ? 0 : edgeFade * introFade;

        card.style.setProperty('--x', `${x.toFixed(1)}px`);
        card.style.setProperty('--y', `${lift.toFixed(1)}px`);
        card.style.setProperty('--ry', `${rotate.toFixed(2)}deg`);
        card.style.setProperty('--sk', `${skew.toFixed(2)}deg`);
        card.style.setProperty('--s', scale.toFixed(3));
        card.style.opacity = opacity.toFixed(3);
        card.style.visibility = opacity < 0.01 ? 'hidden' : 'visible';
        card.style.zIndex = String(z);
      });

      if (!reduceMotion) frame = requestAnimationFrame(render);
    };

    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, [items]);

  return (
    <div className="marquee" ref={viewportRef} aria-label="A looping selection of Kalanidhi paintings">
      <div className="marquee-track">
        {items.map((painting, index) =>
          painting.placeholder ? (
            <div
              key={`${painting.id}-${index}`}
              className="marquee-card is-placeholder"
              ref={(node) => { cardRefs.current[index] = node; }}
            />
          ) : (
            <Link
              key={`${painting.id}-${index}`}
              className="marquee-card"
              ref={(node) => { cardRefs.current[index] = node; }}
              to={`/paintings/${painting.id}`}
              tabIndex={index < images.length ? 0 : -1}
            >
              {painting.image_url
                ? <img src={painting.image_url} alt={painting.title} draggable="false" />
                : <div className="image-placeholder" />}
              <span className="marquee-label">
                <span>{painting.title}</span>
                <strong>{formatMoney(painting.price)}</strong>
              </span>
            </Link>
          )
        )}
      </div>
      <HandPointer />
    </div>
  );
}

// A hand-pointer cursor that stays parked over the middle of the carousel.
function HandPointer() {
  return (
    <svg className="marquee-pointer" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M9.5 3 a1.5 1.5 0 0 1 3 0 v7.2 a1.5 1.5 0 0 1 3 0 v.8 a1.5 1.5 0 0 1 3 0 v.9 a1.5 1.5 0 0 1 3 0 V16
           c0 3.6-2.7 6.5-6.2 6.5 h-1.7 c-2 0-3.6-.9-4.7-2.5 L3.6 15.2 a1.5 1.5 0 0 1 2.4-1.8 L9.5 16.5 Z"
        fill="#fff" stroke="#1d1d1d" strokeWidth="1.2" strokeLinejoin="round"
      />
      <path d="M12.5 10.4 v3.2 M15.5 11.2 v2.6 M18.5 12 v2" stroke="#1d1d1d" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

// Three paintings side by side, masked with curved top and bottom edges (gallery header).
export function CurvedTriptych({ images = [] }) {
  return (
    <div className="triptych">
      {images.slice(0, 3).map((painting) => (
        <Link key={painting.id} to={`/paintings/${painting.id}`} className="triptych-panel">
          {painting.image_url ? <img src={painting.image_url} alt={painting.title} /> : <div className="image-placeholder" />}
          <span>{painting.title}</span>
        </Link>
      ))}
    </div>
  );
}
