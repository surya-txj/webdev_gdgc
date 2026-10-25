import { useState } from 'react';
import { get } from '../../lib/api';
import { useApi } from '../../hooks/useApi';
import PaintingCard from '../../components/PaintingCard';
import { CurvedTriptych } from '../../components/Visuals';
import { Button, EmptyState, ErrorState, LoadingState } from '../../components/Shared';

export default function Gallery() {
  const [status, setStatus] = useState('all'); const [query, setQuery] = useState('');
  const { data, loading, error, reload } = useApi(() => get(`/paintings?status=${status}&q=${encodeURIComponent(query)}`), [status, query]);
  const paintings = data || []; const feature = paintings.slice(0, 3);
  return <main className="page"><section className="container gallery-header"><span className="eyebrow">The collection</span><h1>The Art <img className="inline-thumb" src={feature[0]?.image_url} alt="" /> of Human Expression,<br />Uncover The <span className="script">Stories</span> Behind the Art <img className="inline-pill" src={feature[1]?.image_url} alt="" /></h1><p>Discover one-of-a-kind paintings from our studio. Each piece can belong to only one home.</p><Button onClick={() => document.getElementById('gallery-grid')?.scrollIntoView()}>Explore</Button></section><div className="container"><CurvedTriptych images={feature} /><div id="gallery-grid" className="filter-row"><div className="pills">{['all', 'available', 'sold'].map((item) => <button className={`pill ${status === item ? 'active' : ''}`} onClick={() => setStatus(item)} key={item}>{item[0].toUpperCase() + item.slice(1)}</button>)}</div><input className="search" placeholder="Search the collection" value={query} onChange={(event) => setQuery(event.target.value)} /></div>{loading ? <LoadingState /> : error ? <ErrorState error={error} retry={reload} /> : paintings.length ? <div className="grid painting-grid">{paintings.map((painting) => <PaintingCard key={painting.id} painting={painting} />)}</div> : <EmptyState title="No paintings found" message="Try another filter or search term." />}</div></main>;
}
