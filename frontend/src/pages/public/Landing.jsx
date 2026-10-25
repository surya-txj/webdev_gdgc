import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import PaintingCard from '../../components/PaintingCard';
import { CurvedMarquee } from '../../components/Visuals';
import { Card, EmptyState, ErrorState, LoadingState } from '../../components/Shared';
import { get } from '../../lib/api';
import { useApi } from '../../hooks/useApi';

// Small helper so each hero element fades up one after another on first load.
const fadeUp = (delay, y = 14) => ({
  initial: { opacity: 0, y },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5, ease: 'easeOut' },
});

export default function Landing() {
  // All paintings (available and sold) feed the carousel; only available ones are "featured".
  const { data: paintings, loading, error, reload } = useApi(() => get('/paintings?status=all'), []);
  const all = paintings || [];
  const carouselPaintings = all.filter((painting) => painting.image_url);
  const featured = all.filter((painting) => painting.status === 'available').slice(0, 4);

  return (
    <main className="landing-page">
      <div className="landing-frame">
        <Navbar landing />

        <section className="hero">
          <motion.div {...fadeUp(0, 12)} className="hero-badge">One-of-a-kind art, made by hand</motion.div>

          <span className="hero-spark">//</span>
          <span className="hero-annotation">
            Made by hand
            <svg viewBox="0 0 100 45">
              <path d="M4 6 C38 6 72 13 74 37" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M74 37 l-9 -4 M74 37 l-4 -9" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </span>

          <motion.h1 {...fadeUp(0.08, 22)}>Art That Lives<br /><em>On Your Walls</em></motion.h1>

          <motion.p {...fadeUp(0.16, 0)} className="hero-copy">
            Buy original paintings, book a hand-painted wall, or request custom pottery — every piece is one of a kind.
          </motion.p>

          {/* The carousel runs its own opening animation (cards trail in from the right). */}
          {error
            ? <div className="container"><ErrorState error={error} retry={reload} /></div>
            : <CurvedMarquee images={carouselPaintings} />}

          <motion.div {...fadeUp(0.4, 10)}>
            <span className="hero-cta-note">It's free to browse</span>
            <Link className="button primary" to="/paintings">Explore Paintings</Link>
          </motion.div>
        </section>

        <section className="landing-featured container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">The studio, in three gestures</span>
              <h2>Make space for making.</h2>
            </div>
            <Link to="/walls" className="button light small">See the work</Link>
          </div>

          <div className="services">
            <Card className="service-card"><div className="service-icon">◒</div><h3>Paintings</h3><p>Original works that bring a little more story into the room.</p></Card>
            <Card className="service-card"><div className="service-icon">⌁</div><h3>Walls</h3><p>Book a date for a hand-painted wall, sized for your space.</p></Card>
            <Card className="service-card"><div className="service-icon">◉</div><h3>Pottery</h3><p>Choose a form and glaze; we’ll make it slowly and well.</p></Card>
          </div>

          <div className="section-heading" style={{ marginTop: 70 }}>
            <div>
              <span className="eyebrow">Available now</span>
              <h2>Pieces with a pulse.</h2>
            </div>
            <Link to="/paintings" className="button light small">View gallery</Link>
          </div>

          {loading && !paintings ? <LoadingState />
            : error ? <ErrorState error={error} retry={reload} />
            : featured.length
              ? <div className="grid painting-grid">{featured.map((painting) => <PaintingCard key={painting.id} painting={painting} />)}</div>
              : <EmptyState title="The next collection is taking shape" message="Check back soon for new work." />}
        </section>
      </div>
    </main>
  );
}
