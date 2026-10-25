import { Link } from 'react-router-dom';
import { formatMoney } from '../config';
import { StatusChip } from './Shared';

export default function PaintingCard({ painting, compact = false }) {
  return <Link to={`/paintings/${painting.id}`} className={`painting-card ${compact ? 'compact' : ''}`}>
    <div className="painting-image-wrap">{painting.image_url ? <img src={painting.image_url} alt={painting.title} loading="lazy" /> : <div className="image-placeholder"><span>Original work</span></div>}<StatusChip status={painting.status} /></div>
    <div className="painting-card-copy"><div><h3>{painting.title}</h3><p>{painting.artist || 'Studio artist'}</p></div><strong className="display">{formatMoney(painting.price)}</strong></div>
  </Link>;
}
